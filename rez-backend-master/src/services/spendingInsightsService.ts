/**
 * SpendingInsightsService
 *
 * Aggregates CoinTransaction and Order data to produce rich spending intelligence
 * for the Smart Spending Dashboard (Phase 2.1).
 *
 * All results are cached in Redis with a 1-hour TTL.
 * Cache is invalidated on new transactions via invalidateCache().
 */

import mongoose from 'mongoose';
import { createServiceLogger } from '../config/logger';
import redisService from './redisService';

const logger = createServiceLogger('spending-insights-service');

const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface CategoryBreakdown {
  category: string;
  totalSpend: number;
  totalSaved: number;
  transactionCount: number;
  savingsRate: number; // percentage
}

export interface MerchantFrequency {
  storeId: string;
  storeName: string;
  visits: number;
  totalSpend: number;
  totalSaved: number;
}

export interface TimeOfWeekPattern {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  hour: number; // 0-23
  transactionCount: number;
}

export interface SpendingInsights {
  userId: string;
  generatedAt: Date;
  categoryBreakdown: CategoryBreakdown[];
  merchantFrequency: MerchantFrequency[];
  timeOfWeekPatterns: TimeOfWeekPattern[];
  peerComparison: {
    savingsRatePercentile: number; // 0-100
    userSavingsRate: number;
    avgSavingsRate: number;
  };
  summary: {
    totalSpend30d: number;
    totalSaved30d: number;
    savingsRate30d: number;
    weeklySpend: number;
    topCategory: string;
    topMerchant: { id: string; name: string };
    favoriteStores: Array<{ id: string; name: string; visits: number }>;
  };
}

export interface MonthlyReport {
  userId: string;
  month: string; // YYYY-MM
  totalSpend: number;
  totalSaved: number;
  savingsRate: number;
  categoryBreakdown: CategoryBreakdown[];
  topMerchants: MerchantFrequency[];
  coinTransactions: number;
  vsLastMonth: {
    spendDelta: number; // positive = more spend, negative = less
    savingsDelta: number;
    savingsRateDelta: number;
  };
}

export interface PeerComparison {
  userId: string;
  savingsRate: number;
  percentile: number;
  avgSavingsRateInArea: number;
  betterThanPct: number; // same as percentile but from different angle
  label: string; // e.g., "Top 20% saver in your area"
}

// ─── Service ─────────────────────────────────────────────────────────────────

class SpendingInsightsService {
  /**
   * Get comprehensive spending insights for a user.
   * Returns category breakdown, merchant frequency, time patterns, and peer comparison.
   * Cached for 1 hour per user.
   */
  async getInsights(userId: string): Promise<SpendingInsights> {
    const cacheKey = `insights:${userId}`;

    try {
      const cached = await redisService.get<SpendingInsights>(cacheKey);
      if (cached) {
        logger.info('[SpendingInsightsService] Cache hit', { userId });
        return cached;
      }
    } catch {
      // Cache miss or Redis down — proceed to compute
    }

    const insights = await this.computeInsights(userId);

    // Cache the result
    try {
      await redisService.set(cacheKey, insights, CACHE_TTL_SECONDS);
    } catch (err) {
      logger.warn('[SpendingInsightsService] Cache set failed', { userId, error: (err as Error).message });
    }

    return insights;
  }

  /**
   * Get a detailed monthly spending report for a specific month.
   */
  async getMonthlyReport(userId: string, month: string): Promise<MonthlyReport> {
    const cacheKey = `insights:monthly:${userId}:${month}`;

    try {
      const cached = await redisService.get<MonthlyReport>(cacheKey);
      if (cached) return cached;
    } catch {
      /* pass */
    }

    const report = await this.computeMonthlyReport(userId, month);

    try {
      await redisService.set(cacheKey, report, CACHE_TTL_SECONDS);
    } catch {
      /* non-blocking */
    }

    return report;
  }

  /**
   * Get a user's savings rate compared to peers in their area.
   */
  async getPeerComparison(userId: string): Promise<PeerComparison> {
    const cacheKey = `insights:peer:${userId}`;

    try {
      const cached = await redisService.get<PeerComparison>(cacheKey);
      if (cached) return cached;
    } catch {
      /* pass */
    }

    const comparison = await this.computePeerComparison(userId);

    try {
      await redisService.set(cacheKey, comparison, CACHE_TTL_SECONDS);
    } catch {
      /* non-blocking */
    }

    return comparison;
  }

  /**
   * Invalidate all cached insights for a user.
   * Call this when a new transaction or order is recorded.
   */
  async invalidateCache(userId: string): Promise<void> {
    const keys = [`insights:${userId}`, `insights:peer:${userId}`];

    try {
      await Promise.all(keys.map((key) => redisService.del(key)));
      logger.info('[SpendingInsightsService] Cache invalidated', { userId });
    } catch (err) {
      logger.warn('[SpendingInsightsService] Cache invalidation failed', { userId, error: (err as Error).message });
    }
  }

  // ─── Private Computation Methods ───────────────────────────────────────────

  private async computeInsights(userId: string): Promise<SpendingInsights> {
    const CoinTransaction = mongoose.model('CoinTransaction');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // ── Category breakdown (last 30 days) ─────────────────────────────────
    const categoryPipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          user: userObjectId,
          type: { $in: ['earned', 'spent'] },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.category',
          earned: {
            $sum: { $cond: [{ $eq: ['$_id.type', 'earned'] }, '$totalAmount', 0] },
          },
          spent: {
            $sum: { $cond: [{ $eq: ['$_id.type', 'spent'] }, '$totalAmount', 0] },
          },
          transactionCount: { $sum: '$count' },
        },
      },
      { $sort: { earned: -1 } },
    ];

    // ── Merchant frequency (last 30 days) ─────────────────────────────────
    const merchantPipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          user: userObjectId,
          type: 'earned',
          createdAt: { $gte: thirtyDaysAgo },
          'metadata.storeId': { $exists: true },
        },
      },
      {
        $group: {
          _id: '$metadata.storeId',
          storeName: { $first: '$metadata.storeName' },
          visits: { $sum: 1 },
          totalEarned: { $sum: '$amount' },
          totalSpend: { $sum: { $ifNull: ['$metadata.orderAmount', 0] } },
        },
      },
      { $sort: { visits: -1 } },
      { $limit: 10 },
    ];

    // ── Time of week patterns ──────────────────────────────────────────────
    const timePipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          user: userObjectId,
          type: 'earned',
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$createdAt' }, // 1=Sun, 7=Sat
            hour: { $hour: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
    ];

    // ── Weekly spend (last 7 days) ─────────────────────────────────────────
    const weeklyPipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          user: userObjectId,
          type: 'spent',
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ];

    const [categoryResults, merchantResults, timeResults, weeklyResults] = await Promise.all([
      CoinTransaction.aggregate(categoryPipeline),
      CoinTransaction.aggregate(merchantPipeline),
      CoinTransaction.aggregate(timePipeline),
      CoinTransaction.aggregate(weeklyPipeline),
    ]);

    // Map category results
    const categoryBreakdown: CategoryBreakdown[] = (categoryResults as any[]).map((r) => ({
      category: r._id || 'uncategorized',
      totalSpend: r.spent || 0,
      totalSaved: r.earned || 0,
      transactionCount: r.transactionCount,
      savingsRate: r.spent > 0 ? (r.earned / r.spent) * 100 : 0,
    }));

    // Map merchant results
    const merchantFrequency: MerchantFrequency[] = (merchantResults as any[]).map((r) => ({
      storeId: r._id?.toString() || '',
      storeName: r.storeName || 'Unknown Store',
      visits: r.visits,
      totalSpend: r.totalSpend,
      totalSaved: r.totalEarned,
    }));

    // Map time patterns (convert MongoDB dayOfWeek 1-7 to 0-6)
    const timeOfWeekPatterns: TimeOfWeekPattern[] = (timeResults as any[]).map((r) => ({
      dayOfWeek: (r._id.dayOfWeek - 1) % 7, // Convert 1=Sun to 0=Sun
      hour: r._id.hour,
      transactionCount: r.count,
    }));

    const weeklySpend = (weeklyResults as any[])[0]?.total || 0;
    const totalSaved30d = categoryBreakdown.reduce((s, c) => s + c.totalSaved, 0);
    const totalSpend30d = categoryBreakdown.reduce((s, c) => s + c.totalSpend, 0);
    const savingsRate30d = totalSpend30d > 0 ? (totalSaved30d / totalSpend30d) * 100 : 0;

    const topCategory = categoryBreakdown[0]?.category || '';
    const topMerchant = merchantFrequency[0]
      ? { id: merchantFrequency[0].storeId, name: merchantFrequency[0].storeName }
      : { id: '', name: '' };

    const favoriteStores = merchantFrequency.slice(0, 5).map((m) => ({
      id: m.storeId,
      name: m.storeName,
      visits: m.visits,
    }));

    // Peer comparison (lightweight version inlined here)
    const peerComp = await this.computePeerComparison(userId);

    return {
      userId,
      generatedAt: new Date(),
      categoryBreakdown,
      merchantFrequency,
      timeOfWeekPatterns,
      peerComparison: {
        savingsRatePercentile: peerComp.percentile,
        userSavingsRate: savingsRate30d,
        avgSavingsRate: peerComp.avgSavingsRateInArea,
      },
      summary: {
        totalSpend30d,
        totalSaved30d,
        savingsRate30d,
        weeklySpend,
        topCategory,
        topMerchant,
        favoriteStores,
      },
    };
  }

  private async computeMonthlyReport(userId: string, month: string): Promise<MonthlyReport> {
    const CoinTransaction = mongoose.model('CoinTransaction');
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Parse month string (YYYY-MM)
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    // Previous month bounds for delta comparison
    const prevStartDate = new Date(year, monthNum - 2, 1);
    const prevEndDate = startDate;

    const pipeline = (start: Date, end: Date): mongoose.PipelineStage[] => [
      {
        $match: {
          user: userObjectId,
          type: { $in: ['earned', 'spent'] },
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ];

    const [currentResults, prevResults, topMerchantsResult] = await Promise.all([
      CoinTransaction.aggregate(pipeline(startDate, endDate)),
      CoinTransaction.aggregate(pipeline(prevStartDate, prevEndDate)),
      CoinTransaction.aggregate([
        {
          $match: {
            user: userObjectId,
            type: 'earned',
            createdAt: { $gte: startDate, $lt: endDate },
            'metadata.storeId': { $exists: true },
          },
        },
        {
          $group: {
            _id: '$metadata.storeId',
            storeName: { $first: '$metadata.storeName' },
            visits: { $sum: 1 },
            totalEarned: { $sum: '$amount' },
            totalSpend: { $sum: { $ifNull: ['$metadata.orderAmount', 0] } },
          },
        },
        { $sort: { visits: -1 } },
        { $limit: 5 },
      ]),
    ]);

    const getAmount = (results: any[], type: string) => (results as any[]).find((r) => r._id === type)?.total || 0;
    const getCount = (results: any[], type: string) => (results as any[]).find((r) => r._id === type)?.count || 0;

    const totalSpend = getAmount(currentResults, 'spent');
    const totalSaved = getAmount(currentResults, 'earned');
    const coinTransactions = getCount(currentResults, 'earned') + getCount(currentResults, 'spent');

    const prevSpend = getAmount(prevResults, 'spent');
    const prevSaved = getAmount(prevResults, 'earned');
    const prevRate = prevSpend > 0 ? (prevSaved / prevSpend) * 100 : 0;
    const currRate = totalSpend > 0 ? (totalSaved / totalSpend) * 100 : 0;

    const topMerchants: MerchantFrequency[] = (topMerchantsResult as any[]).map((r) => ({
      storeId: r._id?.toString() || '',
      storeName: r.storeName || 'Unknown Store',
      visits: r.visits,
      totalSpend: r.totalSpend,
      totalSaved: r.totalEarned,
    }));

    return {
      userId,
      month,
      totalSpend,
      totalSaved,
      savingsRate: currRate,
      categoryBreakdown: [], // Simplified — full breakdown can be added later
      topMerchants,
      coinTransactions,
      vsLastMonth: {
        spendDelta: totalSpend - prevSpend,
        savingsDelta: totalSaved - prevSaved,
        savingsRateDelta: currRate - prevRate,
      },
    };
  }

  private async computePeerComparison(userId: string): Promise<PeerComparison> {
    const CoinTransaction = mongoose.model('CoinTransaction');
    const User = mongoose.model('User');

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get user's own savings rate
    const userStats = await CoinTransaction.aggregate([
      {
        $match: {
          user: userObjectId,
          type: { $in: ['earned', 'spent'] },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);

    const userEarned = (userStats as any[]).find((r) => r._id === 'earned')?.total || 0;
    const userSpent = (userStats as any[]).find((r) => r._id === 'spent')?.total || 0;
    const userSavingsRate = userSpent > 0 ? (userEarned / userSpent) * 100 : 0;

    // Get user's area for regional comparison
    const userDoc = await User.findById(userId).select('profile.areaId profile.city').lean();
    const areaId = (userDoc as any)?.profile?.areaId;

    // Get a sample of other users' savings rates for comparison
    // Limit to 1000 users for performance
    const peerPipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          type: { $in: ['earned', 'spent'] },
          createdAt: { $gte: thirtyDaysAgo },
          user: { $ne: userObjectId },
        },
      },
      {
        $group: {
          _id: { user: '$user', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      {
        $group: {
          _id: '$_id.user',
          earned: {
            $sum: { $cond: [{ $eq: ['$_id.type', 'earned'] }, '$total', 0] },
          },
          spent: {
            $sum: { $cond: [{ $eq: ['$_id.type', 'spent'] }, '$total', 0] },
          },
        },
      },
      {
        $project: {
          savingsRate: {
            $cond: [{ $gt: ['$spent', 0] }, { $multiply: [{ $divide: ['$earned', '$spent'] }, 100] }, 0],
          },
        },
      },
      { $limit: 1000 },
    ];

    // Apply area filter if available
    let peerRates: number[] = [];
    try {
      const peerResults = await CoinTransaction.aggregate(peerPipeline);
      peerRates = (peerResults as any[]).map((r) => r.savingsRate || 0);
    } catch (err) {
      logger.warn('[SpendingInsightsService] Peer pipeline failed', { error: (err as Error).message });
    }

    // Calculate percentile
    const belowUser = peerRates.filter((rate) => rate < userSavingsRate).length;
    const percentile = peerRates.length > 0 ? Math.round((belowUser / peerRates.length) * 100) : 50;
    const avgSavingsRateInArea = peerRates.length > 0 ? peerRates.reduce((s, r) => s + r, 0) / peerRates.length : 0;

    let label: string;
    if (percentile >= 90) label = 'Top 10% saver in your area';
    else if (percentile >= 75) label = 'Top 25% saver in your area';
    else if (percentile >= 50) label = 'Above average saver in your area';
    else if (percentile >= 25) label = 'Average saver in your area';
    else label = 'Room to grow your savings';

    return {
      userId,
      savingsRate: userSavingsRate,
      percentile,
      avgSavingsRateInArea,
      betterThanPct: percentile,
      label,
    };
  }
}

export default new SpendingInsightsService();
