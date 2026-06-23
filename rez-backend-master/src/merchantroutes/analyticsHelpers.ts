/**
 * Analytics helpers (Phase 6.3)
 *
 * Shared between analyticsCore.ts, analyticsOverview.ts, and analyticsExport.ts.
 */

import { Request, Response } from "express";
import { Store } from "../models/Store";
import { logger } from "../config/logger";

/**
 * Helper function to calculate trend based on current vs previous value
 */
export function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  if (previous === 0) return current > 0 ? 'up' : 'stable';
  const changePercent = ((current - previous) / previous) * 100;
  if (changePercent > 5) return 'up';
  if (changePercent < -5) return 'down';
  return 'stable';
}

/**
 * Helper function to calculate growth percentage
 */
export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 10000) / 100;
}

/**
 * Helper function to get store ID from merchant
 * Accepts optional storeId from query params for multi-store merchants
 */
export async function getStoreId(req: Request, res: Response): Promise<string | null> {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return null;
    }

    // Check if storeId is provided in query params
    const requestedStoreId = req.query.storeId as string | undefined;

    if (requestedStoreId) {
      // Verify the merchant owns this store
      const store = await Store.findOne({
        _id: requestedStoreId,
        merchantId
      }).lean();

      if (!store) {
        res.status(403).json({
          success: false,
          message: 'Store not found or you do not have access to this store'
        });
        return null;
      }

      return store._id.toString();
    }

    // Fall back to finding first store owned by this merchant
    const store = await Store.findOne({ merchantId }).lean();
    if (!store) {
      res.status(404).json({ success: false, message: 'Store not found for merchant' });
      return null;
    }

    return store._id.toString();
  } catch (error) {
    logger.error('Error getting store ID:', error);
    res.status(500).json({ success: false, message: 'Failed to get store information' });
    return null;
  }
}

/**
 * Parse date range from query parameters
 * Supports both legacy 'period' format and new 'preset' format
 */
export function parseDateRange(query: any): { startDate: Date; endDate: Date } {
  const { startDate, endDate, period, preset } = query;

  if (startDate && endDate) {
    return {
      startDate: new Date(startDate as string),
      endDate: new Date(endDate as string)
    };
  }

  // Default periods
  const end = new Date();
  const start = new Date();

  // Use preset if provided, otherwise fall back to period
  const datePreset = preset || period;

  switch (datePreset) {
    // New preset format (7d, 14d, 30d, 90d, 1y)
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '14d':
      start.setDate(start.getDate() - 14);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    // Legacy period format
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      // Default to last 30 days
      start.setDate(start.getDate() - 30);
  }

  return { startDate: start, endDate: end };
}