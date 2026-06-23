import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPartnerEarningsSnapshot extends Document {
  userId: Types.ObjectId;
  period: 'daily' | 'monthly';
  date: Date; // The date this snapshot covers (start of day or start of month)
  partnerCashback: { amount: number; count: number };
  milestoneRewards: { amount: number; count: number };
  referralBonus: { amount: number; count: number };
  taskRewards: { amount: number; count: number };
  totalAmount: number;
  totalCount: number;
  createdAt: Date;
}

const PartnerEarningsSnapshotSchema = new Schema<IPartnerEarningsSnapshot>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    period: { type: String, enum: ['daily', 'monthly'], required: true },
    date: { type: Date, required: true },
    partnerCashback: {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    milestoneRewards: {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    referralBonus: {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    taskRewards: {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    totalAmount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Unique compound index: one snapshot per user per period per date
PartnerEarningsSnapshotSchema.index(
  { userId: 1, period: 1, date: 1 },
  { unique: true }
);

export const PartnerEarningsSnapshot = mongoose.model<IPartnerEarningsSnapshot>(
  'PartnerEarningsSnapshot',
  PartnerEarningsSnapshotSchema
);
