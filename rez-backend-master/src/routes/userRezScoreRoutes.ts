// @ts-nocheck
/**
 * GET /api/user/rez-score
 *
 * Returns the REZ Score (0-1000) for the authenticated user.
 *
 * Formula:
 *   score = min(1000,
 *     (totalNuqtaEarned  * 0.1) +
 *     (visitStreak       * 10)  +
 *     (totalOrders       * 5)   +
 *     (uniqueMerchantsVisited * 3) +
 *     (referrals         * 20)  +
 *     (accountAgeWeeks   * 2)
 *   )
 *
 * Tiers: Bronze (0-200), Silver (201-400), Gold (401-600), Platinum (601-800), Elite (801-1000)
 *
 * Response is cached in Redis for 1 hour (key: rezScore:{userId}).
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import userScoreService from '../services/userScoreService';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/user/rez-score
 * @desc    Returns REZ Score (0-1000) with tier, breakdown, and next milestone
 * @access  Private
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId || (req as any).user?.id || (req as any).user?._id?.toString();
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const result = await userScoreService.getScore(userId.toString());

    return res.json({
      success: true,
      data: {
        score: result.score,
        tier: result.tier,
        breakdown: result.breakdown,
        nextMilestone: result.nextMilestone,
      },
    });
  }),
);

export default router;
