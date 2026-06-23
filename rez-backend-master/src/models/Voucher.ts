import mongoose, { Document, Schema, Types, Model } from 'mongoose';

// VoucherBrand interfaces
export interface IVoucherBrand extends Document {
  name: string;
  logo: string;
  backgroundColor: string;
  logoColor: string;
  description: string;
  cashbackRate: number;
  rating: number;
  ratingCount: number;
  category: 'shopping' | 'food' | 'travel' | 'entertainment' | 'lifestyle' | 'electronics' | 'fashion' | 'health' | 'education' | 'other';
  isNewlyAdded: boolean;
  isFeatured: boolean;
  isActive: boolean;
  denominations: number[];
  termsAndConditions: string[];
  purchaseCount: number;
  viewCount: number;
  store?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VoucherBrandSchema = new Schema<IVoucherBrand>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    logo: {
      type: String,
      required: true,
    },
    backgroundColor: {
      type: String,
      required: true,
      default: '#000000',
    },
    logoColor: {
      type: String,
      required: true,
      default: '#FFFFFF',
    },
    description: {
      type: String,
      required: true,
    },
    cashbackRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 100,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      enum: ['shopping', 'food', 'travel', 'entertainment', 'lifestyle', 'electronics', 'fashion', 'health', 'education', 'other'],
      required: true,
    },
    isNewlyAdded: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    denominations: {
      type: [Number],
      required: true,
      validate: {
        validator: function (v: number[]) {
          return v.length > 0;
        },
        message: 'At least one denomination is required',
      },
    },
    termsAndConditions: {
      type: [String],
      default: [],
    },
    purchaseCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    store: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for VoucherBrand
VoucherBrandSchema.index({ category: 1, isActive: 1 });
VoucherBrandSchema.index({ isFeatured: 1, isActive: 1 });
VoucherBrandSchema.index({ isNewlyAdded: 1, isActive: 1 });
VoucherBrandSchema.index({ name: 'text', description: 'text' });

// UserVoucher interfaces
export interface IUserVoucher extends Document {
  user: Types.ObjectId;
  brand: Types.ObjectId;
  voucherCode: string;
  denomination: number;
  purchasePrice: number;
  purchaseDate: Date;
  expiryDate: Date;
  validityDays: number;
  status: 'active' | 'used' | 'expired' | 'refunded';
  deliveryMethod: 'email' | 'sms' | 'app';
  deliveryStatus: 'pending' | 'delivered' | 'failed';
  deliveredAt?: Date;
  paymentMethod: 'wallet' | 'card' | 'upi' | 'netbanking';
  usedAt?: Date;
  usageLocation?: string;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  isValid(): boolean;
  markAsUsed(usageLocation?: string): Promise<IUserVoucher>;
}

const UserVoucherSchema = new Schema<IUserVoucher>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: 'VoucherBrand',
      required: true,
    },
    voucherCode: {
      type: String,
      required: true,
      unique: true,
    },
    denomination: {
      type: Number,
      required: true,
    },
    purchasePrice: {
      type: Number,
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    validityDays: {
      type: Number,
      required: true,
      default: 365,
    },
    status: {
      type: String,
      enum: ['active', 'used', 'expired', 'refunded'],
      default: 'active',
    },
    deliveryMethod: {
      type: String,
      enum: ['email', 'sms', 'app'],
      default: 'app',
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'delivered', 'failed'],
      default: 'pending',
    },
    deliveredAt: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['wallet', 'card', 'upi', 'netbanking'],
      required: true,
    },
    usedAt: {
      type: Date,
    },
    usageLocation: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for UserVoucher
UserVoucherSchema.index({ user: 1, status: 1 });
UserVoucherSchema.index({ user: 1, brand: 1 });
UserVoucherSchema.index({ voucherCode: 1 }, { unique: true });
UserVoucherSchema.index({ expiryDate: 1 });
UserVoucherSchema.index({ status: 1, expiryDate: 1 });

// Pre-save middleware to check expiry
UserVoucherSchema.pre('save', function (next) {
  if (this.status === 'active' && this.expiryDate < new Date()) {
    this.status = 'expired';
  }
  next();
});

// Static method to expire vouchers
UserVoucherSchema.statics.expireOldVouchers = async function () {
  const result = await this.updateMany(
    {
      status: 'active',
      expiryDate: { $lt: new Date() },
    },
    {
      $set: { status: 'expired' },
    }
  );
  return result.modifiedCount;
};

// Instance method: Check if voucher is valid
UserVoucherSchema.methods.isValid = function (): boolean {
  return this.status === 'active' && this.expiryDate > new Date();
};

// Instance method: Mark voucher as used
UserVoucherSchema.methods.markAsUsed = async function (usageLocation?: string): Promise<IUserVoucher> {
  this.status = 'used';
  this.usedAt = new Date();
  if (usageLocation) {
    this.usageLocation = usageLocation;
  }
  return this.save();
};

// Model interface with static methods
export interface IUserVoucherModel extends Model<IUserVoucher> {
  expireOldVouchers(): Promise<number>;
}

// Generate unique voucher code
export function generateVoucherCode(prefix: string = 'VCH'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export const VoucherBrand = mongoose.model<IVoucherBrand>('VoucherBrand', VoucherBrandSchema);
export const UserVoucher = mongoose.model<IUserVoucher, IUserVoucherModel>('UserVoucher', UserVoucherSchema);
