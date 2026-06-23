import * as cron from 'node-cron';
import { transitionCampaignStatuses, expirePendingClaims } from '../services/bonusCampaignService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Bonus Campaign Jobs
 *
 * 1. Campaign Status Transitions - Runs every 5 minutes
 *    Transitions campaigns between scheduled/active/ended states based on dates.
 *
 * 2. Expire Pending Claims - Runs every 30 minutes
 *    Expires unclaimed bonus campaign rewards that have passed their claim deadline.
 */

let statusTransitionJob: ReturnType<typeof cron.schedule> | null = null;
let expireClaimsJob: ReturnType<typeof cron.schedule> | null = null;
let isTransitionRunning = false;
let isExpireRunning = false;

const STATUS_TRANSITION_SCHEDULE = '*/5 * * * *';   // Every 5 minutes
const EXPIRE_CLAIMS_SCHEDULE = '*/30 * * * *';       // Every 30 minutes

/**
 * Initialize and start bonus campaign jobs
 */
export function initBonusCampaignJobs(): void {
  if (statusTransitionJob || expireClaimsJob) {
    logger.info('⚠️ [BONUS CAMPAIGN] Jobs already running');
    return;
  }

  logger.info('🎯 [BONUS CAMPAIGN] Starting bonus campaign jobs');

  // Job 1: Transition campaign statuses every 5 minutes
  statusTransitionJob = cron.schedule(STATUS_TRANSITION_SCHEDULE, async () => {
    if (isTransitionRunning) {
      logger.info('⏭️ [BONUS CAMPAIGN] Previous status transition still running, skipping');
      return;
    }

    isTransitionRunning = true;
    const lockKey = 'job:bonus-campaign';
    let lockToken: string | null = null;

    try {
      lockToken = await redisService.acquireLock(lockKey, 300);
      if (!lockToken) {
        logger.info('bonus-campaign skipped — lock held by another instance');
        return;
      }

      const startTime = Date.now();

      try {
        logger.info('🎯 [BONUS CAMPAIGN] Running campaign status transitions...');
        await transitionCampaignStatuses();
        const duration = Date.now() - startTime;
        logger.info(`✅ [BONUS CAMPAIGN] Status transitions completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`❌ [BONUS CAMPAIGN] Status transition failed after ${duration}ms:`, error);
      }
    } finally {
      if (lockToken) {
        await redisService.releaseLock(lockKey, lockToken);
      }
      isTransitionRunning = false;
    }
  });

  // Job 2: Expire pending claims every 30 minutes
  expireClaimsJob = cron.schedule(EXPIRE_CLAIMS_SCHEDULE, async () => {
    if (isExpireRunning) {
      logger.info('⏭️ [BONUS CAMPAIGN] Previous expire claims still running, skipping');
      return;
    }

    isExpireRunning = true;
    const expireLockKey = 'job:bonus-campaign-expire';
    let expireLockToken: string | null = null;

    try {
      expireLockToken = await redisService.acquireLock(expireLockKey, 300);
      if (!expireLockToken) {
        logger.info('bonus-campaign-expire skipped — lock held by another instance');
        return;
      }

      const startTime = Date.now();

      try {
        logger.info('🎯 [BONUS CAMPAIGN] Running expire pending claims...');
        await expirePendingClaims();
        const duration = Date.now() - startTime;
        logger.info(`✅ [BONUS CAMPAIGN] Expire pending claims completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`❌ [BONUS CAMPAIGN] Expire pending claims failed after ${duration}ms:`, error);
      }
    } finally {
      if (expireLockToken) {
        await redisService.releaseLock(expireLockKey, expireLockToken);
      }
      isExpireRunning = false;
    }
  });

  logger.info('✅ [BONUS CAMPAIGN] Bonus campaign jobs started successfully');
  logger.info('   - Status transitions: every 5 minutes');
  logger.info('   - Expire pending claims: every 30 minutes');
}

/**
 * Stop all bonus campaign jobs
 */
export function stopBonusCampaignJobs(): void {
  if (statusTransitionJob) {
    statusTransitionJob.stop();
    statusTransitionJob = null;
  }
  if (expireClaimsJob) {
    expireClaimsJob.stop();
    expireClaimsJob = null;
  }
  logger.info('🛑 [BONUS CAMPAIGN] Jobs stopped');
}

export default {
  initialize: initBonusCampaignJobs,
  stop: stopBonusCampaignJobs,
};
