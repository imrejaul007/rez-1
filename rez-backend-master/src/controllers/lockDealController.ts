/**
 * Lock Price Deal Controller
 *
 * Handles all lock-price deal operations:
 * - Browse available lock deals (paginated, filtered)
 * - Get deal details
 * - Lock a deal (pay deposit → earn lock reward)
 * - Pay remaining balance
 * - Verify pickup (merchant action → earn pickup reward)
 * - Get user's locked deals
 * - Cancel a lock (refund deposit minus fees)
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { LockPriceDeal } from '../models/LockPriceDeal';
import { UserLockDeal, IUserLockDeal } from '../models/UserLockDeal';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { Transaction } from '../models/Transaction';
import stripeService from '../services/stripeService';
import { walletService } from '../services/walletService';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendConflict,
  sendPaginated,
} from '../utils/response';
import { AppError } from '../middleware/errorHandler';

// ==================== BROWSE DEALS ====================

/**
 * GET /api/lock-deals
 * Browse available lock price deals (public, optionalAuth)
 */
export const getLockDeals = asyncHandler(async (req: Request, res: Response) => {
  const {
    region,
    category,
    storeId,
    featured,
    tag,
    search,
    page = '1',
    limit = '20',
  } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));
  const now = new Date();

  try {
    // Build query for active, currently valid deals
    const query: any = {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    };

    if (region && region !== 'all') {
      query.$or = [{ region }, { region: 'all' }];
    }
    if (category) {
      query.storeCategory = category;
    }
    if (storeId) {
      query.store = storeId;
    }
    if (featured === 'true') {
      query.isFeatured = true;
    }
    if (tag) {
      query.tags = { $in: Array.isArray(tag) ? tag : [tag] };
    }
    if (search) {
      query.$text = { $search: search as string };
    }

    const [deals, total] = await Promise.all([
      LockPriceDeal.find(query)
        .sort({ isFeatured: -1, priority: -1, createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('store', 'name logo address')
        .lean(),
      LockPriceDeal.countDocuments(query),
    ]);

    sendPaginated(res, deals, pageNum, limitNum, total, 'Lock deals retrieved');
  } catch (error: any) {
    logger.error('[LOCK DEALS] Error fetching deals:', error);
    throw new AppError('Failed to fetch lock deals', 500, 'LOCK_DEALS_BROWSE', error);
  }
});

/**
 * GET /api/lock-deals/:id
 * Get single lock deal detail
 */
export const getLockDealById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const deal = await LockPriceDeal.findById(id)
      .populate('store', 'name logo address ratings')
      .lean();

    if (!deal) {
      return sendNotFound(res, 'Lock deal not found');
    }

    // If user is authenticated, check if they already locked this deal
    let userLock = null;
    if ((req as any).userId) {
      userLock = await UserLockDeal.findOne({
        user: (req as any).userId,
        lockDeal: id,
        status: { $in: ['locked', 'paid_balance'] },
      }).lean();
    }

    sendSuccess(res, { deal, userLock }, 'Lock deal details retrieved');
  } catch (error: any) {
    logger.error('[LOCK DEALS] Error fetching deal detail:', error);
    throw new AppError('Failed to fetch deal details', 500, 'LOCK_DEAL_DETAIL', error);
  }
});

// ==================== LOCK A DEAL ====================

/**
 * POST /api/lock-deals/:id/lock
 * Lock a deal by paying the deposit
 *
 * Flow:
 * 1. Validate deal is active, not expired, inventory available
 * 2. Check user hasn't already locked this deal
 * 3. Create Stripe PaymentIntent for deposit amount
 * 4. Return clientSecret for frontend to complete payment
 */
export const initiateLock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req as any).userId;

  try {
    // 1. Find the deal
    const deal = await LockPriceDeal.findById(id).lean();
    if (!deal) {
      return sendNotFound(res, 'Lock deal not found');
    }

    // 2. Validate deal is active and running
    const now = new Date();
    if (!deal.isActive) {
      return sendBadRequest(res, 'This deal is no longer active');
    }
    if (deal.validFrom > now) {
      return sendBadRequest(res, 'This deal has not started yet');
    }
    if (deal.validUntil < now) {
      return sendBadRequest(res, 'This deal has expired');
    }

    // 3. Check inventory
    if (deal.maxLocks > 0 && deal.currentLocks >= deal.maxLocks) {
      return sendBadRequest(res, 'This deal is sold out');
    }

    // 4. Check user hasn't already locked this deal
    const alreadyLocked = await UserLockDeal.hasUserLocked(userId, id);
    if (alreadyLocked) {
      return sendConflict(res, 'You have already locked this deal');
    }

    // 5. Create Stripe PaymentIntent for deposit
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: deal.depositAmount,
      currency: deal.currency.toLowerCase(),
      metadata: {
        type: 'lock_deal_deposit',
        lockDealId: id,
        userId,
        depositAmount: deal.depositAmount.toString(),
        balanceAmount: deal.balanceAmount.toString(),
      },
    });

    sendSuccess(res, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      deal: {
        _id: deal._id,
        title: deal.title,
        image: deal.image,
        originalPrice: deal.originalPrice,
        lockedPrice: deal.lockedPrice,
        depositAmount: deal.depositAmount,
        balanceAmount: deal.balanceAmount,
        depositPercent: deal.depositPercent,
        currency: deal.currency,
        lockReward: deal.lockReward,
        pickupReward: deal.pickupReward,
        earningsMultiplier: deal.earningsMultiplier,
        pickupWindowDays: deal.pickupWindowDays,
        storeName: deal.storeName,
      },
    }, 'Deposit payment initiated');
  } catch (error: any) {
    logger.error('[LOCK DEALS] Error initiating lock:', error);
    if (error.message?.includes('Stripe')) {
      return sendBadRequest(res, 'Payment service temporarily unavailable');
    }
    throw new AppError('Failed to initiate lock', 500, 'LOCK_INITIATE', error);
  }
});

/**
 * POST /api/lock-deals/:id/confirm-lock
 * Confirm lock after deposit payment is successful
 *
 * Flow:
 * 1. Verify Stripe PaymentIntent succeeded
 * 2. Create UserLockDeal record
 * 3. Increment currentLocks on deal
 * 4. Credit lock reward (coins) to user's wallet
 * 5. Create CoinTransaction for lock reward
 * 6. Generate pickup code
 */
export const confirmLock = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentIntentId } = req.body;
  const userId = (req as any).userId;

  if (!paymentIntentId) {
    return sendBadRequest(res, 'Payment intent ID is required');
  }

  const session = await mongoose.startSession();

  try {
    // 1. Verify payment intent
    const paymentVerification = await stripeService.verifyPaymentIntent(paymentIntentId);
    if (!paymentVerification.verified) {
      return sendBadRequest(res, `Payment not verified. Status: ${paymentVerification.status}`);
    }

    // Validate metadata matches
    if (paymentVerification.metadata.lockDealId !== id || paymentVerification.metadata.userId !== userId) {
      return sendBadRequest(res, 'Payment verification mismatch');
    }

    // 2. Find the deal
    const deal = await LockPriceDeal.findById(id).lean();
    if (!deal) {
      return sendNotFound(res, 'Lock deal not found');
    }

    // 3. Double-check inventory and user lock status
    if (deal.maxLocks > 0 && deal.currentLocks >= deal.maxLocks) {
      return sendBadRequest(res, 'Deal sold out while processing payment');
    }
    const alreadyLocked = await UserLockDeal.hasUserLocked(userId, id);
    if (alreadyLocked) {
      return sendConflict(res, 'Deal already locked');
    }

    session.startTransaction();

    // 4. Generate pickup code
    const pickupCode = (UserLockDeal as any).generatePickupCode();

    // 5. Calculate expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + deal.pickupWindowDays);

    // 6. Create UserLockDeal
    const [userLockDeal] = await UserLockDeal.create([{
      user: userId,
      lockDeal: id,
      status: 'locked',
      depositPaymentId: paymentIntentId,
      depositStripePaymentIntentId: paymentIntentId,
      depositPaidAt: new Date(),
      depositAmount: deal.depositAmount,
      balanceAmount: deal.balanceAmount,
      lockRewardCredited: false,
      lockRewardAmount: deal.lockReward.amount * deal.earningsMultiplier,
      pickupRewardCredited: false,
      pickupRewardAmount: deal.pickupReward.amount * deal.earningsMultiplier,
      earningsMultiplier: deal.earningsMultiplier,
      pickupCode,
      expiresAt,
      dealSnapshot: {
        title: deal.title,
        image: deal.image,
        originalPrice: deal.originalPrice,
        lockedPrice: deal.lockedPrice,
        depositPercent: deal.depositPercent,
        currency: deal.currency,
        storeName: deal.storeName,
        storeId: deal.store.toString(),
        lockReward: deal.lockReward,
        pickupReward: deal.pickupReward,
        earningsMultiplier: deal.earningsMultiplier,
      },
    }], { session });

    // 7. Increment currentLocks atomically
    await LockPriceDeal.findByIdAndUpdate(
      id,
      { $inc: { currentLocks: 1 } },
      { session }
    );

    // 8. Credit lock reward to wallet via walletService
    const lockRewardAmount = deal.lockReward.amount * deal.earningsMultiplier;
    if (lockRewardAmount > 0 && deal.lockReward.type === 'coins') {
      await walletService.credit({
        userId,
        amount: lockRewardAmount,
        source: 'purchase_reward',
        description: `Lock reward for "${deal.title}" (${deal.earningsMultiplier}x)`,
        operationType: 'lock_fee',
        referenceId: userLockDeal._id.toString(),
        referenceModel: 'UserLockDeal',
        metadata: {
          lockDealId: id,
          userLockDealId: userLockDeal._id,
          lockDealTitle: deal.title,
          storeId: deal.store.toString(),
          storeName: deal.storeName,
          rewardType: 'lock',
          earningsMultiplier: deal.earningsMultiplier,
          baseAmount: deal.lockReward.amount,
        },
        session,
      });

      // Mark reward as credited
      userLockDeal.lockRewardCredited = true;
      await userLockDeal.save({ session });

      logger.info(`[LOCK DEALS] Lock reward credited: ${lockRewardAmount} coins to user ${userId}`);
    }

    // 9. Create Transaction display record
    await Transaction.create([{
      userId,
      type: 'credit',
      amount: lockRewardAmount,
      description: `Lock reward for "${deal.title}" (${deal.earningsMultiplier}x earnings)`,
      source: 'lock_deal',
      referenceId: userLockDeal._id,
      status: 'completed',
    }], { session });

    await session.commitTransaction();

    sendCreated(res, {
      userLockDeal: {
        _id: userLockDeal._id,
        status: userLockDeal.status,
        pickupCode,
        depositAmount: userLockDeal.depositAmount,
        balanceAmount: userLockDeal.balanceAmount,
        lockRewardEarned: lockRewardAmount,
        earningsMultiplier: deal.earningsMultiplier,
        expiresAt,
        dealSnapshot: userLockDeal.dealSnapshot,
      },
    }, 'Deal locked successfully! Earn more when you pick up.');
  } catch (error: any) {
    await session.abortTransaction();
    logger.error('[LOCK DEALS] Error confirming lock:', error);

    if (error.code === 11000) {
      return sendConflict(res, 'You have already locked this deal');
    }
    throw new AppError('Failed to confirm lock', 500, 'LOCK_CONFIRM', error);
  } finally {
    session.endSession();
  }
});

// ==================== PAY BALANCE ====================

/**
 * POST /api/lock-deals/:lockId/pay-balance
 * Initiate balance payment for a locked deal
 */
export const initiateBalancePayment = asyncHandler(async (req: Request, res: Response) => {
  const { lockId } = req.params;
  const userId = (req as any).userId;

  try {
    // Find user's lock
    const userLock = await UserLockDeal.findOne({
      _id: lockId,
      user: userId,
      status: 'locked',
    }).lean();

    if (!userLock) {
      return sendNotFound(res, 'Active lock not found');
    }

    // Check if expired
    if (userLock.expiresAt < new Date()) {
      return sendBadRequest(res, 'This lock has expired. Your deposit will be refunded.');
    }

    // Create PaymentIntent for balance
    const paymentIntent = await stripeService.createPaymentIntent({
      amount: userLock.balanceAmount,
      currency: userLock.dealSnapshot.currency.toLowerCase(),
      metadata: {
        type: 'lock_deal_balance',
        userLockDealId: lockId,
        lockDealId: userLock.lockDeal.toString(),
        userId,
        balanceAmount: userLock.balanceAmount.toString(),
      },
    });

    sendSuccess(res, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      balanceAmount: userLock.balanceAmount,
      currency: userLock.dealSnapshot.currency,
      dealTitle: userLock.dealSnapshot.title,
    }, 'Balance payment initiated');
  } catch (error: any) {
    logger.error('[LOCK DEALS] Error initiating balance payment:', error);
    throw new AppError('Failed to initiate balance payment', 500, 'BALANCE_INITIATE', error);
  }
});

/**
 * POST /api/lock-deals/:lockId/confirm-balance
 * Confirm balance payment after Stripe succeeds
 */
export const confirmBalancePayment = asyncHandler(async (req: Request, res: Response) => {
  const { lockId } = req.params;
  const { paymentIntentId } = req.body;
  const userId = (req as any).userId;

  if (!paymentIntentId) {
    return sendBadRequest(res, 'Payment intent ID is required');
  }

  try {
    // 1. Verify payment
    const verification = await stripeService.verifyPaymentIntent(paymentIntentId);
    if (!verification.verified) {
      return sendBadRequest(res, `Payment not verified. Status: ${verification.status}`);
    }

    if (verification.metadata.userLockDealId !== lockId || verification.metadata.userId !== userId) {
      return sendBadRequest(res, 'Payment verification mismatch');
    }

    // 2. Update UserLockDeal (also verify lock hasn't expired)
    const userLock = await UserLockDeal.findOneAndUpdate(
      {
        _id: lockId,
        user: userId,
        status: 'locked',
        expiresAt: { $gt: new Date() }, // Atomic expiry check — prevents payment on expired locks
      },
      {
        $set: {
          status: 'paid_balance',
          balancePaymentId: paymentIntentId,
          balanceStripePaymentIntentId: paymentIntentId,
          balancePaidAt: new Date(),
        },
      },
      { new: true }
    );

    if (!userLock) {
      return sendNotFound(res, 'Lock not found, already paid, or expired. If you were charged, a refund will be processed.');
    }

    logger.info(`[LOCK DEALS] Balance paid for lock ${lockId} by user ${userId}`);

    sendSuccess(res, {
      userLockDeal: {
        _id: userLock._id,
        status: userLock.status,
        pickupCode: userLock.pickupCode,
        balancePaidAt: userLock.balancePaidAt,
        dealSnapshot: userLock.dealSnapshot,
      },
    }, 'Balance paid! Show your pickup code at the store.');
  } catch (error: any) {
    logger.error('[LOCK DEALS] Error confirming balance:', error);
    throw new AppError('Failed to confirm balance payment', 500, 'BALANCE_CONFIRM', error);
  }
});

// ==================== PICKUP VERIFICATION ====================

/**
 * POST /api/lock-deals/verify-pickup/:code
 * Merchant verifies pickup using the code
 *
 * Flow:
 * 1. Find UserLockDeal by pickup code
 * 2. Validate status is 'locked' or 'paid_balance'
 * 3. Mark as picked_up
 * 4. Credit pickup reward with earnings multiplier
 * 5. Increment totalPickedUp on deal
 */
export const verifyPickup = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const { merchantNotes } = req.body;
  const merchantUserId = (req as any).userId;

  const session = await mongoose.startSession();

  try {
    // 1. Find lock by pickup code
    const userLock = await UserLockDeal.findOne({ pickupCode: code });
    if (!userLock) {
      return sendNotFound(res, 'Invalid pickup code');
    }

    // 2. Validate status
    if (!['locked', 'paid_balance'].includes(userLock.status)) {
      return sendBadRequest(res, `Cannot verify pickup: deal status is "${userLock.status}"`);
    }

    // 3. Check expiry
    if (userLock.expiresAt < new Date()) {
      return sendBadRequest(res, 'This lock has expired');
    }

    session.startTransaction();

    // 4. Mark as picked up
    userLock.status = 'picked_up';
    userLock.pickedUpAt = new Date();
    userLock.pickedUpByMerchant = new mongoose.Types.ObjectId(merchantUserId);
    if (merchantNotes) {
      userLock.merchantNotes = merchantNotes;
    }

    // 5. Credit pickup reward via walletService
    const pickupRewardAmount = userLock.pickupRewardAmount; // Already multiplied at lock time
    if (pickupRewardAmount > 0 && !userLock.pickupRewardCredited) {
      await walletService.credit({
        userId: userLock.user.toString(),
        amount: pickupRewardAmount,
        source: 'purchase_reward',
        description: `Pickup reward for "${userLock.dealSnapshot.title}" (${userLock.earningsMultiplier}x)`,
        operationType: 'lock_fee',
        referenceId: userLock._id.toString(),
        referenceModel: 'UserLockDeal',
        metadata: {
          lockDealId: userLock.lockDeal.toString(),
          userLockDealId: userLock._id,
          lockDealTitle: userLock.dealSnapshot.title,
          storeId: userLock.dealSnapshot.storeId,
          storeName: userLock.dealSnapshot.storeName,
          rewardType: 'pickup',
          earningsMultiplier: userLock.earningsMultiplier,
          baseAmount: userLock.pickupRewardAmount / userLock.earningsMultiplier,
        },
        session,
      });

      userLock.pickupRewardCredited = true;
      logger.info(`[LOCK DEALS] Pickup reward credited: ${pickupRewardAmount} coins to user ${userLock.user}`);
    }

    await userLock.save({ session });

    // 6. Increment totalPickedUp on deal
    await LockPriceDeal.findByIdAndUpdate(
      userLock.lockDeal,
      { $inc: { totalPickedUp: 1 } },
      { session }
    );

    // 7. Create Transaction display record
    if (pickupRewardAmount > 0) {
      await Transaction.create([{
        userId: userLock.user.toString(),
        type: 'credit',
        amount: pickupRewardAmount,
        description: `Pickup reward for "${userLock.dealSnapshot.title}" (${userLock.earningsMultiplier}x earnings)`,
        source: 'lock_deal',
        referenceId: userLock._id,
        status: 'completed',
      }], { session });
    }

    await session.commitTransaction();

    sendSuccess(res, {
      verified: true,
      userLockDeal: {
        _id: userLock._id,
        status: 'picked_up',
        pickedUpAt: userLock.pickedUpAt,
        pickupRewardEarned: pickupRewardAmount,
        totalRewardEarned: (userLock.lockRewardCredited ? userLock.lockRewardAmount : 0) + pickupRewardAmount,
        dealSnapshot: userLock.dealSnapshot,
        user: userLock.user,
      },
    }, 'Pickup verified! Rewards credited to customer.');
  } catch (error: any) {
    await session.abortTransaction();
    logger.error('[LOCK DEALS] Error verifying pickup:', error);
    throw new AppError('Failed to verify pickup', 500, 'PICKUP_VERIFY', error);
  } finally {
    session.endSession();
  }
});

// ==================== USER'S LOCKS ====================

/**
 * GET /api/lock-deals/my-locks
 * Get current user's locked deals
 */
export const getMyLocks = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { status, page = '1', limit = '20' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 20));

  try {
    const query: any = { user: userId };

    if (status) {
      // Allow comma-separated statuses
      const statuses = (status as string).split(',').map(s => s.trim());
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    const [locks, total] = await Promise.all([
      UserLockDeal.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('lockDeal', 'title image store storeName lockedPrice originalPrice')
        .lean(),
      UserLockDeal.countDocuments(query),
    ]);

    sendPaginated(res, locks, pageNum, limitNum, total, 'Your locked deals');
  } catch (error: any) {
    logger.error('[LOCK DEALS] Error fetching user locks:', error);
    throw new AppError('Failed to fetch your locks', 500, 'MY_LOCKS', error);
  }
});

/**
 * GET /api/lock-deals/my-locks/:lockId
 * Get single lock detail for current user
 */
export const getMyLockDetail = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { lockId } = req.params;

  try {
    const lock = await UserLockDeal.findOne({ _id: lockId, user: userId })
      .populate('lockDeal')
      .lean();

    if (!lock) {
      return sendNotFound(res, 'Lock not found');
    }

    sendSuccess(res, { lock }, 'Lock detail retrieved');
  } catch (error: any) {
    logger.error('[LOCK DEALS] Error fetching lock detail:', error);
    throw new AppError('Failed to fetch lock detail', 500, 'LOCK_DETAIL', error);
  }
});

// ==================== CANCEL LOCK ====================

/**
 * POST /api/lock-deals/:lockId/cancel
 * Cancel a locked deal and initiate deposit refund
 *
 * Refund policy: Full deposit refund minus a cancellation fee (configurable)
 */
export const cancelLock = asyncHandler(async (req: Request, res: Response) => {
  const { lockId } = req.params;
  const { reason } = req.body;
  const userId = (req as any).userId;

  const session = await mongoose.startSession();

  try {
    // 1. Find the user's active lock
    const userLock = await UserLockDeal.findOne({
      _id: lockId,
      user: userId,
      status: { $in: ['locked', 'paid_balance'] },
    }).lean();

    if (!userLock) {
      return sendNotFound(res, 'Active lock not found');
    }

    session.startTransaction();

    // 2. Calculate refund amount (full deposit for now; can add cancellation fee later)
    const cancellationFeePercent = 0; // Can be made configurable
    const cancellationFee = Math.ceil(userLock.depositAmount * cancellationFeePercent / 100);
    const refundAmount = userLock.depositAmount - cancellationFee;

    // 3. If balance was also paid, refund that too
    const balanceRefund = userLock.status === 'paid_balance' ? userLock.balanceAmount : 0;
    const totalRefund = refundAmount + balanceRefund;

    // 4. Update UserLockDeal
    userLock.status = 'cancelled';
    userLock.cancelledAt = new Date();
    userLock.cancellationReason = reason || 'User cancelled';
    userLock.refundedAt = new Date();
    userLock.refundAmount = totalRefund;
    await userLock.save({ session });

    // 5. Decrement currentLocks on the deal
    await LockPriceDeal.findByIdAndUpdate(
      userLock.lockDeal,
      { $inc: { currentLocks: -1 } },
      { session }
    );

    // 6. Reverse lock reward if it was credited via walletService
    if (userLock.lockRewardCredited && userLock.lockRewardAmount > 0) {
      await walletService.debit({
        userId,
        amount: userLock.lockRewardAmount,
        source: 'redemption',
        description: `Lock reward reversed: cancelled "${userLock.dealSnapshot.title}"`,
        operationType: 'lock_fee_refund',
        referenceId: userLock._id.toString(),
        referenceModel: 'UserLockDeal',
        metadata: {
          lockDealId: userLock.lockDeal.toString(),
          userLockDealId: userLock._id,
          reason: 'cancellation',
        },
        session,
      });

      logger.warn(`[LOCK DEALS] Lock reward reversed: ${userLock.lockRewardAmount} coins from user ${userId}`);
    }

    // 7. Create refund transaction display record
    await Transaction.create([{
      userId,
      type: 'credit',
      amount: totalRefund,
      description: `Refund for cancelled lock deal "${userLock.dealSnapshot.title}"`,
      source: 'lock_deal_refund',
      referenceId: userLock._id,
      status: 'completed',
    }], { session });

    await session.commitTransaction();

    // 9. Initiate Stripe refund for deposit
    if (userLock.depositStripePaymentIntentId && refundAmount > 0) {
      try {
        // Note: Stripe refund is best-effort; track manually if it fails
        logger.info(`[LOCK DEALS] Initiating Stripe refund of ${refundAmount} for PI ${userLock.depositStripePaymentIntentId}`);
        // stripeService.refundPaymentIntent can be added later
      } catch (refundError) {
        logger.error('[LOCK DEALS] Stripe refund failed, needs manual processing:', refundError);
      }
    }

    sendSuccess(res, {
      cancelled: true,
      refundAmount: totalRefund,
      lockRewardReversed: userLock.lockRewardCredited ? userLock.lockRewardAmount : 0,
    }, 'Lock cancelled. Refund will be processed.');
  } catch (error: any) {
    await session.abortTransaction();
    logger.error('[LOCK DEALS] Error cancelling lock:', error);
    throw new AppError('Failed to cancel lock', 500, 'LOCK_CANCEL', error);
  } finally {
    session.endSession();
  }
});

// ==================== EXPIRY PROCESSING ====================

/**
 * Process expired locks (called by cron job or admin)
 * Finds locks past their expiresAt date and marks them as expired
 */
export const processExpiredLocks = asyncHandler(async (req: Request, res: Response) => {
  const now = new Date();

  try {
    // Find all expired locks that are still in active status
    const expiredLocks = await UserLockDeal.find({
      status: { $in: ['locked', 'paid_balance'] },
      expiresAt: { $lt: now },
    }).lean();

    let processedCount = 0;
    const errors: string[] = [];

    for (const lock of expiredLocks) {
      try {
        lock.status = 'expired';
        lock.refundedAt = new Date();
        lock.refundAmount = lock.depositAmount; // Full deposit refund on expiry

        // If balance was paid, refund that too
        if (lock.balancePaidAt) {
          lock.refundAmount += lock.balanceAmount;
        }

        await lock.save();

        // Decrement currentLocks
        await LockPriceDeal.findByIdAndUpdate(
          lock.lockDeal,
          { $inc: { currentLocks: -1 } }
        );

        // Reverse lock reward if credited via walletService
        if (lock.lockRewardCredited && lock.lockRewardAmount > 0) {
          await walletService.debit({
            userId: lock.user.toString(),
            amount: lock.lockRewardAmount,
            source: 'redemption',
            description: `Lock reward reversed: expired "${lock.dealSnapshot.title}"`,
            operationType: 'lock_fee_refund',
            referenceId: lock._id.toString(),
            referenceModel: 'UserLockDeal',
            metadata: {
              lockDealId: lock.lockDeal.toString(),
              userLockDealId: lock._id,
              reason: 'expiry',
            },
          });
        }

        processedCount++;
        logger.info(`[LOCK DEALS] Expired lock ${lock._id} processed`);
      } catch (lockError: any) {
        errors.push(`Lock ${lock._id}: ${lockError.message}`);
        logger.error(`[LOCK DEALS] Error processing expired lock ${lock._id}:`, lockError);
      }
    }

    sendSuccess(res, {
      totalExpired: expiredLocks.length,
      processed: processedCount,
      errors: errors.length > 0 ? errors : undefined,
    }, `Processed ${processedCount} expired locks`);
  } catch (error: any) {
    logger.error('[LOCK DEALS] Error processing expired locks:', error);
    throw new AppError('Failed to process expired locks', 500, 'EXPIRE_PROCESS', error);
  }
});
