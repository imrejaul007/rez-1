// @ts-nocheck
/**
 * src/routes/trialMerchantRoutes.ts
 * Merchant-facing trial routes: /api/merchant/trials/*
 */

import express from 'express';
import {
  getMerchantTrials,
  createTrial,
  updateTrial,
  scanTrialQR,
  getTrialAnalytics,
} from '../controllers/trialMerchantController';
import { authMiddleware } from '../middleware/merchantauth';
import { validateTrialQR } from '../middleware/trialQR';
import { validate, validateParams, Joi } from '../middleware/validation';

const router = express.Router();

// All routes require merchant authentication
router.use(authMiddleware);

/**
 * GET /api/merchant/trials
 * Fetch merchant's own trial offers
 */
router.get('/', getMerchantTrials);

/**
 * POST /api/merchant/trials
 * Create a new trial offer
 * Body: { name, description, category, images, coinPrice, trialWindowHours, maxDailySlots, terms, merchantLocation }
 */
const createTrialSchema = Joi.object({
  title: Joi.string().required().min(3).max(200),
  category: Joi.string().required(),
  originalPrice: Joi.number().required().min(0),
  trialCoinPrice: Joi.number().required().min(10).max(200),
  commitmentFee: Joi.number().required().valid(9, 19, 29),
  dailySlots: Joi.number().required().min(1).max(1000),
  qrWindowType: Joi.string().optional(),
  qrWindowMinutes: Joi.number().optional().min(5).max(10080),
  images: Joi.array()
    .items(Joi.alternatives().try(Joi.string(), Joi.object({ url: Joi.string().required(), order: Joi.number() })))
    .min(1)
    .required(),
  terms: Joi.string().required().min(3),
  rewardCoins: Joi.number().optional().min(0),
  brandedCoins: Joi.number().optional().min(0),
  brandedCoinLabel: Joi.string().optional().allow(''),
  upsellLinks: Joi.array()
    .items(
      Joi.object({
        title: Joi.string().allow(''),
        url: Joi.string().allow(''),
      }),
    )
    .optional(),
  brandName: Joi.string().optional().allow(''),
  productName: Joi.string().optional().allow(''),
  totalStockUnits: Joi.number().optional(),
  restockDate: Joi.string().optional().allow(''),
}).options({ stripUnknown: true });

router.post('/', validate(createTrialSchema), createTrial);

/**
 * PATCH /api/merchant/trials/:id
 * Update trial status (pause/resume)
 * Body: { status: 'paused' | 'active' }
 */
const updateTrialSchema = Joi.object({
  status: Joi.string().required().valid('paused', 'active'),
});

const trialIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

router.patch('/:id', validateParams(trialIdParamSchema), validate(updateTrialSchema), updateTrial);

/**
 * POST /api/merchant/trials/scan
 * Scan trial QR code to complete trial
 * Middleware: validateTrialQR (verifies JWT token from req.body.qrToken)
 * Body: { qrToken, scanGeo: {lat, lng} }
 */
const scanQRSchema = Joi.object({
  qrToken: Joi.string().required(),
  scanGeo: Joi.object({
    lat: Joi.number(),
    lng: Joi.number(),
    latitude: Joi.number(),
    longitude: Joi.number(),
  }).required(),
});

router.post('/scan', validate(scanQRSchema), validateTrialQR, scanTrialQR);

/**
 * GET /api/merchant/trials/analytics
 * Fetch merchant's aggregate trial analytics
 */
router.get('/analytics', getTrialAnalytics);

/**
 * GET /api/merchant/trials/:id/analytics
 * Fetch per-trial analytics (reuses same handler — trialId filtering TBD)
 */
router.get('/:id/analytics', getTrialAnalytics);

export default router;
