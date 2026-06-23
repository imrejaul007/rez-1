// Merchant Social Media Routes
// Handles merchant verification of user-submitted social media posts

import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import {
  listSocialMediaPosts,
  getSocialMediaPost,
  approveSocialMediaPost,
  rejectSocialMediaPost,
  getSocialMediaStats
} from '../controllers/merchant/socialMediaController';

const router = Router();

// All routes require merchant authentication
router.use(authMiddleware);

// @route   GET /api/merchant/social-media-posts
// @desc    Get social media posts for merchant's store
// @access  Private (Merchant)
router.get('/', listSocialMediaPosts);

// @route   GET /api/merchant/social-media-posts/stats
// @desc    Get social media verification statistics
// @access  Private (Merchant)
router.get('/stats', getSocialMediaStats);

// @route   GET /api/merchant/social-media-posts/:postId
// @desc    Get single social media post details
// @access  Private (Merchant)
router.get('/:postId', getSocialMediaPost);

// @route   PUT /api/merchant/social-media-posts/:postId/approve
// @desc    Approve a social media post and credit REZ coins to user
// @access  Private (Merchant)
router.put('/:postId/approve', approveSocialMediaPost);

// @route   PUT /api/merchant/social-media-posts/:postId/reject
// @desc    Reject a social media post with reason
// @access  Private (Merchant)
router.put('/:postId/reject', rejectSocialMediaPost);

export default router;
