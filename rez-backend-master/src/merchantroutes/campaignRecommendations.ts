import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { authMiddleware } from '../middleware/merchantauth';
import { CampaignRecommendationLog, getRecommendationPerformance } from '../models/CampaignRecommendationLog';
import { logger } from '../config/logger';

/**
 * Campaign Recommendation Feedback Loop Routes
 *
 * POST  /api/merchant/campaign-recommendations/:id/action   — merchant accepts or dismisses a suggestion
 * GET   /api/merchant/campaign-recommendations/performance  — historical accept & conversion rates per type
 * POST  /api/merchant/campaign-recommendations/shown        — log that a suggestion was shown to the merchant
 * GET   /api/merchant/campaign-recommendations              — list all recommendations (paginated)
 *
 * v3 Architecture: Part 10 — Campaign Recommendation Feedback Loop
 */

const actionSchema = Joi.object({
  action: Joi.string().valid('accepted', 'dismissed', 'ignored').required(),
  campaignId: Joi.string().optional(), // linked BroadcastCampaign if accepted + campaign created
});

const shownSchema = Joi.object({
  recommendationType: Joi.string().valid('winback', 'slow_day', 'food_cost', 'repeat_boost').required(),
  generatedAt: Joi.date().iso().optional(),
});

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/merchant/campaign-recommendations
 * List all recommendation logs for the merchant, newest first.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId as string;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20', 10));
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      CampaignRecommendationLog.find({ merchantId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      CampaignRecommendationLog.countDocuments({ merchantId }),
    ]);

    return res.json({
      success: true,
      data: {
        recommendations: docs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (err: any) {
    logger.error('[CampaignRec] List error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/merchant/campaign-recommendations/performance
 * Return historical accept rates + conversion rates per recommendation type.
 * Used by the recommendation engine to rank future suggestions (higher score first).
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId as string;
    const performance = await getRecommendationPerformance(merchantId);

    return res.json({
      success: true,
      data: {
        performance,
        meta: {
          description: 'score = acceptRate × conversionRate — recommendations with higher scores are shown first',
          computedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err: any) {
    logger.error('[CampaignRec] Performance error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/merchant/campaign-recommendations/shown
 * Log that a recommendation was displayed to the merchant.
 * Called by the dashboard when a suggestion card is rendered.
 *
 * Body: { recommendationType: string, generatedAt?: ISODate }
 */
router.post('/shown', async (req: Request, res: Response) => {
  try {
    const { error } = shownSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const merchantId = req.merchantId as string;
    const { recommendationType, generatedAt } = req.body;

    const log = await CampaignRecommendationLog.create({
      merchantId,
      recommendationType,
      generatedAt: generatedAt ? new Date(generatedAt) : new Date(),
      shownAt: new Date(),
      action: null,
    });

    return res.status(201).json({ success: true, data: { id: log._id } });
  } catch (err: any) {
    logger.error('[CampaignRec] Shown log error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/merchant/campaign-recommendations/:id/action
 * Record a merchant's action (accept / dismiss / ignore) on a suggestion.
 * Optionally links the resulting campaign if action is 'accepted'.
 *
 * Body: { action: 'accepted'|'dismissed'|'ignored', campaignId?: string }
 */
router.post('/:id/action', async (req: Request, res: Response) => {
  try {
    const { error } = actionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const merchantId = req.merchantId as string;
    const { action, campaignId } = req.body;

    const log = await CampaignRecommendationLog.findOne({
      _id: req.params.id,
      merchantId,
    });

    if (!log) {
      return res.status(404).json({ success: false, error: 'Recommendation log not found' });
    }

    if (log.action) {
      // Idempotent — already actioned, return existing record
      return res.json({ success: true, data: { id: log._id, action: log.action, alreadyRecorded: true } });
    }

    log.action = action;
    log.actionAt = new Date();

    // If accepted and a campaign was created, link it for outcome tracking
    if (action === 'accepted' && campaignId) {
      if (!log.outcome) {
        (log as any).outcome = {
          campaignId,
          customerReach: 0,
          conversions: 0,
          conversionRate: 0,
          revenueImpact: 0,
          coinsIssued: 0,
        };
      } else {
        (log.outcome as any).campaignId = campaignId;
      }
    }

    await log.save();

    logger.info('[CampaignRec] Action recorded', {
      merchantId,
      logId: log._id,
      action,
      ...(campaignId ? { campaignId } : {}),
    });

    return res.json({
      success: true,
      data: {
        id: log._id,
        action,
        actionAt: log.actionAt,
        ...(campaignId ? { campaignId } : {}),
      },
    });
  } catch (err: any) {
    logger.error('[CampaignRec] Action error', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
