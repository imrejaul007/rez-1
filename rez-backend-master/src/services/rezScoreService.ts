/**
 * RezScoreService
 *
 * Calculates and manages the REZ Score — a composite savings score (0-999)
 * derived from five pillars with the following weights:
 *
 *   savingsRate          30%  (max 300 pts)
 *   visitFrequency       25%  (max 250 pts)
 *   streakConsistency    20%  (max 200 pts)
 *   merchantDiversity    15%  (max 150 pts)
 *   communityContribution 10% (max 100 pts)
 *
 * Total = 1000 → capped at 999 for display.
 *
 * Score is recalculated nightly via rezScoreCalculationJob.
 * The percentile is updated relative to all active users.
 */

import mongoose from 'mongoose';
import { createServiceLogger } from '../config/logger';
import RezScore, { IRezScore, RezScoreTier, getTierFromScore } from '../models/RezScore';
import redisService from './redisService';

const logger = createServiceLogger('rez-score-service');

// ─── Pillar Weight Caps ───────────────────────────────────────────────────────

const PILLAR_CAPS = {
  savingsRate: 300,
  visitFrequency: 250,
  streakConsistency: 200,
  merchantDiversity: 150,
  communityContribution: 100,
} as const;

// Scaling references (inputs that yield maximum pillar score)
const MAX_SAVINGS_RATE_PCT = 20; // 20% savings rate = max savingsRate pillar
const MAX_VISITS_30D = 30; // 30 visits in 30 days = max visitFrequency pillar
const MAX_STREAK_DAYS = 60; // 60-day streak = max streakConsistency pillar
const MAX_UNIQUE_MERCHANTS = 15; // 15 unique merchants = max merchantDiversity pillar
const MAX_COMMUNITY_ACTIONS = 20; // 20 reviews+referrals+shares = max community pillar

// ─── Booster Interface ────────────────────────────────────────────────────────

export interface ScoreBooster {
  action: string;
  description: string;
  estimatedPointBoost: number;
  currentValue: number;
  targetValue: number;
  pillar: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

class RezScoreService {
  /**
   * Calculate (or recalculate) the REZ Score for a user.
   * Persists the result in the RezScore collection.
   * Returns the updated IRezScore document.
   */
  async calculateScore(userId: string): Promise<IRezScore> {
    logger.info('[RezScoreService] Calculating score', { userId });

    const pillars = await this.computePillars(userId);

    const totalScore = Math.min(
      999,
      pillars.savingsRate +
        pillars.visitFrequency +
        pillars.streakConsistency +
        pillars.merchantDiversity +
        pillars.communityContribution,
    );

    const tier: RezScoreTier = getTierFromScore(totalScore);

    // Upsert the score document
    const existing = await RezScore.findOne({ userId }).lean();
    const previousScore = (existing as any)?.totalScore ?? 0;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (totalScore > previousScore + 5) trend = 'up';
    else if (totalScore < previousScore - 5) trend = 'down';

    const snapshot = { score: previousScore, tier: getTierFromScore(previousScore), date: new Date() };

    const updated = await RezScore.findOneAndUpdate(
      { userId },
      {
        $set: {
          totalScore,
          tier,
          pillars,
          previousScore,
          trend,
          lastCalculated: new Date(),
        },
        // Keep last 30 nightly snapshots (push new, trim oldest)
        $push: {
          scoreHistory: {
            $each: [snapshot],
            $slice: -30,
          },
        } as any,
      },
      { upsert: true, new: true },
    );

    if (!updated) {
      throw new Error(`Failed to upsert RezScore for user ${userId}`);
    }

    // Invalidate boosters cache — pillars changed after recalculation
    redisService.del(`score:boosters:${userId}`).catch(() => {});

    logger.info('[RezScoreService] Score calculated', {
      userId,
      totalScore,
      tier,
      trend,
    });

    return updated;
  }

  /**
   * Get score boosters — actionable suggestions to improve the score.
   * Returns up to 3 boosters, ordered by highest estimated point gain.
   * Cached for 1 hour — pillars change only after nightly recalculation.
   */
  async getScoreBoosters(userId: string): Promise<ScoreBooster[]> {
    const cacheKey = `score:boosters:${userId}`;
    try {
      const cached = await redisService.get<ScoreBooster[]>(cacheKey);
      if (cached) return cached;
    } catch {
      /* cache miss */
    }

    const pillars = await this.computePillars(userId);
    const boosters: ScoreBooster[] = [];

    // ── Savings rate booster ────────────────────────────────────────────────
    const savingsGap = PILLAR_CAPS.savingsRate - pillars.savingsRate;
    if (savingsGap > 10) {
      const targetRatePct = Math.min(
        MAX_SAVINGS_RATE_PCT,
        (pillars.savingsRate / PILLAR_CAPS.savingsRate) * MAX_SAVINGS_RATE_PCT + 2,
      );
      boosters.push({
        action: 'increase_savings_rate',
        description: `Earn more coins per rupee spent. Aim for a ${Math.round(targetRatePct)}% savings rate.`,
        estimatedPointBoost: Math.min(savingsGap, 30),
        currentValue: (pillars.savingsRate / PILLAR_CAPS.savingsRate) * MAX_SAVINGS_RATE_PCT,
        targetValue: targetRatePct,
        pillar: 'savingsRate',
      });
    }

    // ── Visit frequency booster ─────────────────────────────────────────────
    const visitGap = PILLAR_CAPS.visitFrequency - pillars.visitFrequency;
    if (visitGap > 10) {
      const currentVisits = Math.round((pillars.visitFrequency / PILLAR_CAPS.visitFrequency) * MAX_VISITS_30D);
      const targetVisits = Math.min(MAX_VISITS_30D, currentVisits + 2);
      boosters.push({
        action: 'increase_visits',
        description: `Visit ${targetVisits - currentVisits} more REZ merchant(s) this month to boost +${Math.min(visitGap, 25)} points.`,
        estimatedPointBoost: Math.min(visitGap, 25),
        currentValue: currentVisits,
        targetValue: targetVisits,
        pillar: 'visitFrequency',
      });
    }

    // ── Streak consistency booster ──────────────────────────────────────────
    const streakGap = PILLAR_CAPS.streakConsistency - pillars.streakConsistency;
    if (streakGap > 10) {
      const currentDays = Math.round((pillars.streakConsistency / PILLAR_CAPS.streakConsistency) * MAX_STREAK_DAYS);
      boosters.push({
        action: 'maintain_streak',
        description: `Keep your savings streak going for ${currentDays + 1} more days to boost +${Math.min(streakGap, 20)} points.`,
        estimatedPointBoost: Math.min(streakGap, 20),
        currentValue: currentDays,
        targetValue: currentDays + 1,
        pillar: 'streakConsistency',
      });
    }

    // ── Merchant diversity booster ──────────────────────────────────────────
    const diversityGap = PILLAR_CAPS.merchantDiversity - pillars.merchantDiversity;
    if (diversityGap > 10) {
      const currentMerchants = Math.round(
        (pillars.merchantDiversity / PILLAR_CAPS.merchantDiversity) * MAX_UNIQUE_MERCHANTS,
      );
      const targetMerchants = Math.min(MAX_UNIQUE_MERCHANTS, currentMerchants + 2);
      boosters.push({
        action: 'visit_new_merchants',
        description: `Visit ${targetMerchants - currentMerchants} new store(s) to boost +${Math.min(diversityGap, 15)} points.`,
        estimatedPointBoost: Math.min(diversityGap, 15),
        currentValue: currentMerchants,
        targetValue: targetMerchants,
        pillar: 'merchantDiversity',
      });
    }

    // ── Community contribution booster ──────────────────────────────────────
    const communityGap = PILLAR_CAPS.communityContribution - pillars.communityContribution;
    if (communityGap > 10) {
      const currentActions = Math.round(
        (pillars.communityContribution / PILLAR_CAPS.communityContribution) * MAX_COMMUNITY_ACTIONS,
      );
      boosters.push({
        action: 'write_review',
        description: `Write a review or refer a friend to boost +${Math.min(communityGap, 10)} points.`,
        estimatedPointBoost: Math.min(communityGap, 10),
        currentValue: currentActions,
        targetValue: currentActions + 1,
        pillar: 'communityContribution',
      });
    }

    // Sort by highest estimated point gain, return top 3
    boosters.sort((a, b) => b.estimatedPointBoost - a.estimatedPointBoost);
    const result = boosters.slice(0, 3);

    redisService.set(`score:boosters:${userId}`, result, 3600).catch(() => {});
    return result;
  }

  /**
   * Get a user's percentile rank among all active users.
   * Relies on the `percentile` field which is updated by rezScoreCalculationJob.
   * Falls back to a live aggregation if not yet calculated.
   */
  async getPercentile(userId: string): Promise<{ percentile: number; totalUsers: number; rank: number }> {
    const scoreDoc = await RezScore.findOne({ userId }).lean();

    if (scoreDoc && (scoreDoc as any).percentile > 0) {
      const totalUsers = await RezScore.countDocuments({});
      const rank = Math.round(((100 - (scoreDoc as any).percentile) / 100) * totalUsers);
      return {
        percentile: (scoreDoc as any).percentile,
        totalUsers,
        rank: Math.max(1, rank),
      };
    }

    // Live calculation fallback
    const userScore = (scoreDoc as any)?.totalScore ?? 0;
    const [belowCount, totalCount] = await Promise.all([
      RezScore.countDocuments({ totalScore: { $lt: userScore } }),
      RezScore.countDocuments({}),
    ]);

    const percentile = totalCount > 0 ? Math.round((belowCount / totalCount) * 100) : 0;
    const rank = totalCount - belowCount;

    return { percentile, totalUsers: totalCount, rank };
  }

  /**
   * Batch update percentile ranks for all users.
   * Called by rezScoreCalculationJob after recalculating all scores.
   */
  async updateAllPercentiles(): Promise<void> {
    logger.info('[RezScoreService] Updating percentile rankings');

    const totalUsers = await RezScore.countDocuments({});
    if (totalUsers === 0) return;

    // Process in batches of 500 ordered by totalScore ascending
    const batchSize = 500;
    let skip = 0;

    while (true) {
      const batch = await RezScore.find({})
        .sort({ totalScore: 1 })
        .skip(skip)
        .limit(batchSize)
        .select('_id totalScore')
        .lean();

      if (batch.length === 0) break;

      const bulkOps = batch.map((doc, idx) => {
        const rank = skip + idx + 1; // 1 = lowest scorer
        const percentile = Math.round((rank / totalUsers) * 100);
        return {
          updateOne: {
            filter: { _id: (doc as any)._id },
            update: { $set: { percentile } },
          },
        };
      });

      await RezScore.bulkWrite(bulkOps);
      skip += batch.length;

      if (batch.length < batchSize) break;
    }

    logger.info('[RezScoreService] Percentile rankings updated', { totalUsers });
  }

  // ─── Private Pillar Computation ────────────────────────────────────────────

  private async computePillars(userId: string): Promise<IRezScore['pillars']> {
    const [savingsRate, visitFrequency, streakConsistency, merchantDiversity, communityContribution] =
      await Promise.all([
        this.computeSavingsRatePillar(userId),
        this.computeVisitFrequencyPillar(userId),
        this.computeStreakConsistencyPillar(userId),
        this.computeMerchantDiversityPillar(userId),
        this.computeCommunityContributionPillar(userId),
      ]);

    return {
      savingsRate,
      visitFrequency,
      streakConsistency,
      merchantDiversity,
      communityContribution,
    };
  }

  /**
   * savingsRate pillar: coins earned / total spend in last 30 days.
   * 0% savings rate = 0 pts, MAX_SAVINGS_RATE_PCT% = 300 pts.
   */
  private async computeSavingsRatePillar(userId: string): Promise<number> {
    try {
      const CoinTransaction = mongoose.model('CoinTransaction');
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const userObjectId = new mongoose.Types.ObjectId(userId);

      const results = await CoinTransaction.aggregate([
        {
          $match: {
            user: userObjectId,
            type: { $in: ['earned', 'spent'] },
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: '$type', total: { $sum: '$amount' } } },
      ]);

      const earned = (results as any[]).find((r) => r._id === 'earned')?.total || 0;
      const spent = (results as any[]).find((r) => r._id === 'spent')?.total || 0;

      if (spent === 0) return earned > 0 ? Math.round(PILLAR_CAPS.savingsRate * 0.3) : 0;

      const savingsRatePct = (earned / spent) * 100;
      const normalised = Math.min(1, savingsRatePct / MAX_SAVINGS_RATE_PCT);
      return Math.round(normalised * PILLAR_CAPS.savingsRate);
    } catch (err) {
      logger.warn('[RezScoreService] savingsRate pillar failed', { userId, error: (err as Error).message });
      return 0;
    }
  }

  /**
   * visitFrequency pillar: StoreVisit count in last 30 days.
   * MAX_VISITS_30D visits = 250 pts.
   */
  private async computeVisitFrequencyPillar(userId: string): Promise<number> {
    try {
      const StoreVisit = mongoose.model('StoreVisit');
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const visitCount = await StoreVisit.countDocuments({
        user: new mongoose.Types.ObjectId(userId),
        status: { $in: ['completed', 'checked_in'] },
        createdAt: { $gte: thirtyDaysAgo },
      });

      const normalised = Math.min(1, visitCount / MAX_VISITS_30D);
      return Math.round(normalised * PILLAR_CAPS.visitFrequency);
    } catch (err) {
      logger.warn('[RezScoreService] visitFrequency pillar failed', { userId, error: (err as Error).message });
      return 0;
    }
  }

  /**
   * streakConsistency pillar: weighted blend of current streak and longest streak.
   * Current streak weight: 70%, longest streak weight: 30%.
   */
  private async computeStreakConsistencyPillar(userId: string): Promise<number> {
    try {
      const UserStreak = mongoose.model('UserStreak');

      const streak = await UserStreak.findOne({ user: new mongoose.Types.ObjectId(userId), type: 'savings' })
        .select('currentStreak longestStreak')
        .lean();

      const current = (streak as any)?.currentStreak ?? 0;
      const longest = (streak as any)?.longestStreak ?? 0;

      const currentNorm = Math.min(1, current / MAX_STREAK_DAYS);
      const longestNorm = Math.min(1, longest / MAX_STREAK_DAYS);
      const blended = currentNorm * 0.7 + longestNorm * 0.3;

      return Math.round(blended * PILLAR_CAPS.streakConsistency);
    } catch (err) {
      logger.warn('[RezScoreService] streakConsistency pillar failed', { userId, error: (err as Error).message });
      return 0;
    }
  }

  /**
   * merchantDiversity pillar: unique merchants visited in last 30 days.
   * MAX_UNIQUE_MERCHANTS = 150 pts.
   */
  private async computeMerchantDiversityPillar(userId: string): Promise<number> {
    try {
      const StoreVisit = mongoose.model('StoreVisit');
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const uniqueMerchantsResult = await StoreVisit.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        { $group: { _id: '$store' } },
        { $count: 'uniqueCount' },
      ]);

      const uniqueMerchants = (uniqueMerchantsResult as any[])[0]?.uniqueCount ?? 0;
      const normalised = Math.min(1, uniqueMerchants / MAX_UNIQUE_MERCHANTS);
      return Math.round(normalised * PILLAR_CAPS.merchantDiversity);
    } catch (err) {
      logger.warn('[RezScoreService] merchantDiversity pillar failed', { userId, error: (err as Error).message });
      return 0;
    }
  }

  /**
   * communityContribution pillar: reviews written + referrals + shares.
   * MAX_COMMUNITY_ACTIONS = 100 pts.
   */
  private async computeCommunityContributionPillar(userId: string): Promise<number> {
    try {
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Count reviews
      let reviewCount = 0;
      try {
        const Review = mongoose.model('Review');
        reviewCount = await Review.countDocuments({ user: userObjectId });
      } catch {
        /* Review model may not be registered */
      }

      // Count referrals
      let referralCount = 0;
      try {
        const Referral = mongoose.model('Referral');
        referralCount = await Referral.countDocuments({ referrer: userObjectId });
      } catch {
        /* Referral model may not be registered */
      }

      const totalActions = reviewCount + referralCount;
      const normalised = Math.min(1, totalActions / MAX_COMMUNITY_ACTIONS);
      return Math.round(normalised * PILLAR_CAPS.communityContribution);
    } catch (err) {
      logger.warn('[RezScoreService] communityContribution pillar failed', { userId, error: (err as Error).message });
      return 0;
    }
  }
}

export default new RezScoreService();
