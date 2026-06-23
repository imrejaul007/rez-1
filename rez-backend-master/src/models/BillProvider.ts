import mongoose, { Document, Schema, Types } from 'mongoose';

// ============================================
// TYPES & INTERFACES
// ============================================

export const BILL_TYPES = [
  'electricity',
  'water',
  'gas',
  'internet',
  'mobile_postpaid',
  'mobile_prepaid',
  'broadband',
  'dth',
  'landline',
  'insurance',
  'fastag',
  'education_fee',
] as const;

export type BillType = typeof BILL_TYPES[number];

export interface IRequiredField {
  fieldName: string;
  label: string;
  placeholder: string;
  type: 'text' | 'number';
}

export interface IBillProvider extends Document {
  name: string;
  code: string;
  type: BillType;
  logo: string;
  region?: string;
  requiredFields: IRequiredField[];
  cashbackPercent: number;
  isActive: boolean;
  aggregatorCode: string;
  aggregatorName: 'razorpay' | 'setu' | 'manual';
  promoCoinsFixed: number;
  promoExpiryDays: number;
  maxRedemptionPercent: number;
  displayOrder: number;
  isFeatured: boolean;
  minAmount: number;
  maxAmount: number;
  // Soft delete fields
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Instance methods
  softDelete(adminId: Types.ObjectId): Promise<void>;
}

// ============================================
// SCHEMA
// ============================================

const RequiredFieldSchema = new Schema<IRequiredField>(
  {
    fieldName: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    placeholder: { type: String, required: true, trim: true },
    type: { type: String, enum: ['text', 'number'], default: 'text' },
  },
  { _id: false }
);

const BillProviderSchema = new Schema<IBillProvider>(
  {
    name: {
      type: String,
      required: [true, 'Provider name is required'],
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: [true, 'Provider code is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
    },
    type: {
      type: String,
      required: [true, 'Bill type is required'],
      enum: BILL_TYPES,
      index: true,
    },
    logo: {
      type: String,
      default: '',
    },
    region: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 50,
      index: true,
    },
    requiredFields: {
      type: [RequiredFieldSchema],
      default: [
        {
          fieldName: 'consumerNumber',
          label: 'Consumer Number',
          placeholder: 'Enter your consumer/account number',
          type: 'text',
        },
      ],
    },
    cashbackPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    aggregatorCode: {
      type: String,
      trim: true,
      default: '',
    },
    aggregatorName: {
      type: String,
      enum: ['razorpay', 'setu', 'manual'],
      default: 'razorpay',
    },
    promoCoinsFixed: {
      type: Number,
      default: 10,
      min: 0,
      max: 500,
    },
    promoExpiryDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 30,
    },
    maxRedemptionPercent: {
      type: Number,
      default: 15,
      min: 5,
      max: 50,
    },
    displayOrder: {
      type: Number,
      default: 99,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    minAmount: {
      type: Number,
      default: 10,
      min: 1,
    },
    maxAmount: {
      type: Number,
      default: 100000,
    },
    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes
BillProviderSchema.index({ type: 1, isActive: 1 });
BillProviderSchema.index({ code: 1 }, { unique: true });
BillProviderSchema.index({ type: 1, isActive: 1, displayOrder: 1 });
BillProviderSchema.index({ isFeatured: 1, isActive: 1 });
BillProviderSchema.index({ aggregatorCode: 1 });

// ── Soft delete: exclude deleted docs from all find queries ──
BillProviderSchema.pre(/^find/, function (this: any, next) {
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

BillProviderSchema.pre('countDocuments', function (this: any, next) {
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// ── Cross-field validation ──
BillProviderSchema.pre('save', function (next) {
  if (this.promoCoinsFixed !== undefined && this.promoCoinsFixed > 500) {
    return next(new Error('promoCoinsFixed cannot exceed 500 coins'));
  }
  next();
});

// ── Soft delete instance method ──
BillProviderSchema.methods.softDelete = async function (adminId: Types.ObjectId): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = adminId;
  this.isActive = false;
  await this.save();
};

export const BillProvider = mongoose.model<IBillProvider>('BillProvider', BillProviderSchema);
