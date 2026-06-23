// @ts-nocheck
/**
 * Offer Automation Routes
 * CRUD for merchant-defined automation rules + audit trail.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import Joi from 'joi';
import { authMiddleware } from '../middleware/merchantauth';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import OfferRule from '../models/OfferRule';
import OfferAudit from '../models/OfferAudit';
import { Store } from '../models/Store';

const router = Router();

// ── Auth + Store ownership ────────────────────────────────────────────────────

router.use(authMiddleware);

async function verifyStoreOwnership(storeId: string, merchantId: string): Promise<void> {
  const store = await Store.findOne({ _id: storeId, merchantId }).lean();
  if (!store) {
    throw Object.assign(new Error('Store not found or not owned'), { status: 404 });
  }
}

// ── Validation Schemas ─────────────────────────────────────────────────────────

const triggerConfigSchemas: Record<string, Joi.ObjectSchema> = {
  dormant_customer: Joi.object({
    daysSinceLastVisit: Joi.number().integer().min(1).max(365).default(14),
  }),
  happy_hour: Joi.object({
    startTime: Joi.string()
      .pattern(/^\d{2}:\d{2}$/)
      .required(),
    endTime: Joi.string()
      .pattern(/^\d{2}:\d{2}$/)
      .required(),
    activeDays: Joi.array().items(Joi.number().integer().min(0).max(6)).min(1).required(),
  }),
  low_footfall: Joi.object({
    revenueThreshold: Joi.number().min(0).required(),
    period: Joi.string().valid('day', 'week').required(),
  }),
  birthday: Joi.object({
    daysBefore: Joi.number().integer().min(0).max(30).default(0),
    daysAfter: Joi.number().integer().min(0).max(30).default(0),
  }),
  first_visit: Joi.object({}),
  milestone_visit: Joi.object({
    visitCounts: Joi.array().items(Joi.number().integer().min(1)).min(1).required(),
  }),
  weather_trigger: Joi.object({
    condition: Joi.string().valid('rain', 'hot', 'cold').required(),
    city: Joi.string().max(100).required(),
  }),
};

const createRuleSchema = Joi.object({
  type: Joi.string()
    .valid(
      'dormant_customer',
      'happy_hour',
      'low_footfall',
      'birthday',
      'first_visit',
      'milestone_visit',
      'weather_trigger',
    )
    .required(),
  triggerConfig: Joi.object({
    daysSinceLastVisit: Joi.number().integer().min(1).max(365),
    startTime: Joi.string(),
    endTime: Joi.string(),
    activeDays: Joi.array().items(Joi.number()),
    revenueThreshold: Joi.number().min(0),
    period: Joi.string(),
    daysBefore: Joi.number().integer().min(0).max(30),
    daysAfter: Joi.number().integer().min(0).max(30),
    visitCounts: Joi.array().items(Joi.number()),
    condition: Joi.string(),
    city: Joi.string().max(100),
  }).required(),
  offerConfig: Joi.object({
    type: Joi.string().valid('cashback', 'discount', 'free_item').required(),
    value: Joi.number().min(0).required(),
    minOrderValue: Joi.number().min(0),
    maxDiscount: Joi.number().min(0),
    validityDays: Joi.number().integer().min(1).max(90).default(7),
    title: Joi.string().min(3).max(100).required(),
    message: Joi.string().min(10).max(500).required(),
  }).required(),
  notificationChannel: Joi.string().valid('whatsapp', 'push', 'sms').default('whatsapp'),
  enabled: Joi.boolean().default(true),
});

const updateRuleSchema = createRuleSchema.fork(
  ['type', 'triggerConfig', 'offerConfig', 'notificationChannel', 'enabled'],
  (s) => s.optional(),
);

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/merchants/:storeId/offer-rules
 * List all automation rules for a store.
 */
router.get(
  '/:storeId/offer-rules',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req.user as any).id;
    const { storeId } = req.params;
    const { type, enabled, page = '1', limit = '20' } = req.query;

    await verifyStoreOwnership(storeId, merchantId);

    const filter: any = { storeId: new mongoose.Types.ObjectId(storeId) };
    if (type) filter.type = type;
    if (enabled !== undefined) filter.enabled = enabled === 'true';

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10)));
    const skip = (pageNum - 1) * limitNum;

    const [rules, total] = await Promise.all([
      OfferRule.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      OfferRule.countDocuments(filter),
    ]);

    sendPaginated(res, rules, pageNum, limitNum, total, 'Rules fetched successfully');
  }),
);

/**
 * POST /api/merchants/:storeId/offer-rules
 * Create a new automation rule.
 */
router.post(
  '/:storeId/offer-rules',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req.user as any).id;
    const { storeId } = req.params;

    const { error, value } = createRuleSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return sendError(res, error.details.map((d) => d.message).join(', '), 400);
    }

    await verifyStoreOwnership(storeId, merchantId);

    const triggerType = value.type;
    const configSchema = triggerConfigSchemas[triggerType];
    const { error: triggerError, value: triggerConfig } = configSchema.validate(value.triggerConfig);
    if (triggerError) {
      return sendError(res, 'Invalid trigger config: ' + triggerError.details[0].message, 400);
    }

    const rule = new OfferRule({
      storeId: new mongoose.Types.ObjectId(storeId),
      merchantId: new mongoose.Types.ObjectId(merchantId),
      type: triggerType,
      triggerConfig: { type: triggerType, config: triggerConfig },
      offerConfig: value.offerConfig,
      notificationChannel: value.notificationChannel,
      enabled: value.enabled,
    });

    await rule.save();
    sendSuccess(res, rule.toObject(), 'Rule created successfully', 201);
  }),
);

/**
 * PATCH /api/merchants/:storeId/offer-rules/:ruleId
 * Update an existing rule.
 */
router.patch(
  '/:storeId/offer-rules/:ruleId',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req.user as any).id;
    const { storeId, ruleId } = req.params;

    const { error, value } = updateRuleSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return sendError(res, error.details.map((d) => d.message).join(', '), 400);
    }

    await verifyStoreOwnership(storeId, merchantId);

    const rule = await OfferRule.findOneAndUpdate(
      { _id: ruleId, storeId: new mongoose.Types.ObjectId(storeId) },
      { $set: value },
      { new: true, runValidators: true },
    );

    if (!rule) {
      return sendError(res, 'Rule not found', 404);
    }

    sendSuccess(res, rule.toObject(), 'Rule updated successfully');
  }),
);

/**
 * DELETE /api/merchants/:storeId/offer-rules/:ruleId
 * Delete a rule.
 */
router.delete(
  '/:storeId/offer-rules/:ruleId',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req.user as any).id;
    const { storeId, ruleId } = req.params;

    await verifyStoreOwnership(storeId, merchantId);

    const result = await OfferRule.findOneAndDelete({
      _id: ruleId,
      storeId: new mongoose.Types.ObjectId(storeId),
    });

    if (!result) {
      return sendError(res, 'Rule not found', 404);
    }

    sendSuccess(res, { deleted: true }, 'Rule deleted successfully');
  }),
);

/**
 * GET /api/merchants/:storeId/offer-rules/:ruleId/audit
 * Get audit trail for a specific rule.
 */
router.get(
  '/:storeId/offer-rules/:ruleId/audit',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req.user as any).id;
    const { storeId, ruleId } = req.params;
    const { page = '1', limit = '20' } = req.query;

    await verifyStoreOwnership(storeId, merchantId);

    const rule = await OfferRule.findOne({
      _id: ruleId,
      storeId: new mongoose.Types.ObjectId(storeId),
    }).lean();

    if (!rule) {
      return sendError(res, 'Rule not found', 404);
    }

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit), 10)));
    const skip = (pageNum - 1) * limitNum;

    const [audits, total] = await Promise.all([
      OfferAudit.find({ ruleId: new mongoose.Types.ObjectId(ruleId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('customerId', 'fullName profile.phone profile.firstName profile.lastName')
        .lean(),
      OfferAudit.countDocuments({ ruleId: new mongoose.Types.ObjectId(ruleId) }),
    ]);

    // Compute aggregate stats
    const stats = await OfferAudit.aggregate([
      { $match: { ruleId: new mongoose.Types.ObjectId(ruleId) } },
      {
        $group: {
          _id: null,
          totalSent: { $sum: { $cond: ['$offerSent', 1, 0] } },
          totalUsed: { $sum: { $cond: ['$offerUsed', 1, 0] } },
          totalRevenue: { $sum: { $ifNull: ['$revenue', 0] } },
        },
      },
    ]);

    sendSuccess(
      res,
      {
        audits,
        stats: stats[0] || { totalSent: 0, totalUsed: 0, totalRevenue: 0 },
        pagination: { page: pageNum, limit: limitNum, total },
      },
      'Audit trail fetched successfully',
    );
  }),
);

export default router;
