import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { authMiddleware } from '../../middleware/merchantauth';
import CoinDrop from '../../models/CoinDrop';
import { Store } from '../../models/Store';
import { CoinTransaction } from '../../models/CoinTransaction';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();
router.use(authMiddleware);

/**
 * Verify that a store belongs to the authenticated merchant.
 * Returns the store document if valid, null otherwise.
 */
async function verifyStoreOwnership(storeId: string, merchantId: string): Promise<any> {
  if (!mongoose.Types.ObjectId.isValid(storeId)) return null;
  const store = await Store.findById(storeId).lean();
  if (!store) return null;
  if (
    String((store as any).merchantId) !== merchantId &&
    String((store as any).merchant) !== merchantId
  ) {
    return null;
  }
  return store;
}

/**
 * Determine the runtime status of a CoinDrop based on its fields and dates.
 */
function getCoinDropStatus(coinDrop: any): 'running' | 'upcoming' | 'expired' | 'inactive' {
  if (!coinDrop.isActive) return 'inactive';
  const now = new Date();
  const start = new Date(coinDrop.startTime);
  const end = new Date(coinDrop.endTime);
  if (now < start) return 'upcoming';
  if (now > end) return 'expired';
  return 'running';
}

/**
 * GET /stores/:storeId/coin-drops
 * List merchant's CoinDrops for a store with pagination.
 */
router.get('/stores/:storeId/coin-drops', asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const merchantId = req.merchantId!;

    const store = await verifyStoreOwnership(storeId, merchantId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied',
      });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [coinDrops, total] = await Promise.all([
      CoinDrop.find({ storeId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CoinDrop.countDocuments({ storeId }),
    ]);

    // Add computed status to each CoinDrop
    const coinDropsWithStatus = coinDrops.map((cd: any) => ({
      ...cd,
      status: getCoinDropStatus(cd),
    }));

    return res.json({
      success: true,
      message: 'CoinDrops retrieved successfully',
      data: {
        coinDrops: coinDropsWithStatus,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
}));

/**
 * GET /stores/:storeId/coin-drops/:id
 * Get a single CoinDrop by ID. Verifies store ownership.
 */
router.get('/stores/:storeId/coin-drops/:id', asyncHandler(async (req: Request, res: Response) => {
    const { storeId, id } = req.params;
    const merchantId = req.merchantId!;

    const store = await verifyStoreOwnership(storeId, merchantId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CoinDrop ID',
      });
    }

    const coinDrop = await CoinDrop.findOne({ _id: id, storeId }).lean();
    if (!coinDrop) {
      return res.status(404).json({
        success: false,
        message: 'CoinDrop not found',
      });
    }

    return res.json({
      success: true,
      message: 'CoinDrop retrieved successfully',
      data: {
        ...coinDrop,
        status: getCoinDropStatus(coinDrop),
      },
    });
}));

/**
 * POST /stores/:storeId/coin-drops
 * Create a new CoinDrop for a store.
 */
router.post('/stores/:storeId/coin-drops', asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const merchantId = req.merchantId!;

    const store = await verifyStoreOwnership(storeId, merchantId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied',
      });
    }

    const {
      multiplier,
      normalCashback,
      category,
      startTime,
      endTime,
      minOrderValue,
      maxCashback,
      isActive,
      priority,
    } = req.body;

    // Validate required fields
    if (!multiplier || !normalCashback || !category || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: multiplier, normalCashback, category, startTime, endTime',
      });
    }

    // Validate multiplier range
    if (multiplier < 1.5 || multiplier > 5) {
      return res.status(400).json({
        success: false,
        message: 'Multiplier must be between 1.5 and 5',
      });
    }

    // Validate normalCashback range
    if (normalCashback < 0 || normalCashback > 100) {
      return res.status(400).json({
        success: false,
        message: 'Normal cashback must be between 0 and 100',
      });
    }

    // Validate date range
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format for startTime or endTime',
      });
    }
    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'endTime must be after startTime',
      });
    }

    const boostedCashback = normalCashback * multiplier;

    const coinDrop = new CoinDrop({
      storeId,
      storeName: store.name || store.storeName || 'Unknown Store',
      storeLogo: store.logo || store.storeLogo || undefined,
      multiplier,
      normalCashback,
      boostedCashback,
      category,
      startTime: start,
      endTime: end,
      minOrderValue: minOrderValue || undefined,
      maxCashback: maxCashback || undefined,
      isActive: isActive !== undefined ? isActive : true,
      priority: priority || 0,
    });

    await coinDrop.save();

    return res.status(201).json({
      success: true,
      message: 'CoinDrop created successfully',
      data: {
        ...coinDrop.toObject(),
        status: getCoinDropStatus(coinDrop),
      },
    });
}));

/**
 * PUT /stores/:storeId/coin-drops/:id
 * Update an existing CoinDrop. Verifies ownership.
 */
router.put('/stores/:storeId/coin-drops/:id', asyncHandler(async (req: Request, res: Response) => {
    const { storeId, id } = req.params;
    const merchantId = req.merchantId!;

    const store = await verifyStoreOwnership(storeId, merchantId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CoinDrop ID',
      });
    }

    const coinDrop = await CoinDrop.findOne({ _id: id, storeId });
    if (!coinDrop) {
      return res.status(404).json({
        success: false,
        message: 'CoinDrop not found',
      });
    }

    const {
      multiplier,
      normalCashback,
      category,
      startTime,
      endTime,
      minOrderValue,
      maxCashback,
      isActive,
      priority,
    } = req.body;

    // Validate multiplier if provided
    if (multiplier !== undefined) {
      if (multiplier < 1.5 || multiplier > 5) {
        return res.status(400).json({
          success: false,
          message: 'Multiplier must be between 1.5 and 5',
        });
      }
      coinDrop.multiplier = multiplier;
    }

    // Validate normalCashback if provided
    if (normalCashback !== undefined) {
      if (normalCashback < 0 || normalCashback > 100) {
        return res.status(400).json({
          success: false,
          message: 'Normal cashback must be between 0 and 100',
        });
      }
      coinDrop.normalCashback = normalCashback;
    }

    // Recalculate boostedCashback if either changed
    if (multiplier !== undefined || normalCashback !== undefined) {
      coinDrop.boostedCashback = coinDrop.normalCashback * coinDrop.multiplier;
    }

    if (category !== undefined) coinDrop.category = category;

    if (startTime !== undefined) {
      const start = new Date(startTime);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format for startTime',
        });
      }
      coinDrop.startTime = start;
    }

    if (endTime !== undefined) {
      const end = new Date(endTime);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format for endTime',
        });
      }
      coinDrop.endTime = end;
    }

    // Validate date range after updates
    if (coinDrop.endTime <= coinDrop.startTime) {
      return res.status(400).json({
        success: false,
        message: 'endTime must be after startTime',
      });
    }

    if (minOrderValue !== undefined) coinDrop.minOrderValue = minOrderValue;
    if (maxCashback !== undefined) coinDrop.maxCashback = maxCashback;
    if (isActive !== undefined) coinDrop.isActive = isActive;
    if (priority !== undefined) coinDrop.priority = priority;

    await coinDrop.save();

    return res.json({
      success: true,
      message: 'CoinDrop updated successfully',
      data: {
        ...coinDrop.toObject(),
        status: getCoinDropStatus(coinDrop),
      },
    });
}));

/**
 * DELETE /stores/:storeId/coin-drops/:id
 * Delete a CoinDrop. Only allowed if not currently running.
 */
router.delete('/stores/:storeId/coin-drops/:id', asyncHandler(async (req: Request, res: Response) => {
    const { storeId, id } = req.params;
    const merchantId = req.merchantId!;

    const store = await verifyStoreOwnership(storeId, merchantId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CoinDrop ID',
      });
    }

    const coinDrop = await CoinDrop.findOne({ _id: id, storeId }).lean();
    if (!coinDrop) {
      return res.status(404).json({
        success: false,
        message: 'CoinDrop not found',
      });
    }

    // Check if currently running
    const status = getCoinDropStatus(coinDrop);
    if (status === 'running') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a currently running CoinDrop. Deactivate it first.',
      });
    }

    await CoinDrop.deleteOne({ _id: id });

    return res.json({
      success: true,
      message: 'CoinDrop deleted successfully',
    });
}));

/**
 * GET /stores/:storeId/coin-drops/:id/stats
 * Get usage statistics for a specific CoinDrop.
 */
router.get('/stores/:storeId/coin-drops/:id/stats', asyncHandler(async (req: Request, res: Response) => {
    const { storeId, id } = req.params;
    const merchantId = req.merchantId!;

    const store = await verifyStoreOwnership(storeId, merchantId);
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or access denied',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid CoinDrop ID',
      });
    }

    const coinDrop = await CoinDrop.findOne({ _id: id, storeId }).lean();
    if (!coinDrop) {
      return res.status(404).json({
        success: false,
        message: 'CoinDrop not found',
      });
    }

    // Aggregate cashback awarded from CoinTransaction where metadata references this CoinDrop
    const stats = await CoinTransaction.aggregate([
      {
        $match: {
          'metadata.coinDropId': new mongoose.Types.ObjectId(id),
          source: 'cashback',
        },
      },
      {
        $group: {
          _id: null,
          usageCount: { $sum: 1 },
          totalCashbackAwarded: { $sum: '$amount' },
        },
      },
    ]);

    const result = stats[0] || { usageCount: 0, totalCashbackAwarded: 0 };

    return res.json({
      success: true,
      message: 'CoinDrop stats retrieved successfully',
      data: {
        usageCount: coinDrop.usageCount || result.usageCount,
        totalCashbackAwarded: result.totalCashbackAwarded,
      },
    });
}));

export default router;
