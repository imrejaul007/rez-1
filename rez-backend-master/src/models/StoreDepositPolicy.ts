import mongoose, { Document, Schema } from 'mongoose';

export interface IStoreDepositPolicy extends Document {
  storeId: mongoose.Types.ObjectId;
  enabled: boolean;
  depositType: 'fixed' | 'percentage';
  depositValue: number;
  requireForNewClients: boolean;
  requireForAll: boolean;
  cancellationPolicy: {
    hoursNotice: number;
    lateFee: number;
    lateFeeType: 'fixed' | 'percentage';
    message: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const StoreDepositPolicySchema = new Schema<IStoreDepositPolicy>(
  {
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', required: true, unique: true },
    enabled: { type: Boolean, default: false },
    depositType: { type: String, enum: ['fixed', 'percentage'], default: 'percentage' },
    depositValue: { type: Number, default: 20, min: 0 },
    requireForNewClients: { type: Boolean, default: true },
    requireForAll: { type: Boolean, default: false },
    cancellationPolicy: {
      hoursNotice: { type: Number, default: 24 },
      lateFee: { type: Number, default: 0 },
      lateFeeType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
      message: { type: String, default: 'Cancellations within 24 hours may incur a fee.' },
    },
  },
  { timestamps: true },
);

export const StoreDepositPolicy = mongoose.model<IStoreDepositPolicy>('StoreDepositPolicy', StoreDepositPolicySchema);
