/**
 * Growth Score — Phase H compute service.
 *
 * Takes (merchantId, now) and returns a 0-100 score + 4 sub-scores,
 * each derived from a separate Mongo aggregation. The sub-scoring
 * functions are pure so they're individually unit-testable; only the
 * orchestrator talks to the DB.
 *
 * Weights (encode priority):
 *   40%  gmvGrowth       — growing faster = stronger business
 *   20%  newCustomerPct  — acquisition engine health
 *   30%  retention       — keep-rate, dominant for mature merchants
 *   10%  campaignCadence — are they using the platform's tools
 *
 * All sub-scores are clamped to 0..100 before weighting.
 */

import type { Types } from 'mongoose';

import { StorePayment } from '../../models/StorePayment';
import { BroadcastCampaign } from '../../models/BroadcastCampaign';
import MerchantCustomerSnapshot from '../../models/MerchantCustomerSnapshot';
import { logger } from '../../config/logger';

export type GrowthScoreMode = 'off' | 'shadow' | 'primary';

export const ENGINE_VERSION = 1;

export const WEIGHTS = {
  gmvGrowth: 0.4,
  newCustomerPct: 0.2,
  retention: 0.3,
  campaignCadence: 0.1,
} as const;

export const WINDOW_DAYS = 30;

export function getGrowthScoreMode(): GrowthScoreMode {
  const raw = (process.env.GROWTH_SCORE_MODE ?? '').toLowerCase();
  if (raw === 'shadow' || raw === 'primary') return raw;
  return 'off';
}

export interface GrowthScoreBreakdown {
  gmvGrowth: number;
  newCustomerPct: number;
  retention: number;
  campaignCadence: number;
}

export interface GrowthScoreResult {
  total: number;
  breakdown: GrowthScoreBreakdown;
}

// ─── Pure sub-scorers ────────────────────────────────────────────────────────

export function clamp01_100(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 100) return 100;
  return Math.round(x);
}

/** Current vs previous GMV → 0-100. 0% = 50, +50% or more = 100, -50% or less = 0. */
export function scoreGmvGrowth(currentGMV: number, previousGMV: number): number {
  if (previousGMV <= 0 && currentGMV <= 0) return 0;
  if (previousGMV <= 0) return 100; // going from 0 to any > 0 is huge
  const growth = (currentGMV - previousGMV) / previousGMV; // e.g. 0.25 = +25%
  // Map growth ∈ [-0.5, 0.5] linearly to [0, 100].
  return clamp01_100(50 + growth * 100);
}

/** % of GMV from new-lifecycle customers → 0-100. 0% = 0, 40%+ = 100. */
export function scoreNewCustomerPct(pct: number): number {
  // Cap at 40% — beyond that, the business is churning loyalty too fast.
  return clamp01_100((pct / 40) * 100);
}

/** Retention = alive customers / all tracked. 0 = 0, 0.7+ = 100. */
export function scoreRetention(aliveCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  const ratio = aliveCount / totalCount;
  // 70% retention = 100 score; linear below.
  return clamp01_100((ratio / 0.7) * 100);
}

/** Campaigns launched per 30-day window. 0 = 0, 4+ per month = 100. */
export function scoreCampaignCadence(campaigns30d: number): number {
  return clamp01_100((campaigns30d / 4) * 100);
}

export function composite(breakdown: GrowthScoreBreakdown): number {
  const weighted =
    breakdown.gmvGrowth * WEIGHTS.gmvGrowth +
    breakdown.newCustomerPct * WEIGHTS.newCustomerPct +
    breakdown.retention * WEIGHTS.retention +
    breakdown.campaignCadence * WEIGHTS.campaignCadence;
  return clamp01_100(weighted);
}

// ─── DB-facing aggregations ──────────────────────────────────────────────────

async function sumGmv(
  merchantId: Types.ObjectId | string,
  from: Date,
  to: Date,
): Promise<number> {
  const rows: { total: number }[] = await (StorePayment as any).aggregate([
    {
      $match: {
        merchantId,
        status: 'completed',
        createdAt: { $gte: from, $lte: to },
      },
    },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$billAmount', 0] } } } },
  ]);
  return rows[0]?.total ?? 0;
}

async function sumNewCustomerGMV(
  merchantId: Types.ObjectId | string,
  from: Date,
  to: Date,
): Promise<{ totalGMV: number; newCustomerGMV: number }> {
  const windowRows: { total: number; users: Types.ObjectId[] }[] =
    await (StorePayment as any).aggregate([
      {
        $match: {
          merchantId,
          status: 'completed',
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$billAmount', 0] } },
          users: { $addToSet: '$userId' },
        },
      },
    ]);

  const totalGMV = windowRows[0]?.total ?? 0;
  const users = windowRows[0]?.users ?? [];

  if (users.length === 0) return { totalGMV: 0, newCustomerGMV: 0 };

  const firstPayments: { _id: Types.ObjectId; firstAt: Date }[] =
    await (StorePayment as any).aggregate([
      {
        $match: {
          merchantId,
          status: 'completed',
          userId: { $in: users },
        },
      },
      { $group: { _id: '$userId', firstAt: { $min: '$createdAt' } } },
    ]);

  const newUserIds = firstPayments
    .filter((r) => r.firstAt >= from && r.firstAt <= to)
    .map((r) => r._id);

  if (newUserIds.length === 0) return { totalGMV, newCustomerGMV: 0 };

  const newGmvRows: { total: number }[] = await (StorePayment as any).aggregate([
    {
      $match: {
        merchantId,
        status: 'completed',
        createdAt: { $gte: from, $lte: to },
        userId: { $in: newUserIds },
      },
    },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$billAmount', 0] } } } },
  ]);

  return { totalGMV, newCustomerGMV: newGmvRows[0]?.total ?? 0 };
}

async function countRetentionBuckets(
  merchantId: Types.ObjectId | string,
): Promise<{ alive: number; total: number }> {
  // "Alive" = recent OR lapsed but not churned. We use the existing
  // Snapshot flags so this stays cheap + consistent with other rules.
  const [alive, total] = await Promise.all([
    MerchantCustomerSnapshot.countDocuments({
      merchantId,
      $or: [{ isRecent: true }, { isLapsed: true }],
    }),
    MerchantCustomerSnapshot.countDocuments({ merchantId }),
  ]);
  return { alive, total };
}

async function countCampaigns(
  merchantId: Types.ObjectId | string,
  from: Date,
  to: Date,
): Promise<number> {
  return BroadcastCampaign.countDocuments({
    merchantId,
    createdAt: { $gte: from, $lte: to },
  });
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

/**
 * Compute full growth score for a merchant. Windows:
 *   current  = [now - WINDOW_DAYS, now]
 *   previous = [now - 2*WINDOW_DAYS, now - WINDOW_DAYS]
 *
 * Every DB call is wrapped — any failure downgrades that sub-score
 * to 0 so the total never throws.
 */
export async function computeGrowthScore(
  merchantId: Types.ObjectId | string,
  now: Date = new Date(),
): Promise<GrowthScoreResult> {
  const current = { from: new Date(now.getTime() - WINDOW_DAYS * 24 * 3600 * 1000), to: now };
  const previous = {
    from: new Date(now.getTime() - 2 * WINDOW_DAYS * 24 * 3600 * 1000),
    to: current.from,
  };

  let currentGMV = 0;
  let previousGMV = 0;
  let newCustomerGMV = 0;
  let retention = { alive: 0, total: 0 };
  let campaigns = 0;

  try {
    const [g, prevG, rb, cmp] = await Promise.all([
      sumNewCustomerGMV(merchantId, current.from, current.to),
      sumGmv(merchantId, previous.from, previous.to),
      countRetentionBuckets(merchantId),
      countCampaigns(merchantId, current.from, current.to),
    ]);
    currentGMV = g.totalGMV;
    newCustomerGMV = g.newCustomerGMV;
    previousGMV = prevG;
    retention = rb;
    campaigns = cmp;
  } catch (err) {
    logger.warn('[growth-score] aggregation failure — downgrading to 0 sub-scores', {
      merchantId: String(merchantId),
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const newCustomerPct = currentGMV > 0 ? (newCustomerGMV / currentGMV) * 100 : 0;

  const breakdown: GrowthScoreBreakdown = {
    gmvGrowth: scoreGmvGrowth(currentGMV, previousGMV),
    newCustomerPct: scoreNewCustomerPct(newCustomerPct),
    retention: scoreRetention(retention.alive, retention.total),
    campaignCadence: scoreCampaignCadence(campaigns),
  };

  return {
    total: composite(breakdown),
    breakdown,
  };
}
