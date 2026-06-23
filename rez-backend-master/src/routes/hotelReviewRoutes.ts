// @ts-nocheck
/**
 * hotelReviewRoutes.ts — Hotel Review System endpoints
 *
 * Routes:
 *   POST   /hotel-reviews                      — submit a review (authenticated)
 *   GET    /hotel-reviews                     — list reviews (public, paginated)
 *   GET    /hotel-reviews/stats               — aggregate stats (public)
 *   GET    /hotel-reviews/user/can-review     — check eligibility (authenticated)
 *   POST   /hotel-reviews/:id/respond         — merchant responds (authenticated)
 *   PATCH  /hotel-reviews/:id/helpful         — mark helpful (authenticated)
 *   GET    /hotels/:hotelId/rating            — rating summary (public)
 *
 * Note: The /hotels/:hotelId/rating mount uses { mergeParams: true } so it
 * shares this router with the /hotel-reviews prefix. It is placed after the
 * /hotel-reviews mounts to avoid route conflicts.
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateParams, validateQuery, validateBody, commonSchemas, Joi } from '../middleware/validation';
import { generalLimiter, reviewLimiter } from '../middleware/rateLimiter';
import {
  createHotelReview,
  getHotelReviews,
  getHotelReviewStats,
  getHotelRatingSummary,
  respondToReview,
  markReviewHelpful,
  canUserReviewHotel,
} from '../controllers/hotelReviewController';

const router = Router({ mergeParams: true });
router.use(generalLimiter);

// ─── POST /hotel-reviews — Submit a review ─────────────────────────────────────
router.post(
  '/',
  reviewLimiter,
  authenticate,
  validateBody(
    Joi.object({
      hotelId: commonSchemas.objectId().required(),
      bookingId: commonSchemas.objectId().optional(),
      rating: Joi.number().integer().min(1).max(5).required(),
      title: Joi.string().trim().max(150).optional().allow('', null),
      comment: Joi.string().trim().min(10).max(2000).required(),
      aspects: Joi.object({
        cleanliness: Joi.number().integer().min(1).max(5).optional().allow(null),
        service: Joi.number().integer().min(1).max(5).optional().allow(null),
        location: Joi.number().integer().min(1).max(5).optional().allow(null),
        value: Joi.number().integer().min(1).max(5).optional().allow(null),
        amenities: Joi.number().integer().min(1).max(5).optional().allow(null),
      }).optional(),
      photos: Joi.array().items(Joi.string().uri()).max(10).optional(),
    }),
  ),
  createHotelReview,
);

// ─── GET /hotel-reviews?hotelId=&page=&limit=&sort=&rating= ────────────────────
router.get(
  '/',
  validateQuery(
    Joi.object({
      hotelId: commonSchemas.objectId().required(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(50).default(20),
      sort: Joi.string().valid('newest', 'oldest', 'highest', 'lowest', 'helpful').default('newest'),
      rating: Joi.number().integer().min(1).max(5).optional(),
    }),
  ),
  getHotelReviews,
);

// ─── GET /hotel-reviews/stats?hotelId= ─────────────────────────────────────────
router.get('/stats', validateQuery(Joi.object({ hotelId: commonSchemas.objectId().required() })), getHotelReviewStats);

// ─── GET /hotel-reviews/user/can-review?hotelId= ───────────────────────────────
router.get(
  '/user/can-review',
  authenticate,
  validateQuery(Joi.object({ hotelId: commonSchemas.objectId().required() })),
  canUserReviewHotel,
);

// ─── POST /hotel-reviews/:id/respond — Merchant responds ────────────────────────
router.post(
  '/:id/respond',
  reviewLimiter,
  authenticate,
  validateParams(Joi.object({ id: commonSchemas.objectId().required() })),
  validateBody(
    Joi.object({
      response: Joi.string().trim().min(1).max(1000).required(),
    }),
  ),
  respondToReview,
);

// ─── PATCH /hotel-reviews/:id/helpful ──────────────────────────────────────────
router.patch(
  '/:id/helpful',
  reviewLimiter,
  authenticate,
  validateParams(Joi.object({ id: commonSchemas.objectId().required() })),
  markReviewHelpful,
);

// ─── GET /hotels/:hotelId/rating — Rating summary (public) ────────────────────
// Mounted on the same router so it is reachable at /api/hotels/:hotelId/rating
// after this router is registered at /hotel-reviews AND /hotels in config/routes.ts
router.get(
  '/:hotelId/rating',
  validateParams(Joi.object({ hotelId: commonSchemas.objectId().required() })),
  getHotelRatingSummary,
);

export default router;
