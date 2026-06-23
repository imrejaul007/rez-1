import * as cron from 'node-cron';
import mallAffiliateService from '../services/mallAffiliateService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Cashback Background Jobs
 *
 * This module schedules and manages background jobs for the CashStore/Affiliate system:
 *
 * 1. Credit Pending Cashback (runs hourly):
 *    - Finds confirmed purchases past verification period
 *    - Credits cashback to user wallets
 *    - Updates UserCashback status to 'credited'
 *
 * 2. Mark Expired Clicks (runs daily at 2:00 AM):
 *    - Finds clicks older than 30 days that weren't converted
 *    - Marks them as 'expired' to clean up attribution window
 *
 * Uses Redis distributed locks with owner tokens for multi-instance safety.
 */

// Job instances
let creditCashbackJob: ReturnType<typeof cron.schedule> | null = null;
let expireClicksJob: ReturnType<typeof cron.schedule> | null = null;

// Configuration
const CREDIT_CASHBACK_SCHEDULE = '0 * * * *'; // Every hour at minute 0
const EXPIRE_CLICKS_SCHEDULE = '0 2 * * *'; // Daily at 2:00 AM

// Lock TTLs (seconds) — should be longer than max expected job duration
const CREDIT_JOB_LOCK_TTL = 3600; // 1 hour
const EXPIRE_JOB_LOCK_TTL = 1800; // 30 minutes

interface CreditStats {
  credited: number;
  total: number;
  failed: number;
  errors: string[];
  duration: number;
}

interface ExpireStats {
  expired: number;
  duration: number;
}

/**
 * Run the credit pending cashback job
 */
async function runCreditPendingCashback(): Promise<CreditStats> {
  const startTime = Date.now();
  const stats: CreditStats = {
    credited: 0,
    total: 0,
    failed: 0,
    errors: [],
    duration: 0,
  };

  try {
    logger.info('💰 [CASHBACK JOB] Running credit pending cashback...');

    const result = await mallAffiliateService.creditPendingCashback();
    stats.credited = result.credited;
    stats.total = result.total;
    stats.failed = result.failed;

    stats.duration = Date.now() - startTime;

    logger.info(`✅ [CASHBACK JOB] Credit job completed:`, {
      credited: stats.credited,
      total: stats.total,
      failed: stats.failed,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return stats;
  } catch (error: any) {
    stats.duration = Date.now() - startTime;
    stats.errors.push(error.message || 'Unknown error');

    logger.error('❌ [CASHBACK JOB] Credit job failed:', {
      error: error.message,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Run the expire clicks job
 */
async function runExpireClicks(): Promise<ExpireStats> {
  const startTime = Date.now();
  const stats: ExpireStats = {
    expired: 0,
    duration: 0,
  };

  try {
    logger.info('⏰ [CASHBACK JOB] Running expire clicks...');

    stats.expired = await mallAffiliateService.markExpiredClicks();

    stats.duration = Date.now() - startTime;

    logger.info(`✅ [CASHBACK JOB] Expire clicks completed:`, {
      expired: stats.expired,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    return stats;
  } catch (error: any) {
    stats.duration = Date.now() - startTime;

    logger.error('❌ [CASHBACK JOB] Expire clicks failed:', {
      error: error.message,
      duration: `${stats.duration}ms`,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Start the credit pending cashback job
 */
export function startCreditCashbackJob(): void {
  if (creditCashbackJob) {
    logger.info('⚠️ [CASHBACK JOB] Credit cashback job already running');
    return;
  }

  logger.info(`💰 [CASHBACK JOB] Starting credit cashback job (runs every hour)`);

  creditCashbackJob = cron.schedule(CREDIT_CASHBACK_SCHEDULE, async () => {
    // Acquire distributed lock with owner token — only one instance runs the job
    const lockToken = await redisService.acquireLock('cashback_credit_job', CREDIT_JOB_LOCK_TTL);
    if (!lockToken) {
      logger.info('⏭️ [CASHBACK JOB] Another instance is running the credit job, skipping');
      return;
    }

    try {
      await runCreditPendingCashback();
    } catch (error) {
      // Error already logged in runCreditPendingCashback
    } finally {
      await redisService.releaseLock('cashback_credit_job', lockToken);
    }
  });

  logger.info('✅ [CASHBACK JOB] Credit cashback job started');
}

/**
 * Start the expire clicks job
 */
export function startExpireClicksJob(): void {
  if (expireClicksJob) {
    logger.info('⚠️ [CASHBACK JOB] Expire clicks job already running');
    return;
  }

  logger.info(`⏰ [CASHBACK JOB] Starting expire clicks job (runs daily at 2:00 AM)`);

  expireClicksJob = cron.schedule(EXPIRE_CLICKS_SCHEDULE, async () => {
    // Acquire distributed lock with owner token — only one instance runs the job
    const lockToken = await redisService.acquireLock('expire_clicks_job', EXPIRE_JOB_LOCK_TTL);
    if (!lockToken) {
      logger.info('⏭️ [CASHBACK JOB] Another instance is running the expire job, skipping');
      return;
    }

    try {
      await runExpireClicks();
    } catch (error) {
      // Error already logged in runExpireClicks
    } finally {
      await redisService.releaseLock('expire_clicks_job', lockToken);
    }
  });

  logger.info('✅ [CASHBACK JOB] Expire clicks job started');
}

/**
 * Stop all cashback jobs
 */
export function stopCashbackJobs(): void {
  if (creditCashbackJob) {
    creditCashbackJob.stop();
    creditCashbackJob = null;
    logger.info('🛑 [CASHBACK JOB] Credit cashback job stopped');
  }

  if (expireClicksJob) {
    expireClicksJob.stop();
    expireClicksJob = null;
    logger.info('🛑 [CASHBACK JOB] Expire clicks job stopped');
  }
}

/**
 * Get cashback jobs status
 */
export function getCashbackJobsStatus(): {
  creditJob: { running: boolean; schedule: string };
  expireJob: { running: boolean; schedule: string };
} {
  return {
    creditJob: {
      running: creditCashbackJob !== null,
      schedule: CREDIT_CASHBACK_SCHEDULE,
    },
    expireJob: {
      running: expireClicksJob !== null,
      schedule: EXPIRE_CLICKS_SCHEDULE,
    },
  };
}

/**
 * Manually trigger credit pending cashback (for testing/maintenance)
 */
export async function triggerManualCreditCashback(): Promise<CreditStats> {
  const lockToken = await redisService.acquireLock('cashback_credit_job', CREDIT_JOB_LOCK_TTL);
  if (!lockToken) {
    throw new Error('Credit job already in progress (locked by another instance)');
  }

  logger.info('💰 [CASHBACK JOB] Manual credit cashback triggered');

  try {
    return await runCreditPendingCashback();
  } finally {
    await redisService.releaseLock('cashback_credit_job', lockToken);
  }
}

/**
 * Manually trigger expire clicks (for testing/maintenance)
 */
export async function triggerManualExpireClicks(): Promise<ExpireStats> {
  const lockToken = await redisService.acquireLock('expire_clicks_job', EXPIRE_JOB_LOCK_TTL);
  if (!lockToken) {
    throw new Error('Expire job already in progress (locked by another instance)');
  }

  logger.info('⏰ [CASHBACK JOB] Manual expire clicks triggered');

  try {
    return await runExpireClicks();
  } finally {
    await redisService.releaseLock('expire_clicks_job', lockToken);
  }
}

/**
 * Initialize all cashback background jobs
 * Called from server startup after database connection
 */
export function initializeCashbackJobs(): void {
  startCreditCashbackJob();
  startExpireClicksJob();
}

export default {
  initialize: initializeCashbackJobs,
  startCreditJob: startCreditCashbackJob,
  startExpireJob: startExpireClicksJob,
  stop: stopCashbackJobs,
  getStatus: getCashbackJobsStatus,
  triggerCreditManual: triggerManualCreditCashback,
  triggerExpireManual: triggerManualExpireClicks,
};
