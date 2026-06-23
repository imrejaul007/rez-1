// Enhanced Referral Tier Controller
// Handles tier-based referral program with viral growth features

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import referralTierService from '../services/referralTierService';
import voucherRedemptionService from '../services/voucherRedemptionService';
import referralAnalyticsService from '../services/referralAnalyticsService';
import referralFraudDetection from '../services/referralFraudDetection';
import Referral, { ReferralStatus } from '../models/Referral';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
// @ts-ignore - qrcode package may not have TypeScript definitions
import QRCode from 'qrcode';

/**
 * @desc    Get current tier and progress
 * @route   GET /api/referral/tier
 * @access  Private
 */
export const getTier = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const tierInfo = await referralTierService.getUserTier(userId);
    const progress = await referralTierService.calculateProgress(userId);
    const stats = await referralTierService.getReferralStats(userId);
    const milestones = await referralTierService.getUpcomingMilestones(userId);

    sendSuccess(res, {
      currentTier: tierInfo.current,
      tierData: tierInfo.data,
      progress,
      stats,
      upcomingMilestones: milestones
    }, 'Tier information retrieved successfully');
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to get tier information', 500);
  }
});

/**
 * @desc    Get claimable rewards
 * @route   GET /api/referral/rewards
 * @access  Private
 */
export const getRewards = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const referrals = await Referral.find({ referrer: userId }).lean();

    const claimableRewards = [];
    const claimedRewards = [];

    for (const referral of referrals) {
      const reward = referral.rewards;

      // Check if referrer has been rewarded
      if (referral.referrerRewarded) {
        claimedRewards.push({
          referralId: referral._id,
          type: 'referrer_bonus',
          amount: reward.referrerAmount,
          description: 'Referrer bonus',
          claimedAt: referral.completedAt
        });
      } else if (referral.status === 'qualified' || referral.status === 'completed') {
        // Referrer reward is claimable
        claimableRewards.push({
          referralId: referral._id,
          type: 'referrer_bonus',
          amount: reward.referrerAmount,
          description: 'Referrer bonus'
        });
      }

      // Check milestone bonus
      if (referral.milestoneRewarded && reward.milestoneBonus) {
        claimedRewards.push({
          referralId: referral._id,
          type: 'milestone_bonus',
          amount: reward.milestoneBonus,
          description: reward.description || 'Milestone bonus',
          claimedAt: referral.completedAt
        });
      } else if (
        !referral.milestoneRewarded &&
        reward.milestoneBonus &&
        (referral.metadata?.milestoneOrders?.count ?? 0) >= 3
      ) {
        // Milestone bonus is claimable
        claimableRewards.push({
          referralId: referral._id,
          type: 'milestone_bonus',
          amount: reward.milestoneBonus,
          description: reward.description || 'Milestone bonus (3+ orders)'
        });
      }

      // Check voucher rewards
      if (reward.voucherCode) {
        claimableRewards.push({
          referralId: referral._id,
          type: 'voucher',
          voucherCode: reward.voucherCode,
          voucherType: reward.voucherType,
          description: reward.description
        });
      }
    }

    sendSuccess(res, {
      claimable: claimableRewards,
      claimed: claimedRewards,
      totalClaimableValue: claimableRewards.reduce((sum, r) => sum + (r.amount || 0), 0)
    }, 'Rewards retrieved successfully');
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to get rewards', 500);
  }
});

/**
 * @desc    Claim specific reward
 * @route   POST /api/referral/claim-reward/:rewardId
 * @access  Private
 */
export const claimReward = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { referralId, rewardType } = req.body;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!referralId || !rewardType) {
    return sendBadRequest(res, 'Referral ID and reward type are required');
  }

  try {
    const referral = await Referral.findById(referralId).lean();

    if (!referral) {
      return sendNotFound(res, 'Referral not found');
    }

    if (referral.referrer.toString() !== userId) {
      return sendError(res, 'Unauthorized: Not your referral', 403);
    }

    const reward = referral.rewards;

    // Check if referral has expired
    if (referral.expiresAt && referral.expiresAt < new Date()) {
      return sendBadRequest(res, 'Referral has expired');
    }

    // Handle different reward types
    if (rewardType === 'referrer_bonus') {
      if (referral.referrerRewarded) {
        return sendBadRequest(res, 'Referrer bonus already claimed');
      }

      if (referral.status !== 'qualified' && referral.status !== 'completed') {
        return sendBadRequest(res, 'Referral not yet qualified for reward');
      }

      // Atomic: mark reward as claimed (prevents race condition on concurrent requests)
      const updated = await Referral.findOneAndUpdate(
        { _id: referralId, referrerRewarded: { $ne: true } },
        { $set: { referrerRewarded: true, referrerRewardedAt: new Date() } },
        { new: true }
      );
      if (!updated) {
        return sendBadRequest(res, 'Reward already claimed');
      }

      // Atomic wallet credit
      const updatedWallet = await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { 'balance.available': reward.referrerAmount, 'balance.total': reward.referrerAmount } },
        { new: true }
      );

      sendSuccess(res, {
        success: true,
        rewardType: 'referrer_bonus',
        amount: reward.referrerAmount,
        newBalance: updatedWallet?.balance?.total || 0
      }, 'Referrer bonus claimed successfully');
    } else if (rewardType === 'milestone_bonus') {
      if (referral.milestoneRewarded) {
        return sendBadRequest(res, 'Milestone bonus already claimed');
      }

      if (!reward.milestoneBonus) {
        return sendNotFound(res, 'No milestone bonus available');
      }

      if ((referral.metadata?.milestoneOrders?.count || 0) < 3) {
        return sendBadRequest(res, 'Referee has not completed 3 orders yet');
      }

      // Atomic: mark milestone as claimed (prevents race condition on concurrent requests)
      const updated = await Referral.findOneAndUpdate(
        { _id: referralId, milestoneRewarded: { $ne: true } },
        { $set: { milestoneRewarded: true, milestoneRewardedAt: new Date() } },
        { new: true }
      );
      if (!updated) {
        return sendBadRequest(res, 'Milestone bonus already claimed');
      }

      // Atomic wallet credit
      const updatedWallet = await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { 'balance.available': reward.milestoneBonus, 'balance.total': reward.milestoneBonus } },
        { new: true }
      );

      sendSuccess(res, {
        success: true,
        rewardType: 'milestone_bonus',
        amount: reward.milestoneBonus,
        newBalance: updatedWallet?.balance?.total || 0
      }, 'Milestone bonus claimed successfully');
    } else if (rewardType === 'voucher') {
      // Claim voucher
      if (!reward.voucherCode) {
        return sendNotFound(res, 'No voucher available');
      }

      const result = await voucherRedemptionService.claimVoucher(userId, referralId);

      sendSuccess(res, result, 'Voucher claimed successfully');
    } else {
      return sendBadRequest(res, 'Invalid reward type');
    }
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to claim reward', 500);
  }
});

/**
 * @desc    Get referral leaderboard
 * @route   GET /api/referral/leaderboard
 * @access  Private
 */
export const getLeaderboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { limit = 100 } = req.query;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const leaderboard = await referralAnalyticsService.getLeaderboard(Number(limit));
    const userRank = await referralAnalyticsService.getUserRank(userId);

    sendSuccess(res, {
      leaderboard,
      userRank
    }, 'Leaderboard retrieved successfully');
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to get leaderboard', 500);
  }
});

/**
 * @desc    Generate QR code for referral
 * @route   POST /api/referral/generate-qr
 * @access  Private
 */
export const generateQR = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return sendNotFound(res, 'User not found');
    }

    // Get or create referral code
    let referralCode = user.referralCode;
    if (!referralCode) {
      referralCode = `REZ${userId.toString().slice(-8).toUpperCase()}`;
      user.referralCode = referralCode;
      await user.save();
    }

    const referralLink = `${process.env.FRONTEND_URL || 'https://rez.app'}/invite/${referralCode}`;

    // Generate QR code
    const qrCode = await QRCode.toDataURL(referralLink, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    sendSuccess(res, {
      qrCode,
      referralLink,
      referralCode
    }, 'QR code generated successfully');
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to generate QR code', 500);
  }
});

/**
 * @desc    Get milestone progress
 * @route   GET /api/referral/milestones
 * @access  Private
 */
export const getMilestones = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const milestones = await referralTierService.getUpcomingMilestones(userId);
    const progress = await referralTierService.calculateProgress(userId);

    sendSuccess(res, {
      current: progress,
      upcoming: milestones
    }, 'Milestones retrieved successfully');
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to get milestones', 500);
  }
});

/**
 * @desc    Get referral analytics
 * @route   GET /api/referral/analytics
 * @access  Private (Admin)
 */
export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { startDate, endDate } = req.query;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const metrics = await referralAnalyticsService.getMetrics(start, end);
    const funnel = await referralAnalyticsService.getConversionFunnel(
      start || end ? { createdAt: { $gte: start, $lte: end } } : {}
    );
    const sourcePerformance = await referralAnalyticsService.getSourcePerformance(
      start || end ? { createdAt: { $gte: start, $lte: end } } : {}
    );

    sendSuccess(res, {
      metrics,
      funnel,
      sourcePerformance
    }, 'Analytics retrieved successfully');
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to get analytics', 500);
  }
});

/**
 * @desc    Check tier upgrade eligibility
 * @route   GET /api/referral/check-upgrade
 * @access  Private
 */
export const checkUpgrade = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  try {
    const upgradeCheck = await referralTierService.checkTierUpgrade(userId);

    if (upgradeCheck.upgraded) {
      // Award tier rewards
      const rewards = await referralTierService.awardTierRewards(userId, upgradeCheck.newTier!);

      sendSuccess(res, {
        upgraded: true,
        oldTier: upgradeCheck.oldTier,
        newTier: upgradeCheck.newTier,
        rewards: rewards.rewards,
        celebrate: true
      }, 'Congratulations! You have been upgraded to a new tier!');
    } else {
      sendSuccess(res, {
        upgraded: false,
        currentTier: upgradeCheck.currentTier,
        qualifiedReferrals: upgradeCheck.qualifiedReferrals
      }, 'No tier upgrade available');
    }
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to check tier upgrade', 500);
  }
});

/**
 * @desc    Validate referral code
 * @route   POST /api/referral/validate-code
 * @access  Public
 */
export const validateCode = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    return sendBadRequest(res, 'Referral code is required');
  }

  try {
    const user = await User.findOne({ referralCode: code.toUpperCase() }).lean();

    if (!user) {
      return sendBadRequest(res, 'Invalid referral code');
    }

    sendSuccess(res, {
      valid: true,
      referrerName: user.fullName || user.username || 'A friend',
      referrerId: user._id
    }, 'Valid referral code');
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to validate code', 500);
  }
});

/**
 * @desc    Apply referral code during registration
 * @route   POST /api/referral/apply-code
 * @access  Private
 */
export const applyCode = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { code, metadata } = req.body;

  if (!userId) {
    return sendError(res, 'Authentication required', 401);
  }

  if (!code) {
    return sendBadRequest(res, 'Referral code is required');
  }

  try {
    const referrer = await User.findOne({ referralCode: code.toUpperCase() }).lean();

    if (!referrer) {
      return sendBadRequest(res, 'Invalid referral code');
    }

    const referee = await User.findById(userId).lean();

    if (!referee) {
      return sendNotFound(res, 'User not found');
    }

    // Check if user already used a referral code
    const existingReferral = await Referral.findOne({ referee: userId }).lean();

    if (existingReferral) {
      return sendBadRequest(res, 'You have already used a referral code');
    }

    // Fraud detection
    const fraudCheck = await referralFraudDetection.checkReferral(
      referrer._id as Types.ObjectId,
      userId,
      metadata || {}
    );

    if (fraudCheck.action === 'block') {
      return sendError(res, 'Referral cannot be processed: ' + fraudCheck.reasons.join(', '), 403);
    }

    // Create referral record
    const referral = new Referral({
      referrer: referrer._id,
      referee: userId,
      referralCode: code.toUpperCase(),
      status: ReferralStatus.REGISTERED,
      registeredAt: new Date(),
      metadata: metadata || {},
      tier: referrer.referralTier || 'STARTER'
    });

    await referral.save();

    // Award immediate registration bonus to referee via atomic wallet update
    await Wallet.findOneAndUpdate(
      { user: userId },
      { $inc: { 'balance.available': 30, 'balance.total': 30 } },
      { upsert: true, new: true }
    );

    sendSuccess(res, {
      success: true,
      referralId: referral._id,
      welcomeBonus: 30,
      message: `Welcome! You've received ₹30 bonus for using ${referrer.fullName || 'a friend'}'s referral code`
    }, 'Referral code applied successfully');
  } catch (error: any) {
    throw new AppError(error.message || 'Failed to apply referral code', 500);
  }
});

export default {
  getTier,
  getRewards,
  claimReward,
  getLeaderboard,
  generateQR,
  getMilestones,
  getAnalytics,
  checkUpgrade,
  validateCode,
  applyCode
};
