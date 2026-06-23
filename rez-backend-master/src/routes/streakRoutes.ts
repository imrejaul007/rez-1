import { Router } from 'express';
import streakController from '../controllers/streakController';
import { authenticate } from '../middleware/auth';
import { requireGamificationFeature } from '../middleware/gamificationFeatureGate';

const router = Router();

// All routes require authentication
router.use(authenticate);

// PHASE 2 — disabled until core is stable
router.use(requireGamificationFeature('streaks', { streak: null }));

// Streak routes
router.get('/status', streakController.getUserStreaks.bind(streakController));
router.get('/all', streakController.getUserStreaks.bind(streakController));
router.post('/claim', streakController.updateStreak.bind(streakController));
router.post('/claim-milestone', streakController.claimMilestone.bind(streakController));
router.get('/milestones', streakController.getStreakStatistics.bind(streakController));
router.post('/freeze', streakController.freezeStreak.bind(streakController));
router.get('/stats', streakController.getStreakStatistics.bind(streakController));

export default router;
