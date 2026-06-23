/**
 * Privé Controller
 *
 * Handles Privé eligibility, offers, check-in, and dashboard endpoints
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { reputationService } from '../services/reputationService';
import { UserReputation } from '../models/UserReputation';
import priveAccessService from '../services/priveAccessService';
import DailyCheckIn from '../models/DailyCheckIn';
import PriveOffer, { IPriveOffer } from '../models/PriveOffer';
import PriveVoucher, { calculateVoucherValue, getDefaultExpiry, VoucherType } from '../models/PriveVoucher';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import Referral from '../models/Referral';
import { CoinTransaction } from '../models/CoinTransaction';
import { Store } from '../models/Store';
import BonusCampaign from '../models/BonusCampaign';
import { WalletConfig } from '../models/WalletConfig';
import { getCachedWalletConfig } from '../services/walletCacheService';
import { SOURCE_TO_CATEGORY } from '../config/earningsCategories';
import gamificationEventBus from '../events/gamificationEventBus';
import { invalidateWalletCache } from '../services/walletCacheService';
import { asyncHandler } from '../utils/asyncHandler';
import { withCache } from '../utils/cacheHelper';

/**
 * Aggregates weekly earnings from CoinTransaction (all sources, not just check-ins).
 * Returns thisWeek total, lastWeek total, percentChange, and breakdown by category.
 */
const aggregateWeeklyEarnings = async (userObjectId: mongoose.Types.ObjectId) => {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const cacheKey = `prive:weekly-earnings:${userObjectId.toString()}`;
  const [result] = await withCache(cacheKey, 300, () => CoinTransaction.aggregate([
    {
      $match: {
        user: userObjectId,
        type: { $in: ['earned', 'bonus'] },
        createdAt: { $gte: twoWeeksAgo },
      },
    },
    {
      $facet: {
        thisWeek: [
          { $match: { createdAt: { $gte: oneWeekAgo } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ],
        lastWeek: [
          { $match: { createdAt: { $lt: oneWeekAgo, $gte: twoWeeksAgo } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ],
        breakdown: [
          { $match: { createdAt: { $gte: oneWeekAgo } } },
          { $group: { _id: '$source', total: { $sum: '$amount' } } },
        ],
      },
    },
  ]));

  const thisWeek = result?.thisWeek?.[0]?.total || 0;
  const lastWeek = result?.lastWeek?.[0]?.total || 0;
  const percentChange = lastWeek > 0
    ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
    : (thisWeek > 0 ? 100 : 0);

  // Map source-level breakdown to UI categories
  const breakdown: Record<string, number> = {};
  for (const item of result?.breakdown || []) {
    const category = SOURCE_TO_CATEGORY[item._id] || 'other';
    breakdown[category] = (breakdown[category] || 0) + item.total;
  }

  return { thisWeek, lastWeek, percentChange, breakdown };
};

/** Default habit loop definitions (used when WalletConfig has no habitLoopConfig) */
const DEFAULT_LOOPS = [
  { id: 'smart_spend', name: 'Smart Spend', icon: '💰', description: 'Place an order', targetCount: 1, deepLink: '/prive/smart-spend', enabled: true, bonusCoins: 0 },
  { id: 'influence', name: 'Influence', icon: '📢', description: 'Write a review', targetCount: 1, deepLink: '/earn/review', enabled: true, bonusCoins: 0 },
  { id: 'redemption_pride', name: 'Redemption', icon: '🎁', description: 'Redeem your coins', targetCount: 1, deepLink: '/prive/redeem', enabled: true, bonusCoins: 0 },
  { id: 'network', name: 'Network', icon: '🔗', description: 'Invite a friend', targetCount: 1, deepLink: '/referral', enabled: true, bonusCoins: 0 },
];

/**
 * Build habit loop progress from config and today's counts.
 * Returns { loops, allCompleted } plus fires completion bonus if applicable.
 */
const buildHabitLoops = async (
  userObjectId: mongoose.Types.ObjectId,
  todayCounts: Record<string, number>,
  config: any,
) => {
  const habitConfig = config?.habitLoopConfig;
  const loopDefs = ((habitConfig?.loops as any[]) || DEFAULT_LOOPS).filter((l: any) => l.enabled !== false);
  const completionBonusCoins = habitConfig?.completionBonusCoins ?? 25;

  const loops = loopDefs.map((def: any) => {
    const count = todayCounts[def.id] || 0;
    const target = def.targetCount || 1;
    return {
      id: def.id,
      name: def.name,
      icon: def.icon,
      completed: count >= target,
      progress: Math.min(Math.round((count / target) * 100), 100),
      description: def.description || '',
      deepLink: def.deepLink || '',
    };
  });

  const allCompleted = loops.length > 0 && loops.every((l: any) => l.completed);

  // Fire-and-forget: award daily completion bonus (idempotent)
  if (allCompleted && completionBonusCoins > 0) {
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const idempotencyKey = `habit_completion_${userObjectId}_${todayStr}`;

    setImmediate(async () => {
      try {
        const existing = await CoinTransaction.findOne({ 'metadata.idempotencyKey': idempotencyKey }).lean();
        if (!existing) {
          await (CoinTransaction as any).createTransaction({
            user: userObjectId,
            type: 'bonus',
            amount: completionBonusCoins,
            source: 'achievement',
            description: `Daily habit loop completion bonus (${todayStr})`,
            metadata: { idempotencyKey, trigger: 'habit_loop_completion' },
          });
        }
      } catch (err) {
        logger.error('[PRIVE] Error awarding habit completion bonus:', err);
      }
    });
  }

  return { loops, allCompleted };
};

// Helper function to calculate expires in string from a date
const calculateExpiresIn = (expiresAt: Date): string => {
  const now = new Date();
  const diff = new Date(expiresAt).getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return 'Less than 1 hour';
};

/**
 * GET /api/prive/eligibility
 * Get current user's Privé eligibility status
 */
export const getPriveEligibility = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Use priveAccessService for the unified check
    const accessCheck = await priveAccessService.checkAccess(userId);

    return res.status(200).json({
      success: true,
      data: {
        // Existing reputation fields
        ...accessCheck.reputation,
        // New access fields
        hasAccess: accessCheck.hasAccess,
        accessSource: accessCheck.accessSource,
        effectiveTier: accessCheck.effectiveTier,
        isWhitelisted: accessCheck.isWhitelisted,
      },
    });
});

/**
 * GET /api/prive/pillars
 * Get detailed pillar breakdown for user
 */
export const getPillarBreakdown = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const breakdown = await reputationService.getPillarBreakdown(userId);

    return res.status(200).json({
      success: true,
      data: breakdown,
    });
});

/**
 * POST /api/prive/refresh
 * Force recalculation of user's reputation
 */
export const refreshEligibility = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Recalculate reputation
    const reputation = await reputationService.recalculateReputation(userId, 'user_refresh');

    // Get formatted eligibility response
    const eligibility = await reputationService.checkPriveEligibility(userId);

    return res.status(200).json({
      success: true,
      message: 'Eligibility refreshed successfully',
      data: eligibility,
    });
});

/**
 * GET /api/prive/history
 * Get reputation history for user
 */
export const getReputationHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const reputation = await UserReputation.findOne({ userId }).lean();

    if (!reputation) {
      return res.status(200).json({
        success: true,
        data: {
          history: [],
          currentScore: 0,
          currentTier: 'none',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        history: reputation.history.slice(-20), // Last 20 entries
        currentScore: reputation.totalScore,
        currentTier: reputation.tier,
      },
    });
});

/**
 * GET /api/prive/tips
 * Get personalized tips to improve eligibility score
 */
export const getImprovementTips = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { pillars, factors } = await reputationService.getPillarBreakdown(userId);

    // Generate tips based on lowest scoring pillars
    const tips: Array<{ pillar: string; tip: string; priority: 'high' | 'medium' | 'low' }> = [];

    // Sort pillars by score (ascending)
    const sortedPillars = [...pillars].sort((a, b) => a.score - b.score);

    sortedPillars.forEach((pillar, index) => {
      const priority = index < 2 ? 'high' : index < 4 ? 'medium' : 'low';

      switch (pillar.id) {
        case 'engagement':
          if (pillar.score < 50) {
            tips.push({
              pillar: pillar.label,
              tip: 'Place more orders to boost your engagement score. Active users get higher scores!',
              priority,
            });
          }
          break;

        case 'trust':
          if (pillar.score < 70) {
            tips.push({
              pillar: pillar.label,
              tip: 'Complete orders without cancelling, verify your email, and avoid refund requests to boost trust.',
              priority,
            });
          }
          break;

        case 'influence':
          if (pillar.score < 50) {
            tips.push({
              pillar: pillar.label,
              tip: 'Refer friends and write reviews to boost your influence score.',
              priority,
            });
          }
          break;

        case 'economicValue':
          if (pillar.score < 50) {
            tips.push({
              pillar: pillar.label,
              tip: 'Explore different categories and maintain regular purchases.',
              priority,
            });
          }
          break;

        case 'brandAffinity':
          if (pillar.score < 50) {
            tips.push({
              pillar: pillar.label,
              tip: 'Add items to your wishlist and make repeat purchases from favorite stores.',
              priority,
            });
          }
          break;

        case 'network':
          if (pillar.score < 50) {
            tips.push({
              pillar: pillar.label,
              tip: 'Grow your referral network by inviting friends to join.',
              priority,
            });
          }
          break;
      }
    });

    return res.status(200).json({
      success: true,
      data: {
        tips: tips.slice(0, 5), // Top 5 tips
        lowestPillar: sortedPillars[0],
        highestPillar: sortedPillars[sortedPillars.length - 1],
      },
    });
});

// ==========================================
// Daily Check-in & Habits
// ==========================================

/**
 * POST /api/prive/check-in
 * DEPRECATED: Delegates to gamification streakCheckin for correct CoinTransaction tracking.
 * The old implementation directly mutated wallet without creating CoinTransaction records,
 * causing earnings history to be incomplete. Now forwards to the unified gamification endpoint.
 */
export const dailyCheckIn = asyncHandler(async (req: Request, res: Response) => {
    // Delegate to the gamification streakCheckin handler which:
    // 1. Uses atomic findOneAndUpdate (prevents race conditions)
    // 2. Creates CoinTransaction via coinService.awardCoins (earnings tracking)
    // 3. Updates UserStreak model (unified streak tracking)
    // 4. Awards escalating day rewards (matches frontend calendar)
    const { streakCheckin } = await import('./gamificationController');
    return (streakCheckin as any)(req, res);
});

/**
 * GET /api/prive/habit-loops
 * Get daily habit loops with progress
 */
export const getHabitLoops = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Fetch config + today's counts + weekly earnings in parallel
    const [config, ordersToday, reviewsToday, referralsToday, vouchersToday, weeklyEarningsData] = await Promise.all([
      getCachedWalletConfig(),
      Order.countDocuments({
        user: userObjectId,
        createdAt: { $gte: today },
        status: { $in: ['completed', 'delivered'] },
      }).catch(() => 0),
      Review.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: today },
      }).catch(() => 0),
      Referral.countDocuments({
        referrer: userObjectId,
        createdAt: { $gte: today },
        status: 'COMPLETED',
      }).catch(() => 0),
      PriveVoucher.countDocuments({
        userId: userObjectId,
        createdAt: { $gte: today },
      }).catch(() => 0),
      aggregateWeeklyEarnings(userObjectId),
    ]);

    const todayCounts: Record<string, number> = {
      smart_spend: ordersToday,
      influence: reviewsToday,
      redemption_pride: vouchersToday,
      network: referralsToday,
    };

    const { loops, allCompleted } = await buildHabitLoops(userObjectId, todayCounts, config);

    return res.status(200).json({
      success: true,
      data: {
        loops,
        weeklyEarnings: weeklyEarningsData,
        allCompleted,
      },
    });
});

// ==========================================
// Dashboard
// ==========================================

/**
 * GET /api/prive/dashboard
 * Get combined dashboard data
 */
export const getPriveDashboard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // First fetch eligibility + access status
    const accessCheck = await priveAccessService.checkAccess(userId);
    const eligibility = accessCheck.reputation;
    const userTier = accessCheck.effectiveTier || eligibility?.tier || 'none';

    // Fetch all other data in parallel
    const [
      user,
      wallet,
      checkInStatus,
      currentStreak,
      weeklyEarningsData,
      walletConfig,
      featuredOffers,
      activeCampaigns,
      completedCampaigns,
      avgRatingResult,
      notificationSummary,
      activeMissionsSummary,
    ] = await Promise.all([
      User.findById(userId).select('fullName profile createdAt').lean(),
      Wallet.findOne({ user: userObjectId }).lean(),
      DailyCheckIn.hasCheckedInToday(userObjectId),
      DailyCheckIn.getCurrentStreak(userObjectId),
      aggregateWeeklyEarnings(userObjectId),
      getCachedWalletConfig(),
      PriveOffer.findFeaturedOffers(userTier, 3),
      Order.countDocuments({
        user: userObjectId,
        status: { $in: ['pending', 'processing', 'shipped'] },
      }).catch(() => 0),
      Order.countDocuments({
        user: userObjectId,
        status: 'delivered',
      }).catch(() => 0),
      Review.aggregate([
        { $match: { user: userObjectId } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } },
      ]).catch(() => []),
      // Notification summary (lightweight — counts only)
      (async () => {
        try {
          const { priveNotificationService } = await import('../services/priveNotificationService');
          const result = await priveNotificationService.getNotifications(userId, userTier);
          return { counts: result.counts, topUrgent: result.notifications.slice(0, 3) };
        } catch { return { counts: { critical: 0, warning: 0, info: 0 }, topUrgent: [] }; }
      })(),
      // Active missions (top 3)
      (async () => {
        try {
          const { UserMission } = await import('../models/UserMission');
          const missions = await UserMission.find({ userId: userObjectId, status: 'active' })
            .populate('missionId', 'title targetPillar reward endDate')
            .sort({ createdAt: -1 })
            .limit(3)
            .lean();
          return missions.map((m: any) => ({
            id: m._id.toString(),
            title: m.missionId?.title || 'Mission',
            progress: m.progress,
            target: m.targetCount,
            pillar: m.missionId?.targetPillar,
            reward: m.missionId?.reward,
          }));
        } catch { return []; }
      })(),
    ]);

    // Format offers for response
    const formattedOffers = featuredOffers.map((offer: IPriveOffer) => ({
      id: offer._id.toString(),
      brand: offer.brand.name,
      brandLogo: offer.brand.logo,
      title: offer.title,
      subtitle: offer.subtitle,
      reward: offer.reward.displayText,
      expiresIn: calculateExpiresIn(offer.expiresAt),
      isExclusive: offer.isExclusive,
      tierRequired: offer.tierRequired,
    }));

    // Calculate tier progress
    const tierThresholds: Record<string, { min: number; max: number; next: string }> = {
      none: { min: 0, max: 49, next: 'entry' },
      entry: { min: 50, max: 69, next: 'signature' },
      signature: { min: 70, max: 84, next: 'elite' },
      elite: { min: 85, max: 100, next: 'elite' },
    };

    const currentTier = eligibility?.tier || 'none';
    const tierInfo = tierThresholds[currentTier] || tierThresholds.none;
    const score = eligibility?.score || 0;
    const tierProgress = (score - tierInfo.min) / (tierInfo.max - tierInfo.min + 1);
    const pointsToNext = Math.max(0, (tierThresholds[tierInfo.next]?.min || 100) - score);

    // Generate deterministic member ID from user ID (hash-based, stable across requests)
    const hashNum = (str: string, offset: number) => {
      let hash = offset;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
      }
      return Math.abs(hash % 9000) + 1000;
    };
    const memberId = `${userId.slice(-4).toUpperCase()} ${hashNum(userId, 1)} ${hashNum(userId, 2)} ${hashNum(userId, 3)}`;

    // Format dates
    const memberSince = user?.createdAt
      ? new Date(user.createdAt).toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' })
      : '01/24';
    const validThru = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      month: '2-digit',
      year: '2-digit',
    });

    // Build response
    const dashboard = {
      eligibility: {
        isEligible: eligibility?.isEligible || false,
        score: eligibility?.score || 0,
        tier: eligibility?.tier || 'none',
        trustScore: eligibility?.trustScore || 0,
        pillars: eligibility?.pillars || [],
        accessState: score >= 70 ? 'active' : score >= 50 ? 'building' : 'none',
        // Invite-based access fields
        hasAccess: accessCheck.hasAccess,
        accessSource: accessCheck.accessSource,
        effectiveTier: accessCheck.effectiveTier,
        isWhitelisted: accessCheck.isWhitelisted,
      },
      coins: (() => {
        // Extract coin balances from wallet
        const rezCoin = wallet?.coins?.find((c: any) => c.type === 'rez');
        const priveCoin = wallet?.coins?.find((c: any) => c.type === 'prive');
        const brandedTotal = (wallet?.brandedCoins || []).reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

        const rezAmount = rezCoin?.amount || 0;
        const priveAmount = priveCoin?.amount || 0;
        const computedTotal = rezAmount + priveAmount + brandedTotal;

        return {
          total: computedTotal,
          rez: rezAmount,
          prive: priveAmount,
          branded: brandedTotal,
          brandedBreakdown: (wallet?.brandedCoins || []).map((c: any) => ({
            brandId: c.merchantId?.toString(),
            brandName: c.merchantName,
            amount: c.amount,
          })),
        };
      })(),
      dailyProgress: await (async () => {
        // Compute real habit loop progress for today
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [todayOrders, todayReviews, todayReferrals, todayVouchers] = await Promise.all([
          Order.countDocuments({ user: userObjectId, createdAt: { $gte: todayStart } }).catch(() => 0),
          Review.countDocuments({ user: userObjectId, createdAt: { $gte: todayStart } }).catch(() => 0),
          Referral.countDocuments({ referrer: userObjectId, createdAt: { $gte: todayStart } }).catch(() => 0),
          PriveVoucher.countDocuments({ userId: userObjectId, createdAt: { $gte: todayStart } }).catch(() => 0),
        ]);

        const todayCounts: Record<string, number> = {
          smart_spend: todayOrders,
          influence: todayReviews,
          redemption_pride: todayVouchers,
          network: todayReferrals,
        };

        const { loops, allCompleted } = await buildHabitLoops(userObjectId, todayCounts, walletConfig);

        return {
          isCheckedIn: checkInStatus,
          streak: currentStreak,
          weeklyEarnings: weeklyEarningsData,
          loops,
          allCompleted,
        };
      })(),
      highlights: await (async () => {
        // Use real featured offer for curatedOffer, null for others without real data
        const curatedOffer = formattedOffers[0]
          ? {
              id: formattedOffers[0].id,
              type: 'offer' as const,
              icon: '🎁',
              title: formattedOffers[0].title,
              subtitle: formattedOffers[0].subtitle || 'Privé members only',
              badge: 'Featured',
              badgeColor: '#E91E63',
            }
          : null;

        // Find nearby Prive-eligible store
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);
        let nearbyStore = null;
        if (!isNaN(lat) && !isNaN(lng)) {
          const stores = await Store.find({
            'location.coordinates': {
              $near: {
                $geometry: { type: 'Point', coordinates: [lng, lat] },
                $maxDistance: 5000,
              },
            },
            isActive: true,
          }).select('name logo slug location tags').limit(1).lean();
          if (stores.length) {
            nearbyStore = {
              id: String(stores[0]._id),
              type: 'store' as const,
              icon: '📍',
              title: (stores[0] as any).name,
              subtitle: 'Nearby Prive partner',
              badge: 'Near You',
              badgeColor: '#4CAF50',
            };
          }
        }

        // Find active Prive opportunity (campaign with budget remaining)
        const now = new Date();
        const campaign = await BonusCampaign.findOne({
          status: 'active',
          startTime: { $lte: now },
          endTime: { $gte: now },
        }).select('title description type').sort({ endTime: 1 }).lean();
        const opportunity = campaign
          ? {
              id: String(campaign._id),
              type: 'campaign' as const,
              icon: '🎯',
              title: (campaign as any).title,
              subtitle: (campaign as any).description || 'Limited time opportunity',
              badge: 'Live',
              badgeColor: '#FF9800',
            }
          : null;

        return {
          curatedOffer,
          nearbyStore,
          opportunity,
        };
      })(),
      featuredOffers: formattedOffers,
      stats: {
        activeCampaigns,
        completedCampaigns,
        avgRating: avgRatingResult?.[0]?.avgRating
          ? parseFloat(avgRatingResult[0].avgRating.toFixed(1))
          : null,
      },
      user: {
        name: user?.fullName ||
              (user?.profile?.firstName && user?.profile?.lastName
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user?.profile?.firstName || 'Privé Member'),
        memberId,
        memberSince,
        validThru,
        tierProgress: Math.min(tierProgress, 1),
        pointsToNext,
        nextTier: tierInfo.next,
      },
      notifications: notificationSummary,
      activeMissions: activeMissionsSummary,
    };

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
});

// ==========================================
// Offers
// ==========================================

/**
 * GET /api/prive/offers
 * Get Privé exclusive offers
 */
export const getPriveOffers = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { page = 1, limit = 10, category, tier: tierFilter } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));

    // Get user's tier
    const eligibility = await reputationService.checkPriveEligibility(userId);
    const userTier = eligibility?.tier || 'none';

    // Build query
    const now = new Date();
    const query: any = {
      isActive: true,
      startsAt: { $lte: now },
      expiresAt: { $gte: now },
    };

    // Filter by accessible tiers
    const tierHierarchy: Record<string, number> = {
      none: 0,
      entry: 1,
      signature: 2,
      elite: 3,
    };
    const userTierLevel = tierHierarchy[userTier] ?? 0;
    const accessibleTiers = Object.keys(tierHierarchy).filter(
      (t) => tierHierarchy[t] <= userTierLevel
    );
    query.tierRequired = { $in: accessibleTiers };

    if (category) {
      query.category = category;
    }

    // Get all active offers from cache, then filter in memory
    const allActiveOffers = await withCache('prive:offers:active', 300, () =>
      PriveOffer.find({ isActive: true }).sort({ priority: -1, isFeatured: -1, createdAt: -1 }).lean()
    );

    // Apply tier and category filters in memory
    const filteredOffers = (allActiveOffers as any[]).filter((offer: any) => {
      if (offer.startsAt && new Date(offer.startsAt) > now) return false;
      if (offer.expiresAt && new Date(offer.expiresAt) < now) return false;
      if (offer.tierRequired && !accessibleTiers.includes(offer.tierRequired)) return false;
      if (category && offer.category !== category) return false;
      return true;
    });

    const total = filteredOffers.length;

    // Apply pagination in memory
    const offers = filteredOffers.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // Format offers
    const formattedOffers = offers.map((offer: any) => ({
      id: offer._id.toString(),
      brand: offer.brand.name,
      brandLogo: offer.brand.logo,
      title: offer.title,
      subtitle: offer.subtitle,
      description: offer.description,
      reward: offer.reward.displayText,
      rewardValue: offer.reward.value,
      rewardType: offer.reward.type,
      coinType: offer.reward.coinType,
      expiresIn: calculateExpiresIn(offer.expiresAt),
      expiresAt: offer.expiresAt,
      isExclusive: offer.isExclusive,
      tierRequired: offer.tierRequired,
      images: offer.images,
      terms: offer.terms,
      redemptions: offer.redemptions,
      totalLimit: offer.totalLimit,
    }));

    return res.status(200).json({
      success: true,
      data: {
        offers: formattedOffers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
});

/**
 * GET /api/prive/offers/:id
 * Get single Privé offer by ID
 */
export const getPriveOfferById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid offer ID',
      });
    }

    const offer = await PriveOffer.findById(id).lean();

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found',
      });
    }

    // Increment views atomically (fire-and-forget)
    PriveOffer.updateOne({ _id: id }, { $inc: { views: 1 } }).exec().catch((err) => logger.error('[PriveCtrl] Offer view increment failed', { error: err.message, offerId: id }));

    return res.status(200).json({
      success: true,
      data: {
        id: offer._id.toString(),
        brand: offer.brand.name,
        brandLogo: offer.brand.logo,
        title: offer.title,
        subtitle: offer.subtitle,
        description: offer.description,
        reward: offer.reward.displayText,
        rewardValue: offer.reward.value,
        rewardType: offer.reward.type,
        coinType: offer.reward.coinType,
        expiresIn: calculateExpiresIn(offer.expiresAt),
        expiresAt: offer.expiresAt,
        isExclusive: offer.isExclusive,
        tierRequired: offer.tierRequired,
        images: offer.images,
        coverImage: offer.coverImage,
        terms: offer.terms,
        howToRedeem: offer.howToRedeem,
        redemptions: offer.redemptions,
        totalLimit: offer.totalLimit,
      },
    });
});

/**
 * POST /api/prive/offers/:id/click
 * Track offer click for analytics
 */
export const trackOfferClick = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid offer ID',
      });
    }

    // Dedup: only count one click per user per offer per day
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const alreadyTracked = await PriveOffer.findOne({
      _id: id,
      'clickLog.userId': userObjectId,
      'clickLog.date': { $gte: today },
    }).lean();

    if (!alreadyTracked) {
      await PriveOffer.findByIdAndUpdate(id, {
        $inc: { clicks: 1 },
        $push: { clickLog: { userId: userObjectId, date: new Date() } },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Click tracked',
    });
});

// ==========================================
// Highlights
// ==========================================

/**
 * GET /api/prive/highlights
 * Get today's personalized highlights
 */
export const getPriveHighlights = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Get user's tier for personalization
    const eligibility = await reputationService.checkPriveEligibility(userId);
    const userTier = eligibility?.tier || 'none';

    // Get a featured offer for the user
    const featuredOffers = await PriveOffer.findFeaturedOffers(userTier, 1);
    const curatedOffer = featuredOffers[0];

    const highlights = {
      curatedOffer: curatedOffer
        ? {
            id: curatedOffer._id.toString(),
            type: 'offer' as const,
            icon: '🎁',
            title: curatedOffer.title,
            subtitle: curatedOffer.subtitle,
            badge: curatedOffer.isExclusive ? 'Exclusive' : 'Featured',
            badgeColor: '#E91E63',
          }
        : null,
      nearbyStore: await (async () => {
        const lat = parseFloat(req.query.lat as string);
        const lng = parseFloat(req.query.lng as string);
        if (isNaN(lat) || isNaN(lng)) return null;
        const stores = await Store.find({
          'location.coordinates': {
            $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 5000 },
          },
          isActive: true,
        }).select('name logo slug').limit(1).lean();
        return stores.length
          ? { id: String(stores[0]._id), type: 'store' as const, icon: '📍', title: (stores[0] as any).name, subtitle: 'Nearby Prive partner', badge: 'Near You', badgeColor: '#4CAF50' }
          : null;
      })(),
      opportunity: await (async () => {
        const now = new Date();
        const campaign = await BonusCampaign.findOne({ status: 'active', startTime: { $lte: now }, endTime: { $gte: now } }).select('title description').sort({ endTime: 1 }).lean();
        return campaign
          ? { id: String(campaign._id), type: 'campaign' as const, icon: '🎯', title: (campaign as any).title, subtitle: (campaign as any).description || 'Limited time opportunity', badge: 'Live', badgeColor: '#FF9800' }
          : null;
      })()
    };

    return res.status(200).json({
      success: true,
      data: highlights,
    });
});

// ==========================================
// Earnings & Transactions
// ==========================================

/**
 * GET /api/prive/earnings
 * Get user's coin earning history
 */
export const getEarnings = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { page = 1, limit = 20, type, cursor, timeRange } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const DAY_MS = 24 * 60 * 60 * 1000;

    // Build query for earnings (positive transactions)
    const query: any = {
      user: userObjectId,
      amount: { $gt: 0 },
    };

    // Filter by type if specified
    if (type && type !== 'all') {
      query.type = type;
    }

    // Time-range filter (7, 30, 90 days)
    if (timeRange && ['7', '30', '90'].includes(timeRange as string)) {
      const days = parseInt(timeRange as string, 10);
      query.createdAt = { ...(query.createdAt || {}), $gte: new Date(Date.now() - days * DAY_MS) };
    }

    // Cursor-based pagination: filter by createdAt < cursor
    if (cursor && typeof cursor === 'string') {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        query.createdAt = { ...(query.createdAt || {}), $lt: cursorDate };
      }
    }

    // Get total count (without cursor filter for accurate total)
    const countQuery: any = { user: userObjectId, amount: { $gt: 0 } };
    if (type && type !== 'all') countQuery.type = type;
    if (timeRange && ['7', '30', '90'].includes(timeRange as string)) {
      const days = parseInt(timeRange as string, 10);
      countQuery.createdAt = { $gte: new Date(Date.now() - days * DAY_MS) };
    }
    const total = await CoinTransaction.countDocuments(countQuery);

    // Fetch limit+1 to determine hasMore for cursor pagination
    const fetchLimit = cursor ? limitNum + 1 : limitNum;

    // Get earnings with pagination
    const earnings = await CoinTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(cursor ? 0 : (pageNum - 1) * limitNum)
      .limit(fetchLimit)
      .lean();

    // Determine if there are more results (cursor mode)
    const hasMoreCursor = cursor ? earnings.length > limitNum : undefined;
    const resultEarnings = cursor && earnings.length > limitNum
      ? earnings.slice(0, limitNum)
      : earnings;

    // Calculate summary stats
    const now = new Date();
    const weekStart = new Date(now.getTime() - 7 * DAY_MS);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run time-based summaries and source-grouped summary in parallel
    const [weeklyTotal, monthlyTotal, totalEarned, bySourceRaw] = await Promise.all([
      CoinTransaction.aggregate([
        { $match: { user: userObjectId, amount: { $gt: 0 }, createdAt: { $gte: weekStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      CoinTransaction.aggregate([
        { $match: { user: userObjectId, amount: { $gt: 0 }, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      CoinTransaction.aggregate([
        { $match: { user: userObjectId, amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Source-grouped summary using SOURCE_TO_CATEGORY mapping
      CoinTransaction.aggregate([
        { $match: { user: userObjectId, amount: { $gt: 0 } } },
        { $group: { _id: '$source', total: { $sum: '$amount' } } },
      ]),
    ]);

    // Map raw source groups into UI categories
    const bySource: Record<string, number> = {};
    for (const item of bySourceRaw) {
      const category = SOURCE_TO_CATEGORY[item._id] || 'other';
      bySource[category] = (bySource[category] || 0) + item.total;
    }

    // Format earnings
    const formattedEarnings = resultEarnings.map((txn: any) => ({
      id: txn._id.toString(),
      type: txn.type,
      amount: txn.amount,
      coinType: txn.coinType || 'rez',
      description: txn.description || getTransactionDescription(txn.type),
      source: txn.source,
      createdAt: txn.createdAt,
      date: new Date(txn.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    }));

    // Build next cursor from last item
    const lastEarning = formattedEarnings[formattedEarnings.length - 1];
    const nextCursor = cursor && hasMoreCursor && lastEarning ? lastEarning.createdAt : undefined;

    return res.status(200).json({
      success: true,
      data: {
        earnings: formattedEarnings,
        summary: {
          thisWeek: weeklyTotal[0]?.total || 0,
          thisMonth: monthlyTotal[0]?.total || 0,
          allTime: totalEarned[0]?.total || 0,
        },
        bySource,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          ...(cursor !== undefined && { hasMore: hasMoreCursor, nextCursor }),
        },
      },
    });
});

/**
 * GET /api/prive/transactions
 * Get user's coin transaction history (all transactions)
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { page = 1, limit = 20, type, coinType, cursor } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Build query
    const query: any = { user: userObjectId };

    if (type && type !== 'all') {
      query.type = type;
    }

    if (coinType && coinType !== 'all') {
      query.coinType = coinType;
    }

    // Cursor-based pagination: filter by createdAt < cursor
    if (cursor && typeof cursor === 'string') {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        query.createdAt = { ...(query.createdAt || {}), $lt: cursorDate };
      }
    }

    // Get total count (without cursor filter for accurate total)
    const countQuery: any = { user: userObjectId };
    if (type && type !== 'all') countQuery.type = type;
    if (coinType && coinType !== 'all') countQuery.coinType = coinType;
    const total = await CoinTransaction.countDocuments(countQuery);

    // Fetch limit+1 to determine hasMore for cursor pagination
    const fetchLimit = cursor ? limitNum + 1 : limitNum;

    // Get transactions with pagination
    const transactions = await CoinTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(cursor ? 0 : (pageNum - 1) * limitNum)
      .limit(fetchLimit)
      .lean();

    // Determine if there are more results (cursor mode)
    const hasMoreCursor = cursor ? transactions.length > limitNum : undefined;
    const resultTransactions = cursor && transactions.length > limitNum
      ? transactions.slice(0, limitNum)
      : transactions;

    // Format transactions
    const formattedTransactions = resultTransactions.map((txn: any) => ({
      id: txn._id.toString(),
      type: txn.type,
      amount: txn.amount,
      coinType: txn.coinType || 'rez',
      description: txn.description || getTransactionDescription(txn.type),
      source: txn.source,
      status: txn.status || 'completed',
      createdAt: txn.createdAt,
      date: new Date(txn.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: new Date(txn.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

    // Build next cursor from last item
    const lastTxn = formattedTransactions[formattedTransactions.length - 1];
    const nextCursor = cursor && hasMoreCursor && lastTxn ? lastTxn.createdAt : undefined;

    return res.status(200).json({
      success: true,
      data: {
        transactions: formattedTransactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          ...(cursor !== undefined && { hasMore: hasMoreCursor, nextCursor }),
        },
      },
    });
});

// Helper to get description for transaction types
const getTransactionDescription = (type: string): string => {
  const descriptions: Record<string, string> = {
    check_in: 'Daily check-in reward',
    purchase: 'Purchase reward',
    referral: 'Referral bonus',
    campaign: 'Campaign reward',
    content: 'Content creation reward',
    review: 'Review reward',
    redemption: 'Coin redemption',
    transfer: 'Coin transfer',
    bonus: 'Bonus reward',
    cashback: 'Cashback earned',
  };
  return descriptions[type] || 'Coin transaction';
};

// ==========================================
// Redemption & Vouchers
// ==========================================

/**
 * POST /api/prive/redeem
 * Redeem coins for a voucher
 * Uses MongoDB transaction for atomicity — all DB ops succeed or all roll back.
 */
export const redeemCoins = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Verify Privé access
    const accessCheck = await priveAccessService.checkAccess(userId);
    if (!accessCheck.hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Privé access required to redeem coins',
      });
    }

    const { coinAmount, type, category, partnerId, partnerName, partnerLogo, idempotencyKey, coinType = 'prive', offerId } = req.body;

    // Validate inputs
    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: 'idempotencyKey is required',
      });
    }

    if (!coinAmount || coinAmount < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coin amount',
      });
    }

    if (!type || !['gift_card', 'bill_pay', 'experience', 'charity'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid redemption type',
      });
    }

    // Only Privé coins can be redeemed from this module
    if (coinType !== 'prive') {
      return res.status(400).json({
        success: false,
        error: 'Only Privé coins can be redeemed from this module',
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // --- Load WalletConfig for dynamic rates, limits, and catalog validation ---
    const walletConfig = await WalletConfig.getOrCreate();
    const rc = walletConfig.redemptionConfig;

    // Validate against enabled categories
    const enabledCategories = rc?.enabledCategories || ['gift_card', 'bill_pay', 'experience', 'charity'];
    if (!enabledCategories.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Category "${type}" is currently disabled`,
      });
    }

    // Validate min coins per category from config
    const minCoinsMap: Record<string, number> = rc?.minCoinsPerCategory || { gift_card: 500, bill_pay: 100, experience: 1000, charity: 100 };
    const minCoins = (minCoinsMap as any)[type] || 100;
    if (coinAmount < minCoins) {
      return res.status(400).json({
        success: false,
        error: `Minimum ${minCoins} coins required for ${type.replace('_', ' ')} redemption`,
      });
    }

    // Validate max coins from config
    const maxCoins = rc?.maxCoinsPerRedemption || 50000;
    if (coinAmount > maxCoins) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${maxCoins} coins per redemption`,
      });
    }

    // 5B: Server-side catalog validation — reject unknown partners
    const VALID_PARTNERS: Record<string, string[]> = {
      gift_card: ['amazon', 'flipkart', 'swiggy', 'zomato', 'myntra', 'bookmyshow'],
      experience: ['spa', 'dining', 'staycation', 'adventure', 'concert', 'workshop'],
      charity: ['education', 'hunger', 'health', 'environment', 'animals', 'disaster'],
      bill_pay: [], // bill_pay doesn't require a specific partner
    };
    if (type !== 'bill_pay' && category) {
      const validIds = VALID_PARTNERS[type] || [];
      if (validIds.length > 0 && !validIds.includes(category)) {
        return res.status(400).json({
          success: false,
          error: `Unknown partner/category "${category}" for ${type}`,
        });
      }
    }

    // Daily redemption limit check
    const dailyLimit = rc?.dailyRedemptionLimit || 5;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRedemptions = await CoinTransaction.countDocuments({
      user: userObjectId,
      source: 'redemption',
      createdAt: { $gte: todayStart },
    });
    if (todayRedemptions >= dailyLimit) {
      return res.status(400).json({
        success: false,
        error: `Daily redemption limit (${dailyLimit}) reached. Try again tomorrow.`,
      });
    }

    // Idempotency check — if same key was used before, return existing voucher
    const existingTx = await CoinTransaction.findOne({
      user: userObjectId,
      'metadata.idempotencyKey': idempotencyKey,
    }).lean();

    if (existingTx) {
      const existingVoucher = await PriveVoucher.findById(existingTx.metadata?.voucherId).lean();
      if (existingVoucher) {
        return res.status(200).json({
          success: true,
          data: {
            voucher: {
              id: (existingVoucher as any)._id.toString(),
              code: (existingVoucher as any).code,
              type: (existingVoucher as any).type,
              value: (existingVoucher as any).value,
              currency: (existingVoucher as any).currency,
              coinAmount: (existingVoucher as any).coinAmount,
              expiresAt: (existingVoucher as any).expiresAt,
              expiresIn: calculateExpiresIn((existingVoucher as any).expiresAt),
              status: (existingVoucher as any).status,
              partnerName: (existingVoucher as any).partnerName,
              partnerLogo: (existingVoucher as any).partnerLogo,
              category: (existingVoucher as any).category,
              terms: (existingVoucher as any).terms,
              howToUse: (existingVoucher as any).howToUse,
            },
            wallet: {
              available: 0, // Will be re-fetched by frontend
              total: 0,
            },
            duplicate: true,
          },
        });
      }
      // Transaction exists but voucher is missing (invalidated/deleted) — do NOT retry
      // This prevents double-spend when voucher was admin-invalidated
      return res.status(409).json({
        success: false,
        error: 'This redemption has already been processed. The voucher may have been invalidated by an admin.',
      });
    }

    // Offer pre-validation (non-atomic — quick reject for obviously exceeded limits)
    // The atomic guard inside the transaction is the real protection
    if (offerId) {
      const offer = await PriveOffer.findById(offerId).lean();
      if (offer) {
        if (offer.limitPerUser) {
          const userRedemptions = await CoinTransaction.countDocuments({
            user: userObjectId,
            source: 'redemption',
            'metadata.offerId': offerId,
          });
          if (userRedemptions >= offer.limitPerUser) {
            return res.status(400).json({
              success: false,
              error: 'You have reached the redemption limit for this offer',
            });
          }
        }
        if (offer.totalLimit && offer.redemptions >= offer.totalLimit) {
          return res.status(400).json({
            success: false,
            error: 'This offer has reached its redemption limit',
          });
        }
      }
    }

    // Generate unique voucher code before transaction (doesn't need session)
    const voucherCode = await PriveVoucher.generateUniqueCode();

    // Calculate voucher value from WalletConfig (not hardcoded helper)
    const conversionRates: Record<string, number> = rc?.conversionRates || { gift_card: 0.10, bill_pay: 0.10, experience: 0.12, charity: 0.15 };
    const rate = (conversionRates as any)[type] || 0.10;
    const voucherValue = Math.round(coinAmount * rate * 100) / 100;

    // Calculate expiry from WalletConfig (not hardcoded helper)
    const expiryDaysMap: Record<string, number> = rc?.expiryDays || { gift_card: 365, bill_pay: 30, experience: 90, charity: 7 };
    const expiryDays = (expiryDaysMap as any)[type] || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Currency from environment (not hardcoded)
    const currency = process.env.PLATFORM_CURRENCY || 'INR';

    // --- MongoDB Transaction: atomic wallet deduction + voucher creation + CoinTransaction ---
    const session = await mongoose.startSession();
    let voucher: any;
    let walletUpdate: any;

    try {
      await session.startTransaction();

      // Fix 1D: Single atomic wallet update for both balance and coin-type deduction
      walletUpdate = await Wallet.findOneAndUpdate(
        {
          user: userObjectId,
          'balance.available': { $gte: coinAmount },
          'coins': { $elemMatch: { type: coinType, amount: { $gte: coinAmount } } },
        },
        {
          $inc: {
            'balance.available': -coinAmount,
            'balance.total': -coinAmount,
            'statistics.totalSpent': coinAmount,
            'coins.$.amount': -coinAmount,
          },
          $set: {
            lastTransactionAt: new Date(),
            'coins.$.lastUsed': new Date(),
          },
        },
        { new: true, session }
      );

      if (!walletUpdate) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: 'Insufficient coin balance',
        });
      }

      // Create voucher within transaction
      const [createdVoucher] = await PriveVoucher.create([{
        userId: userObjectId,
        code: voucherCode,
        type,
        coinAmount,
        coinType,
        value: voucherValue,
        currency,
        status: 'active',
        expiresAt,
        category,
        partnerId: partnerId ? new mongoose.Types.ObjectId(partnerId) : undefined,
        partnerName,
        partnerLogo,
        terms: getVoucherTerms(type as VoucherType),
        howToUse: getVoucherInstructions(type as VoucherType),
      }], { session });
      voucher = createdVoucher;

      // Create CoinTransaction record within transaction
      await CoinTransaction.create([{
        user: userObjectId,
        type: 'spent',
        amount: coinAmount,
        balance: walletUpdate.balance?.available || 0,
        source: 'redemption',
        description: `Redeemed ${coinAmount} coins for ${type.replace('_', ' ')}`,
        metadata: {
          voucherId: voucher._id,
          voucherCode,
          voucherType: type,
          voucherValue,
          coinType,
          idempotencyKey,
          ...(offerId && { offerId }),
        },
      }], { session });

      // Atomically increment offer redemptions INSIDE transaction with $lt guard
      // Prevents concurrent redemptions from exceeding totalLimit
      if (offerId) {
        const offerUpdate = await PriveOffer.findOneAndUpdate(
          {
            _id: offerId,
            $or: [
              { totalLimit: { $exists: false } },
              { totalLimit: 0 },
              { $expr: { $lt: ['$redemptions', '$totalLimit'] } }
            ]
          },
          { $inc: { redemptions: 1 } },
          { session, new: true }
        );

        if (!offerUpdate) {
          // Offer limit exceeded — abort entire transaction (wallet deduction + voucher rolled back)
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            success: false,
            error: 'This offer has reached its redemption limit',
          });
        }
      }

      await session.commitTransaction();
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }

    // Emit offer_redeemed event for mission progress tracking
    gamificationEventBus.emit('offer_redeemed', {
      userId,
      entityId: voucher._id.toString(),
      entityType: 'voucher',
      amount: coinAmount,
      metadata: { type, partnerId, voucherCode: voucher.code },
      source: { controller: 'priveController', action: 'redeemCoins' },
    });

    // Invalidate wallet cache after mutation
    invalidateWalletCache(userId).catch((err) => logger.error('[PriveCtrl] Wallet cache invalidation failed after coin redemption', { error: err.message, userId }));

    return res.status(200).json({
      success: true,
      data: {
        voucher: {
          id: voucher._id.toString(),
          code: voucher.code,
          type: voucher.type,
          value: voucher.value,
          currency: voucher.currency,
          coinAmount: voucher.coinAmount,
          expiresAt: voucher.expiresAt,
          expiresIn: calculateExpiresIn(voucher.expiresAt),
          status: voucher.status,
          partnerName: voucher.partnerName,
          partnerLogo: voucher.partnerLogo,
          category: voucher.category,
          terms: voucher.terms,
          howToUse: voucher.howToUse,
        },
        wallet: {
          available: walletUpdate.balance?.available || 0,
          total: walletUpdate.balance?.total || 0,
        },
      },
    });
});

// Helper to get voucher terms
const getVoucherTerms = (type: VoucherType): string[] => {
  const terms: Record<VoucherType, string[]> = {
    gift_card: [
      'Valid for single use only',
      'Cannot be combined with other offers',
      'Non-transferable and non-refundable',
      'Check partner terms for restrictions',
    ],
    bill_pay: [
      'Apply at checkout to reduce bill amount',
      'Valid for single use only',
      'Cannot be exchanged for cash',
      'Valid only at participating stores',
    ],
    experience: [
      'Book your experience within validity period',
      'Subject to availability',
      'Non-refundable once booked',
      'Valid for specified number of guests',
    ],
    charity: [
      'Donation will be made within 7 days',
      'Tax receipt will be emailed',
      'Donation is non-refundable',
      'Thank you for your generosity!',
    ],
  };
  return terms[type];
};

// Helper to get voucher instructions
const getVoucherInstructions = (type: VoucherType): string => {
  const instructions: Record<VoucherType, string> = {
    gift_card: 'Present this voucher code at checkout or enter it in the promo code field when shopping online.',
    bill_pay: 'Show this voucher to the merchant at checkout. They will apply the discount to your bill.',
    experience: 'Contact the experience provider with your voucher code to book your preferred date and time.',
    charity: 'Your donation will be automatically processed. You will receive a confirmation email shortly.',
  };
  return instructions[type];
};

/**
 * GET /api/prive/vouchers
 * Get user's voucher history
 */
export const getVouchers = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const { status, type, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Build query
    const query: any = { userId: userObjectId };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    // Get total count
    const total = await PriveVoucher.countDocuments(query);

    // Get vouchers with pagination
    const vouchers = await PriveVoucher.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    // Get active vouchers count
    const activeCount = await PriveVoucher.countDocuments({
      userId: userObjectId,
      status: 'active',
      expiresAt: { $gt: new Date() },
    });

    // Format vouchers
    const formattedVouchers = vouchers.map((voucher: any) => ({
      id: voucher._id.toString(),
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      currency: voucher.currency,
      coinAmount: voucher.coinAmount,
      status: voucher.status,
      expiresAt: voucher.expiresAt,
      expiresIn: voucher.status === 'active' ? calculateExpiresIn(voucher.expiresAt) : null,
      usedAt: voucher.usedAt,
      partnerName: voucher.partnerName,
      partnerLogo: voucher.partnerLogo,
      category: voucher.category,
      terms: voucher.terms,
      howToUse: voucher.howToUse,
      createdAt: voucher.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        vouchers: formattedVouchers,
        stats: {
          active: activeCount,
          total,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
});

/**
 * GET /api/prive/vouchers/:id
 * Get single voucher details
 */
export const getVoucherById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid voucher ID',
      });
    }

    const voucher = await PriveVoucher.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (!voucher) {
      return res.status(404).json({
        success: false,
        error: 'Voucher not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: voucher._id.toString(),
        code: voucher.code,
        type: voucher.type,
        value: voucher.value,
        currency: voucher.currency,
        coinAmount: voucher.coinAmount,
        status: voucher.status,
        expiresAt: voucher.expiresAt,
        expiresIn: voucher.status === 'active' ? calculateExpiresIn(voucher.expiresAt) : null,
        usedAt: voucher.usedAt,
        partnerName: voucher.partnerName,
        partnerLogo: voucher.partnerLogo,
        category: voucher.category,
        terms: voucher.terms,
        howToUse: voucher.howToUse,
        createdAt: voucher.createdAt,
      },
    });
});

/**
 * POST /api/prive/vouchers/:id/use
 * Mark a voucher as used
 */
export const markVoucherUsed = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid voucher ID',
      });
    }

    const voucher = await PriveVoucher.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        error: 'Voucher not found',
      });
    }

    if (voucher.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: `Voucher is already ${voucher.status}`,
      });
    }

    if (new Date() > voucher.expiresAt) {
      voucher.status = 'expired';
      await voucher.save();
      return res.status(400).json({
        success: false,
        error: 'Voucher has expired',
      });
    }

    // Mark as used
    voucher.status = 'used';
    voucher.usedAt = new Date();
    await voucher.save();

    return res.status(200).json({
      success: true,
      message: 'Voucher marked as used',
      data: {
        id: voucher._id.toString(),
        code: voucher.code,
        status: voucher.status,
        usedAt: voucher.usedAt,
      },
    });
});

// ==========================================
// Redemption Config & Catalog
// ==========================================

/**
 * GET /api/prive/redeem-config
 * Returns server-side redemption configuration (conversion rates, min coins, etc.)
 */
export const getRedeemConfig = asyncHandler(async (req: Request, res: Response) => {
    // 6B: Use cached WalletConfig (5min Redis TTL) instead of direct DB read
    const config = await getCachedWalletConfig();
    const rc = config?.redemptionConfig;

    return res.status(200).json({
      success: true,
      data: {
        conversionRates: rc?.conversionRates || { gift_card: 0.10, bill_pay: 0.10, experience: 0.12, charity: 0.15 },
        minCoinsPerCategory: rc?.minCoinsPerCategory || { gift_card: 500, bill_pay: 100, experience: 1000, charity: 100 },
        maxCoinsPerRedemption: rc?.maxCoinsPerRedemption || 50000,
        dailyRedemptionLimit: rc?.dailyRedemptionLimit || 5,
        enabledCategories: rc?.enabledCategories || ['gift_card', 'bill_pay', 'experience', 'charity'],
        expiryDays: rc?.expiryDays || { gift_card: 365, bill_pay: 30, experience: 90, charity: 7 },
        currency: process.env.PLATFORM_CURRENCY || 'INR',
      },
    });
});

/**
 * GET /api/prive/catalog
 * Returns server-side redemption catalog (gift cards, experiences, charities)
 * Currently returns static catalog; can be extended to read from DB collection.
 */
export const getCatalog = asyncHandler(async (_req: Request, res: Response) => {
    // Use cached WalletConfig (5min Redis TTL) instead of direct DB read
    const config = await getCachedWalletConfig();
    const enabledCategories = config?.redemptionConfig?.enabledCategories || ['gift_card', 'bill_pay', 'experience', 'charity'];

    // Static catalog served from backend (single source of truth)
    const catalog = {
      giftCards: [
        { id: 'amazon', name: 'Amazon', logo: '🛒', minCoins: 500, denominations: [500, 1000, 2000, 5000] },
        { id: 'flipkart', name: 'Flipkart', logo: '📦', minCoins: 500, denominations: [500, 1000, 2000, 5000] },
        { id: 'swiggy', name: 'Swiggy', logo: '🍔', minCoins: 300, denominations: [300, 500, 1000, 2000] },
        { id: 'zomato', name: 'Zomato', logo: '🍕', minCoins: 300, denominations: [300, 500, 1000, 2000] },
        { id: 'myntra', name: 'Myntra', logo: '👗', minCoins: 500, denominations: [500, 1000, 2000] },
        { id: 'bookmyshow', name: 'BookMyShow', logo: '🎬', minCoins: 200, denominations: [200, 500, 1000] },
      ],
      experiences: [
        { id: 'spa', name: 'Luxury Spa Day', description: 'Full day spa experience at premium wellness centers', icon: '🧖', coinCost: 5000, value: 600, highlights: ['Full body massage', 'Facial treatment', 'Sauna access'] },
        { id: 'dining', name: 'Fine Dining Experience', description: '5-course meal at top-rated restaurants', icon: '🍽️', coinCost: 3000, value: 360, highlights: ['5-course tasting menu', 'Wine pairing', "Chef's table"] },
        { id: 'staycation', name: 'Weekend Staycation', description: 'One night at premium hotels', icon: '🏨', coinCost: 8000, value: 960, highlights: ['Luxury room', 'Breakfast included', 'Late checkout'] },
        { id: 'adventure', name: 'Adventure Activity', description: 'Thrilling outdoor adventures', icon: '🎢', coinCost: 2000, value: 240, highlights: ['Choice of activity', 'Professional guide', 'Safety gear'] },
        { id: 'concert', name: 'Premium Event Tickets', description: 'VIP access to concerts & shows', icon: '🎵', coinCost: 4000, value: 480, highlights: ['VIP seating', 'Backstage access', 'Meet & greet'] },
        { id: 'workshop', name: 'Exclusive Workshop', description: 'Learn from industry experts', icon: '🎨', coinCost: 1500, value: 180, highlights: ['Expert instruction', 'Materials included', 'Certificate'] },
      ],
      charities: [
        { id: 'education', name: 'Education for All', description: "Support underprivileged children's education", icon: '📚', category: 'Education' },
        { id: 'hunger', name: 'Feeding India', description: 'Provide meals to those in need', icon: '🍚', category: 'Food' },
        { id: 'health', name: 'Health Foundation', description: 'Medical care for underserved communities', icon: '🏥', category: 'Healthcare' },
        { id: 'environment', name: 'Green Earth Initiative', description: 'Plant trees and protect wildlife', icon: '🌱', category: 'Environment' },
        { id: 'animals', name: 'Animal Welfare', description: 'Shelter and care for stray animals', icon: '🐕', category: 'Animals' },
        { id: 'disaster', name: 'Disaster Relief', description: 'Emergency aid for disaster victims', icon: '🆘', category: 'Emergency' },
      ],
      donationAmounts: [100, 250, 500, 1000, 2500],
      enabledCategories,
    };

    return res.status(200).json({
      success: true,
      data: catalog,
    });
});

/**
 * GET /api/prive/program-config/public
 * Returns public-facing program config (feature flags + tier comparison data)
 */
export const getPublicProgramConfig = asyncHandler(async (req: Request, res: Response) => {
    const config = await getCachedWalletConfig();
    const pc = config?.priveProgramConfig;

    if (!pc) {
      return res.status(200).json({
        success: true,
        data: { featureFlags: {}, tiers: [] },
      });
    }

    res.json({
      success: true,
      data: {
        featureFlags: pc.featureFlags,
        tiers: pc.tiers.map((t: any) => ({
          tier: t.tier,
          displayName: t.displayName,
          color: t.color,
          coinMultiplier: t.coinMultiplier,
          conciergeAccess: t.conciergeAccess,
          conciergeResponseSLA: t.conciergeResponseSLA,
          inviteCodesLimit: t.inviteCodesLimit,
          benefits: t.benefits,
        })),
        tierThresholds: {
          entry: pc.tierThresholds.entryTier,
          signature: pc.tierThresholds.signatureTier,
          elite: pc.tierThresholds.eliteTier,
        },
      },
    });
});

/**
 * GET /api/prive/tier-comparison
 * Returns all tier data with user's current tier highlighted
 */
export const getTierComparison = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const [config, accessCheck] = await Promise.all([
      getCachedWalletConfig(),
      priveAccessService.checkAccess(userId),
    ]);

    const pc = config?.priveProgramConfig;
    const currentTier = accessCheck.effectiveTier || accessCheck.reputation?.tier || 'none';

    const tiers = (pc?.tiers || []).map((t: any) => ({
      tier: t.tier,
      displayName: t.displayName,
      color: t.color,
      coinMultiplier: t.coinMultiplier,
      conciergeAccess: t.conciergeAccess,
      conciergeResponseSLA: t.conciergeResponseSLA,
      inviteCodesLimit: t.inviteCodesLimit,
      benefits: t.benefits,
      isCurrent: t.tier === currentTier,
      threshold: t.tier === 'entry' ? pc?.tierThresholds.entryTier
        : t.tier === 'signature' ? pc?.tierThresholds.signatureTier
        : pc?.tierThresholds.eliteTier,
    }));

    res.json({
      success: true,
      data: {
        currentTier,
        score: accessCheck.reputation?.score || 0,
        tiers,
      },
    });
});
