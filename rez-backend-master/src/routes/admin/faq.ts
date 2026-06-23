import { logger } from '../../config/logger';
/**
 * Admin Routes - FAQ CMS
 * CRUD endpoints for managing FAQ content
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { FAQ } from '../../models/FAQ';
import { sendSuccess, sendError, sendPaginated, sendCreated, sendNotFound, sendBadRequest } from '../../utils/response';
import { Types } from 'mongoose';
import { escapeRegex } from '../../utils/sanitize';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// FAQ CMS CRUD
// ============================================

/**
 * GET /api/admin/faqs
 * List all FAQs with pagination and filters
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const filter: any = {};

  // Filter by category
  if (req.query.category) {
    filter.category = req.query.category;
  }

  // Filter by isActive
  if (req.query.isActive !== undefined) {
    filter.isActive = req.query.isActive === 'true';
  }

  // Search by question/answer text
  if (req.query.search) {
    const search = escapeRegex((req.query.search as string).trim());
    filter.$or = [
      { question: { $regex: search, $options: 'i' } },
      { answer: { $regex: search, $options: 'i' } },
      { tags: { $regex: search, $options: 'i' } },
    ];
  }

  const [faqs, total] = await Promise.all([
    FAQ.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'fullName')
      .populate('lastUpdatedBy', 'fullName')
      .lean(),
    FAQ.countDocuments(filter),
  ]);

  return sendPaginated(res, faqs, page, limit, total, 'FAQs fetched');
}));

/**
 * POST /api/admin/faqs
 * Create a new FAQ
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      question, answer, category, subcategory,
      tags, order, isActive, imageUrl,
    } = req.body;

    if (!question || !answer || !category) {
      return sendBadRequest(res, 'question, answer, and category are required');
    }

    const faq = await FAQ.create({
      question,
      answer,
      category,
      subcategory,
      tags: tags || [],
      order: order ?? 0,
      isActive: isActive !== undefined ? isActive : true,
      imageUrl,
      createdBy: (req as any).user?._id,
      lastUpdatedBy: (req as any).user?._id,
    });

    return sendCreated(res, faq, 'FAQ created');
  } catch (error: any) {
    logger.error('[Admin] Error creating FAQ:', error);
    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }
    return sendError(res, 'Failed to create FAQ', 500);
  }
}));

/**
 * PUT /api/admin/faqs/:id
 * Update an FAQ by ID
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      question, answer, category, subcategory,
      tags, order, isActive, imageUrl,
    } = req.body;

    const faq = await FAQ.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(question !== undefined && { question }),
          ...(answer !== undefined && { answer }),
          ...(category !== undefined && { category }),
          ...(subcategory !== undefined && { subcategory }),
          ...(tags !== undefined && { tags }),
          ...(order !== undefined && { order }),
          ...(isActive !== undefined && { isActive }),
          ...(imageUrl !== undefined && { imageUrl }),
          lastUpdatedBy: (req as any).user?._id,
        },
      },
      { new: true, runValidators: true }
    );

    if (!faq) {
      return sendNotFound(res, 'FAQ not found');
    }

    return sendSuccess(res, faq, 'FAQ updated');
  } catch (error: any) {
    logger.error('[Admin] Error updating FAQ:', error);
    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }
    return sendError(res, 'Failed to update FAQ', 500);
  }
}));

/**
 * DELETE /api/admin/faqs/:id
 * Soft delete an FAQ (set isActive: false)
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const faq = await FAQ.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        isActive: false,
        lastUpdatedBy: (req as any).user?._id,
      },
    },
    { new: true }
  );

  if (!faq) {
    return sendNotFound(res, 'FAQ not found');
  }

  return sendSuccess(res, faq, 'FAQ soft-deleted');
}));

/**
 * PATCH /api/admin/faqs/:id/toggle
 * Toggle isActive status
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  const faq = await FAQ.findById(req.params.id);
  if (!faq) {
    return sendNotFound(res, 'FAQ not found');
  }

  faq.isActive = !faq.isActive;
  faq.lastUpdatedBy = (req as any).user?._id;
  await faq.save();

  return sendSuccess(res, faq, `FAQ ${faq.isActive ? 'activated' : 'deactivated'}`);
}));

/**
 * PUT /api/admin/faqs/reorder
 * Bulk reorder FAQs: accepts array of { id, order }
 */
router.put('/reorder', asyncHandler(async (req: Request, res: Response) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return sendBadRequest(res, 'items array is required with { id, order } objects');
  }

  const operations = items.map((item: { id: string; order: number }) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(item.id) },
      update: { $set: { order: item.order, lastUpdatedBy: (req as any).user?._id } },
    },
  }));

  const result = await FAQ.bulkWrite(operations);

  return sendSuccess(res, { modifiedCount: result.modifiedCount }, 'FAQs reordered');
}));

export default router;
