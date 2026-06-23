/**
 * Failed Refund Retry Job (P0-5)
 *
 * Automatically retries refunds for orders where the initial refund failed.
 * Targets orders with payment.failureReason === 'NEEDS_MANUAL_REFUND' and
 * payment.status === 'failed' that are less than 24 hours old.
 *
 * Schedule: Every 5 minutes
 * Lock: 5 minutes (prevents concurrent runs across pods)
 *
 * After 3 failed retry attempts the order is flagged for manual ops review
 * and a critical error is logged (picked up by Sentry).
 */

import { createServiceLogger } from '../config/logger';
import { scheduleCronJob } from '../config/cronJobs';
import redisService from '../services/redisService';
import { Order } from '../models/Order';
import { refundService } from '../services/refundService';
import { createRefund as razorpayCreateRefund } from '../services/razorpayService';

const logger = createServiceLogger('failed-refund-retry-job');

const LOCK_KEY = 'job:failed-refund-retry';
const LOCK_TTL = 5 * 60; // 5 minutes
const BATCH_SIZE = 50;
const MAX_RETRY_ATTEMPTS = 3;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours — don't retry very old ones

/**
 * Main retry job function.
 *
 * 1. Finds orders where payment.failureReason === 'NEEDS_MANUAL_REFUND'
 *    and payment.status === 'failed' and createdAt > 24 hours ago
 * 2. For each order, attempts the refund again via the refund service
 * 3. If refund succeeds, updates the order status
 * 4. If refund fails again after 3 attempts, sends a critical alert (Sentry/log)
 */
export async function runFailedRefundRetry(): Promise<void> {
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.debug('[REFUND-RETRY] Lock held by another instance — skipping');
      return;
    }

    logger.info('[REFUND-RETRY] Job started');

    const twentyFourHoursAgo = new Date(Date.now() - MAX_AGE_MS);

    // Find orders needing refund retry
    const failedRefundOrders = await Order.find({
      'payment.failureReason': 'NEEDS_MANUAL_REFUND',
      'payment.status': 'failed',
      createdAt: { $gt: twentyFourHoursAgo },
    })
      .select('_id orderNumber user payment totals status refundRetryCount paymentGateway')
      .limit(BATCH_SIZE)
      .lean();

    if (failedRefundOrders.length === 0) {
      logger.info('[REFUND-RETRY] No failed refund orders found');
      return;
    }

    logger.info(`[REFUND-RETRY] Found ${failedRefundOrders.length} orders needing refund retry`);

    let successCount = 0;
    let failCount = 0;
    let exhaustedCount = 0;

    for (const order of failedRefundOrders) {
      const currentRetryCount = (order as any).refundRetryCount || 0;

      // Check if max retries exceeded
      if (currentRetryCount >= MAX_RETRY_ATTEMPTS) {
        // Flag for manual review and emit critical alert
        await Order.findByIdAndUpdate(order._id, {
          $set: {
            'payment.failureReason': 'REFUND_EXHAUSTED_MANUAL_REQUIRED',
          },
          $push: {
            flags: 'refund_retry_exhausted',
            timeline: {
              status: order.status,
              message: `Refund retry exhausted after ${MAX_RETRY_ATTEMPTS} attempts — escalated to manual review`,
              timestamp: new Date(),
              updatedBy: 'system',
            },
          },
        });

        logger.error(
          `[REFUND-RETRY] CRITICAL: Order ${order.orderNumber} (${order._id}) refund retry exhausted ` +
            `after ${MAX_RETRY_ATTEMPTS} attempts. Manual intervention required. ` +
            `UserId: ${order.user}, Amount: ${order.totals?.paidAmount || order.totals?.total || 'unknown'}`,
        );
        exhaustedCount++;
        continue;
      }

      try {
        const refundAmount = order.totals?.paidAmount || order.totals?.total || 0;
        const userId = order.user?.toString();

        if (!userId || refundAmount <= 0) {
          logger.warn(`[REFUND-RETRY] Order ${order.orderNumber} has no user or zero amount — skipping`);
          continue;
        }

        // Atomic claim: increment refundRetryCount only if it hasn't changed since we
        // read it. This prevents two concurrent job instances from both processing the
        // same retry slot — the second findOneAndUpdate will return null and be skipped.
        const claimed = await Order.findOneAndUpdate(
          {
            _id: order._id,
            refundRetryCount: currentRetryCount,
            'payment.status': 'failed',
          },
          { $inc: { refundRetryCount: 1 } },
          { new: false },
        );
        if (!claimed) {
          logger.debug(
            `[REFUND-RETRY] Order ${order.orderNumber} claim failed — already being retried by another instance`,
          );
          continue;
        }

        let refundSucceeded = false;

        // Attempt 1: Try wallet/coin refund via refundService
        if ((order.payment?.method as string) === 'wallet' || (order.payment?.method as string) === 'coins') {
          try {
            await refundService.processRefund({
              userId,
              amount: refundAmount,
              reason: `Auto-retry refund (attempt ${currentRetryCount + 1}) for failed refund`,
              refundType: 'order_cancel',
              referenceId: `retry-refund:${order._id}:${currentRetryCount + 1}`,
              referenceModel: 'Order',
            });
            refundSucceeded = true;
          } catch (walletErr: any) {
            logger.warn(`[REFUND-RETRY] Wallet refund failed for ${order.orderNumber}: ${walletErr.message}`);
          }
        }

        // Attempt 2: Try Razorpay refund for card/UPI/netbanking payments
        if (
          !refundSucceeded &&
          (order.payment?.method as string) !== 'wallet' &&
          (order.payment?.method as string) !== 'coins' &&
          (order.payment?.method as string) !== 'cod'
        ) {
          const paymentId = order.payment?.transactionId || (order as any).paymentGateway?.gatewayPaymentId;

          if (paymentId) {
            try {
              await razorpayCreateRefund(paymentId, refundAmount, {
                orderId: String(order._id),
                orderNumber: order.orderNumber,
                retryAttempt: currentRetryCount + 1,
                retriedByJob: true,
              });
              refundSucceeded = true;
            } catch (rzpErr: any) {
              logger.warn(`[REFUND-RETRY] Razorpay refund failed for ${order.orderNumber}: ${rzpErr.message}`);
            }
          } else {
            logger.warn(`[REFUND-RETRY] No payment ID available for Razorpay refund — order ${order.orderNumber}`);
          }
        }

        // Update order based on result.
        // NOTE: refundRetryCount was already pre-incremented by the atomic claim above,
        // so these updates must NOT include $inc: { refundRetryCount: 1 } again.
        if (refundSucceeded) {
          await Order.findByIdAndUpdate(order._id, {
            $set: {
              'payment.status': 'refunded',
              'payment.refundedAt': new Date(),
              'payment.failureReason': null,
              status: 'refunded',
            },
            $push: {
              timeline: {
                status: 'refunded',
                message: `Refund succeeded on auto-retry attempt ${currentRetryCount + 1}`,
                timestamp: new Date(),
                updatedBy: 'system',
              },
            },
          });
          successCount++;
          logger.info(
            `[REFUND-RETRY] Refund succeeded for order ${order.orderNumber} on attempt ${currentRetryCount + 1}`,
          );
        } else {
          // refundRetryCount already incremented by the claim; just add timeline entry
          await Order.findByIdAndUpdate(order._id, {
            $push: {
              timeline: {
                status: order.status,
                message: `Refund retry attempt ${currentRetryCount + 1} failed — will retry`,
                timestamp: new Date(),
                updatedBy: 'system',
              },
            },
          });
          failCount++;
          logger.warn(
            `[REFUND-RETRY] Refund retry ${currentRetryCount + 1}/${MAX_RETRY_ATTEMPTS} failed for order ${order.orderNumber}`,
          );
        }
      } catch (err: any) {
        failCount++;
        logger.error(`[REFUND-RETRY] Unexpected error processing order ${order.orderNumber}: ${err.message}`);
      }
    }

    logger.info('[REFUND-RETRY] Job complete', {
      total: failedRefundOrders.length,
      succeeded: successCount,
      failed: failCount,
      exhausted: exhaustedCount,
    });
  } catch (err: any) {
    logger.error('[REFUND-RETRY] Job failed:', err.message || err);
  } finally {
    if (lockToken) {
      try {
        await redisService.releaseLock(LOCK_KEY, lockToken);
      } catch (err) {
        logger.warn('[REFUND-RETRY] Failed to release lock:', err);
      }
    }
  }
}

/**
 * Initialize the failed refund retry job with the cron scheduler.
 * Runs every 5 minutes.
 */
export function initializeFailedRefundRetryJob(): void {
  scheduleCronJob(
    '*/5 * * * *',
    async () => {
      await runFailedRefundRetry().catch((err) =>
        logger.error('[REFUND-RETRY] Unhandled error in scheduled task:', err),
      );
    },
    'Failed refund retry (every 5 min)',
  );
  logger.info('  Failed refund retry job started (runs every 5 min)');
}
