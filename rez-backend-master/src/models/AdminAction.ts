import mongoose, { Schema, Document, Types } from 'mongoose';

export type AdminActionType = 'manual_adjustment' | 'bulk_credit' | 'freeze_override' | 'config_change' | 'cashback_reversal';
export type AdminActionStatus = 'pending_approval' | 'approved' | 'rejected' | 'executed';

export interface IAdminAction extends Document {
  actionType: AdminActionType;
  initiatorId: Types.ObjectId;
  approverId?: Types.ObjectId;
  status: AdminActionStatus;
  payload: Record<string, any>;
  reason: string;
  threshold: number;
  rejectionReason?: string;
  failureReason?: string;
  executedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdminActionSchema = new Schema<IAdminAction>({
  actionType: {
    type: String,
    required: true,
    enum: ['manual_adjustment', 'bulk_credit', 'freeze_override', 'config_change', 'cashback_reversal'],
  },
  initiatorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  approverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    required: true,
    enum: ['pending_approval', 'approved', 'rejected', 'executed'],
    default: 'pending_approval',
    index: true,
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  threshold: {
    type: Number,
    required: true,
  },
  rejectionReason: String,
  failureReason: String,
  executedAt: Date,
}, {
  timestamps: true,
});

AdminActionSchema.index({ status: 1, createdAt: -1 });
AdminActionSchema.index({ initiatorId: 1, createdAt: -1 });
AdminActionSchema.index({ approverId: 1, status: 1, createdAt: -1 }); // Pending approvals queue

export const AdminAction = mongoose.model<IAdminAction>('AdminAction', AdminActionSchema);
