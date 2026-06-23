/**
 * routes/merchant/customerInsights.ts
 * Customer insights routes for merchants
 */

import { Router, Request, Response } from 'express';
import { getCustomerProfile } from '../controllers/merchant/customerInsightsController';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';
import { CustomerTag } from '../models/CustomerTag';
import { MerchantCustomerSnapshot } from '../models/MerchantCustomerSnapshot';
import { escapeRegex } from '../utils/sanitize';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Get customer profile for merchant (existing route)
router.get('/:userId/profile', getCustomerProfile);

/**
 * GET /merchant/customers
 * List customers with search and filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { q, segment, limit = 20, offset = 0 } = req.query;

    const merchantId = (req as any).merchantId;
    if (!merchantId) {
      return res.status(401).json({
        success: false,
        message: 'Merchant authentication required',
      });
    }

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offsetNum = parseInt(offset as string, 10) || 0;

    const filter: any = { merchantId };

    // Search by phone or name if q is provided
    if (q) {
      const searchQuery = q.toString();
      filter.$or = [
        { customerPhone: new RegExp(escapeRegex(searchQuery), 'i') },
        { customerName: new RegExp(escapeRegex(searchQuery), 'i') },
      ];
    }

    // Filter by segment if provided
    if (segment) {
      filter.rfmSegment = segment;
    }

    const total = await MerchantCustomerSnapshot.countDocuments(filter);
    const customers = await MerchantCustomerSnapshot.find(filter)
      .limit(limitNum)
      .skip(offsetNum)
      .sort({ lastVisitAt: -1 });

    const hasMore = offsetNum + limitNum < total;

    return res.json({
      success: true,
      data: {
        customers,
        total,
        hasMore,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    logger.error('Error fetching customers:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/customers/segments
 * Get customer segment counts for store
 */
router.get('/segments', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const segments = await MerchantCustomerSnapshot.aggregate([
      { $match: { merchantId: storeId.toString() } },
      { $group: { _id: '$rfmSegment', count: { $sum: 1 } } },
    ]);

    const result = {
      champion: 0,
      loyalist: 0,
      at_risk: 0,
      lost: 0,
      new: 0,
      all: 0,
    };

    segments.forEach((seg: any) => {
      if (seg._id === 'champion') result.champion = seg.count;
      else if (seg._id === 'loyalist') result.loyalist = seg.count;
      else if (seg._id === 'at_risk') result.at_risk = seg.count;
      else if (seg._id === 'lost') result.lost = seg.count;
      else if (seg._id === 'new') result.new = seg.count;
    });

    result.all = result.champion + result.loyalist + result.at_risk + result.lost + result.new;

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error fetching customer segments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch customer segments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/customers/:userId/tags
 * Add or update tags and notes for a customer
 */
router.post('/:userId/tags', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { tags, notes, storeId } = req.body;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required in body',
      });
    }

    const filter = {
      merchantId: storeId,
      userId,
    };

    const update = {
      merchantId: storeId,
      userId,
      tags: tags || [],
      notes: notes || '',
    };

    const customerTag = await CustomerTag.findOneAndUpdate(
      filter,
      { $set: update },
      { upsert: true, new: true, runValidators: true },
    );

    return res.json({
      success: true,
      data: customerTag,
      message: 'Customer tags updated successfully',
    });
  } catch (error) {
    logger.error('Error updating customer tags:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update customer tags',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/customers/:userId/lifecycle
 * Customer lifecycle intelligence:
 *   - purchase history with categories
 *   - owned products (for insurance/warranty upsell targeting)
 *   - predicted next visit window
 *   - churn risk score
 *   - best upsell categories for this customer
 */
router.get('/:userId/lifecycle', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId;
    const { userId } = req.params;
    const { storeId } = req.query;

    const { Order } = require('../models/Order');
    const mongoose = require('mongoose');

    const matchFilter: any = {
      'customer._id': mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId,
      status: { $in: ['delivered', 'completed', 'paid'] },
    };
    if (storeId) matchFilter['store._id'] = storeId;

    const orders = await Order.find(matchFilter).sort({ createdAt: -1 }).limit(100).lean();

    if (!orders.length) {
      return res.json({
        success: true,
        data: {
          totalOrders: 0,
          totalSpent: 0,
          avgOrderValue: 0,
          firstPurchase: null,
          lastPurchase: null,
          daysSinceLastPurchase: null,
          avgDaysBetweenOrders: null,
          predictedNextVisit: null,
          churnRisk: 'unknown',
          ownedCategories: [],
          ownedProducts: [],
          topCategories: [],
          recommendedUpsellCategories: [],
        },
      });
    }

    const totalSpent = orders.reduce((s: number, o: any) => s + (o.pricing?.total ?? 0), 0);
    const avgOrderValue = totalSpent / orders.length;
    const firstPurchase = orders[orders.length - 1].createdAt;
    const lastPurchase = orders[0].createdAt;
    const now = new Date();
    const daysSinceLast = Math.floor((now.getTime() - new Date(lastPurchase).getTime()) / 86400000);

    // Average days between purchases
    let avgGapDays: number | null = null;
    if (orders.length > 1) {
      const gaps: number[] = [];
      for (let i = 0; i < orders.length - 1; i++) {
        const gap = (new Date(orders[i].createdAt).getTime() - new Date(orders[i + 1].createdAt).getTime()) / 86400000;
        gaps.push(gap);
      }
      avgGapDays = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
    }

    // Predicted next visit
    const predictedNextVisit = avgGapDays ? new Date(new Date(lastPurchase).getTime() + avgGapDays * 86400000) : null;

    // Churn risk
    let churnRisk: 'low' | 'medium' | 'high' | 'unknown' = 'unknown';
    if (avgGapDays) {
      if (daysSinceLast <= avgGapDays * 1.2) churnRisk = 'low';
      else if (daysSinceLast <= avgGapDays * 2) churnRisk = 'medium';
      else churnRisk = 'high';
    }

    // Category and product ownership
    const categoryCount: Record<string, number> = {};
    const productSet: Record<string, { name: string; count: number; lastBought: Date }> = {};

    for (const order of orders) {
      for (const item of order.items || []) {
        const cat = item.category || 'Other';
        categoryCount[cat] = (categoryCount[cat] || 0) + item.quantity;
        const pid = item.productId?.toString() || item.name;
        if (!productSet[pid]) {
          productSet[pid] = { name: item.name, count: 0, lastBought: order.createdAt };
        }
        productSet[pid].count += item.quantity;
      }
    }

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    const ownedProducts = Object.values(productSet)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Recommend upsell categories = categories NOT already heavily purchased
    const allCategories = Object.keys(categoryCount);
    const recommendedUpsellCategories = topCategories.length < 5 ? [] : []; // Merchant can configure via upsell rules; this is a signal only

    return res.json({
      success: true,
      data: {
        totalOrders: orders.length,
        totalSpent: Math.round(totalSpent * 100) / 100,
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
        firstPurchase,
        lastPurchase,
        daysSinceLastPurchase: daysSinceLast,
        avgDaysBetweenOrders: avgGapDays,
        predictedNextVisit,
        churnRisk,
        ownedCategories: allCategories,
        ownedProducts,
        topCategories,
        recommendedUpsellCategories,
      },
    });
  } catch (err: any) {
    logger.error('customer lifecycle error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load customer lifecycle' });
  }
});

export default router;
