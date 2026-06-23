import { logger } from '../config/logger';
import { Router, Request, Response } from 'express';
import ValueCard from '../models/ValueCard';
import QuickAction from '../models/QuickAction';
import { sendSuccess, sendError } from '../utils/response';
import { requireGamificationFeature } from '../middleware/gamificationFeatureGate';

const router = Router();

// PHASE 3 — disabled until core is stable
router.use(requireGamificationFeature('achievements', { items: [] }));

/**
 * GET /api/content/value-cards
 * Public endpoint — returns active value cards sorted by sortOrder.
 */
router.get('/value-cards', async (_req: Request, res: Response) => {
  try {
    const cards = await ValueCard.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();
    sendSuccess(res, { cards });
  } catch (error: any) {
    logger.error('[CONTENT] Error fetching value cards:', error);
    sendError(res, error.message || 'Failed to fetch value cards');
  }
});

/**
 * GET /api/content/quick-actions
 * Public endpoint — returns active quick actions sorted by priority.
 */
router.get('/quick-actions', async (_req: Request, res: Response) => {
  try {
    const actions = await QuickAction.find({ isActive: true })
      .sort({ priority: 1 })
      .lean();
    sendSuccess(res, { actions });
  } catch (error: any) {
    logger.error('[CONTENT] Error fetching quick actions:', error);
    sendError(res, error.message || 'Failed to fetch quick actions');
  }
});

export default router;
