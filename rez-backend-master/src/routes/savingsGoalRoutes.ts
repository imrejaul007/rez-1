// @ts-nocheck
/**
 * Savings Goal Routes
 * Phase 3.3 — Habit Reinforcement
 *
 * POST /api/goals            — Create or update the current month's goal
 * GET  /api/goals/current    — Get current month goal with progress
 * GET  /api/goals/history    — Get past months' goals (default last 6)
 */

import { Router, Request, Response, NextFunction } from 'express';
import SavingsGoal, { currentMonthKey, monthKeyOffset } from '../models/SavingsGoal';
import { logger } from '../config/logger';
import { authenticate } from '../middleware/auth';

const router = Router();

// Belt-and-suspenders: enforce authentication at the router level regardless of
// how this router is mounted. All savings-goal endpoints require a valid session.
router.use(authenticate);

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ---------------------------------------------------------------------------
// POST /api/goals
// Create or update the current month's savings goal.
// Body: { targetAmount: number }
// ---------------------------------------------------------------------------
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { targetAmount } = req.body;
    if (typeof targetAmount !== 'number' || isNaN(targetAmount) || targetAmount < 1) {
      res.status(400).json({
        success: false,
        message: 'targetAmount must be a positive number',
      });
      return;
    }

    const month = currentMonthKey();

    // Upsert: if goal exists for this month, update the target
    const goal = await SavingsGoal.findOneAndUpdate(
      { userId, month },
      {
        $set: {
          targetAmount,
          lastUpdated: new Date(),
        },
        $setOnInsert: {
          userId,
          month,
          currentAmount: 0,
          isAchieved: false,
        },
      },
      { upsert: true, new: true },
    );

    res.json({ success: true, data: goalToDTO(goal) });
  }),
);

// ---------------------------------------------------------------------------
// GET /api/goals/current
// Get the current month's goal with live progress.
// ---------------------------------------------------------------------------
router.get(
  '/current',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const month = currentMonthKey();
    const goal = await SavingsGoal.findOne({ userId, month }).lean();

    if (!goal) {
      res.json({ success: true, data: null });
      return;
    }

    // Inject live current savings if goal was set this month
    // Recompute from CoinTransaction/cashback source
    let liveSavings = goal.currentAmount;
    try {
      const mongoose = require('mongoose');
      const CoinTransaction = mongoose.model('CoinTransaction');
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const [agg] = await CoinTransaction.aggregate([
        {
          $match: {
            user: goal.userId,
            type: { $in: ['cashback', 'store_cashback', 'instant_reward'] },
            createdAt: { $gte: start, $lt: end },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      liveSavings = agg?.total ?? goal.currentAmount;

      // Update currentAmount if it changed
      if (liveSavings !== goal.currentAmount) {
        const isNowAchieved = liveSavings >= goal.targetAmount;
        await SavingsGoal.updateOne(
          { _id: goal._id },
          {
            $set: {
              currentAmount: liveSavings,
              isAchieved: isNowAchieved,
              ...(isNowAchieved && !goal.isAchieved ? { achievedDate: new Date() } : {}),
            },
          },
        );
      }
    } catch {
      // Model unavailable — use stored value
    }

    const progressPct =
      goal.targetAmount > 0 ? Math.min(100, parseFloat(((liveSavings / goal.targetAmount) * 100).toFixed(1))) : 0;

    res.json({
      success: true,
      data: {
        ...goalToDTO({ ...goal, currentAmount: liveSavings }),
        progressPct,
        remaining: Math.max(0, goal.targetAmount - liveSavings),
        isAchieved: liveSavings >= goal.targetAmount,
      },
    });
  }),
);

// ---------------------------------------------------------------------------
// GET /api/goals/history
// Past months' goals (default: last 6 months excluding current).
// Query: ?limit=6
// ---------------------------------------------------------------------------
router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const limit = Math.min(24, parseInt((req.query.limit as string) ?? '6', 10) || 6);
    const currentMonth = currentMonthKey();

    // Collect month keys for the past N months
    const pastMonths: string[] = [];
    for (let i = 1; i <= limit; i++) {
      pastMonths.push(monthKeyOffset(i));
    }

    const goals = await SavingsGoal.find({
      userId,
      month: { $in: pastMonths },
    })
      .sort({ month: -1 })
      .lean();

    const dtos = goals.map((g) => ({
      ...goalToDTO(g),
      progressPct:
        g.targetAmount > 0 ? Math.min(100, parseFloat(((g.currentAmount / g.targetAmount) * 100).toFixed(1))) : 0,
    }));

    res.json({ success: true, data: dtos });
  }),
);

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------
router.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error('[SavingsGoalRoutes] Error:', err);
  if (err.code === 11000) {
    res.status(409).json({ success: false, message: 'Goal already exists for this month' });
    return;
  }
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Helper: convert Mongoose doc to a clean DTO
// ---------------------------------------------------------------------------
function goalToDTO(goal: any) {
  return {
    id: String(goal._id),
    userId: String(goal.userId),
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    month: goal.month,
    isAchieved: goal.isAchieved,
    achievedDate: goal.achievedDate ?? null,
    lastUpdated: goal.lastUpdated,
    createdAt: goal.createdAt,
  };
}

export default router;
