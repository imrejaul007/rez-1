/**
 * Lock Price Deal Model
 *
 * Represents a deal where users can lock a price by paying a deposit (e.g., 10%).
 * Users earn rewards on both lock (deposit) and pickup (balance payment).
 * Merchants create these deals to drive foot traffic and guaranteed sales.
 */

import mongoose, { Schema, Document, Types, Model } from 'mongoose';

// Reward configuration for lock or pickup action
export interface ILockDealReward {
  type: 'coins' | 'cashback';
  amount: number;
}

// Lock Price Deal interface
export interface ILockPriceDeal extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  image: string;
  images?: string[];

  // Store/Merchant
  store: Types.ObjectId;
  merchant: Types.ObjectId;
  storeName: string;
  storeCategory?: Types.ObjectId;

  // Pricing
  originalPrice: number;
  lockedPrice: number;
  currency: 'INR' | 'AED' | 'USD';
  depositPercent: number;      // e.g., 10 means 10% deposit
  depositAmount: number;       // Computed: lockedPrice * depositPercent / 100
  balanceAmount: number;       // Computed: lockedPrice - depositAmount

  // Validity
  validFrom: Date;
  validUntil: Date;
  pickupWindowDays: number;    // Days after lock to pick up (default 7)

  // Inventory
  maxLocks: number;            // 0 = unlimited
  currentLocks: number;
  totalPickedUp: number;

  // Rewards
  lockReward: ILockDealReward;    // Earned when user locks (pays deposit)
  pickupReward: ILockDealReward;  // Earned when user picks up
  earningsMultiplier: number;     // 2 = "Double Earnings" (applied to both rewards)

  // Eligibility
  minOrderValue?: number;
  eligibleCategories?: Types.ObjectId[];
  region: 'bangalore' | 'dubai' | 'all';
  terms: string[];

  // Admin
  isActive: boolean;
  isFeatured: boolean;
  priority: number;
  tags: string[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ILockPriceDealModel extends Model<ILockPriceDeal> {
  getActiveDeals(options?: {
    region?: string;
    category?: string;
    storeId?: string;
    limit?: number;
    page?: number;
  }): Promise<{ deals: ILockPriceDeal[]; total: number }>;
}

const LockDealRewardSchema = new Schema({
  type: {
    type: String,
    enum: ['coins', 'cashback'],
    default: 'coins',
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

const LockPriceDealSchema = new Schema<ILockPriceDeal>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000,
  },
  image: {
    type: String,
    required: true,
    trim: true,
  },
  images: [{
    type: String,
    trim: true,
  }],

  // Store/Merchant
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
  },
  merchant: {
    type: Schema.Types.ObjectId,
    ref: 'MerchantUser',
    required: true,
  },
  storeName: {
    type: String,
    required: true,
    trim: true,
  },
  storeCategory: {
    type: Schema.Types.ObjectId,
    ref: 'Category',
  },

  // Pricing
  originalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  lockedPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    enum: ['INR', 'AED', 'USD'],
    default: 'INR',
  },
  depositPercent: {
    type: Number,
    required: true,
    default: 10,
    min: 1,
    max: 50,
  },
  depositAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  balanceAmount: {
    type: Number,
    required: true,
    min: 0,
  },

  // Validity
  validFrom: {
    type: Date,
    required: true,
    default: Date.now,
  },
  validUntil: {
    type: Date,
    required: true,
  },
  pickupWindowDays: {
    type: Number,
    default: 7,
    min: 1,
    max: 30,
  },

  // Inventory
  maxLocks: {
    type: Number,
    default: 0,
    min: 0,
  },
  currentLocks: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalPickedUp: {
    type: Number,
    default: 0,
    min: 0,
  },

  // Rewards
  lockReward: {
    type: LockDealRewardSchema,
    required: true,
    default: { type: 'coins', amount: 50 },
  },
  pickupReward: {
    type: LockDealRewardSchema,
    required: true,
    default: { type: 'coins', amount: 100 },
  },
  earningsMultiplier: {
    type: Number,
    default: 2,
    min: 1,
    max: 10,
  },

  // Eligibility
  minOrderValue: {
    type: Number,
    min: 0,
  },
  eligibleCategories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category',
  }],
  region: {
    type: String,
    enum: ['bangalore', 'dubai', 'all'],
    default: 'all',
  },
  terms: [{
    type: String,
    trim: true,
  }],

  // Admin
  isActive: {
    type: Boolean,
    default: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: Number,
    default: 0,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
LockPriceDealSchema.index({ isActive: 1, validUntil: 1 });
LockPriceDealSchema.index({ store: 1, isActive: 1 });
LockPriceDealSchema.index({ merchant: 1 });
LockPriceDealSchema.index({ storeCategory: 1, isActive: 1 });
LockPriceDealSchema.index({ region: 1, isActive: 1, priority: -1 });
LockPriceDealSchema.index({ isFeatured: 1, isActive: 1 });
LockPriceDealSchema.index({ tags: 1 });

// Virtual: isRunning
LockPriceDealSchema.virtual('isRunning').get(function (this: ILockPriceDeal) {
  const now = new Date();
  return this.isActive && this.validFrom <= now && this.validUntil >= now;
});

// Virtual: availableSlots
LockPriceDealSchema.virtual('availableSlots').get(function (this: ILockPriceDeal) {
  if (this.maxLocks === 0) return Infinity;
  return Math.max(0, this.maxLocks - this.currentLocks);
});

// Virtual: isSoldOut
LockPriceDealSchema.virtual('isSoldOut').get(function (this: ILockPriceDeal) {
  return this.maxLocks > 0 && this.currentLocks >= this.maxLocks;
});

// Virtual: discount percentage
LockPriceDealSchema.virtual('discountPercent').get(function (this: ILockPriceDeal) {
  if (this.originalPrice <= 0) return 0;
  return Math.round(((this.originalPrice - this.lockedPrice) / this.originalPrice) * 100);
});

// Pre-save: compute deposit and balance amounts
LockPriceDealSchema.pre('save', function (next) {
  this.depositAmount = Math.ceil(this.lockedPrice * this.depositPercent / 100);
  this.balanceAmount = this.lockedPrice - this.depositAmount;
  next();
});

// Static: get active deals with filtering
LockPriceDealSchema.statics.getActiveDeals = async function (options: {
  region?: string;
  category?: string;
  storeId?: string;
  limit?: number;
  page?: number;
} = {}) {
  const { region, category, storeId, limit = 20, page = 1 } = options;
  const now = new Date();

  const query: any = {
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  };

  if (region && region !== 'all') {
    query.$or = [{ region }, { region: 'all' }];
  }
  if (category) {
    query.storeCategory = category;
  }
  if (storeId) {
    query.store = storeId;
  }

  const [deals, total] = await Promise.all([
    this.find(query)
      .sort({ isFeatured: -1, priority: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('store', 'name logo address')
      .lean(),
    this.countDocuments(query),
  ]);

  return { deals, total };
};

// Delete cached model if exists (for development)
if (mongoose.models.LockPriceDeal) {
  delete (mongoose.models as any).LockPriceDeal;
}

export const LockPriceDeal = mongoose.model<ILockPriceDeal, ILockPriceDealModel>(
  'LockPriceDeal',
  LockPriceDealSchema
);
