// @ts-nocheck
/**
 * consumerHomeRoutes.ts — Consumer app homepage endpoints
 *
 * Mounted at:
 *   /api/user   → recent-stores, coins/expiring
 *   /api/stores → recent
 */
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { Order } from '../models/Order';
import { CoinTransaction } from '../models/CoinTransaction';

const router = Router();

// ── GET /user/recent-stores  &  GET /stores/recent ───────────────────────────
// Returns stores the authenticated user has recently ordered from.
const recentStoresHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const recentStores = await Order.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        status: { $nin: ['cancelled', 'returned', 'refunded'] },
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$store',
        lastVisitDate: { $first: '$createdAt' },
        orderCount: { $sum: 1 },
      },
    },
    { $match: { _id: { $ne: null } } },
    { $sort: { lastVisitDate: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'stores',
        localField: '_id',
        foreignField: '_id',
        as: 'store',
      },
    },
    { $unwind: '$store' },
    {
      $project: {
        _id: 0,
        storeId: '$_id',
        storeName: '$store.name',
        storeLogo: '$store.logo',
        lastVisitDate: 1,
        orderCount: 1,
      },
    },
  ]);

  return res.json({ success: true, data: recentStores });
});

router.get('/recent-stores', authenticate, recentStoresHandler);
router.get('/recent', authenticate, recentStoresHandler);

// ── GET /user/coins/expiring?days=7 ──────────────────────────────────────────
// Returns summary of coins expiring within the given window.
router.get(
  '/coins/expiring',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const days = Math.min(90, Math.max(1, parseInt(req.query.days as string, 10) || 7));
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);

    const result = await CoinTransaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          type: 'earned',
          expiresAt: { $exists: true, $gt: now, $lte: cutoff },
          coinStatus: { $nin: ['consumed', 'reversed'] },
        },
      },
      {
        $group: {
          _id: null,
          amount: { $sum: '$amount' },
          earliestExpiry: { $min: '$expiresAt' },
        },
      },
    ]);

    const data = result[0] || { amount: 0, earliestExpiry: null };
    const daysLeft = data.earliestExpiry
      ? Math.max(0, Math.ceil((data.earliestExpiry.getTime() - now.getTime()) / 86400000))
      : days;

    return res.json({
      success: true,
      data: {
        amount: data.amount || 0,
        daysLeft,
        expiresAt: data.earliestExpiry?.toISOString() || null,
      },
    });
  }),
);

export default router;
