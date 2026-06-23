// Discount Model
// Manages instant discounts, bill payment discounts, and promotional offers

import mongoose, { Document, Schema, Types, Model } from 'mongoose';
import { pct, roundInt } from '../utils/currency';

export interface IDiscount extends Document {
  _id: Types.ObjectId;
  code?: string; // Optional discount code
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  value: number; // Percentage (10 for 10%) or fixed amount
  minOrderValue: number;
  maxDiscountAmount?: number;
  applicableOn: 'bill_payment' | 'card_payment' | 'all' | 'specific_products' | 'specific_categories';
  applicableProducts?: Types.ObjectId[];
  applicableCategories?: Types.ObjectId[];
  validFrom: Date;
  validUntil: Date;
  usageLimit?: number; // Max total uses
  usageLimitPerUser?: number; // Max uses per user
  usedCount: number;
  isActive: boolean;
  priority: number; // For stacking order
  restrictions: {
    minItemCount?: number;
    maxItemCount?: number;
    newUsersOnly?: boolean;
    excludedProducts?: Types.ObjectId[];
    excludedCategories?: Types.ObjectId[];
    isOfflineOnly?: boolean;
    notValidAboveStoreDiscount?: boolean;
    singleVoucherPerBill?: boolean;
  };
  metadata: {
    displayText?: string; // "10% Off on bill payment"
    icon?: string;
    backgroundColor?: string;
    cardImageUrl?: string; // Card brand image URL
    bankLogoUrl?: string; // Bank logo URL
    offerBadge?: string; // "10% OFF", "FLAT ₹500"
  };
  // Card Offer Specific Fields
  paymentMethod?: 'upi' | 'card' | 'all'; // Payment method type
  cardType?: 'credit' | 'debit' | 'all'; // Card type for card offers
  bankNames?: string[]; // Specific banks (e.g., ['HDFC', 'ICICI', 'SBI'])
  cardBins?: string[]; // First 6 digits of card for validation
  // Merchant-Store Linking (Phase 1)
  merchantId?: Types.ObjectId; // Optional - for merchant-specific discounts
  storeId?: Types.ObjectId; // Optional - for store-specific discounts
  scope: 'global' | 'merchant' | 'store'; // Discount scope
  createdBy: Types.ObjectId; // Can be User or Merchant
  createdByType: 'user' | 'merchant'; // Track creator type
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  calculateDiscount(orderValue: number): number;
  canUserUse(userId: Types.ObjectId): Promise<{ can: boolean; reason?: string }>;
}

// Interface for static methods
export interface IDiscountModel extends Model<IDiscount> {
  findAvailableForUser(
    userId: Types.ObjectId,
    orderValue: number,
    productIds?: Types.ObjectId[],
    categoryIds?: Types.ObjectId[]
  ): Promise<IDiscount[]>;
}

const DiscountSchema = new Schema<IDiscount>({
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    uppercase: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Discount name is required'],
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required'],
    default: 'percentage'
  },
  value: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  minOrderValue: {
    type: Number,
    required: [true, 'Minimum order value is required'],
    min: [0, 'Minimum order value cannot be negative'],
    default: 0
  },
  maxDiscountAmount: {
    type: Number,
    min: [0, 'Maximum discount amount cannot be negative']
  },
  applicableOn: {
    type: String,
    enum: ['bill_payment', 'card_payment', 'all', 'specific_products', 'specific_categories'],
    required: [true, 'Applicable scope is required'],
    default: 'all'
  },
  applicableProducts: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'
  }],
  applicableCategories: [{
    type: Schema.Types.ObjectId,
    ref: 'Category'
  }],
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
  usageLimit: {
    type: Number,
    min: [0, 'Usage limit cannot be negative']
  },
  usageLimitPerUser: {
    type: Number,
    min: [0, 'Usage limit per user cannot be negative'],
    default: 1
  },
  usedCount: {
    type: Number,
    default: 0,
    min: [0, 'Used count cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  priority: {
    type: Number,
    default: 0,
    index: true
  },
  restrictions: {
    minItemCount: {
      type: Number,
      min: [0, 'Minimum item count cannot be negative']
    },
    maxItemCount: {
      type: Number,
      min: [0, 'Maximum item count cannot be negative']
    },
    newUsersOnly: {
      type: Boolean,
      default: false
    },
    excludedProducts: [{
      type: Schema.Types.ObjectId,
      ref: 'Product'
    }],
    excludedCategories: [{
      type: Schema.Types.ObjectId,
      ref: 'Category'
    }],
    isOfflineOnly: {
      type: Boolean,
      default: false
    },
    notValidAboveStoreDiscount: {
      type: Boolean,
      default: false
    },
    singleVoucherPerBill: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    displayText: {
      type: String,
      trim: true
    },
    icon: {
      type: String,
      trim: true
    },
    backgroundColor: {
      type: String,
      trim: true
    },
    cardImageUrl: {
      type: String,
      trim: true
    },
    bankLogoUrl: {
      type: String,
      trim: true
    },
    offerBadge: {
      type: String,
      trim: true
    }
  },
  // Card Offer Specific Fields
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'all'],
    default: 'all',
    index: true
  },
  cardType: {
    type: String,
    enum: ['credit', 'debit', 'all'],
    default: 'all'
  },
  bankNames: [{
    type: String,
    trim: true
  }],
  cardBins: [{
    type: String,
    trim: true,
    match: [/^\d{6}$/, 'Card BIN must be 6 digits']
  }],
  // Merchant-Store Linking (Phase 1)
  merchantId: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant',
    index: true,
    sparse: true
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    index: true,
    sparse: true
  },
  scope: {
    type: String,
    enum: ['global', 'merchant', 'store'],
    default: 'global',
    required: true,
    index: true
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    required: [true, 'Created by is required']
    // Note: Can reference either 'User' or 'Merchant' based on createdByType
    // Index is defined separately below to avoid duplicate
  },
  createdByType: {
    type: String,
    enum: ['user', 'merchant'],
    default: 'user',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance
DiscountSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
DiscountSchema.index({ applicableOn: 1, isActive: 1 });
DiscountSchema.index({ createdBy: 1 });

// Merchant-Store Linking Indexes (Phase 1)
// Compound indexes for efficient queries
DiscountSchema.index({ scope: 1, storeId: 1, isActive: 1 });
DiscountSchema.index({ scope: 1, merchantId: 1, isActive: 1 });
DiscountSchema.index({ applicableOn: 1, scope: 1, storeId: 1 });
DiscountSchema.index({ merchantId: 1, isActive: 1 });
DiscountSchema.index({ storeId: 1, isActive: 1 });

// Virtual for checking if discount is currently valid
DiscountSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return this.isActive &&
         this.validFrom <= now &&
         this.validUntil >= now &&
         (this.usageLimit === undefined || this.usedCount < this.usageLimit);
});

// Method to calculate discount amount
DiscountSchema.methods.calculateDiscount = function(orderValue: number): number {
  if (orderValue < this.minOrderValue) {
    return 0;
  }

  let discountAmount: number;

  if (this.type === 'percentage') {
    discountAmount = pct(orderValue, this.value);
  } else {
    discountAmount = this.value;
  }

  // Apply max discount limit if set
  if (this.maxDiscountAmount && discountAmount > this.maxDiscountAmount) {
    discountAmount = this.maxDiscountAmount;
  }

  return roundInt(discountAmount);
};

// Method to check if user can use discount
DiscountSchema.methods.canUserUse = async function(userId: Types.ObjectId): Promise<{ can: boolean; reason?: string }> {
  // Check if usage limit per user is reached
  if (this.usageLimitPerUser) {
    const DiscountUsage = mongoose.model('DiscountUsage');
    const userUsageCount = await DiscountUsage.countDocuments({
      discount: this._id,
      user: userId
    });

    if (userUsageCount >= this.usageLimitPerUser) {
      return {
        can: false,
        reason: `This discount can only be used ${this.usageLimitPerUser} time(s) per user`
      };
    }
  }

  // Check if new users only
  if (this.restrictions.newUsersOnly) {
    const Order = mongoose.model('Order');
    const userOrderCount = await Order.countDocuments({ user: userId });

    if (userOrderCount > 0) {
      return {
        can: false,
        reason: 'This discount is only for new users'
      };
    }
  }

  return { can: true };
};

// Static method to find available discounts for a user
DiscountSchema.statics.findAvailableForUser = async function(
  userId: Types.ObjectId,
  orderValue: number,
  productIds?: Types.ObjectId[],
  categoryIds?: Types.ObjectId[]
) {
  const now = new Date();

  // Base query
  const query: any = {
    isActive: true,
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    minOrderValue: { $lte: orderValue },
    $or: [
      { usageLimit: { $exists: false } },
      { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
    ]
  };

  // Filter by applicable scope
  if (productIds && productIds.length > 0) {
    query.$or = [
      { applicableOn: 'all' },
      { applicableOn: 'specific_products', applicableProducts: { $in: productIds } }
    ];
  }

  if (categoryIds && categoryIds.length > 0) {
    if (!query.$or) query.$or = [];
    query.$or.push({ applicableOn: 'specific_categories', applicableCategories: { $in: categoryIds } });
  }

  const discounts = await this.find(query).sort({ priority: -1, value: -1 });

  // Filter by user-specific rules
  const availableDiscounts = [];
  for (const discount of discounts) {
    const canUse = await discount.canUserUse(userId);
    if (canUse.can) {
      availableDiscounts.push(discount);
    }
  }

  return availableDiscounts;
};

const Discount = mongoose.model<IDiscount, IDiscountModel>('Discount', DiscountSchema);
export default Discount;
