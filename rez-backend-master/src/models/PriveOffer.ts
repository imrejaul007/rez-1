/**
 * PriveOffer Model
 *
 * Exclusive offers for Privé members with tier-based access
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface IPriveOffer extends Document {
  _id: Types.ObjectId;
  title: string;
  subtitle: string;
  description: string;
  shortDescription?: string;

  // Brand info
  brand: {
    id?: Types.ObjectId;
    name: string;
    logo?: string;
  };

  // Offer type and reward
  type: 'discount' | 'cashback' | 'freebie' | 'experience' | 'event';
  reward: {
    type: 'percentage' | 'fixed' | 'coins';
    value: number;
    coinType?: 'rez' | 'prive' | 'branded';
    displayText: string; // e.g., "500 Privé Coins", "30% Off"
  };

  // Tier access
  tierRequired: 'none' | 'entry' | 'signature' | 'elite';
  isExclusive: boolean; // Featured as exclusive

  // Validity
  startsAt: Date;
  expiresAt: Date;
  isActive: boolean;

  // Media and content
  images: string[];
  coverImage?: string;
  terms: string[];
  howToRedeem?: string[];

  // Limits
  totalLimit?: number;
  limitPerUser?: number;
  redemptions: number;

  // Category
  category?: string;
  tags: string[];

  // Tracking
  views: number;
  clicks: number;
  clickLog: Array<{ userId: mongoose.Types.ObjectId; date: Date }>;

  // Priority for sorting
  priority: number;
  isFeatured: boolean;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  isExpired(): boolean;
  isAvailableForTier(tier: string): boolean;
  getExpiresIn(): string;
  canRedeem(userId: Types.ObjectId): Promise<{ canRedeem: boolean; reason?: string }>;
}

export interface IPriveOfferModel extends Model<IPriveOffer> {
  findActiveOffers(tier?: string): Promise<IPriveOffer[]>;
  findFeaturedOffers(tier: string, limit?: number): Promise<IPriveOffer[]>;
  findByCategory(category: string, tier: string): Promise<IPriveOffer[]>;
}

const PriveOfferSchema = new Schema<IPriveOffer>(
  {
    title: {
      type: String,
      required: [true, 'Offer title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
      index: true,
    },
    subtitle: {
      type: String,
      required: [true, 'Offer subtitle is required'],
      trim: true,
      maxlength: [200, 'Subtitle cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Offer description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: [150, 'Short description cannot exceed 150 characters'],
    },

    brand: {
      id: {
        type: Schema.Types.ObjectId,
        ref: 'Partner',
      },
      name: {
        type: String,
        required: [true, 'Brand name is required'],
        trim: true,
      },
      logo: {
        type: String,
      },
    },

    type: {
      type: String,
      enum: ['discount', 'cashback', 'freebie', 'experience', 'event'],
      required: [true, 'Offer type is required'],
      default: 'discount',
    },

    reward: {
      type: {
        type: String,
        enum: ['percentage', 'fixed', 'coins'],
        required: true,
        default: 'coins',
      },
      value: {
        type: Number,
        required: [true, 'Reward value is required'],
        min: [0, 'Reward value cannot be negative'],
      },
      coinType: {
        type: String,
        enum: ['rez', 'prive', 'branded'],
      },
      displayText: {
        type: String,
        required: [true, 'Reward display text is required'],
      },
    },

    tierRequired: {
      type: String,
      enum: ['none', 'entry', 'signature', 'elite'],
      required: [true, 'Tier requirement is required'],
      default: 'entry',
      index: true,
    },

    isExclusive: {
      type: Boolean,
      default: false,
      index: true,
    },

    startsAt: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true,
    },

    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    images: [
      {
        type: String,
      },
    ],

    coverImage: {
      type: String,
    },

    terms: [
      {
        type: String,
        trim: true,
      },
    ],

    howToRedeem: [
      {
        type: String,
        trim: true,
      },
    ],

    totalLimit: {
      type: Number,
      min: [1, 'Total limit must be at least 1'],
    },

    limitPerUser: {
      type: Number,
      min: [1, 'Limit per user must be at least 1'],
      default: 1,
    },

    redemptions: {
      type: Number,
      default: 0,
      min: [0, 'Redemptions cannot be negative'],
    },

    category: {
      type: String,
      trim: true,
      index: true,
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    views: {
      type: Number,
      default: 0,
      min: [0, 'Views cannot be negative'],
    },

    clicks: {
      type: Number,
      default: 0,
      min: [0, 'Clicks cannot be negative'],
    },

    // Per-user click deduplication (capped to prevent unbounded growth)
    clickLog: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now },
    }],

    priority: {
      type: Number,
      default: 0,
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
PriveOfferSchema.index({ isActive: 1, expiresAt: 1, tierRequired: 1 });
PriveOfferSchema.index({ isFeatured: 1, isActive: 1, priority: -1 });
PriveOfferSchema.index({ category: 1, isActive: 1, tierRequired: 1 });

// Tier hierarchy for access check
const TIER_HIERARCHY: Record<string, number> = {
  none: 0,
  entry: 1,
  signature: 2,
  elite: 3,
};

// Instance methods
PriveOfferSchema.methods.isExpired = function (): boolean {
  return new Date() > this.expiresAt;
};

PriveOfferSchema.methods.isAvailableForTier = function (userTier: string): boolean {
  const userTierLevel = TIER_HIERARCHY[userTier] ?? -1;
  const requiredLevel = TIER_HIERARCHY[this.tierRequired] ?? 0;
  return userTierLevel >= requiredLevel;
};

PriveOfferSchema.methods.getExpiresIn = function (): string {
  const now = new Date();
  const diff = this.expiresAt.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return 'Less than 1 hour';
};

PriveOfferSchema.methods.canRedeem = async function (
  userId: Types.ObjectId
): Promise<{ canRedeem: boolean; reason?: string }> {
  // Check if expired
  if (this.isExpired()) {
    return { canRedeem: false, reason: 'Offer has expired' };
  }

  // Check if not yet active
  if (new Date() < this.startsAt) {
    return { canRedeem: false, reason: 'Offer is not yet active' };
  }

  // Check if inactive
  if (!this.isActive) {
    return { canRedeem: false, reason: 'Offer is not available' };
  }

  // Check total limit
  if (this.totalLimit && this.redemptions >= this.totalLimit) {
    return { canRedeem: false, reason: 'Offer has reached its limit' };
  }

  // Per-user limit check would need redemption tracking
  // This should be implemented with a separate redemption model

  return { canRedeem: true };
};

// Static methods
PriveOfferSchema.statics.findActiveOffers = function (tier?: string): Promise<IPriveOffer[]> {
  const now = new Date();
  const query: any = {
    isActive: true,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
  };

  // Filter by tier if provided
  if (tier) {
    const userTierLevel = TIER_HIERARCHY[tier] ?? 0;
    const accessibleTiers = Object.keys(TIER_HIERARCHY).filter(
      (t) => TIER_HIERARCHY[t] <= userTierLevel
    );
    query.tierRequired = { $in: accessibleTiers };
  }

  return this.find(query).sort({ priority: -1, isFeatured: -1, createdAt: -1 });
};

PriveOfferSchema.statics.findFeaturedOffers = function (
  tier: string,
  limit: number = 5
): Promise<IPriveOffer[]> {
  const now = new Date();
  const userTierLevel = TIER_HIERARCHY[tier] ?? 0;
  const accessibleTiers = Object.keys(TIER_HIERARCHY).filter(
    (t) => TIER_HIERARCHY[t] <= userTierLevel
  );

  return this.find({
    isActive: true,
    isFeatured: true,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
    tierRequired: { $in: accessibleTiers },
  })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

PriveOfferSchema.statics.findByCategory = function (
  category: string,
  tier: string
): Promise<IPriveOffer[]> {
  const now = new Date();
  const userTierLevel = TIER_HIERARCHY[tier] ?? 0;
  const accessibleTiers = Object.keys(TIER_HIERARCHY).filter(
    (t) => TIER_HIERARCHY[t] <= userTierLevel
  );

  return this.find({
    isActive: true,
    category,
    startsAt: { $lte: now },
    expiresAt: { $gte: now },
    tierRequired: { $in: accessibleTiers },
  }).sort({ priority: -1, createdAt: -1 });
};

// Pre-save middleware
PriveOfferSchema.pre('save', function (next) {
  const doc = this as any;

  // Validate that end date is after start date
  if (doc.expiresAt <= doc.startsAt) {
    next(new Error('Expiry date must be after start date'));
    return;
  }

  // Generate short description if not provided
  if (!doc.shortDescription && doc.description) {
    doc.shortDescription = doc.description.substring(0, 147) + '...';
  }

  next();
});

const PriveOffer = mongoose.model<IPriveOffer, IPriveOfferModel>('PriveOffer', PriveOfferSchema);

export default PriveOffer;
