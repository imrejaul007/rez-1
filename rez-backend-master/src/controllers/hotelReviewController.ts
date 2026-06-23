/**
 * hotelReviewController.ts
 *
 * Handlers for hotel review CRUD, stats, merchant responses, and helpful marking.
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { HotelReview } from '../models/HotelReview';
import { ReviewResponse } from '../models/ReviewResponse';
import { OtaBooking } from '../models/OtaBooking';
import { OtaHotel } from '../models/OtaHotel';
import { sendSuccess, sendError, sendCreated, sendForbidden, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { NotificationService } from '../services/notificationService';
import { logger } from '../config/logger';

// ─── Validation helpers ────────────────────────────────────────────────────────

function validateObjectId(id: string, name: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(`Invalid ${name}`, 400);
  }
}

// ─── POST /hotel-reviews — Submit a review ───────────────────────────────────
export const createHotelReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) throw new AppError('Authentication required', 401);

  const { hotelId, bookingId, rating, title, comment, aspects, photos } = req.body;

  validateObjectId(hotelId, 'hotelId');

  // Verify hotel exists
  const hotel = await OtaHotel.findById(hotelId).select('_id name').lean();
  if (!hotel) throw new AppError('Hotel not found', 404);

  // Determine if this is a verified stay
  let verified = false;
  let resolvedBookingId: string | undefined;

  if (bookingId) {
    validateObjectId(bookingId, 'bookingId');
    const booking = await OtaBooking.findOne({
      _id: bookingId,
      hotelId,
      userId,
    }).lean();

    if (!booking) {
      throw new AppError('Booking not found or does not belong to this user', 404);
    }
    if (booking.status !== 'completed') {
      throw new AppError('Only completed stays can be reviewed', 400);
    }
    verified = true;
    resolvedBookingId = bookingId;
  }

  // Idempotency: one review per user per hotel (unique index guards atomically)
  const existing = await HotelReview.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    hotelId: new mongoose.Types.ObjectId(hotelId),
  }).lean();

  if (existing) {
    throw new AppError('You have already reviewed this hotel', 409);
  }

  // Validate aspect ratings
  const allowedAspects = ['cleanliness', 'service', 'location', 'value', 'amenities'];
  if (aspects) {
    if (typeof aspects !== 'object' || Array.isArray(aspects)) {
      throw new AppError('aspects must be an object', 400);
    }
    for (const [key, val] of Object.entries(aspects)) {
      if (!allowedAspects.includes(key)) {
        throw new AppError(`Invalid aspect: ${key}`, 400);
      }
      if (val !== null && (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 5)) {
        throw new AppError(`Aspect ${key} must be an integer 1-5 or null`, 400);
      }
    }
  }

  // Validate photo URLs
  const photoUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
  if (photos && Array.isArray(photos)) {
    if (photos.length > 10) throw new AppError('Maximum 10 photos allowed', 400);
    for (const url of photos) {
      if (typeof url !== 'string' || !photoUrlPattern.test(url)) {
        throw new AppError('Invalid photo URL format', 400);
      }
    }
  }

  let review;
  try {
    review = await HotelReview.create({
      hotelId: new mongoose.Types.ObjectId(hotelId),
      userId: new mongoose.Types.ObjectId(userId),
      bookingId: resolvedBookingId ? new mongoose.Types.ObjectId(resolvedBookingId) : undefined,
      rating,
      title: title || undefined,
      comment,
      aspects: aspects || {},
      photos: photos || [],
      verified,
      status: 'pending',
      moderationStatus: 'pending',
    });
  } catch (err: any) {
    if (err.code === 11000) {
      throw new AppError('You have already reviewed this hotel', 409);
    }
    throw err;
  }

  logger.info('[HotelReview] Review created', {
    reviewId: review._id,
    hotelId,
    userId,
    verified,
  });

  return sendCreated(res, {
    reviewId: review._id,
    status: review.status,
    message: 'Review submitted. It will be visible after approval.',
  });
});

// ─── GET /hotel-reviews?hotelId=&page=&limit=&sort= ──────────────────────────
export const getHotelReviews = asyncHandler(async (req: Request, res: Response) => {
  const { hotelId, page = '1', limit = '20', sort = 'newest', rating } = req.query;

  if (!hotelId || typeof hotelId !== 'string') {
    throw new AppError('hotelId query parameter is required', 400);
  }
  validateObjectId(hotelId as string, 'hotelId');

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
  const sortLower = String(sort).toLowerCase();

  // Base query: show approved/published reviews to all users
  const query: Record<string, any> = {
    hotelId: new mongoose.Types.ObjectId(hotelId as string),
    moderationStatus: 'approved',
    status: { $in: ['approved', 'published'] },
  };
  if (rating) {
    query.rating = parseInt(rating as string, 10);
  }

  let sortOrder: Record<string, 1 | -1>;
  if (sortLower === 'highest') {
    sortOrder = { rating: -1, createdAt: -1 };
  } else if (sortLower === 'lowest') {
    sortOrder = { rating: 1, createdAt: -1 };
  } else if (sortLower === 'helpful') {
    sortOrder = { helpfulCount: -1, createdAt: -1 };
  } else {
    sortOrder = { createdAt: -1 };
  }

  const skip = (pageNum - 1) * limitNum;

  const [reviews, total] = await Promise.all([
    HotelReview.find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limitNum)
      .populate('userInfo', 'profile.name profile.avatar')
      .select('-moderationStatus -moderatedBy -moderatedAt -moderationReason')
      .lean(),
    HotelReview.countDocuments(query),
  ]);

  // Attach response if exists
  const reviewIds = reviews.map((r) => r._id);
  const responses = await ReviewResponse.find({ reviewId: { $in: reviewIds } })
    .select('reviewId response respondedAt')
    .lean();
  const responseMap = new Map(responses.map((r) => [String(r.reviewId), r]));

  const enrichedReviews = reviews.map((r) => ({
    _id: r._id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    aspects: r.aspects,
    photos: r.photos,
    verified: r.verified,
    helpfulCount: r.helpfulCount,
    hasResponse: r.hasResponse,
    merchantResponse: responseMap.get(String(r._id)) || null,
    userInfo: (r as any).userInfo || null,
    createdAt: r.createdAt,
  }));

  const [stats, verifiedStats] = await Promise.all([
    HotelReview.getHotelRatingStats(hotelId as string),
    HotelReview.getVerifiedStats(hotelId as string),
  ]);

  return sendSuccess(res, {
    reviews: enrichedReviews,
    stats: {
      averageRating: stats.averageRating,
      totalReviews: stats.totalReviews,
      ratingDistribution: stats.ratingDistribution,
      aspectAverages: stats.aspectAverages,
      verifiedPercentage: verifiedStats.verifiedPercentage,
    },
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      hasNext: skip + reviews.length < total,
      hasPrevious: pageNum > 1,
    },
  });
});

// ─── GET /hotel-reviews/stats?hotelId= ──────────────────────────────────────
export const getHotelReviewStats = asyncHandler(async (req: Request, res: Response) => {
  const { hotelId } = req.query;

  if (!hotelId || typeof hotelId !== 'string') {
    throw new AppError('hotelId query parameter is required', 400);
  }
  validateObjectId(hotelId as string, 'hotelId');

  const hotel = await OtaHotel.findById(hotelId).select('_id name').lean();
  if (!hotel) throw new AppError('Hotel not found', 404);

  const [ratingStats, verifiedStats] = await Promise.all([
    HotelReview.getHotelRatingStats(hotelId as string),
    HotelReview.getVerifiedStats(hotelId as string),
  ]);

  return sendSuccess(res, {
    hotelId,
    hotelName: hotel.name,
    ...ratingStats,
    verifiedCount: verifiedStats.verifiedCount,
    verifiedPercentage: verifiedStats.verifiedPercentage,
  });
});

// ─── GET /hotels/:hotelId/rating ─────────────────────────────────────────────
export const getHotelRatingSummary = asyncHandler(async (req: Request, res: Response) => {
  const { hotelId } = req.params;

  validateObjectId(hotelId, 'hotelId');

  const hotel = await OtaHotel.findById(hotelId).select('_id name starRating').lean();
  if (!hotel) throw new AppError('Hotel not found', 404);

  const stats = await HotelReview.getHotelRatingStats(hotelId);

  return sendSuccess(res, {
    hotelId,
    hotelName: hotel.name,
    starRating: hotel.starRating,
    averageRating: stats.averageRating,
    totalReviews: stats.totalReviews,
    ratingDistribution: stats.ratingDistribution,
    aspectAverages: stats.aspectAverages,
  });
});

// ─── POST /hotel-reviews/:id/respond — Merchant responds to a review ─────────
export const respondToReview = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) throw new AppError('Authentication required', 401);

  const { id } = req.params;
  validateObjectId(id, 'reviewId');

  const { response } = req.body;
  if (!response || typeof response !== 'string' || response.trim().length === 0) {
    throw new AppError('response text is required', 400);
  }
  if (response.trim().length > 1000) {
    throw new AppError('Response must be 1000 characters or fewer', 400);
  }

  const review = await HotelReview.findById(id).select('_id hotelId hotelPartnerId status').lean();
  if (!review) throw new AppError('Review not found', 404);

  // P1-3: Enforce ownership — only the hotel's owning merchant may respond
  const merchantId = (req as any).merchantId || userId;
  const hotel = await OtaHotel.findById(review.hotelId).select('_id merchantId').lean();
  if (!hotel) return sendNotFound(res, 'Hotel not found');
  if (hotel.merchantId.toString() !== merchantId.toString()) {
    return sendForbidden(res, 'You do not own this hotel');
  }

  // Upsert: update existing response or create new one
  const existing = await ReviewResponse.findOne({ reviewId: new mongoose.Types.ObjectId(id) }).lean();

  if (existing) {
    await ReviewResponse.findByIdAndUpdate(existing._id, {
      response: response.trim(),
      respondedAt: new Date(),
    });
  } else {
    await ReviewResponse.create({
      reviewId: new mongoose.Types.ObjectId(id),
      merchantId: new mongoose.Types.ObjectId(merchantId),
      response: response.trim(),
      respondedAt: new Date(),
    });

    await HotelReview.findByIdAndUpdate(id, { hasResponse: true });
  }

  logger.info('[HotelReview] Merchant responded to review', { reviewId: id, merchantId });

  // Notify the reviewer
  const reviewDoc = await HotelReview.findById(id).select('userId hotelId').lean();
  if (reviewDoc) {
    const hotel = await OtaHotel.findById(reviewDoc.hotelId).select('name').lean();
    try {
      await NotificationService.createNotification({
        userId: reviewDoc.userId,
        title: 'Hotel replied to your review',
        message: `${hotel?.name ?? 'The hotel'} has responded to your review. Tap to read their reply.`,
        type: 'info',
        category: 'general',
        priority: 'medium',
        data: {
          deepLink: `/hotel-reviews/${id}`,
          metadata: {
            reviewId: id,
            hotelId: String(reviewDoc.hotelId),
          },
        },
        deliveryChannels: ['in_app', 'push'],
      });
    } catch (notifErr) {
      logger.warn('[HotelReview] Failed to send response notification', { reviewId: id, error: notifErr });
    }
  }

  return sendSuccess(res, { message: 'Response submitted' });
});

// ─── PATCH /hotel-reviews/:id/helpful — Mark review as helpful ───────────────
export const markReviewHelpful = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) throw new AppError('Authentication required', 401);

  const { id } = req.params;
  validateObjectId(id, 'reviewId');

  const review = await HotelReview.findByIdAndUpdate(
    { _id: id, moderationStatus: 'approved', status: { $in: ['approved', 'published'] } },
    { $inc: { helpfulCount: 1 } },
    { new: true },
  ).select('_id helpfulCount');

  if (!review) throw new AppError('Review not found or not yet published', 404);

  return sendSuccess(res, {
    reviewId: review._id,
    helpfulCount: review.helpfulCount,
    message: 'Marked as helpful',
  });
});

// ─── GET /hotel-reviews/user/can-review?hotelId= ─────────────────────────────
export const canUserReviewHotel = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) throw new AppError('Authentication required', 401);

  const { hotelId } = req.query;
  if (!hotelId || typeof hotelId !== 'string') {
    throw new AppError('hotelId query parameter is required', 400);
  }
  validateObjectId(hotelId as string, 'hotelId');

  // Check if user has a completed booking at this hotel
  const completedBooking = await OtaBooking.findOne({
    hotelId: new mongoose.Types.ObjectId(hotelId as string),
    userId: new mongoose.Types.ObjectId(userId),
    status: 'completed',
  })
    .select('_id checkIn checkOut')
    .lean();

  // Check if already reviewed
  const existingReview = await HotelReview.hasUserReviewedHotel(hotelId as string, userId);

  return sendSuccess(res, {
    canReview: !!completedBooking && !existingReview,
    hasCompletedStay: !!completedBooking,
    alreadyReviewed: existingReview,
    bookingId: completedBooking?._id ?? null,
  });
});

// ─── Trigger: prompt user to review after completed stay ──────────────────────
/**
 * Called by the travel webhook controller when an OTA booking transitions
 * to 'completed'. Sends an in-app + push notification prompting the user.
 */
export async function triggerReviewPrompt(userId: string, hotelId: string, bookingId: string): Promise<void> {
  try {
    const hotel = await OtaHotel.findById(hotelId).select('name').lean();
    const alreadyReviewed = await HotelReview.hasUserReviewedHotel(hotelId, userId);

    if (alreadyReviewed) {
      logger.info('[HotelReview] User already reviewed hotel, skipping prompt', { userId, hotelId });
      return;
    }

    await NotificationService.createNotification({
      userId,
      title: 'How was your stay?',
      message: `Share your experience at ${hotel?.name ?? 'this hotel'} and help other travellers!`,
      type: 'info',
      category: 'reminder',
      priority: 'medium',
      data: {
        deepLink: `/hotel-reviews/new?hotelId=${hotelId}&bookingId=${bookingId}`,
        metadata: {
          hotelId,
          bookingId,
        },
      },
      deliveryChannels: ['in_app', 'push'],
    });

    logger.info('[HotelReview] Review prompt sent', { userId, hotelId, bookingId });
  } catch (err) {
    logger.warn('[HotelReview] Failed to trigger review prompt', { userId, hotelId, error: err });
  }
}
