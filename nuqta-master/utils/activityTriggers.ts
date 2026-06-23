/**
 * Activity Triggers - Automatic activity creation
 *
 * This module provides functions to automatically create activity records
 * when users perform various actions throughout the app.
 */

import { activityApi } from '@/services/activityApi';
import { ActivityType } from '@/services/activityApi';

/**
 * Create an activity record
 * @param type - Type of activity
 * @param title - Activity title
 * @param description - Activity description
 * @param metadata - Additional metadata
 * @param amount - Optional amount (for monetary activities)
 */
const createActivity = async (
  type: ActivityType,
  title: string,
  description: string,
  metadata?: Record<string, any>,
  amount?: number
): Promise<void> => {
  try {
    await activityApi.createActivity({
      type,
      title,
      description,
      metadata: metadata || {},
      amount,
    });
  } catch (error) {
    // Silent fail - don't disrupt user experience
  }
};

/**
 * Order-related activity triggers
 */
export const orderActivityTriggers = {
  /**
   * Trigger when user places an order
   */
  onOrderPlaced: async (orderId: string, storeName: string, amount: number) => {
    await createActivity(
      'ORDER' as ActivityType,
      'Order Placed',
      `Placed an order at ${storeName}`,
      { orderId, storeName },
      amount
    );
  },

  /**
   * Trigger when order is delivered
   */
  onOrderDelivered: async (orderId: string, storeName: string) => {
    await createActivity(
      'ORDER' as ActivityType,
      'Order Delivered',
      `Order from ${storeName} was delivered successfully`,
      { orderId, storeName, status: 'delivered' }
    );
  },

  /**
   * Trigger when order is cancelled
   */
  onOrderCancelled: async (orderId: string, storeName: string) => {
    await createActivity(
      'ORDER' as ActivityType,
      'Order Cancelled',
      `Cancelled order from ${storeName}`,
      { orderId, storeName, status: 'cancelled' }
    );
  },
};

/**
 * Cashback-related activity triggers
 */
export const cashbackActivityTriggers = {
  /**
   * Trigger when user earns cashback
   */
  onCashbackEarned: async (amount: number, orderId: string, storeName: string) => {
    await createActivity(
      'CASHBACK' as ActivityType,
      'Cashback Earned',
      `Earned ₹${amount} cashback from ${storeName}`,
      { orderId, storeName, type: 'earned' },
      amount
    );
  },

  /**
   * Trigger when cashback is credited to wallet
   */
  onCashbackCredited: async (amount: number, orderId: string) => {
    await createActivity(
      'CASHBACK' as ActivityType,
      'Cashback Credited',
      `₹${amount} cashback credited to your wallet`,
      { orderId, type: 'credited' },
      amount
    );
  },
};

/**
 * Review-related activity triggers
 */
export const reviewActivityTriggers = {
  /**
   * Trigger when user submits a review
   */
  onReviewSubmitted: async (productId: string, productName: string, rating: number) => {
    await createActivity(
      'REVIEW' as ActivityType,
      'Review Submitted',
      `Reviewed ${productName} (${rating}★)`,
      { productId, productName, rating }
    );
  },

  /**
   * Trigger when user's review gets likes
   */
  onReviewLiked: async (reviewId: string, productName: string, totalLikes: number) => {
    await createActivity(
      'REVIEW' as ActivityType,
      'Review Liked',
      `Your review of ${productName} received ${totalLikes} likes`,
      { reviewId, productName, totalLikes }
    );
  },
};

/**
 * Video-related activity triggers
 */
export const videoActivityTriggers = {
  /**
   * Trigger when user uploads a video
   */
  onVideoUploaded: async (videoId: string, title: string) => {
    await createActivity(
      'VIDEO' as ActivityType,
      'Video Uploaded',
      `Uploaded video: ${title}`,
      { videoId, title }
    );
  },

  /**
   * Trigger when video earns money
   */
  onVideoEarnings: async (videoId: string, title: string, amount: number) => {
    await createActivity(
      'VIDEO' as ActivityType,
      'Video Earnings',
      `Earned ₹${amount} from video: ${title}`,
      { videoId, title },
      amount
    );
  },

  /**
   * Trigger when video reaches view milestone
   */
  onVideoMilestone: async (videoId: string, title: string, views: number) => {
    await createActivity(
      'VIDEO' as ActivityType,
      'Video Milestone',
      `Your video "${title}" reached ${views.toLocaleString()} views!`,
      { videoId, title, views, milestone: views }
    );
  },
};

/**
 * Project-related activity triggers
 */
export const projectActivityTriggers = {
  /**
   * Trigger when user completes a project
   */
  onProjectCompleted: async (projectId: string, title: string, earnings: number) => {
    await createActivity(
      'PROJECT' as ActivityType,
      'Project Completed',
      `Completed project: ${title}`,
      { projectId, title },
      earnings
    );
  },

  /**
   * Trigger when user receives payment for project
   */
  onProjectPayment: async (projectId: string, title: string, amount: number) => {
    await createActivity(
      'PROJECT' as ActivityType,
      'Project Payment',
      `Received ₹${amount} for project: ${title}`,
      { projectId, title, type: 'payment' },
      amount
    );
  },
};

/**
 * Offer-related activity triggers
 */
export const offerActivityTriggers = {
  /**
   * Trigger when user redeems an offer
   */
  onOfferRedeemed: async (offerId: string, offerTitle: string, savings: number) => {
    await createActivity(
      'OFFER' as ActivityType,
      'Offer Redeemed',
      `Redeemed: ${offerTitle}`,
      { offerId, offerTitle },
      savings
    );
  },

  /**
   * Trigger when offer expires unused
   */
  onOfferExpired: async (offerId: string, offerTitle: string) => {
    await createActivity(
      'OFFER' as ActivityType,
      'Offer Expired',
      `Offer expired: ${offerTitle}`,
      { offerId, offerTitle, expired: true }
    );
  },
};

/**
 * Voucher-related activity triggers
 */
export const voucherActivityTriggers = {
  /**
   * Trigger when user purchases a voucher
   */
  onVoucherPurchased: async (voucherId: string, voucherName: string, amount: number) => {
    await createActivity(
      'VOUCHER' as ActivityType,
      'Voucher Purchased',
      `Purchased voucher: ${voucherName}`,
      { voucherId, voucherName, type: 'purchased' },
      amount
    );
  },

  /**
   * Trigger when user redeems a voucher
   */
  onVoucherRedeemed: async (voucherId: string, voucherName: string, storeName: string) => {
    await createActivity(
      'VOUCHER' as ActivityType,
      'Voucher Redeemed',
      `Used ${voucherName} at ${storeName}`,
      { voucherId, voucherName, storeName, type: 'redeemed' }
    );
  },
};

/**
 * Referral-related activity triggers
 */
export const referralActivityTriggers = {
  /**
   * Trigger when user refers someone
   */
  onReferralSent: async (referredEmail: string) => {
    await createActivity(
      'REFERRAL' as ActivityType,
      'Referral Sent',
      `Invited ${referredEmail} to join REZ`,
      { referredEmail, type: 'sent' }
    );
  },

  /**
   * Trigger when referred user signs up
   */
  onReferralJoined: async (referredName: string, bonusAmount: number) => {
    await createActivity(
      'REFERRAL' as ActivityType,
      'Referral Joined',
      `${referredName} joined using your referral!`,
      { referredName, type: 'joined' },
      bonusAmount
    );
  },

  /**
   * Trigger when referral bonus is earned
   */
  onReferralBonus: async (referredName: string, amount: number) => {
    await createActivity(
      'REFERRAL' as ActivityType,
      'Referral Bonus',
      `Earned ₹${amount} referral bonus from ${referredName}`,
      { referredName, type: 'bonus' },
      amount
    );
  },
};

/**
 * Profile-related activity triggers
 */
export const profileActivityTriggers = {
  /**
   * Trigger when user updates profile
   */
  onProfileUpdated: async (fieldsUpdated: string[]) => {
    await createActivity(
      'PROFILE' as ActivityType,
      'Profile Updated',
      `Updated profile: ${fieldsUpdated.join(', ')}`,
      { fieldsUpdated }
    );
  },

  /**
   * Trigger when user adds profile picture
   */
  onProfilePictureAdded: async () => {
    await createActivity(
      'PROFILE' as ActivityType,
      'Profile Picture Added',
      'Added a new profile picture',
      { type: 'picture_added' }
    );
  },

  /**
   * Trigger when user achieves a milestone
   */
  onMilestoneReached: async (milestoneName: string, value: number) => {
    await createActivity(
      'PROFILE' as ActivityType,
      'Milestone Reached',
      `Reached ${milestoneName}: ${value}`,
      { milestoneName, value, type: 'milestone' }
    );
  },
};

/**
 * Store-related activity triggers
 */
export const storeActivityTriggers = {
  /**
   * Trigger when user favorites a store
   */
  onStoreFavorited: async (storeId: string, storeName: string) => {
    await createActivity(
      'OTHER' as ActivityType,
      'Store Favorited',
      `Added ${storeName} to favorites`,
      { storeId, storeName, type: 'store_favorited' }
    );
  },

  /**
   * Trigger when user unfavorites a store
   */
  onStoreUnfavorited: async (storeId: string, storeName: string) => {
    await createActivity(
      'OTHER' as ActivityType,
      'Store Unfavorited',
      `Removed ${storeName} from favorites`,
      { storeId, storeName, type: 'store_unfavorited' }
    );
  },

  /**
   * Trigger when user follows a store
   */
  onStoreFollowed: async (storeId: string, storeName: string) => {
    await createActivity(
      'OTHER' as ActivityType,
      'Store Followed',
      `Started following ${storeName}`,
      { storeId, storeName, type: 'store_followed' }
    );
  },
};

/**
 * Wallet-related activity triggers
 */
export const walletActivityTriggers = {
  /**
   * Trigger when user adds money to wallet
   */
  onWalletRecharge: async (amount: number, method: string) => {
    await createActivity(
      'OTHER' as ActivityType,
      'Wallet Recharged',
      `Added ₹${amount} to wallet via ${method}`,
      { method, type: 'wallet_recharge' },
      amount
    );
  },

  /**
   * Trigger when user withdraws from wallet
   */
  onWalletWithdrawal: async (amount: number, method: string) => {
    await createActivity(
      'OTHER' as ActivityType,
      'Wallet Withdrawal',
      `Withdrew ₹${amount} from wallet to ${method}`,
      { method, type: 'wallet_withdrawal' },
      amount
    );
  },

  /**
   * Trigger when wallet payment succeeds
   */
  onWalletPayment: async (amount: number, purpose: string) => {
    await createActivity(
      'OTHER' as ActivityType,
      'Wallet Payment',
      `Paid ₹${amount} from wallet for ${purpose}`,
      { purpose, type: 'wallet_payment' },
      amount
    );
  },
};

/**
 * Export all triggers as a single object for easy import
 */
export const activityTriggers = {
  order: orderActivityTriggers,
  cashback: cashbackActivityTriggers,
  review: reviewActivityTriggers,
  video: videoActivityTriggers,
  project: projectActivityTriggers,
  offer: offerActivityTriggers,
  voucher: voucherActivityTriggers,
  referral: referralActivityTriggers,
  profile: profileActivityTriggers,
  store: storeActivityTriggers,
  wallet: walletActivityTriggers,
};

/**
 * Batch create multiple activities at once
 */
export const createBatchActivities = async (
  activities: Array<{
    type: ActivityType;
    title: string;
    description: string;
    metadata?: Record<string, any>;
    amount?: number;
  }>
): Promise<void> => {
  try {
    await activityApi.batchCreateActivities(activities);
  } catch (_error) {
    // silently handle
  }
};
