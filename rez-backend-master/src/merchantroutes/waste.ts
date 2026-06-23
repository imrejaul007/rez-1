/**
 * merchantroutes/waste.ts
 * Waste tracking and analytics routes for merchants
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { WasteLog } from '../models/WasteLog';
import { Order } from '../models/Order';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * POST /merchant/waste
 * Log a waste entry
 */
router.post('/waste', async (req: Request, res: Response) => {
  try {
    const { storeId, itemName, quantity, unit, costPerUnit, reason, shift, notes } = req.body;

    if (!storeId || !itemName || quantity === undefined || !unit || costPerUnit === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'storeId, itemName, quantity, unit, costPerUnit, and reason are required',
      });
    }

    const wasteCost = quantity * costPerUnit;

    const wasteLog = new WasteLog({
      merchantId: req.merchantId,
      storeId,
      itemName,
      quantity,
      unit,
      costPerUnit,
      wasteCost,
      reason,
      shift: shift || 'day',
      notes,
      loggedAt: new Date(),
    });

    await wasteLog.save();

    return res.status(201).json({
      success: true,
      data: wasteLog,
      message: 'Waste logged successfully',
    });
  } catch (error) {
    logger.error('Error logging waste:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log waste',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/waste
 * List waste entries with optional filters
 */
router.get('/waste', async (req: Request, res: Response) => {
  try {
    const { storeId, startDate, endDate, shift } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const filter: any = { storeId, merchantId: req.merchantId };

    if (startDate && endDate) {
      filter.loggedAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    if (shift) {
      filter.shift = shift;
    }

    const wasteLogs = await WasteLog.find(filter).sort({ loggedAt: -1 });

    return res.json({
      success: true,
      data: wasteLogs,
      count: wasteLogs.length,
    });
  } catch (error) {
    logger.error('Error fetching waste logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch waste logs',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/waste/summary
 * Get aggregate waste statistics
 */
router.get('/waste/summary', async (req: Request, res: Response) => {
  try {
    const { storeId, days = 30 } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const daysNum = parseInt(days as string, 10) || 30;
    const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    const wasteLogs = await WasteLog.find({
      storeId,
      merchantId: req.merchantId,
      loggedAt: { $gte: startDate },
    });

    const totalWasteCost = wasteLogs.reduce((sum, log) => sum + (log as any).wasteCost, 0);

    // Group by reason
    const byReason: Record<string, { count: number; cost: number }> = {};
    wasteLogs.forEach((log) => {
      const l = log as any;
      if (!byReason[l.reason]) {
        byReason[l.reason] = { count: 0, cost: 0 };
      }
      byReason[l.reason].count += 1;
      byReason[l.reason].cost += l.wasteCost;
    });

    // Group by date for trend
    const trend: Array<{ date: string; cost: number; count: number }> = [];
    const dateMap: Record<string, { cost: number; count: number }> = {};

    wasteLogs.forEach((log) => {
      const l = log as any;
      const dateStr = new Date(l.loggedAt).toISOString().split('T')[0];
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = { cost: 0, count: 0 };
      }
      dateMap[dateStr].cost += l.wasteCost;
      dateMap[dateStr].count += 1;
    });

    Object.entries(dateMap).forEach(([date, data]) => {
      trend.push({ date, cost: data.cost, count: data.count });
    });

    trend.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Get top wasted items
    const itemMap: Record<string, { count: number; cost: number; quantity: number }> = {};
    wasteLogs.forEach((log) => {
      const l = log as any;
      if (!itemMap[l.itemName]) {
        itemMap[l.itemName] = { count: 0, cost: 0, quantity: 0 };
      }
      itemMap[l.itemName].count += 1;
      itemMap[l.itemName].cost += l.wasteCost;
      itemMap[l.itemName].quantity += l.quantity;
    });

    const topWastedItems = Object.entries(itemMap)
      .map(([itemName, data]) => ({
        itemName,
        count: data.count,
        cost: Math.round(data.cost * 100) / 100,
        quantity: data.quantity,
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // Calculate wasteAsPctOfRevenue by summing completed order totals for the same period
    let wastePercentageOfRevenue = 0;
    let periodRevenue = 0;
    try {
      const storeObjectId = mongoose.Types.ObjectId.isValid(storeId as string)
        ? new mongoose.Types.ObjectId(storeId as string)
        : null;
      if (storeObjectId) {
        const revenueAgg = await Order.aggregate([
          {
            $match: {
              'items.store': storeObjectId,
              status: { $in: ['delivered', 'completed'] },
              createdAt: { $gte: startDate },
            },
          },
          { $group: { _id: null, total: { $sum: '$totals.total' } } },
        ]);
        periodRevenue = revenueAgg[0]?.total ?? 0;
        if (periodRevenue > 0) {
          wastePercentageOfRevenue = Math.round((totalWasteCost / periodRevenue) * 10000) / 100;
        }
      }
    } catch {
      // Non-fatal
    }

    // Target: 3% of revenue is a typical F&B industry benchmark
    const targetPercentage = 3;
    const potentialSavings =
      wastePercentageOfRevenue > targetPercentage && periodRevenue > 0
        ? Math.round(((wastePercentageOfRevenue - targetPercentage) / 100) * periodRevenue * 100) / 100
        : 0;

    // Transform byReason Record → Array expected by frontend
    const byReasonArray = Object.entries(byReason).map(([reason, data]) => ({
      reason,
      amount: Math.round(data.cost * 100) / 100,
      count: data.count,
      percentage: totalWasteCost > 0 ? Math.round((data.cost / totalWasteCost) * 10000) / 100 : 0,
    }));

    // Transform trend → recentLogs shape expected by frontend
    const recentLogs = trend.map((t) => ({ date: t.date, amount: t.cost }));

    return res.json({
      success: true,
      data: {
        totalWaste: Math.round(totalWasteCost * 100) / 100,
        wastePercentageOfRevenue,
        targetPercentage,
        potentialSavings,
        byReason: byReasonArray,
        byCategory: [],
        recentLogs,
        topWastedItems,
        period: `Last ${daysNum} days`,
      },
    });
  } catch (error) {
    logger.error('Error fetching waste summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch waste summary',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
