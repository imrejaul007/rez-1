/**
 * UserScoreService — REZ Score (0-1000) for a user.
 *
 * Formula:
 *   score = min(1000,
 *     (totalNuqtaEarned  * 0.1) +
 *     (visitStreak       * 10)  +
 *     (totalOrders       * 5)   +
 *     (uniqueMerchantsVisited * 3) +
 *     (referrals         * 20)  +
 *     (accountAgeWeeks   * 2)
 *   )
 *
 * Tiers:
 *   Bronze   0-200
 *   Silver   201-400
 *   Gold     401-600
 *   Platinum 601-800
 *   Elite    801-1000
 */

import mongoose from 'mongoose';
import { createServiceLogger } from '../config/logger';
import redisService from './redisService';

const logger = createServiceLogger('user-score-service');

const CACHE_TTL_SECONDS = 3600; // 1 hour

export interface RezScoreBreakdown {
  rezEarned: number;
  visitStreak: number;
  orders: number;
  merchants: number;
  referrals: number;
  accountAge: number;
}

export interface NextMilestone {
  score: number;
  reward: string;
}

export interface RezScoreResult {
  score: number;
  tier: string;
  breakdown: RezScoreBreakdown;
  nextMilestone: NextMilestone | null;
}

// ─── Tier helpers ─────────────────────────────────────────────────────────────

const TIERS = [
  { name: 'Bronze', min: 0, max: 200 },
  { name: 'Silver', min: 201, max: 400 },
  { name: 'Gold', min: 401, max: 600 },
  { name: 'Platinum', min: 601, max: 800 },
  { name: 'Elite', min: 801, max: 1000 },
];

function getTier(score: number): string {
  for (const tier of TIERS) {
    if (score <= tier.max) return tier.name;
  }
  return 'Elite';
}

const TIER_MILESTONES: Array<{ score: number; reward: string }> = [
  { score: 200, reward: 'Silver tier unlock' },
  { score: 400, reward: 'Gold tier unlock' },
  { score: 600, reward: 'Platinum tier unlock' },
  { score: 800, reward: 'Elite tier + Prive access' },
  { score: 1000, reward: 'Max REZ Score' },
];

function getNextMilestone(score: number): NextMilestone | null {
  const next = TIER_MILESTONES.find((m) => m.score > score);
  return next ?? null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

class UserScoreService {
  /**
   * Compute and return the REZ Score for a user.
   * Result is cached in Redis for 1 hour (key: rezScore:{userId}).
   */
  async getScore(userId: string): Promise<RezScoreResult> {
    const cacheKey = `rezScore:${userId}`;

    // Cache read
    try {
      const cached = await redisService.get<RezScoreResult>(cacheKey);
      if (cached) return cached;
    } catch {
      // Cache miss — continue to compute
    }

    const result = await this.computeScore(userId);

    // Cache write (non-blocking)
    redisService.set(cacheKey, result, CACHE_TTL_SECONDS).catch(() => {});

    return result;
  }

  /**
   * Invalidate the cached score for a user.
   * Call this when a user's data changes (e.g., after a QR checkin).
   */
  async invalidateCache(userId: string): Promise<void> {
    await redisService.del(`rezScore:${userId}`).catch(() => {});
  }

  // ─── Private computation ───────────────────────────────────────────────────

  private async computeScore(userId: string): Promise<RezScoreResult> {
    const userOid = (() => {
      try {
        return new mongoose.Types.ObjectId(userId);
      } catch {
        return null;
      }
    })();

    const [totalRezEarned, visitStreak, totalOrders, uniqueMerchantsVisited, referrals, accountAgeWeeks] =
      await Promise.all([
        this.fetchTotalRezEarned(userOid, userId),
        this.fetchVisitStreak(userId),
        this.fetchTotalOrders(userOid, userId),
        this.fetchUniqueMerchantsVisited(userOid, userId),
        this.fetchReferrals(userOid, userId),
        this.fetchAccountAgeWeeks(userOid, userId),
      ]);

    const rezPts = totalRezEarned * 0.1;
    const streakPts = visitStreak * 10;
    const orderPts = totalOrders * 5;
    const merchantPts = uniqueMerchantsVisited * 3;
    const referralPts = referrals * 20;
    const agePts = accountAgeWeeks * 2;

    const score = Math.min(1000, Math.round(rezPts + streakPts + orderPts + merchantPts + referralPts + agePts));

    const tier = getTier(score);
    const nextMilestone = getNextMilestone(score);

    const breakdown: RezScoreBreakdown = {
      rezEarned: Math.round(rezPts),
      visitStreak: Math.round(streakPts),
      orders: Math.round(orderPts),
      merchants: Math.round(merchantPts),
      referrals: Math.round(referralPts),
      accountAge: Math.round(agePts),
    };

    logger.info('[UserScoreService] Score computed', { userId, score, tier });

    return { score, tier, breakdown, nextMilestone };
  }

  // ─── Data fetchers ─────────────────────────────────────────────────────────

  private async fetchTotalRezEarned(userOid: mongoose.Types.ObjectId | null, userId: string): Promise<number> {
    try {
      if (!userOid) return 0;
      const wallet = await mongoose.connection.db
        ?.collection('wallets')
        .findOne({ user: userOid }, { projection: { 'statistics.totalEarned': 1 } });
      return (wallet as any)?.statistics?.totalEarned ?? 0;
    } catch (err) {
      logger.warn('[UserScoreService] fetchTotalRezEarned failed', { userId, error: (err as Error).message });
      return 0;
    }
  }

  private async fetchVisitStreak(userId: string): Promise<number> {
    try {
      const UserStreaks = mongoose.connection.collection('userstreaks');
      const doc = await UserStreaks.findOne({ userId, type: 'store_visit' });
      return (doc?.currentStreak as number) ?? 0;
    } catch (err) {
      logger.warn('[UserScoreService] fetchVisitStreak failed', { userId, error: (err as Error).message });
      return 0;
    }
  }

  private async fetchTotalOrders(userOid: mongoose.Types.ObjectId | null, userId: string): Promise<number> {
    try {
      if (!userOid) return 0;
      let OrderModel: mongoose.Model<any>;
      try {
        OrderModel = mongoose.model('Order');
      } catch {
        return 0;
      }
      return await OrderModel.countDocuments({ user: userOid });
    } catch (err) {
      logger.warn('[UserScoreService] fetchTotalOrders failed', { userId, error: (err as Error).message });
      return 0;
    }
  }

  private async fetchUniqueMerchantsVisited(userOid: mongoose.Types.ObjectId | null, userId: string): Promise<number> {
    try {
      if (!userOid) return 0;
      let StoreVisit: mongoose.Model<any>;
      try {
        StoreVisit = mongoose.model('StoreVisit');
      } catch {
        return 0;
      }
      const result = await StoreVisit.aggregate([
        { $match: { user: userOid } },
        { $group: { _id: '$store' } },
        { $count: 'uniqueCount' },
      ]);
      return (result as any[])[0]?.uniqueCount ?? 0;
    } catch (err) {
      logger.warn('[UserScoreService] fetchUniqueMerchantsVisited failed', { userId, error: (err as Error).message });
      return 0;
    }
  }

  private async fetchReferrals(userOid: mongoose.Types.ObjectId | null, userId: string): Promise<number> {
    try {
      if (!userOid) return 0;
      let Referral: mongoose.Model<any>;
      try {
        Referral = mongoose.model('Referral');
      } catch {
        return 0;
      }
      return await Referral.countDocuments({ referrer: userOid });
    } catch (err) {
      logger.warn('[UserScoreService] fetchReferrals failed', { userId, error: (err as Error).message });
      return 0;
    }
  }

  private async fetchAccountAgeWeeks(userOid: mongoose.Types.ObjectId | null, userId: string): Promise<number> {
    try {
      if (!userOid) return 0;
      let User: mongoose.Model<any>;
      try {
        User = mongoose.model('User');
      } catch {
        return 0;
      }
      const user = await User.findById(userOid).select('createdAt').lean();
      if (!user || !(user as any).createdAt) return 0;
      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      return Math.floor((Date.now() - new Date((user as any).createdAt).getTime()) / msPerWeek);
    } catch (err) {
      logger.warn('[UserScoreService] fetchAccountAgeWeeks failed', { userId, error: (err as Error).message });
      return 0;
    }
  }
}

export default new UserScoreService();
