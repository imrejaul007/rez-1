/**
 * PriveCampaign Model
 *
 * Social cashback campaigns where Privé members dine/visit/buy,
 * post on social media, and earn cashback + coins.
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

// ── Types ──

export type CampaignTaskType = 'dine_post' | 'buy_post' | 'visit_post' | 'event_post';
export type CampaignStatus = 'draft' | 'pending_approval' | 'active' | 'paused' | 'completed' | 'rejected';
export type PriveTier = 'entry' | 'signature' | 'elite';

const TIER_LEVELS: Record<PriveTier, number> = {
  entry: 1,
  signature: 2,
  elite: 3,
};

// ── Interfaces ──

export interface ICampaignRequirements {
  minPurchaseAmount: number;
  postTypes: string[];
  mustTagBrand: boolean;
  minimumFollowers: number;
  hashtagRequired: string;
}

export interface ICampaignReward {
  coinAmount: number;
  cashbackPercent: number;
  cashbackCap: number;
  estimatedEarning?: string;
}

export interface IPriveCampaign extends Document {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  merchantName: string;
  merchantLogo: string;

  title: string;
  description: string;
  taskType: CampaignTaskType;
  taskSteps: string[];
  requirements: ICampaignRequirements;
  reward: ICampaignReward;

  slots: number;
  slotsUsed: number;
  maxSubmissions?: number; // Per-user submission limit (added during Phase 2E merge)
  budget: number;
  budgetUsed: number;

  validFrom: Date;
  validTo: Date;
  minPriveTier: PriveTier;
  status: CampaignStatus;
  isActive: boolean;

  adminNote: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;

  examplePosts: string[];

  // Soft delete fields
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;

  // Virtuals / helpers
  slotsRemaining: number;
  budgetRemaining: number;
  isExpired(): boolean;
  isAvailableForTier(userTier: string): boolean;
  softDelete(adminId: Types.ObjectId): Promise<void>;
}

export interface IPriveCampaignModel extends Model<IPriveCampaign> {
  findActiveCampaigns(tier?: string, page?: number, limit?: number): Promise<IPriveCampaign[]>;
}

// ── Schema ──

const PriveCampaignSchema = new Schema<IPriveCampaign>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    merchantName: { type: String, required: true, trim: true },
    merchantLogo: { type: String, default: '' },

    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, required: true, maxlength: 500 },
    taskType: {
      type: String,
      required: true,
      enum: ['dine_post', 'buy_post', 'visit_post', 'event_post'],
    },
    taskSteps: [{ type: String }],
    requirements: {
      minPurchaseAmount: { type: Number, required: true, min: 0 },
      postTypes: [{ type: String, enum: ['story', 'reel', 'post'] }],
      mustTagBrand: { type: Boolean, default: true },
      minimumFollowers: { type: Number, default: 500 },
      hashtagRequired: { type: String, default: '' },
    },
    reward: {
      coinAmount: { type: Number, required: true, min: 0 },
      cashbackPercent: { type: Number, required: true, min: 0, max: 100 },
      cashbackCap: { type: Number, required: true, min: 0 },
      estimatedEarning: { type: String, default: '' },
    },

    slots: { type: Number, required: true, min: 1 },
    slotsUsed: { type: Number, default: 0, min: 0 },
    budget: { type: Number, required: true, min: 0 },
    budgetUsed: { type: Number, default: 0, min: 0 },

    validFrom: { type: Date, required: true },
    validTo: { type: Date, required: true },
    minPriveTier: {
      type: String,
      enum: ['entry', 'signature', 'elite'],
      default: 'entry',
    },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'active', 'paused', 'completed', 'rejected'],
      default: 'pending_approval',
    },
    isActive: { type: Boolean, default: true },

    adminNote: { type: String, default: '' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'AdminUser' },
    approvedAt: { type: Date },

    examplePosts: [{ type: String }],

    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ──

PriveCampaignSchema.index({ merchantId: 1, status: 1 });
PriveCampaignSchema.index({ status: 1, validTo: 1 });
PriveCampaignSchema.index({ minPriveTier: 1, status: 1 });
PriveCampaignSchema.index({ validFrom: 1, validTo: 1 });
PriveCampaignSchema.index({ 'reward.cashbackPercent': -1 });
PriveCampaignSchema.index({ status: 1, isActive: 1, validTo: 1 });
PriveCampaignSchema.index({ minPriveTier: 1, isActive: 1, validFrom: 1 });

// ── Pre-save Validation ──

PriveCampaignSchema.pre('save', function (next) {
  if (this.validFrom >= this.validTo) {
    next(new Error('validFrom must be before validTo'));
    return;
  }
  if (this.slotsUsed > this.slots) {
    next(new Error('slotsUsed cannot exceed slots'));
    return;
  }
  if (this.budgetUsed > this.budget) {
    next(new Error('budgetUsed cannot exceed budget'));
    return;
  }
  next();
});

// ── Virtuals ──

PriveCampaignSchema.virtual('slotsRemaining').get(function (this: IPriveCampaign) {
  return Math.max(0, this.slots - this.slotsUsed);
});

PriveCampaignSchema.virtual('budgetRemaining').get(function (this: IPriveCampaign) {
  return Math.max(0, this.budget - this.budgetUsed);
});

PriveCampaignSchema.set('toJSON', { virtuals: true });
PriveCampaignSchema.set('toObject', { virtuals: true });

// ── Methods ──

PriveCampaignSchema.methods.isExpired = function (): boolean {
  return new Date() > this.validTo;
};

PriveCampaignSchema.methods.isAvailableForTier = function (userTier: string): boolean {
  const userLevel = TIER_LEVELS[userTier as PriveTier] ?? 0;
  const requiredLevel = TIER_LEVELS[this.minPriveTier as PriveTier] ?? 0;
  return userLevel >= requiredLevel;
};

// ── Statics ──

PriveCampaignSchema.statics.findActiveCampaigns = async function (
  tier?: string,
  page: number = 1,
  limit: number = 20
): Promise<IPriveCampaign[]> {
  const now = new Date();
  const filter: any = {
    status: 'active',
    isActive: true,
    validFrom: { $lte: now },
    validTo: { $gte: now },
  };
  if (tier) {
    const tierLevel = TIER_LEVELS[tier as PriveTier] ?? 0;
    const allowedTiers = Object.entries(TIER_LEVELS)
      .filter(([, level]) => level <= tierLevel)
      .map(([t]) => t);
    filter.minPriveTier = { $in: allowedTiers };
  }
  return this.find(filter)
    .sort({ validTo: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

// ── Soft delete: exclude deleted docs from all find queries ──

PriveCampaignSchema.pre(/^find/, function (this: any, next) {
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

PriveCampaignSchema.pre('countDocuments', function (this: any, next) {
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// ── Soft delete instance method ──

PriveCampaignSchema.methods.softDelete = async function (adminId: Types.ObjectId): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = adminId;
  this.isActive = false;
  await this.save();
};

// ── Export ──

export const PriveCampaign = mongoose.model<IPriveCampaign, IPriveCampaignModel>(
  'PriveCampaign',
  PriveCampaignSchema
);

export default PriveCampaign;
