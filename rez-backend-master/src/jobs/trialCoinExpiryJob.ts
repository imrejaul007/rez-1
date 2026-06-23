import * as cron from 'node-cron';
import { logger } from '../config/logger';
import trialCoinService from '../services/trialCoinService';

let expiryJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

const CRON_SCHEDULE = '0 2 * * *'; // 2am daily

/**
 * Trial Coin Expiry Job
 *
 * Runs daily at 2:00 AM to expire old trial coins
 */
export function startTrialCoinExpiryJob(): void {
  if (expiryJob) {
    logger.warn('[TrialCoinExpiryJob] Job already started');
    return;
  }

  expiryJob = cron.schedule(CRON_SCHEDULE, async () => {
    if (isRunning) {
      logger.warn('[TrialCoinExpiryJob] Previous run still in progress, skipping');
      return;
    }

    isRunning = true;

    try {
      logger.info('[TrialCoinExpiryJob] Starting expiry job');

      const result = await trialCoinService.expireCoins();

      logger.info('[TrialCoinExpiryJob] Expiry job completed', {
        usersProcessed: result.usersProcessed,
        coinsExpired: result.coinsExpired,
        breakage: `${result.coinsExpired} coins`
      });
    } catch (error) {
      logger.error('[TrialCoinExpiryJob] Job failed', {
        error: (error as Error).message
      });
    } finally {
      isRunning = false;
    }
  });

  logger.info('[TrialCoinExpiryJob] Started with schedule:', CRON_SCHEDULE);
}

export function stopTrialCoinExpiryJob(): void {
  if (expiryJob) {
    expiryJob.stop();
    expiryJob = null;
    logger.info('[TrialCoinExpiryJob] Stopped');
  }
}

export function isTrialCoinExpiryJobRunning(): boolean {
  return isRunning;
}
