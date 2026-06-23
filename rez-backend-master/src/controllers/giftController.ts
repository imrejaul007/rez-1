import { Request, Response } from 'express';
import { CoinGift } from '../models/CoinGift';
import { Wallet } from '../models/Wallet';
import { WalletConfig } from '../models/WalletConfig';
import { CoinTransaction } from '../models/CoinTransaction';
import { User } from '../models/User';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { escapeRegex } from '../utils/sanitize';
import { logTransaction } from '../models/TransactionAuditLog';
import { ledgerService } from '../services/ledgerService';
import mongoose from 'mongoose';
import { validateAmount } from '../utils/walletValidation';
import { checkVelocity } from '../services/walletVelocityService';
import { createServiceLogger } from '../config/logger';
import pushNotificationService from '../services/pushNotificationService';
import { giftSendTotal, giftClaimTotal, giftSendDuration, walletGiftAmount } from '../config/walletMetrics';
import { BRAND } from '../config/brand';

const logger = createServiceLogger('coin-gift');

/**
 * @desc    Get gift configuration (themes, denominations, limits)
 * @route   GET /api/wallet/gift/config
 * @access  Private
 */
export const getGiftConfig = asyncHandler(async (req: Request, res: Response) => {
  const config = await WalletConfig.getOrCreate();

  const activeThemes = (config.giftLimits.themes || [])
    .filter((t: any) => t.isActive)
    .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0))
    .map((t: any) => ({
      id: t.id,
      label: t.label,
      emoji: t.emoji,
      colors: t.colors,
      tags: t.tags || [],
    }));

  sendSuccess(res, {
    themes: activeThemes,
    denominations: config.giftLimits.denominations || [50, 100, 250, 500, 1000, 2000],
    limits: {
      min: config.giftLimits.minAmount,
      max: config.giftLimits.perGiftMax,
      dailyMax: config.giftLimits.dailyMax,
      maxPerDay: config.giftLimits.maxGiftsPerDay,
      otpAbove: config.giftLimits.requireOtpAbove,
    },
    features: {
      scheduledDelivery: config.giftLimits.scheduledDeliveryEnabled ?? false,
      messageMaxLength: config.giftLimits.messageMaxLength ?? 150,
    },
  }, 'Gift configuration retrieved');
});

/**
 * @desc    Validate a gift recipient by phone number
 * @route   POST /api/wallet/gift/validate-recipient
 * @access  Private
 */
export const validateRecipient = asyncHandler(async (req: Request, res: Response) => {
  const senderId = (req as any).userId;
  const { phone } = req.body;

  if (!senderId) return sendError(res, 'User not authenticated', 401);
  if (!phone) return sendBadRequest(res, 'Phone number is required');

  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return sendBadRequest(res, 'Invalid phone number format');
  }

  const recipient = await User.findOne({ phoneNumber: { $regex: escapeRegex(digitsOnly.slice(-10)) + '$' } })
    .select('_id fullName phoneNumber')
    .lean();

  if (!recipient) {
    // Always return 200 to prevent phone enumeration
    return sendSuccess(res, { exists: false, isSelf: false }, 'Recipient lookup complete');
  }

  const isSelf = String(recipient._id) === senderId;

  // Mask name for privacy: "Mohammed Rahil" → "M***d R***l"
  let maskedName = '';
  if (recipient.fullName) {
    maskedName = recipient.fullName
      .split(' ')
      .map((word: string) => {
        if (word.length <= 2) return word;
        return word[0] + '***' + word[word.length - 1];
      })
      .join(' ');
  }

  sendSuccess(res, {
    exists: true,
    name: maskedName,
    isSelf,
  }, 'Recipient lookup complete');
});

/**
 * @desc    Send a coin gift
 * @route   POST /api/wallet/gift/send
 * @access  Private
 */
export const sendGift = asyncHandler(async (req: Request, res: Response) => {
  const endTimer = giftSendDuration.startTimer();
  const senderId = (req as any).userId;
  const { recipientPhone, recipientId, amount, coinType, theme, message, deliveryType, scheduledAt, idempotencyKey } = req.body;

  if (!senderId) return sendError(res, 'User not authenticated', 401);
  const amountCheck = validateAmount(amount, { fieldName: 'Gift amount' });
  if (!amountCheck.valid) return sendBadRequest(res, amountCheck.error);
  const validatedAmount = amountCheck.amount;
  if (!theme) return sendBadRequest(res, 'Gift theme is required');

  // Basic message moderation
  if (message) {
    const lowerMsg = message.toLowerCase();
    const blockedPatterns = [
      /\b(fuck|shit|ass|bitch|damn|dick|bastard|cunt|whore|slut)\b/i,
      /\b(kill|murder|die|threat|bomb|attack)\b/i,
    ];
    const isBlocked = blockedPatterns.some(p => p.test(lowerMsg));
    if (isBlocked) {
      return sendBadRequest(res, 'Gift message contains inappropriate content. Please revise.');
    }
  }

  // Idempotency check — handle duplicate/stuck/failed states
  if (idempotencyKey) {
    const existing = await CoinGift.findOne({ sender: senderId, idempotencyKey });
    if (existing) {
      // Already completed/delivered/claimed — return as duplicate
      if (['delivered', 'claimed'].includes(existing.status)) {
        return sendSuccess(res, {
          giftId: String(existing._id),
          status: existing.status,
          amount: existing.amount,
          theme: existing.theme,
          duplicate: true,
        });
      }
      // Failed/cancelled/expired — clear key so user can retry fresh
      if (['failed', 'cancelled', 'expired'].includes(existing.status)) {
        existing.idempotencyKey = undefined;
        await existing.save();
        // Fall through to create a new gift
      } else if (existing.status === 'pending') {
        // Pending (scheduled) — return as duplicate
        return sendSuccess(res, {
          giftId: String(existing._id),
          status: existing.status,
          amount: existing.amount,
          theme: existing.theme,
          duplicate: true,
        });
      }
    }
  }

  const config = await WalletConfig.getOrCreate();

  // Validate limits
  if (validatedAmount < config.giftLimits.minAmount) {
    return sendBadRequest(res, `Minimum gift amount is ${config.giftLimits.minAmount} NC`);
  }
  if (validatedAmount > config.giftLimits.perGiftMax) {
    return sendBadRequest(res, `Maximum gift amount is ${config.giftLimits.perGiftMax} NC`);
  }

  // Find recipient
  let recipient;
  if (recipientId) {
    recipient = await User.findById(recipientId).lean();
  } else if (recipientPhone) {
    recipient = await User.findOne({ phoneNumber: recipientPhone }).lean();
  }
  if (!recipient) return sendBadRequest(res, 'Recipient not found');
  if (String(recipient._id) === senderId) return sendBadRequest(res, 'Cannot gift to yourself');

  // Check sender wallet balance
  const senderWallet = await Wallet.findOne({ user: senderId }).lean();
  if (!senderWallet) return sendError(res, 'Wallet not found', 404);
  if (senderWallet.isFrozen) return sendBadRequest(res, 'Your wallet is frozen');

  // Velocity check — prevent rapid-fire abuse
  const velocityCheck = await checkVelocity(senderId, 'gift');
  if (!velocityCheck.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Gift rate limit exceeded. Try again later.',
    });
  }

  const effectiveCoinType = coinType || 'nuqta';
  if (effectiveCoinType === 'nuqta') {
    if (senderWallet.balance.available < validatedAmount) {
      return sendBadRequest(res, `Insufficient ${BRAND.COIN_NAME} balance`);
    }
  }

  // Check daily gift count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayGiftCount = await CoinGift.countDocuments({
    sender: senderId,
    createdAt: { $gte: todayStart },
    status: { $nin: ['failed', 'cancelled'] },
  });
  if (todayGiftCount >= config.giftLimits.maxGiftsPerDay) {
    return sendBadRequest(res, `Daily gift limit of ${config.giftLimits.maxGiftsPerDay} gifts reached`);
  }

  // Determine delivery timing (validate before transaction)
  const isScheduled = deliveryType === 'scheduled' && scheduledAt;
  if (isScheduled) {
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return sendBadRequest(res, 'Scheduled date must be in the future');
    }
    const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (scheduledDate > maxDate) {
      return sendBadRequest(res, 'Scheduled date cannot be more than 30 days in the future');
    }
  }
  const initialStatus = isScheduled ? 'pending' : 'delivered';

  // === MongoDB Transaction: wallet debit + gift + CoinTransaction + ledger ===
  const session = await mongoose.startSession();
  session.startTransaction();

  let gift: any;
  let debitResult: any;

  try {
    // Debit sender wallet atomically
    debitResult = await Wallet.findOneAndUpdate(
      {
        _id: senderWallet._id,
        isFrozen: false,
        'balance.available': { $gte: validatedAmount }
      },
      {
        $inc: {
          'balance.available': -validatedAmount,
          'balance.total': -validatedAmount,
          'statistics.totalSpent': validatedAmount
        },
        $set: { lastTransactionAt: new Date() }
      },
      { new: true, session }
    );

    if (!debitResult) {
      throw new Error('Insufficient balance or wallet is frozen');
    }

    // Create gift
    const [createdGift] = await CoinGift.create([{
      sender: senderId,
      recipient: recipient._id,
      amount: validatedAmount,
      coinType: effectiveCoinType,
      theme,
      message: message?.trim(),
      deliveryType: isScheduled ? 'scheduled' : 'instant',
      scheduledAt: isScheduled ? new Date(scheduledAt) : undefined,
      status: initialStatus,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days to claim
      idempotencyKey: idempotencyKey || undefined,
    }], { session });
    gift = createdGift;

    // Create CoinTransaction (source of truth for auto-sync)
    const senderTx = await CoinTransaction.createTransaction(
      senderId,
      'spent',
      validatedAmount,
      'transfer',
      `Gift sent to ${recipient.fullName || recipient.phoneNumber}`,
      { giftId: gift._id, recipientId: recipient._id, theme }
    );
    // Populate senderTxId on gift record
    gift.senderTxId = senderTx._id as mongoose.Types.ObjectId;
    await gift.save({ session });

    // Double-entry ledger: debit sender wallet → credit platform_float
    const platformFloatId = ledgerService.getPlatformAccountId('platform_float');
    await ledgerService.recordEntry({
      debitAccount: { type: 'user_wallet', id: new mongoose.Types.ObjectId(senderId) },
      creditAccount: { type: 'platform_float', id: platformFloatId },
      amount: validatedAmount,
      coinType: (effectiveCoinType as any) || 'nuqta',
      operationType: 'gift',
      referenceId: String(gift._id),
      referenceModel: 'CoinGift',
      metadata: {
        description: `Gift sent to ${recipient.fullName || recipient.phoneNumber}`,
        idempotencyKey: idempotencyKey || undefined,
      },
    });

    await session.commitTransaction();
  } catch (txError: any) {
    await session.abortTransaction();
    if (txError.message === 'Insufficient balance or wallet is frozen') {
      return sendBadRequest(res, txError.message);
    }
    logger.error('Gift transaction failed — rolled back', txError);
    return sendError(res, 'Gift sending failed. No coins were deducted.', 500);
  } finally {
    session.endSession();
  }

  // Audit log (fire-and-forget, outside transaction)
  logTransaction({
    userId: new mongoose.Types.ObjectId(senderId),
    walletId: senderWallet._id as mongoose.Types.ObjectId,
    walletType: 'user',
    operation: 'debit',
    amount: validatedAmount,
    balanceBefore: { total: senderWallet.balance.total, available: senderWallet.balance.available, pending: 0, cashback: 0 },
    balanceAfter: { total: debitResult.balance.total, available: debitResult.balance.available, pending: 0, cashback: 0 },
    reference: { type: 'other', id: String(gift._id), description: `Gift to ${recipient.fullName || recipient.phoneNumber}` }
  });

  // Send push notification for instant delivery (scheduled gifts notified by giftDeliveryJob)
  if (!isScheduled && recipient.phoneNumber) {
    try {
      const sender = await User.findById(senderId).select('fullName').lean();
      const senderDisplayName = sender?.fullName || 'Someone';
      const themeEmoji = theme === 'birthday' ? '🎂'
        : theme === 'love' ? '💝'
        : theme === 'thanks' ? '🙏'
        : theme === 'congrats' ? '🎉'
        : theme === 'christmas' ? '🎄'
        : '🎁';
      await pushNotificationService.sendGiftReceived(
        senderDisplayName,
        validatedAmount,
        themeEmoji,
        recipient.phoneNumber
      );
    } catch (notifErr) {
      logger.error('Failed to send gift notification', notifErr, { giftId: String(gift._id) });
    }
  }

  // Record Prometheus metrics
  endTimer();
  giftSendTotal.inc({ status: 'success', theme: theme || 'unknown' });
  walletGiftAmount.observe({ coinType: effectiveCoinType }, validatedAmount);

  logger.info('Gift sent successfully', {
    giftId: String(gift._id),
    senderId,
    recipientId: String(recipient._id),
    amount: validatedAmount,
    theme,
    deliveryType: isScheduled ? 'scheduled' : 'instant',
  });

  sendSuccess(res, {
    giftId: String(gift._id),
    status: gift.status,
    recipientName: recipient.fullName || recipient.phoneNumber,
    amount: validatedAmount,
    theme,
    expiresAt: gift.expiresAt,
  }, isScheduled ? 'Gift scheduled successfully' : 'Gift sent successfully');
});

/**
 * @desc    Get received gifts
 * @route   GET /api/wallet/gift/received
 * @access  Private
 */
export const getReceivedGifts = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const gifts = await CoinGift.find({
    recipient: userId,
    $or: [
      { status: 'claimed' }, // Claimed gifts always visible
      { status: 'delivered', expiresAt: { $gte: new Date() } }, // Unclaimed only if not expired
    ],
  })
    .sort({ createdAt: -1 })
    .populate('sender', 'fullName phoneNumber profile.avatar')
    .limit(50)
    .lean();

  sendSuccess(res, { gifts }, 'Received gifts retrieved');
});

/**
 * @desc    Claim a received gift
 * @route   POST /api/wallet/gift/:id/claim
 * @access  Private
 */
export const claimGift = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  if (!userId) return sendError(res, 'User not authenticated', 401);

  // Velocity check — prevent rapid-fire claim abuse
  const velocityCheck = await checkVelocity(userId, 'gift');
  if (!velocityCheck.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Gift claim rate limit exceeded. Try again later.',
    });
  }

  // Use a MongoDB transaction to ensure gift claim + wallet credit are atomic
  // If wallet credit fails, the gift status rolls back to 'delivered'
  const session = await mongoose.startSession();
  let gift: any;
  let creditResult: any;
  let recipientWalletBefore: any;

  try {
    await session.startTransaction();

    // Atomic claim — prevents double-claim race condition
    gift = await CoinGift.findOneAndUpdate(
      {
        _id: id,
        recipient: userId,
        status: 'delivered',
        expiresAt: { $gte: new Date() }
      },
      {
        $set: { status: 'claimed', claimedAt: new Date() }
      },
      { new: true, session }
    );

    if (!gift) {
      await session.abortTransaction();
      // Check if it was expired vs already claimed vs not found
      const existing = await CoinGift.findOne({ _id: id, recipient: userId }).lean();
      if (!existing) return sendBadRequest(res, 'Gift not found');
      if (existing.status === 'claimed') return sendBadRequest(res, 'Gift already claimed');
      if (existing.expiresAt < new Date()) {
        if (existing.status !== 'expired') {
          await CoinGift.updateOne({ _id: id }, { $set: { status: 'expired' } });
        }
        return sendBadRequest(res, 'Gift has expired');
      }
      return sendBadRequest(res, 'Gift not available for claiming');
    }

    // Read wallet state BEFORE credit (for audit log) — inside transaction for consistency
    recipientWalletBefore = await Wallet.findOne({ user: userId }).session(session).lean();
    if (!recipientWalletBefore) {
      await session.abortTransaction();
      return sendError(res, 'Wallet not found', 404);
    }

    // Credit recipient wallet inside same transaction
    creditResult = await Wallet.findOneAndUpdate(
      { _id: recipientWalletBefore._id },
      {
        $inc: {
          'balance.available': gift.amount,
          'balance.total': gift.amount,
          'statistics.totalEarned': gift.amount
        },
        $set: { lastTransactionAt: new Date() }
      },
      { new: true, session }
    );

    if (!creditResult) {
      await session.abortTransaction();
      return sendError(res, 'Failed to credit wallet', 500);
    }

    // Create CoinTransaction inside transaction (source of truth for auto-sync)
    const recipientTx = await CoinTransaction.create([{
      user: userId,
      type: 'earned',
      amount: gift.amount,
      balance: creditResult.balance?.available || 0,
      source: 'transfer',
      description: `Gift received from a friend`,
      metadata: { giftId: gift._id, senderId: gift.sender }
    }], { session });

    // Link CoinTransaction to gift
    await CoinGift.updateOne(
      { _id: gift._id },
      { $set: { recipientTxId: recipientTx[0]._id } },
      { session }
    );

    await session.commitTransaction();
  } catch (txError) {
    await session.abortTransaction();
    logger.error('Gift claim transaction failed', txError, { giftId: id, userId });
    return sendError(res, 'Failed to claim gift. Please try again.', 500);
  } finally {
    session.endSession();
  }

  // Audit log — outside transaction (non-critical)
  logTransaction({
    userId: new mongoose.Types.ObjectId(userId),
    walletId: recipientWalletBefore._id as mongoose.Types.ObjectId,
    walletType: 'user',
    operation: 'credit',
    amount: gift.amount,
    balanceBefore: { total: recipientWalletBefore.balance.total, available: recipientWalletBefore.balance.available, pending: 0, cashback: 0 },
    balanceAfter: {
      total: creditResult.balance.total,
      available: creditResult.balance.available,
      pending: 0,
      cashback: 0,
    },
    reference: { type: 'other', id: String(gift._id), description: `Gift claimed from ${gift.sender}` }
  });

  // Double-entry ledger (non-critical, outside transaction)
  try {
    const platformFloatId = ledgerService.getPlatformAccountId('platform_float');
    await ledgerService.recordEntry({
      debitAccount: { type: 'platform_float', id: platformFloatId },
      creditAccount: { type: 'user_wallet', id: new mongoose.Types.ObjectId(userId) },
      amount: gift.amount,
      coinType: (gift.coinType as any) || 'nuqta',
      operationType: 'gift',
      referenceId: String(gift._id),
      referenceModel: 'CoinGift',
      metadata: {
        description: `Gift claimed by recipient`,
      },
    });
  } catch (ledgerError) {
    logger.error('Failed to create claim ledger entry', ledgerError, { giftId: String(gift._id) });
  }

  giftClaimTotal.inc({ status: 'success' });

  sendSuccess(res, {
    giftId: String(gift._id),
    amount: gift.amount,
    status: 'claimed',
  }, 'Gift claimed successfully!');

  logger.info('Gift claimed successfully', {
    giftId: String(gift._id),
    recipientId: userId,
    senderId: String(gift.sender),
    amount: gift.amount,
  });
});

/**
 * @desc    Get sent gifts
 * @route   GET /api/wallet/gift/sent
 * @access  Private
 */
export const getSentGifts = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const gifts = await CoinGift.find({ sender: userId })
    .sort({ createdAt: -1 })
    .populate('recipient', 'fullName phoneNumber profile.avatar')
    .limit(50)
    .lean();

  sendSuccess(res, { gifts }, 'Sent gifts retrieved');
});
