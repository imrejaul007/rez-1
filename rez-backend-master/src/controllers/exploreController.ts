import { logger } from '../config/logger';
import { Request, Response } from 'express';
import { Activity } from '../models/Activity';
import { Store } from '../models/Store';
import { Review } from '../models/Review';
import { StoreComparison } from '../models/StoreComparison';
import Follow from '../models/Follow';
import {
  sendSuccess,
  sendNotFound
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { MallOffer } from '../models/MallOffer';
import redisService from '../services/redisService';

// Get live stats for explore page (cached 30s — approximate stats don't need real-time accuracy)
const EXPLORE_STATS_CACHE_KEY = 'cache:explore-stats';
const EXPLORE_STATS_TTL = 30;

export const getExploreStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Check Redis cache first
    try {
      const cached = await redisService.get<any>(EXPLORE_STATS_CACHE_KEY);
      if (cached) {
        return sendSuccess(res, cached, 'Explore stats retrieved successfully');
      }
    } catch { /* Redis down — compute fresh */ }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get active users (activities in last 30 minutes)
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Run all queries in parallel
    const [activeUsersCount, todayEarnings, activeDealsCount, nearbyPeopleResult, peopleEarnedTodayResult] = await Promise.all([
      Activity.countDocuments({ createdAt: { $gte: thirtyMinutesAgo } }),
      Activity.aggregate([
        { $match: { createdAt: { $gte: todayStart }, amount: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      MallOffer.countDocuments({ isActive: true, startDate: { $lte: now }, endDate: { $gte: now } }),
      Activity.aggregate([
        { $match: { createdAt: { $gte: oneHourAgo } } },
        { $group: { _id: '$user' } },
        { $count: 'total' },
      ]),
      Activity.aggregate([
        { $match: { createdAt: { $gte: todayStart }, amount: { $gt: 0 } } },
        { $group: { _id: '$user' } },
        { $count: 'total' },
      ]),
    ]);

    const statsData = {
      activeUsers: activeUsersCount,
      earnedToday: todayEarnings[0]?.total || 0,
      dealsLive: activeDealsCount,
      peopleNearby: nearbyPeopleResult[0]?.total || 0,
      peopleEarnedToday: peopleEarnedTodayResult[0]?.total || 0
    };

    // Cache for 30 seconds
    try { await redisService.set(EXPLORE_STATS_CACHE_KEY, statsData, EXPLORE_STATS_TTL); } catch { }

    sendSuccess(res, statsData, 'Explore stats retrieved successfully');
  } catch (error) {
    logger.error('Get explore stats error:', error);
    throw new AppError('Failed to fetch explore stats', 500);
  }
});

// Get verified reviews for explore page
export const getVerifiedReviews = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 5, page = 1 } = req.query;
  const limitNum = Number(limit);
  const pageNum = Number(page);
  const skip = (pageNum - 1) * limitNum;

  try {
    // Get total count for pagination
    const total = await Review.countDocuments({
      verified: true,
      isActive: true,
      moderationStatus: 'approved'
    });

    const reviews = await Review.find({
      verified: true,
      isActive: true,
      moderationStatus: 'approved'
    })
      .select('user store rating comment verified createdAt')
      .populate('user', 'profile.name profile.avatar')
      .populate('store', 'name logo offers.cashback offers.maxCashback')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    // Transform for frontend with real cashback data from store
    const transformedReviews = reviews.map((review: any) => {
      // Get cashback rate from store's offers
      const storeCashbackRate = review.store?.offers?.cashback || 0;

      return {
        id: review._id,
        user: review.user?.profile?.name || 'Anonymous',
        avatar: review.user?.profile?.avatar,
        rating: review.rating,
        review: review.comment,
        store: review.store?.name || 'Unknown Store',
        storeId: review.store?._id,
        storeLogo: review.store?.logo,
        cashback: storeCashbackRate,
        verified: review.verified,
        time: getTimeAgo(review.createdAt)
      };
    });

    const hasMore = skip + reviews.length < total;

    sendSuccess(res, {
      reviews: transformedReviews,
      total,
      hasMore,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    }, 'Verified reviews retrieved successfully');
  } catch (error) {
    logger.error('Get verified reviews error:', error);
    throw new AppError('Failed to fetch verified reviews', 500);
  }
});

// Get featured comparison for explore page
export const getFeaturedComparison = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get a comparison that is actually marked as featured
    let comparison = await StoreComparison.findOne({
      isFeaturedOnExplore: true
    })
      .populate('stores', 'name logo description location ratings offers.cashback operationalInfo')
      .sort({ updatedAt: -1 })
      .lean();

    // If no featured comparison, try to get any recent comparison with 2+ stores
    if (!comparison) {
      comparison = await StoreComparison.findOne({
        'stores.1': { $exists: true } // At least 2 stores
      })
        .populate('stores', 'name logo description location ratings offers.cashback operationalInfo')
        .sort({ updatedAt: -1 })
        .lean();
    }

    if (!comparison) {
      return sendSuccess(res, { comparison: null }, 'No featured comparison available');
    }

    // Transform to include cashbackRate at top level for frontend compatibility
    const transformedComparison = {
      ...comparison,
      stores: (comparison.stores as any[]).map((store: any) => ({
        ...store,
        id: store._id,
        cashbackRate: store.offers?.cashback || 0, // Add cashbackRate for frontend
      }))
    };

    sendSuccess(res, {
      comparison: transformedComparison
    }, 'Featured comparison retrieved successfully');
  } catch (error) {
    logger.error('Get featured comparison error:', error);
    throw new AppError('Failed to fetch featured comparison', 500);
  }
});

// Get friends activity for explore page (or community activity if not logged in)
export const getFriendsActivity = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { limit = 10 } = req.query;

  try {
    let friendIds: string[] = [];
    let activityQuery: any = {};

    // If user is logged in, get their friends' activities
    if (userId) {
      // Get list of users this person follows
      const follows = await Follow.find({ follower: userId })
        .select('following')
        .lean();

      friendIds = follows.map((f: any) => f.following.toString());

      // If user has friends, filter by friends' activities
      if (friendIds.length > 0) {
        activityQuery.user = { $in: friendIds };
      }
    }

    // Get activities (from friends if logged in with friends, otherwise community)
    const activities = await Activity.find(activityQuery)
      .select('user type description title amount metadata createdAt')
      .populate('user', 'profile.name profile.avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Transform activities for frontend with accurate isFriend flag
    const transformedActivities = activities.map((activity: any) => {
      const activityUserId = activity.user?._id?.toString();
      const isFriend = userId ? friendIds.includes(activityUserId) : false;

      return {
        id: activity._id,
        type: activity.type?.toLowerCase() || 'order',
        user: activity.user ? {
          name: activity.user.profile?.name || 'User',
          avatar: activity.user.profile?.avatar
        } : null,
        message: activity.description || activity.title,
        store: activity.metadata?.storeName,
        storeId: activity.metadata?.storeId, // Include storeId for navigation
        amount: activity.amount,
        time: getTimeAgo(activity.createdAt),
        isFriend: isFriend
      };
    });

    sendSuccess(res, {
      activities: transformedActivities
    }, 'Friends activity retrieved successfully');
  } catch (error) {
    logger.error('Get friends activity error:', error);
    throw new AppError('Failed to fetch friends activity', 500);
  }
});

// Get explore page stats summary (partner stores, cashback, etc)
export const getExploreStatsSummary = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get partner stores count (stores with isPartner flag or just active stores)
    const partnerStoresCount = await Store.countDocuments({
      isActive: true,
      'offers.isPartner': true
    });

    // If no partner stores, count all active stores
    const totalStoresCount = partnerStoresCount > 0
      ? partnerStoresCount
      : await Store.countDocuments({ isActive: true });

    // Get max cashback rate from stores with cashback offers
    const maxCashbackStore = await Store.findOne({
      isActive: true,
      'offers.cashback': { $exists: true, $gt: 0 }
    })
      .sort({ 'offers.cashback': -1 })
      .select('offers.cashback')
      .lean();

    // Get total unique users count (from activities) using $group + $count
    const totalUsersResult = await Activity.aggregate([
      { $group: { _id: '$user' } },
      { $count: 'total' }
    ]);

    // Return real values without hardcoded fallbacks
    sendSuccess(res, {
      partnerStores: totalStoresCount,
      maxCashback: maxCashbackStore?.offers?.cashback || 0,
      totalUsers: totalUsersResult[0]?.total || 0
    }, 'Explore stats summary retrieved successfully');
  } catch (error) {
    logger.error('Get explore stats summary error:', error);
    throw new AppError('Failed to fetch explore stats summary', 500);
  }
});

// Helper function to get time ago string
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
}
