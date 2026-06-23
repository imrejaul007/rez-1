/**
 * Admin: Review Moderation Routes
 *
 * CRUD endpoints for moderating user-written reviews.
 * Reviews have moderationStatus: pending | approved | rejected
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import Review from '../../models/Review';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated, sendNotFound, sendBadRequest } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { logger } from '../../config/logger';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/admin/reviews
 * List reviews with filters: status, storeId, rating, search, page, limit
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    status = 'pending',
    storeId,
    rating,
    search,
    page = '1',
    limit = '20',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string) || 1);
  const limitNum = Math.min(50, parseInt(limit as string) || 20);
  const skip = (pageNum - 1) * limitNum;

  const query: any = {};
  if (status && status !== 'all') query.moderationStatus = status;
  if (storeId) query.store = storeId;
  if (rating) query.rating = parseInt(rating as string);
  if (search) {
    const escaped = escapeRegex((search as string).trim());
    query.$or = [
      { comment: { $regex: escaped, $options: 'i' } },
      { title: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [reviews, total] = await Promise.all([
    Review.find(query)
      .populate('user', 'profile.firstName profile.lastName profile.avatar email phoneNumber')
      .populate('store', 'name logo')
      .select('rating title comment moderationStatus moderationReason moderatedAt createdAt user store isActive images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Review.countDocuments(query),
  ]);

  return sendPaginated(res, reviews, pageNum, limitNum, total, 'Reviews fetched');
}));

/**
 * GET /api/admin/reviews/stats
 * Count by moderation status
 */
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const stats = await Review.aggregate([
    { $group: { _id: '$moderationStatus', count: { $sum: 1 } } },
  ]);
  const result: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
  stats.forEach((s: any) => { result[s._id] = s.count; });
  return sendSuccess(res, result, 'Review stats fetched');
}));

/**
 * PUT /api/admin/reviews/:id/approve
 */
router.put('/:id/approve', asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findById(req.params.id);
  if (!review) return sendNotFound(res, 'Review not found');

  const adminId = (req as any).userId || (req as any).user?._id;

  (review as any).moderationStatus = 'approved';
  (review as any).moderatedBy = adminId;
  (review as any).moderatedAt = new Date();
  (review as any).moderationReason = undefined;
  await review.save();

  logger.info(`[Admin] Review ${req.params.id} approved by admin ${adminId}`);

  return sendSuccess(res, { id: review._id, moderationStatus: 'approved' }, 'Review approved');
}));

/**
 * PUT /api/admin/reviews/:id/reject
 */
router.put('/:id/reject', asyncHandler(async (req: Request, res: Response) => {
  const { reason } = req.body;
  if (!reason?.trim()) return sendBadRequest(res, 'Rejection reason is required');

  const review = await Review.findById(req.params.id);
  if (!review) return sendNotFound(res, 'Review not found');

  const adminId = (req as any).userId || (req as any).user?._id;

  (review as any).moderationStatus = 'rejected';
  (review as any).moderatedBy = adminId;
  (review as any).moderatedAt = new Date();
  (review as any).moderationReason = reason.trim();
  (review as any).isActive = false;
  await review.save();

  logger.info(`[Admin] Review ${req.params.id} rejected by admin ${adminId}: ${reason}`);

  return sendSuccess(res, { id: review._id, moderationStatus: 'rejected' }, 'Review rejected');
}));

/**
 * DELETE /api/admin/reviews/:id
 * Soft delete — sets isActive: false
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { $set: { isActive: false, moderationStatus: 'rejected' } },
    { new: true }
  );
  if (!review) return sendNotFound(res, 'Review not found');

  logger.info(`[Admin] Review ${req.params.id} hidden by admin`);

  return sendSuccess(res, null, 'Review hidden successfully');
}));

export default router;
