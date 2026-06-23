import mongoose, { Schema, Document, Types } from 'mongoose';

// Banner position type
export type BannerPosition = 'hero' | 'inline' | 'footer';

// CTA action type
export type CTAAction = 'navigate' | 'external' | 'brand' | 'category' | 'collection';

// Main Mall Banner interface
export interface IMallBanner extends Document {
  _id: Types.ObjectId;
  title: string;
  subtitle?: string;
  badge?: string;
  image: string;
  backgroundColor: string;
  gradientColors?: string[];
  textColor: string;
  ctaText: string;
  ctaAction: CTAAction;
  ctaUrl?: string;
  ctaBrand?: Types.ObjectId;
  ctaCategory?: Types.ObjectId;
  ctaCollection?: Types.ObjectId;
  position: BannerPosition;
  priority: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  clickCount: number;
  impressionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Mall Banner Schema
const MallBannerSchema = new Schema<IMallBanner>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: 300
  },
  badge: {
    type: String,
    trim: true,
    maxlength: 50
  },
  image: {
    type: String,
    required: true,
    trim: true
  },
  backgroundColor: {
    type: String,
    required: true,
    trim: true,
    default: '#00C06A',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Background color must be a valid hex color']
  },
  gradientColors: [{
    type: String,
    trim: true,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Gradient color must be a valid hex color']
  }],
  textColor: {
    type: String,
    required: true,
    trim: true,
    default: '#FFFFFF',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Text color must be a valid hex color']
  },
  ctaText: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    default: 'Shop Now'
  },
  ctaAction: {
    type: String,
    enum: ['navigate', 'external', 'brand', 'category', 'collection'],
    default: 'navigate'
  },
  ctaUrl: {
    type: String,
    trim: true
  },
  ctaBrand: {
    type: Schema.Types.ObjectId,
    ref: 'MallBrand'
  },
  ctaCategory: {
    type: Schema.Types.ObjectId,
    ref: 'MallCategory'
  },
  ctaCollection: {
    type: Schema.Types.ObjectId,
    ref: 'MallCollection'
  },
  position: {
    type: String,
    enum: ['hero', 'inline', 'footer'],
    default: 'hero'
  },
  priority: {
    type: Number,
    default: 0,
    min: 0
  },
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  clickCount: {
    type: Number,
    default: 0,
    min: 0
  },
  impressionCount: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
MallBannerSchema.index({ position: 1, isActive: 1, priority: -1 });
MallBannerSchema.index({ validFrom: 1, validUntil: 1, isActive: 1 });
MallBannerSchema.index({ ctaBrand: 1 });
MallBannerSchema.index({ ctaCategory: 1 });
MallBannerSchema.index({ ctaCollection: 1 });
MallBannerSchema.index({ createdAt: -1 });

// Virtual to check if banner is currently valid
MallBannerSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  if (!this.isActive) return false;
  if (now < this.validFrom) return false;
  if (now > this.validUntil) return false;
  return true;
});

// Virtual for click-through rate (CTR)
MallBannerSchema.virtual('ctr').get(function() {
  if (this.impressionCount === 0) return 0;
  return ((this.clickCount / this.impressionCount) * 100).toFixed(2);
});

// Static method to get hero banners
MallBannerSchema.statics.getHeroBanners = function(limit: number = 5) {
  const now = new Date();
  return this.find({
    isActive: true,
    position: 'hero',
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  })
    .populate('ctaBrand', 'name slug logo')
    .populate('ctaCategory', 'name slug')
    .populate('ctaCollection', 'name slug')
    .sort({ priority: -1 })
    .limit(limit);
};

// Static method to get banners by position
MallBannerSchema.statics.getBannersByPosition = function(position: BannerPosition, limit: number = 5) {
  const now = new Date();
  return this.find({
    isActive: true,
    position,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  })
    .populate('ctaBrand', 'name slug logo')
    .populate('ctaCategory', 'name slug')
    .populate('ctaCollection', 'name slug')
    .sort({ priority: -1 })
    .limit(limit);
};

// Static method to get all active banners
MallBannerSchema.statics.getActiveBanners = function(limit: number = 10) {
  const now = new Date();
  return this.find({
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  })
    .populate('ctaBrand', 'name slug logo')
    .populate('ctaCategory', 'name slug')
    .populate('ctaCollection', 'name slug')
    .sort({ position: 1, priority: -1 })
    .limit(limit);
};

// Method to record impression
MallBannerSchema.methods.recordImpression = async function() {
  this.impressionCount += 1;
  await this.save();
};

// Method to record click
MallBannerSchema.methods.recordClick = async function() {
  this.clickCount += 1;
  await this.save();
};

// Delete cached model if exists (for development)
if (mongoose.models.MallBanner) {
  delete (mongoose.models as any).MallBanner;
}

export const MallBanner = mongoose.model<IMallBanner>('MallBanner', MallBannerSchema);
