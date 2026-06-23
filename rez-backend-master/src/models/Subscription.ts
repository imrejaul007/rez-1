import mongoose, { Schema, Document, Types } from 'mongoose';

// Subscription tier types
export type SubscriptionTier = 'free' | 'premium' | 'vip';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'trial' | 'grace_period' | 'payment_failed';
export type BillingCycle = 'monthly' | 'yearly';

// Subscription benefits interface
export interface ISubscriptionBenefits {
  cashbackMultiplier: number; // 1x, 2x, 3x
  freeDelivery: boolean;
  prioritySupport: boolean;
  exclusiveDeals: boolean;
  unlimitedWishlists: boolean;
  earlyFlashSaleAccess: boolean;
  personalShopper: boolean;
  premiumEvents: boolean;
  conciergeService: boolean;
  birthdayOffer: boolean;
  anniversaryOffer: boolean;
}

// Subscription usage stats interface
export interface ISubscriptionUsage {
  totalSavings: number;
  ordersThisMonth: number;
  ordersAllTime: number;
  cashbackEarned: number;
  deliveryFeesSaved: number;
  exclusiveDealsUsed: number;
  lastUsedAt?: Date;
}

// Subscription pricing interface
export interface ISubscriptionPricing {
  monthly: number;
  yearly: number;
  yearlyDiscount: number; // Percentage
}

// Main Subscription interface
export interface ISubscription extends Document {
  user: Types.ObjectId;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  price: number;
  startDate: Date;
  endDate: Date;
  trialEndDate?: Date;
  autoRenew: boolean;
  paymentMethod?: string;

  // Payment gateway integration
  razorpaySubscriptionId?: string;
  razorpayPlanId?: string;
  razorpayCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;

  // Benefits
  benefits: ISubscriptionBenefits;

  // Usage tracking
  usage: ISubscriptionUsage;

  // Cancellation
  cancellationDate?: Date;
  cancellationReason?: string;
  cancellationFeedback?: string;
  reactivationEligibleUntil?: Date;

  // Grace period tracking
  gracePeriodStartDate?: Date;
  paymentRetryCount: number;
  lastPaymentRetryDate?: Date;

  // Grandfathering (price protection)
  isGrandfathered: boolean;
  grandfatheredPrice?: number;

  // Upgrade/downgrade tracking
  previousTier?: SubscriptionTier;
  upgradeDate?: Date;
  downgradeScheduledFor?: Date;
  downgradeTargetTier?: SubscriptionTier;
  proratedCredit?: number;

  // Metadata
  metadata?: {
    source?: string; // 'web', 'app', 'referral'
    campaign?: string;
    promoCode?: string;
  };

  createdAt: Date;
  updatedAt: Date;

  // Methods
  isActive(): boolean;
  isInTrial(): boolean;
  isInGracePeriod(): boolean;
  canUpgrade(): boolean;
  canDowngrade(): boolean;
  calculateROI(): number;
  getRemainingDays(): number;
}

// Subscription Model interface with static methods
export interface ISubscriptionModel extends mongoose.Model<ISubscription> {
  getTierConfig(tier: SubscriptionTier): {
    tier: SubscriptionTier;
    name: string;
    pricing: ISubscriptionPricing;
    benefits: ISubscriptionBenefits;
    description: string;
    features: string[];
  };
  calculateProratedAmount(
    currentTier: SubscriptionTier,
    newTier: SubscriptionTier,
    endDate: Date,
    billingCycle: BillingCycle
  ): number;
}

// Subscription Schema
const SubscriptionSchema = new Schema<ISubscription, ISubscriptionModel>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  tier: {
    type: String,
    enum: ['free', 'premium', 'vip'],
    default: 'free',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'expired', 'trial', 'grace_period', 'payment_failed'],
    default: 'active' as SubscriptionStatus,
    required: true,
    index: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  trialEndDate: {
    type: Date
  },
  autoRenew: {
    type: Boolean,
    default: true
  },
  paymentMethod: {
    type: String
  },

  // Razorpay integration
  razorpaySubscriptionId: {
    type: String,
    unique: true,
    sparse: true
  },
  razorpayPlanId: {
    type: String
  },
  razorpayCustomerId: {
    type: String
  },
  stripeSubscriptionId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripeCustomerId: {
    type: String
  },

  // Benefits
  benefits: {
    cashbackMultiplier: {
      type: Number,
      default: 1,
      min: 1,
      max: 5
    },
    freeDelivery: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    exclusiveDeals: {
      type: Boolean,
      default: false
    },
    unlimitedWishlists: {
      type: Boolean,
      default: false
    },
    earlyFlashSaleAccess: {
      type: Boolean,
      default: false
    },
    personalShopper: {
      type: Boolean,
      default: false
    },
    premiumEvents: {
      type: Boolean,
      default: false
    },
    conciergeService: {
      type: Boolean,
      default: false
    },
    birthdayOffer: {
      type: Boolean,
      default: false
    },
    anniversaryOffer: {
      type: Boolean,
      default: false
    }
  },

  // Usage tracking
  usage: {
    totalSavings: {
      type: Number,
      default: 0,
      min: 0
    },
    ordersThisMonth: {
      type: Number,
      default: 0,
      min: 0
    },
    ordersAllTime: {
      type: Number,
      default: 0,
      min: 0
    },
    cashbackEarned: {
      type: Number,
      default: 0,
      min: 0
    },
    deliveryFeesSaved: {
      type: Number,
      default: 0,
      min: 0
    },
    exclusiveDealsUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    lastUsedAt: {
      type: Date
    }
  },

  // Cancellation
  cancellationDate: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  cancellationFeedback: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  reactivationEligibleUntil: {
    type: Date
  },

  // Grace period tracking
  gracePeriodStartDate: {
    type: Date
  },
  paymentRetryCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastPaymentRetryDate: {
    type: Date
  },

  // Grandfathering
  isGrandfathered: {
    type: Boolean,
    default: false
  },
  grandfatheredPrice: {
    type: Number,
    min: 0
  },

  // Upgrade/downgrade tracking
  previousTier: {
    type: String,
    enum: ['free', 'premium', 'vip']
  },
  upgradeDate: {
    type: Date
  },
  downgradeScheduledFor: {
    type: Date
  },
  downgradeTargetTier: {
    type: String,
    enum: ['free', 'premium', 'vip']
  },
  proratedCredit: {
    type: Number,
    default: 0,
    min: 0
  },

  // Metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'app', 'referral', 'support']
    },
    campaign: String,
    promoCode: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
SubscriptionSchema.index({ user: 1, status: 1 });
SubscriptionSchema.index({ tier: 1, status: 1 });
SubscriptionSchema.index({ endDate: 1, status: 1 });
SubscriptionSchema.index({ 'metadata.campaign': 1 });
SubscriptionSchema.index({ createdAt: -1 });

// Virtual for days remaining
SubscriptionSchema.virtual('daysRemaining').get(function (this: ISubscription) {
  if (this.status === 'cancelled' || this.status === 'expired') return 0;
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Instance method to check if subscription is active (includes trial and grace period)
SubscriptionSchema.methods.isActive = function (this: ISubscription): boolean {
  const now = new Date();
  if (this.tier !== 'premium' && this.tier !== 'vip') return false;

  if (this.status === 'active' && this.endDate > now) return true;
  if (this.status === 'trial' && this.trialEndDate && this.trialEndDate > now) return true;
  if (this.status === 'grace_period') return this.isInGracePeriod();

  return false;
};

// Instance method to check if in trial period
SubscriptionSchema.methods.isInTrial = function (this: ISubscription): boolean {
  if (!this.trialEndDate) return false;
  const now = new Date();
  return this.status === 'trial' && this.trialEndDate > now;
};

// Instance method to check if in grace period
SubscriptionSchema.methods.isInGracePeriod = function (this: ISubscription): boolean {
  if (!this.gracePeriodStartDate) return false;
  const now = new Date();
  const gracePeriodEnd = new Date(this.gracePeriodStartDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3); // 3-day grace period
  return this.status === 'grace_period' && now <= gracePeriodEnd;
};

// Instance method to check if can upgrade
SubscriptionSchema.methods.canUpgrade = function (this: ISubscription): boolean {
  if (!this.isActive()) return false;
  return this.tier === 'free' || this.tier === 'premium';
};

// Instance method to check if can downgrade
SubscriptionSchema.methods.canDowngrade = function (this: ISubscription): boolean {
  if (!this.isActive()) return false;
  return this.tier === 'premium' || this.tier === 'vip';
};

// Instance method to calculate ROI
SubscriptionSchema.methods.calculateROI = function (this: ISubscription): number {
  if (this.price === 0) return 0;
  const totalValue = this.usage.totalSavings + this.usage.cashbackEarned + this.usage.deliveryFeesSaved;
  return ((totalValue - this.price) / this.price) * 100;
};

// Instance method to get remaining days
SubscriptionSchema.methods.getRemainingDays = function (this: ISubscription): number {
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

// Static method to get tier configuration
SubscriptionSchema.statics.getTierConfig = function (tier: SubscriptionTier): {
  tier: SubscriptionTier;
  name: string;
  pricing: ISubscriptionPricing;
  benefits: ISubscriptionBenefits;
  description: string;
  features: string[];
} {
  const configs = {
    free: {
      tier: 'free' as SubscriptionTier,
      name: 'Free',
      pricing: {
        monthly: 0,
        yearly: 0,
        yearlyDiscount: 0
      },
      benefits: {
        cashbackMultiplier: 1,
        freeDelivery: false,
        prioritySupport: false,
        exclusiveDeals: false,
        unlimitedWishlists: false,
        earlyFlashSaleAccess: false,
        personalShopper: false,
        premiumEvents: false,
        conciergeService: false,
        birthdayOffer: false,
        anniversaryOffer: false
      },
      description: 'Basic features with standard cashback',
      features: [
        '2-5% cashback on orders',
        'Basic features',
        'Standard support',
        '5 wishlists maximum',
        'Regular delivery'
      ]
    },
    premium: {
      tier: 'premium' as SubscriptionTier,
      name: 'Premium',
      pricing: {
        monthly: 99,
        yearly: 999,
        yearlyDiscount: 16
      },
      benefits: {
        cashbackMultiplier: 2,
        freeDelivery: true,
        prioritySupport: true,
        exclusiveDeals: true,
        unlimitedWishlists: true,
        earlyFlashSaleAccess: true,
        personalShopper: false,
        premiumEvents: false,
        conciergeService: false,
        birthdayOffer: true,
        anniversaryOffer: false
      },
      description: 'Enhanced benefits with 2x cashback',
      features: [
        '5-10% cashback on orders (2x rate)',
        'Exclusive deals and offers',
        'Priority customer support',
        'Unlimited wishlists',
        'Free delivery on select stores',
        'Early access to flash sales',
        'Birthday special offers',
        'Save up to ₹3000/month'
      ]
    },
    vip: {
      tier: 'vip' as SubscriptionTier,
      name: 'VIP',
      pricing: {
        monthly: 299,
        yearly: 2999,
        yearlyDiscount: 16
      },
      benefits: {
        cashbackMultiplier: 3,
        freeDelivery: true,
        prioritySupport: true,
        exclusiveDeals: true,
        unlimitedWishlists: true,
        earlyFlashSaleAccess: true,
        personalShopper: true,
        premiumEvents: true,
        conciergeService: true,
        birthdayOffer: true,
        anniversaryOffer: true
      },
      description: 'Ultimate experience with 3x cashback',
      features: [
        '10-15% cashback on orders (3x rate)',
        'All Premium benefits included',
        'Personal shopping assistant',
        'Premium-only exclusive events',
        'Anniversary special offers',
        'Dedicated concierge service',
        'First access to new features',
        'VIP customer support',
        'Save up to ₹10000/month'
      ]
    }
  };

  return configs[tier];
};

// Static method to calculate prorated amount
SubscriptionSchema.statics.calculateProratedAmount = function (
  this: ISubscriptionModel,
  currentTier: SubscriptionTier,
  newTier: SubscriptionTier,
  endDate: Date,
  billingCycle: BillingCycle
): number {
  const now = new Date();
  const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const totalDays = billingCycle === 'monthly' ? 30 : 365;

  const currentConfig = this.getTierConfig(currentTier);
  const newConfig = this.getTierConfig(newTier);

  const currentPrice = billingCycle === 'monthly' ? currentConfig.pricing.monthly : currentConfig.pricing.yearly;
  const newPrice = billingCycle === 'monthly' ? newConfig.pricing.monthly : newConfig.pricing.yearly;

  const remainingValue = (currentPrice * remainingDays) / totalDays;
  const newValue = (newPrice * remainingDays) / totalDays;

  return Math.max(0, newValue - remainingValue);
};

// Pre-save hook to set end date if not provided
SubscriptionSchema.pre('save', function (this: ISubscription, next) {
  if (this.isNew && !this.endDate) {
    const start = this.startDate || new Date();
    const end = new Date(start);

    if (this.billingCycle === 'monthly') {
      end.setMonth(end.getMonth() + 1);
    } else {
      end.setFullYear(end.getFullYear() + 1);
    }

    this.endDate = end;
  }

  // Set trial end date for new premium/vip subscriptions
  if (this.isNew && !this.trialEndDate && (this.tier === 'premium' || this.tier === 'vip')) {
    const trialEnd = new Date(this.startDate || Date.now());
    trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial
    this.trialEndDate = trialEnd;
    this.status = 'trial';
  }

  // Set reactivation eligibility when cancelling
  if (this.isModified('status') && this.status === 'cancelled' && !this.reactivationEligibleUntil) {
    const eligibleUntil = new Date();
    eligibleUntil.setDate(eligibleUntil.getDate() + 30); // 30-day reactivation window
    this.reactivationEligibleUntil = eligibleUntil;
  }

  next();
});

export const Subscription = mongoose.model<ISubscription, ISubscriptionModel>('Subscription', SubscriptionSchema);
