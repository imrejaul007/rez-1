import { logger } from '../../config/logger';
/**
 * Admin Routes - Surprise Coin Drops
 * CRUD + bulk operations for SurpriseCoinDrop model
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { SurpriseCoinDrop } from '../../models/SurpriseCoinDrop';
import { User } from '../../models/User';
import { sendSuccess, sendError, sendBadRequest } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { escapeRegex } from '../../utils/sanitize';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/surprise-coin-drops
 * List all surprise coin drops with pagination & filtering
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    if (req.query.reason && req.query.reason !== 'all') {
      filter.reason = req.query.reason;
    }

    if (req.query.userId) {
      if (Types.ObjectId.isValid(req.query.userId as string)) {
        filter.userId = new Types.ObjectId(req.query.userId as string);
      }
    }

    // Search by user phone number
    if (req.query.search) {
      const searchStr = (req.query.search as string).replace(/\D/g, '');
      if (searchStr.length >= 7) {
        const users = await User.find({
          phoneNumber: { $regex: escapeRegex(searchStr), $options: 'i' },
        }).select('_id').limit(20).lean();
        const userIds = users.map(u => u._id);
        if (userIds.length) {
          filter.userId = { $in: userIds };
        } else {
          return sendSuccess(res, {
            drops: [],
            pagination: { page, limit, total: 0, totalPages: 0 },
          }, 'No matching users');
        }
      }
    }

    if (req.query.dateFrom || req.query.dateTo) {
      filter.createdAt = {};
      if (req.query.dateFrom) filter.createdAt.$gte = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filter.createdAt.$lte = new Date(req.query.dateTo as string);
    }

    const [drops, total] = await Promise.all([
      SurpriseCoinDrop.find(filter)
        .populate('userId', 'fullName phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SurpriseCoinDrop.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      drops,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, 'Surprise coin drops fetched');
  }));

/**
 * GET /api/admin/surprise-coin-drops/analytics
 * Analytics: breakdown by status, reason, daily volume
 */
router.get('/analytics', asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [statusBreakdown, reasonBreakdown, dailyVolume, totals] = await Promise.all([
      SurpriseCoinDrop.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 }, totalCoins: { $sum: '$coins' } } },
      ]),
      SurpriseCoinDrop.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$reason', count: { $sum: 1 }, totalCoins: { $sum: '$coins' } } },
        { $sort: { count: -1 } },
      ]),
      SurpriseCoinDrop.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            totalCoins: { $sum: '$coins' },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]),
      SurpriseCoinDrop.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            totalDrops: { $sum: 1 },
            totalCoins: { $sum: '$coins' },
            avgCoins: { $avg: '$coins' },
            uniqueUsers: { $addToSet: '$userId' },
          },
        },
      ]),
    ]);

    const summary = totals[0] || { totalDrops: 0, totalCoins: 0, avgCoins: 0 };
    const claimedData = statusBreakdown.find((s: any) => s._id === 'claimed');
    const availableData = statusBreakdown.find((s: any) => s._id === 'available');
    const claimRate = summary.totalDrops > 0
      ? Math.round(((claimedData?.count || 0) / summary.totalDrops) * 100)
      : 0;

    return sendSuccess(res, {
      period: `${days} days`,
      summary: {
        totalDrops: summary.totalDrops,
        totalCoins: summary.totalCoins,
        avgCoins: Math.round(summary.avgCoins || 0),
        uniqueUsers: summary.uniqueUsers?.length || 0,
        claimRate,
        unclaimed: availableData?.count || 0,
      },
      statusBreakdown,
      reasonBreakdown,
      dailyVolume,
    }, 'Analytics fetched');
  }));

/**
 * GET /api/admin/surprise-coin-drops/:id
 * Get single surprise coin drop
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendBadRequest(res, 'Invalid drop ID');
    }

    const drop = await SurpriseCoinDrop.findById(req.params.id)
      .populate('userId', 'fullName phoneNumber profile.avatar')
      .lean();

    if (!drop) {
      return sendError(res, 'Surprise coin drop not found', 404);
    }

    return sendSuccess(res, drop, 'Surprise coin drop fetched');
  }));

/**
 * POST /api/admin/surprise-coin-drops
 * Create a surprise coin drop for a specific user
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const { userId, coins, reason, message, expiryHours, metadata } = req.body;

    if (!userId) return sendBadRequest(res, 'userId is required');
    if (!Types.ObjectId.isValid(userId)) return sendBadRequest(res, 'Invalid userId');
    if (!coins || coins < 1 || coins > 10000) return sendBadRequest(res, 'coins must be between 1 and 10000');

    const user = await User.findById(userId).select('_id fullName').lean();
    if (!user) return sendError(res, 'User not found', 404);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expiryHours || 24));

    const drop = await SurpriseCoinDrop.create({
      userId,
      coins,
      reason: reason || 'promo',
      message: message || 'Surprise! You got bonus coins!',
      status: 'available',
      expiresAt,
      metadata: {
        ...metadata,
        createdBy: 'admin',
        adminUserId: (req as any).userId,
      },
    });

    return sendSuccess(res, drop, 'Surprise coin drop created');
  }));

/**
 * POST /api/admin/surprise-coin-drops/bulk
 * Create surprise coin drops for multiple users at once
 */
router.post('/bulk', asyncHandler(async (req: Request, res: Response) => {
    const { userIds, coins, reason, message, expiryHours, metadata } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return sendBadRequest(res, 'userIds array is required');
    }
    if (userIds.length > 500) {
      return sendBadRequest(res, 'Maximum 500 users per bulk operation');
    }
    if (!coins || coins < 1 || coins > 10000) {
      return sendBadRequest(res, 'coins must be between 1 and 10000');
    }

    const validUserIds = userIds.filter((id: string) => Types.ObjectId.isValid(id));
    if (validUserIds.length === 0) return sendBadRequest(res, 'No valid user IDs provided');

    // Verify users exist
    const existingUsers = await User.find({ _id: { $in: validUserIds } }).select('_id').lean();
    const existingIds = existingUsers.map(u => String(u._id));

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expiryHours || 24));

    const drops = existingIds.map(uid => ({
      userId: new Types.ObjectId(uid),
      coins,
      reason: reason || 'promo',
      message: message || 'Surprise! You got bonus coins!',
      status: 'available' as const,
      expiresAt,
      metadata: {
        ...metadata,
        createdBy: 'admin',
        adminUserId: (req as any).userId,
        bulkOperation: true,
      },
    }));

    const result = await SurpriseCoinDrop.insertMany(drops);

    return sendSuccess(res, {
      created: result.length,
      skipped: validUserIds.length - existingIds.length,
      invalidIds: userIds.length - validUserIds.length,
    }, `${result.length} surprise coin drops created`);
  }));

/**
 * PUT /api/admin/surprise-coin-drops/:id
 * Update a surprise coin drop (only available/pending drops)
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendBadRequest(res, 'Invalid drop ID');
    }

    const drop = await SurpriseCoinDrop.findById(req.params.id);
    if (!drop) return sendError(res, 'Surprise coin drop not found', 404);
    if (drop.status !== 'available') {
      return sendBadRequest(res, `Cannot edit drop in '${drop.status}' status`);
    }

    const { coins, reason, message, expiresAt } = req.body;
    if (coins !== undefined) {
      if (coins < 1 || coins > 10000) return sendBadRequest(res, 'coins must be between 1 and 10000');
      drop.coins = coins;
    }
    if (reason) drop.reason = reason;
    if (message) drop.message = message;
    if (expiresAt) drop.expiresAt = new Date(expiresAt);

    await drop.save();

    return sendSuccess(res, drop, 'Surprise coin drop updated');
  }));

/**
 * DELETE /api/admin/surprise-coin-drops/:id
 * Delete an unclaimed surprise coin drop
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return sendBadRequest(res, 'Invalid drop ID');
    }

    const drop = await SurpriseCoinDrop.findById(req.params.id);
    if (!drop) return sendError(res, 'Surprise coin drop not found', 404);
    if (drop.status === 'claimed') {
      return sendBadRequest(res, 'Cannot delete a claimed drop');
    }

    await SurpriseCoinDrop.findByIdAndDelete(req.params.id);

    return sendSuccess(res, null, 'Surprise coin drop deleted');
  }));

/**
 * POST /api/admin/surprise-coin-drops/expire-old
 * Manually trigger expiry of old unclaimed drops
 */
router.post('/expire-old', asyncHandler(async (req: Request, res: Response) => {
    const result = await SurpriseCoinDrop.updateMany(
      {
        status: 'available',
        expiresAt: { $lte: new Date() },
      },
      {
        $set: { status: 'expired' },
      }
    );

    return sendSuccess(res, {
      expiredCount: result.modifiedCount,
    }, `${result.modifiedCount} drops expired`);
  }));

export default router;
