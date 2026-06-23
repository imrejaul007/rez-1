/**
 * Stale Upgrade Cleanup Job
 * Runs every 30 minutes. Expires pending_payment SubscriptionUpgrade
 * records that are older than 30 minutes (prevents abandoned upgrade intents
 * from blocking new upgrade attempts).
 */
import { SubscriptionUpgrade } from '../models/SubscriptionUpgrade';
import subscriptionAuditService from '../services/subscriptionAuditService';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';

const logger = createServiceLogger('stale-upgrade-cleanup');

const STALE_THRESHOLD_MINUTES = 30;

export async function runStaleUpgradeCleanup(): Promise<void> {
  const lockKey = 'job:stale-upgrade-cleanup';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 120); // 2min lock
    if (!lockToken) {
      logger.info('Stale upgrade cleanup job skipped — lock held');
      return;
    }

    const staleUpgrades = await SubscriptionUpgrade.find({
      status: { $in: ['pending_payment', 'processing'] },
      expiresAt: { $lte: new Date() },
    }).limit(500);

    if (staleUpgrades.length === 0) {
      logger.info('No stale upgrade intents found');
      return;
    }

    logger.info(`Expiring ${staleUpgrades.length} stale upgrade intents`);
    let count = 0;

    for (const upgrade of staleUpgrades) {
      try {
        const previousStatus = upgrade.status;
        upgrade.status = 'expired';
        await upgrade.save();

        subscriptionAuditService.logChange({
          subscriptionId: upgrade.subscriptionId?.toString() || '',
          userId: upgrade.userId.toString(),
          action: 'upgrade_failed',
          previousState: { status: previousStatus },
          newState: { status: 'expired' },
          metadata: {
            upgradeId: (upgrade._id as any).toString(),
            description: `Upgrade intent expired after ${STALE_THRESHOLD_MINUTES} minutes`,
          },
        });

        count++;
      } catch (err) {
        logger.error(`Failed to expire upgrade ${upgrade._id}:`, err);
      }
    }

    logger.info(`Stale cleanup complete: ${count} expired`);
  } catch (error) {
    logger.error('Stale upgrade cleanup job failed:', error);
  } finally {
    if (lockToken) {
      await redisService.releaseLock(lockKey, lockToken).catch((err) => logger.warn('[StaleUpgradeCleanupJob] Lock release failed', { error: err.message }));
    }
  }
}
