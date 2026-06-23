import { logger } from '../../config/logger';
import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { CoinGift } from '../../models/CoinGift';
import { Wallet } from '../../models/Wallet';
import { CoinTransaction } from '../../models/CoinTransaction';
import { ledgerService } from '../../services/ledgerService';
import { LedgerEntry } from '../../models/LedgerEntry';
import { logTransaction } from '../../models/TransactionAuditLog';
import { User } from '../../models/User';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';
import { escapeRegex } from '../../utils/sanitize';

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/coin-gifts
 * List all coin gifts (paginated, filterable)
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 20,
    status,
    search,
    dateFrom,
    dateTo,
  } = req.query;

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const query: any = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  if (dateFrom || dateTo) {
    query.createdAt = {};
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
    if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
  }

  // Search by sender/recipient phone or gift ID
  if (search) {
    const searchStr = search as string;
    if (mongoose.Types.ObjectId.isValid(searchStr)) {
      query._id = new mongoose.Types.ObjectId(searchStr);
    } else {
      // Search by phone number
      const users = await User.find({
        phoneNumber: { $regex: escapeRegex(searchStr.replace(/\D/g, '')), $options: 'i' }
      }).select('_id').limit(20).lean();
      const userIds = users.map(u => u._id);
      if (userIds.length) {
        query.$or = [
          { sender: { $in: userIds } },
          { recipient: { $in: userIds } },
        ];
      } else {
        // No matching users — return empty
        return res.json({
          success: true,
          data: { gifts: [], pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0 } },
        });
      }
    }
  }

  const [gifts, total] = await Promise.all([
    CoinGift.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('sender', 'fullName phoneNumber')
      .populate('recipient', 'fullName phoneNumber')
      .lean(),
    CoinGift.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      gifts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
}));

/**
 * GET /api/admin/coin-gifts/analytics
 * Gift volume, peak times, failure rates, top themes
 */
router.get('/analytics', asyncHandler(async (req: Request, res: Response) => {
  const { days = 30 } = req.query;
  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  const [statusBreakdown, themeBreakdown, dailyVolume, totals] = await Promise.all([
    CoinGift.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
    ]),
    CoinGift.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: '$theme', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    CoinGift.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]),
    CoinGift.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: null,
          totalGifts: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
          uniqueSenders: { $addToSet: '$sender' },
          uniqueRecipients: { $addToSet: '$recipient' },
        },
      },
    ]),
  ]);

  const summary = totals[0] || { totalGifts: 0, totalAmount: 0, avgAmount: 0 };

  res.json({
    success: true,
    data: {
      period: `${days} days`,
      summary: {
        totalGifts: summary.totalGifts,
        totalAmount: summary.totalAmount,
        avgAmount: Math.round(summary.avgAmount || 0),
        uniqueSenders: summary.uniqueSenders?.length || 0,
        uniqueRecipients: summary.uniqueRecipients?.length || 0,
      },
      statusBreakdown,
      themeBreakdown,
      dailyVolume,
    },
  });
}));

/**
 * GET /api/admin/coin-gifts/:id
 * Gift details with audit trail
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid gift ID' });
  }

  const gift = await CoinGift.findById(id)
    .populate('sender', 'fullName phoneNumber profile.avatar')
    .populate('recipient', 'fullName phoneNumber profile.avatar')
    .lean();

  if (!gift) {
    return res.status(404).json({ success: false, message: 'Gift not found' });
  }

  // Get related CoinTransactions
  const transactions = await CoinTransaction.find({
    'metadata.giftId': id,
  }).sort({ createdAt: -1 }).lean();

  // Get ledger entries by referenceId (gift ID), not accountId
  const ledgerEntries = await LedgerEntry.find({
    referenceId: id,
    referenceModel: 'CoinGift',
  }).sort({ createdAt: -1 }).lean().catch(() => []);

  res.json({
    success: true,
    data: {
      gift,
      transactions,
      ledgerEntries,
    },
  });
}));

/**
 * POST /api/admin/coin-gifts/:id/refund
 * Manual refund — cancel gift and return coins to sender
 */
router.post('/:id/refund', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = (req as any).userId;

  if (!reason) {
    return res.status(400).json({ success: false, message: 'Refund reason is required' });
  }

  // Atomic status transition: only delivered/pending → cancelled
  const gift = await CoinGift.findOneAndUpdate(
    { _id: id, status: { $in: ['delivered', 'pending'] } },
    { $set: { status: 'cancelled' } },
    { new: true }
  );

  if (!gift) {
    const existing = await CoinGift.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Gift not found' });
    return res.status(400).json({
      success: false,
      message: `Cannot refund gift in '${existing.status}' status`,
    });
  }

  // Refund sender wallet
  const senderWallet = await Wallet.findOneAndUpdate(
    { user: gift.sender },
    {
      $inc: {
        'balance.available': gift.amount,
        'balance.total': gift.amount,
      },
      $set: { lastTransactionAt: new Date() },
    },
    { new: true }
  );

  if (!senderWallet) {
    // Revert gift status — cannot refund without wallet
    await CoinGift.findOneAndUpdate(
      { _id: id, status: 'cancelled' },
      { $set: { status: gift.status === 'cancelled' ? 'delivered' : gift.status } }
    );
    return res.status(400).json({
      success: false,
      message: 'Sender wallet not found. Gift status reverted.',
    });
  }

  // Create CoinTransaction for refund
  try {
    await CoinTransaction.createTransaction(
      String(gift.sender),
      'refunded',
      gift.amount,
      'transfer',
      `Admin refund: gift cancelled — ${reason}`,
      { giftId: gift._id, adminId, reason }
    );
  } catch (ctxErr) {
    logger.error('❌ [ADMIN COIN-GIFTS] CoinTransaction refund error:', ctxErr);
  }

  // Ledger entry: platform_float → sender
  try {
    const platformFloatId = ledgerService.getPlatformAccountId('platform_float');
    await ledgerService.recordEntry({
      debitAccount: { type: 'platform_float', id: platformFloatId },
      creditAccount: { type: 'user_wallet', id: gift.sender },
      amount: gift.amount,
      coinType: (gift.coinType as any) || 'nuqta',
      operationType: 'refund',
      referenceId: String(gift._id),
      referenceModel: 'CoinGift',
      metadata: {
        description: `Admin refund: ${reason}`,
        adminUserId: adminId,
      },
    });
  } catch (ledgerErr) {
    logger.error('❌ [ADMIN COIN-GIFTS] Ledger refund error:', ledgerErr);
  }

  // Audit log
  if (senderWallet) {
    logTransaction({
      userId: gift.sender,
      walletId: senderWallet._id as mongoose.Types.ObjectId,
      walletType: 'user',
      operation: 'credit',
      amount: gift.amount,
      balanceBefore: {
        total: senderWallet.balance.total - gift.amount,
        available: senderWallet.balance.available - gift.amount,
        pending: 0, cashback: 0,
      },
      balanceAfter: {
        total: senderWallet.balance.total,
        available: senderWallet.balance.available,
        pending: 0, cashback: 0,
      },
      reference: {
        type: 'refund',
        id: String(gift._id),
        description: `Admin gift refund: ${reason}`,
      },
      metadata: { adminUserId: adminId, source: 'admin' },
    });
  }

  res.json({
    success: true,
    data: { gift },
    message: `Gift refunded. ${gift.amount} NC returned to sender.`,
  });
}));

/**
 * POST /api/admin/coin-gifts/:id/deliver
 * Manual delivery trigger for stuck gifts
 */
router.post('/:id/deliver', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const gift = await CoinGift.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status: 'delivered' } },
    { new: true }
  );

  if (!gift) {
    const existing = await CoinGift.findById(id);
    if (!existing) return res.status(404).json({ success: false, message: 'Gift not found' });
    return res.status(400).json({
      success: false,
      message: `Cannot deliver gift in '${existing.status}' status`,
    });
  }

  res.json({
    success: true,
    data: { gift },
    message: 'Gift manually delivered.',
  });
}));

export default router;
