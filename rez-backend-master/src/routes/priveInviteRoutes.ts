/**
 * Privé Invite Routes
 *
 * User-facing API endpoints for the Privé invite system.
 */

import { Router } from 'express';
import {
  checkAccessStatus,
  generateInviteCode,
  validateInviteCode,
  applyInviteCode,
  getMyInviteStats,
  getMyInviteCodes,
  getInviteLeaderboard,
} from '../controllers/priveInviteController';
import { authenticate } from '../middleware/auth';
import { strictLimiter, generalLimiter } from '../middleware/rateLimiter';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==========================================
// Access Check (lightweight, for nav guard)
// ==========================================

/**
 * @route   GET /api/prive/access
 * @desc    Check if user has Privé access
 * @access  Private
 */
router.get('/access', checkAccessStatus);

// ==========================================
// Invite Code Management
// ==========================================

/**
 * @route   POST /api/prive/invites/generate
 * @desc    Generate a new Privé invite code
 * @access  Private (Privé members only)
 */
router.post('/invites/generate', strictLimiter, generateInviteCode);

/**
 * @route   POST /api/prive/invites/validate
 * @desc    Validate an invite code without applying
 * @access  Private
 */
router.post('/invites/validate', validateInviteCode);

/**
 * @route   POST /api/prive/invites/apply
 * @desc    Apply an invite code to get Privé access
 * @access  Private
 */
router.post('/invites/apply', strictLimiter, applyInviteCode);

/**
 * @route   GET /api/prive/invites/stats
 * @desc    Get user's invite dashboard stats
 * @access  Private (Privé members only)
 */
router.get('/invites/stats', getMyInviteStats);

/**
 * @route   GET /api/prive/invites/codes
 * @desc    Get user's active invite codes
 * @access  Private (Privé members only)
 */
router.get('/invites/codes', getMyInviteCodes);

/**
 * @route   GET /api/prive/invites/leaderboard
 * @desc    Get invite leaderboard
 * @access  Private
 */
router.get('/invites/leaderboard', generalLimiter, getInviteLeaderboard);

export default router;
