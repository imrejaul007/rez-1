/**
 * SmartSpendItem Model
 *
 * Admin-curated stores and products for the Privé Smart Spend marketplace.
 * Each item references an existing Store or Product with Privé-specific
 * display overrides and enhanced coin earning rates.
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

export interface ISmartSpendItem extends Document {
  _id: Types.ObjectId;

  // Reference to the actual entity
  itemType: 'store' | 'product';
  store?: Types.ObjectId;
  product?: Types.ObjectId;

  // Privé-specific display overrides
  displayTitle?: string;
  displayDescription?: string;
  bannerImage?: string;
  badgeText?: string; // e.g. "2x Coins", "Exclusive"

  // Enhanced coin earning
  coinRewardRate: number; // e.g. 0.10 for 10%
  coinRewardType: 'percentage' | 'fixed';
  maxCoinReward?: number;
  coinDisplayText: string; // e.g. "Earn 10% Privé Coins"

  // Access control
  tierRequired: 'none' | 'entry' | 'signature' | 'elite';

  // Admin curation
  sortOrder: number;
  sectionLabel?: string; // e.g. "Premium Dining", "Fashion Picks"
  isFeatured: boolean;
  isActive: boolean;

  // Validity
  startsAt?: Date;
  expiresAt?: Date;

  // Analytics
  views: number;
  clicks: number;
  purchases: number;

  createdAt: Date;
  updatedAt: Date;

  // Methods
  isAvailableForTier(tier: string): boolean;
  isCurrentlyValid(): boolean;
}

export interface ISmartSpendItemModel extends Model<ISmartSpendItem> {
  findActiveItems(tier?: string, section?: string): Promise<ISmartSpendItem[]>;
}

const TIER_HIERARCHY: Record<string, number> = {
  none: 0,
  entry: 1,
  signature: 2,
  elite: 3,
};

const SmartSpendItemSchema = new Schema<ISmartSpendItem>(
  {
    itemType: {
      type: String,
      enum: ['store', 'product'],
      required: [true, 'Item type is required'],
      index: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      sparse: true,
      index: true,
    },

    displayTitle: {
      type: String,
      trim: true,
      maxlength: [150, 'Display title cannot exceed 150 characters'],
    },
    displayDescription: {
      type: String,
      trim: true,
      maxlength: [500, 'Display description cannot exceed 500 characters'],
    },
    bannerImage: {
      type: String,
    },
    badgeText: {
      type: String,
      trim: true,
      maxlength: [30, 'Badge text cannot exceed 30 characters'],
    },

    coinRewardRate: {
      type: Number,
      required: [true, 'Coin reward rate is required'],
      min: [0, 'Coin reward rate cannot be negative'],
      max: [1, 'Coin reward rate cannot exceed 100%'],
      default: 0.05,
    },
    coinRewardType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    maxCoinReward: {
      type: Number,
      min: [0, 'Max coin reward cannot be negative'],
    },
    coinDisplayText: {
      type: String,
      required: [true, 'Coin display text is required'],
      trim: true,
      maxlength: [60, 'Coin display text cannot exceed 60 characters'],
    },

    tierRequired: {
      type: String,
      enum: ['none', 'entry', 'signature', 'elite'],
      default: 'entry',
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
    sectionLabel: {
      type: String,
      trim: true,
      maxlength: [50, 'Section label cannot exceed 50 characters'],
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    startsAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchases: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
SmartSpendItemSchema.index({ isActive: 1, isFeatured: -1, sortOrder: 1 });
SmartSpendItemSchema.index({ itemType: 1, store: 1 });
SmartSpendItemSchema.index({ itemType: 1, product: 1, isActive: 1 });

// Instance methods
SmartSpendItemSchema.methods.isAvailableForTier = function (userTier: string): boolean {
  const userTierLevel = TIER_HIERARCHY[userTier] ?? -1;
  const requiredLevel = TIER_HIERARCHY[this.tierRequired] ?? 0;
  return userTierLevel >= requiredLevel;
};

SmartSpendItemSchema.methods.isCurrentlyValid = function (): boolean {
  const now = new Date();
  if (this.startsAt && now < this.startsAt) return false;
  if (this.expiresAt && now > this.expiresAt) return false;
  return this.isActive;
};

// Static methods
SmartSpendItemSchema.statics.findActiveItems = function (
  tier?: string,
  section?: string
): Promise<ISmartSpendItem[]> {
  const now = new Date();
  const query: any = {
    isActive: true,
    $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }],
  };

  // Exclude expired items
  query.$and = [
    {
      $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gte: now } }],
    },
  ];

  if (tier) {
    const userTierLevel = TIER_HIERARCHY[tier] ?? 0;
    const accessibleTiers = Object.keys(TIER_HIERARCHY).filter(
      (t) => TIER_HIERARCHY[t] <= userTierLevel
    );
    query.tierRequired = { $in: accessibleTiers };
  }

  if (section) {
    query.sectionLabel = section;
  }

  return this.find(query)
    .populate('store', 'name slug logo rating location tags deliveryCategories isVerified')
    .populate('product', 'name images pricing store cashback status')
    .sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 });
};

// Pre-save validation
SmartSpendItemSchema.pre('save', function (next) {
  const doc = this as any;

  // Validate store is set for store type
  if (doc.itemType === 'store' && !doc.store) {
    return next(new Error('Store reference is required when itemType is "store"'));
  }

  // Validate product is set for product type
  if (doc.itemType === 'product' && !doc.product) {
    return next(new Error('Product reference is required when itemType is "product"'));
  }

  // Validate expiry is after start
  if (doc.startsAt && doc.expiresAt && doc.expiresAt <= doc.startsAt) {
    return next(new Error('Expiry date must be after start date'));
  }

  next();
});

const SmartSpendItem = mongoose.model<ISmartSpendItem, ISmartSpendItemModel>(
  'SmartSpendItem',
  SmartSpendItemSchema
);

export default SmartSpendItem;
