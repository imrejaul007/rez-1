// Profile Routes
// Routes for user profile management endpoints

import express from 'express';
import {
  getProfile,
  updateProfile,
  getProfileCompletion,
  saveRingSize,
  uploadProfilePicture,
  deleteProfilePicture,
  verifyProfile
} from '../controllers/profileController';
import { authenticate } from '../middleware/auth';
import { uploadProfileImage } from '../middleware/upload';
import { profileUpdateLimiter } from '../middleware/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendError } from '../utils/response';
import { UserReputation } from '../models/UserReputation';
import { User } from '../models/User';

const router = express.Router();

// All profile routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/user/profile
 * @desc    Get user profile data
 * @access  Private
 */
router.get('/', getProfile);

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/', profileUpdateLimiter, updateProfile);

/**
 * @route   GET /api/user/profile/completion
 * @desc    Get profile completion status
 * @access  Private
 */
router.get('/completion', getProfileCompletion);

/**
 * @route   POST /api/user/profile/ring-size
 * @desc    Save ring size to user profile
 * @access  Private
 */
router.post('/ring-size', saveRingSize);

/**
 * @route   POST /api/user/profile/picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post('/picture', uploadProfileImage.single('profilePicture'), uploadProfilePicture);

/**
 * @route   DELETE /api/user/profile/picture
 * @desc    Delete profile picture
 * @access  Private
 */
router.delete('/picture', deleteProfilePicture);

/**
 * @route   POST /api/user/profile/verify
 * @desc    Submit profile verification documents
 * @access  Private
 */
router.post('/verify', verifyProfile);

/**
 * @route   GET /api/user/profile/trust-passport
 * @desc    Get trust score breakdown, tier, credit limit, and verification status
 * @access  Private
 */
router.get('/trust-passport', asyncHandler(async (req, res) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  // Get or create reputation
  let reputation = await UserReputation.findOne({ user: userId });
  if (!reputation) {
    reputation = await UserReputation.create({
      user: userId,
      pillars: {
        engagement: { score: 0, weight: 0.25 },
        trust: { score: 0, weight: 0.20 },
        influence: { score: 0, weight: 0.20 },
        economicValue: { score: 0, weight: 0.15 },
        brandAffinity: { score: 0, weight: 0.10 },
        network: { score: 0, weight: 0.10 },
      },
    });
  }

  let totalScore = 0;
  let tier = 'none';
  let nextTier = 'entry';
  let pointsToNext = 50;

  if (reputation.calculateTotalScore) {
    const result = reputation.calculateTotalScore();
    totalScore = result.totalScore;
    tier = result.tier || 'none';
  } else {
    totalScore = Object.values((reputation as any).pillars || {}).reduce(
      (sum: number, p: any) => sum + (p.score || 0) * (p.weight || 0), 0
    );
  }

  // Determine tier & next tier
  if (totalScore >= 85) { tier = 'elite'; nextTier = ''; pointsToNext = 0; }
  else if (totalScore >= 70) { tier = 'signature'; nextTier = 'elite'; pointsToNext = 85 - totalScore; }
  else if (totalScore >= 50) { tier = 'entry'; nextTier = 'signature'; pointsToNext = 70 - totalScore; }
  else { tier = 'none'; nextTier = 'entry'; pointsToNext = 50 - totalScore; }

  // Credit limit by tier
  const creditLimits: Record<string, number> = { none: 0, entry: 5000, signature: 25000, elite: 100000 };
  const creditLimit = creditLimits[tier] || 0;

  // Verification status
  const user = await User.findById(userId).select('profile.phoneNumber profile.email isPhoneVerified isEmailVerified').lean();
  const verifications = {
    phone: !!(user as any)?.isPhoneVerified || !!(user as any)?.profile?.phoneNumber,
    email: !!(user as any)?.isEmailVerified || !!(user as any)?.profile?.email,
    kyc: false,
    bank: false,
  };

  const pillars = (reputation as any).pillars || {};

  sendSuccess(res, {
    score: Math.round(totalScore),
    tier,
    nextTier,
    pointsToNext: Math.max(0, Math.round(pointsToNext)),
    pillars: {
      engagement: { score: pillars.engagement?.score || 0, weight: 0.25 },
      trust: { score: pillars.trust?.score || 0, weight: 0.20 },
      influence: { score: pillars.influence?.score || 0, weight: 0.20 },
      economicValue: { score: pillars.economicValue?.score || 0, weight: 0.15 },
      brandAffinity: { score: pillars.brandAffinity?.score || 0, weight: 0.10 },
      network: { score: pillars.network?.score || 0, weight: 0.10 },
    },
    creditLimit,
    verifications,
  });
}));

export default router;
