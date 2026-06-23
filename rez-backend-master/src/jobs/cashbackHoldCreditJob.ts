/**
 * jobs/cashbackHoldCreditJob.ts — Auto-credit cashbacks whose 24h (or 48h) hold has elapsed
 *
 * Runs every hour.  Finds UserCashback documents where:
 *   status === 'pending'  AND  creditableAt <= now
 * and credits them to the user wallet via cashbackService.creditCashbackToWallet().
 *
 * Uses a Redis distributed lock so only one pod processes the batch at a time.
 */

import { logger } from '../config/logger';
import { UserCashback } from '../models/UserCashback';
import { Types } from 'mongoose';
import redisService from '../services/redisService';
import cashbackService from '../services/cashbackService';
import { scheduleCronJob } from '../config/cronJobs';
// @ts-ignore
import { Queue } from 'bullmq';
import { bullmqRedis } from '../config/bullmq-connection';

const notificationEventsQueue = new Queue('notification-events', { connection: bullmqRedis });

const LOCK_KEY = 'job:cashback_hold_credit';
const LOCK_TTL = 3500; // seconds — slightly under 1 hour to prevent overlap
const BATCH_SIZE = 100; // process at most 100 per run to bound latency

/**
 * Core job logic — exported for testing or manual invocation.
 * Acquires a distributed lock so only one pod processes at a time.
 */
export async function runCashbackHoldCreditJob(): Promise<void> {
  // Acquire distributed lock so only one pod processes at a time
  const lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
  if (!lockToken) {
    logger.debug('[CASHBACK HOLD JOB] Could not acquire lock — another pod is running');
    return;
  }

  try {
    // Recovery: reset any cashbacks stuck in 'processing' due to a pod crash mid-batch.
    // Without this, records that transitioned to 'processing' before a crash stay stuck
    // forever because the main query below only looks for 'pending'.
    const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    const stuckReset = await UserCashback.updateMany(
      { status: 'processing', updatedAt: { $lt: stuckCutoff } },
      { $set: { status: 'pending' } },
    );
    if (stuckReset.modifiedCount > 0) {
      logger.warn('[CASHBACK HOLD JOB] Reset stuck processing cashbacks', { count: stuckReset.modifiedCount });
    }

    const startedAt = Date.now();
    const now = new Date();

    // Find pending cashbacks whose hold period has elapsed
    const due = await UserCashback.find({
      status: 'pending',
      creditableAt: { $lte: now },
    })
      .select('_id user amount')
      .limit(BATCH_SIZE)
      .lean();

    if (due.length === 0) {
      logger.debug('[CASHBACK HOLD JOB] No cashbacks due for credit');
      return;
    }

    logger.info(`[CASHBACK HOLD JOB] Processing ${due.length} cashback(s) whose hold has elapsed`);

    const results = await Promise.allSettled(
      due.map((cb) => cashbackService.creditCashbackToWallet(cb._id as Types.ObjectId)),
    );

    let credited = 0;
    let failed = 0;
    const enqueuePromises: Promise<any>[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        credited++;
        const cb = due[i];
        const cashbackId = String(cb._id);
        enqueuePromises.push(
          notificationEventsQueue
            .add('cashback_credited', {
              eventId: `cashback-credited-${cashbackId}-${Date.now()}`,
              eventType: 'cashback_credited',
              channels: ['push'],
              userId: cb.user.toString(),
              payload: {
                amount: cb.amount,
                title: 'Cashback credited!',
                body: `Your cashback of ${cb.amount} coins has been credited to your wallet.`,
              },
              createdAt: new Date().toISOString(),
            })
            .catch((err: any) => {
              logger.warn('[CASHBACK HOLD JOB] Failed to enqueue notification', { cashbackId, error: err.message });
            }),
        );
      } else {
        failed++;
        logger.error('[CASHBACK HOLD JOB] Failed to credit cashback', {
          cashbackId: due[i]._id,
          userId: due[i].user,
          error: r.reason,
        });
      }
    });
    if (enqueuePromises.length > 0) {
      await Promise.all(enqueuePromises);
    }

    const elapsed = Date.now() - startedAt;
    logger.info(`[CASHBACK HOLD JOB] Done — credited: ${credited}, failed: ${failed}, elapsed: ${elapsed}ms`);
  } finally {
    await redisService.releaseLock(LOCK_KEY, lockToken);
  }
}

/**
 * Register the cron job.  Called from cronJobs.ts during server startup.
 */
export function initializeCashbackHoldCreditJob(): void {
  scheduleCronJob(
    '5 * * * *', // at :05 of every hour (offset from other hourly jobs)
    async () => {
      try {
        await runCashbackHoldCreditJob();
      } catch (err) {
        logger.error('[CASHBACK HOLD JOB] Unhandled error', err);
      }
    },
    'Cashback 24h/48h hold auto-credit (hourly at :05)',
  );

  logger.info('[CRON] Cashback hold credit job registered (hourly at :05)');
}
