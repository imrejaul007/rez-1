import { Router } from 'express';
import surveyController from '../controllers/surveyController';
import { authenticate, optionalAuth } from '../middleware/auth';

const router = Router();

// Public routes (no auth required)
router.get('/', surveyController.getSurveys);
router.get('/categories', surveyController.getCategories);

// Protected routes (auth required) - MUST come before /:id to avoid being matched as ID
router.get('/user/stats', authenticate, surveyController.getUserStats);
router.get('/user/history', authenticate, surveyController.getUserHistory);

// Routes that optionally use auth (for better personalization)
router.get('/:id', optionalAuth, surveyController.getSurveyById);

// Protected action routes (auth required)
router.post('/:id/start', authenticate, surveyController.startSurvey);
router.post('/:id/submit', authenticate, surveyController.submitSurvey);
router.post('/:id/save-progress', authenticate, surveyController.saveProgress);
router.post('/:id/abandon', authenticate, surveyController.abandonSurvey);

export default router;
