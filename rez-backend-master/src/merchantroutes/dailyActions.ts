/**
 * Daily Actions — merchant-facing routes (Phase E).
 *
 *   GET /api/merchant/daily-actions
 *       Returns today's MerchantDailyAction row (or yesterday's if
 *       today hasn't been generated yet — fallback so an early-morning
 *       app open before the cron runs still shows something useful).
 *
 *   POST /api/merchant/daily-actions/generate
 *       On-demand regeneration for THIS merchant only. Admin /
 *       debugging use. Rate-limited by `generatedAt` — if the last
 *       generation was less than MIN_REGEN_GAP_SECONDS ago, returns
 *       the existing row instead.
 *
 * Shadow rows (mode=shadow during cutover) are hidden from the default
 * GET response unless `?includeShadow=1` is passed.
 */

import { Router, Request, Response } from 'express';

import { authMiddleware } from '../middleware/merchantauth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import MerchantDailyAction from '../models/MerchantDailyAction';
import { generateForMerchant, getDailyActionsMode } from '../services/dailyActions/generate';

const router = Router();
router.use(authMiddleware);

const MIN_REGEN_GAP_SECONDS = 60;

function getMerchantId(req: Request): string {
  return String((req as any).merchant?._id || (req as any).merchantId);
}

// ─── GET /api/merchant/daily-actions ──────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = getMerchantId(req);
    const includeShadow = req.query.includeShadow === '1';
    const mode = getDailyActionsMode();

    const today = MerchantDailyAction.dayKey(new Date());
    const yesterday = MerchantDailyAction.dayKey(
      new Date(Date.now() - 24 * 3600 * 1000),
    );

    // Prefer today's row; fall back to yesterday's so an early-morning
    // open before the cron runs shows something.
    const rowFilter: Record<string, unknown> = { merchantId, day: { $in: [today, yesterday] } };
    if (!includeShadow) rowFilter.shadow = false;

    const rows = await MerchantDailyAction.find(rowFilter)
      .sort({ day: -1, generatedAt: -1 })
      .limit(2)
      .lean();

    const latest: any = rows[0] ?? null;

    return res.json({
      success: true,
      data: {
        mode,
        day: latest?.day ?? today,
        generatedAt: latest?.generatedAt ?? null,
        stale: latest ? latest.day !== today : true,
        actions: latest?.actions ?? [],
        engineVersion: latest?.engineVersion ?? null,
      },
    });
  }),
);

// ─── POST /api/merchant/daily-actions/generate ───────────────────────────────

router.post(
  '/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = getMerchantId(req);
    const mode = getDailyActionsMode();

    if (mode === 'off') {
      return res.status(409).json({
        success: false,
        message: 'DAILY_ACTIONS_MODE is off — generation disabled',
      });
    }

    // Rate-limit: don't let a tap spam the engine.
    const today = MerchantDailyAction.dayKey(new Date());
    const existing: any = await MerchantDailyAction.findOne({ merchantId, day: today })
      .select('generatedAt')
      .lean();
    if (existing?.generatedAt) {
      const ageMs = Date.now() - new Date(existing.generatedAt).getTime();
      if (ageMs < MIN_REGEN_GAP_SECONDS * 1000) {
        return res.status(200).json({
          success: true,
          throttled: true,
          data: {
            message: `Regenerated ${Math.round(ageMs / 1000)}s ago — reusing existing row`,
            generatedAt: existing.generatedAt,
          },
        });
      }
    }

    const count = await generateForMerchant(merchantId);
    logger.info('[daily-actions] on-demand generation', {
      merchantId,
      count,
      mode,
    });

    return res.status(201).json({
      success: true,
      data: { count, mode },
    });
  }),
);

export default router;

// Exported for tests
export const __testOnly = {
  MIN_REGEN_GAP_SECONDS,
};
