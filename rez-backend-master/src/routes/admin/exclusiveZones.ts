import { logger } from '../../config/logger';
/**
 * Admin Routes - Exclusive Zones
 * CRUD for ExclusiveZone model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import ExclusiveZone from '../../models/ExclusiveZone';
import { sendSuccess, sendError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/exclusive-zones
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (req.query.status === 'active') filter.isActive = true;
  else if (req.query.status === 'inactive') filter.isActive = false;
  if (req.query.eligibilityType) filter.eligibilityType = req.query.eligibilityType;
  if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search as string), $options: 'i' };

  const [zones, total] = await Promise.all([
    ExclusiveZone.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    ExclusiveZone.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    zones,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, 'Exclusive zones fetched');
}));

/**
 * GET /api/admin/exclusive-zones/:id
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
  const zone = await ExclusiveZone.findById(req.params.id).lean();
  if (!zone) return sendError(res, 'Exclusive zone not found', 404);
  return sendSuccess(res, zone, 'Exclusive zone fetched');
}));

/**
 * POST /api/admin/exclusive-zones
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { name, slug, eligibilityType } = req.body;
  if (!name || !slug || !eligibilityType) {
    return sendError(res, 'name, slug, and eligibilityType are required', 400);
  }

  // SECURITY: explicit allowlist. Exclusive zones control which stores
  // are visible in which regions; an injected field could expose a zone
  // to a region it shouldn't be in (or hide a zone that's needed).
  const ALLOWED = [
    'name', 'slug', 'description', 'eligibilityType', 'eligibleUserIds',
    'eligibleTiers', 'eligibleMerchantIds', 'regions', 'isActive',
    'startsAt', 'expiresAt', 'priority', 'image',
  ];
  const sanitized: Record<string, any> = {};
  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) sanitized[key] = req.body[key];
  }
  const zone = await ExclusiveZone.create(sanitized);
  return sendSuccess(res, zone, 'Exclusive zone created');
}));

/**
 * PUT /api/admin/exclusive-zones/:id
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
  const zone = await ExclusiveZone.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!zone) return sendError(res, 'Exclusive zone not found', 404);
  return sendSuccess(res, zone, 'Exclusive zone updated');
}));

/**
 * PATCH /api/admin/exclusive-zones/:id/toggle
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
  const zone = await ExclusiveZone.findById(req.params.id);
  if (!zone) return sendError(res, 'Exclusive zone not found', 404);
  zone.isActive = !zone.isActive;
  await zone.save();
  return sendSuccess(res, zone, `Exclusive zone ${zone.isActive ? 'activated' : 'deactivated'}`);
}));

/**
 * DELETE /api/admin/exclusive-zones/:id
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
  const zone = await ExclusiveZone.findByIdAndDelete(req.params.id);
  if (!zone) return sendError(res, 'Exclusive zone not found', 404);
  return sendSuccess(res, null, 'Exclusive zone deleted');
}));

export default router;
