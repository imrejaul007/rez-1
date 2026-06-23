import pushNotificationService from '../services/pushNotificationService';
import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('push-receipt-job');

/**
 * Push Receipt Processing Job
 * Runs every 15 minutes.
 * Checks Expo push notification delivery receipts and removes invalid tokens.
 */
export async function runPushReceiptProcessing(): Promise<void> {
  const lockKey = 'job:push-receipt-processing';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 300); // 5min lock
    if (!lockToken) {
      logger.info('Push receipt job skipped — lock held by another instance');
      return;
    }

    const result = await pushNotificationService.handleReceipts();
    logger.info(`Push receipt job completed: ${result.checked} checked, ${result.invalidRemoved} invalid removed`);
  } catch (error: any) {
    logger.error('Push receipt job failed', { error: error.message });
  } finally {
    if (lockToken) {
      await redisService.releaseLock(lockKey, lockToken);
    }
  }
}
