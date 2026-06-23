import mongoose, { Schema, Document } from 'mongoose';

export interface IGoldSipEntry {
  date: Date;
  amount: number; // INR amount invested
  gramsAdded: number; // grams purchased
  pricePerGram: number; // gold price at time of purchase
  transactionId?: string;
  status: 'success' | 'failed' | 'pending';
}

export interface IGoldSip extends Document {
  userId: mongoose.Types.ObjectId;
  monthlyAmount: number; // INR e.g. 1000
  deductionDate: number; // 1, 5, 10, or 15
  isActive: boolean;
  startDate: Date;
  cancelledAt?: Date;
  history: IGoldSipEntry[];
  totalGramsAccumulated: number;
  totalInvested: number;
  nextDebitDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GoldSipEntrySchema = new Schema<IGoldSipEntry>(
  {
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    gramsAdded: { type: Number, required: true },
    pricePerGram: { type: Number, required: true },
    transactionId: { type: String },
    status: { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
  },
  { _id: false },
);

const GoldSipSchema = new Schema<IGoldSip>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    monthlyAmount: { type: Number, required: true, min: 100, max: 100000 },
    deductionDate: { type: Number, required: true, enum: [1, 5, 10, 15] },
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    cancelledAt: { type: Date },
    history: [GoldSipEntrySchema],
    totalGramsAccumulated: { type: Number, default: 0 },
    totalInvested: { type: Number, default: 0 },
    nextDebitDate: { type: Date, required: true },
  },
  { timestamps: true },
);

// SECURITY: Unique active SIP constraint — enforce one active SIP per user
// Uses partial filter to apply constraint only to active SIPs
GoldSipSchema.index(
  { userId: 1, isActive: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { isActive: true },
    name: 'one_active_sip_per_user',
  },
);

export const GoldSip = mongoose.model<IGoldSip>('GoldSip', GoldSipSchema);
