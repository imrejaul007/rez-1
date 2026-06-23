import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReconciliationTransaction {
  paymentId: string;
  type: 'digital' | 'cash';
  amount: number; // in paise
  status: 'completed' | 'pending';
  createdAt?: string; // ISO timestamp of the original transaction
}

export interface IReconciliation extends Document {
  storeSlug: string;
  merchantId: Types.ObjectId;
  date: string; // ISO date string "2026-04-14"
  totalDigital: number; // in paise
  totalCash: number; // in paise (merchant entry)
  expectedCash: number; // calculated: total - digital
  discrepancy: number; // enteredCash - expectedCash
  discrepancyPercent: number; // discrepancy / total * 100
  status: 'open' | 'reconciled' | 'flagged';
  reconciledAt?: Date;
  reconciledBy?: string; // merchantId who locked it
  transactions: IReconciliationTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

const ReconciliationTransactionSchema = new Schema<IReconciliationTransaction>(
  {
    paymentId: { type: String, required: true },
    type: { type: String, enum: ['digital', 'cash'], required: true },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['completed', 'pending'], required: true },
    createdAt: { type: String, default: '' }, // ISO timestamp of the original transaction
  },
  { _id: false },
);

const ReconciliationSchema = new Schema<IReconciliation>(
  {
    storeSlug: { type: String, required: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, required: true, index: true },
    date: { type: String, required: true },
    totalDigital: { type: Number, default: 0, min: 0 },
    totalCash: { type: Number, default: 0, min: 0 },
    expectedCash: { type: Number, default: 0 },
    discrepancy: { type: Number, default: 0 },
    discrepancyPercent: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['open', 'reconciled', 'flagged'],
      default: 'open',
    },
    reconciledAt: { type: Date },
    reconciledBy: { type: String },
    transactions: { type: [ReconciliationTransactionSchema], default: [] },
  },
  { timestamps: true },
);

// Compound unique index: one reconciliation record per store per date
ReconciliationSchema.index({ storeSlug: 1, date: 1 }, { unique: true });
// Index for merchant-level queries (e.g., "all reconciliations for this merchant this month")
ReconciliationSchema.index({ merchantId: 1, date: 1 });

export const Reconciliation = mongoose.model<IReconciliation>('Reconciliation', ReconciliationSchema);
