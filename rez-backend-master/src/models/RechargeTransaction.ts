import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRechargeTransaction extends Document {
  userId: Types.ObjectId;
  mobile: string;
  operator: string;
  circle: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'refunded';
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  operatorRefId?: string;
  coinsIssued?: number;
  coinType?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const RechargeTransactionSchema = new Schema<IRechargeTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    mobile: { type: String, required: true },
    operator: { type: String, required: true },
    circle: { type: String, required: true },
    amount: { type: Number, required: true, min: 10, max: 10000 },
    status: { type: String, enum: ['pending', 'processing', 'success', 'failed', 'refunded'], default: 'pending' },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    operatorRefId: { type: String },
    coinsIssued: { type: Number },
    coinType: { type: String },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

RechargeTransactionSchema.index({ userId: 1, createdAt: -1 });
RechargeTransactionSchema.index({ status: 1, createdAt: -1 });
RechargeTransactionSchema.index({ razorpayPaymentId: 1 }, { sparse: true, unique: true });

export const RechargeTransaction = mongoose.model<IRechargeTransaction>(
  'RechargeTransaction',
  RechargeTransactionSchema,
);
export default RechargeTransaction;
