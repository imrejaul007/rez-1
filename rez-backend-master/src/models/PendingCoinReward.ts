import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types, Model } from 'mongoose';
import redisService from '../services/redisService';

// Pending Coin Reward interface
export interface IPendingCoinReward extends Document {
  user: Types.ObjectId;
  amount: number;
  percentage: number;
  source: 'purchase_bonus' | 'social_media_post' | 'review_bonus' | 'referral_bonus' | 'content_creation' | 'photo_upload' | 'offer_comment' | 'ugc_reel';
  referenceType: 'order' | 'post' | 'review' | 'referral' | 'content' | 'photo' | 'comment' | 'reel';
  referenceId: Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected' | 'credited';
  submittedAt: Date;
  reviewedAt?: Date;
  creditedAt?: Date;
  reviewedBy?: Types.ObjectId;
  rejectionReason?: string;
  approvalNotes?: string;
  metadata?: {
    orderNumber?: string;
    orderTotal?: number;
    postUrl?: string;
    platform?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;

  // Methods
  approve(adminId: Types.ObjectId, notes?: string): Promise<void>;
  reject(adminId: Types.ObjectId, reason: string): Promise<void>;
  creditCoins(): Promise<void>;
}

// Model interface with static methods
export interface IPendingCoinRewardModel extends Model<IPendingCoinReward> {
  getPendingCount(): Promise<number>;
  getPendingBySource(source: string): Promise<IPendingCoinReward[]>;
}

// Schema
const PendingCoinRewardSchema = new Schema<IPendingCoinReward, IPendingCoinRewardModel>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    default: 5,  // Default 5% bonus
    min: 0,
    max: 100
  },
  source: {
    type: String,
    enum: ['purchase_bonus', 'social_media_post', 'review_bonus', 'referral_bonus', 'content_creation', 'photo_upload', 'offer_comment', 'ugc_reel'],
    required: true,
    index: true
  },
  referenceType: {
    type: String,
    enum: ['order', 'post', 'review', 'referral', 'content', 'photo', 'comment', 'reel'],
    required: true
  },
  referenceId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'credited'],
    default: 'pending',
    index: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: Date,
  creditedAt: Date,
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String,
  approvalNotes: String,
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
PendingCoinRewardSchema.index({ status: 1, submittedAt: -1 });
PendingCoinRewardSchema.index({ user: 1, status: 1 });
PendingCoinRewardSchema.index({ source: 1, status: 1 });
PendingCoinRewardSchema.index({ referenceType: 1, referenceId: 1 });

// Static method: Get pending count
PendingCoinRewardSchema.statics.getPendingCount = async function(): Promise<number> {
  return this.countDocuments({ status: 'pending' });
};

// Static method: Get pending by source
PendingCoinRewardSchema.statics.getPendingBySource = async function(
  source: string
): Promise<IPendingCoinReward[]> {
  return this.find({ source, status: 'pending' }).sort({ submittedAt: -1 });
};

// Instance method: Approve reward
PendingCoinRewardSchema.methods.approve = async function(
  adminId: Types.ObjectId,
  notes?: string
): Promise<void> {
  if (this.status !== 'pending') {
    throw new Error('Can only approve pending rewards');
  }

  this.status = 'approved';
  this.reviewedAt = new Date();
  this.reviewedBy = adminId;
  if (notes) {
    this.approvalNotes = notes;
  }

  await this.save();

  // Invalidate earnings cache (pending amount changed)
  try { await redisService.delPattern(`earnings:consolidated:${this.user.toString()}:*`); } catch (e) {}

  logger.info(`✅ [PENDING REWARD] Approved reward ${this._id} for user ${this.user}`);
};

// Instance method: Reject reward
PendingCoinRewardSchema.methods.reject = async function(
  adminId: Types.ObjectId,
  reason: string
): Promise<void> {
  if (this.status !== 'pending') {
    throw new Error('Can only reject pending rewards');
  }

  this.status = 'rejected';
  this.reviewedAt = new Date();
  this.reviewedBy = adminId;
  this.rejectionReason = reason;

  await this.save();

  // Invalidate earnings cache (pending amount changed)
  try { await redisService.delPattern(`earnings:consolidated:${this.user.toString()}:*`); } catch (e) {}

  logger.info(`❌ [PENDING REWARD] Rejected reward ${this._id}: ${reason}`);
};

// Instance method: Credit coins to user
PendingCoinRewardSchema.methods.creditCoins = async function(): Promise<void> {
  if (this.status !== 'approved') {
    throw new Error('Can only credit approved rewards');
  }

  // Import coinService dynamically to avoid circular dependency
  const coinService = require('../services/coinService').default;

  // Map PendingCoinReward source to CoinTransaction source
  const sourceMap: Record<string, string> = {
    'social_media_post': 'social_share_reward',
    'purchase_bonus': 'purchase_reward',
    'review_bonus': 'review',
    'referral_bonus': 'referral',
    'content_creation': 'ugc_reel',
    'photo_upload': 'photo_upload',
    'offer_comment': 'offer_comment',
    'ugc_reel': 'ugc_reel',
  };
  const coinSource = sourceMap[this.source] || 'purchase_reward';

  await coinService.awardCoins(
    this.user.toString(),
    this.amount,
    coinSource,
    `${this.percentage}% bonus reward - ${this.source}`,
    {
      pendingRewardId: this._id,
      referenceType: this.referenceType,
      referenceId: this.referenceId,
      ...this.metadata
    }
  );

  this.status = 'credited';
  this.creditedAt = new Date();

  await this.save();

  // Invalidate earnings cache (pending→credited, CoinTransaction.createTransaction also invalidates but this covers the pending change)
  try { await redisService.delPattern(`earnings:consolidated:${this.user.toString()}:*`); } catch (e) {}

  logger.info(`🪙 [PENDING REWARD] Credited ${this.amount} coins to user ${this.user}`);
};

// Create and export model
export const PendingCoinReward = mongoose.model<IPendingCoinReward, IPendingCoinRewardModel>(
  'PendingCoinReward',
  PendingCoinRewardSchema
);

export default PendingCoinReward;
