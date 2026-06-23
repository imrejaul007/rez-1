import { logger } from '../config/logger';
import mongoose from 'mongoose';
import EventRewardConfig, { EventRewardAction, IEventRewardRule } from '../models/EventRewardConfig';
import EventAttendance, { EventRewardActionType } from '../models/EventAttendance';
import EventBooking from '../models/EventBooking';
import * as coinService from './coinService';

/**
 * EventRewardService — Central reward engine for the complete event lifecycle.
 *
 * Handles all event-related coin rewards: booking, check-in, sharing, voting,
 * participation, entry, and review. Uses EventRewardConfig for admin-configurable
 * rules and EventAttendance for idempotency.
 *
 * Reward flow:
 * 1. Load config (event-specific → global fallback)
 * 2. Check idempotency (EventAttendance per user+event+action)
 * 3. Check daily limits
 * 4. Award coins via coinService.awardCoins()
 * 5. Record in EventAttendance.rewardsGranted
 * 6. Update EventBooking.rewardsEarned summary
 */

// Map EventRewardAction to CoinTransaction source
const ACTION_TO_SOURCE: Record<string, string> = {
  entry_reward: 'event_entry',
  purchase_reward: 'event_booking',
  sharing_reward: 'event_sharing',
  voting_reward: 'event_rating',
  participation_reward: 'event_participation',
  checkin_reward: 'event_checkin',
  review_reward: 'event_review',
};

export interface GrantEventRewardResult {
  success: boolean;
  coinsAwarded: number;
  status: 'credited' | 'duplicate' | 'limit_reached' | 'no_config' | 'no_rule' | 'verification_required';
  message: string;
  transactionId?: string;
}

/**
 * Grant an event reward to a user.
 *
 * @param userId - The user ID
 * @param eventId - The event ID
 * @param bookingId - The booking ID (required for tracking)
 * @param action - The reward action (entry_reward, checkin_reward, etc.)
 * @param metadata - Additional context for the reward
 */
async function grantEventReward(
  userId: string,
  eventId: string,
  bookingId: string,
  action: EventRewardAction,
  metadata?: Record<string, any>
): Promise<GrantEventRewardResult> {
  // 1. Load reward config (event-specific → global fallback)
  const config = await (EventRewardConfig as any).getForEvent(eventId);
  if (!config) {
    return {
      success: false,
      coinsAwarded: 0,
      status: 'no_config',
      message: 'No reward configuration found for this event',
    };
  }

  // 2. Find the rule for this action
  const rule: IEventRewardRule | undefined = config.rewards.find(
    (r: IEventRewardRule) => r.action === action
  );
  if (!rule || rule.coins === 0) {
    return {
      success: false,
      coinsAwarded: 0,
      status: 'no_rule',
      message: `No reward rule configured for action: ${action}`,
    };
  }

  // 3. Map action to CoinTransaction source
  const coinSource = ACTION_TO_SOURCE[action] || 'event_entry';
  const rewardAction = coinSource as EventRewardActionType;

  // 4. Check idempotency — has this reward already been granted?
  const alreadyGranted = await (EventAttendance as any).hasRewardBeenGranted(eventId, userId, rewardAction);
  if (alreadyGranted) {
    return {
      success: false,
      coinsAwarded: 0,
      status: 'duplicate',
      message: 'Reward already granted for this action',
    };
  }

  // 5. Check verification requirement
  if (rule.requiresVerification) {
    const attendance = await EventAttendance.findOne({ eventId, userId, isVerified: true }).lean();
    if (!attendance) {
      return {
        success: false,
        coinsAwarded: 0,
        status: 'verification_required',
        message: 'Attendance verification required before earning this reward',
      };
    }
  }

  // 6. Check daily limits
  const dailyCount = await (EventAttendance as any).getDailyRewardCount(userId, rewardAction);
  if (dailyCount >= rule.dailyLimit) {
    return {
      success: false,
      coinsAwarded: 0,
      status: 'limit_reached',
      message: `Daily limit of ${rule.dailyLimit} reached for ${action}`,
    };
  }

  // 7. Calculate coins (base * multiplier)
  const coinsToAward = Math.round(rule.coins * (rule.multiplier || 1));

  // 8. Atomically claim the reward slot FIRST (prevents double-grant race condition)
  try {
    const attendance = await (EventAttendance as any).getOrCreate(eventId, userId, bookingId);

    // Atomic: only push reward if this action hasn't been claimed yet
    const claimResult = await EventAttendance.findOneAndUpdate(
      {
        _id: attendance._id,
        'rewardsGranted.action': { $ne: rewardAction }, // Only if action NOT already present
      },
      {
        $push: {
          rewardsGranted: {
            action: rewardAction,
            coinTransactionId: new mongoose.Types.ObjectId(), // placeholder, updated below
            amount: coinsToAward,
            grantedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!claimResult) {
      // Another request already claimed this reward
      return {
        success: false,
        coinsAwarded: 0,
        status: 'duplicate' as const,
        message: 'Reward already granted for this action',
      };
    }

    // 9. Now award coins (safe — we've already claimed the slot atomically)
    const description = getRewardDescription(action, coinsToAward, metadata);

    const transaction = await coinService.awardCoins(
      userId,
      coinsToAward,
      coinSource,
      description,
      {
        eventId,
        bookingId,
        action,
        ...metadata,
      },
      'entertainment' // Event rewards go to entertainment category
    );

    // 10. Update the placeholder coinTransactionId with the real one
    await EventAttendance.findOneAndUpdate(
      { _id: attendance._id, 'rewardsGranted.action': rewardAction },
      { $set: { 'rewardsGranted.$.coinTransactionId': transaction._id } }
    );

    // 11. Update EventBooking.rewardsEarned summary
    try {
      await EventBooking.findByIdAndUpdate(bookingId, {
        $push: {
          rewardsEarned: {
            action: rewardAction,
            coins: coinsToAward,
            grantedAt: new Date(),
          },
        },
      });
    } catch (err) {
      // Non-critical — booking summary update failure shouldn't block reward
      logger.error('[EventRewardService] Failed to update booking rewards summary:', err);
    }

    return {
      success: true,
      coinsAwarded: coinsToAward,
      status: 'credited',
      message: `+${coinsToAward} coins earned!`,
      transactionId: transaction._id?.toString(),
    };
  } catch (error: any) {
    // Handle race condition duplicates
    if (error.code === 11000) {
      return {
        success: false,
        coinsAwarded: 0,
        status: 'duplicate',
        message: 'Reward already granted for this action',
      };
    }

    // If coin award failed after atomic claim, remove the placeholder reward entry
    // so the user can retry later
    try {
      await EventAttendance.findOneAndUpdate(
        { eventId, userId },
        { $pull: { rewardsGranted: { action: rewardAction } } }
      );
    } catch (cleanupErr) {
      logger.error('[EventRewardService] Failed to cleanup placeholder reward:', cleanupErr);
    }

    throw error;
  }
}

/**
 * Get the reward config for an event (for frontend display).
 * Returns the rewards array with action descriptions and coin amounts.
 */
async function getEventRewardInfo(eventId?: string | null): Promise<{
  rewards: Array<{ action: string; coins: number; description: string }>;
  totalPotential: number;
} | null> {
  const config = await (EventRewardConfig as any).getForEvent(eventId || null);
  if (!config) return null;

  const rewards = config.rewards
    .filter((r: IEventRewardRule) => r.coins > 0)
    .map((r: IEventRewardRule) => ({
      action: r.action,
      coins: Math.round(r.coins * (r.multiplier || 1)),
      description: r.description || getActionDisplayName(r.action),
    }));

  const totalPotential = rewards.reduce((sum: number, r: { coins: number }) => sum + r.coins, 0);

  return { rewards, totalPotential };
}

/**
 * Get the global default reward config for entry card display.
 */
async function getGlobalRewardConfig(): Promise<{
  rewards: Array<{ action: string; coins: number; description: string }>;
  totalPotential: number;
} | null> {
  return getEventRewardInfo(null);
}

/**
 * Get user's earned rewards summary for an event.
 */
async function getUserEventRewards(
  userId: string,
  eventId: string
): Promise<Array<{ action: string; coins: number; grantedAt: Date }>> {
  const attendance = await EventAttendance.findOne({ eventId, userId }).lean();
  if (!attendance) return [];

  return attendance.rewardsGranted.map((r) => ({
    action: r.action,
    coins: r.amount,
    grantedAt: r.grantedAt,
  }));
}

// Helper: human-readable descriptions for reward actions
function getRewardDescription(action: string, coins: number, metadata?: Record<string, any>): string {
  const descriptions: Record<string, string> = {
    entry_reward: 'Earned coins for event registration',
    purchase_reward: 'Earned coins for event booking',
    sharing_reward: 'Earned coins for sharing an event',
    voting_reward: 'Earned coins for rating an event',
    participation_reward: 'Earned coins for event participation',
    checkin_reward: 'Earned coins for event check-in',
    review_reward: 'Earned coins for reviewing an event',
  };

  let desc = descriptions[action] || `Event reward: ${action}`;
  if (metadata?.eventName) {
    desc += ` — ${metadata.eventName}`;
  }
  return desc;
}

// Helper: display name for reward actions
function getActionDisplayName(action: string): string {
  const names: Record<string, string> = {
    entry_reward: 'Entry',
    purchase_reward: 'Purchases',
    sharing_reward: 'Sharing',
    voting_reward: 'Voting',
    participation_reward: 'Participation',
    checkin_reward: 'Check-in',
    review_reward: 'Reviews',
  };
  return names[action] || action;
}

export default {
  grantEventReward,
  getEventRewardInfo,
  getGlobalRewardConfig,
  getUserEventRewards,
};
