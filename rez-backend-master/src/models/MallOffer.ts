import mongoose, { Schema, Document, Types } from 'mongoose';

// Offer type
export type OfferType = 'cashback' | 'discount' | 'coins' | 'combo';

// Offer value type
export type ValueType = 'percentage' | 'fixed';

// Offer badge type
export type OfferBadge = 'limited-time' | 'mall-exclusive' | 'flash-sale' | 'best-deal';

// Main Mall Offer interface
export interface IMallOffer extends Document {
  _id: Types.ObjectId;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  brand?: Types.ObjectId;
  store?: Types.ObjectId;
  offerType: OfferType;
  value: number;
  valueType: ValueType;
  extraCoins?: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageCount: number;
  isMallExclusive: boolean;
  badge?: OfferBadge;
  priority: number;
  termsAndConditions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Mall Offer Schema
const MallOfferSchema = new Schema<IMallOffer>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  image: {
    type: String,
    required: true,
    trim: true
  },
  brand: {
    type: Schema.Types.ObjectId,
    ref: 'MallBrand'
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store'
  },
  offerType: {
    type: String,
    enum: ['cashback', 'discount', 'coins', 'combo'],
    default: 'cashback'
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  valueType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  extraCoins: {
    type: Number,
    min: 0,
    default: 0
  },
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  minPurchase: {
    type: Number,
    min: 0
  },
  maxDiscount: {
    type: Number,
    min: 0
  },
  usageLimit: {
    type: Number,
    min: 0
  },
  usageCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isMallExclusive: {
    type: Boolean,
    default: true
  },
  badge: {
    type: String,
    enum: ['limited-time', 'mall-exclusive', 'flash-sale', 'best-deal']
  },
  priority: {
    type: Number,
    default: 0,
    min: 0
  },
  termsAndConditions: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
MallOfferSchema.index({ brand: 1, isActive: 1 });
MallOfferSchema.index({ validFrom: 1, validUntil: 1, isActive: 1 });
MallOfferSchema.index({ isMallExclusive: 1, isActive: 1 });
MallOfferSchema.index({ priority: -1, isActive: 1 });
MallOfferSchema.index({ offerType: 1, isActive: 1 });
MallOfferSchema.index({ badge: 1, isActive: 1 });
MallOfferSchema.index({ createdAt: -1 });
// Compound indexes for mall homepage queries
MallOfferSchema.index({ isMallExclusive: 1, isActive: 1, validFrom: 1, validUntil: 1, priority: -1 }); // exclusive offers
MallOfferSchema.index({ badge: 1, isActive: 1, validFrom: 1, validUntil: 1, priority: -1 }); // deals of the day
MallOfferSchema.index({ store: 1, isActive: 1 });

// Pre-validate: ensure exactly one of brand or store is set
MallOfferSchema.pre('validate', function(next) {
  const hasBrand = !!this.brand;
  const hasStore = !!this.store;
  if (!hasBrand && !hasStore) {
    return next(new Error('Either brand or store must be provided'));
  }
  if (hasBrand && hasStore) {
    return next(new Error('Only one of brand or store can be set, not both'));
  }
  next();
});

// Virtual to check if offer is currently valid
MallOfferSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  if (!this.isActive) return false;
  if (now < this.validFrom) return false;
  if (now > this.validUntil) return false;
  if (this.usageLimit && this.usageCount >= this.usageLimit) return false;
  return true;
});

// Virtual for days remaining
MallOfferSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const diff = this.validUntil.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for formatted value display
MallOfferSchema.virtual('valueDisplay').get(function() {
  if (this.valueType === 'percentage') {
    return `${this.value}% off`;
  }
  return `₹${this.value} off`;
});

// Static method to get active exclusive offers
MallOfferSchema.statics.getExclusiveOffers = function(limit: number = 10) {
  const now = new Date();
  return this.find({
    isActive: true,
    isMallExclusive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    $or: [
      { usageLimit: { $exists: false } },
      { $expr: { $lt: ['$usageCount', '$usageLimit'] } }
    ]
  })
    .populate('brand', 'name slug logo tier')
    .populate('store', 'name logo tags')
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

// Static method to get all active offers
MallOfferSchema.statics.getActiveOffers = function(filters: any = {}, limit: number = 20) {
  const now = new Date();
  const query: any = {
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  };

  if (filters.brand) {
    query.brand = filters.brand;
  }

  if (filters.offerType) {
    query.offerType = filters.offerType;
  }

  if (filters.badge) {
    query.badge = filters.badge;
  }

  return this.find(query)
    .populate('brand', 'name slug logo tier')
    .populate('store', 'name logo tags')
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

// Static method to get flash sale offers
MallOfferSchema.statics.getFlashSales = function(limit: number = 5) {
  const now = new Date();
  return this.find({
    isActive: true,
    badge: 'flash-sale',
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  })
    .populate('brand', 'name slug logo tier')
    .populate('store', 'name logo tags')
    .sort({ validUntil: 1 }) // Ending soonest first
    .limit(limit);
};

// Method to increment usage count
MallOfferSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  await this.save();
  return this.usageCount;
};

// Delete cached model if exists (for development)
if (mongoose.models.MallOffer) {
  delete (mongoose.models as any).MallOffer;
}

export const MallOffer = mongoose.model<IMallOffer>('MallOffer', MallOfferSchema);
