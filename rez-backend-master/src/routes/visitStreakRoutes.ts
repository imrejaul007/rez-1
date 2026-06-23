// @ts-nocheck
/**
 * visitStreakRoutes.ts
 *
 * GET /api/users/visit-streak
 *
 * Returns a user's store-visit totals, current/longest streak, next milestone,
 * and their last 5 completed visits.
 *
 * Data sources:
 *   - StoreVisit    (MongoDB) — total & recent completed visits
 *   - UserStreak    (MongoDB, type: 'savings') — streak counters
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { StoreVisit, VisitStatus } from '../models/StoreVisit';
import UserStreak from '../models/UserStreak';
import mongoose from 'mongoose';

const router = Router();

// All routes require a valid JWT
router.use(authenticate);

// ─── Visit milestone definitions ──────────────────────────────────────────────
//
// C11 FIX: CANONICAL milestone table — aligned with achievementWorker.ts in
// rez-gamification-service (the system that ACTUALLY awards coins).
//
// Previous display values were:
//   5→50, 10→100, 25→300, 50→750, 100→2000
//
// The gamification achievement worker actually awards:
//   1→25 (first_checkin), 5→75 (fifth_checkin), 10→150 (tenth_checkin)
//
// The storeVisitStreakWorker (gamification-service) awards streak milestones on
// top: 3-day→50, 7-day→200, 30-day→500.
//
// The display here now reflects only the visit-count achievement milestones
// (achievementWorker.ts ACHIEVEMENTS array). Any visit between these checkpoints
// earns 0 direct achievement coins, which is correct — streak coins are separate.
//
// IMPORTANT: If achievementWorker.ts ACHIEVEMENTS values change, update this
// table simultaneously. These are the only two places that must stay in sync.

interface VisitMilestone {
  visitsNeeded: number;
  reward: number; // REZ coins actually awarded at milestone by achievementWorker.ts
  name: string;
}

// CANONICAL: matches rez-gamification-service/src/workers/achievementWorker.ts
// ACHIEVEMENTS array (first_checkin / fifth_checkin / tenth_checkin entries).
const VISIT_MILESTONES: VisitMilestone[] = [
  { visitsNeeded: 1, reward: 25, name: 'First Visit' },
  { visitsNeeded: 5, reward: 75, name: 'Regular' },
  { visitsNeeded: 10, reward: 150, name: 'Loyal Customer' },
];

/** Return the next milestone the user has not yet reached. */
function nextMilestone(totalVisits: number): VisitMilestone | null {
  return VISIT_MILESTONES.find((m) => m.visitsNeeded > totalVisits) ?? null;
}

// ─── GET /api/users/visit-streak ──────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id?.toString();

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // ── 1. total completed store visits ──────────────────────────────────────
    const [totalVisits, savingsStreak, recentVisitDocs] = await Promise.all([
      StoreVisit.countDocuments({ userId: userObjectId, status: VisitStatus.COMPLETED }),

      // ── 2. savings streak (proxy for visit streak on the platform) ──────────
      UserStreak.findOne({ user: userObjectId, type: 'savings' }).lean(),

      // ── 3. last 5 completed visits ─────────────────────────────────────────
      StoreVisit.find({ userId: userObjectId, status: VisitStatus.COMPLETED })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('visitNumber storeId visitDate visitType status createdAt')
        .populate('storeId', 'name city')
        .lean(),
    ]);

    const currentStreak = savingsStreak?.currentStreak ?? 0;
    const longestStreak = savingsStreak?.longestStreak ?? 0;

    // ── shape recent visits for the response ─────────────────────────────────
    const recentVisits = recentVisitDocs.map((v) => ({
      visitNumber: v.visitNumber,
      storeId: (v.storeId as any)?._id ?? v.storeId,
      storeName: (v.storeId as any)?.name ?? null,
      storeCity: (v.storeId as any)?.city ?? null,
      visitDate: v.visitDate,
      visitType: v.visitType,
      status: v.status,
      createdAt: v.createdAt,
    }));

    const next = nextMilestone(totalVisits);

    logger.debug('[VisitStreak] Fetched visit-streak data', {
      userId,
      totalVisits,
      currentStreak,
    });

    return res.json({
      success: true,
      data: {
        totalVisits,
        currentStreak,
        longestStreak,
        nextMilestone: next
          ? {
              visitsNeeded: next.visitsNeeded - totalVisits, // visits still needed
              totalRequired: next.visitsNeeded,
              reward: next.reward,
              name: next.name,
            }
          : null,
        recentVisits,
      },
    });
  }),
);

export default router;
