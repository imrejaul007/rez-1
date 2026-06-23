import { Router } from 'express';
import {
  getExploreDashboardStats,
  getFeaturedReviews,
  toggleReviewFeatured,
  getFeaturedComparisons,
  toggleComparisonFeatured,
  getEligibleReviews,
  bulkToggleReviewsFeatured,
  // Video management
  getExploreVideoStats,
  getAdminVideos,
  getAdminVideoById,
  createAdminVideo,
  updateAdminVideo,
  deleteAdminVideo,
  toggleVideoFeatured,
  toggleVideoTrending,
  toggleVideoPublished,
  bulkUpdateVideos
} from '../controllers/adminExploreController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateQuery, validateParams, validateBody, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// Get admin explore dashboard stats
router.get('/stats',
  getExploreDashboardStats
);

// Get featured reviews for explore page
router.get('/featured-reviews',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getFeaturedReviews
);

// Toggle review featured status
router.put('/reviews/:reviewId/feature',
  validateParams(Joi.object({
    reviewId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    featured: Joi.boolean()
  })),
  toggleReviewFeatured
);

// Get featured comparisons for explore page
router.get('/featured-comparisons',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getFeaturedComparisons
);

// Toggle comparison featured status
router.put('/comparisons/:comparisonId/feature',
  validateParams(Joi.object({
    comparisonId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    featured: Joi.boolean()
  })),
  toggleComparisonFeatured
);

// Get reviews eligible for featuring
router.get('/eligible-reviews',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    minRating: Joi.number().min(1).max(5).default(4)
  })),
  getEligibleReviews
);

// Bulk feature/unfeature reviews
router.post('/reviews/bulk-feature',
  validateBody(Joi.object({
    reviewIds: Joi.array().items(commonSchemas.objectId()).min(1).max(50).required(),
    featured: Joi.boolean().required()
  })),
  bulkToggleReviewsFeatured
);

// =====================================================
// VIDEO/REEL MANAGEMENT ROUTES
// =====================================================

// Get video stats for dashboard
router.get('/videos/stats',
  getExploreVideoStats
);

// Get all videos with filters
router.get('/videos',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    status: Joi.string().valid('published', 'unpublished', 'pending', 'approved', 'rejected'),
    contentType: Joi.string().valid('merchant', 'ugc', 'article_video'),
    featured: Joi.string().valid('true', 'false'),
    trending: Joi.string().valid('true', 'false'),
    search: Joi.string().max(100)
  })),
  getAdminVideos
);

// Get single video by ID
router.get('/videos/:videoId',
  validateParams(Joi.object({
    videoId: commonSchemas.objectId()
  })),
  getAdminVideoById
);

// Create new video
router.post('/videos',
  validateBody(Joi.object({
    title: Joi.string().max(200).required(),
    description: Joi.string().max(2000),
    videoUrl: Joi.string().uri().required(),
    thumbnail: Joi.string().uri(),
    duration: Joi.number().min(0).max(600),
    contentType: Joi.string().valid('merchant', 'ugc', 'article_video').default('ugc'),
    category: Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review').default('featured'),
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    storeIds: Joi.array().items(commonSchemas.objectId()),
    productIds: Joi.array().items(commonSchemas.objectId()),
    isPublished: Joi.boolean().default(false),
    isFeatured: Joi.boolean().default(false),
    isTrending: Joi.boolean().default(false)
  })),
  createAdminVideo
);

// Update video
router.put('/videos/:videoId',
  validateParams(Joi.object({
    videoId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    title: Joi.string().max(200),
    description: Joi.string().max(2000),
    videoUrl: Joi.string().uri(),
    thumbnail: Joi.string().uri(),
    duration: Joi.number().min(0).max(600),
    contentType: Joi.string().valid('merchant', 'ugc', 'article_video'),
    category: Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review'),
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    storeIds: Joi.array().items(commonSchemas.objectId()),
    productIds: Joi.array().items(commonSchemas.objectId()),
    isPublished: Joi.boolean(),
    isFeatured: Joi.boolean(),
    isTrending: Joi.boolean(),
    moderationStatus: Joi.string().valid('pending', 'approved', 'rejected', 'flagged')
  })),
  updateAdminVideo
);

// Delete video
router.delete('/videos/:videoId',
  validateParams(Joi.object({
    videoId: commonSchemas.objectId()
  })),
  deleteAdminVideo
);

// Toggle video featured status
router.put('/videos/:videoId/feature',
  validateParams(Joi.object({
    videoId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    featured: Joi.boolean()
  })),
  toggleVideoFeatured
);

// Toggle video trending status
router.put('/videos/:videoId/trending',
  validateParams(Joi.object({
    videoId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    trending: Joi.boolean()
  })),
  toggleVideoTrending
);

// Toggle video publish status
router.put('/videos/:videoId/publish',
  validateParams(Joi.object({
    videoId: commonSchemas.objectId()
  })),
  validateBody(Joi.object({
    published: Joi.boolean()
  })),
  toggleVideoPublished
);

// Bulk update videos
router.post('/videos/bulk-update',
  validateBody(Joi.object({
    videoIds: Joi.array().items(commonSchemas.objectId()).min(1).max(50).required(),
    action: Joi.string().valid('publish', 'unpublish', 'feature', 'unfeature', 'trending', 'untrending', 'approve', 'reject').required()
  })),
  bulkUpdateVideos
);

export default router;
