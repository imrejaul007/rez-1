import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { Wallet } from '../../models/Wallet';
import { User } from '../../models/User';
import { TransactionAuditLog, logTransaction } from '../../models/TransactionAuditLog';
import mongoose from 'mongoose';
import { escapeRegex } from '../../utils/sanitize';
import adminActionService from '../../services/adminActionService';
import { asyncHandler } from '../../utils/asyncHandler';
import { validateQuery, validate } from '../../middleware/validation';
import {
  adminUserWalletSearchSchema,
  adminWalletAdjustSchema,
  adminWalletFreezeSchema,
  adminReverseCashbackSchema,
} from '../../validators/financialValidators';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * @route   GET /api/admin/user-wallets
 * @desc    Search user wallets
 * @access  Admin
 */
router.get('/', validateQuery(adminUserWalletSearchSchema), asyncHandler(async (req: Request, res: Response) => {
    const { search, page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    let userQuery: any = {};
    if (search) {
      const escapedSearch = escapeRegex(search as string);
      userQuery = {
        $or: [
          { phoneNumber: { $regex: escapedSearch, $options: 'i' } },
          { fullName: { $regex: escapedSearch, $options: 'i' } },
          { email: { $regex: escapedSearch, $options: 'i' } },
        ]
      };
    }

    const users = await User.find(userQuery)
      .select('phoneNumber fullName email profile.avatar')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const userIds = users.map(u => u._id);
    const wallets = await Wallet.find({ user: { $in: userIds } }).lean();
    const walletMap = new Map(wallets.map(w => [w.user.toString(), w]));

    const results = users.map(u => ({
      user: u,
      wallet: walletMap.get(u._id.toString()) || null,
    }));

    const total = await User.countDocuments(userQuery);

    res.json({
      success: true,
      data: {
        users: results,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      }
    });
}));

/**
 * @route   POST /api/admin/user-wallets/:userId/freeze
 * @desc    Freeze a user's wallet
 * @access  Admin
 */
router.post('/:userId/freeze', validate(adminWalletFreezeSchema), asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'Reason is required to freeze a wallet' });
    }

    const wallet = await Wallet.findOneAndUpdate(
      { user: req.params.userId },
      { isFrozen: true, frozenReason: reason.trim(), frozenAt: new Date() },
      { new: true }
    );

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    logTransaction({
      userId: new mongoose.Types.ObjectId(req.params.userId),
      walletId: wallet._id as mongoose.Types.ObjectId,
      walletType: 'user',
      operation: 'adjustment',
      amount: 0,
      balanceBefore: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
      balanceAfter: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
      reference: { type: 'other', description: `Wallet FROZEN by admin: ${reason.trim()}` },
      metadata: { source: 'admin', adminUserId: String((req as any).userId) },
    });

    res.json({ success: true, message: 'Wallet frozen', data: { isFrozen: true } });
}));

/**
 * @route   POST /api/admin/user-wallets/:userId/unfreeze
 * @desc    Unfreeze a user's wallet
 * @access  Admin
 */
router.post('/:userId/unfreeze', asyncHandler(async (req: Request, res: Response) => {
    const wallet = await Wallet.findOneAndUpdate(
      { user: req.params.userId },
      { isFrozen: false, frozenReason: null, frozenAt: null },
      { new: true }
    );

    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    logTransaction({
      userId: new mongoose.Types.ObjectId(req.params.userId),
      walletId: wallet._id as mongoose.Types.ObjectId,
      walletType: 'user',
      operation: 'adjustment',
      amount: 0,
      balanceBefore: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
      balanceAfter: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
      reference: { type: 'other', description: 'Wallet UNFROZEN by admin' },
      metadata: { source: 'admin', adminUserId: String((req as any).userId) },
    });

    res.json({ success: true, message: 'Wallet unfrozen', data: { isFrozen: false } });
}));

/**
 * @route   POST /api/admin/user-wallets/:userId/adjust
 * @desc    Manual credit/debit adjustment with audit reason
 * @access  Admin (super_admin recommended)
 */
router.post('/:userId/adjust', validate(adminWalletAdjustSchema), asyncHandler(async (req: Request, res: Response) => {
    const { amount, type, reason } = req.body;
    if (!amount || !type || !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Amount, type (credit/debit), and reason are required' });
    }
    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be "credit" or "debit"' });
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100000) {
      return res.status(400).json({ success: false, message: 'Amount must be between 0 and 100,000 NC' });
    }

    // Threshold check — high-value operations require maker-checker approval
    const threshold = await adminActionService.getApprovalThreshold();
    if (adminActionService.requiresApproval(parsedAmount, threshold)) {
      const action = await adminActionService.createAction(
        String((req as any).userId),
        'manual_adjustment',
        { userId: req.params.userId, amount: parsedAmount, type, reason: reason.trim() },
        reason.trim(),
        threshold,
      );
      return res.status(202).json({
        success: true,
        message: `Amount exceeds threshold (${threshold} NC). Pending approval from another admin.`,
        data: { actionId: action._id, status: 'pending_approval' },
      });
    }

    const wallet = await Wallet.findOne({ user: req.params.userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const balanceBefore = {
      total: wallet.balance.total,
      available: wallet.balance.available,
      pending: 0,
      cashback: 0,
    };

    // Use walletService for atomic mutation + CoinTransaction + LedgerEntry
    const { walletService } = await import('../../services/walletService');
    try {
      if (type === 'credit') {
        await walletService.credit({
          userId: req.params.userId,
          amount: parsedAmount,
          source: 'admin',
          description: `Admin adjustment: ${reason.trim()}`,
          operationType: 'admin_adjustment',
          referenceId: `admin-adjust:${req.params.userId}:${Date.now()}`,
          referenceModel: 'AdminAction',
          metadata: { adminUserId: String((req as any).userId), reason: reason.trim(), idempotencyKey: `admin-adjust:${req.params.userId}:${Date.now()}` },
        });
      } else {
        await walletService.debit({
          userId: req.params.userId,
          amount: parsedAmount,
          source: 'admin',
          description: `Admin adjustment: ${reason.trim()}`,
          operationType: 'admin_adjustment',
          referenceId: `admin-adjust:${req.params.userId}:${Date.now()}`,
          referenceModel: 'AdminAction',
          metadata: { adminUserId: String((req as any).userId), reason: reason.trim(), idempotencyKey: `admin-adjust:${req.params.userId}:${Date.now()}` },
        });
      }
    } catch (walletErr: any) {
      return res.status(400).json({ success: false, message: walletErr.message || 'Wallet operation failed' });
    }

    const updated = await Wallet.findOne({ user: req.params.userId }).lean();

    logTransaction({
      userId: new mongoose.Types.ObjectId(req.params.userId),
      walletId: wallet._id as mongoose.Types.ObjectId,
      walletType: 'user',
      operation: type === 'credit' ? 'credit' : 'debit',
      amount: parsedAmount,
      balanceBefore,
      balanceAfter: { total: updated?.balance.total || 0, available: updated?.balance.available || 0, pending: 0, cashback: 0 },
      reference: { type: 'adjustment', description: `Admin adjustment: ${reason.trim()}` },
      metadata: { source: 'admin', adminUserId: String((req as any).userId) },
    });

    res.json({
      success: true,
      message: `${type === 'credit' ? 'Credited' : 'Debited'} ${parsedAmount} NC`,
      data: { balance: updated?.balance }
    });
}));

/**
 * @route   POST /api/admin/user-wallets/:userId/reverse-cashback
 * @desc    Reverse/clawback cashback from a user's wallet
 * @access  Admin (super_admin recommended)
 */
router.post('/:userId/reverse-cashback', validate(adminReverseCashbackSchema), asyncHandler(async (req: Request, res: Response) => {
    const { amount, originalTransactionId, reason } = req.body;
    if (!amount || !reason?.trim()) {
      return res.status(400).json({ success: false, message: 'Amount and reason are required' });
    }
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100000) {
      return res.status(400).json({ success: false, message: 'Amount must be between 0 and 100,000 NC' });
    }

    // Threshold check — high-value reversals require maker-checker approval
    const threshold = await adminActionService.getApprovalThreshold();
    if (adminActionService.requiresApproval(parsedAmount, threshold)) {
      const action = await adminActionService.createAction(
        String((req as any).userId),
        'cashback_reversal',
        { userId: req.params.userId, amount: parsedAmount, originalTransactionId: originalTransactionId || undefined, reason: reason.trim() },
        reason.trim(),
        threshold,
      );
      return res.status(202).json({
        success: true,
        message: `Amount exceeds threshold (${threshold} NC). Pending approval from another admin.`,
        data: { actionId: action._id, status: 'pending_approval' },
      });
    }

    const wallet = await Wallet.findOne({ user: req.params.userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found' });
    }

    const balanceBefore = {
      total: wallet.balance.total,
      available: wallet.balance.available,
      pending: 0,
      cashback: 0,
    };

    const adminUserId = String((req as any).userId);
    let reversalTransactionId: string | undefined;

    if (originalTransactionId) {
      // Exact reversal via rewardEngine — handles idempotency + multiplier cleanup
      const { rewardEngine } = await import('../../core/rewardEngine');
      try {
        const result = await rewardEngine.reverseReward(originalTransactionId, reason.trim(), {
          partialAmount: parsedAmount,
        });
        reversalTransactionId = result?.reversalTransactionId?.toString();
      } catch (rewardErr: any) {
        const msg = rewardErr.message || 'Reversal failed';
        const status = msg.includes('not found') ? 404 : msg.includes('already') ? 409 : 400;
        return res.status(status).json({ success: false, message: msg });
      }
    } else {
      // Manual clawback without linking to specific transaction
      const { walletService } = await import('../../services/walletService');
      try {
        await walletService.debit({
          userId: req.params.userId,
          amount: parsedAmount,
          source: 'admin',
          description: `Cashback reversal by admin: ${reason.trim()}`,
          operationType: 'cashback_reversal',
          referenceId: `cashback-reversal:${req.params.userId}:${Date.now()}`,
          referenceModel: 'AdminAction',
          metadata: { adminUserId, reason: reason.trim(), idempotencyKey: `cashback-rev:${req.params.userId}:${Date.now()}` },
        });
      } catch (walletErr: any) {
        return res.status(400).json({ success: false, message: walletErr.message || 'Insufficient balance for reversal' });
      }
    }

    const updated = await Wallet.findOne({ user: req.params.userId }).lean();

    logTransaction({
      userId: new mongoose.Types.ObjectId(req.params.userId),
      walletId: wallet._id as mongoose.Types.ObjectId,
      walletType: 'user',
      operation: 'debit',
      amount: parsedAmount,
      balanceBefore,
      balanceAfter: { total: updated?.balance.total || 0, available: updated?.balance.available || 0, pending: 0, cashback: 0 },
      reference: { type: 'adjustment', description: `Cashback reversal by admin: ${reason.trim()}` },
      metadata: { source: 'admin', adminUserId },
    });

    res.json({
      success: true,
      message: `Reversed ${parsedAmount} NC cashback`,
      data: { amount: parsedAmount, newBalance: updated?.balance, reversalTransactionId },
    });
}));

/**
 * @route   GET /api/admin/user-wallets/:userId/audit-trail
 * @desc    Get audit trail for a user's wallet
 * @access  Admin
 */
router.get('/:userId/audit-trail', asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    const [logs, total] = await Promise.all([
      TransactionAuditLog.find({ userId: req.params.userId })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      TransactionAuditLog.countDocuments({ userId: req.params.userId }),
    ]);

    res.json({
      success: true,
      data: {
        auditLogs: logs,
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      }
    });
}));

export default router;
