import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Transaction } from '../models/Transaction';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import followerNotificationService from '../services/followerNotificationService';

// Helper function to calculate distance between two coordinates
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

// Helper function to format time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
}

// ========================
// FOLLOWER NOTIFICATION ENDPOINTS
// ========================

/**
 * Get follower count for a store
 * GET /api/stores/:storeId/followers/count
 */
export const getStoreFollowerCount = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  try {
    const count = await followerNotificationService.getStoreFollowerCount(storeId);

    sendSuccess(res, { count }, 'Follower count retrieved successfully');
  } catch (error) {
    logger.error('[GET FOLLOWER COUNT] Error:', error);
    throw new AppError('Failed to get follower count', 500);
  }
});

/**
 * Get all followers of a store (Admin/Merchant only)
 * GET /api/stores/:storeId/followers
 */
export const getStoreFollowers = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = (req as any).userId;

  try {
    // Verify user is store owner/merchant
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Check authorization (store owner or admin)
    if (store.merchantId?.toString() !== userId && !(req as any).user?.role?.includes('admin')) {
      throw new AppError('Not authorized to view followers', 403);
    }

    const followerIds = await followerNotificationService.getStoreFollowers(storeId);

    sendSuccess(res, {
      storeId,
      followerCount: followerIds.length,
      followers: followerIds
    }, 'Followers retrieved successfully');
  } catch (error) {
    logger.error('[GET FOLLOWERS] Error:', error);
    throw new AppError('Failed to get followers', 500);
  }
});

/**
 * Send custom notification to all followers
 * POST /api/stores/:storeId/notify-followers
 * Body: { title, message, imageUrl?, deepLink? }
 */
export const sendFollowerNotification = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { title, message, imageUrl, deepLink } = req.body;
  const userId = (req as any).userId;

  try {
    // Verify user is store owner/merchant
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Check authorization (store owner or admin)
    if (store.merchantId?.toString() !== userId && !(req as any).user?.role?.includes('admin')) {
      throw new AppError('Not authorized to send notifications', 403);
    }

    // Validate input
    if (!title || !message) {
      return sendBadRequest(res, 'Title and message are required');
    }

    const result = await followerNotificationService.notifyStoreUpdate(storeId, {
      title,
      message,
      imageUrl
    });

    sendSuccess(res, result, 'Notifications sent successfully');
  } catch (error) {
    logger.error('[SEND FOLLOWER NOTIFICATION] Error:', error);
    throw new AppError('Failed to send notifications', 500);
  }
});

/**
 * Notify followers about a new offer
 * POST /api/stores/:storeId/notify-offer
 * Body: { offerId, title, description?, discount?, imageUrl? }
 */
export const notifyNewOffer = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { offerId, title, description, discount, imageUrl } = req.body;
  const userId = (req as any).userId;

  try {
    // Verify user is store owner/merchant
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Check authorization
    if (store.merchantId?.toString() !== userId && !(req as any).user?.role?.includes('admin')) {
      throw new AppError('Not authorized', 403);
    }

    const result = await followerNotificationService.notifyNewOffer(storeId, {
      _id: offerId,
      title,
      description,
      discount,
      imageUrl
    });

    sendSuccess(res, result, 'Offer notification sent to followers');
  } catch (error) {
    logger.error('[NOTIFY NEW OFFER] Error:', error);
    throw new AppError('Failed to send offer notification', 500);
  }
});

/**
 * Notify followers about a new product
 * POST /api/stores/:storeId/notify-product
 * Body: { productId }
 */
export const notifyNewProduct = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { productId } = req.body;
  const userId = (req as any).userId;

  try {
    // Verify user is store owner/merchant
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Check authorization
    if (store.merchantId?.toString() !== userId && !(req as any).user?.role?.includes('admin')) {
      throw new AppError('Not authorized', 403);
    }

    // Get product details
    const product = await Product.findById(productId).lean() as any;
    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    const result = await followerNotificationService.notifyNewProduct(storeId, {
      _id: product._id,
      name: product.name,
      description: product.description,
      pricing: product.pricing,
      images: product.images,
      slug: product.slug
    });

    sendSuccess(res, result, 'Product notification sent to followers');
  } catch (error) {
    logger.error('[NOTIFY NEW PRODUCT] Error:', error);
    throw new AppError('Failed to send product notification', 500);
  }
});

// Get user's visit count and loyalty info for a specific store
export const getUserStoreVisits = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const userId = (req as any).userId;

  if (!userId) {
    return sendBadRequest(res, 'User authentication required');
  }

  try {
    // Get the store to check loyalty config
    const store = await Store.findById(storeId).select('name rewardRules').lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Count transactions (visits) for this user at this store
    const visitCount = await Transaction.countDocuments({
      user: userId,
      'source.metadata.storeInfo.id': storeId,
      'status.current': 'completed',
      category: { $in: ['spending', 'paybill', 'cashback'] }
    });

    // Get loyalty configuration from store
    const loyaltyConfig = (store as any).rewardRules?.visitMilestoneRewards || [];

    // Find the next reward milestone
    let nextMilestone = null;
    let totalVisitsRequired = 5; // Default
    let nextReward = 'Free Coffee'; // Default

    for (const milestone of loyaltyConfig) {
      if (visitCount < milestone.visits) {
        nextMilestone = milestone;
        totalVisitsRequired = milestone.visits;
        nextReward = milestone.reward || 'Free Reward';
        break;
      }
    }

    // If user completed all milestones, use the last one as reference
    if (!nextMilestone && loyaltyConfig.length > 0) {
      const lastMilestone = loyaltyConfig[loyaltyConfig.length - 1];
      totalVisitsRequired = lastMilestone.visits;
      nextReward = lastMilestone.reward || 'Free Reward';
    }

    // Calculate progress
    const progress = Math.min(visitCount / totalVisitsRequired, 1);
    const visitsRemaining = Math.max(totalVisitsRequired - visitCount, 0);

    return sendSuccess(res, {
      storeId,
      storeName: store.name,
      visitsCompleted: visitCount,
      totalVisitsRequired,
      nextReward,
      visitsRemaining,
      progress,
      hasCompletedMilestone: visitCount >= totalVisitsRequired,
      loyaltyConfig
    }, 'User store visits retrieved successfully');

  } catch (error) {
    logger.error('[GET USER STORE VISITS] Error:', error);
    throw new AppError('Failed to get user store visits', 500);
  }
});

// Get recent earnings by users at a specific store
// Shows "People are earning here" section data
export const getRecentEarnings = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const limit = parseInt(req.query.limit as string) || 5;

  try {
    // Get the store to verify it exists
    const store = await Store.findById(storeId).select('name').lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Get recent transactions for this store
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    const recentTransactions = await Transaction.find({
      'source.metadata.storeInfo.id': storeObjectId,
      'status.current': 'completed',
      category: { $in: ['spending', 'paybill', 'cashback', 'earning'] }
    })
      .populate('user', 'name firstName lastName avatar profilePicture')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Format the response
    const recentEarnings = recentTransactions.map((tx: any) => {
      const user = tx.user || {};
      const userName = user.firstName || user.name?.split(' ')[0] || 'User';
      const amount = Math.abs(tx.amount || 0);
      const coinsEarned = Math.round(amount * 0.05); // 5% coin earning

      // Calculate time ago
      const timeAgo = getTimeAgo(new Date(tx.createdAt));

      return {
        id: tx._id.toString(),
        name: userName,
        avatar: user.avatar || user.profilePicture || null,
        amountEarned: amount,
        coinsEarned,
        timeAgo
      };
    });

    return sendSuccess(res, recentEarnings, 'Recent earnings retrieved successfully');

  } catch (error) {
    logger.error('[GET RECENT EARNINGS] Error:', error);
    throw new AppError('Failed to get recent earnings', 500);
  }
});

// Get nearby stores for homepage - optimized endpoint with all computed fields
// GET /api/stores/nearby-homepage
export const getNearbyStoresForHomepage = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, radius = 2, limit = 5 } = req.query;

  // Validate coordinates
  if (!latitude || !longitude) {
    return sendBadRequest(res, 'Latitude and longitude are required');
  }

  const userLat = Number(latitude);
  const userLng = Number(longitude);

  if (isNaN(userLat) || isNaN(userLng) || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
    return sendBadRequest(res, 'Invalid coordinates provided');
  }

  try {
    // Import StoreVisit model for queue data
    const { StoreVisit } = require('../models/StoreVisit');

    // Use $geoWithin with $centerSphere for geospatial query
    const radiusInRadians = Number(radius) / 6371; // Earth's radius is ~6371 km

    const stores = await Store.find({
      isActive: true,
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[userLng, userLat], radiusInRadians]
        }
      }
    })
      .select('name slug logo location operationalInfo offers rewardRules storeVisitConfig isActive serviceCapabilities bookingConfig bookingType hasStorePickup')
      .limit(Number(limit) * 2) // Fetch more to filter closed stores if needed
      .lean();

    // Get current date/time info for calculations
    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
    const currentMinutes = parseInt(currentTime.split(':')[0]) * 60 + parseInt(currentTime.split(':')[1]);

    // Get today's date range for queue query
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get store IDs for queue aggregation
    const storeIds = stores.map((s: any) => s._id);

    // Aggregate queue counts for all stores in one query
    const queueCounts = await StoreVisit.aggregate([
      {
        $match: {
          storeId: { $in: storeIds },
          visitType: 'queue',
          status: { $in: ['pending', 'checked_in'] },
          visitDate: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: '$storeId',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map of store ID to queue count
    const queueCountMap = new Map<string, number>(
      queueCounts.map((q: any) => [q._id.toString(), q.count as number])
    );

    // Helper function to format distance
    const formatDistance = (distanceKm: number): string => {
      if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)}m`;
      }
      return `${distanceKm.toFixed(1)}km`;
    };

    // Helper function to get wait time string
    const getWaitTimeString = (queueCount: number): string => {
      if (queueCount === 0) return 'No wait';
      if (queueCount <= 2) return '5 min';
      if (queueCount <= 5) return '15 min';
      return `${queueCount * 5} min`;
    };

    // Process stores with computed fields
    const processedStores = stores.map((store: any) => {
      // Calculate distance
      let distance = null;
      let distanceFormatted = '';
      if (store.location?.coordinates && Array.isArray(store.location.coordinates) && store.location.coordinates.length === 2) {
        distance = calculateDistance([userLng, userLat], store.location.coordinates);
        distanceFormatted = formatDistance(distance);
      }

      // Check if store is open
      const todayHours = store.operationalInfo?.hours?.[dayName];
      let isOpen = false;
      let isClosingSoon = false;
      let status = 'Closed';

      if (todayHours && !todayHours.closed && todayHours.open && todayHours.close) {
        isOpen = currentTime >= todayHours.open && currentTime <= todayHours.close;

        if (isOpen) {
          // Check if closing soon (within 30 minutes)
          const closeTime = todayHours.close;
          const closingMinutes = parseInt(closeTime.split(':')[0]) * 60 + parseInt(closeTime.split(':')[1]);
          isClosingSoon = closingMinutes - currentMinutes <= 30 && closingMinutes > currentMinutes;

          status = isClosingSoon ? 'Closing soon' : 'Open';
        }
      }

      // Get queue count for wait time
      const queueCount: number = queueCountMap.get(store._id.toString()) || 0;
      const waitTime = getWaitTimeString(queueCount);

      // Get cashback percentage
      const cashbackPercent = store.offers?.cashback || store.rewardRules?.baseCashbackPercent || 5;
      const cashback = `${cashbackPercent}% cashback`;

      // Check if store is live (has live_availability feature)
      const isLive = store.isActive &&
        (store.storeVisitConfig?.features?.includes('live_availability') ||
          store.storeVisitConfig?.enabled === true);

      return {
        id: store._id.toString(),
        name: store.name,
        distance: distanceFormatted,
        distanceValue: distance, // For sorting
        isLive,
        status,
        waitTime,
        cashback,
        closingSoon: isClosingSoon
      };
    });

    // Filter out stores without valid coordinates and sort by distance
    const validStores = processedStores
      .filter((s: any) => s.distanceValue !== null)
      .sort((a: any, b: any) => a.distanceValue - b.distanceValue)
      .slice(0, Number(limit))
      .map((s: any) => {
        // Remove distanceValue from response (internal use only)
        const { distanceValue, ...rest } = s;
        return rest;
      });

    sendSuccess(res, { stores: validStores }, 'Nearby stores for homepage retrieved successfully');

  } catch (error) {
    logger.error('[GET NEARBY STORES HOMEPAGE] Error:', error);
    throw new AppError('Failed to fetch nearby stores for homepage', 500);
  }
});

/**
 * Get new stores (recently added stores for homepage NewOnRezSection)
 * GET /api/stores/new
 */
export const getNewStores = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 4, days = 30, latitude, longitude } = req.query;

  try {
    logger.info('[GET NEW STORES] Fetching recently added stores...');

    // Calculate the date threshold (stores added within the last X days)
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - Number(days));

    const query: any = {
      isActive: true,
      createdAt: { $gte: dateThreshold }
    };

    let stores = await Store.find(query)
      .populate('category', 'name slug icon')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // If not enough stores from recent days, get any stores sorted by newest
    if (stores.length < Number(limit)) {
      stores = await Store.find({ isActive: true })
        .populate('category', 'name slug icon')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .lean();
    }

    // Calculate distance if location provided
    if (latitude && longitude) {
      const userLat = Number(latitude);
      const userLon = Number(longitude);

      stores = stores.map((store: any) => {
        if (store.location?.coordinates && store.location.coordinates.length === 2) {
          const [storeLon, storeLat] = store.location.coordinates;
          const distance = calculateDistance([userLon, userLat], [storeLon, storeLat]);
          return { ...store, distance: Math.round(distance * 10) / 10 };
        }
        return store;
      });
    }

    // Format for frontend NewOnRezSection
    const formattedStores = stores.map((store: any, index: number) => ({
      id: store._id,
      name: store.name,
      slug: store.slug,
      category: store.category?.name || 'General',
      image: store.logo || store.banner?.[0] || `https://images.unsplash.com/photo-${1441984904996 + index}-e0b6ba687e04?w=400`,
      people: store.analytics?.viewCount || 0,
      cashback: `${store.offers?.cashback || 10}%`,
      rating: store.ratings?.average || 0,
      distance: store.distance,
      isNew: true
    }));

    logger.info(`[GET NEW STORES] Found ${formattedStores.length} new stores`);

    sendSuccess(res, {
      stores: formattedStores,
      total: formattedStores.length,
      // Separate into featured (first store) and small stores for UI
      featuredStore: formattedStores[0] || null,
      smallStores: formattedStores.slice(1, 3),
      horizontalStore: formattedStores[3] || null
    }, 'New stores retrieved successfully');

  } catch (error) {
    logger.error('[GET NEW STORES] Error:', error);
    throw new AppError('Failed to fetch new stores', 500);
  }
});
