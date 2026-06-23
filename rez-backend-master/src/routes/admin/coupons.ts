import { logger } from '../../config/logger';
/**
 * Admin Routes - Coupons
 * CRUD for Coupon model (used by Coupons admin page)
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { Coupon } from '../../models/Coupon';
import { Store } from '../../models/Store';
import { sendSuccess, sendError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/coupons
 * List all coupons with pagination, search, status filter, category filter
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (req.query.status === 'active') {
    filter.status = 'active';
  } else if (req.query.status === 'inactive') {
    filter.status = 'inactive';
  } else if (req.query.status === 'expired') {
    filter.status = 'expired';
  }

  if (req.query.discountType) {
    filter.discountType = req.query.discountType;
  }

  if (req.query.featured === 'true') {
    filter.isFeatured = true;
  }

  if (req.query.autoApply === 'true') {
    filter.autoApply = true;
  }

  if (req.query.tag) {
    filter.tags = req.query.tag;
  }

  if (req.query.search) {
    const safeSearch = escapeRegex(req.query.search as string);
    filter.$or = [
      { couponCode: { $regex: safeSearch, $options: 'i' } },
      { title: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const [coupons, total] = await Promise.all([
    Coupon.find(filter)
      .populate('createdBy', 'name email')
      .populate('applicableTo.stores', 'name logo')
      .populate('applicableTo.categories', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Coupon.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    coupons,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Coupons fetched');
}));

/**
 * GET /api/admin/coupons/stores
 * Search stores for coupon targeting (applicableTo.stores)
 */
router.get('/stores', asyncHandler(async (req: Request, res: Response) => {
  const search = req.query.q as string;
  const filter: any = { isActive: true };
  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: 'i' };
  }
  const stores = await Store.find(filter)
    .select('_id name logo category')
    .sort({ name: 1 })
    .limit(50)
    .lean();
  return sendSuccess(res, stores, 'Stores fetched');
}));

/**
 * GET /api/admin/coupons/:id
 * Get single coupon by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid coupon ID', 400);
  }

  const coupon = await Coupon.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('applicableTo.stores', 'name logo')
    .populate('applicableTo.categories', 'name')
    .populate('applicableTo.products', 'name images')
    .lean();

  if (!coupon) {
    return sendError(res, 'Coupon not found', 404);
  }

  return sendSuccess(res, coupon, 'Coupon fetched');
}));

/**
 * POST /api/admin/coupons
 * Create new coupon
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    couponCode,
    title,
    description,
    discountType,
    discountValue,
    minOrderValue,
    maxDiscountCap,
    validFrom,
    validTo,
    usageLimit,
    applicableTo,
    autoApply,
    autoApplyPriority,
    termsAndConditions,
    tags,
    imageUrl,
    isFeatured,
    isNewlyAdded,
    metadata,
    status,
    isActive, // legacy field — map to status
  } = req.body;

  if (!couponCode || !title || !description || !discountType || !discountValue || !validFrom || !validTo) {
    return sendError(res, 'couponCode, title, description, discountType, discountValue, validFrom, and validTo are required', 400);
  }

  // Normalize usageLimit — accept number or object
  let normalizedUsageLimit = usageLimit;
  if (typeof usageLimit === 'number') {
    normalizedUsageLimit = { totalUsage: usageLimit, perUser: 1, usedCount: 0 };
  } else if (!usageLimit || typeof usageLimit !== 'object') {
    normalizedUsageLimit = { totalUsage: 0, perUser: 1, usedCount: 0 };
  }

  // Determine status — accept `status` field, fallback to `isActive` boolean
  const resolvedStatus = status || (isActive === false ? 'inactive' : 'active');

  const coupon = await Coupon.create({
    couponCode,
    title,
    description,
    discountType,
    discountValue,
    minOrderValue: minOrderValue || 0,
    maxDiscountCap: maxDiscountCap || 0,
    validFrom: new Date(validFrom),
    validTo: new Date(validTo),
    usageLimit: normalizedUsageLimit,
    applicableTo: applicableTo || { categories: [], products: [], stores: [], userTiers: [] },
    autoApply: autoApply || false,
    autoApplyPriority: autoApplyPriority || 0,
    status: resolvedStatus,
    termsAndConditions: termsAndConditions || [],
    createdBy: (req as any).user?._id,
    tags: tags || [],
    imageUrl,
    isFeatured: isFeatured || false,
    isNewlyAdded: isNewlyAdded !== undefined ? isNewlyAdded : true,
    metadata: metadata || null,
    // Always start analytics at 0 for new coupons — real data only
    viewCount: 0,
    claimCount: 0,
    usageCount: 0,
  });

  return sendSuccess(res, coupon, 'Coupon created');
}));

/**
 * PUT /api/admin/coupons/:id
 * Update existing coupon
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid coupon ID', 400);
  }

  // SECURITY: explicit allowlist — never spread req.body. Without this, an
  // admin could set internal fields like createdBy, _id, analytics counters,
  // or override redemption windows set by the marketing team.
  const ALLOWED = [
    'title', 'description', 'code', 'discountType', 'discountValue',
    'minOrderValue', 'maxDiscount', 'validFrom', 'validUntil', 'isActive',
    'status', 'usageLimit', 'usageLimitPerUser', 'eligibleUserIds',
    'eligibleTiers', 'regions', 'categories', 'storeIds', 'productIds',
  ];
  const updateData: Record<string, any> = {};
  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) updateData[key] = req.body[key];
  }
  // Map isActive boolean → status enum if status not provided
  if (updateData.isActive !== undefined && !updateData.status) {
    updateData.status = updateData.isActive ? 'active' : 'inactive';
    delete (updateData as any).isActive;
  }
  // Normalize usageLimit number → object
  if (typeof updateData.usageLimit === 'number') {
    updateData.usageLimit = { totalUsage: updateData.usageLimit, perUser: 1, usedCount: 0 };
  }
  // Map isAutoApply → autoApply
  if (updateData.isAutoApply !== undefined && updateData.autoApply === undefined) {
    updateData.autoApply = updateData.isAutoApply;
    delete (updateData as any).isAutoApply;
  }

  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  if (!coupon) {
    return sendError(res, 'Coupon not found', 404);
  }

  return sendSuccess(res, coupon, 'Coupon updated');
}));

/**
 * PATCH /api/admin/coupons/:id/toggle
 * Toggle coupon active/inactive status
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid coupon ID', 400);
  }

  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    return sendError(res, 'Coupon not found', 404);
  }

  coupon.status = coupon.status === 'active' ? 'inactive' : 'active';
  await coupon.save();

  return sendSuccess(res, coupon, `Coupon ${coupon.status === 'active' ? 'activated' : 'deactivated'}`);
}));

/**
 * DELETE /api/admin/coupons/:id
 * Delete coupon
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid coupon ID', 400);
  }

  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) {
    return sendError(res, 'Coupon not found', 404);
  }

  return sendSuccess(res, null, 'Coupon deleted');
}));

export default router;
