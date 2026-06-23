import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';
import { SubscriptionTier, BillingCycle } from './Subscription';
import { pct } from '../utils/currency';

// Discount types
export type DiscountType = 'percentage' | 'fixed';

// Promo code usage tracking
export interface IPromoCodeUsage {
  user: Types.ObjectId;
  usedAt: Date;
  subscriptionId: Types.ObjectId;
  discountApplied: number;
  originalPrice: number;
  finalPrice: number;
}

// Metadata interface
export interface IPromoCodeMetadata {
  campaign?: string;
  source?: string;
  notes?: string;
}

// Main PromoCode interface
export interface IPromoCode extends Document {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  applicableTiers: SubscriptionTier[];
  applicableBillingCycles?: BillingCycle[];
  validFrom: Date;
  validUntil: Date;
  maxUses: number;
  maxUsesPerUser: number;
  usedCount: number;
  usedBy: IPromoCodeUsage[];
  isActive: boolean;
  metadata: IPromoCodeMetadata;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  isValid(): boolean;
  canBeUsedBy(userId: Types.ObjectId | string): Promise<boolean>;
  incrementUsage(userId: Types.ObjectId | string, subscriptionId: Types.ObjectId | string, originalPrice: number, finalPrice: number): Promise<void>;
  calculateDiscount(originalPrice: number): number;
}

// Validation result interface
export interface IPromoCodeValidationResult {
  valid: boolean;
  message: string;
  discount?: number;
  discountedPrice?: number;
  promoCode?: IPromoCode;
}

// PromoCode Model interface with static methods
export interface IPromoCodeModel extends mongoose.Model<IPromoCode> {
  validateCode(
    code: string,
    tier: SubscriptionTier,
    billingCycle: BillingCycle,
    userId: Types.ObjectId | string,
    originalPrice: number
  ): Promise<IPromoCodeValidationResult>;
  getActivePromoCodes(tier?: SubscriptionTier, billingCycle?: BillingCycle): Promise<IPromoCode[]>;
  sanitizeCode(code: string): string;
}

// PromoCode Schema
const PromoCodeSchema = new Schema<IPromoCode, IPromoCodeModel>({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
    match: /^[A-Z0-9]+$/,
    minlength: 3,
    maxlength: 20
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: function(this: IPromoCode, value: number) {
        if (this.discountType === 'percentage') {
          return value > 0 && value <= 100;
        }
        return value > 0;
      },
      message: 'Discount value must be between 1-100 for percentage, or greater than 0 for fixed amount'
    }
  },
  applicableTiers: [{
    type: String,
    enum: ['free', 'premium', 'vip'],
    required: true
  }],
  applicableBillingCycles: [{
    type: String,
    enum: ['monthly', 'yearly']
  }],
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true,
    validate: {
      validator: function(this: IPromoCode, value: Date) {
        return value > this.validFrom;
      },
      message: 'Valid until date must be after valid from date'
    }
  },
  maxUses: {
    type: Number,
    default: 0,
    min: 0
  },
  maxUsesPerUser: {
    type: Number,
    default: 1,
    min: 1
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0
  },
  usedBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true
    },
    discountApplied: {
      type: Number,
      required: true,
      min: 0
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0
    }
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    campaign: {
      type: String,
      trim: true
    },
    source: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
PromoCodeSchema.index({ code: 1, isActive: 1 });
PromoCodeSchema.index({ validFrom: 1, validUntil: 1 });
PromoCodeSchema.index({ 'metadata.campaign': 1 });
PromoCodeSchema.index({ createdAt: -1 });

// Virtual for remaining uses
PromoCodeSchema.virtual('remainingUses').get(function(this: IPromoCode) {
  if (this.maxUses === 0) return Infinity;
  return Math.max(0, this.maxUses - this.usedCount);
});

// Virtual for usage percentage
PromoCodeSchema.virtual('usagePercentage').get(function(this: IPromoCode) {
  if (this.maxUses === 0) return 0;
  return (this.usedCount / this.maxUses) * 100;
});

// Instance method to check if promo code is valid
PromoCodeSchema.methods.isValid = function(this: IPromoCode): boolean {
  const now = new Date();

  // Check if active
  if (!this.isActive) {
    return false;
  }

  // Check date range
  if (now < this.validFrom || now > this.validUntil) {
    return false;
  }

  // Check max uses
  if (this.maxUses > 0 && this.usedCount >= this.maxUses) {
    return false;
  }

  return true;
};

// Instance method to check if user can use this promo code
PromoCodeSchema.methods.canBeUsedBy = async function(
  this: IPromoCode,
  userId: Types.ObjectId | string
): Promise<boolean> {
  // Convert userId to string for comparison
  const userIdStr = userId.toString();

  // Count how many times this user has used this code
  const userUsageCount = this.usedBy.filter(
    usage => usage.user.toString() === userIdStr
  ).length;

  // Check if user has exceeded their limit
  return userUsageCount < this.maxUsesPerUser;
};

// Instance method to increment usage — atomic with maxUses guard
PromoCodeSchema.methods.incrementUsage = async function(
  this: IPromoCode,
  userId: Types.ObjectId | string,
  subscriptionId: Types.ObjectId | string,
  originalPrice: number,
  finalPrice: number
): Promise<void> {
  const discount = originalPrice - finalPrice;

  const result = await (this.constructor as any).findOneAndUpdate(
    {
      _id: this._id,
      $or: [
        { maxUses: 0 },  // 0 = unlimited
        { $expr: { $lt: ['$usedCount', '$maxUses'] } }
      ]
    },
    {
      $inc: { usedCount: 1 },
      $push: {
        usedBy: {
          user: new Types.ObjectId(userId.toString()),
          usedAt: new Date(),
          subscriptionId: new Types.ObjectId(subscriptionId.toString()),
          discountApplied: discount,
          originalPrice,
          finalPrice
        }
      }
    },
    { new: true }
  );

  if (!result) {
    throw new Error('Promo code usage limit exceeded');
  }
};

// Instance method to calculate discount
PromoCodeSchema.methods.calculateDiscount = function(
  this: IPromoCode,
  originalPrice: number
): number {
  if (this.discountType === 'percentage') {
    return pct(originalPrice, this.discountValue);
  } else {
    // Fixed amount
    return Math.min(this.discountValue, originalPrice);
  }
};

// Static method to sanitize promo code
PromoCodeSchema.statics.sanitizeCode = function(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

// Static method to validate promo code
PromoCodeSchema.statics.validateCode = async function(
  this: IPromoCodeModel,
  code: string,
  tier: SubscriptionTier,
  billingCycle: BillingCycle,
  userId: Types.ObjectId | string,
  originalPrice: number
): Promise<IPromoCodeValidationResult> {
  try {
    // Sanitize code
    const sanitizedCode = this.sanitizeCode(code);

    if (!sanitizedCode) {
      return {
        valid: false,
        message: 'Invalid promo code format'
      };
    }

    // Find promo code
    const promoCode = await this.findOne({
      code: sanitizedCode,
      isActive: true
    });

    if (!promoCode) {
      return {
        valid: false,
        message: 'Promo code not found or inactive'
      };
    }

    // Check if valid
    if (!promoCode.isValid()) {
      const now = new Date();
      if (now < promoCode.validFrom) {
        return {
          valid: false,
          message: 'Promo code is not yet active'
        };
      }
      if (now > promoCode.validUntil) {
        return {
          valid: false,
          message: 'Promo code has expired'
        };
      }
      if (promoCode.maxUses > 0 && promoCode.usedCount >= promoCode.maxUses) {
        return {
          valid: false,
          message: 'Promo code has reached maximum usage limit'
        };
      }
      return {
        valid: false,
        message: 'Promo code is not valid'
      };
    }

    // Check tier applicability
    if (!promoCode.applicableTiers.includes(tier)) {
      return {
        valid: false,
        message: `This promo code is not applicable to ${tier} tier`
      };
    }

    // Check billing cycle applicability (if specified)
    if (promoCode.applicableBillingCycles &&
        promoCode.applicableBillingCycles.length > 0 &&
        !promoCode.applicableBillingCycles.includes(billingCycle)) {
      return {
        valid: false,
        message: `This promo code is not applicable to ${billingCycle} billing`
      };
    }

    // Check user-specific usage
    const canUse = await promoCode.canBeUsedBy(userId);
    if (!canUse) {
      return {
        valid: false,
        message: 'You have already used this promo code the maximum number of times'
      };
    }

    // Calculate discount
    const discount = promoCode.calculateDiscount(originalPrice);
    const discountedPrice = Math.max(0, originalPrice - discount);

    return {
      valid: true,
      message: 'Promo code applied successfully',
      discount,
      discountedPrice,
      promoCode
    };
  } catch (error: any) {
    logger.error('Error validating promo code:', error);
    return {
      valid: false,
      message: 'Error validating promo code'
    };
  }
};

// Static method to get active promo codes
PromoCodeSchema.statics.getActivePromoCodes = async function(
  this: IPromoCodeModel,
  tier?: SubscriptionTier,
  billingCycle?: BillingCycle
): Promise<IPromoCode[]> {
  const now = new Date();
  const query: any = {
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now }
  };

  if (tier) {
    query.applicableTiers = tier;
  }

  if (billingCycle) {
    query.$or = [
      { applicableBillingCycles: { $exists: false } },
      { applicableBillingCycles: { $size: 0 } },
      { applicableBillingCycles: billingCycle }
    ];
  }

  const promoCodes = await this.find(query)
    .sort({ discountValue: -1 })
    .limit(20);

  // Filter out codes that have reached max usage
  return promoCodes.filter(code => {
    if (code.maxUses === 0) return true;
    return code.usedCount < code.maxUses;
  });
};

// Pre-save hook to validate data
PromoCodeSchema.pre('save', function(this: IPromoCode, next) {
  // Ensure code is uppercase and sanitized
  if (this.isModified('code')) {
    this.code = this.code.trim().toUpperCase();
  }

  // Ensure usedCount matches usedBy array length
  if (this.isModified('usedBy')) {
    this.usedCount = this.usedBy.length;
  }

  next();
});

export const PromoCode = mongoose.model<IPromoCode, IPromoCodeModel>('PromoCode', PromoCodeSchema);
