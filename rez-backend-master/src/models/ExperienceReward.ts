import mongoose, { Schema, Document, Types } from 'mongoose';

// ── Tier thresholds (rupees) ─────────────────────────────────────────────────

export const TIER_THRESHOLDS = {
  PLATINUM: { minSpend: 50000, type: 'PREMIUM_EXPERIENCE', label: 'Premium Experience — Fine Dining / Spa' },
  GOLD: { minSpend: 20000, type: 'DINNER_FOR_TWO', label: 'Candlelight Dinner for 2' },
  SILVER: { minSpend: 10000, type: 'COFFEE_BRUNCH', label: 'Coffee & Brunch for 2' },
} as const;

export type RewardTier = 'SILVER' | 'GOLD' | 'PLATINUM';
export type RewardType = 'COFFEE_BRUNCH' | 'DINNER_FOR_TWO' | 'PREMIUM_EXPERIENCE';
export type RewardStatus = 'GRANTED' | 'SENT_TO_RENDEZ' | 'USED' | 'EXPIRED';

/**
 * Returns the best reward tier for the given total spend in rupees,
 * or null if the user has not yet crossed ₹10,000.
 */
export function getRewardTier(totalSpendRupees: number): { tier: RewardTier; type: RewardType; label: string } | null {
  if (totalSpendRupees >= TIER_THRESHOLDS.PLATINUM.minSpend) {
    return { tier: 'PLATINUM', type: 'PREMIUM_EXPERIENCE', label: TIER_THRESHOLDS.PLATINUM.label };
  }
  if (totalSpendRupees >= TIER_THRESHOLDS.GOLD.minSpend) {
    return { tier: 'GOLD', type: 'DINNER_FOR_TWO', label: TIER_THRESHOLDS.GOLD.label };
  }
  if (totalSpendRupees >= TIER_THRESHOLDS.SILVER.minSpend) {
    return { tier: 'SILVER', type: 'COFFEE_BRUNCH', label: TIER_THRESHOLDS.SILVER.label };
  }
  return null;
}

/**
 * Returns the next tier above the current spend, with how much more is needed.
 * Used by the /progress endpoint.
 */
export function getNextTierInfo(totalSpendRupees: number): { nextTier: RewardTier; amountToNextTier: number } | null {
  if (totalSpendRupees < TIER_THRESHOLDS.SILVER.minSpend) {
    return { nextTier: 'SILVER', amountToNextTier: TIER_THRESHOLDS.SILVER.minSpend - totalSpendRupees };
  }
  if (totalSpendRupees < TIER_THRESHOLDS.GOLD.minSpend) {
    return { nextTier: 'GOLD', amountToNextTier: TIER_THRESHOLDS.GOLD.minSpend - totalSpendRupees };
  }
  if (totalSpendRupees < TIER_THRESHOLDS.PLATINUM.minSpend) {
    return { nextTier: 'PLATINUM', amountToNextTier: TIER_THRESHOLDS.PLATINUM.minSpend - totalSpendRupees };
  }
  return null; // Already at PLATINUM — no higher tier
}

// ── Document interface ────────────────────────────────────────────────────────

export interface IExperienceReward extends Document {
  userId: Types.ObjectId;
  tier: RewardTier;
  type: RewardType;
  label: string;
  merchantSubsidy: number;
  month: string;
  grantedAt: Date;
  status: RewardStatus;
  expiresAt: Date;
  rendezCreditId?: string;
  rezUserId: string;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const ExperienceRewardSchema = new Schema<IExperienceReward>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tier: {
      type: String,
      enum: ['SILVER', 'GOLD', 'PLATINUM'],
      required: true,
    },
    type: {
      type: String,
      enum: ['COFFEE_BRUNCH', 'DINNER_FOR_TWO', 'PREMIUM_EXPERIENCE'],
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    merchantSubsidy: {
      type: Number,
      default: 0,
    },
    month: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}$/,
    },
    grantedAt: {
      type: Date,
      default: () => new Date(),
    },
    status: {
      type: String,
      enum: ['GRANTED', 'SENT_TO_RENDEZ', 'USED', 'EXPIRED'],
      default: 'GRANTED',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    rendezCreditId: {
      type: String,
    },
    rezUserId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// One reward per user per month
ExperienceRewardSchema.index({ userId: 1, month: 1 }, { unique: true });
// Efficient expiry sweeps
ExperienceRewardSchema.index({ status: 1, expiresAt: 1 });

export const ExperienceReward = mongoose.model<IExperienceReward>('ExperienceReward', ExperienceRewardSchema);
