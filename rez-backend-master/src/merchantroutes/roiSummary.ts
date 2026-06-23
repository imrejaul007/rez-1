/**
 * Merchant ROI Summary — Phase G route.
 *
 *   GET /api/merchant/roi-summary?windowDays=30
 *   GET /api/merchant/roi-summary?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns the full RoiReport for the authenticated merchant.
 * Defaults to last 30 days if no query params provided.
 *
 * Feature flag: MERCHANT_ROI_MODE (off | shadow | primary).
 *   - off     → 503 to the client so the app can stop polling.
 *   - shadow  → same response as primary, but the body carries
 *               `mode:'shadow'` so the UI can render a "preview" badge.
 *   - primary → standard response.
 *
 * Caching: no server cache at the route level — the aggregator runs
 * ~6 parallel Mongo aggregations that together take <500ms on a
 * typical merchant dataset. Add a TTL cache if that assumption stops
 * holding in production.
 */

import { Router, Request, Response } from 'express';

import { authMiddleware } from '../middleware/merchantauth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { computeRoiReport, getRoiMode, type RoiWindow } from '../services/merchantRoi/computeRoi';

const router = Router();
router.use(authMiddleware);

const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 365;

function getMerchantId(req: Request): string {
  return String((req as any).merchant?._id || (req as any).merchantId);
}

function parseWindow(req: Request): RoiWindow | { error: string } {
  const now = new Date();
  const q = req.query as { windowDays?: string; from?: string; to?: string };

  if (q.from && q.to) {
    const from = new Date(q.from);
    const to = new Date(q.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return { error: 'from / to must be valid ISO dates' };
    }
    if (to < from) {
      return { error: 'to must be >= from' };
    }
    const spanDays = (to.getTime() - from.getTime()) / (24 * 3600 * 1000);
    if (spanDays > MAX_WINDOW_DAYS) {
      return { error: `window cannot exceed ${MAX_WINDOW_DAYS} days` };
    }
    return { from, to };
  }

  const daysRaw = q.windowDays ? Number(q.windowDays) : DEFAULT_WINDOW_DAYS;
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? Math.min(daysRaw, MAX_WINDOW_DAYS) : DEFAULT_WINDOW_DAYS;
  return {
    from: new Date(now.getTime() - days * 24 * 3600 * 1000),
    to: now,
  };
}

// ─── GET /api/merchant/roi-summary ───────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const mode = getRoiMode();
    if (mode === 'off') {
      return res.status(503).json({
        success: false,
        message: 'ROI reporting is temporarily disabled',
      });
    }

    const merchantId = getMerchantId(req);
    const parsed = parseWindow(req);
    if ('error' in parsed) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const report = await computeRoiReport(merchantId, parsed);

    logger.info('[roi] report', {
      merchantId,
      mode,
      from: parsed.from.toISOString(),
      to: parsed.to.toISOString(),
      spent: report.spent.total,
      earned: report.earned.total,
      netLift: report.netLift,
    });

    return res.json({
      success: true,
      mode,
      data: report,
    });
  }),
);

export default router;

// Exported for tests
export const __testOnly = {
  parseWindow,
  DEFAULT_WINDOW_DAYS,
  MAX_WINDOW_DAYS,
};
