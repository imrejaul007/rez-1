import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { getContent, getContentBySlug, completeContent } from '../controllers/learningController';

const router = Router();

// Public routes (with optional auth for progress tracking)
router.get('/', optionalAuth, getContent);
router.get('/:slug', optionalAuth, getContentBySlug);

// Authenticated routes
router.post('/:id/complete', authenticate, completeContent);

export default router;
