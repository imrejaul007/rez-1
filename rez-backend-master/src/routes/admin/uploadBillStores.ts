import { logger } from '../../config/logger';
/**
 * Admin Routes - Upload Bill Stores
 * CRUD for UploadBillStore model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import UploadBillStore from '../../models/UploadBillStore';
import { pick } from '../../utils/safeAssign';
import { sendSuccess, sendError } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/upload-bill-stores
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status === 'active') filter.isActive = true;
    else if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.search) filter.name = { $regex: escapeRegex(req.query.search as string), $options: 'i' };

    const [stores, total] = await Promise.all([
      UploadBillStore.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      UploadBillStore.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      stores,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }, 'Upload bill stores fetched');
}));

/**
 * GET /api/admin/upload-bill-stores/:id
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const store = await UploadBillStore.findById(req.params.id).lean();
    if (!store) return sendError(res, 'Upload bill store not found', 404);
    return sendSuccess(res, store, 'Upload bill store fetched');
}));

/**
 * POST /api/admin/upload-bill-stores
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { name, category } = req.body;
    if (!name || !category) {
      return sendError(res, 'name and category are required', 400);
    }

    // SECURITY: explicit allowlist. Upload-bill stores define which
    // merchants appear in the bill-upload PWA flow; an injected field
    // could push a phishing merchant to the top of the list.
    const store = await UploadBillStore.create(pick(req.body, [
      'name', 'category', 'subcategory', 'logo', 'description',
      'address', 'city', 'coordinates', 'phone', 'email', 'website',
      'gstNumber', 'panNumber', 'isActive', 'priority', 'tags',
    ]));
    return sendSuccess(res, store, 'Upload bill store created');
}));

/**
 * PUT /api/admin/upload-bill-stores/:id
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const store = await UploadBillStore.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!store) return sendError(res, 'Upload bill store not found', 404);
    return sendSuccess(res, store, 'Upload bill store updated');
}));

/**
 * PATCH /api/admin/upload-bill-stores/:id/toggle
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const store = await UploadBillStore.findById(req.params.id);
    if (!store) return sendError(res, 'Upload bill store not found', 404);
    store.isActive = !store.isActive;
    await store.save();
    return sendSuccess(res, store, `Upload bill store ${store.isActive ? 'activated' : 'deactivated'}`);
}));

/**
 * DELETE /api/admin/upload-bill-stores/:id
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) return sendError(res, 'Invalid ID', 400);
    const store = await UploadBillStore.findByIdAndDelete(req.params.id);
    if (!store) return sendError(res, 'Upload bill store not found', 404);
    return sendSuccess(res, null, 'Upload bill store deleted');
}));

export default router;
