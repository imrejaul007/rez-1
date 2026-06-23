/**
 * src/controllers/trialController.ts
 * User-facing trial endpoints: feed, bookings, coins, scoring
 */

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  sendUnauthorized,
  sendInternalError,
  sendCreated,
} from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';
import * as crypto from 'crypto';

// Models
import { TrialOffer } from '../models/TrialOffer';
import { Payment } from '../models/Payment';
import { TrialBooking } from '../models/TrialBooking';
import { TrialCoinWallet } from '../models/TrialCoinWallet';
import { TrialCoinLedger } from '../models/TrialCoinLedger';
import { UserTryScore, TryScoreLedger } from '../models/TryScoreLedger';
import { MerchantQualityMetrics } from '../models/MerchantQualityMetrics';

// Services
import tryFeedService from '../services/tryFeedService';
import trialCoinService from '../services/trialCoinService';
import trialFraudService from '../services/trialFraudService';
import trialRewardService from '../services/trialRewardService';

// Middleware utilities
import { signQRToken } from '../middleware/trialQR';

// Redis caching
import redisService from '../services/redisService';
import { CacheTTL } from '../config/redis';

/**
 * GET /api/try/feed
 * Fetch paginated list of trial offers for user at given location
 * Query: ?lat=X&lng=Y
 * Cached: 2 minutes per city (geo-cell based)
 */
export const getTryFeed = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return sendBadRequest(res, 'Latitude and longitude are required');
  }

  try {
    const userGeo = {
      lat: parseFloat(lat as string),
      lng: parseFloat(lng as string),
    };

    // Validate coordinates
    if (isNaN(userGeo.lat) || isNaN(userGeo.lng)) {
      return sendBadRequest(res, 'Invalid latitude or longitude');
    }

    if (userGeo.lat < -90 || userGeo.lat > 90 || userGeo.lng < -180 || userGeo.lng > 180) {
      return sendBadRequest(res, 'Coordinates out of valid range');
    }

    // Generate cache key based on geolocation (quantized to ~5km cells for cache reuse)
    const geoCell = `${Math.floor(userGeo.lat * 1000) / 1000}_${Math.floor(userGeo.lng * 1000) / 1000}`;
    const cacheKey = `trials:feed:${geoCell}`;

    // Try cache first
    let trials = await redisService.get<any[]>(cacheKey).catch(() => null);
    if (trials) {
      logger.info('[TRIAL FEED] Cache hit', { userId, geoCell, trialsCount: trials.length });
      return sendSuccess(res, {
        success: true,
        trials,
        count: trials.length,
        cached: true,
      });
    }

    // Cache miss — fetch from service
    const userIdObj = new Types.ObjectId(userId);
    trials = await tryFeedService.getFeedForUser(userIdObj, userGeo);

    // Cache for 2 minutes (short TTL for location-based data freshness)
    await redisService
      .set(cacheKey, trials, 120)
      .catch((err) => logger.warn('[TRIAL FEED] Cache set failed:', err.message));

    logger.info('[TRIAL CONTROLLER] Feed fetched', {
      userId,
      trialsCount: trials.length,
      userGeo,
      cached: false,
    });

    return sendSuccess(res, {
      success: true,
      trials,
      count: trials.length,
      cached: false,
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error fetching feed: ' + error.message);
    throw new AppError('Failed to fetch trial feed', 500);
  }
});

// BUG FIX #5 & #3: Trial booking state machine and payment verification
// Valid booking transitions: active → completed | cancelled | no_show | expired
const TRIAL_BOOKING_VALID_TRANSITIONS: Record<string, string[]> = {
  active: ['completed', 'cancelled', 'no_show', 'expired'],
  completed: [],
  cancelled: [],
  no_show: [],
  expired: [],
};

/**
 * POST /api/try/book
 * Book a trial offer
 * Body: { trialId, commitmentFeePaymentId, userGeo: {lat, lng} }
 */
export const bookTrial = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { trialId, commitmentFeePaymentId, userGeo } = req.body;

  if (!trialId || !commitmentFeePaymentId || !userGeo) {
    return sendBadRequest(res, 'trialId, commitmentFeePaymentId, and userGeo are required');
  }

  if (!userGeo.lat || !userGeo.lng) {
    return sendBadRequest(res, 'User geolocation is required');
  }

  try {
    // 1. Check trial exists and is active
    const trial = await TrialOffer.findById(trialId);
    if (!trial) {
      return sendNotFound(res, 'Trial not found');
    }

    if (trial.status !== 'active') {
      return sendBadRequest(res, 'This trial is not currently available for booking');
    }

    // 2. Run fraud check
    const userIdObj = new Types.ObjectId(userId);
    const trialIdObj = new Types.ObjectId(trialId);
    const merchantIdObj = trial.merchantId;
    const fraudResult = await trialFraudService.checkBookingFraud(userIdObj, trialIdObj, merchantIdObj, userGeo);

    if (!fraudResult.allowed) {
      logger.warn('[TRIAL CONTROLLER] Fraud detected during booking', {
        userId,
        trialId,
        signals: fraudResult.signals,
      });
      return sendBadRequest(
        res,
        `Booking could not be processed: ${fraudResult.signals.join(', ') || 'fraud check failed'}`,
      );
    }

    // 3. Check user has enough coins
    const wallet = await TrialCoinWallet.findOne({ userId: userIdObj }).lean();
    const balance = wallet?.balance ?? 0;

    if (balance < trial.coinPrice) {
      return sendBadRequest(res, `Insufficient trial coins. Required: ${trial.coinPrice}, Available: ${balance}`);
    }

    // 4. Verify commitment fee payment was completed
    // BUG FIX #5: Payment verification must happen BEFORE coin credit
    if (!commitmentFeePaymentId) {
      return sendBadRequest(res, 'Valid payment is required');
    }

    // Verify the payment exists and is completed
    const payment = await Payment.findOne({
      paymentId: commitmentFeePaymentId,
      user: userIdObj,
      status: 'completed',
    });

    if (!payment) {
      return sendBadRequest(res, 'Payment not found or not completed. Please retry or use a different payment.');
    }

    // Additional verification: ensure payment amount matches commitment fee
    if (payment.amount < trial.commitmentFee) {
      logger.warn('[TRIAL CONTROLLER] Payment amount mismatch', {
        userId,
        trialId,
        paymentAmount: payment.amount,
        requiredAmount: trial.commitmentFee,
      });
      return sendBadRequest(res, 'Payment amount does not match commitment fee');
    }

    // VIKTOR: concurrency fix — QR code double-redemption race condition
    // Multiple concurrent scans of same QR can cause double coin deduction
    // Solution: Use MongoDB session + atomic update to prevent duplicate bookings for same user+trial

    const qrWindowMinutes = trial.slotConfig.qrWindowMinutes || 60;
    const qrExpiresAt = new Date(Date.now() + qrWindowMinutes * 60 * 1000);

    // VIKTOR: atomic booking creation with idempotency check
    // Prevent double-booking same trial by same user using compound unique constraint
    // If booking already exists for this user+trial combination, return existing booking instead
    let booking: any;
    try {
      booking = await TrialBooking.create({
        userId: userIdObj,
        trialId: trialIdObj,
        merchantId: trial.merchantId,
        status: 'active',
        commitmentFeePaid: trial.commitmentFee,
        commitmentFeePaymentId,
        geoAtBooking: userGeo,
        qrHash: crypto.randomBytes(16).toString('hex'),
        qrExpiresAt,
        fraudSignals: [],
        rewardCredited: false,
        upsellShown: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (dupError: any) {
      // E11000 duplicate key error — this booking already exists
      if (dupError?.code === 11000 && dupError?.keyPattern?.userId && dupError?.keyPattern?.trialId) {
        logger.warn('[TRIAL BOOKING] Duplicate booking detected for user+trial (idempotent):', {
          userId,
          trialId,
          error: dupError.message,
        });
        // Fetch existing booking instead
        booking = await TrialBooking.findOne({
          userId: userIdObj,
          trialId: trialIdObj,
          status: 'active',
        });
        if (!booking) {
          throw new AppError('Failed to retrieve existing booking', 500);
        }
      } else {
        throw dupError;
      }
    }

    // Deduct coins (with idempotency: only deduct if not already deducted for this booking)
    await trialCoinService.deductCoins(userIdObj, trial.coinPrice, (booking._id as Types.ObjectId).toString());

    // 6. Sign QR JWT with trial window expiry
    const geoHash = `${Math.round(userGeo.lat * 10000)}:${Math.round(userGeo.lng * 10000)}`; // simplified geohash
    const qrToken = signQRToken({
      bookingId: (booking._id as Types.ObjectId).toString(),
      userId,
      merchantId: trial.merchantId.toString(),
      trialId: trialIdObj.toString(),
      expiresAt: qrExpiresAt.getTime(),
      geoHash,
    });

    logger.info('[TRIAL CONTROLLER] Trial booked successfully', {
      userId,
      trialId,
      bookingId: booking._id,
    });

    return sendCreated(res, {
      success: true,
      booking: {
        _id: booking._id,
        trialId: booking.trialId,
        status: booking.status,
        createdAt: booking.createdAt,
        qrExpiresAt: qrExpiresAt,
      },
      qrToken,
      coinsDeducted: trial.coinPrice,
      message: 'Trial booked successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error booking trial: ' + error.message);
    throw new AppError('Failed to book trial', 500);
  }
});

/**
 * GET /api/try/history
 * Fetch user's trial booking history
 */
export const getTrialHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const userIdObj = new Types.ObjectId(userId);

    const bookings = await TrialBooking.find({ userId: userIdObj }).populate('trialId').sort({ bookingDate: -1 });

    logger.info('[TRIAL CONTROLLER] History fetched', {
      userId,
      bookingCount: bookings.length,
    });

    return sendSuccess(res, {
      success: true,
      bookings,
      count: bookings.length,
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error fetching history: ' + error.message);
    throw new AppError('Failed to fetch trial history', 500);
  }
});

/**
 * GET /api/try/coins
 * Get trial coin wallet balance and details
 */
export const getTrialCoins = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const userIdObj = new Types.ObjectId(userId);

    const wallet = await trialCoinService.getWallet(userIdObj);

    // Fetch recent ledger entries
    const ledgerEntries = await TrialCoinLedger.find({ userId: userIdObj }).sort({ createdAt: -1 }).limit(20).lean();

    // Sort expiry buckets by expiration date
    const expiryBuckets = wallet.expiryBuckets.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

    logger.info('[TRIAL CONTROLLER] Coins fetched', {
      userId,
      balance: wallet.balance,
    });

    return sendSuccess(res, {
      success: true,
      wallet: {
        balance: wallet.balance,
        totalEarned: wallet.totalEarned,
        totalSpent: wallet.totalSpent,
        expiryBuckets,
        lastUpdated: wallet.lastUpdated,
      },
      recentActivity: ledgerEntries,
      message: 'Wallet details fetched successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error fetching coins: ' + error.message);
    throw new AppError('Failed to fetch trial coins', 500);
  }
});

/**
 * POST /api/try/coins/purchase
 * Purchase trial coins
 * Body: { packIndex: 0|1|2|3, paymentId }
 */
export const purchaseCoins = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { packIndex, paymentId } = req.body;

  if (packIndex === undefined || !paymentId) {
    return sendBadRequest(res, 'packIndex and paymentId are required');
  }

  if (typeof packIndex !== 'number' || packIndex < 0 || packIndex > 3) {
    return sendBadRequest(res, 'packIndex must be 0, 1, 2, or 3');
  }

  try {
    const userIdObj = new Types.ObjectId(userId);

    // Define purchase packs
    const PURCHASE_PACKS = [
      { coins: 60, price: 49, expiryDays: 60 },
      { coins: 140, price: 99, expiryDays: 60 },
      { coins: 320, price: 199, expiryDays: 60 },
      { coins: 700, price: 399, expiryDays: 60 },
    ];

    const pack = PURCHASE_PACKS[packIndex];

    await trialCoinService.purchaseCoins(userIdObj, packIndex as any, paymentId);

    const newBalance = await trialCoinService.getBalance(userIdObj);

    logger.info('[TRIAL CONTROLLER] Coins purchased', {
      userId,
      packIndex,
      coinsPurchased: pack.coins,
      expiresIn: pack.expiryDays,
    });

    return sendCreated(res, {
      success: true,
      purchase: {
        paymentId,
        coinsPurchased: pack.coins,
        price: pack.price,
        expiryDays: pack.expiryDays,
        newBalance,
      },
      message: 'Coins purchased successfully',
    });
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('not exists')) {
      return sendNotFound(res, 'Payment not found or already processed');
    }
    logger.error('[TRIAL CONTROLLER] Error purchasing coins: ' + error.message);
    throw new AppError('Failed to purchase coins', 500);
  }
});

/**
 * GET /api/try/score
 * Get user's try score and recent scoring activity
 */
export const getTryScore = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const userIdObj = new Types.ObjectId(userId);

    // Fetch user score
    const userScore = await UserTryScore.findOne({ userId: userIdObj }).lean();

    // Fetch recent ledger entries
    const ledgerEntries = await TryScoreLedger.find({ userId: userIdObj }).sort({ createdAt: -1 }).limit(20).lean();

    logger.info('[TRIAL CONTROLLER] Score fetched', {
      userId,
      score: userScore?.totalScore || 0,
    });

    return sendSuccess(res, {
      success: true,
      score: userScore
        ? {
            totalScore: userScore.totalScore,
            tier: userScore.tier,
            categoriesTried: userScore.categoriesTried,
            merchantsDiscovered: userScore.merchantsDiscovered,
            currentStreak: userScore.currentStreak,
            lastTrialDate: userScore.lastTrialDate,
          }
        : {
            totalScore: 0,
            tier: 'curious',
            categoriesTried: [],
            merchantsDiscovered: [],
            currentStreak: 0,
            lastTrialDate: null,
          },
      recentActivity: ledgerEntries,
      message: 'Try score fetched successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error fetching score: ' + error.message);
    throw new AppError('Failed to fetch try score', 500);
  }
});

/**
 * GET /api/try/bundles?category=
 * Fetch active trial bundles, optionally filtered by category
 */
export const getBundles = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.query;

  try {
    const trialBundleService = await import('../services/trialBundleService').then((m) => m.default);

    const bundles = await trialBundleService.getBundles(category as string | undefined);

    logger.info('[TRIAL CONTROLLER] Bundles fetched', {
      count: bundles.length,
      category: category || 'all',
    });

    return sendSuccess(res, {
      success: true,
      bundles,
      count: bundles.length,
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error fetching bundles: ' + error.message);
    throw new AppError('Failed to fetch bundles', 500);
  }
});

/**
 * POST /api/try/bundles/purchase
 * Purchase a trial bundle
 * Body: { bundleId, paymentId }
 */
export const purchaseBundle = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { bundleId, paymentId } = req.body;

  if (!bundleId || !paymentId) {
    return sendBadRequest(res, 'bundleId and paymentId are required');
  }

  try {
    const userIdObj = new Types.ObjectId(userId);
    const bundleIdObj = new Types.ObjectId(bundleId);

    const trialBundleService = await import('../services/trialBundleService').then((m) => m.default);
    const purchase = await trialBundleService.purchaseBundle(userIdObj, bundleIdObj, paymentId);

    logger.info('[TRIAL CONTROLLER] Bundle purchased', {
      userId,
      bundleId,
      purchaseId: (purchase._id as Types.ObjectId).toString(),
    });

    return sendCreated(res, {
      success: true,
      purchase: {
        _id: purchase._id as Types.ObjectId,
        bundleId: purchase.bundleId,
        amountPaid: purchase.amountPaid,
        trialSlotsTotal: purchase.trialSlotsTotal,
        trialCoinsGranted: purchase.trialCoinsGranted,
        expiresAt: purchase.expiresAt,
        status: purchase.status,
      },
      message: 'Bundle purchased successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error purchasing bundle: ' + error.message);
    if (error.message.includes('not found') || error.message.includes('not available')) {
      return sendBadRequest(res, error.message);
    }
    throw new AppError('Failed to purchase bundle', 500);
  }
});

/**
 * GET /api/try/bundles/mine
 * Get user's active bundles
 */
export const getMyBundles = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const userIdObj = new Types.ObjectId(userId);

    const trialBundleService = await import('../services/trialBundleService').then((m) => m.default);
    const bundles = await trialBundleService.getUserBundles(userIdObj);

    logger.info('[TRIAL CONTROLLER] User bundles fetched', {
      userId,
      count: bundles.length,
    });

    return sendSuccess(res, {
      success: true,
      bundles,
      count: bundles.length,
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error fetching user bundles: ' + error.message);
    throw new AppError('Failed to fetch your bundles', 500);
  }
});

/**
 * GET /api/try/campaigns?city=
 * Fetch active discovery campaigns
 */
export const getActiveCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const { city } = req.query;

  if (!city) {
    return sendBadRequest(res, 'city query parameter is required');
  }

  try {
    const campaignService = await import('../services/campaignService').then((m) => m.default);
    const campaigns = await campaignService.getActiveCampaigns(city as string);

    logger.info('[TRIAL CONTROLLER] Active campaigns fetched', {
      city,
      count: campaigns.length,
    });

    return sendSuccess(res, {
      success: true,
      campaigns,
      count: campaigns.length,
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error fetching campaigns: ' + error.message);
    throw new AppError('Failed to fetch campaigns', 500);
  }
});

/**
 * POST /api/try/campaigns/:id/join
 * Join a discovery campaign
 */
export const joinCampaign = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  if (!id) {
    return sendBadRequest(res, 'Campaign ID is required');
  }

  try {
    const userIdObj = new Types.ObjectId(userId);
    const campaignIdObj = new Types.ObjectId(id);

    const campaignService = await import('../services/campaignService').then((m) => m.default);
    const participation = await campaignService.joinCampaign(userIdObj, campaignIdObj);

    logger.info('[TRIAL CONTROLLER] Campaign joined', {
      userId,
      campaignId: id,
      participationId: (participation._id as Types.ObjectId).toString(),
    });

    return sendCreated(res, {
      success: true,
      participation: {
        _id: participation._id as Types.ObjectId,
        campaignId: participation.campaignId,
        currentCount: participation.currentCount,
        completed: participation.completed,
        joinedAt: participation.joinedAt,
      },
      message: 'Joined campaign successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error joining campaign: ' + error.message);
    if (error.message.includes('not found')) {
      return sendNotFound(res, 'Campaign not found');
    }
    throw new AppError('Failed to join campaign', 500);
  }
});

/**
 * GET /api/try/:trialId
 * Get detailed information about a specific trial offer
 * Params: trialId
 */
export const getTrialDetails = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { trialId } = req.params;

  try {
    const trialObjectId = new Types.ObjectId(trialId);
    const trial = await TrialOffer.findById(trialObjectId).populate('merchant', 'name image').lean();

    if (!trial) {
      return sendNotFound(res, 'Trial offer not found');
    }

    logger.info('[TRIAL CONTROLLER] Trial details fetched', { trialId, userId });

    return sendSuccess(res, {
      success: true,
      data: trial,
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error fetching trial details: ' + error.message);
    if (error.name === 'CastError') {
      return sendNotFound(res, 'Invalid trial ID');
    }
    throw new AppError('Failed to fetch trial details', 500);
  }
});

/**
 * GET /api/try/bookings/:bookingId
 * Get detailed information about a specific booking
 * Params: bookingId
 */
export const getBookingDetails = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { bookingId } = req.params;

  try {
    const bookingObjectId = new Types.ObjectId(bookingId);
    const booking = await TrialBooking.findById(bookingObjectId)
      .populate('trial', 'title merchant price')
      .populate('merchant', 'name image')
      .lean();

    if (!booking) {
      return sendNotFound(res, 'Booking not found');
    }

    // Verify user owns this booking
    if (booking.userId.toString() !== userId) {
      return sendUnauthorized(res, 'You do not have access to this booking');
    }

    logger.info('[TRIAL CONTROLLER] Booking details fetched', { bookingId, userId });

    return sendSuccess(res, {
      success: true,
      data: booking,
    });
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error fetching booking details: ' + error.message);
    if (error.name === 'CastError') {
      return sendNotFound(res, 'Invalid booking ID');
    }
    throw new AppError('Failed to fetch booking details', 500);
  }
});

/**
 * POST /api/try/bookings/:bookingId/review
 * Submit a review for a completed trial booking.
 * Body: { rating: 1-5, reviewText: string }
 * Awards a small ReZ coin bonus (10 coins) as a thank-you for reviewing.
 */
export const submitTrialReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { bookingId } = req.params;
  const { rating, reviewText } = req.body;

  // Validate rating range
  if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return sendBadRequest(res, 'Rating must be a number between 1 and 5');
  }

  try {
    const bookingObjectId = new Types.ObjectId(bookingId);
    const booking = await TrialBooking.findById(bookingObjectId);

    if (!booking) {
      return sendNotFound(res, 'Booking not found');
    }

    // Verify user owns this booking
    if (booking.userId.toString() !== userId) {
      return sendUnauthorized(res, 'You do not have access to this booking');
    }

    // Only completed trials can be reviewed
    if (booking.status !== 'completed') {
      return sendBadRequest(res, 'Only completed trials can be reviewed');
    }

    // Prevent duplicate reviews
    if (booking.reviewedAt) {
      return sendBadRequest(res, 'You have already reviewed this trial');
    }

    // Persist the review on the booking document
    const REVIEW_COIN_REWARD = 10;
    booking.rating = Math.round(rating);
    booking.reviewText = (reviewText || '').trim().slice(0, 1000);
    booking.reviewedAt = new Date();
    booking.reviewCoinsAwarded = REVIEW_COIN_REWARD;
    await booking.save();

    // Update aggregate rating on the TrialOffer
    await TrialOffer.updateOne(
      { _id: booking.trialId },
      {
        $inc: { ratingSum: Math.round(rating), ratingCount: 1 },
      },
    );

    // Award review coins via trialRewardService (best-effort, non-blocking)
    try {
      await (trialRewardService as any).awardCoins(
        userId,
        REVIEW_COIN_REWARD,
        `Review reward for booking ${bookingId}`,
      );
    } catch (rewardErr) {
      // Non-fatal: log but don't fail the review submission
      logger.warn('[TRIAL CONTROLLER] Review coin award failed (non-fatal):', rewardErr);
    }

    // Award explorer score points for giving a review (best-effort)
    try {
      const { UserTryScore: ScoreModel } = await import('../models/TryScoreLedger');
      await ScoreModel.updateOne(
        { userId: new Types.ObjectId(userId) },
        { $inc: { 'stats.reviewsGiven': 1, score: 5 } },
        { upsert: false },
      );
    } catch {
      // Non-fatal
    }

    logger.info('[TRIAL CONTROLLER] Review submitted', { bookingId, userId, rating });

    return sendSuccess(res, { coinsEarned: REVIEW_COIN_REWARD }, 'Review submitted successfully');
  } catch (error: any) {
    logger.error('[TRIAL CONTROLLER] Error submitting review: ' + error.message);
    if (error.name === 'CastError') {
      return sendNotFound(res, 'Invalid booking ID');
    }
    throw new AppError('Failed to submit review', 500);
  }
});
