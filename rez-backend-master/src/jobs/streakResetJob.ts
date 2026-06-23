import * as cron from 'node-cron';
import streakService from '../services/streakService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Streak Reset Job
 *
 * Runs daily at 00:05 UTC to reset broken streaks.
 * Uses the existing streakService.checkBrokenStreaks() method which:
 * 1. Finds all UserStreak docs with currentStreak > 0 and lastActivityDate < yesterday
 * 2. Skips frozen streaks that haven't expired
 * 3. Resets broken streaks to 0
 *
 * This ensures streaks are proactively reset even if the user doesn't
 * make another check-in attempt (e.g. for leaderboard accuracy).
 */

let streakResetJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

const CRON_SCHEDULE = '5 0 * * *'; // Daily at 00:05 UTC

/**
 * Initialize and start the streak reset job
 */
export function initializeStreakResetJob(): void {
  if (streakResetJob) {
    logger.info('⚠️ [STREAK RESET] Job already running');
    return;
  }

  logger.info(`🔥 [STREAK RESET] Starting streak reset job (runs daily at 00:05 UTC)`);

  streakResetJob = cron.schedule(CRON_SCHEDULE, async () => {
    if (isRunning) {
      logger.info('⏭️ [STREAK RESET] Previous job still running, skipping');
      return;
    }

    isRunning = true;
    const lockKey = 'job:streak-reset';
    let lockToken: string | null = null;

    try {
      lockToken = await redisService.acquireLock(lockKey, 300);
      if (!lockToken) {
        logger.info('streak-reset skipped — lock held by another instance');
        return;
      }

      const startTime = Date.now();

      try {
        logger.info('🔥 [STREAK RESET] Running streak reset check...');
        await streakService.checkBrokenStreaks();
        const duration = Date.now() - startTime;
        logger.info(`✅ [STREAK RESET] Completed in ${duration}ms`);
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`❌ [STREAK RESET] Failed after ${duration}ms:`, error);
      }
    } finally {
      if (lockToken) {
        await redisService.releaseLock(lockKey, lockToken);
      }
      isRunning = false;
    }
  });

  logger.info('✅ [STREAK RESET] Streak reset job started successfully');
}

/**
 * Stop the streak reset job
 */
export function stopStreakResetJob(): void {
  if (streakResetJob) {
    streakResetJob.stop();
    streakResetJob = null;
    logger.info('🛑 [STREAK RESET] Job stopped');
  }
}

export default {
  initialize: initializeStreakResetJob,
  stop: stopStreakResetJob,
};
