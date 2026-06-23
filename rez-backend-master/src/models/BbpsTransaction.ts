import mongoose, { Document, Schema, Types } from 'mongoose';

export type BbpsTransactionStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface IBbpsTransaction extends Document {
  userId: Types.ObjectId;
  billerId: string;
  billerName: string;
  billerCategory: string;
  amount: number;
  status: BbpsTransactionStatus;
  latencyMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const BbpsTransactionSchema = new Schema<IBbpsTransaction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    billerId: {
      type: String,
      required: [true, 'Biller ID is required'],
      index: true,
      trim: true,
    },
    billerName: {
      type: String,
      required: [true, 'Biller name is required'],
      trim: true,
    },
    billerCategory: {
      type: String,
      required: [true, 'Biller category is required'],
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'success', 'failed'],
      default: 'pending',
      index: true,
    },
    latencyMs: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'bbps_transactions',
  }
);

// Index for recent transactions
BbpsTransactionSchema.index({ createdAt: -1 });
BbpsTransactionSchema.index({ billerId: 1, status: 1 });
BbpsTransactionSchema.index({ userId: 1, createdAt: -1 });

const BbpsTransaction = mongoose.model<IBbpsTransaction>('BbpsTransaction', BbpsTransactionSchema);

export default BbpsTransaction;
