import crypto from 'crypto';
import { Types, ClientSession } from 'mongoose';
import { CoinTransaction } from '../models/CoinTransaction';
import { Wallet } from '../models/Wallet';
import { Order } from '../models/Order';
import { rewardEngine } from '../core/rewardEngine';
import { walletService } from './walletService';
import { ledgerService } from './ledgerService';
import gamificationEventBus from '../events/gamificationEventBus';
import redisService from './redisService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('refund-service');

// ─── Types ──────────────────────────────────────────────────

export type RefundType = 'order_cancel' | 'booking_cancel' | 'fraud' | 'admin_manual' | 'cashback_clawback';

export interface RefundRequest {
  userId: string;
  originalTransactionId?: string;
  originalLedgerPairId?: string;
  amount: number;
  reason: string;
  refundType: RefundType;
  referenceId: string;
  referenceModel: string;
  merchantId?: string;
  merchantLiabilityAmount?: number;
  skipNotification?: boolean;
  adminUserId?: string;
  session?: ClientSession;
}

export interface RefundResult {
  success: boolean;
  reversalTransactionId: Types.ObjectId | null;
  amount: number;
  newBalance: number;
  merchantLiabilityReversed: number;
  reason: string;
  idempotencyKey: string;
  duplicate?: boolean;
}

export class RefundError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'RefundError';
    this.code = code;
  }
}

// ─── Helpers ────────────────────────────────────────────────

function generateRefundIdempotencyKey(userId: string, referenceId: string, refundType: string): string {
  return crypto.createHash('sha256')
    .update(`refund:${userId}:${referenceId}:${refundType}`)
    .digest('hex');
}

// ─── Refund Service ─────────────────────────────────────────

class RefundService {

  /**
   * Central refund orchestrator.
   *
   * Steps:
   * 1. Generate idempotency key
   * 2. Duplicate check (DB-level)
   * 3. Reverse wallet (via rewardEngine or walletService.debit)
   * 4. Reverse merchant liability (if applicable)
   * 5. Emit refund_processed event
   * 6. Send notification (unless skipped)
   */
  async processRefund(request: RefundRequest): Promise<RefundResult> {
    const {
      userId, originalTransactionId, originalLedgerPairId,
      amount, reason, refundType, referenceId, referenceModel,
      merchantId, merchantLiabilityAmount,
      skipNotification = false, adminUserId, session,
    } = request;

    // Step 1: Idempotency key
    const idempotencyKey = generateRefundIdempotencyKey(userId, referenceId, refundType);

    // Step 2: Duplicate check (DB-level — check both credit refunds and debit reversals)
    const existingRefund = await CoinTransaction.findOne({
      user: userId,
      'metadata.refundIdempotencyKey': idempotencyKey,
    }).lean();

    if (existingRefund) {
      logger.info('Duplicate refund detected', { userId, referenceId, refundType });
      return {
        success: true,
        reversalTransactionId: (existingRefund as any)._id,
        amount: (existingRefund as any).amount,
        newBalance: (existingRefund as any).balance,
        merchantLiabilityReversed: 0,
        reason,
        idempotencyKey,
        duplicate: true,
      };
    }

    // Validate amount
    if (amount <= 0) {
      return {
        success: true,
        reversalTransactionId: null,
        amount: 0,
        newBalance: 0,
        merchantLiabilityReversed: 0,
        reason,
        idempotencyKey,
      };
    }

    // Step 3: Reverse wallet
    let reversalTransactionId: Types.ObjectId | null = null;
    let newBalance = 0;

    if (originalTransactionId) {
      // Use rewardEngine.reverseReward() for full reversal (handles multiplier bonus too)
      try {
        const reversal = await rewardEngine.reverseReward(
          originalTransactionId,
          reason,
          { session },
        );
        reversalTransactionId = reversal.reversalTransactionId;
        newBalance = reversal.newBalance;
      } catch (err: any) {
        // If reversal fails due to insufficient balance, credit instead (refund scenario)
        if (err.message?.includes('Insufficient') || err.message?.includes('concurrent')) {
          logger.warn('reverseReward failed (insufficient balance), falling back to credit', { userId, amount, reason });
          const creditResult = await walletService.credit({
            userId,
            amount,
            source: 'admin',
            description: `Refund: ${reason}`,
            operationType: 'refund',
            referenceId: `refund:${referenceId}`,
            referenceModel,
            // SECURITY: Refunds must always succeed, even on frozen wallets —
            // the user has a legal right to their money back. The
            // allowOnFrozenWallet flag bypasses the frozen-wallet guard.
            allowOnFrozenWallet: true,
            metadata: {
              idempotencyKey: `refund-fallback:${idempotencyKey}`,
              refundIdempotencyKey: idempotencyKey,
              refundType,
              originalTransactionId,
              reason,
              ...(adminUserId && { adminUserId }),
            },
            session,
          });
          reversalTransactionId = creditResult.transactionId;
          newBalance = creditResult.newBalance;
        } else {
          throw err;
        }
      }
    } else {
      // No original transaction — credit coins back (e.g., order cancel coin refund)
      const creditResult = await walletService.credit({
        userId,
        amount,
        source: 'admin',
        description: `Refund: ${reason}`,
        operationType: 'refund',
        referenceId: `refund:${referenceId}`,
        referenceModel,
        // SECURITY: Refunds must always succeed, even on frozen wallets —
        // the user has a legal right to their money back. The
        // allowOnFrozenWallet flag bypasses the frozen-wallet guard.
        allowOnFrozenWallet: true,
        metadata: {
          idempotencyKey: `refund:${idempotencyKey}`,
          refundIdempotencyKey: idempotencyKey,
          refundType,
          reason,
          ...(adminUserId && { adminUserId }),
        },
        session,
      });
      reversalTransactionId = creditResult.transactionId;
      newBalance = creditResult.newBalance;
    }

    // Step 4: Reverse merchant liability
    let merchantLiabilityReversed = 0;
    if (merchantId && merchantLiabilityAmount && merchantLiabilityAmount > 0) {
      try {
        await ledgerService.recordEntry({
          // Reverse: credit merchant_wallet (reduce liability), debit platform_float
          creditAccount: { type: 'merchant_wallet', id: new Types.ObjectId(merchantId) },
          debitAccount: { type: 'platform_float', id: ledgerService.getPlatformAccountId('platform_float') },
          amount: merchantLiabilityAmount,
          coinType: 'nuqta',
          operationType: 'cashback_reversal',
          referenceId: `refund-merchant:${referenceId}`,
          referenceModel,
          reversalReferenceId: originalLedgerPairId || undefined,
          metadata: {
            description: `Merchant liability reversal: ${reason}`,
            ...(adminUserId && { adminUserId }),
          },
        }, session);
        merchantLiabilityReversed = merchantLiabilityAmount;
        logger.info('Merchant liability reversed', { merchantId, amount: merchantLiabilityAmount, referenceId });
      } catch (err) {
        logger.error('Merchant liability reversal failed (non-blocking)', err as Error, { merchantId, referenceId });
      }
    }

    // Step 5: Emit refund_processed event
    setImmediate(() => {
      try {
        gamificationEventBus.emit('refund_processed' as any, {
          userId,
          entityId: referenceId,
          entityType: refundType,
          amount,
          metadata: {
            refundType,
            reason,
            reversalTransactionId: reversalTransactionId?.toString(),
            merchantLiabilityReversed,
            adminUserId,
          },
          source: { controller: 'refundService', action: 'processRefund' },
        });
      } catch (err) {
        logger.error('Failed to emit refund_processed event', err as Error);
      }
    });

    // Step 6: Send notification (non-blocking)
    if (!skipNotification) {
      this.sendRefundNotification(userId, amount, reason, refundType).catch((err) => {
        logger.error('Refund notification failed (non-blocking)', err as Error, { userId });
      });
    }

    const result: RefundResult = {
      success: true,
      reversalTransactionId,
      amount,
      newBalance,
      merchantLiabilityReversed,
      reason,
      idempotencyKey,
    };

    logger.info('Refund processed', {
      userId, amount, refundType, referenceId,
      reversalTransactionId: reversalTransactionId?.toString(),
      merchantLiabilityReversed,
    });

    return result;
  }

  /**
   * Batch process pending refunds (for cron job).
   */
  async batchProcessRefunds(batchSize: number = 50): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    errors: Array<{ referenceId: string; error: string }>;
  }> {
    const errors: Array<{ referenceId: string; error: string }> = [];
    let succeeded = 0;

    // Find cancelled orders with pending refund status
    const pendingOrders = await Order.find({
      status: 'cancelled',
      'cancellation.refundStatus': 'pending',
    })
      .select('_id user totals payment cancellation')
      .limit(batchSize)
      .lean();

    for (const order of pendingOrders) {
      try {
        const coinsUsed = (order as any).totals?.coinsUsed || (order as any).payment?.coinsUsed || 0;
        if (coinsUsed > 0) {
          await this.processRefund({
            userId: (order as any).user.toString(),
            amount: coinsUsed,
            reason: (order as any).cancellation?.reason || 'Order cancelled',
            refundType: 'order_cancel',
            referenceId: (order as any)._id.toString(),
            referenceModel: 'Order',
          });
        }

        // Mark refund as completed
        await Order.findByIdAndUpdate((order as any)._id, {
          $set: { 'cancellation.refundStatus': 'completed' },
        });

        succeeded++;
      } catch (err: any) {
        errors.push({
          referenceId: (order as any)._id.toString(),
          error: err.message,
        });
        logger.error('Batch refund failed for order', err, { orderId: (order as any)._id });
      }
    }

    const processed = pendingOrders.length;
    logger.info('Batch refund complete', { processed, succeeded, failed: errors.length });

    return { processed, succeeded, failed: errors.length, errors };
  }

  /**
   * Send refund notification to user (SMS + push).
   */
  private async sendRefundNotification(
    userId: string, amount: number, reason: string, refundType: RefundType,
  ): Promise<void> {
    try {
      const { NotificationService } = await import('./notificationService');
      const notificationService = new NotificationService();

      const typeLabel = {
        order_cancel: 'Order cancellation',
        booking_cancel: 'Booking cancellation',
        fraud: 'Account security',
        admin_manual: 'Manual adjustment',
        cashback_clawback: 'Cashback adjustment',
      }[refundType] || 'Refund';

      await NotificationService.createNotification({
        userId,
        title: `${typeLabel} — ${amount} coins refunded`,
        message: `${amount} coins have been refunded to your wallet. Reason: ${reason}`,
        type: 'success',
        category: 'earning',
        data: { amount },
      });
    } catch (err) {
      logger.error('Failed to send refund notification', err as Error, { userId });
    }
  }
}

export const refundService = new RefundService();
export default refundService;
