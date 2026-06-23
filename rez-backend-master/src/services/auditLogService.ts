import { logger } from '../config/logger';
import AuditLog from '../models/AuditLog';
import { Types } from 'mongoose';

export interface CreateAuditLogParams {
  merchantId?: string | Types.ObjectId;
  merchantUserId?: string | Types.ObjectId;
  userId?: string | Types.ObjectId; // For user-backend compatibility
  action: string;
  resourceType: string;
  resourceId?: string | Types.ObjectId;
  details?: {
    before?: any;
    after?: any;
    changes?: any;
    metadata?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  status?: string; // For backward compatibility
  metadata?: any; // For backward compatibility
}

/**
 * Create an audit log entry
 * Wraps the AuditLog model's log method
 * Note: AuditLog requires merchantId, so this will only work if merchantId is provided
 * For user-backend, this will log to console if merchantId is not available
 */
export const createAuditLog = async (params: CreateAuditLogParams): Promise<any> => {
  try {
    // If merchantId is not provided, log to console instead (user-backend case)
    if (!params.merchantId) {
      logger.info('[AUDIT LOG]', {
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        status: params.status,
        metadata: params.metadata || params.details?.metadata,
        timestamp: new Date().toISOString()
      });
      return null;
    }

    // Use merchantId if provided (merchant-backend case)
    return await AuditLog.log({
      merchantId: params.merchantId,
      merchantUserId: params.merchantUserId || params.userId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      details: params.details || {
        metadata: params.metadata,
        ...(params.status && { status: params.status })
      },
      ipAddress: params.ipAddress || 'unknown',
      userAgent: params.userAgent || 'unknown',
      severity: params.severity,
    });
  } catch (error) {
    logger.error('Error creating audit log:', error);
    // Don't throw - audit logging should never break the main flow
    return null;
  }
};

