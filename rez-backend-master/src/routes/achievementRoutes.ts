import { Router } from 'express';
import {
  getUserAchievements,
  getUnlockedAchievements,
  getAchievementProgress,
  initializeUserAchievements,
  recalculateAchievements
} from '../controllers/achievementController';
import { authenticate } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';
import { requireGamificationFeature } from '../middleware/gamificationFeatureGate';

const router = Router();

// Rate limiter for achievement recalculation (1 per minute per IP — per-user lock is in controller)
const recalculateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 3,
  message: 'Achievement recalculation is rate limited. Please wait a moment.',
});

// All routes require authentication
router.use(authenticate);

// PHASE 3 — disabled until core is stable
router.use(requireGamificationFeature('achievements', { achievements: [] }));

// Achievement routes
router.get('/', getUserAchievements);
router.get('/unlocked', getUnlockedAchievements);
router.get('/progress', getAchievementProgress);
router.post('/initialize', initializeUserAchievements);
// REMOVED: PUT /update-progress — accepting user-submitted progress values is a security vulnerability
router.post('/recalculate', recalculateLimiter, recalculateAchievements);

export default router;