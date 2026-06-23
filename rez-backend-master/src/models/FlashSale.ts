import mongoose, { Document, Schema, Model } from 'mongoose';

// Instance methods interface
interface IFlashSaleMethods {
  isActive(): boolean;
  isExpiring(minutes: number): boolean;
  getRemainingTime(): number;
  hasStock(): boolean;
  canPurchase(quantity: number): boolean;
  getAvailableQuantity(): number;
  getProgress(): number;
}

// Static methods interface
interface IFlashSaleModel extends Model<IFlashSale, {}, IFlashSaleMethods> {
  getActive(): any;
  getUpcoming(): any;
  getExpiringSoon(minutes: number): any;
  getLowStock(threshold: number): any;
}

// FlashSale interface
export interface IFlashSale extends Document, IFlashSaleMethods {
  // Basic info
  title: string;
  description: string;
  image: string;
  banner?: string; // Banner image for homepage

  // Sale details
  discountPercentage: number; // Discount percentage (e.g., 50 for 50% off)
  discountAmount?: number; // Fixed discount amount (alternative to percentage)
  priority: number; // Higher priority shows first (1-10, 10 highest)

  // Time constraints
  startTime: Date;
  endTime: Date;
  duration?: number; // Duration in milliseconds (calculated)

  // Stock management
  maxQuantity: number; // Total items available for this flash sale
  soldQuantity: number; // Items sold so far
  limitPerUser: number; // Max quantity per user
  lowStockThreshold: number; // Percentage at which to trigger low stock alert (default 20%)

  // Applicable products/stores
  products: mongoose.Types.ObjectId[]; // Array of product IDs
  stores?: mongoose.Types.ObjectId[]; // Optional: specific stores
  category?: mongoose.Types.ObjectId; // Optional: category restriction

  // Pricing (can override product prices)
  originalPrice?: number; // Original price before discount
  flashSalePrice?: number; // Special flash sale price

  // Status
  enabled: boolean; // Whether the flash sale is enabled (renamed from isActive to avoid conflict with method)
  status: 'scheduled' | 'active' | 'ending_soon' | 'ended' | 'sold_out';

  // Terms & Conditions
  termsAndConditions: string[];
  minimumPurchase?: number;
  maximumDiscount?: number;
  promoCode?: string; // Promo code for this flash sale

  // Analytics
  viewCount: number;
  clickCount: number;
  purchaseCount: number;
  uniqueCustomers: number; // Number of unique users who purchased

  // Notifications
  notifyOnStart: boolean; // Send notification when sale starts
  notifyOnEndingSoon: boolean; // Send notification when 5 min remaining
  notifyOnLowStock: boolean; // Send notification when stock is low
  notifiedUsers: mongoose.Types.ObjectId[]; // Users who were notified

  // Metadata
  createdBy: mongoose.Types.ObjectId; // Admin or Merchant
  createdAt: Date;
  updatedAt: Date;
}

const FlashSaleSchema = new Schema(
  {
    // Basic info
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    image: {
      type: String,
      required: true,
    },
    banner: {
      type: String,
    },

    // Sale details
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      min: 0,
    },
    priority: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },

    // Time constraints
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
    duration: {
      type: Number, // milliseconds
    },

    // Stock management
    maxQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    limitPerUser: {
      type: Number,
      default: 1,
      min: 1,
    },
    lowStockThreshold: {
      type: Number,
      default: 20, // 20%
      min: 0,
      max: 100,
    },

    // Applicable products/stores
    products: [{
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    }],
    stores: [{
      type: Schema.Types.ObjectId,
      ref: 'Store',
    }],
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },

    // Pricing
    originalPrice: {
      type: Number,
      min: 0,
    },
    flashSalePrice: {
      type: Number,
      min: 0,
    },

    // Status
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ending_soon', 'ended', 'sold_out'],
      default: 'scheduled',
      index: true,
    },

    // Terms & Conditions
    termsAndConditions: [{
      type: String,
      trim: true,
    }],
    minimumPurchase: {
      type: Number,
      min: 0,
    },
    maximumDiscount: {
      type: Number,
      min: 0,
    },
    promoCode: {
      type: String,
      trim: true,
      maxlength: 50,
    },

    // Analytics
    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    clickCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchaseCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueCustomers: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Notifications
    notifyOnStart: {
      type: Boolean,
      default: true,
    },
    notifyOnEndingSoon: {
      type: Boolean,
      default: true,
    },
    notifyOnLowStock: {
      type: Boolean,
      default: true,
    },
    notifiedUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
FlashSaleSchema.index({ startTime: 1, endTime: 1 });
FlashSaleSchema.index({ status: 1, isActive: 1 });
FlashSaleSchema.index({ priority: -1 });
FlashSaleSchema.index({ products: 1 });
FlashSaleSchema.index({ category: 1 });

// Pre-save middleware to calculate duration and update status
FlashSaleSchema.pre('save', function (next) {
  // Calculate duration
  if (this.startTime && this.endTime) {
    this.duration = this.endTime.getTime() - this.startTime.getTime();
  }

  // Auto-update status based on time and stock
  const now = new Date();

  if (this.soldQuantity >= this.maxQuantity) {
    this.status = 'sold_out';
  } else if (now < this.startTime) {
    this.status = 'scheduled';
  } else if (now > this.endTime) {
    this.status = 'ended';
  } else if (this.endTime.getTime() - now.getTime() <= 5 * 60 * 1000) {
    // 5 minutes remaining
    this.status = 'ending_soon';
  } else {
    this.status = 'active';
  }

  next();
});

// Method to check if flash sale is currently active
FlashSaleSchema.methods.isActive = function (): boolean {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.startTime &&
    now <= this.endTime &&
    this.soldQuantity < this.maxQuantity &&
    this.status !== 'ended' &&
    this.status !== 'sold_out'
  );
};

// Method to check if flash sale is expiring soon
FlashSaleSchema.methods.isExpiring = function (minutes: number = 5): boolean {
  if (!this.isActive()) return false;
  const now = new Date();
  const remainingTime = this.endTime.getTime() - now.getTime();
  return remainingTime <= minutes * 60 * 1000;
};

// Method to get remaining time in milliseconds
FlashSaleSchema.methods.getRemainingTime = function (): number {
  const now = new Date();
  if (now < this.startTime) {
    return this.startTime.getTime() - now.getTime();
  }
  if (now > this.endTime) {
    return 0;
  }
  return this.endTime.getTime() - now.getTime();
};

// Method to check if flash sale has stock
FlashSaleSchema.methods.hasStock = function (): boolean {
  return this.soldQuantity < this.maxQuantity;
};

// Method to check if purchase is allowed
FlashSaleSchema.methods.canPurchase = function (quantity: number): boolean {
  return (
    this.isActive() &&
    this.hasStock() &&
    this.soldQuantity + quantity <= this.maxQuantity &&
    quantity <= this.limitPerUser
  );
};

// Method to get available quantity
FlashSaleSchema.methods.getAvailableQuantity = function (): number {
  return Math.max(0, this.maxQuantity - this.soldQuantity);
};

// Method to get progress percentage (0-100)
FlashSaleSchema.methods.getProgress = function (): number {
  if (this.maxQuantity === 0) return 100;
  return Math.min(100, (this.soldQuantity / this.maxQuantity) * 100);
};

// Static method to get active flash sales
FlashSaleSchema.statics.getActive = function () {
  const now = new Date();
  return this.find({
    enabled: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
    $expr: { $lt: ['$soldQuantity', '$maxQuantity'] },
    status: { $nin: ['ended', 'sold_out'] },
  }).sort({ priority: -1, startTime: 1 });
};

// Static method to get upcoming flash sales
FlashSaleSchema.statics.getUpcoming = function () {
  const now = new Date();
  return this.find({
    enabled: true,
    startTime: { $gt: now },
    status: 'scheduled',
  }).sort({ startTime: 1 });
};

// Static method to get flash sales expiring soon
FlashSaleSchema.statics.getExpiringSoon = function (minutes: number = 5) {
  const now = new Date();
  const expiryTime = new Date(now.getTime() + minutes * 60 * 1000);
  return this.find({
    enabled: true,
    startTime: { $lte: now },
    endTime: { $gte: now, $lte: expiryTime },
    $expr: { $lt: ['$soldQuantity', '$maxQuantity'] },
    status: { $nin: ['ended', 'sold_out'] },
  }).sort({ endTime: 1 });
};

// Static method to get flash sales with low stock
FlashSaleSchema.statics.getLowStock = function (threshold: number = 20) {
  const now = new Date();
  return this.find({
    enabled: true,
    startTime: { $lte: now },
    endTime: { $gte: now },
    status: { $nin: ['ended', 'sold_out'] },
    $expr: {
      $gte: [
        { $divide: ['$soldQuantity', '$maxQuantity'] },
        { $divide: [threshold, 100] },
      ],
    },
  }).sort({ priority: -1 });
};

const FlashSale = mongoose.model<IFlashSale, IFlashSaleModel>('FlashSale', FlashSaleSchema);

export default FlashSale;
