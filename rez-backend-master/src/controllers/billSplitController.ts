import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { BillSplit } from '../models/BillSplit';
import { Wallet } from '../models/Wallet';
import { User } from '../models/User';
import { CoinTransaction } from '../models/CoinTransaction';
import { sendSuccess, sendError, sendBadRequest, sendPaginated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { validateAmount } from '../utils/walletValidation';
import { invalidateWalletCache } from '../services/walletCacheService';
import redisService from '../services/redisService';
import { BRAND } from '../config/brand';

/**
 * @desc    Create a bill split
 * @route   POST /api/wallet/split
 * @access  Private
 */
export const createBillSplit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const { totalAmount, splitType, participants, note, idempotencyKey } = req.body;

  if (!idempotencyKey) return sendBadRequest(res, 'idempotencyKey is required');
  if (!totalAmount || !splitType || !participants) {
    return sendBadRequest(res, 'totalAmount, splitType, and participants are required');
  }
  if (!['equal', 'custom'].includes(splitType)) {
    return sendBadRequest(res, 'splitType must be "equal" or "custom"');
  }
  if (!Array.isArray(participants) || participants.length < 1) {
    return sendBadRequest(res, 'At least 1 participant (besides initiator) is required');
  }

  const amountCheck = validateAmount(totalAmount, { fieldName: 'Total amount' });
  if (!amountCheck.valid) return sendBadRequest(res, amountCheck.error);
  const validatedTotal = amountCheck.amount;

  // Idempotency check
  const existing = await BillSplit.findOne({ idempotencyKey }).lean();
  if (existing) {
    return sendSuccess(res, { billSplit: existing, duplicate: true }, 'Bill split already created');
  }

  // Resolve participant users by phone
  const participantPhones: string[] = participants.map((p: any) => p.phone?.trim()).filter(Boolean);
  if (participantPhones.length < 1) {
    return sendBadRequest(res, 'At least 1 participant phone number is required');
  }

  // Check for duplicate phones
  const uniquePhones = [...new Set(participantPhones)];
  if (uniquePhones.length !== participantPhones.length) {
    return sendBadRequest(res, 'Duplicate participant phone numbers are not allowed');
  }

  // Initiator should not be in the participant list
  const initiator = await User.findById(userId).select('phoneNumber fullName').lean();
  if (!initiator) return sendError(res, 'User not found', 404);

  if (uniquePhones.includes((initiator as any).phoneNumber)) {
    return sendBadRequest(res, 'You cannot add yourself as a participant');
  }

  // Look up users by phone
  const users = await User.find({ phoneNumber: { $in: uniquePhones } })
    .select('phoneNumber fullName')
    .lean();
  const userMap = new Map(users.map(u => [(u as any).phoneNumber, u]));

  // Build participant records
  const totalParticipants = uniquePhones.length;
  const builtParticipants = uniquePhones.map((phone: string, idx: number) => {
    const matchedUser = userMap.get(phone);
    const inputParticipant = participants.find((p: any) => p.phone?.trim() === phone);

    let amount: number;
    if (splitType === 'equal') {
      amount = Math.round((validatedTotal / (totalParticipants + 1)) * 100) / 100; // +1 for initiator
    } else {
      amount = Number(inputParticipant?.amount) || 0;
    }

    return {
      user: matchedUser ? matchedUser._id : undefined,
      phone,
      name: inputParticipant?.name || (matchedUser as any)?.fullName || undefined,
      amount,
      status: 'pending' as const,
    };
  });

  // For custom splits, validate amounts sum to total minus initiator share
  if (splitType === 'custom') {
    const participantSum = builtParticipants.reduce((sum, p) => sum + p.amount, 0);
    if (participantSum <= 0) {
      return sendBadRequest(res, 'Participant amounts must be greater than zero');
    }
    if (Math.abs(participantSum - validatedTotal) > 0.01) {
      // Allow participant amounts to equal total (initiator pays nothing extra)
      // or be less than total (initiator covers remainder)
      if (participantSum > validatedTotal) {
        return sendBadRequest(res, 'Participant amounts cannot exceed total amount');
      }
    }
  }

  const billSplit = await BillSplit.create({
    initiator: userId,
    totalAmount: validatedTotal,
    splitType,
    currency: 'NC',
    participants: builtParticipants,
    note: note?.trim(),
    idempotencyKey,
  });

  logger.info('[BillSplit] Created', {
    billSplitId: String(billSplit._id),
    initiator: userId,
    totalAmount: validatedTotal,
    participantCount: builtParticipants.length,
  });

  sendSuccess(res, { billSplit }, 'Bill split created successfully', 201);
});

/**
 * @desc    List user's bill splits (as initiator or participant)
 * @route   GET /api/wallet/split
 * @access  Private
 */
export const listBillSplits = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  const user = await User.findById(userId).select('phoneNumber').lean();
  const userPhone = (user as any)?.phoneNumber;

  const userObjId = new mongoose.Types.ObjectId(userId);

  const query: any = {
    $or: [
      { initiator: userObjId },
      ...(userPhone ? [{ 'participants.phone': userPhone }] : []),
      { 'participants.user': userObjId },
    ],
  };

  const [splits, total] = await Promise.all([
    BillSplit.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('initiator', 'fullName phoneNumber')
      .populate('participants.user', 'fullName phoneNumber')
      .lean(),
    BillSplit.countDocuments(query),
  ]);

  sendPaginated(res, splits, page, limit, total, 'Bill splits retrieved');
});

/**
 * @desc    Get bill split details
 * @route   GET /api/wallet/split/:id
 * @access  Private
 */
export const getBillSplit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return sendBadRequest(res, 'Invalid bill split ID');

  const billSplit = await BillSplit.findById(id)
    .populate('initiator', 'fullName phoneNumber')
    .populate('participants.user', 'fullName phoneNumber')
    .lean();

  if (!billSplit) return sendError(res, 'Bill split not found', 404);

  // Verify access: must be initiator or a participant
  const user = await User.findById(userId).select('phoneNumber').lean();
  const userPhone = (user as any)?.phoneNumber;
  const isInitiator = String(billSplit.initiator._id || billSplit.initiator) === userId;
  const isParticipant = billSplit.participants.some(
    (p: any) => String(p.user?._id || p.user) === userId || p.phone === userPhone
  );

  if (!isInitiator && !isParticipant) {
    return sendError(res, 'Access denied', 403);
  }

  sendSuccess(res, { billSplit }, 'Bill split retrieved');
});

/**
 * @desc    Participant pays their share
 * @route   POST /api/wallet/split/:id/pay
 * @access  Private
 */
export const payBillSplit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return sendBadRequest(res, 'Invalid bill split ID');

  // Acquire lock to prevent double-pay
  const lockKey = `billsplit:pay:${id}:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 15);
  if (!lockToken) {
    return sendError(res, 'Payment is already being processed. Please wait.', 429);
  }

  try {
    const billSplit = await BillSplit.findById(id);
    if (!billSplit) return sendError(res, 'Bill split not found', 404);

    if (billSplit.status === 'cancelled' || billSplit.status === 'expired' || billSplit.status === 'completed') {
      return sendBadRequest(res, `Bill split is ${billSplit.status}`);
    }

    // Find the participant matching current user
    const user = await User.findById(userId).select('phoneNumber fullName').lean();
    const userPhone = (user as any)?.phoneNumber;

    const participantIdx = billSplit.participants.findIndex(
      (p) => String(p.user) === userId || p.phone === userPhone
    );

    if (participantIdx === -1) {
      return sendBadRequest(res, 'You are not a participant in this bill split');
    }

    const participant = billSplit.participants[participantIdx];
    if (participant.status === 'paid') {
      return sendBadRequest(res, 'You have already paid your share');
    }
    if (participant.status === 'declined') {
      return sendBadRequest(res, 'You have declined this bill split');
    }

    const payAmount = participant.amount;

    // Start a MongoDB transaction for atomic wallet debit + credit
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Debit participant's wallet
      const debitResult = await Wallet.findOneAndUpdate(
        {
          user: userId,
          isFrozen: false,
          'balance.available': { $gte: payAmount },
        },
        {
          $inc: {
            'balance.available': -payAmount,
            'balance.total': -payAmount,
            'statistics.totalSpent': payAmount,
          },
          $set: { lastTransactionAt: new Date() },
        },
        { new: true, session }
      );

      if (!debitResult) {
        throw new Error(`Insufficient ${BRAND.COIN_NAME} balance or wallet is frozen`);
      }

      // Credit initiator's wallet
      await Wallet.findOneAndUpdate(
        { user: billSplit.initiator },
        {
          $inc: {
            'balance.available': payAmount,
            'balance.total': payAmount,
            'statistics.totalEarned': payAmount,
          },
          $set: { lastTransactionAt: new Date() },
        },
        { session }
      );

      // Get updated balances for CoinTransaction
      const [updatedPayerWallet, updatedInitiatorWallet] = await Promise.all([
        Wallet.findOne({ user: userId }).session(session).lean(),
        Wallet.findOne({ user: billSplit.initiator }).session(session).lean(),
      ]);

      const payerBalanceAfter = (updatedPayerWallet as any)?.balance?.available ?? 0;
      const initiatorBalanceAfter = (updatedInitiatorWallet as any)?.balance?.available ?? 0;

      const initiatorUser = await User.findById(billSplit.initiator).select('fullName phoneNumber').lean();
      const initiatorName = (initiatorUser as any)?.fullName || (initiatorUser as any)?.phoneNumber || 'User';
      const payerName = (user as any)?.fullName || (user as any)?.phoneNumber || 'User';

      // Create CoinTransaction records
      const [payerTx] = await Promise.all([
        CoinTransaction.create([{
          user: userId,
          type: 'spent',
          amount: payAmount,
          balance: payerBalanceAfter,
          source: 'transfer',
          description: `Bill split payment to ${initiatorName}`,
          metadata: { billSplitId: billSplit._id, initiatorId: billSplit.initiator },
        }], { session }),
        CoinTransaction.create([{
          user: billSplit.initiator,
          type: 'earned',
          amount: payAmount,
          balance: initiatorBalanceAfter,
          source: 'transfer',
          description: `Bill split received from ${payerName}`,
          metadata: { billSplitId: billSplit._id, payerId: userId },
        }], { session }),
      ]);

      // Update participant status
      billSplit.participants[participantIdx].status = 'paid';
      billSplit.participants[participantIdx].paidAt = new Date();
      billSplit.participants[participantIdx].transferId = payerTx[0]._id as mongoose.Types.ObjectId;

      // Link user if not already linked
      if (!billSplit.participants[participantIdx].user) {
        billSplit.participants[participantIdx].user = new mongoose.Types.ObjectId(userId);
      }

      await billSplit.save({ session }); // Pre-save hook auto-updates status

      await session.commitTransaction();

      // Invalidate wallet caches (fire-and-forget)
      Promise.all([
        invalidateWalletCache(userId),
        invalidateWalletCache(String(billSplit.initiator)),
      ]).catch(err => logger.error('[BillSplit] Cache invalidation failed', { error: err.message }));

      logger.info('[BillSplit] Participant paid', {
        billSplitId: String(billSplit._id),
        participant: userId,
        amount: payAmount,
        newStatus: billSplit.status,
      });

      sendSuccess(res, {
        billSplit: await BillSplit.findById(id)
          .populate('initiator', 'fullName phoneNumber')
          .populate('participants.user', 'fullName phoneNumber')
          .lean(),
      }, 'Payment successful');
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (error: any) {
    logger.error('[BillSplit] Pay failed', { billSplitId: id, userId, error: error.message });
    return sendBadRequest(res, error.message || 'Payment failed');
  } finally {
    await redisService.releaseLock(lockKey, lockToken);
  }
});

/**
 * @desc    Participant declines their share
 * @route   POST /api/wallet/split/:id/decline
 * @access  Private
 */
export const declineBillSplit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return sendBadRequest(res, 'Invalid bill split ID');

  const billSplit = await BillSplit.findById(id);
  if (!billSplit) return sendError(res, 'Bill split not found', 404);

  if (billSplit.status === 'cancelled' || billSplit.status === 'completed') {
    return sendBadRequest(res, `Bill split is already ${billSplit.status}`);
  }

  const user = await User.findById(userId).select('phoneNumber').lean();
  const userPhone = (user as any)?.phoneNumber;

  const participantIdx = billSplit.participants.findIndex(
    (p) => String(p.user) === userId || p.phone === userPhone
  );

  if (participantIdx === -1) {
    return sendBadRequest(res, 'You are not a participant in this bill split');
  }

  if (billSplit.participants[participantIdx].status === 'paid') {
    return sendBadRequest(res, 'You have already paid and cannot decline');
  }

  billSplit.participants[participantIdx].status = 'declined';

  if (!billSplit.participants[participantIdx].user) {
    billSplit.participants[participantIdx].user = new mongoose.Types.ObjectId(userId);
  }

  await billSplit.save(); // Pre-save hook auto-updates status

  logger.info('[BillSplit] Participant declined', {
    billSplitId: String(billSplit._id),
    participant: userId,
  });

  sendSuccess(res, {
    billSplit: await BillSplit.findById(id)
      .populate('initiator', 'fullName phoneNumber')
      .populate('participants.user', 'fullName phoneNumber')
      .lean(),
  }, 'Declined successfully');
});

/**
 * @desc    Initiator cancels the bill split (only if pending)
 * @route   DELETE /api/wallet/split/:id
 * @access  Private
 */
export const cancelBillSplit = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return sendBadRequest(res, 'Invalid bill split ID');

  const billSplit = await BillSplit.findById(id);
  if (!billSplit) return sendError(res, 'Bill split not found', 404);

  if (String(billSplit.initiator) !== userId) {
    return sendError(res, 'Only the initiator can cancel this bill split', 403);
  }

  if (billSplit.status !== 'pending') {
    return sendBadRequest(res, `Cannot cancel a bill split that is ${billSplit.status}`);
  }

  billSplit.status = 'cancelled';
  await billSplit.save();

  logger.info('[BillSplit] Cancelled', {
    billSplitId: String(billSplit._id),
    initiator: userId,
  });

  sendSuccess(res, { billSplit }, 'Bill split cancelled');
});
