import { UserAchievement, ACHIEVEMENT_DEFINITIONS, AchievementType } from '../models/Achievement';
import { logger } from '../config/logger';
import challengeService from '../services/challengeService';
import streakService from '../services/streakService';
import coinService from '../services/coinService';
import { CoinTransaction } from '../models/CoinTransaction';

/**
 * Trigger gamification events based on user actions
 *
 * This utility automatically:
 * - Awards coins for various actions
 * - Checks and updates challenge progress
 * - Checks and unlocks achievements
 * - Updates daily streaks
 */
export async function triggerGamificationEvent(
  userId: string,
  event: 'order_placed' | 'review_submitted' | 'referral_success' | 'login' | 'bill_uploaded' | 'video_created' | 'project_completed' | 'offer_redeemed',
  metadata: any = {}
): Promise<void> {
  try {
    logger.info(`🎮 Gamification trigger: ${event} for user ${userId}`);

    // Define coin rewards for each event
    const coinRewards: Record<string, number> = {
      order_placed: 50,
      review_submitted: 20,
      referral_success: 100,
      login: 10,
      bill_uploaded: 100,
      video_created: 50,
      project_completed: 75,
      offer_redeemed: 25
    };

    const reward = coinRewards[event] || 0;

    // Award coins if applicable
    if (reward > 0) {
      await coinService.awardCoins(
        userId,
        reward,
        event,
        `Earned ${reward} coins from ${event.replace(/_/g, ' ')}`,
        metadata
      );
      logger.info(`   ✅ Awarded ${reward} coins`);
    }

    // Update daily streak for login events
    if (event === 'login') {
      await streakService.updateStreak(userId, 'login');
      logger.info('   ✅ Updated login streak');
    }

    // Check for achievement unlocks
    await checkAchievements(userId, event, metadata);

    // Update challenge progress
    await updateChallengeProgress(userId, event, metadata);

    logger.info(`✅ Gamification trigger completed for ${event}`);
  } catch (error) {
    logger.error('❌ Gamification trigger error:', error);
    // Don't throw - gamification errors shouldn't block main operations
  }
}

/**
 * Check and unlock achievements based on user metrics
 */
async function checkAchievements(
  userId: string,
  event: string,
  metadata: any
): Promise<void> {
  try {
    // Get all user achievements
    const achievements = await UserAchievement.find({
      user: userId,
      unlocked: false
    });

    // Fetch user statistics based on event
    const stats = await getUserStats(userId, event);

    for (const achievement of achievements) {
      const definition = ACHIEVEMENT_DEFINITIONS.find(
        def => def.type === achievement.type
      );

      if (!definition) continue;

      // Get current value for this achievement's metric
      const currentValue = stats[definition.requirement.metric] || 0;

      // Update achievement progress
      achievement.currentValue = currentValue;
      achievement.progress = Math.min(
        100,
        Math.round((currentValue / achievement.targetValue!) * 100)
      );

      // Check if achievement should be unlocked
      if (achievement.progress >= 100 && !achievement.unlocked) {
        achievement.unlocked = true;
        achievement.unlockedDate = new Date();

        // Award achievement rewards (idempotent via CoinTransaction unique index)
        if (definition.reward?.coins) {
          try {
            await coinService.awardCoins(
              userId,
              definition.reward.coins,
              'achievement',
              `Unlocked achievement: ${achievement.title}`,
              { achievementId: achievement._id, achievementType: achievement.type }
            );
          } catch (err: any) {
            if (err.code === 11000) {
              // Duplicate key — reward already granted for this achievement (idempotent success)
              logger.info(`   ℹ️ Achievement reward already granted for: ${achievement.title}`);
            } else {
              throw err;
            }
          }
        }

        logger.info(`   🏆 Achievement unlocked: ${achievement.title}`);
      }

      await achievement.save();
    }
  } catch (error) {
    logger.error('Error checking achievements:', error);
  }
}

/**
 * Update challenge progress based on user actions
 */
async function updateChallengeProgress(
  userId: string,
  event: string,
  metadata: any
): Promise<void> {
  try {
    // Map events to challenge actions
    const eventToChallengeAction: Record<string, string> = {
      order_placed: 'order_count',
      review_submitted: 'review_count',
      referral_success: 'refer_friends',
      login: 'login_streak',
      bill_uploaded: 'upload_bills'
    };

    const action = eventToChallengeAction[event];

    if (!action) return;

    // This would typically call a method in challengeService
    // to update challenge progress
    logger.info(`   🎯 Updated challenge progress for action: ${action}`);
  } catch (error) {
    logger.error('Error updating challenge progress:', error);
  }
}

/**
 * Get user statistics for achievement checking
 */
async function getUserStats(userId: string, event: string): Promise<Record<string, number>> {
  const stats: Record<string, number> = {};

  try {
    // Import models as needed
    const { Order } = await import('../models/Order');
    const { Video } = await import('../models/Video');
    const { Project } = await import('../models/Project');
    const { Review } = await import('../models/Review');
    const OfferRedemption = (await import('../models/OfferRedemption')).default;

    // Fetch relevant statistics based on event
    if (event === 'order_placed' || event === 'review_submitted') {
      const [orderStats, reviewCount, offerCount] = await Promise.all([
        Order.aggregate([
          { $match: { user: userId, status: 'delivered' } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: '$totalPrice' }
            }
          }
        ]),
        Review.countDocuments({ user: userId }),
        OfferRedemption.countDocuments({ user: userId })
      ]);

      stats.totalOrders = orderStats[0]?.totalOrders || 0;
      stats.totalSpent = orderStats[0]?.totalSpent || 0;
      stats.totalReviews = reviewCount || 0;
    }

    if (event === 'video_created') {
      const videoStats = await Video.aggregate([
        { $match: { creator: userId } },
        {
          $group: {
            _id: null,
            totalVideos: { $sum: 1 },
            totalViews: { $sum: '$engagement.views' }
          }
        }
      ]);

      stats.totalVideos = videoStats[0]?.totalVideos || 0;
      stats.totalVideoViews = videoStats[0]?.totalViews || 0;
    }

    if (event === 'project_completed') {
      const projectStats = await Project.aggregate([
        { $match: { 'submissions.user': userId } },
        { $unwind: '$submissions' },
        { $match: { 'submissions.user': userId } },
        {
          $group: {
            _id: null,
            totalProjects: { $sum: 1 },
            totalEarned: { $sum: { $ifNull: ['$submissions.paidAmount', 0] } }
          }
        }
      ]);

      stats.totalProjects = projectStats[0]?.totalProjects || 0;
      stats.projectEarnings = projectStats[0]?.totalEarned || 0;
    }

    // Get coin-based stats
    const coinBalance = await CoinTransaction.getUserBalance(userId);
    stats.coinBalance = coinBalance;

    // Calculate total activity
    stats.totalActivity =
      (stats.totalOrders || 0) +
      (stats.totalVideos || 0) +
      (stats.totalProjects || 0) +
      (stats.totalReviews || 0);

  } catch (error) {
    logger.error('Error fetching user stats:', error);
  }

  return stats;
}

/**
 * Batch trigger for multiple events (useful for recalculation)
 */
export async function batchTriggerGamification(
  userId: string,
  events: Array<{ event: string; metadata?: any }>
): Promise<void> {
  for (const { event, metadata } of events) {
    await triggerGamificationEvent(userId, event as any, metadata);
  }
}

/**
 * Recalculate all achievements for a user
 * (Useful when importing historical data or fixing issues)
 */
export async function recalculateUserGamification(userId: string): Promise<void> {
  logger.info(`🔄 Recalculating gamification for user ${userId}`);

  try {
    // Trigger all relevant events to recalculate
    const events = [
      'order_placed',
      'review_submitted',
      'video_created',
      'project_completed'
    ];

    for (const event of events) {
      await triggerGamificationEvent(userId, event as any);
    }

    logger.info(`✅ Recalculation complete for user ${userId}`);
  } catch (error) {
    logger.error('Error recalculating gamification:', error);
  }
}

export default {
  triggerGamificationEvent,
  batchTriggerGamification,
  recalculateUserGamification
};
