import { logger } from '../config/logger';
import trialBundleService from '../services/trialBundleService';

/**
 * Background job to expire old bundles
 * Cron: 0 3 * * * (3am daily)
 * Checks for bundles past their expiry date and marks them as expired
 */
export async function bundleExpiryJob(): Promise<void> {
  try {
    logger.info('[BUNDLE EXPIRY JOB] Starting bundle expiry check');

    const result = await trialBundleService.expireOldBundles();

    logger.info('[BUNDLE EXPIRY JOB] Bundle expiry check completed', {
      expiredCount: result.expired,
    });
  } catch (error: any) {
    logger.error('[BUNDLE EXPIRY JOB] Error during bundle expiry check: ' + error.message);
    // Don't throw - let the cron job continue
  }
}

export default bundleExpiryJob;
