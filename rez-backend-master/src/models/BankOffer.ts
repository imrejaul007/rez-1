import mongoose, { Document, Schema, Model } from 'mongoose';

// BankOffer interface (Bank/Wallet partnership offers)
export interface IBankOffer extends Document {
  bankName: string;
  bankLogo?: string;
  bankCode?: string; // e.g., "HDFC", "ICICI"
  offerTitle: string;
  offerDescription?: string;
  discountPercentage: number;
  maxDiscount: number;
  minTransactionAmount: number;
  cardType: 'credit' | 'debit' | 'wallet' | 'upi' | 'all';
  cardNetwork?: string; // e.g., "Visa", "Mastercard", "Rupay"
  validFrom: Date;
  validUntil: Date;
  terms: string;
  termsDetailed?: string[];
  promoCode?: string;
  usageLimitPerUser?: number;
  totalUsageLimit?: number;
  usageCount: number;
  applicableStores?: mongoose.Types.ObjectId[];
  applicableCategories?: string[];
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

const BankOfferSchema = new Schema<IBankOffer>(
  {
    bankName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    bankLogo: {
      type: String,
    },
    bankCode: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    offerTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    offerDescription: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    discountPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    maxDiscount: {
      type: Number,
      required: true,
      min: 0,
    },
    minTransactionAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    cardType: {
      type: String,
      required: true,
      enum: ['credit', 'debit', 'wallet', 'upi', 'all'],
      index: true,
    },
    cardNetwork: {
      type: String,
      trim: true,
    },
    validFrom: {
      type: Date,
      required: true,
      index: true,
    },
    validUntil: {
      type: Date,
      required: true,
      index: true,
    },
    terms: {
      type: String,
      required: true,
      trim: true,
    },
    termsDetailed: [{
      type: String,
      trim: true,
    }],
    promoCode: {
      type: String,
      uppercase: true,
      trim: true,
    },
    usageLimitPerUser: {
      type: Number,
      min: 1,
    },
    totalUsageLimit: {
      type: Number,
      min: 1,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicableStores: [{
      type: Schema.Types.ObjectId,
      ref: 'Store',
    }],
    applicableCategories: [{
      type: String,
      trim: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active offers
BankOfferSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
BankOfferSchema.index({ cardType: 1, isActive: 1 });

const BankOffer = mongoose.model<IBankOffer>('BankOffer', BankOfferSchema);

export default BankOffer;
