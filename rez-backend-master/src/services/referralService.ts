import { logger } from '../config/logger';
// Referral Service
// Business logic for referral program

import { Types } from 'mongoose';
import Referral, { ReferralStatus, IReferral } from '../models/Referral';
import { User } from '../models/User';
import { CoinTransaction } from '../models/CoinTransaction';
import { Wallet } from '../models/Wallet';
import activityService from './activityService';
import { ActivityType } from '../models/Activity';
import challengeService from './challengeService';
import { ReferralTierService } from './referralTierService';
import { reputationService } from './reputationService';

const referralTierService = new ReferralTierService();

interface CreateReferralParams {
  referrerId: Types.ObjectId;
  refereeId: Types.ObjectId;
  referralCode: string;
  shareMethod?: string;
  signupSource?: string;
}

interface ProcessFirstOrderParams {
  refereeId: Types.ObjectId;
  orderId: Types.ObjectId;
  orderAmount: number;
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  milestoneEarnings: number;
  referralBonus: number;
}

interface ReferralHistoryItem {
  _id: any;
  referee: {
    _id: any;
    name: string;
    phone: string;
  };
  status: ReferralStatus;
  rewards: {
    referrerAmount: number;
    milestoneBonus?: number;
  };
  referrerRewarded: boolean;
  milestoneRewarded: boolean;
  createdAt: Date;
  completedAt?: Date;
  metadata: any;
}

class ReferralService {
  /**
   * Create a new referral relationship when user signs up with referral code
   */
  async createReferral(params: CreateReferralParams): Promise<IReferral> {
    const { referrerId, refereeId, referralCode, shareMethod, signupSource } = params;

    // Prevent self-referral
    if (referrerId.toString() === refereeId.toString()) {
      throw new Error('Cannot use your own referral code');
    }

    // Check if referral already exists
    const existingReferral = await Referral.findOne({
      referee: refereeId,
    }).lean();

    if (existingReferral) {
      throw new Error('User already has a referral relationship');
    }

    // Create referral document
    const referral = await Referral.create({
      referrer: referrerId,
      referee: refereeId,
      referralCode,
      status: ReferralStatus.PENDING,
      metadata: {
        shareMethod,
        signupSource,
        sharedAt: new Date(),
      },
    });

    // Create activity for referrer
    await activityService.referral.onReferralSignup(
      referrerId,
      referral._id as Types.ObjectId,
      'New user signed up with your code!'
    );

    // Log without PII - only sanitized IDs
    logger.info(`✅ [REFERRAL] Created referral relationship: ${referrerId.toString().slice(-6)} -> ${refereeId.toString().slice(-6)}`);
    return referral;
  }

  /**
   * Process referee's first order completion
   * - Activate referral
   * - Credit referee's discount (already applied during order)
   * - Credit referrer's reward to wallet
   */
  async processFirstOrder(params: ProcessFirstOrderParams): Promise<void> {
    const { refereeId, orderId, orderAmount } = params;

    // Find pending referral for this referee
    const referral = await Referral.findOne({
      referee: refereeId,
      status: ReferralStatus.PENDING,
    }).populate('referrer', 'phoneNumber profile.firstName');

    if (!referral) {
      // Log without PII - only sanitized ID
      logger.info(`ℹ️ [REFERRAL] No pending referral found for referee ID: ${refereeId.toString().slice(-6)}`);
      return;
    }

    // Update referral status to ACTIVE
    referral.status = ReferralStatus.ACTIVE;
    referral.metadata.refereeFirstOrder = {
      orderId,
      amount: orderAmount,
      completedAt: new Date(),
    };

    // Mark referee as rewarded (discount was applied during order)
    referral.refereeRewarded = true;

    // Credit referrer's reward if not already done
    if (!referral.referrerRewarded) {
      const rewards = referral.rewards as any;
      const rewardAmount = rewards.referrerAmount || 0;

      if (rewardAmount > 0) {
        // Credit via rewardEngine (wallet + CoinTransaction + ledger)
        const { rewardEngine } = await import('../core/rewardEngine');
        await rewardEngine.issue({
          userId: String(referral.referrer),
          amount: rewardAmount,
          rewardType: 'referral',
          source: 'referral',
          description: 'Referral reward - Friend completed first order',
          operationType: 'referral_bonus',
          referenceId: `referral:${referral._id}:first_order`,
          referenceModel: 'Referral',
          metadata: {
            referralId: referral._id,
            referredUser: String(refereeId),
            level: 'first_order',
          },
        });

        // Create activity for referrer
        await activityService.referral.onReferralCompleted(
          referral.referrer as Types.ObjectId,
          referral._id as Types.ObjectId,
          `Friend completed first order! ₹${rewardAmount} earned`
        );

        referral.referrerRewarded = true;
      }
    }

    // Check if this completes the referral (both rewarded)
    if (referral.referrerRewarded && referral.refereeRewarded) {
      referral.status = ReferralStatus.COMPLETED;
      referral.completedAt = new Date();

      // Update challenge progress for referral completion (non-blocking)
      challengeService.updateProgress(
        String(referral.referrer), 'refer_friends', 1,
        { referralId: String(referral._id) }
      ).catch(err => logger.error('[REFERRAL] Challenge progress update failed:', err));

      // Recalculate Privé reputation on referral completion (fire-and-forget)
      reputationService.onReferralCompleted(referral.referrer as Types.ObjectId)
        .catch(err => logger.warn('[REFERRAL] Reputation recalculation failed:', err));
    }

    referral.markModified('metadata');
    await referral.save();

    // Update user referral stats
    await this.updateUserReferralStats(referral.referrer as Types.ObjectId);

    // Auto-check tier upgrade for the referrer (non-blocking)
    referralTierService.checkTierUpgrade(String(referral.referrer))
      .then(result => {
        if (result.upgraded) {
          logger.info(`🏆 [REFERRAL] Referrer auto-upgraded to tier ${result.newTier}`);
        }
      })
      .catch(err => logger.error('[REFERRAL] Tier upgrade check failed:', err));

    // Log without PII - only sanitized referral ID
    logger.info(`✅ [REFERRAL] Processed first order for referral ID: ${(referral._id as any).toString().slice(-6)}`);
  }

  /**
   * Process milestone bonus (after referee's 3rd order)
   */
  async processMilestoneBonus(refereeId: Types.ObjectId, orderCount: number): Promise<void> {
    // Only trigger on 3rd order
    if (orderCount !== 3) {
      return;
    }

    const referral = await Referral.findOne({
      referee: refereeId,
      status: { $in: [ReferralStatus.ACTIVE, ReferralStatus.COMPLETED] },
      milestoneRewarded: false,
    }).lean();

    if (!referral) {
      logger.info(`ℹ️ [REFERRAL] No active referral found for milestone bonus`);
      return;
    }

    const rewards = referral.rewards as any;
    const bonusAmount = rewards.milestoneBonus || 20;

    if (bonusAmount > 0) {
      // Credit via rewardEngine (wallet + CoinTransaction + ledger)
      const { rewardEngine } = await import('../core/rewardEngine');
      await rewardEngine.issue({
        userId: String(referral.referrer),
        amount: bonusAmount,
        rewardType: 'referral',
        source: 'referral',
        description: 'Referral milestone bonus - Friend completed 3 orders',
        operationType: 'referral_bonus',
        referenceId: `referral:${referral._id}:milestone_3`,
        referenceModel: 'Referral',
        metadata: {
          referralId: referral._id,
          referredUser: String(refereeId),
          level: 'milestone_3',
        },
      });

      // Create activity for milestone
      await activityService.referral.onReferralCompleted(
        referral.referrer as Types.ObjectId,
        referral._id as Types.ObjectId,
        `Milestone achieved! ₹${bonusAmount} bonus earned`
      );

      referral.milestoneRewarded = true;
      referral.metadata.milestoneOrders = {
        count: orderCount,
        totalAmount: referral.metadata.milestoneOrders?.totalAmount || 0,
        lastOrderAt: new Date(),
      };
      referral.markModified('metadata');

      await referral.save();

      // Update user referral stats
      await this.updateUserReferralStats(referral.referrer as Types.ObjectId);

      // Auto-check tier upgrade for the referrer (non-blocking)
      referralTierService.checkTierUpgrade(String(referral.referrer))
        .then(result => {
          if (result.upgraded) {
            logger.info(`🏆 [REFERRAL] Referrer auto-upgraded to tier ${result.newTier} after milestone`);
          }
        })
        .catch(err => logger.error('[REFERRAL] Tier upgrade check failed after milestone:', err));

      // Log without PII - only sanitized referral ID
      logger.info(`✅ [REFERRAL] Processed milestone bonus for referral ID: ${(referral._id as any).toString().slice(-6)}`);
    }
  }

  /**
   * Get user's referral statistics
   */
  async getReferralStats(userId: Types.ObjectId): Promise<ReferralStats> {
    const referrals = await Referral.find({ referrer: userId }).lean();

    const stats = referrals.reduce(
      (acc, ref) => {
        acc.totalReferrals++;
        const rewards = ref.rewards as any;

        if (ref.status === ReferralStatus.PENDING) acc.pendingReferrals++;
        if (ref.status === ReferralStatus.ACTIVE) acc.activeReferrals++;
        if (ref.status === ReferralStatus.COMPLETED) acc.completedReferrals++;

        if (ref.referrerRewarded) {
          acc.totalEarnings += rewards.referrerAmount || 0;
        } else if (ref.status !== ReferralStatus.EXPIRED) {
          acc.pendingEarnings += rewards.referrerAmount || 0;
        }

        if (ref.milestoneRewarded) {
          acc.milestoneEarnings += rewards.milestoneBonus || 0;
          acc.totalEarnings += rewards.milestoneBonus || 0;
        }

        return acc;
      },
      {
        totalReferrals: 0,
        activeReferrals: 0,
        completedReferrals: 0,
        pendingReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        milestoneEarnings: 0,
        referralBonus: 50, // Current referral bonus amount
      }
    );

    return stats;
  }

  /**
   * Get user's referral history with referee details
   */
  async getReferralHistory(userId: Types.ObjectId): Promise<ReferralHistoryItem[]> {
    const referrals = await Referral.find({ referrer: userId })
      .populate('referee', 'phoneNumber profile.firstName')
      .sort({ createdAt: -1 })
      .lean() as any[];

    return referrals.map(ref => {
      const referee = ref.referee as any;
      const rewards = ref.rewards as any;
      return {
        _id: ref._id,
        referee: {
          _id: referee._id,
          name: referee.profile?.firstName || referee.phoneNumber || 'User',
          phone: referee.phoneNumber || '',
        },
        status: ref.status,
        rewards: {
          referrerAmount: rewards.referrerAmount || 0,
          milestoneBonus: rewards.milestoneBonus || 0,
        },
        referrerRewarded: ref.referrerRewarded,
        milestoneRewarded: ref.milestoneRewarded,
        createdAt: ref.createdAt,
        completedAt: ref.completedAt,
        metadata: ref.metadata,
      };
    });
  }

  /**
   * Track referral share event
   */
  async trackShare(userId: Types.ObjectId, shareMethod: string): Promise<void> {
    // Log share event without PII - only sanitized user ID
    logger.info(`📤 [REFERRAL] User ID: ${userId.toString().slice(-6)} shared via ${shareMethod}`);

    // Optional: Create activity for sharing
    // await activityService.referral.onReferralShared(userId, shareMethod);
  }

  /**
   * Validate referral code and get referrer info
   */
  async validateReferralCode(code: string): Promise<{ valid: boolean; referrer?: any }> {
    const user = await User.findOne({
      'referral.referralCode': code
    }).select('_id phoneNumber profile.firstName referral.referralCode').lean();

    if (!user) {
      return { valid: false };
    }

    return {
      valid: true,
      referrer: {
        _id: user._id,
        name: user.profile?.firstName || user.phoneNumber,
        referralCode: user.referral?.referralCode,
      },
    };
  }

  /**
   * Update user's referral statistics in User model
   */
  private async updateUserReferralStats(userId: Types.ObjectId): Promise<void> {
    const stats = await this.getReferralStats(userId);

    await User.findByIdAndUpdate(userId, {
      $set: {
        'referral.totalReferrals': stats.totalReferrals,
        'referral.referralEarnings': stats.totalEarnings,
      },
    });
  }

  /**
   * Mark expired referrals (can be called by a cron job)
   */
  async markExpiredReferrals(): Promise<number> {
    const result = await Referral.updateMany(
      {
        status: { $in: [ReferralStatus.PENDING, ReferralStatus.ACTIVE] },
        expiresAt: { $lt: new Date() },
      },
      {
        $set: { status: ReferralStatus.EXPIRED },
      }
    );

    logger.info(`⏰ [REFERRAL] Marked ${result.modifiedCount} referrals as expired`);
    return result.modifiedCount || 0;
  }
}

export default new ReferralService();
