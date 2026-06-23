/**
 * CPA Billing — merchant-facing routes (Phase J).
 *
 *   GET /api/merchant/cpa-billing
 *       Returns the merchant's current plan + month-to-date summary +
 *       recent ledger rows. Shadow rows hidden unless ?includeShadow=1.
 *
 *   GET /api/merchant/cpa-billing/ledger?from=&to=&limit=
 *       Detailed ledger view over an arbitrary window (≤ 365 days).
 *
 * POST routes (activate plan, update rates) are intentionally NOT
 * exposed merchant-side in the MVP — rate changes go through admin
 * tooling for governance. Merchants can only READ their plan here.
 */

import { Router, Request, Response } from 'express';

import { authMiddleware } from '../middleware/merchantauth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { CpaPricingPlan, DEFAULT_RATES, DEFAULT_MONTHLY_CAP } from '../models/CpaPricingPlan';
import { CpaBillingEvent } from '../models/CpaBillingEvent';
import { dayKey, startOfUtcMonth } from '../services/cpaPricing/computeCharge';

const router = Router();
router.use(authMiddleware);

const MAX_WINDOW_DAYS = 365;
const DEFAULT_LEDGER_LIMIT = 50;
const MAX_LEDGER_LIMIT = 500;

function getMerchantId(req: Request): string {
  return String((req as any).merchant?._id || (req as any).merchantId);
}

function getMode(): 'off' | 'shadow' | 'primary' {
  const raw = (process.env.CPA_PRICING_MODE ?? '').toLowerCase();
  if (raw === 'shadow' || raw === 'primary') return raw;
  return 'off';
}

// ─── GET /api/merchant/cpa-billing ───────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = getMerchantId(req);
    const includeShadow = req.query.includeShadow === '1';
    const mode = getMode();

    const plan: any = await CpaPricingPlan.findOne({ merchantId })
      .select('rates monthlyCap isActive lastBilledAt')
      .lean();

    const now = new Date();
    const startDay = dayKey(startOfUtcMonth(now));
    const endDay = dayKey(now);

    const mtdFilter: Record<string, unknown> = {
      merchantId,
      day: { $gte: startDay, $lte: endDay },
    };
    if (!includeShadow) mtdFilter.shadow = false;

    const mtdAgg: { total: number; count: number; byKind: Record<string, number> }[] =
      await (CpaBillingEvent as any).aggregate([
        { $match: mtdFilter },
        {
          $group: {
            _id: '$kind',
            subtotal: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]);

    const byKind: Record<string, { subtotal: number; count: number }> = {};
    let mtdTotal = 0;
    let mtdCount = 0;
    for (const row of mtdAgg as any[]) {
      byKind[row._id] = { subtotal: row.subtotal, count: row.count };
      mtdTotal += row.subtotal;
      mtdCount += row.count;
    }

    return res.json({
      success: true,
      mode,
      data: {
        plan: {
          isActive: plan?.isActive ?? false,
          rates: plan?.rates ?? { ...DEFAULT_RATES },
          monthlyCap: plan?.monthlyCap ?? DEFAULT_MONTHLY_CAP,
          lastBilledAt: plan?.lastBilledAt ?? null,
        },
        monthToDate: {
          total: mtdTotal,
          count: mtdCount,
          byKind,
          monthStart: startDay,
        },
      },
    });
  }),
);

// ─── GET /api/merchant/cpa-billing/ledger ───────────────────────────────────

router.get(
  '/ledger',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = getMerchantId(req);
    const q = req.query as { from?: string; to?: string; limit?: string; includeShadow?: string };
    const includeShadow = q.includeShadow === '1';

    const now = new Date();
    const to = q.to ? new Date(q.to) : now;
    const from = q.from ? new Date(q.from) : new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return res.status(400).json({ success: false, message: 'invalid from / to' });
    }
    if (to < from) {
      return res.status(400).json({ success: false, message: 'to must be >= from' });
    }
    const spanDays = (to.getTime() - from.getTime()) / (24 * 3600 * 1000);
    if (spanDays > MAX_WINDOW_DAYS) {
      return res
        .status(400)
        .json({ success: false, message: `window cannot exceed ${MAX_WINDOW_DAYS} days` });
    }

    let limit = Number(q.limit ?? DEFAULT_LEDGER_LIMIT);
    if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LEDGER_LIMIT;
    limit = Math.min(limit, MAX_LEDGER_LIMIT);

    const filter: Record<string, unknown> = {
      merchantId,
      day: { $gte: dayKey(from), $lte: dayKey(to) },
    };
    if (!includeShadow) filter.shadow = false;

    const rows: any[] = await CpaBillingEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('kind amount customerId sourceEventId day createdAt metadata shadow')
      .lean();

    logger.debug('[cpa-billing] ledger fetch', {
      merchantId,
      rowsReturned: rows.length,
      from: from.toISOString(),
      to: to.toISOString(),
    });

    return res.json({
      success: true,
      data: {
        rows: rows.map((r) => ({
          kind: r.kind,
          amount: r.amount,
          customerId: r.customerId ? String(r.customerId) : null,
          sourceEventId: r.sourceEventId ?? null,
          day: r.day,
          createdAt: r.createdAt,
          metadata: r.metadata ?? null,
          shadow: r.shadow,
        })),
      },
    });
  }),
);

export default router;

export const __testOnly = {
  MAX_WINDOW_DAYS,
  DEFAULT_LEDGER_LIMIT,
  MAX_LEDGER_LIMIT,
};
