import mongoose, { Schema, Document, Types } from 'mongoose';

// Brand tier type
export type BrandTier = 'standard' | 'premium' | 'exclusive' | 'luxury';

// Brand badge type
export type BrandBadge = 'exclusive' | 'premium' | 'new' | 'trending' | 'top-rated' | 'verified';

// Cashback configuration interface
export interface IMallBrandCashback {
  percentage: number;
  maxAmount?: number;
  minPurchase?: number;
  validUntil?: Date;
  earlyBirdBonus?: number;
}

// Ratings interface
export interface IMallBrandRatings {
  average: number;
  count: number;
  successRate: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

// Analytics interface
export interface IMallBrandAnalytics {
  views: number;
  clicks: number;
  purchases: number;
  totalCashbackGiven: number;
  conversionRate: number;
}

// Main Mall Brand interface
export interface IMallBrand extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  logo: string;
  banner: string[];
  tier: BrandTier;
  cashback: IMallBrandCashback;
  ratings: IMallBrandRatings;
  mallCategory: Types.ObjectId;
  badges: BrandBadge[];
  externalUrl?: string;
  affiliateCode?: string;
  webhookConfig?: {
    apiKey?: string;
    secretKey?: string;
    webhookUrl?: string;
    isEnabled?: boolean;
  };
  // Affiliate network configuration for third-party integrations
  affiliateConfig?: {
    network?: 'direct' | 'cuelinks' | 'vcommission' | 'impact' | 'other';
    merchantId?: string;
    trackingTemplate?: string;  // URL template with {clickId}, {userId} placeholders
    callbackFormat?: 'json' | 'query';
  };
  // REZ Coin reward configuration — coins user earns per ₹100 spent
  rezCoinReward?: {
    coinsPerHundred: number;
    minimumOrderAmount: number;
    maximumCoinsPerOrder: number;
    isActive: boolean;
  };
  isActive: boolean;
  isFeatured: boolean;
  isLuxury: boolean;
  isNewArrival: boolean;  // Renamed from isNew to avoid Mongoose conflict
  newUntil?: Date;
  analytics: IMallBrandAnalytics;
  collections: Types.ObjectId[];
  hasProducts: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;

  // Soft delete fields
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  // Instance methods
  recordView(): Promise<void>;
  recordClick(): Promise<void>;
  recordPurchase(cashbackAmount?: number): Promise<void>;
  softDelete(adminId: Types.ObjectId): Promise<void>;
}

// Mall Brand Schema
const MallBrandSchema = new Schema<IMallBrand>({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, numbers, and hyphens']
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  logo: {
    type: String,
    required: true,
    trim: true
  },
  banner: {
    type: [String],
    default: []
  },
  tier: {
    type: String,
    enum: ['standard', 'premium', 'exclusive', 'luxury'],
    default: 'standard'
  },
  cashback: {
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    maxAmount: {
      type: Number,
      min: 0
    },
    minPurchase: {
      type: Number,
      min: 0
    },
    validUntil: {
      type: Date
    },
    earlyBirdBonus: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  rezCoinReward: {
    coinsPerHundred: {
      type: Number,
      default: 5,
      min: 0,
      max: 50,
    },
    minimumOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maximumCoinsPerOrder: {
      type: Number,
      default: 10000,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    },
    successRate: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    distribution: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 }
    }
  },
  mallCategory: {
    type: Schema.Types.ObjectId,
    ref: 'MallCategory',
    required: true
  },
  badges: [{
    type: String,
    enum: ['exclusive', 'premium', 'new', 'trending', 'top-rated', 'verified']
  }],
  externalUrl: {
    type: String,
    trim: true
  },
  // Webhook configuration for receiving conversion notifications
  // NOTE: apiKey and secretKey are excluded from queries by default (select: false)
  webhookConfig: {
    apiKey: {
      type: String,
      trim: true,
      select: false,
    },
    secretKey: {
      type: String,
      trim: true,
      select: false,
    },
    webhookUrl: {
      type: String,
      trim: true,
    },
    isEnabled: {
      type: Boolean,
      default: false,
    },
  },
  // Affiliate network configuration for third-party integrations (Cuelinks, Vcommission, etc.)
  // NOTE: Sensitive fields excluded from queries by default (select: false)
  affiliateConfig: {
    network: {
      type: String,
      enum: ['direct', 'cuelinks', 'vcommission', 'impact', 'other'],
      default: 'direct',
      select: false,
    },
    merchantId: {
      type: String,
      trim: true,
      select: false,
    },
    trackingTemplate: {
      type: String,
      trim: true,
      select: false,
    },
    callbackFormat: {
      type: String,
      enum: ['json', 'query'],
      default: 'json',
      select: false,
    },
  },
  affiliateCode: {
    type: String,
    trim: true,
    select: false,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isLuxury: {
    type: Boolean,
    default: false
  },
  isNewArrival: {
    type: Boolean,
    default: false
  },
  newUntil: {
    type: Date
  },
  analytics: {
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0
    },
    purchases: {
      type: Number,
      default: 0,
      min: 0
    },
    totalCashbackGiven: {
      type: Number,
      default: 0,
      min: 0
    },
    conversionRate: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  collections: [{
    type: Schema.Types.ObjectId,
    ref: 'MallCollection'
  }],
  hasProducts: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
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
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
MallBrandSchema.index({ isActive: 1 });
MallBrandSchema.index({ mallCategory: 1, isActive: 1 });
MallBrandSchema.index({ tier: 1, isActive: 1 });
MallBrandSchema.index({ isFeatured: 1, isActive: 1 });
MallBrandSchema.index({ isLuxury: 1, isActive: 1 });
MallBrandSchema.index({ isNewArrival: 1, isActive: 1 });
MallBrandSchema.index({ 'ratings.average': -1, isActive: 1 });
MallBrandSchema.index({ 'ratings.successRate': -1, isActive: 1 });
MallBrandSchema.index({ 'cashback.percentage': -1, isActive: 1 });
MallBrandSchema.index({ collections: 1, isActive: 1 });
MallBrandSchema.index({ badges: 1, isActive: 1 });
MallBrandSchema.index({ tags: 1, isActive: 1 });
MallBrandSchema.index({ createdAt: -1 });

// Pre-save hook to generate slug
MallBrandSchema.pre('save', function(this: IMallBrand, next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  // Auto-set isLuxury based on tier
  if (this.tier === 'luxury') {
    this.isLuxury = true;
  }

  // Auto-check if still new
  if (this.newUntil && new Date() > this.newUntil) {
    this.isNewArrival = false;
    // Remove 'new' badge if present
    this.badges = this.badges.filter((b: string) => b !== 'new') as BrandBadge[];
  }

  next();
});

// Virtual to check if brand has valid cashback
MallBrandSchema.virtual('hasCashback').get(function(this: IMallBrand) {
  if (!this.cashback.validUntil) return this.cashback.percentage > 0;
  return this.cashback.percentage > 0 && new Date() < this.cashback.validUntil;
});

// Virtual for calculated cashback display
MallBrandSchema.virtual('cashbackDisplay').get(function(this: IMallBrand) {
  if (this.cashback.maxAmount) {
    return `Up to ${this.cashback.maxAmount}`;
  }
  return `${this.cashback.percentage}% cashback`;
});

// Static method to get featured brands
MallBrandSchema.statics.getFeatured = function(limit: number = 10) {
  return this.find({
    isFeatured: true,
    isActive: true
  })
    .populate('mallCategory', 'name slug color')
    .sort({ 'ratings.average': -1 })
    .limit(limit);
};

// Static method to get new arrivals
MallBrandSchema.statics.getNewArrivals = function(limit: number = 10) {
  const now = new Date();
  return this.find({
    isActive: true,
    $or: [
      { isNewArrival: true },
      { newUntil: { $gte: now } }
    ]
  })
    .populate('mallCategory', 'name slug color')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get top rated brands
MallBrandSchema.statics.getTopRated = function(limit: number = 10) {
  return this.find({
    isActive: true,
    'ratings.count': { $gte: 5 } // At least 5 ratings
  })
    .populate('mallCategory', 'name slug color')
    .sort({ 'ratings.average': -1, 'ratings.successRate': -1 })
    .limit(limit);
};

// Static method to get luxury brands
MallBrandSchema.statics.getLuxury = function(limit: number = 10) {
  return this.find({
    isLuxury: true,
    isActive: true
  })
    .populate('mallCategory', 'name slug color')
    .sort({ 'ratings.average': -1 })
    .limit(limit);
};

// Static method to search brands
MallBrandSchema.statics.searchBrands = function(
  query: string,
  filters: any = {},
  limit: number = 20
) {
  // Escape special regex characters to prevent ReDoS
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const searchQuery: any = {
    isActive: true,
    $or: [
      { name: { $regex: escapedQuery, $options: 'i' } },
      { tags: { $in: [new RegExp(escapedQuery, 'i')] } }
    ]
  };

  if (filters.category) {
    searchQuery.mallCategory = filters.category;
  }

  if (filters.tier) {
    searchQuery.tier = filters.tier;
  }

  if (filters.minCashback) {
    searchQuery['cashback.percentage'] = { $gte: filters.minCashback };
  }

  return this.find(searchQuery)
    .populate('mallCategory', 'name slug color')
    .sort({ 'ratings.average': -1 })
    .limit(limit);
};

// Method to record view (atomic $inc to prevent race conditions)
MallBrandSchema.methods.recordView = async function() {
  const Model = this.constructor as any;
  await Model.findByIdAndUpdate(this._id, {
    $inc: { 'analytics.views': 1 },
  });
};

// Method to record click (atomic $inc + recalculate conversion rate)
MallBrandSchema.methods.recordClick = async function() {
  const Model = this.constructor as any;
  const updated = await Model.findByIdAndUpdate(
    this._id,
    { $inc: { 'analytics.clicks': 1 } },
    { new: true }
  );
  if (updated && updated.analytics.clicks > 0) {
    const rate = Math.min(100, (updated.analytics.purchases / updated.analytics.clicks) * 100);
    await Model.findByIdAndUpdate(this._id, {
      $set: { 'analytics.conversionRate': rate },
    });
  }
};

// Method to record purchase (atomic $inc + recalculate conversion rate)
MallBrandSchema.methods.recordPurchase = async function(cashbackAmount: number = 0) {
  const Model = this.constructor as any;
  const incFields: any = { 'analytics.purchases': 1 };
  if (cashbackAmount > 0) {
    incFields['analytics.totalCashbackGiven'] = cashbackAmount;
  }
  const updated = await Model.findByIdAndUpdate(
    this._id,
    { $inc: incFields },
    { new: true }
  );
  if (updated && updated.analytics.clicks > 0) {
    const rate = Math.min(100, (updated.analytics.purchases / updated.analytics.clicks) * 100);
    await Model.findByIdAndUpdate(this._id, {
      $set: { 'analytics.conversionRate': rate },
    });
  }
};

// ── Soft delete: exclude deleted docs from all find queries ──
MallBrandSchema.pre(/^find/, function (this: any, next) {
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

MallBrandSchema.pre('countDocuments', function (this: any, next) {
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// ── Soft delete instance method ──
MallBrandSchema.methods.softDelete = async function (adminId: Types.ObjectId): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = adminId;
  this.isActive = false;
  await this.save();
};

// Delete cached model if exists (for development)
if (mongoose.models.MallBrand) {
  delete (mongoose.models as any).MallBrand;
}

export const MallBrand = mongoose.model<IMallBrand>('MallBrand', MallBrandSchema);
