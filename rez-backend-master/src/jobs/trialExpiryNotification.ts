import cron from 'node-cron';
import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import mongoose from 'mongoose';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * Trial Expiry Notification Job
 *
 * Checks for expiring trials daily and sends notifications to users
 * - Sends notification when trial is ending in 3 days
 * - Sends notification when trial is ending in 1 day
 * - Sends notification on the day trial expires
 */

interface ITrialNotificationPayload {
  userId: string;
  userName: string;
  daysRemaining: number;
  trialTier: string;
  trialEndDate: Date;
  upgradeUrl?: string;
}

/**
 * Send trial expiry notification to user
 */
const sendTrialNotification = async (payload: ITrialNotificationPayload) => {
  try {
    const { userId, userName, daysRemaining, trialTier } = payload;

    // Get urgency level based on days remaining
    let urgencyLevel: 'low' | 'medium' | 'high' = 'low';
    let notificationTitle = '';
    let notificationMessage = '';

    if (daysRemaining === 0) {
      // Trial expires today
      urgencyLevel = 'high';
      notificationTitle = '⏰ Your Trial Expires Today!';
      notificationMessage = `Your ${trialTier} trial ends today! Subscribe now to keep your benefits and exclusive deals.`;
    } else if (daysRemaining === 1) {
      // Trial expires tomorrow
      urgencyLevel = 'high';
      notificationTitle = '⚠️ Trial Expires Tomorrow!';
      notificationMessage = `Only 1 day left! Subscribe to ${trialTier} before your benefits expire.`;
    } else if (daysRemaining === 3) {
      // Trial expires in 3 days
      urgencyLevel = 'medium';
      notificationTitle = '📅 Your Trial Ends in 3 Days';
      notificationMessage = `Get ready! Your ${trialTier} trial ends in 3 days. Don't miss out on exclusive benefits!`;
    } else if (daysRemaining <= 7) {
      // Trial expires in a week
      urgencyLevel = 'medium';
      notificationTitle = '⏳ Trial Ending Soon';
      notificationMessage = `Your ${trialTier} trial ends in ${daysRemaining} days. Upgrade to keep enjoying premium features.`;
    }

    // Send in-app notification
    await Notification.create({
      user: new mongoose.Types.ObjectId(userId),
      type: 'system',
      title: notificationTitle,
      message: notificationMessage,
      data: {
        tier: trialTier,
        daysRemaining,
        action: 'upgrade',
        routeTo: '/subscription/trial',
      },
      priority: urgencyLevel === 'high' ? 'high' : 'normal',
      isRead: false,
    });

    logger.info(`[TRIAL NOTIFICATION] Sent to user ${userId}: ${daysRemaining} days remaining`);

    // Send push notification if user has push notifications enabled
    try {
      const user = await User.findById(userId).select('preferences');

      if (user?.preferences?.notifications?.push) {
        // Push notification would be sent here
        // This depends on your push notification service (Firebase, OneSignal, etc.)
        logger.info(`[TRIAL PUSH NOTIFICATION] Would be sent to user ${userId}`);
      }
    } catch (error) {
      logger.warn(`[TRIAL NOTIFICATION] Could not send push notification for user ${userId}:`, error);
    }

    // Send email notification
    try {
      const user = await User.findById(userId).select('email profile preferences');

      if (user?.email && user.preferences?.notifications?.email) {
        // Email notification would be sent here
        // This depends on your email service (SendGrid, AWS SES, etc.)
        logger.info(`[TRIAL EMAIL NOTIFICATION] Would be sent to ${user.email}`);
      }
    } catch (error) {
      logger.warn(`[TRIAL NOTIFICATION] Could not send email for user ${userId}:`, error);
    }

  } catch (error) {
    logger.error('[TRIAL NOTIFICATION] Error sending notification:', error);
    throw error;
  }
};

/**
 * Check for expiring trials and send notifications
 */
const checkExpiringTrials = async () => {
  try {
    logger.info('[TRIAL EXPIRY JOB] Starting trial expiry check...');

    const now = new Date();

    // Get trials that expire in 3 days
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const threeDaysTrials = await Subscription.find({
      status: 'trial',
      trialEndDate: {
        $gte: now,
        $lte: threeDaysFromNow,
      },
    }).populate({
      path: 'user',
      select: 'email firstName userPreferences pushTokens',
    });

    // Get trials that expire in 1 day
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const oneDayTrials = await Subscription.find({
      status: 'trial',
      trialEndDate: {
        $gte: now,
        $lte: oneDayFromNow,
      },
    }).populate({
      path: 'user',
      select: 'email firstName userPreferences pushTokens',
    });

    // Get trials that expire today
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const todayTrials = await Subscription.find({
      status: 'trial',
      trialEndDate: {
        $gte: now,
        $lte: endOfToday,
      },
    }).populate({
      path: 'user',
      select: 'email firstName userPreferences pushTokens',
    });

    // Process notifications for 3-day trials
    for (const subscription of threeDaysTrials) {
      const daysRemaining = Math.ceil(
        (subscription.trialEndDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only process if exactly 3 days remaining
      if (daysRemaining === 3) {
        const user = subscription.user as any;
        await sendTrialNotification({
          userId: user._id.toString(),
          userName: user.firstName || 'User',
          daysRemaining: 3,
          trialTier: subscription.tier,
          trialEndDate: subscription.trialEndDate!,
        });
      }
    }

    // Process notifications for 1-day trials
    for (const subscription of oneDayTrials) {
      const daysRemaining = Math.ceil(
        (subscription.trialEndDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only process if exactly 1 day remaining
      if (daysRemaining === 1) {
        const user = subscription.user as any;
        await sendTrialNotification({
          userId: user._id.toString(),
          userName: user.firstName || 'User',
          daysRemaining: 1,
          trialTier: subscription.tier,
          trialEndDate: subscription.trialEndDate!,
        });
      }
    }

    // Process notifications for today's trials
    for (const subscription of todayTrials) {
      const daysRemaining = Math.ceil(
        (subscription.trialEndDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Only process if 0 days remaining (expires today)
      if (daysRemaining === 0) {
        const user = subscription.user as any;
        await sendTrialNotification({
          userId: user._id.toString(),
          userName: user.firstName || 'User',
          daysRemaining: 0,
          trialTier: subscription.tier,
          trialEndDate: subscription.trialEndDate!,
        });

        // Auto-downgrade subscription to free tier when trial expires
        await Subscription.findByIdAndUpdate(
          subscription._id,
          {
            status: 'expired',
            tier: 'free',
            endDate: now,
            autoRenew: false,
          },
          { new: true }
        );

        logger.info(`[TRIAL EXPIRY JOB] Auto-downgraded subscription ${subscription._id} to free tier`);
      }
    }

    logger.info(
      `[TRIAL EXPIRY JOB] Completed. Processed: ${threeDaysTrials.length} (3-day), ` +
      `${oneDayTrials.length} (1-day), ${todayTrials.length} (today)`
    );
  } catch (error) {
    logger.error('[TRIAL EXPIRY JOB] Error checking expiring trials:', error);
  }
};

/**
 * Initialize trial expiry notification job
 * Runs daily at 9:00 AM
 */
export const initializeTrialExpiryJob = () => {
  try {
    // Run at 9:00 AM every day
    cron.schedule('0 9 * * *', async () => {
      // Acquire Redis distributed lock to prevent cross-instance overlap
      const lockKey = 'job:trial-expiry';
      const lockToken = await redisService.acquireLock(lockKey, 300);
      if (!lockToken) {
        logger.info('trial-expiry skipped — lock held by another instance');
        return;
      }

      try {
        logger.info('[TRIAL EXPIRY JOB] Scheduled job triggered');
        await checkExpiringTrials();
      } finally {
        await redisService.releaseLock(lockKey, lockToken);
      }
    });

    logger.info('[TRIAL EXPIRY JOB] Initialized successfully (runs daily at 9:00 AM)');
  } catch (error) {
    logger.error('[TRIAL EXPIRY JOB] Failed to initialize:', error);
  }
};

/**
 * Manual trigger for testing
 */
export const triggerTrialExpiryCheck = async () => {
  logger.info('[TRIAL EXPIRY JOB] Manual trigger');
  await checkExpiringTrials();
};

export default {
  initializeTrialExpiryJob,
  triggerTrialExpiryCheck,
  checkExpiringTrials,
};
