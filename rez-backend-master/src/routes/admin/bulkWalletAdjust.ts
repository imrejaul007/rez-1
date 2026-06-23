import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { Wallet } from '../../models/Wallet';
import { User } from '../../models/User';
import { logTransaction } from '../../models/TransactionAuditLog';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

interface BulkAdjustResult {
  userId: string;
  success: boolean;
  message: string;
}

/**
 * @route   POST /api/admin/user-wallets/bulk-adjust
 * @desc    Bulk credit/debit adjustment for multiple users
 * @access  Admin (super_admin recommended)
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { userIds, amount, type, reason, coinType } = req.body;

  // Validate inputs
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
  }
  if (userIds.length > 500) {
    return res.status(400).json({ success: false, message: 'Cannot process more than 500 users at once' });
  }
  if (!['credit', 'debit'].includes(type)) {
    return res.status(400).json({ success: false, message: 'Type must be "credit" or "debit"' });
  }
  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 100000) {
    return res.status(400).json({ success: false, message: 'Amount must be between 0 and 100,000' });
  }
  if (!reason?.trim()) {
    return res.status(400).json({ success: false, message: 'Reason is required' });
  }

  const validCoinTypes = ['rez', 'promo', 'branded'];
  const effectiveCoinType = validCoinTypes.includes(coinType) ? coinType : 'rez';

  // Deduplicate user IDs
  const uniqueUserIds = [...new Set(
    userIds
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0 && mongoose.Types.ObjectId.isValid(id))
  )];

  if (uniqueUserIds.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid user IDs provided' });
  }

  const adminUserId = String((req as any).userId);
  const batchId = `bulk-adjust:${adminUserId}:${Date.now()}`;

  logger.info(`[ADMIN BULK ADJUST] Admin ${adminUserId} initiating bulk ${type} of ${parsedAmount} ${effectiveCoinType} coins for ${uniqueUserIds.length} users. Reason: ${reason.trim()}`);

  const { walletService } = await import('../../services/walletService');

  const results: BulkAdjustResult[] = [];
  let successCount = 0;
  let failedCount = 0;

  // Process each user sequentially to avoid overwhelming the DB
  for (const userId of uniqueUserIds) {
    try {
      // Verify user exists
      const userExists = await User.exists({ _id: userId });
      if (!userExists) {
        results.push({ userId, success: false, message: 'User not found' });
        failedCount++;
        continue;
      }

      const wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        results.push({ userId, success: false, message: 'Wallet not found' });
        failedCount++;
        continue;
      }

      const balanceBefore = {
        total: wallet.balance.total,
        available: wallet.balance.available,
        pending: 0,
        cashback: 0,
      };

      const idempotencyKey = `${batchId}:${userId}`;
      const description = `Bulk admin adjustment: ${reason.trim()}`;

      if (type === 'credit') {
        await walletService.credit({
          userId,
          amount: parsedAmount,
          source: 'admin',
          description,
          operationType: 'admin_adjustment',
          referenceId: idempotencyKey,
          referenceModel: 'AdminAction',
          metadata: { adminUserId, reason: reason.trim(), batchId, coinType: effectiveCoinType, idempotencyKey },
        });
      } else {
        await walletService.debit({
          userId,
          amount: parsedAmount,
          source: 'admin',
          description,
          operationType: 'admin_adjustment',
          referenceId: idempotencyKey,
          referenceModel: 'AdminAction',
          metadata: { adminUserId, reason: reason.trim(), batchId, coinType: effectiveCoinType, idempotencyKey },
        });
      }

      const updated = await Wallet.findOne({ user: userId }).lean();

      logTransaction({
        userId: new mongoose.Types.ObjectId(userId),
        walletId: wallet._id as mongoose.Types.ObjectId,
        walletType: 'user',
        operation: type === 'credit' ? 'credit' : 'debit',
        amount: parsedAmount,
        balanceBefore,
        balanceAfter: {
          total: updated?.balance.total || 0,
          available: updated?.balance.available || 0,
          pending: 0,
          cashback: 0,
        },
        reference: { type: 'adjustment', description: `${description} [batch:${batchId}]` },
        metadata: { source: 'admin', adminUserId },
      });

      results.push({ userId, success: true, message: `${type === 'credit' ? 'Credited' : 'Debited'} ${parsedAmount} coins` });
      successCount++;
    } catch (err: any) {
      logger.error(`[ADMIN BULK ADJUST] Failed for user ${userId}: ${err.message}`);
      results.push({ userId, success: false, message: err.message || 'Operation failed' });
      failedCount++;
    }
  }

  logger.info(`[ADMIN BULK ADJUST] Completed. Success: ${successCount}, Failed: ${failedCount}, Batch: ${batchId}`);

  res.json({
    success: true,
    message: `Bulk adjustment completed: ${successCount} succeeded, ${failedCount} failed`,
    data: {
      batchId,
      totalProcessed: uniqueUserIds.length,
      successCount,
      failedCount,
      results,
    },
  });
}));

/**
 * @route   POST /api/admin/user-wallets/bulk-adjust/preview
 * @desc    Preview bulk adjustment — validates user IDs and returns counts
 * @access  Admin
 */
router.post('/preview', asyncHandler(async (req: Request, res: Response) => {
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({ success: false, message: 'userIds must be a non-empty array' });
  }

  const uniqueUserIds = [...new Set(
    userIds
      .map((id: string) => id.trim())
      .filter((id: string) => id.length > 0 && mongoose.Types.ObjectId.isValid(id))
  )];

  const invalidCount = userIds.length - uniqueUserIds.length;

  // Check which users exist
  const existingUsers = await User.find({ _id: { $in: uniqueUserIds } })
    .select('_id fullName phoneNumber')
    .lean();

  const existingIds = new Set(existingUsers.map(u => u._id.toString()));
  const notFoundIds = uniqueUserIds.filter(id => !existingIds.has(id));

  // Check wallet existence
  const wallets = await Wallet.find({ user: { $in: uniqueUserIds } })
    .select('user isFrozen')
    .lean();

  const walletUserIds = new Set(wallets.map(w => w.user.toString()));
  const frozenCount = wallets.filter(w => w.isFrozen).length;
  const noWalletIds = uniqueUserIds.filter(id => existingIds.has(id) && !walletUserIds.has(id));

  res.json({
    success: true,
    data: {
      totalInput: userIds.length,
      validUsers: existingUsers.length,
      invalidIds: invalidCount,
      notFoundIds,
      noWalletIds,
      frozenWallets: frozenCount,
      readyToProcess: existingUsers.length - noWalletIds.length,
    },
  });
}));

export default router;
