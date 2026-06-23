import { Router } from 'express';
import {
  getExploreStats,
  getVerifiedReviews,
  getFeaturedComparison,
  getFriendsActivity,
  getExploreStatsSummary
} from '../controllers/exploreController';
import { optionalAuth } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { Joi } from '../middleware/validation';
import { cacheMiddleware } from '../middleware/cacheMiddleware';
import { CacheTTL } from '../config/redis';

const router = Router();

// Get live stats for explore page
router.get('/live-stats',
  optionalAuth,
  cacheMiddleware({ ttl: CacheTTL.SHORT_CACHE, keyPrefix: 'explore:stats', condition: () => true }),
  getExploreStats
);

// Get verified reviews for explore page
router.get('/verified-reviews',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(5),
    page: Joi.number().integer().min(1).default(1)
  })),
  cacheMiddleware({ ttl: 300, keyPrefix: 'explore:reviews', condition: () => true }),
  getVerifiedReviews
);

// Get featured comparison for explore page
router.get('/featured-comparison',
  optionalAuth,
  cacheMiddleware({ ttl: 300, keyPrefix: 'explore:comparison', condition: () => true }),
  getFeaturedComparison
);

// Get friends activity for explore page
router.get('/friends-activity',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(20).default(10)
  })),
  cacheMiddleware({ ttl: CacheTTL.SHORT_CACHE, keyPrefix: 'explore:friends', condition: () => true }),
  getFriendsActivity
);

// Get explore stats summary (partner stores, max cashback, etc)
router.get('/stats-summary',
  optionalAuth,
  cacheMiddleware({ ttl: 300, keyPrefix: 'explore:summary', condition: () => true }),
  getExploreStatsSummary
);

export default router;
