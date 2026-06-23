/**
 * Subscription Downgrade Execution Job
 * Runs daily. Finds subscriptions with a scheduled downgrade
 * (downgradeTargetTier set) whose endDate has passed, and
 * executes the tier change.
 */
import { Subscription } from '../models/Subscription';
import tierConfigService from '../services/tierConfigService';
import subscriptionAuditService from '../services/subscriptionAuditService';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';

const logger = createServiceLogger('subscription-downgrade');

export async function runSubscriptionDowngrade(): Promise<void> {
  const lockKey = 'job:subscription-downgrade';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 300); // 5min lock
    if (!lockToken) {
      logger.info('Subscription downgrade job skipped — lock held');
      return;
    }

    const now = new Date();

    // Find subscriptions with a scheduled downgrade whose scheduled date has passed
    const pendingDowngrades = await Subscription.find({
      downgradeTargetTier: { $exists: true, $ne: null },
      $or: [
        { downgradeScheduledFor: { $lte: now } },
        // Fallback: if downgradeScheduledFor not set, check endDate
        { downgradeScheduledFor: { $exists: false }, endDate: { $lte: now } },
      ],
      status: { $in: ['active', 'cancelled'] },
    }).limit(200);

    if (pendingDowngrades.length === 0) {
      logger.info('No pending downgrades found');
      return;
    }

    logger.info(`Processing ${pendingDowngrades.length} scheduled downgrades`);
    let successCount = 0;
    let errorCount = 0;

    for (const sub of pendingDowngrades) {
      try {
        const previousTier = sub.tier;
        const previousStatus = sub.status;
        const targetTier = sub.downgradeTargetTier;

        if (!targetTier) continue;

        const newBenefits = await tierConfigService.getTierBenefits(targetTier);

        sub.previousTier = previousTier;
        sub.tier = targetTier as any;
        sub.benefits = newBenefits;
        sub.downgradeTargetTier = undefined;
        sub.downgradeScheduledFor = undefined;
        sub.proratedCredit = 0;

        if (targetTier === 'free') {
          sub.status = 'expired';
        }

        await sub.save();

        // Audit log
        subscriptionAuditService.logChange({
          subscriptionId: (sub._id as any)?.toString(),
          userId: sub.user.toString(),
          action: 'downgrade_executed',
          previousState: { tier: previousTier, status: previousStatus },
          newState: { tier: targetTier, status: sub.status },
          metadata: {
            description: `Scheduled downgrade executed: ${previousTier} → ${targetTier}`,
          },
        });

        successCount++;
      } catch (err) {
        errorCount++;
        logger.error(`Failed to downgrade subscription ${sub._id}:`, err);
      }
    }

    logger.info(`Downgrade job complete: ${successCount} success, ${errorCount} errors`);
  } catch (error) {
    logger.error('Subscription downgrade job failed:', error);
  } finally {
    if (lockToken) {
      await redisService.releaseLock(lockKey, lockToken).catch((err) => logger.warn('[SubscriptionDowngradeJob] Lock release failed', { error: err.message }));
    }
  }
}
