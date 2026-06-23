import mongoose, { Document, Schema, Model } from 'mongoose';

// CoinDrop interface (Boosted cashback events)
export interface ICoinDrop extends Document {
  storeId: mongoose.Types.ObjectId;
  storeName: string; // Cached for display
  storeLogo?: string;
  multiplier: number; // 2x, 3x, 5x etc.
  normalCashback: number; // Base cashback percentage
  boostedCashback: number; // Calculated: normalCashback * multiplier
  category: string;
  startTime: Date;
  endTime: Date;
  minOrderValue?: number;
  maxCashback?: number;
  isActive: boolean;
  priority: number;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CoinDropSchema = new Schema<ICoinDrop>(
  {
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    storeName: {
      type: String,
      required: true,
      trim: true,
    },
    storeLogo: {
      type: String,
    },
    multiplier: {
      type: Number,
      required: true,
      min: 1.5,
      max: 10,
      default: 2,
    },
    normalCashback: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    boostedCashback: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
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
    minOrderValue: {
      type: Number,
      min: 0,
    },
    maxCashback: {
      type: Number,
      min: 0,
    },
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
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active coin drops
CoinDropSchema.index({ isActive: 1, endTime: 1 });

// Pre-save hook to calculate boostedCashback
CoinDropSchema.pre('save', function (next) {
  if (this.isModified('normalCashback') || this.isModified('multiplier')) {
    this.boostedCashback = this.normalCashback * this.multiplier;
  }
  next();
});

const CoinDrop = mongoose.model<ICoinDrop>('CoinDrop', CoinDropSchema);

export default CoinDrop;
