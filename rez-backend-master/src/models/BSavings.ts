/**
 * Savings Dashboard domain models — REZ-vs-NUQTA migration (Phase 0)
 *
 * Four collections that back the `/api/b/savings/*` namespace:
 *   - SavingsProfile  : per-user lifetime + monthly aggregates + tier
 *   - SavingsHistory  : per-transaction savings entries (cashback, offer, ...)
 *   - SavingsGoal     : user-defined savings targets with deadlines
 *   - SavingsStreak   : per-user savings activity streak
 *
 * Currency is stored in paise (1 INR = 100 paise) to avoid floating-point
 * rounding when aggregating balances. Conversion to rupees happens at the
 * API edge in the frontend service layer.
 *
 * The pattern follows `src/models/UserStreak.ts`: a Mongoose Schema with
 * typed interfaces, no instance methods (the B-feature controllers do all
 * computation inline so the seed-on-first-call path stays self-contained).
 */
import mongoose, { Schema, Document, Model } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// SavingsProfile
// ─────────────────────────────────────────────────────────────────────────────

export type SavingsTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface ISavingsProfile extends Document {
  user: mongoose.Types.ObjectId;
  totalSavedPaise: number;
  thisMonthSavedPaise: number;
  thisMonthTargetPaise: number;
  lastCalculatedAt: Date;
  tier: SavingsTier;
  tierProgressPct: number;
  lastTierUpgradeAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsProfileSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    totalSavedPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    thisMonthSavedPaise: {
      type: Number,
      default: 0,
    },
    thisMonthTargetPaise: {
      type: Number,
      default: 500000, // ₹5,000
    },
    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze',
    },
    tierProgressPct: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    lastTierUpgradeAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

SavingsProfileSchema.index({ user: 1 }, { unique: true });
SavingsProfileSchema.index({ tier: 1 });
SavingsProfileSchema.index({ lastCalculatedAt: -1 });

// ─────────────────────────────────────────────────────────────────────────────
// SavingsHistory
// ─────────────────────────────────────────────────────────────────────────────

export type SavingsSource =
  | 'cashback'
  | 'offer'
  | 'loyalty'
  | 'referral'
  | 'wallet_transfer'
  | 'milestone_bonus';

export interface ISavingsHistory extends Document {
  user: mongoose.Types.ObjectId;
  source: SavingsSource;
  amountPaise: number;
  description: string;
  store?: mongoose.Types.ObjectId;
  storeName?: string;
  offer?: mongoose.Types.ObjectId;
  offerTitle?: string;
  receiptUrl?: string;
  transactionId: string;
  createdAt: Date;
}

const SavingsHistorySchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ['cashback', 'offer', 'loyalty', 'referral', 'wallet_transfer', 'milestone_bonus'],
      required: true,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
    },
    storeName: {
      type: String,
      trim: true,
    },
    offer: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
    },
    offerTitle: {
      type: String,
      trim: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    transactionId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

SavingsHistorySchema.index({ user: 1, createdAt: -1 });
SavingsHistorySchema.index({ user: 1, source: 1 });
SavingsHistorySchema.index({ transactionId: 1, user: 1 }, { unique: true });

// ─────────────────────────────────────────────────────────────────────────────
// SavingsGoal
// ─────────────────────────────────────────────────────────────────────────────

export type SavingsGoalCategory =
  | 'travel'
  | 'shopping'
  | 'grocery'
  | 'dining'
  | 'entertainment'
  | 'health'
  | 'education'
  | 'other';

export interface ISavingsGoal extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  targetAmountPaise: number;
  savedAmountPaise: number;
  deadline: Date;
  category?: SavingsGoalCategory;
  iconEmoji?: string;
  isCompleted: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsGoalSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    targetAmountPaise: {
      type: Number,
      required: true,
      min: 100, // ₹1
    },
    savedAmountPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    deadline: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'travel',
        'shopping',
        'grocery',
        'dining',
        'entertainment',
        'health',
        'education',
        'other',
      ],
    },
    iconEmoji: {
      type: String,
      trim: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

SavingsGoalSchema.index({ user: 1, isCompleted: 1, deadline: 1 });
SavingsGoalSchema.index({ user: 1, createdAt: -1 });

// ─────────────────────────────────────────────────────────────────────────────
// SavingsStreak
// ─────────────────────────────────────────────────────────────────────────────

export interface ISavingsStreak extends Document {
  user: mongoose.Types.ObjectId;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActivityDate: Date;
  nextMilestoneDays: number;
  isAtRisk: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsStreakSchema: Schema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    currentStreakDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    longestStreakDays: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastActivityDate: {
      type: Date,
      default: Date.now,
    },
    nextMilestoneDays: {
      type: Number,
      default: 7,
    },
    isAtRisk: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

SavingsStreakSchema.index({ user: 1 }, { unique: true });
SavingsStreakSchema.index({ lastActivityDate: -1 });

// ─────────────────────────────────────────────────────────────────────────────
// Model exports
// ─────────────────────────────────────────────────────────────────────────────

export const SavingsProfile: Model<ISavingsProfile> = mongoose.model<ISavingsProfile>(
  'SavingsProfile',
  SavingsProfileSchema
);

export const SavingsHistory: Model<ISavingsHistory> = mongoose.model<ISavingsHistory>(
  'SavingsHistory',
  SavingsHistorySchema
);

export const SavingsGoal: Model<ISavingsGoal> = mongoose.model<ISavingsGoal>(
  'SavingsGoal',
  SavingsGoalSchema
);

export const SavingsStreak: Model<ISavingsStreak> = mongoose.model<ISavingsStreak>(
  'SavingsStreak',
  SavingsStreakSchema
);
