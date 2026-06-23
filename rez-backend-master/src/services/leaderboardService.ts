import mongoose from 'mongoose';
import redisService from './redisService';
import LeaderboardConfig, {
  ILeaderboardConfig,
  LeaderboardPeriod,
  LeaderboardType
} from '../models/LeaderboardConfig';
import { CoinTransaction } from '../models/CoinTransaction';

// ============================================================================
// Types
// ============================================================================

export interface LeaderboardEntry {
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  value: number;
  rank: number;
}

export interface PaginatedLeaderboard {
  entries: LeaderboardEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  config: {
    slug: string;
    title: string;
    subtitle?: string;
    leaderboardType: string;
    period: string;
    topN: number;
  };
  lastUpdated?: string;
}

export interface UserRankResult {
  rank: number;
  total: number;
  value: number;
  nearby: LeaderboardEntry[];
}

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

// Redis cache constants
const CACHE_TTL = 300; // 5 minutes

// ============================================================================
// Legacy period mapping
// ============================================================================

/**
 * Map legacy period values ('day'|'week'|'month'|'all') to LeaderboardConfig
 * period values ('daily'|'weekly'|'monthly'|'all-time').
 */
function mapLegacyPeriod(period: string): LeaderboardPeriod {
  switch (period) {
    case 'day':
    case 'daily':
      return 'daily';
    case 'week':
    case 'weekly':
      return 'weekly';
    case 'month':
    case 'monthly':
      return 'monthly';
    case 'all':
    case 'all-time':
      return 'all-time';
    default:
      return 'monthly';
  }
}

/**
 * Map legacy leaderboard type names to LeaderboardConfig types.
 */
function mapLegacyType(type: string): LeaderboardType {
  switch (type) {
    case 'spending':
      return 'spending';
    case 'reviews':
      return 'reviews';
    case 'referrals':
      return 'referrals';
    case 'cashback':
      return 'cashback';
    case 'streak':
      return 'streak';
    case 'coins':
      return 'coins';
    default:
      return 'custom';
  }
}

// ============================================================================
// Core Service
// ============================================================================

class LeaderboardService {
  // ---------------------------------------------------------------
  // CONFIG-DRIVEN: getLeaderboard
  // ---------------------------------------------------------------

  /**
   * Get a leaderboard by type and period. Looks up the LeaderboardConfig,
   * checks Redis cache first, then falls back to live CoinTransaction aggregation.
   */
  async getLeaderboard(
    type: string,
    period: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedLeaderboard> {
    const configPeriod = mapLegacyPeriod(period);
    const configType = mapLegacyType(type);

    // Look up the config
    const config = await LeaderboardConfig.findOne({
      leaderboardType: configType,
      period: configPeriod,
      status: 'active'
    }).lean();

    if (!config) {
      // No config found -- return empty result
      return {
        entries: [],
        pagination: { page, limit, total: 0, pages: 0 },
        config: {
          slug: `${configType}-${configPeriod}`,
          title: `${type} Leaderboard`,
          leaderboardType: configType,
          period: configPeriod,
          topN: 100
        }
      };
    }

    return this.getLeaderboardByConfig(config as unknown as ILeaderboardConfig, page, limit);
  }

  /**
   * Get a leaderboard using a resolved LeaderboardConfig document.
   */
  async getLeaderboardByConfig(
    config: ILeaderboardConfig,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedLeaderboard> {
    const cacheKey = `leaderboard:${config.slug}:page:${page}:limit:${limit}`;

    // Check Redis cache first
    const cached = await redisService.get<PaginatedLeaderboard>(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if full cache exists and we can slice from it
    const fullCacheKey = `leaderboard:${config.slug}:full`;
    const fullCache = await redisService.get<LeaderboardEntry[]>(fullCacheKey);

    let entries: LeaderboardEntry[];
    let total: number;

    if (fullCache && fullCache.length > 0) {
      total = fullCache.length;
      const startIndex = (page - 1) * limit;
      entries = fullCache.slice(startIndex, startIndex + limit);
    } else {
      // Live aggregation fallback
      const result = await this.runAggregation(config, page, limit);
      entries = result.entries;
      total = result.total;
    }

    const pages = Math.ceil(total / limit);

    const response: PaginatedLeaderboard = {
      entries,
      pagination: { page, limit, total, pages },
      config: {
        slug: config.slug,
        title: config.title,
        subtitle: config.subtitle,
        leaderboardType: config.leaderboardType,
        period: config.period,
        topN: config.topN
      },
      lastUpdated: new Date().toISOString()
    };

    // Cache the page result
    await redisService.set(cacheKey, response, CACHE_TTL);

    return response;
  }

  // ---------------------------------------------------------------
  // CONFIG-DRIVEN: getUserRank
  // ---------------------------------------------------------------

  /**
   * Get a user's rank + nearby users (rank-2 through rank+2).
   * Checks Redis full cache first, falls back to aggregation.
   */
  async getUserRank(
    userId: string,
    type: string,
    period: string
  ): Promise<UserRankResult | null> {
    const configPeriod = mapLegacyPeriod(period);
    const configType = mapLegacyType(type);

    const config = await LeaderboardConfig.findOne({
      leaderboardType: configType,
      period: configPeriod,
      status: 'active'
    }).lean();

    if (!config) {
      return null;
    }

    return this.getUserRankByConfig(userId, config as unknown as ILeaderboardConfig);
  }

  /**
   * Get a user's rank using a resolved config.
   */
  async getUserRankByConfig(
    userId: string,
    config: ILeaderboardConfig
  ): Promise<UserRankResult | null> {
    const rankCacheKey = `leaderboard:${config.slug}:rank:${userId}`;

    // Check rank cache
    const cachedRank = await redisService.get<UserRankResult>(rankCacheKey);
    if (cachedRank) {
      return cachedRank;
    }

    // Try full cache
    const fullCacheKey = `leaderboard:${config.slug}:full`;
    const fullCache = await redisService.get<LeaderboardEntry[]>(fullCacheKey);

    if (fullCache && fullCache.length > 0) {
      const userIndex = fullCache.findIndex(
        entry => entry.user.id.toString() === userId
      );

      if (userIndex === -1) {
        return null;
      }

      const rank = userIndex + 1;
      const startIdx = Math.max(0, userIndex - 2);
      const endIdx = Math.min(fullCache.length, userIndex + 3);
      const nearby = fullCache.slice(startIdx, endIdx);

      const result: UserRankResult = {
        rank,
        total: fullCache.length,
        value: fullCache[userIndex].value,
        nearby
      };

      await redisService.set(rankCacheKey, result, CACHE_TTL);
      return result;
    }

    // Live aggregation: get full list up to topN to find user
    const { entries } = await this.runAggregation(config, 1, config.topN || 100);

    const userIndex = entries.findIndex(
      entry => entry.user.id.toString() === userId
    );

    if (userIndex === -1) {
      return null;
    }

    const rank = userIndex + 1;
    const startIdx = Math.max(0, userIndex - 2);
    const endIdx = Math.min(entries.length, userIndex + 3);
    const nearby = entries.slice(startIdx, endIdx);

    const result: UserRankResult = {
      rank,
      total: entries.length,
      value: entries[userIndex].value,
      nearby
    };

    await redisService.set(rankCacheKey, result, CACHE_TTL);
    return result;
  }

  // ---------------------------------------------------------------
  // CONFIG-DRIVEN: getActiveConfigs
  // ---------------------------------------------------------------

  /**
   * Returns all active LeaderboardConfig documents for display.
   */
  async getActiveConfigs(): Promise<ILeaderboardConfig[]> {
    const cacheKey = 'leaderboard:active-configs';
    const cached = await redisService.get<ILeaderboardConfig[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const configs = await LeaderboardConfig.find({ status: 'active' })
      .sort({ 'display.priority': -1, createdAt: 1 })
      .lean();

    await redisService.set(cacheKey, configs, CACHE_TTL);
    return configs as unknown as ILeaderboardConfig[];
  }

  // ---------------------------------------------------------------
  // CONFIG-DRIVEN: checkEligibility
  // ---------------------------------------------------------------

  /**
   * Validates whether a user is eligible for a given leaderboard config
   * based on eligibility rules (min account age, verification, activity threshold).
   */
  async checkEligibility(
    userId: string,
    config: ILeaderboardConfig
  ): Promise<EligibilityResult> {
    const User = mongoose.model('User');
    const user = await User.findById(userId).lean() as any;

    if (!user) {
      return { eligible: false, reason: 'User not found' };
    }

    // Check if user is inactive (banned/deactivated)
    if (user.isActive === false) {
      return { eligible: false, reason: 'User account is inactive' };
    }

    const rules = config.eligibility;

    // Check excluded users
    if (rules.excludedUserIds?.length > 0) {
      const isExcluded = rules.excludedUserIds.some(
        (id: any) => id.toString() === userId
      );
      if (isExcluded) {
        return { eligible: false, reason: 'User is excluded from this leaderboard' };
      }
    }

    // Check min account age
    if (rules.minAccountAgeDays > 0) {
      const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
      const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
      if (accountAgeDays < rules.minAccountAgeDays) {
        return {
          eligible: false,
          reason: `Account must be at least ${rules.minAccountAgeDays} days old (currently ${Math.floor(accountAgeDays)} days)`
        };
      }
    }

    // Check verification
    if (rules.requiredVerification && !user.auth?.isVerified) {
      return { eligible: false, reason: 'Account verification required' };
    }

    // Check activity threshold (min number of CoinTransactions in the period)
    if (rules.minActivityThreshold > 0) {
      const dateRange = this.getDateRange(config.period);
      const matchStage: any = {
        user: new mongoose.Types.ObjectId(userId),
        type: { $in: ['earned', 'bonus', 'refunded'] }
      };
      if (dateRange.start) {
        matchStage.createdAt = { $gte: dateRange.start };
      }
      if (config.coinTransactionSources?.length > 0) {
        matchStage.source = { $in: config.coinTransactionSources };
      }

      const activityCount = await CoinTransaction.countDocuments(matchStage);
      if (activityCount < rules.minActivityThreshold) {
        return {
          eligible: false,
          reason: `Minimum ${rules.minActivityThreshold} qualifying activities required (you have ${activityCount})`
        };
      }
    }

    // Check allowed regions (if configured)
    if (rules.allowedRegions?.length > 0 && user.profile?.region) {
      if (!rules.allowedRegions.includes(user.profile.region)) {
        return { eligible: false, reason: 'Your region is not eligible for this leaderboard' };
      }
    }

    return { eligible: true };
  }

  // ---------------------------------------------------------------
  // AGGREGATION PIPELINE
  // ---------------------------------------------------------------

  /**
   * Run the CoinTransaction aggregation pipeline for a given config.
   * Returns entries with pagination info.
   */
  async runAggregation(
    config: ILeaderboardConfig,
    page: number = 1,
    limit: number = 20
  ): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    const dateRange = this.getDateRange(config.period);

    // Build match stage
    const matchStage: any = {
      type: { $in: ['earned', 'bonus', 'refunded'] }
    };

    // Filter by configured CoinTransaction sources
    if (config.coinTransactionSources?.length > 0) {
      matchStage.source = { $in: config.coinTransactionSources };
    }

    // Apply date range
    if (dateRange.start) {
      matchStage.createdAt = { $gte: dateRange.start };
      if (dateRange.end) {
        matchStage.createdAt.$lt = dateRange.end;
      }
    }

    // Count pipeline (for total)
    const countPipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$user',
          totalCoins: { $sum: '$amount' }
        }
      },
      // Exclude inactive users
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData',
          pipeline: [
            { $project: { isActive: 1 } }
          ]
        }
      },
      { $unwind: { path: '$userData', preserveNullAndEmptyArrays: false } },
      { $match: { 'userData.isActive': { $ne: false } } },
      { $count: 'total' }
    ];

    // Main pipeline with pagination
    const skip = (page - 1) * limit;

    const mainPipeline: mongoose.PipelineStage[] = [
      // 1. Match CoinTransactions by source + date range
      { $match: matchStage },

      // 2. Group by user, sum amounts
      {
        $group: {
          _id: '$user',
          totalCoins: { $sum: '$amount' }
        }
      },

      // 3. Sort descending by total
      { $sort: { totalCoins: -1 } },

      // 4. Lookup user profile to exclude inactive and get details
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData',
          pipeline: [
            {
              $project: {
                fullName: 1,
                'profile.firstName': 1,
                username: 1,
                email: 1,
                profilePicture: 1,
                isActive: 1
              }
            }
          ]
        }
      },
      { $unwind: { path: '$userData', preserveNullAndEmptyArrays: false } },

      // 5. Exclude inactive (banned) users
      { $match: { 'userData.isActive': { $ne: false } } },

      // 6. Limit to topN overall before pagination
      { $limit: config.topN || 100 },

      // 7. Apply pagination
      { $skip: skip },
      { $limit: limit },

      // 8. Project final shape
      {
        $project: {
          _id: 0,
          user: {
            id: '$_id',
            name: {
              $ifNull: [
                '$userData.fullName',
                {
                  $ifNull: [
                    '$userData.profile.firstName',
                    { $ifNull: ['$userData.username', '$userData.email'] }
                  ]
                }
              ]
            },
            avatar: '$userData.profilePicture'
          },
          value: '$totalCoins'
        }
      }
    ];

    const [results, countResult] = await Promise.all([
      CoinTransaction.aggregate(mainPipeline).option({ allowDiskUse: true }),
      CoinTransaction.aggregate(countPipeline).option({ allowDiskUse: true })
    ]);

    const total = Math.min(
      countResult[0]?.total || 0,
      config.topN || 100
    );

    // Add rank based on pagination offset
    const entries: LeaderboardEntry[] = results.map((entry: any, index: number) => ({
      user: {
        id: entry.user.id.toString(),
        name: entry.user.name || 'Anonymous',
        avatar: entry.user.avatar || undefined
      },
      value: entry.value,
      rank: skip + index + 1
    }));

    return { entries, total };
  }

  /**
   * Run a full aggregation (no pagination) for the top N entries.
   * Used by the refresh job and rank lookups.
   */
  async runFullAggregation(config: ILeaderboardConfig): Promise<LeaderboardEntry[]> {
    const dateRange = this.getDateRange(config.period);

    const matchStage: any = {
      type: { $in: ['earned', 'bonus', 'refunded'] }
    };

    if (config.coinTransactionSources?.length > 0) {
      matchStage.source = { $in: config.coinTransactionSources };
    }

    if (dateRange.start) {
      matchStage.createdAt = { $gte: dateRange.start };
      if (dateRange.end) {
        matchStage.createdAt.$lt = dateRange.end;
      }
    }

    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      {
        $group: {
          _id: '$user',
          totalCoins: { $sum: '$amount' }
        }
      },
      { $sort: { totalCoins: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData',
          pipeline: [
            {
              $project: {
                fullName: 1,
                'profile.firstName': 1,
                username: 1,
                email: 1,
                profilePicture: 1,
                isActive: 1
              }
            }
          ]
        }
      },
      { $unwind: { path: '$userData', preserveNullAndEmptyArrays: false } },
      { $match: { 'userData.isActive': { $ne: false } } },
      { $limit: config.topN || 100 },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: {
            $ifNull: [
              '$userData.fullName',
              {
                $ifNull: [
                  '$userData.profile.firstName',
                  { $ifNull: ['$userData.username', '$userData.email'] }
                ]
              }
            ]
          },
          avatar: '$userData.profilePicture',
          value: '$totalCoins'
        }
      }
    ];

    const results = await CoinTransaction.aggregate(pipeline).option({ allowDiskUse: true });

    return results.map((entry: any, index: number) => ({
      user: {
        id: entry.userId.toString(),
        name: entry.name || 'Anonymous',
        avatar: entry.avatar || undefined
      },
      value: entry.value,
      rank: index + 1
    }));
  }

  // ---------------------------------------------------------------
  // DATE RANGE HELPERS
  // ---------------------------------------------------------------

  /**
   * Get the date range for a given period.
   */
  getDateRange(period: LeaderboardPeriod): { start: Date | null; end: Date | null } {
    const now = new Date();

    switch (period) {
      case 'daily': {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { start, end: null }; // end is "now" implicitly
      }
      case 'weekly': {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return { start, end: null };
      }
      case 'monthly': {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        return { start, end: null };
      }
      case 'all-time':
      default:
        return { start: null, end: null };
    }
  }

  /**
   * Get the cycle boundaries for prize distribution.
   * Returns the start and end of the PREVIOUS cycle (the one that just ended).
   */
  getCycleBoundaries(period: LeaderboardPeriod): { start: Date; end: Date } {
    const now = new Date();

    switch (period) {
      case 'daily': {
        const end = new Date(now);
        end.setHours(0, 0, 0, 0); // Start of today = end of yesterday
        const start = new Date(end);
        start.setDate(start.getDate() - 1);
        return { start, end };
      }
      case 'weekly': {
        // End = most recent Sunday midnight
        const end = new Date(now);
        end.setDate(end.getDate() - end.getDay());
        end.setHours(0, 0, 0, 0);
        const start = new Date(end);
        start.setDate(start.getDate() - 7);
        return { start, end };
      }
      case 'monthly': {
        // End = 1st of current month midnight
        const end = new Date(now.getFullYear(), now.getMonth(), 1);
        end.setHours(0, 0, 0, 0);
        const start = new Date(end);
        start.setMonth(start.getMonth() - 1);
        return { start, end };
      }
      case 'all-time':
      default: {
        // all-time doesn't have a cycle, return epoch to now
        return { start: new Date(0), end: now };
      }
    }
  }

  // ---------------------------------------------------------------
  // BACKWARD-COMPATIBLE LEGACY METHODS
  // ---------------------------------------------------------------

  /**
   * @deprecated Use getLeaderboard('spending', period) instead
   */
  async getSpendingLeaderboard(
    period: 'day' | 'week' | 'month' | 'all' = 'month',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const result = await this.getLeaderboard('spending', period, 1, limit);
    return result.entries;
  }

  /**
   * @deprecated Use getLeaderboard('reviews', period) instead
   */
  async getReviewLeaderboard(
    period: 'day' | 'week' | 'month' | 'all' = 'month',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const result = await this.getLeaderboard('reviews', period, 1, limit);
    return result.entries;
  }

  /**
   * @deprecated Use getLeaderboard('referrals', period) instead
   */
  async getReferralLeaderboard(
    period: 'day' | 'week' | 'month' | 'all' = 'month',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const result = await this.getLeaderboard('referrals', period, 1, limit);
    return result.entries;
  }

  /**
   * @deprecated Use getLeaderboard('cashback', period) instead
   */
  async getCashbackLeaderboard(
    period: 'day' | 'week' | 'month' | 'all' = 'month',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const result = await this.getLeaderboard('cashback', period, 1, limit);
    return result.entries;
  }

  /**
   * @deprecated Use getLeaderboard('streak', period) instead
   */
  async getStreakLeaderboard(
    type: 'login' | 'order' | 'review' = 'login',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    const result = await this.getLeaderboard('streak', 'all', 1, limit);
    return result.entries;
  }

  /**
   * @deprecated Use getUserRank(userId, type, period) instead
   */
  async getAllUserRanks(
    userId: string,
    period: 'day' | 'week' | 'month' | 'all' = 'month'
  ): Promise<any> {
    const types = ['spending', 'reviews', 'referrals', 'cashback', 'streak'];

    const results = await Promise.all(
      types.map(async (type) => {
        const rankResult = await this.getUserRank(userId, type, period);
        if (!rankResult) return null;
        return {
          rank: rankResult.rank,
          total: rankResult.total,
          value: rankResult.value
        };
      })
    );

    return {
      spending: results[0],
      reviews: results[1],
      referrals: results[2],
      cashback: results[3],
      streak: results[4]
    };
  }

  /**
   * @deprecated Use getActiveConfigs() for a config-driven overview
   */
  async getLeaderboardStats(): Promise<any> {
    const types = ['spending', 'reviews', 'referrals', 'cashback', 'streak'];

    const results = await Promise.all(
      types.map(type => this.getLeaderboard(type, 'month', 1, 3))
    );

    return {
      spending: results[0].entries.slice(0, 3),
      reviews: results[1].entries.slice(0, 3),
      referrals: results[2].entries.slice(0, 3),
      cashback: results[3].entries.slice(0, 3),
      streak: results[4].entries.slice(0, 3)
    };
  }
}

export default new LeaderboardService();
