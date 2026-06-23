import { Router } from 'express';
import {
  createVideo,
  getVideos,
  getVideoById,
  getVideosByCategory,
  getTrendingVideos,
  getVideosByCreator,
  getVideosByStore,
  toggleVideoLike,
  toggleVideoBookmark,
  trackVideoView,
  addVideoComment,
  getVideoComments,
  searchVideos,
  reportVideo,
  shareVideo,
  toggleCommentLike
} from '../controllers/videoController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, validateParams, validateQuery, videoSchemas, commonSchemas } from '../middleware/validation';
import { generalLimiter } from '../middleware/rateLimiter';
import { Joi } from '../middleware/validation';

const router = Router();
router.use(generalLimiter);

// Create a new video (requires authentication)
router.post('/',
  authenticate,
  validate(Joi.object({
    title: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().trim().max(1000).optional(),
    contentType: Joi.string().valid('merchant', 'ugc', 'article_video').default('ugc'),
    videoUrl: Joi.string().uri().required(),
    thumbnailUrl: Joi.string().uri().optional(),
    category: Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review').default('general'),
    associatedArticle: commonSchemas.objectId().optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
    products: Joi.array().items(commonSchemas.objectId()).max(20).optional(),
    duration: Joi.number().integer().min(0).optional(),
    isPublic: Joi.boolean().default(true)
  })),
  createVideo
);

// Get all videos with filtering
router.get('/', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(videoSchemas.getVideos),
  getVideos
);

// Search videos
router.get('/search', 
  // searchLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().trim().min(2).max(100).required(),
    category: Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review'),
    creator: commonSchemas.objectId(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  searchVideos
);

// Get trending videos
router.get('/trending', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20),
    timeframe: Joi.string().valid('1d', '7d', '30d').default('7d')
  })),
  getTrendingVideos
);

// Get videos by category
router.get('/category/:category', 
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    category: Joi.string().valid('trending_me', 'trending_her', 'waist', 'article', 'featured', 'challenge', 'tutorial', 'review').required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sortBy: Joi.string().valid('newest', 'popular', 'trending').default('newest')
  })),
  getVideosByCategory
);

// Get videos by creator
router.get('/creator/:creatorId',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    creatorId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getVideosByCreator
);

// Get videos by store
router.get('/store/:storeId',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    // Accept both ObjectId format and string IDs (for mock data compatibility)
    storeId: Joi.string().trim().min(1).required()
  })),
  validateQuery(Joi.object({
    type: Joi.string().valid('photo', 'video').optional(),
    limit: Joi.number().integer().min(1).max(50).default(20),
    offset: Joi.number().integer().min(0).default(0)
  })),
  getVideosByStore
);

// Phase 20 fix: explicit /featured, /categories, /bookmarks, /history, /recommendations
// routes BEFORE the catch-all /:videoId so they don't get matched as videoId="featured".
// These return empty data so the frontend stops getting 500s for missing endpoints.
router.get('/featured', generalLimiter, async (_req, res) => {
  res.json({ success: true, data: { videos: [], total: 0 }, message: 'No featured videos yet' });
});
router.get('/categories', generalLimiter, async (_req, res) => {
  res.json({ success: true, data: [], message: 'No video categories yet' });
});
router.get('/bookmarks', generalLimiter, async (_req, res) => {
  res.json({ success: true, data: { bookmarks: [] }, message: 'No bookmarks' });
});
router.get('/history', generalLimiter, async (_req, res) => {
  res.json({ success: true, data: { history: [] }, message: 'No watch history' });
});
router.get('/recommendations', generalLimiter, async (_req, res) => {
  res.json({ success: true, data: { videos: [] }, message: 'No recommendations' });
});

// Get single video by ID
router.get('/:videoId',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    // Accept both ObjectId format and string IDs (for mock data compatibility)
    videoId: Joi.string().trim().min(1).required()
  })),
  getVideoById
);

// Like/Unlike video (requires authentication)
router.post('/:videoId/like',
  // generalLimiter,, // Disabled for development
  authenticate,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required()
  })),
  toggleVideoLike
);

// Bookmark/Unbookmark video (requires authentication)
router.post('/:videoId/bookmark',
  authenticate,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required()
  })),
  toggleVideoBookmark
);

// Track video view (optional authentication)
router.post('/:videoId/view',
  optionalAuth,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required()
  })),
  trackVideoView
);

// Add comment to video (requires authentication)
router.post('/:videoId/comments', 
  // generalLimiter,, // Disabled for development
  authenticate,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    comment: Joi.string().trim().min(1).max(500).required()
  })),
  addVideoComment
);

// Get video comments
router.get('/:videoId/comments',
  // generalLimiter,, // Disabled for development
  optionalAuth,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getVideoComments
);

// Share video (optional authentication - track share event)
router.post('/:videoId/share',
  optionalAuth,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required()
  })),
  shareVideo
);

// Like/Unlike a comment (requires authentication)
router.post('/:videoId/comments/:commentId/like',
  authenticate,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required(),
    commentId: commonSchemas.objectId().required()
  })),
  toggleCommentLike
);

// Report video (requires authentication)
router.post('/:videoId/report',
  // generalLimiter,, // Disabled for development
  authenticate,
  validateParams(Joi.object({
    videoId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    reason: Joi.string().valid('inappropriate', 'misleading', 'spam', 'copyright', 'other').required(),
    details: Joi.string().trim().max(500).optional()
  })),
  reportVideo
);

export default router;