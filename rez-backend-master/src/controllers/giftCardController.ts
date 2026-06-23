import { Request, Response } from 'express';
import { GiftCard, UserGiftCard } from '../models/GiftCard';
import { logger } from '../config/logger';
import { Wallet } from '../models/Wallet';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { logTransaction } from '../models/TransactionAuditLog';
import mongoose from 'mongoose';
import { validateAmount } from '../utils/walletValidation';
import { checkVelocity } from '../services/walletVelocityService';
import { walletService } from '../services/walletService';

/**
 * @desc    Get gift card catalog
 * @route   GET /api/wallet/gift-cards/catalog
 * @access  Private
 */
export const getCatalog = asyncHandler(async (req: Request, res: Response) => {
  const { category, search } = req.query;

  const query: any = { isActive: true };
  if (category && category !== 'all') query.category = category;
  if (search) query.$text = { $search: search as string };

  const giftCards = await GiftCard.find(query)
    .select('-__v')
    .sort({ cashbackPercentage: -1 })
    .lean();

  const categories = await GiftCard.distinct('category', { isActive: true });

  sendSuccess(res, { giftCards, categories }, 'Gift card catalog retrieved');
});

/**
 * @desc    Purchase a gift card
 * @route   POST /api/wallet/gift-cards/purchase
 * @access  Private
 */
export const purchaseGiftCard = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { giftCardId, amount } = req.body;

  if (!userId) return sendError(res, 'User not authenticated', 401);
  if (!giftCardId) return sendBadRequest(res, 'Gift card ID is required');
  const amountCheck = validateAmount(amount, { fieldName: 'Gift card amount' });
  if (!amountCheck.valid) return sendBadRequest(res, amountCheck.error);
  const validatedAmount = amountCheck.amount;

  // Velocity check
  const velocityResult = await checkVelocity(userId, 'spend');
  if (!velocityResult.allowed) {
    return sendBadRequest(res, `Gift card purchase rate limit exceeded. Try again in ${Math.ceil(velocityResult.resetInSeconds / 60)} minutes.`);
  }

  // Find gift card template
  const giftCard = await GiftCard.findOne({ _id: giftCardId, isActive: true }).lean();
  if (!giftCard) return sendBadRequest(res, 'Gift card not available');

  // Validate denomination
  if (!giftCard.denominations.includes(validatedAmount)) {
    return sendBadRequest(res, `Invalid amount. Available: ${giftCard.denominations.join(', ')}`);
  }

  // Check wallet balance
  const wallet = await Wallet.findOne({ user: userId }).lean();
  if (!wallet) return sendError(res, 'Wallet not found', 404);
  if (wallet.isFrozen) return sendBadRequest(res, 'Wallet is frozen');
  if (wallet.balance.available < validatedAmount) return sendBadRequest(res, 'Insufficient balance');

  // Calculate cashback upfront
  const cashback = Math.floor(validatedAmount * giftCard.cashbackPercentage / 100);
  const netDebit = validatedAmount - cashback;

  // Create user gift card first (needed for referenceId)
  const userGiftCard = await UserGiftCard.create({
    user: userId,
    giftCard: giftCard._id,
    amount: validatedAmount,
    balance: validatedAmount,
    expiresAt: new Date(Date.now() + giftCard.validityDays * 24 * 60 * 60 * 1000),
    status: 'active'
  });

  // Deduct from wallet via walletService (atomic wallet + CoinTransaction + ledger)
  let debitResult;
  try {
    debitResult = await walletService.debit({
      userId,
      amount: netDebit,
      source: 'purchase',
      description: `Purchased ${giftCard.name} gift card`,
      operationType: 'gift_card_purchase',
      referenceId: String(userGiftCard._id),
      referenceModel: 'UserGiftCard',
      metadata: { giftCardId: giftCard._id, userGiftCardId: userGiftCard._id, cashback },
    });
  } catch (debitError: any) {
    // Rollback the user gift card
    await UserGiftCard.findByIdAndDelete(userGiftCard._id);
    return sendBadRequest(res, debitError.message || 'Insufficient balance or wallet is frozen');
  }

  // Apply cashback separately if any
  if (cashback > 0) {
    await Wallet.findOneAndUpdate(
      { user: userId },
      {
        $inc: {
          'balance.cashback': cashback,
          'statistics.totalCashback': cashback,
        }
      }
    );
  }

  // Update gift card stats
  await GiftCard.findByIdAndUpdate(giftCard._id, { $inc: { totalIssued: 1 } });

  sendSuccess(res, {
    userGiftCard: {
      id: String(userGiftCard._id),
      giftCardName: giftCard.name,
      giftCardLogo: giftCard.logo,
      giftCardColor: giftCard.color,
      amount: validatedAmount,
      balance: validatedAmount,
      expiresAt: userGiftCard.expiresAt,
      status: 'active',
      cashbackEarned: cashback,
    }
  }, `Gift card purchased! ${cashback > 0 ? `+${cashback} NC cashback earned.` : ''}`);
});

/**
 * @desc    Get user's purchased gift cards
 * @route   GET /api/wallet/gift-cards/mine
 * @access  Private
 */
export const getMyGiftCards = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { status } = req.query;

  if (!userId) return sendError(res, 'User not authenticated', 401);

  const query: any = { user: userId };
  if (status && status !== 'all') query.status = status;

  const cards = await UserGiftCard.find(query)
    .sort({ createdAt: -1 })
    .populate('giftCard', 'name logo color category')
    .lean();

  // Mask codes — only show last 4 chars
  const maskedCards = cards.map((card: any) => ({
    ...card,
    code: '****-****-' + (card.code?.slice(-4) || '????'),
    pin: card.pin ? '****' : undefined,
  }));

  sendSuccess(res, { giftCards: maskedCards }, 'Gift cards retrieved');
});

/**
 * @desc    Reveal gift card code (sensitive — could add OTP gate)
 * @route   GET /api/wallet/gift-cards/:id/reveal
 * @access  Private
 */
export const revealGiftCardCode = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  if (!userId) return sendError(res, 'User not authenticated', 401);

  const card = await UserGiftCard.findOne({ _id: id, user: userId }).lean();
  if (!card) return sendBadRequest(res, 'Gift card not found');

  // Reveal decrypted code
  const code = (card as any).revealCode();

  sendSuccess(res, { code, pin: card.pin ? 'Contact support for PIN' : undefined }, 'Code revealed');
});
