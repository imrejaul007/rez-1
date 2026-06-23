import cron from 'node-cron';
import mongoose from 'mongoose';
import { CoinTransaction } from '../models/CoinTransaction';
import { Order } from '../models/Order';
import { UserSettings } from '../models/UserSettings';
import { NotificationService } from '../services/notificationService';
import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';
import { BRAND } from '../config/brand';

const logger = createServiceLogger('weekly-summary');

const LOCK_KEY = 'weekly_summary_job';
const LOCK_TTL = 3600; // 1 hour
const BATCH_SIZE = 100;

interface UserWeeklySummary {
  userId: string;
  coinsEarned: number;
  coinsSpent: number;
  cashback: number;
  orderSavings: number;
  totalSavings: number;
}

/**
 * Computes per-user weekly savings and sends push + in-app notification.
 * Only notifies users who had at least 1 transaction in the past 7 days.
 */
async function runWeeklySummary(): Promise<void> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  logger.info('Starting weekly savings summary job', {
    periodStart: weekAgo.toISOString(),
    periodEnd: now.toISOString(),
  });

  // Aggregate coin transactions per user for the past 7 days
  const coinAgg = await CoinTransaction.aggregate([
    {
      $match: {
        createdAt: { $gte: weekAgo, $lte: now },
        type: { $in: ['earned', 'spent', 'bonus', 'refunded'] },
      },
    },
    {
      $group: {
        _id: '$user',
        earned: {
          $sum: {
            $cond: [{ $in: ['$type', ['earned', 'bonus', 'refunded']] }, '$amount', 0],
          },
        },
        spent: {
          $sum: {
            $cond: [{ $eq: ['$type', 'spent'] }, '$amount', 0],
          },
        },
        cashback: {
          $sum: {
            $cond: [{ $eq: ['$source', 'cashback'] }, '$amount', 0],
          },
        },
      },
    },
  ]);

  if (!coinAgg.length) {
    logger.info('No coin transactions in the past week — skipping summary');
    return;
  }

  // Build a map of userId -> coin stats
  const userCoinMap = new Map<string, { earned: number; spent: number; cashback: number }>();
  for (const row of coinAgg) {
    userCoinMap.set(row._id.toString(), {
      earned: row.earned,
      spent: row.spent,
      cashback: row.cashback,
    });
  }

  // Aggregate order discount savings per user for the past 7 days
  const orderAgg = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: weekAgo, $lte: now },
        status: { $nin: ['cancelled', 'returned'] },
      },
    },
    {
      $group: {
        _id: '$user',
        totalDiscount: { $sum: '$totals.discount' },
        totalCashback: { $sum: '$totals.cashback' },
      },
    },
  ]);

  const userOrderMap = new Map<string, { discount: number; cashback: number }>();
  for (const row of orderAgg) {
    userOrderMap.set(row._id.toString(), {
      discount: row.totalDiscount || 0,
      cashback: row.totalCashback || 0,
    });
  }

  // Merge user IDs from both sources
  const allUserIds = [...new Set([...userCoinMap.keys(), ...userOrderMap.keys()])];
  logger.info(`${allUserIds.length} users had activity this week`);

  // Process users in batches
  let totalSent = 0;
  for (let i = 0; i < allUserIds.length; i += BATCH_SIZE) {
    const batch = allUserIds.slice(i, i + BATCH_SIZE);

    // Check user preferences — only send to users with weeklyDigest enabled (default true)
    const disabledSettings = await UserSettings.find(
      {
        user: { $in: batch.map((id) => new mongoose.Types.ObjectId(id)) },
        'notifications.email.weeklyDigest': false,
      },
      'user'
    ).lean();
    const disabledSet = new Set(disabledSettings.map((s: any) => s.user.toString()));

    for (const userId of batch) {
      if (disabledSet.has(userId)) continue;

      const coins = userCoinMap.get(userId) || { earned: 0, spent: 0, cashback: 0 };
      const orders = userOrderMap.get(userId) || { discount: 0, cashback: 0 };

      const totalSavings = coins.cashback + orders.discount + orders.cashback;

      // Only send if there's something meaningful to report
      if (coins.earned === 0 && totalSavings === 0) continue;

      const savingsText =
        totalSavings > 0
          ? `You saved ${totalSavings.toFixed(0)} this week using ${BRAND.APP_NAME}!`
          : '';
      const earningsText =
        coins.earned > 0 ? `You earned ${coins.earned.toFixed(0)} coins.` : '';

      const message = [savingsText, earningsText].filter(Boolean).join(' ');

      try {
        await NotificationService.createNotification({
          userId: new mongoose.Types.ObjectId(userId),
          title: 'Your Weekly Savings Summary',
          message,
          type: 'info',
          category: 'earning',
          priority: 'low',
          deliveryChannels: ['push', 'in_app'],
          data: {
            amount: coins.earned,
            deepLink: '/wallet',
            metadata: {
              weekStart: weekAgo.toISOString(),
              weekEnd: now.toISOString(),
              totalSavings,
            },
          },
          source: 'automated',
        });
        totalSent++;
      } catch (err: any) {
        logger.error(`Failed to send weekly summary to user ${userId}`, {
          error: err.message,
        });
      }
    }
  }

  logger.info(`Weekly summary notifications sent: ${totalSent}/${allUserIds.length}`);
}

/**
 * Initialize the weekly savings summary cron job.
 * Runs every Monday at 10:00 AM with Redis distributed lock.
 */
export function initializeWeeklySummaryJob(): void {
  // Monday 10:00 AM
  cron.schedule('0 10 * * 1', async () => {
    const lock = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lock) return;
    try {
      await runWeeklySummary();
    } catch (err: any) {
      logger.error('Weekly summary job failed', { error: err.message });
    } finally {
      await redisService.releaseLock(LOCK_KEY, lock);
    }
  });

  logger.info('Weekly summary job initialized (runs Monday 10:00 AM)');
}

export { runWeeklySummary };
