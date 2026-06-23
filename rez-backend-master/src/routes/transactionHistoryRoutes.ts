// @ts-nocheck
/**
 * transactionHistoryRoutes.ts — Sprint 9
 *
 * GET /api/user/transactions — paginated coin transaction history with summary
 *
 * Query params:
 *   type    : earned | redeemed | expired | all   (default: all)
 *   source  : any CoinTransaction source slug
 *   from    : ISO date string (lower bound on createdAt)
 *   to      : ISO date string (upper bound on createdAt)
 *   cursor  : last _id from previous page (for cursor pagination)
 *   limit   : 1-50, default 30
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { CoinTransaction } from '../models/CoinTransaction';

const router = Router();

router.use(requireAuth);
router.use(generalLimiter);

// ─── GET /api/user/transactions ───────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    // GF-17: requireAuth is an alias of authenticate, which sets both req.user and req.userId.
    // Use req.userId (string) set by authenticate rather than casting through `any`.
    const userId = req.userId || (req.user as any)?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // ── Parse & validate query params ──────────────────────────────────────
    const rawLimit = parseInt((req.query.limit as string) || '30', 10);
    const limit = Math.min(50, Math.max(1, isNaN(rawLimit) ? 30 : rawLimit));

    const typeParam = req.query.type as string | undefined;
    const source = req.query.source as string | undefined;
    const fromParam = req.query.from as string | undefined;
    const toParam = req.query.to as string | undefined;
    const cursor = req.query.cursor as string | undefined;

    // Map user-facing "redeemed" to internal "spent"
    const typeMap: Record<string, string> = {
      earned: 'earned',
      redeemed: 'spent',
      expired: 'expired',
    };

    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    // ── Build base match ────────────────────────────────────────────────────
    const baseMatch: Record<string, any> = { user: userObjectId };

    if (typeParam && typeParam !== 'all' && typeMap[typeParam]) {
      baseMatch.type = typeMap[typeParam];
    }

    if (source) {
      baseMatch.source = source;
    }

    if (fromParam || toParam) {
      baseMatch.createdAt = {};
      if (fromParam) {
        const from = new Date(fromParam);
        if (!isNaN(from.getTime())) {
          baseMatch.createdAt.$gte = from;
        }
      }
      if (toParam) {
        const to = new Date(toParam);
        if (!isNaN(to.getTime())) {
          baseMatch.createdAt.$lte = to;
        }
      }
    }

    // ── Cursor pagination: _id < cursor for previous page ──────────────────
    const pageMatch = { ...baseMatch };
    if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
      pageMatch._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    // ── Fetch one extra doc to determine hasMore ────────────────────────────
    const [transactions, summaryResult] = await Promise.all([
      CoinTransaction.find(pageMatch)
        .sort({ _id: -1 })
        .limit(limit + 1)
        .select('-__v')
        .lean(),
      CoinTransaction.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            totalEarned: {
              $sum: {
                $cond: [{ $in: ['$type', ['earned', 'bonus', 'branded_award', 'refunded']] }, '$amount', 0],
              },
            },
            totalRedeemed: {
              $sum: {
                $cond: [{ $in: ['$type', ['spent', 'expired']] }, '$amount', 0],
              },
            },
          },
        },
      ]),
    ]);

    const hasMore = transactions.length > limit;
    const page = hasMore ? transactions.slice(0, limit) : transactions;
    const nextCursor = hasMore ? page[page.length - 1]._id.toString() : null;

    const summary = summaryResult[0]
      ? {
          totalEarned: summaryResult[0].totalEarned ?? 0,
          totalRedeemed: summaryResult[0].totalRedeemed ?? 0,
        }
      : { totalEarned: 0, totalRedeemed: 0 };

    return res.json({
      success: true,
      data: {
        transactions: page,
        nextCursor,
        hasMore,
        summary,
      },
    });
  }),
);

export default router;
