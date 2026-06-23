import { logger } from '../../config/logger';
/**
 * Admin Routes - Coin Drops
 * CRUD for CoinDrop model (used by Extra Rewards page)
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import CoinDrop from '../../models/CoinDrop';
import { Store } from '../../models/Store';
import { sendSuccess, sendError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/coin-drops
 * List all coin drops with pagination
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (req.query.status === 'active') {
    filter.isActive = true;
  } else if (req.query.status === 'inactive') {
    filter.isActive = false;
  }

  if (req.query.category) {
    filter.category = req.query.category;
  }

  if (req.query.running === 'true') {
    const now = new Date();
    filter.isActive = true;
    filter.startTime = { $lte: now };
    filter.endTime = { $gte: now };
  }

  const [coinDrops, total] = await Promise.all([
    CoinDrop.find(filter)
      .populate('storeId', 'name logo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CoinDrop.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    coinDrops,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Coin drops fetched');
}));

/**
 * GET /api/admin/coin-drops/stores
 * Get stores dropdown for coin drop creation
 */
router.get('/stores', asyncHandler(async (req: Request, res: Response) => {
  const search = req.query.q ? escapeRegex(req.query.q as string) : undefined;
  const filter: any = { isActive: true };

  if (search) {
    filter.name = { $regex: search, $options: 'i' };
  }

  const stores = await Store.find(filter)
    .select('_id name logo category')
    .sort({ name: 1 })
    .limit(50)
    .lean();

  return sendSuccess(res, stores, 'Stores fetched');
}));

/**
 * GET /api/admin/coin-drops/:id
 * Get single coin drop by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid coin drop ID', 400);
  }

  const coinDrop = await CoinDrop.findById(req.params.id)
    .populate('storeId', 'name logo')
    .lean();

  if (!coinDrop) {
    return sendError(res, 'Coin drop not found', 404);
  }

  return sendSuccess(res, coinDrop, 'Coin drop fetched');
}));

/**
 * POST /api/admin/coin-drops
 * Create new coin drop
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    storeId,
    multiplier,
    normalCashback,
    category,
    startTime,
    endTime,
    minOrderValue,
    maxCashback,
    priority,
  } = req.body;

  if (!storeId || !multiplier || !normalCashback || !category || !startTime || !endTime) {
    return sendError(res, 'storeId, multiplier, normalCashback, category, startTime, and endTime are required', 400);
  }

  if (!Types.ObjectId.isValid(storeId)) {
    return sendError(res, 'Invalid store ID', 400);
  }

  // Look up store for cached name/logo
  const store = await Store.findById(storeId).select('name logo').lean();
  if (!store) {
    return sendError(res, 'Store not found', 404);
  }

  const coinDrop = await CoinDrop.create({
    storeId,
    storeName: (store as any).name,
    storeLogo: (store as any).logo,
    multiplier,
    normalCashback,
    boostedCashback: normalCashback * multiplier, // pre-save hook also calculates this
    category,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    minOrderValue,
    maxCashback,
    isActive: true,
    priority: priority || 0,
  });

  return sendSuccess(res, coinDrop, 'Coin drop created');
}));

/**
 * PUT /api/admin/coin-drops/:id
 * Update existing coin drop
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid coin drop ID', 400);
  }

  // If storeId is being updated, refresh cached store name/logo
  if (req.body.storeId) {
    const store = await Store.findById(req.body.storeId).select('name logo').lean();
    if (store) {
      req.body.storeName = (store as any).name;
      req.body.storeLogo = (store as any).logo;
    }
  }

  const coinDrop = await CoinDrop.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!coinDrop) {
    return sendError(res, 'Coin drop not found', 404);
  }

  return sendSuccess(res, coinDrop, 'Coin drop updated');
}));

/**
 * PATCH /api/admin/coin-drops/:id/toggle
 * Toggle coin drop active status
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid coin drop ID', 400);
  }

  const coinDrop = await CoinDrop.findById(req.params.id);
  if (!coinDrop) {
    return sendError(res, 'Coin drop not found', 404);
  }

  coinDrop.isActive = !coinDrop.isActive;
  await coinDrop.save();

  return sendSuccess(res, coinDrop, `Coin drop ${coinDrop.isActive ? 'activated' : 'deactivated'}`);
}));

/**
 * DELETE /api/admin/coin-drops/:id
 * Delete coin drop
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid coin drop ID', 400);
  }

  const coinDrop = await CoinDrop.findByIdAndDelete(req.params.id);
  if (!coinDrop) {
    return sendError(res, 'Coin drop not found', 404);
  }

  return sendSuccess(res, null, 'Coin drop deleted');
}));

export default router;
