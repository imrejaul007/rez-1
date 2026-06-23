import { BusinessMetricsService } from './BusinessMetrics';
import { OrderModel } from '../models/MerchantOrder';
import { ProductModel } from '../models/MerchantProduct';
import { CashbackModel } from '../models/Cashback';

export interface ExportOptions {
  format: 'csv' | 'json' | 'excel';
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeCharts?: boolean;
  sections?: string[]; // Which sections to include
}

export interface ExportData {
  metadata: {
    merchantId: string;
    exportedAt: Date;
    dateRange?: {
      start: Date;
      end: Date;
    };
    format: string;
    sections: string[];
  };
  dashboard: {
    metrics: any;
    overview: any;
    notifications: any[];
  };
  orders?: any[];
  products?: any[];
  cashback?: any[];
  analytics?: {
    timeSeriesData: any[];
    categoryPerformance: any[];
    customerInsights: any;
  };
}

export class ExportService {
  
  static async exportDashboardData(merchantId: string, options: ExportOptions): Promise<{
    data: any;
    filename: string;
    contentType: string;
  }> {
    const exportData = await this.gatherExportData(merchantId, options);
    
    switch (options.format) {
      case 'csv':
        return this.generateCSVExport(exportData);
      case 'json':
        return this.generateJSONExport(exportData);
      case 'excel':
        return this.generateExcelExport(exportData);
      default:
        throw new Error('Unsupported export format');
    }
  }

  private static async gatherExportData(merchantId: string, options: ExportOptions): Promise<ExportData> {
    const sections = options.sections || ['dashboard', 'orders', 'products', 'cashback', 'analytics'];
    const dateRange = options.dateRange;

    const exportData: ExportData = {
      metadata: {
        merchantId,
        exportedAt: new Date(),
        dateRange,
        format: options.format,
        sections
      },
      dashboard: {
        metrics: null,
        overview: null,
        notifications: []
      }
    };

    // Always include dashboard data
    if (sections.includes('dashboard')) {
      const [metrics, overview, notifications] = await Promise.all([
        BusinessMetricsService.getDashboardMetrics(merchantId),
        this.getDashboardOverview(merchantId),
        this.getNotifications(merchantId)
      ]);

      exportData.dashboard = {
        metrics,
        overview,
        notifications
      };
    }

    // Include orders data
    if (sections.includes('orders')) {
      let orders = await OrderModel.findByMerchantId(merchantId);
      
      if (dateRange) {
        orders = orders.filter(order => 
          order.createdAt >= dateRange.start && order.createdAt <= dateRange.end
        );
      }

      exportData.orders = orders.map(order => ({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        itemCount: order.items.length,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        source: order.source,
        priority: order.priority
      }));
    }

    // Include products data
    if (sections.includes('products')) {
      const products = await ProductModel.findByMerchantId(merchantId);
      
      exportData.products = products.map(product => ({
        name: product.name,
        sku: product.sku,
        category: product.category,
        price: product.price,
        costPrice: product.costPrice,
        stock: product.inventory.stock,
        lowStockThreshold: product.inventory.lowStockThreshold,
        status: product.status,
        cashbackPercentage: product.cashback.percentage,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      }));
    }

    // Include cashback data
    if (sections.includes('cashback')) {
      let cashbackRequests = await CashbackModel.findByMerchantId(merchantId);
      
      if (dateRange) {
        cashbackRequests = cashbackRequests.filter(request => 
          request.createdAt >= dateRange.start && request.createdAt <= dateRange.end
        );
      }

      exportData.cashback = cashbackRequests.map(request => ({
        requestNumber: request.requestNumber,
        customerName: request.customer.name,
        customerEmail: request.customer.email,
        orderNumber: request.order.orderNumber,
        requestedAmount: request.requestedAmount,
        approvedAmount: request.approvedAmount,
        status: request.status,
        riskScore: request.riskScore,
        flaggedForReview: request.flaggedForReview,
        createdAt: request.createdAt,
        reviewedAt: request.reviewedAt,
        paidAt: request.paidAt
      }));
    }

    // Include analytics data
    if (sections.includes('analytics')) {
      const [timeSeriesData, categoryPerformance, customerInsights] = await Promise.all([
        BusinessMetricsService.getTimeSeriesData(merchantId, 30),
        BusinessMetricsService.getCategoryPerformance(merchantId),
        BusinessMetricsService.getCustomerInsights(merchantId)
      ]);

      exportData.analytics = {
        timeSeriesData,
        categoryPerformance,
        customerInsights
      };
    }

    return exportData;
  }

  private static async getDashboardOverview(merchantId: string) {
    const [
      totalProducts,
      totalOrders,
      pendingOrders,
      totalCashback
    ] = await Promise.all([
      ProductModel.countByMerchant(merchantId),
      OrderModel.countByMerchant(merchantId),
      OrderModel.countByStatus(merchantId, 'placed'),
      CashbackModel.getMetrics(merchantId)
    ]);

    return {
      totalProducts,
      totalOrders,
      pendingOrders,
      pendingCashback: totalCashback.totalPendingRequests
    };
  }

  private static async getNotifications(merchantId: string) {
    const [
      lowStockProducts,
      pendingOrders,
      pendingCashback
    ] = await Promise.all([
      ProductModel.findLowStock(merchantId),
      OrderModel.findByStatus(merchantId, 'placed'),
(async () => {
        const result = await CashbackModel.search({ merchantId, status: 'pending', flaggedOnly: true });
        return result.requests || [];
      })()
    ]);

    const notifications = [];

    if (lowStockProducts.length > 0) {
      notifications.push({
        type: 'warning',
        title: 'Low Stock Alert',
        message: `${lowStockProducts.length} product(s) are running low on stock`,
        count: lowStockProducts.length
      });
    }

    if (pendingOrders.length > 0) {
      notifications.push({
        type: 'info',
        title: 'Pending Orders',
        message: `${pendingOrders.length} order(s) require processing`,
        count: pendingOrders.length
      });
    }

    if (pendingCashback.length > 0) {
      notifications.push({
        type: 'error',
        title: 'High-Risk Cashback',
        message: `${pendingCashback.length} cashback request(s) flagged for review`,
        count: pendingCashback.length
      });
    }

    return notifications;
  }

  private static generateCSVExport(exportData: ExportData): {
    data: string;
    filename: string;
    contentType: string;
  } {
    let csvContent = '';
    
    // Add metadata
    csvContent += 'DASHBOARD EXPORT REPORT\n';
    csvContent += `Merchant ID,${exportData.metadata.merchantId}\n`;
    csvContent += `Exported At,${exportData.metadata.exportedAt.toISOString()}\n`;
    if (exportData.metadata.dateRange) {
      csvContent += `Date Range,${exportData.metadata.dateRange.start.toISOString()} to ${exportData.metadata.dateRange.end.toISOString()}\n`;
    }
    csvContent += '\n';

    // Dashboard Metrics
    if (exportData.dashboard.metrics) {
      csvContent += 'DASHBOARD METRICS\n';
      csvContent += 'Metric,Value\n';
      const metrics = exportData.dashboard.metrics;
      csvContent += `Total Revenue,$${metrics.totalRevenue.toFixed(2)}\n`;
      csvContent += `Monthly Revenue,$${metrics.monthlyRevenue.toFixed(2)}\n`;
      csvContent += `Revenue Growth,${metrics.revenueGrowth.toFixed(2)}%\n`;
      csvContent += `Total Orders,${metrics.totalOrders}\n`;
      csvContent += `Monthly Orders,${metrics.monthlyOrders}\n`;
      csvContent += `Average Order Value,$${metrics.averageOrderValue.toFixed(2)}\n`;
      csvContent += `Total Products,${metrics.totalProducts}\n`;
      csvContent += `Active Products,${metrics.activeProducts}\n`;
      csvContent += `Low Stock Products,${metrics.lowStockProducts}\n`;
      csvContent += `Total Customers,${metrics.totalCustomers}\n`;
      csvContent += `Customer Growth,${metrics.customerGrowth.toFixed(2)}%\n`;
      csvContent += `Total Cashback Paid,$${metrics.totalCashbackPaid.toFixed(2)}\n`;
      csvContent += `Pending Cashback,$${metrics.pendingCashback.toFixed(2)}\n`;
      csvContent += `Profit Margin,${metrics.profitMargin.toFixed(2)}%\n`;
      csvContent += '\n';
    }

    // Orders
    if (exportData.orders && exportData.orders.length > 0) {
      csvContent += 'ORDERS\n';
      csvContent += 'Order Number,Customer Name,Customer Email,Status,Total,Items,Created At,Source,Priority\n';
      exportData.orders.forEach(order => {
        csvContent += `${order.orderNumber},${order.customerName},${order.customerEmail},${order.status},$${order.total.toFixed(2)},${order.itemCount},${order.createdAt},${order.source},${order.priority}\n`;
      });
      csvContent += '\n';
    }

    // Products
    if (exportData.products && exportData.products.length > 0) {
      csvContent += 'PRODUCTS\n';
      csvContent += 'Name,SKU,Category,Price,Cost Price,Stock,Low Stock Threshold,Status,Cashback %\n';
      exportData.products.forEach(product => {
        csvContent += `"${product.name}",${product.sku},${product.category},$${product.price.toFixed(2)},$${(product.costPrice || 0).toFixed(2)},${product.stock},${product.lowStockThreshold},${product.status},${product.cashbackPercentage}%\n`;
      });
      csvContent += '\n';
    }

    // Cashback
    if (exportData.cashback && exportData.cashback.length > 0) {
      csvContent += 'CASHBACK REQUESTS\n';
      csvContent += 'Request Number,Customer Name,Order Number,Requested Amount,Approved Amount,Status,Risk Score,Flagged,Created At\n';
      exportData.cashback.forEach(request => {
        csvContent += `${request.requestNumber},${request.customerName},${request.orderNumber},$${request.requestedAmount.toFixed(2)},$${(request.approvedAmount || 0).toFixed(2)},${request.status},${request.riskScore},${request.flaggedForReview ? 'Yes' : 'No'},${request.createdAt}\n`;
      });
      csvContent += '\n';
    }

    // Analytics - Time Series
    if (exportData.analytics?.timeSeriesData && exportData.analytics.timeSeriesData.length > 0) {
      csvContent += 'TIME SERIES DATA\n';
      csvContent += 'Date,Revenue,Orders,Customers,Cashback\n';
      exportData.analytics.timeSeriesData.forEach(data => {
        csvContent += `${data.date},$${data.revenue.toFixed(2)},${data.orders},${data.customers},$${data.cashback.toFixed(2)}\n`;
      });
      csvContent += '\n';
    }

    // Analytics - Category Performance
    if (exportData.analytics?.categoryPerformance && exportData.analytics.categoryPerformance.length > 0) {
      csvContent += 'CATEGORY PERFORMANCE\n';
      csvContent += 'Category,Revenue,Orders,Products,Growth %\n';
      exportData.analytics.categoryPerformance.forEach(category => {
        csvContent += `${category.categoryName},$${category.revenue.toFixed(2)},${category.orders},${category.products},${category.growth.toFixed(2)}%\n`;
      });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `dashboard-export-${exportData.metadata.merchantId}-${timestamp}.csv`;

    return {
      data: csvContent,
      filename,
      contentType: 'text/csv'
    };
  }

  private static generateJSONExport(exportData: ExportData): {
    data: string;
    filename: string;
    contentType: string;
  } {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `dashboard-export-${exportData.metadata.merchantId}-${timestamp}.json`;

    return {
      data: JSON.stringify(exportData, null, 2),
      filename,
      contentType: 'application/json'
    };
  }

  private static generateExcelExport(exportData: ExportData): {
    data: string;
    filename: string;
    contentType: string;
  } {
    // For now, we'll generate a detailed JSON structure that can be processed by the frontend
    // In a real application, you'd use a library like 'exceljs' to generate actual Excel files
    const excelData = {
      ...exportData,
      exportFormat: 'excel',
      worksheets: [
        {
          name: 'Dashboard Metrics',
          data: exportData.dashboard.metrics ? this.metricsToTableData(exportData.dashboard.metrics) : []
        },
        {
          name: 'Orders',
          data: exportData.orders || []
        },
        {
          name: 'Products',
          data: exportData.products || []
        },
        {
          name: 'Cashback',
          data: exportData.cashback || []
        },
        {
          name: 'Time Series',
          data: exportData.analytics?.timeSeriesData || []
        },
        {
          name: 'Categories',
          data: exportData.analytics?.categoryPerformance || []
        }
      ]
    };

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `dashboard-export-${exportData.metadata.merchantId}-${timestamp}.xlsx`;

    return {
      data: JSON.stringify(excelData, null, 2),
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  private static metricsToTableData(metrics: any): Array<{key: string; value: string}> {
    return [
      { key: 'Total Revenue', value: `$${metrics.totalRevenue.toFixed(2)}` },
      { key: 'Monthly Revenue', value: `$${metrics.monthlyRevenue.toFixed(2)}` },
      { key: 'Revenue Growth', value: `${metrics.revenueGrowth.toFixed(2)}%` },
      { key: 'Total Orders', value: metrics.totalOrders.toString() },
      { key: 'Monthly Orders', value: metrics.monthlyOrders.toString() },
      { key: 'Average Order Value', value: `$${metrics.averageOrderValue.toFixed(2)}` },
      { key: 'Total Products', value: metrics.totalProducts.toString() },
      { key: 'Active Products', value: metrics.activeProducts.toString() },
      { key: 'Low Stock Products', value: metrics.lowStockProducts.toString() },
      { key: 'Total Customers', value: metrics.totalCustomers.toString() },
      { key: 'Customer Growth', value: `${metrics.customerGrowth.toFixed(2)}%` },
      { key: 'Total Cashback Paid', value: `$${metrics.totalCashbackPaid.toFixed(2)}` },
      { key: 'Pending Cashback', value: `$${metrics.pendingCashback.toFixed(2)}` },
      { key: 'Profit Margin', value: `${metrics.profitMargin.toFixed(2)}%` }
    ];
  }

  // Generate scheduled reports
  static async generateScheduledReport(merchantId: string, reportType: 'daily' | 'weekly' | 'monthly'): Promise<ExportData> {
    const now = new Date();
    let dateRange: { start: Date; end: Date };

    switch (reportType) {
      case 'daily':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        dateRange = { start: startOfDay, end: endOfDay };
        break;
      
      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        dateRange = { start: startOfWeek, end: now };
        break;
      
      case 'monthly':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        dateRange = { start: startOfMonth, end: now };
        break;
    }

    return await this.gatherExportData(merchantId, {
      format: 'json',
      dateRange,
      sections: ['dashboard', 'orders', 'products', 'cashback', 'analytics']
    });
  }

  // Export specific data types
  static async exportOrders(merchantId: string, options: {
    format: 'csv' | 'json';
    dateRange?: { start: Date; end: Date };
    status?: string;
  }) {
    let orders = await OrderModel.findByMerchantId(merchantId);
    
    if (options.dateRange) {
      orders = orders.filter(order => 
        order.createdAt >= options.dateRange!.start && order.createdAt <= options.dateRange!.end
      );
    }

    if (options.status) {
      orders = orders.filter(order => order.status === options.status);
    }

    const exportData = {
      metadata: {
        merchantId,
        exportedAt: new Date(),
        type: 'orders',
        format: options.format,
        dateRange: options.dateRange,
        filters: { status: options.status }
      },
      orders: orders.map(order => ({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customer?.phone || '',
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        items: order.items,
        deliveryAddress: order.deliveryAddress,
        payment: order.payment,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        source: order.source,
        priority: order.priority
      }))
    };

    if (options.format === 'csv') {
      let csvContent = 'Order Number,Customer Name,Customer Email,Phone,Status,Subtotal,Tax,Shipping,Total,Items Count,Source,Priority,Created At\n';
      exportData.orders.forEach(order => {
        csvContent += `${order.orderNumber},"${order.customerName}",${order.customerEmail},${order.customerPhone},${order.status},$${order.subtotal.toFixed(2)},$${order.tax.toFixed(2)},$${order.shipping.toFixed(2)},$${order.total.toFixed(2)},${order.items.length},${order.source},${order.priority},${order.createdAt}\n`;
      });

      const timestamp = new Date().toISOString().split('T')[0];
      return {
        data: csvContent,
        filename: `orders-export-${merchantId}-${timestamp}.csv`,
        contentType: 'text/csv'
      };
    } else {
      const timestamp = new Date().toISOString().split('T')[0];
      return {
        data: JSON.stringify(exportData, null, 2),
        filename: `orders-export-${merchantId}-${timestamp}.json`,
        contentType: 'application/json'
      };
    }
  }
}