/**
 * Payment Reconciliation Job
 *
 * Finds StorePayments stuck in 'pending' for > 5 minutes.
 * Marks very old pending (> 30 min) as 'expired'.
 *
 * Schedule: Every 10 minutes
 * Lock: 15 minutes (prevents concurrent runs)
 */

import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import StorePayment from '../models/StorePayment';
import RechargeTransaction from '../models/RechargeTransaction';
import rechargeGateway from '../services/rechargeGateway';
// HIGH 4 FIX: Use canonical cancelOrderCore so that every payment-timeout
// cancellation also restores stock and triggers the full cancel pipeline.
import { cancelOrderCore } from '../services/cancelOrderService';

const logger = createServiceLogger('payment-reconciliation-job');

const LOCK_KEY = 'job:payment-reconciliation';
const LOCK_TTL = 15 * 60; // 15 minutes
const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const EXPIRED_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const BATCH_SIZE = 100;

/**
 * Main reconciliation job function
 * Finds payments stuck in pending and marks expired ones
 * KENJI: Now also reconciles orders with expired payments
 */
export const runPaymentReconciliation = async (): Promise<void> => {
  let lockToken: string | null = null;

  try {
    // Acquire distributed lock to prevent concurrent runs
    lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.debug('[Reconciliation] Lock held by another instance — skipping');
      return;
    }

    logger.info('[Reconciliation] Job started');

    const fiveMinutesAgo = new Date(Date.now() - STUCK_THRESHOLD_MS);
    const thirtyMinutesAgo = new Date(Date.now() - EXPIRED_THRESHOLD_MS);

    // Find payments stuck in pending or processing for > 5 minutes.
    // BUG-21 FIX: Also include 'processing' so that payments that advanced past
    // 'pending' (e.g. after an authorized event) but never received a capture/
    // confirmation webhook are not silently ignored by this job.
    const stuckPayments = await (StorePayment as any)
      .find({
        status: { $in: ['pending', 'processing'] },
        createdAt: { $lt: fiveMinutesAgo },
      })
      .select('_id createdAt status razorpayOrderId userId storeId merchantId amount orderId')
      .limit(BATCH_SIZE)
      .lean();

    if (stuckPayments.length === 0) {
      logger.info('[Reconciliation] No stuck payments found');
      return;
    }

    logger.info(`[Reconciliation] Found ${stuckPayments.length} stuck payments`);

    let expiredCount = 0;
    let ordersFailedCount = 0;
    let errorCount = 0;

    // Process each stuck payment
    for (const payment of stuckPayments) {
      try {
        // If payment has been pending for > 30 minutes, mark as expired
        // (Razorpay orders expire after 15 minutes, so 30 min pending is definitely expired)
        if (payment.createdAt < thirtyMinutesAgo) {
          // Atomic status guard: only expire if still pending/processing.
          // Prevents a race between two reconciliation pods from double-updating
          // a payment that was concurrently resolved by a webhook.
          const expiredDoc = await (StorePayment as any).findOneAndUpdate(
            { _id: payment._id, status: { $in: ['pending', 'processing'] } },
            {
              $set: {
                status: 'expired',
                updatedAt: new Date(),
              },
            },
          );
          if (!expiredDoc) {
            // Status changed between find() and update() — already resolved, skip
            logger.debug(`[Reconciliation] Payment ${payment._id} status changed — skipping expire`);
            continue;
          }
          expiredCount++;
          logger.info(`[Reconciliation] Expired payment ${payment._id} (created: ${payment.createdAt.toISOString()})`);

          // HIGH 4 FIX: Use canonical cancelOrderCore instead of the previous inline
          // order.save() which only set order.status without restoring stock or
          // reversing any wallet/cashback. cancelOrderCore handles the full pipeline.
          // skipRefund=true because the Razorpay payment was never captured — no
          // money was collected so there is nothing to return to the user's wallet.
          if (payment.orderId) {
            try {
              await cancelOrderCore({
                orderId: payment.orderId,
                reason: 'Payment timeout: Razorpay webhook not received within 30 minutes',
                cancelledBy: 'system',
                skipRefund: true,
              });
              ordersFailedCount++;
              logger.info(
                `[Reconciliation] Order ${payment.orderId} cancelled via canonical pipeline (payment_timeout)`,
              );
            } catch (orderErr: any) {
              logger.warn(
                `[Reconciliation] Failed to cancel order for expired payment ${payment._id}:`,
                orderErr.message,
              );
            }
          }
        }
        // For payments stuck between 5-30 minutes, we could query Razorpay API here
        // in production to check actual status, but for now just log them
        else {
          logger.debug(
            `[Reconciliation] Monitoring payment ${payment._id} (${Math.round((Date.now() - payment.createdAt.getTime()) / 1000)}s stuck)`,
          );
        }
      } catch (err: any) {
        errorCount++;
        logger.error(`[Reconciliation] Failed to process payment ${payment._id}: ` + err.message);
      }
    }

    logger.info(`[Reconciliation] Job complete`, {
      stuck: stuckPayments.length,
      expired: expiredCount,
      ordersFailed: ordersFailedCount,
      errors: errorCount,
    });
  } catch (err: any) {
    logger.error('[Reconciliation] Job failed:', err.message || err);
  } finally {
    if (lockToken) {
      try {
        await redisService.releaseLock(LOCK_KEY, lockToken);
      } catch (err) {
        logger.warn('[Reconciliation] Failed to release lock:', err);
      }
    }
  }
};

/**
 * Register the reconciliation job with node-cron
 * Runs every 10 minutes (0, 10, 20, 30, 40, 50 minutes past the hour)
 */
export const scheduleReconciliation = (): void => {
  const cron = require('node-cron');

  // Every 10 minutes: */10 * * * *
  const task = cron.schedule('*/10 * * * *', async () => {
    try {
      await runPaymentReconciliation();
    } catch (err) {
      logger.error('[Reconciliation] Unexpected error in scheduled task:', err);
    }
  });

  logger.info('[Reconciliation] Job scheduled (every 10 minutes)');
  return task;
};

/**
 * Reconcile pending recharge transactions.
 * Finds recharges pending for > 30 minutes and checks operator status.
 */
export const reconcilePendingRecharges = async (): Promise<void> => {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  try {
    const pendingRecharges = await RechargeTransaction.find({
      status: 'pending',
      createdAt: { $lt: thirtyMinutesAgo },
    })
      .limit(50)
      .lean();

    if (pendingRecharges.length === 0) {
      logger.debug('[RechargeReconcile] No pending recharges to reconcile');
      return;
    }

    logger.info(`[RechargeReconcile] Found ${pendingRecharges.length} pending recharges older than 30 minutes`);

    for (const txn of pendingRecharges) {
      try {
        if (!txn.operatorRefId) {
          logger.warn(`[RechargeReconcile] No operatorRefId for txn ${txn._id}, skipping status check`);
          continue;
        }

        const statusResult = await rechargeGateway.checkStatus(txn.operatorRefId, txn._id.toString());
        if (statusResult.status === 'success') {
          await RechargeTransaction.findByIdAndUpdate(txn._id, {
            status: 'success',
            operatorRefId: statusResult.operatorRefId,
          });
          logger.info(`[RechargeReconcile] Resolved pending recharge ${txn._id} to success`);
        } else if (statusResult.status === 'failed') {
          await RechargeTransaction.findByIdAndUpdate(txn._id, {
            status: 'failed',
            errorMessage: 'Confirmed failed after status check',
          });
          logger.info(`[RechargeReconcile] Resolved pending recharge ${txn._id} to failed`);
        }
      } catch (e: any) {
        logger.error(`[RechargeReconcile] Status check failed for ${txn._id}:`, e.message);
      }
    }

    logger.info('[RechargeReconcile] Recharge reconciliation complete');
  } catch (e: any) {
    logger.error('[RechargeReconcile] Job failed:', e.message);
  }
};

export default {
  runPaymentReconciliation,
  scheduleReconciliation,
  reconcilePendingRecharges,
};
