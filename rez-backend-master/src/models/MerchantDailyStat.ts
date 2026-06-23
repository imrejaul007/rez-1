import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMerchantDailyStat extends Document {
  merchantId: Types.ObjectId;
  storeId?: Types.ObjectId;
  date: string; // YYYY-MM-DD
  totalOrders: number;
  totalRevenue: number;
  totalRevenuePaise: number;
  totalCoinsIssued: number;
  totalCoinRedemptions: number;
  totalCoinIssued: number;
  totalCashback: number;
  uniqueCustomers: number;
  avgOrderValue: number;
  avgOrderValuePaise: number;
  completedBookings: number;
  cancelledBookings: number;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantDailyStatSchema = new Schema<IMerchantDailyStat>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    // Date stored as YYYY-MM-DD string for efficient string range queries
    date: {
      type: String,
      required: true,
      index: true,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Revenue in paise (smallest currency unit) for precise arithmetic
    totalRevenuePaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCoinsIssued: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCoinRedemptions: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Alias used by computeMerchantDailyStats job
    totalCoinIssued: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCashback: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueCustomers: {
      type: Number,
      default: 0,
      min: 0,
    },
    avgOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    avgOrderValuePaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedBookings: {
      type: Number,
      default: 0,
      min: 0,
    },
    cancelledBookings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'merchant_daily_stats',
  },
);

// Unique compound index: one stat record per merchant+store per day
MerchantDailyStatSchema.index({ merchantId: 1, storeId: 1, date: 1 }, { unique: true, sparse: true });
MerchantDailyStatSchema.index({ merchantId: 1, date: -1 });
MerchantDailyStatSchema.index({ storeId: 1, date: -1 });
MerchantDailyStatSchema.index({ date: -1 });

const MerchantDailyStat = mongoose.models['MerchantDailyStat']
  ? (mongoose.models['MerchantDailyStat'] as mongoose.Model<IMerchantDailyStat>)
  : mongoose.model<IMerchantDailyStat>('MerchantDailyStat', MerchantDailyStatSchema);

export default MerchantDailyStat;
