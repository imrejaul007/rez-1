/**
 * Merchant Growth Routes
 * Phase 3.2 — Merchant-Driven Growth
 *
 * GET  /api/merchant/growth/metrics          — growth KPIs for a store
 * GET  /api/merchant/growth/loyal-customers  — users with 3+ visits
 * GET  /api/merchant/growth/customer-trend   — monthly REZ vs total customers
 * GET  /api/merchant/growth/push-status      — weekly push usage
 * POST /api/merchant/growth/push             — send push to loyal customers
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import merchantGrowthService from '../merchantservices/MerchantGrowthService';
import { logger } from '../config/logger';

const router = Router();

// Fixed: All merchant growth routes require merchant auth - Phase 0
router.use(authMiddleware);

// ---------------------------------------------------------------------------
// Helper: wrap async route handlers
// ---------------------------------------------------------------------------
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// ---------------------------------------------------------------------------
// GET /api/merchant/growth/metrics
// ---------------------------------------------------------------------------
router.get(
  '/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId: string = (req as any).merchant?._id?.toString() ?? (req as any).user?._id?.toString();
    const { storeId } = req.query;

    if (!storeId || typeof storeId !== 'string') {
      res.status(400).json({ success: false, message: 'storeId query param is required' });
      return;
    }

    const metrics = await merchantGrowthService.getGrowthMetrics(merchantId, storeId);
    res.json({ success: true, data: metrics });
  }),
);

// ---------------------------------------------------------------------------
// GET /api/merchant/growth/loyal-customers
// ---------------------------------------------------------------------------
router.get(
  '/loyal-customers',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId, minVisits, limit } = req.query;

    if (!storeId || typeof storeId !== 'string') {
      res.status(400).json({ success: false, message: 'storeId query param is required' });
      return;
    }

    const parsedMinVisits = minVisits ? parseInt(minVisits as string, 10) : 3;
    const parsedLimit = limit ? parseInt(limit as string, 10) : 50;

    if (isNaN(parsedMinVisits) || parsedMinVisits < 1) {
      res.status(400).json({ success: false, message: 'minVisits must be a positive integer' });
      return;
    }
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 200) {
      res.status(400).json({ success: false, message: 'limit must be between 1 and 200' });
      return;
    }

    const customers = await merchantGrowthService.getLoyalCustomers(storeId, parsedMinVisits, parsedLimit);
    res.json({ success: true, data: customers });
  }),
);

// ---------------------------------------------------------------------------
// GET /api/merchant/growth/customer-trend
// ---------------------------------------------------------------------------
router.get(
  '/customer-trend',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId, months } = req.query;

    if (!storeId || typeof storeId !== 'string') {
      res.status(400).json({ success: false, message: 'storeId query param is required' });
      return;
    }

    const parsedMonths = months ? parseInt(months as string, 10) : 6;
    if (isNaN(parsedMonths) || parsedMonths < 1 || parsedMonths > 24) {
      res.status(400).json({ success: false, message: 'months must be between 1 and 24' });
      return;
    }

    const trend = await merchantGrowthService.getCustomerTrend(storeId, parsedMonths);
    res.json({ success: true, data: trend });
  }),
);

// ---------------------------------------------------------------------------
// GET /api/merchant/growth/push-status
// ---------------------------------------------------------------------------
router.get(
  '/push-status',
  asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.query;

    if (!storeId || typeof storeId !== 'string') {
      res.status(400).json({ success: false, message: 'storeId query param is required' });
      return;
    }

    const status = await merchantGrowthService.getPushStatus(storeId);
    res.json({ success: true, data: status });
  }),
);

// ---------------------------------------------------------------------------
// POST /api/merchant/growth/push
// ---------------------------------------------------------------------------
router.post(
  '/push',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId: string = (req as any).merchant?._id?.toString() ?? (req as any).user?._id?.toString();

    const { storeId, message, template } = req.body;

    if (!storeId || typeof storeId !== 'string') {
      res.status(400).json({ success: false, message: 'storeId is required' });
      return;
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ success: false, message: 'message is required' });
      return;
    }
    if (message.length > 200) {
      res.status(400).json({
        success: false,
        message: 'message must be 200 characters or fewer',
      });
      return;
    }
    if (!template || typeof template !== 'string') {
      res.status(400).json({ success: false, message: 'template is required' });
      return;
    }

    const result = await merchantGrowthService.sendCustomerPush(merchantId, storeId, message.trim(), template);

    res.json({ success: true, data: result });
  }),
);

// ---------------------------------------------------------------------------
// Error handler scoped to this router
// ---------------------------------------------------------------------------
router.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error('[MerchantGrowthRoutes] Unhandled error:', err);

  if (err.message?.includes('Weekly push limit')) {
    res.status(429).json({ success: false, message: err.message });
    return;
  }
  if (err.message?.includes('required') || err.message?.includes('characters')) {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  res.status(500).json({ success: false, message: 'Internal server error' });
});

export default router;
