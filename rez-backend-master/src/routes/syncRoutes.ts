import { Router } from 'express';
import { MerchantUserSyncService } from '../services/MerchantUserSyncService';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/sync/status
// Get sync status for the system
router.get('/status', asyncHandler(async (req, res) => {
  const status = await MerchantUserSyncService.getSyncStatus();
  
  if (!status) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get sync status'
    });
  }

  return res.json({
    success: true,
    data: status,
    message: 'Sync status retrieved successfully'
  });
}));

// POST /api/sync/merchants
// Sync all merchants to create stores
router.post('/merchants', asyncHandler(async (req, res) => {
  await MerchantUserSyncService.syncAllMerchantsToStores();
  const status = await MerchantUserSyncService.getSyncStatus();
  
  return res.json({
    success: true,
    message: 'Merchants synced to stores successfully',
    data: status
  });
}));

// POST /api/sync/products
// Sync all merchant products to user-side products
router.post('/products', asyncHandler(async (req, res) => {
  await MerchantUserSyncService.syncAllMerchantProductsToUserProducts();
  const status = await MerchantUserSyncService.getSyncStatus();
  
  return res.json({
    success: true,
    message: 'Merchant products synced to user products successfully',
    data: status
  });
}));

// POST /api/sync/full
// Perform full sync of merchants and products
router.post('/full', asyncHandler(async (req, res) => {
  await MerchantUserSyncService.forceFullSync();
  const status = await MerchantUserSyncService.getSyncStatus();
  
  return res.json({
    success: true,
    message: 'Full sync completed successfully',
    data: status
  });
}));

export default router;