/**
 * Prive SLA Breach Job
 *
 * Runs every 15 minutes to mark overdue Prive concierge tickets as SLA-breached.
 * Pattern matches priveMissionExpiryJob.ts
 */

import cron from 'node-cron';
import { priveConciergeService } from '../services/priveConciergeService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

let isRunning = false;

export const runPriveSlaBreachCheck = async (): Promise<number> => {
  if (isRunning) {
    logger.info('[PriveSlaBreachJob] Job already running, skipping');
    return 0;
  }

  const lockKey = 'job:prive-sla-breach';
  const lockToken = await redisService.acquireLock(lockKey, 300);
  if (!lockToken) {
    logger.info('prive-sla-breach skipped — lock held by another instance');
    return 0;
  }

  isRunning = true;

  try {
    logger.info('[PriveSlaBreachJob] Starting SLA breach check...');
    const breachedCount = await priveConciergeService.markSlaBreached();
    logger.info(`[PriveSlaBreachJob] SLA breach check complete: ${breachedCount} tickets breached`);
    return breachedCount;
  } catch (error) {
    logger.error('[PriveSlaBreachJob] Job failed:', error);
    return 0;
  } finally {
    isRunning = false;
    await redisService.releaseLock(lockKey, lockToken);
  }
};

/**
 * Initialize the cron job — runs every 15 minutes
 */
export const initializePriveSlaBreachJob = () => {
  cron.schedule('*/15 * * * *', () => {
    runPriveSlaBreachCheck();
  }, {
    timezone: 'UTC',
  });

  logger.info('✅ Prive SLA breach job scheduled (every 15 minutes)');
};
