import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { BusinessMetricsService } from '../merchantservices/BusinessMetrics';
import { ExportService } from '../merchantservices/ExportService';
import { ReportService } from '../merchantservices/ReportService';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { CashbackModel, CashbackMongoModel } from '../models/Cashback';
import { StorePayment } from '../models/StorePayment';
import { User } from '../models/User';
import mongoose from 'mongoose';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== MAIN DASHBOARD ENDPOINT ====================

// @route   GET /api/merchant/dashboard
// @desc    Complete dashboard overview with all essential data
// @access  Private
router.get('/', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    // Get optional storeId from query parameter
    const storeId = req.query.storeId as string | undefined;

    // Get all dashboard data in parallel for performance
    const [metrics, recentActivity, topProducts, lowStockAlerts, salesChart] = await Promise.all([
      BusinessMetricsService.getDashboardMetrics(merchantId, storeId),
      getRecentActivity(merchantId, 10, storeId),
      getTopProducts(merchantId, 5, storeId),
      getLowStockProducts(merchantId, 10, storeId),
      BusinessMetricsService.getTimeSeriesData(merchantId, 30, storeId)
    ]);

    // Return all metrics from BusinessMetricsService plus wrapped summary
    const metricsWithGrowth = {
      // Wrapped summary metrics for cards
      totalRevenue: {
        value: metrics.totalRevenue,
        change: metrics.revenueGrowth,
        trend: metrics.revenueGrowth >= 0 ? 'up' : 'down',
        period: 'vs last month'
      },
      totalOrders: {
        value: metrics.totalOrders,
        change: metrics.ordersGrowth,
        trend: metrics.ordersGrowth >= 0 ? 'up' : 'down',
        period: 'vs last month'
      },
      totalProducts: {
        value: metrics.totalProducts,
        change: 0,
        trend: 'neutral',
        period: 'total active'
      },
      totalCustomers: {
        value: metrics.totalCustomers,
        change: metrics.customerGrowth,
        trend: metrics.customerGrowth >= 0 ? 'up' : 'down',
        period: 'vs last month'
      },
      // All raw metrics for dashboard components
      monthlyRevenue: metrics.monthlyRevenue,
      monthlyOrders: metrics.monthlyOrders,
      revenueGrowth: metrics.revenueGrowth,
      ordersGrowth: metrics.ordersGrowth,
      customerGrowth: metrics.customerGrowth,
      averageOrderValue: metrics.averageOrderValue,
      pendingOrders: metrics.pendingOrders,
      completedOrders: metrics.completedOrders,
      cancelledOrders: metrics.cancelledOrders,
      activeProducts: metrics.activeProducts,
      lowStockProducts: metrics.lowStockProducts,
      monthlyCustomers: metrics.monthlyCustomers,
      returningCustomers: metrics.returningCustomers,
      totalCashbackPaid: metrics.totalCashbackPaid || 0,
      pendingCashback: metrics.pendingCashback || 0,
      profitMargin: metrics.profitMargin || 0,
    };

    return res.json({
      success: true,
      data: {
        metrics: metricsWithGrowth,
        recentActivity,
        topProducts,
        lowStockAlerts,
        salesChart: salesChart.map(day => ({
          date: day.date,
          revenue: day.revenue,
          orders: day.orders,
          items: day.items // Actual item count from order items
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/merchant/dashboard/metrics
// @desc    Get metric cards with trend data
// @access  Private
router.get('/metrics', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const storeId = req.query.storeId as string | undefined;
    const metrics = await BusinessMetricsService.getDashboardMetrics(merchantId, storeId);

    // Format metrics for card display with trends
    const metricCards = {
      revenue: {
        value: metrics.totalRevenue,
        change: metrics.revenueGrowth,
        trend: metrics.revenueGrowth >= 0 ? 'up' : 'down',
        period: 'vs last month',
        label: 'Total Revenue',
        icon: 'currency'
      },
      orders: {
        value: metrics.totalOrders,
        change: metrics.ordersGrowth,
        trend: metrics.ordersGrowth >= 0 ? 'up' : 'down',
        period: 'vs last month',
        label: 'Total Orders',
        icon: 'shopping-cart'
      },
      products: {
        value: metrics.totalProducts,
        change: 0,
        trend: 'neutral',
        period: 'active products',
        label: 'Products',
        icon: 'package'
      },
      customers: {
        value: metrics.totalCustomers,
        change: metrics.customerGrowth,
        trend: metrics.customerGrowth >= 0 ? 'up' : 'down',
        period: 'vs last month',
        label: 'Customers',
        icon: 'users'
      },
      avgOrderValue: {
        value: metrics.averageOrderValue,
        change: 0,
        trend: 'neutral',
        period: 'average',
        label: 'Avg Order Value',
        icon: 'dollar-sign'
      },
      conversionRate: {
        value: metrics.completedOrders > 0 ? (metrics.completedOrders / metrics.totalOrders) * 100 : 0,
        change: 0,
        trend: 'neutral',
        period: 'completion rate',
        label: 'Conversion Rate',
        icon: 'trending-up'
      }
    };

    return res.json({
      success: true,
      data: metricCards
    });
  } catch (error) {
    logger.error('Error fetching dashboard metrics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard metrics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/merchant/dashboard/activity
// @desc    Get recent activity feed (orders, products, team changes)
// @access  Private
router.get('/activity', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { limit = '20' } = req.query;

    const activity = await getRecentActivity(merchantId, parseInt(limit as string));

    // Ensure we always return an array
    const activityArray = Array.isArray(activity) ? activity : [];

    return res.status(200).json({
      success: true,
      data: activityArray
    });
  } catch (error) {
    logger.error('Error fetching activity feed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch activity feed',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// @route   GET /api/merchant/dashboard/top-products
// @desc    Get best selling products
// @access  Private
router.get('/top-products', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { period = '30d', sortBy = 'revenue', limit = '10' } = req.query;

    // Parse period to days
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    const topProducts = await getTopProductsByPeriod(merchantId, days, sortBy as string, parseInt(limit as string));

    // Ensure we always return an array
    const productsArray = Array.isArray(topProducts) ? topProducts : [];

    return res.status(200).json({
      success: true,
      data: productsArray
    });
  } catch (error) {
    logger.error('Error fetching top products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch top products',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// @route   GET /api/merchant/dashboard/sales-data
// @desc    Get chart data for dashboard (daily/weekly/monthly sales)
// @access  Private
router.get('/sales-data', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { period = '30d', granularity = 'day' } = req.query;

    // Parse period to days
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    const salesData = await getSalesChartData(merchantId, days, granularity as string);

    // Ensure we always return an array
    const salesArray = Array.isArray(salesData) ? salesData : [];

    return res.status(200).json({
      success: true,
      data: salesArray
    });
  } catch (error) {
    logger.error('Error fetching sales data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch sales data',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// @route   GET /api/merchant/dashboard/low-stock
// @desc    Get products below inventory threshold
// @access  Private
router.get('/low-stock', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { threshold = '10' } = req.query;

    const lowStockProducts = await getLowStockProducts(merchantId, parseInt(threshold as string));

    // Ensure we always return an array
    const productsArray = Array.isArray(lowStockProducts) ? lowStockProducts : [];

    return res.status(200).json({
      success: true,
      data: productsArray
    });
  } catch (error) {
    logger.error('Error fetching low stock products:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock products',
      ...(process.env.NODE_ENV === 'development' && { error: error instanceof Error ? error.message : 'Unknown error' })
    });
  }
});

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview with key stats
// @access  Private
router.get('/overview', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    const storeIds = await getMerchantStoreIds(merchantId);

    // Get basic counts for quick overview
    const [
      totalProducts,
      totalOrders,
      pendingOrders,
      totalCashback
    ] = await Promise.all([
      Product.countDocuments({ store: { $in: storeIds } }),
      Order.countDocuments({ 'items.store': { $in: storeIds } }),
      Order.countDocuments({ 'items.store': { $in: storeIds }, status: 'placed' }),
      CashbackModel.getMetrics(merchantId)
    ]);

    // Get recent activity
    const recentOrders = await Order.find({ 'items.store': { $in: storeIds } })
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const recentProducts = await Product.find({ store: { $in: storeIds } })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      success: true,
      data: {
        quickStats: {
          totalProducts,
          totalOrders,
          pendingOrders,
          pendingCashback: totalCashback.totalPendingRequests
        },
        recentActivity: {
          orders: recentOrders.map((order: any) => ({
            id: order._id,
            orderNumber: order.orderNumber,
            customerName: typeof order.user === 'object' && order.user?.fullName ? order.user.fullName : 'Unknown',
            total: order.totals?.total || 0,
            status: order.status,
            createdAt: order.createdAt
          })),
          products: recentProducts.map((product: any) => ({
            id: product._id,
            name: product.name,
            price: product.pricing?.selling || 0,
            status: product.isActive ? 'active' : 'inactive',
            stock: product.inventory?.stock || 0,
            createdAt: product.createdAt
          }))
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard overview:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard overview',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/timeseries
// @desc    Get time series data for charts
// @access  Private
router.get('/timeseries', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { days = '30', storeId } = req.query;
    
    const timeSeriesData = await BusinessMetricsService.getTimeSeriesData(
      merchantId, 
      parseInt(days as string),
      storeId as string | undefined
    );

    return res.json({
      success: true,
      data: timeSeriesData
    });
  } catch (error) {
    logger.error('Error fetching time series data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch time series data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Removed duplicate /top-products endpoint - see line 193 for the new version

// @route   GET /api/dashboard/recent-orders
// @desc    Get recent orders for dashboard
// @access  Private
router.get('/recent-orders', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { limit = '10' } = req.query;

    const storeIds = await getMerchantStoreIds(merchantId);

    const orders = await Order.find({ 'items.store': { $in: storeIds } })
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .lean();

    const recentOrders = orders.map((order: any) => ({
      id: order._id,
      orderNumber: order.orderNumber,
      customerName: typeof order.user === 'object' && order.user?.fullName ? order.user.fullName : 'Unknown',
      customerEmail: typeof order.user === 'object' && order.user?.email ? order.user.email : '',
      total: order.totals?.total || 0,
      status: order.status,
      items: order.items?.length || 0,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));

    return res.json({
      success: true,
      data: recentOrders
    });
  } catch (error) {
    logger.error('Error fetching recent orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch recent orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/revenue
// @desc    Get revenue analytics data
// @access  Private
router.get('/revenue', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { timeframe = '30' } = req.query;
    
    const days = parseInt(timeframe as string);
    const timeSeriesData = await BusinessMetricsService.getTimeSeriesData(merchantId, days);
    
    // Calculate revenue analytics
    const totalRevenue = timeSeriesData.reduce((sum, day) => sum + day.revenue, 0);
    const averageDailyRevenue = totalRevenue / timeSeriesData.length;
    
    // Calculate growth compared to previous period
    const firstHalf = timeSeriesData.slice(0, Math.floor(timeSeriesData.length / 2));
    const secondHalf = timeSeriesData.slice(Math.floor(timeSeriesData.length / 2));
    
    const firstHalfRevenue = firstHalf.reduce((sum, day) => sum + day.revenue, 0);
    const secondHalfRevenue = secondHalf.reduce((sum, day) => sum + day.revenue, 0);
    const growthPercentage = firstHalfRevenue > 0 ? 
      ((secondHalfRevenue - firstHalfRevenue) / firstHalfRevenue) * 100 : 0;

    return res.json({
      success: true,
      data: {
        totalRevenue,
        averageDailyRevenue,
        growthPercentage,
        timeSeriesData,
        timeframe: days
      }
    });
  } catch (error) {
    logger.error('Error fetching revenue analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/analytics
// @desc    Get dashboard analytics data
// @access  Private
router.get('/analytics', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { period = '30', type = 'overview', storeId } = req.query;
    
    const days = parseInt(period as string);
    const storeIdParam = storeId as string | undefined;
    
    if (type === 'overview') {
      const [metrics, timeSeriesData, categoryPerformance] = await Promise.all([
        BusinessMetricsService.getDashboardMetrics(merchantId, storeIdParam),
        BusinessMetricsService.getTimeSeriesData(merchantId, days, storeIdParam),
        BusinessMetricsService.getCategoryPerformance(merchantId, storeIdParam)
      ]);

      return res.json({
        success: true,
        data: {
          summary: {
            totalRevenue: metrics.totalRevenue,
            totalOrders: metrics.totalOrders,
            averageOrderValue: metrics.averageOrderValue,
            customerCount: metrics.totalCustomers
          },
          timeSeriesData,
          topCategories: categoryPerformance.slice(0, 5),
          period: days
        }
      });
    }

    // Default to basic metrics
    const metrics = await BusinessMetricsService.getDashboardMetrics(merchantId, storeIdParam);
    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/categories
// @desc    Get category performance data
// @access  Private
router.get('/categories', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const storeId = req.query.storeId as string | undefined;
    const categoryPerformance = await BusinessMetricsService.getCategoryPerformance(merchantId, storeId);

    return res.json({
      success: true,
      data: categoryPerformance
    });
  } catch (error) {
    logger.error('Error fetching category performance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category performance',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/customers
// @desc    Get customer insights
// @access  Private
router.get('/customers', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const storeId = req.query.storeId as string | undefined;
    const customerInsights = await BusinessMetricsService.getCustomerInsights(merchantId, storeId);

    return res.json({
      success: true,
      data: customerInsights
    });
  } catch (error) {
    logger.error('Error fetching customer insights:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer insights',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/insights
// @desc    Get AI-powered business insights and recommendations
// @access  Private
router.get('/insights', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const storeId = req.query.storeId as string | undefined;
    const insights = await BusinessMetricsService.getBusinessInsights(merchantId, storeId);

    return res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    logger.error('Error fetching business insights:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch business insights',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/notifications
// @desc    Get dashboard notifications and alerts
// @access  Private
router.get('/notifications', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    
    const storeIds = await getMerchantStoreIds(merchantId);

    // Get various alerts and notifications
    const lowStockProducts = await Product.find({
      store: { $in: storeIds },
      'inventory.unlimited': { $ne: true },
      $expr: { $lte: ['$inventory.stock', { $ifNull: ['$inventory.lowStockThreshold', 5] }] }
    }).lean();
    const pendingOrders = await Order.find({ 'items.store': { $in: storeIds }, status: 'placed' }).lean();
    const pendingCashbackResult = await CashbackModel.search({ merchantId, status: 'pending', flaggedOnly: true });
    const pendingCashback = pendingCashbackResult.requests || [];
    const recentOrders = await Order.find({ 'items.store': { $in: storeIds } })
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const notifications = [];

    // Low stock alerts
    if (lowStockProducts.length > 0) {
      notifications.push({
        id: 'low_stock',
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStockProducts.length} product(s) are running low on stock`,
        count: lowStockProducts.length,
        action: 'View Products',
        link: '/products?filter=low_stock',
        createdAt: new Date()
      });
    }

    // Pending orders
    if (pendingOrders.length > 0) {
      notifications.push({
        id: 'pending_orders',
        type: 'info',
        title: 'Pending Orders',
        message: `${pendingOrders.length} order(s) require processing`,
        count: pendingOrders.length,
        action: 'Process Orders',
        link: '/orders?filter=pending',
        createdAt: new Date()
      });
    }

    // High-risk cashback requests
    if (pendingCashback.length > 0) {
      notifications.push({
        id: 'high_risk_cashback',
        type: 'error',
        title: 'High-Risk Cashback',
        message: `${pendingCashback.length} cashback request(s) flagged for review`,
        count: pendingCashback.length,
        action: 'Review Requests',
        link: '/cashback?filter=flagged',
        createdAt: new Date()
      });
    }

    // Recent activity summary
    const recentOrdersToday = recentOrders.filter((order: any) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return order.createdAt >= today;
    });

    if (recentOrdersToday.length > 0) {
      notifications.push({
        id: 'new_orders',
        type: 'success',
        title: 'New Orders Today',
        message: `${recentOrdersToday.length} new order(s) received today`,
        count: recentOrdersToday.length,
        action: 'View Orders',
        link: '/orders?filter=today',
        createdAt: new Date()
      });
    }

    return res.json({
      success: true,
      data: {
        notifications,
        unreadCount: notifications.length
      }
    });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/performance
// @desc    Get detailed performance analytics
// @access  Private
router.get('/performance', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { period = '30', storeId } = req.query;
    
    const days = parseInt(period as string);
    const storeIdParam = storeId as string | undefined;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get performance data
    const [
      metrics,
      timeSeriesData,
      categoryPerformance
    ] = await Promise.all([
      BusinessMetricsService.getDashboardMetrics(merchantId, storeIdParam),
      BusinessMetricsService.getTimeSeriesData(merchantId, days, storeIdParam),
      BusinessMetricsService.getCategoryPerformance(merchantId, storeIdParam)
    ]);

    // Calculate performance trends
    const firstHalf = timeSeriesData.slice(0, Math.floor(timeSeriesData.length / 2));
    const secondHalf = timeSeriesData.slice(Math.floor(timeSeriesData.length / 2));

    const firstHalfAvgRevenue = firstHalf.reduce((sum, day) => sum + day.revenue, 0) / firstHalf.length;
    const secondHalfAvgRevenue = secondHalf.reduce((sum, day) => sum + day.revenue, 0) / secondHalf.length;
    
    const revenueTrend = firstHalfAvgRevenue > 0 ? 
      ((secondHalfAvgRevenue - firstHalfAvgRevenue) / firstHalfAvgRevenue) * 100 : 0;

    const firstHalfAvgOrders = firstHalf.reduce((sum, day) => sum + day.orders, 0) / firstHalf.length;
    const secondHalfAvgOrders = secondHalf.reduce((sum, day) => sum + day.orders, 0) / secondHalf.length;
    
    const ordersTrend = firstHalfAvgOrders > 0 ? 
      ((secondHalfAvgOrders - firstHalfAvgOrders) / firstHalfAvgOrders) * 100 : 0;

    return res.json({
      success: true,
      data: {
        summary: {
          totalRevenue: metrics.totalRevenue,
          totalOrders: metrics.totalOrders,
          averageOrderValue: metrics.averageOrderValue,
          profitMargin: metrics.profitMargin,
          customerSatisfactionScore: metrics.customerSatisfactionScore
        },
        trends: {
          revenueTrend,
          ordersTrend,
          period: days
        },
        topCategories: categoryPerformance.slice(0, 5),
        timeSeriesData,
        performanceIndicators: {
          revenueTarget: metrics.monthlyRevenue / (new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100, // Projected monthly revenue
          orderProcessingTime: metrics.averageOrderProcessingTime,
          stockTurnover: metrics.inventoryTurnover,
          customerRetention: (metrics.returningCustomers / metrics.totalCustomers) * 100
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching performance data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch performance data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/sample-data
// @desc    Generate sample dashboard data for testing
// @access  Private
router.post('/sample-data', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    
    // Generate sample cashback data (Product/Order sample creation removed — real data exists in orders/products collections)
    await CashbackModel.createSampleRequests(merchantId);

    return res.json({
      success: true,
      message: 'Sample dashboard data generated successfully'
    });
  } catch (error) {
    logger.error('Error generating sample data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate sample data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/realtime/stats
// @desc    Get real-time connection statistics
// @access  Private
router.get('/realtime/stats', async (req, res) => {
  try {
    if ((global as any).realTimeService) {
      const stats = (global as any).realTimeService.getConnectionStats();
      return res.json({
        success: true,
        data: stats
      });
    } else {
      return res.json({
        success: true,
        data: {
          totalConnections: 0,
          totalRooms: 0,
          merchantDashboards: 0,
          activeSubscriptions: {
            metrics: 0,
            orders: 0,
            cashback: 0
          }
        }
      });
    }
  } catch (error) {
    logger.error('Error fetching real-time stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time stats',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/realtime/broadcast
// @desc    Broadcast system notification to all or specific merchants
// @access  Private
router.post('/realtime/broadcast', async (req, res) => {
  try {
    const { type, title, message, merchantIds } = req.body;
    
    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Type, title, and message are required'
      });
    }

    if ((global as any).realTimeService) {
      (global as any).realTimeService.broadcastSystemNotification({
        type,
        title,
        message,
        merchantIds
      });
    }

    return res.json({
      success: true,
      message: 'Notification broadcasted successfully'
    });
  } catch (error) {
    logger.error('Error broadcasting notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to broadcast notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/realtime/chart-data
// @desc    Send live chart data to specific merchant
// @access  Private
router.post('/realtime/chart-data/:merchantId', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { period = 24 } = req.body;

    if ((global as any).realTimeService) {
      await (global as any).realTimeService.sendLiveChartData(merchantId, period);
    }

    return res.json({
      success: true,
      message: 'Live chart data sent successfully'
    });
  } catch (error) {
    logger.error('Error sending live chart data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send live chart data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/export
// @desc    Export dashboard data in various formats
// @access  Private
router.post('/export', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { 
      format = 'csv', 
      sections = ['dashboard', 'orders', 'products', 'cashback', 'analytics'],
      startDate,
      endDate,
      includeCharts = false 
    } = req.body;

    if (!['csv', 'json', 'excel'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format. Supported formats: csv, json, excel'
      });
    }

    const options = {
      format,
      sections,
      includeCharts,
      dateRange: startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined
    };

    const exportResult = await ExportService.exportDashboardData(merchantId, options);

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    return res.send(exportResult.data);

  } catch (error) {
    logger.error('Error exporting dashboard data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export dashboard data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/export/orders
// @desc    Export orders data specifically
// @access  Private
router.post('/export/orders', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { 
      format = 'csv',
      startDate,
      endDate,
      status
    } = req.body;

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid export format. Supported formats: csv, json'
      });
    }

    const options = {
      format,
      status,
      dateRange: startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined
    };

    const exportResult = await ExportService.exportOrders(merchantId, options);

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    return res.send(exportResult.data);

  } catch (error) {
    logger.error('Error exporting orders data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export orders data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/export/scheduled/:type
// @desc    Generate scheduled reports (daily, weekly, monthly)
// @access  Private
router.get('/export/scheduled/:type', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { type } = req.params;

    if (!['daily', 'weekly', 'monthly'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report type. Supported types: daily, weekly, monthly'
      });
    }

    const reportData = await ExportService.generateScheduledReport(
      merchantId, 
      type as 'daily' | 'weekly' | 'monthly'
    );

    return res.json({
      success: true,
      data: reportData
    });

  } catch (error) {
    logger.error('Error generating scheduled report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate scheduled report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== AUTOMATED REPORTS ENDPOINTS ====================

// @route   GET /api/dashboard/reports/schedules
// @desc    Get report schedules for merchant
// @access  Private
router.get('/reports/schedules', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const schedules = ReportService.getSchedulesByMerchant(merchantId);

    return res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    logger.error('Error fetching report schedules:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report schedules',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/reports/schedules
// @desc    Create new report schedule
// @access  Private
router.post('/reports/schedules', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { name, description, frequency, format, sections, recipients } = req.body;

    if (!name || !frequency || !format || !sections || !recipients) {
      return res.status(400).json({
        success: false,
        message: 'Name, frequency, format, sections, and recipients are required'
      });
    }

    const schedule = ReportService.createSchedule({
      merchantId,
      name,
      description,
      frequency,
      format,
      sections,
      recipients,
      isActive: true
    });

    return res.status(201).json({
      success: true,
      data: schedule,
      message: 'Report schedule created successfully'
    });
  } catch (error) {
    logger.error('Error creating report schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create report schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   PUT /api/dashboard/reports/schedules/:id
// @desc    Update report schedule
// @access  Private
router.put('/reports/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const schedule = ReportService.updateSchedule(id, updates);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Report schedule not found'
      });
    }

    return res.json({
      success: true,
      data: schedule,
      message: 'Report schedule updated successfully'
    });
  } catch (error) {
    logger.error('Error updating report schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update report schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   DELETE /api/dashboard/reports/schedules/:id
// @desc    Delete report schedule
// @access  Private
router.delete('/reports/schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = ReportService.deleteSchedule(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Report schedule not found'
      });
    }

    return res.json({
      success: true,
      message: 'Report schedule deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting report schedule:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete report schedule',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/reports/history
// @desc    Get report generation history
// @access  Private
router.get('/reports/history', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { limit = '50' } = req.query;
    
    const history = ReportService.getHistoryByMerchant(merchantId, parseInt(limit as string));

    return res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error fetching report history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/reports/statistics
// @desc    Get report statistics for merchant
// @access  Private
router.get('/reports/statistics', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const statistics = ReportService.getReportStatistics(merchantId);

    return res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    logger.error('Error fetching report statistics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/dashboard/reports/upcoming
// @desc    Get upcoming scheduled reports
// @access  Private
router.get('/reports/upcoming', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { days = '7' } = req.query;
    
    const upcoming = ReportService.getUpcomingReports(merchantId, parseInt(days as string));

    return res.json({
      success: true,
      data: upcoming
    });
  } catch (error) {
    logger.error('Error fetching upcoming reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming reports',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/reports/generate
// @desc    Generate ad-hoc report
// @access  Private
router.post('/reports/generate', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    const { name, format, sections, startDate, endDate, recipients } = req.body;

    if (!name || !format || !sections) {
      return res.status(400).json({
        success: false,
        message: 'Name, format, and sections are required'
      });
    }

    const reportConfig = {
      name,
      format,
      sections,
      dateRange: startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined,
      recipients
    };

    const historyEntry = await ReportService.generateAdHocReport(merchantId, reportConfig);

    return res.json({
      success: true,
      data: historyEntry,
      message: 'Ad-hoc report generated successfully'
    });
  } catch (error) {
    logger.error('Error generating ad-hoc report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate ad-hoc report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/reports/trigger/:scheduleId
// @desc    Manually trigger a scheduled report
// @access  Private
router.post('/reports/trigger/:scheduleId', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    
    const historyEntry = await ReportService.triggerScheduledReport(scheduleId);

    return res.json({
      success: true,
      data: historyEntry,
      message: 'Scheduled report triggered successfully'
    });
  } catch (error) {
    logger.error('Error triggering scheduled report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger scheduled report',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/dashboard/reports/sample-schedules
// @desc    Create sample report schedules for testing
// @access  Private
router.post('/reports/sample-schedules', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }
    ReportService.createSampleSchedules(merchantId);

    return res.json({
      success: true,
      message: 'Sample report schedules created successfully'
    });
  } catch (error) {
    logger.error('Error creating sample schedules:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create sample schedules',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/merchant/dashboard/customer-payments
// @desc    Recent customer payments with customer details for the dashboard
// @access  Private
router.get('/customer-payments', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    const storeId = req.query.storeId as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // Get merchant's stores
    const storeFilter: any = { merchantId };
    if (storeId) {
      storeFilter._id = storeId;
    }
    const stores = await Store.find(storeFilter).select('_id name').lean();
    const storeIds = stores.map(s => s._id);
    const storeMap = new Map(stores.map(s => [s._id.toString(), s.name]));

    if (storeIds.length === 0) {
      return res.json({
        success: true,
        data: {
          payments: [],
          pagination: { currentPage: page, totalPages: 0, totalItems: 0, hasNextPage: false, hasPrevPage: false }
        }
      });
    }

    // Get recent orders with customer details
    const orderFilter: any = {
      store: { $in: storeIds },
      'payment.status': 'paid'
    };

    // StorePayment uses storeId (not store) and userId (not user)
    const storePaymentFilter: any = {
      storeId: { $in: storeIds },
      status: 'completed'
    };

    // Count both sources for accurate pagination
    const [orderCount, storePaymentCount] = await Promise.all([
      Order.countDocuments(orderFilter),
      StorePayment.countDocuments(storePaymentFilter)
    ]);
    const totalItems = orderCount + storePaymentCount;

    // Fetch both with double the limit, then merge-sort and slice
    const halfLimit = Math.ceil(limit / 2) + 2; // fetch extra to ensure enough after merge
    const skip = (page - 1) * limit;

    const [orders, storePayments] = await Promise.all([
      Order.find(orderFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'fullName phoneNumber profileImage')
        .select('orderNumber user store totals payment createdAt fulfillmentType status')
        .lean(),
      StorePayment.find(storePaymentFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName phoneNumber profileImage')
        .select('userId storeId storeName billAmount paymentMethod createdAt completedAt coinRedemption')
        .lean()
    ]);

    // Merge and sort by date
    const payments = [
      ...orders.map((o: any) => ({
        type: 'order' as const,
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        customerName: o.user?.fullName || 'Customer',
        customerPhone: o.user?.phoneNumber || '',
        customerImage: o.user?.profileImage || null,
        storeName: storeMap.get(o.store?.toString()) || 'Unknown Store',
        storeId: o.store?.toString(),
        amount: o.totals?.total || 0,
        merchantPayout: o.totals?.merchantPayout || 0,
        paymentMethod: o.payment?.method || 'unknown',
        coinsUsed: o.payment?.coinsUsed?.totalCoinsValue || 0,
        status: o.status,
        fulfillmentType: o.fulfillmentType,
        createdAt: o.createdAt,
      })),
      ...storePayments.map((sp: any) => ({
        type: 'store_payment' as const,
        id: sp._id.toString(),
        orderNumber: null,
        customerName: sp.userId?.fullName || 'Customer',
        customerPhone: sp.userId?.phoneNumber || '',
        customerImage: sp.userId?.profileImage || null,
        storeName: sp.storeName || storeMap.get(sp.storeId?.toString()) || 'Unknown Store',
        storeId: sp.storeId?.toString(),
        amount: sp.billAmount || 0,
        merchantPayout: sp.billAmount || 0,
        paymentMethod: sp.paymentMethod || 'unknown',
        coinsUsed: (sp.coinRedemption?.rezCoins || 0) + (sp.coinRedemption?.promoCoins || 0),
        status: 'completed',
        fulfillmentType: 'in_store',
        createdAt: sp.completedAt || sp.createdAt,
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
     .slice(0, limit);

    const totalPages = Math.ceil(totalItems / limit);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error: any) {
    logger.error('Error fetching customer payments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch customer payments' });
  }
});

// ==================== STORE PERFORMANCE ====================

// @route   GET /api/merchant/dashboard/store-performance
// @desc    Per-store performance breakdown for all merchant stores
// @access  Private
router.get('/store-performance', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    // Get all merchant stores
    const stores = await Store.find({ merchantId: new mongoose.Types.ObjectId(merchantId) })
      .select('name logo slug isActive ratings category location offers')
      .lean();

    if (stores.length === 0) {
      return res.json({ success: true, data: { stores: [] } });
    }

    const storeIds = stores.map(s => s._id);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get per-store order aggregation (this month)
    const [orderStats, todayStats, productStats, pendingCashback] = await Promise.all([
      // Monthly order stats per store
      Order.aggregate([
        { $match: { store: { $in: storeIds }, createdAt: { $gte: startOfMonth } } },
        { $group: {
          _id: '$store',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totals.total' },
          merchantPayout: { $sum: '$totals.merchantPayout' },
          pendingOrders: { $sum: { $cond: [{ $in: ['$status', ['placed', 'confirmed']] }, 1, 0] } },
          completedOrders: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          avgOrderValue: { $avg: '$totals.total' },
          uniqueCustomers: { $addToSet: '$user' }
        }}
      ]),
      // Today's stats per store
      Order.aggregate([
        { $match: { store: { $in: storeIds }, createdAt: { $gte: startOfToday } } },
        { $group: {
          _id: '$store',
          todayOrders: { $sum: 1 },
          todayRevenue: { $sum: '$totals.total' }
        }}
      ]),
      // Product counts per store
      Product.aggregate([
        { $match: { store: { $in: storeIds } } },
        { $group: {
          _id: '$store',
          totalProducts: { $sum: 1 },
          activeProducts: { $sum: { $cond: ['$isActive', 1, 0] } },
          lowStockProducts: { $sum: { $cond: [{ $and: [{ $lte: ['$inventory.stock', '$inventory.lowStockThreshold'] }, { $gt: ['$inventory.stock', 0] }] }, 1, 0] } },
          outOfStockProducts: { $sum: { $cond: [{ $lte: ['$inventory.stock', 0] }, 1, 0] } }
        }}
      ]),
      // Pending cashback per store
      CashbackMongoModel.aggregate([
        { $match: { merchantId: new mongoose.Types.ObjectId(merchantId), status: 'pending' } },
        { $group: {
          _id: '$storeId',
          pendingCount: { $sum: 1 },
          pendingAmount: { $sum: '$amount' }
        }}
      ])
    ]);

    // Build lookup maps
    const orderMap = new Map(orderStats.map((s: any) => [s._id.toString(), s]));
    const todayMap = new Map(todayStats.map((s: any) => [s._id.toString(), s]));
    const productMap = new Map(productStats.map((s: any) => [s._id.toString(), s]));
    const cashbackMap = new Map(pendingCashback.map((s: any) => [s._id?.toString(), s]));

    // Assemble per-store data
    const storePerformance = stores.map(store => {
      const sid = store._id.toString();
      const orders = orderMap.get(sid) || {};
      const today = todayMap.get(sid) || {};
      const products = productMap.get(sid) || {};
      const cashback = cashbackMap.get(sid) || {};

      return {
        storeId: sid,
        name: store.name,
        logo: store.logo || null,
        slug: store.slug,
        isActive: store.isActive,
        rating: (store as any).ratings?.average || 0,
        ratingCount: (store as any).ratings?.count || 0,
        category: typeof store.category === 'object' ? (store.category as any)?.name : store.category,
        location: (store as any).location?.city || (store as any).location?.address || '',
        cashbackPercent: (store as any).offers?.cashback || 0,
        // Monthly metrics
        monthlyOrders: (orders as any).totalOrders || 0,
        monthlyRevenue: (orders as any).totalRevenue || 0,
        monthlyPayout: (orders as any).merchantPayout || 0,
        pendingOrders: (orders as any).pendingOrders || 0,
        completedOrders: (orders as any).completedOrders || 0,
        cancelledOrders: (orders as any).cancelledOrders || 0,
        avgOrderValue: (orders as any).avgOrderValue || 0,
        uniqueCustomers: (orders as any).uniqueCustomers?.length || 0,
        // Today's metrics
        todayOrders: (today as any).todayOrders || 0,
        todayRevenue: (today as any).todayRevenue || 0,
        // Product metrics
        totalProducts: (products as any).totalProducts || 0,
        activeProducts: (products as any).activeProducts || 0,
        lowStockProducts: (products as any).lowStockProducts || 0,
        outOfStockProducts: (products as any).outOfStockProducts || 0,
        // Cashback
        pendingCashbackCount: (cashback as any).pendingCount || 0,
        pendingCashbackAmount: (cashback as any).pendingAmount || 0,
      };
    });

    // Sort by monthly revenue descending (best performing first)
    storePerformance.sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);

    res.json({
      success: true,
      data: {
        stores: storePerformance,
        summary: {
          totalStores: stores.length,
          activeStores: stores.filter(s => s.isActive).length,
          totalMonthlyRevenue: storePerformance.reduce((sum, s) => sum + s.monthlyRevenue, 0),
          totalMonthlyOrders: storePerformance.reduce((sum, s) => sum + s.monthlyOrders, 0),
          totalPendingOrders: storePerformance.reduce((sum, s) => sum + s.pendingOrders, 0),
        }
      }
    });
  } catch (error: any) {
    logger.error('Error fetching store performance:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch store performance' });
  }
});

// ==================== ACTION ITEMS ====================

// @route   GET /api/merchant/dashboard/action-items
// @desc    Prioritized action items / to-do list for the merchant
// @access  Private
router.get('/action-items', async (req, res) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    const storeId = req.query.storeId as string | undefined;

    // Get merchant stores
    const storeFilter: any = { merchantId: new mongoose.Types.ObjectId(merchantId) };
    if (storeId) storeFilter._id = new mongoose.Types.ObjectId(storeId);
    const stores = await Store.find(storeFilter).select('_id name').lean();
    const storeIds = stores.map(s => s._id);
    const storeNameMap = new Map(stores.map(s => [s._id.toString(), s.name]));

    if (storeIds.length === 0) {
      return res.json({ success: true, data: { actionItems: [], summary: { total: 0, urgent: 0, high: 0, medium: 0 } } });
    }

    const actionItems: Array<{
      id: string;
      type: string;
      priority: 'urgent' | 'high' | 'medium' | 'low';
      title: string;
      description: string;
      storeName: string;
      storeId: string;
      count: number;
      deepLink: string;
      icon: string;
      color: string;
    }> = [];

    // 1. Pending orders that need confirmation (URGENT)
    const pendingOrders = await Order.find({
      store: { $in: storeIds },
      status: 'placed'
    }).select('store orderNumber createdAt').sort({ createdAt: 1 }).limit(50).lean();

    // Group by store
    const pendingByStore = new Map<string, number>();
    for (const order of pendingOrders) {
      const sid = order.store?.toString() || '';
      pendingByStore.set(sid, (pendingByStore.get(sid) || 0) + 1);
    }
    for (const [sid, count] of pendingByStore) {
      actionItems.push({
        id: `pending-orders-${sid}`,
        type: 'pending_orders',
        priority: 'urgent',
        title: `${count} order${count > 1 ? 's' : ''} awaiting confirmation`,
        description: `Confirm orders at ${storeNameMap.get(sid) || 'your store'} to start preparing`,
        storeName: storeNameMap.get(sid) || '',
        storeId: sid,
        count,
        deepLink: '/orders?filter=pending',
        icon: 'time',
        color: '#EF4444',
      });
    }

    // 2. Out of stock products (HIGH)
    const outOfStock = await Product.find({
      store: { $in: storeIds },
      isActive: true,
      'inventory.stock': { $lte: 0 }
    }).select('store name').limit(50).lean();

    const oosbyStore = new Map<string, number>();
    for (const p of outOfStock) {
      const sid = (p as any).store?.toString() || '';
      oosbyStore.set(sid, (oosbyStore.get(sid) || 0) + 1);
    }
    for (const [sid, count] of oosbyStore) {
      actionItems.push({
        id: `out-of-stock-${sid}`,
        type: 'out_of_stock',
        priority: 'high',
        title: `${count} product${count > 1 ? 's' : ''} out of stock`,
        description: `Restock items at ${storeNameMap.get(sid) || 'your store'} to avoid lost sales`,
        storeName: storeNameMap.get(sid) || '',
        storeId: sid,
        count,
        deepLink: '/products?filter=out-of-stock',
        icon: 'alert-circle',
        color: '#DC2626',
      });
    }

    // 3. Low stock products (MEDIUM)
    const lowStock = await Product.find({
      store: { $in: storeIds },
      isActive: true,
      'inventory.stock': { $gt: 0 },
      $expr: { $lte: ['$inventory.stock', { $ifNull: ['$inventory.lowStockThreshold', 5] }] }
    }).select('store name inventory.stock').limit(50).lean();

    const lsByStore = new Map<string, number>();
    for (const p of lowStock) {
      const sid = (p as any).store?.toString() || '';
      lsByStore.set(sid, (lsByStore.get(sid) || 0) + 1);
    }
    for (const [sid, count] of lsByStore) {
      actionItems.push({
        id: `low-stock-${sid}`,
        type: 'low_stock',
        priority: 'medium',
        title: `${count} product${count > 1 ? 's' : ''} running low`,
        description: `Low stock at ${storeNameMap.get(sid) || 'your store'} — restock soon`,
        storeName: storeNameMap.get(sid) || '',
        storeId: sid,
        count,
        deepLink: '/products?filter=low-stock',
        icon: 'warning',
        color: '#F59E0B',
      });
    }

    // 4. Pending cashback requests (HIGH)
    try {
      const pendingCashback = await CashbackMongoModel.aggregate([
        { $match: { merchantId: new mongoose.Types.ObjectId(merchantId), status: 'pending' } },
        { $group: { _id: '$storeId', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
      ]);
      for (const cb of pendingCashback) {
        const sid = cb._id?.toString() || '';
        actionItems.push({
          id: `pending-cashback-${sid}`,
          type: 'pending_cashback',
          priority: 'high',
          title: `${cb.count} cashback request${cb.count > 1 ? 's' : ''} pending`,
          description: `₹${(cb.totalAmount || 0).toLocaleString()} in cashback requests at ${storeNameMap.get(sid) || 'your store'}`,
          storeName: storeNameMap.get(sid) || '',
          storeId: sid,
          count: cb.count,
          deepLink: '/cashback',
          icon: 'cash',
          color: '#7C3AED',
        });
      }
    } catch (err) {
      // Cashback model may not exist — skip
    }

    // 5. Orders being prepared too long (> 2 hours) (HIGH)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const slowOrders = await Order.countDocuments({
      store: { $in: storeIds },
      status: { $in: ['confirmed', 'preparing'] },
      updatedAt: { $lt: twoHoursAgo }
    });
    if (slowOrders > 0) {
      actionItems.push({
        id: 'slow-orders',
        type: 'slow_orders',
        priority: 'high',
        title: `${slowOrders} order${slowOrders > 1 ? 's' : ''} delayed`,
        description: 'Orders stuck in preparation for over 2 hours — update status or notify customer',
        storeName: 'All stores',
        storeId: '',
        count: slowOrders,
        deepLink: '/orders?filter=preparing',
        icon: 'hourglass',
        color: '#DC2626',
      });
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    const summary = {
      total: actionItems.length,
      urgent: actionItems.filter(a => a.priority === 'urgent').length,
      high: actionItems.filter(a => a.priority === 'high').length,
      medium: actionItems.filter(a => a.priority === 'medium').length,
    };

    res.json({ success: true, data: { actionItems, summary } });
  } catch (error: any) {
    logger.error('Error fetching action items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch action items' });
  }
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Get merchant's store IDs for filtering
 */
async function getMerchantStoreIds(merchantId: string): Promise<mongoose.Types.ObjectId[]> {
  const stores = await Store.find({ merchantId: new mongoose.Types.ObjectId(merchantId) }).select('_id').lean();
  return stores.map(s => s._id as mongoose.Types.ObjectId);
}

/**
 * Get recent activity feed combining orders, products, and other actions
 */
async function getRecentActivity(merchantId: string, limit: number = 20, storeId?: string): Promise<any[]> {
  try {
    const activity: any[] = [];

    const allStoreIds = await getMerchantStoreIds(merchantId);
    const filterStoreIds = storeId
      ? allStoreIds.filter(id => id.toString() === storeId)
      : allStoreIds;

    if (filterStoreIds.length === 0) return [];

    // Get recent orders from real orders collection
    const recentOrders = await Order.find({ 'items.store': { $in: filterStoreIds } })
      .populate('user', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Get recent products from real products collection
    const recentProducts = await Product.find({ store: { $in: filterStoreIds } })
      .sort({ createdAt: -1 })
      .limit(Math.floor(limit / 2))
      .lean();

    // Format orders as activity — map real schema fields
    recentOrders.forEach((order: any) => {
      const customerName = typeof order.user === 'object' && order.user?.fullName
        ? order.user.fullName
        : 'Unknown Customer';

      activity.push({
        id: `order-${order._id}`,
        type: 'order',
        action: order.status === 'placed' ? 'New Order Received' : `Order ${order.status}`,
        description: `Order #${order.orderNumber} from ${customerName}`,
        timestamp: order.createdAt,
        user: customerName,
        icon: 'shopping-cart',
        metadata: {
          orderId: order._id,
          orderNumber: order.orderNumber,
          total: order.totals?.total || 0,
          status: order.status
        }
      });
    });

    // Format products as activity — map real schema fields
    recentProducts.forEach((product: any) => {
      activity.push({
        id: `product-${product._id}`,
        type: 'product',
        action: 'Product Created',
        description: `Added "${product.name}" to catalog`,
        timestamp: product.createdAt,
        user: 'Merchant',
        icon: 'package',
        metadata: {
          productId: product._id,
          productName: product.name,
          price: product.pricing?.selling || 0,
          status: product.isActive ? 'active' : 'inactive'
        }
      });
    });

    // Sort by timestamp descending and limit
    return activity
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch (error) {
    logger.error('Error getting recent activity:', error);
    return [];
  }
}

/**
 * Get top products for a specific period
 */
async function getTopProducts(merchantId: string, limit: number = 5, storeId?: string): Promise<any[]> {
  try {
    const metrics = await BusinessMetricsService.getDashboardMetrics(merchantId, storeId);

    return metrics.topSellingProducts.slice(0, limit).map(product => ({
      id: product.productId,
      name: product.name,
      revenue: product.revenue,
      quantity: product.totalSold,
      growth: 0 // Would need historical data to calculate
    }));
  } catch (error) {
    logger.error('Error getting top products:', error);
    return [];
  }
}

/**
 * Get top products by period with sorting options
 */
async function getTopProductsByPeriod(
  merchantId: string,
  days: number,
  sortBy: string,
  limit: number
): Promise<any[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const storeIds = await getMerchantStoreIds(merchantId);
    if (storeIds.length === 0) return [];

    // Get orders in the period from real orders collection
    const orders = await Order.find({
      'items.store': { $in: storeIds },
      createdAt: { $gte: startDate, $lte: endDate }
    }).lean();

    // Calculate product performance using real schema field names
    const productStats = new Map<string, {
      name: string;
      revenue: number;
      quantity: number;
      category: string;
      image: string | null;
    }>();

    orders.forEach((order: any) => {
      if (!order.items) return;
      order.items.forEach((item: any) => {
        const productId = item.product?.toString() || '';
        const existing = productStats.get(productId) || {
          name: item.name || '',
          revenue: 0,
          quantity: 0,
          category: '',
          image: item.image || null
        };
        existing.revenue += item.subtotal || 0;
        existing.quantity += item.quantity || 0;
        productStats.set(productId, existing);
      });
    });

    // Convert to array and sort
    let topProducts = Array.from(productStats.entries()).map(([productId, stats]) => ({
      id: productId,
      name: stats.name,
      revenue: stats.revenue,
      quantity: stats.quantity,
      growth: 0,
      category: stats.category,
      image: stats.image
    }));

    // Sort based on criteria
    if (sortBy === 'quantity') {
      topProducts.sort((a, b) => b.quantity - a.quantity);
    } else {
      topProducts.sort((a, b) => b.revenue - a.revenue);
    }

    return topProducts.slice(0, limit);
  } catch (error) {
    logger.error('Error getting top products by period:', error);
    return [];
  }
}

/**
 * Get sales chart data with granularity support
 */
async function getSalesChartData(
  merchantId: string,
  days: number,
  granularity: string
): Promise<any[]> {
  try {
    const timeSeriesData = await BusinessMetricsService.getTimeSeriesData(merchantId, days);

    // If granularity is 'day', return as-is
    if (granularity === 'day') {
      return timeSeriesData.map(day => ({
        date: day.date,
        revenue: day.revenue,
        orders: day.orders,
        items: day.items // Actual item count from order items
      }));
    }

    // For week/month granularity, aggregate data
    const aggregated: any[] = [];
    let currentPeriod: any = null;
    let periodStart: Date | null = null;

    timeSeriesData.forEach((day, index) => {
      const date = new Date(day.date);

      if (granularity === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!currentPeriod || currentPeriod.date !== weekKey) {
          if (currentPeriod) aggregated.push(currentPeriod);
          currentPeriod = {
            date: weekKey,
            revenue: 0,
            orders: 0,
            items: 0
          };
        }
      } else if (granularity === 'month') {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;

        if (!currentPeriod || currentPeriod.date !== monthKey) {
          if (currentPeriod) aggregated.push(currentPeriod);
          currentPeriod = {
            date: monthKey,
            revenue: 0,
            orders: 0,
            items: 0
          };
        }
      }

      if (currentPeriod) {
        currentPeriod.revenue += day.revenue;
        currentPeriod.orders += day.orders;
        currentPeriod.items += day.items; // Accumulate actual item counts
      }
    });

    if (currentPeriod) aggregated.push(currentPeriod);

    return aggregated;
  } catch (error) {
    logger.error('Error getting sales chart data:', error);
    return [];
  }
}

/**
 * Get low stock products below threshold
 */
async function getLowStockProducts(merchantId: string, threshold: number = 10, storeId?: string): Promise<any[]> {
  try {
    const allStoreIds = await getMerchantStoreIds(merchantId);
    const filterStoreIds = storeId
      ? allStoreIds.filter(id => id.toString() === storeId)
      : allStoreIds;

    if (filterStoreIds.length === 0) return [];

    // Query real products collection — filter by stock <= threshold and not unlimited
    const products = await Product.find({
      store: { $in: filterStoreIds },
      'inventory.unlimited': { $ne: true },
      'inventory.stock': { $lte: threshold }
    }).lean();

    return products
      .map((product: any) => ({
        id: product._id,
        name: product.name,
        currentStock: product.inventory?.stock || 0,
        sku: product.sku || '',
        reorderPoint: product.inventory?.lowStockThreshold || 5,
        category: product.category?.toString() || '',
        image: product.images?.[0] || null,
        status: product.isActive ? 'active' : 'inactive'
      }))
      .sort((a, b) => a.currentStock - b.currentStock);
  } catch (error) {
    logger.error('Error getting low stock products:', error);
    return [];
  }
}

export default router;