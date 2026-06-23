// StoreVoucher Model - Store visit vouchers (different from gift card vouchers)
// For Section6 of ProductPage - "10 Vouchers for store visit"

import mongoose, { Document, Schema, Types, Model } from 'mongoose';
import crypto from 'crypto';

export interface IStoreVoucher extends Document {
  _id: Types.ObjectId;
  code: string;
  store: Types.ObjectId;
  name: string;
  description?: string;
  type: 'store_visit' | 'first_purchase' | 'referral' | 'promotional';
  discountType: 'percentage' | 'fixed';
  discountValue: number; // Percentage (20 for 20%) or fixed amount
  minBillAmount: number;
  maxDiscountAmount?: number;
  validFrom: Date;
  validUntil: Date;
  restrictions: {
    isOfflineOnly: boolean;
    notValidAboveStoreDiscount: boolean;
    singleVoucherPerBill: boolean;
    minItemCount?: number;
    maxItemCount?: number;
    excludedProducts?: Types.ObjectId[];
  };
  usageLimit: number; // Total number of vouchers available
  usedCount: number;
  usageLimitPerUser?: number; // Max uses per user
  isActive: boolean;
  metadata: {
    displayText?: string; // "Save 20%"
    badgeText?: string; // "Offline Only"
    backgroundColor?: string;
  };
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  calculateDiscount(billAmount: number): number;
  canUserRedeem(userId: Types.ObjectId): Promise<{ can: boolean; reason?: string }>;
}

// Interface for static methods
export interface IStoreVoucherModel extends Model<IStoreVoucher> {
  generateUniqueCode(prefix?: string): Promise<string>;
  findAvailableForStore(storeId: Types.ObjectId, userId?: Types.ObjectId): Promise<IStoreVoucher[]>;
}

const StoreVoucherSchema = new Schema<IStoreVoucher>({
  code: {
    type: String,
    required: [true, 'Voucher code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, 'Store reference is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Voucher name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['store_visit', 'first_purchase', 'referral', 'promotional'],
    required: [true, 'Voucher type is required'],
    default: 'store_visit'
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  minBillAmount: {
    type: Number,
    required: [true, 'Minimum bill amount is required'],
    min: [0, 'Minimum bill amount cannot be negative'],
    default: 0
  },
  maxDiscountAmount: {
    type: Number,
    min: [0, 'Maximum discount amount cannot be negative']
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required'],
    index: true
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required'],
    index: true
  },
  restrictions: {
    isOfflineOnly: {
      type: Boolean,
      default: true
    },
    notValidAboveStoreDiscount: {
      type: Boolean,
      default: false
    },
    singleVoucherPerBill: {
      type: Boolean,
      default: true
    },
    minItemCount: {
      type: Number,
      min: [0, 'Minimum item count cannot be negative']
    },
    maxItemCount: {
      type: Number,
      min: [0, 'Maximum item count cannot be negative']
    },
    excludedProducts: [{
      type: Schema.Types.ObjectId,
      ref: 'Product'
    }]
  },
  usageLimit: {
    type: Number,
    required: [true, 'Usage limit is required'],
    min: [1, 'Usage limit must be at least 1'],
    default: 10
  },
  usedCount: {
    type: Number,
    default: 0,
    min: [0, 'Used count cannot be negative']
  },
  usageLimitPerUser: {
    type: Number,
    min: [0, 'Usage limit per user cannot be negative'],
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  metadata: {
    displayText: {
      type: String,
      trim: true
    },
    badgeText: {
      type: String,
      trim: true
    },
    backgroundColor: {
      type: String,
      trim: true
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by is required']
  }
}, {
  timestamps: true
});

// Indexes for performance
StoreVoucherSchema.index({ store: 1, isActive: 1 });
StoreVoucherSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
StoreVoucherSchema.index({ code: 1, store: 1 });

// Virtual for checking if voucher is currently valid
StoreVoucherSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return this.isActive &&
         this.validFrom <= now &&
         this.validUntil >= now &&
         this.usedCount < this.usageLimit;
});

// Method to generate unique voucher code
StoreVoucherSchema.statics.generateUniqueCode = async function(prefix: string = 'STORE'): Promise<string> {
  let code: string;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    code = `${prefix}${randomPart}`;

    // Check if code already exists
    const existing = await this.findOne({ code });
    if (!existing) {
      return code;
    }

    attempts++;
  }

  // Fallback with timestamp
  const timestamp = Date.now().toString(36).toUpperCase();
  return `${prefix}${timestamp}`;
};

// Method to calculate discount amount
StoreVoucherSchema.methods.calculateDiscount = function(billAmount: number): number {
  if (billAmount < this.minBillAmount) {
    return 0;
  }

  let discountAmount: number;

  if (this.discountType === 'percentage') {
    discountAmount = (billAmount * this.discountValue) / 100;
  } else {
    discountAmount = this.discountValue;
  }

  // Apply max discount limit if set
  if (this.maxDiscountAmount && discountAmount > this.maxDiscountAmount) {
    discountAmount = this.maxDiscountAmount;
  }

  return Math.round(discountAmount);
};

// Method to check if user can redeem voucher
StoreVoucherSchema.methods.canUserRedeem = async function(userId: Types.ObjectId): Promise<{ can: boolean; reason?: string }> {
  // Check if voucher is valid
  const now = new Date();
  if (!this.isActive) {
    return { can: false, reason: 'Voucher is not active' };
  }

  if (this.validFrom > now) {
    return { can: false, reason: 'Voucher is not yet valid' };
  }

  if (this.validUntil < now) {
    return { can: false, reason: 'Voucher has expired' };
  }

  if (this.usedCount >= this.usageLimit) {
    return { can: false, reason: 'Voucher usage limit reached' };
  }

  // Check user-specific usage limit
  if (this.usageLimitPerUser) {
    const UserStoreVoucher = mongoose.model('UserStoreVoucher');
    const userUsageCount = await UserStoreVoucher.countDocuments({
      voucher: this._id,
      user: userId,
      status: 'used'
    });

    if (userUsageCount >= this.usageLimitPerUser) {
      return {
        can: false,
        reason: `You can only use this voucher ${this.usageLimitPerUser} time(s)`
      };
    }
  }

  return { can: true };
};

// Static method to find available vouchers for store
StoreVoucherSchema.statics.findAvailableForStore = async function(
  storeId: Types.ObjectId,
  userId?: Types.ObjectId
) {
  const now = new Date();

  const query: any = {
    store: storeId,
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    $expr: { $lt: ['$usedCount', '$usageLimit'] }
  };

  const vouchers = await this.find(query).sort({ discountValue: -1 });

  // Filter by user-specific rules if userId provided
  if (userId) {
    const availableVouchers = [];
    for (const voucher of vouchers) {
      const canRedeem = await voucher.canUserRedeem(userId);
      if (canRedeem.can) {
        availableVouchers.push(voucher);
      }
    }
    return availableVouchers;
  }

  return vouchers;
};

const StoreVoucher = mongoose.model<IStoreVoucher, IStoreVoucherModel>('StoreVoucher', StoreVoucherSchema);
export default StoreVoucher;
