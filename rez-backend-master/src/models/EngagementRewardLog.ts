import mongoose, { Schema, Document, Model } from 'mongoose';

/**
 * EngagementRewardLog — Idempotency guard for engagement-based coin rewards.
 *
 * Prevents double-crediting by maintaining a unique compound index on
 * { user, action, referenceId }. Before granting any reward, the
 * engagementRewardService checks this log to ensure the same user + action + reference
 * combination hasn't already been rewarded.
 */
export interface IEngagementRewardLog extends Document {
  user: mongoose.Types.ObjectId;
  action: string;           // e.g., 'share_store', 'poll_vote', 'event_rating', etc.
  referenceId: string;      // The ID of the content being acted upon (poll, offer, event, etc.)
  coinsAwarded: number;
  status: 'pending' | 'credited' | 'rejected';
  pendingRewardId?: mongoose.Types.ObjectId; // Reference to PendingCoinReward if moderation required
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEngagementRewardLogModel extends Model<IEngagementRewardLog> {
  hasBeenRewarded(userId: string, action: string, referenceId: string): Promise<boolean>;
  getDailyCount(userId: string, action: string): Promise<number>;
}

const EngagementRewardLogSchema = new Schema<IEngagementRewardLog, IEngagementRewardLogModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    referenceId: {
      type: String,
      required: true,
    },
    coinsAwarded: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'credited', 'rejected'],
      default: 'credited',
    },
    pendingRewardId: {
      type: Schema.Types.ObjectId,
      ref: 'PendingCoinReward',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index to prevent double-crediting
EngagementRewardLogSchema.index({ user: 1, action: 1, referenceId: 1 }, { unique: true });
// Query for daily counts
EngagementRewardLogSchema.index({ user: 1, action: 1, createdAt: -1 });

/**
 * Check if user has already been rewarded for this action + reference
 */
EngagementRewardLogSchema.statics.hasBeenRewarded = async function (
  userId: string,
  action: string,
  referenceId: string
): Promise<boolean> {
  const existing = await this.findOne({
    user: userId,
    action,
    referenceId,
    status: { $in: ['pending', 'credited'] },
  });
  return !!existing;
};

/**
 * Get how many times the user has performed this action today
 */
EngagementRewardLogSchema.statics.getDailyCount = async function (
  userId: string,
  action: string
): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return this.countDocuments({
    user: userId,
    action,
    createdAt: { $gte: startOfDay },
  });
};

export const EngagementRewardLog = mongoose.model<IEngagementRewardLog, IEngagementRewardLogModel>(
  'EngagementRewardLog',
  EngagementRewardLogSchema
);

export default EngagementRewardLog;
