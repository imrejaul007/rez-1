/**
 * AOV Reward Tier Routes — Merchant-side CRUD for spend-threshold reward configs.
 *
 * Mounted at /api/merchant/aov-rewards
 * Protected by merchant authMiddleware + rate limiter (30 req / 15 min).
 *
 * Endpoints:
 *   GET    /                          — list all configs (optional ?storeId)
 *   POST   /                          — create new tier config
 *   PUT    /:id                        — update existing config
 *   DELETE /:id                        — soft delete (isActive = false)
 *   GET    /active?storeId=X&amountPaise=N — consumer checkout integration point
 *
 * Frontend rewardType values (coins | discount | cashback) are mapped server-side
 * to the canonical model enum (flat_coins | cashback_percent | cashback_percent).
 */

import { Router as ExpressRouter, Request, Response } from 'express';
import mongoose from 'mongoose';
import Joi from 'joi';
import { authMiddleware } from '../middleware/merchantauth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { createServiceLogger } from '../config/logger';
import AOVRewardTier, { AOVRewardType } from '../models/AOVRewardTier';
import { getAOVRewardForBill } from '../services/aovRewardService';

const router = ExpressRouter();
router.use(authMiddleware);

const logger = createServiceLogger('aov-rewards-routes');

const aovLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  prefix: 'aov-rewards',
  message: 'Too many AOV reward requests. Please try again later.',
});

// ── Frontend → canonical rewardType mapping ───────────────────────────────────
// The merchant app sends: 'coins' | 'discount' | 'cashback'
// The model stores:       'flat_coins' | 'cashback_percent' | 'cashback_percent'
const FRONTEND_REWARD_TYPE_MAP: Record<string, AOVRewardType> = {
  coins: 'flat_coins',
  discount: 'cashback_percent',
  cashback: 'cashback_percent',
  // Pass-through for callers already using canonical values
  flat_coins: 'flat_coins',
  cashback_percent: 'cashback_percent',
  flat_cashback_paise: 'flat_cashback_paise',
};

function mapRewardType(raw: string): AOVRewardType {
  return FRONTEND_REWARD_TYPE_MAP[raw] ?? 'cashback_percent';
}

function autoLabel(rewardType: string, rewardValue: number): string {
  if (rewardType === 'coins' || rewardType === 'flat_coins') return `${rewardValue} coins`;
  if (rewardType === 'discount') return `${rewardValue}% off`;
  return `${rewardValue}% cashback`;
}

// ── Joi validation ────────────────────────────────────────────────────────────
// Accept both frontend shorthand values and canonical model values.

const tierItemSchema = Joi.object({
  spendThresholdPaise: Joi.number().integer().min(1).required(),
  rewardType: Joi.string()
    .valid('coins', 'discount', 'cashback', 'cashback_percent', 'flat_coins', 'flat_cashback_paise')
    .required(),
  rewardValue: Joi.number().min(0).required(),
  // label is optional — auto-generated when absent
  label: Joi.string().max(200).optional(),
});

const createSchema = Joi.object({
  storeId: Joi.string().required(),
  name: Joi.string().min(1).max(100).required(),
  isActive: Joi.boolean().optional(),
  tiers: Joi.array().items(tierItemSchema).min(1).max(5).required(),
  validDays: Joi.array().items(Joi.number().integer().min(0).max(6)).optional(),
  validHourStart: Joi.number().integer().min(0).max(23).optional(),
  validHourEnd: Joi.number().integer().min(0).max(23).optional(),
});

const updateSchema = createSchema.fork(['storeId', 'name', 'tiers'], (field) => field.optional());

function validateAscendingTiers(tiers: { spendThresholdPaise: number }[]): boolean {
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].spendThresholdPaise <= tiers[i - 1].spendThresholdPaise) return false;
  }
  return true;
}

/** Normalise tiers from validated Joi value: map frontend rewardType → canonical, fill label. */
function normalizeTiers(
  tiers: Array<{ spendThresholdPaise: number; rewardType: string; rewardValue: number; label?: string }>,
) {
  return tiers.map((t) => ({
    spendThresholdPaise: t.spendThresholdPaise,
    rewardType: mapRewardType(t.rewardType),
    rewardValue: t.rewardValue,
    label: t.label ?? autoLabel(t.rewardType, t.rewardValue),
  }));
}

// ── GET / — list configs ──────────────────────────────────────────────────────

router.get('/', aovLimiter, async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const filter: Record<string, any> = { merchantId };

    if (req.query.storeId) {
      if (!mongoose.isValidObjectId(req.query.storeId as string)) {
        return res.status(400).json({ success: false, error: 'Invalid storeId' });
      }
      filter.storeId = new mongoose.Types.ObjectId(req.query.storeId as string);
    }

    const configs = await AOVRewardTier.find(filter).sort({ createdAt: -1 }).lean();
    // Frontend reads res.data.data and expects an array directly
    return res.json({ success: true, data: configs });
  } catch (err: any) {
    logger.error('[AOVRewards] GET / failed', { error: err.message });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── GET /active — consumer checkout integration point ─────────────────────────
// NOTE: must be declared before /:id to avoid Express matching 'active' as an id

router.get('/active', aovLimiter, async (req: Request, res: Response) => {
  try {
    const { storeId, amountPaise } = req.query;

    if (!storeId || typeof storeId !== 'string') {
      return res.status(400).json({ success: false, error: 'storeId is required' });
    }
    if (!mongoose.isValidObjectId(storeId)) {
      return res.status(400).json({ success: false, error: 'Invalid storeId' });
    }

    const amount = parseInt(amountPaise as string, 10);
    if (!amountPaise || isNaN(amount) || amount < 0) {
      return res.status(400).json({ success: false, error: 'amountPaise must be a non-negative integer' });
    }

    const result = await getAOVRewardForBill(storeId, amount);

    return res.json({
      success: true,
      data: {
        qualifiedTier: result.qualifiedTier,
        nextTier: result.nextTier,
        amountToNextTierPaise: result.amountToNextTierPaise,
      },
    });
  } catch (err: any) {
    logger.error('[AOVRewards] GET /active failed', { error: err.message });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── POST / — create config ────────────────────────────────────────────────────

router.post('/', aovLimiter, async (req: Request, res: Response) => {
  try {
    const { error, value } = createSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    if (!validateAscendingTiers(value.tiers)) {
      return res.status(400).json({
        success: false,
        error: 'Tiers must be in strictly ascending order by spendThresholdPaise',
      });
    }

    const merchantId = req.merchantId;
    const config = await AOVRewardTier.create({
      ...value,
      merchantId,
      tiers: normalizeTiers(value.tiers),
    });

    logger.info('[AOVRewards] Config created', { merchantId, configId: config._id });
    // Frontend reads res.data.data and expects the config object directly
    return res.status(201).json({ success: true, data: config });
  } catch (err: any) {
    logger.error('[AOVRewards] POST / failed', { error: err.message });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── PUT /:id — update config ──────────────────────────────────────────────────

router.put('/:id', aovLimiter, async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid config id' });
    }

    const { error, value } = updateSchema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    if (value.tiers && !validateAscendingTiers(value.tiers)) {
      return res.status(400).json({
        success: false,
        error: 'Tiers must be in strictly ascending order by spendThresholdPaise',
      });
    }

    const merchantId = req.merchantId;
    const patch = value.tiers ? { ...value, tiers: normalizeTiers(value.tiers) } : value;
    const config = await AOVRewardTier.findOneAndUpdate({ _id: req.params.id, merchantId }, patch, {
      new: true,
      runValidators: true,
    }).lean();

    if (!config) {
      return res.status(404).json({ success: false, error: 'Config not found' });
    }

    logger.info('[AOVRewards] Config updated', { merchantId, configId: req.params.id });
    // Frontend reads res.data.data and expects the config object directly
    return res.json({ success: true, data: config });
  } catch (err: any) {
    logger.error('[AOVRewards] PUT /:id failed', { error: err.message });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ── DELETE /:id — soft delete ─────────────────────────────────────────────────

router.delete('/:id', aovLimiter, async (req: Request, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid config id' });
    }

    const merchantId = req.merchantId;
    const config = await AOVRewardTier.findOneAndUpdate(
      { _id: req.params.id, merchantId },
      { isActive: false },
      { new: true },
    ).lean();

    if (!config) {
      return res.status(404).json({ success: false, error: 'Config not found' });
    }

    logger.info('[AOVRewards] Config deactivated', { merchantId, configId: req.params.id });
    return res.json({ success: true, message: 'Config deactivated' });
  } catch (err: any) {
    logger.error('[AOVRewards] DELETE /:id failed', { error: err.message });
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
