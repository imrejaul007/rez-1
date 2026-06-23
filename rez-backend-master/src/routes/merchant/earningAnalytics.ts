import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/merchantauth';
import { Store } from '../../models/Store';
import { Wallet } from '../../models/Wallet';
import { CoinTransaction } from '../../models/CoinTransaction';
import CoinDrop from '../../models/CoinDrop';
import { Order } from '../../models/Order';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();
router.use(authMiddleware);

/**
 * @route   GET /api/merchant/stores/:storeId/earning-analytics
 * @desc    Get comprehensive earning analytics for a store
 * @access  Merchant (authenticated)
 */
router.get('/stores/:storeId/earning-analytics', asyncHandler(async (req: Request, res: Response) => {
    const merchantId = req.merchantId;
    const { storeId } = req.params;

    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant ID missing from request',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid store ID',
      });
    }

    // Verify store belongs to this merchant
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found',
      });
    }

    const storeMerchantId = (store as any).merchantId?.toString() || (store as any).merchant?.toString();
    if (storeMerchantId !== merchantId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this store',
      });
    }

    const storeObjectId = new mongoose.Types.ObjectId(storeId);

    // Calculate time boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start
    startOfWeek.setHours(0, 0, 0, 0);

    // Run all queries in parallel for performance
    const [
      coinsAwardedResult,
      coinDropStats,
      brandedCoinsResult,
      customerRepeatResult,
      topEarnersResult,
    ] = await Promise.all([
      // 1. Coins Awarded — aggregate CoinTransaction where metadata.storeId matches
      CoinTransaction.aggregate([
        {
          $match: {
            $or: [
              { 'metadata.storeId': storeId },
              { 'metadata.storeId': storeObjectId },
            ],
            type: { $in: ['earned', 'bonus', 'branded_award'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            thisMonth: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', startOfMonth] }, '$amount', 0],
              },
            },
            thisWeek: {
              $sum: {
                $cond: [{ $gte: ['$createdAt', startOfWeek] }, '$amount', 0],
              },
            },
          },
        },
      ]),

      // 2. CoinDrop stats
      CoinDrop.aggregate([
        { $match: { storeId: storeObjectId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$isActive', true] },
                      { $gte: ['$endTime', now] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            totalUsage: { $sum: '$usageCount' },
          },
        },
      ]),

      // 3. Branded Coins — aggregate across all customer wallets
      Wallet.aggregate([
        { $unwind: '$brandedCoins' },
        {
          $match: {
            'brandedCoins.merchantId': storeObjectId,
          },
        },
        {
          $group: {
            _id: null,
            inCirculation: { $sum: '$brandedCoins.amount' },
            totalWallets: { $sum: 1 },
          },
        },
      ]),

      // 4. Customer repeat rate — aggregate Orders by userId
      Order.aggregate([
        {
          $match: {
            $or: [
              { store: storeObjectId },
              { 'items.store': storeObjectId },
            ],
            status: { $nin: ['cancelled', 'refunded'] },
          },
        },
        {
          $group: {
            _id: '$user',
            orderCount: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            repeatCustomers: {
              $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] },
            },
          },
        },
      ]),

      // 5. Top earners — aggregate CoinTransaction by userId
      CoinTransaction.aggregate([
        {
          $match: {
            $or: [
              { 'metadata.storeId': storeId },
              { 'metadata.storeId': storeObjectId },
            ],
            type: { $in: ['earned', 'bonus', 'branded_award'] },
          },
        },
        {
          $group: {
            _id: '$user',
            totalCoins: { $sum: '$amount' },
            transactionCount: { $sum: 1 },
          },
        },
        { $sort: { totalCoins: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'orders',
            let: { userId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$user', '$$userId'] },
                  $or: [
                    { store: storeObjectId },
                    { 'items.store': storeObjectId },
                  ],
                  status: { $nin: ['cancelled', 'refunded'] },
                },
              },
              { $count: 'count' },
            ],
            as: 'orderInfo',
          },
        },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            totalCoins: 1,
            orderCount: {
              $ifNull: [{ $arrayElemAt: ['$orderInfo.count', 0] }, 0],
            },
          },
        },
      ]),
    ]);

    // Also get branded coins totals from CoinTransaction for awarded/redeemed
    const [brandedTotalsResult] = await Promise.all([
      CoinTransaction.aggregate([
        {
          $match: {
            $or: [
              { 'metadata.storeId': storeId },
              { 'metadata.storeId': storeObjectId },
            ],
            type: { $in: ['branded_award', 'earned', 'bonus', 'spent'] },
            source: { $in: ['merchant_award', 'purchase_reward', 'redemption', 'purchase'] },
          },
        },
        {
          $group: {
            _id: null,
            totalAwarded: {
              $sum: {
                $cond: [
                  { $in: ['$type', ['branded_award', 'earned', 'bonus']] },
                  '$amount',
                  0,
                ],
              },
            },
            totalRedeemed: {
              $sum: {
                $cond: [{ $eq: ['$type', 'spent'] }, '$amount', 0],
              },
            },
          },
        },
      ]),
    ]);

    // Also count unique customers who have coins from this store
    const uniqueCustomersWithCoins = await Wallet.countDocuments({
      'brandedCoins.merchantId': storeObjectId,
      'brandedCoins.amount': { $gt: 0 },
    });

    // Extract results with safe defaults
    const coinsAwarded = coinsAwardedResult[0] || { total: 0, thisMonth: 0, thisWeek: 0 };
    const coinDrops = coinDropStats[0] || { active: 0, total: 0, totalUsage: 0 };
    const brandedInCirculation = brandedCoinsResult[0]?.inCirculation || 0;
    const brandedTotals = brandedTotalsResult[0] || { totalAwarded: 0, totalRedeemed: 0 };
    const customerData = customerRepeatResult[0] || { totalCustomers: 0, repeatCustomers: 0 };

    const repeatRate = customerData.totalCustomers > 0
      ? Math.round((customerData.repeatCustomers / customerData.totalCustomers) * 100)
      : 0;

    return res.json({
      success: true,
      data: {
        coinsAwarded: {
          total: coinsAwarded.total,
          thisMonth: coinsAwarded.thisMonth,
          thisWeek: coinsAwarded.thisWeek,
        },
        coinDrops: {
          active: coinDrops.active,
          total: coinDrops.total,
          totalUsage: coinDrops.totalUsage,
        },
        brandedCoins: {
          inCirculation: brandedInCirculation,
          totalAwarded: brandedTotals.totalAwarded,
          totalRedeemed: brandedTotals.totalRedeemed,
        },
        customers: {
          totalWithCoins: uniqueCustomersWithCoins,
          repeatRate,
          topEarners: topEarnersResult.map((e: any) => ({
            userId: e.userId,
            totalCoins: e.totalCoins,
            orderCount: e.orderCount,
          })),
        },
      },
    });
}));

export default router;
