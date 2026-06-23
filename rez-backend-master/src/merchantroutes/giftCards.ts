import * as crypto from 'crypto';
/**
 * merchantroutes/giftCards.ts
 * Gift card management routes for merchants
 */

import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { StoreGiftCard } from '../models/StoreGiftCard';
import { assertValidTransition } from '../config/financialStateMachine';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * Helper function to generate a unique gift card code
 */
function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars[crypto.randomInt(0, chars.length - 1)];
  }
  return code;
}

/**
 * GET /merchant/gift-cards
 * List gift cards for a store
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { storeId, status, limit = 20 } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const filter: any = { storeId };

    if (status) {
      filter.status = status;
    }

    const giftCards = await StoreGiftCard.find(filter).limit(limitNum).sort({ createdAt: -1 });

    return res.json({
      success: true,
      data: giftCards,
      count: giftCards.length,
    });
  } catch (error) {
    logger.error('Error fetching gift cards:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch gift cards',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/gift-cards
 * Issue a new gift card
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { storeId, amount, expiryDays = 365 } = req.body;

    if (!storeId || amount === undefined || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'storeId and amount (>0) are required',
      });
    }

    const code = generateGiftCardCode();
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const giftCard = new StoreGiftCard({
      storeId,
      code,
      balance: amount,
      initialAmount: amount,
      status: 'active',
      expiresAt,
      redemptions: [],
    });

    await giftCard.save();

    return res.status(201).json({
      success: true,
      data: giftCard,
      message: 'Gift card issued successfully',
    });
  } catch (error) {
    logger.error('Error issuing gift card:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to issue gift card',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/gift-cards/redeem
 * Redeem a gift card at POS
 */
router.post('/redeem', async (req: Request, res: Response) => {
  try {
    const { code, amount, storeId } = req.body;

    if (!code || amount === undefined || !storeId) {
      return res.status(400).json({
        success: false,
        message: 'code, amount, and storeId are required',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'amount must be greater than 0',
      });
    }

    // Atomic deduction — prevents double-spend on concurrent redemption requests
    // The $gte guard ensures balance never goes negative; null result means card not found,
    // expired, inactive, or balance insufficient.
    const now = new Date();
    const giftCard = await (StoreGiftCard as any).findOneAndUpdate(
      {
        code,
        storeId,
        status: 'active',
        balance: { $gte: amount },
        $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
      },
      {
        $inc: { balance: -amount },
        $push: { redemptions: { amount, usedAt: now } },
      },
      { new: true },
    );

    if (!giftCard) {
      // Distinguish between "not found" and "expired / insufficient balance"
      const existing = await StoreGiftCard.findOne({ code, storeId }).lean();
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Gift card not found' });
      }
      if (existing.expiresAt && existing.expiresAt < now) {
        return res.status(400).json({ success: false, error: 'Gift card has expired' });
      }
      if ((existing as any).status !== 'active') {
        return res.status(400).json({ success: false, message: `Gift card is ${(existing as any).status}` });
      }
      return res
        .status(400)
        .json({ success: false, message: `Insufficient balance. Available: ${(existing as any).balance}` });
    }

    // Mark as fully used if balance reached zero
    if (giftCard.balance === 0) {
      await (StoreGiftCard as any).findByIdAndUpdate(giftCard._id, { $set: { status: 'used' } });
    }

    return res.json({
      success: true,
      data: {
        cardCode: giftCard.code,
        amountRedeemed: amount,
        remainingBalance: giftCard.balance,
        status: giftCard.status,
      },
      message: 'Gift card redeemed successfully',
    });
  } catch (error) {
    logger.error('Error redeeming gift card:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to redeem gift card',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/gift-cards/stats
 * Get gift card statistics for store
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required',
      });
    }

    // Get all gift cards for store
    const giftCards = await StoreGiftCard.find({ storeId });

    let activeCards = 0;
    let activeBalance = 0;
    let totalRedeemed = 0;
    let totalSold = 0;

    giftCards.forEach((card) => {
      totalSold += (card as any).amount;

      if (card.status === 'active') {
        activeCards += 1;
        activeBalance += card.balance;
      }

      // Sum all redemptions
      card.redemptions.forEach((redemption) => {
        totalRedeemed += redemption.amount;
      });
    });

    return res.json({
      success: true,
      data: {
        activeCards,
        activeBalance: Math.round(activeBalance * 100) / 100,
        totalRedeemed: Math.round(totalRedeemed * 100) / 100,
        totalSold: Math.round(totalSold * 100) / 100,
        totalCards: giftCards.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching gift card stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch gift card stats',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
