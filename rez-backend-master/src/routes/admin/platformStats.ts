// @ts-nocheck
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { Merchant } from '../../models/Merchant';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/platform-stats/
 * @desc    Get aggregate platform statistics for Control Center
 * @access  Admin
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Get all merchant stats in parallel
    const [totalMerchants, activeMerchants, newThisMonth, churnedMerchants, planStats] = await Promise.all([
      // Total merchant count
      Merchant.countDocuments({}),

      // Active merchants (with login in last 7 days)
      Merchant.countDocuments({
        lastLoginAt: { $gte: sevenDaysAgo },
      }),

      // New merchants this month
      Merchant.countDocuments({
        createdAt: { $gte: thisMonthStart },
      }),

      // Churned merchants (no login for 30+ days)
      Merchant.countDocuments({
        lastLoginAt: { $lt: thirtyDaysAgo },
      }),

      // Plan distribution — group merchants by their active plan subscription.
      // Merchant.currentPlan tracks which plan each merchant is on ('starter'|'growth'|'pro').
      // MerchantPlan is a 3-row config table (not per-merchant), so aggregating it gives wrong counts.
      Merchant.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$currentPlan', 'starter'] },
            count: { $sum: 1 },
          },
        },
      ]).allowDiskUse(true),
    ]);

    // Build plan distribution
    const planDistribution = {
      starter: 0,
      growth: 0,
      pro: 0,
    };

    let mrrTotal = 0;

    // Plan monthly prices for MRR estimate (matches MerchantPlan seed defaults)
    const PLAN_MONTHLY_PRICE: Record<string, number> = { starter: 0, growth: 1999, pro: 4999 };

    planStats.forEach((stat: any) => {
      const plan = (stat._id || 'starter').toLowerCase();
      if (plan in planDistribution) {
        planDistribution[plan as keyof typeof planDistribution] = stat.count;
        mrrTotal += (PLAN_MONTHLY_PRICE[plan] || 0) * stat.count;
      }
    });

    // Count merchants who switched to a paid plan this month (joined or upgraded this month, not on starter)
    const upgradesThisMonth = await Merchant.countDocuments({
      createdAt: { $gte: thisMonthStart },
      currentPlan: { $nin: ['starter', null, undefined] },
    });

    // TODO: Replace with real aggregator order aggregation once aggregator order model is available.
    // These were placeholder values — zeroed out to avoid surfacing fake data in production.
    const aggregatorOrders = {
      today: 0,
      pending: 0,
      acceptanceRate: 0,
    };

    // Calculate ARR
    const arr = mrrTotal * 12;

    const stats = {
      totalMerchants,
      activeMerchants,
      newThisMonth,
      churnedMerchants,
      planDistribution,
      mrr: mrrTotal,
      arr,
      upgradesThisMonth,
      aggregatorOrders,
    };

    res.json({
      success: true,
      data: stats,
    });
  }),
);

export default router;
