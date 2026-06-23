import * as cron from 'node-cron';
import referralService from '../services/referralService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Referral Expiry Job
 *
 * Runs daily at 3:00 AM to mark expired referrals.
 * Referrals that have passed their expiresAt date (90 days from creation)
 * and are still in PENDING or ACTIVE status are transitioned to EXPIRED.
 */

let expiryJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

const CRON_SCHEDULE = '0 3 * * *'; // Daily at 3:00 AM

export async function runReferralExpiry(): Promise<void> {
  if (isRunning) {
    logger.info('⏭️ [REFERRAL_EXPIRY] Job already running, skipping');
    return;
  }

  isRunning = true;
  const lockKey = 'job:referral-expiry';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 300);
    if (!lockToken) {
      logger.info('referral-expiry skipped — lock held by another instance');
      return;
    }

    const startTime = Date.now();

    logger.info('⏰ [REFERRAL_EXPIRY] Starting referral expiry check...');

    const expiredCount = await referralService.markExpiredReferrals();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`✅ [REFERRAL_EXPIRY] Completed in ${duration}s — ${expiredCount} referrals expired`);
  } catch (error) {
    logger.error('❌ [REFERRAL_EXPIRY] Job failed:', error);
  } finally {
    if (lockToken) {
      await redisService.releaseLock(lockKey, lockToken);
    }
    isRunning = false;
  }
}

export function initializeReferralExpiryJob(): void {
  if (expiryJob) {
    expiryJob.stop();
  }

  expiryJob = cron.schedule(CRON_SCHEDULE, () => {
    runReferralExpiry().catch(err => logger.error('[REFERRAL_EXPIRY] Unhandled error:', err));
  });

  logger.info('🔄 [REFERRAL_EXPIRY] Scheduled: daily at 3:00 AM');
}

export function stopReferralExpiryJob(): void {
  if (expiryJob) {
    expiryJob.stop();
    expiryJob = null;
    logger.info('🛑 [REFERRAL_EXPIRY] Job stopped');
  }
}
