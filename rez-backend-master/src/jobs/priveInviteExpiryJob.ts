/**
 * Privé Invite Code Expiry Job
 *
 * Runs daily to deactivate expired invite codes.
 * Pattern matches referralExpiryJob.ts
 */

import cron from 'node-cron';
import priveInviteService from '../services/priveInviteService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

let isRunning = false;

export const runPriveInviteExpiry = async (): Promise<number> => {
  if (isRunning) {
    logger.info('[PriveInviteExpiry] Job already running, skipping');
    return 0;
  }

  const lockKey = 'job:prive-invite-expiry';
  const lockToken = await redisService.acquireLock(lockKey, 300);
  if (!lockToken) {
    logger.info('prive-invite-expiry skipped — lock held by another instance');
    return 0;
  }

  isRunning = true;

  try {
    logger.info('[PriveInviteExpiry] Starting expired code deactivation...');
    const count = await priveInviteService.deactivateExpiredCodes();
    logger.info(`[PriveInviteExpiry] Deactivated ${count} expired invite codes`);
    return count;
  } catch (error) {
    logger.error('[PriveInviteExpiry] Job failed:', error);
    return 0;
  } finally {
    isRunning = false;
    await redisService.releaseLock(lockKey, lockToken);
  }
};

/**
 * Initialize the cron job — runs daily at 3:30 AM
 */
export const initializePriveInviteExpiryJob = () => {
  // Run at 3:30 AM daily
  cron.schedule('30 3 * * *', () => {
    runPriveInviteExpiry();
  }, { timezone: 'UTC' });

  logger.info('✅ Privé invite code expiry job scheduled (daily at 3:30 AM)');
};
