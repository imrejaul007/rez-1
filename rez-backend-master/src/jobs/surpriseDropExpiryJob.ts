import { SurpriseCoinDrop } from '../models/SurpriseCoinDrop';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';

const logger = createServiceLogger('surprise-drop-expiry');

/**
 * Surprise Drop Expiry Job
 * Runs periodically to expire unclaimed surprise coin drops past their expiresAt date.
 * Uses the SurpriseCoinDrop.expireOldDrops() static method.
 */
export async function runSurpriseDropExpiry(): Promise<void> {
  const lockKey = 'job:surprise-drop-expiry';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 300); // 5min lock
    if (!lockToken) {
      logger.info('Surprise drop expiry job skipped — lock held');
      return;
    }

    const result = await (SurpriseCoinDrop as any).expireOldDrops();
    const expiredCount = result?.modifiedCount || 0;

    if (expiredCount > 0) {
      logger.info(`Expired ${expiredCount} surprise coin drops`);
    } else {
      logger.info('No surprise drops to expire');
    }
  } catch (error) {
    logger.error('Surprise drop expiry job failed:', error);
  } finally {
    if (lockToken) {
      await redisService.releaseLock(lockKey, lockToken).catch((err) => logger.warn('[SurpriseDropExpiryJob] Lock release failed', { error: err.message }));
    }
  }
}
