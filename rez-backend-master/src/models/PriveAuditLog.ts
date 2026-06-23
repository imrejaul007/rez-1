import mongoose, { Schema, Document, Types } from 'mongoose';

export type PriveAuditAction =
  | 'tier_change'
  | 'mission_completed'
  | 'mission_claimed'
  | 'redemption'
  | 'config_change'
  | 'access_granted'
  | 'access_revoked'
  | 'multiplier_applied'
  | 'concierge_ticket_created'
  | 'concierge_ticket_resolved'
  | 'voucher_issued'
  | 'voucher_used'
  | 'daily_checkin'
  | 'reputation_recalculated';

export interface IPriveAuditLog extends Document {
  userId?: Types.ObjectId;
  action: PriveAuditAction;
  details: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  performedBy?: Types.ObjectId;
  performerType: 'user' | 'admin' | 'system';
  createdAt: Date;
}

const PriveAuditLogSchema = new Schema<IPriveAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'tier_change', 'mission_completed', 'mission_claimed', 'redemption',
      'config_change', 'access_granted', 'access_revoked', 'multiplier_applied',
      'concierge_ticket_created', 'concierge_ticket_resolved',
      'voucher_issued', 'voucher_used', 'daily_checkin', 'reputation_recalculated',
    ],
    index: true,
  },
  details: {
    type: Schema.Types.Mixed,
    default: {},
  },
  previousState: {
    type: Schema.Types.Mixed,
  },
  newState: {
    type: Schema.Types.Mixed,
  },
  performedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  performerType: {
    type: String,
    enum: ['user', 'admin', 'system'],
    default: 'system',
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
});

// TTL index: auto-delete after 180 days
PriveAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

// Compound indexes for queries
PriveAuditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });
PriveAuditLogSchema.index({ action: 1, createdAt: -1 });

export const PriveAuditLog = mongoose.model<IPriveAuditLog>('PriveAuditLog', PriveAuditLogSchema);
