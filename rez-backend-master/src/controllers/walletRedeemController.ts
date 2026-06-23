/**
 * Wallet Redeem Controller
 * POST /api/wallet/redeem-coins — convert REZ coins to a rupee discount
 *
 * Rate: 1 coin = ₹0.10  (min 50 coins = ₹5 discount)
 * Idempotency: one redemption per orderId (if provided)
 * Rate limit: 3 redemptions per hour per user (enforced in route)
 */

import { Request, Response } from 'express';
import * as crypto from 'crypto';
import mongoose from 'mongoose';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { WalletConfig } from '../models/WalletConfig';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { walletService } from '../services/walletService';

const MIN_REDEEM_AMOUNT = 50;

// Module-level cache so we don't hit the DB on every redemption request.
// The value is refreshed after RATE_CACHE_TTL_MS (5 minutes).
let _cachedCoinsPerRupee: number | null = null;
let _cacheExpiresAt = 0;
const RATE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCoinsPerRupee(): Promise<number> {
  const now = Date.now();
  if (_cachedCoinsPerRupee !== null && now < _cacheExpiresAt) {
    return _cachedCoinsPerRupee;
  }
  try {
    const config = await WalletConfig.findOne({ singleton: true }).select('coinConversion').lean();
    // rezToInr is stored as "coins per rupee" in the schema (default: 1).
    // Fall back to the env var, then to 1 (1 REZ coin = ₹1.00).
    const rate = config?.coinConversion?.rezToInr ?? parseInt(process.env.REZ_COIN_TO_RUPEE_RATE || '1', 10);
    _cachedCoinsPerRupee = rate > 0 ? rate : 1;
  } catch {
    _cachedCoinsPerRupee = parseInt(process.env.REZ_COIN_TO_RUPEE_RATE || '1', 10);
  }
  _cacheExpiresAt = now + RATE_CACHE_TTL_MS;
  return _cachedCoinsPerRupee;
}

/**
 * @swagger
 * /api/wallet/redeem-coins:
 *   post:
 *     summary: Redeem REZ coins for a discount
 *     description: Converts REZ coins to a rupee discount applied at checkout. Rate limit 3 redemptions per hour per user.
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
 *                 type: integer
 *                 minimum: 50
 *                 description: Number of coins to redeem (min 50 coins = Rs 5 discount)
 *               merchantId:
 *                 type: string
 *                 description: Optional merchant ID for branded coin redemption
 *               orderId:
 *                 type: string
 *                 description: Optional order ID for idempotency
 *     responses:
 *       200:
 *         description: Coins redeemed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Invalid amount or insufficient balance
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
export const redeemCoins = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  // Resolve dynamic coin-to-rupee rate (DB config → env var → default 10)
  const COINS_PER_RUPEE = await getCoinsPerRupee();

  const { amount, merchantId, orderId } = req.body;

  // ── Validation ────────────────────────────────────────────────────────────
  if (!Number.isInteger(amount) || amount < MIN_REDEEM_AMOUNT) {
    return sendBadRequest(res, `amount must be an integer >= ${MIN_REDEEM_AMOUNT}`);
  }

  // ── Idempotency: prevent double-redemption for the same orderId ────────────
  if (orderId) {
    const existing = await CoinTransaction.findOne({
      user: new mongoose.Types.ObjectId(userId),
      source: 'redemption',
      'metadata.orderId': orderId,
    }).lean();

    if (existing) {
      return sendBadRequest(res, 'Coins have already been redeemed for this order');
    }
  }

  // ── Balance check ─────────────────────────────────────────────────────────
  const wallet = await Wallet.findOne({ user: userId }).lean();
  if (!wallet) {
    return sendError(res, 'Wallet not found', 404);
  }

  const currentBalance = wallet.balance.available;
  if (currentBalance < amount) {
    return sendBadRequest(res, `Insufficient balance. You have ${currentBalance} coins but requested ${amount}`);
  }

  // ── Debit via walletService (atomic, locked, ledgered) ────────────────────
  const referenceId = orderId
    ? `redemption:order:${orderId}`
    : `redemption:${userId}:${crypto.randomBytes(8).toString('hex')}`;

  try {
    const result = await walletService.debit({
      userId,
      amount,
      source: 'redemption',
      description: 'Coins redeemed for discount',
      operationType: 'payment' as any,
      referenceId,
      referenceModel: 'Order',
      metadata: {
        ...(orderId && { orderId }),
        ...(merchantId && { merchantId }),
        discountApplied: amount / COINS_PER_RUPEE,
      },
    });

    const discountApplied = parseFloat((amount / COINS_PER_RUPEE).toFixed(2));

    logger.info('[RedeemCoins] Coins redeemed', {
      userId,
      coinsRedeemed: amount,
      discountApplied,
      orderId,
      merchantId,
    });

    return sendSuccess(
      res,
      {
        success: true,
        coinsRedeemed: amount,
        discountApplied,
        newBalance: result.newBalance,
      },
      'Coins redeemed successfully',
    );
  } catch (err: any) {
    if (err.message?.includes('Insufficient')) {
      return sendBadRequest(res, 'Insufficient wallet balance');
    }
    logger.error('[RedeemCoins] Failed to redeem coins', { userId, amount, error: err.message });
    return sendError(res, 'Failed to redeem coins. Please try again.', 500);
  }
});
