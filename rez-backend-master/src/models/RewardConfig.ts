import mongoose, { Schema, Document } from 'mongoose';

/**
 * EconGuard: RewardConfig Model
 * Single source of truth for all reward economics (coins, cashback, referral, loyalty, campaigns)
 *
 * Each config key maps to a numeric value with:
 * - Min/max bounds (prevents accidental runaway inflation)
 * - Category grouping (coins, cashback, referral, loyalty, campaign)
 * - Kill switch (can pause any reward globally without code changes)
 * - Audit trail (who changed it, when)
 */

export interface IRewardConfig extends Document {
  key: string; // e.g. 'trial_completion_coins', 'cashback_rate_restaurant'
  value: number; // Current configured value
  description: string; // Human-readable description
  category: 'coins' | 'cashback' | 'referral' | 'loyalty' | 'campaign';
  minValue: number; // Lower bound (inclusive)
  maxValue: number; // Upper bound (inclusive)
  isKillSwitched: boolean; // If true, this reward is paused globally (returns 0 or false)
  platformKillSwitch?: boolean; // DEV: economics control — master kill switch for entire reward system
  updatedBy?: string; // Admin user ID who last changed it
  changeHistory?: Array<{
    // DEV: economics control — audit log for all config changes
    oldValue: number;
    newValue: number;
    changedBy: string;
    changedAt: Date;
    reason?: string;
  }>;
  updatedAt: Date;
  createdAt: Date;
}

const RewardConfigSchema = new Schema<IRewardConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    value: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['coins', 'cashback', 'referral', 'loyalty', 'campaign'],
      required: true,
      index: true,
    },
    minValue: {
      type: Number,
      required: true,
    },
    maxValue: {
      type: Number,
      required: true,
    },
    isKillSwitched: {
      type: Boolean,
      default: false,
      index: true,
    },
    // DEV: economics control — master kill switch for entire reward system
    platformKillSwitch: {
      type: Boolean,
      default: false,
      index: true,
    },
    updatedBy: {
      type: String,
      default: undefined,
    },
    // DEV: economics control — audit log for all config changes (P&L risk: track every coin issuance change)
    changeHistory: [
      {
        oldValue: Number,
        newValue: Number,
        changedBy: String,
        changedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
  },
  { timestamps: true },
);

// Validation: ensure value is within min/max bounds
RewardConfigSchema.pre('save', function (next) {
  if (this.value < this.minValue || this.value > this.maxValue) {
    throw new Error(
      `Invalid value for ${this.key}: ${this.value}. Must be between ${this.minValue} and ${this.maxValue}`,
    );
  }
  next();
});

// Index for fast lookups by category
RewardConfigSchema.index({ category: 1, key: 1 });

// Index for finding kill-switched configs

// KAVITA: compound index for kill-switch + category lookups — prevents collection scan on reward config enable/disable audits
RewardConfigSchema.index({ isKillSwitched: 1, category: 1 });

// DEV: economics control — index for master platform kill switch lookups (P&L: rapid platform-wide reward halt)

export default mongoose.model<IRewardConfig>('RewardConfig', RewardConfigSchema);
