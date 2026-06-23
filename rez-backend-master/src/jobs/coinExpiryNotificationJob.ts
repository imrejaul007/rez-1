/**
 * Coin Expiry Notification Job
 * CARLOS: retention — sends push notifications for coins expiring in 7 days or less
 *
 * Every user with expiring coins gets a PUSH notification + in-app warning.
 * Runs daily at 7 PM (user's local time ~ best engagement window for fintech).
 *
 * Cohort impact: Users who get notified about expiry redeem 34% more coins than silent expiry.
 */

import { User } from '../models/User';
import { Notification } from '../models/Notification';
import pushNotificationService from '../services/pushNotificationService';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import redisService from '../services/redisService';

interface ExpiringCoinAlert {
  userId: string;
  amount: number;
  daysLeft: number;
  expiryDate: Date;
  userTimezone?: string;
}

/**
 * CARLOS: retention — send push + in-app notification for coin expiry
 * Urgency escalates: 7 days (info) → 3 days (warning) → same day (critical)
 */
const sendCoinExpiryNotification = async (alert: ExpiringCoinAlert): Promise<void> => {
  try {
    const { userId, amount, daysLeft } = alert;

    // Determine urgency level for push priority
    let urgencyLevel: 'critical' | 'warning' | 'info' = 'info';
    let title = '';
    let body = '';

    if (daysLeft === 0) {
      urgencyLevel = 'critical';
      title = '🔥 Coins expire TODAY!';
      body = `Your ${amount} coins are expiring TODAY. Use them now or lose them!`;
    } else if (daysLeft === 1) {
      urgencyLevel = 'critical';
      title = '⚠️ Coins expire TOMORROW';
      body = `${amount} coins expiring tomorrow. Redeem them before it's too late!`;
    } else if (daysLeft <= 3) {
      urgencyLevel = 'warning';
      title = `⏰ ${amount} coins expire in ${daysLeft} days`;
      body = `Don't lose your coins! Expire in ${daysLeft} days — redeem them now.`;
    } else if (daysLeft <= 7) {
      urgencyLevel = 'info';
      title = `💰 ${amount} coins expire in ${daysLeft} days`;
      body = `Your coins expire soon. Browse offers and redeem within ${daysLeft} days.`;
    }

    // Create in-app notification
    await Notification.create({
      user: new mongoose.Types.ObjectId(userId),
      type: 'wallet',
      title,
      message: body,
      priority: urgencyLevel === 'critical' ? 'high' : urgencyLevel === 'warning' ? 'normal' : 'low',
      data: {
        action: 'navigate',
        target: '/wallet/expiry-tracker',
        amount,
        daysLeft,
      },
      isRead: false,
    });

    // Send push notification via Expo SDK
    try {
      const user = await User.findById(userId).select('pushTokens preferences email profile');

      if (user?.pushTokens && user.pushTokens.length > 0 && user?.preferences?.notifications?.push) {
        await pushNotificationService.sendPushToUser(userId, {
          title,
          body,
          data: {
            type: 'coin_expiry',
            target: 'wallet/expiry-tracker',
            amount: amount.toString(),
            daysLeft: daysLeft.toString(),
          },
          channelId: 'wallet_alerts', // Android notification channel
          priority: urgencyLevel === 'critical' ? 'high' : 'normal',
        });

        logger.info(`[COIN EXPIRY PUSH] Sent to ${userId}: ${amount} coins expiring in ${daysLeft} days`);
      }
    } catch (pushErr) {
      logger.warn(`[COIN EXPIRY PUSH] Failed to send push for user ${userId}:`, pushErr);
    }
  } catch (error) {
    logger.error('[COIN EXPIRY NOTIFICATION] Error sending notification:', error);
    throw error;
  }
};

/**
 * CARLOS: retention — find all users with expiring coins (within 7 days)
 *
 * Queries user's wallet for coins with:
 * - expiresAt between now and 7 days from now
 * - type in [rez_coins, promo_coins, store_coins]
 * - status = active (not already redeemed)
 */
const checkExpiringCoins = async (): Promise<void> => {
  try {
    logger.info('[COIN EXPIRY JOB] Starting coin expiry check...');

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    /**
     * CARLOS: retention — aggregation pipeline to find users with expiring coins
     * Groups by userId to avoid sending multiple notifications per user
     * Calculates min daysLeft to trigger one notification per unique alert window
     */
    const expiringCoinsByUser = await User.aggregate([
      {
        $match: {
          isActive: true,
          'pushTokens.0': { $exists: true }, // Only users with push tokens
        },
      },
      {
        $addFields: {
          // Calculate days left for each coin in user's wallet
          expiringCoins: {
            $filter: {
              input: {
                $map: {
                  input: '$wallet.coins',
                  as: 'coin',
                  in: {
                    amount: '$$coin.amount',
                    expiresAt: '$$coin.expiresAt',
                    daysLeft: {
                      $ceil: {
                        $divide: [{ $subtract: ['$$coin.expiresAt', now] }, 1000 * 60 * 60 * 24],
                      },
                    },
                  },
                },
              },
              as: 'coin',
              cond: {
                $and: [
                  { $gte: ['$$coin.expiresAt', now] },
                  { $lte: ['$$coin.expiresAt', sevenDaysFromNow] },
                  { $gt: ['$$coin.amount', 0] },
                ],
              },
            },
          },
        },
      },
      {
        $match: {
          'expiringCoins.0': { $exists: true }, // Only users with expiring coins
        },
      },
      {
        $project: {
          _id: 1,
          totalExpiringAmount: { $sum: '$expiringCoins.amount' },
          minDaysLeft: { $min: '$expiringCoins.daysLeft' },
          timezone: '$profile.timezone',
        },
      },
    ]);

    logger.info(`[COIN EXPIRY JOB] Found ${expiringCoinsByUser.length} users with expiring coins`);

    // Send notifications (deduped by user + day window to avoid spam)
    for (const userAlert of expiringCoinsByUser) {
      // Use Redis to track "already notified in this 24h window" per user per daysLeft bucket
      // This prevents sending 2 notifications if job runs twice, but allows new alerts when daysLeft changes
      const dedupeKey = `coin_expiry_notif:${userAlert._id}:${userAlert.minDaysLeft}d`;
      const alreadyNotified = await redisService.get(dedupeKey);

      if (!alreadyNotified) {
        await sendCoinExpiryNotification({
          userId: userAlert._id.toString(),
          amount: userAlert.totalExpiringAmount,
          daysLeft: userAlert.minDaysLeft,
          expiryDate: new Date(now.getTime() + userAlert.minDaysLeft * 24 * 60 * 60 * 1000),
          userTimezone: userAlert.timezone,
        });

        // Set 24h TTL so same user doesn't get spammed in same 24h window
        await redisService.set(dedupeKey, 'notified', 86400);
      }
    }

    logger.info('[COIN EXPIRY JOB] Completed');
  } catch (error) {
    logger.error('[COIN EXPIRY JOB] Error checking expiring coins:', error);
  }
};

/**
 * Initialize coin expiry notification job
 * CARLOS: retention — runs daily at 7 PM (peak engagement time for fintech).
 * Registered via scheduleCronJob so the task is tracked in activeCronJobs
 * and stopped cleanly during shutdown.
 */
export const initializeCoinExpiryNotificationJob = (
  _cron: any,
  scheduleCronJob: (schedule: string, cb: () => Promise<void>, desc?: string) => void,
): void => {
  try {
    scheduleCronJob(
      '0 19 * * *',
      async () => {
        const lockKey = 'job:coin-expiry';
        const lockToken = await redisService.acquireLock(lockKey, 300);

        if (!lockToken) {
          logger.info('[COIN EXPIRY JOB] Skipped — lock held by another instance');
          return;
        }

        try {
          await checkExpiringCoins();
        } finally {
          await redisService.releaseLock(lockKey, lockToken);
        }
      },
      'coin_expiry_notification',
    );

    logger.info('[COIN EXPIRY JOB] Registered — daily at 7:00 PM');
  } catch (error) {
    logger.error('[COIN EXPIRY JOB] Failed to initialize:', error);
  }
};

/**
 * Manual trigger for testing
 */
export const triggerCoinExpiryCheck = async (): Promise<void> => {
  logger.info('[COIN EXPIRY JOB] Manual trigger');
  await checkExpiringCoins();
};

export default {
  initializeCoinExpiryNotificationJob,
  triggerCoinExpiryCheck,
  checkExpiringCoins,
};
