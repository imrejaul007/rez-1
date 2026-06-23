import { logger } from '../config/logger';
import mongoose, { Document, Schema, Model } from 'mongoose';

// Instance methods interface
interface IOfferRedemptionMethods {
  isValid(): boolean;
  markAsUsed(orderId?: string, amount?: number, storeId?: string): Promise<any>;
  cancel(reason?: string): Promise<any>;
  verify(verifiedByUserId: string): Promise<any>;
}

// Static methods interface
interface IOfferRedemptionModel extends Model<IOfferRedemption, {}, IOfferRedemptionMethods> {
  updateExpired(): Promise<any>;
  getUserRedemptions(userId: string, status?: string, limit?: number): any;
  countUserOfferRedemptions(userId: string, offerId: string): Promise<number>;
  canUserRedeem(userId: string, offerId: string, userLimit: number): Promise<boolean>;
}

// OfferRedemption - Tracks when users redeem offers
export interface IOfferRedemption extends Document, IOfferRedemptionMethods {
  // User & Offer
  user: mongoose.Types.ObjectId;
  offer: mongoose.Types.ObjectId;

  // Redemption details
  redemptionCode: string; // Unique code for this redemption
  redemptionType: 'online' | 'instore'; // How it was redeemed

  // Dates
  redemptionDate: Date;
  expiryDate: Date;
  validityDays: number; // Days from redemption

  // Status
  status: 'pending' | 'active' | 'used' | 'expired' | 'cancelled';
  usedDate?: Date;

  // Usage details
  order?: mongoose.Types.ObjectId; // If used in an order
  usedAtStore?: mongoose.Types.ObjectId; // If used at physical store
  usedAmount?: number; // Amount saved/discount applied

  // QR Code for in-store verification
  qrCode?: string;
  qrCodeUrl?: string; // URL to QR code image

  // Verification (for in-store redemption)
  verificationCode?: string; // Simple 6-digit code
  verifiedBy?: mongoose.Types.ObjectId; // Store staff who verified
  verifiedAt?: Date;

  // Metadata
  ipAddress?: string;
  userAgent?: string;
  location?: {
    type: string;
    coordinates: [number, number];
  };

  // Cancellation
  cancelledAt?: Date;
  cancellationReason?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const OfferRedemptionSchema = new Schema<IOfferRedemption>(
  {
    // User & Offer
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    offer: {
      type: Schema.Types.ObjectId,
      ref: 'Offer',
      required: true,
      index: true,
    },

    // Redemption details
    redemptionCode: {
      type: String,
      unique: true,
      uppercase: true,
      index: true,
      sparse: true, // Allow null initially, will be generated in pre-save
    },
    redemptionType: {
      type: String,
      enum: ['online', 'instore'],
      required: true,
    },

    // Dates
    redemptionDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    expiryDate: {
      type: Date,
      index: true,
      // Will be calculated in pre-save hook if not provided
    },
    validityDays: {
      type: Number,
      default: 30, // 30 days default validity after redemption
    },

    // Status
    status: {
      type: String,
      enum: ['pending', 'active', 'used', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    usedDate: {
      type: Date,
      index: true,
    },

    // Usage details
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    usedAtStore: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
    },
    usedAmount: {
      type: Number,
      min: 0,
    },

    // QR Code
    qrCode: {
      type: String,
    },
    qrCodeUrl: {
      type: String,
    },

    // Verification
    verificationCode: {
      type: String,
      length: 6,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Store staff
    },
    verifiedAt: {
      type: Date,
    },

    // Metadata
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },

    // Cancellation
    cancelledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
OfferRedemptionSchema.index({ user: 1, offer: 1 });
OfferRedemptionSchema.index({ user: 1, status: 1 });
OfferRedemptionSchema.index({ offer: 1, status: 1 });
OfferRedemptionSchema.index({ redemptionDate: 1, status: 1 });
OfferRedemptionSchema.index({ expiryDate: 1, status: 1 });

// Pre-save middleware to generate codes
OfferRedemptionSchema.pre('save', function (next) {
  // Generate redemption code if not provided
  if (!this.redemptionCode) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.redemptionCode = `RED-${timestamp}-${random}`;
  }

  // Generate verification code (6 digits)
  if (!this.verificationCode && this.redemptionType === 'instore') {
    this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Set expiry date if not set
  if (!this.expiryDate && this.validityDays) {
    const expiry = new Date(this.redemptionDate);
    expiry.setDate(expiry.getDate() + this.validityDays);
    this.expiryDate = expiry;
  }

  next();
});

// Method to check if redemption is valid
OfferRedemptionSchema.methods.isValid = function (): boolean {
  const now = new Date();
  return (
    (this.status === 'pending' || this.status === 'active') &&
    now <= this.expiryDate
  );
};

// Method to mark as used with idempotency check
OfferRedemptionSchema.methods.markAsUsed = async function (
  orderId?: string,
  amount?: number,
  storeId?: string
) {
  // Idempotency check - if already used, return without error
  if (this.status === 'used') {
    logger.info(`⚠️ [OFFER REDEMPTION] Redemption ${this.redemptionCode} already marked as used, skipping`);
    return this;
  }

  // Only allow marking 'active' redemptions as used
  if (this.status !== 'active') {
    throw new Error(`Cannot mark redemption as used: current status is ${this.status}`);
  }

  this.status = 'used';
  this.usedDate = new Date();

  if (orderId) {
    this.order = orderId;
  }

  if (amount) {
    this.usedAmount = amount;
  }

  if (storeId) {
    this.usedAtStore = storeId;
  }

  return this.save();
};

// Method to cancel redemption
OfferRedemptionSchema.methods.cancel = async function (reason?: string) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();

  if (reason) {
    this.cancellationReason = reason;
  }

  return this.save();
};

// Method to verify (for in-store)
OfferRedemptionSchema.methods.verify = async function (
  verifiedByUserId: string
) {
  this.status = 'active';
  this.verifiedBy = verifiedByUserId;
  this.verifiedAt = new Date();
  return this.save();
};

// Static method to update expired redemptions
OfferRedemptionSchema.statics.updateExpired = async function () {
  const now = new Date();
  return this.updateMany(
    {
      status: { $in: ['pending', 'active'] },
      expiryDate: { $lt: now },
    },
    {
      $set: { status: 'expired' },
    }
  );
};

// Static method to get user's redemptions
OfferRedemptionSchema.statics.getUserRedemptions = function (
  userId: string,
  status?: string,
  limit: number = 20
) {
  const query: any = { user: userId };

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('offer', 'title image cashBackPercentage category')
    .populate('order', 'orderNumber totalAmount')
    .sort({ redemptionDate: -1 })
    .limit(limit);
};

// Static method to count user redemptions for an offer
OfferRedemptionSchema.statics.countUserOfferRedemptions = function (
  userId: string,
  offerId: string
) {
  return this.countDocuments({
    user: userId,
    offer: offerId,
    status: { $in: ['pending', 'active', 'used'] },
  });
};

// Static method to check if user can redeem offer
// @ts-ignore
OfferRedemptionSchema.statics.canUserRedeem = async function (
  userId: string,
  offerId: string,
  userLimit: number
) {
  // @ts-ignore
  const count = await this.countUserOfferRedemptions(userId, offerId);
  return count < userLimit;
};

const OfferRedemption = mongoose.model<IOfferRedemption, IOfferRedemptionModel>('OfferRedemption', OfferRedemptionSchema);

export default OfferRedemption;