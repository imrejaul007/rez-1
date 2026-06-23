// @ts-nocheck
/**
 * adminReviewStoreRoutes.ts — Sprint 14
 *
 * Admin moderation routes for reviews and store status management.
 *
 * GET    /api/admin/reviews          — paginated review list with optional status filter
 * PATCH  /api/admin/reviews/bulk-approve — approve all pending reviews
 * PATCH  /api/admin/reviews/:id      — update review status (approved/rejected)
 * GET    /api/admin/stores           — paginated store list with search/status filter
 * PATCH  /api/admin/stores/:id/status — toggle store isActive
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import Review from '../models/Review';
import { Store } from '../models/Store';
import redisService from '../services/redisService';

/**
 * Drop the cached web_menu payload for a store so the public web menu picks
 * up admin edits to fields like `estimatedPrepMinutes`, `isProgramMerchant`,
 * `rewardRules.baseCashbackPercent` immediately instead of waiting for the
 * 5-minute TTL on the cached payload to expire.
 *
 * NOTE: The original webOrderingRoutes.ts file that owned this cache was
 * deleted in Phase 6.1 as dead code. If a new web-ordering cache is added
 * in the future, restore the TTL reference here.
 */
async function invalidateWebMenuCache(storeSlug?: string | null) {
  if (!storeSlug) return;
  try {
    await redisService.del(`web_menu:${storeSlug}`);
  } catch (err) {
    // Cache invalidation is best-effort — never block the admin write on it.
  }
}

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/reviews
 * @desc    Paginated list of reviews with optional status filter
 * @access  Admin
 */
router.get(
  '/reviews',
  asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (status && status !== 'all') {
      filter.moderationStatus = status;
    }

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('store', 'name')
        .populate('user', 'profile.firstName profile.lastName email')
        .select('_id store user rating comment createdAt moderationStatus isActive')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(filter),
    ]);

    const data = reviews.map((r: any) => ({
      _id: r._id,
      storeId: r.store?._id ?? r.store,
      storeName: r.store?.name ?? '',
      userId: r.user?._id ?? r.user,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      status: r.moderationStatus,
    }));

    res.json({
      success: true,
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),
);

/**
 * @route   PATCH /api/admin/reviews/bulk-approve
 * @desc    Approve all pending reviews at once
 * @access  Admin
 */
router.patch(
  '/reviews/bulk-approve',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await Review.updateMany({ moderationStatus: 'pending' }, { $set: { moderationStatus: 'approved' } });

    res.json({
      success: true,
      message: 'Pending reviews approved',
      modifiedCount: result.modifiedCount,
    });
  }),
);

/**
 * @route   PATCH /api/admin/reviews/:id
 * @desc    Update a single review's moderation status
 * @access  Admin
 * @body    { status: 'approved'|'rejected', reason? }
 */
router.patch(
  '/reviews/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, reason } = req.body as { status?: string; reason?: string };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid review id' });
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const adminId = (req as any).userId || (req as any).user?._id;

    (review as any).moderationStatus = status;
    (review as any).moderatedBy = adminId;
    (review as any).moderatedAt = new Date();

    if (status === 'rejected') {
      (review as any).isActive = false;
      if (reason) {
        (review as any).moderationReason = reason;
      }
    }

    await review.save();

    // On approve: re-aggregate store rating average
    if (status === 'approved' && (review as any).store) {
      const storeId = (review as any).store;
      const agg = await Review.aggregate([
        { $match: { store: storeId, moderationStatus: 'approved', isActive: true } },
        { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);
      if (agg.length > 0) {
        await Store.findByIdAndUpdate(storeId, {
          $set: {
            'ratings.average': Math.round(agg[0].average * 10) / 10,
            'ratings.count': agg[0].count,
          },
        });
      }
    }

    res.json({
      success: true,
      data: { _id: review._id, status },
    });
  }),
);

/**
 * @route   GET /api/admin/stores
 * @desc    Paginated store list with optional search and status filter
 * @access  Admin
 */
router.get(
  '/stores',
  asyncHandler(async (req: Request, res: Response) => {
    const search = ((req.query.search as string) || '').trim();
    const status = req.query.status as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    // 'all' or undefined: no isActive filter

    const [stores, total] = await Promise.all([
      Store.find(filter)
        .populate('merchantId', 'name email phoneNumber')
        .select('_id name isActive ratings createdAt merchantId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: stores,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),
);

/**
 * @route   PATCH /api/admin/stores/:id/status
 * @desc    Toggle store isActive flag
 * @access  Admin
 * @body    { isActive: boolean }
 */
router.patch(
  '/stores/:id/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body as { isActive?: boolean };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid store id' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: '`isActive` must be a boolean' });
    }

    const store = await Store.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { new: true, select: '_id name isActive' },
    ).lean();

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    res.json({ success: true, data: store });
  }),
);

/**
 * @route   PATCH /api/admin/stores/:id/settings
 * @desc    Update store display settings (estimatedPrepMinutes, etc.)
 * @access  Admin
 * @body    { estimatedPrepMinutes?: number }
 */
router.patch(
  '/stores/:id/settings',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { estimatedPrepMinutes } = req.body as { estimatedPrepMinutes?: number };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid store id' });
    }

    const updates: Record<string, any> = {};

    if (estimatedPrepMinutes !== undefined) {
      if (typeof estimatedPrepMinutes !== 'number' || estimatedPrepMinutes < 0 || estimatedPrepMinutes > 180) {
        return res.status(400).json({ success: false, message: 'estimatedPrepMinutes must be 0–180' });
      }
      updates.estimatedPrepMinutes = estimatedPrepMinutes;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid settings provided' });
    }

    const store = await Store.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, select: '_id name slug estimatedPrepMinutes' },
    ).lean();

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Drop the public web_menu cache so the new prep time renders immediately.
    await invalidateWebMenuCache((store as any).slug);

    res.json({ success: true, data: store });
  }),
);

/**
 * @route   PATCH /api/admin/stores/:id/program
 * @desc    Toggle REZ Program membership for a store (isProgramMerchant + baseCashbackPercent)
 * @access  Admin
 * @body    { isProgramMerchant: boolean, baseCashbackPercent?: number }
 */
router.patch(
  '/stores/:id/program',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isProgramMerchant, baseCashbackPercent } = req.body as {
      isProgramMerchant?: boolean;
      baseCashbackPercent?: number;
    };

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid store id' });
    }

    if (typeof isProgramMerchant !== 'boolean') {
      return res.status(400).json({ success: false, message: '`isProgramMerchant` must be a boolean' });
    }

    // Clamp cashback to a sane upper bound. Without this, an admin sending
    // `baseCashbackPercent: 9999` was accepted verbatim — refunding 99x the
    // order total would bankrupt the program. 100% is the absolute ceiling.
    const cashback = isProgramMerchant
      ? typeof baseCashbackPercent === 'number' && baseCashbackPercent >= 0
        ? Math.min(100, baseCashbackPercent)
        : 5
      : 0;

    const store = await Store.findByIdAndUpdate(
      id,
      {
        $set: {
          isProgramMerchant,
          'rewardRules.baseCashbackPercent': cashback,
        },
      },
      { new: true, select: '_id name slug isProgramMerchant rewardRules' },
    ).lean();

    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found' });
    }

    // Drop the public web_menu cache so the new program flag renders immediately.
    await invalidateWebMenuCache((store as any).slug);

    res.json({ success: true, data: store });
  }),
);

export default router;
