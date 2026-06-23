import { logger } from '../config/logger';
import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMerchantQualityMetrics extends Document {
  merchantId: Types.ObjectId;
  completionRate: number;
  avgRating: number;
  upsellConversion: number;
  trialCount: number;
  completionCount: number;
  qualityScore: number;
  updatedAt: Date;
}

const MerchantQualityMetricsSchema = new Schema<IMerchantQualityMetrics>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      unique: true,
      index: true,
    },
    completionRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    avgRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    upsellConversion: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    trialCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    completionCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    qualityScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  },
);

export const MerchantQualityMetrics = mongoose.model<IMerchantQualityMetrics>(
  'MerchantQualityMetrics',
  MerchantQualityMetricsSchema,
);
