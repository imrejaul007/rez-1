import mongoose, { Document, Schema, Model, Types } from 'mongoose';
import { MainCategorySlug } from './CoinTransaction';

// ============================================
// TYPES & INTERFACES
// ============================================

export type BonusCampaignType =
  | 'cashback_boost'
  | 'bank_offer'
  | 'bill_upload_bonus'
  | 'category_multiplier'
  | 'first_transaction_bonus'
  | 'festival_offer';

export type BonusCampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'exhausted'
  | 'expired'
  | 'cancelled';

export type FundingSourceType = 'platform' | 'branded' | 'partner';
export type RewardType = 'percentage' | 'flat' | 'multiplier';
export type CoinType = 'rez' | 'branded';

export interface IBonusCampaignFunding {
  type: FundingSourceType;
  partnerId?: Types.ObjectId;
  partnerName?: string;
  partnerLogo?: string;
}

export interface IBonusCampaignEligibility {
  paymentMethods?: string[];
  bankCodes?: string[];
  binPrefixes?: string[];
  merchantCategories?: MainCategorySlug[];
  storeIds?: Types.ObjectId[];
  minSpend?: number;
  firstTransactionOnly?: boolean;
  userSegments?: string[];
  regions?: string[];
  excludeUserIds?: Types.ObjectId[];
}

export interface IBonusCampaignReward {
  type: RewardType;
  value: number;
  capPerUser: number;
  capPerTransaction: number;
  totalBudget: number;
  consumedBudget: number;
  coinType: CoinType;
  brandId?: Types.ObjectId;
}

export interface IBonusCampaignLimits {
  maxClaimsPerUser: number;
  maxClaimsPerUserPerDay: number;
  totalGlobalClaims: number;
  currentGlobalClaims: number;
}

export interface IBonusCampaignDisplay {
  icon: string;
  bannerImage?: string;
  partnerLogo?: string;
  backgroundColor?: string;
  badgeText?: string;
  featured: boolean;
  priority: number;
}

export interface IBonusCampaignDeepLink {
  screen: string;
  params?: Record<string, any>;
}

export interface IBonusCampaign extends Document {
  _id: Types.ObjectId;
  slug: string;
  title: string;
  subtitle: string;
  description?: string;
  campaignType: BonusCampaignType;
  fundingSource: IBonusCampaignFunding;
  eligibility: IBonusCampaignEligibility;
  reward: IBonusCampaignReward;
  limits: IBonusCampaignLimits;
  startTime: Date;
  endTime: Date;
  display: IBonusCampaignDisplay;
  deepLink: IBonusCampaignDeepLink;
  status: BonusCampaignStatus;
  terms: string[];
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isRunning: boolean;
  budgetRemaining: number;
  isExhausted: boolean;
}

export interface IBonusCampaignModel extends Model<IBonusCampaign> {
  getActiveCampaigns(region?: string): Promise<IBonusCampaign[]>;
  getCampaignsByType(type: BonusCampaignType, region?: string): Promise<IBonusCampaign[]>;
}

// ============================================
// SUB-SCHEMAS
// ============================================

const FundingSourceSchema = new Schema({
  type: {
    type: String,
    enum: ['platform', 'branded', 'partner'],
    required: true,
    default: 'platform',
  },
  partnerId: {
    type: Schema.Types.ObjectId,
    ref: 'Sponsor',
  },
  partnerName: {
    type: String,
    trim: true,
    maxlength: 200,
  },
  partnerLogo: {
    type: String,
  },
}, { _id: false });

const EligibilitySchema = new Schema({
  paymentMethods: [{
    type: String,
    trim: true,
  }],
  bankCodes: [{
    type: String,
    uppercase: true,
    trim: true,
  }],
  binPrefixes: [{
    type: String,
    trim: true,
  }],
  merchantCategories: [{
    type: String,
    enum: [
      'food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports',
      'healthcare', 'fashion', 'education-learning', 'home-services',
      'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics',
    ],
  }],
  storeIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Store',
  }],
  minSpend: {
    type: Number,
    min: 0,
    default: 0,
  },
  firstTransactionOnly: {
    type: Boolean,
    default: false,
  },
  userSegments: [{
    type: String,
    enum: ['new_user', 'student', 'corporate', 'prive', 'all'],
    trim: true,
  }],
  regions: [{
    type: String,
    trim: true,
  }],
  excludeUserIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
  }],
}, { _id: false });

const RewardSchema = new Schema({
  type: {
    type: String,
    enum: ['percentage', 'flat', 'multiplier'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  capPerUser: {
    type: Number,
    required: true,
    min: 0,
  },
  capPerTransaction: {
    type: Number,
    required: true,
    min: 0,
  },
  totalBudget: {
    type: Number,
    required: true,
    min: 0,
  },
  consumedBudget: {
    type: Number,
    default: 0,
    min: 0,
  },
  coinType: {
    type: String,
    enum: ['rez', 'branded'],
    default: 'rez',
  },
  brandId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
  },
}, { _id: false });

const LimitsSchema = new Schema({
  maxClaimsPerUser: {
    type: Number,
    default: 1,
    min: 1,
  },
  maxClaimsPerUserPerDay: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalGlobalClaims: {
    type: Number,
    default: 0,
    min: 0,
  },
  currentGlobalClaims: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { _id: false });

const DisplaySchema = new Schema({
  icon: {
    type: String,
    default: '🎁',
  },
  bannerImage: {
    type: String,
  },
  partnerLogo: {
    type: String,
  },
  backgroundColor: {
    type: String,
    default: '#FEF3C7',
  },
  badgeText: {
    type: String,
    trim: true,
    maxlength: 30,
  },
  featured: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
  },
}, { _id: false });

const DeepLinkSchema = new Schema({
  screen: {
    type: String,
    required: true,
    trim: true,
  },
  params: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, { _id: false });

// ============================================
// MAIN SCHEMA
// ============================================

const BonusCampaignSchema = new Schema<IBonusCampaign>(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
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
      maxlength: 2000,
    },
    campaignType: {
      type: String,
      required: true,
      enum: [
        'cashback_boost',
        'bank_offer',
        'bill_upload_bonus',
        'category_multiplier',
        'first_transaction_bonus',
        'festival_offer',
      ],
      index: true,
    },
    fundingSource: {
      type: FundingSourceSchema,
      required: true,
      default: () => ({ type: 'platform' }),
    },
    eligibility: {
      type: EligibilitySchema,
      default: () => ({}),
    },
    reward: {
      type: RewardSchema,
      required: true,
    },
    limits: {
      type: LimitsSchema,
      default: () => ({ maxClaimsPerUser: 1, maxClaimsPerUserPerDay: 0, totalGlobalClaims: 0, currentGlobalClaims: 0 }),
    },
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
    display: {
      type: DisplaySchema,
      default: () => ({ icon: '🎁', featured: false, priority: 50 }),
    },
    deepLink: {
      type: DeepLinkSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'paused', 'exhausted', 'expired', 'cancelled'],
      default: 'draft',
      index: true,
    },
    terms: [{
      type: String,
      trim: true,
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================

BonusCampaignSchema.index({ status: 1, startTime: 1, endTime: 1 });
BonusCampaignSchema.index({ 'eligibility.regions': 1, status: 1 });
BonusCampaignSchema.index({ campaignType: 1, status: 1 });
BonusCampaignSchema.index({ 'display.priority': -1 });
BonusCampaignSchema.index({ 'display.featured': 1, status: 1 });

// ============================================
// VIRTUALS
// ============================================

BonusCampaignSchema.virtual('isRunning').get(function () {
  const now = new Date();
  return this.status === 'active' && this.startTime <= now && this.endTime >= now;
});

BonusCampaignSchema.virtual('budgetRemaining').get(function () {
  return Math.max(0, this.reward.totalBudget - this.reward.consumedBudget);
});

BonusCampaignSchema.virtual('isExhausted').get(function () {
  return this.reward.consumedBudget >= this.reward.totalBudget;
});

// ============================================
// PRE-SAVE HOOK: Auto-transition status
// ============================================

BonusCampaignSchema.pre('save', function (next) {
  const now = new Date();

  // Auto-exhaust if budget depleted
  if (this.status === 'active' && this.reward.consumedBudget >= this.reward.totalBudget) {
    this.status = 'exhausted';
  }

  // Auto-expire if past endTime
  if (['active', 'scheduled'].includes(this.status) && this.endTime < now) {
    this.status = 'expired';
  }

  // Auto-activate if scheduled and within time window
  if (this.status === 'scheduled' && this.startTime <= now && this.endTime >= now) {
    this.status = 'active';
  }

  next();
});

// ============================================
// STATIC METHODS
// ============================================

BonusCampaignSchema.statics.getActiveCampaigns = function (region?: string) {
  const now = new Date();
  const query: any = {
    status: 'active',
    startTime: { $lte: now },
    endTime: { $gte: now },
  };

  if (region && region !== 'all') {
    query.$or = [
      { 'eligibility.regions': region },
      { 'eligibility.regions': 'all' },
      { 'eligibility.regions': { $size: 0 } },
      { 'eligibility.regions': { $exists: false } },
    ];
  }

  return this.find(query).sort({ 'display.featured': -1, 'display.priority': -1 });
};

BonusCampaignSchema.statics.getCampaignsByType = function (type: BonusCampaignType, region?: string) {
  const now = new Date();
  const query: any = {
    campaignType: type,
    status: 'active',
    startTime: { $lte: now },
    endTime: { $gte: now },
  };

  if (region && region !== 'all') {
    query.$or = [
      { 'eligibility.regions': region },
      { 'eligibility.regions': 'all' },
      { 'eligibility.regions': { $size: 0 } },
      { 'eligibility.regions': { $exists: false } },
    ];
  }

  return this.find(query).sort({ 'display.featured': -1, 'display.priority': -1 });
};

// ============================================
// EXPORT
// ============================================

const BonusCampaign = mongoose.model<IBonusCampaign, IBonusCampaignModel>(
  'BonusCampaign',
  BonusCampaignSchema
);

export default BonusCampaign;
