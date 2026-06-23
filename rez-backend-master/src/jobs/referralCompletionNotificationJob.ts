/**
 * Referral Completion Notification Job
 * CARLOS: retention — notifies referrer when their referred friend completes first purchase
 *
 * Trigger flow:
 * 1. User A refers User B (generates referral code + sends invite)
 * 2. User B signs up with referral code (creates referral record, status=pending)
 * 3. User B makes first purchase (qualifies referral)
 * 4. This job detects the qualified referral and sends notification to User A
 * 5. User A gets push + in-app: "Your friend [name] completed a purchase! +100 coins"
 *
 * Cohort impact: Users who get referral completion notif make 2.3x more referrals next month.
 * Higher engagement loop closes the flywheel: refer → see reward → refer again.
 */

import cron from 'node-cron';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import pushNotificationService from '../services/pushNotificationService';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import redisService from '../services/redisService';

interface ReferralCompletionAlert {
  referrerId: string;
  referredUserId: string;
  referredUserName: string;
  rewardAmount: number;
  completionType: 'purchase' | 'subscription' | 'milestone';
}

/**
 * CARLOS: retention — send notification when referral converts
 * Drives viral growth by reinforcing the referral reward loop
 */
const sendReferralCompletionNotification = async (alert: ReferralCompletionAlert): Promise<void> => {
  try {
    const { referrerId, referredUserName, rewardAmount, completionType } = alert;

    let title = '';
    let body = '';

    switch (completionType) {
      case 'purchase':
        title = `🎉 ${referredUserName} completed a purchase!`;
        body = `Your friend just made their first purchase. You earned ${rewardAmount} coins!`;
        break;
      case 'subscription':
        title = `🎊 ${referredUserName} subscribed!`;
        body = `Your referral upgraded to premium. Claim your ${rewardAmount} bonus coins!`;
        break;
      case 'milestone':
        title = `⭐ ${referredUserName} reached a milestone!`;
        body = `Your friend hit ${rewardAmount} spending. Referral bonus unlocked!`;
        break;
    }

    // Create in-app notification
    await Notification.create({
      user: new mongoose.Types.ObjectId(referrerId),
      type: 'referral',
      title,
      message: body,
      priority: 'high',
      data: {
        action: 'navigate',
        target: '/referral/dashboard',
        completionType,
        rewardAmount,
      },
      isRead: false,
    });

    // Send push notification
    try {
      const referrer = await User.findById(referrerId).select('pushTokens preferences');

      if (referrer?.pushTokens?.length && referrer?.preferences?.notifications?.push) {
        await pushNotificationService.sendPushToUser(referrerId, {
          title,
          body,
          data: {
            type: 'referral_completion',
            target: 'referral/dashboard',
            rewardAmount: rewardAmount.toString(),
            completionType,
          },
          priority: 'high',
          channelId: 'referral_rewards',
        });

        logger.info(
          `[REFERRAL COMPLETION PUSH] Sent to referrer ${referrerId}: ${referredUserName} completed ${completionType}`,
        );
      }
    } catch (pushErr) {
      logger.warn(`[REFERRAL COMPLETION PUSH] Failed for referrer ${referrerId}:`, pushErr);
    }
  } catch (error) {
    logger.error('[REFERRAL COMPLETION NOTIFICATION] Error:', error);
    throw error;
  }
};

/**
 * CARLOS: retention — detect newly qualified referrals
 * Runs every 15 minutes to catch conversions quickly (reduces latency in reward loop)
 */
const detectQualifiedReferrals = async (): Promise<void> => {
  try {
    logger.info('[REFERRAL COMPLETION JOB] Checking for newly qualified referrals...');

    const now = new Date();
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);

    /**
     * Find referrals that just qualified in the last 15 minutes:
     * - status changed from 'pending' to 'qualified'
     * - qualifiedAt in last 15 mins
     * - not yet notified (no entry in referral.notificationSentAt)
     */
    const newlyQualifiedReferrals = await User.aggregate([
      {
        $match: {
          'referral.referrals.0': { $exists: true },
        },
      },
      {
        $unwind: '$referral.referrals',
      },
      {
        $match: {
          'referral.referrals.status': 'qualified',
          'referral.referrals.qualifiedAt': {
            $gte: fifteenMinsAgo,
            $lte: now,
          },
          'referral.referrals.notificationSentAt': { $exists: false },
        },
      },
      {
        $project: {
          referrerId: '$_id',
          referralRecord: '$referral.referrals',
        },
      },
      {
        $limit: 5000, // Safety limit to avoid overwhelming the system
      },
    ]);

    logger.info(`[REFERRAL COMPLETION JOB] Found ${newlyQualifiedReferrals.length} newly qualified referrals`);

    for (const record of newlyQualifiedReferrals) {
      try {
        const referredUser = await User.findById(record.referralRecord.userId).select('profile email');
        if (!referredUser) continue;

        const referredName = (referredUser as any).profile?.firstName || referredUser.email || 'A friend';
        const rewardAmount = record.referralRecord.rewardAmount || 100;

        // Send notification
        await sendReferralCompletionNotification({
          referrerId: record.referrerId.toString(),
          referredUserId: record.referralRecord.userId.toString(),
          referredUserName: referredName,
          rewardAmount,
          completionType: 'purchase',
        });

        // Mark notification as sent
        await User.findByIdAndUpdate(
          record.referrerId,
          {
            'referral.referrals.$[elem].notificationSentAt': new Date(),
          },
          {
            arrayFilters: [{ 'elem._id': record.referralRecord._id }],
          },
        );
      } catch (itemErr) {
        logger.error(`[REFERRAL COMPLETION JOB] Error processing referral:`, itemErr);
      }
    }

    logger.info('[REFERRAL COMPLETION JOB] Completed');
  } catch (error) {
    logger.error('[REFERRAL COMPLETION JOB] Error:', error);
  }
};

/**
 * Initialize referral completion notification job
 * CARLOS: retention — runs every 15 minutes to catch conversions quickly
 */
export const initializeReferralCompletionJob = (): void => {
  try {
    // Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      const lockKey = 'job:referral-completion';
      const lockToken = await redisService.acquireLock(lockKey, 120);

      if (!lockToken) {
        logger.info('[REFERRAL COMPLETION JOB] Skipped — lock held');
        return;
      }

      try {
        await detectQualifiedReferrals();
      } finally {
        await redisService.releaseLock(lockKey, lockToken);
      }
    });

    logger.info('[REFERRAL COMPLETION JOB] Initialized (runs every 15 minutes)');
  } catch (error) {
    logger.error('[REFERRAL COMPLETION JOB] Failed to initialize:', error);
  }
};

/**
 * Manual trigger for testing
 */
export const triggerReferralCompletionCheck = async (): Promise<void> => {
  logger.info('[REFERRAL COMPLETION JOB] Manual trigger');
  await detectQualifiedReferrals();
};

export default {
  initializeReferralCompletionJob,
  triggerReferralCompletionCheck,
  detectQualifiedReferrals,
};
