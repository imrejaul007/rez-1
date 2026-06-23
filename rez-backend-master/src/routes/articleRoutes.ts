import { Router } from 'express';
import {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  getArticlesByCategory,
  getTrendingArticles,
  getFeaturedArticles,
  searchArticles,
  toggleArticleLike,
  toggleArticleBookmark,
  incrementArticleShare
} from '../controllers/articleController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate, validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Create a new article (requires authentication)
router.post('/',
  authenticate,
  validate(Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    excerpt: Joi.string().trim().min(1).max(500).required(),
    content: Joi.string().trim().required(),
    coverImage: Joi.string().uri().required(),
    category: Joi.string().valid('fashion', 'beauty', 'lifestyle', 'tech', 'general').required(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
    products: Joi.array().items(commonSchemas.objectId()).max(20).optional(),
    stores: Joi.array().items(commonSchemas.objectId()).max(10).optional(),
    isPublished: Joi.boolean().default(false),
    scheduledAt: Joi.date().optional()
  })),
  createArticle
);

// Get all articles with filtering
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    category: Joi.string().valid('fashion', 'beauty', 'lifestyle', 'tech', 'general'),
    author: commonSchemas.objectId(),
    isPublished: Joi.boolean(),
    isFeatured: Joi.boolean(),
    sortBy: Joi.string().valid('newest', 'popular', 'trending').default('newest')
  })),
  getArticles
);

// Search articles
router.get('/search',
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().trim().min(2).max(100).required(),
    category: Joi.string().valid('fashion', 'beauty', 'lifestyle', 'tech', 'general'),
    author: commonSchemas.objectId(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  searchArticles
);

// Get trending articles
router.get('/trending',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    timeframe: Joi.string().valid('1d', '7d', '30d').default('7d')
  })),
  getTrendingArticles
);

// Get featured articles
router.get('/featured',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFeaturedArticles
);

// Get articles by category
router.get('/category/:category',
  optionalAuth,
  validateParams(Joi.object({
    category: Joi.string().valid('fashion', 'beauty', 'lifestyle', 'tech', 'general').required()
  })),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
    sortBy: Joi.string().valid('newest', 'popular', 'trending').default('newest')
  })),
  getArticlesByCategory
);

// Get single article by ID
router.get('/:articleId',
  optionalAuth,
  validateParams(Joi.object({
    articleId: commonSchemas.objectId().required()
  })),
  getArticleById
);

// Update article (requires authentication and ownership)
router.put('/:articleId',
  authenticate,
  validateParams(Joi.object({
    articleId: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    title: Joi.string().trim().min(1).max(200).optional(),
    excerpt: Joi.string().trim().min(1).max(500).optional(),
    content: Joi.string().trim().optional(),
    coverImage: Joi.string().uri().optional(),
    category: Joi.string().valid('fashion', 'beauty', 'lifestyle', 'tech', 'general').optional(),
    tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional(),
    products: Joi.array().items(commonSchemas.objectId()).max(20).optional(),
    stores: Joi.array().items(commonSchemas.objectId()).max(10).optional(),
    isPublished: Joi.boolean().optional(),
    scheduledAt: Joi.date().optional()
  })),
  updateArticle
);

// Delete article (requires authentication and ownership)
router.delete('/:articleId',
  authenticate,
  validateParams(Joi.object({
    articleId: commonSchemas.objectId().required()
  })),
  deleteArticle
);

// Like/Unlike article (requires authentication)
router.post('/:articleId/like',
  authenticate,
  validateParams(Joi.object({
    articleId: commonSchemas.objectId().required()
  })),
  toggleArticleLike
);

// Bookmark/Unbookmark article (requires authentication)
router.post('/:articleId/bookmark',
  authenticate,
  validateParams(Joi.object({
    articleId: commonSchemas.objectId().required()
  })),
  toggleArticleBookmark
);

// Share article (authenticated or anonymous)
router.post('/:articleId/share',
  optionalAuth,
  validateParams(Joi.object({
    articleId: commonSchemas.objectId().required()
  })),
  incrementArticleShare
);

export default router;
