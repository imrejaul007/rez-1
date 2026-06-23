import mongoose, { Document, Schema, Model } from 'mongoose';
import crypto from 'crypto';

// Instance methods interface
interface IFlashSalePurchaseMethods {
  isValid(): boolean;
  isExpired(): boolean;
  canRedeem(): boolean;
  markAsRedeemed(storeId?: string, orderId?: string): Promise<void>;
}

// Static methods interface
interface IFlashSalePurchaseModel extends Model<IFlashSalePurchase, {}, IFlashSalePurchaseMethods> {
  getUserPurchases(userId: string): any;
  getUserPurchaseCount(userId: string, flashSaleId: string): Promise<number>;
  generateVoucherCode(): string;
}

// FlashSalePurchase interface
export interface IFlashSalePurchase extends Document, IFlashSalePurchaseMethods {
  // References
  user: mongoose.Types.ObjectId;
  flashSale: mongoose.Types.ObjectId;
  store?: mongoose.Types.ObjectId;

  // Purchase details
  amount: number; // Amount paid (flash sale price)
  originalPrice: number;
  discountPercentage: number;
  quantity: number;

  // Payment details
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: 'razorpay' | 'stripe' | 'wallet';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paidAt?: Date;
  failureReason?: string;

  // Voucher details
  voucherCode: string;
  promoCode?: string; // Original flash sale promo code (if any)
  voucherExpiresAt: Date;

  // Redemption status
  isRedeemed: boolean;
  redeemedAt?: Date;
  redemptionStore?: mongoose.Types.ObjectId;
  redemptionOrderId?: mongoose.Types.ObjectId;

  // Metadata
  purchasedAt: Date;
  ipAddress?: string;
  userAgent?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const FlashSalePurchaseSchema = new Schema(
  {
    // References
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    flashSale: {
      type: Schema.Types.ObjectId,
      ref: 'FlashSale',
      required: true,
      index: true,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
    },

    // Purchase details
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Payment details
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['razorpay', 'stripe', 'wallet'],
      default: 'razorpay',
    },
    razorpayOrderId: {
      type: String,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    paidAt: {
      type: Date,
    },
    failureReason: {
      type: String,
    },

    // Voucher details
    voucherCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    promoCode: {
      type: String,
    },
    voucherExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    // Redemption status
    isRedeemed: {
      type: Boolean,
      default: false,
      index: true,
    },
    redeemedAt: {
      type: Date,
    },
    redemptionStore: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
    },
    redemptionOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },

    // Metadata
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
FlashSalePurchaseSchema.index({ user: 1, flashSale: 1 });
FlashSalePurchaseSchema.index({ paymentStatus: 1, createdAt: -1 });
FlashSalePurchaseSchema.index({ voucherExpiresAt: 1, isRedeemed: 1 });

// Method to check if purchase/voucher is valid
FlashSalePurchaseSchema.methods.isValid = function (): boolean {
  return (
    this.paymentStatus === 'paid' &&
    !this.isRedeemed &&
    new Date() < this.voucherExpiresAt
  );
};

// Method to check if voucher is expired
FlashSalePurchaseSchema.methods.isExpired = function (): boolean {
  return new Date() > this.voucherExpiresAt;
};

// Method to check if voucher can be redeemed
FlashSalePurchaseSchema.methods.canRedeem = function (): boolean {
  return this.isValid();
};

// Method to mark voucher as redeemed
FlashSalePurchaseSchema.methods.markAsRedeemed = async function (
  storeId?: string,
  orderId?: string
): Promise<void> {
  this.isRedeemed = true;
  this.redeemedAt = new Date();
  if (storeId) {
    this.redemptionStore = new mongoose.Types.ObjectId(storeId);
  }
  if (orderId) {
    this.redemptionOrderId = new mongoose.Types.ObjectId(orderId);
  }
  await this.save();
};

// Static method to get user's purchases
FlashSalePurchaseSchema.statics.getUserPurchases = function (userId: string) {
  return this.find({ user: userId, paymentStatus: 'paid' })
    .populate('flashSale', 'title image discountPercentage stores')
    .populate('store', 'name logo')
    .sort({ purchasedAt: -1 });
};

// Static method to get user's purchase count for a specific flash sale
FlashSalePurchaseSchema.statics.getUserPurchaseCount = async function (
  userId: string,
  flashSaleId: string
): Promise<number> {
  return this.countDocuments({
    user: userId,
    flashSale: flashSaleId,
    paymentStatus: { $in: ['pending', 'paid'] },
  });
};

// Static method to generate unique voucher code
FlashSalePurchaseSchema.statics.generateVoucherCode = function (): string {
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FS-${randomPart}`;
};

// Pre-save middleware to generate voucher code if not set
FlashSalePurchaseSchema.pre('save', async function (next) {
  if (this.isNew && !this.voucherCode) {
    // Generate unique voucher code
    const FlashSalePurchaseModel = this.constructor as unknown as IFlashSalePurchaseModel;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const code = FlashSalePurchaseModel.generateVoucherCode();
      const existing = await FlashSalePurchaseModel.findOne({ voucherCode: code });
      if (!existing) {
        this.voucherCode = code;
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      // Fallback: use timestamp-based code
      this.voucherCode = `FS-${Date.now().toString(36).toUpperCase()}`;
    }
  }

  // Set default expiry (30 days from purchase)
  if (this.isNew && !this.voucherExpiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    this.voucherExpiresAt = expiryDate;
  }

  next();
});

const FlashSalePurchase = mongoose.model<IFlashSalePurchase, IFlashSalePurchaseModel>(
  'FlashSalePurchase',
  FlashSalePurchaseSchema
);

export default FlashSalePurchase;
