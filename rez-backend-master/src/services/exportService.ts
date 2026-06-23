import { logger } from '../config/logger';
import { Job } from 'bull';
import { AnalyticsService } from '../merchantservices/AnalyticsService';

export interface ExportJobData {
  storeId: string;
  exportType: 'sales' | 'products' | 'customers' | 'orders';
  format: 'csv' | 'json';
  startDate?: Date;
  endDate?: Date;
  filters?: any;
}

export interface ExportResult {
  success: boolean;
  fileUrl?: string;
  fileName?: string;
  recordCount?: number;
  error?: string;
}

export class ExportService {
  /**
   * Process export job
   */
  static async processExport(job: Job<ExportJobData>): Promise<ExportResult> {
    try {
      const { storeId, exportType, format, startDate, endDate } = job.data;

      // Update progress
      await job.progress(10);

      // Fetch data based on export type
      let data: any[] = [];
      let fileName = '';

      switch (exportType) {
        case 'sales':
          data = await this.exportSalesData(storeId, startDate, endDate);
          fileName = `sales-export-${Date.now()}.${format}`;
          break;

        case 'products':
          data = await this.exportProductsData(storeId);
          fileName = `products-export-${Date.now()}.${format}`;
          break;

        case 'customers':
          data = await this.exportCustomersData(storeId);
          fileName = `customers-export-${Date.now()}.${format}`;
          break;

        case 'orders':
          data = await this.exportOrdersData(storeId, startDate, endDate);
          fileName = `orders-export-${Date.now()}.${format}`;
          break;

        default:
          throw new Error(`Unknown export type: ${exportType}`);
      }

      await job.progress(50);

      // Generate file content
      let fileContent: string;
      if (format === 'csv') {
        fileContent = this.convertToCSV(data);
      } else {
        fileContent = JSON.stringify(data, null, 2);
      }

      await job.progress(80);

      // In a real implementation, you would:
      // 1. Upload file to S3/Cloud Storage
      // 2. Generate a signed URL
      // 3. Return the URL
      // For now, we'll simulate this
      const fileUrl = `/exports/${fileName}`;

      await job.progress(100);

      return {
        success: true,
        fileUrl,
        fileName,
        recordCount: data.length
      };
    } catch (error: any) {
      logger.error('Export processing error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export sales data
   */
  private static async exportSalesData(
    storeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const salesData = await AnalyticsService.getSalesOverview(storeId, start, end);

    return [{
      period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
      totalRevenue: salesData.totalRevenue,
      totalOrders: salesData.totalOrders,
      averageOrderValue: salesData.averageOrderValue,
      totalItems: salesData.totalItems,
      revenueGrowth: salesData.revenueGrowth,
      ordersGrowth: salesData.ordersGrowth
    }];
  }

  /**
   * Export products data
   */
  private static async exportProductsData(storeId: string): Promise<any[]> {
    const products = await AnalyticsService.getTopSellingProducts(storeId, 100, 'revenue');

    return products.map((product: any) => ({
      productId: product.productId,
      productName: product.productName,
      totalQuantity: product.totalQuantity,
      totalRevenue: product.totalRevenue,
      averagePrice: product.averagePrice,
      orderCount: product.orderCount
    }));
  }

  /**
   * Export customers data
   */
  private static async exportCustomersData(storeId: string): Promise<any[]> {
    const customerInsights = await AnalyticsService.getCustomerInsights(storeId);

    // Return customer summary
    return [
      {
        metric: 'Total Customers',
        value: customerInsights.totalCustomers
      },
      {
        metric: 'New Customers',
        value: customerInsights.newCustomers
      },
      {
        metric: 'Returning Customers',
        value: customerInsights.returningCustomers
      },
      {
        metric: 'Average Orders Per Customer',
        value: customerInsights.averageOrdersPerCustomer
      },
      {
        metric: 'Customer Lifetime Value',
        value: customerInsights.customerLifetimeValue
      },
      {
        metric: 'Repeat Customer Rate',
        value: `${customerInsights.repeatCustomerRate}%`
      }
    ];
  }

  /**
   * Export orders data
   */
  private static async exportOrdersData(
    storeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const salesData = await AnalyticsService.getSalesOverview(storeId, start, end);

    return [
      {
        period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        totalOrders: salesData.totalOrders,
        totalRevenue: salesData.totalRevenue,
        averageOrderValue: salesData.averageOrderValue,
        totalItems: salesData.totalItems,
        revenueGrowth: salesData.revenueGrowth,
        ordersGrowth: salesData.ordersGrowth
      }
    ];
  }

  /**
   * Convert array of objects to CSV
   */
  private static convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
      return '';
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');

    // Convert rows
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = value?.toString() || '';
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }
}
