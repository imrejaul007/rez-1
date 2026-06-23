// @ts-nocheck
/**
 * src/routes/trialAdminRoutes.ts
 * Admin-facing trial routes: /api/admin/trials/*
 */

import express from 'express';
import {
  getPendingTrials,
  approveRejectTrial,
  getFraudAlerts,
  coinGovernor,
  getGovernorStatus,
  getBreakageStats,
  createCampaign,
  createDiscoveryCampaign,
  listDiscoveryCampaigns,
  listBundles,
  createBundle,
  updateBundle,
  deleteBundle,
} from '../controllers/trialAdminController';
import { authenticate, requireAdmin, requireSeniorAdmin } from '../middleware/auth';
import { validate, validateParams, Joi } from '../middleware/validation';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/trials/pending
 * Fetch all pending trial offers awaiting approval
 */
router.get('/pending', getPendingTrials);

/**
 * POST /api/admin/trials/:id/approve
 * Approve or reject a trial offer
 * Body: { approved: boolean, reason?: string }
 */
const approveRejectSchema = Joi.object({
  approved: Joi.boolean().required(),
  reason: Joi.string().optional().max(500),
});

const trialIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

router.post('/:id/approve', validateParams(trialIdParamSchema), validate(approveRejectSchema), approveRejectTrial);

/**
 * GET /api/admin/trials/fraud-alerts
 * Fetch bookings with fraud signals
 * Query: ?page=1&limit=20
 */
router.get('/fraud-alerts', getFraudAlerts);

/**
 * GET /api/admin/coins/breakage
 * Fetch trial coin breakage statistics
 * BED-017: added requireSeniorAdmin middleware
 */
router.get('/coins/breakage', requireSeniorAdmin, getBreakageStats);

/**
 * POST /api/admin/coins/governor
 * Execute trial coin governor action
 * Body: { action: 'pause_bookings'|'pause_purchases'|'reduce_exposure'|'freeze_merchant'|'unfreeze_merchant'|'clawback', params: {} }
 * BED-017: added requireSeniorAdmin middleware
 */
const governorSchema = Joi.object({
  action: Joi.string()
    .required()
    .valid(
      ...([
        'pause_bookings',
        'pause_purchases',
        'reduce_exposure',
        'freeze_merchant',
        'unfreeze_merchant',
        'clawback',
      ] as const),
    ),
  params: Joi.object().optional(),
});

router.post('/coins/governor', requireSeniorAdmin, validate(governorSchema), coinGovernor);

/**
 * GET /api/admin/trials/coins/governor/status
 * Fetch current coin governor state (pause flags, frozen merchants, coin economy stats)
 * BED-017: added requireSeniorAdmin middleware
 */
router.get('/coins/governor/status', requireSeniorAdmin, getGovernorStatus);

/**
 * POST /api/admin/campaigns
 * Create a trial campaign (boost)
 * Body: { trialId, boostValue: number (0-2), endsAt: Date }
 */
const campaignSchema = Joi.object({
  trialId: Joi.string().required(),
  boostValue: Joi.number().required().min(0).max(2),
  endsAt: Joi.date().optional(),
});

router.post('/campaigns', validate(campaignSchema), createCampaign);

/**
 * POST /api/admin/try/campaigns
 * Create a discovery campaign
 * Body: { title, subtitle, type, targetCategory?, targetCity?, targetTrialCount, rewardCoins, rewardTryCoins, bonusBadge?, bannerImage?, startsAt, endsAt }
 */
const createDiscoveryCampaignSchema = Joi.object({
  title: Joi.string().required().max(100),
  subtitle: Joi.string().required().max(200),
  type: Joi.string().required().valid('mission_sprint', 'festival', 'category_push'),
  targetCategory: Joi.string().optional(),
  targetCity: Joi.string().optional(),
  targetTrialCount: Joi.number().required().min(1),
  rewardCoins: Joi.number().required().min(0),
  rewardTryCoins: Joi.number().required().min(0),
  bonusBadge: Joi.string().optional(),
  bannerImage: Joi.string().optional(),
  startsAt: Joi.date().required(),
  endsAt: Joi.date().required(),
});

router.post('/try/campaigns', validate(createDiscoveryCampaignSchema), createDiscoveryCampaign);

/**
 * GET /api/admin/try/campaigns
 * List all campaigns with optional filters
 * Query: ?isActive=true|false&city=
 */
router.get('/try/campaigns', listDiscoveryCampaigns);

/**
 * GET /api/admin/try/bundles
 * List all trial bundles
 */
router.get('/try/bundles', listBundles);

/**
 * POST /api/admin/try/bundles
 * Create a new trial bundle
 * Body: { name, description, slug, bundleType, price, originalPrice, trialCoinsIncluded, bonusRewardCoins, trialSlots, validityDays, eligibleCategories?, category?, featured?, sortOrder? }
 */
const createBundleSchema = Joi.object({
  name: Joi.string().required().max(100),
  description: Joi.string().required().max(500),
  slug: Joi.string().required().lowercase(),
  bundleType: Joi.string().required().valid('pass', 'pack'),
  price: Joi.number().required().min(0),
  originalPrice: Joi.number().required().min(0),
  trialCoinsIncluded: Joi.number().optional().min(0),
  bonusRewardCoins: Joi.number().optional().min(0),
  trialSlots: Joi.number().required().min(1),
  validityDays: Joi.number().required().min(1),
  eligibleCategories: Joi.array().items(Joi.string()).optional(),
  category: Joi.string().optional(),
  maxUsesPerMerchant: Joi.number().optional().min(1),
  featured: Joi.boolean().optional(),
  sortOrder: Joi.number().optional(),
});

router.post('/try/bundles', validate(createBundleSchema), createBundle);

/**
 * PATCH /api/admin/try/bundles/:id
 * Update a trial bundle
 * Body: { isActive?, featured?, sortOrder? }
 */
const updateBundleSchema = Joi.object({
  name: Joi.string().optional().max(100),
  description: Joi.string().optional().max(500),
  bundleType: Joi.string().optional().valid('pass', 'pack'),
  price: Joi.number().optional().min(0),
  originalPrice: Joi.number().optional().min(0),
  trialCoinsIncluded: Joi.number().optional().min(0),
  bonusRewardCoins: Joi.number().optional().min(0),
  trialSlots: Joi.number().optional().min(1),
  validityDays: Joi.number().optional().min(1),
  category: Joi.string().optional().allow(null, ''),
  maxUsesPerMerchant: Joi.number().optional().min(1),
  isActive: Joi.boolean().optional(),
  featured: Joi.boolean().optional(),
  sortOrder: Joi.number().optional(),
});

const bundleIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

router.patch('/try/bundles/:id', validateParams(bundleIdParamSchema), validate(updateBundleSchema), updateBundle);

/**
 * DELETE /api/admin/try/bundles/:id
 * Delete a trial bundle
 */
router.delete('/try/bundles/:id', validateParams(bundleIdParamSchema), deleteBundle);

export default router;
