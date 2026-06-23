/**
 * Admin Routes - Learning Content
 * CRUD for LearningContent model
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import LearningContent from '../../models/LearningContent';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/learning-content
 * List all learning content
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.contentType) filter.contentType = req.query.contentType;
    if (req.query.isPublished !== undefined) filter.isPublished = req.query.isPublished === 'true';

    const [items, total] = await Promise.all([
      LearningContent.find(filter).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit),
      LearningContent.countDocuments(filter)
    ]);

    sendSuccess(res, {
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  }));

/**
 * GET /api/admin/learning-content/:id
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const item = await LearningContent.findById(req.params.id);
    if (!item) return sendError(res, 'Not found', 404);
    sendSuccess(res, { item });
  }));

/**
 * POST /api/admin/learning-content
 * Create learning content
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { slug, title, category, contentType, body, videoUrl, thumbnailUrl, coinReward, estimatedMinutes, sortOrder, isPublished } = req.body;

    if (!slug || !title || !category) {
      return sendError(res, 'slug, title, and category are required', 400);
    }

    const item = await LearningContent.create({
      slug, title, category,
      contentType: contentType || 'article',
      body: body || '',
      videoUrl, thumbnailUrl,
      coinReward: coinReward ?? 10,
      estimatedMinutes: estimatedMinutes ?? 2,
      sortOrder: sortOrder ?? 0,
      isPublished: isPublished ?? false,
    });

    sendSuccess(res, { item }, 'Created', 201);
  } catch (error: any) {
    if (error.code === 11000) {
      return sendError(res, 'A content item with this slug already exists', 400);
    }
    sendError(res, error.message);
  }
}));

/**
 * PUT /api/admin/learning-content/:id
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    const item = await LearningContent.findById(req.params.id);
    if (!item) return sendError(res, 'Not found', 404);

    const allowed = ['slug', 'title', 'category', 'contentType', 'body', 'videoUrl', 'thumbnailUrl', 'coinReward', 'estimatedMinutes', 'sortOrder', 'isPublished'];
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        (item as any)[field] = req.body[field];
      }
    }

    await item.save();
    sendSuccess(res, { item });
  }));

/**
 * PATCH /api/admin/learning-content/:id/toggle
 * Toggle published status
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
    const item = await LearningContent.findById(req.params.id);
    if (!item) return sendError(res, 'Not found', 404);

    item.isPublished = !item.isPublished;
    await item.save();
    sendSuccess(res, { item });
  }));

/**
 * DELETE /api/admin/learning-content/:id
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    const item = await LearningContent.findByIdAndDelete(req.params.id);
    if (!item) return sendError(res, 'Not found', 404);
    sendSuccess(res, { message: 'Deleted successfully' });
  }));

export default router;
