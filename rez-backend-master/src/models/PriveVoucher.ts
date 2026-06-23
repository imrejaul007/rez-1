/**
 * Prive Voucher Model
 *
 * Tracks vouchers generated from Prive coin redemptions
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';
import crypto from 'crypto';

export type VoucherType = 'gift_card' | 'bill_pay' | 'experience' | 'charity';
export type VoucherStatus = 'active' | 'used' | 'expired' | 'cancelled';

export interface IPriveVoucher extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  code: string; // Unique voucher code
  type: VoucherType;

  // Redemption details
  coinAmount: number; // Coins spent
  coinType: 'rez' | 'prive' | 'branded';
  value: number; // Monetary value
  currency: string; // INR, USD, etc.

  // Voucher status
  status: VoucherStatus;
  expiresAt: Date;
  usedAt?: Date;

  // Partner/Brand details
  partnerId?: Types.ObjectId;
  partnerName?: string;
  partnerLogo?: string;

  // Category specific
  category?: string; // e.g., "Amazon", "Food", "Travel"
  subcategory?: string;

  // Terms and instructions
  terms?: string[];
  howToUse?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface IPriveVoucherModel extends Model<IPriveVoucher> {
  generateUniqueCode(): Promise<string>;
  getActiveVouchers(userId: Types.ObjectId): Promise<IPriveVoucher[]>;
  getVoucherHistory(userId: Types.ObjectId, limit?: number): Promise<IPriveVoucher[]>;
  markAsUsed(voucherId: Types.ObjectId): Promise<IPriveVoucher | null>;
  getByCode(code: string): Promise<IPriveVoucher | null>;
}

const PriveVoucherSchema = new Schema<IPriveVoucher>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Voucher code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['gift_card', 'bill_pay', 'experience', 'charity'],
      required: [true, 'Voucher type is required'],
    },
    coinAmount: {
      type: Number,
      required: [true, 'Coin amount is required'],
      min: [1, 'Coin amount must be at least 1'],
    },
    coinType: {
      type: String,
      enum: ['rez', 'prive', 'branded'],
      default: 'rez',
    },
    value: {
      type: Number,
      required: [true, 'Voucher value is required'],
      min: [0, 'Value cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['active', 'used', 'expired', 'cancelled'],
      default: 'active',
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    usedAt: {
      type: Date,
    },
    partnerId: {
      type: Schema.Types.ObjectId,
      ref: 'Partner',
    },
    partnerName: {
      type: String,
    },
    partnerLogo: {
      type: String,
    },
    category: {
      type: String,
    },
    subcategory: {
      type: String,
    },
    terms: [{
      type: String,
    }],
    howToUse: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
PriveVoucherSchema.index({ userId: 1, status: 1 });
PriveVoucherSchema.index({ userId: 1, createdAt: -1 });
PriveVoucherSchema.index({ code: 1 }, { unique: true });
PriveVoucherSchema.index({ expiresAt: 1 });
PriveVoucherSchema.index({ type: 1 });
PriveVoucherSchema.index({ _id: 1, userId: 1 });

// Generate a unique 12-character alphanumeric code
PriveVoucherSchema.statics.generateUniqueCode = async function (): Promise<string> {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars like 0, O, 1, I
  let code: string;
  let exists = true;

  while (exists) {
    code = '';
    for (let i = 0; i < 12; i++) {
      code += characters.charAt(crypto.randomInt(characters.length));
      // Add dashes for readability: XXXX-XXXX-XXXX
      if (i === 3 || i === 7) code += '-';
    }
    exists = !!(await this.findOne({ code }));
  }

  return code!;
};

// Get all active (non-expired, non-used) vouchers for a user
PriveVoucherSchema.statics.getActiveVouchers = async function (
  userId: Types.ObjectId
): Promise<IPriveVoucher[]> {
  const now = new Date();
  return this.find({
    userId,
    status: 'active',
    expiresAt: { $gt: now },
  }).sort({ expiresAt: 1 }); // Soonest expiring first
};

// Get voucher history for a user
PriveVoucherSchema.statics.getVoucherHistory = async function (
  userId: Types.ObjectId,
  limit: number = 50
): Promise<IPriveVoucher[]> {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Mark a voucher as used
PriveVoucherSchema.statics.markAsUsed = async function (
  voucherId: Types.ObjectId
): Promise<IPriveVoucher | null> {
  return this.findOneAndUpdate(
    { _id: voucherId, status: 'active' },
    {
      status: 'used',
      usedAt: new Date(),
    },
    { new: true }
  );
};

// Get voucher by code
PriveVoucherSchema.statics.getByCode = async function (
  code: string
): Promise<IPriveVoucher | null> {
  return this.findOne({ code: code.toUpperCase() });
};

// Pre-save middleware to check expiry
PriveVoucherSchema.pre('save', function (next) {
  // Auto-expire if past expiry date
  if (this.expiresAt && new Date() > this.expiresAt && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

// Virtual for checking if voucher is valid
PriveVoucherSchema.virtual('isValid').get(function () {
  return this.status === 'active' && new Date() < this.expiresAt;
});

// Virtual for days until expiry
PriveVoucherSchema.virtual('daysUntilExpiry').get(function () {
  if (this.status !== 'active') return 0;
  const now = new Date();
  const diff = this.expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

const PriveVoucher = mongoose.model<IPriveVoucher, IPriveVoucherModel>('PriveVoucher', PriveVoucherSchema);

export default PriveVoucher;

// Helper function to calculate coin to value conversion
export const calculateVoucherValue = (coins: number, type: VoucherType): number => {
  // Base conversion: 1 coin = 0.10 INR (can be adjusted per type)
  const conversionRates: Record<VoucherType, number> = {
    gift_card: 0.10,    // 1000 coins = 100 INR
    bill_pay: 0.10,
    experience: 0.12,   // Premium conversion for experiences
    charity: 0.15,      // Better rate for charity (1000 coins = 150 INR donated)
  };

  return Math.floor(coins * conversionRates[type]);
};

// Helper to get default expiry based on type
export const getDefaultExpiry = (type: VoucherType): Date => {
  const now = new Date();
  const expiryDays: Record<VoucherType, number> = {
    gift_card: 365,     // 1 year
    bill_pay: 30,       // 30 days
    experience: 90,     // 90 days
    charity: 7,         // 7 days (immediate donation preferred)
  };

  now.setDate(now.getDate() + expiryDays[type]);
  return now;
};
