import mongoose, { Document, Schema, Types } from 'mongoose';

// ============================================================================
// GOLD PRICE MODEL
// ============================================================================

export interface IGoldPrice extends Document {
  pricePerGram: number;
  currency: string;
  region: string;
  source: string;
  effectiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GoldPriceSchema = new Schema<IGoldPrice>(
  {
    pricePerGram: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },
    region: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: '',
    },
    source: {
      type: String,
      enum: ['manual', 'api', 'scheduled'],
      default: 'manual',
    },
    effectiveAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for fast "latest price" lookup
GoldPriceSchema.index({ effectiveAt: -1 });
GoldPriceSchema.index({ region: 1, effectiveAt: -1 });
GoldPriceSchema.index({ currency: 1, effectiveAt: -1 });

export const GoldPrice = mongoose.model<IGoldPrice>('GoldPrice', GoldPriceSchema);

// ============================================================================
// GOLD HOLDING MODEL (user's gold balance)
// ============================================================================

export interface IGoldTransaction {
  type: 'buy' | 'sell';
  grams: number;
  pricePerGram: number;
  amount: number;
  idempotencyKey?: string;
  date: Date;
}

export interface IGoldHolding extends Document {
  userId: Types.ObjectId;
  balanceGrams: number;
  totalInvested: number;
  totalSold: number;
  transactions: IGoldTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

const GoldTransactionSchema = new Schema<IGoldTransaction>(
  {
    type: {
      type: String,
      enum: ['buy', 'sell'],
      required: true,
    },
    grams: {
      type: Number,
      required: true,
      min: 0,
    },
    pricePerGram: {
      type: Number,
      required: true,
      min: 0,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const GoldHoldingSchema = new Schema<IGoldHolding>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balanceGrams: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalInvested: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSold: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactions: {
      type: [GoldTransactionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Index for quick user lookup
GoldHoldingSchema.index({ userId: 1 });
// Compound index for idempotency checks on embedded transactions
GoldHoldingSchema.index({ 'transactions.idempotencyKey': 1 }, { sparse: true });

export const GoldHolding = mongoose.model<IGoldHolding>('GoldHolding', GoldHoldingSchema);
