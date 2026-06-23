import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchantGoal extends Document {
  merchantId: mongoose.Types.ObjectId;
  monthlyRevenueTarget: number;
  monthlyVisitsTarget: number;
  updatedAt: Date;
}

const MerchantGoalSchema = new Schema<IMerchantGoal>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, unique: true, index: true },
    monthlyRevenueTarget: { type: Number, default: 0 },
    monthlyVisitsTarget: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    strict: false,
  },
);

export const MerchantGoal = mongoose.model<IMerchantGoal>('MerchantGoal', MerchantGoalSchema);
