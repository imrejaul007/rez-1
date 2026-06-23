import cron from 'node-cron';
import redisService from '../services/redisService';
import { disputeService } from '../services/disputeService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('dispute-timeout-job');

const LOCK_KEY = 'job:dispute-timeout';
const LOCK_TTL = 600; // 10 minutes
const BATCH_SIZE = 50;

/**
 * Process timed-out disputes:
 * - Auto-refund if amount <= threshold
 * - Auto-escalate if amount > threshold
 */
async function runDisputeTimeoutResolution(): Promise<void> {
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.info('Dispute timeout job skipped — lock held by another instance');
      return;
    }

    logger.info('Starting dispute timeout resolution...');
    const result = await disputeService.processTimedOutDisputes(BATCH_SIZE);
    logger.info('Dispute timeout resolution complete', result);
  } catch (error) {
    logger.error('Dispute timeout job failed', error as Error);
  } finally {
    if (lockToken) {
      await redisService.releaseLock(LOCK_KEY, lockToken);
    }
  }
}

/**
 * Initialize cron schedule — runs every 30 minutes.
 */
export function initializeDisputeTimeoutJob(): void {
  cron.schedule('*/30 * * * *', () => {
    runDisputeTimeoutResolution().catch(err => {
      logger.error('Unhandled error in dispute timeout job', err as Error);
    });
  });
}

export { runDisputeTimeoutResolution };
export default initializeDisputeTimeoutJob;
