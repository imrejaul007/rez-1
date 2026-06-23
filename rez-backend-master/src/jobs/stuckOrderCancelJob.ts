/**
 * Stuck Order Auto-Cancel Job (P1-8)
 *
 * Orders stuck in 'placed' status for more than 60 minutes (merchant did not
 * confirm) are auto-cancelled. For each cancelled order:
 *   - Status is set to 'cancelled' with a clear reason
 *   - Wallet/coin refund is triggered for wallet/coin payments
 *   - Razorpay refund is triggered for card/UPI/netbanking payments
 *   - Customer notification is sent via socket
 *
 * This supplements the existing orderLifecycleJobs.ts which handles *unpaid*
 * orders. This job targets orders that were PAID (or COD) but the merchant
 * never moved them past 'placed'.
 *
 * Schedule: Every 10 minutes
 * Lock: 10 minutes (prevents concurrent runs)
 */

import { createServiceLogger } from '../config/logger';
import { scheduleCronJob } from '../config/cronJobs';
import redisService from '../services/redisService';
import { Order } from '../models/Order';
import { cancelOrderCore } from '../services/cancelOrderService';
import orderSocketService from '../services/orderSocketService';

const logger = createServiceLogger('stuck-order-cancel-job');

const LOCK_KEY = 'job:stuck-order-cancel';
const LOCK_TTL = 10 * 60; // 10 minutes
// BL-L1 FIX: Configurable threshold via env var (default 60 min).
// Set STUCK_ORDER_CANCEL_THRESHOLD_MS on the worker dyno to adjust without
// a deploy — e.g. raise to 2h during Razorpay outages to avoid mass-cancelling
// valid paid orders while the gateway is recovering.
const STUCK_THRESHOLD_MS = parseInt(process.env.STUCK_ORDER_CANCEL_THRESHOLD_MS || '3600000', 10);
const BATCH_SIZE = 100;
const CANCEL_REASON = 'Auto-cancelled: merchant did not confirm within SLA';

/**
 * Main job function.
 *
 * 1. Finds orders where status === 'placed' and createdAt < 60 minutes ago
 *    AND payment is completed (paid/cod) — meaning the merchant simply never confirmed.
 * 2. Updates each to status: 'cancelled' with cancelReason
 * 3. Triggers refund for each (wallet refund for coin payments, Razorpay refund for card)
 * 4. Sends notification to customer
 */
export async function runStuckOrderCancel(): Promise<void> {
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.debug('[STUCK-CANCEL] Lock held by another instance — skipping');
      return;
    }

    logger.info('[STUCK-CANCEL] Job started');

    const sixtyMinutesAgo = new Date(Date.now() - STUCK_THRESHOLD_MS);

    // Find orders stuck in 'placed' with a completed payment (paid or COD)
    // that the merchant never confirmed within the SLA window.
    // Exclude orders already handled by the unpaid-order lifecycle job
    // (those have payment.status in ['pending', 'processing']).
    const stuckOrders = await Order.find({
      status: 'placed',
      createdAt: { $lt: sixtyMinutesAgo },
      $or: [{ 'payment.status': 'paid' }, { 'payment.status': 'captured' }, { 'payment.method': 'cod' }],
    })
      .select('_id orderNumber user payment totals items.store')
      .limit(BATCH_SIZE)
      .lean();

    if (stuckOrders.length === 0) {
      logger.info('[STUCK-CANCEL] No stuck confirmed orders found');
      return;
    }

    logger.info(`[STUCK-CANCEL] Found ${stuckOrders.length} orders stuck in 'placed' for >60 min`);

    let cancelledCount = 0;
    let errorCount = 0;

    for (const order of stuckOrders) {
      try {
        // Determine if we need a refund: skip for COD (no money collected),
        // process for wallet/card/UPI payments.
        const isCod = order.payment?.method === 'cod';

        // Use canonical cancelOrderCore which handles:
        // status change -> stock restore -> refund -> cashback reversal -> notification
        await cancelOrderCore({
          orderId: String(order._id),
          reason: CANCEL_REASON,
          cancelledBy: 'system',
          skipRefund: isCod, // COD orders have no money to refund
        });

        // Send real-time notification to customer
        const userId = order.user?.toString();
        if (userId) {
          try {
            orderSocketService.emitToUser(userId, 'order_cancelled', {
              orderId: String(order._id),
              orderNumber: order.orderNumber,
              reason: CANCEL_REASON,
              refundInitiated: !isCod,
              timestamp: new Date(),
            });
          } catch (socketErr) {
            logger.warn(`[STUCK-CANCEL] Socket notification failed for order ${order.orderNumber}:`, socketErr);
          }
        }

        cancelledCount++;
        logger.info(
          `[STUCK-CANCEL] Auto-cancelled stuck order: ${order.orderNumber} ` +
            `(payment: ${order.payment?.method}, refund: ${!isCod})`,
        );
      } catch (err: any) {
        errorCount++;
        // If already cancelled (race condition with merchant), just log
        if (err.message?.includes('already cancelled') || err.message?.includes('terminal status')) {
          logger.info(`[STUCK-CANCEL] Order ${order.orderNumber} already in terminal state — skipping`);
        } else {
          logger.error(`[STUCK-CANCEL] Failed to cancel order ${order.orderNumber}: ${err.message}`);
        }
      }
    }

    logger.info('[STUCK-CANCEL] Job complete', {
      total: stuckOrders.length,
      cancelled: cancelledCount,
      errors: errorCount,
    });
  } catch (err: any) {
    logger.error('[STUCK-CANCEL] Job failed:', err.message || err);
  } finally {
    if (lockToken) {
      try {
        await redisService.releaseLock(LOCK_KEY, lockToken);
      } catch (err) {
        logger.warn('[STUCK-CANCEL] Failed to release lock:', err);
      }
    }
  }
}

/**
 * Initialize the stuck order cancel job with the cron scheduler.
 * Runs every 10 minutes.
 */
export function initializeStuckOrderCancelJob(): void {
  scheduleCronJob(
    '*/10 * * * *',
    async () => {
      await runStuckOrderCancel().catch((err) =>
        logger.error('[STUCK-CANCEL] Unhandled error in scheduled task:', err),
      );
    },
    'Stuck order auto-cancel (every 10 min)',
  );
  logger.info('  Stuck order auto-cancel job started (runs every 10 min)');
}
