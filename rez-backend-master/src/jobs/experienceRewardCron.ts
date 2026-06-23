import * as cron from 'node-cron';
import { checkAndGrantMonthlyRewards } from '../services/ExperienceRewardService';
import { logger } from '../config/logger';

let cronTask: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

// Run daily at 23:00 UTC (checks whether users crossed monthly thresholds today)
const SCHEDULE = '0 23 * * *';

export function initExperienceRewardCron(): void {
  if (cronTask) {
    logger.info('[ExperienceRewardCron] Already initialised — skipping');
    return;
  }

  cronTask = cron.schedule(SCHEDULE, async () => {
    if (isRunning) {
      logger.info('[ExperienceRewardCron] Previous run still in progress — skipping');
      return;
    }

    isRunning = true;
    const start = Date.now();
    try {
      logger.info('[ExperienceRewardCron] Starting daily experience reward check...');
      await checkAndGrantMonthlyRewards();
      logger.info(`[ExperienceRewardCron] Completed in ${Date.now() - start}ms`);
    } catch (err) {
      logger.error(`[ExperienceRewardCron] Failed after ${Date.now() - start}ms:`, err);
    } finally {
      isRunning = false;
    }
  });

  logger.info('[ExperienceRewardCron] Scheduled (daily at 23:00 UTC)');
}

export function stopExperienceRewardCron(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    logger.info('[ExperienceRewardCron] Stopped');
  }
}
