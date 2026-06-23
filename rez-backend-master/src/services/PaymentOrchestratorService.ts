/**
 * PaymentOrchestratorService.ts
 *
 * Canonical, atomic wallet top-up pipeline.
 *
 * Feature-flag controlled:
 *   'disabled' → no-op, returns immediately
 *   'shadow'   → computes what WOULD happen, logs it, returns without touching any DB state
 *   'live'     → executes the full pipeline atomically (idempotent)
 *
 * Shadow mode is a zero-risk dual-run layer wired into the existing legacy
 * paths (confirmPayment, Razorpay webhook). For 48-72 h, both the legacy path
 * and this orchestrator run in parallel; their log lines can be diffed to
 * confirm correctness before promoting to 'live'.
 *
 * CRITICAL: Shadow mode MUST NOT mutate any DB state.
 *           Shadow mode MUST NOT throw errors that affect the live response.
 *           Live mode MUST be fully idempotent on idempotencyKey.
 */

import mongoose, { Types } from 'mongoose';
import { createServiceLogger } from '../config/logger';
import { getOrchestratorFlag } from './orchestratorFlags';
import { Wallet } from '../models/Wallet';
import { Payment } from '../models/Payment';
import { walletService } from './walletService';
import { ledgerService } from './ledgerService';
import redisService from './redisService';

const logger = createServiceLogger('payment-orchestrator');

// ── Types ────────────────────────────────────────────────────────────────────

// BED-022 FIX: Define orchestrator-specific metadata shape to replace `as any`
// cast on existingPayment.metadata. Wallet and transaction IDs are stamped by the
// orchestrator during credit and must be recoverable from the idempotency cache.
interface OrchestratorMetadata extends Record<string, unknown> {
  orchestratorWalletId?: string;
  orchestratorTransactionId?: string;
  orchestratorIdempotencyKey?: string;
}

export interface TopUpInput {
  userId: string;
  paymentId: string; // gateway payment ID (e.g. Razorpay pay_xxx)
  orderId: string; // gateway order ID (e.g. Razorpay order_xxx)
  amount: number; // amount in paise / smallest currency unit
  currency: string; // 'INR' | 'AED' etc.
  source: string; // 'razorpay' | 'stripe' | 'wallet' etc.
  idempotencyKey: string; // caller-supplied unique key per transaction attempt
  legacyOutcome?: string; // optional: what the legacy path reported (for shadow diff)
}

export interface TopUpResult {
  success: boolean;
  walletId?: string;
  transactionId?: string;
  newBalance?: number;
  shadowMode?: boolean;
  shadowDiff?: {
    intendedAction: string;
    legacyOutcome?: string;
  };
}

// ── Redis-backed idempotency cache (cross-pod, survives restarts) ────────────
// Keys are idempotencyKey strings; values are the stored TopUpResult.
// TTL: 24 h — sufficient for retry windows. The authoritative record lives in
// MongoDB (Payment.metadata.orchestratorIdempotencyKey) so this cache is a
// thundering-herd guard only, not the source of truth.
const ORCHESTRATOR_IDEMPOTENCY_TTL = 24 * 60 * 60; // 24h in seconds

async function cacheIdempotencyResult(key: string, result: TopUpResult): Promise<void> {
  try {
    const redisKey = `orchestrator:topup:idempotency:${key}`;
    await redisService.set(redisKey, result, ORCHESTRATOR_IDEMPOTENCY_TTL);
  } catch (err: any) {
    logger.warn('[ORCHESTRATOR] Redis idempotency cache write failed', { key, error: err?.message });
  }
}

async function getCachedIdempotencyResult(key: string): Promise<TopUpResult | null> {
  try {
    const redisKey = `orchestrator:topup:idempotency:${key}`;
    const cached = await redisService.get<TopUpResult>(redisKey);
    if (cached) return cached;
  } catch (err: any) {
    logger.warn('[ORCHESTRATOR] Redis idempotency cache read failed', { key, error: err?.message });
  }
  return null;
}

// ── Service ──────────────────────────────────────────────────────────────────

class PaymentOrchestratorService {
  /**
   * Process a wallet top-up through the orchestrator pipeline.
   *
   * Behaviour is controlled by the 'payments.orchestrator_mode' flag:
   *   - 'disabled': returns immediately without any work
   *   - 'shadow':   reads current wallet state, logs the intended diff, no writes
   *   - 'live':     executes the full atomic pipeline with idempotency check
   */
  async processTopUp(input: TopUpInput): Promise<TopUpResult> {
    const mode = getOrchestratorFlag('payments.orchestrator_mode');

    if (mode === 'disabled') {
      return { success: true };
    }

    if (mode === 'shadow') {
      return this._runShadow(input);
    }

    // mode === 'live'
    return this._runLive(input);
  }

  // ── Shadow mode ─────────────────────────────────────────────────────────────

  private async _runShadow(input: TopUpInput): Promise<TopUpResult> {
    const { userId, paymentId, orderId, amount, currency, source, idempotencyKey, legacyOutcome } = input;

    try {
      // Read-only: look up the current wallet balance for comparison logging.
      const wallet = await Wallet.findOne({ user: userId }).lean();
      const currentBalance = wallet?.balance?.available ?? 0;
      const amountInMajorUnit = amount / 100; // paise → rupees (or fils → dirham)
      const intendedNewBalance = currentBalance + amountInMajorUnit;

      logger.info('[ORCHESTRATOR:SHADOW] payment_topup_would_execute', {
        userId,
        paymentId,
        orderId,
        amount,
        amountInMajorUnit,
        currency,
        source,
        idempotencyKey,
        currentBalance,
        intendedNewBalance,
        intendedAction: 'credit_wallet',
        legacyOutcome: legacyOutcome ?? 'not_provided',
        walletFound: !!wallet,
        timestamp: new Date().toISOString(),
      });

      const result: TopUpResult = {
        success: true,
        shadowMode: true,
        shadowDiff: {
          intendedAction: `credit_wallet: +${amountInMajorUnit} ${currency} (balance: ${currentBalance} → ${intendedNewBalance})`,
          legacyOutcome,
        },
      };

      return result;
    } catch (err: any) {
      // Shadow mode MUST NOT throw — log the error and return gracefully.
      logger.error('[ORCHESTRATOR:SHADOW] payment_topup_shadow_error', {
        userId,
        paymentId,
        idempotencyKey,
        error: err?.message,
      });
      return {
        success: false,
        shadowMode: true,
        shadowDiff: {
          intendedAction: 'shadow_read_failed',
          legacyOutcome: input.legacyOutcome,
        },
      };
    }
  }

  // ── Live mode ────────────────────────────────────────────────────────────────

  private async _runLive(input: TopUpInput): Promise<TopUpResult> {
    const { userId, paymentId, orderId, amount, currency, source, idempotencyKey } = input;

    // ── Step 1: Idempotency — Redis L1 ──────────────────────────────────────
    const cached = await getCachedIdempotencyResult(idempotencyKey);
    if (cached) {
      logger.info('[ORCHESTRATOR:LIVE] payment_topup_idempotency_hit_l1', {
        userId,
        idempotencyKey,
        cachedSuccess: cached.success,
      });
      return cached;
    }

    // ── Step 2: Idempotency — DB-level L2 (Payment record) ───────────────────
    // CRITICAL-008 FIX: L2 idempotency check is now READ-ONLY.
    // The orchestrator must NOT write to the payments collection.
    // Single authority for the payments collection is rez-payment-service.
    // Writes to Payment documents (walletCredited, orchestratorIdempotencyKey)
    // have been removed from this service. The payment service's BullMQ job
    // and internal API handle wallet credits idempotently.
    const existingPayment = await Payment.findOne({
      'metadata.orchestratorIdempotencyKey': idempotencyKey,
    }).lean();

    if (existingPayment) {
      logger.info('[ORCHESTRATOR:LIVE] payment_topup_idempotency_hit_l2', {
        userId,
        idempotencyKey,
        paymentDocId: existingPayment._id,
      });
      // BED-022 FIX: Use typed OrchestratorMetadata interface instead of `as any`.
      const orchestratorMeta = existingPayment.metadata as unknown as OrchestratorMetadata;
      const dbResult: TopUpResult = {
        success: true,
        walletId: String(orchestratorMeta?.orchestratorWalletId || ''),
        transactionId: String(orchestratorMeta?.orchestratorTransactionId || ''),
      };
      await cacheIdempotencyResult(idempotencyKey, dbResult);
      return dbResult;
    }

    // ── Step 3: Verify payment status on the Payment record ──────────────────
    // READ-ONLY: The orchestrator reads Payment docs to verify status before
    // crediting wallet. It does NOT write to the payments collection.
    const paymentDoc = await Payment.findOne({
      paymentId,
      user: new Types.ObjectId(userId),
    }).lean();

    if (!paymentDoc) {
      logger.error('[ORCHESTRATOR:LIVE] payment_topup_no_payment_doc', { userId, paymentId, idempotencyKey });
      return {
        success: false,
        shadowMode: false,
      };
    }

    // BUG FIX: Payment schema enum is ['pending','processing','completed','failed','cancelled','expired'].
    // 'captured' is not a valid status — it was a Razorpay raw event name that leaked in.
    // Accept 'processing' to cover the brief window between gateway capture and status update.
    if (!['completed', 'processing'].includes(paymentDoc.status)) {
      logger.error('[ORCHESTRATOR:LIVE] payment_topup_payment_not_completed', {
        userId,
        paymentId,
        status: paymentDoc.status,
        idempotencyKey,
      });
      return { success: false };
    }

    // ── Step 4: Atomic pipeline inside a MongoDB session ─────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    let result: TopUpResult;

    try {
      const amountInMajorUnit = amount / 100;

      // Credit wallet (creates CoinTransaction + LedgerEntry inside walletService.credit)
      const creditResult = await walletService.credit({
        userId,
        amount: amountInMajorUnit,
        source: 'recharge',
        description: `Wallet top-up via ${source} [orchestrator]`,
        operationType: 'topup',
        referenceId: paymentId,
        referenceModel: 'Payment',
        metadata: {
          orchestratorIdempotencyKey: idempotencyKey,
          gatewayPaymentId: paymentId,
          gatewayOrderId: orderId,
          source,
          currency,
        },
        session,
      });

      // CRITICAL-008 FIX: Removed direct write to Payment collection.
      // The orchestrator NO LONGER writes to the payments collection.
      // Wallet credits are handled by the payment service's BullMQ job
      // (creditWalletAfterPayment) which sets walletCredited atomically.
      // The orchestrator should only credit the wallet via walletService.credit
      // and let the payment service manage Payment document state.
      //
      // Previously this code wrote:
      //   Payment.findOneAndUpdate({ paymentId, user }, {
      //     $set: {
      //       'metadata.orchestratorIdempotencyKey': idempotencyKey,
      //       'metadata.orchestratorTransactionId': ...,
      //       'metadata.orchestratorWalletId': ...,
      //       walletCredited: true,
      //       walletCreditedAt: new Date(),
      //     }
      //   });
      // This caused dual authority: both the orchestrator AND the payment service
      // set walletCredited on the same Payment documents, creating race conditions.

      await session.commitTransaction();

      // Fetch updated wallet balance for result (post-commit read, no session needed)
      const updatedWallet = await Wallet.findOne({ user: userId }).lean();

      result = {
        success: true,
        walletId: updatedWallet ? String(updatedWallet._id) : undefined,
        transactionId: creditResult.transactionId?.toString(),
        newBalance: updatedWallet?.balance?.available,
        shadowMode: false,
      };

      logger.info('[ORCHESTRATOR:LIVE] payment_topup_success', {
        userId,
        paymentId,
        orderId,
        amountInMajorUnit,
        currency,
        source,
        idempotencyKey,
        transactionId: result.transactionId,
        newBalance: result.newBalance,
      });

      // Post-commit: cache idempotency result
      await cacheIdempotencyResult(idempotencyKey, result);

      // Post-commit: emit socket update (best-effort, non-blocking)
      this._emitSocketUpdate(userId, result.newBalance).catch((err: any) =>
        logger.warn('[ORCHESTRATOR:LIVE] socket_emit_failed', { userId, error: err?.message }),
      );

      return result;
    } catch (err: any) {
      await session.abortTransaction();
      logger.error('[ORCHESTRATOR:LIVE] payment_topup_pipeline_failed', {
        userId,
        paymentId,
        idempotencyKey,
        error: err?.message,
      });
      throw err;
    } finally {
      await session.endSession();
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async _emitSocketUpdate(userId: string, newBalance: number | undefined): Promise<void> {
    try {
      // Dynamic import to avoid hard coupling — orderSocketService may not always be loaded
      const orderSocketService = require('./orderSocketService').default;
      if (orderSocketService?.emitToUser) {
        orderSocketService.emitToUser(userId, 'wallet:balance_updated', { newBalance });
      }
    } catch {
      // Non-critical — socket service may not be present in all environments
    }
  }
}

export const paymentOrchestratorService = new PaymentOrchestratorService();
export default paymentOrchestratorService;
