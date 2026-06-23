// @ts-nocheck
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// All moderation routes require an authenticated admin session
router.use(requireAuth);
router.use(requireAdmin);

// ── GET /api/admin/moderation/queue ──────────────────────────────────────────
/**
 * Returns users whose total coin earnings today (from store_visit, qr_checkin,
 * or streak_milestone credit entries) exceed 500 coins, indicating potential
 * abuse.  Paginated via ?page and ?limit query params.
 */
router.get(
  '/queue',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const CoinLedger = mongoose.connection.collection('coinledgers');
    const Users = mongoose.connection.collection('users');

    // Start of today UTC
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const SUSPICIOUS_SOURCES = ['store_visit', 'qr_checkin', 'streak_milestone'];
    const COIN_THRESHOLD = 500;

    // Aggregate suspicious activity for today
    const aggregated = await CoinLedger.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart },
          type: 'credit',
          source: { $in: SUSPICIOUS_SOURCES },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalCoinsToday: { $sum: '$amount' },
          checkInCount: { $sum: 1 },
        },
      },
      {
        $match: {
          totalCoinsToday: { $gt: COIN_THRESHOLD },
        },
      },
      { $sort: { totalCoinsToday: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ]).toArray();

    const rows: any[] = aggregated[0]?.data ?? [];
    const total: number = aggregated[0]?.total?.[0]?.count ?? 0;

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: { items: [], total: 0, page, totalPages: 0 },
      });
    }

    // Collect userIds, tolerating both string and ObjectId forms
    const userIds = rows.map((r: any) => {
      try {
        return new mongoose.Types.ObjectId(String(r._id));
      } catch {
        return r._id;
      }
    });

    const userDocs = await Users.find(
      { _id: { $in: userIds } },
      { projection: { _id: 1, name: 1, fullName: 1, email: 1 } },
    ).toArray();

    const userMap = new Map<string, any>();
    for (const u of userDocs) {
      userMap.set(String(u._id), u);
    }

    const items = rows.map((r: any) => {
      const user = userMap.get(String(r._id));
      return {
        userId: String(r._id),
        name: user?.fullName ?? user?.name ?? 'Unknown',
        email: user?.email ?? null,
        totalCoinsToday: r.totalCoinsToday as number,
        checkInCount: r.checkInCount as number,
        flaggedAt: new Date().toISOString(),
      };
    });

    res.json({
      success: true,
      data: {
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  }),
);

// ── POST /api/admin/moderation/:userId/approve ────────────────────────────────
/**
 * Clears the isFlaggedForReview flag on the user — no coin action taken.
 */
router.post(
  '/:userId/approve',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }

    const Users = mongoose.connection.collection('users');
    const result = await Users.updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $unset: { isFlaggedForReview: '' } },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true });
  }),
);

// ── POST /api/admin/moderation/:userId/reject ─────────────────────────────────
/**
 * Deducts coins from the user's wallet, records a negative coinledger entry,
 * and sets isFlaggedForReview = true.
 *
 * Body: { coinsToDeduct: number, reason: string }
 */
router.post(
  '/:userId/reject',
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { coinsToDeduct, reason } = req.body as {
      coinsToDeduct: unknown;
      reason: unknown;
    };

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid userId' });
    }
    if (typeof coinsToDeduct !== 'number' || coinsToDeduct <= 0) {
      return res.status(400).json({ success: false, message: 'coinsToDeduct must be a positive number' });
    }
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'reason is required' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const Users = mongoose.connection.collection('users');
    const CoinLedger = mongoose.connection.collection('coinledgers');
    const Wallets = mongoose.connection.collection('wallets');

    const user = await Users.findOne({ _id: userObjectId }, { projection: { _id: 1 } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Record a negative coin ledger entry
    await CoinLedger.insertOne({
      userId: userId,
      amount: -Math.abs(coinsToDeduct),
      type: 'debit',
      source: 'admin_moderation',
      reason: reason.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Deduct from wallet — clamp at 0 to avoid negative balance
    await Wallets.updateOne({ userId: userId }, { $inc: { coins: -Math.abs(coinsToDeduct) } }, { upsert: false });

    // Flag the user for review
    await Users.updateOne({ _id: userObjectId }, { $set: { isFlaggedForReview: true, updatedAt: new Date() } });

    res.json({ success: true });
  }),
);

export default router;
