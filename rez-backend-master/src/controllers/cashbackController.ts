// Cashback Controller
// Handles user cashback API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import cashbackService from '../services/cashbackService';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Get cashback summary
 * GET /api/cashback/summary
 */
export const getCashbackSummary = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    logger.info('[CASHBACK CONTROLLER] getCashbackSummary called');
    logger.info('[CASHBACK CONTROLLER] userId:', { userId });

    if (!userId) {
      logger.warn('[CASHBACK CONTROLLER] No userId found - unauthorized');
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    logger.info('[CASHBACK CONTROLLER] Fetching summary for user:', { userId });
    const summary = await cashbackService.getUserSummary(new Types.ObjectId(userId));

    logger.info('[CASHBACK CONTROLLER] Summary result', { data: summary });

    res.status(200).json({
      success: true,
      data: summary,
    });
});

/**
 * Get cashback history with filters
 * GET /api/cashback/history
 */
export const getCashbackHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { status, source, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (source) filters.source = source;
    if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
    if (dateTo) filters.dateTo = new Date(dateTo as string);

    const result = await cashbackService.getUserCashbackHistory(
      new Types.ObjectId(userId),
      filters,
      Number(page),
      Number(limit)
    );

    res.status(200).json({
      success: true,
      data: result,
    });
});

/**
 * Get pending cashback ready for credit
 * GET /api/cashback/pending
 */
export const getPendingCashback = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const cashbacks = await cashbackService.getPendingReadyForCredit(
      new Types.ObjectId(userId)
    );

    const totalAmount = cashbacks.reduce((sum, cb) => sum + cb.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        cashbacks,
        totalAmount,
        count: cashbacks.length,
      },
    });
});

/**
 * Get expiring soon cashback
 * GET /api/cashback/expiring-soon
 */
export const getExpiringSoon = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { days = 7 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const cashbacks = await cashbackService.getExpiringSoon(
      new Types.ObjectId(userId),
      Number(days)
    );

    const totalAmount = cashbacks.reduce((sum, cb) => sum + cb.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        cashbacks,
        totalAmount,
        count: cashbacks.length,
      },
    });
});

/**
 * Redeem pending cashback
 * POST /api/cashback/redeem
 */
export const redeemCashback = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const result = await cashbackService.redeemPendingCashback(
      new Types.ObjectId(userId)
    );

    if (result.count === 0) {
      res.status(400).json({
        success: false,
        message: 'No cashback available for redemption',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Successfully redeemed ₹${result.totalAmount} cashback`,
      data: result,
    });
});

/**
 * Get active cashback campaigns
 * GET /api/cashback/campaigns
 */
export const getCashbackCampaigns = asyncHandler(async (req: Request, res: Response) => {
    const campaigns = await cashbackService.getActiveCampaigns();

    res.status(200).json({
      success: true,
      data: { campaigns },
    });
});

/**
 * Forecast cashback for cart
 * POST /api/cashback/forecast
 */
export const forecastCashback = asyncHandler(async (req: Request, res: Response) => {
    const { cartData } = req.body;

    if (!cartData || !cartData.items || !cartData.subtotal) {
      res.status(400).json({
        success: false,
        message: 'Cart data with items and subtotal is required',
      });
      return;
    }

    const forecast = await cashbackService.forecastCashbackForCart(cartData);

    res.status(200).json({
      success: true,
      data: forecast,
    });
});

/**
 * Get cashback statistics
 * GET /api/cashback/statistics
 */
export const getCashbackStatistics = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { period = 'month' } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const validPeriods = ['day', 'week', 'month', 'year'];
    if (!validPeriods.includes(period as string)) {
      res.status(400).json({
        success: false,
        message: 'Invalid period. Must be one of: day, week, month, year',
      });
      return;
    }

    const statistics = await cashbackService.getCashbackStatistics(
      new Types.ObjectId(userId),
      period as 'day' | 'week' | 'month' | 'year'
    );

    res.status(200).json({
      success: true,
      data: statistics,
    });
});
