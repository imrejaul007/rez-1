// @ts-nocheck
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { Product } from '../models/Product';
import { logger } from '../config/logger';

const router = Router();

router.use(requireAuth);

// In-memory cache for peak-hours data
let peakHoursCache: { data: any[]; expiresAt: number } | null = null;
const PEAK_HOURS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/merchant/inventory/alerts
 * Returns products grouped into outOfStock and lowStock arrays for the
 * authenticated merchant.
 */
router.get(
  '/inventory/alerts',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).userId || (req as any).user?._id || (req as any).user?.id;
    if (!merchantId || !mongoose.isValidObjectId(merchantId)) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const merchantObjId = new mongoose.Types.ObjectId(merchantId.toString());

    const products = await Product.find({
      merchantId: merchantObjId,
      isDeleted: { $ne: true },
      isActive: true,
    })
      .select('_id name sku inventory.stock inventory.lowStockThreshold inventory.isAvailable')
      .lean();

    const outOfStock: typeof products = [];
    const lowStock: typeof products = [];
    let inStockCount = 0;

    for (const product of products) {
      const stock = product.inventory?.stock ?? 0;
      const threshold = product.inventory?.lowStockThreshold ?? 5;

      if (stock === 0) {
        outOfStock.push(product);
      } else if (stock <= threshold) {
        lowStock.push(product);
      } else {
        inStockCount++;
      }
    }

    return res.json({
      success: true,
      outOfStock,
      lowStock,
      totalProducts: products.length,
      summary: {
        inStock: inStockCount,
        low: lowStock.length,
        outOfStock: outOfStock.length,
      },
    });
  }),
);

/**
 * PATCH /api/merchant/inventory/:productId/alert
 * Update stock alert settings for a product owned by the authenticated merchant.
 * Body: { stockAlertThreshold?, stockAlertsEnabled? }
 */
router.patch(
  '/inventory/:productId/alert',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).userId || (req as any).user?._id || (req as any).user?.id;
    if (!merchantId || !mongoose.isValidObjectId(merchantId)) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { productId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid productId' });
    }

    const { stockAlertThreshold, stockAlertsEnabled } = req.body as {
      stockAlertThreshold?: number;
      stockAlertsEnabled?: boolean;
    };

    const update: Record<string, any> = {};

    if (stockAlertThreshold !== undefined) {
      if (typeof stockAlertThreshold !== 'number' || stockAlertThreshold < 0) {
        return res.status(400).json({ success: false, message: 'stockAlertThreshold must be a non-negative number' });
      }
      update['inventory.lowStockThreshold'] = stockAlertThreshold;
    }

    if (stockAlertsEnabled !== undefined) {
      update['inventory.isAvailable'] = stockAlertsEnabled;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided' });
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(productId),
        merchantId: new mongoose.Types.ObjectId(merchantId.toString()),
      },
      { $set: update },
      { new: true, select: '_id name sku inventory.stock inventory.lowStockThreshold inventory.isAvailable' },
    ).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.json({ success: true, product });
  }),
);

/**
 * GET /api/merchant/analytics/peak-hours
 * Aggregates CoinTransactions by hour of day and day of week.
 * Cached in-memory for 1 hour.
 */
router.get(
  '/analytics/peak-hours',
  asyncHandler(async (_req: Request, res: Response) => {
    const now = Date.now();

    if (peakHoursCache && peakHoursCache.expiresAt > now) {
      return res.json({ success: true, cached: true, data: peakHoursCache.data });
    }

    try {
      const result = await mongoose.connection
        .collection('cointransactions')
        .aggregate([
          {
            $group: {
              _id: {
                hour: { $hour: '$createdAt' },
                day: { $dayOfWeek: '$createdAt' },
              },
              visitCount: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              hour: '$_id.hour',
              day: '$_id.day',
              visitCount: 1,
            },
          },
          { $sort: { day: 1, hour: 1 } },
          { $limit: 168 }, // 7 days × 24 hours
        ])
        .toArray();

      peakHoursCache = { data: result, expiresAt: now + PEAK_HOURS_CACHE_TTL_MS };

      return res.json({ success: true, cached: false, data: result });
    } catch (error) {
      logger.error('[peak-hours] Aggregation error:', error);
      return res.status(500).json({ success: false, message: 'Failed to retrieve peak hours data' });
    }
  }),
);

export default router;
