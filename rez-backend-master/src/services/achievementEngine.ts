import { logger } from '../config/logger';
import mongoose, { Types } from 'mongoose';
import Achievement, {
  IAchievementDoc,
  IUserAchievement,
  UserAchievement,
  ACHIEVEMENT_DEFINITIONS,
  IAchievementConditions,
  IConditionRule,
  IRuleProgress,
  RepeatabilityType
} from '../models/Achievement';
import coinService from './coinService';
import { ACHIEVEMENT_METRICS, EVENT_TO_METRICS } from '../config/achievementMetrics';
import pushNotificationService from './pushNotificationService';
import { User } from '../models/User';
import { Lean } from '../types/lean';

/**
 * AchievementEngine — Rule-based achievement processing engine.
 *
 * Key design principles:
 * - Event-driven: processMetricUpdate() is called when qualifying actions occur
 * - Incremental: only evaluates achievements that track the affected metric
 * - Idempotent: reward distribution protected by CoinTransaction unique index
 * - Atomic: uses findOneAndUpdate to prevent race conditions on unlock
 */
class AchievementEngine {

  /**
   * Process a metric update for a user.
   * Called from event handlers after qualifying actions.
   * Only evaluates achievements that track the given metric(s).
   */
  async processMetricUpdate(
    userId: string,
    metrics: Record<string, number>,
    metadata?: Record<string, any>
  ): Promise<{ unlocked: string[] }> {
    const unlockedTypes: string[] = [];

    try {
      const metricNames = Object.keys(metrics);

      // Find active achievements that track any of the affected metrics
      const relevantAchievements = await Achievement.find({
        trackedMetrics: { $in: metricNames },
        isActive: true
      }).lean();

      if (relevantAchievements.length === 0) return { unlocked: [] };

      // Ensure user has UserAchievement records (lazy init)
      await this.ensureUserAchievements(userId, relevantAchievements);

      // Process each relevant achievement
      for (const achievementDef of relevantAchievements) {
        const result = await this.evaluateAndUpdate(userId, achievementDef, metrics);
        if (result.newlyUnlocked) {
          unlockedTypes.push(achievementDef.type);
        }
      }
    } catch (error) {
      // Gamification errors should not block main operations
      logger.error(`[ACHIEVEMENT ENGINE] Error processing metric update for user ${userId}:`, error);
    }

    return { unlocked: unlockedTypes };
  }

  /**
   * Evaluate a single achievement and update user progress.
   */
  private async evaluateAndUpdate(
    userId: string,
    achievementDef: Lean<IAchievementDoc>,
    metrics: Record<string, number>
  ): Promise<{ newlyUnlocked: boolean }> {
    // Check prerequisites first
    if (achievementDef.prerequisites?.length > 0) {
      const prereqsMet = await this.checkPrerequisites(userId, achievementDef);
      if (!prereqsMet) return { newlyUnlocked: false };
    }

    // Handle repeatability: check if current period needs reset
    const periodKey = this.getPeriodKey(achievementDef.repeatability);

    // Evaluate conditions
    const evaluation = this.evaluateConditions(achievementDef.conditions, metrics);

    // Build ruleProgress array
    const ruleProgress: IRuleProgress[] = (achievementDef.conditions?.rules || []).map(rule => ({
      metric: rule.metric,
      currentValue: metrics[rule.metric] || 0,
      targetValue: rule.target,
      met: this.compareValue(metrics[rule.metric] || 0, rule.operator, rule.target)
    }));

    // Determine the primary currentValue and targetValue for backward compat
    const primaryRule = achievementDef.conditions?.rules?.[0];
    const currentValue = primaryRule ? (metrics[primaryRule.metric] || 0) : 0;
    const targetValue = primaryRule ? primaryRule.target : (achievementDef.target || 1);

    if (evaluation.unlocked) {
      // Attempt atomic unlock (prevents double-unlock race condition)
      const unlocked = await UserAchievement.findOneAndUpdate(
        {
          user: new Types.ObjectId(userId),
          type: achievementDef.type,
          unlocked: false
        },
        {
          $set: {
            unlocked: true,
            unlockedDate: new Date(),
            progress: 100,
            currentValue,
            targetValue,
            ruleProgress,
            lastCompletedAt: new Date()
          },
          $inc: { timesCompleted: 1 }
        },
        { new: true }
      );

      if (unlocked) {
        // Award reward idempotently
        await this.awardReward(userId, achievementDef, periodKey);
        return { newlyUnlocked: true };
      }
      // If unlocked is null, achievement was already unlocked (concurrent process got it first)
      return { newlyUnlocked: false };
    }

    // Not unlocked yet — update progress
    await UserAchievement.findOneAndUpdate(
      {
        user: new Types.ObjectId(userId),
        type: achievementDef.type,
        unlocked: false
      },
      {
        $set: {
          progress: evaluation.progress,
          currentValue,
          targetValue,
          ruleProgress
        }
      }
    );

    return { newlyUnlocked: false };
  }

  /**
   * Evaluate achievement conditions against current metrics.
   * Supports simple, compound, streak, and time_bounded types.
   */
  evaluateConditions(
    conditions: IAchievementConditions | undefined,
    metrics: Record<string, number>
  ): { progress: number; unlocked: boolean } {
    if (!conditions || !conditions.rules || conditions.rules.length === 0) {
      return { progress: 0, unlocked: false };
    }

    const { type, rules, combinator } = conditions;

    switch (type) {
      case 'simple':
        return this.evaluateSimple(rules[0], metrics);

      case 'compound':
        return this.evaluateCompound(rules, combinator || 'AND', metrics);

      case 'streak':
        return this.evaluateStreak(conditions, metrics);

      case 'time_bounded':
        return this.evaluateTimeBounded(conditions, metrics);

      default:
        // Fallback to simple for unknown types
        return rules.length > 0 ? this.evaluateSimple(rules[0], metrics) : { progress: 0, unlocked: false };
    }
  }

  private evaluateSimple(
    rule: IConditionRule,
    metrics: Record<string, number>
  ): { progress: number; unlocked: boolean } {
    const value = metrics[rule.metric] || 0;
    const met = this.compareValue(value, rule.operator, rule.target);
    const progress = rule.target > 0
      ? Math.min(100, Math.round((value / rule.target) * 100))
      : (met ? 100 : 0);
    return { progress, unlocked: met };
  }

  private evaluateCompound(
    rules: IConditionRule[],
    combinator: string,
    metrics: Record<string, number>
  ): { progress: number; unlocked: boolean } {
    const ruleResults = rules.map(rule => {
      const value = metrics[rule.metric] || 0;
      const met = this.compareValue(value, rule.operator, rule.target);
      const ruleProgress = rule.target > 0
        ? Math.min(100, (value / rule.target) * 100)
        : (met ? 100 : 0);
      return { met, progress: ruleProgress, weight: rule.weight || 1 };
    });

    if (combinator === 'AND') {
      const totalWeight = ruleResults.reduce((s, r) => s + r.weight, 0);
      const progress = totalWeight > 0
        ? ruleResults.reduce((s, r) => s + (r.progress * r.weight / totalWeight), 0)
        : 0;
      const unlocked = ruleResults.every(r => r.met);
      return { progress: Math.round(progress), unlocked };
    } else {
      // OR: best rule determines progress, any rule met means unlocked
      const bestRule = ruleResults.reduce((best, r) => r.progress > best.progress ? r : best, ruleResults[0]);
      return { progress: Math.round(bestRule?.progress || 0), unlocked: ruleResults.some(r => r.met) };
    }
  }

  private evaluateStreak(
    conditions: IAchievementConditions,
    metrics: Record<string, number>
  ): { progress: number; unlocked: boolean } {
    const streakMetric = conditions.streakMetric || conditions.rules?.[0]?.metric;
    const streakTarget = conditions.streakTarget || conditions.rules?.[0]?.target || 0;

    if (!streakMetric || streakTarget <= 0) return { progress: 0, unlocked: false };

    const currentStreak = metrics[streakMetric] || 0;
    const progress = Math.min(100, Math.round((currentStreak / streakTarget) * 100));
    return { progress, unlocked: currentStreak >= streakTarget };
  }

  private evaluateTimeBounded(
    conditions: IAchievementConditions,
    metrics: Record<string, number>
  ): { progress: number; unlocked: boolean } {
    // Check if we're within the time window
    const now = new Date();
    if (conditions.startsAt && now < conditions.startsAt) return { progress: 0, unlocked: false };
    if (conditions.endsAt && now > conditions.endsAt) return { progress: 0, unlocked: false };

    // Evaluate the rules normally (time filter applied in metric computation)
    if (conditions.rules.length === 1) {
      return this.evaluateSimple(conditions.rules[0], metrics);
    }
    return this.evaluateCompound(conditions.rules, conditions.combinator || 'AND', metrics);
  }

  private compareValue(value: number, operator: string, target: number): boolean {
    switch (operator) {
      case 'gte': return value >= target;
      case 'gt':  return value > target;
      case 'lte': return value <= target;
      case 'lt':  return value < target;
      case 'eq':  return value === target;
      default:    return value >= target;
    }
  }

  /**
   * Award reward idempotently using CoinTransaction unique index.
   */
  private async awardReward(
    userId: string,
    achievementDef: Lean<IAchievementDoc>,
    periodKey: string | null
  ): Promise<void> {
    const coins = achievementDef.reward?.coins || achievementDef.coinReward || 0;
    if (coins <= 0) return;

    try {
      await coinService.awardCoins(
        userId,
        coins,
        'achievement',
        `Achievement unlocked: ${achievementDef.title}`,
        {
          achievementId: achievementDef._id,
          achievementType: achievementDef.type,
          periodKey // null for one_time, date-string for repeating
        }
      );
      logger.info(`[ACHIEVEMENT ENGINE] Awarded ${coins} coins for "${achievementDef.title}" to user ${userId}`);

      // Send achievement unlocked SMS notification (fire-and-forget)
      try {
        const user = await User.findById(userId).select('phoneNumber').lean();
        if (user?.phoneNumber) {
          await pushNotificationService.sendAchievementUnlocked(
            user.phoneNumber,
            achievementDef.title,
            coins
          );
        }
      } catch (notifErr) {
        if (process.env.NODE_ENV === 'development') {
          logger.info(`[ACHIEVEMENT ENGINE] Failed to send achievement notification:`, notifErr);
        }
      }
    } catch (err: any) {
      if (err.code === 11000) {
        // Duplicate key — reward already granted (idempotent success)
        logger.info(`[ACHIEVEMENT ENGINE] Reward already granted for "${achievementDef.title}" to user ${userId}`);
      } else {
        logger.error(`[ACHIEVEMENT ENGINE] Failed to award coins for "${achievementDef.title}":`, err);
      }
    }
  }

  /**
   * Check prerequisite achievements are unlocked.
   */
  private async checkPrerequisites(
    userId: string,
    achievementDef: Lean<IAchievementDoc>
  ): Promise<boolean> {
    if (!achievementDef.prerequisites || achievementDef.prerequisites.length === 0) {
      return true;
    }

    // Find prerequisite Achievement types
    const prereqAchievements = await Achievement.find({
      _id: { $in: achievementDef.prerequisites }
    }).select('type').lean();

    const prereqTypes = prereqAchievements.map(a => a.type);

    // Check all prerequisites are unlocked
    const unlockedCount = await UserAchievement.countDocuments({
      user: new Types.ObjectId(userId),
      type: { $in: prereqTypes },
      unlocked: true
    });

    return unlockedCount === prereqTypes.length;
  }

  /**
   * Ensure user has UserAchievement records for given achievement definitions.
   * Lazy initialization — creates records on first encounter.
   */
  private async ensureUserAchievements(
    userId: string,
    achievements: Lean<IAchievementDoc>[]
  ): Promise<void> {
    const userObjId = new Types.ObjectId(userId);
    const types = achievements.map(a => a.type);

    const existing = await UserAchievement.find({
      user: userObjId,
      type: { $in: types }
    }).select('type').lean();

    const existingTypes = new Set(existing.map(e => e.type));
    const missing = achievements.filter(a => !existingTypes.has(a.type));

    if (missing.length > 0) {
      const docs = missing.map(def => ({
        user: userObjId,
        achievement: def._id,
        type: def.type,
        title: def.title,
        description: def.description,
        icon: def.icon,
        color: def.color,
        unlocked: false,
        progress: 0,
        currentValue: 0,
        targetValue: def.conditions?.rules?.[0]?.target || def.target || 1,
        ruleProgress: (def.conditions?.rules || []).map(r => ({
          metric: r.metric,
          currentValue: 0,
          targetValue: r.target,
          met: false
        })),
        timesCompleted: 0
      }));

      try {
        await UserAchievement.insertMany(docs, { ordered: false });
      } catch (err: any) {
        // Ignore duplicate key errors (concurrent initialization)
        if (err.code !== 11000) throw err;
      }
    }
  }

  /**
   * Initialize all achievements for a new user.
   */
  async initializeUser(userId: string): Promise<void> {
    const allActive = await Achievement.find({ isActive: true }).lean();
    await this.ensureUserAchievements(userId, allActive);
  }

  /**
   * Full recalculation of all achievements for a user.
   * Used for migration, admin tools, and periodic reconciliation.
   * NOT user-callable — only via cron or admin.
   */
  async fullRecalculate(userId: string): Promise<void> {
    try {
      const allMetrics = await this.computeAllMetrics(userId);
      const allActive = await Achievement.find({ isActive: true }).lean();

      await this.ensureUserAchievements(userId, allActive);

      for (const achievementDef of allActive) {
        await this.evaluateAndUpdate(userId, achievementDef, allMetrics);
      }
    } catch (error) {
      logger.error(`[ACHIEVEMENT ENGINE] Full recalculate failed for user ${userId}:`, error);
    }
  }

  /**
   * Compute all metric values for a user.
   * Used by fullRecalculate() and the /recalculate endpoint.
   */
  async computeAllMetrics(userId: string): Promise<Record<string, number>> {
    const metrics: Record<string, number> = {};
    const userObjId = new Types.ObjectId(userId);

    try {
      // Dynamic imports to avoid circular deps
      const { Order } = await import('../models/Order');
      const { Video } = await import('../models/Video');
      const { Project } = await import('../models/Project');
      const { Review } = await import('../models/Review');
      const OfferRedemption = (await import('../models/OfferRedemption')).default;
      const { User } = await import('../models/User');

      const [orderStats, videoStats, projectStats, reviewCount, offerCount, user] = await Promise.all([
        Order.aggregate([
          { $match: { user: userObjId, status: 'delivered' } },
          { $group: { _id: null, totalOrders: { $sum: 1 }, totalSpent: { $sum: '$totalPrice' } } }
        ]),
        Video.aggregate([
          { $match: { creator: userObjId } },
          { $group: { _id: null, totalVideos: { $sum: 1 }, totalViews: { $sum: '$engagement.views' } } }
        ]),
        Project.aggregate([
          { $match: { 'submissions.user': userObjId } },
          { $unwind: '$submissions' },
          { $match: { 'submissions.user': userObjId } },
          { $group: { _id: null, totalProjects: { $sum: 1 }, totalEarned: { $sum: { $ifNull: ['$submissions.paidAmount', 0] } } } }
        ]),
        Review.countDocuments({ user: userObjId }),
        OfferRedemption.countDocuments({ user: userObjId }),
        User.findById(userId).select('referral createdAt').lean()
      ]);

      metrics.totalOrders = orderStats[0]?.totalOrders || 0;
      metrics.totalSpent = orderStats[0]?.totalSpent || 0;
      metrics.totalVideos = videoStats[0]?.totalVideos || 0;
      metrics.totalVideoViews = videoStats[0]?.totalViews || 0;
      metrics.totalProjects = projectStats[0]?.totalProjects || 0;
      metrics.projectEarnings = projectStats[0]?.totalEarned || 0;
      metrics.totalReviews = reviewCount || 0;
      metrics.totalReferrals = (user as any)?.referral?.totalReferrals || 0;
      metrics.offersRedeemed = offerCount || 0;
      metrics.totalActivity = metrics.totalOrders + metrics.totalVideos + metrics.totalProjects + metrics.totalReviews + metrics.offersRedeemed;

      // Days active
      if (user?.createdAt) {
        metrics.daysActive = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      }

      // Streak metrics (optional — only fetch if needed)
      try {
        const UserStreak = (await import('../models/UserStreak')).default;
        const loginStreak = await UserStreak.findOne({ user: userObjId, type: 'login' }).select('currentStreak longestStreak').lean();
        metrics.loginStreak = (loginStreak as any)?.currentStreak || 0;
        metrics.longestLoginStreak = (loginStreak as any)?.longestStreak || 0;
      } catch {
        metrics.loginStreak = 0;
        metrics.longestLoginStreak = 0;
      }
    } catch (error) {
      logger.error(`[ACHIEVEMENT ENGINE] Error computing metrics for user ${userId}:`, error);
    }

    return metrics;
  }

  /**
   * Get the period key for repeating achievements.
   */
  private getPeriodKey(repeatability: RepeatabilityType | undefined): string | null {
    if (!repeatability || repeatability === 'one_time') return null;

    const now = new Date();
    switch (repeatability) {
      case 'daily':
        return now.toISOString().slice(0, 10); // '2026-02-19'
      case 'weekly': {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return `W${weekStart.toISOString().slice(0, 10)}`;
      }
      case 'monthly':
        return now.toISOString().slice(0, 7); // '2026-02'
      default:
        return null;
    }
  }

  /**
   * Compute specific metrics for a user based on event type.
   * More efficient than computeAllMetrics — only fetches what's needed.
   */
  async computeMetricsForEvent(
    userId: string,
    eventType: string
  ): Promise<Record<string, number>> {
    const affectedMetrics = EVENT_TO_METRICS[eventType];
    if (!affectedMetrics || affectedMetrics.length === 0) return {};

    // For now, compute all metrics (can be optimized later to only compute affected ones)
    // This is still called only once per event, not per achievement
    return this.computeAllMetrics(userId);
  }
}

// Singleton
const achievementEngine = new AchievementEngine();
export default achievementEngine;
