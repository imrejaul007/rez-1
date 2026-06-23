import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * UserReputation Model
 *
 * Tracks user reputation for Privé eligibility using a 6-pillar system:
 * - Engagement (25%): Orders, app usage, feature engagement
 * - Trust (20%): Order completion, payment success, verified identity
 * - Influence (20%): Referrals, reviews, social shares
 * - Economic Value (15%): Total spend, AOV, purchase frequency
 * - Brand Affinity (10%): Repeat purchases, wishlists, follows
 * - Network (10%): Referral network, quality of referrals
 *
 * Thresholds:
 * - Entry Tier: Score >= 50
 * - Signature Tier: Score >= 70
 * - Elite Tier: Score >= 85
 * - Hard Block: Trust < 60
 */

// Pillar weight constants
export const PILLAR_WEIGHTS = {
  engagement: 0.25,
  trust: 0.20,
  influence: 0.20,
  economicValue: 0.15,
  brandAffinity: 0.10,
  network: 0.10,
} as const;

// Eligibility thresholds (4-tier system)
export const ELIGIBILITY_THRESHOLDS = {
  ENTRY_TIER: 50,
  SIGNATURE_TIER: 70,
  ELITE_TIER: 85,
  TRUST_MINIMUM: 60,
} as const;

// Pillar types
export type PillarId = 'engagement' | 'trust' | 'influence' | 'economicValue' | 'brandAffinity' | 'network';
export type PriveTier = 'none' | 'entry' | 'signature' | 'elite';

// Engagement factors
export interface IEngagementFactors {
  ordersLast30Days: number;
  ordersLast90Days: number;
  appOpensLast30Days: number;
  averageSessionDuration: number; // minutes
  featuresUsed: string[];
  lastActiveDate: Date;
}

// Trust factors
export interface ITrustFactors {
  orderCompletionRate: number; // 0-100
  paymentSuccessRate: number; // 0-100
  chargebackCount: number;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;
  accountAge: number; // days
  hasSecurityEnabled: boolean; // 2FA, etc.
}

// Influence factors
export interface IInfluenceFactors {
  totalReferrals: number;
  successfulReferrals: number;
  reviewsWritten: number;
  reviewsHelpfulVotes: number;
  socialSharesCount: number;
  followersCount: number;
}

// Economic value factors
export interface IEconomicValueFactors {
  totalSpend: number;
  averageOrderValue: number;
  purchaseFrequency: number; // orders per month
  categoryDiversity: number; // unique categories purchased
  lastPurchaseDate?: Date;
  lifetimeValue: number;
}

// Brand affinity factors
export interface IBrandAffinityFactors {
  repeatPurchaseRate: number; // 0-100
  wishlistItemCount: number;
  brandsFollowed: number;
  brandInteractions: number;
  loyaltyProgramsJoined: number;
}

// Network factors
export interface INetworkFactors {
  referralNetworkSize: number;
  referralQualityScore: number; // average score of referred users
  socialConnectionsCount: number;
  communityEngagementScore: number;
}

// Pillar score interface
export interface IPillarScore {
  score: number; // 0-100
  weight: number;
  weightedScore: number;
  lastCalculated: Date;
}

// Reputation snapshot for history
export interface IReputationSnapshot {
  date: Date;
  totalScore: number;
  tier: PriveTier;
  pillars: {
    engagement: number;
    trust: number;
    influence: number;
    economicValue: number;
    brandAffinity: number;
    network: number;
  };
  trigger: string; // What triggered this snapshot
}

// Main UserReputation interface
export interface IUserReputation extends Document {
  userId: Types.ObjectId;

  // Pillar scores
  pillars: {
    engagement: {
      score: number;
      factors: IEngagementFactors;
      lastCalculated: Date;
    };
    trust: {
      score: number;
      factors: ITrustFactors;
      lastCalculated: Date;
    };
    influence: {
      score: number;
      factors: IInfluenceFactors;
      lastCalculated: Date;
    };
    economicValue: {
      score: number;
      factors: IEconomicValueFactors;
      lastCalculated: Date;
    };
    brandAffinity: {
      score: number;
      factors: IBrandAffinityFactors;
      lastCalculated: Date;
    };
    network: {
      score: number;
      factors: INetworkFactors;
      lastCalculated: Date;
    };
  };

  // Aggregated scores
  totalScore: number;
  tier: PriveTier;
  isEligible: boolean;

  // Metadata
  lastCalculated: Date;
  calculationVersion: string;

  // History for tracking changes
  history: IReputationSnapshot[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Methods
  calculateTotalScore(overrides?: {
    weights?: Record<string, number>;
    thresholds?: { entryTier?: number; signatureTier?: number; eliteTier?: number; trustMinimum?: number };
  }): { totalScore: number; tier: PriveTier; isEligible: boolean };
  addSnapshot(trigger: string): void;
}

// Schema
const UserReputationSchema = new Schema<IUserReputation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  pillars: {
    engagement: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      factors: {
        ordersLast30Days: { type: Number, default: 0 },
        ordersLast90Days: { type: Number, default: 0 },
        appOpensLast30Days: { type: Number, default: 0 },
        averageSessionDuration: { type: Number, default: 0 },
        featuresUsed: [{ type: String }],
        lastActiveDate: { type: Date },
      },
      lastCalculated: { type: Date, default: Date.now },
    },
    trust: {
      score: { type: Number, default: 50, min: 0, max: 100 }, // Start at 50 (neutral)
      factors: {
        orderCompletionRate: { type: Number, default: 100 },
        paymentSuccessRate: { type: Number, default: 100 },
        chargebackCount: { type: Number, default: 0 },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },
        isIdentityVerified: { type: Boolean, default: false },
        accountAge: { type: Number, default: 0 },
        hasSecurityEnabled: { type: Boolean, default: false },
      },
      lastCalculated: { type: Date, default: Date.now },
    },
    influence: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      factors: {
        totalReferrals: { type: Number, default: 0 },
        successfulReferrals: { type: Number, default: 0 },
        reviewsWritten: { type: Number, default: 0 },
        reviewsHelpfulVotes: { type: Number, default: 0 },
        socialSharesCount: { type: Number, default: 0 },
        followersCount: { type: Number, default: 0 },
      },
      lastCalculated: { type: Date, default: Date.now },
    },
    economicValue: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      factors: {
        totalSpend: { type: Number, default: 0 },
        averageOrderValue: { type: Number, default: 0 },
        purchaseFrequency: { type: Number, default: 0 },
        categoryDiversity: { type: Number, default: 0 },
        lastPurchaseDate: { type: Date },
        lifetimeValue: { type: Number, default: 0 },
      },
      lastCalculated: { type: Date, default: Date.now },
    },
    brandAffinity: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      factors: {
        repeatPurchaseRate: { type: Number, default: 0 },
        wishlistItemCount: { type: Number, default: 0 },
        brandsFollowed: { type: Number, default: 0 },
        brandInteractions: { type: Number, default: 0 },
        loyaltyProgramsJoined: { type: Number, default: 0 },
      },
      lastCalculated: { type: Date, default: Date.now },
    },
    network: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      factors: {
        referralNetworkSize: { type: Number, default: 0 },
        referralQualityScore: { type: Number, default: 0 },
        socialConnectionsCount: { type: Number, default: 0 },
        communityEngagementScore: { type: Number, default: 0 },
      },
      lastCalculated: { type: Date, default: Date.now },
    },
  },

  totalScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    index: true,
  },

  tier: {
    type: String,
    enum: ['none', 'entry', 'signature', 'elite'],
    default: 'none',
    index: true,
  },

  isEligible: {
    type: Boolean,
    default: false,
    index: true,
  },

  lastCalculated: {
    type: Date,
    default: Date.now,
  },

  calculationVersion: {
    type: String,
    default: '1.0.0',
  },

  history: [{
    date: { type: Date, required: true },
    totalScore: { type: Number, required: true },
    tier: { type: String, enum: ['none', 'entry', 'signature', 'elite'], required: true },
    pillars: {
      engagement: { type: Number },
      trust: { type: Number },
      influence: { type: Number },
      economicValue: { type: Number },
      brandAffinity: { type: Number },
      network: { type: Number },
    },
    trigger: { type: String },
  }],
}, {
  timestamps: true,
});

// Indexes
UserReputationSchema.index({ userId: 1 });
UserReputationSchema.index({ totalScore: -1 });
UserReputationSchema.index({ tier: 1 });
UserReputationSchema.index({ isEligible: 1 });
UserReputationSchema.index({ 'pillars.trust.score': 1 });
UserReputationSchema.index({ userId: 1, lastCalculated: -1 });

// Virtual for calculating weighted score
UserReputationSchema.virtual('weightedScores').get(function() {
  return {
    engagement: this.pillars.engagement.score * PILLAR_WEIGHTS.engagement,
    trust: this.pillars.trust.score * PILLAR_WEIGHTS.trust,
    influence: this.pillars.influence.score * PILLAR_WEIGHTS.influence,
    economicValue: this.pillars.economicValue.score * PILLAR_WEIGHTS.economicValue,
    brandAffinity: this.pillars.brandAffinity.score * PILLAR_WEIGHTS.brandAffinity,
    network: this.pillars.network.score * PILLAR_WEIGHTS.network,
  };
});

// Method to calculate total score and eligibility
UserReputationSchema.methods.calculateTotalScore = function(overrides?: {
  weights?: Record<string, number>;
  thresholds?: { entryTier?: number; signatureTier?: number; eliteTier?: number; trustMinimum?: number };
}) {
  const scores = this.pillars;
  const weights = overrides?.weights || PILLAR_WEIGHTS;
  const thresholds = {
    ENTRY_TIER: overrides?.thresholds?.entryTier ?? ELIGIBILITY_THRESHOLDS.ENTRY_TIER,
    SIGNATURE_TIER: overrides?.thresholds?.signatureTier ?? ELIGIBILITY_THRESHOLDS.SIGNATURE_TIER,
    ELITE_TIER: overrides?.thresholds?.eliteTier ?? ELIGIBILITY_THRESHOLDS.ELITE_TIER,
    TRUST_MINIMUM: overrides?.thresholds?.trustMinimum ?? ELIGIBILITY_THRESHOLDS.TRUST_MINIMUM,
  };

  // Calculate weighted total
  const total =
    scores.engagement.score * (weights.engagement ?? PILLAR_WEIGHTS.engagement) +
    scores.trust.score * (weights.trust ?? PILLAR_WEIGHTS.trust) +
    scores.influence.score * (weights.influence ?? PILLAR_WEIGHTS.influence) +
    scores.economicValue.score * (weights.economicValue ?? PILLAR_WEIGHTS.economicValue) +
    scores.brandAffinity.score * (weights.brandAffinity ?? PILLAR_WEIGHTS.brandAffinity) +
    scores.network.score * (weights.network ?? PILLAR_WEIGHTS.network);

  this.totalScore = Math.round(total * 100) / 100;

  // Determine tier (4-tier system with trust hard block)
  if (scores.trust.score < thresholds.TRUST_MINIMUM) {
    this.tier = 'none';
    this.isEligible = false;
  } else if (this.totalScore >= thresholds.ELITE_TIER) {
    this.tier = 'elite';
    this.isEligible = true;
  } else if (this.totalScore >= thresholds.SIGNATURE_TIER) {
    this.tier = 'signature';
    this.isEligible = true;
  } else if (this.totalScore >= thresholds.ENTRY_TIER) {
    this.tier = 'entry';
    this.isEligible = true;
  } else {
    this.tier = 'none';
    this.isEligible = false;
  }

  this.lastCalculated = new Date();

  return {
    totalScore: this.totalScore,
    tier: this.tier,
    isEligible: this.isEligible,
  };
};

// Method to add history snapshot
UserReputationSchema.methods.addSnapshot = function(trigger: string) {
  const snapshot: IReputationSnapshot = {
    date: new Date(),
    totalScore: this.totalScore,
    tier: this.tier,
    pillars: {
      engagement: this.pillars.engagement.score,
      trust: this.pillars.trust.score,
      influence: this.pillars.influence.score,
      economicValue: this.pillars.economicValue.score,
      brandAffinity: this.pillars.brandAffinity.score,
      network: this.pillars.network.score,
    },
    trigger,
  };

  // Keep last 50 snapshots
  if (this.history.length >= 50) {
    this.history.shift();
  }

  this.history.push(snapshot);
};

// Pre-save hook
UserReputationSchema.pre('save', function(next) {
  // Recalculate total score before saving
  this.calculateTotalScore();
  next();
});

// Static method to get or create reputation for user
UserReputationSchema.statics.getOrCreate = async function(userId: Types.ObjectId) {
  let reputation = await this.findOne({ userId });

  if (!reputation) {
    reputation = new this({ userId });
    await reputation.save();
  }

  return reputation;
};

export const UserReputation = mongoose.model<IUserReputation>('UserReputation', UserReputationSchema);
