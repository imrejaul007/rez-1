import { logger } from '../config/logger';
// Coupon Model
// Manages store-wide coupon codes and promotions

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICouponApplicableTo {
  categories: Types.ObjectId[];
  products: Types.ObjectId[];
  stores: Types.ObjectId[];
  userTiers: string[]; // 'gold', 'silver', 'bronze', 'all'
}

export interface ICouponUsageLimit {
  totalUsage: number;      // Total times coupon can be used across all users
  perUser: number;         // Max times a single user can use
  usedCount: number;       // Current usage count
}

export interface ICoupon extends Document {
  couponCode: string;
  title: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;   // Percentage (e.g., 10 for 10%) or fixed amount (e.g., 50 for ₹50)
  minOrderValue: number;   // Minimum order amount to apply coupon
  maxDiscountCap: number;  // Maximum discount amount (for percentage coupons)
  validFrom: Date;
  validTo: Date;
  usageLimit: ICouponUsageLimit;
  applicableTo: ICouponApplicableTo;
  autoApply: boolean;      // Auto-apply if eligible
  autoApplyPriority: number; // Higher priority gets applied first
  status: 'active' | 'inactive' | 'expired';
  termsAndConditions: string[];
  createdBy: Types.ObjectId; // Admin/Merchant who created
  tags: string[];          // For categorization and search
  imageUrl?: string;       // Coupon banner image
  isNewlyAdded: boolean;   // Show "NEW" badge
  isFeatured: boolean;     // Featured on coupon page
  viewCount: number;       // Analytics
  claimCount: number;      // How many users claimed
  usageCount: number;      // How many times used
  metadata?: {             // Metadata for spin wheel coupons
    source?: string;       // 'spin_wheel', 'scratch_card', etc.
    isProductSpecific?: boolean;
    storeName?: string;
    storeId?: string;
    productName?: string | null;
    productId?: string | null;
    productImage?: string | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    couponCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountCap: {
      type: Number,
      default: 0,
      min: 0,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validTo: {
      type: Date,
      required: true,
      index: true,
    },
    usageLimit: {
      totalUsage: {
        type: Number,
        default: 0, // 0 means unlimited
      },
      perUser: {
        type: Number,
        default: 1,
      },
      usedCount: {
        type: Number,
        default: 0,
      },
    },
    applicableTo: {
      categories: [{
        type: Schema.Types.ObjectId,
        ref: 'Category',
      }],
      products: [{
        type: Schema.Types.ObjectId,
        ref: 'Product',
      }],
      stores: [{
        type: Schema.Types.ObjectId,
        ref: 'Store',
      }],
      userTiers: [{
        type: String,
        enum: ['all', 'gold', 'silver', 'bronze'],
      }],
    },
    autoApply: {
      type: Boolean,
      default: false,
    },
    autoApplyPriority: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired'],
      default: 'active',
      index: true,
    },
    termsAndConditions: [{
      type: String,
    }],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [{
      type: String,
      lowercase: true,
    }],
    imageUrl: {
      type: String,
    },
    isNewlyAdded: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    claimCount: {
      type: Number,
      default: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
CouponSchema.index({ status: 1, validTo: 1 });
CouponSchema.index({ couponCode: 1, status: 1 });
CouponSchema.index({ isFeatured: 1, status: 1 });
CouponSchema.index({ tags: 1, status: 1 });

// Virtual for checking if coupon is currently valid
CouponSchema.virtual('isValid').get(function(this: ICoupon) {
  const now = new Date();
  return (
    this.status === 'active' &&
    this.validFrom <= now &&
    this.validTo >= now &&
    (this.usageLimit.totalUsage === 0 || this.usageLimit.usedCount < this.usageLimit.totalUsage)
  );
});

// Virtual for days until expiry
CouponSchema.virtual('daysUntilExpiry').get(function(this: ICoupon) {
  const now = new Date();
  const diff = this.validTo.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Instance method to check if coupon has expired
CouponSchema.methods.checkExpiry = function(): boolean {
  const now = new Date();
  if (this.validTo < now && this.status !== 'expired') {
    this.status = 'expired';
    this.save();
    return true;
  }
  return false;
};

// Instance method to increment view count — uses atomic $inc to avoid race conditions
CouponSchema.methods.incrementViewCount = async function() {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { viewCount: 1 }
  });
};

// Instance method to increment claim count — uses atomic $inc to avoid race conditions
CouponSchema.methods.incrementClaimCount = async function() {
  await (this.constructor as any).findByIdAndUpdate(this._id, {
    $inc: { claimCount: 1 }
  });
};

// Instance method to increment usage count — uses atomic $inc to avoid race conditions
CouponSchema.methods.incrementUsageCount = async function() {
  const result = await (this.constructor as any).findByIdAndUpdate(
    this._id,
    { $inc: { usageCount: 1, 'usageLimit.usedCount': 1 } },
    { new: true }
  );

  // Check if usage limit reached and deactivate atomically
  if (result && result.usageLimit.totalUsage > 0 && result.usageLimit.usedCount >= result.usageLimit.totalUsage) {
    await (this.constructor as any).findByIdAndUpdate(this._id, {
      $set: { status: 'inactive' }
    });
  }
};

// Static method to mark expired coupons
CouponSchema.statics.markExpiredCoupons = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      status: 'active',
      validTo: { $lt: now },
    },
    {
      $set: { status: 'expired' },
    }
  );

  logger.info(`⏰ [COUPON] Marked ${result.modifiedCount} coupons as expired`);
  return result.modifiedCount || 0;
};

// Static method to get active coupons
CouponSchema.statics.getActiveCoupons = async function(filters: any = {}) {
  const now = new Date();
  return this.find({
    status: 'active',
    validFrom: { $lte: now },
    validTo: { $gte: now },
    ...filters,
  }).sort({ isFeatured: -1, autoApplyPriority: -1, createdAt: -1 });
};

// Pre-save hook to validate dates
CouponSchema.pre('save', function(next) {
  if (this.validFrom >= this.validTo) {
    next(new Error('Valid from date must be before valid to date'));
  }

  if (this.discountType === 'PERCENTAGE' && this.discountValue > 100) {
    next(new Error('Percentage discount cannot exceed 100%'));
  }

  next();
});

export const Coupon = mongoose.model<ICoupon>('Coupon', CouponSchema);
