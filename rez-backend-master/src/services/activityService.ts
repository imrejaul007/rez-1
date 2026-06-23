import { logger } from '../config/logger';
// Activity Service
// Helper service for creating activities from other controllers

import { Types } from 'mongoose';
import { Activity, ActivityType, getActivityTypeDefaults } from '../models/Activity';

interface CreateActivityOptions {
  userId: Types.ObjectId;
  type: ActivityType;
  title: string;
  description?: string;
  amount?: number;
  icon?: string;
  color?: string;
  relatedEntity?: {
    id: Types.ObjectId;
    type: string;
  };
  metadata?: Record<string, any>;
}

/**
 * Create an activity record
 * This is called by other services/controllers to log user activities
 */
export const createActivity = async (options: CreateActivityOptions): Promise<void> => {
  try {
    const { userId, type, title, description, amount, icon, color, relatedEntity, metadata } = options;

    // Get default icon and color if not provided
    const defaults = getActivityTypeDefaults(type);

    const activity = new Activity({
      user: userId,
      type,
      title,
      description,
      amount,
      icon: icon || defaults.icon,
      color: color || defaults.color,
      relatedEntity,
      metadata: metadata || {}
    });

    await activity.save();
    logger.info(`✅ [ACTIVITY] Created ${type} activity for user ${userId}: ${title}`);
  } catch (error) {
    // Silent fail - don't disrupt main flow if activity creation fails
    logger.error(`❌ [ACTIVITY] Failed to create activity:`, error);
  }
};

/**
 * Order Activity Helpers
 */
export const orderActivities = {
  /**
   * Create activity when order is placed
   */
  onOrderPlaced: async (userId: Types.ObjectId, orderId: Types.ObjectId, storeName: string, amount: number) => {
    await createActivity({
      userId,
      type: ActivityType.ORDER,
      title: 'Order Placed',
      description: `Placed an order at ${storeName}`,
      amount,
      relatedEntity: {
        id: orderId,
        type: 'Order'
      },
      metadata: {
        storeName,
        status: 'placed'
      }
    });
  },

  /**
   * Create activity when order is delivered
   */
  onOrderDelivered: async (userId: Types.ObjectId, orderId: Types.ObjectId, storeName: string) => {
    await createActivity({
      userId,
      type: ActivityType.ORDER,
      title: 'Order Delivered',
      description: `Order from ${storeName} was delivered successfully`,
      relatedEntity: {
        id: orderId,
        type: 'Order'
      },
      metadata: {
        storeName,
        status: 'delivered'
      }
    });
  },

  /**
   * Create activity when order is cancelled
   */
  onOrderCancelled: async (userId: Types.ObjectId, orderId: Types.ObjectId, storeName: string) => {
    await createActivity({
      userId,
      type: ActivityType.ORDER,
      title: 'Order Cancelled',
      description: `Cancelled order from ${storeName}`,
      relatedEntity: {
        id: orderId,
        type: 'Order'
      },
      metadata: {
        storeName,
        status: 'cancelled'
      }
    });
  }
};

/**
 * Cashback Activity Helpers
 */
export const cashbackActivities = {
  /**
   * Create activity when cashback is earned
   */
  onCashbackEarned: async (userId: Types.ObjectId, amount: number, orderId: Types.ObjectId, storeName: string) => {
    await createActivity({
      userId,
      type: ActivityType.CASHBACK,
      title: 'Cashback Earned',
      description: `Earned ₹${amount} cashback from ${storeName}`,
      amount,
      relatedEntity: {
        id: orderId,
        type: 'Order'
      },
      metadata: {
        storeName,
        type: 'earned'
      }
    });
  },

  /**
   * Create activity when cashback is credited
   */
  onCashbackCredited: async (userId: Types.ObjectId, amount: number, source: string) => {
    await createActivity({
      userId,
      type: ActivityType.CASHBACK,
      title: 'Cashback Credited',
      description: `₹${amount} cashback credited to your wallet`,
      amount,
      metadata: {
        source,
        type: 'credited'
      }
    });
  }
};

/**
 * Review Activity Helpers
 */
export const reviewActivities = {
  /**
   * Create activity when review is submitted
   */
  onReviewSubmitted: async (userId: Types.ObjectId, reviewId: Types.ObjectId, storeName: string) => {
    await createActivity({
      userId,
      type: ActivityType.REVIEW,
      title: 'Review Submitted',
      description: `Thank you for your feedback on ${storeName}!`,
      relatedEntity: {
        id: reviewId,
        type: 'Review'
      },
      metadata: {
        storeName
      }
    });
  }
};

/**
 * Wallet Activity Helpers
 */
export const walletActivities = {
  /**
   * Create activity when money is added to wallet
   */
  onMoneyAdded: async (userId: Types.ObjectId, amount: number) => {
    await createActivity({
      userId,
      type: ActivityType.WALLET,
      title: 'Money Added',
      description: `Added ₹${amount} to your wallet`,
      amount,
      metadata: {
        type: 'credit'
      }
    });
  },

  /**
   * Create activity when money is spent from wallet
   */
  onMoneySpent: async (userId: Types.ObjectId, amount: number, purpose: string) => {
    await createActivity({
      userId,
      type: ActivityType.WALLET,
      title: 'Money Spent',
      description: `Spent ₹${amount} on ${purpose}`,
      amount,
      metadata: {
        type: 'debit',
        purpose
      }
    });
  }
};

/**
 * Achievement Activity Helpers
 */
export const achievementActivities = {
  /**
   * Create activity when achievement is unlocked
   */
  onAchievementUnlocked: async (userId: Types.ObjectId, achievementId: Types.ObjectId, achievementName: string) => {
    await createActivity({
      userId,
      type: ActivityType.ACHIEVEMENT,
      title: 'Achievement Unlocked',
      description: `${achievementName} badge earned`,
      relatedEntity: {
        id: achievementId,
        type: 'Achievement'
      },
      metadata: {
        achievementName
      }
    });
  }
};

// Referral Activities
export const referralActivities = {
  onReferralSignup: async (userId: Types.ObjectId, referralId: Types.ObjectId, description: string) => {
    await createActivity({
      userId,
      type: ActivityType.REFERRAL,
      title: 'New Referral',
      description,
      relatedEntity: {
        id: referralId,
        type: 'Referral'
      }
    });
  },

  onReferralCompleted: async (userId: Types.ObjectId, referralId: Types.ObjectId, description: string) => {
    await createActivity({
      userId,
      type: ActivityType.REFERRAL,
      title: 'Referral Reward Earned',
      description,
      relatedEntity: {
        id: referralId,
        type: 'Referral'
      }
    });
  }
};

// Export all activity helpers
export const activityService = {
  createActivity,
  order: orderActivities,
  cashback: cashbackActivities,
  review: reviewActivities,
  wallet: walletActivities,
  achievement: achievementActivities,
  referral: referralActivities
};

export default activityService;
