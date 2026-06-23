import { logger } from '../config/logger';
// Audit Log Model - Merchant Backend
// Tracks all merchant activities for compliance and security

import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  merchantId: Types.ObjectId;
  merchantUserId?: Types.ObjectId; // If action performed by team member
  action: string; // e.g., 'product.created', 'order.status_changed'
  resourceType: string; // 'product', 'order', 'store', 'user', etc.
  resourceId?: Types.ObjectId; // ID of affected resource
  details: {
    before?: any; // State before change
    after?: any; // State after change
    changes?: any; // Specific changed fields
    metadata?: any; // Additional context
  };
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  merchantId: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant',
    required: [true, 'Merchant ID is required'],
    index: true
  },
  merchantUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // For team members
    index: true
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    trim: true,
    maxlength: [100, 'Action cannot exceed 100 characters'],
    index: true
  },
  resourceType: {
    type: String,
    required: [true, 'Resource type is required'],
    trim: true,
    maxlength: [50, 'Resource type cannot exceed 50 characters'],
    index: true
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  details: {
    before: {
      type: Schema.Types.Mixed
    },
    after: {
      type: Schema.Types.Mixed
    },
    changes: {
      type: Schema.Types.Mixed
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  ipAddress: {
    type: String,
    required: true,
    trim: true
  },
  userAgent: {
    type: String,
    required: true,
    trim: true
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info',
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
AuditLogSchema.index({ merchantId: 1, timestamp: -1 });
AuditLogSchema.index({ merchantId: 1, action: 1, timestamp: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ merchantUserId: 1, timestamp: -1 });
AuditLogSchema.index({ severity: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

// Auto-delete logs older than 1 year (configurable retention)
AuditLogSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 } // 1 year default
);

// Static method to create audit log
AuditLogSchema.statics.log = async function(data: {
  merchantId: string | Types.ObjectId;
  merchantUserId?: string | Types.ObjectId;
  action: string;
  resourceType: string;
  resourceId?: string | Types.ObjectId;
  details?: {
    before?: any;
    after?: any;
    changes?: any;
    metadata?: any;
  };
  ipAddress: string;
  userAgent: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}) {
  try {
    const log = new this({
      merchantId: data.merchantId,
      merchantUserId: data.merchantUserId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      details: data.details || {},
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      severity: data.severity || 'info',
      timestamp: new Date()
    });

    // Save asynchronously without waiting
    setImmediate(() => {
      log.save().catch((error) => {
        logger.error('❌ [AUDIT] Failed to create log:', error);
      });
    });

    return log;
  } catch (error) {
    logger.error('❌ [AUDIT] Failed to create log:', error);
    // Don't throw error - audit logging should never break the main flow
    return null;
  }
};

// Static method to get merchant activity
AuditLogSchema.statics.getMerchantActivity = async function(
  merchantId: string | Types.ObjectId,
  options?: {
    limit?: number;
    skip?: number;
    resourceType?: string;
    action?: string;
    severity?: string;
    merchantUserId?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const query: any = { merchantId };

  if (options?.resourceType) {
    query.resourceType = options.resourceType;
  }

  if (options?.action) {
    query.action = options.action;
  }

  if (options?.severity) {
    query.severity = options.severity;
  }

  if (options?.merchantUserId) {
    query.merchantUserId = options.merchantUserId;
  }

  if (options?.startDate || options?.endDate) {
    query.timestamp = {};
    if (options.startDate) {
      query.timestamp.$gte = options.startDate;
    }
    if (options.endDate) {
      query.timestamp.$lte = options.endDate;
    }
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options?.limit || 100)
    .skip(options?.skip || 0)
    .populate('merchantUserId', 'name email')
    .lean();
};

// Static method to get resource history
AuditLogSchema.statics.getResourceHistory = async function(
  resourceType: string,
  resourceId: string | Types.ObjectId,
  options?: {
    limit?: number;
    skip?: number;
  }
) {
  return this.find({ resourceType, resourceId })
    .sort({ timestamp: -1 })
    .limit(options?.limit || 50)
    .skip(options?.skip || 0)
    .populate('merchantUserId', 'name email')
    .lean();
};

export interface IAuditLogModel extends mongoose.Model<IAuditLog> {
  log(data: {
    merchantId: string | Types.ObjectId;
    merchantUserId?: string | Types.ObjectId;
    action: string;
    resourceType: string;
    resourceId?: string | Types.ObjectId;
    details?: {
      before?: any;
      after?: any;
      changes?: any;
      metadata?: any;
    };
    ipAddress: string;
    userAgent: string;
    severity?: 'info' | 'warning' | 'error' | 'critical';
  }): Promise<IAuditLog | null>;

  getMerchantActivity(
    merchantId: string | Types.ObjectId,
    options?: {
      limit?: number;
      skip?: number;
      resourceType?: string;
      action?: string;
      severity?: string;
      merchantUserId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<IAuditLog[]>;

  getResourceHistory(
    resourceType: string,
    resourceId: string | Types.ObjectId,
    options?: {
      limit?: number;
      skip?: number;
    }
  ): Promise<IAuditLog[]>;
}

const AuditLog = mongoose.model<IAuditLog, IAuditLogModel>('AuditLog', AuditLogSchema);

export default AuditLog;
