// Re-imports for Settings section
/**
 * Store Payment Controller — Settings & Stats section (Phase 6.2)
 *
 * Extracted from the original monolithic storePaymentController.ts. Handles:
 * - Store payment settings (get/update)
 * - Merchant payment statistics
 *
 * QR section lives in storePaymentQRController.ts.
 * Payment flow lives in storePaymentFlowController.ts.
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Store, IStorePaymentSettings } from '../models/Store';
import { StorePayment, IPaymentRewards } from '../models/StorePayment';
import { asyncHandler } from '../utils/asyncHandler';
import { withCache } from '../utils/cacheHelper';

/* resolveRootCategorySlug and VALID_MAIN_CATEGORY_SLUGS are in storePaymentFlowController.ts (settings section does not use them) */

// ==================== PAYMENT SETTINGS HANDLERS ====================

/**
 * Get payment settings for a store
 * GET /api/store-payment/settings/:storeId
 */
export const getPaymentSettings = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const merchantId = req.merchantId;

    const store = await withCache(
      `store:payment-config:${storeId}:${merchantId}`,
      300,
      () => Store.findOne({ _id: storeId, merchantId })
        .select('name isActive paymentSettings rewardRules storeQR category')
        .lean()
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    // Return settings with defaults if not set
    const defaultPaymentSettings = {
      acceptUPI: true,
      acceptCards: true,
      acceptPayLater: false,
      acceptRezCoins: true,
      acceptPromoCoins: true,
      maxCoinRedemptionPercent: 100,
      allowHybridPayment: true,
      allowOffers: true,
      allowCashback: true,
      upiId: '',
      upiName: '',
    };

    const defaultRewardRules = {
      baseCashbackPercent: 5,
      reviewBonusCoins: 5,
      socialShareBonusCoins: 10,
      minimumAmountForReward: 100,
      extraRewardThreshold: undefined,
      extraRewardCoins: undefined,
      visitMilestoneRewards: [],
    };

    res.status(200).json({
      success: true,
      data: {
        storeName: store.name,
        paymentSettings: { ...defaultPaymentSettings, ...store.paymentSettings },
        rewardRules: { ...defaultRewardRules, ...store.rewardRules },
      },
    });
});

/**
 * Update payment settings for a store
 * PUT /api/store-payment/settings/:storeId
 */
export const updatePaymentSettings = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { paymentSettings, rewardRules } = req.body;
    const merchantId = req.merchantId;

    // Verify store belongs to merchant
    const store = await withCache(
      `store:payment-config:${storeId}:${merchantId}`,
      300,
      () => Store.findOne({ _id: storeId, merchantId })
        .select('name isActive paymentSettings rewardRules storeQR category')
        .lean()
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    // Validate payment settings
    if (paymentSettings) {
      if (
        paymentSettings.maxCoinRedemptionPercent !== undefined &&
        (paymentSettings.maxCoinRedemptionPercent < 0 ||
          paymentSettings.maxCoinRedemptionPercent > 100)
      ) {
        return res.status(400).json({
          success: false,
          message: 'maxCoinRedemptionPercent must be between 0 and 100',
        });
      }
    }

    // Validate reward rules
    if (rewardRules) {
      if (
        rewardRules.baseCashbackPercent !== undefined &&
        (rewardRules.baseCashbackPercent < 0 || rewardRules.baseCashbackPercent > 100)
      ) {
        return res.status(400).json({
          success: false,
          message: 'baseCashbackPercent must be between 0 and 100',
        });
      }
    }

    // Update settings
    const updateData: any = {};
    if (paymentSettings) {
      updateData.paymentSettings = { ...store.paymentSettings, ...paymentSettings };
    }
    if (rewardRules) {
      updateData.rewardRules = { ...store.rewardRules, ...rewardRules };
    }

    const updatedStore = await Store.findByIdAndUpdate(storeId, updateData, { new: true }).select(
      'paymentSettings rewardRules name'
    );

    res.status(200).json({
      success: true,
      message: 'Payment settings updated successfully',
      data: {
        storeName: updatedStore?.name,
        paymentSettings: updatedStore?.paymentSettings,
        rewardRules: updatedStore?.rewardRules,
      },
    });
});


// ==================== MERCHANT PAYMENT STATS ====================

// ==================== MERCHANT PAYMENT STATS ====================

/**
 * Get payment statistics for a store (merchant only)
 * GET /api/store-payment/stats/:storeId
 */
export const getStorePaymentStats = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;

    if (!storeId || !mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ success: false, message: 'Invalid store ID' });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    const [todayStats, monthStats, paymentMethodBreakdown] = await Promise.all([
      // Today's stats
      StorePayment.aggregate([
        { $match: { storeId: storeObjectId, status: 'completed', completedAt: { $gte: todayStart } } },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$billAmount' } } },
      ]),
      // This month's stats
      StorePayment.aggregate([
        { $match: { storeId: storeObjectId, status: 'completed', completedAt: { $gte: monthStart } } },
        { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$billAmount' }, avgValue: { $avg: '$billAmount' } } },
      ]),
      // Payment method breakdown (this month)
      StorePayment.aggregate([
        { $match: { storeId: storeObjectId, status: 'completed', completedAt: { $gte: monthStart } } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$billAmount' } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const today = todayStats[0] || { count: 0, revenue: 0 };
    const month = monthStats[0] || { count: 0, revenue: 0, avgValue: 0 };

    res.json({
      success: true,
      data: {
        today: {
          paymentCount: today.count,
          revenue: today.revenue,
        },
        thisMonth: {
          paymentCount: month.count,
          revenue: month.revenue,
          averageTransactionValue: Math.round(month.avgValue || 0),
        },
        paymentMethods: paymentMethodBreakdown.map((pm: any) => ({
          method: pm._id,
          count: pm.count,
          total: pm.total,
        })),
      },
    });
});
