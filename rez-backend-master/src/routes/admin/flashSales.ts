import { logger } from '../../config/logger';
/**
 * Admin Routes - Flash Sales
 * CRUD for FlashSale model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import FlashSale from '../../models/FlashSale';
import { sendSuccess, sendError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/flash-sales
 * List all flash sales with pagination
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }
  if (req.query.enabled === 'true') {
    filter.enabled = true;
  } else if (req.query.enabled === 'false') {
    filter.enabled = false;
  }
  if (req.query.search) {
    filter.title = { $regex: escapeRegex(req.query.search as string), $options: 'i' };
  }

  const [sales, total] = await Promise.all([
    FlashSale.find(filter)
      .populate('stores', 'name logo')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    FlashSale.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    sales,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, 'Flash sales fetched');
}));

/**
 * GET /api/admin/flash-sales/:id
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid flash sale ID', 400);
  }

  const sale = await FlashSale.findById(req.params.id)
    .populate('stores', 'name logo')
    .populate('products', 'name image price')
    .populate('category', 'name slug')
    .lean();
  if (!sale) return sendError(res, 'Flash sale not found', 404);

  return sendSuccess(res, sale, 'Flash sale fetched');
}));

/**
 * POST /api/admin/flash-sales
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { title, description, image, discountPercentage, startTime, endTime, maxQuantity, products } = req.body;

  if (!title || !description || !image || discountPercentage === undefined || !startTime || !endTime || !maxQuantity) {
    return sendError(res, 'title, description, image, discountPercentage, startTime, endTime, maxQuantity are required', 400);
  }

  // SECURITY: explicit allowlist — never spread req.body.
  const ALLOWED = [
    'title', 'description', 'image', 'discountPercentage',
    'startTime', 'endTime', 'maxQuantity', 'products', 'stores',
    'isActive', 'priority', 'regions',
  ];
  const sanitized: Record<string, any> = {};
  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) sanitized[key] = req.body[key];
  }
  const sale = await FlashSale.create({
    ...sanitized,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    createdBy: (req as any).user?._id,
  });

  return sendSuccess(res, sale, 'Flash sale created');
}));

/**
 * PUT /api/admin/flash-sales/:id
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid flash sale ID', 400);
  }

  const sale = await FlashSale.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!sale) return sendError(res, 'Flash sale not found', 404);

  return sendSuccess(res, sale, 'Flash sale updated');
}));

/**
 * PATCH /api/admin/flash-sales/:id/toggle
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid flash sale ID', 400);
  }

  const sale = await FlashSale.findById(req.params.id);
  if (!sale) return sendError(res, 'Flash sale not found', 404);

  sale.enabled = !sale.enabled;
  await sale.save();

  return sendSuccess(res, sale, `Flash sale ${sale.enabled ? 'enabled' : 'disabled'}`);
}));

/**
 * DELETE /api/admin/flash-sales/:id
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid flash sale ID', 400);
  }

  const sale = await FlashSale.findByIdAndDelete(req.params.id);
  if (!sale) return sendError(res, 'Flash sale not found', 404);

  return sendSuccess(res, null, 'Flash sale deleted');
}));

export default router;
