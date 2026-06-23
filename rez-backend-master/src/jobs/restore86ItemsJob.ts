import cron from 'node-cron';
import { Product } from '../models/Product';
import { logger } from '../config/logger';

/**
 * FEAT-16: Nightly restore job for 86-marked items
 * Runs daily at 6:00 AM to restore items marked as unavailable (86'd) during service
 */
export const startRestore86ItemsJob = () => {
  // Run every day at 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    try {
      logger.info('[Restore86ItemsJob] Starting...');
      const now = new Date();

      // Find all 86'd items where restore time has passed or is now
      const result = await (Product as any).updateMany(
        {
          is86d: true,
          restores86At: { $lte: now }
        },
        {
          $set: {
            is86d: false,
            restores86At: null
          }
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`[Restore86ItemsJob] Restored ${result.modifiedCount} items from 86'd status`);
      } else {
        logger.info('[Restore86ItemsJob] No items to restore');
      }
    } catch (error) {
      logger.error('[Restore86ItemsJob] Fatal error:', error);
    }
  });

  logger.info('[Restore86ItemsJob] Scheduled to run daily at 6:00 AM');
};

export default startRestore86ItemsJob;
