import { logger } from '../config/logger';
import { Request, Response } from 'express';
import { Wishlist } from '../models/Wishlist';
import { Store } from '../models/Store';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { sendSuccess, sendNotFound, sendBadRequest, sendForbidden } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

/**
 * @route   GET /api/stores/:storeId/followers/count
 * @desc    Get total follower count for a store
 * @access  Private (Merchant)
 */
export const getFollowerCount = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = req.userId!;

  try {
    // Verify store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Verify user is the store owner
    if (store.merchantId?.toString() !== userId) {
      return sendForbidden(res, 'You do not have permission to view this store\'s follower stats');
    }

    // Count followers - users who have this store in their wishlist
    const followersCount = await Wishlist.countDocuments({
      'items.itemType': 'Store',
      'items.itemId': storeId
    });

    sendSuccess(res, { followersCount }, 'Follower count retrieved successfully');
  } catch (error) {
    logger.error('Error getting follower count:', error);
    throw new AppError('Failed to get follower count', 500);
  }
});

/**
 * @route   GET /api/stores/:storeId/followers/list
 * @desc    Get paginated list of followers for a store
 * @access  Private (Merchant)
 */
export const getFollowersList = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = req.userId!;
  const { page = 1, limit = 20 } = req.query;

  try {
    // Verify store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Verify user is the store owner
    if (store.merchantId?.toString() !== userId) {
      return sendForbidden(res, 'You do not have permission to view this store\'s followers');
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Find all wishlists containing this store
    const wishlists = await Wishlist.find({
      'items.itemType': 'Store',
      'items.itemId': storeId
    })
      .populate('user', 'profile.firstName profile.lastName profile.avatar')
      .sort({ 'items.addedAt': -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Transform data to include follower info with followedAt date
    const followers = wishlists.map((wishlist: any) => {
      const storeItem = wishlist.items.find(
        (item: any) => item.itemType === 'Store' && item.itemId.toString() === storeId
      );

      return {
        userId: wishlist.user._id,
        name: `${wishlist.user.profile?.firstName || ''} ${wishlist.user.profile?.lastName || ''}`.trim() || 'User',
        profilePicture: wishlist.user.profile?.avatar || null,
        followedAt: storeItem?.addedAt || wishlist.createdAt
      };
    });

    // Get total count for pagination
    const total = await Wishlist.countDocuments({
      'items.itemType': 'Store',
      'items.itemId': storeId
    });

    sendSuccess(res, {
      followers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    }, 'Followers list retrieved successfully');
  } catch (error) {
    logger.error('Error getting followers list:', error);
    throw new AppError('Failed to get followers list', 500);
  }
});

/**
 * @route   GET /api/stores/:storeId/followers/analytics
 * @desc    Get follower analytics for a store
 * @access  Private (Merchant)
 */
export const getFollowerAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = req.userId!;

  try {
    // Verify store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Verify user is the store owner
    if (store.merchantId?.toString() !== userId) {
      return sendForbidden(res, 'You do not have permission to view this store\'s analytics');
    }

    // Get follower count efficiently (DB-side count, no full doc fetch)
    const totalFollowers = await Wishlist.countDocuments({
      'items.itemType': 'Store',
      'items.itemId': storeId
    });

    // Get recent followers only (capped at 500 for analytics)
    const wishlists = await Wishlist.find({
      'items.itemType': 'Store',
      'items.itemId': storeId
    }).limit(500).lean();

    // Calculate followers this week and month
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let followersThisWeek = 0;
    let followersThisMonth = 0;

    wishlists.forEach((wishlist: any) => {
      const storeItem = wishlist.items.find(
        (item: any) => item.itemType === 'Store' && item.itemId.toString() === storeId
      );

      if (storeItem?.addedAt) {
        const followDate = new Date(storeItem.addedAt);
        if (followDate >= oneWeekAgo) followersThisWeek++;
        if (followDate >= oneMonthAgo) followersThisMonth++;
      }
    });

    // Calculate growth rate (followers this month vs previous month)
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    let followersPreviousMonth = 0;

    wishlists.forEach((wishlist: any) => {
      const storeItem = wishlist.items.find(
        (item: any) => item.itemType === 'Store' && item.itemId.toString() === storeId
      );

      if (storeItem?.addedAt) {
        const followDate = new Date(storeItem.addedAt);
        if (followDate >= twoMonthsAgo && followDate < oneMonthAgo) {
          followersPreviousMonth++;
        }
      }
    });

    const growthRate = followersPreviousMonth > 0
      ? ((followersThisMonth - followersPreviousMonth) / followersPreviousMonth) * 100
      : followersThisMonth > 0 ? 100 : 0;

    // Generate followers over time data (last 30 days)
    const followersOverTime: { date: string; count: number }[] = [];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group followers by date
    const followersByDate = new Map<string, number>();

    wishlists.forEach((wishlist: any) => {
      const storeItem = wishlist.items.find(
        (item: any) => item.itemType === 'Store' && item.itemId.toString() === storeId
      );

      if (storeItem?.addedAt) {
        const followDate = new Date(storeItem.addedAt);
        if (followDate >= thirtyDaysAgo) {
          const dateStr = followDate.toISOString().split('T')[0];
          followersByDate.set(dateStr, (followersByDate.get(dateStr) || 0) + 1);
        }
      }
    });

    // Fill in all dates with cumulative count
    let cumulativeCount = totalFollowers - followersThisMonth;
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const newFollowers = followersByDate.get(dateStr) || 0;
      cumulativeCount += newFollowers;

      followersOverTime.push({
        date: dateStr,
        count: cumulativeCount
      });
    }

    sendSuccess(res, {
      totalFollowers,
      followersThisWeek,
      followersThisMonth,
      growthRate: Math.round(growthRate * 100) / 100, // Round to 2 decimal places
      followersOverTime
    }, 'Follower analytics retrieved successfully');
  } catch (error) {
    logger.error('Error getting follower analytics:', error);
    throw new AppError('Failed to get follower analytics', 500);
  }
});

/**
 * @route   GET /api/stores/:storeId/followers/top
 * @desc    Get top followers by engagement (orders placed, reviews written)
 * @access  Private (Merchant)
 */
export const getTopFollowers = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = req.userId!;
  const { limit = 10 } = req.query;

  try {
    // Verify store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Verify user is the store owner
    if (store.merchantId?.toString() !== userId) {
      return sendForbidden(res, 'You do not have permission to view this store\'s top followers');
    }

    // Get followers (capped at 100 for top followers display)
    const wishlists = await Wishlist.find({
      'items.itemType': 'Store',
      'items.itemId': storeId
    })
      .populate('user', 'profile.firstName profile.lastName profile.avatar')
      .limit(100)
      .lean();

    if (wishlists.length === 0) {
      return sendSuccess(res, { topFollowers: [] }, 'No followers found');
    }

    // Get user IDs
    const userIds = wishlists.map((w: any) => w.user._id);

    // Get orders placed by these users at this store
    const orders = await Order.find({
      user: { $in: userIds },
      store: storeId,
      status: { $in: ['delivered', 'completed'] }
    }).lean();

    // Get reviews written by these users for this store
    const reviews = await Review.find({
      user: { $in: userIds },
      targetType: 'Store',
      targetId: storeId,
      isApproved: true
    }).lean();

    // Calculate engagement score for each follower
    const followerEngagement = wishlists.map((wishlist: any) => {
      const followerId = wishlist.user._id.toString();

      // Count orders
      const userOrders = orders.filter(
        (order: any) => order.user.toString() === followerId
      );
      const orderCount = userOrders.length;
      const totalSpent = userOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);

      // Count reviews
      const reviewCount = reviews.filter(
        (review: any) => review.user.toString() === followerId
      ).length;

      // Calculate engagement score (weighted)
      // Orders: 10 points each, Reviews: 5 points each, Total spent: 1 point per 100
      const engagementScore = (orderCount * 10) + (reviewCount * 5) + Math.floor(totalSpent / 100);

      const storeItem = wishlist.items.find(
        (item: any) => item.itemType === 'Store' && item.itemId.toString() === storeId
      );

      return {
        userId: wishlist.user._id,
        name: `${wishlist.user.profile?.firstName || ''} ${wishlist.user.profile?.lastName || ''}`.trim() || 'User',
        profilePicture: wishlist.user.profile?.avatar || null,
        followedAt: storeItem?.addedAt || wishlist.createdAt,
        engagement: {
          orderCount,
          reviewCount,
          totalSpent: Math.round(totalSpent * 100) / 100,
          engagementScore
        }
      };
    });

    // Sort by engagement score and limit results
    const topFollowers = followerEngagement
      .sort((a, b) => b.engagement.engagementScore - a.engagement.engagementScore)
      .slice(0, Number(limit));

    sendSuccess(res, { topFollowers }, 'Top followers retrieved successfully');
  } catch (error) {
    logger.error('Error getting top followers:', error);
    throw new AppError('Failed to get top followers', 500);
  }
});
