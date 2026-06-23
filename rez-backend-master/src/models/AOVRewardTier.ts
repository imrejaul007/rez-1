import mongoose, { Schema, Document, Types } from 'mongoose';

export type AOVRewardType = 'cashback_percent' | 'flat_coins' | 'flat_cashback_paise';

export interface IAOVTier {
  spendThresholdPaise: number;
  rewardType: AOVRewardType;
  rewardValue: number;
  label: string;
}

export interface IAOVRewardTier extends Document {
  merchantId: Types.ObjectId;
  storeId: Types.ObjectId;
  name: string;
  isActive: boolean;
  tiers: IAOVTier[];
  validDays: number[];
  validHourStart: number;
  validHourEnd: number;
  createdAt: Date;
  updatedAt: Date;
}

const AOVTierSchema = new Schema<IAOVTier>(
  {
    spendThresholdPaise: { type: Number, required: true, min: 1 },
    rewardType: {
      type: String,
      required: true,
      enum: ['cashback_percent', 'flat_coins', 'flat_cashback_paise'],
    },
    rewardValue: { type: Number, required: true, min: 0 },
    label: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const AOVRewardTierSchema = new Schema<IAOVRewardTier>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    isActive: { type: Boolean, default: true },
    tiers: { type: [AOVTierSchema], required: true },
    validDays: {
      type: [Number],
      default: [],
      validate: {
        validator: (days: number[]) => days.every((d) => d >= 0 && d <= 6),
        message: 'validDays must contain values 0-6',
      },
    },
    validHourStart: { type: Number, default: 0, min: 0, max: 23 },
    validHourEnd: { type: Number, default: 23, min: 0, max: 23 },
  },
  { timestamps: true },
);

AOVRewardTierSchema.index({ merchantId: 1, storeId: 1 });

const AOVRewardTier = mongoose.model<IAOVRewardTier>('AOVRewardTier', AOVRewardTierSchema);

export default AOVRewardTier;
