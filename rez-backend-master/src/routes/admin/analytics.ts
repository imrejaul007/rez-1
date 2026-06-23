// @ts-nocheck
import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { User } from '../../models/User';
import { Order } from '../../models/Order';
import { Merchant } from '../../models/Merchant';
import { CoinTransaction } from '../../models/CoinTransaction';
import { FraudFlag } from '../../models/FraudFlag';
import { ServiceAppointment } from '../../models/ServiceAppointment';
import { TrialBooking } from '../../models/TrialBooking';
import redisService from '../../services/redisService';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// SPEEDCORE: Helper to cache admin analytics (15-min TTL for analytics)
async function withAdminCache<T>(key: string, fn: () => Promise<T>): Promise<T> {
  try {
    const cached = await redisService.get<T>(key);
    if (cached) return cached;
  } catch (err) {
    logger.warn('[ADMIN CACHE] Redis get failed:', (err as Error).message);
  }

  const result = await fn();

  try {
    await redisService.set(key, result, 900); // 15-min TTL for cohorts (rarely change)
  } catch (err) {
    logger.warn('[ADMIN CACHE] Redis set failed:', (err as Error).message);
  }

  return result;
}

/**
 * @route   GET /api/admin/analytics/cohorts
 * @desc    Get user retention cohorts
 * @query   months=6  (number of months to analyze)
 * @access  Admin
 */
router.get(
  '/cohorts',
  asyncHandler(async (req: Request, res: Response) => {
    const months = parseInt((req.query.months as string) || '6', 10);

    if (isNaN(months) || months < 1 || months > 24) {
      return res.status(400).json({
        success: false,
        error: 'months query parameter must be a number between 1 and 24',
      });
    }

    // SPEEDCORE: Cache cohort data for 15 minutes (rarely changes within day)
    const cacheKey = `admin:analytics:cohorts:${months}`;
    const cohorts = await withAdminCache(cacheKey, async () => {
      const results = [];
      const now = new Date();

      // Analyze cohorts for the past N months
      for (let i = 0; i < months; i++) {
        const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        // Get users who signed up in this month — SPEEDCORE: Add .lean() for read-only queries
        const cohortUsers = await User.find({
          createdAt: { $gte: cohortStart, $lte: cohortEnd },
        })
          .select('_id createdAt')
          .lean();

        const cohortSize = cohortUsers.length;
        if (cohortSize === 0) continue;

        const userIds = cohortUsers.map((u: any) => u._id);
        const cohortMonthLabel = cohortStart.toLocaleString('en-US', {
          month: 'short',
          year: 'numeric',
        });

        // Calculate retention for each month after signup
        const retention = [100]; // Month 0 is always 100%

        for (let monthOffset = 1; monthOffset < months - i; monthOffset++) {
          const retentionMonthStart = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + monthOffset, 1);
          const retentionMonthEnd = new Date(
            cohortStart.getFullYear(),
            cohortStart.getMonth() + monthOffset + 1,
            0,
            23,
            59,
            59,
          );

          // Count users with any transaction (Order, ServiceAppointment, or TrialBooking) in this month
          const activeCount = await Promise.all([
            Order.countDocuments({
              userId: { $in: userIds },
              createdAt: { $gte: retentionMonthStart, $lte: retentionMonthEnd },
            }),
            ServiceAppointment.countDocuments({
              userId: { $in: userIds },
              createdAt: { $gte: retentionMonthStart, $lte: retentionMonthEnd },
            }),
            TrialBooking.countDocuments({
              userId: { $in: userIds },
              createdAt: { $gte: retentionMonthStart, $lte: retentionMonthEnd },
            }),
          ]);

          const totalActive = activeCount[0] + activeCount[1] + activeCount[2];
          const uniqueUserIds = new Set<string>();

          if (totalActive > 0) {
            // SPEEDCORE: Parallelize find queries with .lean()
            const [orders, appointments, trials] = await Promise.all([
              Order.find({
                userId: { $in: userIds },
                createdAt: { $gte: retentionMonthStart, $lte: retentionMonthEnd },
              })
                .select('userId')
                .lean(),
              ServiceAppointment.find({
                userId: { $in: userIds },
                createdAt: { $gte: retentionMonthStart, $lte: retentionMonthEnd },
              })
                .select('userId')
                .lean(),
              TrialBooking.find({
                userId: { $in: userIds },
                createdAt: { $gte: retentionMonthStart, $lte: retentionMonthEnd },
              })
                .select('userId')
                .lean(),
            ]);

            orders.forEach((o: any) => uniqueUserIds.add(o.userId.toString()));
            appointments.forEach((a: any) => uniqueUserIds.add(a.userId.toString()));
            trials.forEach((t: any) => uniqueUserIds.add(t.userId.toString()));
          }

          const retentionRate = Math.round((uniqueUserIds.size / cohortSize) * 100);
          retention.push(retentionRate);
        }

        results.push({
          cohort: cohortMonthLabel,
          size: cohortSize,
          retention,
        });
      }

      return results;
    });

    return sendSuccess(res, { cohorts }, 'Cohort analysis retrieved');
  }),
);

/**
 * @route   GET /api/admin/analytics/funnel
 * @desc    Get funnel conversion data
 * @query   name=consumer_signup  (funnel name)
 * @access  Admin
 */
router.get(
  '/funnel',
  asyncHandler(async (req: Request, res: Response) => {
    const funnelName = (req.query.name as string) || 'consumer_signup';

    const supportedFunnels = ['consumer_signup', 'merchant_onboard', 'trial_booking', 'bbps_payment'];
    if (!supportedFunnels.includes(funnelName)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported funnel name. Supported: ${supportedFunnels.join(', ')}`,
      });
    }

    let steps: Array<{ name: string; count: number }> = [];

    if (funnelName === 'consumer_signup') {
      // Consumer signup funnel
      const totalUsers = await User.countDocuments();
      const phoneEntered = await User.countDocuments({ 'auth.otpExpiry': { $exists: true } });
      const otpVerified = await User.countDocuments({ 'auth.isVerified': true });
      const profileComplete = await User.countDocuments({
        'profile.firstName': { $exists: true, $ne: null },
      });
      const firstTransaction = await User.countDocuments({
        'wallet.totalSpent': { $gt: 0 },
      });

      steps = [
        { name: 'App Opened', count: totalUsers },
        { name: 'Phone Entered', count: phoneEntered },
        { name: 'OTP Verified', count: otpVerified },
        { name: 'Profile Complete', count: profileComplete },
        { name: 'First Transaction', count: firstTransaction },
      ];
    } else if (funnelName === 'merchant_onboard') {
      // Merchant onboarding funnel (using Merchant model if available)
      try {
        const Merchant = require('../../models/Merchant').default;
        const totalMerchants = await Merchant.countDocuments();
        const documentSubmitted = await Merchant.countDocuments({
          'verification.status': { $exists: true },
        });
        const approved = await Merchant.countDocuments({
          'verification.status': 'approved',
        });

        steps = [
          { name: 'Registration Started', count: totalMerchants },
          { name: 'Documents Submitted', count: documentSubmitted },
          { name: 'Approved', count: approved },
        ];
      } catch {
        steps = [
          { name: 'Registration Started', count: 0 },
          { name: 'Documents Submitted', count: 0 },
          { name: 'Approved', count: 0 },
        ];
      }
    } else if (funnelName === 'trial_booking') {
      // Trial booking funnel
      const totalTrials = await TrialBooking.countDocuments();
      const scheduled = await TrialBooking.countDocuments({
        status: 'scheduled',
      });
      const completed = await TrialBooking.countDocuments({
        status: 'completed',
      });
      const converted = await TrialBooking.countDocuments({
        convertedToOrder: true,
      });

      steps = [
        { name: 'Trial Initiated', count: totalTrials },
        { name: 'Scheduled', count: scheduled },
        { name: 'Completed', count: completed },
        { name: 'Converted to Order', count: converted },
      ];
    } else if (funnelName === 'bbps_payment') {
      // BBPS payment funnel
      try {
        const BbpsTransaction = require('../../models/BbpsTransaction').default;
        const totalAttempts = await BbpsTransaction.countDocuments();
        const processing = await BbpsTransaction.countDocuments({
          status: 'processing',
        });
        const successful = await BbpsTransaction.countDocuments({
          status: 'success',
        });
        const failed = await BbpsTransaction.countDocuments({
          status: 'failed',
        });

        steps = [
          { name: 'Payment Initiated', count: totalAttempts },
          { name: 'Processing', count: processing },
          { name: 'Successful', count: successful },
          { name: 'Failed', count: failed },
        ];
      } catch {
        steps = [
          { name: 'Payment Initiated', count: 0 },
          { name: 'Processing', count: 0 },
          { name: 'Successful', count: 0 },
          { name: 'Failed', count: 0 },
        ];
      }
    }

    return sendSuccess(
      res,
      {
        name: funnelName,
        steps,
      },
      'Funnel data retrieved',
    );
  }),
);

/**
 * @route   GET /api/admin/analytics/dashboard
 * @desc    Platform analytics dashboard — revenue, orders, users, merchants, coins, top merchants, suspicious activity
 * @access  Admin
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: Request, res: Response) => {
    const CACHE_KEY = 'admin:analytics:dashboard:v1';
    const CACHE_TTL = 300; // 5-minute TTL — dashboard is read frequently but data tolerates brief staleness

    const cached = await withAdminCache<object>(CACHE_KEY, async () => {
      const now = new Date();

      // Boundary timestamps — computed once and reused across all aggregations
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const weekStart = new Date(todayStart);
      weekStart.setDate(todayStart.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysStart = new Date(todayStart);
      thirtyDaysStart.setDate(todayStart.getDate() - 29); // inclusive of today = 30 days

      // ── Revenue aggregations ──────────────────────────────────────────────────
      // We count only non-cancelled, non-refunded orders (completed revenue).
      const REVENUE_STATUSES = [
        'placed',
        'confirmed',
        'preparing',
        'ready',
        'dispatched',
        'out_for_delivery',
        'delivered',
      ];

      const [revenueToday, revenueWeek, revenueMonth, revenueTrend] = await Promise.all([
        // Today's revenue
        Order.aggregate([
          { $match: { createdAt: { $gte: todayStart }, status: { $in: REVENUE_STATUSES } } },
          { $group: { _id: null, total: { $sum: '$totals.total' } } },
        ]),

        // This week's revenue
        Order.aggregate([
          { $match: { createdAt: { $gte: weekStart }, status: { $in: REVENUE_STATUSES } } },
          { $group: { _id: null, total: { $sum: '$totals.total' } } },
        ]),

        // This month's revenue
        Order.aggregate([
          { $match: { createdAt: { $gte: monthStart }, status: { $in: REVENUE_STATUSES } } },
          { $group: { _id: null, total: { $sum: '$totals.total' } } },
        ]),

        // 30-day daily revenue trend
        Order.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysStart }, status: { $in: REVENUE_STATUSES } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' },
              },
              amount: { $sum: '$totals.total' },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]),
      ]);

      // ── Order aggregations ────────────────────────────────────────────────────
      const [ordersToday, ordersWeek, ordersByStatus, orderTrend] = await Promise.all([
        // Orders today
        Order.countDocuments({ createdAt: { $gte: todayStart } }),

        // Orders this week
        Order.countDocuments({ createdAt: { $gte: weekStart } }),

        // Orders by status (all-time counts for operational view)
        Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

        // 30-day daily order count trend
        Order.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysStart } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]),
      ]);

      // ── User aggregations ─────────────────────────────────────────────────────
      const [totalUsers, newUsersWeek, newUsersMonth, userTrend] = await Promise.all([
        User.countDocuments({}),

        User.countDocuments({ createdAt: { $gte: weekStart } }),

        User.countDocuments({ createdAt: { $gte: monthStart } }),

        // 7-day daily new user trend (matches the "User Growth (7 Days)" chart on screen)
        User.aggregate([
          { $match: { createdAt: { $gte: weekStart } } },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                day: { $dayOfMonth: '$createdAt' },
              },
              newUsers: { $sum: 1 },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        ]),
      ]);

      // ── Merchant aggregations ─────────────────────────────────────────────────
      const [totalMerchants, activeMerchants, newMerchantsMonth] = await Promise.all([
        Merchant.countDocuments({}),

        // Active = verified + isActive
        Merchant.countDocuments({ verificationStatus: 'verified', isActive: true }),

        Merchant.countDocuments({ createdAt: { $gte: monthStart } }),
      ]);

      // ── Top 10 merchants by revenue (last 30 days) ────────────────────────────
      // Aggregate on Order.store → lookup Merchant for name and category
      const topMerchantsRaw = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysStart },
            status: { $in: REVENUE_STATUSES },
            store: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: '$store',
            revenue: { $sum: '$totals.total' },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'merchants',
            localField: '_id',
            foreignField: '_id',
            as: 'merchantDoc',
          },
        },
        { $unwind: { path: '$merchantDoc', preserveNullAndEmptyArrays: false } },
        {
          $project: {
            _id: 0,
            merchantId: '$_id',
            name: { $ifNull: ['$merchantDoc.businessName', 'Unknown'] },
            category: {
              $ifNull: [
                { $arrayElemAt: ['$merchantDoc.categories', 0] },
                { $ifNull: ['$merchantDoc.onboarding.stepData.storeDetails.category', 'General'] },
              ],
            },
            revenue: 1,
            orders: '$orderCount',
          },
        },
      ]);

      // ── Coin/wallet aggregations ──────────────────────────────────────────────
      const [coinsIssued, coinsRedeemed, coinActiveUsers] = await Promise.all([
        // Total coins ever issued (earned/bonus/refunded)
        CoinTransaction.aggregate([
          { $match: { type: { $in: ['earned', 'bonus', 'refunded', 'branded_award'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),

        // Total coins ever redeemed/spent/expired
        CoinTransaction.aggregate([
          { $match: { type: { $in: ['spent', 'expired'] } } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),

        // Distinct users who transacted coins in the last 30 days
        CoinTransaction.distinct('user', { createdAt: { $gte: thirtyDaysStart } }),
      ]);

      // ── Suspicious activity (open FraudFlags, most recent 20) ────────────────
      const recentFlags = await FraudFlag.find({ status: 'open' })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('type severity userId metadata createdAt')
        .lean();

      // ── Shape response ────────────────────────────────────────────────────────

      // Revenue trend: fill any missing days in the 30-day window with 0
      const revenueTrendMap = new Map<string, number>();
      for (const row of revenueTrend) {
        const key = `${row._id.year}-${String(row._id.month).padStart(2, '0')}-${String(row._id.day).padStart(2, '0')}`;
        revenueTrendMap.set(key, row.amount);
      }
      const revenueTrendFilled: Array<{ date: string; amount: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        revenueTrendFilled.push({ date: key, amount: revenueTrendMap.get(key) ?? 0 });
      }

      // Order trend: same fill for 30 days
      const orderTrendMap = new Map<string, number>();
      for (const row of orderTrend) {
        const key = `${row._id.year}-${String(row._id.month).padStart(2, '0')}-${String(row._id.day).padStart(2, '0')}`;
        orderTrendMap.set(key, row.count);
      }
      const orderTrendFilled: Array<{ date: string; count: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        orderTrendFilled.push({ date: key, count: orderTrendMap.get(key) ?? 0 });
      }

      // User growth trend: 7 days, with short day labels for the bar chart
      const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const userTrendMap = new Map<string, number>();
      for (const row of userTrend) {
        const key = `${row._id.year}-${String(row._id.month).padStart(2, '0')}-${String(row._id.day).padStart(2, '0')}`;
        userTrendMap.set(key, row.newUsers);
      }
      const userGrowth: Array<{ date: string; newUsers: number; label: string }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        userGrowth.push({
          date: key,
          newUsers: userTrendMap.get(key) ?? 0,
          label: DAY_LABELS[d.getDay()],
        });
      }

      // Orders by status map
      const statusMap: Record<string, number> = {};
      for (const s of ordersByStatus) {
        statusMap[s._id] = s.count;
      }

      // Suspicious activity shaped for admin screen
      const suspiciousActivity = recentFlags.map((flag: any) => ({
        id: String(flag._id),
        type: flag.type,
        description: flag.metadata?.description || `Flagged: ${flag.type.replace(/_/g, ' ')}`,
        userId: flag.userId ? String(flag.userId) : undefined,
        amount: flag.metadata?.amount,
        flaggedAt: flag.createdAt instanceof Date ? flag.createdAt.toISOString() : String(flag.createdAt),
        severity: flag.severity === 'critical' ? 'high' : (flag.severity as 'high' | 'medium' | 'low'),
      }));

      // Top merchants shaped for admin screen (id field matches m.id usage in screen)
      const topMerchants = topMerchantsRaw.map((m: any) => ({
        id: String(m.merchantId),
        name: m.name,
        revenue: m.revenue,
        orders: m.orders,
        category: m.category || 'General',
      }));

      return {
        revenue: {
          today: revenueToday[0]?.total ?? 0,
          thisWeek: revenueWeek[0]?.total ?? 0,
          thisMonth: revenueMonth[0]?.total ?? 0,
          trend: revenueTrendFilled,
        },
        orders: {
          today: ordersToday,
          thisWeek: ordersWeek,
          byStatus: {
            pending: (statusMap['placed'] ?? 0) + (statusMap['confirmed'] ?? 0),
            confirmed: statusMap['confirmed'] ?? 0,
            completed: statusMap['delivered'] ?? 0,
            cancelled: (statusMap['cancelled'] ?? 0) + (statusMap['refunded'] ?? 0),
          },
          trend: orderTrendFilled,
        },
        users: {
          total: totalUsers,
          newThisWeek: newUsersWeek,
          newThisMonth: newUsersMonth,
          trend: userGrowth,
        },
        merchants: {
          total: totalMerchants,
          active: activeMerchants,
          newThisMonth: newMerchantsMonth,
        },
        topMerchants,
        // Screen reads analyticsData.topMerchants — also expose at userGrowth for the bar chart
        userGrowth,
        coins: {
          totalIssued: coinsIssued[0]?.total ?? 0,
          totalRedeemed: coinsRedeemed[0]?.total ?? 0,
          activeUsers: Array.isArray(coinActiveUsers) ? coinActiveUsers.length : 0,
        },
        suspiciousActivity,
      };
    });

    // Override TTL — withAdminCache uses 900s by default; we want 300s for dashboard freshness.
    // Re-set with shorter TTL (best-effort; main data is already returned from cache correctly).
    try {
      await redisService.set(CACHE_KEY, cached, CACHE_TTL);
    } catch {
      // Non-fatal
    }

    return sendSuccess(res, cached, 'Analytics dashboard retrieved');
  }),
);

export default router;
