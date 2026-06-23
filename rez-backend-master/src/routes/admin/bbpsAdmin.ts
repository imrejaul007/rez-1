import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { BillProvider } from '../../models/BillProvider';
import { BillPayment } from '../../models/BillPayment';
import { sendSuccess, sendPaginated, sendNotFound, sendBadRequest } from '../../utils/response';
import { escapeRegex } from '../../utils/sanitize';
import { logger } from '../../config/logger';

const router = Router();

// All routes require admin authentication
router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// PROVIDER MANAGEMENT
// ============================================

/**
 * @route   GET /api/admin/bbps/providers
 * @desc    List all bill providers with optional type filter and search, paginated
 * @access  Admin
 */
router.get(
  '/providers',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { type, search, isActive } = req.query;

    const query: any = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      const escaped = escapeRegex(search as string);
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { code: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [providers, total] = await Promise.all([
      BillProvider.find(query)
        .sort({ type: 1, displayOrder: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      BillProvider.countDocuments(query),
    ]);

    return sendPaginated(res, providers, page, limit, total, 'Providers fetched');
  })
);

/**
 * @route   POST /api/admin/bbps/providers
 * @desc    Create a new bill provider
 * @access  Admin
 */
router.post(
  '/providers',
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await BillProvider.create(req.body);
    logger.info('[BBPS ADMIN] Provider created', { code: provider.code, name: provider.name });
    return sendSuccess(res, provider, 'Provider created', 201);
  })
);

/**
 * @route   PUT /api/admin/bbps/providers/:id
 * @desc    Update an existing bill provider
 * @access  Admin
 */
router.put(
  '/providers/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await BillProvider.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();

    if (!provider) {
      return sendNotFound(res, 'Provider not found');
    }

    logger.info('[BBPS ADMIN] Provider updated', { id: req.params.id, name: provider.name });
    return sendSuccess(res, provider, 'Provider updated');
  })
);

/**
 * @route   PATCH /api/admin/bbps/providers/:id/toggle
 * @desc    Toggle a provider's isActive status
 * @access  Admin
 */
router.patch(
  '/providers/:id/toggle',
  asyncHandler(async (req: Request, res: Response) => {
    const provider = await BillProvider.findById(req.params.id);
    if (!provider) {
      return sendNotFound(res, 'Provider not found');
    }

    provider.isActive = !provider.isActive;
    await provider.save();

    logger.info('[BBPS ADMIN] Provider toggled', { id: req.params.id, isActive: provider.isActive });
    return sendSuccess(res, { id: provider._id, isActive: provider.isActive }, 'Provider toggled');
  })
);

// ============================================
// TRANSACTION MANAGEMENT
// ============================================

/**
 * @route   GET /api/admin/bbps/transactions
 * @desc    List all bill payments with filters, paginated
 * @access  Admin
 */
router.get(
  '/transactions',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { status, billType, from, to, search } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (billType) query.billType = billType;

    // Date range filter
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from as string);
      if (to) query.createdAt.$lte = new Date(to as string);
    }

    // Search by customer number or transaction ref
    if (search) {
      const escaped = escapeRegex(search as string);
      query.$or = [
        { customerNumber: { $regex: escaped, $options: 'i' } },
        { transactionRef: { $regex: escaped, $options: 'i' } },
      ];
    }

    const [transactions, total] = await Promise.all([
      BillPayment.find(query)
        .populate('userId', 'fullName phoneNumber profile.phoneNumber')
        .populate('provider', 'name type logo')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      BillPayment.countDocuments(query),
    ]);

    return sendPaginated(res, transactions, page, limit, total, 'Transactions fetched');
  })
);

// ============================================
// STATISTICS
// ============================================

/**
 * @route   GET /api/admin/bbps/stats
 * @desc    Aggregate stats: totalVolume, totalTransactions, totalCoinsIssued, totalCashback, avgTransaction + breakdown by billType
 * @access  Admin
 */
router.get(
  '/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    const [overallStats, breakdownByType] = await Promise.all([
      BillPayment.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: null,
            totalVolume: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
            totalCoinsIssued: { $sum: '$promoCoinsIssued' },
            totalCashback: { $sum: '$cashbackAmount' },
            avgTransaction: { $avg: '$amount' },
          },
        },
      ]),
      BillPayment.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: '$billType',
            volume: { $sum: '$amount' },
            count: { $sum: 1 },
            coinsIssued: { $sum: '$promoCoinsIssued' },
            cashback: { $sum: '$cashbackAmount' },
            avgAmount: { $avg: '$amount' },
          },
        },
        { $sort: { volume: -1 } },
      ]),
    ]);

    const stats = overallStats[0] || {
      totalVolume: 0,
      totalTransactions: 0,
      totalCoinsIssued: 0,
      totalCashback: 0,
      avgTransaction: 0,
    };

    // Clean up _id from overall
    delete (stats as any)._id;

    // Round averages
    stats.avgTransaction = Math.round((stats.avgTransaction || 0) * 100) / 100;

    const breakdown = breakdownByType.map((b: any) => ({
      billType: b._id,
      volume: b.volume,
      count: b.count,
      coinsIssued: b.coinsIssued,
      cashback: b.cashback,
      avgAmount: Math.round((b.avgAmount || 0) * 100) / 100,
    }));

    return sendSuccess(res, { ...stats, breakdown }, 'BBPS stats fetched');
  })
);

// ============================================
// REFUND
// ============================================

/**
 * @route   POST /api/admin/bbps/transactions/:id/refund
 * @desc    Admin-initiated refund: set refundStatus to pending
 * @access  Admin
 */
router.post(
  '/transactions/:id/refund',
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;

    const payment = await BillPayment.findById(req.params.id);
    if (!payment) {
      return sendNotFound(res, 'Transaction not found');
    }

    if (payment.status !== 'completed') {
      return sendBadRequest(res, 'Only completed transactions can be refunded');
    }

    if (payment.refundStatus !== 'none') {
      return sendBadRequest(res, `Refund already ${payment.refundStatus}`);
    }

    payment.refundStatus = 'pending';
    payment.refundAmount = payment.amount;
    payment.refundReason = reason || 'Admin-initiated refund';
    await payment.save();

    logger.info('[BBPS ADMIN] Refund initiated', {
      paymentId: payment._id,
      amount: payment.amount,
      reason: payment.refundReason,
    });

    return sendSuccess(res, {
      id: payment._id,
      refundStatus: payment.refundStatus,
      refundAmount: payment.refundAmount,
    }, 'Refund initiated');
  })
);

export default router;
