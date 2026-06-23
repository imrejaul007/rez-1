// WhatsNew Routes
// API routes for What's New stories feature

import { Router } from 'express';
import { optionalAuth, authenticate } from '../middleware/auth';
import { validate, validateParams, validateQuery } from '../middleware/validation';
import {
  createStorySchema,
  updateStorySchema,
  getStoriesQuerySchema,
  storyIdParamSchema,
} from '../validators/whatsNewValidators';
import {
  getActiveStories,
  getStoryById,
  trackView,
  trackClick,
  trackCompletion,
  getUnseenCount,
  createStory,
  updateStory,
  deleteStory,
  getAllStories,
  getAnalyticsSummary,
} from '../controllers/whatsNewController';

const router = Router();

// ============ PUBLIC / USER ROUTES ============

/**
 * @route   GET /api/whats-new
 * @desc    Get all active stories for the current user
 * @access  Public (optional auth for personalization)
 * @query   includeViewed - Include already viewed stories (default: true)
 */
router.get(
  '/',
  optionalAuth,
  validateQuery(getStoriesQuerySchema),
  getActiveStories
);

/**
 * @route   GET /api/whats-new/unseen-count
 * @desc    Get count of unseen stories for current user
 * @access  Public (optional auth)
 */
router.get(
  '/unseen-count',
  optionalAuth,
  getUnseenCount
);

/**
 * @route   GET /api/whats-new/:id
 * @desc    Get a single story by ID
 * @access  Public (optional auth for view tracking)
 */
router.get(
  '/:id',
  optionalAuth,
  validateParams(storyIdParamSchema),
  getStoryById
);

/**
 * @route   POST /api/whats-new/:id/view
 * @desc    Track story view
 * @access  Public (optional auth for user-specific tracking)
 */
router.post(
  '/:id/view',
  optionalAuth,
  validateParams(storyIdParamSchema),
  trackView
);

/**
 * @route   POST /api/whats-new/:id/click
 * @desc    Track CTA button click
 * @access  Public (optional auth for user-specific tracking)
 */
router.post(
  '/:id/click',
  optionalAuth,
  validateParams(storyIdParamSchema),
  trackClick
);

/**
 * @route   POST /api/whats-new/:id/complete
 * @desc    Track story completion (viewed all slides)
 * @access  Public (optional auth for user-specific tracking)
 */
router.post(
  '/:id/complete',
  optionalAuth,
  validateParams(storyIdParamSchema),
  trackCompletion
);

// ============ ADMIN ROUTES ============

/**
 * @route   GET /api/whats-new/admin/all
 * @desc    Get all stories with analytics (Admin)
 * @access  Private (Admin only)
 */
router.get(
  '/admin/all',
  authenticate,
  getAllStories
);

/**
 * @route   GET /api/whats-new/admin/analytics
 * @desc    Get analytics summary (Admin)
 * @access  Private (Admin only)
 */
router.get(
  '/admin/analytics',
  authenticate,
  getAnalyticsSummary
);

/**
 * @route   POST /api/whats-new/admin
 * @desc    Create a new story (Admin)
 * @access  Private (Admin only)
 */
router.post(
  '/admin',
  authenticate,
  validate(createStorySchema),
  createStory
);

/**
 * @route   PUT /api/whats-new/admin/:id
 * @desc    Update a story (Admin)
 * @access  Private (Admin only)
 */
router.put(
  '/admin/:id',
  authenticate,
  validateParams(storyIdParamSchema),
  validate(updateStorySchema),
  updateStory
);

/**
 * @route   DELETE /api/whats-new/admin/:id
 * @desc    Delete a story (Admin) - Soft delete by default
 * @access  Private (Admin only)
 * @query   hard - Set to 'true' for permanent deletion
 */
router.delete(
  '/admin/:id',
  authenticate,
  validateParams(storyIdParamSchema),
  deleteStory
);

export default router;
