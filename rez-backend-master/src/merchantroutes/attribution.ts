/**
 * merchantroutes/attribution.ts
 *
 * Merchant-facing REZ attribution summary endpoint.
 * GET /merchant/attribution/summary?storeId=X&period=30d
 *
 * Returns revenue, customers, repeat visits, slots filled, coins issued,
 * and ROI driven by REZ network participation.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/merchantauth';
import { StorePayment } from '../models/StorePayment';
import { Store } from '../models/Store';
import { logger } from '../config/logger';

const router = Router();

router.use(authMiddleware);

// Parse "30d", "7d", "90d" into days; default 30
function parsePeriodDays(period: string | undefined): number {
  if (!period) return 30;
  const match = period.match(/^(\d+)d$/i);
  if (match) return Math.min(parseInt(match[1], 10), 365);
  return 30;
}

/**
 * GET /merchant/attribution/summary
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantId as string | undefined;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { storeId, period } = req.query as Record<string, string | undefined>;
    const periodDays = parsePeriodDays(period);
    const periodLabel = `${periodDays}d`;

    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 3600 * 1000);

    // Resolve storeId — must belong to this merchant
    let resolvedStoreId: string;
    if (storeId) {
      const store = await (Store as any).findOne({ _id: storeId, merchantId }).lean();
      if (!store) {
        return res.status(403).json({
          success: false,
          message: 'Store not found or access denied',
        });
      }
      resolvedStoreId = storeId;
    } else {
      const store = await (Store as any).findOne({ merchantId }).lean();
      if (!store) {
        return res.status(404).json({ success: false, message: 'Store not found' });
      }
      resolvedStoreId = store._id.toString();
    }

    // ── 1. REZ-attributed payments: coinRedemption.totalAmount > 0 OR rewards.coinsEarned > 0 ──
    const rezPaymentsAgg = await (StorePayment as any).aggregate([
      {
        $match: {
          storeId: { $eq: new mongoose.Types.ObjectId(resolvedStoreId) },
          status: 'completed',
          createdAt: { $gte: periodStart, $lte: now },
          $or: [{ 'coinRedemption.totalAmount': { $gt: 0 } }, { 'rewards.coinsEarned': { $gt: 0 } }],
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$billAmount' },
          uniqueUsers: { $addToSet: '$userId' },
          totalCoinsEarned: { $sum: '$rewards.coinsEarned' },
        },
      },
    ]);

    const rezRevenue: number = rezPaymentsAgg[0]?.totalRevenue ?? 0;
    const rezCustomers: number = rezPaymentsAgg[0]?.uniqueUsers?.length ?? 0;
    const totalCoinsEarned: number = rezPaymentsAgg[0]?.totalCoinsEarned ?? 0;
    const coinsIssuedValue = Math.round(totalCoinsEarned * 0.1 * 100) / 100; // 1 coin = ₹0.10

    // ── 2. Repeat visits driven: userId paid in this period AND also paid 15–60 days before period ──
    const allPeriodPayments = await (StorePayment as any)
      .find({
        storeId: resolvedStoreId,
        status: 'completed',
        createdAt: { $gte: periodStart, $lte: now },
      })
      .select('userId createdAt')
      .lean();

    const userIdSet = [...new Set(allPeriodPayments.map((p: any) => p.userId?.toString()).filter(Boolean))];

    let repeatVisitsDriven = 0;
    if (userIdSet.length > 0) {
      const priorWindowStart = new Date(periodStart.getTime() - 60 * 24 * 3600 * 1000);
      const priorWindowEnd = new Date(periodStart.getTime() - 15 * 24 * 3600 * 1000);
      const priorPayments = await (StorePayment as any)
        .find({
          storeId: resolvedStoreId,
          status: 'completed',
          userId: { $in: userIdSet },
          createdAt: { $gte: priorWindowStart, $lte: priorWindowEnd },
        })
        .select('userId')
        .lean();
      const priorUserIds = new Set(priorPayments.map((p: any) => p.userId?.toString()));
      repeatVisitsDriven = userIdSet.filter((id) => priorUserIds.has(id)).length;
    }

    // ── 3. Slots filled: payments in period on weekday mornings (9am–12pm) ──
    // Approximation: these slots tend to be empty without demand intelligence
    const slotsFilled = allPeriodPayments.filter((p: any) => {
      const d = new Date(p.createdAt);
      const day = d.getDay(); // 0=Sun, 6=Sat
      const hour = d.getHours();
      return day >= 1 && day <= 5 && hour >= 9 && hour < 12;
    }).length;

    // ── 4. ROI calculation ──
    const roi =
      coinsIssuedValue > 0 ? `₹${(rezRevenue / coinsIssuedValue).toFixed(2)} earned per ₹1 spent on REZ` : 'N/A';

    return res.json({
      success: true,
      period: periodLabel,
      rezRevenue,
      rezCustomers,
      repeatVisitsDriven,
      slotsFilled,
      coinsIssuedValue,
      roi,
    });
  } catch (err) {
    logger.error('[AttributionRoutes] /summary error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
