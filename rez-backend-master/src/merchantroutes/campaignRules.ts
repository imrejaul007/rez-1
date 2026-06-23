import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Joi from 'joi';
import { authMiddleware } from '../middleware/merchantauth';
import CampaignRule from '../models/CampaignRule';
import { broadcastDispatchService } from '../services/broadcastDispatchService';
import { logger } from '../config/logger';

// Joi validation schema for campaign rule creation
const campaignRuleSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  trigger: Joi.object({
    type: Joi.string()
      .valid('days_since_visit', 'birthday', 'spend_milestone', 'visit_count', 'first_visit')
      .required(),
    value: Joi.number().min(1).max(365).optional(),
  }).required(),
  action: Joi.object({
    type: Joi.string().valid('coin_drop', 'push', 'sms').required(),
    coinAmount: Joi.number().min(1).max(10000).optional(),
    message: Joi.string().max(200).optional(),
  }).required(),
  isActive: Joi.boolean().optional(),
  storeId: Joi.string().optional(),
});

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const rules = await CampaignRule.find({ merchantId }).sort({ createdAt: -1 });
    res.json({ success: true, data: { rules } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { error } = campaignRuleSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const merchantId = req.merchantId;
    const rule = await CampaignRule.create({ ...req.body, merchantId });
    res.status(201).json({ success: true, data: { rule } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const rule = await CampaignRule.findOneAndUpdate({ _id: req.params.id, merchantId }, req.body, { new: true });
    if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
    res.json({ success: true, data: { rule } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    await CampaignRule.findOneAndDelete({ _id: req.params.id, merchantId });
    res.json({ success: true, message: 'Deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const ruleId = req.params.id;
    const merchantId = req.merchantId;

    const rule = await CampaignRule.findOne({ _id: ruleId, merchantId }).lean();
    if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });

    res.json({
      success: true,
      data: {
        ruleId,
        totalFired: rule.firedCount || 0,
        lastFiredAt: rule.lastFiredAt || null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/merchant/campaign-rules/:id/dispatch
 * Dispatch a campaign broadcast with 3-layer deduplication guard.
 *
 * Body: { message: string, channel?: 'whatsapp'|'sms'|'push' }
 *
 * Layer 1: Redis NX lock per campaignId (prevents double-tap)
 * Layer 2: BullMQ jobId dedup (prevents duplicate queue entry)
 * Layer 3: Per-customer 24h message hash (prevents same message twice)
 */
router.post('/:id/dispatch', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const campaignId = req.params.id;
    const { message, channel = 'push' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const rule = await CampaignRule.findOne({ _id: campaignId, merchantId }).lean();
    if (!rule) return res.status(404).json({ success: false, error: 'Campaign rule not found' });

    const result = await broadcastDispatchService.dispatch(campaignId, merchantId ?? '', message);

    if (!result.queued) {
      return res.status(409).json({
        success: false,
        error: result.reason,
        code: 'DISPATCH_REJECTED',
      });
    }

    logger.info('[CampaignRules] Broadcast dispatched', { campaignId, merchantId, channel });
    return res.json({
      success: true,
      message: 'Campaign broadcast queued successfully',
      data: {
        campaignId,
        jobId: result.jobId,
        channel,
        dispatchedAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    logger.error('[CampaignRules] Dispatch error', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/merchant/campaign-rules/:id/dispatch-status
 * Check current lock/dispatch status of a campaign (is it already running?).
 */
router.get('/:id/dispatch-status', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const campaignId = req.params.id;

    const rule = await CampaignRule.findOne({ _id: campaignId, merchantId }).select('name isActive').lean();
    if (!rule) return res.status(404).json({ success: false, error: 'Campaign rule not found' });

    const isDispatching = await broadcastDispatchService.isDispatching(campaignId);
    return res.json({ success: true, data: { campaignId, isDispatching } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
