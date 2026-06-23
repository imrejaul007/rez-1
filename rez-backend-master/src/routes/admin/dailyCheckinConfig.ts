import { logger } from '../../config/logger';
/**
 * Admin Routes - Daily Check-In Configuration
 * CRUD endpoints for managing the DailyCheckInConfig singleton
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import DailyCheckInConfig from '../../models/DailyCheckInConfig';
import { sendSuccess, sendError, sendBadRequest } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/daily-checkin-config
 * Get the active daily check-in configuration
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const config = await DailyCheckInConfig.getActiveConfig();
  return sendSuccess(res, config, 'Daily check-in config fetched');
}));

/**
 * PUT /api/admin/daily-checkin-config
 * Update the daily check-in configuration
 */
router.put('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { dayRewards, milestoneRewards, proTips, affiliateTip, reviewTimeframe, isEnabled } = req.body;

    // Validate dayRewards
    if (dayRewards !== undefined) {
      if (!Array.isArray(dayRewards) || dayRewards.length !== 7 || !dayRewards.every((n: any) => typeof n === 'number' && n > 0)) {
        return sendBadRequest(res, 'dayRewards must be an array of 7 positive numbers');
      }
    }

    // Validate milestoneRewards
    if (milestoneRewards !== undefined) {
      if (!Array.isArray(milestoneRewards)) {
        return sendBadRequest(res, 'milestoneRewards must be an array');
      }
      for (const m of milestoneRewards) {
        if (!m.day || !m.coins || typeof m.day !== 'number' || typeof m.coins !== 'number' || m.day < 1 || m.coins < 1) {
          return sendBadRequest(res, 'Each milestone must have a positive day and coins value');
        }
      }
    }

    // Validate proTips
    if (proTips !== undefined) {
      if (!Array.isArray(proTips) || !proTips.every((t: any) => typeof t === 'string' && t.trim().length > 0)) {
        return sendBadRequest(res, 'proTips must be an array of non-empty strings');
      }
    }

    const config = await DailyCheckInConfig.getActiveConfig();

    if (dayRewards !== undefined) config.dayRewards = dayRewards;
    if (milestoneRewards !== undefined) config.milestoneRewards = milestoneRewards;
    if (proTips !== undefined) config.proTips = proTips;
    if (affiliateTip !== undefined) config.affiliateTip = affiliateTip;
    if (reviewTimeframe !== undefined) config.reviewTimeframe = reviewTimeframe;
    if (isEnabled !== undefined) config.isEnabled = isEnabled;

    await config.save();

    // Invalidate the in-memory cache in gamificationController
    try {
      const { invalidateCheckinConfigCache } = await import('../../controllers/gamificationController');
      invalidateCheckinConfigCache();
    } catch {
      // Non-critical — cache will expire naturally in 5 min
    }

    return sendSuccess(res, config, 'Daily check-in config updated');
  } catch (error: any) {
    logger.error('[Admin] Error updating daily check-in config:', error);
    if (error.name === 'ValidationError') {
      return sendBadRequest(res, error.message);
    }
    return sendError(res, 'Failed to update daily check-in config', 500);
  }
}));

/**
 * POST /api/admin/daily-checkin-config/reset
 * Reset config to defaults
 */
router.post('/reset', asyncHandler(async (_req: Request, res: Response) => {
  await DailyCheckInConfig.deleteMany({});
  const config = await DailyCheckInConfig.getActiveConfig(); // Creates fresh default

  try {
    const { invalidateCheckinConfigCache } = await import('../../controllers/gamificationController');
    invalidateCheckinConfigCache();
  } catch {
    // Non-critical
  }

  return sendSuccess(res, config, 'Daily check-in config reset to defaults');
}));

export default router;
