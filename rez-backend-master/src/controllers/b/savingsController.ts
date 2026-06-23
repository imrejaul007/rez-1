/**
 * Savings Dashboard controller — REZ-vs-NUQTA migration (Phase 0)
 *
 * Exposes the 10 endpoints advertised under `/api/b/savings/*`. Mirrors the
 * Mongoose + class-based style of `src/controllers/streakController.ts` and
 * uses the canonical Nuqta response helpers in `src/utils/bResponse.ts`.
 *
 * Seed-on-first-call: `getDashboard`, `getGoals`, and `getStreak` will populate
 * the corresponding collection with realistic Indian-region data on the very
 * first request by a new user. The seed data is returned wrapped in
 * `bMocked(...)` so the frontend can render a "sample data" banner in
 * non-production environments.
 */
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { asyncHandler } from '../../utils/asyncHandler';
import { bSuccess, bCreated, bError, bMocked } from '../../utils/bResponse';
import { ensureSeeded } from '../../utils/seedRunner';
import { logger } from '../../config/logger';
import {
  SavingsProfile,
  SavingsHistory,
  SavingsGoal,
  SavingsStreak,
} from '../../models/BSavings';

// ─────────────────────────────────────────────────────────────────────────────
// Seed builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a user identifier (any string — JWT userId, ObjectId, or test stub)
 * to a valid 24-char hex ObjectId. When the input is not a valid ObjectId
 * (e.g. mocked test users like `test-user-id`) we deterministically derive
 * one from an MD5 of the string so seeded data remains stable across calls.
 */
const toObjectId = (userId: string): mongoose.Types.ObjectId => {
  if (mongoose.isValidObjectId(userId)) {
    return new mongoose.Types.ObjectId(userId);
  }
  const hex = crypto.createHash('md5').update(String(userId)).digest('hex').slice(0, 24);
  return new mongoose.Types.ObjectId(hex);
};

const buildProfileSeed = (userId: string): Record<string, any> => ({
  user: toObjectId(userId),
  totalSavedPaise: 12_45_000,        // ₹12,450
  thisMonthSavedPaise: 2_80_000,    // ₹2,800
  thisMonthTargetPaise: 5_00_000,   // ₹5,000
  lastCalculatedAt: new Date(),
  tier: 'silver',
  tierProgressPct: 42,
  lastTierUpgradeAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
});

const HISTORY_SEED_ROWS: Array<{
  source: 'cashback' | 'offer' | 'loyalty' | 'referral' | 'wallet_transfer' | 'milestone_bonus';
  amountPaise: number;
  description: string;
  storeName: string;
  daysAgo: number;
}> = [
  { source: 'cashback',         amountPaise:   8_500, description: '2% cashback on BigBazaar grocery order',     storeName: 'BigBazaar',        daysAgo: 1 },
  { source: 'offer',            amountPaise:  15_000, description: 'Flat ₹150 off on Lifestyle purchase',        storeName: 'Lifestyle',        daysAgo: 3 },
  { source: 'cashback',         amountPaise:  22_500, description: '5% cashback on Croma electronics',           storeName: 'Croma',            daysAgo: 5 },
  { source: 'loyalty',          amountPaise:   3_200, description: 'Loyalty points redeemed at Apollo Pharmacy', storeName: 'Apollo Pharmacy',  daysAgo: 8 },
  { source: 'cashback',         amountPaise:   1_800, description: 'Cafe Coffee Day happy-hour cashback',        storeName: 'Cafe Coffee Day',  daysAgo: 11 },
  { source: 'offer',            amountPaise:   6_000, description: "Domino's weekend offer redemption",          storeName: "Domino's",         daysAgo: 14 },
  { source: 'referral',         amountPaise:  50_000, description: 'Referral bonus — friend signed up',          storeName: 'Amazon',           daysAgo: 18 },
  { source: 'milestone_bonus',  amountPaise: 100_000, description: '30-day savings streak milestone bonus',      storeName: 'Flipkart',         daysAgo: 25 },
];

const buildHistorySeed = (userId: string): Record<string, any>[] =>
  HISTORY_SEED_ROWS.map((row, index) => ({
    user: toObjectId(userId),
    source: row.source,
    amountPaise: row.amountPaise,
    description: row.description,
    storeName: row.storeName,
    transactionId: `seed-${userId}-${index + 1}`,
    createdAt: new Date(Date.now() - row.daysAgo * 24 * 60 * 60 * 1000),
  }));

const buildGoalsSeed = (userId: string): Record<string, any>[] => {
  const userObjectId = toObjectId(userId);
  return [
    {
      user: userObjectId,
      name: 'New phone',
      targetAmountPaise: 15_00_000, // ₹15,000
      savedAmountPaise: 6_20_000,   // ₹6,200
      deadline: new Date('2026-12-31'),
      category: 'shopping',
      iconEmoji: '📱',
      isCompleted: false,
    },
    {
      user: userObjectId,
      name: 'Goa trip',
      targetAmountPaise: 25_00_000, // ₹25,000
      savedAmountPaise: 9_50_000,   // ₹9,500
      deadline: new Date('2027-03-31'),
      category: 'travel',
      iconEmoji: '🏖️',
      isCompleted: false,
    },
    {
      user: userObjectId,
      name: 'Emergency fund',
      targetAmountPaise: 50_00_000, // ₹50,000
      savedAmountPaise: 32_40_000,  // ₹32,400
      deadline: new Date('2027-06-30'),
      category: 'other',
      iconEmoji: '🛟',
      isCompleted: false,
    },
  ];
};

const buildStreakSeed = (userId: string): Record<string, any> => ({
  user: toObjectId(userId),
  currentStreakDays: 14,
  longestStreakDays: 47,
  lastActivityDate: new Date(),
  nextMilestoneDays: 7,
  isAtRisk: false,
});

// ─────────────────────────────────────────────────────────────────────────────
// Inline validation helpers (no zod dependency in this project)
// ─────────────────────────────────────────────────────────────────────────────

const GOAL_CATEGORIES = new Set([
  'travel',
  'shopping',
  'grocery',
  'dining',
  'entertainment',
  'health',
  'education',
  'other',
]);

interface GoalValidationResult {
  ok: boolean;
  errors: string[];
  value?: {
    name: string;
    targetAmountPaise: number;
    savedAmountPaise?: number;
    deadline: Date;
    category?: string;
    iconEmoji?: string;
  };
}

const validateGoalBody = (body: any, partial: boolean = false): GoalValidationResult => {
  const errors: string[] = [];
  const out: any = {};

  if (!partial || body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      errors.push('name is required and must be a non-empty string');
    } else if (body.name.length > 100) {
      errors.push('name must be 100 characters or fewer');
    } else {
      out.name = body.name.trim();
    }
  }

  if (!partial || body.targetAmountPaise !== undefined) {
    const target = Number(body.targetAmountPaise);
    if (!Number.isFinite(target) || target < 100) {
      errors.push('targetAmountPaise must be a number >= 100 (₹1)');
    } else {
      out.targetAmountPaise = target;
    }
  }

  if (body.savedAmountPaise !== undefined) {
    const saved = Number(body.savedAmountPaise);
    if (!Number.isFinite(saved) || saved < 0) {
      errors.push('savedAmountPaise must be a non-negative number');
    } else {
      out.savedAmountPaise = saved;
    }
  }

  if (!partial || body.deadline !== undefined) {
    const deadline = new Date(body.deadline);
    if (Number.isNaN(deadline.getTime())) {
      errors.push('deadline must be a valid ISO date string');
    } else {
      out.deadline = deadline;
    }
  }

  if (body.category !== undefined && body.category !== null) {
    if (typeof body.category !== 'string' || !GOAL_CATEGORIES.has(body.category)) {
      errors.push(`category must be one of: ${Array.from(GOAL_CATEGORIES).join(', ')}`);
    } else {
      out.category = body.category;
    }
  }

  if (body.iconEmoji !== undefined && body.iconEmoji !== null) {
    if (typeof body.iconEmoji !== 'string') {
      errors.push('iconEmoji must be a string');
    } else {
      out.iconEmoji = body.iconEmoji;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, errors: [], value: out };
};

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

class SavingsController {
  /**
   * GET /api/b/savings/dashboard
   *
   * Combined view: profile, streak, goals count, and 5 most recent history
   * items. Seeds on first call so the demo user always sees a populated
   * dashboard.
   */
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return bError(res, 'Authentication required', 401);
    }

    // Seed-on-first-call for profile
    const profileDocs = await ensureSeeded(
      SavingsProfile,
      async () => [buildProfileSeed(userId)],
      { collectionName: 'savingsprofiles' }
    );

    // Seed-on-first-call for history
    const historyDocs = await ensureSeeded(
      SavingsHistory,
      async () => buildHistorySeed(userId),
      { collectionName: 'savingshistories' }
    );

    if (process.env.NODE_ENV !== 'production') {
      const profile = profileDocs[0];
      const recent = historyDocs
        .slice()
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      logger.info('savings_seeded', { userId, count: historyDocs.length }, 'B Features');
      return bSuccess(res, bMocked({
        totalSavedPaise: profile.totalSavedPaise,
        thisMonthSavedPaise: profile.thisMonthSavedPaise,
        thisMonthTargetPaise: profile.thisMonthTargetPaise,
        goalsCount: 0,
        streak: null,
        lastCalculatedAt: profile.lastCalculatedAt,
        recentActivity: recent,
      }));
    }

    const profile = await SavingsProfile.findOne({ user: toObjectId(userId) }).lean();
    const streak = await SavingsStreak.findOne({ user: toObjectId(userId) }).lean();
    const goalsCount = await SavingsGoal.countDocuments({ user: toObjectId(userId) });
    const recentActivity = await SavingsHistory.find({ user: toObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return bSuccess(res, {
      totalSavedPaise: profile?.totalSavedPaise ?? 0,
      thisMonthSavedPaise: profile?.thisMonthSavedPaise ?? 0,
      thisMonthTargetPaise: profile?.thisMonthTargetPaise ?? 5_00_000,
      goalsCount,
      streak: streak
        ? {
            currentStreakDays: streak.currentStreakDays,
            longestStreakDays: streak.longestStreakDays,
            isAtRisk: streak.isAtRisk,
          }
        : null,
      lastCalculatedAt: profile?.lastCalculatedAt ?? new Date(),
      recentActivity,
    });
  });

  /**
   * GET /api/b/savings/summary?periodDays=7|30|90
   *
   * Aggregates `SavingsHistory` over the given window and computes a naive
   * percentage comparison against the previous equal-length window.
   */
  getSummary = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return bError(res, 'Authentication required', 401);
    }

    const rawPeriod = Number(req.query.periodDays ?? 30);
    const allowed = [7, 30, 90];
    const periodDays = allowed.includes(rawPeriod) ? rawPeriod : 30;

    const now = new Date();
    const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousStart = new Date(now.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000);

    interface AggregateRow {
      totalSavedPaise: number;
      cashbackEarnedPaise: number;
      offersUsed: number;
      storesVisited: number;
    }

    const aggregateWindow = async (start: Date, end: Date): Promise<AggregateRow[]> => {
      return SavingsHistory.aggregate<AggregateRow>([
        { $match: { user: toObjectId(userId), createdAt: { $gte: start, $lt: end } } },
        {
          $group: {
            _id: null,
            totalSavedPaise: { $sum: '$amountPaise' },
            cashbackEarnedPaise: {
              $sum: {
                $cond: [{ $eq: ['$source', 'cashback'] }, '$amountPaise', 0],
              },
            },
            offersUsed: {
              $sum: {
                $cond: [{ $in: ['$source', ['offer', 'cashback']] }, 1, 0],
              },
            },
            storesVisited: {
              $addToSet: '$storeName',
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalSavedPaise: 1,
            cashbackEarnedPaise: 1,
            offersUsed: 1,
            storesVisited: { $size: '$storesVisited' },
          },
        },
      ]);
    };

    const currentRows = await aggregateWindow(currentStart, now);
    const previousRows = await aggregateWindow(previousStart, currentStart);

    const current = currentRows[0] ?? {
      totalSavedPaise: 0,
      cashbackEarnedPaise: 0,
      offersUsed: 0,
      storesVisited: 0,
    };
    const previous = previousRows[0] ?? {
      totalSavedPaise: 0,
      cashbackEarnedPaise: 0,
      offersUsed: 0,
      storesVisited: 0,
    };

    const comparedToPreviousPeriodPct = previous.totalSavedPaise === 0
      ? (current.totalSavedPaise > 0 ? 100 : 0)
      : Math.round(((current.totalSavedPaise - previous.totalSavedPaise) / previous.totalSavedPaise) * 100);

    return bSuccess(res, {
      periodDays,
      totalSavedPaise: current.totalSavedPaise,
      cashbackEarnedPaise: current.cashbackEarnedPaise,
      offersUsed: current.offersUsed,
      storesVisited: current.storesVisited,
      comparedToPreviousPeriodPct,
    });
  });

  /**
   * GET /api/b/savings/history?page=1&limit=20
   */
  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return bError(res, 'Authentication required', 401);
    }

    const page = Math.max(1, Number(req.query.page ?? 1));
    const rawLimit = Number(req.query.limit ?? 20);
    const limit = Math.min(100, Math.max(1, isNaN(rawLimit) ? 20 : rawLimit));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SavingsHistory.find({ user: toObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SavingsHistory.countDocuments({ user: toObjectId(userId) }),
    ]);

    return bSuccess(res, {
      items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
    });
  });

  /**
   * GET /api/b/savings/goals
   */
  getGoals = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return bError(res, 'Authentication required', 401);
    }

    // Seed-on-first-call
    const seedCount = await ensureSeeded(
      SavingsGoal,
      async () => buildGoalsSeed(userId),
      { collectionName: 'savingsgoals' }
    );

    if (
      process.env.NODE_ENV !== 'production'
      && seedCount.length > 0
      && seedCount[0].user?.toString() === toObjectId(userId).toString()
    ) {
      logger.info('savings_seeded', { userId, count: seedCount.length }, 'B Features');
      return bSuccess(res, bMocked(seedCount));
    }

    const goals = await SavingsGoal.find({ user: toObjectId(userId) })
      .sort({ isCompleted: 1, deadline: 1 })
      .lean();

    return bSuccess(res, goals);
  });

  /**
   * POST /api/b/savings/goals
   */
  createGoal = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return bError(res, 'Authentication required', 401);
    }

    const result = validateGoalBody(req.body, false);
    if (!result.ok) {
      return bError(res, 'Invalid goal payload', 400, { details: result.errors });
    }

    const goal = await SavingsGoal.create({
      ...result.value,
      user: toObjectId(userId),
      savedAmountPaise: result.value?.savedAmountPaise ?? 0,
    });

    return bCreated(res, goal.toObject());
  });

  /**
   * PUT /api/b/savings/goals/:id
   */
  updateGoal = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return bError(res, 'Authentication required', 401);
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return bError(res, 'Invalid goal id', 400);
    }

    const result = validateGoalBody(req.body, true);
    if (!result.ok) {
      return bError(res, 'Invalid goal payload', 400, { details: result.errors });
    }

    const update: Record<string, any> = { ...(result.value as object) };
    if (update.savedAmountPaise !== undefined && update.targetAmountPaise !== undefined
        && update.savedAmountPaise >= update.targetAmountPaise && !update.isCompleted) {
      update.isCompleted = true;
      update.completedAt = new Date();
    }

    const goal = await SavingsGoal.findOneAndUpdate(
      { _id: id, user: toObjectId(userId) },
      { $set: update },
      { new: true }
    ).lean();

    if (!goal) {
      return bError(res, 'Goal not found', 404);
    }

    return bSuccess(res, goal, 'Goal updated');
  });

  /**
   * DELETE /api/b/savings/goals/:id
   */
  deleteGoal = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return bError(res, 'Authentication required', 401);
    }

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return bError(res, 'Invalid goal id', 400);
    }

    const result = await SavingsGoal.deleteOne({ _id: id, user: toObjectId(userId) });
    if (result.deletedCount === 0) {
      return bError(res, 'Goal not found', 404);
    }

    return bSuccess(res, { id, deleted: true }, 'Goal deleted');
  });

  /**
   * GET /api/b/savings/streak
   */
  getStreak = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return bError(res, 'Authentication required', 401);
    }

    const docs = await ensureSeeded(
      SavingsStreak,
      async () => [buildStreakSeed(userId)],
      { collectionName: 'savingsstreaks' }
    );

    const streak = docs[0];
    if (process.env.NODE_ENV !== 'production') {
      logger.info('savings_seeded', { userId, count: docs.length }, 'B Features');
      return bSuccess(res, bMocked(streak));
    }

    return bSuccess(res, streak);
  });

  /**
   * GET /api/b/savings/projection
   *
   * Naive 30/90-day projection based on the trailing 30-day savings rate.
   */
  getProjection = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return bError(res, 'Authentication required', 401);
    }

    const lookbackDays = 30;
    const lookbackStart = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const result = await SavingsHistory.aggregate<{ total: number; count: number }>([
      { $match: { user: toObjectId(userId), createdAt: { $gte: lookbackStart } } },
      { $group: { _id: null, total: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
    ]);

    const total = result[0]?.total ?? 0;
    const dailyAverage = total / lookbackDays;

    return bSuccess(res, {
      basedOnDays: lookbackDays,
      observedSavedPaise: total,
      observedTransactions: result[0]?.count ?? 0,
      dailyAveragePaise: Math.round(dailyAverage),
      projection30DayPaise: Math.round(dailyAverage * 30),
      projection90DayPaise: Math.round(dailyAverage * 90),
    });
  });

  /**
   * GET /api/b/savings/recommendations
   *
   * Static, deterministic recommendations the frontend can render before
   * we have enough history to drive a real ML model.
   */
  getRecommendations = asyncHandler(async (req: Request, res: Response) => {
    const recommendations = [
      {
        id: 'rec-1',
        title: 'Stack cashback on groceries at BigBazaar',
        description: 'You spent ₹4,200 at BigBazaar last month. Activate the 5% cashback offer to save ₹210 this month.',
        estimatedSavingsPaise: 21_000,
        category: 'grocery',
      },
      {
        id: 'rec-2',
        title: 'Redeem Swiggy ₹100 off coupon',
        description: 'You have an unused food-delivery coupon expiring in 3 days.',
        estimatedSavingsPaise: 10_000,
        category: 'dining',
      },
      {
        id: 'rec-3',
        title: 'Switch to UPI for 2% extra cashback at Croma',
        description: 'Pay with UPI at Croma this week to unlock the 2% bonus (max ₹300).',
        estimatedSavingsPaise: 30_000,
        category: 'electronics',
      },
      {
        id: 'rec-4',
        title: 'Refer a friend for ₹500 each',
        description: 'Share your referral code — you earn ₹500 per signup, friend earns ₹200.',
        estimatedSavingsPaise: 50_000,
        category: 'other',
      },
      {
        id: 'rec-5',
        title: 'Hit your 7-day savings streak',
        description: 'You are 4 days away from a ₹100 milestone bonus.',
        estimatedSavingsPaise: 10_000,
        category: 'milestone_bonus',
      },
    ];

    return bSuccess(res, recommendations);
  });
}

export default new SavingsController();
