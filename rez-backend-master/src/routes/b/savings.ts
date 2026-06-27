/**
 * Savings Dashboard routes — REZ-vs-NUQTA migration (Phase 0)
 *
 * Sub-router mounted under `/api/b/savings`. All routes require
 * authentication; rate limiting is applied by the parent `/api/b` router.
 *
 * Mirrors the wiring style of `src/routes/streakRoutes.ts`.
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import savingsController from '../../controllers/SavingsController';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.get('/dashboard', savingsController.getDashboard.bind(savingsController));
router.get('/summary', savingsController.getSummary.bind(savingsController));
router.get('/history', savingsController.getHistory.bind(savingsController));
router.get('/goals', savingsController.getGoals.bind(savingsController));
router.post('/goals', savingsController.createGoal.bind(savingsController));
router.put('/goals/:id', savingsController.updateGoal.bind(savingsController));
router.delete('/goals/:id', savingsController.deleteGoal.bind(savingsController));
router.get('/streak', savingsController.getStreak.bind(savingsController));
router.get('/projection', savingsController.getProjection.bind(savingsController));
router.get('/recommendations', savingsController.getRecommendations.bind(savingsController));

export default router;