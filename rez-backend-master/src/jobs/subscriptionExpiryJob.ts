/**
 * Subscription Expiry Job
 * Runs daily. Handles expired subscriptions:
 * 1. Subscriptions past endDate with autoRenew=false → set status to 'expired'
 * 2. Subscriptions in grace_period past grace window → set status to 'expired'
 */
import { Subscription } from '../models/Subscription';
import tierConfigService from '../services/tierConfigService';
import subscriptionAuditService from '../services/subscriptionAuditService';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';

const logger = createServiceLogger('subscription-expiry');

const GRACE_PERIOD_DAYS = 3; // Must match Subscription.isInGracePeriod()

export async function runSubscriptionExpiry(): Promise<void> {
  const lockKey = 'job:subscription-expiry';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 300);
    if (!lockToken) {
      logger.info('Subscription expiry job skipped — lock held');
      return;
    }

    const now = new Date();
    let successCount = 0;
    let errorCount = 0;

    // 1. Expire subscriptions past endDate with autoRenew=false
    const expiredSubs = await Subscription.find({
      status: 'active',
      autoRenew: false,
      endDate: { $lte: now },
    }).limit(500);

    logger.info(`Found ${expiredSubs.length} expired subscriptions (autoRenew=false)`);

    for (const sub of expiredSubs) {
      try {
        const previousTier = sub.tier;
        sub.status = 'expired';
        sub.benefits = await tierConfigService.getTierBenefits('free');
        await sub.save();

        subscriptionAuditService.logChange({
          subscriptionId: (sub._id as any)?.toString(),
          userId: sub.user.toString(),
          action: 'expired',
          previousState: { tier: previousTier, status: 'active' },
          newState: { tier: previousTier, status: 'expired' },
          metadata: {
            description: `Subscription expired (autoRenew=false)`,
          },
        });

        successCount++;
      } catch (err) {
        errorCount++;
        logger.error(`Failed to expire subscription ${sub._id}:`, err);
      }
    }

    // 2. Expire grace period subscriptions past grace window
    const graceDeadline = new Date(now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const graceSubs = await Subscription.find({
      status: 'grace_period',
      $or: [
        { gracePeriodStartDate: { $lte: graceDeadline } },
        // Fallback: if gracePeriodStartDate not set, use endDate
        { gracePeriodStartDate: { $exists: false }, endDate: { $lte: graceDeadline } },
      ],
    }).limit(500);

    logger.info(`Found ${graceSubs.length} grace period subscriptions past deadline`);

    for (const sub of graceSubs) {
      try {
        const previousTier = sub.tier;
        sub.status = 'expired';
        sub.benefits = await tierConfigService.getTierBenefits('free');
        await sub.save();

        subscriptionAuditService.logChange({
          subscriptionId: (sub._id as any)?.toString(),
          userId: sub.user.toString(),
          action: 'expired',
          previousState: { tier: previousTier, status: 'grace_period' },
          newState: { tier: previousTier, status: 'expired' },
          metadata: {
            description: `Grace period expired after ${GRACE_PERIOD_DAYS} days`,
          },
        });

        successCount++;
      } catch (err) {
        errorCount++;
        logger.error(`Failed to expire grace subscription ${sub._id}:`, err);
      }
    }

    logger.info(`Expiry job complete: ${successCount} success, ${errorCount} errors`);
  } catch (error) {
    logger.error('Subscription expiry job failed:', error);
  } finally {
    if (lockToken) {
      await redisService.releaseLock(lockKey, lockToken).catch((err) => logger.warn('[SubscriptionExpiryJob] Lock release failed', { error: err.message }));
    }
  }
}
