import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Admin Audit Log
 *
 * Records every admin mutation (POST/PUT/PATCH/DELETE) with request details.
 * Immutable append-only log for compliance and security auditing.
 */

export interface IAdminAuditLog extends Document {
  adminId: Types.ObjectId;
  action: string;        // e.g. "POST /api/admin/merchants/:id/suspend"
  method: string;        // HTTP method
  path: string;          // Full request path
  targetId?: string;     // Extracted from route params (id, merchantId, userId, etc.)
  targetType?: string;   // Inferred from route (merchant, wallet, gift-card, etc.)
  ip?: string;
  requestBody?: Record<string, any>;
  responseSuccess: boolean;
  responseStatus: number;
  timestamp: Date;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<IAdminAuditLog>({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    required: true,
    enum: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },
  path: {
    type: String,
    required: true,
  },
  targetId: {
    type: String,
    index: true,
  },
  targetType: {
    type: String,
    index: true,
  },
  ip: String,
  requestBody: {
    type: Schema.Types.Mixed,
  },
  responseSuccess: {
    type: Boolean,
    required: true,
  },
  responseStatus: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false }, // Immutable - no updates
});

// Compound indexes for efficient queries
AdminAuditLogSchema.index({ adminId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ targetType: 1, createdAt: -1 });
AdminAuditLogSchema.index({ method: 1, createdAt: -1 });
AdminAuditLogSchema.index({ createdAt: -1 });

// TTL: Keep admin audit logs for 2 years (compliance)
AdminAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 730 days

export const AdminAuditLog = mongoose.model<IAdminAuditLog>(
  'AdminAuditLog',
  AdminAuditLogSchema
);
