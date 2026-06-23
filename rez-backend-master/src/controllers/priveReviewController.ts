/**
 * Privé Review Dashboard Controller
 *
 * Aggregated endpoint for Privé Review & Earn page.
 * Returns reviewable items, pending rewards, lifetime earnings, and config.
 */

import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { CoinTransaction } from '../models/CoinTransaction';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { Types } from 'mongoose';

/**
 * GET /api/prive/review-dashboard
 * Returns aggregated review dashboard data for the Privé Review & Earn page.
 */
export const getPriveReviewDashboard = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const userId = (req.user._id as Types.ObjectId).toString();
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  // 1. Fetch user's delivered/completed orders with store + product details
  const completedOrders = await Order.find({
    user: userId,
    status: { $in: ['completed', 'delivered'] }
  })
    .populate('store', 'name logo category images rewardRules')
    .populate('items.product', 'name images category pricing isPriveReviewEligible priveReviewRewardCoins')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  // 2. Fetch user's existing reviews to exclude already-reviewed
  const existingReviews = await Review.find({ user: userId }).select('store product').lean();
  const reviewedStoreIds = new Set(existingReviews.map(r => r.store?.toString()).filter(Boolean));
  const reviewedProductIds = new Set(existingReviews.map(r => (r as any).product?.toString()).filter(Boolean));

  // 3. Build reviewable items list
  const reviewableItems: any[] = [];
  const seenStoreIds = new Set<string>();
  const seenProductIds = new Set<string>();

  for (const order of completedOrders) {
    const store = (order as any).store;
    if (!store) continue;

    const orderDate = new Date(order.createdAt);
    const daysAgo = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    const storeRewardCoins = store.rewardRules?.reviewBonusCoins || 20;

    // Add store if not reviewed and not already in list
    if (!reviewedStoreIds.has(store._id.toString()) && !seenStoreIds.has(store._id.toString())) {
      seenStoreIds.add(store._id.toString());
      reviewableItems.push({
        id: store._id.toString(),
        type: 'store',
        name: store.name || 'Store',
        image: store.logo || store.images?.[0]?.url || null,
        category: store.category || 'General',
        storeId: store._id.toString(),
        visitDate: `${daysAgo} days ago`,
        coins: storeRewardCoins,
        isPriveEligible: false,
        hasReceipt: true,
      });
    }

    // Add products from the order
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        const product = item.product as any;
        if (!product || reviewedProductIds.has(product._id.toString()) || seenProductIds.has(product._id.toString())) continue;

        seenProductIds.add(product._id.toString());
        const productCoins = product.priveReviewRewardCoins || storeRewardCoins;

        reviewableItems.push({
          id: product._id.toString(),
          type: 'product',
          name: product.name || 'Product',
          image: product.images?.[0]?.url || null,
          category: product.category || 'General',
          storeId: store._id.toString(),
          purchaseDate: `${daysAgo} days ago`,
          coins: productCoins,
          isPriveEligible: product.isPriveReviewEligible || false,
          brand: product.brand || null,
        });
      }
    }
  }

  // 4. Fetch pending review rewards (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const pendingRewards = await CoinTransaction.aggregate([
    {
      $match: {
        user: new Types.ObjectId(userId),
        source: 'review',
        createdAt: { $gte: thirtyDaysAgo }
      }
    },
    {
      $group: {
        _id: null,
        totalPending: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  // 5. Aggregate lifetime review earnings
  const lifetimeEarnings = await CoinTransaction.aggregate([
    {
      $match: {
        user: new Types.ObjectId(userId),
        source: 'review'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  // Calculate totals
  const totalItems = reviewableItems.length;
  const paginatedItems = reviewableItems.slice(skip, skip + limit);
  const potentialEarnings = reviewableItems.reduce((sum, item) => sum + (item.coins || 0), 0);
  const pendingData = pendingRewards[0] || { totalPending: 0, count: 0 };
  const lifetimeData = lifetimeEarnings[0] || { total: 0 };

  sendSuccess(res, {
    items: paginatedItems,
    totalPending: totalItems,
    potentialEarnings,
    metrics: {
      pendingRewards: pendingData.totalPending,
      lifetimeEarned: lifetimeData.total,
      pendingCount: pendingData.count,
    },
    config: {
      minCharCount: 50,
      requireMedia: false,
      maxImages: 5,
    },
    pagination: {
      current: page,
      pages: Math.ceil(totalItems / limit),
      total: totalItems,
      limit,
      hasNext: skip + paginatedItems.length < totalItems,
      hasPrevious: page > 1,
    },
  }, 'Privé review dashboard retrieved successfully');
});
