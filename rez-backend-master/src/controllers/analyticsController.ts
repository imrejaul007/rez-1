import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { logger } from '../config/logger';
import { StoreAnalytics } from '../models/StoreAnalytics';
import { Store } from '../models/Store';
import { sendSuccess, sendNotFound, sendBadRequest, sendCreated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import redisService from '../services/redisService';
import { CacheKeys } from '../utils/cacheHelper';
import { CacheTTL } from '../config/redis';

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
        referrer: req.headers.referer,
      },
      sessionId,
      ipAddress,
    });

    sendCreated(
      res,
      {
        analyticsId: analytics._id,
      },
      'Event tracked successfully',
    );
  } catch (error) {
    logger.error('Track event error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to track event', 500);
  }
});

// Get store analytics (cached - heavy aggregation pipeline)
export const getStoreAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { startDate, endDate, eventType, groupBy = 'day' } = req.query;

  // Verify store exists first
  const store = await Store.findById(storeId).lean();
  if (!store) {
    throw new AppError('Store not found', 404);
  }

  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;
  const groupByStr = groupBy as string;
  const eventTypeStr = (eventType as string) || 'all';

  // Generate cache key based on query params
  const cacheKey = CacheKeys.analyticsStore(
    storeId,
    start?.toISOString() || 'none',
    end?.toISOString() || 'none',
    eventTypeStr,
    groupByStr,
  );

  try {
    // Check cache first
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      logger.debug(`[Analytics] Cache hit for store analytics: ${storeId}`);
      return sendSuccess(res, {
        ...cached,
        cached: true,
      });
    }

    // Cache miss - fetch from DB
    const analytics = await StoreAnalytics.getStoreAnalytics(storeId, {
      startDate: start,
      endDate: end,
      eventType: eventTypeStr,
      groupBy: groupByStr as 'hour' | 'day' | 'week' | 'month',
    });

    const responseData = {
      storeId,
      analytics,
      period: {
        startDate: start,
        endDate: end,
        groupBy: groupByStr,
      },
    };

    // Cache the result (10 min TTL)
    await redisService.set(cacheKey, responseData, CacheTTL.ANALYTICS_STORE);

    sendSuccess(res, {
      ...responseData,
      cached: false,
    });
  } catch (error) {
    logger.error('Get store analytics error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch store analytics', 500);
  }
});

// Get popular stores (cached - heavy aggregation pipeline)
export const getPopularStores = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, eventType, limit = 10 } = req.query;

  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;
  const limitNum = Number(limit);
  const eventTypeStr = (eventType as string) || 'all';

  // Generate cache key
  const cacheKey = CacheKeys.analyticsPopularStores(
    start?.toISOString() || 'none',
    end?.toISOString() || 'none',
    eventTypeStr,
    limitNum,
  );

  try {
    // Check cache first
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      logger.debug('[Analytics] Cache hit for popular stores');
      return sendSuccess(res, {
        ...cached,
        cached: true,
      });
    }

    // Cache miss - fetch from DB
    const popularStores = await StoreAnalytics.getPopularStores({
      startDate: start,
      endDate: end,
      eventType: eventTypeStr,
      limit: limitNum,
    });

    const responseData = {
      popularStores,
      period: {
        startDate: start,
        endDate: end,
        eventType: eventTypeStr,
      },
    };

    // Cache the result (15 min TTL)
    await redisService.set(cacheKey, responseData, CacheTTL.ANALYTICS_POPULAR);

    sendSuccess(res, {
      ...responseData,
      cached: false,
    });
  } catch (error) {
    logger.error('Get popular stores error:', error);
    throw new AppError('Failed to fetch popular stores', 500);
  }
});

// Get user analytics
export const getUserAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { startDate, endDate, eventType } = req.query;

  if (!userId) {
    throw new AppError('Authentication required', 401);
  }

  try {
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const userAnalytics = await StoreAnalytics.getUserAnalytics(userId, {
      startDate: start,
      endDate: end,
      eventType: eventType as string,
    });

    sendSuccess(res, {
      userId,
      analytics: userAnalytics,
      period: {
        startDate: start,
        endDate: end,
        eventType,
      },
    });
  } catch (error) {
    logger.error('Get user analytics error:', error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Failed to fetch user analytics', 500);
  }
});

// Get analytics dashboard data (cached - multiple expensive aggregations)
export const getAnalyticsDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  // Generate cache key
  const cacheKey = CacheKeys.analyticsDashboard(start.toISOString(), end.toISOString());

  try {
    // Check cache first
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      logger.debug('[Analytics] Cache hit for dashboard');
      return sendSuccess(res, {
        dashboard: {
          ...cached,
          cached: true,
        },
      });
    }

    // Cache miss - fetch from DB (multiple expensive aggregations in parallel)
    const [popularStores, totalEvents, uniqueUsers, eventTypeStats] = await Promise.all([
      StoreAnalytics.getPopularStores({ startDate: start, endDate: end, limit: 10 }),
      StoreAnalytics.countDocuments({
        timestamp: { $gte: start, $lte: end },
      }),
      StoreAnalytics.distinct('user', {
        timestamp: { $gte: start, $lte: end },
        user: { $exists: true },
      }),
      StoreAnalytics.aggregate([
        {
          $match: {
            timestamp: { $gte: start, $lte: end },
          },
        },
        {
          $group: {
            _id: '$eventType',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const dashboardData = {
      period: {
        startDate: start,
        endDate: end,
      },
      overview: {
        totalEvents,
        uniqueUsers: uniqueUsers.length,
        popularStores,
        eventTypeStats,
      },
    };

    // Cache the result (10 min TTL)
    await redisService.set(cacheKey, dashboardData, CacheTTL.ANALYTICS_DASHBOARD);

    sendSuccess(res, {
      dashboard: {
        ...dashboardData,
        cached: false,
      },
    });
  } catch (error) {
    logger.error('Get analytics dashboard error:', error);
    throw new AppError('Failed to fetch analytics dashboard', 500);
  }
});

// Get search analytics (cached - aggregation pipeline)
export const getSearchAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, limit = 20 } = req.query;

  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();
  const limitNum = Number(limit);

  // Generate cache key
  const cacheKey = CacheKeys.analyticsSearch(start.toISOString(), end.toISOString(), limitNum);

  try {
    // Check cache first
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      logger.debug('[Analytics] Cache hit for search analytics');
      return sendSuccess(res, {
        searchAnalytics: cached.searchAnalytics,
        period: cached.period,
        cached: true,
      });
    }

    // Cache miss - fetch from DB
    const searchAnalytics = await StoreAnalytics.aggregate([
      {
        $match: {
          eventType: 'search',
          timestamp: { $gte: start, $lte: end },
          'eventData.searchQuery': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$eventData.searchQuery',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
        },
      },
      {
        $project: {
          searchQuery: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limitNum },
    ]);

    const responseData = {
      searchAnalytics,
      period: {
        startDate: start,
        endDate: end,
      },
    };

    // Cache the result (15 min TTL)
    await redisService.set(cacheKey, responseData, CacheTTL.ANALYTICS_SEARCH);

    sendSuccess(res, {
      ...responseData,
      cached: false,
    });
  } catch (error) {
    logger.error('Get search analytics error:', error);
    throw new AppError('Failed to fetch search analytics', 500);
  }
});

// Get category analytics (cached - aggregation pipeline)
export const getCategoryAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  // Generate cache key
  const cacheKey = CacheKeys.analyticsCategory(start.toISOString(), end.toISOString());

  try {
    // Check cache first
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      logger.debug('[Analytics] Cache hit for category analytics');
      return sendSuccess(res, {
        categoryAnalytics: cached.categoryAnalytics,
        period: cached.period,
        cached: true,
      });
    }

    // Cache miss - fetch from DB
    const categoryAnalytics = await StoreAnalytics.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end },
          'eventData.category': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$eventData.category',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
          eventTypes: { $addToSet: '$eventType' },
        },
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueUsers' },
          eventTypes: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    const responseData = {
      categoryAnalytics,
      period: {
        startDate: start,
        endDate: end,
      },
    };

    // Cache the result (10 min TTL)
    await redisService.set(cacheKey, responseData, CacheTTL.ANALYTICS_CATEGORY);

    sendSuccess(res, {
      ...responseData,
      cached: false,
    });
  } catch (error) {
    logger.error('Get category analytics error:', error);
    throw new AppError('Failed to fetch category analytics', 500);
  }
});

// Export analytics report as PDF
export const exportAnalyticsPDF = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate ? new Date(endDate as string) : new Date();

  try {
    // Fetch analytics data in parallel
    const [popularStores, totalEvents, uniqueUsers, eventTypeStats, searchAnalytics, categoryAnalytics] =
      await Promise.all([
        StoreAnalytics.getPopularStores({ startDate: start, endDate: end, limit: 10 }),
        StoreAnalytics.countDocuments({
          timestamp: { $gte: start, $lte: end },
        }),
        StoreAnalytics.distinct('user', {
          timestamp: { $gte: start, $lte: end },
          user: { $exists: true },
        }),
        StoreAnalytics.aggregate([
          {
            $match: {
              timestamp: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: '$eventType',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),
        StoreAnalytics.aggregate([
          {
            $match: {
              eventType: 'search',
              timestamp: { $gte: start, $lte: end },
              'eventData.searchQuery': { $exists: true, $ne: null },
            },
          },
          { $group: { _id: '$eventData.searchQuery', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        StoreAnalytics.aggregate([
          {
            $match: {
              timestamp: { $gte: start, $lte: end },
              'eventData.category': { $exists: true, $ne: null },
            },
          },
          { $group: { _id: '$eventData.category', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers for PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="analytics-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.pdf"`,
    );

    // Pipe the PDF to the response
    doc.pipe(res);

    // Title
    doc.fontSize(24).font('Helvetica-Bold').text('Analytics Report', { align: 'center' });
    doc.moveDown();

    // Report period
    doc
      .fontSize(12)
      .font('Helvetica')
      .text(`Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(2);

    // Overview Section
    doc.fontSize(16).font('Helvetica-Bold').text('Overview');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Total Events: ${totalEvents}`);
    doc.text(`Unique Users: ${uniqueUsers.length}`);
    doc.text(`Popular Stores Tracked: ${popularStores.length}`);
    doc.moveDown();

    // Event Type Statistics
    doc.fontSize(16).font('Helvetica-Bold').text('Event Type Statistics');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    for (const stat of eventTypeStats) {
      doc.text(`${stat._id}: ${stat.count}`);
    }
    doc.moveDown();

    // Top Popular Stores
    doc.fontSize(16).font('Helvetica-Bold').text('Top 10 Popular Stores');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    if (popularStores.length > 0) {
      for (let i = 0; i < Math.min(10, popularStores.length); i++) {
        const store = popularStores[i];
        doc.text(`${i + 1}. Store ID: ${store._id} - Total Events: ${store.totalEvents}`);
      }
    } else {
      doc.text('No store data available');
    }
    doc.moveDown();

    // Top Search Queries
    doc.fontSize(16).font('Helvetica-Bold').text('Top 10 Search Queries');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    if (searchAnalytics.length > 0) {
      for (let i = 0; i < searchAnalytics.length; i++) {
        const query = searchAnalytics[i];
        doc.text(`${i + 1}. "${query._id}": ${query.count} searches`);
      }
    } else {
      doc.text('No search data available');
    }
    doc.moveDown();

    // Category Statistics
    doc.fontSize(16).font('Helvetica-Bold').text('Category Statistics');
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica');
    if (categoryAnalytics.length > 0) {
      for (const cat of categoryAnalytics.slice(0, 10)) {
        doc.text(`${cat._id}: ${cat.count} events`);
      }
    } else {
      doc.text('No category data available');
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').fillColor('gray');
    doc.text(`Report generated on ${new Date().toLocaleString()}`, { align: 'center' });

    // Finalize PDF
    doc.end();

    logger.info('[Analytics] PDF report exported successfully');
  } catch (error) {
    logger.error('Export analytics PDF error:', error);
    throw new AppError('Failed to export analytics PDF', 500);
  }
});
