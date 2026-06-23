// @ts-nocheck
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import spendingInsightsService from '../services/spendingInsightsService';
import missedSavingsService from '../services/missedSavingsService';
import { createServiceLogger } from '../config/logger';

const router = Router();
const logger = createServiceLogger('insights-routes');

router.use(requireAuth);
router.use(generalLimiter);

/**
 * GET /api/insights/dashboard
 * Returns comprehensive spending insights for the authenticated user:
 * category breakdown, merchant frequency, time patterns, and peer comparison.
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const insights = await spendingInsightsService.getInsights(userId);
    return res.json({ success: true, data: insights });
  }),
);

/**
 * GET /api/insights/monthly/:month
 * Returns a detailed monthly spending report.
 * :month format: YYYY-MM (e.g., 2026-03)
 */
router.get(
  '/monthly/:month',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { month } = req.params;
    // Validate format YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'Invalid month format. Use YYYY-MM.' });
    }

    const report = await spendingInsightsService.getMonthlyReport(userId, month);
    return res.json({ success: true, data: report });
  }),
);

/**
 * GET /api/insights/missed-savings
 * Returns the last 7 days of missed savings with alternative merchant suggestions.
 */
router.get(
  '/missed-savings',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const summary = await missedSavingsService.getWeeklySummary(userId);
    return res.json({ success: true, data: summary });
  }),
);

/**
 * GET /api/insights/peer-comparison
 * Returns the user's savings rate percentile versus peers in their area.
 */
router.get(
  '/peer-comparison',
  asyncHandler(async (req: any, res: any) => {
    const userId = req.user?.id || req.user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const comparison = await spendingInsightsService.getPeerComparison(userId);
    return res.json({ success: true, data: comparison });
  }),
);

export default router;
