import { Request, Response } from 'express';
import Achievement from '../models/Achievement';
import { logger } from '../config/logger';
import { UserAchievement, IUserAchievement, ACHIEVEMENT_DEFINITIONS } from '../models/Achievement';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import mongoose from 'mongoose';
import redisService from '../services/redisService';
import { withCache } from '../utils/cacheHelper';
import { Lean } from '../types/lean';

/**
 * Enrich UserAchievement records with data from the Achievement model.
 * Returns a merged object with category, tier, reward, visibility, conditions, etc.
 */
async function enrichAchievements(userAchievements: Lean<IUserAchievement>[]): Promise<any[]> {
  // Batch-load all Achievement definitions
  const types = [...new Set(userAchievements.map(ua => ua.type))];
  const definitions = await Achievement.find({ type: { $in: types } })
    .select('type category tier reward coinReward visibility repeatability conditions prerequisites isActive')
    .lean();
  const defMap = new Map(definitions.map((d: any) => [d.type, d]));

  return userAchievements.map(ua => {
    const uaObj = ua.toObject ? ua.toObject() : ua;
    const def = defMap.get(ua.type);
    return {
      ...uaObj,
      // Enrich from Achievement definition
      category: def?.category || 'GENERAL',
      tier: def?.tier || 'bronze',
      reward: def?.reward || { coins: def?.coinReward || 0 },
      visibility: def?.visibility || 'visible',
      repeatability: def?.repeatability || 'one_time',
      conditions: def?.conditions ? { type: def.conditions.type, combinator: def.conditions.combinator } : undefined,
      prerequisites: def?.prerequisites || [],
      ruleProgress: uaObj.ruleProgress || [],
      timesCompleted: uaObj.timesCompleted || (ua.unlocked ? 1 : 0),
    };
  });
}

// Get all achievements for user
export const getUserAchievements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = String(req.user._id);
  const userAchievements = await withCache(`achievements:user:${userId}:all`, 300, () =>
    UserAchievement.find({ user: req.user!._id })
      .select('user achievement type title description icon color unlocked unlockedDate progress currentValue targetValue ruleProgress timesCompleted createdAt')
      .sort({ unlocked: -1, progress: -1, createdAt: -1 })
      .limit(200)
      .lean()
  );

  const enriched = await enrichAchievements(userAchievements);
  sendSuccess(res, enriched, 'Achievements retrieved successfully');
});

// Get unlocked achievements
export const getUnlockedAchievements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = String(req.user._id);
  const achievements = await withCache(`achievements:user:${userId}:unlocked`, 300, () =>
    UserAchievement.find({
      user: req.user!._id,
      unlocked: true
    })
      .select('user achievement type title description icon color unlocked unlockedDate progress currentValue targetValue ruleProgress timesCompleted createdAt')
      .sort({ unlockedDate: -1 }).limit(200).lean()
  );

  sendSuccess(res, achievements, 'Unlocked achievements retrieved successfully');
});

// Get achievement progress
export const getAchievementProgress = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = String(req.user._id);
  const userAchievements = await withCache(`achievements:user:${userId}:progress`, 300, () =>
    UserAchievement.find({ user: req.user!._id })
      .select('user achievement type title description icon color unlocked unlockedDate progress currentValue targetValue ruleProgress timesCompleted createdAt')
      .limit(200).lean()
  );
  const enriched = await enrichAchievements(userAchievements);

  const total = enriched.length;
  const unlocked = enriched.filter((a: any) => a.unlocked).length;
  const inProgress = enriched.filter((a: any) => !a.unlocked && a.progress > 0).length;
  const totalCoinsEarned = enriched
    .filter((a: any) => a.unlocked)
    .reduce((sum: number, a: any) => sum + (a.reward?.coins || 0), 0);

  const summary = {
    total,
    unlocked,
    inProgress,
    locked: total - unlocked,
    completionPercentage: total > 0 ? Math.round((unlocked / total) * 100) : 0,
    totalCoinsEarned,
  };

  sendSuccess(res, { summary, achievements: enriched }, 'Achievement progress retrieved successfully');
});

// Initialize achievements for user
export const initializeUserAchievements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = req.user._id;

  // Check if achievements already exist
  const existingCount = await UserAchievement.countDocuments({ user: userId });

  if (existingCount > 0) {
    return sendBadRequest(res, 'Achievements already initialized');
  }

  // Load active achievement definitions from DB (not hardcoded)
  const activeDefinitions = await Achievement.find({ isActive: true })
    .select('type title description icon color isActive requirement conditions category tier reward coinReward')
    .limit(200).lean();

  // Fallback to legacy ACHIEVEMENT_DEFINITIONS if no DB definitions exist yet
  const definitions = activeDefinitions.length > 0
    ? activeDefinitions
    : ACHIEVEMENT_DEFINITIONS.filter(def => def.isActive);

  const achievements = definitions.map((def: any) => ({
    user: userId,
    achievement: def._id,
    type: def.type,
    title: def.title,
    description: def.description,
    icon: def.icon,
    color: def.color,
    unlocked: false,
    progress: 0,
    targetValue: def.requirement?.target || def.conditions?.rules?.[0]?.target || 100,
    ruleProgress: (def.conditions?.rules || []).map((rule: any) => ({
      metric: rule.metric,
      currentValue: 0,
      targetValue: rule.target,
      met: false,
    })),
  }));

  const created = await UserAchievement.insertMany(achievements);

  sendSuccess(res, created, 'Achievements initialized successfully', 201);
});

// NOTE: updateAchievementProgress removed — achievement progress is now server-driven only
// via the AchievementEngine + event bus pipeline. No user-facing endpoint.

// Recalculate all achievements based on user statistics
// Rate limited: 1 recalculation per minute per user via Redis lock
export const recalculateAchievements = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = req.user._id;

  // Per-user rate limiting via Redis lock (prevents expensive aggregation spam)
  const lockKey = `achievement:recalc:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 60); // 60-second lock
  if (!lockToken) {
    return sendBadRequest(res, 'Achievement recalculation is limited to once per minute. Please wait.');
  }
  // Note: lock is NOT released manually — it auto-expires after 60s to enforce cooldown

  try {
    // Use the new AchievementEngine for full recalculation
    const achievementEngine = (await import('../services/achievementEngine')).default;
    await achievementEngine.fullRecalculate(String(userId));
  } catch (err) {
    logger.error('[ACHIEVEMENT] Engine recalculate failed, falling back to legacy:', err);

    // Legacy fallback: direct metric computation
    const { Order } = await import('../models/Order');
    const { Video } = await import('../models/Video');
    const { Project } = await import('../models/Project');
    const { Review } = await import('../models/Review');
    const OfferRedemption = (await import('../models/OfferRedemption')).default;

    const [orderStats, videoStats, projectStats, reviewCount, offerCount] = await Promise.all([
      Order.aggregate([
        { $match: { user: userId, status: 'delivered' } },
        { $group: { _id: null, totalOrders: { $sum: 1 }, totalSpent: { $sum: '$totalPrice' } } }
      ]),
      Video.aggregate([
        { $match: { creator: userId } },
        { $group: { _id: null, totalVideos: { $sum: 1 }, totalViews: { $sum: '$engagement.views' } } }
      ]),
      Project.aggregate([
        { $match: { 'submissions.user': userId } },
        { $unwind: '$submissions' },
        { $match: { 'submissions.user': userId } },
        { $group: { _id: null, totalProjects: { $sum: 1 }, totalEarned: { $sum: { $ifNull: ['$submissions.paidAmount', 0] } } } }
      ]),
      Review.countDocuments({ user: userId }),
      OfferRedemption.countDocuments({ user: userId })
    ]);

    const metrics: Record<string, number> = {
      totalOrders: orderStats[0]?.totalOrders || 0,
      totalSpent: orderStats[0]?.totalSpent || 0,
      totalVideos: videoStats[0]?.totalVideos || 0,
      totalVideoViews: videoStats[0]?.totalViews || 0,
      totalProjects: projectStats[0]?.totalProjects || 0,
      projectEarnings: projectStats[0]?.totalEarned || 0,
      totalReviews: reviewCount || 0,
      totalReferrals: req.user.referral?.totalReferrals || 0,
      totalActivity: (orderStats[0]?.totalOrders || 0) + (videoStats[0]?.totalVideos || 0) +
        (projectStats[0]?.totalProjects || 0) + (reviewCount || 0) + (offerCount || 0)
    };

    const achievements = await UserAchievement.find({ user: userId })
      .select('user type title description icon color unlocked unlockedDate progress currentValue targetValue ruleProgress timesCompleted')
      .limit(200);
    await Promise.all(achievements.map(async (achievement) => {
      const definition = ACHIEVEMENT_DEFINITIONS.find(def => def.type === achievement.type);
      if (!definition) return;
      const currentValue = metrics[definition.requirement.metric] || 0;
      achievement.currentValue = currentValue;
      achievement.progress = Math.min(100, Math.round((currentValue / achievement.targetValue!) * 100));
      if (achievement.progress >= 100 && !achievement.unlocked) {
        achievement.unlocked = true;
        achievement.unlockedDate = new Date();
      }
      return achievement.save();
    }));
  }

  const updatedAchievements = await UserAchievement.find({ user: userId })
    .select('user achievement type title description icon color unlocked unlockedDate progress currentValue targetValue ruleProgress timesCompleted createdAt')
    .sort({ unlocked: -1, progress: -1 }).limit(200).lean();

  const enriched = await enrichAchievements(updatedAchievements);
  sendSuccess(res, enriched, 'Achievements recalculated successfully');
});