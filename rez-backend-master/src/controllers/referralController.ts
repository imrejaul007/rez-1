import { logger } from '../config/logger';
// Referral Controller
// Handles referral program API endpoints

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import referralService from '../services/referralService';
import achievementService from '../services/achievementService';
import redisService from '../services/redisService';

/**
 * @desc    Get referral data
 * @route   GET /api/referral/data
 * @access  Private
 */
export const getReferralData = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    // Get user's referral information
    const user = await User.findById(userId).select('referral').lean();
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Get referral statistics
    const stats = await referralService.getReferralStats(new Types.ObjectId(userId));

    const referralData = {
      title: "Refer and Earn",
      subtitle: "Invite your friends and get free jewellery",
      inviteButtonText: "Invite",
      inviteLink: `${process.env.FRONTEND_URL || 'https://app.rez.com'}/invite/${user.referral?.referralCode || ''}`,
      referralCode: user.referral?.referralCode || '',
      earnedRewards: user.referral?.referralEarnings || 0,
      totalReferrals: user.referral?.totalReferrals || 0,
      pendingRewards: stats.pendingEarnings || 0,
      completedReferrals: stats.completedReferrals || 0,
      isActive: true,
      rewardPerReferral: 100, // 100 RC per successful referral
      maxReferrals: 50 // Maximum referrals per user
    };

    sendSuccess(res, referralData, 'Referral data retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to get referral data', 500);
  }
});

/**
 * @desc    Get referral history
 * @route   GET /api/referral/history
 * @access  Private
 */
export const getReferralHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { page = 1, limit = 20 } = req.query;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const skip = (Number(page) - 1) * Number(limit);
    
    // Get referred users
    const referredUsers = await User.find({ 'referral.referredBy': userId })
      .select('profile.name email createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)).lean();

    const total = await User.countDocuments({ 'referral.referredBy': userId });

    const referrals = referredUsers.map(user => ({
      id: (user._id as any).toString(),
      referredUser: {
        id: (user._id as any).toString(),
        name: (user.profile as any)?.firstName ? `${(user.profile as any).firstName} ${(user.profile as any).lastName || ''}`.trim() : 'Anonymous',
        email: user.email,
        joinedAt: user.createdAt
      },
      status: 'completed', // For now, all referrals are considered completed
      rewardAmount: 100, // 100 RC per referral
      rewardStatus: 'credited',
      createdAt: user.createdAt,
      completedAt: user.createdAt
    }));

    sendSuccess(res, {
      referrals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: Number(page) < Math.ceil(total / Number(limit)),
        hasPrev: Number(page) > 1
      }
    }, 'Referral history retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to get referral history', 500);
  }
});

/**
 * @desc    Get referral statistics
 * @route   GET /api/referral/statistics
 * @access  Private
 */
export const getReferralStatistics = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const stats = await referralService.getReferralStats(new Types.ObjectId(userId));

    const statistics = {
      totalReferrals: stats.totalReferrals || 0,
      completedReferrals: stats.completedReferrals || 0,
      pendingReferrals: stats.pendingReferrals || 0,
      totalEarned: stats.totalEarnings || 0,
      pendingEarnings: stats.pendingEarnings || 0,
      averageRewardPerReferral: stats.totalReferrals > 0 ? (stats.totalEarnings / stats.totalReferrals) : 0,
      conversionRate: stats.totalReferrals > 0 ? (stats.completedReferrals / stats.totalReferrals) * 100 : 0
    };

    sendSuccess(res, statistics, 'Referral statistics retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to get referral statistics', 500);
  }
});

/**
 * @desc    Generate referral link
 * @route   POST /api/referral/generate-link
 * @access  Private
 */
export const generateReferralLink = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const user = await User.findById(userId).select('referral referralCode');
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Initialize referral object if missing
    if (!user.referral) {
      user.referral = {
        referralCode: '',
        referredUsers: [],
        totalReferrals: 0,
        referralEarnings: 0
      };
    }

    // Generate referral code if not exists (will be auto-generated on save via pre-save hook)
    if (!user.referral.referralCode && !user.referralCode) {
      await user.save(); // This triggers the pre-save hook that generates the code
      await user.populate('referral'); // Refresh to get the generated code
    }

    // Use either nested or top-level referral code
    const referralCode = user.referral?.referralCode || user.referralCode || '';

    if (!referralCode) {
      throw new AppError('Failed to generate referral code', 500);
    }

    const referralLink = `${process.env.FRONTEND_URL || 'https://app.rez.com'}/invite/${referralCode}`;

    sendSuccess(res, {
      referralLink,
      referralCode
    }, 'Referral link generated successfully');
  } catch (error) {
    throw new AppError('Failed to generate referral link', 500);
  }
});

/**
 * @desc    Share referral link
 * @route   POST /api/referral/share
 * @access  Private
 */
export const shareReferralLink = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { platform } = req.body;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  // ✅ Input validation: platform must be a valid string
  if (!platform || typeof platform !== 'string') {
    return sendBadRequest(res, 'Platform is required and must be a string');
  }

  // ✅ Input validation: platform must be one of allowed values
  const allowedPlatforms = ['whatsapp', 'telegram', 'email', 'sms', 'facebook', 'twitter', 'copy'];
  if (!allowedPlatforms.includes(platform.toLowerCase())) {
    return sendBadRequest(res, `Invalid platform. Must be one of: ${allowedPlatforms.join(', ')}`);
  }

  try {
    const user = await User.findById(userId).lean();
    if (!user || !user.referral?.referralCode) {
      return sendNotFound(res, 'User or referral code not found');
    }

    const referralLink = `${process.env.FRONTEND_URL || 'https://app.rez.com'}/invite/${user.referral.referralCode}`;

    // In a real application, you would integrate with the respective platform APIs
    // For now, we'll just return success
    // Note: Logging without PII - only platform type and userId (sanitized)
    logger.info(`📱 [REFERRAL] User shared link via ${platform} - UserID: ${userId.toString().slice(-4)}`);

    sendSuccess(res, { success: true }, 'Referral link shared successfully');
  } catch (error) {
    throw new AppError('Failed to share referral link', 500);
  }
});

/**
 * @desc    Claim referral rewards
 * @route   POST /api/referral/claim-rewards
 * @access  Private
 */
export const claimReferralRewards = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    // First, atomically read and zero out referralEarnings to prevent double-claim
    // Uses findOneAndUpdate to return the OLD value (before zeroing) so we know how much to credit
    const userBeforeClaim = await User.findOneAndUpdate(
      {
        _id: userId,
        'referral.referralEarnings': { $gt: 0 }
      },
      {
        $set: { 'referral.referralEarnings': 0 }
      },
      { new: false }  // Return the document BEFORE the update (contains the original earnings)
    );

    if (!userBeforeClaim) {
      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        return sendNotFound(res, 'User not found');
      }
      return sendBadRequest(res, 'No pending rewards to claim');
    }

    const claimedAmount = userBeforeClaim.referral?.referralEarnings || 0;

    // Now credit the wallet atomically
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId },
      {
        $inc: {
          'wallet.balance': claimedAmount,
          'wallet.totalEarned': claimedAmount
        }
      },
      { new: true }
    );

    // Create transaction record
    const transaction = new Transaction({
      user: new Types.ObjectId(userId),
      type: 'credit',
      category: 'bonus',
      amount: claimedAmount,
      currency: 'RC',
      description: 'Referral rewards claimed',
      source: {
        type: 'referral',
        reference: userId,
        description: 'Referral program rewards'
      },
      balanceBefore: ((updatedUser as any)?.wallet?.balance || 0) - claimedAmount,
      balanceAfter: (updatedUser as any)?.wallet?.balance || 0,
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date()
        }]
      }
    });

    await transaction.save();

    sendSuccess(res, {
      success: true,
      totalClaimed: claimedAmount,
      transactionId: (transaction._id as any).toString()
    }, 'Referral rewards claimed successfully');
  } catch (error) {
    throw new AppError('Failed to claim referral rewards', 500);
  }
});

/**
 * @desc    Get referral leaderboard
 * @route   GET /api/referral/leaderboard
 * @access  Private
 */
export const getReferralLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { period = 'month' } = req.query;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!['week', 'month', 'year'].includes(period as string)) {
    return sendBadRequest(res, 'Invalid period. Must be one of: week, month, year');
  }

  try {
    // Cache leaderboard for 5 minutes (heavy aggregation, shared data)
    const cacheKey = `referral:leaderboard:${period}`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      // Add user-specific rank from cached data
      const userEntry = cached.fullRanking?.find((u: any) => u.userId === userId);
      return sendSuccess(res, {
        leaderboard: cached.leaderboard,
        userRank: userEntry ? {
          rank: cached.fullRanking.indexOf(userEntry) + 1,
          totalReferrals: userEntry.totalReferrals || 0,
          totalEarned: userEntry.totalEarned || 0
        } : null
      }, 'Referral leaderboard retrieved successfully');
    }

    // Single aggregation with $facet for both top 10 and full ranking
    const [result] = await User.aggregate([
      {
        $match: {
          'referral.totalReferrals': { $gt: 0 }
        }
      },
      {
        $project: {
          name: {
            $concat: [
              { $ifNull: ['$profile.firstName', ''] },
              ' ',
              { $ifNull: ['$profile.lastName', ''] }
            ]
          },
          totalReferrals: '$referral.totalReferrals',
          totalEarned: '$referral.referralEarnings',
          _id: 1
        }
      },
      { $sort: { totalReferrals: -1 } },
      {
        $facet: {
          top10: [{ $limit: 10 }],
          allRanked: [{ $project: { totalReferrals: 1, totalEarned: 1 } }]
        }
      }
    ]);

    const leaderboard = (result?.top10 || []).map((user: any, index: number) => ({
      rank: index + 1,
      userId: (user._id as any).toString(),
      userName: user.name?.trim() || 'Anonymous',
      totalReferrals: user.totalReferrals,
      totalEarned: user.totalEarned
    }));

    const allRanked = result?.allRanked || [];
    const currentUserRank = allRanked.findIndex((user: any) => (user._id as any).toString() === userId) + 1;
    const currentUser = allRanked.find((user: any) => (user._id as any).toString() === userId);

    // Cache leaderboard + full ranking for user rank lookup
    const fullRanking = allRanked.map((u: any) => ({
      userId: (u._id as any).toString(),
      totalReferrals: u.totalReferrals,
      totalEarned: u.totalEarned
    }));
    redisService.set(cacheKey, { leaderboard, fullRanking }, 300).catch((err) => logger.warn('[Referral] Cache set for leaderboard failed', { error: err.message })); // 5 min cache

    sendSuccess(res, {
      leaderboard,
      userRank: currentUserRank > 0 ? {
        rank: currentUserRank,
        totalReferrals: currentUser?.totalReferrals || 0,
        totalEarned: currentUser?.totalEarned || 0
      } : null
    }, 'Referral leaderboard retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to get referral leaderboard', 500);
  }
});

/**
 * @desc    Get referral code (frontend expects /code endpoint)
 * @route   GET /api/referral/code
 * @access  Private
 */
export const getReferralCode = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const user = await User.findById(userId).select('referral referralCode');
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Initialize referral object if missing
    if (!user.referral) {
      user.referral = {
        referralCode: '',
        referredUsers: [],
        totalReferrals: 0,
        referralEarnings: 0
      };
    }

    // Generate referral code if not exists (will be auto-generated on save via pre-save hook)
    if (!user.referral.referralCode && !user.referralCode) {
      await user.save(); // This triggers the pre-save hook that generates the code
      await user.populate('referral'); // Refresh to get the generated code
    }

    // Use either nested or top-level referral code
    const referralCode = user.referral?.referralCode || user.referralCode || '';

    if (!referralCode) {
      throw new AppError('Failed to generate referral code', 500);
    }

    const referralLink = `${process.env.FRONTEND_URL || 'https://app.rez.com'}/invite/${referralCode}`;

    sendSuccess(res, {
      referralCode,
      referralLink,
      shareMessage: `Join Rez using my referral code ${referralCode} and get exclusive rewards!`
    }, 'Referral code retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to get referral code', 500);
  }
});

/**
 * @desc    Get referral stats (frontend expects /stats endpoint)
 * @route   GET /api/referral/stats
 * @access  Private
 */
export const getReferralStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const user = await User.findById(userId).select('referral wallet').lean();
    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Get referral statistics
    const stats = await referralService.getReferralStats(new Types.ObjectId(userId));

    // Count referred users
    const referredUsersCount = await User.countDocuments({ 'referral.referredBy': userId });

    const referralStats = {
      totalReferrals: user.referral?.totalReferrals || referredUsersCount || 0,
      successfulReferrals: stats.completedReferrals || referredUsersCount || 0,
      pendingReferrals: stats.pendingReferrals || 0,
      totalEarned: user.referral?.referralEarnings || 0,
      availableBalance: user.wallet?.balance || 0,
      rewardPerReferral: 100,
      referralCode: user.referral?.referralCode || '',
      conversionRate: stats.totalReferrals > 0 ? ((stats.completedReferrals / stats.totalReferrals) * 100).toFixed(2) : '0.00',
      lifetimeEarnings: (user.referral?.totalReferrals || 0) * 100
    };

    sendSuccess(res, referralStats, 'Referral stats retrieved successfully');
  } catch (error) {
    throw new AppError('Failed to get referral stats', 500);
  }
});