import mongoose, { Schema, Document, Types } from 'mongoose';

// ============================================================================
// Types
// ============================================================================
export type LeaderboardType = 'coins' | 'spending' | 'reviews' | 'referrals' | 'cashback' | 'streak' | 'custom';
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';
export type LeaderboardStatus = 'active' | 'paused' | 'archived';

// ============================================================================
// Interfaces
// ============================================================================
export interface IPrizeSlot {
  rankStart: number;
  rankEnd: number;
  prizeAmount: number;
  prizeLabel: string;
}

export interface IEligibilityRules {
  minAccountAgeDays: number;
  minActivityThreshold: number;
  requiredVerification: boolean;
  excludedUserIds: Types.ObjectId[];
  allowedRegions: string[];
  allowedUserSegments: string[];
}

export interface IAntifraudConfig {
  maxRankJumpPerCycle: number;
  minDifferentDays: number;
  flagDuplicateDevices: boolean;
}

export interface ILeaderboardConfig extends Document {
  slug: string;
  title: string;
  subtitle?: string;
  leaderboardType: LeaderboardType;
  period: LeaderboardPeriod;
  coinTransactionSources: string[];
  prizePool: IPrizeSlot[];
  eligibility: IEligibilityRules;
  antifraud: IAntifraudConfig;
  display: {
    icon: string;
    backgroundColor: string;
    featured: boolean;
    priority: number;
  };
  topN: number;
  isActive: boolean;
  status: LeaderboardStatus;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Schemas
// ============================================================================
const PrizeSlotSchema = new Schema({
  rankStart: { type: Number, required: true, min: 1 },
  rankEnd: { type: Number, required: true, min: 1 },
  prizeAmount: { type: Number, required: true, min: 0 },
  prizeLabel: { type: String, required: true, trim: true }
}, { _id: false });

const EligibilitySchema = new Schema({
  minAccountAgeDays: { type: Number, default: 7, min: 0 },
  minActivityThreshold: { type: Number, default: 3, min: 0 },
  requiredVerification: { type: Boolean, default: false },
  excludedUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  allowedRegions: [{ type: String }],
  allowedUserSegments: [{ type: String }]
}, { _id: false });

const AntifraudSchema = new Schema({
  maxRankJumpPerCycle: { type: Number, default: 50 },
  minDifferentDays: { type: Number, default: 2 },
  flagDuplicateDevices: { type: Boolean, default: true }
}, { _id: false });

const LeaderboardConfigSchema = new Schema<ILeaderboardConfig>({
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  leaderboardType: {
    type: String,
    required: true,
    enum: ['coins', 'spending', 'reviews', 'referrals', 'cashback', 'streak', 'custom'],
    index: true
  },
  period: {
    type: String,
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'all-time'],
    index: true
  },
  coinTransactionSources: [{
    type: String,
    trim: true
  }],
  prizePool: {
    type: [PrizeSlotSchema],
    default: []
  },
  eligibility: {
    type: EligibilitySchema,
    default: () => ({
      minAccountAgeDays: 7,
      minActivityThreshold: 3,
      requiredVerification: false,
      excludedUserIds: [],
      allowedRegions: [],
      allowedUserSegments: []
    })
  },
  antifraud: {
    type: AntifraudSchema,
    default: () => ({
      maxRankJumpPerCycle: 50,
      minDifferentDays: 2,
      flagDuplicateDevices: true
    })
  },
  display: {
    icon: { type: String, default: 'trophy' },
    backgroundColor: { type: String, default: '#6B46C1' },
    featured: { type: Boolean, default: false },
    priority: { type: Number, default: 0 }
  },
  topN: {
    type: Number,
    default: 100,
    min: 10,
    max: 1000
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'archived'],
    default: 'active',
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
LeaderboardConfigSchema.index({ status: 1, period: 1 });
LeaderboardConfigSchema.index({ isActive: 1, 'display.priority': 1 });

const LeaderboardConfig = mongoose.model<ILeaderboardConfig>('LeaderboardConfig', LeaderboardConfigSchema);
export default LeaderboardConfig;
