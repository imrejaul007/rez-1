/**
 * Store Payment Controller — QR code section (Phase 6.2)
 *
 * Extracted from the original monolithic storePaymentController.ts. Handles:
 * - QR code generation, lookup, regeneration, toggle
 * - Per-table QR code setup and retrieval
 *
 * Settings section lives in storePaymentSettingsController.ts.
 * Payment flow (offers, initiate, confirm, cancel, etc.) lives in storePaymentFlowController.ts.
 */

import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { Store } from '../models/Store';
import { QRCodeService } from '../services/qrCodeService';
import { asyncHandler } from '../utils/asyncHandler';
import { withCache } from '../utils/cacheHelper';

/* resolveRootCategorySlug moved to storePaymentFlowController.ts (uses Category model which is only needed for flow) */
/* VALID_MAIN_CATEGORY_SLUGS moved to storePaymentFlowController.ts */

// ==================== QR CODE HANDLERS ====================

/**
 * Generate QR code for a store
 * POST /api/store-payment/generate-qr/:storeId
 */
export const generateStoreQR = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const merchantId = req.merchantId;

    // Verify store belongs to merchant
    const store = await withCache(
      `store:payment-config:${storeId}:${merchantId}`,
      300,
      () => Store.findOne({ _id: storeId, merchantId })
        .select('name isActive paymentSettings rewardRules storeQR category')
        .lean()
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    // Check if store already has a QR code
    if (store.storeQR?.code && store.storeQR?.qrImageUrl) {
      return res.status(200).json({
        success: true,
        message: 'QR code already exists',
        data: {
          code: store.storeQR.code,
          qrImageUrl: store.storeQR.qrImageUrl,
          isActive: store.storeQR.isActive,
          generatedAt: store.storeQR.generatedAt,
        },
      });
    }

    // Generate new QR code
    const result = await QRCodeService.generateStoreQR(storeId);

    res.status(201).json({
      success: true,
      message: 'QR code generated successfully',
      data: result,
    });
});

/**
 * Regenerate QR code for a store (invalidates old one)
 * POST /api/store-payment/regenerate-qr/:storeId
 */
export const regenerateQR = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const merchantId = req.merchantId;

    // Verify store belongs to merchant
    const store = await withCache(
      `store:payment-config:${storeId}:${merchantId}`,
      300,
      () => Store.findOne({ _id: storeId, merchantId })
        .select('name isActive paymentSettings rewardRules storeQR category')
        .lean()
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    // Regenerate QR code
    const result = await QRCodeService.regenerateStoreQR(storeId);

    res.status(200).json({
      success: true,
      message: 'QR code regenerated successfully. Old QR code is now invalid.',
      data: result,
    });
});

/**
 * Get QR code details for a store
 * GET /api/store-payment/qr/:storeId
 */
export const getStoreQRDetails = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const merchantId = req.merchantId;

    // Verify store belongs to merchant
    const store = await withCache(
      `store:payment-config:${storeId}:${merchantId}`,
      300,
      () => Store.findOne({ _id: storeId, merchantId })
        .select('name isActive paymentSettings rewardRules storeQR category')
        .lean()
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    const qrDetails = await QRCodeService.getStoreQRDetails(storeId);

    res.status(200).json({
      success: true,
      data: {
        storeName: store.name,
        ...qrDetails,
      },
    });
});

/**
 * Toggle QR code active status
 * PATCH /api/store-payment/qr/:storeId/toggle
 */
export const toggleQRStatus = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { isActive } = req.body;
    const merchantId = req.merchantId;

    // Verify store belongs to merchant
    const store = await withCache(
      `store:payment-config:${storeId}:${merchantId}`,
      300,
      () => Store.findOne({ _id: storeId, merchantId })
        .select('name isActive paymentSettings rewardRules storeQR category')
        .lean()
    );

    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found or you do not have permission to access it',
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value',
      });
    }

    if (isActive) {
      await QRCodeService.activateQR(storeId);
    } else {
      await QRCodeService.deactivateQR(storeId);
    }

    res.status(200).json({
      success: true,
      message: `QR code ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive },
    });
});

/**
 * Lookup store by QR code (for customers)
 * POST /api/store-payment/lookup (authenticated)
 * GET /api/store-payment/lookup/:qrCode (public)
 */
export const lookupStoreByQR = asyncHandler(async (req: Request, res: Response) => {
    // Get QR code from body or params
    const qrCode = req.body?.qrCode || req.params?.qrCode;

    if (!qrCode) {
      return res.status(400).json({
        success: false,
        message: 'QR code is required',
      });
    }

    // Validate QR code format
    if (!QRCodeService.isValidQRCode(qrCode)) {
      logger.warn(`[QR_INVALID_FORMAT] qrCode=${qrCode?.substring(0, 50)} ip=${req.ip}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid QR code format',
      });
    }

    // Lookup store
    const result = await QRCodeService.lookupStoreByQR(qrCode);

    if (!result.success) {
      logger.warn(`[QR_LOOKUP_FAILED] qrCode=${qrCode} error=${result.error || 'Store not found'} ip=${req.ip}`);
      return res.status(404).json({
        success: false,
        message: result.error || 'Store not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result.store,
    });
});


// ==================== PER-TABLE QR CODE HANDLERS ====================


/**
 * POST /api/store-payment/table-qr/:storeId/setup
 * Merchant sets up tables and generates QR codes for each.
 */
export const setupTableQRCodes = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const merchantId = (req as any).merchant?._id?.toString();
  const { tables } = req.body;

  if (!tables || !Array.isArray(tables) || tables.length === 0) {
    return res.status(400).json({ success: false, message: 'tables array is required' });
  }
  if (tables.length > 50) {
    return res.status(400).json({ success: false, message: 'Maximum 50 tables supported' });
  }

  const store = await Store.findOne({ _id: storeId, merchant: merchantId });
  if (!store) {
    return res.status(404).json({ success: false, message: 'Store not found' });
  }

  const generatedTables = [];

  for (const t of tables) {
    if (!t.tableNumber) continue;

    const qrData = JSON.stringify({
      type: 'REZ_DINE_IN',
      version: '1',
      storeId,
      storeName: store.name,
      tableNumber: t.tableNumber,
      timestamp: Date.now(),
    });

    let qrCodeUrl = '';
    try {
      qrCodeUrl = await QRCodeService.generateQRImage(qrData);
    } catch (err) {
      logger.warn(`[TABLE QR] Failed to generate QR image for table ${t.tableNumber}:`, err);
    }

    generatedTables.push({
      tableNumber: t.tableNumber,
      capacity: t.capacity || 4,
      qrCodeUrl,
      qrData,
      isActive: true,
    });
  }

  (store as any).bookingConfig = {
    ...((store as any).bookingConfig || {}),
    tables: generatedTables,
    tableCount: generatedTables.length,
    enabled: true,
  };
  store.markModified('bookingConfig');
  await store.save();

  res.status(201).json({
    success: true,
    data: { storeId, tables: generatedTables, count: generatedTables.length },
    message: `${generatedTables.length} table QR codes generated`,
  });
});

/**
 * GET /api/store-payment/table-qr/:storeId
 * Get all tables and their QR codes for a store.
 */
export const getTableQRCodes = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const merchantId = (req as any).merchant?._id?.toString();

  const store = await Store.findOne({ _id: storeId, merchant: merchantId })
    .select('name bookingConfig.tables bookingConfig.tableCount bookingConfig.enabled')
    .lean();

  if (!store) {
    return res.status(404).json({ success: false, message: 'Store not found' });
  }

  const tables = (store as any).bookingConfig?.tables || [];
  res.json({ success: true, data: { tables, tableCount: tables.length } });
});
