import mongoose, { Document, Schema } from 'mongoose';

export interface ICancellationPolicy extends Document {
  storeId: mongoose.Types.ObjectId;
  freeCancelHours: number;
  lateFeeType: 'percentage' | 'fixed' | 'none';
  lateFeeValue: number;
  noShowFeeType: 'percentage' | 'fixed' | 'none';
  noShowFeeValue: number;
  enabled: boolean;
  updatedAt: Date;
}

const CancellationPolicySchema = new Schema<ICancellationPolicy>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
    freeCancelHours: { type: Number, default: 24, min: 0, max: 720 },
    lateFeeType: { type: String, enum: ['percentage', 'fixed', 'none'], default: 'none' },
    lateFeeValue: { type: Number, default: 0, min: 0 },
    noShowFeeType: { type: String, enum: ['percentage', 'fixed', 'none'], default: 'none' },
    noShowFeeValue: { type: Number, default: 0, min: 0 },
    enabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

CancellationPolicySchema.index({ storeId: 1 }, { unique: true });

export const CancellationPolicy = mongoose.model<ICancellationPolicy>('CancellationPolicy', CancellationPolicySchema);
