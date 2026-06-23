import { Router } from 'express';
import { optionalAuth, authenticate as authenticateToken } from '../middleware/auth';
import {
  createOfferComment,
  getOfferComments,
  toggleCommentLike,
  replyToComment,
  getMyComments,
  moderateComment,
  getPendingComments,
  getCommentableOffers,
} from '../controllers/offerCommentController';

const router = Router();

/**
 * Offer Comment Routes
 *
 * User endpoints for commenting on offers and earning coins.
 * Admin endpoints for moderation.
 */

// Get offers available for commenting
router.get('/commentable', optionalAuth, getCommentableOffers);

// User's own comments
router.get('/comments/my-comments', authenticateToken, getMyComments);

// Admin moderation
router.get('/comments/pending', authenticateToken, getPendingComments);
router.patch('/comments/:commentId/moderate', authenticateToken, moderateComment);

// Per-offer comments
router.post('/:offerId/comments', authenticateToken, createOfferComment);
router.get('/:offerId/comments', optionalAuth, getOfferComments);
router.post('/:offerId/comments/:commentId/like', authenticateToken, toggleCommentLike);
router.post('/:offerId/comments/:commentId/reply', authenticateToken, replyToComment);

export default router;
