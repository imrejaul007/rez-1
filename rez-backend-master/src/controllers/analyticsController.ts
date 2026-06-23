import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { StoreAnalytics } from '../models/StoreAnalytics';
import { Store } from '../models/Store';
import { 
  sendSuccess, 
  sendNotFound, 
  sendBadRequest,
  sendCreated 
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';

// Track an analytics event
export const trackEvent = asyncHandler(async (req: Request, res: Response) => {
  const { storeId, eventType, eventData } = req.body;
  const userId = req.user?.id;
  const sessionId = req.headers['x-session-id'] as string;
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!storeId || !eventType) {
    throw new AppError('Store ID and event type are required', 400);
  }

  try {
    // Verify store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    // Track the event
    const analytics = await StoreAnalytics.trackEvent({
      storeId,
      userId,
      eventType,
      eventData: {
        ...eventData,
        userAgent: req.headers['user-agent'],
        referrer: req.headers.referer
      },
      sessionId,
      ipAddress
    });

    sendCreated(res, {
      analyticsId: analytics._id
    }, 'Event tracked successfully');

  } catch (error) {
    logger.error('Track event error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to track event', 500);
  }
});

// Get store analytics
export const getStoreAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { 
    startDate, 
    endDate, 
    eventType, 
    groupBy = 'day' 
  } = req.query;

  try {
    // Verify store exists
    const store = await Store.findById(storeId).lean();
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const analytics = await StoreAnalytics.getStoreAnalytics(storeId, {
      startDate: start,
      endDate: end,
      eventType: eventType as string,
      groupBy: groupBy as 'hour' | 'day' | 'week' | 'month'
    });

    sendSuccess(res, {
      storeId,
      analytics,
      period: {
        startDate: start,
        endDate: end,
        groupBy
      }
    });

  } catch (error) {
    logger.error('Get store analytics error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch store analytics', 500);
  }
});

// Get popular stores
export const getPopularStores = asyncHandler(async (req: Request, res: Response) => {
  const { 
    startDate, 
    endDate, 
    eventType, 
    limit = 10 
  } = req.query;

  try {
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const popularStores = await StoreAnalytics.getPopularStores({
      startDate: start,
      endDate: end,
      eventType: eventType as string,
      limit: Number(limit)
    });

    sendSuccess(res, {
      popularStores,
      period: {
        startDate: start,
        endDate: end,
        eventType
      }
    });

  } catch (error) {
    logger.error('Get popular stores error:', error);
    throw new AppError('Failed to fetch popular stores', 500);
  }
});

// Get user analytics
export const getUserAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { 
    startDate, 
    endDate, 
    eventType 
  } = req.query;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const userAnalytics = await StoreAnalytics.getUserAnalytics(userId, {
      startDate: start,
      endDate: end,
      eventType: eventType as string
    });

    sendSuccess(res, {
      userId,
      analytics: userAnalytics,
      period: {
        startDate: start,
        endDate: end,
        eventType
      }
    });

  } catch (error) {
    logger.error('Get user analytics error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch user analytics', 500);
  }
});

// Get analytics dashboard data
export const getAnalyticsDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { 
    startDate, 
    endDate 
  } = req.query;

  try {
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get various analytics in parallel
    const [
      popularStores,
      totalEvents,
      uniqueUsers,
      eventTypeStats
    ] = await Promise.all([
      StoreAnalytics.getPopularStores({ startDate: start, endDate: end, limit: 10 }),
      StoreAnalytics.countDocuments({ 
        timestamp: { $gte: start, $lte: end } 
      }),
      StoreAnalytics.distinct('user', { 
        timestamp: { $gte: start, $lte: end },
        user: { $exists: true }
      }),
      StoreAnalytics.aggregate([
        { 
          $match: { 
            timestamp: { $gte: start, $lte: end } 
          } 
        },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    sendSuccess(res, {
      dashboard: {
        period: {
          startDate: start,
          endDate: end
        },
        overview: {
          totalEvents,
          uniqueUsers: uniqueUsers.length,
          popularStores,
          eventTypeStats
        }
      }
    });

  } catch (error) {
    logger.error('Get analytics dashboard error:', error);
    throw new AppError('Failed to fetch analytics dashboard', 500);
  }
});

// Get search analytics
export const getSearchAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { 
    startDate, 
    endDate, 
    limit = 20 
  } = req.query;

  try {
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    const end = endDate ? new Date(endDate as string) : new Date();

    const searchAnalytics = await StoreAnalytics.aggregate([
      { 
        $match: { 
          eventType: 'search',
          timestamp: { $gte: start, $lte: end },
          'eventData.searchQuery': { $exists: true, $ne: null }
        } 
      },
      {
        $group: {
          _id: '$eventData.searchQuery',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' }
        }
      },
      {
        $project: {
          searchQuery: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: Number(limit) }
    ]);

    sendSuccess(res, {
      searchAnalytics,
      period: {
        startDate: start,
        endDate: end
      }
    });

  } catch (error) {
    logger.error('Get search analytics error:', error);
    throw new AppError('Failed to fetch search analytics', 500);
  }
});

// Get category analytics
export const getCategoryAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { 
    startDate, 
    endDate 
  } = req.query;

  try {
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate as string) : new Date();

    const categoryAnalytics = await StoreAnalytics.aggregate([
      { 
        $match: { 
          timestamp: { $gte: start, $lte: end },
          'eventData.category': { $exists: true, $ne: null }
        } 
      },
      {
        $group: {
          _id: '$eventData.category',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
          eventTypes: { $addToSet: '$eventType' }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          eventTypes: 1
        }
      },
      { $sort: { count: -1 } }
    ]);

    sendSuccess(res, {
      categoryAnalytics,
      period: {
        startDate: start,
        endDate: end
      }
    });

  } catch (error) {
    logger.error('Get category analytics error:', error);
    throw new AppError('Failed to fetch category analytics', 500);
  }
});
