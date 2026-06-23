import mongoose, { Schema, Document } from 'mongoose';

export interface IMerchantPayout extends Document {
  merchantId: mongoose.Types.ObjectId;
  storeId?: mongoose.Types.ObjectId;
  amountPaise: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  requestedAt: Date;
  processedAt?: Date;
  bankAccountId?: string;
  transactionRef?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MerchantPayoutSchema = new Schema<IMerchantPayout>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    storeId: { type: Schema.Types.ObjectId, ref: 'Store', index: true },
    amountPaise: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed'],
      default: 'pending',
      index: true,
    },
    requestedAt: { type: Date, default: () => new Date() },
    processedAt: { type: Date },
    bankAccountId: { type: String },
    transactionRef: { type: String },
    rejectionReason: { type: String },
    notes: { type: String },
  },
  {
    timestamps: true,
    strict: false,
  },
);

MerchantPayoutSchema.index({ merchantId: 1, status: 1 });
MerchantPayoutSchema.index({ merchantId: 1, requestedAt: -1 });

export const MerchantPayout = mongoose.model<IMerchantPayout>('MerchantPayout', MerchantPayoutSchema);
