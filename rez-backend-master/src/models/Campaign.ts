import mongoose, { Document, Schema, Types } from 'mongoose';

/**
 * Campaign Deal interface - Individual deals within a campaign
 */
export interface ICampaignDeal {
  store?: string;
  storeId?: Types.ObjectId;
  image: string;
  cashback?: string;
  coins?: string;
  bonus?: string;
  drop?: string;
  discount?: string;
  endsIn?: string;
  // Price for paid deals (0 or undefined = free deal)
  price?: number;
  currency?: 'INR' | 'AED' | 'USD';
  // Optional: limit how many times this deal can be purchased (0 = unlimited)
  purchaseLimit?: number;
  // Track how many times this deal has been purchased
  purchaseCount?: number;
}

/**
 * Campaign interface - For homepage Exciting Deals section
 */
export interface ICampaign extends Document {
  _id: Types.ObjectId;
  campaignId: string; // e.g., 'super-cashback', 'triple-coin-day'
  title: string;
  subtitle: string;
  description?: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  gradientColors: string[];
  type: 'cashback' | 'coins' | 'bank' | 'bill' | 'drop' | 'new-user' | 'flash' | 'general';
  deals: ICampaignDeal[];
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  priority: number;
  eligibleCategories?: string[];
  terms?: string[];
  minOrderValue?: number;
  maxBenefit?: number;
  icon?: string;
  bannerImage?: string;
  region?: 'bangalore' | 'dubai' | 'all'; // Region restriction - 'all' means available everywhere
  exclusiveToProgramSlug?: 'student_zone' | 'corporate_perks' | 'nuqta_prive'; // If set, only visible to active program members
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isRunning: boolean;
}

/**
 * Campaign Deal Schema
 */
const CampaignDealSchema = new Schema<ICampaignDeal>({
  store: { type: String, trim: true },
  storeId: { type: Schema.Types.ObjectId, ref: 'Store' },
  image: { type: String, required: true },
  cashback: { type: String },
  coins: { type: String },
  bonus: { type: String },
  drop: { type: String },
  discount: { type: String },
  endsIn: { type: String },
  // Price for paid deals (0 or undefined = free deal)
  price: { type: Number, default: 0, min: 0 },
  currency: { type: String, enum: ['INR', 'AED', 'USD'], default: 'INR' },
  // Limit how many times this deal can be purchased (0 = unlimited)
  purchaseLimit: { type: Number, default: 0, min: 0 },
  // Track how many times this deal has been purchased
  purchaseCount: { type: Number, default: 0, min: 0 },
}, { _id: false });

/**
 * Campaign Schema
 */
const CampaignSchema = new Schema<ICampaign>({
  campaignId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  subtitle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  badge: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
  },
  badgeBg: {
    type: String,
    default: '#FFFFFF',
  },
  badgeColor: {
    type: String,
    default: '#0B2240',
  },
  gradientColors: [{
    type: String,
  }],
  type: {
    type: String,
    enum: ['cashback', 'coins', 'bank', 'bill', 'drop', 'new-user', 'flash', 'general'],
    default: 'general',
    index: true,
  },
  deals: [CampaignDealSchema],
  startTime: {
    type: Date,
    required: true,
    index: true,
  },
  endTime: {
    type: Date,
    required: true,
    index: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  eligibleCategories: [{
    type: String,
    trim: true,
  }],
  terms: [{
    type: String,
    trim: true,
  }],
  minOrderValue: {
    type: Number,
    min: 0,
  },
  maxBenefit: {
    type: Number,
    min: 0,
  },
  icon: {
    type: String,
  },
  bannerImage: {
    type: String,
  },
  region: {
    type: String,
    enum: ['bangalore', 'dubai', 'all'],
    default: 'all', // Available in all regions by default
    index: true,
  },
  exclusiveToProgramSlug: {
    type: String,
    enum: ['student_zone', 'corporate_perks', 'nuqta_prive'],
    index: true,
    sparse: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
CampaignSchema.index({ isActive: 1, startTime: 1, endTime: 1 });
CampaignSchema.index({ type: 1, isActive: 1 });
CampaignSchema.index({ priority: -1 });
CampaignSchema.index({ region: 1, isActive: 1 }); // Region-based filtering

// Virtual to check if campaign is currently running
CampaignSchema.virtual('isRunning').get(function() {
  const now = new Date();
  return this.isActive && this.startTime <= now && this.endTime >= now;
});

// Static methods
CampaignSchema.statics.getActiveCampaigns = function(region?: string) {
  const now = new Date();
  const query: any = {
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
  };

  // Filter by region: show campaigns for specific region OR 'all' regions
  if (region && region !== 'all') {
    query.$or = [
      { region: region },
      { region: 'all' },
      { region: { $exists: false } }, // Legacy campaigns without region field
    ];
  }

  return this.find(query).sort({ priority: -1 });
};

CampaignSchema.statics.getCampaignsByType = function(type: string, region?: string) {
  const now = new Date();
  const query: any = {
    type,
    isActive: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
  };

  // Filter by region: show campaigns for specific region OR 'all' regions
  if (region && region !== 'all') {
    query.$or = [
      { region: region },
      { region: 'all' },
      { region: { $exists: false } }, // Legacy campaigns without region field
    ];
  }

  return this.find(query).sort({ priority: -1 });
};

const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);

export default Campaign;
