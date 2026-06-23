/**
 * Growth Score — merchant-facing route (Phase H).
 *
 *   GET /api/merchant/growth-score
 *       Returns today's score (or yesterday's if the cron hasn't run)
 *       with stale:true when serving a fallback row.
 *
 *   POST /api/merchant/growth-score/recompute
 *       On-demand recompute for THIS merchant only. Rate-limited to
 *       once per MIN_RECOMPUTE_GAP_SECONDS to stop admin-refresh spam.
 *
 * Shadow rows (mode=shadow during cutover) are hidden from the default
 * GET response unless ?includeShadow=1.
 */

import { Router, Request, Response } from 'express';

import { authMiddleware } from '../middleware/merchantauth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import MerchantGrowthScore from '../models/MerchantGrowthScore';
import {
  computeGrowthScore,
  getGrowthScoreMode,
  ENGINE_VERSION,
} from '../services/growthScore/compute';

const router = Router();
router.use(authMiddleware);

const MIN_RECOMPUTE_GAP_SECONDS = 120;

function getMerchantId(req: Request): string {
  return String((req as any).merchant?._id || (req as any).merchantId);
}

// ─── GET /api/merchant/growth-score ──────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = getMerchantId(req);
    const includeShadow = req.query.includeShadow === '1';
    const mode = getGrowthScoreMode();

    const today = MerchantGrowthScore.dayKey(new Date());
    const yesterday = MerchantGrowthScore.dayKey(
      new Date(Date.now() - 24 * 3600 * 1000),
    );

    const filter: Record<string, unknown> = {
      merchantId,
      day: { $in: [today, yesterday] },
    };
    if (!includeShadow) filter.shadow = false;

    const rows = await MerchantGrowthScore.find(filter)
      .sort({ day: -1, computedAt: -1 })
      .limit(2)
      .lean();

    const latest: any = rows[0] ?? null;

    return res.json({
      success: true,
      data: {
        mode,
        day: latest?.day ?? today,
        stale: latest ? latest.day !== today : true,
        total: latest?.total ?? null,
        breakdown: latest?.breakdown ?? null,
        computedAt: latest?.computedAt ?? null,
        engineVersion: latest?.engineVersion ?? null,
      },
    });
  }),
);

// ─── POST /api/merchant/growth-score/recompute ───────────────────────────────

router.post(
  '/recompute',
  asyncHandler(async (req: Request, res: Response) => {
    const mode = getGrowthScoreMode();
    if (mode === 'off') {
      return res
        .status(409)
        .json({ success: false, message: 'GROWTH_SCORE_MODE=off — recompute disabled' });
    }

    const merchantId = getMerchantId(req);
    const today = MerchantGrowthScore.dayKey(new Date());

    const existing: any = await MerchantGrowthScore.findOne({ merchantId, day: today })
      .select('computedAt')
      .lean();
    if (existing?.computedAt) {
      const ageMs = Date.now() - new Date(existing.computedAt).getTime();
      if (ageMs < MIN_RECOMPUTE_GAP_SECONDS * 1000) {
        return res.json({
          success: true,
          throttled: true,
          data: {
            message: `Recomputed ${Math.round(ageMs / 1000)}s ago — reusing existing row`,
            computedAt: existing.computedAt,
          },
        });
      }
    }

    const result = await computeGrowthScore(merchantId);
    const row = await MerchantGrowthScore.upsertForDay({
      merchantId,
      day: today,
      total: result.total,
      breakdown: result.breakdown,
      shadow: mode === 'shadow',
      engineVersion: ENGINE_VERSION,
    });

    logger.info('[growth-score] on-demand recompute', {
      merchantId,
      total: result.total,
      mode,
    });

    return res.status(201).json({
      success: true,
      data: {
        total: row.total,
        breakdown: row.breakdown,
        computedAt: row.computedAt,
        mode,
      },
    });
  }),
);

export default router;

export const __testOnly = {
  MIN_RECOMPUTE_GAP_SECONDS,
};
