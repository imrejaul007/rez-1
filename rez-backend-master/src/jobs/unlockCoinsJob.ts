import { CoinTransaction } from '../models/CoinTransaction';
import { logger } from '../config/logger';
import redisService from '../services/redisService';

/**
 * Cron job to transition LOCKED coins to ACTIVE after settlement window.
 * Should run every hour.
 */
export async function unlockSettledCoins(): Promise<void> {
  const lock = await redisService.acquireLock('job:unlock_coins', 120);
  if (!lock) {
    logger.info('[COIN_UNLOCK] Another instance already running — skipping');
    return;
  }
  try {
    const now = new Date();
    const result = await CoinTransaction.updateMany(
      {
        coinStatus: 'locked',
        settlementDate: { $lte: now },
      },
      {
        $set: { coinStatus: 'active' },
      },
    );
    if (result.modifiedCount > 0) {
      logger.info(`[COIN_UNLOCK] Unlocked ${result.modifiedCount} coin transactions`);
    }
  } catch (error) {
    logger.error('[COIN_UNLOCK] Failed to unlock coins:', error);
  } finally {
    await redisService.releaseLock('job:unlock_coins', lock);
  }
}
