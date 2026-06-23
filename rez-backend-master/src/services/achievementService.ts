import { logger } from '../config/logger';
// Achievement Service
// Handles automatic achievement updates and triggers

import { UserAchievement, ACHIEVEMENT_DEFINITIONS } from '../models/Achievement';
import { Types } from 'mongoose';
import coinService from './coinService';

class AchievementService {
  /**
   * Recalculate all achievements for a user based on their current statistics
   */
  async recalculateUserAchievements(userId: string | Types.ObjectId): Promise<void> {
    try {
      logger.info(`🏆 [ACHIEVEMENT] Recalculating achievements for user: ${userId}`);

      // Get user statistics
      const { Order } = await import('../models/Order');
      const { Video } = await import('../models/Video');
      const { Project } = await import('../models/Project');
      const { Review } = await import('../models/Review');
      const { User } = await import('../models/User');
      const OfferRedemption = (await import('../models/OfferRedemption')).default;

      // Fetch all relevant metrics
      const [orderStats, videoStats, projectStats, reviewCount, offerCount, user] = await Promise.all([
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
        Video.aggregate([
          { $match: { creator: userId } },
          {
            $group: {
              _id: null,
              totalVideos: { $sum: 1 },
              totalViews: { $sum: '$engagement.views' }
            }
          }
        ]),
        Project.aggregate([
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
        ]),
        Review.countDocuments({ user: userId }),
        OfferRedemption.countDocuments({ user: userId }),
        User.findById(userId).lean()
      ]);

      // Build metrics object
      const metrics: Record<string, number> = {
        totalOrders: orderStats[0]?.totalOrders || 0,
        totalSpent: orderStats[0]?.totalSpent || 0,
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalVideoViews: videoStats[0]?.totalViews || 0,
        totalProjects: projectStats[0]?.totalProjects || 0,
        projectEarnings: projectStats[0]?.totalEarned || 0,
        totalReviews: reviewCount || 0,
        totalReferrals: user?.referral?.totalReferrals || 0,
        totalActivity: (
          (orderStats[0]?.totalOrders || 0) +
          (videoStats[0]?.totalVideos || 0) +
          (projectStats[0]?.totalProjects || 0) +
          (reviewCount || 0) +
          (offerCount || 0)
        ),
        daysActive: user?.createdAt ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0
      };

      // Get all user achievements
      const achievements = await UserAchievement.find({ user: userId }).lean();

      // Update each achievement based on its metric
      const updates = achievements.map(async (achievement) => {
        const definition = ACHIEVEMENT_DEFINITIONS.find(def => def.type === achievement.type);
        if (!definition) return achievement;

        const currentValue = metrics[definition.requirement.metric] || 0;
        const wasUnlocked = achievement.unlocked;
        
        achievement.currentValue = currentValue;
        achievement.progress = Math.min(100, Math.round((currentValue / achievement.targetValue!) * 100));

        // Check if achievement should be unlocked
        if (achievement.progress >= 100 && !achievement.unlocked) {
          achievement.unlocked = true;
          achievement.unlockedDate = new Date();
          logger.info(`🎉 [ACHIEVEMENT] User ${userId} unlocked achievement: ${achievement.title}`);

          // Award coins for unlocking achievement (idempotent via CoinTransaction unique index)
          if (definition.reward?.coins && definition.reward.coins > 0) {
            try {
              await coinService.awardCoins(
                userId.toString(),
                definition.reward.coins,
                'achievement',
                `Achievement unlocked: ${achievement.title}`,
                { achievementType: achievement.type, achievementId: achievement._id }
              );
              logger.info(`💰 [ACHIEVEMENT] Awarded ${definition.reward.coins} coins for achievement: ${achievement.title}`);
            } catch (coinError: any) {
              if (coinError.code === 11000) {
                // Duplicate key — reward already granted for this achievement (idempotent success)
                logger.info(`ℹ️ [ACHIEVEMENT] Reward already granted for: ${achievement.title}`);
              } else {
                logger.error(`❌ [ACHIEVEMENT] Failed to award coins for ${achievement.title}:`, coinError);
              }
            }
          }
        }

        return achievement.save();
      });

      await Promise.all(updates);
      logger.info(`✅ [ACHIEVEMENT] Successfully recalculated achievements for user: ${userId}`);

    } catch (error) {
      logger.error(`❌ [ACHIEVEMENT] Error recalculating achievements for user ${userId}:`, error);
      // Don't throw error to avoid disrupting the main flow
    }
  }

  /**
   * Initialize achievements for a new user
   */
  async initializeUserAchievements(userId: string | Types.ObjectId): Promise<void> {
    try {
      logger.info(`🏆 [ACHIEVEMENT] Initializing achievements for user: ${userId}`);

      // Check if achievements already exist
      const existingCount = await UserAchievement.countDocuments({ user: userId });

      if (existingCount > 0) {
        logger.info(`ℹ️ [ACHIEVEMENT] Achievements already exist for user: ${userId}`);
        return;
      }

      // Create achievement entries for all defined achievements
      const achievements = ACHIEVEMENT_DEFINITIONS.filter(def => def.isActive).map(def => ({
        user: userId,
        type: def.type,
        title: def.title,
        description: def.description,
        icon: def.icon,
        color: def.color,
        unlocked: false,
        progress: 0,
        targetValue: def.requirement.target
      }));

      await UserAchievement.insertMany(achievements);
      logger.info(`✅ [ACHIEVEMENT] Successfully initialized ${achievements.length} achievements for user: ${userId}`);

    } catch (error) {
      logger.error(`❌ [ACHIEVEMENT] Error initializing achievements for user ${userId}:`, error);
      // Don't throw error to avoid disrupting the main flow
    }
  }

  /**
   * Trigger achievement recalculation after specific actions
   */
  async triggerAchievementUpdate(userId: string | Types.ObjectId, action: string): Promise<void> {
    try {
      logger.info(`🏆 [ACHIEVEMENT] Triggering achievement update for user: ${userId}, action: ${action}`);

      // Recalculate achievements
      await this.recalculateUserAchievements(userId);

    } catch (error) {
      logger.error(`❌ [ACHIEVEMENT] Error triggering achievement update for user ${userId}:`, error);
    }
  }

  /**
   * Check and award achievements based on user actions
   * This is a more targeted approach for specific achievement types
   */
  async checkAndAwardAchievements(userId: string | Types.ObjectId, type: string, data?: any): Promise<void> {
    try {
      logger.info(`🏆 [ACHIEVEMENT] Checking achievements for user: ${userId}, type: ${type}`);

      // Map action types to achievement types
      const achievementTypeMap: Record<string, string[]> = {
        'order_completed': ['first_order', 'order_master', 'shopping_spree', 'big_spender'],
        'video_created': ['first_video', 'content_creator', 'video_star'],
        'project_completed': ['first_project', 'project_master', 'earner'],
        'review_created': ['first_review', 'reviewer'],
        'referral_completed': ['referral_starter', 'referral_pro'],
        'offer_redeemed': ['deal_hunter'],
        'activity': ['active_user']
      };

      const relevantAchievementTypes = achievementTypeMap[type] || [];

      if (relevantAchievementTypes.length === 0) {
        logger.info(`ℹ️ [ACHIEVEMENT] No relevant achievement types for action: ${type}`);
        // Still recalculate all achievements to be safe
        await this.recalculateUserAchievements(userId);
        return;
      }

      // Get relevant achievements for the user
      const achievements = await UserAchievement.find({
        user: userId,
        type: { $in: relevantAchievementTypes },
        unlocked: false // Only check unlocked achievements
      }).lean();

      if (achievements.length === 0) {
        logger.info(`ℹ️ [ACHIEVEMENT] No unlocked achievements to check for user: ${userId}`);
        return;
      }

      // Recalculate only if there are relevant achievements to check
      await this.recalculateUserAchievements(userId);

      logger.info(`✅ [ACHIEVEMENT] Successfully checked and updated achievements for user: ${userId}`);

    } catch (error) {
      logger.error(`❌ [ACHIEVEMENT] Error checking achievements for user ${userId}:`, error);
      // Don't throw error to avoid disrupting the main flow
    }
  }
}

export default new AchievementService();
