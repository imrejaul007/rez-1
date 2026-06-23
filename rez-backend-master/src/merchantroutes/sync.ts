import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { SyncService } from '../merchantservices/SyncService';
import { logger } from '../config/logger';

const router = Router();

// Helper function to validate merchantId
const validateMerchantId = (req: Request, res: Response): string | null => {
  const merchantId = req.merchantId;
  if (!merchantId) {
    res.status(401).json({
      success: false,
      message: 'Merchant ID not found'
    });
    return null;
  }
  return merchantId;
};

// All routes require authentication
router.use(authMiddleware);

// @route   POST /api/sync/trigger
// @desc    Trigger manual sync to customer app
// @access  Private
router.post('/trigger', async (req, res) => {
  try {
    const merchantId = validateMerchantId(req, res);
    if (!merchantId) return;

    const { 
      syncTypes = ['products', 'orders', 'cashback', 'merchant'],
      batchSize = 100,
      forceFullSync = false 
    } = req.body;

    if (forceFullSync) {
      const result = await SyncService.forceFullSync(merchantId);
      return res.json({
        success: true,
        data: result,
        message: 'Full sync completed successfully'
      });
    }

    // Get last sync date
    const syncStatus = SyncService.getSyncStatus(merchantId);
    const lastSync = syncStatus.lastSync?.syncedAt;

    const result = await SyncService.syncToCustomerApp({
      merchantId,
      lastSync,
      syncTypes,
      batchSize
    });

    return res.json({
      success: true,
      data: result,
      message: 'Sync completed successfully'
    });

  } catch (error) {
    logger.error('Error triggering sync:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to trigger sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/sync/status
// @desc    Get sync status for merchant
// @access  Private
router.get('/status', async (req, res) => {
  try {
    const merchantId = validateMerchantId(req, res);
    if (!merchantId) return;
    
    const status = SyncService.getSyncStatus(merchantId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/sync/history
// @desc    Get sync history for merchant
// @access  Private
router.get('/history', async (req, res) => {
  try {
    const merchantId = validateMerchantId(req, res);
    if (!merchantId) return;
    
    const { limit = '10' } = req.query;
    
    const history = SyncService.getSyncHistory(merchantId, parseInt(limit as string));

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    logger.error('Error getting sync history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/sync/schedule
// @desc    Schedule auto-sync for merchant
// @access  Private
router.post('/schedule', async (req, res) => {
  try {
    const merchantId = validateMerchantId(req, res);
    if (!merchantId) return;
    const { intervalMinutes = 15 } = req.body;

    if (intervalMinutes < 5 || intervalMinutes > 1440) { // 5 minutes to 24 hours
      return res.status(400).json({
        success: false,
        message: 'Interval must be between 5 minutes and 24 hours'
      });
    }

    SyncService.scheduleAutoSync(merchantId, intervalMinutes);

    return res.json({
      success: true,
      message: `Auto-sync scheduled every ${intervalMinutes} minutes`,
      data: {
        merchantId,
        intervalMinutes,
        nextSync: new Date(Date.now() + intervalMinutes * 60 * 1000)
      }
    });

  } catch (error) {
    logger.error('Error scheduling auto-sync:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule auto-sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   DELETE /api/sync/schedule
// @desc    Clear auto-sync for merchant
// @access  Private
router.delete('/schedule', async (req, res) => {
  try {
    const merchantId = validateMerchantId(req, res);
    if (!merchantId) return;
    
    SyncService.clearAutoSync(merchantId);

    res.json({
      success: true,
      message: 'Auto-sync cleared successfully'
    });

  } catch (error) {
    logger.error('Error clearing auto-sync:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear auto-sync',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/sync/statistics
// @desc    Get overall sync statistics
// @access  Private
router.get('/statistics', async (req, res) => {
  try {
    const stats = SyncService.getSyncStatistics();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting sync statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sync statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/sync/products
// @desc    Sync only products to customer app
// @access  Private
router.post('/products', async (req, res) => {
  try {
    const merchantId = validateMerchantId(req, res);
    if (!merchantId) return;
    const { batchSize = 100 } = req.body;

    const result = await SyncService.syncToCustomerApp({
      merchantId,
      syncTypes: ['products'],
      batchSize
    });

    res.json({
      success: true,
      data: result,
      message: 'Products synced successfully'
    });

  } catch (error) {
    logger.error('Error syncing products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync products',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/sync/orders
// @desc    Sync only orders to customer app
// @access  Private
router.post('/orders', async (req, res) => {
  try {
    const merchantId = validateMerchantId(req, res);
    if (!merchantId) return;
    const { batchSize = 100 } = req.body;

    const result = await SyncService.syncToCustomerApp({
      merchantId,
      syncTypes: ['orders'],
      batchSize
    });

    res.json({
      success: true,
      data: result,
      message: 'Orders synced successfully'
    });

  } catch (error) {
    logger.error('Error syncing orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/sync/cashback
// @desc    Sync only cashback to customer app
// @access  Private
router.post('/cashback', async (req, res) => {
  try {
    const merchantId = validateMerchantId(req, res);
    if (!merchantId) return;
    const { batchSize = 100 } = req.body;

    const result = await SyncService.syncToCustomerApp({
      merchantId,
      syncTypes: ['cashback'],
      batchSize
    });

    res.json({
      success: true,
      data: result,
      message: 'Cashback data synced successfully'
    });

  } catch (error) {
    logger.error('Error syncing cashback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync cashback data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   POST /api/sync/merchant
// @desc    Sync only merchant profile to customer app
// @access  Private
router.post('/merchant', async (req, res) => {
  try {
    const merchantId = validateMerchantId(req, res);
    if (!merchantId) return;

    const result = await SyncService.syncToCustomerApp({
      merchantId,
      syncTypes: ['merchant'],
      batchSize: 1
    });

    res.json({
      success: true,
      data: result,
      message: 'Merchant profile synced successfully'
    });

  } catch (error) {
    logger.error('Error syncing merchant profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync merchant profile',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// @route   GET /api/sync/health
// @desc    Check sync service health
// @access  Private
router.get('/health', async (req, res) => {
  try {
    const stats = SyncService.getSyncStatistics();
    const merchantId = validateMerchantId(req, res);
    if (!merchantId) return;
    const status = SyncService.getSyncStatus(merchantId);

    const health = {
      service: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date(),
      stats,
      merchantStatus: status,
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Error checking sync health:', error);
    res.status(500).json({
      success: false,
      message: 'Sync service health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;