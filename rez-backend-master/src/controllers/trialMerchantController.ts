/**
 * src/controllers/trialMerchantController.ts
 * Merchant-facing trial endpoints: create offers, scan QR, analytics
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
  sendForbidden,
} from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

// Models
import { TrialOffer, ITrialOffer } from '../models/TrialOffer';
import { TrialBooking } from '../models/TrialBooking';
import { MerchantQualityMetrics } from '../models/MerchantQualityMetrics';

// Services
import trialFraudService from '../services/trialFraudService';
import trialRewardService from '../services/trialRewardService';
import merchantNotificationService from '../services/merchantNotificationService';

// Middleware utilities
import { QRTokenPayload } from '../middleware/trialQR';

/**
 * GET /api/merchant/trials
 * Fetch merchant's own trial offers
 */
export const getMerchantTrials = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;

  try {
    const merchantIdObj = new Types.ObjectId(merchantId);

    const trials = await TrialOffer.find({ merchantId: merchantIdObj }).sort({ createdAt: -1 }).limit(200);

    logger.info('[TRIAL MERCHANT CONTROLLER] Trials fetched', {
      merchantId,
      trialCount: trials.length,
    });

    // Map backend model fields to frontend TrialOffer shape
    return sendSuccess(res, {
      success: true,
      trials: trials.map((t) => ({
        _id: t._id,
        merchantId: t.merchantId,
        title: t.title,
        category: t.category,
        originalPrice: t.originalPrice,
        trialCoinPrice: t.coinPrice,
        commitmentFee: t.commitmentFee,
        dailySlots: t.slotConfig?.dailySlots ?? 0,
        qrWindowType: t.slotConfig?.windowType ?? 'relative',
        qrWindowMinutes: t.slotConfig?.qrWindowMinutes ?? 30,
        images: (t.images || []).map((url, i) => ({ url, order: i })),
        terms: t.terms || '',
        rewardCoins: t.rewardConfig?.rezCoins ?? 0,
        brandedCoins: t.rewardConfig?.brandedCoins ?? 0,
        brandedCoinLabel: t.rewardConfig?.brandedCoinLabel || '',
        upsellLinks: t.upsellLinks || [],
        status: t.status,
        rejectionReason: (t as any).rejectionReason || undefined,
        bookingsToday: t.totalBookings,
        completionRate: t.totalBookings > 0
          ? Math.round((t.totalCompletions / t.totalBookings) * 100)
          : 0,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      count: trials.length,
    });
  } catch (error: any) {
    logger.error('[TRIAL MERCHANT CONTROLLER] Error fetching trials: ' + error.message);
    throw new AppError('Failed to fetch trials', 500);
  }
});

/**
 * POST /api/merchant/trials
 * Create a new trial offer
 * Body: full TrialOffer fields (status always starts as 'pending_approval')
 */
export const createTrial = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;
  const body = req.body;

  // Accept both backend model field names and frontend field names
  const title = body.title || body.name;
  const category = body.category;
  const originalPrice = body.originalPrice;
  const coinPrice = body.trialCoinPrice ?? body.coinPrice;
  const commitmentFee = body.commitmentFee;
  const dailySlots = body.dailySlots ?? body.slotConfig?.dailySlots ?? 10;
  const qrWindowMinutes = body.qrWindowMinutes ?? body.slotConfig?.qrWindowMinutes ?? 60;
  const qrWindowType = body.qrWindowType ?? body.slotConfig?.windowType ?? 'relative';
  const rewardCoins = body.rewardCoins ?? body.rewardConfig?.rezCoins;
  const brandedCoins = body.brandedCoins ?? body.rewardConfig?.brandedCoins ?? 0;
  const brandedCoinLabel = body.brandedCoinLabel ?? body.rewardConfig?.brandedCoinLabel ?? '';
  const terms = body.terms;
  const upsellLinks = body.upsellLinks;
  // images: frontend sends TrialImage[] ({url, order}) or string[]
  const rawImages = body.images || [];
  const images = rawImages.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean);

  // Validate required fields
  if (!title || !category || !coinPrice || !commitmentFee || !originalPrice) {
    return sendBadRequest(res, 'title, category, coinPrice, commitmentFee, and originalPrice are required');
  }

  // Validate coin price range
  if (typeof coinPrice !== 'number' || coinPrice < 10 || coinPrice > 200) {
    return sendBadRequest(res, 'coinPrice must be between 10 and 200');
  }

  // Validate commitment fee
  if (![9, 19, 29].includes(commitmentFee)) {
    return sendBadRequest(res, 'commitmentFee must be 9, 19, or 29');
  }

  // Validate images
  if (!images || images.length === 0) {
    return sendBadRequest(res, 'At least one image is required');
  }

  // Validate terms
  if (!terms || typeof terms !== 'string' || terms.trim().length === 0) {
    return sendBadRequest(res, 'Terms and conditions are required');
  }

  // Map window type from frontend labels to model enum
  const windowTypeMap: Record<string, string> = {
    '30min': 'relative', '2hours': 'relative', 'Fixed': 'fixed', 'Auto': 'auto',
  };

  try {
    const merchantIdObj = new Types.ObjectId(merchantId);

    const trial = await TrialOffer.create({
      merchantId: merchantIdObj,
      title,
      category: category.toLowerCase().replace(/ /g, '_'),
      images,
      coinPrice,
      commitmentFee,
      originalPrice,
      slotConfig: {
        dailySlots,
        qrWindowMinutes,
        windowType: windowTypeMap[qrWindowType] || 'relative',
      },
      rewardConfig: {
        rezCoins: rewardCoins ?? Math.floor(coinPrice * 0.5),
        brandedCoins,
        brandedCoinLabel,
      },
      upsellLinks: upsellLinks || [],
      terms,
      status: 'pending_approval',
      campaignBoost: 0,
      freshnessBoostedUntil: new Date(),
      totalBookings: 0,
      totalCompletions: 0,
      avgRating: 0,
    });

    logger.info('[TRIAL MERCHANT CONTROLLER] Trial created', {
      merchantId,
      trialId: trial._id,
      status: trial.status,
    });

    return sendCreated(res, {
      success: true,
      trial: {
        _id: trial._id,
        title: trial.title,
        status: trial.status,
        coinPrice: trial.coinPrice,
        category: trial.category,
        createdAt: trial.createdAt,
      },
      message: 'Trial offer created successfully. Awaiting admin approval.',
    });
  } catch (error: any) {
    logger.error('[TRIAL MERCHANT CONTROLLER] Error creating trial: ' + error.message);
    throw new AppError('Failed to create trial', 500);
  }
});

/**
 * PATCH /api/merchant/trials/:id
 * Update trial status (merchant can only pause/resume own active trials)
 * Body: { status: 'paused' | 'active' }
 */
export const updateTrial = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['paused', 'active'].includes(status)) {
    return sendBadRequest(res, 'status must be "paused" or "active"');
  }

  try {
    const merchantIdObj = new Types.ObjectId(merchantId);
    const trialId = new Types.ObjectId(id);

    const trial = await TrialOffer.findById(trialId);

    if (!trial) {
      return sendNotFound(res, 'Trial not found');
    }

    // Verify merchant owns this trial
    if (trial.merchantId.toString() !== merchantId) {
      return sendForbidden(res, 'You do not have permission to modify this trial');
    }

    // Merchant can only pause active trials or resume paused trials
    if (trial.status !== 'active' && trial.status !== 'paused') {
      return sendBadRequest(res, 'Only active or paused trials can be toggled');
    }

    trial.status = status as any;
    trial.updatedAt = new Date();
    await trial.save();

    logger.info('[TRIAL MERCHANT CONTROLLER] Trial updated', {
      merchantId,
      trialId,
      newStatus: status,
    });

    return sendSuccess(res, {
      success: true,
      trial: {
        _id: trial._id,
        title: trial.title,
        status: trial.status,
        updatedAt: trial.updatedAt,
      },
      message: `Trial ${status} successfully`,
    });
  } catch (error: any) {
    logger.error('[TRIAL MERCHANT CONTROLLER] Error updating trial: ' + error.message);
    throw new AppError('Failed to update trial', 500);
  }
});

/**
 * POST /api/merchant/trials/scan
 * Scan trial QR code to complete trial
 * Uses validateTrialQR middleware to verify token
 * Body: { qrToken, scanGeo: {lat, lng} }
 */
export const scanTrialQR = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;
  const rawGeo = req.body.scanGeo;

  // Middleware already attached req.trialQR after verification
  const qrPayload = (req as any).trialQR as QRTokenPayload;

  if (!qrPayload) {
    return sendBadRequest(res, 'QR token payload missing (middleware error)');
  }

  // Accept both lat/lng and latitude/longitude from frontend
  const scanGeo = rawGeo ? {
    lat: rawGeo.lat ?? rawGeo.latitude,
    lng: rawGeo.lng ?? rawGeo.longitude,
  } : null;

  if (!scanGeo || !scanGeo.lat || !scanGeo.lng) {
    return sendBadRequest(res, 'Scan geolocation is required');
  }

  try {
    const userIdObj = new Types.ObjectId(qrPayload.userId);
    const merchantIdObj = new Types.ObjectId(merchantId);
    const trialIdObj = new Types.ObjectId(qrPayload.trialId);
    const bookingIdObj = new Types.ObjectId(qrPayload.bookingId);

    // Verify merchant matches QR payload
    if (qrPayload.merchantId !== merchantId) {
      logger.warn('[TRIAL MERCHANT CONTROLLER] Merchant mismatch during scan', {
        merchantId,
        qrMerchantId: qrPayload.merchantId,
        bookingId: qrPayload.bookingId,
      });
      return sendForbidden(res, 'This QR code is not for your merchant account');
    }

    // Find booking
    const booking = await TrialBooking.findById(bookingIdObj);
    if (!booking) {
      return sendNotFound(res, 'Booking not found');
    }

    // Verify booking is in correct state
    if (booking.status !== 'active') {
      return sendBadRequest(res, 'This booking has already been completed or cancelled');
    }

    // Verify within trial window
    const now = new Date();
    if (now > booking.qrExpiresAt) {
      return sendBadRequest(res, 'Trial window has expired');
    }

    // 1. Run completion fraud check
    const fraudResult = await trialFraudService.checkCompletionFraud(bookingIdObj, merchantIdObj, scanGeo);

    if (!fraudResult.allowed) {
      logger.warn('[TRIAL MERCHANT CONTROLLER] Fraud detected during completion', {
        merchantId,
        bookingId: qrPayload.bookingId,
        userId: qrPayload.userId,
        signals: fraudResult.signals,
      });

      // Mark booking as fraud rejected
      booking.fraudSignals = fraudResult.signals;
      booking.status = 'fraud_rejected';
      await booking.save();

      return sendBadRequest(
        res,
        `Completion could not be verified: ${fraudResult.signals.join(', ') || 'fraud detected'}`,
      );
    }

    // 2. Mark booking as completed
    booking.status = 'completed';
    booking.completedAt = now;
    booking.geoAtScan = scanGeo;
    booking.updatedAt = now;
    await booking.save();

    // Notify merchant that trial was completed
    try {
      const trial = await TrialOffer.findById(booking.trialId).select('title').lean();
      const { User } = await import('../models/User');
      const user = (await User.findById(userIdObj).select('name').lean()) as any;

      await merchantNotificationService
        .notify({
          merchantId: merchantId,
          type: 'trial_completed',
          title: 'Trial Completed 🎉',
          message: `${user?.name || 'A customer'} just completed their "${trial?.title || 'trial'}" trial`,
          priority: 'normal',
          data: { trialId: booking.trialId?.toString(), userId: qrPayload.userId },
        })
        .catch((err: any) =>
          logger.error('[TRIAL MERCHANT CONTROLLER] Failed to send merchant notification: ' + err.message),
        );
    } catch (notifErr: any) {
      logger.error('[TRIAL MERCHANT CONTROLLER] Notification error: ' + notifErr.message);
    }

    // 3. Credit completion rewards (takes single bookingId argument)
    await trialRewardService.creditCompletionRewards(bookingIdObj);

    // 4. Update merchant quality metrics using correct field names from IMerchantQualityMetrics
    let metrics = await MerchantQualityMetrics.findOne({ merchantId: merchantIdObj });
    if (!metrics) {
      metrics = await MerchantQualityMetrics.create({
        merchantId: merchantIdObj,
        trialCount: 0,
        completionCount: 0,
        completionRate: 0,
        qualityScore: 0.5,
        avgRating: 0,
        upsellConversion: 0,
        updatedAt: new Date(),
      });
    }

    metrics.completionCount += 1;
    metrics.trialCount = Math.max(metrics.trialCount, metrics.completionCount);
    metrics.completionRate = metrics.completionCount / metrics.trialCount;
    metrics.updatedAt = new Date();
    await metrics.save();

    logger.info('[TRIAL MERCHANT CONTROLLER] Trial completed successfully', {
      merchantId,
      bookingId: qrPayload.bookingId,
      userId: qrPayload.userId,
    });

    // Fetch user info for response (without sensitive data)
    const { User } = await import('../models/User');
    const user = (await User.findById(userIdObj).select('name email').lean()) as any;

    return sendSuccess(res, {
      success: true,
      customer: {
        name: (user?.name as string) || 'Unknown',
        email: (user?.email as string) || 'N/A',
      },
      rewardSummary: {
        message: 'Coins credited to customer wallet',
      },
      bookingId: booking._id,
      completedAt: booking.completedAt,
      message: 'Trial completed successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL MERCHANT CONTROLLER] Error scanning QR: ' + error.message);
    throw new AppError('Failed to process trial completion', 500);
  }
});

/**
 * GET /api/merchant/trials/analytics
 * Fetch merchant's trial analytics
 */
export const getTrialAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;

  try {
    const merchantIdObj = new Types.ObjectId(merchantId);

    // Fetch merchant's trial offers
    const trials = await TrialOffer.find({ merchantId: merchantIdObj }).lean();
    const trialIds = trials.map((t) => t._id);

    // Get bookings
    const bookings = await TrialBooking.find({
      trialId: { $in: trialIds },
    }).lean();

    // Calculate analytics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((b) => b.status === 'completed').length;
    const completionRate = totalBookings > 0 ? completedBookings / totalBookings : 0;

    // Simplified: count upsell conversions (bookings that led to subsequent purchases)
    const upsellConversion = Math.floor(completedBookings * 0.1); // Placeholder

    // Calculate revenue from TRY (sum of coin prices for completed trials)
    const revenue = trials.reduce((sum, trial) => {
      const trialCompletions = bookings.filter(
        (b) => b.trialId.toString() === trial._id.toString() && b.status === 'completed',
      ).length;
      return sum + trialCompletions * trial.coinPrice * 0.5; // Simplified: assume 50% payout
    }, 0);

    // Top trials by bookings
    const trialBookingCounts: Record<string, number> = {};
    bookings.forEach((b) => {
      const trialIdStr = b.trialId.toString();
      trialBookingCounts[trialIdStr] = (trialBookingCounts[trialIdStr] || 0) + 1;
    });

    const topTrials = trials
      .map((t) => ({
        _id: t._id,
        title: t.title,
        category: t.category,
        bookingCount: trialBookingCounts[t._id.toString()] || 0,
        totalCompletions: t.totalCompletions,
      }))
      .sort((a, b) => b.bookingCount - a.bookingCount)
      .slice(0, 5);

    // Fetch quality metrics
    const metrics = await MerchantQualityMetrics.findOne({ merchantId: merchantIdObj }).lean();

    logger.info('[TRIAL MERCHANT CONTROLLER] Analytics fetched', {
      merchantId,
      totalBookings,
      completionRate: Math.round(completionRate * 100),
    });

    // Calculate time-based metrics
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const todayBookings = bookings.filter(b => new Date(b.createdAt) >= todayStart).length;
    const thisWeekBookings = bookings.filter(b => new Date(b.createdAt) >= weekStart).length;

    // Average reward value per completion
    const averageRewardValue = completedBookings > 0
      ? Math.round(revenue / completedBookings)
      : 0;

    return sendSuccess(res, {
      success: true,
      // Return both formats for compatibility
      totalBookings,
      totalCompletions: completedBookings,
      completionRate: Math.round(completionRate * 100),
      averageRewardValue,
      todayBookings,
      thisWeekBookings,
      // Extended analytics
      analytics: {
        totalBookings,
        completedBookings,
        completionRate: Math.round(completionRate * 100),
        upsellConversion,
        revenueFromTRY: Math.round(revenue),
        qualityScore: metrics?.qualityScore || 0.5,
        topTrials,
        averageRewardValue,
        todayBookings,
        thisWeekBookings,
      },
      message: 'Analytics fetched successfully',
    });
  } catch (error: any) {
    logger.error('[TRIAL MERCHANT CONTROLLER] Error fetching analytics: ' + error.message);
    throw new AppError('Failed to fetch analytics', 500);
  }
});
