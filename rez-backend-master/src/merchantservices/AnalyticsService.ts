/**
 * Analytics Service
 *
 * Provides real-time analytics calculations using MongoDB aggregation pipelines.
 * Replaces all mock data with actual database calculations.
 */

import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { User } from '../models/User';
import { logger } from '../config/logger';
import mongoose, { Types } from 'mongoose';

export interface SalesOverview {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalItems: number;
  previousPeriodRevenue: number;
  previousPeriodOrders: number;
  revenueGrowth: number; // percentage
  ordersGrowth: number; // percentage
  period: {
    start: Date;
    end: Date;
  };
}

export interface RevenueTrendData {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  items: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
  orderCount: number;
  averagePrice: number;
}

export interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
  revenueShare: number; // percentage of total revenue
}

export interface CustomerInsight {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageOrdersPerCustomer: number;
  customerLifetimeValue: number;
  repeatCustomerRate: number; // percentage
  topCustomers: Array<{
    userId: string;
    userName: string;
    totalOrders: number;
    totalSpent: number;
    lastOrderDate: Date;
  }>;
}

export interface InventoryStatus {
  totalProducts: number;
  inStockProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  overstockedProducts: number;
  lowStockItems: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    lowStockThreshold: number;
    reorderLevel: number;
  }>;
  outOfStockItems: Array<{
    productId: string;
    productName: string;
    lastSoldDate?: Date;
  }>;
}

export class AnalyticsService {
  /**
   * Get sales overview for a date range
   */
  static async getSalesOverview(
    storeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SalesOverview> {
    // Validate date range (max 1 year)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      throw new Error('Date range cannot exceed 1 year');
    }

    // Calculate previous period dates
    const periodDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);
    const previousEndDate = new Date(startDate);

    // Current period aggregation
    const currentPeriodStats = await Order.aggregate([
      {
        $match: {
          'items.store': new Types.ObjectId(storeId),
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.store': new Types.ObjectId(storeId)
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$items.subtotal' },
          totalOrders: { $addToSet: '$_id' },
          totalItems: { $sum: '$items.quantity' }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          totalOrders: { $size: '$totalOrders' },
          totalItems: 1
        }
      }
    ]);

    // Previous period aggregation
    const previousPeriodStats = await Order.aggregate([
      {
        $match: {
          'items.store': new Types.ObjectId(storeId),
          createdAt: { $gte: previousStartDate, $lt: previousEndDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.store': new Types.ObjectId(storeId)
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$items.subtotal' },
          totalOrders: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          _id: 0,
          totalRevenue: 1,
          totalOrders: { $size: '$totalOrders' }
        }
      }
    ]);

    const current = currentPeriodStats[0] || { totalRevenue: 0, totalOrders: 0, totalItems: 0 };
    const previous = previousPeriodStats[0] || { totalRevenue: 0, totalOrders: 0 };

    const averageOrderValue = current.totalOrders > 0 ? current.totalRevenue / current.totalOrders : 0;
    const revenueGrowth = previous.totalRevenue > 0
      ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue) * 100
      : 0;
    const ordersGrowth = previous.totalOrders > 0
      ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders) * 100
      : 0;

    return {
      totalRevenue: Math.round(current.totalRevenue * 100) / 100,
      totalOrders: current.totalOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      totalItems: current.totalItems,
      previousPeriodRevenue: Math.round(previous.totalRevenue * 100) / 100,
      previousPeriodOrders: previous.totalOrders,
      revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      ordersGrowth: Math.round(ordersGrowth * 100) / 100,
      period: { start: startDate, end: endDate }
    };
  }

  /**
   * Get revenue trends grouped by period
   */
  static async getRevenueTrends(
    storeId: string,
    period: 'daily' | 'weekly' | 'monthly',
    days: number = 30
  ): Promise<RevenueTrendData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Determine grouping format
    let dateFormat: any;
    switch (period) {
      case 'daily':
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
        break;
      case 'weekly':
        dateFormat = {
          $dateToString: {
            format: '%Y-W%V',
            date: '$createdAt'
          }
        };
        break;
      case 'monthly':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
    }

    const trends = await Order.aggregate([
      {
        $match: {
          'items.store': new Types.ObjectId(storeId),
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.store': new Types.ObjectId(storeId)
        }
      },
      {
        $group: {
          _id: dateFormat,
          revenue: { $sum: '$items.subtotal' },
          orders: { $addToSet: '$_id' },
          items: { $sum: '$items.quantity' }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          revenue: { $round: ['$revenue', 2] },
          orders: { $size: '$orders' },
          items: 1,
          averageOrderValue: {
            $round: [{ $divide: ['$revenue', { $size: '$orders' }] }, 2]
          }
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    return trends;
  }

  /**
   * Get top selling products with full product details
   */
  static async getTopSellingProducts(
    storeId: string,
    limit: number = 10,
    sortBy: 'quantity' | 'revenue' = 'revenue',
    startDate?: Date,
    endDate?: Date
  ): Promise<TopProduct[]> {
    const sortField = sortBy === 'quantity' ? 'totalQuantity' : 'totalRevenue';

    // Build date filter
    const dateFilter: any = {
      'items.store': new Types.ObjectId(storeId),
      status: { $nin: ['cancelled', 'refunded'] }
    };

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    const topProducts = await Order.aggregate([
      {
        $match: dateFilter
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.store': new Types.ObjectId(storeId)
        }
      },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          orderCount: { $sum: 1 },
          avgPrice: { $avg: '$items.price' }
        }
      },
      // Lookup product details from Product collection
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $unwind: {
          path: '$productDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      // Lookup category name from Category collection
      {
        $lookup: {
          from: 'categories',
          localField: 'productDetails.category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      {
        $unwind: {
          path: '$categoryDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          productId: { $toString: '$_id' },
          productName: 1,
          totalQuantity: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          orderCount: 1,
          averagePrice: { $round: ['$avgPrice', 2] },
          // Additional product details
          sku: { $ifNull: ['$productDetails.sku', 'N/A'] },
          category: { $ifNull: ['$categoryDetails.name', 'General'] },
          categoryId: { $toString: { $ifNull: ['$productDetails.category', null] } },
          currentStock: { $ifNull: ['$productDetails.inventory.stock', null] },
          isAvailable: { $ifNull: ['$productDetails.inventory.isAvailable', true] },
          avgRating: { $ifNull: ['$productDetails.ratings.average', 0] },
          reviewCount: { $ifNull: ['$productDetails.ratings.totalReviews', 0] },
          // Product image for display
          imageUrl: { $arrayElemAt: [{ $ifNull: ['$productDetails.images', []] }, 0] }
        }
      },
      {
        $sort: { [sortField]: -1 }
      },
      {
        $limit: limit
      }
    ]);

    // Log for debugging
    logger.info('[AnalyticsService] getTopSellingProducts result:', JSON.stringify(topProducts.slice(0, 2), null, 2));

    return topProducts;
  }

  /**
   * Get category performance
   */
  static async getCategoryPerformance(
    storeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CategoryPerformance[]> {
    // Build date filter
    const dateFilter: any = {
      'items.store': new Types.ObjectId(storeId),
      status: { $nin: ['cancelled', 'refunded'] }
    };

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    // First get total revenue for percentage calculation
    const totalRevenueResult = await Order.aggregate([
      {
        $match: dateFilter
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.store': new Types.ObjectId(storeId)
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$items.subtotal' }
        }
      }
    ]);

    const totalRevenue = totalRevenueResult[0]?.totalRevenue || 1; // Avoid division by zero

    // Get products with their categories
    const products = await Product.find({ store: storeId }).select('_id category').lean();
    const productCategoryMap = new Map(
      products.map((p: any) => [(p._id as any).toString(), p.category?.toString() || 'uncategorized'])
    );

    // Aggregate by category
    const categoryStats = await Order.aggregate([
      {
        $match: dateFilter
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.store': new Types.ObjectId(storeId)
        }
      },
      {
        $group: {
          _id: '$items.product',
          revenue: { $sum: '$items.subtotal' },
          orders: { $addToSet: '$_id' }
        }
      }
    ]);

    // Group by category
    const categoryMap = new Map<string, {
      revenue: number;
      orders: Set<string>;
      products: Set<string>;
    }>();

    categoryStats.forEach((stat: any) => {
      const productId = stat._id.toString();
      const categoryId = productCategoryMap.get(productId) || 'uncategorized';

      if (!categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          revenue: 0,
          orders: new Set(),
          products: new Set()
        });
      }

      const category = categoryMap.get(categoryId)!;
      category.revenue += stat.revenue;
      stat.orders.forEach((orderId: any) => category.orders.add(orderId.toString()));
      category.products.add(productId);
    });

    // Convert to array and calculate metrics
    const categoryPerformance: CategoryPerformance[] = [];

    // Batch-fetch category names to avoid N+1 queries
    const categoryIds = Array.from(categoryMap.keys())
      .filter((id) => id !== 'uncategorized' && Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const categoryDocs = categoryIds.length > 0
      ? await Category.find({ _id: { $in: categoryIds } }, { name: 1 }).lean()
      : [];
    const categoryNameMap = new Map<string, string>();
    for (const c of categoryDocs) {
      categoryNameMap.set(c._id.toString(), c.name);
    }

    for (const [categoryId, data] of categoryMap.entries()) {
      const orderCount = data.orders.size;

      categoryPerformance.push({
        categoryId,
        categoryName: categoryNameMap.get(categoryId) || (categoryId === 'uncategorized' ? 'Uncategorized' : categoryId),
        totalRevenue: Math.round(data.revenue * 100) / 100,
        totalOrders: orderCount,
        totalProducts: data.products.size,
        averageOrderValue: orderCount > 0 ? Math.round((data.revenue / orderCount) * 100) / 100 : 0,
        revenueShare: Math.round((data.revenue / totalRevenue) * 10000) / 100
      });
    }

    return categoryPerformance.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Get customer insights
   */
  static async getCustomerInsights(
    storeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CustomerInsight> {
    // Build date filter
    const dateFilter: any = {
      'items.store': new Types.ObjectId(storeId),
      status: { $nin: ['cancelled', 'refunded'] }
    };

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    // Get all orders for the store
    const customerStats = await Order.aggregate([
      {
        $match: dateFilter
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.store': new Types.ObjectId(storeId)
        }
      },
      {
        $group: {
          _id: '$user',
          orderIds: { $addToSet: '$_id' },
          totalSpent: { $sum: '$items.subtotal' },
          lastOrderDate: { $max: '$createdAt' },
          firstOrderDate: { $min: '$createdAt' }
        }
      },
      {
        $project: {
          _id: 0,
          userId: { $toString: '$_id' },
          totalOrders: { $size: '$orderIds' },
          totalSpent: { $round: ['$totalSpent', 2] },
          lastOrderDate: 1,
          firstOrderDate: 1
        }
      }
    ]);

    const totalCustomers = customerStats.length;
    const totalOrders = customerStats.reduce((sum, c) => sum + c.totalOrders, 0);
    const totalRevenue = customerStats.reduce((sum, c) => sum + c.totalSpent, 0);

    // Calculate new vs returning (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newCustomers = customerStats.filter(c => c.firstOrderDate >= thirtyDaysAgo).length;
    const returningCustomers = customerStats.filter(c => c.totalOrders > 1).length;

    const averageOrdersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0;
    const customerLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const repeatCustomerRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    // Get top 10 customers with real names (batch lookup to avoid N+1)
    const topCustomerIds = customerStats
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((c) => c.userId);

    const validObjectIds = topCustomerIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    const userDocs = validObjectIds.length > 0
      ? await User.find({ _id: { $in: validObjectIds } }, { name: 1, firstName: 1, lastName: 1, email: 1 }).lean()
      : [];
    const userMap = new Map<string, any>();
    for (const u of userDocs) {
      userMap.set(u._id.toString(), u);
    }

    const topCustomers = topCustomerIds.map((userId) => {
      const user = userMap.get(userId);
      const fullName = user
        ? (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || null)
        : null;
      const original = customerStats.find((c) => c.userId === userId);
      return {
        userId,
        userName: fullName || `Customer ${userId.substring(0, 8)}`, // graceful fallback if user record was deleted
        totalOrders: original?.totalOrders ?? 0,
        totalSpent: original?.totalSpent ?? 0,
        lastOrderDate: original?.lastOrderDate
      };
    });

    return {
      totalCustomers,
      newCustomers,
      returningCustomers,
      averageOrdersPerCustomer: Math.round(averageOrdersPerCustomer * 100) / 100,
      customerLifetimeValue: Math.round(customerLifetimeValue * 100) / 100,
      repeatCustomerRate: Math.round(repeatCustomerRate * 100) / 100,
      topCustomers
    };
  }

  /**
   * Get inventory status
   */
  static async getInventoryStatus(storeId: string): Promise<InventoryStatus> {
    const products = await Product.find({ store: storeId }).lean();

    const totalProducts = products.length;
    const inStockProducts = products.filter(p =>
      p.inventory.unlimited || (p.inventory.isAvailable && p.inventory.stock > 0)
    ).length;

    const lowStockProducts = products.filter(p =>
      !p.inventory.unlimited &&
      p.inventory.stock > 0 &&
      p.inventory.stock <= (p.inventory.lowStockThreshold || 5)
    ).length;

    const outOfStockProducts = products.filter(p =>
      !p.inventory.unlimited && p.inventory.stock === 0
    ).length;

    // Overstock calculation (stock > 100 units for non-unlimited products)
    const overstockedProducts = products.filter(p =>
      !p.inventory.unlimited && p.inventory.stock > 100
    ).length;

    // Low stock items detail
    const lowStockItems = products
      .filter(p =>
        !p.inventory.unlimited &&
        p.inventory.stock > 0 &&
        p.inventory.stock <= (p.inventory.lowStockThreshold || 5)
      )
      .map((p: any) => ({
        productId: (p._id as any).toString(),
        productName: p.name,
        currentStock: p.inventory.stock,
        lowStockThreshold: p.inventory.lowStockThreshold || 5,
        reorderLevel: (p.inventory.lowStockThreshold || 5) * 2 // Suggest reorder level
      }))
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 20);

    // Out of stock items detail
    const outOfStockItems = products
      .filter(p => !p.inventory.unlimited && p.inventory.stock === 0)
      .map((p: any) => ({
        productId: (p._id as any).toString(),
        productName: p.name,
        lastSoldDate: p.inventory.estimatedRestockDate
      }))
      .slice(0, 20);

    return {
      totalProducts,
      inStockProducts,
      lowStockProducts,
      outOfStockProducts,
      overstockedProducts,
      lowStockItems,
      outOfStockItems
    };
  }

  /**
   * Get sales by time of day
   */
  static async getSalesByTimeOfDay(storeId: string): Promise<Array<{
    hour: number;
    revenue: number;
    orders: number;
  }>> {
    const salesByHour = await Order.aggregate([
      {
        $match: {
          'items.store': new Types.ObjectId(storeId),
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.store': new Types.ObjectId(storeId)
        }
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          revenue: { $sum: '$items.subtotal' },
          orders: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          _id: 0,
          hour: '$_id',
          revenue: { $round: ['$revenue', 2] },
          orders: { $size: '$orders' }
        }
      },
      {
        $sort: { hour: 1 }
      }
    ]);

    return salesByHour;
  }

  /**
   * Get sales by day of week
   */
  static async getSalesByDayOfWeek(storeId: string): Promise<Array<{
    dayOfWeek: number; // 1=Sunday, 7=Saturday
    dayName: string;
    revenue: number;
    orders: number;
  }>> {
    const salesByDay = await Order.aggregate([
      {
        $match: {
          'items.store': new Types.ObjectId(storeId),
          status: { $nin: ['cancelled', 'refunded'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $match: {
          'items.store': new Types.ObjectId(storeId)
        }
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          revenue: { $sum: '$items.subtotal' },
          orders: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          _id: 0,
          dayOfWeek: '$_id',
          revenue: { $round: ['$revenue', 2] },
          orders: { $size: '$orders' }
        }
      },
      {
        $sort: { dayOfWeek: 1 }
      }
    ]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return salesByDay.map(d => ({
      ...d,
      dayName: dayNames[d.dayOfWeek - 1] || 'Unknown'
    }));
  }

  /**
   * Get payment method breakdown
   */
  static async getPaymentMethodBreakdown(
    storeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Array<{
    method: string;
    revenue: number;
    orders: number;
    percentage: number;
  }>> {
    // Build date filter
    const dateFilter: any = {
      'items.store': new Types.ObjectId(storeId),
      status: { $nin: ['cancelled', 'refunded'] }
    };

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    const paymentStats = await Order.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: '$payment.method',
          revenue: { $sum: '$totals.total' },
          orders: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          method: '$_id',
          revenue: { $round: ['$revenue', 2] },
          orders: 1
        }
      },
      {
        $sort: { revenue: -1 }
      }
    ]);

    const totalRevenue = paymentStats.reduce((sum, p) => sum + p.revenue, 0) || 1;

    return paymentStats.map(p => ({
      ...p,
      percentage: Math.round((p.revenue / totalRevenue) * 10000) / 100
    }));
  }
}
