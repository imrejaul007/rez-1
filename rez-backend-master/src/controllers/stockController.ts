import { Request, Response } from 'express';
import stockAuditService from '../services/stockAuditService';
import { logger } from '../config/logger';
import { StockChangeType } from '../models/StockHistory';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Get stock history for a product
 */
export const getProductStockHistory = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const {
      variantType,
      variantValue,
      startDate,
      endDate,
      changeTypes,
      limit,
      skip
    } = req.query;

    const filters: any = {};

    if (variantType && variantValue) {
      filters.variant = {
        type: variantType as string,
        value: variantValue as string
      };
    }

    if (startDate) {
      filters.startDate = new Date(startDate as string);
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
    }

    if (changeTypes) {
      filters.changeTypes = (changeTypes as string).split(',') as StockChangeType[];
    }

    if (limit) {
      filters.limit = parseInt(limit as string);
    }

    if (skip) {
      filters.skip = parseInt(skip as string);
    }

    const history = await stockAuditService.getStockHistory(productId, filters);

    res.json({
      success: true,
      data: history,
      count: history.length
    });
});

/**
 * Get stock snapshot at a specific date
 */
export const getStockSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { date, variantType, variantValue } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const snapshotDate = new Date(date as string);

    let variant;
    if (variantType && variantValue) {
      variant = {
        type: variantType as string,
        value: variantValue as string
      };
    }

    const stock = await stockAuditService.getStockSnapshot(productId, snapshotDate, variant);

    res.json({
      success: true,
      data: {
        productId,
        date: snapshotDate,
        variant,
        stock
      }
    });
});

/**
 * Detect stock anomalies for a store
 */
export const detectStockAnomalies = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { days, threshold } = req.query;

    const options: any = {};

    if (days) {
      options.days = parseInt(days as string);
    }

    if (threshold) {
      options.threshold = parseInt(threshold as string);
    }

    const anomalies = await stockAuditService.detectAnomalies(storeId, options);

    res.json({
      success: true,
      data: anomalies,
      count: anomalies.length
    });
});

/**
 * Generate stock report for a date range
 */
export const generateStockReport = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const report = await stockAuditService.generateStockReport(storeId, start, end);

    res.json({
      success: true,
      data: {
        storeId,
        startDate: start,
        endDate: end,
        report
      }
    });
});

/**
 * Get stock movement summary for a product
 */
export const getStockMovementSummary = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { startDate, endDate, variantType, variantValue } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    let variant;
    if (variantType && variantValue) {
      variant = {
        type: variantType as string,
        value: variantValue as string
      };
    }

    const summary = await stockAuditService.getStockMovementSummary(
      productId,
      start,
      end,
      variant
    );

    res.json({
      success: true,
      data: summary
    });
});

/**
 * Get low stock alerts for a store
 */
export const getLowStockAlerts = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { threshold } = req.query;

    const alertThreshold = threshold ? parseInt(threshold as string) : 10;

    const alerts = await stockAuditService.getLowStockAlerts(storeId, alertThreshold);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
});

/**
 * Get stock value over time for a store
 */
export const getStockValueOverTime = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { startDate, endDate, interval } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const timeInterval = (interval as 'day' | 'week' | 'month') || 'day';

    const valueOverTime = await stockAuditService.getStockValueOverTime(
      storeId,
      start,
      end,
      timeInterval
    );

    res.json({
      success: true,
      data: {
        storeId,
        startDate: start,
        endDate: end,
        interval: timeInterval,
        data: valueOverTime
      }
    });
});
