// Verification Routes
// Handles routes for zone-specific user verification

import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { uploadVerificationDocument } from '../middleware/upload';
import {
  getVerificationStatus,
  getZoneVerificationStatus,
  submitVerification,
  reviewVerification,
  getVerificationMethods,
} from '../controllers/verificationController';

const router = Router();

/**
 * @route   GET /api/user/verifications/methods/:zone
 * @desc    Get available verification methods for a zone
 * @access  Public
 */
router.get('/methods/:zone', getVerificationMethods);

// All routes below require authentication
router.use(authenticate);

/**
 * @route   GET /api/user/verifications
 * @desc    Get all verification statuses for current user
 * @access  Private
 */
router.get('/', getVerificationStatus);

/**
 * @route   GET /api/user/verifications/:zone
 * @desc    Get verification status for a specific zone
 * @access  Private
 */
router.get('/:zone', getZoneVerificationStatus);

/**
 * @route   POST /api/user/verifications/:zone
 * @desc    Submit verification for a specific zone
 * @access  Private
 * @body    { method, email?, documentNumber?, documentImage?, additionalInfo? }
 */
router.post('/:zone',
  uploadVerificationDocument.single('document'),
  submitVerification
);

/**
 * @route   POST /api/user/verifications/:zone/review
 * @desc    Admin: Approve or reject a verification
 * @access  Private (Admin only)
 * @body    { userId, action: 'approve' | 'reject', reason? }
 */
router.post('/:zone/review', requireAdmin, reviewVerification);

export default router;
