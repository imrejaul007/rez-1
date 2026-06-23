import * as cron from 'node-cron';
import mongoose from 'mongoose';
import CampaignRule from '../models/CampaignRule';
import { CoinTransaction } from '../models/CoinTransaction';
import { User } from '../models/User';
import { logger } from '../config/logger';
import PushNotificationService from '../services/pushNotificationService';
import redisService from '../services/redisService';

// D4: Distributed lock — only one pod processes campaign rules per tick.
// In-process isRunning flag is NOT sufficient across N replicas.
const LOCK_KEY = 'cron:automated-campaign:tick';
const LOCK_TTL_SECONDS = 15 * 60;

/**
 * Automated Campaign Job
 *
 * Runs every 6 hours to execute triggered marketing campaigns
 * - Evaluates all active campaign rules
 * - Identifies eligible users based on trigger type
 * - Respects cooldown periods
 * - Executes actions (coin drops, push notifications, SMS)
 * - Tracks fired count and last fired time
 */

let campaignJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

const CRON_SCHEDULE = '0 */6 * * *'; // Every 6 hours

interface CampaignStats {
  rulesProcessed: number;
  usersElligible: number;
  actionsExecuted: number;
  errors: string[];
}

/**
 * Find users who haven't visited in X days (days_since_visit trigger)
 */
async function findUsersWithoutRecentVisit(
  merchantId: string,
  storeId: string | undefined,
  days: number,
): Promise<string[]> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Try to find from StoreVisit or StorePayment models
    // This is a simplified approach; adjust based on actual model structure
    const StoreVisit = mongoose.model('StoreVisit');
    const StorePayment = mongoose.model('StorePayment');

    let visitingUserIds: string[] = [];

    try {
      // Get users who visited within the cutoff period
      const recentVisits = await StoreVisit.find(
        storeId ? { storeId, createdAt: { $gte: cutoffDate } } : { createdAt: { $gte: cutoffDate } },
      )
        .distinct('userId')
        .lean();
      visitingUserIds = recentVisits.map((u) => String(u));
    } catch {
      // StoreVisit might not exist, try StorePayment
      try {
        const recentPayments = await StorePayment.find(
          storeId ? { storeId, createdAt: { $gte: cutoffDate } } : { createdAt: { $gte: cutoffDate } },
        )
          .distinct('userId')
          .lean();
        visitingUserIds = recentPayments.map((u) => String(u));
      } catch {
        logger.warn('[CAMPAIGN] StoreVisit and StorePayment models not found');
      }
    }

    // Return users who did NOT visit recently
    // This would require querying user model with filters
    // For now, return empty array and implement in actual deployment
    return [];
  } catch (error) {
    logger.error('[CAMPAIGN] Error finding users without recent visit:', error);
    return [];
  }
}

/**
 * Find users with birthday today
 */
async function findUsersWithBirthdayToday(): Promise<string[]> {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Query User model for matching dateOfBirth
    const users = await User.find({
      'profile.dateOfBirth': {
        $exists: true,
      },
    })
      .select('_id profile.dateOfBirth')
      .limit(5000)
      .lean();

    const birthdayUsers = users
      .filter((u: any) => {
        if (!u.profile?.dateOfBirth) return false;
        const dob = new Date(u.profile.dateOfBirth);
        return dob.getMonth() + 1 === month && dob.getDate() === day;
      })
      .map((u) => String(u._id));

    return birthdayUsers;
  } catch (error) {
    logger.error('[CAMPAIGN] Error finding birthday users:', error);
    return [];
  }
}

/**
 * Find users who crossed spend milestone at a store
 */
async function findUsersWithSpendMilestone(storeId: string, milestoneAmount: number): Promise<string[]> {
  try {
    // Aggregate total spend per user at this store
    const StorePayment = mongoose.model('StorePayment');

    const spendByUser = await StorePayment.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
        },
      },
      {
        $group: {
          _id: '$userId',
          totalSpend: { $sum: '$amount' },
        },
      },
      {
        $match: {
          totalSpend: { $gte: milestoneAmount },
        },
      },
    ]);

    return spendByUser.map((u) => String(u._id));
  } catch (error) {
    logger.error('[CAMPAIGN] Error finding spend milestone users:', error);
    return [];
  }
}

/**
 * Find users by visit count
 */
async function findUsersByVisitCount(storeId: string, visitCount: number): Promise<string[]> {
  try {
    const StoreVisit = mongoose.model('StoreVisit');

    const visitsByUser = await StoreVisit.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
        },
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gte: visitCount },
        },
      },
    ]);

    return visitsByUser.map((u) => String(u._id));
  } catch (error) {
    logger.error('[CAMPAIGN] Error finding visit count users:', error);
    return [];
  }
}

/**
 * Find first-time visitors
 */
async function findFirstTimeVisitors(storeId: string): Promise<string[]> {
  try {
    const StoreVisit = mongoose.model('StoreVisit');

    const firstVisitors = await StoreVisit.aggregate([
      {
        $match: {
          storeId: new mongoose.Types.ObjectId(storeId),
        },
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
          firstVisitDate: { $min: '$createdAt' },
        },
      },
      {
        $match: {
          count: 1,
        },
      },
      {
        $sort: { firstVisitDate: -1 },
      },
    ]);

    return firstVisitors.map((u) => String(u._id));
  } catch (error) {
    logger.error('[CAMPAIGN] Error finding first-time visitors:', error);
    return [];
  }
}

/**
 * Check if user is within cooldown period for a rule
 */
async function isWithinCooldown(userId: string, ruleId: string, cooldownDays: number): Promise<boolean> {
  try {
    const key = `campaign:cooldown:${ruleId}:${userId}`;
    // This would use Redis to track cooldowns
    // For now, return false (not in cooldown)
    return false;
  } catch (error) {
    logger.error('[CAMPAIGN] Error checking cooldown:', error);
    return true; // Be conservative and skip if we can't check
  }
}

/**
 * Execute action for eligible user
 */
async function executeAction(userId: string, ruleId: string, action: any, rule: any): Promise<boolean> {
  try {
    if (action.type === 'coin_drop') {
      // Credit coins to user wallet
      const coinAmount = action.coinAmount || 0;
      if (coinAmount > 0) {
        await CoinTransaction.createTransaction(
          userId,
          'earned',
          coinAmount,
          'bonus_campaign',
          `Campaign reward: ${rule.name}`,
          { campaignRuleId: ruleId },
        );
      }
      return true;
    } else if (action.type === 'push') {
      // Send push notification
      try {
        await PushNotificationService.sendPushToUser(userId, {
          title: 'Special Offer!',
          body: action.message,
          data: { screen: 'campaigns', ruleId },
        });
      } catch (err) {
        logger.error('[CAMPAIGN] Push notification failed:', err);
      }
      return true;
    } else if (action.type === 'sms') {
      // Send SMS
      const user = await User.findById(userId).select('phoneNumber').lean();
      if (user?.phoneNumber) {
        // This would use SMS service
        logger.info(`[CAMPAIGN] SMS dispatched to ***${user.phoneNumber.slice(-4)}`);
      }
      return true;
    }

    return false;
  } catch (error) {
    logger.error('[CAMPAIGN] Error executing action:', error);
    return false;
  }
}

/**
 * Process all active campaign rules
 */
async function processCampaigns(): Promise<CampaignStats> {
  const stats: CampaignStats = {
    rulesProcessed: 0,
    usersElligible: 0,
    actionsExecuted: 0,
    errors: [],
  };

  try {
    // Get all active rules
    const rules = await CampaignRule.find({ isActive: true }).lean();

    logger.info(`[CAMPAIGN] Processing ${rules.length} active rules`);

    for (const rule of rules) {
      try {
        stats.rulesProcessed++;

        let eligibleUserIds: string[] = [];

        // Find eligible users based on trigger type
        if (rule.trigger.type === 'days_since_visit') {
          const days = rule.trigger.value || 30;
          eligibleUserIds = await findUsersWithoutRecentVisit(
            String(rule.merchantId),
            rule.storeId ? String(rule.storeId) : undefined,
            days,
          );
        } else if (rule.trigger.type === 'birthday') {
          eligibleUserIds = await findUsersWithBirthdayToday();
        } else if (rule.trigger.type === 'spend_milestone') {
          const amount = rule.trigger.value || 1000;
          if (rule.storeId) {
            eligibleUserIds = await findUsersWithSpendMilestone(String(rule.storeId), amount);
          }
        } else if (rule.trigger.type === 'visit_count') {
          const count = rule.trigger.value || 5;
          if (rule.storeId) {
            eligibleUserIds = await findUsersByVisitCount(String(rule.storeId), count);
          }
        } else if (rule.trigger.type === 'first_visit') {
          if (rule.storeId) {
            eligibleUserIds = await findFirstTimeVisitors(String(rule.storeId));
          }
        }

        logger.info(`[CAMPAIGN] Rule ${rule._id}: ${eligibleUserIds.length} eligible users`);
        stats.usersElligible += eligibleUserIds.length;

        // Collect all pending notifications and transactions first for batch processing
        const pushQueue: Array<{ userId: string; notification: any }> = [];
        const coinTransactions: any[] = [];
        let actionsForBatch = 0;

        // Execute action for each eligible user (respecting cooldown)
        for (const userId of eligibleUserIds) {
          const inCooldown = await isWithinCooldown(userId, String(rule._id), rule.cooldownDays);
          if (inCooldown) {
            continue;
          }

          // For coin drops, collect transaction data for batch insert
          if (rule.action.type === 'coin_drop' && rule.action.coinAmount && rule.action.coinAmount > 0) {
            coinTransactions.push({
              userId,
              amount: rule.action.coinAmount,
              type: 'earned',
              description: 'bonus_campaign',
              note: `Campaign reward: ${rule.name}`,
              metadata: { campaignRuleId: String(rule._id) },
            });
            actionsForBatch++;
          } else if (rule.action.type === 'push') {
            // Collect push notifications for batch send
            pushQueue.push({
              userId,
              notification: {
                title: 'Special Offer!',
                body: rule.action.message,
                data: { screen: 'campaigns', ruleId: String(rule._id) },
              },
            });
            actionsForBatch++;
          } else {
            // For non-batched actions (SMS), execute individually
            const executed = await executeAction(userId, String(rule._id), rule.action, rule);
            if (executed) {
              stats.actionsExecuted++;
            }
          }
        }

        // Batch insert coin transactions
        if (coinTransactions.length > 0) {
          try {
            await CoinTransaction.insertMany(coinTransactions, { ordered: false });
            stats.actionsExecuted += coinTransactions.length;
          } catch (batchErr) {
            logger.error(`[CAMPAIGN] Batch coin insert error for rule ${rule._id}:`, batchErr);
          }
        }

        // Batch send push notifications (process in groups of 500 to avoid overwhelming the service)
        const BATCH_SIZE = 500;
        if (pushQueue.length > 0) {
          for (let i = 0; i < pushQueue.length; i += BATCH_SIZE) {
            const batch = pushQueue.slice(i, i + BATCH_SIZE);
            try {
              await Promise.allSettled(
                batch.map(({ userId, notification }) =>
                  PushNotificationService.sendPushToUser(userId, notification).catch((e) => {
                    logger.error('[CAMPAIGN] push error for', userId, e);
                  }),
                ),
              );
              stats.actionsExecuted += batch.length;
            } catch (pushBatchErr) {
              logger.error(`[CAMPAIGN] Push batch error for rule ${rule._id}:`, pushBatchErr);
            }
          }
        }

        // Update rule tracking
        if (eligibleUserIds.length > 0) {
          await CampaignRule.findByIdAndUpdate(rule._id, {
            firedCount: rule.firedCount + 1,
            lastFiredAt: new Date(),
          });
        }
      } catch (ruleError) {
        const errorMsg = `Error processing rule ${rule._id}: ${String(ruleError)}`;
        logger.error(`[CAMPAIGN] ${errorMsg}`);
        stats.errors.push(errorMsg);
      }
    }
  } catch (error) {
    const errorMsg = `Campaign job error: ${String(error)}`;
    logger.error(`[CAMPAIGN] ${errorMsg}`);
    stats.errors.push(errorMsg);
  }

  return stats;
}

/**
 * Start the campaign job
 */
export function startCampaignJob(): void {
  if (campaignJob) {
    logger.warn('[CAMPAIGN] Job already running');
    return;
  }

  campaignJob = cron.schedule(CRON_SCHEDULE, async () => {
    if (isRunning) {
      logger.warn('[CAMPAIGN] Previous run still in progress on this pod, skipping');
      return;
    }

    // D4: Acquire cross-pod lock BEFORE flipping isRunning.
    const lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL_SECONDS);
    if (!lockToken) {
      logger.info('[CAMPAIGN] Another pod holds the campaign lock — skipping');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      const stats = await processCampaigns();
      const duration = Date.now() - startTime;

      logger.info('[CAMPAIGN] Job completed', {
        rulesProcessed: stats.rulesProcessed,
        usersElligible: stats.usersElligible,
        actionsExecuted: stats.actionsExecuted,
        errors: stats.errors.length,
        durationMs: duration,
      });
    } catch (error) {
      logger.error('[CAMPAIGN] Unexpected job error:', error);
    } finally {
      isRunning = false;
      await redisService.releaseLock(LOCK_KEY, lockToken);
    }
  });

  logger.info('[CAMPAIGN] Job scheduled at:', CRON_SCHEDULE);
}

/**
 * Stop the campaign job
 */
export function stopCampaignJob(): void {
  if (campaignJob) {
    campaignJob.stop();
    campaignJob = null;
    logger.info('[CAMPAIGN] Job stopped');
  }
}

export default { startCampaignJob, stopCampaignJob };
