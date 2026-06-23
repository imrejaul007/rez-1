// @ts-nocheck
/**
 * Admin: Reaction Routes
 *
 * Read-only + delete endpoints for moderating user emoji reactions.
 * Supports paginated listing, aggregate stats, per-merchant view, and admin removal.
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import Reaction from '../../models/Reaction';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendPaginated, sendNotFound } from '../../utils/response';
import { logger } from '../../config/logger';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/reactions
// List reactions with optional filters: targetType, merchantId, emoji, dateFrom, dateTo
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { targetType, merchantId, emoji, dateFrom, dateTo, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, unknown> = { isActive: true };
    if (targetType) query.targetType = targetType;
    if (merchantId) query.merchantId = merchantId;
    if (emoji) query.emoji = emoji;
    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(dateFrom as string);
      if (dateTo) dateFilter.$lte = new Date(dateTo as string);
      query.createdAt = dateFilter;
    }

    const [reactions, total] = await Promise.all([
      Reaction.find(query)
        .populate('user', 'profile.firstName profile.lastName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Reaction.countDocuments(query),
    ]);

    return sendPaginated(res, reactions, pageNum, limitNum, total, 'Reactions fetched');
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/reactions/stats
// Aggregate counts: by emoji, by targetType, by merchant, totals
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const [total, byEmoji, byTargetType, byMerchant] = await Promise.all([
      Reaction.countDocuments({ isActive: true }),

      Reaction.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$emoji', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, emoji: '$_id', count: 1 } },
      ]),

      Reaction.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$targetType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { _id: 0, targetType: '$_id', count: 1 } },
      ]),

      Reaction.aggregate([
        { $match: { isActive: true, merchantId: { $exists: true, $ne: null } } },
        { $group: { _id: '$merchantId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'merchants',
            localField: '_id',
            foreignField: '_id',
            as: 'merchant',
          },
        },
        {
          $project: {
            _id: 0,
            merchantId: '$_id',
            count: 1,
            merchantName: { $arrayElemAt: ['$merchant.name', 0] },
          },
        },
      ]),
    ]);

    return sendSuccess(res, { total, byEmoji, byTargetType, topMerchants: byMerchant }, 'Reaction stats fetched');
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/reactions/merchants/:merchantId
// Paginated reactions for a specific merchant
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/merchants/:merchantId',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    const { page = '1', limit = '20', targetType, emoji } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit as string, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const query: Record<string, unknown> = { merchantId, isActive: true };
    if (targetType) query.targetType = targetType;
    if (emoji) query.emoji = emoji;

    const [reactions, total] = await Promise.all([
      Reaction.find(query)
        .populate('user', 'profile.firstName profile.lastName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Reaction.countDocuments(query),
    ]);

    return sendPaginated(res, reactions, pageNum, limitNum, total, 'Merchant reactions fetched');
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/reactions/:id
// Soft-delete a reaction (admin moderation)
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const reaction = await Reaction.findById(id);
    if (!reaction) {
      return sendNotFound(res, 'Reaction not found');
    }

    reaction.isActive = false;
    await reaction.save();

    logger.info(`Admin removed reaction ${id}`, {
      adminId: (req as any).user?._id,
      emoji: reaction.emoji,
      targetType: reaction.targetType,
      targetId: reaction.targetId,
    });

    return sendSuccess(res, { id }, 'Reaction removed');
  }),
);

export default router;
