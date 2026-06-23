import mongoose from 'mongoose';
import { EngagementRewardLog } from '../models/EngagementRewardLog';
import { PendingCoinReward } from '../models/PendingCoinReward';
import coinService from './coinService';

/**
 * EngagementRewardService — Central service for all Share & Engage coin rewards.
 *
 * Handles idempotency, daily rate limits, quality checks, and reward granting
 * for all 6 engagement types (share, poll, comment, photo, reel, event rating).
 *
 * For actions requiring moderation (photo_upload, offer_comment, ugc_reel):
 *   Creates a PendingCoinReward → admin/merchant approves → creditCoins()
 *
 * For instant-reward actions (share_store, poll_vote, event_rating):
 *   Directly calls coinService.awardCoins()
 */

export interface EngagementRewardConfig {
  action: string;
  coinTransactionSource: string;   // Maps to CoinTransaction.source enum value
  baseCoins: number;
  bonusCoins: number;              // Extra coins for quality thresholds
  dailyLimit: number;
  requiresModeration: boolean;
  pendingSource?: string;          // PendingCoinReward source (for moderation-required actions)
  pendingReferenceType?: string;   // PendingCoinReward referenceType
  qualityChecks?: {
    minLength?: number;            // Min text length for comments/reviews
    minPhotos?: number;            // Min number of photos
    minDuration?: number;          // Min video duration in seconds
  };
}

/**
 * Reward configurations for all engagement actions.
 * Phase 6 will make these admin-configurable via EngagementConfig model.
 */
const ENGAGEMENT_CONFIGS: Record<string, EngagementRewardConfig> = {
  share_store: {
    action: 'share_store',
    coinTransactionSource: 'social_share_reward',
    baseCoins: 10,
    bonusCoins: 0,
    dailyLimit: 5,
    requiresModeration: false,
  },
  share_offer: {
    action: 'share_offer',
    coinTransactionSource: 'social_share_reward',
    baseCoins: 5,
    bonusCoins: 0,
    dailyLimit: 10,
    requiresModeration: false,
  },
  poll_vote: {
    action: 'poll_vote',
    coinTransactionSource: 'poll_vote',
    baseCoins: 10,
    bonusCoins: 0,
    dailyLimit: 3,
    requiresModeration: false,
  },
  offer_comment: {
    action: 'offer_comment',
    coinTransactionSource: 'offer_comment',
    baseCoins: 15,
    bonusCoins: 5,
    dailyLimit: 5,
    requiresModeration: true,
    pendingSource: 'offer_comment',
    pendingReferenceType: 'comment',
    qualityChecks: {
      minLength: 20,
    },
  },
  photo_upload: {
    action: 'photo_upload',
    coinTransactionSource: 'photo_upload',
    baseCoins: 25,
    bonusCoins: 75,
    dailyLimit: 3,
    requiresModeration: true,
    pendingSource: 'photo_upload',
    pendingReferenceType: 'photo',
    qualityChecks: {
      minPhotos: 1,
    },
  },
  ugc_reel: {
    action: 'ugc_reel',
    coinTransactionSource: 'ugc_reel',
    baseCoins: 50,
    bonusCoins: 150,
    dailyLimit: 2,
    requiresModeration: true,
    pendingSource: 'ugc_reel',
    pendingReferenceType: 'reel',
    qualityChecks: {
      minDuration: 10,
    },
  },
  event_rating: {
    action: 'event_rating',
    coinTransactionSource: 'event_rating',
    baseCoins: 20,
    bonusCoins: 5, // Bonus for verified booking
    dailyLimit: 3,
    requiresModeration: false,
  },
};

export interface GrantRewardResult {
  success: boolean;
  coinsAwarded: number;
  status: 'credited' | 'pending' | 'duplicate' | 'limit_reached' | 'quality_failed';
  message: string;
  pendingRewardId?: string;
  logId?: string;
}

/**
 * Grant an engagement reward to a user.
 *
 * @param userId - The user performing the action
 * @param action - The action type (key from ENGAGEMENT_CONFIGS)
 * @param referenceId - ID of the content being acted upon (poll, offer, event, etc.)
 * @param metadata - Additional context (e.g., { rating, isVerifiedBooking })
 * @param qualityData - Data for quality checks (e.g., { textLength, photoCount, videoDuration })
 */
async function grantReward(
  userId: string,
  action: string,
  referenceId: string,
  metadata?: Record<string, any>,
  qualityData?: { textLength?: number; photoCount?: number; videoDuration?: number }
): Promise<GrantRewardResult> {
  const config = ENGAGEMENT_CONFIGS[action];
  if (!config) {
    throw new Error(`Unknown engagement action: ${action}`);
  }

  // 1. Idempotency check — prevent double-crediting
  const alreadyRewarded = await EngagementRewardLog.hasBeenRewarded(userId, action, referenceId);
  if (alreadyRewarded) {
    return {
      success: false,
      coinsAwarded: 0,
      status: 'duplicate',
      message: 'Reward already granted for this action',
    };
  }

  // 2. Daily rate limit check
  const dailyCount = await EngagementRewardLog.getDailyCount(userId, action);
  if (dailyCount >= config.dailyLimit) {
    return {
      success: false,
      coinsAwarded: 0,
      status: 'limit_reached',
      message: `Daily limit of ${config.dailyLimit} reached for ${action}`,
    };
  }

  // 3. Quality threshold check (if applicable)
  if (config.qualityChecks && qualityData) {
    if (config.qualityChecks.minLength && (qualityData.textLength || 0) < config.qualityChecks.minLength) {
      return {
        success: false,
        coinsAwarded: 0,
        status: 'quality_failed',
        message: `Minimum text length is ${config.qualityChecks.minLength} characters`,
      };
    }
    if (config.qualityChecks.minPhotos && (qualityData.photoCount || 0) < config.qualityChecks.minPhotos) {
      return {
        success: false,
        coinsAwarded: 0,
        status: 'quality_failed',
        message: `Minimum ${config.qualityChecks.minPhotos} photo(s) required`,
      };
    }
    if (config.qualityChecks.minDuration && (qualityData.videoDuration || 0) < config.qualityChecks.minDuration) {
      return {
        success: false,
        coinsAwarded: 0,
        status: 'quality_failed',
        message: `Minimum video duration is ${config.qualityChecks.minDuration} seconds`,
      };
    }
  }

  // 4. Calculate coins (base + bonus for quality)
  let coinsToAward = config.baseCoins;
  let earnedBonus = false;

  // Quality bonus logic
  if (config.bonusCoins > 0 && metadata) {
    // Event rating: bonus for verified booking
    if (action === 'event_rating' && metadata.isVerifiedBooking) {
      coinsToAward += config.bonusCoins;
      earnedBonus = true;
    }
    // Offer comment: bonus for longer comments (100+ chars)
    if (action === 'offer_comment' && qualityData?.textLength && qualityData.textLength >= 100) {
      coinsToAward += config.bonusCoins;
      earnedBonus = true;
    }
    // Photo upload and UGC reel bonuses are awarded during moderation
    // (admin sets quality score → bonus applied at credit time)
  }

  // 5. Grant reward — instant or pending moderation
  if (config.requiresModeration) {
    // Create PendingCoinReward for admin/merchant review
    const pendingReward = await PendingCoinReward.create({
      user: new mongoose.Types.ObjectId(userId),
      amount: coinsToAward,
      percentage: 0,
      source: config.pendingSource!,
      referenceType: config.pendingReferenceType!,
      referenceId: new mongoose.Types.ObjectId(referenceId),
      status: 'pending',
      submittedAt: new Date(),
      metadata: {
        action,
        earnedBonus,
        ...metadata,
      },
    });

    // Log for idempotency (status: pending)
    const log = await EngagementRewardLog.create({
      user: new mongoose.Types.ObjectId(userId),
      action,
      referenceId,
      coinsAwarded: coinsToAward,
      status: 'pending',
      pendingRewardId: pendingReward._id,
      metadata,
    });

    return {
      success: true,
      coinsAwarded: coinsToAward,
      status: 'pending',
      message: `Submitted for review. ${coinsToAward} coins will be credited upon approval.`,
      pendingRewardId: (pendingReward._id as any).toString(),
      logId: (log._id as any).toString(),
    };
  } else {
    // Instant reward — credit directly
    try {
      const description = getRewardDescription(action, coinsToAward, earnedBonus);

      await coinService.awardCoins(
        userId,
        coinsToAward,
        config.coinTransactionSource,
        description,
        {
          engagementAction: action,
          referenceId,
          earnedBonus,
          ...metadata,
        }
      );

      // Log for idempotency (status: credited)
      const log = await EngagementRewardLog.create({
        user: new mongoose.Types.ObjectId(userId),
        action,
        referenceId,
        coinsAwarded: coinsToAward,
        status: 'credited',
        metadata,
      });

      return {
        success: true,
        coinsAwarded: coinsToAward,
        status: 'credited',
        message: `+${coinsToAward} coins earned!${earnedBonus ? ' (includes bonus)' : ''}`,
        logId: (log._id as any).toString(),
      };
    } catch (error: any) {
      // If the idempotency index rejects the insert, it was a race condition duplicate
      if (error.code === 11000) {
        return {
          success: false,
          coinsAwarded: 0,
          status: 'duplicate',
          message: 'Reward already granted for this action',
        };
      }
      throw error;
    }
  }
}

/**
 * Get the configuration for a specific engagement action.
 */
function getConfig(action: string): EngagementRewardConfig | null {
  return ENGAGEMENT_CONFIGS[action] || null;
}

/**
 * Get daily remaining count for an action.
 */
async function getDailyRemaining(userId: string, action: string): Promise<number> {
  const config = ENGAGEMENT_CONFIGS[action];
  if (!config) return 0;

  const dailyCount = await EngagementRewardLog.getDailyCount(userId, action);
  return Math.max(0, config.dailyLimit - dailyCount);
}

/**
 * Get all daily remaining counts for a user.
 */
async function getAllDailyRemaining(userId: string): Promise<Record<string, { remaining: number; limit: number; coins: number }>> {
  const result: Record<string, { remaining: number; limit: number; coins: number }> = {};

  for (const [action, config] of Object.entries(ENGAGEMENT_CONFIGS)) {
    const dailyCount = await EngagementRewardLog.getDailyCount(userId, action);
    result[action] = {
      remaining: Math.max(0, config.dailyLimit - dailyCount),
      limit: config.dailyLimit,
      coins: config.baseCoins,
    };
  }

  return result;
}

/**
 * Update the status of an engagement reward log entry.
 * Called when a PendingCoinReward is approved/rejected.
 */
async function updateRewardStatus(
  pendingRewardId: string,
  status: 'credited' | 'rejected'
): Promise<void> {
  await EngagementRewardLog.findOneAndUpdate(
    { pendingRewardId: new mongoose.Types.ObjectId(pendingRewardId) },
    { status }
  );
}

/**
 * Generate a human-readable description for the reward.
 */
function getRewardDescription(action: string, coins: number, earnedBonus: boolean): string {
  const descriptions: Record<string, string> = {
    share_store: 'Earned coins for sharing a store',
    share_offer: 'Earned coins for sharing an offer',
    poll_vote: 'Earned coins for voting in a poll',
    offer_comment: 'Earned coins for commenting on an offer',
    photo_upload: 'Earned coins for uploading photos',
    ugc_reel: 'Earned coins for creating a reel',
    event_rating: 'Earned coins for rating an event',
  };

  let desc = descriptions[action] || `Engagement reward: ${action}`;
  if (earnedBonus) {
    desc += ' (quality bonus included)';
  }
  return desc;
}

export default {
  grantReward,
  getConfig,
  getDailyRemaining,
  getAllDailyRemaining,
  updateRewardStatus,
  ENGAGEMENT_CONFIGS,
};
