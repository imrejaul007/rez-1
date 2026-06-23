// @ts-nocheck
/**
 * User Activity Feed Routes — Sprint 8
 *
 * GET /api/user/activity-feed      — friend activity in last 48h
 * GET /api/user/activity-feed/me   — current user's own activity in last 7d
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { CoinTransaction } from '../models/CoinTransaction';
import Follow from '../models/Follow';
import { User } from '../models/User';
import UserAchievement from '../models/UserAchievement';

const router = Router();
router.use(generalLimiter);
router.use(requireAuth);

/** Format a user's display name as "First L." */
function anonymizeName(firstName?: string, lastName?: string): string {
  const first = (firstName || 'User').trim();
  const lastInitial = lastName ? lastName.trim().charAt(0).toUpperCase() + '.' : '';
  return lastInitial ? `${first} ${lastInitial}` : first;
}

/**
 * Resolve friend / connection user IDs for the current user.
 * Priority: Following list → Referral connections.
 */
async function resolveFriendIds(userId: string): Promise<mongoose.Types.ObjectId[]> {
  const follows = await Follow.find({ follower: userId }).select('following').lean();
  if (follows.length > 0) {
    return follows.map((f) => f.following as mongoose.Types.ObjectId);
  }

  // Fallback: referral connections (users referred by this user or who referred this user)
  const user = await User.findById(userId).select('referral').lean();
  const referralCode = (user as any)?.referral?.referralCode;
  const referredBy = (user as any)?.referral?.referredBy;

  const referralConnections: mongoose.Types.ObjectId[] = [];

  if (referralCode) {
    const referred = await User.find({ 'referral.referredBy': referralCode }).select('_id').lean();
    referred.forEach((u) => referralConnections.push(u._id as mongoose.Types.ObjectId));
  }

  if (referredBy) {
    const referrer = await User.findOne({ 'referral.referralCode': referredBy }).select('_id').lean();
    if (referrer) {
      referralConnections.push(referrer._id as mongoose.Types.ObjectId);
    }
  }

  return referralConnections;
}

/**
 * GET /api/user/activity-feed
 * Returns friends' coin earn and achievement activity from the last 48h.
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId!;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20', 10));

    const friendIds = await resolveFriendIds(userId);
    if (friendIds.length === 0) {
      return res.json({ success: true, data: [], pagination: { page, limit, total: 0 } });
    }

    const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const skip = (page - 1) * limit;

    const [coinTxs, achievements] = await Promise.all([
      CoinTransaction.find({
        user: { $in: friendIds },
        type: 'earned',
        source: 'cashback',
        createdAt: { $gte: since48h },
      })
        .select('user amount metadata createdAt')
        .sort({ createdAt: -1 })
        .lean(),

      UserAchievement.find({
        user: { $in: friendIds },
        unlocked: true,
        unlockedDate: { $gte: since48h },
      })
        .select('user achievement title unlockedDate')
        .sort({ unlockedDate: -1 })
        .lean(),
    ]);

    // Fetch user info for display
    const allUserIds = [
      ...new Set([...coinTxs.map((t) => t.user.toString()), ...achievements.map((a: any) => a.user.toString())]),
    ];

    const userMap = new Map<string, { firstName?: string; lastName?: string }>();
    if (allUserIds.length > 0) {
      const users = await User.find({ _id: { $in: allUserIds } })
        .select('profile.firstName profile.lastName')
        .lean();
      users.forEach((u: any) => {
        userMap.set(u._id.toString(), {
          firstName: u.profile?.firstName,
          lastName: u.profile?.lastName,
        });
      });
    }

    const feedItems: any[] = [];

    for (const tx of coinTxs) {
      const info = userMap.get(tx.user.toString()) || {};
      feedItems.push({
        type: 'checkin',
        userId: tx.user.toString(),
        userName: anonymizeName(info.firstName, info.lastName),
        storeName: (tx.metadata as any)?.storeName ?? null,
        coinAmount: tx.amount,
        createdAt: tx.createdAt,
      });
    }

    for (const ach of achievements as any[]) {
      const uid = ach.user.toString();
      const info = userMap.get(uid) || {};
      feedItems.push({
        type: 'achievement',
        userId: uid,
        userName: anonymizeName(info.firstName, info.lastName),
        achievementName: ach.title ?? null,
        createdAt: ach.unlockedDate,
      });
    }

    feedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = feedItems.length;
    const paginated = feedItems.slice(skip, skip + limit);

    return res.json({
      success: true,
      data: paginated,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

/**
 * GET /api/user/activity-feed/me
 * Returns the authenticated user's own activity in the last 7 days.
 */
router.get(
  '/me',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId!;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20', 10));
    const skip = (page - 1) * limit;

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [coinTxs, achievements] = await Promise.all([
      CoinTransaction.find({
        user: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: since7d },
      })
        .select('amount type source description metadata createdAt')
        .sort({ createdAt: -1 })
        .lean(),

      UserAchievement.find({
        user: new mongoose.Types.ObjectId(userId),
        unlocked: true,
        unlockedDate: { $gte: since7d },
      })
        .select('title unlockedDate')
        .sort({ unlockedDate: -1 })
        .lean(),
    ]);

    const feedItems: any[] = [];

    for (const tx of coinTxs) {
      feedItems.push({
        type: 'transaction',
        coinAmount: tx.amount,
        txType: tx.type,
        source: tx.source,
        description: tx.description,
        storeName: (tx.metadata as any)?.storeName ?? null,
        createdAt: tx.createdAt,
      });
    }

    for (const ach of achievements as any[]) {
      feedItems.push({
        type: 'achievement',
        achievementName: (ach as any).title ?? null,
        createdAt: (ach as any).unlockedDate,
      });
    }

    feedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = feedItems.length;
    const paginated = feedItems.slice(skip, skip + limit);

    return res.json({
      success: true,
      data: paginated,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

export default router;
