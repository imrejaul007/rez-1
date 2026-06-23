/**
 * src/routes/trialRoutes.ts
 * User-facing trial routes: /api/try/*
 */

import express, { RequestHandler } from 'express';
import {
  getTryFeed,
  bookTrial,
  getTrialHistory,
  getTrialCoins,
  purchaseCoins,
  getTryScore,
  getBundles,
  purchaseBundle,
  getMyBundles,
  getActiveCampaigns,
  joinCampaign,
  getTrialDetails,
  getBookingDetails,
  submitTrialReview,
} from '../controllers/trialController';
import {
  getUserMissions,
  getUserBadges,
  getLeaderboard,
  getSurpriseTrial,
  revealSurpriseTrial,
} from '../controllers/tryGameificationController';
import { authenticate } from '../middleware/auth';
import { validate, validateQuery, validateParams, Joi } from '../middleware/validation';
import { idempotencyMiddleware } from '../middleware/idempotency';
import { asyncHandler } from '../utils/asyncHandler';

const router = express.Router();

/**
 * GET /api/try/feed — PUBLIC (no auth required)
 * Fetch paginated trial offers based on user location
 * Query: ?lat=X&lng=Y
 */
router.get('/feed', getTryFeed);

// All remaining routes require authentication
router.use(authenticate);

/**
 * POST /api/try/book
 * Book a trial offer
 * Body: { trialId, commitmentFeePaymentId, userGeo: {lat, lng} }
 */
const bookTrialSchema = Joi.object({
  trialId: Joi.string().required(),
  commitmentFeePaymentId: Joi.string().required(),
  userGeo: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
  }).required(),
});

router.post('/book', idempotencyMiddleware(), validate(bookTrialSchema), bookTrial);

/**
 * GET /api/try/history
 * Fetch user's trial booking history
 */
router.get('/history', getTrialHistory);

/**
 * GET /api/try/coins
 * Fetch user's trial coin wallet and recent activity
 */
router.get('/coins', getTrialCoins);

/**
 * POST /api/try/coins/purchase
 * Purchase trial coins
 * Body: { packIndex: 0|1|2|3, paymentId }
 */
const purchaseCoinsSchema = Joi.object({
  packIndex: Joi.number().required().min(0).max(3),
  paymentId: Joi.string().required(),
});

router.post('/coins/purchase', validate(purchaseCoinsSchema), purchaseCoins);

/**
 * GET /api/try/score
 * Fetch user's try score and recent scoring activity
 */
router.get('/score', getTryScore);

/**
 * GET /api/try/missions
 * Fetch active missions + user's progress for each
 */
router.get('/missions', getUserMissions);

/**
 * GET /api/try/badges
 * Fetch user's category badges
 */
router.get('/badges', getUserBadges);

/**
 * GET /api/try/leaderboard?city=&period=weekly|monthly|alltime
 * Fetch leaderboard rankings
 */
router.get('/leaderboard', getLeaderboard);

/**
 * GET /api/try/surprise
 * Fetch this week's surprise trial
 */
router.get('/surprise', getSurpriseTrial);

/**
 * POST /api/try/surprise/reveal
 * Reveal this week's surprise trial
 */
router.post('/surprise/reveal', revealSurpriseTrial);

/**
 * GET /api/try/bundles?category=
 * Fetch active trial bundles, optionally filtered by category
 */
const getBundlesSchema = Joi.object({
  category: Joi.string().optional(),
});

router.get('/bundles', validateQuery(getBundlesSchema), getBundles);

/**
 * POST /api/try/bundles/purchase
 * Purchase a trial bundle
 * Body: { bundleId, paymentId }
 */
const purchaseBundleSchema = Joi.object({
  bundleId: Joi.string().required(),
  paymentId: Joi.string().required(),
});

router.post('/bundles/purchase', validate(purchaseBundleSchema), purchaseBundle);

/**
 * GET /api/try/bundles/mine
 * Get user's active bundles
 */
router.get('/bundles/mine', getMyBundles);

/**
 * GET /api/try/campaigns?city=
 * Fetch active discovery campaigns
 */
const getCampaignsSchema = Joi.object({
  city: Joi.string().required(),
});

router.get('/campaigns', validateQuery(getCampaignsSchema), getActiveCampaigns);

/**
 * POST /api/try/campaigns/:id/join
 * Join a discovery campaign
 */
const joinCampaignSchema = Joi.object({
  id: Joi.string().required(),
});

router.post('/campaigns/:id/join', validateParams(joinCampaignSchema), joinCampaign);

/**
 * GET /api/try/bookings/:bookingId
 * Get detailed information about a booking
 */
const getBookingDetailsSchema = Joi.object({
  bookingId: Joi.string().required(),
});

router.get('/bookings/:bookingId', validateParams(getBookingDetailsSchema), getBookingDetails);

/**
 * POST /api/try/bookings/:bookingId/review
 * Submit a star rating + text review for a completed trial.
 * Body: { rating: 1-5, reviewText?: string }
 * Awards 10 ReZ coins on first review submission.
 */
const submitReviewParamsSchema = Joi.object({
  bookingId: Joi.string().required(),
});
const submitReviewBodySchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  reviewText: Joi.string().allow('').max(1000).optional(),
});

router.post(
  '/bookings/:bookingId/review',
  validateParams(submitReviewParamsSchema),
  validate(submitReviewBodySchema),
  submitTrialReview,
);

/**
 * GET /api/try/:trialId
 * Get detailed information about a specific trial
 */
const getTrialDetailsSchema = Joi.object({
  trialId: Joi.string().required(),
});

router.get('/:trialId', validateParams(getTrialDetailsSchema), getTrialDetails);

export default router;
