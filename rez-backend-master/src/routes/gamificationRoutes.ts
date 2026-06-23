// @ts-nocheck
/**
 * gamificationRoutes.ts
 * Sprint 5 – Streak Shield endpoints
 *
 * POST /api/gamification/streak/use-shield   — consume weekly shield
 * GET  /api/gamification/streak/status       — current streak + shield info
 */
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────

/** Returns Monday 00:00:00 UTC of the current ISO week */
function getLastMonday(): Date {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday …
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/** Returns the Monday 00:00:00 UTC of the NEXT ISO week */
function getNextMonday(): Date {
  const lastMonday = getLastMonday();
  const next = new Date(lastMonday);
  next.setUTCDate(lastMonday.getUTCDate() + 7);
  return next;
}

// ── All routes require consumer JWT ────────────────────────────────────────
router.use(authenticate);

// ── POST /streak/use-shield ─────────────────────────────────────────────────
/**
 * Consumes the user's weekly streak shield for a store_visit streak.
 * Rules:
 *   - One shield per ISO week (Monday–Sunday UTC)
 *   - Cannot shield a streak that is already 0
 */
router.post(
  '/streak/use-shield',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const collection = mongoose.connection.collection('userstreaks');

    const doc = await collection.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'store_visit',
    });

    if (!doc) {
      return sendBadRequest(res, 'No active streak to protect');
    }

    const lastMonday = getLastMonday();
    const nextMonday = getNextMonday();

    // Check: shield already used this week
    if (doc.shieldUsedAt && new Date(doc.shieldUsedAt) > lastMonday) {
      return sendBadRequest(res, 'Shield already used this week');
    }

    // Check: no active streak to protect
    if (!doc.currentStreak || doc.currentStreak === 0) {
      return sendBadRequest(res, 'No active streak to protect');
    }

    const now = new Date();

    await collection.updateOne({ _id: doc._id }, { $set: { shieldUsedAt: now } });

    return sendSuccess(
      res,
      {
        success: true,
        streakProtected: doc.currentStreak,
        shieldUsedAt: now,
        nextShieldAt: nextMonday,
      },
      'Streak shield activated',
    );
  }),
);

// ── GET /streak/status ──────────────────────────────────────────────────────
/**
 * Returns the current streak + shield availability for the authenticated user.
 */
router.get(
  '/streak/status',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId as string;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const collection = mongoose.connection.collection('userstreaks');

    const doc = await collection.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'store_visit',
    });

    const lastMonday = getLastMonday();
    const nextMonday = getNextMonday();

    if (!doc) {
      return sendSuccess(
        res,
        {
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: null,
          shieldAvailable: true,
          shieldUsedAt: null,
          nextShieldAt: nextMonday,
        },
        'Streak status fetched',
      );
    }

    const shieldUsedThisWeek = doc.shieldUsedAt && new Date(doc.shieldUsedAt) > lastMonday;

    return sendSuccess(
      res,
      {
        currentStreak: doc.currentStreak ?? 0,
        longestStreak: doc.longestStreak ?? 0,
        lastActivityDate: doc.lastActivityDate ?? null,
        shieldAvailable: !shieldUsedThisWeek,
        shieldUsedAt: doc.shieldUsedAt ?? null,
        nextShieldAt: nextMonday,
      },
      'Streak status fetched',
    );
  }),
);

export default router;
