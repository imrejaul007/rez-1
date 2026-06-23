// @ts-nocheck
/**
 * storeReviewRoutes.ts — Store Ratings & Reviews endpoints
 *
 * POST /api/stores/:storeId/reviews  — authenticated, one per user per store
 * GET  /api/stores/:storeId/reviews  — public, paginated with breakdown
 *
 * Mounted in routes.ts BEFORE the general /api/stores router so that
 * the /:storeId/reviews sub-path is handled here, not by a catch-all.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Review } from '../models/Review';
import { Store } from '../models/Store';
import { authenticate } from '../middleware/auth';
import { validateParams, validateBody, validateQuery, commonSchemas, Joi } from '../middleware/validation';
import { reviewLimiter, generalLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

const router = Router({ mergeParams: true });

// ── POST /api/stores/:storeId/reviews ────────────────────────────────────────
router.post(
  '/',
  reviewLimiter,
  authenticate,
  validateParams(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
    }),
  ),
  validateBody(
    Joi.object({
      rating: Joi.number().integer().min(1).max(5).required(),
      comment: Joi.string().trim().max(200).optional().allow('', null),
    }),
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { rating, comment } = req.body;
    const userId = (req as any).userId || req.user?.id;

    if (!userId) {
      throw new AppError('Authentication required', 401);
    }

    if (!mongoose.isValidObjectId(storeId)) {
      throw new AppError('Invalid store ID', 400);
    }

    // Verify store exists
    const store = await Store.findById(storeId).select('_id name ratings').lean();
    if (!store) {
      throw new AppError('Store not found', 404);
    }

    // Idempotency: 1 review per user per store per 24 hours
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReview = await Review.findOne({
      store: storeId,
      user: userId,
      isActive: true,
      createdAt: { $gte: since24h },
    }).lean();

    if (recentReview) {
      throw new AppError('You can only submit one review per store every 24 hours', 429);
    }

    // Enforce one review per user per store (unique index also guards this atomically)
    const existing = await Review.findOne({
      store: storeId,
      user: userId,
      isActive: true,
    }).lean();

    if (existing) {
      throw new AppError('You have already reviewed this store', 409);
    }

    // Create review — unique index { user, store } prevents race conditions
    let review;
    try {
      review = await Review.create({
        store: storeId,
        user: userId,
        rating,
        comment: comment || '',
        verified: false,
        moderationStatus: 'pending',
        isActive: true,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        throw new AppError('You have already reviewed this store', 409);
      }
      throw err;
    }

    // Optimistically update Store.ratings using atomic $inc so we don't need
    // a read-modify-write cycle.  The authoritative recalculation still happens
    // when a merchant/admin approves the review via moderateReview().
    try {
      const ratingNum = Number(rating);
      const distributionKey = `ratings.distribution.${ratingNum}`;
      await Store.findByIdAndUpdate(storeId, {
        $inc: {
          'ratings.count': 1,
          [distributionKey]: 1,
        },
      });

      // Recalculate average from the updated distribution
      const updatedStore = await Store.findById(storeId).select('ratings').lean();
      if (updatedStore && updatedStore.ratings) {
        const dist = updatedStore.ratings.distribution as Record<string, number>;
        const totalCount = updatedStore.ratings.count;
        if (totalCount > 0) {
          const totalSum =
            (dist['1'] || 0) * 1 +
            (dist['2'] || 0) * 2 +
            (dist['3'] || 0) * 3 +
            (dist['4'] || 0) * 4 +
            (dist['5'] || 0) * 5;
          const newAverage = Math.round((totalSum / totalCount) * 10) / 10;
          await Store.findByIdAndUpdate(storeId, {
            'ratings.average': newAverage,
          });
          return res.status(201).json({
            success: true,
            message: 'Review submitted. Visible after merchant approval.',
            averageRating: newAverage,
            reviewId: review._id,
          });
        }
      }
    } catch (ratingErr: any) {
      // Non-fatal — review was created, just log the rating update failure
      logger.warn('[StoreReview] Failed to update store ratings after review creation', {
        storeId,
        error: ratingErr.message,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted. Visible after merchant approval.',
      averageRating: (store.ratings as any)?.average ?? 0,
      reviewId: review._id,
    });
  }),
);

// ── GET /api/stores/:storeId/reviews ─────────────────────────────────────────
router.get(
  '/',
  generalLimiter,
  validateParams(
    Joi.object({
      storeId: commonSchemas.objectId().required(),
    }),
  ),
  validateQuery(
    Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(10),
      sort: Joi.string().valid('newest', 'highest', 'lowest').default('newest'),
    }),
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const sort = String(req.query.sort || 'newest');

    if (!mongoose.isValidObjectId(storeId)) {
      throw new AppError('Invalid store ID', 400);
    }

    const query = {
      store: storeId,
      isActive: true,
      moderationStatus: 'approved',
    };

    // Build sort order based on query param
    let sortOrder: Record<string, 1 | -1>;
    if (sort === 'highest') {
      sortOrder = { rating: -1, createdAt: -1 };
    } else if (sort === 'lowest') {
      sortOrder = { rating: 1, createdAt: -1 };
    } else {
      sortOrder = { createdAt: -1 };
    }

    const skip = (pageNum - 1) * limitNum;

    const [reviews, total, ratingStats] = await Promise.all([
      Review.find(query).select('rating comment createdAt').sort(sortOrder).skip(skip).limit(limitNum).lean(),
      Review.countDocuments(query),
      Review.getStoreRatingStats(storeId),
    ]);

    const ratingBreakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (ratingStats.distribution) {
      for (const k of [5, 4, 3, 2, 1] as const) {
        ratingBreakdown[k] = (ratingStats.distribution as any)[k] ?? 0;
      }
    }

    res.json({
      success: true,
      reviews: reviews.map((r: any) => ({
        rating: r.rating,
        comment: r.comment || '',
        createdAt: r.createdAt,
      })),
      averageRating: ratingStats.average,
      reviewCount: total,
      ratingBreakdown,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasNext: skip + reviews.length < total,
        hasPrevious: pageNum > 1,
      },
    });
  }),
);

export default router;
