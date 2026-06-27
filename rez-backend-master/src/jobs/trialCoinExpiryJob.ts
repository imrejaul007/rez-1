import * as cron from 'node-cron';
import { logger } from '../config/logger';
import trialCoinService from '../services/trialCoinService';
// Phase 6.24: distributed lock so multi-replica deploys don't both expire
// the same trial coins (which would log a duplicate expiry event and could
// affect downstream user-balance snapshots).
import { runWithLock } from '../config/cronJobs';

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

      // Phase 6.24: distributed lock across replicas. Without this, two
      // rez-worker pods would both call trialCoinService.expireCoins() and
      // produce duplicate expiry events.
      const result = await runWithLock(
        'cron:trial_coin_expiry',
        1800,           // 30-min TTL
        'trial coin expiry',
        () => trialCoinService.expireCoins()
      );
      if (result) {
        logger.info('[TrialCoinExpiryJob] Expiry job completed', {
          usersProcessed: result.usersProcessed,
          coinsExpired: result.coinsExpired,
          breakage: `${result.coinsExpired} coins`
        });
      } else {
        logger.info('[TrialCoinExpiryJob] Skipped — another worker held the lock');
      }
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
