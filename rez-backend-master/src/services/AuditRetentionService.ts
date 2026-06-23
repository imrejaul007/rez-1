import { logger } from '../config/logger';
// Audit Retention Service
// Manages audit log retention, archival, and cleanup

import AuditLog from '../models/AuditLog';
import { Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
// SECURITY: xlsx (sheetjs) has unpatched CVEs. Use exceljs-backed shim.
import { writeExcelAsync } from '../utils/xlsxCompat';

export interface RetentionPolicy {
  merchantId: string | Types.ObjectId;
  retentionDays: number; // How long to keep logs
  autoArchive: boolean; // Archive before deletion
  archivePath?: string; // Where to store archives
}

export class AuditRetentionService {
  // Default retention period (1 year)
  private static DEFAULT_RETENTION_DAYS = 365;

  // Archive directory
  private static ARCHIVE_DIR = path.join(process.cwd(), 'archives', 'audit-logs');

  /**
   * Initialize archive directory
   */
  static async initialize(): Promise<void> {
    try {
      if (!fs.existsSync(this.ARCHIVE_DIR)) {
        fs.mkdirSync(this.ARCHIVE_DIR, { recursive: true });
        logger.info('✅ [RETENTION] Archive directory created:', this.ARCHIVE_DIR);
      }
    } catch (error) {
      logger.error('❌ [RETENTION] Failed to create archive directory:', error);
    }
  }

  /**
   * Archive old logs before deletion
   */
  static async archiveOldLogs(
    merchantId: string | Types.ObjectId,
    olderThan: Date
  ): Promise<string | null> {
    try {
      const logs = await AuditLog.find({
        merchantId,
        timestamp: { $lt: olderThan }
      })
        .sort({ timestamp: -1 })
        .lean();

      if (logs.length === 0) {
        logger.info('ℹ️ [RETENTION] No logs to archive for merchant:', merchantId);
        return null;
      }

      // Format data for export
      const data = logs.map(log => ({
        Timestamp: log.timestamp,
        MerchantId: log.merchantId?.toString(),
        UserId: log.merchantUserId?.toString() || '',
        Action: log.action,
        ResourceType: log.resourceType,
        ResourceId: log.resourceId?.toString() || '',
        IPAddress: log.ipAddress,
        UserAgent: log.userAgent,
        Severity: log.severity,
        DetailsBefore: JSON.stringify(log.details?.before || {}),
        DetailsAfter: JSON.stringify(log.details?.after || {}),
        DetailsChanges: JSON.stringify(log.details?.changes || {}),
        DetailsMetadata: JSON.stringify(log.details?.metadata || {})
      }));

      // SECURITY: exceljs-backed write replaces the deprecated xlsx package.
      const filename = `audit_logs_${merchantId}_${Date.now()}.xlsx`;
      const filepath = path.join(this.ARCHIVE_DIR, filename);

      // Generate filename + write file via the compat shim
      await writeExcelAsync(filepath, 'Audit Logs', data);

      logger.info(`✅ [RETENTION] Archived ${logs.length} logs to:`, filepath);

      return filepath;
    } catch (error) {
      logger.error('❌ [RETENTION] Failed to archive logs:', error);
      return null;
    }
  }

  /**
   * Delete old logs
   */
  static async deleteOldLogs(
    merchantId: string | Types.ObjectId,
    olderThan: Date
  ): Promise<number> {
    try {
      const result = await AuditLog.deleteMany({
        merchantId,
        timestamp: { $lt: olderThan }
      });

      logger.info(`✅ [RETENTION] Deleted ${result.deletedCount} old logs for merchant:`, merchantId);

      return result.deletedCount || 0;
    } catch (error) {
      logger.error('❌ [RETENTION] Failed to delete old logs:', error);
      return 0;
    }
  }

  /**
   * Clean up logs (archive + delete)
   */
  static async cleanupLogs(
    merchantId: string | Types.ObjectId,
    retentionDays: number = this.DEFAULT_RETENTION_DAYS,
    autoArchive: boolean = true
  ): Promise<{
    archived: boolean;
    archivePath: string | null;
    deleted: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      let archivePath: string | null = null;

      // Archive if enabled
      if (autoArchive) {
        archivePath = await this.archiveOldLogs(merchantId, cutoffDate);
      }

      // Delete old logs
      const deleted = await this.deleteOldLogs(merchantId, cutoffDate);

      return {
        archived: archivePath !== null,
        archivePath,
        deleted
      };
    } catch (error) {
      logger.error('❌ [RETENTION] Failed to cleanup logs:', error);
      return {
        archived: false,
        archivePath: null,
        deleted: 0
      };
    }
  }

  /**
   * Cleanup all merchants (scheduled task)
   */
  static async cleanupAllMerchants(
    retentionDays: number = this.DEFAULT_RETENTION_DAYS
  ): Promise<{
    total: number;
    succeeded: number;
    failed: number;
    results: Array<{
      merchantId: string;
      deleted: number;
      archived: boolean;
    }>;
  }> {
    try {
      // Get all unique merchant IDs
      const merchantIds = await AuditLog.distinct('merchantId');

      const results: Array<{
        merchantId: string;
        deleted: number;
        archived: boolean;
      }> = [];

      let succeeded = 0;
      let failed = 0;

      for (const merchantId of merchantIds) {
        try {
          const result = await this.cleanupLogs(merchantId, retentionDays, true);

          results.push({
            merchantId: merchantId.toString(),
            deleted: result.deleted,
            archived: result.archived
          });

          succeeded++;
        } catch (error) {
          logger.error('❌ [RETENTION] Failed to cleanup merchant:', merchantId, error);
          failed++;
        }
      }

      logger.info(`✅ [RETENTION] Cleanup complete: ${succeeded} succeeded, ${failed} failed`);

      return {
        total: merchantIds.length,
        succeeded,
        failed,
        results
      };
    } catch (error) {
      logger.error('❌ [RETENTION] Failed to cleanup all merchants:', error);
      return {
        total: 0,
        succeeded: 0,
        failed: 0,
        results: []
      };
    }
  }

  /**
   * Get storage stats
   */
  static async getStorageStats(
    merchantId?: string | Types.ObjectId
  ): Promise<{
    totalLogs: number;
    oldestLog: Date | null;
    newestLog: Date | null;
    estimatedSizeMB: number;
    byMonth: Array<{ month: string; count: number }>;
  }> {
    try {
      const query = merchantId ? { merchantId } : {};

      const [totalLogs, oldestLog, newestLog, byMonth] = await Promise.all([
        AuditLog.countDocuments(query),

        AuditLog.findOne(query).sort({ timestamp: 1 }).select('timestamp').lean(),

        AuditLog.findOne(query).sort({ timestamp: -1 }).select('timestamp').lean(),

        AuditLog.aggregate([
          { $match: query },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m', date: '$timestamp' }
              },
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: -1 } },
          { $limit: 12 }
        ])
      ]);

      // Estimate size (rough calculation: ~1KB per log entry)
      const estimatedSizeMB = (totalLogs * 1024) / (1024 * 1024);

      return {
        totalLogs,
        oldestLog: oldestLog?.timestamp || null,
        newestLog: newestLog?.timestamp || null,
        estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100,
        byMonth: byMonth.map(item => ({
          month: item._id,
          count: item.count
        }))
      };
    } catch (error) {
      logger.error('❌ [RETENTION] Failed to get storage stats:', error);
      return {
        totalLogs: 0,
        oldestLog: null,
        newestLog: null,
        estimatedSizeMB: 0,
        byMonth: []
      };
    }
  }

  /**
   * Get compliance report
   */
  static async getComplianceReport(
    merchantId: string | Types.ObjectId
  ): Promise<{
    merchantId: string;
    totalLogs: number;
    retentionPeriodDays: number;
    oldestLog: Date | null;
    logsToBeDeleted: number;
    nextCleanupDate: Date;
    complianceStatus: 'compliant' | 'warning' | 'non-compliant';
    recommendations: string[];
  }> {
    try {
      const stats = await this.getStorageStats(merchantId);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.DEFAULT_RETENTION_DAYS);

      const logsToBeDeleted = await AuditLog.countDocuments({
        merchantId,
        timestamp: { $lt: cutoffDate }
      });

      const nextCleanupDate = new Date();
      nextCleanupDate.setDate(nextCleanupDate.getDate() + 7); // Weekly cleanup

      const recommendations: string[] = [];
      let complianceStatus: 'compliant' | 'warning' | 'non-compliant' = 'compliant';

      // Check compliance
      if (logsToBeDeleted > 1000) {
        complianceStatus = 'warning';
        recommendations.push('Large number of logs pending deletion. Consider running cleanup.');
      }

      if (stats.estimatedSizeMB > 100) {
        complianceStatus = 'warning';
        recommendations.push('Audit logs consuming significant storage. Review retention policy.');
      }

      if (!stats.oldestLog || (new Date().getTime() - stats.oldestLog.getTime()) >
          (this.DEFAULT_RETENTION_DAYS * 2 * 24 * 60 * 60 * 1000)) {
        complianceStatus = 'non-compliant';
        recommendations.push('Logs older than retention policy detected. Immediate cleanup required.');
      }

      return {
        merchantId: merchantId.toString(),
        totalLogs: stats.totalLogs,
        retentionPeriodDays: this.DEFAULT_RETENTION_DAYS,
        oldestLog: stats.oldestLog,
        logsToBeDeleted,
        nextCleanupDate,
        complianceStatus,
        recommendations
      };
    } catch (error) {
      logger.error('❌ [RETENTION] Failed to generate compliance report:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic cleanup (call from cron job)
   */
  static async scheduleCleanup(): Promise<void> {
    logger.info('🔄 [RETENTION] Starting scheduled cleanup...');

    const result = await this.cleanupAllMerchants();

    logger.info('✅ [RETENTION] Scheduled cleanup completed:', result);
  }

  /**
   * Export archive list
   */
  static async getArchiveList(): Promise<Array<{
    filename: string;
    size: number;
    created: Date;
  }>> {
    try {
      await this.initialize();

      const files = fs.readdirSync(this.ARCHIVE_DIR);

      return files
        .filter(file => file.endsWith('.xlsx'))
        .map(file => {
          const filepath = path.join(this.ARCHIVE_DIR, file);
          const stats = fs.statSync(filepath);

          return {
            filename: file,
            size: stats.size,
            created: stats.birthtime
          };
        })
        .sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      logger.error('❌ [RETENTION] Failed to get archive list:', error);
      return [];
    }
  }
}

export default AuditRetentionService;
