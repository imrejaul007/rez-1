import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── Types ──────────────────────────────────────────────────

export type DisputeTargetType = 'order' | 'transaction' | 'transfer';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'escalated'
  | 'resolved_refund'
  | 'resolved_reject'
  | 'auto_resolved'
  | 'closed';

export type DisputeReason =
  | 'item_not_received'
  | 'wrong_item'
  | 'damaged_item'
  | 'quality_issue'
  | 'unauthorized_charge'
  | 'double_charge'
  | 'service_not_rendered'
  | 'other';

export type DisputePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IDisputeEvidence {
  submittedBy: Types.ObjectId;
  submitterType: 'user' | 'merchant' | 'admin';
  description: string;
  attachments: string[];
  submittedAt: Date;
}

export interface IDisputeTimeline {
  action: string;
  performedBy?: Types.ObjectId;
  performerType: 'user' | 'merchant' | 'admin' | 'system';
  details?: string;
  timestamp: Date;
}

export interface IDispute extends Document {
  disputeNumber: string;
  user: Types.ObjectId;
  targetType: DisputeTargetType;
  targetId: Types.ObjectId;
  targetRef: string;
  store?: Types.ObjectId;
  merchant?: Types.ObjectId;
  reason: DisputeReason;
  description: string;
  amount: number;
  currency: string;
  status: DisputeStatus;
  priority: DisputePriority;
  evidence: IDisputeEvidence[];
  timeline: IDisputeTimeline[];
  assignedTo?: Types.ObjectId;
  escalatedTo?: Types.ObjectId;
  escalationReason?: string;
  resolution?: {
    decision: 'refund' | 'reject' | 'partial_refund';
    amount: number;
    reason: string;
    resolvedBy: Types.ObjectId;
    resolvedAt: Date;
    refundTransactionId?: Types.ObjectId;
  };
  merchantResponse?: {
    response: string;
    attachments: string[];
    respondedAt: Date;
  };
  rewardLocked: boolean;
  lockedRewardIds: string[];
  autoResolveAt: Date;
  autoResolveThreshold: number;
  idempotencyKey: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Constants ──────────────────────────────────────────────

const DISPUTE_TARGET_TYPES: DisputeTargetType[] = ['order', 'transaction', 'transfer'];

const DISPUTE_STATUSES: DisputeStatus[] = [
  'open', 'under_review', 'escalated',
  'resolved_refund', 'resolved_reject', 'auto_resolved', 'closed',
];

const DISPUTE_REASONS: DisputeReason[] = [
  'item_not_received', 'wrong_item', 'damaged_item', 'quality_issue',
  'unauthorized_charge', 'double_charge', 'service_not_rendered', 'other',
];

const DISPUTE_PRIORITIES: DisputePriority[] = ['low', 'medium', 'high', 'urgent'];

const RESOLVABLE_STATUSES: DisputeStatus[] = ['open', 'under_review', 'escalated'];

const DEFAULT_TIMEOUT_HOURS = 72;
const DEFAULT_AUTO_RESOLVE_THRESHOLD = 500;

// ─── Schema ─────────────────────────────────────────────────

const DisputeEvidenceSchema = new Schema<IDisputeEvidence>({
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  submitterType: { type: String, enum: ['user', 'merchant', 'admin'], required: true },
  description: { type: String, required: true, maxlength: 1000 },
  attachments: [{ type: String }],
  submittedAt: { type: Date, default: Date.now },
}, { _id: false });

const DisputeTimelineSchema = new Schema<IDisputeTimeline>({
  action: { type: String, required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  performerType: { type: String, enum: ['user', 'merchant', 'admin', 'system'], required: true },
  details: String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const DisputeSchema = new Schema<IDispute>({
  disputeNumber: {
    type: String,
    required: true,
    unique: true,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  targetType: {
    type: String,
    enum: DISPUTE_TARGET_TYPES,
    required: true,
  },
  targetId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  targetRef: {
    type: String,
    required: true,
  },
  store: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    index: true,
  },
  merchant: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  reason: {
    type: String,
    enum: DISPUTE_REASONS,
    required: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'RC',
  },
  status: {
    type: String,
    enum: DISPUTE_STATUSES,
    default: 'open',
    index: true,
  },
  priority: {
    type: String,
    enum: DISPUTE_PRIORITIES,
    default: 'medium',
  },
  evidence: [DisputeEvidenceSchema],
  timeline: [DisputeTimelineSchema],
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  escalatedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  escalationReason: String,
  resolution: {
    decision: { type: String, enum: ['refund', 'reject', 'partial_refund'] },
    amount: Number,
    reason: String,
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    refundTransactionId: { type: Schema.Types.ObjectId },
  },
  merchantResponse: {
    response: String,
    attachments: [String],
    respondedAt: Date,
  },
  rewardLocked: {
    type: Boolean,
    default: true,
  },
  lockedRewardIds: [{ type: String }],
  autoResolveAt: {
    type: Date,
    required: true,
    index: true,
  },
  autoResolveThreshold: {
    type: Number,
    default: DEFAULT_AUTO_RESOLVE_THRESHOLD,
  },
  idempotencyKey: {
    type: String,
    required: true,
  },
  metadata: {
    type: Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// ─── Indexes ────────────────────────────────────────────────

// Prevent duplicate open disputes on the same target
DisputeSchema.index(
  { user: 1, targetType: 1, targetId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['open', 'under_review', 'escalated'] },
    },
  }
);

// Timeout job query
DisputeSchema.index({ status: 1, autoResolveAt: 1 });

// Admin filters
DisputeSchema.index({ assignedTo: 1, status: 1 });
DisputeSchema.index({ store: 1, status: 1 });

// User history
DisputeSchema.index({ user: 1, createdAt: -1 });

// Idempotency
DisputeSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

// ─── Pre-save: generate disputeNumber ───────────────────────

DisputeSchema.pre('save', async function (next) {
  if (this.isNew && !this.disputeNumber) {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.disputeNumber = `DSP-${ts}-${rand}`;
  }

  // Auto-set autoResolveAt on creation
  if (this.isNew && !this.autoResolveAt) {
    this.autoResolveAt = new Date(Date.now() + DEFAULT_TIMEOUT_HOURS * 60 * 60 * 1000);
  }

  // Auto-set priority based on amount
  if (this.isNew) {
    if (this.amount >= 5000) this.priority = 'urgent';
    else if (this.amount >= 1000) this.priority = 'high';
    else if (this.amount >= 200) this.priority = 'medium';
    else this.priority = 'low';
  }

  next();
});

// ─── Statics ────────────────────────────────────────────────

export { RESOLVABLE_STATUSES, DISPUTE_STATUSES, DISPUTE_REASONS, DISPUTE_PRIORITIES, DEFAULT_TIMEOUT_HOURS };

export const Dispute = mongoose.model<IDispute>('Dispute', DisputeSchema);
export default Dispute;
