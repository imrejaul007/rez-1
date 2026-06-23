import * as cron from 'node-cron';
import { refundService } from '../services/refundService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Refund Reversal Job
 *
 * Processes pending refunds for cancelled orders/bookings.
 * Runs every 5 minutes with Redis distributed lock.
 */

let refundReversalJob: ReturnType<typeof cron.schedule> | null = null;

const REFUND_SCHEDULE = '*/5 * * * *'; // Every 5 minutes
const LOCK_KEY = 'job:refund-reversal';
const LOCK_TTL = 300; // 5 minutes
const BATCH_SIZE = 50;

/**
 * Start the refund reversal job
 */
export function startRefundReversalJob(): void {
  if (refundReversalJob) {
    logger.warn('[REFUND JOB] Job already running');
    return;
  }

  refundReversalJob = cron.schedule(REFUND_SCHEDULE, async () => {
    let lockToken: string | null = null;
    try {
      lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
      if (!lockToken) {
        return; // Another instance is processing
      }

      logger.info('[REFUND JOB] Processing pending refunds...');
      const result = await refundService.batchProcessRefunds(BATCH_SIZE);

      if (result.processed > 0) {
        logger.info(`[REFUND JOB] Batch complete: ${result.succeeded}/${result.processed} succeeded, ${result.failed} failed`);
      }

      if (result.errors.length > 0) {
        logger.error('[REFUND JOB] Failures:', { errors: result.errors });
      }
    } catch (error) {
      logger.error('[REFUND JOB] Job error:', error);
    } finally {
      if (lockToken) {
        await redisService.releaseLock(LOCK_KEY, lockToken);
      }
    }
  });

  logger.info(`[REFUND JOB] Scheduled: ${REFUND_SCHEDULE}`);
}

/**
 * Stop the refund reversal job
 */
export function stopRefundReversalJob(): void {
  if (refundReversalJob) {
    refundReversalJob.stop();
    refundReversalJob = null;
    logger.info('[REFUND JOB] Stopped');
  }
}

/**
 * Manual trigger for testing
 */
export async function triggerRefundReversalJob(): Promise<any> {
  return refundService.batchProcessRefunds(BATCH_SIZE);
}

/**
 * Get job status
 */
export function getRefundJobStatus(): { running: boolean; schedule: string } {
  return {
    running: !!refundReversalJob,
    schedule: REFUND_SCHEDULE,
  };
}
