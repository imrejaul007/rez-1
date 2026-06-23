/**
 * Analytics Routes — Core section (Phase 6.3)
 *
 * Extracted from the original monolithic analytics.ts. Handles:
 * - /sales/*, /products/top-selling, /categories/performance
 * - /customers/insights, /inventory/status, /payments/breakdown
 * - /forecast/*, /trends/seasonal, /cache/*
 *
 * Other sections: analyticsOverview.ts, analyticsExport.ts.
 */

import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/merchantauth";
import { AnalyticsService } from "../merchantservices/AnalyticsService";
import { PredictiveAnalyticsService } from "../merchantservices/PredictiveAnalyticsService";
import { AnalyticsCacheService } from "../merchantservices/AnalyticsCacheService";
import { Store } from "../models/Store";
import { logger } from "../config/logger";
import { calculateTrend, calculateGrowth, getStoreId, parseDateRange } from "./analyticsHelpers";

const router = Router();

router.use(authMiddleware);

router.get('/sales/overview', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { startDate, endDate } = parseDateRange(req.query);

    const overview = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getSalesOverviewKey(storeId, startDate, endDate),
      () => AnalyticsService.getSalesOverview(storeId, startDate, endDate),
      { ttl: 900 } // 15 minutes
    );

    // Ensure overview has required fields
    const overviewData = {
      totalRevenue: overview?.totalRevenue ?? 0,
      totalOrders: overview?.totalOrders ?? 0,
      averageOrderValue: overview?.averageOrderValue ?? 0,
      totalItems: overview?.totalItems ?? 0,
      previousPeriodRevenue: overview?.previousPeriodRevenue ?? 0,
      previousPeriodOrders: overview?.previousPeriodOrders ?? 0,
      revenueGrowth: overview?.revenueGrowth ?? 0,
      ordersGrowth: overview?.ordersGrowth ?? 0,
      period: overview?.period ?? { start: startDate, end: endDate }
    };

    return res.status(200).json({
      success: true,
      data: overviewData
    });
  } catch (error) {
    logger.error('Error fetching sales overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales overview',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

/**
 * @route   GET /api/analytics/sales/trends
 * @desc    Get revenue trends over time
 * @access  Private
 */
router.get('/sales/trends', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { period = 'daily', days = '30' } = req.query;
    const periodValue = period as 'daily' | 'weekly' | 'monthly';
    const daysValue = parseInt(days as string);

    const trends = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getRevenueTrendsKey(storeId, periodValue, daysValue),
      () => AnalyticsService.getRevenueTrends(storeId, periodValue, daysValue),
      { ttl: 900 }
    );

    // Ensure we always return an array
    const trendsArray = Array.isArray(trends) ? trends : [];

    return res.status(200).json({
      success: true,
      data: trendsArray
    });
  } catch (error) {
    logger.error('Error fetching sales trends:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales trends',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

/**
 * @route   GET /api/analytics/sales/by-time
 * @desc    Get sales breakdown by time of day
 * @access  Private
 */
router.get('/sales/by-time', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const salesByTime = await AnalyticsService.getSalesByTimeOfDay(storeId);

    // Ensure we always return an array
    const salesArray = Array.isArray(salesByTime) ? salesByTime : [];

    return res.status(200).json({
      success: true,
      data: salesArray
    });
  } catch (error) {
    logger.error('Error fetching sales by time:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales by time',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

/**
 * @route   GET /api/analytics/sales/by-day
 * @desc    Get sales breakdown by day of week
 * @access  Private
 */
router.get('/sales/by-day', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const salesByDay = await AnalyticsService.getSalesByDayOfWeek(storeId);

    // Ensure we always return an array
    const salesArray = Array.isArray(salesByDay) ? salesByDay : [];

    return res.status(200).json({
      success: true,
      data: salesArray
    });
  } catch (error) {
    logger.error('Error fetching sales by day:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales by day',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== PRODUCT ANALYTICS ====================

/**
 * @route   GET /api/analytics/products/top-selling
 * @desc    Get top selling products
 * @access  Private
 */
router.get('/products/top-selling', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { limit = '10', sortBy = 'revenue' } = req.query;
    const limitValue = parseInt(limit as string);
    const sortByValue = sortBy as 'quantity' | 'revenue';

    const topProducts = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getTopProductsKey(storeId, limitValue, sortByValue),
      () => AnalyticsService.getTopSellingProducts(storeId, limitValue, sortByValue),
      { ttl: 1800 } // 30 minutes
    );

    // Ensure we always return an array
    const productsArray = Array.isArray(topProducts) ? topProducts : [];

    return res.status(200).json({
      success: true,
      data: productsArray
    });
  } catch (error) {
    logger.error('Error fetching top selling products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top selling products',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== CATEGORY ANALYTICS ====================

/**
 * @route   GET /api/analytics/categories/performance
 * @desc    Get category performance metrics
 * @access  Private
 */
router.get('/categories/performance', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const categoryPerformance = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getCategoryPerformanceKey(storeId),
      () => AnalyticsService.getCategoryPerformance(storeId),
      { ttl: 1800 }
    );

    // Ensure we always return an array
    const categoriesArray = Array.isArray(categoryPerformance) ? categoryPerformance : [];

    return res.status(200).json({
      success: true,
      data: categoriesArray
    });
  } catch (error) {
    logger.error('Error fetching category performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category performance',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== CUSTOMER ANALYTICS ====================

/**
 * @route   GET /api/analytics/customers/insights
 * @desc    Get comprehensive customer insights - LTV, retention, churn, segments
 * @access  Private
 */
router.get('/customers/insights', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { startDate, endDate } = parseDateRange(req.query);
    const Order = require('../models/Order').Order;
    const ObjectId = require('mongoose').Types.ObjectId;

    // Get all customer data from orders
    const customerStats = await Order.aggregate([
      {
        $match: {
          'items.store': new ObjectId(storeId),
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.store': new ObjectId(storeId)
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $group: {
          _id: '$user',
          email: { $first: { $arrayElemAt: ['$userInfo.email', 0] } },
          phone: { $first: { $arrayElemAt: ['$userInfo.phoneNumber', 0] } },
          orderIds: { $addToSet: '$_id' },
          totalSpent: { $sum: '$items.subtotal' },
          lastOrderDate: { $max: '$createdAt' },
          firstOrderDate: { $min: '$createdAt' },
          orders: { $push: { date: '$createdAt', amount: '$items.subtotal' } }
        }
      },
      {
        $project: {
          _id: 0,
          customerId: { $toString: '$_id' },
          email: { $ifNull: ['$email', 'customer@example.com'] },
          phone: '$phone',
          totalOrders: { $size: '$orderIds' },
          totalSpent: { $round: ['$totalSpent', 2] },
          lastOrderDate: 1,
          firstOrderDate: 1,
          orders: 1
        }
      }
    ]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Basic counts
    const totalCustomers = customerStats.length;
    const newCustomers = customerStats.filter((c: any) => c.firstOrderDate >= thirtyDaysAgo).length;
    const activeCustomers = customerStats.filter((c: any) => c.lastOrderDate >= thirtyDaysAgo).length;
    const inactiveCustomers = customerStats.filter((c: any) =>
      c.lastOrderDate < thirtyDaysAgo && c.lastOrderDate >= ninetyDaysAgo
    ).length;
    const churnedCustomers = customerStats.filter((c: any) => c.lastOrderDate < ninetyDaysAgo).length;

    // LTV Calculations
    const HIGH_VALUE_THRESHOLD = 5000;
    const totalRevenue = customerStats.reduce((sum: number, c: any) => sum + c.totalSpent, 0);
    const averageLTV = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const highValueCustomers = customerStats.filter((c: any) => c.totalSpent >= HIGH_VALUE_THRESHOLD);
    const highValueCount = highValueCustomers.length;

    // Top 10 customers for LTV tab
    const ltv90Days = customerStats
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((c: any) => {
        const avgOrderValue = c.totalOrders > 0 ? c.totalSpent / c.totalOrders : 0;
        let segment = 'low_value';
        if (c.totalSpent >= HIGH_VALUE_THRESHOLD) segment = 'high_value';
        else if (c.totalSpent >= 1000) segment = 'medium_value';

        // Predict next purchase based on average frequency
        let nextPredictedPurchase = null;
        if (c.totalOrders > 1) {
          const daysBetweenOrders = (new Date(c.lastOrderDate).getTime() - new Date(c.firstOrderDate).getTime())
            / (1000 * 60 * 60 * 24) / (c.totalOrders - 1);
          const nextDate = new Date(c.lastOrderDate);
          nextDate.setDate(nextDate.getDate() + Math.round(daysBetweenOrders));
          if (nextDate > now) nextPredictedPurchase = nextDate.toISOString();
        }

        return {
          customerId: c.customerId,
          email: c.email,
          totalPurchases: c.totalOrders,
          totalSpent: c.totalSpent,
          averageOrderValue: Math.round(avgOrderValue * 100) / 100,
          estimatedLTV: c.totalSpent, // Simple LTV = total spent
          segment,
          nextPredictedPurchase
        };
      });

    // Retention Calculations
    const repeatCustomers = customerStats.filter((c: any) => c.totalOrders > 1);
    const repeatCustomerCount = repeatCustomers.length;
    const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomerCount / totalCustomers) * 100 : 0;
    const overallRetentionRate = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;

    // Cohort retention analysis (last 6 months)
    const cohorts: any[] = [];
    for (let i = 0; i < 6; i++) {
      const cohortStart = new Date(now);
      cohortStart.setMonth(cohortStart.getMonth() - i - 1);
      cohortStart.setDate(1);
      cohortStart.setHours(0, 0, 0, 0);

      const cohortEnd = new Date(cohortStart);
      cohortEnd.setMonth(cohortEnd.getMonth() + 1);

      const cohortCustomers = customerStats.filter((c: any) =>
        c.firstOrderDate >= cohortStart && c.firstOrderDate < cohortEnd
      );

      if (cohortCustomers.length > 0) {
        const retainedCustomers = cohortCustomers.filter((c: any) => c.totalOrders > 1);
        const avgRetentionRate = (retainedCustomers.length / cohortCustomers.length) * 100;

        // Create retention timeline (Day 7, 14, 30, 60, 90)
        const retention = [7, 14, 30, 60, 90].map(day => {
          const checkDate = new Date(cohortStart);
          checkDate.setDate(checkDate.getDate() + day);
          const retained = cohortCustomers.filter((c: any) =>
            c.lastOrderDate >= checkDate || c.totalOrders > 1
          ).length;
          return {
            day,
            percentage: Math.round((retained / cohortCustomers.length) * 100 * 10) / 10
          };
        });

        cohorts.push({
          cohortDate: cohortStart.toISOString(),
          cohortSize: cohortCustomers.length,
          avgRetentionRate: Math.round(avgRetentionRate * 10) / 10,
          retention
        });
      }
    }

    // Churn Calculations
    const churnRate = totalCustomers > 0 ? (churnedCustomers / totalCustomers) * 100 : 0;

    // At-risk customers (no orders in 30-90 days)
    const atRiskCustomers = customerStats.filter((c: any) => {
      const daysSinceLastPurchase = Math.floor(
        (now.getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysSinceLastPurchase >= 30 && daysSinceLastPurchase < 90;
    });
    const atRiskCount = atRiskCustomers.length;

    // Churn predictions
    const predictions = customerStats
      .map((c: any) => {
        const daysSinceLastPurchase = Math.floor(
          (now.getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate churn probability based on days since last purchase
        let churnProbability = 0;
        let riskLevel = 'low';
        const reasons: string[] = [];
        const recommendedActions: string[] = [];

        if (daysSinceLastPurchase >= 90) {
          churnProbability = 90;
          riskLevel = 'critical';
          reasons.push('No activity for 90+ days');
          recommendedActions.push('Send win-back campaign with special offer');
        } else if (daysSinceLastPurchase >= 60) {
          churnProbability = 70;
          riskLevel = 'high';
          reasons.push('No activity for 60+ days');
          recommendedActions.push('Send personalized re-engagement email');
        } else if (daysSinceLastPurchase >= 30) {
          churnProbability = 40;
          riskLevel = 'medium';
          reasons.push('No activity for 30+ days');
          recommendedActions.push('Send reminder about new products/offers');
        } else {
          churnProbability = 10;
          riskLevel = 'low';
        }

        // Adjust based on order frequency
        if (c.totalOrders === 1) {
          churnProbability = Math.min(100, churnProbability + 20);
          reasons.push('Single purchase customer');
          recommendedActions.push('Offer first-repeat purchase discount');
        }

        return {
          customerId: c.customerId,
          email: c.email || `customer_${c.customerId.substring(0, 6)}@example.com`,
          lastPurchaseDate: c.lastOrderDate,
          daysSinceLastPurchase,
          churnProbability,
          riskLevel,
          reasons,
          recommendedActions
        };
      })
      .filter((c: any) => c.churnProbability >= 30) // Only show medium+ risk
      .sort((a: any, b: any) => b.churnProbability - a.churnProbability)
      .slice(0, 20);

    // Customer Segments
    const segments = {
      highValue: customerStats.filter((c: any) => c.totalSpent >= HIGH_VALUE_THRESHOLD).length,
      mediumValue: customerStats.filter((c: any) => c.totalSpent >= 1000 && c.totalSpent < HIGH_VALUE_THRESHOLD).length,
      lowValue: customerStats.filter((c: any) => c.totalSpent > 0 && c.totalSpent < 1000).length,
      dormant: inactiveCustomers,
      new: newCustomers
    };

    // Find top segment
    const segmentCounts = Object.entries(segments);
    const topSegmentEntry = segmentCounts.sort((a, b) => b[1] - a[1])[0];
    const topSegment = topSegmentEntry ? topSegmentEntry[0].replace(/([A-Z])/g, ' $1').trim() : 'N/A';

    // Summary calculations
    const customerAges = customerStats.map((c: any) =>
      Math.floor((now.getTime() - new Date(c.firstOrderDate).getTime()) / (1000 * 60 * 60 * 24))
    );
    const averageCustomerAge = customerAges.length > 0
      ? Math.round(customerAges.reduce((a: number, b: number) => a + b, 0) / customerAges.length)
      : 0;
    const avgOrdersPerCustomer = totalCustomers > 0
      ? customerStats.reduce((sum: number, c: any) => sum + c.totalOrders, 0) / totalCustomers
      : 0;
    const avgSpendPerCustomer = averageLTV;

    // Build complete response
    const insightsData = {
      timeRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      totalCustomers,
      newCustomers,
      activeCustomers,
      inactiveCustomers,
      churnedCustomers,
      ltv: {
        averageLTV: Math.round(averageLTV * 100) / 100,
        highValueCount,
        highValueThreshold: HIGH_VALUE_THRESHOLD,
        ltv90Days
      },
      retention: {
        overallRetentionRate: Math.round(overallRetentionRate * 10) / 10,
        cohorts,
        repeatCustomerRate: Math.round(repeatCustomerRate * 10) / 10,
        repeatCustomerCount
      },
      churn: {
        churnRate: Math.round(churnRate * 10) / 10,
        churnedCount: churnedCustomers,
        atRiskCount,
        predictions
      },
      segments,
      summary: {
        averageCustomerAge,
        avgOrdersPerCustomer: Math.round(avgOrdersPerCustomer * 10) / 10,
        avgSpendPerCustomer: Math.round(avgSpendPerCustomer * 100) / 100,
        topSegment
      }
    };

    return res.status(200).json({
      success: true,
      data: insightsData
    });
  } catch (error) {
    logger.error('Error fetching customer insights:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer insights',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== INVENTORY ANALYTICS ====================

/**
 * @route   GET /api/analytics/inventory/status
 * @desc    Get inventory status and alerts
 * @access  Private
 */
router.get('/inventory/status', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const inventoryStatus = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getInventoryStatusKey(storeId),
      () => AnalyticsService.getInventoryStatus(storeId),
      { ttl: 600 } // 10 minutes (more frequent updates for inventory)
    );

    // Ensure inventoryStatus has required fields
    const statusData = {
      totalProducts: inventoryStatus?.totalProducts ?? 0,
      inStockProducts: inventoryStatus?.inStockProducts ?? 0,
      lowStockProducts: inventoryStatus?.lowStockProducts ?? 0,
      outOfStockProducts: inventoryStatus?.outOfStockProducts ?? 0,
      overstockedProducts: inventoryStatus?.overstockedProducts ?? 0,
      lowStockItems: Array.isArray(inventoryStatus?.lowStockItems) ? inventoryStatus.lowStockItems : [],
      outOfStockItems: Array.isArray(inventoryStatus?.outOfStockItems) ? inventoryStatus.outOfStockItems : []
    };

    return res.status(200).json({
      success: true,
      data: statusData
    });
  } catch (error) {
    logger.error('Error fetching inventory status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory status',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== PAYMENT ANALYTICS ====================

/**
 * @route   GET /api/analytics/payments/breakdown
 * @desc    Get payment method breakdown
 * @access  Private
 */
router.get('/payments/breakdown', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const paymentBreakdown = await AnalyticsService.getPaymentMethodBreakdown(storeId);

    // Ensure we always return an array
    const breakdownArray = Array.isArray(paymentBreakdown) ? paymentBreakdown : [];

    return res.status(200).json({
      success: true,
      data: breakdownArray
    });
  } catch (error) {
    logger.error('Error fetching payment breakdown:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch payment breakdown',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== PREDICTIVE ANALYTICS ====================

/**
 * @route   GET /api/analytics/forecast/sales
 * @desc    Get sales forecast for next N days
 * @access  Private
 */
router.get('/forecast/sales', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    // Support both 'days' and 'forecastDays' parameter names for compatibility
    const { days, forecastDays } = req.query;
    const daysValue = parseInt((forecastDays || days || '7') as string);

    const forecast = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getSalesForecastKey(storeId, daysValue),
      () => PredictiveAnalyticsService.forecastSales(storeId, daysValue),
      { ttl: 3600 } // 1 hour
    );

    const rawForecast = forecast as any;
    const forecastArray = rawForecast?.forecast || [];
    const historicalArray = rawForecast?.historical || [];

    // Calculate additional metrics for metadata
    const historicalRevenues = historicalArray.map((h: any) => h.revenue || 0);
    const hasSeasonality = detectSeasonalityPattern(historicalRevenues);
    const volatilityLevel = calculateVolatilityLevel(historicalRevenues);

    // Transform to match frontend SalesForecastResponse interface
    const transformedForecasts = forecastArray.map((item: any, index: number) => {
      const forecasted = item.predictedRevenue || 0;
      const lower = item.confidenceLower || forecasted * 0.8;
      const upper = item.confidenceUpper || forecasted * 1.2;

      // Calculate confidence based on confidence interval width
      const intervalWidth = upper - lower;
      const confidence = forecasted > 0
        ? Math.max(50, Math.min(95, 100 - (intervalWidth / forecasted) * 25))
        : 70;

      // Determine trend for each day
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (index > 0) {
        const prevForecasted = forecastArray[index - 1]?.predictedRevenue || 0;
        if (forecasted > prevForecasted * 1.05) trend = 'up';
        else if (forecasted < prevForecasted * 0.95) trend = 'down';
      }

      return {
        period: item.date,
        forecasted: Math.round(forecasted * 100) / 100,
        lower: Math.round(lower * 100) / 100,
        upper: Math.round(upper * 100) / 100,
        confidence: Math.round(confidence),
        trend,
        actual: null,
        variance: null
      };
    });

    // Calculate growth rate
    const totalForecast = rawForecast?.totalPredictedRevenue || 0;
    const lastWeekHistorical = historicalRevenues.slice(-7).reduce((a: number, b: number) => a + b, 0);
    const growthRate = lastWeekHistorical > 0
      ? ((totalForecast / daysValue * 7) - lastWeekHistorical) / lastWeekHistorical
      : 0;

    // Build response matching SalesForecastResponse interface
    const today = new Date().toISOString().split('T')[0];
    const responseData = {
      timeRange: {
        startDate: forecastArray[0]?.date || today,
        endDate: forecastArray[forecastArray.length - 1]?.date || today
      },
      forecastDays: daysValue,
      method: 'linear_regression' as const,
      accuracy: rawForecast?.accuracy || 75,
      forecasts: transformedForecasts,
      summary: {
        averageForecast: Math.round((rawForecast?.averageDailyRevenue || 0) * 100) / 100,
        totalForecast: Math.round(totalForecast * 100) / 100,
        trend: (rawForecast?.trend === 'increasing' ? 'up' :
                rawForecast?.trend === 'decreasing' ? 'down' : 'stable') as 'up' | 'down' | 'stable',
        growthRate: Math.round(growthRate * 1000) / 1000
      },
      metadata: {
        seasonalityDetected: hasSeasonality,
        volatility: volatilityLevel,
        dataPoints: historicalArray.length,
        isSampleData: rawForecast?.isSampleData || false // Flag for demo data
      }
    };

    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error('Error fetching sales forecast:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales forecast',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// Helper function to detect seasonality in data
function detectSeasonalityPattern(data: number[]): boolean {
  if (data.length < 14) return false;

  // Simple autocorrelation check for 7-day pattern
  let correlation = 0;
  const n = Math.min(data.length - 7, 30);

  for (let i = 0; i < n; i++) {
    correlation += (data[i] - data[i + 7]) ** 2;
  }

  const avgVariance = correlation / n;
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const totalVariance = data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / data.length;

  // If weekly variance is much lower than total variance, seasonality exists
  return totalVariance > 0 && avgVariance < totalVariance * 0.5;
}

// Helper function to calculate volatility
function calculateVolatilityLevel(data: number[]): 'low' | 'medium' | 'high' {
  if (data.length < 2) return 'low';

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  if (mean === 0) return 'low';

  const variance = data.reduce((sum, val) => sum + (val - mean) ** 2, 0) / data.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;

  if (coefficientOfVariation < 0.3) return 'low';
  if (coefficientOfVariation < 0.6) return 'medium';
  return 'high';
}

/**
 * @route   GET /api/analytics/forecast/stockout/:productId
 * @desc    Predict when a product will run out of stock
 * @access  Private
 */
router.get('/forecast/stockout/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const prediction = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getStockoutPredictionKey(productId),
      () => PredictiveAnalyticsService.predictStockout(productId),
      { ttl: 1800 }
    );

    return res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    logger.error('Error fetching stockout prediction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch stockout prediction',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/analytics/forecast/demand/:productId
 * @desc    Forecast demand for a specific product
 * @access  Private
 */
router.get('/forecast/demand/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;

    const demandForecast = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getDemandForecastKey(productId),
      () => PredictiveAnalyticsService.forecastDemand(productId),
      { ttl: 1800 }
    );

    return res.json({
      success: true,
      data: demandForecast
    });
  } catch (error) {
    logger.error('Error fetching demand forecast:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch demand forecast',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/analytics/trends/seasonal
 * @desc    Analyze seasonal trends - returns SeasonalTrendResponse structure
 * @access  Private
 */
router.get('/trends/seasonal', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const { type = 'monthly', dataType = 'sales' } = req.query;
    const typeValue = type as 'monthly' | 'weekly' | 'daily';
    const dataTypeValue = dataType as 'sales' | 'orders' | 'customers' | 'products';

    const rawTrends = await AnalyticsCacheService.getOrCompute(
      AnalyticsCacheService.getSeasonalTrendsKey(storeId, typeValue),
      () => PredictiveAnalyticsService.analyzeSeasonalTrends(storeId, typeValue),
      { ttl: 3600 }
    );

    const trends = rawTrends?.trends ?? [];

    // Calculate time range based on type
    const endDate = new Date();
    const startDate = new Date();
    switch (typeValue) {
      case 'monthly':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case 'weekly':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'daily':
        startDate.setDate(endDate.getDate() - 30);
        break;
    }

    // Calculate overall analysis from trends
    let overallTrend: 'up' | 'down' | 'stable' | 'cyclic' = 'stable';
    let growthRate = 0;
    let strength = 0;
    let seasonality = 0;
    let cyclicity = 0;

    if (trends.length >= 2) {
      // Calculate trend direction by comparing first half vs second half
      const midPoint = Math.floor(trends.length / 2);
      const firstHalfAvg = trends.slice(0, midPoint).reduce((sum: number, t: any) => sum + (t.averageRevenue || 0), 0) / midPoint;
      const secondHalfAvg = trends.slice(midPoint).reduce((sum: number, t: any) => sum + (t.averageRevenue || 0), 0) / (trends.length - midPoint);

      if (firstHalfAvg > 0) {
        growthRate = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
      }

      if (growthRate > 5) overallTrend = 'up';
      else if (growthRate < -5) overallTrend = 'down';
      // Will check for cyclic after cyclicity is calculated

      // Calculate strength (how strong the trend is - based on variance)
      const avgRevenue = trends.reduce((sum: number, t: any) => sum + (t.averageRevenue || 0), 0) / trends.length;
      const variance = trends.reduce((sum: number, t: any) => sum + Math.pow((t.averageRevenue || 0) - avgRevenue, 2), 0) / trends.length;
      const stdDev = Math.sqrt(variance);
      const coefficientOfVariation = avgRevenue > 0 ? (stdDev / avgRevenue) * 100 : 0;

      // Convert CV to strength (0-100, higher CV = stronger trend patterns)
      strength = Math.min(100, Math.round(coefficientOfVariation * 2));

      // Calculate seasonality (based on index deviation from 1.0)
      const indexDeviation = trends.reduce((sum: number, t: any) => sum + Math.abs((t.index || 1) - 1), 0) / trends.length;
      seasonality = Math.min(100, Math.round(indexDeviation * 200));

      // Detect cyclicity (repeating patterns)
      if (trends.length >= 4) {
        let cycleMatches = 0;
        const halfLen = Math.floor(trends.length / 2);
        for (let i = 0; i < halfLen; i++) {
          const diff = Math.abs((trends[i]?.averageRevenue || 0) - (trends[i + halfLen]?.averageRevenue || 0));
          const threshold = avgRevenue * 0.2;
          if (diff < threshold) cycleMatches++;
        }
        cyclicity = Math.round((cycleMatches / halfLen) * 100);
        // If highly cyclic and stable growth, mark as cyclic trend
        if (cyclicity >= 60 && Math.abs(growthRate) <= 5) {
          overallTrend = 'cyclic';
        }
      }
    }

    // Extract peaks (top 3) and troughs (bottom 3)
    const sortedByRevenue = [...trends].sort((a: any, b: any) => (b.averageRevenue || 0) - (a.averageRevenue || 0));

    const peaks = sortedByRevenue.slice(0, 3).map((t: any, i: number) => ({
      period: t.period || `Period ${i + 1}`,
      value: t.averageRevenue || 0,
      dayOfWeek: typeValue === 'weekly' ? t.period : undefined,
      seasonalIndex: t.index || 1
    }));

    const troughs = sortedByRevenue.slice(-3).reverse().map((t: any, i: number) => ({
      period: t.period || `Period ${i + 1}`,
      value: t.averageRevenue || 0,
      dayOfWeek: typeValue === 'weekly' ? t.period : undefined,
      seasonalIndex: t.index || 1
    }));

    // Build seasonalTrends array with proper structure
    const seasonalTrends = trends.length > 0 ? [{
      season: typeValue === 'monthly' ? 'Annual' : typeValue === 'weekly' ? 'Quarter' : 'Day',
      year: new Date().getFullYear(),
      dataPoints: trends.map((t: any) => ({
        period: t.period || '',
        value: t.averageRevenue || 0,
        index: t.index || 1
      })),
      average: trends.reduce((sum: number, t: any) => sum + (t.averageRevenue || 0), 0) / trends.length,
      peak: Math.max(...trends.map((t: any) => t.averageRevenue || 0)),
      trough: Math.min(...trends.map((t: any) => t.averageRevenue || 0)),
      volatility: strength
    }] : [];

    // Build predictions
    const lastTrendValue = trends.length > 0 ? (trends[trends.length - 1]?.averageRevenue || 0) : 0;
    const avgTrendValue = trends.length > 0 ? trends.reduce((sum: number, t: any) => sum + (t.averageRevenue || 0), 0) / trends.length : 0;

    const predictions = {
      nextSeason: typeValue === 'monthly' ? 'Next Month' : typeValue === 'weekly' ? 'Next Week' : 'Tomorrow',
      expectedTrend: overallTrend === 'cyclic' ? 'stable' : overallTrend,
      expectedValue: Math.round(avgTrendValue * (1 + growthRate / 100)),
      confidence: Math.max(20, Math.min(85, 60 + (trends.length * 2) - Math.abs(growthRate)))
    };

    // Build the full SeasonalTrendResponse
    const trendsData = {
      timeRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      },
      dataType: dataTypeValue,
      granularity: typeValue,
      seasonalTrends,
      byCategory: [], // Would require category-level aggregation
      overallAnalysis: {
        trend: overallTrend,
        strength: Math.round(strength),
        seasonality: Math.round(seasonality),
        cyclicity: Math.round(cyclicity),
        growthRate: Math.round(growthRate * 10) / 10
      },
      peaks,
      troughs,
      predictions,
      // Include raw data for debugging
      _raw: {
        period: rawTrends?.period,
        type: rawTrends?.type,
        trends,
        insights: rawTrends?.insights || []
      }
    };

    return res.status(200).json({
      success: true,
      data: trendsData
    });
  } catch (error) {
    logger.error('Error fetching seasonal trends:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch seasonal trends',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// ==================== CACHE MANAGEMENT ====================

/**
 * @route   POST /api/analytics/cache/warm-up
 * @desc    Warm up cache for the merchant's store
 * @access  Private
 */
router.post('/cache/warm-up', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    await AnalyticsCacheService.warmUpCache(storeId);

    return res.json({
      success: true,
      message: 'Cache warmed up successfully'
    });
  } catch (error) {
    logger.error('Error warming up cache:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to warm up cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   POST /api/analytics/cache/invalidate
 * @desc    Invalidate all analytics cache for the merchant's store
 * @access  Private
 */
router.post('/cache/invalidate', async (req: Request, res: Response) => {
  try {
    const storeId = await getStoreId(req, res);
    if (!storeId) return;

    const count = await AnalyticsCacheService.invalidateStore(storeId);

    return res.json({
      success: true,
      message: `Invalidated ${count} cache entries`
    });
  } catch (error) {
    logger.error('Error invalidating cache:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to invalidate cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route   GET /api/analytics/cache/stats
 * @desc    Get cache statistics
 * @access  Private
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const stats = await AnalyticsCacheService.getStats();

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error fetching cache stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch cache stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
