/**
 * Admin: Cash Store Purchases Management Routes
 *
 * Endpoints for viewing, filtering, and managing affiliate purchases,
 * including flagged purchase review workflow.
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../../middleware/auth';
import { MallPurchase, PurchaseStatus } from '../../models/MallPurchase';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendError, sendNotFound, sendPaginated } from '../../utils/response';
import { logger } from '../../config/logger';

const router = Router();

// All routes require admin auth
router.use(authenticate);
router.use(requireAdmin);

// ─── GET /api/admin/cashstore/purchases ──────────────────────────────────────
// List all affiliate purchases with filters + pagination

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {};

  // Status filter
  const status = req.query.status as string;
  if (status && ['pending', 'confirmed', 'rejected', 'refunded', 'credited'].includes(status)) {
    query.status = status;
  }

  // Flagged filter
  if (req.query.flagged === 'true') {
    query.fraudFlags = { $exists: true, $ne: [] };
  }

  // Brand filter
  if (req.query.brandId) {
    query.brand = req.query.brandId;
  }

  // Date range filter
  if (req.query.startDate || req.query.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (req.query.startDate) dateFilter.$gte = new Date(req.query.startDate as string);
    if (req.query.endDate) dateFilter.$lte = new Date(req.query.endDate as string);
    query.purchasedAt = dateFilter;
  }

  const [purchases, total] = await Promise.all([
    MallPurchase.find(query)
      .sort({ purchasedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('brand', 'name slug logo')
      .populate('user', 'fullName phoneNumber email')
      .lean(),
    MallPurchase.countDocuments(query),
  ]);

  return sendPaginated(res, purchases, page, limit, total, 'Purchases fetched');
}));

// ─── GET /api/admin/cashstore/purchases/flagged ──────────────────────────────
// Get only flagged purchases for review

router.get('/flagged', asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = {
    fraudFlags: { $exists: true, $ne: [] },
  };

  // Only show actionable (pending/confirmed) flagged purchases by default
  const status = req.query.status as string;
  if (status && ['pending', 'confirmed', 'rejected', 'refunded', 'credited'].includes(status)) {
    query.status = status;
  } else if (req.query.showAll !== 'true') {
    query.status = { $in: ['pending', 'confirmed'] };
  }

  const [purchases, total] = await Promise.all([
    MallPurchase.find(query)
      .sort({ purchasedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('brand', 'name slug logo')
      .populate('user', 'fullName phoneNumber email')
      .lean(),
    MallPurchase.countDocuments(query),
  ]);

  return sendPaginated(res, purchases, page, limit, total, 'Flagged purchases fetched');
}));

// ─── GET /api/admin/cashstore/purchases/stats ────────────────────────────────
// Dashboard stats for purchases

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const [statusCounts, flaggedCount, totalCoinsAwarded] = await Promise.all([
    MallPurchase.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$orderAmount' }, totalCoins: { $sum: '$coinsAwarded' } } },
    ]),
    MallPurchase.countDocuments({ fraudFlags: { $exists: true, $ne: [] }, status: { $in: ['pending', 'confirmed'] } }),
    MallPurchase.aggregate([
      { $match: { status: 'credited' } },
      { $group: { _id: null, total: { $sum: '$coinsAwarded' } } },
    ]),
  ]);

  const stats: Record<string, { count: number; totalAmount: number; totalCoins: number }> = {};
  let totalPurchases = 0;
  let totalRevenue = 0;

  statusCounts.forEach((s: any) => {
    stats[s._id] = { count: s.count, totalAmount: s.totalAmount, totalCoins: s.totalCoins || 0 };
    totalPurchases += s.count;
    totalRevenue += s.totalAmount;
  });

  return sendSuccess(res, {
    totalPurchases,
    totalRevenue,
    totalCoinsAwarded: totalCoinsAwarded[0]?.total || 0,
    flaggedPending: flaggedCount,
    byStatus: stats,
  }, 'Purchase stats fetched');
}));

// ─── PATCH /api/admin/cashstore/purchases/:id/review ─────────────────────────
// Admin review a flagged purchase — approve or reject

router.patch('/:id/review', asyncHandler(async (req: Request, res: Response) => {
  const { action, reason } = req.body;

  if (!action || !['approve', 'reject'].includes(action)) {
    return sendError(res, 'action must be "approve" or "reject"', 400);
  }

  const purchase = await MallPurchase.findById(req.params.id);
  if (!purchase) return sendNotFound(res, 'Purchase not found');

  if (!['pending', 'confirmed'].includes(purchase.status)) {
    return sendError(res, `Cannot review a purchase with status "${purchase.status}"`, 400);
  }

  const adminUser = (req as any).user;
  const adminId = adminUser?.id || adminUser?._id || 'admin';

  if (action === 'approve') {
    // Clear fraud flags and confirm
    purchase.fraudFlags = [];
    await purchase.updateStatus('confirmed', reason || 'Approved by admin', `admin:${adminId}`);
    logger.info(`[ADMIN] Purchase ${purchase.purchaseId} approved by admin ${adminId}`);
  } else {
    await purchase.updateStatus('rejected', reason || 'Rejected by admin', `admin:${adminId}`);
    logger.info(`[ADMIN] Purchase ${purchase.purchaseId} rejected by admin ${adminId}`);
  }

  return sendSuccess(res, { purchaseId: purchase.purchaseId, status: purchase.status }, `Purchase ${action}d`);
}));

export default router;
