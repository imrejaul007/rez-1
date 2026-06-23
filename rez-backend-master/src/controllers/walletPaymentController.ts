import { Request, Response } from 'express';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { CoinTransaction } from '../models/CoinTransaction';
import { Payment } from '../models/Payment';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import mongoose from 'mongoose';
import activityService from '../services/activityService';
import paymentGatewayService from '../services/paymentGatewayService';
import redisService from '../services/redisService';
import { validateAmount, sanitizeErrorMessage } from '../utils/walletValidation';
import { logger } from '../config/logger';
import { ledgerService } from '../services/ledgerService';

/**
 * @swagger
 * /api/wallet/credit-loyalty-points:
 *   post:
 *     summary: Credit loyalty coins to wallet
 *     description: Admin-only endpoint to credit coins to a user's wallet.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount of coins to credit
 *               source:
 *                 type: string
 *                 description: Source of the credit
 *               idempotencyKey:
 *                 type: string
 *                 description: Unique key to prevent duplicate credits
 *     responses:
 *       200:
 *         description: Coins credited successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount or validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       429:
 *         description: Rate limit exceeded
 */
export const creditLoyaltyPoints = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, source, idempotencyKey } = req.body;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const amountCheck = validateAmount(amount, { fieldName: 'Loyalty points' });
  if (!amountCheck.valid) return sendBadRequest(res, amountCheck.error);
  const validatedAmount = amountCheck.amount;

  // Idempotency check — prevent duplicate credits on admin retry
  if (idempotencyKey) {
    const existingTx = await CoinTransaction.findOne({
      user: userId,
      'metadata.idempotencyKey': idempotencyKey,
    }).lean();
    if (existingTx) {
      const wallet = await Wallet.findOne({ user: userId }).lean();
      return sendSuccess(res, {
        wallet: wallet ? { balance: wallet.balance, coins: wallet.coins } : null,
        duplicate: true,
      }, 'Loyalty points already credited (duplicate request)');
    }
  }

  // Get or create wallet
  let wallet = await Wallet.findOne({ user: userId }).lean();

  if (!wallet) {
    wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
  }

  if (!wallet) {
    return sendError(res, 'Failed to create wallet', 500);
  }

  // Atomic balance update — prevents race conditions from concurrent requests
  const updatedWallet = await Wallet.findOneAndUpdate(
    { _id: wallet._id },
    {
      $inc: {
        'balance.available': validatedAmount,
        'statistics.totalEarned': validatedAmount
      },
      $set: { lastTransactionAt: new Date() }
    },
    { new: true }
  );

  if (!updatedWallet) {
    return sendError(res, 'Failed to update wallet balance', 500);
  }

  // Update ReZ coin type tracking (non-critical, separate from balance)
  const rezCoin = updatedWallet.coins.find(c => c.type === 'rez');
  if (rezCoin) {
    await Wallet.updateOne(
      { _id: wallet._id, 'coins.type': 'rez' },
      { $inc: { 'coins.$.amount': validatedAmount }, $set: { 'coins.$.lastUsed': new Date() } }
    );
  } else {
    await Wallet.updateOne(
      { _id: wallet._id },
      { $push: { coins: {
        type: 'rez',
        amount: validatedAmount,
        isActive: true,
        color: '#00C06A',
        earnedDate: new Date(),
        lastUsed: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      } as any } }
    );
  }

  // Create transaction record
  try {
    await Transaction.create({
      user: userId,
      type: 'credit',
      category: 'earning',
      amount: validatedAmount,
      currency: 'RC',
      description: source?.description || 'Loyalty points credited',
      source: {
        type: source?.type || 'loyalty_sync',
        reference: source?.reference || 'system',
        description: source?.description || 'Loyalty points conversion',
        metadata: source?.metadata || {}
      },
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date(),
          reason: 'Loyalty points credited successfully'
        }]
      },
      balanceBefore: updatedWallet.balance.available - amount,
      balanceAfter: updatedWallet.balance.available,
      netAmount: amount,
      isReversible: false
    });

    logger.info('✅ [WALLET] Transaction created for loyalty points credit');
  } catch (txError) {
    logger.error('❌ [WALLET] Failed to create transaction:', txError);
  }

  // Create CoinTransaction (source of truth for auto-sync)
  try {
    const coinTx = await CoinTransaction.createTransaction(
      userId,
      'earned',
      validatedAmount,
      source?.type === 'admin' ? 'admin' : 'bonus',
      source?.description || 'Loyalty points credited',
      { loyaltySource: source?.type || 'loyalty_sync', reference: source?.reference }
    );
    logger.info('[WALLET] CoinTransaction created for loyalty points');

    // Create ledger entry (fire-and-forget)
    const userAcctId = new mongoose.Types.ObjectId(userId);
    const platformFloatId = ledgerService.getPlatformAccountId('platform_float');
    ledgerService.recordEntry({
      debitAccount: { type: 'platform_float', id: platformFloatId },
      creditAccount: { type: 'user_wallet', id: userAcctId },
      amount: validatedAmount,
      coinType: 'nuqta',
      operationType: source?.type === 'admin' ? 'admin_adjustment' : 'loyalty_credit',
      referenceId: String(coinTx._id),
      referenceModel: 'CoinTransaction',
      metadata: { description: source?.description || 'Loyalty points credited' },
    }).catch((err: any) => logger.error('[WALLET] Ledger entry failed for loyalty points:', err));
  } catch (ctxError) {
    logger.error('[WALLET] Failed to create CoinTransaction:', ctxError);
  }

  // Log activity
  try {
    await activityService.wallet.onMoneyAdded(
      new mongoose.Types.ObjectId(userId),
      amount
    );
  } catch (activityError) {
    logger.error('❌ [WALLET] Failed to log activity:', activityError);
  }

  logger.info('✅ [WALLET] Loyalty points credited successfully:', {
    amount,
    newBalance: updatedWallet.balance.available,
    rezCoins: rezCoin?.amount
  });

  sendSuccess(res, {
    balance: updatedWallet.balance,
    coins: updatedWallet.coins,
    credited: amount,
    message: `${amount} loyalty points credited to your wallet`
  }, 'Loyalty points credited successfully');
});

/**
 * @swagger
 * /api/wallet/topup:
 *   post:
 *     summary: Admin wallet topup
 *     description: Admin-only endpoint to top up a user's wallet.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to top up
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method used
 *               paymentId:
 *                 type: string
 *                 description: External payment ID
 *     responses:
 *       200:
 *         description: Wallet topped up successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       429:
 *         description: Rate limit exceeded
 */
export const topupWallet = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, paymentMethod, paymentId } = req.body;

  logger.info('💰 [TOPUP] Starting wallet topup');
  logger.info('💰 [TOPUP] User ID:', userId);
  logger.info('💰 [TOPUP] Amount:', amount);
  logger.info('💰 [TOPUP] Payment Method:', paymentMethod);

  if (!userId) {
    logger.error('❌ [TOPUP] No user ID found');
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount
  const topupAmountCheck = validateAmount(amount, { fieldName: 'Topup amount' });
  if (!topupAmountCheck.valid) {
    logger.error('❌ [TOPUP] Invalid amount:', amount);
    return sendBadRequest(res, topupAmountCheck.error);
  }
  const topupAmount = topupAmountCheck.amount;

  // Get wallet
  logger.info('🔍 [TOPUP] Finding wallet for user:', userId);
  let wallet = await Wallet.findOne({ user: userId }).lean();

  if (!wallet) {
    logger.info('🆕 [TOPUP] Wallet not found, creating new wallet');
    wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
  }

  if (!wallet) {
    logger.error('❌ [TOPUP] Failed to create wallet');
    return sendError(res, 'Failed to create wallet', 500);
  }

  logger.info('✅ [TOPUP] Wallet found/created:', wallet._id);
  logger.info('💵 [TOPUP] Current balance:', wallet.balance.total);

  // Check if wallet is frozen
  if (wallet.isFrozen) {
    logger.error('❌ [TOPUP] Wallet is frozen:', wallet.frozenReason);
    return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
  }

  // Check max balance limit
  if (wallet.balance.total + amount > wallet.limits.maxBalance) {
    logger.error('❌ [TOPUP] Max balance limit would be exceeded');
    return sendBadRequest(res, `Maximum wallet balance limit (${wallet.limits.maxBalance} RC) would be exceeded`);
  }

  // Get current balance for transaction record
  const balanceBefore = wallet.balance.total;

  logger.info('📝 [TOPUP] Creating transaction record');
  logger.info('📝 [TOPUP] Wallet ID for reference:', wallet._id);
  logger.info('📝 [TOPUP] Wallet ID type:', typeof wallet._id);

  // Create transaction record
  try {
    const transaction = new Transaction({
      user: new mongoose.Types.ObjectId(userId),
      type: 'credit',
      category: 'topup',
      amount: topupAmount,
      currency: wallet.currency,
      description: `Wallet topup - ${paymentMethod || 'Payment Gateway'}`,
      source: {
        type: 'topup',
        reference: new mongoose.Types.ObjectId(String(wallet._id)),
        description: `Wallet topup via ${paymentMethod || 'Payment Gateway'}`,
        metadata: {
          paymentId: paymentId || `PAY_${Date.now()}`,
          paymentMethod: paymentMethod || 'gateway'
        }
      },
      balanceBefore: Number(balanceBefore),
      balanceAfter: Number(balanceBefore) + topupAmount,
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date()
        }]
      }
    });

    logger.info('💾 [TOPUP] Saving transaction');
    await transaction.save();
    logger.info('✅ [TOPUP] Transaction saved:', transaction._id);

    // Add funds via walletService (atomic $inc + CoinTransaction + LedgerEntry)
    logger.info('💰 [TOPUP] Adding funds to wallet');
    const { walletService } = await import('../services/walletService');
    await walletService.credit({
      userId,
      amount: topupAmount,
      source: 'recharge',
      description: `Wallet topup via ${paymentMethod || 'Payment Gateway'}`,
      operationType: 'topup',
      referenceId: paymentId || `PAY_${Date.now()}`,
      referenceModel: 'Transaction',
      metadata: { paymentId: paymentId || `PAY_${Date.now()}`, paymentMethod: paymentMethod || 'gateway' },
    });
    // Refresh wallet for response
    wallet = await Wallet.findOne({ user: userId }).lean();
    logger.info('✅ [TOPUP] Funds added via walletService');

    // Create activity for wallet topup
    await activityService.wallet.onMoneyAdded(
      new mongoose.Types.ObjectId(userId),
      topupAmount
    );

    sendSuccess(res, {
      transaction,
      wallet: {
        balance: wallet?.balance || { total: 0, available: 0 },
        currency: wallet?.currency || 'RC',
      }
    }, 'Wallet topup successful', 201);
  } catch (error) {
    logger.error('❌ [TOPUP] Error creating transaction:', error);
    logger.error('❌ [TOPUP] Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
});

/**
 * @swagger
 * /api/wallet/withdraw:
 *   post:
 *     summary: Withdraw funds from wallet
 *     description: Withdraw funds from the wallet. Requires re-authentication and feature flag enabled.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - method
 *               - accountDetails
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to withdraw
 *               method:
 *                 type: string
 *                 description: Withdrawal method (e.g., bank_transfer)
 *               accountDetails:
 *                 type: object
 *                 description: Account details for the withdrawal
 *     responses:
 *       200:
 *         description: Withdrawal initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount or insufficient balance
 *       401:
 *         description: Not authenticated or re-auth required
 *       403:
 *         description: Wallet frozen or withdrawal feature disabled
 *       429:
 *         description: Rate limit exceeded
 */
export const withdrawFunds = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { amount, method, accountDetails } = req.body;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Validate amount using utility (prevents Infinity, NaN, excessive precision, etc.)
  const amtCheck = validateAmount(amount, { fieldName: 'Withdrawal amount' });
  if (!amtCheck.valid) {
    return sendBadRequest(res, amtCheck.error);
  }
  const validatedAmount = amtCheck.amount;

  // Validate method
  if (!method || !['bank', 'upi', 'paypal'].includes(method)) {
    return sendBadRequest(res, 'Invalid withdrawal method');
  }

  // Acquire per-user distributed lock to prevent double-spend race conditions
  const lockKey = `wallet:deduct:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 10);
  if (!lockToken) {
    return sendError(res, 'Another transaction is in progress. Please try again.', 429);
  }

  try {
    // Get wallet
    const wallet = await Wallet.findOne({ user: userId }).lean();

    if (!wallet) {
      return sendNotFound(res, 'Wallet not found');
    }

    // Check if wallet is frozen
    if (wallet.isFrozen) {
      return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
    }

    // Check minimum withdrawal
    if (validatedAmount < wallet.limits.minWithdrawal) {
      return sendBadRequest(res, `Minimum withdrawal amount is ${wallet.limits.minWithdrawal} RC`);
    }

    // Check if sufficient balance
    if (wallet.balance.available < validatedAmount) {
      return sendBadRequest(res, 'Insufficient wallet balance');
    }

    // Calculate fees (2% withdrawal fee)
    const fees = Math.round(validatedAmount * 0.02);
    const netAmount = validatedAmount - fees;

    const balanceBefore = wallet.balance.total;

    // Wrap transaction save + wallet deduction in a MongoDB session for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create withdrawal transaction
      const withdrawalId = `WD${Date.now()}`;
      const transaction = new Transaction({
        user: userId,
        type: 'debit',
        category: 'withdrawal',
        amount: validatedAmount,
        currency: wallet.currency,
        description: `Wallet withdrawal via ${method}`,
        source: {
          type: 'withdrawal',
          reference: wallet._id,
          description: `Withdrawal to ${method}`,
          metadata: {
            withdrawalInfo: {
              method,
              accountDetails: accountDetails || 'Not provided',
              withdrawalId
            }
          }
        },
        balanceBefore,
        balanceAfter: balanceBefore - validatedAmount,
        fees,
        netAmount,
        status: {
          current: 'processing',
          history: [{
            status: 'processing',
            timestamp: new Date()
          }]
        }
      });

      await transaction.save({ session });

      // Deduct from wallet via walletService (atomic $inc + CoinTransaction + LedgerEntry)
      const { walletService } = await import('../services/walletService');
      await walletService.debit({
        userId,
        amount: validatedAmount,
        source: 'withdrawal',
        description: `Withdrawal via ${method}`,
        operationType: 'withdrawal',
        referenceId: withdrawalId,
        referenceModel: 'Transaction',
        metadata: { withdrawalId, method, fees, netAmount },
        session,
      });

      // Also update withdrawal statistics
      await Wallet.findOneAndUpdate(
        { _id: wallet._id },
        { $inc: { 'statistics.totalWithdrawn': validatedAmount } },
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      sendSuccess(res, {
        transaction,
        withdrawalId,
        netAmount,
        fees,
        wallet: {
          balance: { ...wallet.balance, available: wallet.balance.available - validatedAmount, total: wallet.balance.total - validatedAmount },
          currency: wallet.currency
        },
        estimatedProcessingTime: '2-3 business days'
      }, 'Withdrawal request submitted successfully', 201);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } finally {
    await redisService.releaseLock(lockKey, lockToken);
  }
});

/**
 * @swagger
 * /api/wallet/payment:
 *   post:
 *     summary: Process wallet payment
 *     description: Deducts coins from the wallet to process an order payment.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount in coins
 *               orderId:
 *                 type: string
 *                 description: Associated order ID
 *               storeId:
 *                 type: string
 *                 description: Store ID
 *               storeName:
 *                 type: string
 *                 description: Store display name
 *               description:
 *                 type: string
 *                 description: Payment description
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: List of items in the order
 *     responses:
 *       200:
 *         description: Payment processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount or insufficient balance
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Wallet frozen
 *       429:
 *         description: Rate limit exceeded
 */
export const processPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const {
    amount,
    orderId,
    storeId,
    storeName,
    description,
    items
  } = req.body;

  logger.info('💳 [PAYMENT] Starting payment processing');

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Idempotency check — prevent double-debit on retries
  const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;
  if (idempotencyKey) {
    const idemCacheKey = `wallet:payment:idem:${idempotencyKey}`;
    const cachedResult = await redisService.get<string>(idemCacheKey);
    if (cachedResult) {
      logger.info(`💳 [PAYMENT] Idempotency hit for key ${idempotencyKey}`);
      const parsed = JSON.parse(cachedResult);
      return sendSuccess(res, parsed.data, parsed.message, parsed.statusCode);
    }
  }

  // Validate amount
  const payAmountCheck = validateAmount(amount, { fieldName: 'Payment amount' });
  if (!payAmountCheck.valid) {
    return sendBadRequest(res, payAmountCheck.error);
  }
  const payAmount = payAmountCheck.amount;

  // Validate orderId ownership — prevent paying for someone else's order
  if (orderId) {
    const { Order } = await import('../models/Order');
    const order = await Order.findOne({ _id: orderId, user: userId }).lean();
    if (!order) {
      return sendBadRequest(res, 'Order not found or does not belong to you');
    }
  }

  // Acquire per-user distributed lock to prevent double-spend race conditions
  const lockKey = `wallet:deduct:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 10);
  if (!lockToken) {
    return sendError(res, 'Another transaction is in progress. Please try again.', 429);
  }

  try {
    // Get wallet
    const wallet = await Wallet.findOne({ user: userId }).lean();

    if (!wallet) {
      return sendNotFound(res, 'Wallet not found');
    }

    // Check if wallet is frozen
    if (wallet.isFrozen) {
      return sendError(res, `Wallet is frozen: ${wallet.frozenReason}`, 403);
    }

    // Check if can spend
    if (!wallet.canSpend(payAmount)) {
      if (wallet.balance.available < payAmount) {
        return sendBadRequest(res, 'Insufficient wallet balance');
      } else {
        return sendBadRequest(res, 'Daily spending limit exceeded');
      }
    }

    const balanceBefore = wallet.balance.total;

    // Wrap transaction save + wallet deduction in a MongoDB session for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create payment transaction
      const transaction = new Transaction({
        user: new mongoose.Types.ObjectId(userId),
        type: 'debit',
        category: 'spending',
        amount: payAmount,
        currency: wallet.currency,
        description: description || `Payment for order ${orderId || 'N/A'}`,
        source: {
          type: 'order',
          reference: orderId ? new mongoose.Types.ObjectId(orderId) : new mongoose.Types.ObjectId(String(wallet._id)),
          description: `Purchase from ${storeName || 'Store'}`,
          metadata: {
            orderNumber: orderId || `ORD_${Date.now()}`,
            storeInfo: {
              name: storeName || 'Unknown Store',
              id: storeId ? new mongoose.Types.ObjectId(storeId) : undefined
            },
            items: items || []
          }
        },
        balanceBefore: Number(balanceBefore),
        balanceAfter: Number(balanceBefore) - payAmount,
        status: {
          current: 'completed',
          history: [{
            status: 'completed',
            timestamp: new Date()
          }]
        }
      });

      await transaction.save({ session });

      // Deduct via walletService (atomic $inc + CoinTransaction + LedgerEntry)
      const { walletService: ws } = await import('../services/walletService');
      await ws.debit({
        userId,
        amount: payAmount,
        source: 'order',
        description: description || `Payment for order ${orderId || 'N/A'}`,
        operationType: 'payment',
        referenceId: orderId || `PAY_${Date.now()}`,
        referenceModel: 'Transaction',
        metadata: { orderId, storeId, storeName },
        session,
      });

      const deductResult = await Wallet.findOne({ user: userId }).session(session).lean();

      if (!deductResult) {
        throw new Error('Wallet not found after deduction');
      }

      await session.commitTransaction();
      session.endSession();

      // Create activity for wallet spending
      await activityService.wallet.onMoneySpent(
        new mongoose.Types.ObjectId(userId),
        payAmount,
        storeName || 'order'
      );

      const responseData = {
        transaction,
        wallet: {
          balance: deductResult.balance,
          currency: deductResult.currency
        },
        paymentStatus: 'success'
      };

      // Cache idempotency result (24h TTL)
      if (idempotencyKey) {
        const idemCacheKey = `wallet:payment:idem:${idempotencyKey}`;
        await redisService.set(idemCacheKey, JSON.stringify({
          data: responseData,
          message: 'Payment processed successfully',
          statusCode: 201
        }), 24 * 60 * 60);
      }

      sendSuccess(res, responseData, 'Payment processed successfully', 201);
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  } finally {
    await redisService.releaseLock(lockKey, lockToken);
  }
});

/**
 * @swagger
 * /api/wallet/initiate-payment:
 *   post:
 *     summary: Initiate payment via gateway
 *     description: Initiates a payment through an external payment gateway (e.g., Stripe).
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *               - paymentMethod
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *               currency:
 *                 type: string
 *                 description: Currency code (e.g., AED, INR)
 *               paymentMethod:
 *                 type: string
 *                 description: Payment method identifier
 *               paymentMethodType:
 *                 type: string
 *                 description: Type of payment method (card, upi, etc.)
 *               purpose:
 *                 type: string
 *                 description: Purpose of payment (e.g., wallet_topup)
 *               userDetails:
 *                 type: object
 *                 description: User details for the payment gateway
 *               metadata:
 *                 type: object
 *                 description: Additional metadata for the payment (e.g., fiatCurrency)
 *               returnUrl:
 *                 type: string
 *                 description: URL to redirect after success
 *               cancelUrl:
 *                 type: string
 *                 description: URL to redirect on cancel
 *     responses:
 *       200:
 *         description: Payment initiated, returns client secret or redirect URL
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid payment parameters
 *       401:
 *         description: Not authenticated
 */
export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const {
    amount,
    currency,
    paymentMethod,
    paymentMethodType,
    purpose,
    userDetails,
    metadata,
    returnUrl,
    cancelUrl
  } = req.body;

  logger.info('💳 [PAYMENT] Initiating payment:', {
    userId,
    amount,
    currency,
    paymentMethod,
    paymentMethodType
  });

  // Validate amount using utility (prevents Infinity, NaN, excessive precision, etc.)
  const amtCheck = validateAmount(amount, { fieldName: 'Payment amount', min: 1 });
  if (!amtCheck.valid) {
    return sendBadRequest(res, amtCheck.error);
  }

  if (!paymentMethod) {
    return sendBadRequest(res, 'Payment method is required');
  }

  if (!paymentMethodType) {
    return sendBadRequest(res, 'Payment method type is required');
  }

  // Get user wallet
  const wallet = await Wallet.findOne({ user: userId }).lean();
  if (!wallet) {
    return sendNotFound(res, 'Wallet not found');
  }

  // Check if wallet is active
  if (!wallet.isActive) {
    return sendBadRequest(res, 'Wallet is not active');
  }

  try {
    // NC/RC are internal coin currencies — map to region's fiat currency (1 NC = 1 fiat unit)
    // Frontend sends fiatCurrency in metadata from its RegionContext
    const regionCurrency = metadata?.fiatCurrency || process.env.PLATFORM_CURRENCY || 'AED';
    const fiatCurrency = (currency === 'NC' || currency === 'RC') ? regionCurrency : (currency || regionCurrency);

    // Reject if the requested gateway isn't configured
    if (!paymentGatewayService.isGatewayConfigured(paymentMethod)) {
      return sendBadRequest(res, `Payment gateway '${paymentMethod}' is not configured. Please choose a different payment method.`);
    }

    // For wallet topup, apply recharge discount (pay less, get full NC)
    let chargeAmount = amtCheck.amount;
    let creditAmount = amtCheck.amount; // NC to credit to wallet
    if (purpose === 'wallet_topup') {
      try {
        const { WalletConfig } = require('../models/WalletConfig');
        const config = await WalletConfig.getOrCreate();
        if (config.rechargeConfig.isEnabled) {
          const sortedTiers = [...config.rechargeConfig.tiers].sort((a: any, b: any) => b.minAmount - a.minAmount);
          const applicableTier = sortedTiers.find((t: any) => creditAmount >= t.minAmount);
          if (applicableTier) {
            const rawDiscount = Math.floor(creditAmount * applicableTier.cashbackPercentage / 100);
            const discount = Math.min(rawDiscount, config.rechargeConfig.maxCashback);
            chargeAmount = creditAmount - discount;
            logger.info('💰 [PAYMENT] Recharge discount applied:', { creditAmount, discount, chargeAmount });
          }
        }
      } catch (e) {
        logger.warn('⚠️ [PAYMENT] Failed to calculate discount, charging full amount');
      }
    }

    // Use payment gateway service
    const paymentData = {
      amount: chargeAmount,
      currency: fiatCurrency,
      paymentMethod: paymentMethod as 'stripe' | 'razorpay' | 'paypal',
      paymentMethodType: paymentMethodType as 'card' | 'upi' | 'wallet' | 'netbanking',
      userDetails: userDetails || {},
      metadata: { ...(metadata || {}), purpose: purpose || 'other', creditAmount },
      returnUrl,
      cancelUrl
    };

    const gatewayResponse = await paymentGatewayService.initiatePayment(paymentData, userId);

    logger.info('✅ [PAYMENT] Payment initiated successfully:', gatewayResponse.paymentId);

    sendSuccess(res, gatewayResponse, 'Payment initiated successfully');
  } catch (error: any) {
    logger.error('❌ [PAYMENT] Payment initiation failed:', error);
    sendError(res, sanitizeErrorMessage(error, 'Payment initiation failed'), 500);
  }
});

/**
 * @swagger
 * /api/wallet/confirm-payment:
 *   post:
 *     summary: Confirm Stripe payment
 *     description: Confirms a Stripe payment after frontend confirmCardPayment succeeds. Verifies with Stripe API and credits wallet if purpose is wallet_topup.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 description: Stripe PaymentIntent ID
 *     responses:
 *       200:
 *         description: Payment confirmed and wallet credited
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid or failed payment intent
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 */
export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    return sendBadRequest(res, 'Payment intent ID is required');
  }

  logger.info('💳 [PAYMENT] Confirming payment:', { userId, paymentIntentId });

  try {
    // Find the Payment record FIRST (before status check updates it)
    // Include user ownership filter to prevent cross-user payment crediting
    const payment = await Payment.findOne({
      $or: [
        { paymentId: paymentIntentId },
        { 'gatewayResponse.paymentIntentId': paymentIntentId }
      ],
      user: new mongoose.Types.ObjectId(userId)
    }).lean();

    if (!payment) {
      return sendError(res, 'Payment record not found', 404);
    }

    // Prevent double wallet credit — check if already processed
    if (payment.walletCredited) {
      logger.info('ℹ️ [PAYMENT] Already credited, skipping:', paymentIntentId);
      return sendSuccess(res, { status: 'completed', alreadyProcessed: true }, 'Payment already confirmed');
    }

    // Verify with Stripe that the payment actually succeeded (don't trust frontend alone)
    const stripeStatus = await paymentGatewayService.checkPaymentStatus(
      paymentIntentId,
      'stripe',
      userId
    );

    if (stripeStatus.status !== 'completed') {
      return sendError(res, `Payment not completed. Status: ${stripeStatus.status}`, 400);
    }

    // Re-fetch payment (checkPaymentStatus may have updated it)
    const freshPayment = await Payment.findById(payment._id).lean();
    if (!freshPayment) {
      return sendError(res, 'Payment record not found after status check', 404);
    }

    // Credit wallet if this is a wallet topup
    const purpose = freshPayment.purpose || freshPayment.metadata?.purpose;
    if (purpose === 'wallet_topup') {
      await paymentGatewayService.creditWalletFromPayment(freshPayment);
      // Mark as credited to prevent double processing
      freshPayment.walletCredited = true;
      await freshPayment.save();
      logger.info('✅ [PAYMENT] Wallet credited for confirmed payment:', paymentIntentId);
    }

    sendSuccess(res, { status: 'completed' }, 'Payment confirmed and processed');
  } catch (error: any) {
    logger.error('❌ [PAYMENT] Confirm payment failed:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to confirm payment'), 500);
  }
});

/**
 * @swagger
 * /api/wallet/payment-status/{paymentId}:
 *   get:
 *     summary: Check payment status
 *     description: Checks the current status of a payment by its ID.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID to check
 *       - in: query
 *         name: gateway
 *         schema:
 *           type: string
 *         description: Payment gateway name
 *     responses:
 *       200:
 *         description: Payment status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 *       429:
 *         description: Rate limit exceeded
 */
export const checkPaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { paymentId } = req.params;
  const { gateway } = req.query;

  logger.info('💳 [PAYMENT] Checking payment status:', { userId, paymentId, gateway });

  if (!paymentId) {
    return sendBadRequest(res, 'Payment ID is required');
  }

  if (!gateway) {
    return sendBadRequest(res, 'Payment gateway is required');
  }

  try {
    // Use payment gateway service to check status
    const paymentStatus = await paymentGatewayService.checkPaymentStatus(
      paymentId,
      gateway as string,
      userId
    );

    logger.info('✅ [PAYMENT] Payment status retrieved:', paymentStatus);

    sendSuccess(res, paymentStatus, 'Payment status retrieved successfully');
  } catch (error: any) {
    logger.error('❌ [PAYMENT] Status check failed:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to check payment status'), 500);
  }
});

/**
 * @swagger
 * /api/wallet/payment-methods:
 *   get:
 *     summary: List available payment methods
 *     description: Returns available payment methods based on currency and region.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         description: Coin currency filter
 *       - in: query
 *         name: fiatCurrency
 *         schema:
 *           type: string
 *         description: Fiat currency filter (e.g., AED, INR)
 *     responses:
 *       200:
 *         description: Payment methods retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 */
export const getPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const defaultCurrency = process.env.PLATFORM_CURRENCY || 'AED';
  const { currency: rawCurrency = defaultCurrency, fiatCurrency: regionFiat } = req.query;

  // NC/RC are internal coin currencies — use region's fiat currency from frontend, or env default
  const resolvedCurrency = (regionFiat as string) || defaultCurrency;
  const fiatCurrency = (rawCurrency === 'NC' || rawCurrency === 'RC') ? resolvedCurrency : rawCurrency as string;

  logger.info('💳 [PAYMENT] Fetching payment methods for user:', userId, 'currency:', fiatCurrency);

  try {
    // Method display config
    const methodInfo: Record<string, { name: string; icon: string; processingTime: string }> = {
      upi: { name: 'UPI', icon: '📱', processingTime: 'Instant' },
      card: { name: 'Debit/Credit Card', icon: '💳', processingTime: '2-3 minutes' },
      wallet: { name: 'Digital Wallet', icon: '👛', processingTime: 'Instant' },
      netbanking: { name: 'Net Banking', icon: '🏦', processingTime: '5-10 minutes' },
      paypal: { name: 'PayPal', icon: '🅿️', processingTime: '2-5 minutes' },
    };

    // Gateway priority: prefer Razorpay for INR, Stripe for international, PayPal as fallback
    const gatewayPriority = fiatCurrency === 'INR'
      ? ['razorpay', 'stripe', 'paypal']
      : ['stripe', 'paypal', 'razorpay'];

    // Collect all available methods per gateway (only if credentials are configured)
    const gatewayMethods: Record<string, { gateway: string; methods: string[]; fee: Record<string, number> }> = {};

    if (paymentGatewayService.isGatewayConfigured('stripe') &&
        paymentGatewayService.getSupportedCurrencies('stripe').includes(fiatCurrency)) {
      gatewayMethods['stripe'] = {
        gateway: 'stripe',
        methods: paymentGatewayService.getAvailablePaymentMethods('stripe', fiatCurrency),
        fee: { card: 2.9 }
      };
    }

    if (fiatCurrency === 'INR' && paymentGatewayService.isGatewayConfigured('razorpay')) {
      gatewayMethods['razorpay'] = {
        gateway: 'razorpay',
        methods: paymentGatewayService.getAvailablePaymentMethods('razorpay', fiatCurrency),
        fee: { card: 2.0 }
      };
    }

    if (paymentGatewayService.isGatewayConfigured('paypal') &&
        paymentGatewayService.getSupportedCurrencies('paypal').includes(fiatCurrency)) {
      gatewayMethods['paypal'] = {
        gateway: 'paypal',
        methods: paymentGatewayService.getAvailablePaymentMethods('paypal', fiatCurrency),
        fee: { card: 3.4, paypal: 2.9 }
      };
    }

    // Deduplicate: one entry per method type, pick the highest-priority gateway
    const seen = new Set<string>();
    const paymentMethods: any[] = [];

    for (const gw of gatewayPriority) {
      const entry = gatewayMethods[gw];
      if (!entry) continue;

      for (const method of entry.methods) {
        if (seen.has(method)) continue;
        seen.add(method);

        const info = methodInfo[method] || { name: method, icon: '💰', processingTime: 'Varies' };
        paymentMethods.push({
          id: `${gw}_${method}`,
          name: info.name,
          type: method,
          gateway: gw,
          icon: info.icon,
          isAvailable: true,
          processingFee: entry.fee[method] ?? 0,
          processingTime: info.processingTime,
          description: `Pay using ${info.name}`,
        });
      }
    }

    logger.info('✅ [PAYMENT] Payment methods retrieved:', paymentMethods.length);

    sendSuccess(res, paymentMethods, 'Payment methods retrieved successfully');
  } catch (error: any) {
    logger.error('❌ [PAYMENT] Failed to fetch payment methods:', error);
    sendError(res, 'Failed to fetch payment methods', 500);
  }
});

/**
 * @desc    Handle payment gateway webhooks
 * @route   POST /api/wallet/webhook/:gateway
 * @access  Public
 */
export const handlePaymentWebhook = asyncHandler(async (req: Request, res: Response) => {
  const { gateway } = req.params;
  const signature = req.headers['stripe-signature'] || req.headers['x-razorpay-signature'] || req.headers['paypal-signature'] || '';

  logger.info('🔔 [PAYMENT WEBHOOK] Received webhook:', { gateway, signature });

  try {
    const result = await paymentGatewayService.handleWebhook(gateway, req.body, signature as string);

    if (result.success) {
      res.status(200).json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    logger.error('❌ [PAYMENT WEBHOOK] Webhook processing failed:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

/**
 * @swagger
 * /api/wallet/dev-topup:
 *   post:
 *     summary: Dev-only wallet topup
 *     description: Adds test funds to the wallet. Only available in development environment.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - type
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount to add
 *               type:
 *                 type: string
 *                 enum: [rez, promo, cashback]
 *                 description: Type of coins to add
 *     responses:
 *       200:
 *         description: Dev topup successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount or type
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not available in production
 */
export const devTopup = asyncHandler(async (req: Request, res: Response) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    return sendError(res, 'This endpoint is only available in development', 403);
  }

  const userId = (req as any).userId;
  const { amount = 1000, type = 'rez' } = req.body;

  // Validate dev topup inputs
  const devAmount = Number(amount);
  if (!Number.isFinite(devAmount) || devAmount <= 0 || devAmount > 100000) {
    return sendBadRequest(res, 'Dev topup amount must be between 1 and 100,000');
  }
  if (!['rez', 'promo', 'cashback'].includes(type)) {
    return sendBadRequest(res, 'Invalid coin type. Must be rez, promo, or cashback');
  }

  logger.info('🧪 [DEV TOPUP] Adding test funds:', { userId, amount: devAmount, type });

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const lockKey = `lock:wallet:topup:${userId}`;
  const lockToken = await redisService.acquireLock(lockKey, 10);

  try {
    let wallet = await Wallet.findOne({ user: userId }).lean();

    if (!wallet) {
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }

    if (!wallet) {
      return sendError(res, 'Failed to create wallet', 500);
    }

    // Add to appropriate coin type via walletService (atomic $inc + CoinTransaction + LedgerEntry)
    const { walletService: devWalletService } = await import('../services/walletService');
    if (type === 'promo') {
      // Promo coins: direct wallet update (no CoinTransaction for promo type)
      await Wallet.findOneAndUpdate(
        { user: userId, 'coins.type': 'promo' },
        { $inc: { 'coins.$.amount': devAmount, 'balance.total': devAmount } }
      );
    } else if (type === 'cashback') {
      // Cashback: direct wallet update
      await Wallet.findOneAndUpdate(
        { user: userId },
        { $inc: { 'balance.cashback': devAmount, 'balance.total': devAmount } }
      );
    } else {
      // Default to ReZ Coins — use walletService.credit for proper ledger tracking
      await devWalletService.credit({
        userId: String(wallet.user),
        amount: devAmount,
        source: 'admin',
        description: 'Dev topup',
        operationType: 'topup',
        referenceId: `dev-topup:${wallet.user}:${Date.now()}`,
        referenceModel: 'DevTopup',
        metadata: { devTopup: true },
      });
    }

    // Re-fetch wallet for response
    wallet = await Wallet.findOne({ user: userId }).lean();

    logger.info('[DEV TOPUP] Test funds added:', wallet?.balance);

    sendSuccess(res, {
      wallet: {
        balance: wallet?.balance ?? { total: 0, available: 0 },
        coins: wallet?.coins ?? [],
        currency: wallet?.currency ?? 'RC'
      },
      addedAmount: devAmount,
      type: type
    }, `Test ${type} funds added successfully`);
  } catch (error: any) {
    logger.error('[DEV TOPUP] Error:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to add test funds'), 500);
  } finally {
    if (lockToken) await redisService.releaseLock(lockKey, lockToken);
  }
});

/**
 * @swagger
 * /api/wallet/refund:
 *   post:
 *     summary: Refund a wallet payment
 *     description: Admin-only endpoint to refund a wallet payment, typically when order creation fails after payment.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - amount
 *               - reason
 *             properties:
 *               transactionId:
 *                 type: string
 *                 description: Original transaction ID to refund
 *               amount:
 *                 type: number
 *                 description: Refund amount
 *               reason:
 *                 type: string
 *                 description: Reason for the refund
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid refund parameters
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Original transaction not found
 *       429:
 *         description: Rate limit exceeded
 */
export const refundPayment = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { transactionId, amount, reason } = req.body;

  logger.info('💸 [WALLET REFUND] Processing refund:', { transactionId, amount, reason });

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  if (!transactionId) {
    return sendBadRequest(res, 'Transaction ID is required');
  }
  const refundAmountCheck = validateAmount(amount, { fieldName: 'Refund amount' });
  if (!refundAmountCheck.valid) return sendBadRequest(res, refundAmountCheck.error);
  const refundAmount = refundAmountCheck.amount;

  // Start a MongoDB session for atomic operation
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the original transaction
    const originalTransaction = await Transaction.findOne({
      transactionId,
      user: userId,
      type: 'debit',
    }).session(session).lean();

    if (!originalTransaction) {
      await session.abortTransaction();
      session.endSession();
      return sendNotFound(res, 'Original transaction not found');
    }

    // Validate amount doesn't exceed original transaction
    if (refundAmount > originalTransaction.amount) {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, `Refund amount cannot exceed original transaction amount of ${originalTransaction.amount} NC`);
    }

    // Check if already refunded
    if (originalTransaction.status.current === 'reversed') {
      await session.abortTransaction();
      session.endSession();
      return sendBadRequest(res, 'Transaction has already been refunded');
    }

    // Get user's wallet (check existence)
    const wallet = await Wallet.findOne({ user: userId }).session(session).lean();

    if (!wallet) {
      await session.abortTransaction();
      session.endSession();
      return sendNotFound(res, 'Wallet not found');
    }

    // Credit refund via walletService (atomic $inc + CoinTransaction + LedgerEntry)
    const { walletService } = await import('../services/walletService');
    await walletService.credit({
      userId,
      amount: refundAmount,
      source: 'order',
      description: `Refund for transaction ${transactionId}: ${reason || 'Order creation failed'}`,
      operationType: 'refund',
      referenceId: `refund:${transactionId}`,
      referenceModel: 'Transaction',
      metadata: { originalTransactionId: transactionId, refundReason: reason },
      session,
    });

    // Also update refund statistics atomically
    await Wallet.findOneAndUpdate(
      { _id: wallet._id },
      { $inc: { 'statistics.totalRefunds': refundAmount } },
      { session },
    );

    // Create refund Transaction display record
    const refundTransaction = await Transaction.create([{
      user: userId,
      type: 'credit',
      category: 'refund',
      amount: refundAmount,
      balanceBefore: wallet.balance.available,
      balanceAfter: wallet.balance.available + refundAmount,
      description: `Refund for transaction ${transactionId}: ${reason || 'Order creation failed'}`,
      source: {
        type: 'refund',
        reference: originalTransaction._id,
        description: reason || 'Order creation failed',
        metadata: {
          originalTransactionId: transactionId,
          refundReason: reason,
        },
      },
      status: {
        current: 'completed',
        history: [{
          status: 'completed',
          timestamp: new Date(),
          reason: 'Automatic refund',
        }],
      },
      isReversible: false,
      retryCount: 0,
      maxRetries: 0,
    }], { session });

    // Mark original transaction as reversed
    originalTransaction.status.current = 'reversed';
    originalTransaction.status.history.push({
      status: 'reversed',
      timestamp: new Date(),
      reason: reason || 'Refund processed',
    });
    originalTransaction.reversedAt = new Date();
    originalTransaction.reversalReason = reason || 'Order creation failed';
    originalTransaction.reversalTransactionId = (refundTransaction[0] as any)._id.toString();

    await originalTransaction.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    logger.info('✅ [WALLET REFUND] Refund processed successfully:', {
      refundId: (refundTransaction[0] as any)._id,
      amount: refundAmount,
    });

    // Structured monitoring log for order-creation-failed refunds
    if (reason === 'order_creation_failed') {
      logger.warn(`⚠️ [WALLET_REFUND_ORDER_FAILED] userId=${userId} txnId=${transactionId} amount=${refundAmount} refundId=${(refundTransaction[0] as any)._id}`);
    }

    sendSuccess(res, {
      refundId: (refundTransaction[0] as any)._id.toString(),
      refundedAmount: refundAmount,
      wallet: {
        balance: {
          total: wallet.balance.total,
          available: wallet.balance.available,
          pending: wallet.balance.pending,
        },
      },
      status: 'success',
    }, 'Refund processed successfully');

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    logger.error('❌ [WALLET REFUND] Error:', error);
    sendError(res, sanitizeErrorMessage(error, 'Failed to process refund'), 500);
  }
});
