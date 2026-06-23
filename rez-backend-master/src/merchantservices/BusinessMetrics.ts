import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { logger } from '../config/logger';
import { CashbackModel } from '../models/Cashback';
import mongoose from 'mongoose';

export interface DashboardMetrics {
  // Revenue Metrics
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  averageOrderValue: number;

  // Order Metrics
  totalOrders: number;
  monthlyOrders: number;
  ordersGrowth: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;

  // Product Metrics
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  topSellingProducts: Array<{
    productId: string;
    name: string;
    totalSold: number;
    revenue: number;
  }>;

  // Customer Metrics
  totalCustomers: number;
  monthlyCustomers: number;
  customerGrowth: number;
  returningCustomers: number;

  // Cashback Metrics
  totalCashbackPaid: number;
  monthlyCashbackPaid: number;
  pendingCashback: number;
  cashbackROI: number;

  // Performance Metrics
  averageOrderProcessingTime: number; // in hours
  customerSatisfactionScore: number;
  inventoryTurnover: number;
  profitMargin: number;
}

export interface TimeSeriesData {
  date: string;
  revenue: number;
  orders: number;
  items: number;
  customers: number;
  cashback: number;
}

export interface CategoryPerformance {
  categoryId: string;
  categoryName: string;
  revenue: number;
  orders: number;
  products: number;
  growth: number;
}

export interface CustomerInsights {
  newCustomers: number;
  returningCustomers: number;
  customerLifetimeValue: number;
  averageOrdersPerCustomer: number;
  topCustomers: Array<{
    customerId: string;
    name: string;
    totalSpent: number;
    orderCount: number;
  }>;
}

export class BusinessMetricsService {
  /**
   * Get all store IDs belonging to a merchant
   */
  private static async getMerchantStoreIds(merchantId: string): Promise<mongoose.Types.ObjectId[]> {
    const stores = await Store.find({ merchantId: new mongoose.Types.ObjectId(merchantId) }).select('_id').lean();
    return stores.map(s => s._id as mongoose.Types.ObjectId);
  }

  static async getDashboardMetrics(merchantId: string, storeId?: string): Promise<DashboardMetrics> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get merchant's store IDs, optionally filtered to a specific store
    const allStoreIds = await this.getMerchantStoreIds(merchantId);
    logger.info('[DASHBOARD DEBUG] merchantId:', merchantId);
    logger.info('[DASHBOARD DEBUG] allStoreIds found:', allStoreIds.length, allStoreIds.map(id => id.toString()));
    const filterStoreIds = storeId
      ? allStoreIds.filter(id => id.toString() === storeId)
      : allStoreIds;
    logger.info('[DASHBOARD DEBUG] storeId filter:', storeId || 'none');
    logger.info('[DASHBOARD DEBUG] filterStoreIds:', filterStoreIds.length);

    if (filterStoreIds.length === 0) {
      logger.info('[DASHBOARD DEBUG] No stores found — returning empty metrics');
      // No stores found — return empty metrics
      return this.emptyMetrics();
    }

    const storeFilter = { 'items.store': { $in: filterStoreIds } };

    // Get all data in parallel
    const [
      orders,
      monthlyOrders,
      lastMonthOrders,
      products,
      cashbackRequests
    ] = await Promise.all([
      Order.find(storeFilter).populate('user', 'fullName email phone').lean(),
      Order.find({ ...storeFilter, createdAt: { $gte: startOfMonth, $lte: now } }).populate('user', 'fullName email phone').lean(),
      Order.find({ ...storeFilter, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }).populate('user', 'fullName email phone').lean(),
      Product.find({ store: { $in: filterStoreIds } }).lean(),
      CashbackModel.findByMerchantId(merchantId)
    ]);
    logger.info('[DASHBOARD DEBUG] orders found:', orders.length);
    logger.info('[DASHBOARD DEBUG] products found:', products.length);

    // Calculate revenue metrics using real schema fields
    const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.totals?.total || 0), 0);
    const monthlyRevenue = monthlyOrders.reduce((sum: number, order: any) => sum + (order.totals?.total || 0), 0);
    const lastMonthRevenue = lastMonthOrders.reduce((sum: number, order: any) => sum + (order.totals?.total || 0), 0);
    const revenueGrowth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Calculate order metrics — real orders use 'placed' instead of 'pending'
    const totalOrders = orders.length;
    const ordersGrowth = lastMonthOrders.length > 0 ? ((monthlyOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100 : 0;
    const pendingOrders = orders.filter((order: any) => order.status === 'placed').length;
    const completedOrders = orders.filter((order: any) => order.status === 'delivered').length;
    const cancelledOrders = orders.filter((order: any) => order.status === 'cancelled').length;

    // Calculate product metrics — real products use isActive boolean
    const totalProducts = products.length;
    const activeProducts = products.filter((product: any) => product.isActive === true).length;
    const lowStockProducts = products.filter((product: any) =>
      !product.inventory?.unlimited &&
      product.inventory?.stock <= (product.inventory?.lowStockThreshold || 5)
    ).length;

    // Calculate top selling products using real schema field names
    const productSales = new Map<string, { name: string; totalSold: number; revenue: number }>();
    orders.forEach((order: any) => {
      if (!order.items) return;
      order.items.forEach((item: any) => {
        const productId = item.product?.toString() || '';
        const existing = productSales.get(productId) || { name: item.name || '', totalSold: 0, revenue: 0 };
        existing.totalSold += item.quantity || 0;
        existing.revenue += item.subtotal || 0;
        productSales.set(productId, existing);
      });
    });

    const topSellingProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 5);

    // Calculate customer metrics — real orders use 'user' (ObjectId) for customer
    const uniqueCustomers = new Set(orders.map((order: any) => {
      const user = order.user;
      return typeof user === 'object' && user?._id ? user._id.toString() : user?.toString() || '';
    }));
    const monthlyUniqueCustomers = new Set(monthlyOrders.map((order: any) => {
      const user = order.user;
      return typeof user === 'object' && user?._id ? user._id.toString() : user?.toString() || '';
    }));
    const lastMonthUniqueCustomers = new Set(lastMonthOrders.map((order: any) => {
      const user = order.user;
      return typeof user === 'object' && user?._id ? user._id.toString() : user?.toString() || '';
    }));

    const totalCustomers = uniqueCustomers.size;
    const monthlyCustomers = monthlyUniqueCustomers.size;
    const customerGrowth = lastMonthUniqueCustomers.size > 0 ?
      ((monthlyCustomers - lastMonthUniqueCustomers.size) / lastMonthUniqueCustomers.size) * 100 : 0;

    // Calculate returning customers
    const customerOrderCounts = new Map<string, number>();
    orders.forEach((order: any) => {
      const user = order.user;
      const userId = typeof user === 'object' && user?._id ? user._id.toString() : user?.toString() || '';
      customerOrderCounts.set(userId, (customerOrderCounts.get(userId) || 0) + 1);
    });
    const returningCustomers = Array.from(customerOrderCounts.values()).filter(count => count > 1).length;

    // Calculate cashback metrics (unchanged — CashbackModel already queries correct collection)
    const paidCashback = cashbackRequests.filter(req => req.status === 'paid');
    const monthlyPaidCashback = paidCashback.filter(req => req.paidAt && req.paidAt >= startOfMonth);
    const pendingCashbackRequests = cashbackRequests.filter(req => req.status === 'pending');

    const totalCashbackPaid = paidCashback.reduce((sum, req) => sum + (req.approvedAmount || req.requestedAmount), 0);
    const monthlyCashbackPaid = monthlyPaidCashback.reduce((sum, req) => sum + (req.approvedAmount || req.requestedAmount), 0);
    const pendingCashback = pendingCashbackRequests.reduce((sum, req) => sum + req.requestedAmount, 0);
    const cashbackROI = totalCashbackPaid > 0 ? (totalRevenue / totalCashbackPaid) * 100 : 0;

    // Calculate performance metrics
    const completedOrdersWithTimes = orders.filter((order: any) =>
      order.status === 'delivered' && order.createdAt && order.updatedAt
    );
    const averageOrderProcessingTime = completedOrdersWithTimes.length > 0 ?
      completedOrdersWithTimes.reduce((sum: number, order: any) => {
        const processingTime = (new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
        return sum + processingTime;
      }, 0) / completedOrdersWithTimes.length : 0;

    const customerSatisfactionScore = 4.5;
    const inventoryTurnover = totalRevenue > 0 ? totalRevenue / (products.length * 100) : 0;
    const totalCost = orders.reduce((sum: number, order: any) => sum + ((order.totals?.total || 0) * 0.7), 0);
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      monthlyRevenue,
      revenueGrowth,
      averageOrderValue,
      totalOrders,
      monthlyOrders: monthlyOrders.length,
      ordersGrowth,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalProducts,
      activeProducts,
      lowStockProducts,
      topSellingProducts,
      totalCustomers,
      monthlyCustomers,
      customerGrowth,
      returningCustomers,
      totalCashbackPaid,
      monthlyCashbackPaid,
      pendingCashback,
      cashbackROI,
      averageOrderProcessingTime,
      customerSatisfactionScore,
      inventoryTurnover,
      profitMargin
    };
  }

  static async getTimeSeriesData(merchantId: string, days: number = 30, storeId?: string): Promise<TimeSeriesData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Get merchant's store IDs
    const allStoreIds = await this.getMerchantStoreIds(merchantId);
    const filterStoreIds = storeId
      ? allStoreIds.filter(id => id.toString() === storeId)
      : allStoreIds;

    const orders = filterStoreIds.length > 0
      ? await Order.find({
          'items.store': { $in: filterStoreIds },
          createdAt: { $gte: startDate, $lte: endDate }
        }).populate('user', 'fullName').lean()
      : [];

    const cashbackResult = await CashbackModel.search({
      merchantId,
      dateRange: { start: startDate, end: endDate }
    });
    const cashbackRequests = cashbackResult.requests;

    // Group data by day
    const dataByDay = new Map<string, {
      revenue: number;
      orders: number;
      items: number;
      customers: Set<string>;
      cashback: number;
    }>();

    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dataByDay.set(dateKey, {
        revenue: 0,
        orders: 0,
        items: 0,
        customers: new Set(),
        cashback: 0
      });
    }

    // Aggregate orders using real schema fields
    orders.forEach((order: any) => {
      const dateKey = new Date(order.createdAt).toISOString().split('T')[0];
      const dayData = dataByDay.get(dateKey);
      if (dayData) {
        dayData.revenue += order.totals?.total || 0;
        dayData.orders += 1;

        // Customer ID from populated user or raw ObjectId
        const user = order.user;
        const userId = typeof user === 'object' && user?._id ? user._id.toString() : user?.toString() || '';
        dayData.customers.add(userId);

        if (order.items && Array.isArray(order.items)) {
          const totalItems = order.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
          dayData.items += totalItems;
        }
      }
    });

    // Aggregate cashback
    cashbackRequests.forEach(request => {
      if (request.status === 'paid' && request.paidAt) {
        const dateKey = request.paidAt.toISOString().split('T')[0];
        const dayData = dataByDay.get(dateKey);
        if (dayData) {
          dayData.cashback += request.approvedAmount || request.requestedAmount;
        }
      }
    });

    // Convert to array
    return Array.from(dataByDay.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
        items: data.items,
        customers: data.customers.size,
        cashback: data.cashback
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  static async getCategoryPerformance(merchantId: string, storeId?: string): Promise<CategoryPerformance[]> {
    // Get merchant's store IDs
    const allStoreIds = await this.getMerchantStoreIds(merchantId);
    const filterStoreIds = storeId
      ? allStoreIds.filter(id => id.toString() === storeId)
      : allStoreIds;

    if (filterStoreIds.length === 0) return [];

    const products = await Product.find({ store: { $in: filterStoreIds } }).populate('category', 'name').lean();
    const orders = await Order.find({ 'items.store': { $in: filterStoreIds } }).lean();

    // Calculate current month and last month data
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonthOrdersList = orders.filter((order: any) => new Date(order.createdAt) >= startOfMonth);
    const lastMonthOrdersList = orders.filter((order: any) => {
      const d = new Date(order.createdAt);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    });

    // Group products by category (ObjectId)
    const categoriesMap = new Map<string, {
      categoryName: string;
      productIds: Set<string>;
    }>();

    products.forEach((product: any) => {
      const catId = product.category?._id?.toString() || product.category?.toString() || 'uncategorized';
      const catName = (typeof product.category === 'object' && product.category?.name)
        ? product.category.name
        : catId;

      if (!categoriesMap.has(catId)) {
        categoriesMap.set(catId, {
          categoryName: catName,
          productIds: new Set()
        });
      }
      categoriesMap.get(catId)!.productIds.add(product._id.toString());
    });

    // Calculate performance for each category
    const categoryPerformance: CategoryPerformance[] = [];

    categoriesMap.forEach((categoryData, categoryId) => {
      const categoryProductIds = categoryData.productIds;

      let thisMonthRevenue = 0;
      let lastMonthRevenue = 0;
      let totalRevenue = 0;
      let totalOrders = 0;

      // Helper to check items against category products
      const processOrders = (orderList: any[], accRevenue: { value: number }, accOrders: { value: number }) => {
        orderList.forEach((order: any) => {
          if (!order.items) return;
          order.items.forEach((item: any) => {
            const pid = item.product?.toString() || '';
            if (categoryProductIds.has(pid)) {
              accRevenue.value += item.subtotal || 0;
              accOrders.value += 1;
            }
          });
        });
      };

      const tmr = { value: 0 };
      const tmo = { value: 0 };
      processOrders(thisMonthOrdersList, tmr, tmo);
      thisMonthRevenue = tmr.value;

      const lmr = { value: 0 };
      const lmo = { value: 0 };
      processOrders(lastMonthOrdersList, lmr, lmo);
      lastMonthRevenue = lmr.value;

      const tr = { value: 0 };
      const to = { value: 0 };
      processOrders(orders, tr, to);
      totalRevenue = tr.value;
      totalOrders = to.value;

      const growth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

      categoryPerformance.push({
        categoryId,
        categoryName: categoryData.categoryName,
        revenue: totalRevenue,
        orders: totalOrders,
        products: categoryProductIds.size,
        growth
      });
    });

    return categoryPerformance.sort((a, b) => b.revenue - a.revenue);
  }

  static async getCustomerInsights(merchantId: string, storeId?: string): Promise<CustomerInsights> {
    // Get merchant's store IDs
    const allStoreIds = await this.getMerchantStoreIds(merchantId);
    const filterStoreIds = storeId
      ? allStoreIds.filter(id => id.toString() === storeId)
      : allStoreIds;

    if (filterStoreIds.length === 0) {
      return { newCustomers: 0, returningCustomers: 0, customerLifetimeValue: 0, averageOrdersPerCustomer: 0, topCustomers: [] };
    }

    const orders = await Order.find({ 'items.store': { $in: filterStoreIds } })
      .populate('user', 'fullName email phone')
      .lean();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Group orders by customer (user)
    const customerData = new Map<string, {
      name: string;
      totalSpent: number;
      orderCount: number;
      firstOrderDate: Date;
    }>();

    orders.forEach((order: any) => {
      const user = order.user;
      const customerId = typeof user === 'object' && user?._id ? user._id.toString() : user?.toString() || '';
      const customerName = typeof user === 'object' && user?.fullName ? user.fullName : 'Unknown Customer';

      const existing = customerData.get(customerId) || {
        name: customerName,
        totalSpent: 0,
        orderCount: 0,
        firstOrderDate: new Date(order.createdAt)
      };

      existing.totalSpent += order.totals?.total || 0;
      existing.orderCount += 1;
      if (new Date(order.createdAt) < existing.firstOrderDate) {
        existing.firstOrderDate = new Date(order.createdAt);
      }

      customerData.set(customerId, existing);
    });

    // Calculate metrics
    const newCustomers = Array.from(customerData.values())
      .filter(customer => customer.firstOrderDate >= startOfMonth).length;

    const returningCustomers = Array.from(customerData.values())
      .filter(customer => customer.orderCount > 1).length;

    const totalCustomers = customerData.size;
    const totalRevenue = Array.from(customerData.values())
      .reduce((sum, customer) => sum + customer.totalSpent, 0);

    const customerLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
    const averageOrdersPerCustomer = totalCustomers > 0 ?
      Array.from(customerData.values()).reduce((sum, customer) => sum + customer.orderCount, 0) / totalCustomers : 0;

    // Get top customers
    const topCustomers = Array.from(customerData.entries())
      .map(([customerId, data]) => ({
        customerId,
        name: data.name,
        totalSpent: data.totalSpent,
        orderCount: data.orderCount
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    return {
      newCustomers,
      returningCustomers,
      customerLifetimeValue,
      averageOrdersPerCustomer,
      topCustomers
    };
  }

  static async getBusinessInsights(merchantId: string, storeId?: string): Promise<{
    insights: string[];
    recommendations: string[];
    alerts: string[];
  }> {
    const metrics = await this.getDashboardMetrics(merchantId, storeId);
    const categoryPerformance = await this.getCategoryPerformance(merchantId, storeId);
    const customerInsights = await this.getCustomerInsights(merchantId, storeId);

    const insights: string[] = [];
    const recommendations: string[] = [];
    const alerts: string[] = [];

    // Generate insights based on metrics
    if (metrics.revenueGrowth > 10) {
      insights.push(`Revenue is growing strongly at ${metrics.revenueGrowth.toFixed(1)}% this month`);
    } else if (metrics.revenueGrowth < -5) {
      alerts.push(`Revenue declined by ${Math.abs(metrics.revenueGrowth).toFixed(1)}% this month`);
      recommendations.push('Consider running promotions or reviewing product pricing');
    }

    if (metrics.lowStockProducts > 0) {
      alerts.push(`${metrics.lowStockProducts} products are running low on stock`);
      recommendations.push('Restock low inventory items to avoid stockouts');
    }

    if (metrics.pendingOrders > 10) {
      alerts.push(`${metrics.pendingOrders} orders are pending processing`);
      recommendations.push('Process pending orders quickly to improve customer satisfaction');
    }

    if (metrics.customerGrowth > 15) {
      insights.push(`Customer base is growing rapidly at ${metrics.customerGrowth.toFixed(1)}% this month`);
    }

    if (metrics.averageOrderValue < 50) {
      recommendations.push('Consider upselling or bundling products to increase average order value');
    }

    if (metrics.profitMargin < 20) {
      recommendations.push('Review cost structure and pricing to improve profit margins');
    }

    // Category insights
    const topCategory = categoryPerformance[0];
    if (topCategory) {
      insights.push(`${topCategory.categoryName} is your top performing category with $${topCategory.revenue.toFixed(2)} revenue`);
    }

    // Customer insights
    if (customerInsights.averageOrdersPerCustomer < 2) {
      recommendations.push('Focus on customer retention strategies to increase repeat purchases');
    }

    return { insights, recommendations, alerts };
  }

  /**
   * Returns empty metrics when merchant has no stores
   */
  private static emptyMetrics(): DashboardMetrics {
    return {
      totalRevenue: 0, monthlyRevenue: 0, revenueGrowth: 0, averageOrderValue: 0,
      totalOrders: 0, monthlyOrders: 0, ordersGrowth: 0, pendingOrders: 0, completedOrders: 0, cancelledOrders: 0,
      totalProducts: 0, activeProducts: 0, lowStockProducts: 0, topSellingProducts: [],
      totalCustomers: 0, monthlyCustomers: 0, customerGrowth: 0, returningCustomers: 0,
      totalCashbackPaid: 0, monthlyCashbackPaid: 0, pendingCashback: 0, cashbackROI: 0,
      averageOrderProcessingTime: 0, customerSatisfactionScore: 0, inventoryTurnover: 0, profitMargin: 0
    };
  }
}
