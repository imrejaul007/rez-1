import mongoose, { Schema, Document } from 'mongoose';

export interface IReconciliationIssue extends Document {
  type:
    | 'wallet_mismatch'
    | 'missing_cashback'
    | 'stale_refund'
    | 'duplicate_credit'
    | 'ghost_transaction'
    | 'ghost_pending_order';
  userId?: mongoose.Types.ObjectId;
  orderId?: mongoose.Types.ObjectId;
  bookingId?: mongoose.Types.ObjectId;
  detail: string;
  status: 'open' | 'investigating' | 'resolved' | 'ignored';
  resolvedBy?: string;
  resolvedAt?: Date;
  detectedAt: Date;
}

const schema = new Schema<IReconciliationIssue>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'wallet_mismatch',
        'missing_cashback',
        'stale_refund',
        'duplicate_credit',
        'ghost_transaction',
        'ghost_pending_order',
      ],
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'ServiceAppointment' },
    detail: { type: String, required: true },
    status: { type: String, enum: ['open', 'investigating', 'resolved', 'ignored'], default: 'open' },
    resolvedBy: String,
    resolvedAt: Date,
    detectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// KAVITA: Compound indexes for reconciliation queries
schema.index({ type: 1, status: 1 }, { name: 'type_status_idx' });
schema.index({ type: 1, status: 1, createdAt: -1 }, { name: 'type_status_timeline_idx' });
schema.index({ detectedAt: -1 }, { name: 'detected_time_idx' });
schema.index({ userId: 1, status: 1 }, { name: 'user_status_idx' });
schema.index({ status: 1, createdAt: -1 }, { name: 'status_timeline_idx' }); // For filtering open/resolved by time

// Deduplication guard: prevent concurrent reconciliation runs from creating
// duplicate 'open' issues for the same type + entity combination.
// The partial filter (status: 'open') means only one unresolved issue per
// {type, userId, orderId} is allowed; once it is resolved/ignored, a fresh
// issue can be created if the problem recurs.
schema.index(
  { type: 1, userId: 1, orderId: 1 },
  {
    unique: true,
    sparse: true, // Allows multiple docs where userId/orderId are absent
    partialFilterExpression: { status: 'open' },
    name: 'dedup_open_issue_idx',
  },
);

export default mongoose.model<IReconciliationIssue>('ReconciliationIssue', schema);
