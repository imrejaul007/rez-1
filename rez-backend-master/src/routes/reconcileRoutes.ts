// @ts-nocheck
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware as authenticateMerchant } from '../middleware/merchantauth';
import {
  getOrCreateReconciliation,
  submitCashEntry,
  lockReconciliation,
  exportReconciliationCSV,
} from '../services/reconcileService';
import { logger } from '../config/logger';

const router = Router();

// All routes require merchant authentication
router.use(authenticateMerchant);

/**
 * GET /api/reconcile/:storeSlug/:date
 * Returns reconciliation data for a store on a specific date.
 */
router.get(
  '/:storeSlug/:date',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug, date } = req.params;

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
      });
    }

    try {
      const result = await getOrCreateReconciliation(storeSlug, date);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      logger.error('[reconcileRoutes] GET error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  }),
);

/**
 * POST /api/reconcile/:storeSlug/:date
 * Submit cash entry. Body: { cashAmount: number } (in paise)
 */
router.post(
  '/:storeSlug/:date',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug, date } = req.params;
    const { cashAmount } = req.body as { cashAmount?: number };

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
      });
    }

    if (typeof cashAmount !== 'number' || cashAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'cashAmount must be a non-negative number (in paise)',
      });
    }

    try {
      const result = await submitCashEntry(storeSlug, date, cashAmount);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      logger.error('[reconcileRoutes] POST error:', err);
      if (err.message?.includes('Cannot modify')) {
        return res.status(409).json({ success: false, message: err.message });
      }
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to submit cash entry',
      });
    }
  }),
);

/**
 * POST /api/reconcile/:storeSlug/:date/lock
 * Lock & reconcile the reconciliation record.
 */
router.post(
  '/:storeSlug/:date/lock',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug, date } = req.params;
    const merchantId = (req as any).merchantId || (req as any).merchant?._id?.toString();

    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
      });
    }

    try {
      const result = await lockReconciliation(storeSlug, date, merchantId);
      return res.json({ success: true, data: result });
    } catch (err: any) {
      logger.error('[reconcileRoutes] POST lock error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to lock reconciliation',
      });
    }
  }),
);

/**
 * GET /api/reconcile/:storeSlug/:date/export
 * Returns CSV export of the reconciliation data.
 */
router.get(
  '/:storeSlug/:date/export',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug, date } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
      });
    }

    try {
      const csv = await exportReconciliationCSV(storeSlug, date);
      const filename = `reconciliation-${storeSlug}-${date}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(csv);
    } catch (err: any) {
      logger.error('[reconcileRoutes] GET export error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to export reconciliation',
      });
    }
  }),
);

export default router;
