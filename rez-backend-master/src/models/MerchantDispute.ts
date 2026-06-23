import mongoose, { Schema, Document } from 'mongoose';

export type MerchantDisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected' | 'closed';

export interface IMerchantDispute extends Document {
  merchantId: mongoose.Types.ObjectId;
  storeId?: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId;
  userName?: string;
  type?: string;
  description?: string;
  status: MerchantDisputeStatus;
  notes?: string;
  amount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantDisputeSchema = new Schema<IMerchantDispute>(
  {
    merchantId: {
      type: Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
      index: true,
    },
    storeId: {
      type: Schema.Types.ObjectId,
      ref: 'Store',
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    userName: {
      type: String,
    },
    type: {
      type: String,
    },
    description: {
      type: String,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'rejected', 'closed'],
      default: 'open',
      index: true,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    amount: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
    strict: false,
  },
);

MerchantDisputeSchema.index({ merchantId: 1, createdAt: -1 });
MerchantDisputeSchema.index({ merchantId: 1, status: 1 });

export const MerchantDispute = mongoose.model<IMerchantDispute>('MerchantDispute', MerchantDisputeSchema);
export default MerchantDispute;
