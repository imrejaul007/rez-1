/**
 * Stuck Payment Pipeline Recovery Job
 *
 * Handles three categories of payment anomalies:
 *
 * 1. FAILED RAZORPAY REFUNDS — UserLockDeal records with
 *    metadata.razorpayRefundFailed: true. Retries the refund via
 *    Razorpay API and clears the flag on success.
 *
 * 2. AMOUNT MISMATCH ORDERS — Orders with flags containing
 *    'amount_mismatch'. Logs a CRITICAL alert for manual ops review.
 *    These require human judgement (could be promo/rounding edge cases).
 *
 * 3. STUCK POST-PAYMENT PIPELINE — Orders where payment succeeded
 *    (payment.status === 'paid') but postPaymentProcessed is still false
 *    after >10 minutes. Logs a CRITICAL alert so ops can replay the webhook.
 *    We do NOT auto-replay to avoid double-fulfillment risk.
 *
 * Schedule: Every 15 minutes
 * Lock: 10 minutes (prevents concurrent runs on multi-pod deployments)
 */

import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import { Order } from '../models/Order';
import { UserLockDeal } from '../models/UserLockDeal';
import { createRefund as razorpayCreateRefund } from '../services/razorpayService';

const logger = createServiceLogger('stuck-payment-pipeline-job');

const LOCK_KEY = 'job:stuck-payment-pipeline';
const LOCK_TTL = 10 * 60; // 10 minutes
const STUCK_PIPELINE_THRESHOLD_MINUTES = 10;
const BATCH_SIZE = 50;

// ==================== TASK 1: Retry failed Razorpay refunds ====================

async function retryFailedRazorpayRefunds(): Promise<void> {
  const locks = await UserLockDeal.find({
    'metadata.razorpayRefundFailed': true,
  })
    .limit(BATCH_SIZE)
    .lean();

  if (locks.length === 0) return;

  logger.info(`[STUCK-PIPELINE] Found ${locks.length} lock deals with failed Razorpay refunds. Retrying...`);

  for (const lock of locks) {
    if (!lock.depositPaymentId || !lock.refundAmount) {
      logger.warn(`[STUCK-PIPELINE] Lock ${lock._id} has no depositPaymentId or refundAmount — skipping`);
      continue;
    }

    try {
      const refund = await razorpayCreateRefund(lock.depositPaymentId, lock.refundAmount, {
        lockDealId: String(lock._id),
        userId: String(lock.user),
        retriedByJob: true,
        originalError: (lock as any).metadata?.razorpayRefundError,
      });

      // Clear the failed flag on success
      await UserLockDeal.findByIdAndUpdate(lock._id, {
        $unset: {
          'metadata.razorpayRefundFailed': 1,
          'metadata.razorpayRefundError': 1,
        },
        $set: {
          'metadata.razorpayRefundId': (refund as any).id,
          'metadata.razorpayRefundRetriedAt': new Date(),
        },
      });

      logger.info(
        `✅ [STUCK-PIPELINE] Razorpay refund retry succeeded for lock ${lock._id}. ` +
          `RefundId: ${(refund as any).id}`,
      );
    } catch (refundErr: any) {
      logger.error(
        `🚨 [STUCK-PIPELINE] Razorpay refund retry FAILED for lock ${lock._id}. ` +
          `PaymentId: ${lock.depositPaymentId}, Amount: ₹${lock.refundAmount}. ` +
          `Error: ${refundErr.message}`,
      );
      // Update the error message for visibility
      await UserLockDeal.findByIdAndUpdate(lock._id, {
        $set: {
          'metadata.razorpayRefundError': refundErr.message,
          'metadata.razorpayRefundLastRetryAt': new Date(),
        },
      }).catch((err: any) =>
        logger.warn('[StuckPaymentJob] Failed to record refund error metadata', { error: err.message }),
      );
    }
  }
}

// ==================== TASK 2: Alert on amount-mismatch orders ====================

async function alertOnAmountMismatchOrders(): Promise<void> {
  const mismatchOrders = await Order.find({
    flags: { $in: ['amount_mismatch'] },
    // Only alert on recently created ones (last 24h) to avoid alert fatigue on stale records
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
    .select('_id orderNumber payment.amount payment.razorpayOrderId payment.razorpayPaymentId createdAt flags')
    .limit(BATCH_SIZE)
    .lean();

  if (mismatchOrders.length === 0) return;

  logger.error(
    `🚨 [STUCK-PIPELINE] CRITICAL: ${mismatchOrders.length} orders with amount_mismatch flag detected. ` +
      `Manual review required! Order IDs: ${mismatchOrders.map((o: any) => o._id).join(', ')}`,
  );

  for (const order of mismatchOrders) {
    logger.error(
      `🚨 [STUCK-PIPELINE] Amount mismatch: Order ${(order as any)._id} ` +
        `(orderNumber: ${(order as any).orderNumber || 'N/A'}) ` +
        `| PaymentAmount: ${(order as any).payment?.amount} ` +
        `| RazorpayOrderId: ${(order as any).payment?.razorpayOrderId || 'N/A'} ` +
        `| CreatedAt: ${(order as any).createdAt}`,
    );
  }
}

// ==================== TASK 3: Alert on stuck post-payment pipeline ====================

async function alertOnStuckPaymentPipeline(): Promise<void> {
  const stuckThreshold = new Date(Date.now() - STUCK_PIPELINE_THRESHOLD_MINUTES * 60 * 1000);

  const stuckOrders = await Order.find({
    postPaymentProcessed: { $ne: true },
    'payment.status': 'paid',
    // Must have a real Razorpay order ID — excludes test/seed orders and COD orders
    'payment.razorpayOrderId': { $exists: true, $nin: [null, ''] },
    createdAt: { $lt: stuckThreshold },
    // Exclude already-cancelled/failed orders
    status: { $nin: ['cancelled', 'failed', 'refunded'] },
  })
    .select('_id orderNumber payment.razorpayOrderId payment.razorpayPaymentId createdAt status')
    .limit(BATCH_SIZE)
    .lean();

  if (stuckOrders.length === 0) return;

  logger.error(
    `🚨 [STUCK-PIPELINE] CRITICAL: ${stuckOrders.length} orders paid but pipeline NOT run (>${STUCK_PIPELINE_THRESHOLD_MINUTES}m). ` +
      `Webhook replay required! Order IDs: ${stuckOrders.map((o: any) => o._id).join(', ')}`,
  );

  for (const order of stuckOrders) {
    logger.error(
      `🚨 [STUCK-PIPELINE] Pipeline stuck: Order ${(order as any)._id} ` +
        `(orderNumber: ${(order as any).orderNumber || 'N/A'}) ` +
        `| Status: ${(order as any).status} ` +
        `| RazorpayOrderId: ${(order as any).payment?.razorpayOrderId || 'N/A'} ` +
        `| PaymentId: ${(order as any).payment?.razorpayPaymentId || 'N/A'} ` +
        `| CreatedAt: ${(order as any).createdAt}`,
    );
  }
}

// ==================== MAIN ENTRY POINT ====================

export async function runStuckPaymentPipelineJob(): Promise<void> {
  const lock = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
  if (!lock) {
    logger.debug('[STUCK-PIPELINE] Could not acquire lock — another instance is running');
    return;
  }

  logger.info('[STUCK-PIPELINE] Starting stuck payment pipeline recovery job');

  try {
    await Promise.allSettled([
      retryFailedRazorpayRefunds(),
      alertOnAmountMismatchOrders(),
      alertOnStuckPaymentPipeline(),
    ]);

    logger.info('[STUCK-PIPELINE] Job completed');
  } catch (err: any) {
    logger.error('[STUCK-PIPELINE] Job error:', err);
  } finally {
    await redisService.releaseLock(LOCK_KEY, lock).catch(() => {});
  }
}

/**
 * Initialize as a scheduled cron job.
 * Returns the cron task so callers can push it into activeCronJobs for graceful shutdown.
 */
export function initializeStuckPaymentPipelineJob(cron: any, scheduleCronJob: any): void {
  // Every 15 minutes
  scheduleCronJob('*/15 * * * *', runStuckPaymentPipelineJob, 'Stuck payment pipeline recovery (every 15 min)');
}
