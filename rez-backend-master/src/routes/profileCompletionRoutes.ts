// @ts-nocheck
/**
 * profileCompletionRoutes.ts
 * Sprint 5 – Profile Completion Bonus
 *
 * GET  /api/user/profile-completion           — score + missing fields
 * POST /api/user/profile-completion/claim     — award 200 coins (idempotent)
 */
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';

const router = Router();

// ── Scoring configuration ───────────────────────────────────────────────────

interface FieldCheck {
  key: string;
  points: number;
  test: (user: any) => boolean;
}

const FIELD_CHECKS: FieldCheck[] = [
  { key: 'name', points: 15, test: (u) => !!(u.fullName || u.profile?.firstName || u.profile?.lastName) },
  { key: 'email', points: 15, test: (u) => !!u.email },
  { key: 'phone', points: 15, test: (u) => !!(u.phoneNumber || u.phone) },
  { key: 'avatar', points: 15, test: (u) => !!(u.profile?.avatar || u.profilePicture) },
  { key: 'dateOfBirth', points: 10, test: (u) => !!u.profile?.dateOfBirth },
  { key: 'gender', points: 10, test: (u) => !!u.profile?.gender },
  {
    key: 'address',
    points: 10,
    test: (u) => !!(u.profile?.location?.address || u.profile?.location?.city || u.profile?.location?.state),
  },
  { key: 'interests', points: 10, test: (u) => Array.isArray(u.interests) && u.interests.length > 0 },
];

const MAX_POINTS = 100;
const BONUS_COINS = 200;
const BONUS_SOURCE = 'profile_completion';

// ── Helpers ─────────────────────────────────────────────────────────────────

function scoreProfile(user: any): { points: number; missing: string[] } {
  let points = 0;
  const missing: string[] = [];

  for (const field of FIELD_CHECKS) {
    if (field.test(user)) {
      points += field.points;
    } else {
      missing.push(field.key);
    }
  }

  return { points, missing };
}

async function isBonusClaimed(userId: string): Promise<boolean> {
  const ledger = mongoose.connection.collection('coinledgers');
  const existing = await ledger.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    source: BONUS_SOURCE,
  });
  return !!existing;
}

// ── Routes ──────────────────────────────────────────────────────────────────

router.use(authenticate);

// GET /api/user/profile-completion
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const { points, missing } = scoreProfile(user);
    const percentage = Math.round((points / MAX_POINTS) * 100);
    const bonusClaimed = await isBonusClaimed(userId);

    return sendSuccess(
      res,
      {
        percentage,
        points,
        maxPoints: MAX_POINTS,
        missing,
        bonusClaimed,
      },
      'Profile completion fetched',
    );
  }),
);

// POST /api/user/profile-completion/claim
router.post(
  '/claim',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    // Idempotency check
    if (await isBonusClaimed(userId)) {
      return sendBadRequest(res, 'Profile completion bonus already claimed');
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const { points, missing } = scoreProfile(user);
    if (points < MAX_POINTS) {
      return sendBadRequest(res, `Profile not 100% complete. Missing: ${missing.join(', ')}`);
    }

    // Double-check idempotency under race (re-fetch after score confirmed)
    if (await isBonusClaimed(userId)) {
      return sendBadRequest(res, 'Profile completion bonus already claimed');
    }

    const ledger = mongoose.connection.collection('coinledgers');
    const now = new Date();

    // Insert ledger credit
    await ledger.insertOne({
      userId: new mongoose.Types.ObjectId(userId),
      amount: BONUS_COINS,
      type: 'credit',
      source: BONUS_SOURCE,
      createdAt: now,
    });

    // Update User wallet balance
    const walletUpdate: Record<string, unknown> = {
      $inc: {
        rezBalance: BONUS_COINS,
        'wallet.balance': BONUS_COINS,
        'wallet.totalEarned': BONUS_COINS,
      },
    };
    const updated = await User.findByIdAndUpdate(userId, walletUpdate, { new: true, select: 'wallet.balance' }).lean();

    return sendSuccess(
      res,
      {
        success: true,
        coinsAwarded: BONUS_COINS,
        newBalance: (updated as any)?.wallet?.balance ?? 0,
      },
      'Profile completion bonus awarded',
      201,
    );
  }),
);

export default router;
