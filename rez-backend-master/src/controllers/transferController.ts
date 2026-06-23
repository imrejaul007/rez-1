import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { Transfer } from '../models/Transfer';
import { Wallet } from '../models/Wallet';
import { WalletConfig } from '../models/WalletConfig';
import { User } from '../models/User';
import { CoinTransaction } from '../models/CoinTransaction';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { logTransaction } from '../models/TransactionAuditLog';
import mongoose from 'mongoose';
import crypto from 'crypto';
import redisService from '../services/redisService';
import { validateAmount } from '../utils/walletValidation';
import { checkVelocity, checkUniqueRecipients } from '../services/walletVelocityService';
import { SMSService } from '../services/SMSService';
import { escapeRegex } from '../utils/sanitize';
import pushNotificationService from '../services/pushNotificationService';
import { ledgerService } from '../services/ledgerService';
import { invalidateWalletCache } from '../services/walletCacheService';
import { BRAND } from '../config/brand';

/**
 * @desc    Initiate a coin transfer
 * @route   POST /api/wallet/transfer/initiate
 * @access  Private
 */
export const initiateTransfer = asyncHandler(async (req: Request, res: Response) => {
  const senderId = (req as any).userId;
  const { recipientPhone, recipientId, amount, coinType, merchantId, note, idempotencyKey } = req.body;

  if (!senderId) return sendError(res, 'User not authenticated', 401);

  const amountCheck = validateAmount(amount, { fieldName: 'Transfer amount' });
  if (!amountCheck.valid) return sendBadRequest(res, amountCheck.error);
  const validatedAmount = amountCheck.amount;

  // Idempotency check — handle duplicate requests intelligently
  if (idempotencyKey) {
    const existing = await Transfer.findOne({ sender: senderId, idempotencyKey }).lean();
    if (existing) {
      // Already completed — return as duplicate
      if (existing.status === 'completed') {
        return sendSuccess(res, {
          transferId: String(existing._id),
          requiresOtp: false,
          recipientName: '',
          amount: existing.amount,
          coinType: existing.coinType,
          status: 'completed',
          duplicate: true,
        });
      }
      // Still pending OTP — let user continue
      if (existing.status === 'otp_pending') {
        return sendSuccess(res, {
          transferId: String(existing._id),
          requiresOtp: true,
          recipientName: '',
          amount: existing.amount,
          coinType: existing.coinType,
          status: existing.status,
        });
      }
      // Confirmed but not executed (stuck) — re-execute it
      if (existing.status === 'confirmed') {
        const result = await executeTransfer(String(existing._id));
        if (result.success) {
          return sendSuccess(res, {
            transferId: String(existing._id),
            status: 'completed',
            recipientName: '',
            amount: existing.amount,
            coinType: existing.coinType,
          }, 'Transfer completed successfully');
        }
        return sendError(res, result.error || 'Transfer execution failed', 500);
      }
      // Failed — clear old idempotency key so a new transfer can be created
      if (existing.status === 'failed') {
        await Transfer.findOneAndUpdate(
          { _id: existing._id },
          { $unset: { idempotencyKey: 1 } }
        );
        // Fall through to create a new transfer
      }
    }
  }
  if (!coinType || !['nuqta', 'promo', 'branded'].includes(coinType)) {
    return sendBadRequest(res, 'Invalid coin type');
  }
  if (coinType === 'promo') {
    return sendBadRequest(res, 'Promo coins cannot be transferred');
  }

  // Acquire per-user distributed lock around daily limit check + transfer creation
  // Prevents race condition where two concurrent requests both pass the daily limit check
  const lockKey = `transfer:initiate:${senderId}`;
  const lockToken = await redisService.acquireLock(lockKey, 10);
  if (!lockToken) {
    return sendError(res, 'Another transfer is being processed. Please try again.', 429);
  }

  try {
    // Get wallet config for limits
    const config = await WalletConfig.getOrCreate();

    // Validate amount against limits
    if (validatedAmount < config.transferLimits.minAmount) {
      return sendBadRequest(res, `Minimum transfer amount is ${config.transferLimits.minAmount} NC`);
    }
    if (validatedAmount > config.transferLimits.perTransactionMax) {
      return sendBadRequest(res, `Maximum transfer amount is ${config.transferLimits.perTransactionMax} NC per transaction`);
    }

    // Find recipient
    let recipient;
    if (recipientId) {
      recipient = await User.findById(recipientId).lean();
    } else if (recipientPhone) {
      recipient = await User.findOne({ phoneNumber: recipientPhone }).lean();
    }

    if (!recipient) return sendBadRequest(res, 'Recipient not found');
    if (String(recipient._id) === senderId) return sendBadRequest(res, 'Cannot transfer to yourself');

    // Unique recipients check — fraud signal
    const recipientCheck = await checkUniqueRecipients(senderId, String(recipient._id));
    if (!recipientCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Too many unique recipients today. Try again tomorrow.',
      });
    }

    // Check sender wallet
    const senderWallet = await Wallet.findOne({ user: senderId }).lean();
    if (!senderWallet) return sendError(res, 'Sender wallet not found', 404);
    if (senderWallet.isFrozen) return sendBadRequest(res, 'Your wallet is frozen');

    // Velocity check — prevent rapid-fire abuse
    const velocityCheck = await checkVelocity(senderId, 'transfer');
    if (!velocityCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Transfer rate limit exceeded. Try again in ${Math.ceil(velocityCheck.resetInSeconds / 60)} minutes.`,
      });
    }

    // Check recipient wallet
    const recipientWallet = await Wallet.findOne({ user: recipient._id }).lean();
    if (!recipientWallet) return sendBadRequest(res, 'Recipient wallet not active');
    if (recipientWallet.isFrozen) return sendBadRequest(res, 'Recipient wallet is frozen');

    // Check balance based on coin type
    if (coinType === 'nuqta') {
      if (senderWallet.balance.available < validatedAmount) {
        return sendBadRequest(res, `Insufficient ${BRAND.COIN_NAME} balance`);
      }
    } else if (coinType === 'branded' && merchantId) {
      const brandedCoin = senderWallet.brandedCoins.find(
        (bc: any) => bc.merchantId.toString() === merchantId
      );
      if (!brandedCoin || brandedCoin.amount < validatedAmount) {
        return sendBadRequest(res, 'Insufficient Branded Coin balance for this merchant');
      }
    } else if (coinType === 'promo') {
      const promoCoin = senderWallet.coins.find((c: any) => c.type === 'promo');
      if (!promoCoin || promoCoin.amount < validatedAmount) {
        return sendBadRequest(res, 'Insufficient Promo Coin balance');
      }
    }

    // Check daily transfer limit (inside lock to prevent race condition)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayTransfers = await Transfer.aggregate([
      {
        $match: {
          sender: new mongoose.Types.ObjectId(senderId),
          status: { $in: ['completed', 'initiated', 'otp_pending', 'confirmed'] },
          createdAt: { $gte: todayStart }
        }
      },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const dailyTotal = (todayTransfers[0]?.total || 0) + validatedAmount;
    if (dailyTotal > config.transferLimits.dailyMax) {
      return sendBadRequest(res, `Daily transfer limit of ${config.transferLimits.dailyMax} NC exceeded`);
    }

    // Determine if OTP is required
    const requiresOtp = validatedAmount >= config.transferLimits.requireOtpAbove;

    // Create transfer record
    const transfer = await Transfer.create({
      sender: senderId,
      recipient: recipient._id,
      amount: validatedAmount,
      coinType,
      merchantId: coinType === 'branded' ? merchantId : undefined,
      status: requiresOtp ? 'otp_pending' : 'confirmed',
      note: note?.trim(),
      idempotencyKey: idempotencyKey || undefined,
    });

    if (requiresOtp) {
      // Generate OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

      transfer.otpHash = otpHash;
      transfer.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
      await transfer.save();

      // Send OTP via SMS
      if (process.env.NODE_ENV === 'development') {
        logger.debug('[Transfer] OTP generated', { transferId: String(transfer._id) });
      }
      const senderUser = await User.findById(senderId).select('phoneNumber').lean();
      if (senderUser?.phoneNumber) {
        await SMSService.sendOTP(senderUser.phoneNumber, otp);
      }

      return sendSuccess(res, {
        transferId: String(transfer._id),
        requiresOtp: true,
        recipientName: recipient.fullName || recipient.phoneNumber,
        amount: validatedAmount,
        coinType,
      }, 'OTP sent. Please verify to complete transfer.');
    }

    // No OTP required — execute immediately
    const result = await executeTransfer(String(transfer._id));

    if (!result.success) {
      return sendError(res, result.error || 'Transfer failed', 500);
    }

    sendSuccess(res, {
      transferId: String(transfer._id),
      status: 'completed',
      recipientName: recipient.fullName || recipient.phoneNumber,
      amount: validatedAmount,
      coinType,
    }, 'Transfer completed successfully');
  } finally {
    await redisService.releaseLock(lockKey, lockToken);
  }
});

/**
 * @desc    Confirm transfer with OTP
 * @route   POST /api/wallet/transfer/confirm
 * @access  Private
 */
export const confirmTransfer = asyncHandler(async (req: Request, res: Response) => {
  const senderId = (req as any).userId;
  const { transferId, otp } = req.body;

  if (!senderId) return sendError(res, 'User not authenticated', 401);
  if (!transferId || !otp) return sendBadRequest(res, 'Transfer ID and OTP are required');

  const transfer = await Transfer.findOne({
    _id: transferId,
    sender: senderId,
    status: 'otp_pending'
  }).lean();

  if (!transfer) return sendBadRequest(res, 'Transfer not found or already processed');

  // Check OTP expiry
  if (transfer.otpExpiresAt && transfer.otpExpiresAt < new Date()) {
    await Transfer.findByIdAndUpdate(transferId, {
      $set: { status: 'failed', failureReason: 'OTP expired' }
    });
    return sendBadRequest(res, 'OTP has expired. Please initiate a new transfer.');
  }

  // Check OTP attempts (already exceeded)
  if (transfer.otpAttempts >= 3) {
    await Transfer.findByIdAndUpdate(transferId, {
      $set: { status: 'failed', failureReason: 'Too many OTP attempts' }
    });
    return sendBadRequest(res, 'Too many incorrect attempts. Transfer cancelled.');
  }

  // Verify OTP
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
  if (otpHash !== transfer.otpHash) {
    // Atomic increment of OTP attempts — prevents concurrent bypass
    const updated = await Transfer.findOneAndUpdate(
      { _id: transferId, status: 'otp_pending' },
      { $inc: { otpAttempts: 1 } },
      { new: true }
    );
    const remaining = updated ? 3 - updated.otpAttempts : 0;
    if (updated && updated.otpAttempts >= 3) {
      await Transfer.findByIdAndUpdate(transferId, {
        $set: { status: 'failed', failureReason: 'Too many OTP attempts' }
      });
      return sendBadRequest(res, 'Too many incorrect attempts. Transfer cancelled.');
    }
    return sendBadRequest(res, 'Incorrect OTP. Please try again.');
  }

  // OTP verified — execute transfer (atomic status transition)
  const confirmed = await Transfer.findOneAndUpdate(
    { _id: transferId, status: 'otp_pending' },
    { $set: { status: 'confirmed' } },
    { new: true }
  );
  if (!confirmed) return sendBadRequest(res, 'Transfer already processed');

  const result = await executeTransfer(String(transfer._id));

  if (!result.success) {
    return sendError(res, result.error || 'Transfer failed', 500);
  }

  sendSuccess(res, {
    transferId: String(transfer._id),
    status: 'completed',
    amount: transfer.amount,
    coinType: transfer.coinType,
  }, 'Transfer completed successfully');
});

/**
 * Execute the actual coin transfer (atomic debit + credit)
 */
async function executeTransfer(transferId: string): Promise<{ success: boolean; error?: string }> {
  const lockKey = `transfer:execute:${transferId}`;
  let lockToken: string | null = null;

  try {
    // Acquire distributed lock (gracefully degrades if Redis is down)
    lockToken = await redisService.acquireLock(lockKey, 10);
    if (!lockToken) {
      return { success: false, error: 'Transfer already being processed' };
    }

    const transfer = await Transfer.findById(transferId).lean();
    if (!transfer || transfer.status === 'completed') {
      return { success: false, error: 'Transfer not found or already completed' };
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const senderWallet = await Wallet.findOne({ user: transfer.sender }).session(session).lean();
      const recipientWallet = await Wallet.findOne({ user: transfer.recipient }).session(session).lean();

      if (!senderWallet || !recipientWallet) {
        throw new Error('Wallet not found');
      }

      const amount = transfer.amount;

      // Debit sender
      if (transfer.coinType === 'nuqta') {
        // Atomic debit with balance guard
        const debitResult = await Wallet.findOneAndUpdate(
          {
            _id: senderWallet._id,
            isFrozen: false,
            'balance.available': { $gte: amount }
          },
          {
            $inc: {
              'balance.available': -amount,
              'balance.total': -amount,
              'statistics.totalSpent': amount
            },
            $set: { lastTransactionAt: new Date() }
          },
          { new: true, session }
        );

        if (!debitResult) {
          throw new Error('Transfer failed: insufficient balance or wallet is frozen');
        }

        // Credit recipient
        await Wallet.findOneAndUpdate(
          { _id: recipientWallet._id },
          {
            $inc: {
              'balance.available': amount,
              'balance.total': amount,
              'statistics.totalEarned': amount
            },
            $set: { lastTransactionAt: new Date() }
          },
          { session }
        );
      } else if (transfer.coinType === 'branded' && transfer.merchantId) {
        // Branded coin transfer — pass session for transactional safety
        await senderWallet.useBrandedCoins(transfer.merchantId, amount, session);
        await recipientWallet.addBrandedCoins(
          transfer.merchantId,
          (senderWallet.brandedCoins.find((bc: any) => bc.merchantId.toString() === transfer.merchantId?.toString()) as any)?.merchantName || 'Unknown',
          amount,
          undefined,
          undefined,
          session
        );
      } else if (transfer.coinType === 'promo') {
        // Promo coin transfer: atomic debit sender promo with $gte guard
        const senderDebit = await Wallet.findOneAndUpdate(
          {
            _id: senderWallet._id,
            coins: { $elemMatch: { type: 'promo', amount: { $gte: amount } } }
          },
          {
            $inc: { 'coins.$.amount': -amount },
            $set: { lastTransactionAt: new Date() }
          },
          { new: true, session }
        );
        if (!senderDebit) {
          throw new Error('Insufficient promo coin balance');
        }

        // Atomic credit recipient promo — try $inc on existing, else $push new
        const recipientCredit = await Wallet.findOneAndUpdate(
          { _id: recipientWallet._id, 'coins.type': 'promo' },
          {
            $inc: { 'coins.$.amount': amount },
            $set: { lastTransactionAt: new Date() }
          },
          { new: true, session }
        );
        if (!recipientCredit) {
          // No existing promo coin entry — push a new one
          await Wallet.findOneAndUpdate(
            { _id: recipientWallet._id },
            {
              $push: {
                coins: {
                  type: 'promo',
                  amount,
                  isActive: true,
                  color: '#FFC857',
                  earnedDate: new Date(),
                  promoDetails: { maxRedemptionPercentage: 20 }
                }
              },
              $set: { lastTransactionAt: new Date() }
            },
            { session }
          );
        }
      }

      // Get sender/recipient names for descriptions
      const [senderUser, recipientUser] = await Promise.all([
        User.findById(transfer.sender).select('fullName phoneNumber').lean(),
        User.findById(transfer.recipient).select('fullName phoneNumber').lean(),
      ]);
      const senderName = (senderUser as any)?.fullName || (senderUser as any)?.phoneNumber || 'User';
      const recipientName = (recipientUser as any)?.fullName || (recipientUser as any)?.phoneNumber || 'User';

      // Get updated balances for CoinTransaction records
      const updatedSenderWallet = await Wallet.findById(senderWallet._id).session(session).lean();
      const updatedRecipientWallet = await Wallet.findById(recipientWallet._id).session(session).lean();
      const senderBalanceAfter = (updatedSenderWallet as any)?.balance?.available ?? 0;
      const recipientBalanceAfter = (updatedRecipientWallet as any)?.balance?.available ?? 0;

      // Create CoinTransaction records for history tracking
      const [senderTx, recipientTx] = await Promise.all([
        CoinTransaction.create([{
          user: transfer.sender,
          type: 'spent',
          amount,
          balance: senderBalanceAfter,
          source: 'transfer',
          description: `Transferred ${amount} NC to ${recipientName}`,
          metadata: { transferId: transfer._id, recipientId: transfer.recipient }
        }], { session }),
        CoinTransaction.create([{
          user: transfer.recipient,
          type: 'earned',
          amount,
          balance: recipientBalanceAfter,
          source: 'transfer',
          description: `Received ${amount} NC from ${senderName}`,
          metadata: { transferId: transfer._id, senderId: transfer.sender }
        }], { session }),
      ]);

      // Link CoinTransaction IDs to Transfer
      transfer.senderTxId = senderTx[0]._id as mongoose.Types.ObjectId;
      transfer.recipientTxId = recipientTx[0]._id as mongoose.Types.ObjectId;

      // Double-entry ledger: sender → recipient (all coin types)
      try {
        await ledgerService.recordEntry({
          debitAccount: { type: 'user_wallet', id: transfer.sender },
          creditAccount: { type: 'user_wallet', id: transfer.recipient },
          amount,
          coinType: (transfer.coinType as any) || 'nuqta',
          operationType: 'transfer',
          referenceId: String(transfer._id),
          referenceModel: 'Transfer',
          metadata: { description: `Transfer from ${senderName} to ${recipientName}` },
        });
      } catch (ledgerErr) {
        // Ledger failure should not abort the transfer — log and continue
        logger.error('[Transfer] Ledger entry failed (non-blocking):', ledgerErr);
      }

      // Update transfer status
      transfer.status = 'completed';
      await transfer.save({ session });

      await session.commitTransaction();

      // Invalidate wallet cache for both parties
      await Promise.all([
        invalidateWalletCache(String(transfer.sender)),
        invalidateWalletCache(String(transfer.recipient)),
      ]).catch((err) => logger.error('[TransferCtrl] Wallet cache invalidation failed after transfer', { error: err.message, transferId: transfer._id }));

      // Audit logs (fire-and-forget)
      logTransaction({
        userId: transfer.sender,
        walletId: senderWallet._id as mongoose.Types.ObjectId,
        walletType: 'user',
        operation: 'debit',
        amount,
        balanceBefore: { total: 0, available: 0, pending: 0, cashback: 0 },
        balanceAfter: { total: senderBalanceAfter, available: senderBalanceAfter, pending: 0, cashback: 0 },
        reference: { type: 'other', id: String(transfer._id), description: `Transfer to ${recipientName}` }
      });

      logTransaction({
        userId: transfer.recipient,
        walletId: recipientWallet._id as mongoose.Types.ObjectId,
        walletType: 'user',
        operation: 'credit',
        amount,
        balanceBefore: { total: 0, available: 0, pending: 0, cashback: 0 },
        balanceAfter: { total: recipientBalanceAfter, available: recipientBalanceAfter, pending: 0, cashback: 0 },
        reference: { type: 'other', id: String(transfer._id), description: `Transfer from ${transfer.sender}` }
      });

      // Send transfer received notification to recipient (fire-and-forget)
      try {
        const recipientPhone = (recipientUser as any)?.phoneNumber;
        if (recipientPhone) {
          await pushNotificationService.sendTransferReceived(recipientPhone, senderName, amount);
        }
      } catch (notifErr) {
        if (process.env.NODE_ENV === 'development') {
          logger.info('[Transfer] Failed to send transfer received notification:', notifErr);
        }
      }

      return { success: true };
    } catch (error) {
      await session.abortTransaction();

      transfer.status = 'failed';
      transfer.failureReason = error instanceof Error ? error.message : 'Unknown error';
      await transfer.save();

      return { success: false, error: transfer.failureReason };
    } finally {
      session.endSession();
    }
  } finally {
    await redisService.releaseLock(lockKey, lockToken || undefined);
  }
}

/**
 * @desc    Get transfer history
 * @route   GET /api/wallet/transfer/history
 * @access  Private
 */
export const getTransferHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { page = 1, limit = 20, type } = req.query;

  if (!userId) return sendError(res, 'User not authenticated', 401);

  const userObjId = new mongoose.Types.ObjectId(userId);
  const query: any = {
    $or: [{ sender: userObjId }, { recipient: userObjId }],
    status: { $in: ['completed', 'reversed'] }
  };

  if (type === 'sent') query.$or = [{ sender: userObjId }];
  if (type === 'received') query.$or = [{ recipient: userObjId }];

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));

  const [transfers, total] = await Promise.all([
    Transfer.find(query)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .populate('sender', 'fullName phoneNumber profile.avatar')
      .populate('recipient', 'fullName phoneNumber profile.avatar')
      .lean(),
    Transfer.countDocuments(query)
  ]);

  sendSuccess(res, {
    transfers: transfers.map((t: any) => ({
      ...t,
      direction: t.sender._id.toString() === userId ? 'sent' : 'received',
    })),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
      hasMore: pageNum * limitNum < total
    }
  }, 'Transfer history retrieved');
});

/**
 * @desc    Get recent transfer recipients
 * @route   GET /api/wallet/transfer/recipients
 * @access  Private
 */
export const getRecentRecipients = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { search } = req.query;

  if (!userId) return sendError(res, 'User not authenticated', 401);

  if (search && typeof search === 'string' && search.length >= 2) {
    // Search by name or phone
    const users = await User.find({
      _id: { $ne: userId },
      $or: [
        { fullName: { $regex: escapeRegex(search), $options: 'i' } },
        { phoneNumber: { $regex: escapeRegex(search), $options: 'i' } }
      ]
    })
      .select('fullName phoneNumber profile.avatar')
      .limit(10)
      .lean();

    return sendSuccess(res, { recipients: users }, 'Search results');
  }

  // Get recent unique recipients from past transfers
  const recentTransfers = await Transfer.aggregate([
    {
      $match: {
        sender: new mongoose.Types.ObjectId(userId),
        status: 'completed'
      }
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$recipient',
        lastTransfer: { $first: '$createdAt' },
        totalTransferred: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { lastTransfer: -1 } },
    { $limit: 10 }
  ]);

  const recipientIds = recentTransfers.map(t => t._id);
  const users = await User.find({ _id: { $in: recipientIds } })
    .select('fullName phoneNumber profile.avatar')
    .lean();

  const recipients = recentTransfers.map(t => {
    const user = users.find(u => u._id.toString() === t._id.toString());
    return {
      ...user,
      lastTransfer: t.lastTransfer,
      totalTransferred: t.totalTransferred,
      transferCount: t.count
    };
  }).filter(Boolean);

  sendSuccess(res, { recipients }, 'Recent recipients retrieved');
});
