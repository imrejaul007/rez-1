/**
 * Achievement Triggers - Automatic achievement recalculation
 *
 * This module provides functions to automatically recalculate achievements
 * when users perform actions that may unlock new badges.
 */

import { achievementApi, Achievement } from '@/services/achievementApi';
import { activityTriggers } from './activityTriggers';

/**
 * Recalculate achievements silently
 * Used after actions that may unlock achievements
 */
const recalculateAchievements = async (): Promise<void> => {
  try {
    await achievementApi.recalculateAchievements();
  } catch (error) {
    // Silent fail - don't disrupt user experience
  }
};

/**
 * Check for newly unlocked achievements and create activities for them
 */
const checkNewAchievements = async (): Promise<void> => {
  try {
    const response = await achievementApi.getUserAchievements();

    if (response.success && response.data) {
      const achievements = response.data;

      // Find recently unlocked achievements (within last 5 minutes)
      const recentlyUnlocked = achievements.filter((achievement: Achievement) => {
        if (!achievement.unlocked || !achievement.unlockedDate) return false;

        const unlockedTime = new Date(achievement.unlockedDate).getTime();
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;

        return unlockedTime >= fiveMinutesAgo;
      });

      // Create activities for newly unlocked achievements
      for (const achievement of recentlyUnlocked) {
        await activityTriggers.profile.onMilestoneReached(
          achievement.title,
          achievement.progress
        );
      }
    }
  } catch (_error) {
    // silently handle
  }
};

/**
 * Achievement trigger categories
 * Call these after actions that may contribute to achievements
 */

/**
 * Order-related achievement triggers
 */
export const orderAchievementTriggers = {
  /**
   * Trigger after order is placed
   * May unlock: FIRST_ORDER, ORDER_5, ORDER_10, ORDER_25, ORDER_50, ORDER_100
   */
  onOrderPlaced: async () => {
    await recalculateAchievements();
    await checkNewAchievements();
  },

  /**
   * Trigger after order is delivered
   * May unlock: Same as onOrderPlaced (counts delivered orders)
   */
  onOrderDelivered: async () => {
    await recalculateAchievements();
    await checkNewAchievements();
  },
};

/**
 * Spending-related achievement triggers
 */
export const spendingAchievementTriggers = {
  /**
   * Trigger after payment is made
   * May unlock: SPEND_1K, SPEND_5K, SPEND_10K, SPEND_25K, SPEND_50K, SPEND_100K
   */
  onPaymentMade: async (amount: number) => {
    // Only recalculate if amount is significant (₹100+)
    if (amount >= 100) {
      await recalculateAchievements();
      await checkNewAchievements();
    }
  },
};

/**
 * Review-related achievement triggers
 */
export const reviewAchievementTriggers = {
  /**
   * Trigger after review is submitted
   * May unlock: FIRST_REVIEW, REVIEW_10, REVIEW_25, REVIEW_50
   */
  onReviewSubmitted: async () => {
    await recalculateAchievements();
    await checkNewAchievements();
  },
};

/**
 * Video-related achievement triggers
 */
export const videoAchievementTriggers = {
  /**
   * Trigger after video is uploaded
   * May unlock: VIDEO_1, VIDEO_10, VIDEO_25
   */
  onVideoUploaded: async () => {
    await recalculateAchievements();
    await checkNewAchievements();
  },

  /**
   * Trigger when video earnings are credited
   * May unlock: VIDEO_EARNINGS_500, VIDEO_EARNINGS_1K, VIDEO_EARNINGS_5K
   */
  onVideoEarningsReceived: async (amount: number) => {
    if (amount >= 50) {
      await recalculateAchievements();
      await checkNewAchievements();
    }
  },
};

/**
 * Referral-related achievement triggers
 */
export const referralAchievementTriggers = {
  /**
   * Trigger when referred user joins
   * May unlock: REFERRAL_1, REFERRAL_5, REFERRAL_10
   */
  onReferralJoined: async () => {
    await recalculateAchievements();
    await checkNewAchievements();
  },
};

/**
 * Profile completion achievement trigger
 */
export const profileAchievementTriggers = {
  /**
   * Trigger after profile is updated
   * May unlock: PROFILE_COMPLETE
   */
  onProfileUpdated: async () => {
    await recalculateAchievements();
    await checkNewAchievements();
  },

  /**
   * Trigger after profile picture is added
   * May contribute to: PROFILE_COMPLETE
   */
  onProfilePictureAdded: async () => {
    await recalculateAchievements();
    await checkNewAchievements();
  },
};

/**
 * Wallet-related achievement trigger
 */
export const walletAchievementTriggers = {
  /**
   * Trigger after wallet recharge
   * May unlock: WALLET_LOADED
   */
  onWalletRecharged: async () => {
    await recalculateAchievements();
    await checkNewAchievements();
  },
};

/**
 * Export all achievement triggers
 */
export const achievementTriggers = {
  order: orderAchievementTriggers,
  spending: spendingAchievementTriggers,
  review: reviewAchievementTriggers,
  video: videoAchievementTriggers,
  referral: referralAchievementTriggers,
  profile: profileAchievementTriggers,
  wallet: walletAchievementTriggers,

  // Manual recalculation
  recalculate: recalculateAchievements,
  checkNew: checkNewAchievements,
};

/**
 * Combined trigger: Recalculate and check in one call
 */
export const triggerAchievementCheck = async (): Promise<void> => {
  await recalculateAchievements();
  await checkNewAchievements();
};
