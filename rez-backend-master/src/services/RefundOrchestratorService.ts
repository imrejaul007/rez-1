/**
 * RefundOrchestratorService.ts
 *
 * Canonical, atomic refund pipeline with a hard ceiling guard.
 *
 * Feature-flag controlled:
 *   'disabled' → no-op, returns immediately
 *   'shadow'   → computes what WOULD happen (incl. ceiling check), logs it, no DB mutations
 *   'live'     → executes the full atomic pipeline (idempotent)
 *
 * The existing refundService.processRefund() continues to run live on the legacy
 * path. This orchestrator runs in parallel in 'shadow' mode so results can be
 * compared before cutting over.
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
import { CoinTransaction } from '../models/CoinTransaction';
import { walletService } from './walletService';
import { ledgerService } from './ledgerService';
import redisService from './redisService';

const logger = createServiceLogger('refund-orchestrator');

// ── Types ────────────────────────────────────────────────────────────────────

export type OrchestratorRefundType = 'full' | 'partial';

export interface RefundInput {
  userId: string;
  paymentId: string; // gateway payment ID (for ceiling check against Payment doc)
  requestedAmount: number; // in major currency units (rupees / dirhams)
  reason: string;
  idempotencyKey: string; // caller-supplied unique key per refund attempt
  refundType: OrchestratorRefundType;
  referenceId?: string; // Order._id or similar
  referenceModel?: string; // 'Order' | 'EventBooking' etc.
  legacyOutcome?: string; // optional: what the legacy refundService reported
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundedAmount?: number;
  remainingRefundable?: number;
  rejected?: boolean;
  rejectionReason?: string;
  shadowMode?: boolean;
  shadowDiff?: {
    intendedAction: string;
    ceilingCheckResult: string;
    legacyOutcome?: string;
  };
}

// ── Redis-backed idempotency cache (cross-pod, survives restarts) ────────────
// Keys are idempotencyKey strings; values are the stored RefundResult.
// TTL: 24 h — sufficient for retry windows. The authoritative record lives in
// MongoDB (CoinTransaction.metadata.orchestratorRefundIdempotencyKey) so this
// cache is a thundering-herd guard only, not the source of truth.
const ORCHESTRATOR_IDEMPOTENCY_TTL = 24 * 60 * 60; // 24h in seconds

async function cacheIdempotencyResult(key: string, result: RefundResult): Promise<void> {
  try {
    const redisKey = `orchestrator:refund:idempotency:${key}`;
    await redisService.set(redisKey, result, ORCHESTRATOR_IDEMPOTENCY_TTL);
  } catch (err: any) {
    logger.warn('[ORCHESTRATOR] Redis idempotency cache write failed', { key, error: err?.message });
  }
}

async function getCachedIdempotencyResult(key: string): Promise<RefundResult | null> {
  try {
    const redisKey = `orchestrator:refund:idempotency:${key}`;
    const cached = await redisService.get<RefundResult>(redisKey);
    if (cached) return cached;
  } catch (err: any) {
    logger.warn('[ORCHESTRATOR] Redis idempotency cache read failed', { key, error: err?.message });
  }
  return null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute how much has already been refunded against this paymentId by summing
 * completed refund CoinTransactions that carry a refundIdempotencyKey.
 *
 * NOTE: This is a read-only helper. The authoritative atomic guard is the
 * Payment.refundedAmount field incremented via findOneAndUpdate in live mode.
 */
async function computeAlreadyRefunded(paymentId: string): Promise<{
  originalAmount: number;
  alreadyRefunded: number;
  remainingRefundable: number;
}> {
  const paymentDoc = await Payment.findOne({ paymentId }).lean();
  if (!paymentDoc) {
    return { originalAmount: 0, alreadyRefunded: 0, remainingRefundable: 0 };
  }
  const originalAmount = paymentDoc.amount ?? 0;
  const alreadyRefunded = paymentDoc.refundedAmount ?? 0;
  const remainingRefundable = Math.max(0, originalAmount - alreadyRefunded);
  return { originalAmount, alreadyRefunded, remainingRefundable };
}

// ── Service ──────────────────────────────────────────────────────────────────

export class RefundOrchestratorService {
  /**
   * Process a refund through the orchestrator pipeline.
   *
   * Behaviour is controlled by the 'refunds.orchestrator_mode' flag.
   */
  async processRefund(input: RefundInput): Promise<RefundResult> {
    const mode = getOrchestratorFlag('refunds.orchestrator_mode');

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

  private async _runShadow(input: RefundInput): Promise<RefundResult> {
    const { userId, paymentId, requestedAmount, reason, idempotencyKey, refundType, legacyOutcome } = input;

    try {
      // Read-only: compute ceiling check and current wallet balance
      const { originalAmount, alreadyRefunded, remainingRefundable } = await computeAlreadyRefunded(paymentId);
      const EPSILON = 0.01;
      const wouldExceedCeiling = requestedAmount > remainingRefundable + EPSILON;

      const wallet = await Wallet.findOne({ user: userId }).lean();
      const currentBalance = wallet?.balance?.available ?? 0;
      const intendedNewBalance = currentBalance + requestedAmount;

      const ceilingCheckResult = wouldExceedCeiling
        ? `REJECTED: requested=${requestedAmount} > remaining=${remainingRefundable} (original=${originalAmount}, already_refunded=${alreadyRefunded})`
        : `ALLOWED: requested=${requestedAmount} <= remaining=${remainingRefundable}`;

      logger.info('[ORCHESTRATOR:SHADOW] refund_would_execute', {
        userId,
        paymentId,
        requestedAmount,
        refundType,
        reason,
        idempotencyKey,
        originalAmount,
        alreadyRefunded,
        remainingRefundable,
        wouldExceedCeiling,
        currentBalance,
        intendedNewBalance: wouldExceedCeiling ? null : intendedNewBalance,
        intendedAction: wouldExceedCeiling ? 'reject_refund' : 'credit_wallet',
        legacyOutcome: legacyOutcome ?? 'not_provided',
        timestamp: new Date().toISOString(),
      });

      const result: RefundResult = {
        success: true,
        shadowMode: true,
        remainingRefundable,
        rejected: wouldExceedCeiling,
        rejectionReason: wouldExceedCeiling ? ceilingCheckResult : undefined,
        shadowDiff: {
          intendedAction: wouldExceedCeiling
            ? `reject_refund: ceiling_exceeded`
            : `credit_wallet: +${requestedAmount} (balance: ${currentBalance} → ${intendedNewBalance})`,
          ceilingCheckResult,
          legacyOutcome,
        },
      };

      return result;
    } catch (err: any) {
      // Shadow mode MUST NOT throw
      logger.error('[ORCHESTRATOR:SHADOW] refund_shadow_error', {
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
          ceilingCheckResult: 'error',
          legacyOutcome: input.legacyOutcome,
        },
      };
    }
  }

  // ── Live mode ────────────────────────────────────────────────────────────────

  private async _runLive(input: RefundInput): Promise<RefundResult> {
    const { userId, paymentId, requestedAmount, reason, idempotencyKey, refundType, referenceId, referenceModel } =
      input;

    // ── Step 1: Idempotency — Redis L1 ──────────────────────────────────────
    const cached = await getCachedIdempotencyResult(idempotencyKey);
    if (cached) {
      logger.info('[ORCHESTRATOR:LIVE] refund_idempotency_hit_l1', { userId, idempotencyKey });
      return cached;
    }

    // ── Step 2: Idempotency — DB-level L2 ────────────────────────────────────
    // Check if a CoinTransaction already exists for this idempotency key
    const existingTx = await CoinTransaction.findOne({
      user: userId,
      'metadata.orchestratorRefundIdempotencyKey': idempotencyKey,
    }).lean();

    if (existingTx) {
      logger.info('[ORCHESTRATOR:LIVE] refund_idempotency_hit_l2', {
        userId,
        idempotencyKey,
        txId: existingTx._id,
      });
      const dbResult: RefundResult = {
        success: true,
        refundId: String(existingTx._id),
        refundedAmount: existingTx.amount,
      };
      await cacheIdempotencyResult(idempotencyKey, dbResult);
      return dbResult;
    }

    // ── Step 3: Load payment record ───────────────────────────────────────────
    const paymentDoc = await Payment.findOne({ paymentId }).lean();

    // ── Step 4: Compute ceiling ───────────────────────────────────────────────
    const EPSILON = 0.01;
    let remainingRefundable = 0;

    if (paymentDoc) {
      const originalAmount = paymentDoc.amount ?? 0;
      const alreadyRefunded = paymentDoc.refundedAmount ?? 0;
      remainingRefundable = Math.max(0, originalAmount - alreadyRefunded);

      if (requestedAmount > remainingRefundable + EPSILON) {
        const rejectionReason =
          `Refund of ${requestedAmount} exceeds remaining refundable amount ${remainingRefundable} ` +
          `(original ${originalAmount}, already refunded ${alreadyRefunded}) for payment ${paymentId}`;

        logger.warn('[ORCHESTRATOR:LIVE] refund_ceiling_exceeded', {
          userId,
          paymentId,
          requestedAmount,
          remainingRefundable,
          originalAmount,
          alreadyRefunded,
          idempotencyKey,
        });

        const rejectedResult: RefundResult = {
          success: false,
          rejected: true,
          rejectionReason,
          remainingRefundable,
        };
        return rejectedResult;
      }
    }

    // ── Step 5: Atomic pipeline ───────────────────────────────────────────────
    const session = await mongoose.startSession();
    session.startTransaction();

    let result: RefundResult;

    try {
      // Atomic ceiling guard on Payment document
      // Only increment refundedAmount if the new total won't exceed original amount.
      if (paymentDoc) {
        const guardResult = await Payment.findOneAndUpdate(
          {
            paymentId,
            $expr: {
              $lte: [{ $add: [{ $ifNull: ['$refundedAmount', 0] }, requestedAmount] }, '$amount'],
            },
          },
          {
            $inc: { refundedAmount: requestedAmount },
            $set: { 'metadata.lastOrchestratorRefundKey': idempotencyKey },
          },
          { new: true, session },
        );

        if (!guardResult) {
          await session.abortTransaction();
          const rr = await computeAlreadyRefunded(paymentId);
          logger.warn('[ORCHESTRATOR:LIVE] refund_atomic_guard_rejected', {
            userId,
            paymentId,
            requestedAmount,
            remaining: rr.remainingRefundable,
            idempotencyKey,
          });
          return {
            success: false,
            rejected: true,
            rejectionReason: `Atomic guard: refund of ${requestedAmount} would exceed original payment for ${paymentId}`,
            remainingRefundable: rr.remainingRefundable,
          };
        }
      }

      // Credit wallet
      const creditResult = await walletService.credit({
        userId,
        amount: requestedAmount,
        source: 'admin',
        description: `Refund: ${reason} [orchestrator]`,
        operationType: 'refund',
        referenceId: referenceId ? `refund:${referenceId}` : `refund:${paymentId}`,
        referenceModel: referenceModel ?? 'Payment',
        metadata: {
          orchestratorRefundIdempotencyKey: idempotencyKey,
          paymentId,
          refundType,
          reason,
        },
        session,
      });

      await session.commitTransaction();

      // Recompute remaining after the atomic update
      const updated = await Payment.findOne({ paymentId }).lean();
      const newRemaining = updated ? Math.max(0, (updated.amount ?? 0) - (updated.refundedAmount ?? 0)) : 0;

      result = {
        success: true,
        refundId: creditResult.transactionId?.toString(),
        refundedAmount: requestedAmount,
        remainingRefundable: newRemaining,
        shadowMode: false,
      };

      logger.info('[ORCHESTRATOR:LIVE] refund_success', {
        userId,
        paymentId,
        requestedAmount,
        refundType,
        reason,
        idempotencyKey,
        transactionId: result.refundId,
        remainingRefundable: result.remainingRefundable,
      });

      await cacheIdempotencyResult(idempotencyKey, result);
      return result;
    } catch (err: any) {
      await session.abortTransaction();
      logger.error('[ORCHESTRATOR:LIVE] refund_pipeline_failed', {
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
}

export const refundOrchestratorService = new RefundOrchestratorService();
export default refundOrchestratorService;
