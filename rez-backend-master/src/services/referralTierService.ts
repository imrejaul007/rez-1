import crypto from 'crypto';
import Referral, { ReferralStatus } from '../models/Referral';
import { User } from '../models/User';
import { REFERRAL_TIERS } from '../types/referral.types';
import { Types } from 'mongoose';

export class ReferralTierService {
  /**
   * Get user's current referral tier
   */
  async getUserTier(userId: string | Types.ObjectId) {
    const qualifiedReferrals = await this.getQualifiedReferralsCount(userId);

    let currentTier = 'STARTER';
    const tiers = Object.keys(REFERRAL_TIERS).reverse(); // Start from highest tier

    for (const tier of tiers) {
      if (qualifiedReferrals >= REFERRAL_TIERS[tier].referralsRequired) {
        currentTier = tier;
        break;
      }
    }

    return {
      current: currentTier,
      data: REFERRAL_TIERS[currentTier],
      qualifiedReferrals
    };
  }

  /**
   * Calculate progress to next tier
   */
  async calculateProgress(userId: string | Types.ObjectId) {
    const { current, qualifiedReferrals } = await this.getUserTier(userId);
    const tiers = Object.keys(REFERRAL_TIERS);
    const currentIndex = tiers.indexOf(current);

    if (currentIndex === tiers.length - 1) {
      return {
        currentTier: current,
        nextTier: null,
        progress: 100,
        referralsNeeded: 0,
        qualifiedReferrals
      };
    }

    const nextTier = tiers[currentIndex + 1];
    const nextTierData = REFERRAL_TIERS[nextTier];
    const currentTierData = REFERRAL_TIERS[current];

    const referralsNeeded = nextTierData.referralsRequired - qualifiedReferrals;
    const progress = ((qualifiedReferrals - currentTierData.referralsRequired) /
                     (nextTierData.referralsRequired - currentTierData.referralsRequired)) * 100;

    return {
      currentTier: current,
      nextTier,
      nextTierData,
      progress: Math.min(100, Math.max(0, progress)),
      referralsNeeded,
      qualifiedReferrals
    };
  }

  /**
   * Check if user qualified for tier upgrade
   */
  async checkTierUpgrade(userId: string | Types.ObjectId) {
    const user = await User.findById(userId).lean();
    if (!user) throw new Error('User not found');

    const currentStoredTier = user.referralTier || 'STARTER';
    const { current: actualTier, qualifiedReferrals } = await this.getUserTier(userId);

    if (currentStoredTier !== actualTier) {
      // Tier upgrade detected!
      return {
        upgraded: true,
        oldTier: currentStoredTier,
        newTier: actualTier,
        qualifiedReferrals
      };
    }

    return {
      upgraded: false,
      currentTier: actualTier,
      qualifiedReferrals
    };
  }

  /**
   * Award tier upgrade rewards
   */
  async awardTierRewards(userId: string | Types.ObjectId, newTier: string) {
    const tierData = REFERRAL_TIERS[newTier];
    const rewards = [];

    // Award tier bonus coins via atomic wallet update
    if (tierData.rewards.tierBonus) {
      const { Wallet } = require('../models/Wallet');
      await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { 'balance.available': tierData.rewards.tierBonus, 'balance.total': tierData.rewards.tierBonus } },
        { upsert: true, new: true }
      );
      rewards.push({
        type: 'coins' as const,
        amount: tierData.rewards.tierBonus,
        claimed: true,
        claimedAt: new Date(),
        description: `${tierData.name} tier bonus`
      });
    }

    // Award voucher
    if (tierData.rewards.voucher) {
      const voucherCode = await this.generateVoucherCode(tierData.rewards.voucher.type, tierData.rewards.voucher.amount);
      rewards.push({
        type: 'voucher' as const,
        amount: tierData.rewards.voucher.amount,
        voucherCode,
        voucherType: tierData.rewards.voucher.type,
        claimed: false,
        description: `${tierData.rewards.voucher.type} ₹${tierData.rewards.voucher.amount} voucher`
      });
    }

    // Build user update fields
    const userUpdate: any = {
      referralTier: newTier,
    };

    // Award lifetime premium
    if (tierData.rewards.lifetimePremium) {
      userUpdate.isPremium = true;
      userUpdate.premiumExpiresAt = new Date('2099-12-31'); // Lifetime
      rewards.push({
        type: 'premium' as const,
        claimed: true,
        claimedAt: new Date(),
        description: 'Lifetime Premium Membership'
      });
    }

    // Atomic user update (no .lean() + .save() conflict)
    await User.findByIdAndUpdate(userId, { $set: userUpdate });

    return {
      rewards,
      newTier,
      tierData
    };
  }

  /**
   * Get upcoming milestones for user
   */
  async getUpcomingMilestones(userId: string | Types.ObjectId) {
    const { current, qualifiedReferrals } = await this.getUserTier(userId);
    const tiers = Object.keys(REFERRAL_TIERS);
    const currentIndex = tiers.indexOf(current);

    const milestones = [];

    for (let i = currentIndex + 1; i < tiers.length; i++) {
      const tier = tiers[i];
      const tierData = REFERRAL_TIERS[tier];

      milestones.push({
        tier,
        name: tierData.name,
        referralsRequired: tierData.referralsRequired,
        referralsRemaining: tierData.referralsRequired - qualifiedReferrals,
        rewards: tierData.rewards
      });
    }

    return milestones;
  }

  /**
   * Get count of qualified referrals
   */
  private async getQualifiedReferralsCount(userId: string | Types.ObjectId) {
    return await Referral.countDocuments({
      referrer: userId,
      status: { $in: [ReferralStatus.QUALIFIED, ReferralStatus.COMPLETED] }
    });
  }

  /**
   * Generate voucher code (integrate with voucher provider)
   */
  private async generateVoucherCode(type: string, amount: number): Promise<string> {
    // TODO: Integrate with actual voucher provider API (Amazon, etc.)
    // For now, generate a placeholder code
    const prefix = type.substring(0, 3).toUpperCase();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${amount}-${random}`;
  }

  /**
   * Get referral statistics for user
   */
  async getReferralStats(userId: string | Types.ObjectId) {
    const [
      totalReferrals,
      qualifiedReferrals,
      pendingReferrals,
      allReferrals
    ] = await Promise.all([
      Referral.countDocuments({ referrer: userId }),
      Referral.countDocuments({
        referrer: userId,
        status: { $in: [ReferralStatus.QUALIFIED, ReferralStatus.COMPLETED] }
      }),
      Referral.countDocuments({
        referrer: userId,
        status: ReferralStatus.PENDING
      }),
      Referral.find({ referrer: userId }).lean()
    ]);

    // Calculate lifetime earnings
    const lifetimeEarnings = allReferrals.reduce((sum: number, ref: any) => {
      // rewards is an object with referrerAmount, refereeDiscount, milestoneBonus
      // Only count referrerAmount as it's what the user earns
      const earned = ref.referrerRewarded ? (ref.rewards.referrerAmount || 0) : 0;
      return sum + earned;
    }, 0);

    const { current, data } = await this.getUserTier(userId);
    const progress = await this.calculateProgress(userId);

    return {
      totalReferrals,
      qualifiedReferrals,
      pendingReferrals,
      lifetimeEarnings,
      currentTier: current,
      currentTierData: data,
      nextTier: progress.nextTier,
      progressToNextTier: progress.progress,
      successRate: totalReferrals > 0 ? (qualifiedReferrals / totalReferrals) * 100 : 0
    };
  }
}

export default new ReferralTierService();
