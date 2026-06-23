import { logger } from '../../config/logger';
/**
 * Admin Routes - Value Cards
 * CRUD endpoints for managing ValueCard model
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import ValueCard from '../../models/ValueCard';
import { sendSuccess, sendNotFound, sendBadRequest, sendCreated } from '../../utils/response';
import { sendError, sendPaginated } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// VALUE CARD CRUD
// ============================================

/**
 * GET /api/admin/value-cards
 * List all value cards with pagination and search
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.search) {
      const search = escapeRegex((req.query.search as string).trim());
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
      ];
    }

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    const [cards, total] = await Promise.all([
      ValueCard.find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ValueCard.countDocuments(filter),
    ]);

    return sendPaginated(res, cards, page, limit, total, 'Value cards fetched');
}));

/**
 * GET /api/admin/value-cards/:id
 * Get single value card
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const card = await ValueCard.findById(req.params.id).lean();
    if (!card) {
      return sendNotFound(res, 'Value card not found');
    }
    return sendSuccess(res, card, 'Value card fetched');
}));

/**
 * POST /api/admin/value-cards
 * Create a new value card
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const {
      title, subtitle, emoji, deepLinkPath,
      sortOrder, isActive, regions,
    } = req.body;

    if (!title || !subtitle || !emoji) {
      return sendBadRequest(res, 'title, subtitle, and emoji are required');
    }

    const card = await ValueCard.create({
      title,
      subtitle,
      emoji,
      deepLinkPath,
      sortOrder: sortOrder || 0,
      isActive: isActive !== undefined ? isActive : true,
      regions: regions || [],
      createdBy: (req as any).user?._id,
    });

    return sendCreated(res, card, 'Value card created');
}));

/**
 * PUT /api/admin/value-cards/:id
 * Update a value card
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const {
      title, subtitle, emoji, deepLinkPath,
      sortOrder, isActive, regions,
    } = req.body;

    const card = await ValueCard.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(title !== undefined && { title }),
          ...(subtitle !== undefined && { subtitle }),
          ...(emoji !== undefined && { emoji }),
          ...(deepLinkPath !== undefined && { deepLinkPath }),
          ...(sortOrder !== undefined && { sortOrder }),
          ...(isActive !== undefined && { isActive }),
          ...(regions !== undefined && { regions }),
        },
      },
      { new: true, runValidators: true }
    );

    if (!card) {
      return sendNotFound(res, 'Value card not found');
    }

    return sendSuccess(res, card, 'Value card updated');
}));

/**
 * DELETE /api/admin/value-cards/:id
 * Delete a value card
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const card = await ValueCard.findByIdAndDelete(req.params.id);
    if (!card) {
      return sendNotFound(res, 'Value card not found');
    }
    return sendSuccess(res, null, 'Value card deleted');
}));

/**
 * PATCH /api/admin/value-cards/:id/toggle
 * Toggle isActive state
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
    const card = await ValueCard.findById(req.params.id);
    if (!card) {
      return sendNotFound(res, 'Value card not found');
    }

    card.isActive = !card.isActive;
    await card.save();

    return sendSuccess(res, card, `Value card ${card.isActive ? 'activated' : 'deactivated'}`);
}));

export default router;
