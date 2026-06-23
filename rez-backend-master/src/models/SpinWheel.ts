// SpinWheel Models
// Complete database models for spin wheel reward system

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================
// SPIN WHEEL CONFIGURATION MODEL
// ============================================

export interface ISpinWheelSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  type: 'coins' | 'discount' | 'voucher' | 'nothing';
  icon: string;
  probability?: number; // Weight for random selection (0-100)
}

export interface ISpinWheelConfig extends Document {
  isActive: boolean;
  segments: ISpinWheelSegment[];
  rulesPerDay: {
    maxSpins: number;
    spinResetHour: number; // Hour in UTC when daily limit resets (0-23)
  };
  cooldownMinutes: number; // Minutes between spins
  rewardExpirationDays: number; // Days until reward expires
  createdAt: Date;
  updatedAt: Date;
}

const SpinWheelSegmentSchema = new Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: Number, required: true },
  color: { type: String, required: true },
  type: {
    type: String,
    enum: ['coins', 'discount', 'voucher', 'nothing'],
    required: true
  },
  icon: { type: String, required: true },
  probability: { type: Number, min: 0, max: 100, default: null }
});

const SpinWheelConfigSchema = new Schema<ISpinWheelConfig>({
  isActive: { type: Boolean, default: true },
  segments: { type: [SpinWheelSegmentSchema], required: true },
  rulesPerDay: {
    maxSpins: { type: Number, default: 3, min: 1 },
    spinResetHour: { type: Number, default: 0, min: 0, max: 23 } // Midnight UTC
  },
  cooldownMinutes: { type: Number, default: 0, min: 0 }, // No cooldown by default
  rewardExpirationDays: { type: Number, default: 30, min: 1 }
}, {
  timestamps: true
});

export const SpinWheelConfig: Model<ISpinWheelConfig> = mongoose.model<ISpinWheelConfig>('SpinWheelConfig', SpinWheelConfigSchema);

// ============================================
// SPIN WHEEL SPIN RECORD MODEL
// ============================================

export interface ISpinWheelSpin extends Document {
  userId: mongoose.Types.ObjectId;
  segmentId: string;
  segmentLabel: string;
  rewardType: 'coins' | 'discount' | 'voucher' | 'nothing';
  rewardValue: number;
  spinTimestamp: Date;
  claimedAt?: Date;
  status: 'pending' | 'claimed' | 'expired';
  expiresAt: Date;
  ipAddress?: string;
  deviceInfo?: {
    platform: string;
    appVersion: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SpinWheelSpinSchema = new Schema<ISpinWheelSpin>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  segmentId: { type: String, required: true },
  segmentLabel: { type: String, required: true },
  rewardType: {
    type: String,
    enum: ['coins', 'discount', 'voucher', 'nothing'],
    required: true
  },
  rewardValue: { type: Number, required: true, default: 0 },
  spinTimestamp: { type: Date, default: Date.now, index: true },
  claimedAt: { type: Date, default: null },
  status: {
    type: String,
    enum: ['pending', 'claimed', 'expired'],
    default: 'claimed', // Auto-claim on spin for coins
    index: true
  },
  expiresAt: { type: Date, required: true, index: true },
  ipAddress: { type: String },
  deviceInfo: {
    platform: { type: String },
    appVersion: { type: String }
  }
}, {
  timestamps: true
});

// Index for querying user's spin history
SpinWheelSpinSchema.index({ userId: 1, spinTimestamp: -1 });
SpinWheelSpinSchema.index({ status: 1, expiresAt: 1 }); // For cleanup jobs
// Daily spin limit check: query spins per user per date
SpinWheelSpinSchema.index({ userId: 1, spinTimestamp: 1 });

export const SpinWheelSpin: Model<ISpinWheelSpin> = mongoose.model<ISpinWheelSpin>('SpinWheelSpin', SpinWheelSpinSchema);

// ============================================
// USER SPIN METRICS MODEL
// ============================================

export interface IUserSpinMetrics extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date; // Date in YYYY-MM-DD format (UTC)
  spinsUsedToday: number;
  spinsRemaining: number;
  lastSpinAt?: Date;
  nextSpinEligibleAt?: Date;
  totalCoinsEarned: number;
  totalSpinsCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSpinMetricsSchema = new Schema<IUserSpinMetrics>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: { type: Date, required: true, index: true }, // Stores date at midnight UTC
  spinsUsedToday: { type: Number, default: 0, min: 0 },
  spinsRemaining: { type: Number, default: 3, min: 0 },
  lastSpinAt: { type: Date },
  nextSpinEligibleAt: { type: Date },
  totalCoinsEarned: { type: Number, default: 0, min: 0 },
  totalSpinsCompleted: { type: Number, default: 0, min: 0 }
}, {
  timestamps: true
});

// Compound unique index to ensure one record per user per day
UserSpinMetricsSchema.index({ userId: 1, date: 1 }, { unique: true });

export const UserSpinMetrics: Model<IUserSpinMetrics> = mongoose.model<IUserSpinMetrics>('UserSpinMetrics', UserSpinMetricsSchema);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get start of day in UTC
 */
export function getStartOfDayUTC(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day in UTC
 */
export function getEndOfDayUTC(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
