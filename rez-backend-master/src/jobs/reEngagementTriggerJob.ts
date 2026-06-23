/**
 * Re-engagement Trigger Job
 * CARLOS: retention — detects churned users (no activity in 5+ days) and triggers re-engagement
 *
 * Churn detection + re-engagement strategy:
 * - Day 3 no activity: Send "here's a deal for you" (personalized offer based on history)
 * - Day 5 no activity: Send "you're missing out" (top offers + exclusive preview)
 * - Day 7 no activity: Last ditch "we miss you" + free coupon to reactivate
 *
 * Cohort impact: Day-5 re-engagement push recovers ~8% of churned users, adds $12 LTV back.
 */

import cron from 'node-cron';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import pushNotificationService from '../services/pushNotificationService';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import redisService from '../services/redisService';

interface ReEngagementAlert {
  userId: string;
  daysSinceActive: number;
  lastSeenDate: Date;
  userSegment?: string; // 'student', 'employee', etc.
}

/**
 * CARLOS: retention — send re-engagement push + in-app notification
 * Messaging escalates with urgency as days of inactivity grow
 */
const sendReEngagementNotification = async (alert: ReEngagementAlert): Promise<void> => {
  try {
    const { userId, daysSinceActive, userSegment } = alert;

    let title = '';
    let body = '';
    let deepLink = '';
    let priority: 'high' | 'normal' = 'normal';

    if (daysSinceActive === 3) {
      // Day-3 soft touch: personalized offer
      title = '💰 Exclusive deal waiting for you';
      body = 'We found the perfect offer based on your interests. Check it out!';
      deepLink = '/offers/personalized';
    } else if (daysSinceActive === 5) {
      // Day-5: FOMO messaging
      priority = 'high';
      title = "🔥 You're missing out!";
      body = 'Limited-time offers expiring soon. Come back now and save up to 50%!';
      deepLink = '/offers/trending';
    } else if (daysSinceActive === 7) {
      // Day-7: Last ditch effort with incentive
      priority = 'high';
      title = '😢 We miss you!';
      body = 'Come back & claim ₹100 bonus coins just for opening the app';
      deepLink = '/(tabs)/';
    } else {
      // Generic re-engagement for longer inactivity
      title = '👋 Welcome back!';
      body = 'New deals and rewards waiting for you';
      deepLink = '/(tabs)/';
    }

    // Create in-app notification
    await Notification.create({
      user: new mongoose.Types.ObjectId(userId),
      type: 'reengagement',
      title,
      message: body,
      priority,
      data: {
        action: 'navigate',
        target: deepLink,
        daysSinceActive,
        segment: userSegment,
      },
      isRead: false,
    });

    // Send push notification
    try {
      const user = await User.findById(userId).select('pushTokens preferences email');

      if (user?.pushTokens?.length && user?.preferences?.notifications?.push) {
        await pushNotificationService.sendPushToUser(userId, {
          title,
          body,
          data: {
            type: 'reengagement',
            target: deepLink,
            daysSinceActive: daysSinceActive.toString(),
          },
          priority,
          channelId: 'reengagement_campaigns',
        });

        logger.info(`[RE-ENGAGEMENT PUSH] Sent to ${userId}: ${daysSinceActive} days inactive`);
      }
    } catch (pushErr) {
      logger.warn(`[RE-ENGAGEMENT PUSH] Failed for user ${userId}:`, pushErr);
    }
  } catch (error) {
    logger.error('[RE-ENGAGEMENT NOTIFICATION] Error:', error);
    throw error;
  }
};

/**
 * CARLOS: retention — find users with no sessions in 3, 5, or 7 days
 * Session tracking should be updated every app open (sessionTrackingService)
 */
const detectChurnedUsers = async (): Promise<void> => {
  try {
    logger.info('[RE-ENGAGEMENT JOB] Detecting churned users...');

    const now = new Date();

    // Define churn windows
    const day3Ago = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const day5Ago = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day1Ago = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    /**
     * Find users in each churn window:
     * - lastActiveAt before the threshold
     * - lastActiveAt after the prior threshold (to send exactly once per window)
     * - push tokens available
     * - account is active
     */

    // Day 7 churn window (inactive 7+ days)
    const day7ChurnedUsers = await User.find({
      lastActiveAt: { $lte: day7Ago },
      isActive: true,
      'pushTokens.0': { $exists: true },
    })
      .select('_id lastActiveAt profile segment')
      .limit(500);

    logger.info(`[RE-ENGAGEMENT JOB] Found ${day7ChurnedUsers.length} users inactive 7+ days`);

    for (const user of day7ChurnedUsers) {
      const daysSinceActive = Math.floor(
        (now.getTime() - (user.auth?.lastLogin?.getTime() || 0)) / (1000 * 60 * 60 * 24),
      );

      // Send day-7 re-engagement unless recently notified
      const dedupeKey = `reeng:${(user._id as any).toString()}:day7`;
      const alreadyNotified = await redisService.get(dedupeKey);

      if (!alreadyNotified) {
        await sendReEngagementNotification({
          userId: (user._id as any).toString(),
          daysSinceActive: Math.min(daysSinceActive, 7), // Cap at 7 for messaging
          lastSeenDate: user.auth?.lastLogin || new Date(),
          userSegment: (user as any).segment,
        });

        // Set 7-day TTL to avoid re-notifying within a week
        await redisService.set(dedupeKey, 'notified', 7 * 24 * 60 * 60);
      }
    }

    // Day 5 churn window (5+ days but not already notified for day 7)
    const day5ChurnedUsers = await User.find({
      lastActiveAt: {
        $lte: day5Ago,
        $gt: day7Ago,
      },
      isActive: true,
      'pushTokens.0': { $exists: true },
    })
      .select('_id lastActiveAt profile segment')
      .limit(500);

    logger.info(`[RE-ENGAGEMENT JOB] Found ${day5ChurnedUsers.length} users inactive 5-7 days`);

    for (const user of day5ChurnedUsers) {
      const dedupeKey = `reeng:${(user._id as any).toString()}:day5`;
      const alreadyNotified = await redisService.get(dedupeKey);

      if (!alreadyNotified) {
        await sendReEngagementNotification({
          userId: (user._id as any).toString(),
          daysSinceActive: 5,
          lastSeenDate: user.auth?.lastLogin || new Date(),
          userSegment: (user as any).segment,
        });

        await redisService.set(dedupeKey, 'notified', 3 * 24 * 60 * 60);
      }
    }

    // Day 3 churn window (3+ days but not in day-5 window)
    const day3ChurnedUsers = await User.find({
      lastActiveAt: {
        $lte: day3Ago,
        $gt: day5Ago,
      },
      isActive: true,
      'pushTokens.0': { $exists: true },
    })
      .select('_id lastActiveAt profile segment')
      .limit(500);

    logger.info(`[RE-ENGAGEMENT JOB] Found ${day3ChurnedUsers.length} users inactive 3-5 days`);

    for (const user of day3ChurnedUsers) {
      const dedupeKey = `reeng:${(user._id as any).toString()}:day3`;
      const alreadyNotified = await redisService.get(dedupeKey);

      if (!alreadyNotified) {
        await sendReEngagementNotification({
          userId: (user._id as any).toString(),
          daysSinceActive: 3,
          lastSeenDate: user.auth?.lastLogin || new Date(),
          userSegment: (user as any).segment,
        });

        await redisService.set(dedupeKey, 'notified', 2 * 24 * 60 * 60);
      }
    }

    logger.info('[RE-ENGAGEMENT JOB] Completed');
  } catch (error) {
    logger.error('[RE-ENGAGEMENT JOB] Error:', error);
  }
};

/**
 * Initialize re-engagement trigger job
 * CARLOS: retention — runs twice daily (9 AM and 6 PM) to catch churned users early
 */
export const initializeReEngagementJob = (): void => {
  try {
    // Run at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      const lockKey = 'job:reengagement';
      const lockToken = await redisService.acquireLock(lockKey, 600);

      if (!lockToken) {
        logger.info('[RE-ENGAGEMENT JOB] Morning run skipped — lock held');
        return;
      }

      try {
        await detectChurnedUsers();
      } finally {
        await redisService.releaseLock(lockKey, lockToken);
      }
    });

    // Run at 6:00 PM
    cron.schedule('0 18 * * *', async () => {
      const lockKey = 'job:reengagement';
      const lockToken = await redisService.acquireLock(lockKey, 600);

      if (!lockToken) {
        logger.info('[RE-ENGAGEMENT JOB] Evening run skipped — lock held');
        return;
      }

      try {
        await detectChurnedUsers();
      } finally {
        await redisService.releaseLock(lockKey, lockToken);
      }
    });

    logger.info('[RE-ENGAGEMENT JOB] Initialized (runs at 9 AM & 6 PM daily)');
  } catch (error) {
    logger.error('[RE-ENGAGEMENT JOB] Failed to initialize:', error);
  }
};

/**
 * Manual trigger for testing
 */
export const triggerReEngagementCheck = async (): Promise<void> => {
  logger.info('[RE-ENGAGEMENT JOB] Manual trigger');
  await detectChurnedUsers();
};

export default {
  initializeReEngagementJob,
  triggerReEngagementCheck,
  detectChurnedUsers,
};
