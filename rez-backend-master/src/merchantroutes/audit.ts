// Audit Logs API Routes
// Provides access to audit logs and activity tracking

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import AuditService from '../services/AuditService';
import ActivityTimelineService from '../services/ActivityTimelineService';
import AuditRetentionService from '../services/AuditRetentionService';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/merchant/audit/logs
 * Get audit logs with filtering
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    if (!merchant || !merchant._id) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    const filters = {
      action: req.query.action as string,
      resourceType: req.query.resourceType as string,
      resourceId: req.query.resourceId as string,
      merchantUserId: req.query.userId as string,
      severity: req.query.severity as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50
    };

    const result = await AuditService.getAuditLogs(merchant._id, filters);

    // Ensure logs is always an array
    const logsArray = Array.isArray(result?.logs) ? result.logs : [];

    return res.status(200).json({
      success: true,
      data: {
        logs: logsArray,
        total: result?.total ?? 0,
        page: result?.page ?? 1,
        totalPages: result?.totalPages ?? 0
      }
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit logs',
      ...(process.env.NODE_ENV === 'development' && { error: (error as Error).message })
    });
  }
});

/**
 * GET /api/merchant/audit/resource/:resourceType/:resourceId
 * Get audit history for specific resource
 */
router.get('/resource/:resourceType/:resourceId', async (req: Request, res: Response) => {
  try {
    const { resourceType, resourceId } = req.params;

    const history = await AuditService.getResourceHistory(resourceType, resourceId);

    res.json({
      success: true,
      data: {
        resourceType,
        resourceId,
        history,
        count: history.length
      }
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get resource history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve resource history',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/merchant/audit/user/:userId
 * Get activity for specific user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const options = {
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const activity = await AuditService.getUserActivity(userId, options);

    res.json({
      success: true,
      data: {
        userId,
        activity,
        count: activity.length
      }
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user activity',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/merchant/audit/stats
 * Get audit statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const stats = await AuditService.getAuditStats(merchant._id, startDate, endDate);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audit statistics',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/merchant/audit/export
 * Export audit logs to CSV/Excel
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    if (!merchant || !merchant._id) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const format = (req.query.format as string) || 'csv';

    // Check if format is JSON (for API response) or file download
    if (format === 'json' || req.query.download !== 'true') {
      // Return JSON response
      const result = await AuditService.getAuditLogs(merchant._id, {
        startDate,
        endDate,
        page: 1,
        limit: 1000
      });

      return res.status(200).json({
        success: true,
        message: 'Export data retrieved successfully',
        data: {
          logs: Array.isArray(result?.logs) ? result.logs : [],
          total: result?.total ?? 0,
          startDate,
          endDate
        }
      });
    }

    // File download
    const buffer = await AuditService.exportAuditLogs(merchant._id, startDate, endDate, format as 'csv' | 'xlsx');

    const filename = `audit_logs_${merchant._id}_${Date.now()}.${format}`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    return res.send(buffer);
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to export logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
      ...(process.env.NODE_ENV === 'development' && { error: (error as Error).message })
    });
  }
});

/**
 * GET /api/merchant/audit/timeline
 * Get activity timeline
 */
router.get('/timeline', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;

    const filters = {
      merchantId: merchant._id,
      merchantUserId: req.query.userId as string,
      resourceType: req.query.resourceType as string,
      action: req.query.action as string,
      severity: req.query.severity as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100
    };

    const timeline = await ActivityTimelineService.getTimeline(filters);

    res.json({
      success: true,
      data: timeline
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get timeline:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve activity timeline',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/merchant/audit/timeline/today
 * Get today's activities
 */
router.get('/timeline/today', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;

    const activities = await ActivityTimelineService.getTodayActivities(merchant._id);

    res.json({
      success: true,
      data: {
        date: new Date().toISOString().split('T')[0],
        activities,
        count: activities.length
      }
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get today\'s activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve today\'s activities',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/merchant/audit/timeline/recent
 * Get recent activities
 */
router.get('/timeline/recent', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const activities = await ActivityTimelineService.getRecentActivities(merchant._id, limit);

    res.json({
      success: true,
      data: {
        activities,
        count: activities.length
      }
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get recent activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recent activities',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/merchant/audit/timeline/summary
 * Get activity summary for period
 */
router.get('/timeline/summary', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const summary = await ActivityTimelineService.getActivitySummary(merchant._id, startDate, endDate);

    res.json({
      success: true,
      data: {
        period: {
          start: startDate,
          end: endDate
        },
        summary
      }
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get activity summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve activity summary',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/merchant/audit/timeline/critical
 * Get critical activities
 */
router.get('/timeline/critical', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const activities = await ActivityTimelineService.getCriticalActivities(merchant._id, limit);

    res.json({
      success: true,
      data: {
        activities,
        count: activities.length
      }
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get critical activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve critical activities',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/merchant/audit/timeline/heatmap
 * Get activity heatmap
 */
router.get('/timeline/heatmap', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const heatmap = await ActivityTimelineService.getActivityHeatmap(merchant._id, startDate, endDate);

    res.json({
      success: true,
      data: {
        period: {
          start: startDate,
          end: endDate
        },
        heatmap
      }
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get activity heatmap:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve activity heatmap',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/merchant/audit/activity
 * Get activity logs (alias for logs)
 */
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    if (!merchant || !merchant._id) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    const filters = {
      action: req.query.action as string,
      resourceType: req.query.resourceType as string,
      merchantUserId: req.query.userId as string,
      severity: req.query.severity as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100
    };

    const result = await AuditService.getAuditLogs(merchant._id, { ...filters, page: 1 });

    // Return just the logs array
    const logsArray = Array.isArray(result?.logs) ? result.logs : [];

    return res.status(200).json({
      success: true,
      data: logsArray
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve activity',
      ...(process.env.NODE_ENV === 'development' && { error: (error as Error).message })
    });
  }
});

/**
 * GET /api/merchant/audit/search
 * Search audit logs
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    if (!merchant || !merchant._id) {
      return res.status(400).json({ success: false, message: 'Merchant ID required' });
    }

    const searchTerm = req.query.q as string;

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const filters = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      resourceType: req.query.resourceType as string
    };

    const results = await ActivityTimelineService.searchActivities(merchant._id, searchTerm, filters);

    return res.status(200).json({
      success: true,
      data: {
        searchTerm,
        results: Array.isArray(results) ? results : [],
        count: Array.isArray(results) ? results.length : 0
      }
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to search activities:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search activities',
      ...(process.env.NODE_ENV === 'development' && { error: (error as Error).message })
    });
  }
});

/**
 * GET /api/merchant/audit/retention/stats
 * Get storage and retention stats
 */
router.get('/retention/stats', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;

    const stats = await AuditRetentionService.getStorageStats(merchant._id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get retention stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve retention statistics',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/merchant/audit/retention/compliance
 * Get compliance report
 */
router.get('/retention/compliance', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;

    const report = await AuditRetentionService.getComplianceReport(merchant._id);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get compliance report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve compliance report',
      error: (error as Error).message
    });
  }
});

/**
 * POST /api/merchant/audit/retention/cleanup
 * Manually trigger cleanup
 */
router.post('/retention/cleanup', async (req: Request, res: Response) => {
  try {
    const merchant = (req as any).merchant;
    const retentionDays = req.body.retentionDays || 365;
    const autoArchive = req.body.autoArchive !== false;

    const result = await AuditRetentionService.cleanupLogs(merchant._id, retentionDays, autoArchive);

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to cleanup logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup logs',
      error: (error as Error).message
    });
  }
});

/**
 * GET /api/merchant/audit/retention/archives
 * Get list of archived files
 */
router.get('/retention/archives', async (req: Request, res: Response) => {
  try {
    const archives = await AuditRetentionService.getArchiveList();

    res.json({
      success: true,
      data: {
        archives,
        count: archives.length
      }
    });
  } catch (error) {
    logger.error('❌ [AUDIT API] Failed to get archive list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve archive list',
      error: (error as Error).message
    });
  }
});

export default router;
