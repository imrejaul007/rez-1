// @ts-nocheck
/**
 * Admin POS Bills routes
 *
 * BUG FIX (P2-C2 — admin POS silo): Before this route existed, the admin
 * app was completely blind to PosBill records. Platform ops could not
 * investigate merchant disputes, flag suspicious refund activity, or
 * verify in-store revenue numbers. The admin merchants dashboard only
 * showed Order + StorePayment data.
 *
 * This router exposes the minimum viable set of admin-only POS
 * inspections:
 *   • GET /api/admin/pos/bills            — paginated list across all merchants
 *   • GET /api/admin/pos/bills/:id        — detailed bill view
 *   • GET /api/admin/pos/stats            — platform-wide POS summary
 *   • GET /api/admin/pos/merchant/:id     — per-merchant POS history
 *
 * Every route is gated by requireAuth + requireAdmin.
 */

import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { PosBill } from '../../models/PosBill';
import { logger } from '../../config/logger';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/pos/bills
 * List POS bills with filters (merchantId, storeId, status, date range).
 */
router.get(
  '/bills',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (req.query.merchantId && mongoose.isValidObjectId(req.query.merchantId)) {
      filter.merchantId = new mongoose.Types.ObjectId(req.query.merchantId as string);
    }
    if (req.query.storeId && mongoose.isValidObjectId(req.query.storeId)) {
      filter.storeId = new mongoose.Types.ObjectId(req.query.storeId as string);
    }
    if (
      req.query.status &&
      ['pending', 'paid', 'cancelled', 'refunded', 'partial_refund'].includes(req.query.status as string)
    ) {
      filter.status = req.query.status;
    }
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from as string);
      if (req.query.to) filter.createdAt.$lte = new Date(req.query.to as string);
    }

    const [bills, total] = await Promise.all([
      PosBill.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('storeId', 'name')
        .populate('merchantId', 'name email phoneNumber')
        .lean(),
      PosBill.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        bills,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + bills.length < total,
          hasPrev: page > 1,
        },
      },
    });
  }),
);

/**
 * GET /api/admin/pos/bills/:id
 * Detailed inspection of a single POS bill. Populates store, merchant,
 * and the user who was credited with coins (if any) so support ops can
 * fully reconstruct what happened.
 */
router.get(
  '/bills/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid bill id' });
    }
    const bill = await PosBill.findById(id)
      .populate('storeId', 'name location contact')
      .populate('merchantId', 'name email phoneNumber')
      .populate('coinsCreditedUserId', 'name phoneNumber email')
      .lean();
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    res.json({ success: true, data: bill });
  }),
);

/**
 * GET /api/admin/pos/stats
 * Platform-wide POS revenue / bill count summary, optionally scoped by
 * date range. Used to seed admin revenue dashboards with the POS channel.
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const match: Record<string, any> = {};
    if (req.query.from || req.query.to) {
      match.paidAt = {};
      if (req.query.from) match.paidAt.$gte = new Date(req.query.from as string);
      if (req.query.to) match.paidAt.$lte = new Date(req.query.to as string);
    }
    match.status = 'paid';

    try {
      const [summary] = await PosBill.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalBills: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            totalTips: { $sum: '$tipAmount' },
            totalDiscounts: { $sum: '$discountAmount' },
            avgBillValue: { $avg: '$totalAmount' },
          },
        },
      ]);

      const byPaymentMethod = await PosBill.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $ifNull: ['$paymentMethod', 'cash'] },
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
          },
        },
        { $sort: { revenue: -1 } },
      ]);

      res.json({
        success: true,
        data: {
          summary: summary || {
            totalBills: 0,
            totalRevenue: 0,
            totalTips: 0,
            totalDiscounts: 0,
            avgBillValue: 0,
          },
          byPaymentMethod,
        },
      });
    } catch (err: any) {
      logger.error('[ADMIN POS] stats aggregation failed', err);
      res.status(500).json({ success: false, message: 'Failed to compute POS stats' });
    }
  }),
);

/**
 * GET /api/admin/pos/merchant/:merchantId
 * Per-merchant POS history — shortcut for support ops to dig into a
 * specific merchant without reconstructing filters.
 */
router.get(
  '/merchant/:merchantId',
  asyncHandler(async (req: Request, res: Response) => {
    const { merchantId } = req.params;
    if (!mongoose.isValidObjectId(merchantId)) {
      return res.status(400).json({ success: false, message: 'Invalid merchantId' });
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 50));
    const skip = (page - 1) * limit;

    const filter = { merchantId: new mongoose.Types.ObjectId(merchantId) };
    const [bills, total, summary] = await Promise.all([
      PosBill.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('storeId', 'name').lean(),
      PosBill.countDocuments(filter),
      PosBill.aggregate([
        { $match: { ...filter, status: 'paid' } },
        {
          $group: {
            _id: null,
            totalBills: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        bills,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + bills.length < total,
          hasPrev: page > 1,
        },
        summary: summary[0] || { totalBills: 0, totalRevenue: 0 },
      },
    });
  }),
);

export default router;
