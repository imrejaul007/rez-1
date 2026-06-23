import { Router } from 'express';
import {
  getStoreReviews,
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  getUserReviews,
  canUserReviewStore,
  moderateReview,
  getFeaturedReviews
} from '../controllers/reviewController';
import { uploadReviewImage as uploadReviewImageController } from '../controllers/uploadController';
import { uploadReviewImage as uploadReviewImageMiddleware } from '../middleware/upload';
import { requireAuth } from '../middleware/auth';
import { validateQuery, validateParams, validateBody, commonSchemas } from '../middleware/validation';
import { generalLimiter, reviewLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';

const router = Router();
router.use(generalLimiter);

// Get featured reviews (public, for UGC sections and food-stories)
router.get('/featured',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    category: Joi.string().trim()
  })),
  getFeaturedReviews
);

// Get reviews for a store
router.get('/store/:storeId',
  // generalLimiter,, // Disabled for development
  validateParams(Joi.object({
    storeId: commonSchemas.objectId()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    rating: Joi.number().integer().min(1).max(5),
    sortBy: Joi.string().valid('newest', 'oldest', 'highest', 'lowest', 'helpful').default('newest')
  })),
  getStoreReviews
);

// Get reviews for a product/service
router.get('/product/:productId',
  validateParams(Joi.object({
    productId: commonSchemas.objectId()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    rating: Joi.number().integer().min(1).max(5),
    sort: Joi.string().valid('newest', 'oldest', 'highest', 'lowest', 'helpful').default('newest')
  })),
  getProductReviews
);

// Check if user can review a store
router.get('/store/:storeId/can-review',
  // generalLimiter,, // Disabled for development
  requireAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId()
  })),
  canUserReviewStore
);

// Create a new review
router.post('/store/:storeId',
  reviewLimiter,
  requireAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    title: Joi.string().trim().max(100),
    comment: Joi.string().trim().min(50).max(1000).required(),
    images: Joi.array().items(Joi.string().uri()).max(5)
  })),
  createReview
);

// Moderate a review (Merchant/Admin)
router.put('/:reviewId/moderate',
  requireAuth, // Add role check middleware here in production
  validateParams(Joi.object({
    reviewId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    reason: Joi.string().trim().max(500)
  })),
  moderateReview
);

// Update a review
router.put('/:reviewId',
  reviewLimiter,
  requireAuth,
  validateParams(Joi.object({
    reviewId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    rating: Joi.number().integer().min(1).max(5),
    title: Joi.string().trim().max(100),
    comment: Joi.string().trim().min(10).max(1000),
    images: Joi.array().items(Joi.string().uri()).max(5)
  })),
  updateReview
);

// Delete a review
router.delete('/:reviewId',
  reviewLimiter,
  requireAuth,
  validateParams(Joi.object({
    reviewId: commonSchemas.objectId()
  })),
  deleteReview
);

// Mark review as helpful
router.post('/:reviewId/helpful',
  reviewLimiter,
  requireAuth,
  validateParams(Joi.object({
    reviewId: commonSchemas.objectId()
  })),
  markReviewHelpful
);

// Get user's reviews
router.get('/user/my-reviews',
  generalLimiter,
  requireAuth,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserReviews
);

// Upload review image to Cloudinary
router.post('/upload-image',
  requireAuth,
  uploadReviewImageMiddleware.single('image'),
  uploadReviewImageController
);

export default router;