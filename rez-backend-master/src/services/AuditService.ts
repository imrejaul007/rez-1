import { logger } from '../config/logger';
// Comprehensive Audit Service for Merchant Backend
// Tracks all merchant activities and changes

import AuditLog, { IAuditLog } from '../models/AuditLog';
import { Types } from 'mongoose';
import { Request } from 'express';
// SECURITY: xlsx (sheetjs) has unpatched CVEs. Use exceljs-backed shim.
import * as ExcelJS from 'exceljs';
import { detectChanges } from '../utils/changeDetector';
import { Lean } from '../types/lean';

export interface AuditLogParams {
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
}

export class AuditService {
  /**
   * Generic log method for creating audit entries
   */
  static async log(params: AuditLogParams): Promise<void> {
    try {
      await AuditLog.log({
        merchantId: params.merchantId,
        merchantUserId: params.merchantUserId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        details: params.details || {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        severity: params.severity || 'info'
      });
    } catch (error) {
      logger.error('❌ [AUDIT] Logging failed:', error);
      // Never throw - audit logging should not break the main flow
    }
  }

  /**
   * Log product-related changes
   */
  static async logProductChange(
    merchantId: string | Types.ObjectId,
    productId: string | Types.ObjectId,
    before: any,
    after: any,
    merchantUserId: string | Types.ObjectId | undefined,
    req: Request
  ): Promise<void> {
    const changes = detectChanges(before, after);

    await this.log({
      merchantId,
      merchantUserId,
      action: before ? 'product.updated' : 'product.created',
      resourceType: 'product',
      resourceId: productId,
      details: {
        before,
        after,
        changes,
        metadata: {
          changedFields: changes.map(c => c.field)
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });
  }

  /**
   * Log order-related changes
   */
  static async logOrderChange(
    merchantId: string | Types.ObjectId,
    orderId: string | Types.ObjectId,
    before: any,
    after: any,
    merchantUserId: string | Types.ObjectId | undefined,
    req: Request
  ): Promise<void> {
    const changes = detectChanges(before, after);
    const statusChanged = changes.find(c => c.field === 'status');

    await this.log({
      merchantId,
      merchantUserId,
      action: statusChanged ? 'order.status_changed' : 'order.updated',
      resourceType: 'order',
      resourceId: orderId,
      details: {
        before,
        after,
        changes,
        metadata: {
          previousStatus: statusChanged?.before,
          newStatus: statusChanged?.after
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: statusChanged?.after === 'cancelled' ? 'warning' : 'info'
    });
  }

  /**
   * Log store/merchant profile changes
   */
  static async logStoreChange(
    merchantId: string | Types.ObjectId,
    storeId: string | Types.ObjectId | undefined,
    before: any,
    after: any,
    merchantUserId: string | Types.ObjectId | undefined,
    req: Request
  ): Promise<void> {
    const changes = detectChanges(before, after);

    await this.log({
      merchantId,
      merchantUserId,
      action: before ? 'store.updated' : 'store.created',
      resourceType: 'store',
      resourceId: storeId,
      details: {
        before,
        after,
        changes
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });
  }

  /**
   * Log user/team member actions
   */
  static async logUserAction(
    merchantId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    action: string,
    details: any,
    req: Request
  ): Promise<void> {
    await this.log({
      merchantId,
      merchantUserId: userId,
      action,
      resourceType: 'user',
      resourceId: userId,
      details: { metadata: details },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: action.includes('removed') || action.includes('suspended') ? 'warning' : 'info'
    });
  }

  /**
   * Log security events
   */
  static async logSecurityEvent(
    merchantId: string | Types.ObjectId,
    event: string,
    details: any,
    req: Request
  ): Promise<void> {
    await this.log({
      merchantId,
      action: `security.${event}`,
      resourceType: 'security',
      details: { metadata: details },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: event.includes('failed') || event.includes('suspicious') ? 'critical' : 'warning'
    });
  }

  /**
   * Log API calls (for monitoring)
   */
  static async logApiCall(req: Request, res: any, duration: number): Promise<void> {
    // Only log important API calls, skip GET requests
    if (req.method === 'GET') return;

    const merchant = (req as any).merchant;
    if (!merchant) return;

    await this.log({
      merchantId: merchant._id,
      merchantUserId: (req as any).merchantUser?._id,
      action: `api.${req.method.toLowerCase()}`,
      resourceType: 'api',
      details: {
        metadata: {
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          body: this.sanitizeBody(req.body)
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: res.statusCode >= 400 ? 'error' : 'info'
    });
  }

  /**
   * Get audit logs with filtering
   */
  static async getAuditLogs(
    merchantId: string | Types.ObjectId,
    filters: {
      action?: string;
      resourceType?: string;
      resourceId?: string;
      merchantUserId?: string;
      severity?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ logs: IAuditLog[]; total: number; page: number; totalPages: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.getMerchantActivity(merchantId, {
      action: filters.action,
      resourceType: filters.resourceType,
      merchantUserId: filters.merchantUserId,
      severity: filters.severity,
      startDate: filters.startDate,
      endDate: filters.endDate,
      limit,
      skip
    });

    const total = await AuditLog.countDocuments({
      merchantId,
      ...(filters.action && { action: filters.action }),
      ...(filters.resourceType && { resourceType: filters.resourceType }),
      ...(filters.severity && { severity: filters.severity }),
      ...(filters.merchantUserId && { merchantUserId: filters.merchantUserId }),
      ...((filters.startDate || filters.endDate) && {
        timestamp: {
          ...(filters.startDate && { $gte: filters.startDate }),
          ...(filters.endDate && { $lte: filters.endDate })
        }
      })
    });

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Get resource history
   */
  static async getResourceHistory(
    resourceType: string,
    resourceId: string | Types.ObjectId
  ): Promise<IAuditLog[]> {
    return await AuditLog.getResourceHistory(resourceType, resourceId);
  }

  /**
   * Get user activity
   */
  static async getUserActivity(
    merchantUserId: string | Types.ObjectId,
    options?: {
      limit?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<Lean<IAuditLog>[]> {
    const query: any = { merchantUserId };

    if (options?.startDate || options?.endDate) {
      query.timestamp = {};
      if (options.startDate) {
        query.timestamp.$gte = options.startDate;
      }
      if (options.endDate) {
        query.timestamp.$lte = options.endDate;
      }
    }

    return await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(options?.limit || 100)
      .lean();
  }

  /**
   * Export audit logs to CSV or Excel
   */
  static async exportAuditLogs(
    merchantId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date,
    format: 'csv' | 'xlsx' = 'csv'
  ): Promise<Buffer> {
    const logs = await AuditLog.find({
      merchantId,
      timestamp: {
        $gte: startDate,
        $lte: endDate
      }
    })
      .sort({ timestamp: -1 })
        .populate('merchantUserId', 'name email')
          .lean();

    // Format data for export
    const data = logs.map(log => ({
      Timestamp: log.timestamp,
      Action: log.action,
      ResourceType: log.resourceType,
      ResourceId: log.resourceId?.toString() || '',
      User: (log.merchantUserId as any)?.name || 'System',
      UserEmail: (log.merchantUserId as any)?.email || '',
      IPAddress: log.ipAddress,
      Severity: log.severity,
      Changes: JSON.stringify(log.details?.changes || {}),
      Metadata: JSON.stringify(log.details?.metadata || {})
    }));

    // SECURITY: exceljs-backed buffer generation replaces the deprecated
    // xlsx package. The legacy xlsx.write({ type: 'buffer' }) was sync;
    // exceljs.xlsx.writeBuffer() is async, which is fine since this
    // function is already async.
    if (format === 'csv') {
      // Reconstruct CSV from the rows we already have.
      if (data.length === 0) return Buffer.from('', 'utf-8');
      const keys = Object.keys(data[0]);
      const lines = [keys.join(',')];
      for (const row of data) {
        lines.push(keys.map((k) => {
          const v = (row as any)[k];
          const s = v === null || v === undefined ? '' : String(v);
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        }).join(','));
      }
      return Buffer.from(lines.join('\n'), 'utf-8');
    }
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Audit Logs');
    if (data.length > 0) {
      sheet.columns = Object.keys(data[0]).map((key) => ({ header: key, key }));
      sheet.addRows(data);
    }
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Get audit statistics
   */
  static async getAuditStats(
    merchantId: string | Types.ObjectId,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const query: any = { merchantId };

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const [totalLogs, logsByAction, logsBySeverity, recentActivity] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      AuditLog.aggregate([
        { $match: query },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      AuditLog.find(query)
        .sort({ timestamp: -1 })
          .limit(10)
            .populate('merchantUserId', 'name email')
              .lean()
    ]);

    return {
      totalLogs,
      logsByAction: logsByAction.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      logsBySeverity: logsBySeverity.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {} as Record<string, number>),
      recentActivity
    };
  }

  /**
   * Sanitize request body (remove sensitive data)
   */
  private static sanitizeBody(body: any): any {
    if (!body) return {};

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'cvv'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Log authentication events
   */
  static async logAuth(
    merchantId: string | Types.ObjectId,
    action: 'login' | 'logout' | 'failed_login' | 'password_reset' | 'password_changed' | 'email_verified' | '2fa_enabled',
    details: any,
    req: Request
  ): Promise<void> {
    await this.log({
      merchantId,
      action: `auth.${action}`,
      resourceType: 'auth',
      details: { metadata: details },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: action === 'failed_login' ? 'warning' : 'info'
    });
  }

  /**
   * Log product deletion
   */
  static async logProductDeleted(
    merchantId: string | Types.ObjectId,
    productId: string | Types.ObjectId,
    productData: any,
    merchantUserId: string | Types.ObjectId | undefined,
    req: Request
  ): Promise<void> {
    await this.log({
      merchantId,
      merchantUserId,
      action: 'product.deleted',
      resourceType: 'product',
      resourceId: productId,
      details: {
        before: productData,
        metadata: {
          name: productData.name,
          sku: productData.sku
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'warning'
    });
  }

  /**
   * Log bulk operations
   */
  static async logBulkOperation(
    merchantId: string | Types.ObjectId,
    action: string,
    resourceType: string,
    count: number,
    merchantUserId: string | Types.ObjectId | undefined,
    req: Request
  ): Promise<void> {
    await this.log({
      merchantId,
      merchantUserId,
      action: `${resourceType}.${action}`,
      resourceType,
      details: {
        metadata: {
          operation: 'bulk',
          count,
          action
        }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: action.includes('delete') ? 'warning' : 'info'
    });
  }

  /**
   * Log settings changes
   */
  static async logSettingsChange(
    merchantId: string | Types.ObjectId,
    settingType: string,
    before: any,
    after: any,
    merchantUserId: string | Types.ObjectId | undefined,
    req: Request
  ): Promise<void> {
    const changes = detectChanges(before, after);

    await this.log({
      merchantId,
      merchantUserId,
      action: `settings.${settingType}_updated`,
      resourceType: 'settings',
      details: {
        before,
        after,
        changes
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: settingType === 'bank_details' ? 'warning' : 'info'
    });
  }
}

export default AuditService;
