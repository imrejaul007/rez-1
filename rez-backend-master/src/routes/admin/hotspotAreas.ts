import { logger } from '../../config/logger';
/**
 * Admin Routes - Hotspot Areas
 * CRUD for HotspotArea model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import HotspotArea from '../../models/HotspotArea';
import { pick } from '../../utils/safeAssign';
import { sendSuccess, sendError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/hotspot-areas
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status === 'active') filter.isActive = true;
    else if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.city) filter.city = { $regex: escapeRegex(req.query.city as string), $options: 'i' };
    if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search as string), $options: 'i' };

    const [areas, total] = await Promise.all([
      HotspotArea.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      HotspotArea.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      areas,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, 'Hotspot areas fetched');
  }));

/**
 * GET /api/admin/hotspot-areas/:id
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const area = await HotspotArea.findById(req.params.id).lean();
    if (!area) return sendError(res, 'Hotspot area not found', 404);
    return sendSuccess(res, area, 'Hotspot area fetched');
  }));

/**
 * POST /api/admin/hotspot-areas
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, city, coordinates } = req.body;
    if (!name || !city || !coordinates?.lat || !coordinates?.lng) {
      return sendError(res, 'name, city, and coordinates (lat, lng) are required', 400);
    }

    // SECURITY: explicit allowlist. Hotspot areas control which stores
    // show up in location-targeted campaigns; an injected field could
    // redirect user traffic to wrong merchants.
    const area = await HotspotArea.create(pick(req.body, [
      'name', 'city', 'area', 'coordinates', 'radiusMeters',
      'storeIds', 'categoryIds', 'isActive', 'startsAt', 'expiresAt',
      'priority', 'image', 'description',
    ]));
    return sendSuccess(res, area, 'Hotspot area created');
  }));

/**
 * PUT /api/admin/hotspot-areas/:id
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const area = await HotspotArea.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!area) return sendError(res, 'Hotspot area not found', 404);
    return sendSuccess(res, area, 'Hotspot area updated');
  }));

/**
 * PATCH /api/admin/hotspot-areas/:id/toggle
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const area = await HotspotArea.findById(req.params.id);
    if (!area) return sendError(res, 'Hotspot area not found', 404);
    area.isActive = !area.isActive;
    await area.save();
    return sendSuccess(res, area, `Hotspot area ${area.isActive ? 'activated' : 'deactivated'}`);
  }));

/**
 * DELETE /api/admin/hotspot-areas/:id
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const area = await HotspotArea.findByIdAndDelete(req.params.id);
    if (!area) return sendError(res, 'Hotspot area not found', 404);
    return sendSuccess(res, null, 'Hotspot area deleted');
  }));

export default router;
