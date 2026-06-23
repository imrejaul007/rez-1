import { Router } from 'express';
import { getPlatformStats } from '../controllers/platformController';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

const platformLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many requests, please try again later',
});

// GET /api/platform/stats — public, no auth required
router.get('/stats', platformLimiter, getPlatformStats);

export default router;
