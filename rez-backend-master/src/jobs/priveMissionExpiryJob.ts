/**
 * Privé Mission Expiry Job
 *
 * Runs daily to expire past-due active missions.
 * Pattern matches priveInviteExpiryJob.ts
 */

import cron from 'node-cron';
import { priveMissionService } from '../services/priveMissionService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

let isRunning = false;

export const runPriveMissionExpiry = async (): Promise<number> => {
  if (isRunning) {
    logger.info('[PriveMissionExpiry] Job already running, skipping');
    return 0;
  }

  const lockKey = 'job:prive-mission-expiry';
  const lockToken = await redisService.acquireLock(lockKey, 300);
  if (!lockToken) {
    logger.info('prive-mission-expiry skipped — lock held by another instance');
    return 0;
  }

  isRunning = true;

  try {
    logger.info('[PriveMissionExpiry] Starting mission expiry check...');
    const expiredCount = await priveMissionService.expireOverdueMissions();
    logger.info(`[PriveMissionExpiry] Mission expiry complete: ${expiredCount} missions expired`);
    return expiredCount;
  } catch (error) {
    logger.error('[PriveMissionExpiry] Job failed:', error);
    return 0;
  } finally {
    isRunning = false;
    await redisService.releaseLock(lockKey, lockToken);
  }
};

/**
 * Initialize the cron job — runs daily at 00:15 UTC
 */
export const initializePriveMissionExpiryJob = () => {
  cron.schedule('15 0 * * *', () => {
    runPriveMissionExpiry();
  }, {
    timezone: 'UTC',
  });

  logger.info('✅ Privé mission expiry job scheduled (daily 00:15 UTC)');
};
