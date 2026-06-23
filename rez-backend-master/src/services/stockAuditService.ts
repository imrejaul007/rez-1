import { logger } from '../config/logger';
import { Types } from 'mongoose';
import { StockHistory, StockChangeType, IStockHistory } from '../models/StockHistory';
import { Product } from '../models/Product';

export interface StockChangeData {
  productId: string | Types.ObjectId;
  storeId: string | Types.ObjectId;
  variant?: {
    type: string;
    value: string;
  };
  previousStock: number;
  newStock: number;
  changeType: StockChangeType;
  userId?: string | Types.ObjectId;
  orderId?: string | Types.ObjectId;
  reservationId?: string | Types.ObjectId;
  reason?: string;
  notes?: string;
  metadata?: any;
}

export interface StockHistoryFilters {
  variant?: { type: string; value: string };
  startDate?: Date;
  endDate?: Date;
  changeTypes?: StockChangeType[];
  limit?: number;
  skip?: number;
}

export interface AnomalyDetectionOptions {
  days?: number;
  threshold?: number;
}

export interface StockAnomalyResult {
  product: Types.ObjectId;
  productName: string;
  changeAmount: number;
  changeType: StockChangeType;
  timestamp: Date;
  previousStock: number;
  newStock: number;
  reason?: string;
  absoluteChange: number;
  percentageChange: number;
}

export interface StockReportResult {
  _id: Types.ObjectId;
  productName: string;
  currentStock: number;
  changes: {
    changeType: StockChangeType;
    totalChanges: number;
    totalQuantity: number;
    absoluteQuantity: number;
  }[];
}

class StockAuditService {
  /**
   * Log a stock change in the audit trail
   */
  async logStockChange(data: StockChangeData): Promise<IStockHistory> {
    try {
      logger.info('📊 [STOCK AUDIT] Logging stock change:', {
        product: data.productId,
        changeType: data.changeType,
        previousStock: data.previousStock,
        newStock: data.newStock,
        changeAmount: data.newStock - data.previousStock
      });

      const historyEntry = await StockHistory.logStockChange(data);

      logger.info('📊 [STOCK AUDIT] Stock change logged successfully:', historyEntry._id);

      return historyEntry;
    } catch (error) {
      logger.error('📊 [STOCK AUDIT] Failed to log stock change:', error);
      throw new Error(`Failed to log stock change: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get stock history for a product
   */
  async getStockHistory(
    productId: string | Types.ObjectId,
    filters: StockHistoryFilters = {}
  ): Promise<IStockHistory[]> {
    try {
      logger.info('📊 [STOCK AUDIT] Fetching stock history for product:', productId);

      const history = await StockHistory.getProductHistory(productId.toString(), filters);

      logger.info('📊 [STOCK AUDIT] Found', history.length, 'history entries');

      return history;
    } catch (error) {
      logger.error('📊 [STOCK AUDIT] Failed to fetch stock history:', error);
      throw new Error(`Failed to fetch stock history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get stock snapshot at a specific date
   */
  async getStockSnapshot(
    productId: string | Types.ObjectId,
    date: Date,
    variant?: { type: string; value: string }
  ): Promise<number> {
    try {
      logger.info('📊 [STOCK AUDIT] Getting stock snapshot for product:', productId, 'at date:', date);

      const stock = await StockHistory.getStockSnapshot(productId.toString(), date);

      logger.info('📊 [STOCK AUDIT] Stock at', date, 'was:', stock);

      return stock;
    } catch (error) {
      logger.error('📊 [STOCK AUDIT] Failed to get stock snapshot:', error);
      throw new Error(`Failed to get stock snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect stock anomalies for a store
   */
  async detectAnomalies(
    storeId: string | Types.ObjectId,
    options: AnomalyDetectionOptions = {}
  ): Promise<StockAnomalyResult[]> {
    try {
      logger.info('📊 [STOCK AUDIT] Detecting anomalies for store:', storeId);

      const anomalies = await StockHistory.detectAnomalies(storeId.toString());

      logger.info('📊 [STOCK AUDIT] Found', anomalies.length, 'anomalies');

      return anomalies;
    } catch (error) {
      logger.error('📊 [STOCK AUDIT] Failed to detect anomalies:', error);
      throw new Error(`Failed to detect anomalies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate stock report for a date range
   */
  async generateStockReport(
    storeId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<StockReportResult[]> {
    try {
      logger.info('📊 [STOCK AUDIT] Generating stock report for store:', storeId);
      logger.info('📊 [STOCK AUDIT] Date range:', startDate, 'to', endDate);

      const report = await StockHistory.generateStockReport(startDate, endDate);

      logger.info('📊 [STOCK AUDIT] Report generated with', report.length, 'products');

      return report;
    } catch (error) {
      logger.error('📊 [STOCK AUDIT] Failed to generate stock report:', error);
      throw new Error(`Failed to generate stock report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get stock movement summary for a product
   */
  async getStockMovementSummary(
    productId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date,
    variant?: { type: string; value: string }
  ): Promise<{
    totalIn: number;
    totalOut: number;
    netChange: number;
    currentStock: number;
    movements: {
      changeType: StockChangeType;
      count: number;
      totalQuantity: number;
    }[];
  }> {
    try {
      logger.info('📊 [STOCK AUDIT] Getting stock movement summary for product:', productId);

      const query: any = {
        product: productId,
        timestamp: { $gte: startDate, $lte: endDate }
      };

      if (variant) {
        query['variant.type'] = variant.type;
        query['variant.value'] = variant.value;
      }

      const movements = await StockHistory.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$changeType',
            count: { $sum: 1 },
            totalQuantity: { $sum: '$changeAmount' }
          }
        }
      ]);

      const totalIn = movements
        .filter(m => m.totalQuantity > 0)
        .reduce((sum, m) => sum + m.totalQuantity, 0);

      const totalOut = movements
        .filter(m => m.totalQuantity < 0)
        .reduce((sum, m) => sum + Math.abs(m.totalQuantity), 0);

      const netChange = totalIn - totalOut;

      // Get current stock
      const product = await Product.findById(productId).lean() as any;
      let currentStock = 0;

      if (product) {
        if (variant && product.inventory.variants) {
          const variantObj = product.inventory.variants.find(
            (v: any) => v.type === variant.type && v.value === variant.value
          );
          currentStock = variantObj?.stock || 0;
        } else {
          currentStock = product.inventory.stock || 0;
        }
      }

      const formattedMovements = movements.map(m => ({
        changeType: m._id as StockChangeType,
        count: m.count,
        totalQuantity: m.totalQuantity
      }));

      return {
        totalIn,
        totalOut,
        netChange,
        currentStock,
        movements: formattedMovements
      };
    } catch (error) {
      logger.error('📊 [STOCK AUDIT] Failed to get stock movement summary:', error);
      throw new Error(`Failed to get stock movement summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get low stock alerts based on history
   */
  async getLowStockAlerts(
    storeId: string | Types.ObjectId,
    threshold: number = 10
  ): Promise<{
    product: any;
    currentStock: number;
    averageDailySales: number;
    daysUntilStockOut: number;
    recentHistory: IStockHistory[];
  }[]> {
    try {
      logger.info('📊 [STOCK AUDIT] Getting low stock alerts for store:', storeId);

      // Get products with low stock
      const products = await Product.find({
        store: storeId,
        'inventory.stock': { $lte: threshold },
        'inventory.isAvailable': true,
        isActive: true
      }).lean();

      const alerts = [];

      for (const product of products) {
        // Get last 30 days of sales
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const salesHistory = await StockHistory.find({
          product: product._id,
          changeType: 'purchase',
          timestamp: { $gte: thirtyDaysAgo }
        }).lean();

        const totalSold = salesHistory.reduce(
          (sum, entry) => sum + Math.abs(entry.changeAmount),
          0
        );
        const averageDailySales = totalSold / 30;
        const daysUntilStockOut =
          averageDailySales > 0 ? product.inventory.stock / averageDailySales : Infinity;

        alerts.push({
          product,
          currentStock: product.inventory.stock,
          averageDailySales,
          daysUntilStockOut,
          recentHistory: salesHistory.slice(0, 10)
        });
      }

      return alerts.sort((a, b) => a.daysUntilStockOut - b.daysUntilStockOut) as unknown as { product: any; currentStock: number; averageDailySales: number; daysUntilStockOut: number; recentHistory: IStockHistory[]; }[];
    } catch (error) {
      logger.error('📊 [STOCK AUDIT] Failed to get low stock alerts:', error);
      throw new Error(`Failed to get low stock alerts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get stock value over time
   */
  async getStockValueOverTime(
    storeId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date,
    interval: 'day' | 'week' | 'month' = 'day'
  ): Promise<{
    date: Date;
    totalStockValue: number;
    totalItems: number;
  }[]> {
    try {
      logger.info('📊 [STOCK AUDIT] Getting stock value over time for store:', storeId);

      let groupFormat: any;
      switch (interval) {
        case 'week':
          groupFormat = {
            year: { $year: '$timestamp' },
            week: { $week: '$timestamp' }
          };
          break;
        case 'month':
          groupFormat = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' }
          };
          break;
        default:
          groupFormat = {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          };
      }

      const valueOverTime = await StockHistory.aggregate([
        {
          $match: {
            store: new Types.ObjectId(storeId as string),
            timestamp: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        {
          $group: {
            _id: groupFormat,
            totalStockValue: {
              $sum: {
                $multiply: [
                  '$newStock',
                  { $ifNull: ['$productInfo.pricing.selling', 0] }
                ]
              }
            },
            totalItems: { $sum: '$newStock' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]);

      return valueOverTime.map((item: any) => ({
        date: new Date(item._id.year, (item._id.month || 1) - 1, item._id.day || 1),
        totalStockValue: item.totalStockValue,
        totalItems: item.totalItems
      }));
    } catch (error) {
      logger.error('📊 [STOCK AUDIT] Failed to get stock value over time:', error);
      throw new Error(`Failed to get stock value over time: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default new StockAuditService();
