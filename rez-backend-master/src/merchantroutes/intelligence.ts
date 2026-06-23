import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import { authMiddleware } from '../middleware/merchantauth';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';

const log = createServiceLogger('merchant-intelligence');

const router = Router();
router.use(authMiddleware);

/**
 * GET /merchant/intelligence/dead-hours
 * Returns hourly revenue breakdown + identifies low-revenue windows.
 * Uses StorePayment aggregation for the past 30 days.
 */
router.get(
  '/dead-hours',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.query as { storeId?: string };
    if (!storeId) {
      sendError(res, 'storeId required', 400);
      return;
    }

    const { StorePayment } = await import('../models/StorePayment');
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);

    const hourlyData = await StorePayment.aggregate([
      {
        $match: {
          storeId: require('mongoose').Types.ObjectId.createFromHexString(storeId),
          status: 'completed',
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          totalRevenue: { $sum: '$billAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Build 0-23 hour map
    const hourMap: Record<number, { revenue: number; count: number }> = {};
    for (let h = 0; h < 24; h++) hourMap[h] = { revenue: 0, count: 0 };
    for (const row of hourlyData) {
      hourMap[row._id] = { revenue: row.totalRevenue, count: row.count };
    }

    const hours = Object.entries(hourMap).map(([h, d]) => ({ hour: Number(h), ...d }));
    const maxRevenue = Math.max(...hours.map((h) => h.revenue), 1);

    // Dead = below 20% of peak
    const deadHours = hours
      .filter((h) => h.hour >= 9 && h.hour <= 21) // business hours only
      .filter((h) => h.revenue < maxRevenue * 0.2)
      .map((h) => ({ hour: h.hour, label: `${h.hour % 12 || 12}${h.hour < 12 ? 'am' : 'pm'}` }));

    const peakHour = hours.reduce((a, b) => (a.revenue > b.revenue ? a : b));

    sendSuccess(res, {
      hours,
      deadHours,
      peakHour: {
        hour: peakHour.hour,
        label: `${peakHour.hour % 12 || 12}${peakHour.hour < 12 ? 'am' : 'pm'}`,
        revenue: peakHour.revenue,
      },
      suggestion:
        deadHours.length > 0
          ? `Your ${deadHours[0].label}–${deadHours[Math.min(1, deadHours.length - 1)].label} slot is underperforming. Create a flash deal to fill it.`
          : null,
    });
  }),
);

/**
 * GET /merchant/intelligence/empty-slots
 * Looks at tomorrow's appointment schedule and returns gaps > 30 min.
 */
router.get(
  '/empty-slots',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.query as { storeId?: string };
    if (!storeId) {
      sendError(res, 'storeId required', 400);
      return;
    }

    const { ServiceAppointment } = await import('../models/ServiceAppointment');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    const booked = await (ServiceAppointment as any)
      .find({
        store: require('mongoose').Types.ObjectId.createFromHexString(storeId),
        appointmentDate: dateStr,
        status: { $in: ['pending', 'confirmed', 'in_progress'] },
      })
      .select('appointmentTime duration')
      .lean();

    // Build occupied minutes set (9am–9pm)
    const occupied = new Set<number>();
    for (const appt of booked) {
      const [h, m] = (appt.appointmentTime || '09:00').split(':').map(Number);
      const startMin = h * 60 + m;
      const dur = appt.duration || 60;
      for (let i = startMin; i < startMin + dur; i += 30) occupied.add(i);
    }

    const emptySlots: { time: string; label: string }[] = [];
    for (let min = 9 * 60; min < 21 * 60; min += 30) {
      if (!occupied.has(min)) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        emptySlots.push({
          time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          label: `${h % 12 || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`,
        });
      }
    }

    const count = emptySlots.length;
    sendSuccess(res, {
      date: dateStr,
      emptySlots,
      emptyCount: count,
      suggestion:
        count >= 4
          ? `You have ${count} empty slots tomorrow. Share a flash deal to fill them.`
          : count > 0
            ? `${count} slot${count > 1 ? 's' : ''} available tomorrow.`
            : null,
    });
  }),
);

/**
 * GET /merchant/intelligence/network-stats
 * Returns REZ-network attribution: how many customers came via coin redemption,
 * cross-store referrals, QR checkins etc. over the past 30 days.
 */
router.get(
  '/network-stats',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.query as { storeId?: string };
    if (!storeId) {
      sendError(res, 'storeId required', 400);
      return;
    }

    const mongoose = require('mongoose');
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const storeObjId = mongoose.Types.ObjectId.createFromHexString(storeId);

    const { StorePayment } = await import('../models/StorePayment');

    // Customers who redeemed coins at this store (network-driven customers)
    const coinRedemptionStats = await StorePayment.aggregate([
      {
        $match: {
          storeId: storeObjId,
          status: 'completed',
          createdAt: { $gte: since },
          'coinRedemption.totalAmount': { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalVisits: { $sum: 1 },
          totalSpend: { $sum: '$billAmount' },
          coinsRedeemed: { $sum: '$coinRedemption.totalAmount' },
        },
      },
    ]);

    // Total unique customers in period
    const totalCustomers = await StorePayment.distinct('userId', {
      storeId: storeObjId,
      status: 'completed',
      createdAt: { $gte: since },
    });

    // New customers (first visit to this store)
    const newCustomers = await StorePayment.aggregate([
      { $match: { storeId: storeObjId, status: 'completed', createdAt: { $gte: since } } },
      { $group: { _id: '$userId', firstVisit: { $min: '$createdAt' } } },
      { $match: { firstVisit: { $gte: since } } },
    ]);

    const networkCustomers = coinRedemptionStats.length;
    const totalUniqueCustomers = totalCustomers.length;
    const networkRevenue = coinRedemptionStats.reduce((s: number, c: any) => s + c.totalSpend, 0);

    sendSuccess(res, {
      period: '30d',
      totalCustomers: totalUniqueCustomers,
      networkCustomers,
      newCustomers: newCustomers.length,
      networkRevenue: Math.round(networkRevenue),
      networkPct: totalUniqueCustomers > 0 ? Math.round((networkCustomers / totalUniqueCustomers) * 100) : 0,
      insight:
        networkCustomers > 0
          ? `${networkCustomers} customer${networkCustomers > 1 ? 's' : ''} came via REZ coins this month, spending ₹${Math.round(networkRevenue).toLocaleString('en-IN')}`
          : 'Start rewarding customers to grow your REZ network.',
    });
  }),
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function changePercent(current: number, last: number): number {
  if (last === 0) return 0;
  return Math.round(((current - last) / last) * 100);
}

function trend(pct: number): 'up' | 'down' | 'flat' {
  if (pct > 2) return 'up';
  if (pct < -2) return 'down';
  return 'flat';
}

/** Returns {start, end} for the first and last millisecond of a given month. */
function monthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// ---------------------------------------------------------------------------
// GET /merchant/intelligence/roi-hero
// ---------------------------------------------------------------------------

/**
 * Returns 4 KPI cards for the merchant morning dashboard:
 *   revenueViaRez, newCustomers, repeatRate, aov
 * Results are cached in Redis for 3 minutes.
 */
router.get(
  '/roi-hero',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.query as { storeId?: string };
    if (!storeId) {
      sendError(res, 'storeId required', 400);
      return;
    }

    // ---- Redis cache check ------------------------------------------------
    const cacheKey = `roi-hero:${storeId}`;
    try {
      const cached = await redisService.get<object>(cacheKey);
      if (cached) {
        sendSuccess(res, cached);
        return;
      }
    } catch (cacheErr) {
      log.warn('Redis get failed for roi-hero, proceeding without cache', cacheErr);
    }

    // ---- Date boundaries ---------------------------------------------------
    const now = new Date();
    const thisMonth = monthBounds(now);
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonth = monthBounds(lastMonthDate);

    const mongoose = require('mongoose');
    let storeObjId: any;
    try {
      storeObjId = mongoose.Types.ObjectId.createFromHexString(storeId);
    } catch {
      sendError(res, 'Invalid storeId format', 400);
      return;
    }

    const { Order } = await import('../models/Order');
    const { MerchantCustomerSnapshot } = await import('../models/MerchantCustomerSnapshot');

    const COMPLETED_STATUSES = ['completed', 'delivered', 'paid'];

    // ---- Run all 4 aggregations in parallel --------------------------------
    try {
      const [
        revenueThisRaw,
        revenueLastRaw,
        newCustThisRaw,
        newCustLastRaw,
        cashbackThisRaw,
        cashbackLastRaw,
        aovThisRaw,
        aovLastRaw,
        visitorsThisRaw,
        snapshotCountRaw,
      ] = await Promise.all([
        // 1a. Revenue via REZ — this month
        Order.aggregate([
          {
            $match: {
              storeId: storeObjId,
              status: { $in: COMPLETED_STATUSES },
              createdAt: { $gte: thisMonth.start, $lte: thisMonth.end },
            },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),

        // 1b. Revenue via REZ — last month
        Order.aggregate([
          {
            $match: {
              storeId: storeObjId,
              status: { $in: COMPLETED_STATUSES },
              createdAt: { $gte: lastMonth.start, $lte: lastMonth.end },
            },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),

        // 2a. New customers this month — users whose FIRST order at this store
        //     falls within this month
        Order.aggregate([
          {
            $match: {
              storeId: storeObjId,
              status: { $in: COMPLETED_STATUSES },
            },
          },
          { $group: { _id: '$userId', firstOrder: { $min: '$createdAt' } } },
          {
            $match: {
              firstOrder: { $gte: thisMonth.start, $lte: thisMonth.end },
            },
          },
          { $count: 'count' },
        ]),

        // 2b. New customers last month
        Order.aggregate([
          {
            $match: {
              storeId: storeObjId,
              status: { $in: COMPLETED_STATUSES },
            },
          },
          { $group: { _id: '$userId', firstOrder: { $min: '$createdAt' } } },
          {
            $match: {
              firstOrder: { $gte: lastMonth.start, $lte: lastMonth.end },
            },
          },
          { $count: 'count' },
        ]),

        // 2c. Total cashback paid to new customers this month (CAC proxy)
        Order.aggregate([
          {
            $match: {
              storeId: storeObjId,
              status: { $in: COMPLETED_STATUSES },
              createdAt: { $gte: thisMonth.start, $lte: thisMonth.end },
            },
          },
          // Keep only users whose first order is this month
          {
            $lookup: {
              from: 'orders',
              let: { uid: '$userId', sid: '$storeId' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$userId', '$$uid'] },
                        { $eq: ['$storeId', '$$sid'] },
                        { $in: ['$status', COMPLETED_STATUSES] },
                      ],
                    },
                  },
                },
                { $group: { _id: null, firstOrder: { $min: '$createdAt' } } },
              ],
              as: 'history',
            },
          },
          { $unwind: '$history' },
          {
            $match: {
              $expr: {
                $and: [
                  { $gte: ['$history.firstOrder', thisMonth.start] },
                  { $lte: ['$history.firstOrder', thisMonth.end] },
                ],
              },
            },
          },
          { $group: { _id: null, totalCashback: { $sum: '$cashbackAmount' } } },
        ]),

        // 2d. Cashback last month (used for trend only — we only compute CAC for this month)
        Order.aggregate([
          {
            $match: {
              storeId: storeObjId,
              status: { $in: COMPLETED_STATUSES },
              createdAt: { $gte: lastMonth.start, $lte: lastMonth.end },
            },
          },
          { $group: { _id: null, totalCashback: { $sum: '$cashbackAmount' } } },
        ]),

        // 3a. AOV — this month
        Order.aggregate([
          {
            $match: {
              storeId: storeObjId,
              status: { $in: COMPLETED_STATUSES },
              createdAt: { $gte: thisMonth.start, $lte: thisMonth.end },
            },
          },
          { $group: { _id: null, avg: { $avg: '$totalAmount' } } },
        ]),

        // 3b. AOV — last month
        Order.aggregate([
          {
            $match: {
              storeId: storeObjId,
              status: { $in: COMPLETED_STATUSES },
              createdAt: { $gte: lastMonth.start, $lte: lastMonth.end },
            },
          },
          { $group: { _id: null, avg: { $avg: '$totalAmount' } } },
        ]),

        // 4a. Unique visitors this month (for repeat-rate numerator)
        Order.aggregate([
          {
            $match: {
              storeId: storeObjId,
              status: { $in: COMPLETED_STATUSES },
              createdAt: { $gte: thisMonth.start, $lte: thisMonth.end },
            },
          },
          { $group: { _id: '$userId' } },
          { $count: 'count' },
        ]),

        // 4b. Snapshot count of returning customers (totalVisits > 1) at this store's merchant
        //     We use merchantId from a merchant lookup; storeId is used to find merchantId via Order.
        //     Simpler approach: count snapshots for users who visited this storeId AND have totalVisits > 1
        //     We pass storeId but MerchantCustomerSnapshot keys by merchantId.
        //     Use Order to get unique userId list this month, then check snapshot.totalVisits > 1.
        Order.aggregate([
          {
            $match: {
              storeId: storeObjId,
              status: { $in: COMPLETED_STATUSES },
              createdAt: { $gte: thisMonth.start, $lte: thisMonth.end },
            },
          },
          { $group: { _id: '$userId' } },
          {
            $lookup: {
              from: 'merchantcustomersnapshots',
              localField: '_id',
              foreignField: 'userId',
              as: 'snap',
            },
          },
          { $unwind: { path: '$snap', preserveNullAndEmptyArrays: true } },
          { $match: { 'snap.totalVisits': { $gt: 1 } } },
          { $count: 'count' },
        ]),
      ]);

      // ---- Extract scalar values ------------------------------------------

      const revThis = revenueThisRaw[0]?.total ?? 0;
      const revLast = revenueLastRaw[0]?.total ?? 0;

      const newCustThis = newCustThisRaw[0]?.count ?? 0;
      const newCustLast = newCustLastRaw[0]?.count ?? 0;
      const cashbackThis = cashbackThisRaw[0]?.totalCashback ?? 0;
      const cac = newCustThis > 0 ? Math.round(cashbackThis / newCustThis) : 0;

      const aovThis = Math.round(aovThisRaw[0]?.avg ?? 0);
      const aovLast = Math.round(aovLastRaw[0]?.avg ?? 0);

      const totalVisitorsThis = visitorsThisRaw[0]?.count ?? 0;
      const returningThis = snapshotCountRaw[0]?.count ?? 0;
      const repeatRateThis = totalVisitorsThis > 0 ? Math.round((returningThis / totalVisitorsThis) * 100) : 0;

      // Repeat rate last month — compute inline with a separate query
      // (keeps Promise.all clean above; this is a single lightweight aggregate)
      let repeatRateLast = 0;
      try {
        const [visitorsLastRaw, returningLastRaw] = await Promise.all([
          Order.aggregate([
            {
              $match: {
                storeId: storeObjId,
                status: { $in: COMPLETED_STATUSES },
                createdAt: { $gte: lastMonth.start, $lte: lastMonth.end },
              },
            },
            { $group: { _id: '$userId' } },
            { $count: 'count' },
          ]),
          Order.aggregate([
            {
              $match: {
                storeId: storeObjId,
                status: { $in: COMPLETED_STATUSES },
                createdAt: { $gte: lastMonth.start, $lte: lastMonth.end },
              },
            },
            { $group: { _id: '$userId' } },
            {
              $lookup: {
                from: 'merchantcustomersnapshots',
                localField: '_id',
                foreignField: 'userId',
                as: 'snap',
              },
            },
            { $unwind: { path: '$snap', preserveNullAndEmptyArrays: true } },
            { $match: { 'snap.totalVisits': { $gt: 1 } } },
            { $count: 'count' },
          ]),
        ]);

        const totalVisitorsLast = visitorsLastRaw[0]?.count ?? 0;
        const returningLast = returningLastRaw[0]?.count ?? 0;
        repeatRateLast = totalVisitorsLast > 0 ? Math.round((returningLast / totalVisitorsLast) * 100) : 0;
      } catch (repeatErr) {
        log.error('Failed to compute last-month repeat rate', repeatErr);
      }

      // ---- Build response --------------------------------------------------

      const revPct = changePercent(revThis, revLast);
      const newCustPct = changePercent(newCustThis, newCustLast);
      const repeatPct = repeatRateThis - repeatRateLast; // percentage-point change
      const aovPct = changePercent(aovThis, aovLast);

      const payload = {
        revenueViaRez: {
          thisMonthPaise: Math.round(revThis),
          lastMonthPaise: Math.round(revLast),
          changePercent: revPct,
          trend: trend(revPct),
        },
        newCustomers: {
          thisMonth: newCustThis,
          lastMonth: newCustLast,
          changePercent: newCustPct,
          costPerAcquisitionPaise: cac,
          trend: trend(newCustPct),
        },
        repeatRate: {
          thisMonth: repeatRateThis,
          lastMonth: repeatRateLast,
          changePercent: repeatPct,
          trend: trend(repeatPct),
        },
        aov: {
          thisMonthPaise: aovThis,
          lastMonthPaise: aovLast,
          changePercent: aovPct,
          trend: trend(aovPct),
        },
        computedAt: new Date().toISOString(),
      };

      // ---- Cache for 3 minutes (180 s) ------------------------------------
      try {
        await redisService.set(cacheKey, payload, 180);
      } catch (cacheWriteErr) {
        log.warn('Redis set failed for roi-hero', cacheWriteErr);
      }

      sendSuccess(res, payload);
    } catch (err) {
      log.error('roi-hero aggregation failed', err, { storeId });
      sendError(res, 'Failed to compute ROI metrics', 500);
    }
  }),
);

// ---------------------------------------------------------------------------
// GET /merchant/intelligence/action-center
// AI growth advisor — generates prioritized, data-driven action suggestions
// from the merchant's real data. Cached for 15 minutes.
// ---------------------------------------------------------------------------

interface ActionItem {
  id: string;
  priority: 'critical' | 'high' | 'medium';
  category: 'retention' | 'revenue' | 'aov' | 'traffic';
  icon: string;
  title: string;
  description: string;
  impact: string;
  ctaLabel: string;
  ctaAction: string;
  data: Record<string, any>;
}

const PRIORITY_ORDER: Record<ActionItem['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

router.get(
  '/action-center',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.query as { storeId?: string };
    if (!storeId) {
      sendError(res, 'storeId required', 400);
      return;
    }

    const cacheKey = `action-center:${storeId}`;
    try {
      const cached = await redisService.get<object>(cacheKey);
      if (cached) {
        sendSuccess(res, cached);
        return;
      }
    } catch (cacheErr) {
      log.warn('Redis get failed for action-center, proceeding without cache', cacheErr);
    }

    const mongoose = require('mongoose');
    let storeObjId: any;
    try {
      storeObjId = mongoose.Types.ObjectId.createFromHexString(storeId);
    } catch {
      sendError(res, 'Invalid storeId format', 400);
      return;
    }

    const now = new Date();
    const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const { MerchantCustomerSnapshot } = await import('../models/MerchantCustomerSnapshot');
    const { StorePayment } = await import('../models/StorePayment');
    const { Order } = await import('../models/Order');
    const Offer = (await import('../models/Offer')).default;

    // -------------------------------------------------------------------------
    // Run all 6 checks in parallel
    // -------------------------------------------------------------------------
    const [churnResult, deadHoursResult, aovResult, highValueResult, weekendResult, activeOfferResult] =
      await Promise.allSettled([
        // 1. Churn risk: snapshots with daysSinceLastVisit 7–14
        (async () => {
          // MerchantCustomerSnapshot stores merchantId, not storeId directly.
          // We resolve merchantId via the merchant auth context is not accessible here,
          // so we match on storeId stored in snapshots if available, or fall back to
          // querying all snapshots where userId has visited this store via StorePayment.
          // Strategy: find unique userId list from StorePayment for this store, then
          // check snapshots for those users.
          const recentUserIds = await StorePayment.distinct('userId', {
            storeId: storeObjId,
            status: 'completed',
          });

          const churnCount = await MerchantCustomerSnapshot.countDocuments({
            userId: { $in: recentUserIds },
            daysSinceLastVisit: { $gte: 7, $lte: 14 },
          });

          const avgSpendRaw = await MerchantCustomerSnapshot.aggregate([
            { $match: { userId: { $in: recentUserIds } } },
            { $group: { _id: null, avg: { $avg: '$totalSpend' } } },
          ]);
          const avgSpend = Math.round(avgSpendRaw[0]?.avg ?? 0);

          return { churnCount, avgSpend };
        })(),

        // 2. Dead hours: same StorePayment hourly logic as /dead-hours
        (async () => {
          const hourlyData = await StorePayment.aggregate([
            {
              $match: {
                storeId: storeObjId,
                status: 'completed',
                createdAt: { $gte: since30d },
              },
            },
            {
              $group: {
                _id: { $hour: '$createdAt' },
                totalRevenue: { $sum: '$billAmount' },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
          ]);

          const hourMap: Record<number, number> = {};
          for (let h = 0; h < 24; h++) hourMap[h] = 0;
          for (const row of hourlyData) hourMap[row._id] = row.totalRevenue;

          const revenues = Object.values(hourMap);
          const maxRevenue = Math.max(...revenues, 1);

          const deadHours = Object.entries(hourMap)
            .filter(([h]) => Number(h) >= 9 && Number(h) <= 21)
            .filter(([, rev]) => rev < maxRevenue * 0.2)
            .map(([h]) => Number(h))
            .sort((a, b) => a - b);

          return { deadHours };
        })(),

        // 3. AOV opportunity: this month vs last month
        (async () => {
          const COMPLETED = ['completed', 'delivered', 'paid'];
          const [thisMonthRaw, lastMonthRaw] = await Promise.all([
            Order.aggregate([
              {
                $match: {
                  storeId: storeObjId,
                  status: { $in: COMPLETED },
                  createdAt: { $gte: thisMonthStart },
                },
              },
              { $group: { _id: null, avg: { $avg: '$totalAmount' } } },
            ]),
            Order.aggregate([
              {
                $match: {
                  storeId: storeObjId,
                  status: { $in: COMPLETED },
                  createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
                },
              },
              { $group: { _id: null, avg: { $avg: '$totalAmount' } } },
            ]),
          ]);
          const aovThis = Math.round(thisMonthRaw[0]?.avg ?? 0);
          const aovLast = Math.round(lastMonthRaw[0]?.avg ?? 0);
          return { aovThis, aovLast };
        })(),

        // 4. High-value customers with no recent engagement
        (async () => {
          const recentUserIds = await StorePayment.distinct('userId', {
            storeId: storeObjId,
            status: 'completed',
          });

          const vipCount = await MerchantCustomerSnapshot.countDocuments({
            userId: { $in: recentUserIds },
            isHighValue: true,
            totalSpend: { $gte: 5000 },
          });

          return { vipCount };
        })(),

        // 5. Weekend vs weekday revenue comparison
        (async () => {
          const dailyData = await StorePayment.aggregate([
            {
              $match: {
                storeId: storeObjId,
                status: 'completed',
                createdAt: { $gte: since30d },
              },
            },
            {
              $group: {
                _id: { $dayOfWeek: '$createdAt' }, // 1=Sun, 2=Mon, ..., 7=Sat
                totalRevenue: { $sum: '$billAmount' },
                days: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
              },
            },
          ]);

          // dayOfWeek: 1=Sun, 7=Sat are weekend; 2-6 are weekday
          let weekendRevenue = 0;
          let weekdayRevenue = 0;
          let weekdayDayCount = 0;
          let weekendDayCount = 0;

          for (const row of dailyData) {
            const dow = row._id; // 1–7
            const uniqueDays = new Set(row.days).size;
            if (dow === 1 || dow === 7) {
              weekendRevenue += row.totalRevenue;
              weekendDayCount += uniqueDays;
            } else {
              weekendRevenue += 0;
              weekdayRevenue += row.totalRevenue;
              weekdayDayCount += uniqueDays;
            }
          }

          const weekendDailyAvg = weekendDayCount > 0 ? weekendRevenue / weekendDayCount : 0;
          const weekdayDailyAvg = weekdayDayCount > 0 ? weekdayRevenue / weekdayDayCount : 0;

          return { weekendDailyAvg, weekdayDailyAvg, weekendRevenue, weekdayRevenue };
        })(),

        // 6. No active offer check
        (async () => {
          const activeOfferCount = await Offer.countDocuments({
            'store.id': storeObjId,
            'validity.isActive': true,
            'validity.endDate': { $gt: now },
          });
          return { activeOfferCount };
        })(),
      ]);

    // -------------------------------------------------------------------------
    // Build actions list from settled results
    // -------------------------------------------------------------------------
    const actions: ActionItem[] = [];

    // 1. Churn risk
    if (churnResult.status === 'fulfilled') {
      const { churnCount, avgSpend } = churnResult.value;
      if (churnCount > 0) {
        actions.push({
          id: 'win-back-inactive',
          priority: 'critical',
          category: 'retention',
          icon: 'people-outline',
          title: `${churnCount} customer${churnCount > 1 ? 's' : ''} haven't visited in 7+ days`,
          description: `Send a targeted win-back offer before they become fully lapsed. You have a short window.`,
          impact: `Each recovered customer = ₹${avgSpend.toLocaleString('en-IN')} revenue`,
          ctaLabel: 'Send Win-Back Campaign',
          ctaAction: 'create_broadcast',
          data: { segment: 'lapsed', count: churnCount, avgSpend },
        });
      }
    } else {
      log.warn('action-center: churn check failed', churnResult.reason);
    }

    // 6. No active offer (check early so critical actions group together)
    if (activeOfferResult.status === 'fulfilled') {
      const { activeOfferCount } = activeOfferResult.value;
      if (activeOfferCount === 0) {
        actions.push({
          id: 'no-active-offer',
          priority: 'critical',
          category: 'revenue',
          icon: 'pricetag-outline',
          title: 'You have no active offer',
          description: 'Customers have no incentive to choose you over a competitor right now.',
          impact: 'Stores with active offers see 2–3x more walk-ins',
          ctaLabel: 'Create an Offer',
          ctaAction: 'create_offer',
          data: { suggestedType: 'general' },
        });
      }
    } else {
      log.warn('action-center: active offer check failed', activeOfferResult.reason);
    }

    // 2. Dead hours
    if (deadHoursResult.status === 'fulfilled') {
      const { deadHours } = deadHoursResult.value;
      if (deadHours.length >= 2) {
        const fmt = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`;
        const startLabel = fmt(deadHours[0]);
        const endLabel = fmt(deadHours[deadHours.length - 1] + 1);
        actions.push({
          id: 'dead-hours-boost',
          priority: 'high',
          category: 'traffic',
          icon: 'time-outline',
          title: `Your ${startLabel}–${endLabel} slot is underperforming`,
          description: `${deadHours.length} hours in this window generate less than 20% of your peak revenue. A flash deal could fill them.`,
          impact: `Filling dead hours could add 15–25% to daily revenue`,
          ctaLabel: 'Create a Time-Boost Deal',
          ctaAction: 'create_offer',
          data: { suggestedType: 'time_boost', deadHours, startLabel, endLabel },
        });
      }
    } else {
      log.warn('action-center: dead hours check failed', deadHoursResult.reason);
    }

    // 3. AOV opportunity
    if (aovResult.status === 'fulfilled') {
      const { aovThis, aovLast } = aovResult.value;
      if (aovLast > 0 && aovThis < aovLast) {
        const diff = aovLast - aovThis;
        actions.push({
          id: 'aov-drop',
          priority: 'high',
          category: 'aov',
          icon: 'trending-down-outline',
          title: `Average order value dropped ₹${diff.toLocaleString('en-IN')} vs last month`,
          description: `This month's AOV is ₹${aovThis.toLocaleString('en-IN')} vs ₹${aovLast.toLocaleString('en-IN')} last month. A threshold reward can nudge customers to spend more.`,
          impact: `Recovering AOV to last month's level could add ₹${(diff * 20).toLocaleString('en-IN')}+ this month`,
          ctaLabel: 'Create Threshold Reward',
          ctaAction: 'create_offer',
          data: { suggestedType: 'threshold_reward', aovThis, aovLast, dropAmount: diff },
        });
      }
    } else {
      log.warn('action-center: AOV check failed', aovResult.reason);
    }

    // 4. High-value customer recognition
    if (highValueResult.status === 'fulfilled') {
      const { vipCount } = highValueResult.value;
      if (vipCount > 3) {
        actions.push({
          id: 'vip-recognition',
          priority: 'medium',
          category: 'retention',
          icon: 'star-outline',
          title: `${vipCount} VIP customers deserve special treatment`,
          description: `These customers have spent ₹5,000+ but have no exclusive reward. Recognise them before a competitor does.`,
          impact: `VIP rewards can increase their spend frequency by 30–40%`,
          ctaLabel: 'Create VIP Reward',
          ctaAction: 'create_offer',
          data: { suggestedType: 'vip_reward', segment: 'high_value', count: vipCount },
        });
      }
    } else {
      log.warn('action-center: high-value check failed', highValueResult.reason);
    }

    // 5. Weekend boost / slow weekend
    if (weekendResult.status === 'fulfilled') {
      const { weekendDailyAvg, weekdayDailyAvg } = weekendResult.value;
      if (weekdayDailyAvg > 0) {
        if (weekendDailyAvg > weekdayDailyAvg * 1.3) {
          actions.push({
            id: 'weekend-amplify',
            priority: 'medium',
            category: 'revenue',
            icon: 'rocket-outline',
            title: 'Weekends are strong — amplify them',
            description: `Weekend daily revenue is ${Math.round((weekendDailyAvg / weekdayDailyAvg - 1) * 100)}% higher than weekdays. Capitalise with a weekend-only exclusive.`,
            impact: `A weekend offer could push revenue another 15–20% on your best days`,
            ctaLabel: 'Create Weekend Offer',
            ctaAction: 'create_offer',
            data: {
              suggestedType: 'weekend_boost',
              weekendDailyAvg: Math.round(weekendDailyAvg),
              weekdayDailyAvg: Math.round(weekdayDailyAvg),
            },
          });
        } else if (weekendDailyAvg < weekdayDailyAvg * 0.7) {
          actions.push({
            id: 'weekend-slow',
            priority: 'medium',
            category: 'traffic',
            icon: 'calendar-outline',
            title: 'Weekends are slow — create a weekend deal',
            description: `Weekend daily revenue is only ${Math.round((weekendDailyAvg / weekdayDailyAvg) * 100)}% of your weekday average. Draw customers in on your quiet days.`,
            impact: `Closing the gap could add ₹${Math.round((weekdayDailyAvg - weekendDailyAvg) * 8).toLocaleString('en-IN')}+ per month`,
            ctaLabel: 'Create Weekend Deal',
            ctaAction: 'create_offer',
            data: {
              suggestedType: 'weekend_deal',
              weekendDailyAvg: Math.round(weekendDailyAvg),
              weekdayDailyAvg: Math.round(weekdayDailyAvg),
            },
          });
        }
      }
    } else {
      log.warn('action-center: weekend check failed', weekendResult.reason);
    }

    // Sort: critical → high → medium, then by estimated impact (title order is stable enough)
    actions.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    const payload = {
      actions,
      generatedAt: now.toISOString(),
    };

    try {
      await redisService.set(cacheKey, payload, 900); // 15 minutes
    } catch (cacheWriteErr) {
      log.warn('Redis set failed for action-center', cacheWriteErr);
    }

    sendSuccess(res, payload);
  }),
);

export default router;
