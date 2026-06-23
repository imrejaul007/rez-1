/**
 * Merchant ROI — unified "₹ spent vs ₹ earned" aggregator (Phase G).
 *
 * What it answers
 * ───────────────
 * For a given merchant + time window, returns a single report the
 * dashboard can render as "You spent ₹X on REZ, earned ₹Y attributable
 * to REZ, net lift ₹Z (ROI multiple N×)".
 *
 *   SPENT = subscriptionFees + coinRedemptionValue + broadcastCosts
 *   EARNED = totalGMV + newCustomerGMV (surfaced separately)
 *   NET_LIFT = totalGMV − SPENT
 *   ROI_MULTIPLE = totalGMV / max(SPENT, 1)
 *
 * Data sources
 * ────────────
 *   - Subscription (payments.amount) — subscription fees in window
 *   - StorePayment.coinRedemption.amount — coin-liability ₹ the merchant
 *     absorbed when a customer paid with REZ coins
 *   - BroadcastCampaign.stats.sent — messages dispatched × per-channel
 *     cost estimate (see PER_MSG_COST)
 *   - StorePayment.billAmount — total merchant GMV on the platform
 *
 * Honesty note
 * ────────────
 * `broadcastCosts` is an ESTIMATE at ₹0.15/msg (Indian WhatsApp
 * business marketing messaging utility rate). Once we wire actual
 * BSP per-message billing, swap this line for the real spend. The
 * `isEstimate` flag on the response lets the UI label estimates.
 *
 * Every aggregation is bounded by (merchantId, createdAt in window)
 * so the query planner uses the existing merchantId indexes.
 */

import type { Types } from 'mongoose';

import { Merchant } from '../../models/Merchant';
import { MerchantPlan } from '../../models/MerchantPlan';
import { StorePayment } from '../../models/StorePayment';
import { BroadcastCampaign } from '../../models/BroadcastCampaign';
import { logger } from '../../config/logger';

/** ₹/message estimate for WhatsApp broadcast cost. Production: wire the
 *  actual BSP billing feed + remove isEstimate flag. */
export const PER_MSG_COST = 0.15;

export type RoiMode = 'off' | 'shadow' | 'primary';

export function getRoiMode(): RoiMode {
  const raw = (process.env.MERCHANT_ROI_MODE ?? '').toLowerCase();
  if (raw === 'shadow' || raw === 'primary') return raw;
  return 'off';
}

export interface RoiWindow {
  from: Date;
  to: Date;
}

export interface RoiBreakdown {
  subscriptionFees: number;
  coinRedemptionValue: number;
  broadcastCosts: number;
}

export interface RoiEarnedBreakdown {
  totalGMV: number;
  /** Distinct customers who paid in the window. */
  uniqueCustomers: number;
  /** GMV from users whose first-ever payment to this merchant was in
   *  the window. */
  newCustomerGMV: number;
  /** totalGMV minus newCustomerGMV. */
  returningCustomerGMV: number;
}

export interface RoiReport {
  window: { from: string; to: string };
  spent: {
    total: number;
    breakdown: RoiBreakdown;
  };
  earned: {
    total: number; // mirrors earned.breakdown.totalGMV for convenient access
    breakdown: RoiEarnedBreakdown;
  };
  netLift: number;
  roiMultiple: number;
  /** True when the report contains at least one estimated number
   *  (currently broadcastCosts). UI should render a caveat. */
  isEstimate: boolean;
  computedAt: string;
}

// ─── Helpers (pure, unit-testable) ───────────────────────────────────────────

export function computeNetLift(totalEarned: number, totalSpent: number): number {
  return Math.round((totalEarned - totalSpent) * 100) / 100;
}

export function computeRoiMultiple(totalEarned: number, totalSpent: number): number {
  const spend = Math.max(totalSpent, 1);
  return Math.round((totalEarned / spend) * 100) / 100;
}

export function sumSpent(b: RoiBreakdown): number {
  return Math.round((b.subscriptionFees + b.coinRedemptionValue + b.broadcastCosts) * 100) / 100;
}

// ─── Mongo-level aggregations ────────────────────────────────────────────────

/**
 * Fractional months between two dates, inclusive. 30-day approximation
 * — good enough for "you paid 2.3 months of subscription" ROI copy.
 */
export function monthsInWindow(from: Date, to: Date): number {
  const ms = Math.max(0, to.getTime() - from.getTime());
  const months = ms / (30 * 24 * 3600 * 1000);
  return Math.round(months * 100) / 100;
}

/**
 * Estimated subscription fees = merchant's currentPlan monthlyPrice ×
 * months in the window. This is a best-effort estimate — the merchant
 * may have upgraded / downgraded mid-window, and an actual billing
 * ledger would be more accurate. The report flags `isEstimate:true`
 * whenever this (or broadcastCosts) contributes.
 */
export async function aggregateSubscriptionFees(
  merchantId: Types.ObjectId | string,
  window: RoiWindow,
): Promise<number> {
  try {
    const merchant: any = await Merchant.findById(merchantId).select('currentPlan').lean();
    const planName: string = merchant?.currentPlan || 'starter';
    const plan: any = await MerchantPlan.findOne({ plan: planName }).select('monthlyPrice').lean();
    const monthlyPrice: number = plan?.monthlyPrice ?? 0;
    const months = monthsInWindow(window.from, window.to);
    return Math.round(monthlyPrice * months * 100) / 100;
  } catch (err) {
    logger.warn('[roi] aggregateSubscriptionFees failed — returning 0', {
      merchantId: String(merchantId),
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/**
 * Sum StorePayment.coinRedemption.amount for completed payments where
 * merchantId is this merchant + createdAt in window. This is the ₹
 * liability the merchant absorbed when customers paid with coins.
 */
export async function aggregateCoinRedemptionValue(
  merchantId: Types.ObjectId | string,
  window: RoiWindow,
): Promise<number> {
  try {
    const result: { total: number }[] = await (StorePayment as any).aggregate([
      {
        $match: {
          merchantId,
          status: 'completed',
          createdAt: { $gte: window.from, $lte: window.to },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$coinRedemption.amount', 0] } },
        },
      },
    ]);
    return result[0]?.total ?? 0;
  } catch (err) {
    logger.warn('[roi] aggregateCoinRedemptionValue failed — returning 0', {
      merchantId: String(merchantId),
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/**
 * Estimated broadcast cost = sum of stats.sent for BroadcastCampaigns
 * created by this merchant in the window × PER_MSG_COST.
 *
 * This is an estimate — production should switch to actual BSP billing.
 */
export async function aggregateBroadcastCosts(
  merchantId: Types.ObjectId | string,
  window: RoiWindow,
): Promise<number> {
  try {
    const result: { totalSent: number }[] = await (BroadcastCampaign as any).aggregate([
      {
        $match: {
          merchantId,
          createdAt: { $gte: window.from, $lte: window.to },
        },
      },
      { $group: { _id: null, totalSent: { $sum: { $ifNull: ['$stats.sent', 0] } } } },
    ]);
    const sent = result[0]?.totalSent ?? 0;
    return Math.round(sent * PER_MSG_COST * 100) / 100;
  } catch (err) {
    logger.warn('[roi] aggregateBroadcastCosts failed — returning 0', {
      merchantId: String(merchantId),
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

/**
 * Earned side: totalGMV + unique customers + new-customer GMV.
 *
 * "New customer" here means "first-ever completed StorePayment to
 * THIS merchant happened in the window". We look up the min
 * createdAt per userId over the full history, then compare to the
 * window start.
 */
export async function aggregateEarned(
  merchantId: Types.ObjectId | string,
  window: RoiWindow,
): Promise<RoiEarnedBreakdown> {
  try {
    const windowResult: { total: number; uniqueCustomers: number; users: Types.ObjectId[] }[] =
      await (StorePayment as any).aggregate([
        {
          $match: {
            merchantId,
            status: 'completed',
            createdAt: { $gte: window.from, $lte: window.to },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$billAmount', 0] } },
            uniqueCustomers: { $addToSet: '$userId' },
          },
        },
        {
          $project: {
            _id: 0,
            total: 1,
            uniqueCustomers: { $size: '$uniqueCustomers' },
            users: '$uniqueCustomers',
          },
        },
      ]);

    const totalGMV = windowResult[0]?.total ?? 0;
    const uniqueCustomers = windowResult[0]?.uniqueCustomers ?? 0;
    const windowUserIds = windowResult[0]?.users ?? [];

    if (windowUserIds.length === 0) {
      return {
        totalGMV: 0,
        uniqueCustomers: 0,
        newCustomerGMV: 0,
        returningCustomerGMV: 0,
      };
    }

    // For the users who paid in the window, find those whose EARLIEST
    // completed payment to this merchant is inside the window.
    const firstPaymentDates: { _id: Types.ObjectId; firstAt: Date }[] =
      await (StorePayment as any).aggregate([
        {
          $match: {
            merchantId,
            status: 'completed',
            userId: { $in: windowUserIds },
          },
        },
        { $group: { _id: '$userId', firstAt: { $min: '$createdAt' } } },
      ]);

    const newUserIds = new Set(
      firstPaymentDates
        .filter((r) => r.firstAt >= window.from && r.firstAt <= window.to)
        .map((r) => String(r._id)),
    );

    const newCustomerGMVRes: { total: number }[] = newUserIds.size
      ? await (StorePayment as any).aggregate([
          {
            $match: {
              merchantId,
              status: 'completed',
              createdAt: { $gte: window.from, $lte: window.to },
              userId: { $in: Array.from(newUserIds) },
            },
          },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$billAmount', 0] } } } },
        ])
      : [{ total: 0 }];

    const newCustomerGMV = newCustomerGMVRes[0]?.total ?? 0;
    const returningCustomerGMV = Math.max(0, totalGMV - newCustomerGMV);

    return {
      totalGMV,
      uniqueCustomers,
      newCustomerGMV,
      returningCustomerGMV,
    };
  } catch (err) {
    logger.warn('[roi] aggregateEarned failed — returning zeros', {
      merchantId: String(merchantId),
      error: err instanceof Error ? err.message : String(err),
    });
    return { totalGMV: 0, uniqueCustomers: 0, newCustomerGMV: 0, returningCustomerGMV: 0 };
  }
}

// ─── Top-level orchestrator ──────────────────────────────────────────────────

/**
 * Compute the full ROI report for a merchant + window. Runs the 4
 * aggregations in parallel; each is defensive and returns 0 on error
 * so the whole report never throws.
 */
export async function computeRoiReport(
  merchantId: Types.ObjectId | string,
  window: RoiWindow,
): Promise<RoiReport> {
  const [subscriptionFees, coinRedemptionValue, broadcastCosts, earned] = await Promise.all([
    aggregateSubscriptionFees(merchantId, window),
    aggregateCoinRedemptionValue(merchantId, window),
    aggregateBroadcastCosts(merchantId, window),
    aggregateEarned(merchantId, window),
  ]);

  const spentBreakdown: RoiBreakdown = {
    subscriptionFees,
    coinRedemptionValue,
    broadcastCosts,
  };
  const totalSpent = sumSpent(spentBreakdown);
  const netLift = computeNetLift(earned.totalGMV, totalSpent);
  const roiMultiple = computeRoiMultiple(earned.totalGMV, totalSpent);

  return {
    window: { from: window.from.toISOString(), to: window.to.toISOString() },
    spent: { total: totalSpent, breakdown: spentBreakdown },
    earned: { total: earned.totalGMV, breakdown: earned },
    netLift,
    roiMultiple,
    // Both subscriptionFees (plan × months) and broadcastCosts
    // (messages × estimated rate) are estimates today.
    isEstimate: subscriptionFees > 0 || broadcastCosts > 0,
    computedAt: new Date().toISOString(),
  };
}
