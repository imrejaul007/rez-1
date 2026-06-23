import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { GoldPrice, GoldHolding } from '../models/GoldSavings';
import { sendSuccess, sendError, sendBadRequest, sendPaginated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import redisService from '../services/redisService';
import mongoose from 'mongoose';

const GOLD_PRICE_CACHE_KEY = 'gold:price:latest';
const GOLD_PRICE_CACHE_TTL = 60; // 60 seconds

/** Helper: get region-specific gold price (with fallback to global) */
async function getRegionPrice(region: string) {
  let price = null;
  if (region) {
    price = await GoldPrice.findOne({ region }).sort({ effectiveAt: -1 }).lean();
  }
  if (!price) {
    price = await GoldPrice.findOne({ $or: [{ region: '' }, { region: { $exists: false } }] })
      .sort({ effectiveAt: -1 }).lean();
  }
  if (!price) {
    price = await GoldPrice.findOne().sort({ effectiveAt: -1 }).lean();
  }
  return price;
}

/**
 * @desc    Get current gold price
 * @route   GET /api/gold/price
 * @access  Public
 */
export const getCurrentPrice = asyncHandler(async (req: Request, res: Response) => {
  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();
  const regionCacheKey = `${GOLD_PRICE_CACHE_KEY}:${region || 'all'}`;

  // Try cache first
  const cached = await redisService.get<{ pricePerGram: number; currency: string; region: string; source: string; effectiveAt: Date }>(regionCacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'Gold price fetched (cached)');
  }

  const latestPrice = await getRegionPrice(region);

  if (!latestPrice) {
    return sendError(res, 'Gold price not available. Please try again later.', 404);
  }

  const priceData = {
    pricePerGram: latestPrice.pricePerGram,
    currency: latestPrice.currency,
    region: (latestPrice as any).region || '',
    source: latestPrice.source,
    effectiveAt: latestPrice.effectiveAt,
  };

  await redisService.set(regionCacheKey, priceData, GOLD_PRICE_CACHE_TTL);

  return sendSuccess(res, priceData, 'Gold price fetched');
});

/**
 * @desc    Get user's gold holding
 * @route   GET /api/gold/holding
 * @access  Private
 */
export const getHolding = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);
  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();

  const cacheKey = `gold:holding:${userId}:${region || 'all'}`;
  const cached = await redisService.get<{ balanceGrams: number; totalInvested: number; totalSold: number; currentValue: number; pricePerGram: number }>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached, 'Gold holding fetched (cached)');
  }

  let holding = await GoldHolding.findOne({ userId }).lean();

  if (!holding) {
    const emptyHolding = {
      balanceGrams: 0,
      totalInvested: 0,
      totalSold: 0,
      currentValue: 0,
    };
    return sendSuccess(res, emptyHolding, 'No gold holding found');
  }

  // Get region-specific price to compute current value
  const latestPrice = await getRegionPrice(region);
  const pricePerGram = latestPrice?.pricePerGram || 0;

  const holdingData = {
    balanceGrams: holding.balanceGrams,
    totalInvested: holding.totalInvested,
    totalSold: holding.totalSold,
    currentValue: parseFloat((holding.balanceGrams * pricePerGram).toFixed(2)),
    pricePerGram,
  };

  await redisService.set(cacheKey, holdingData, 60);

  return sendSuccess(res, holdingData, 'Gold holding fetched');
});

/**
 * @desc    Buy gold with amount (INR → grams)
 * @route   POST /api/gold/buy
 * @access  Private
 */
export const buyGold = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);
  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();

  const { amount, idempotencyKey } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return sendBadRequest(res, 'Amount must be a positive number');
  }

  if (!idempotencyKey) {
    return sendBadRequest(res, 'idempotencyKey is required');
  }

  // Idempotency check
  const existingTx = await GoldHolding.findOne({
    userId,
    'transactions.idempotencyKey': idempotencyKey,
  }).lean();

  if (existingTx) {
    const matchedTx = existingTx.transactions.find(
      (t) => t.idempotencyKey === idempotencyKey
    );
    if (matchedTx) {
      logger.info(`[GOLD] Duplicate buy request detected for user=${userId}, key=${idempotencyKey}`);
      return sendSuccess(res, {
        type: 'buy',
        grams: matchedTx.grams,
        amount: matchedTx.amount,
        pricePerGram: matchedTx.pricePerGram,
        date: matchedTx.date,
        duplicate: true,
      }, 'Duplicate request — already processed');
    }
  }

  // Get region-specific price
  const latestPrice = await getRegionPrice(region);
  if (!latestPrice) {
    return sendError(res, 'Gold price not available. Cannot process buy.', 503);
  }

  const pricePerGram = latestPrice.pricePerGram;
  const grams = parseFloat((amount / pricePerGram).toFixed(4));

  if (grams <= 0) {
    return sendBadRequest(res, 'Amount is too small to buy any gold');
  }

  // Atomic update using findOneAndUpdate with upsert
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const txEntry = {
      type: 'buy' as const,
      grams,
      pricePerGram,
      amount,
      idempotencyKey,
      date: new Date(),
    };

    const updatedHolding = await GoldHolding.findOneAndUpdate(
      { userId },
      {
        $inc: {
          balanceGrams: grams,
          totalInvested: amount,
        },
        $push: {
          transactions: txEntry,
        },
      },
      { new: true, upsert: true, session }
    );

    await session.commitTransaction();

    // Invalidate cache
    await redisService.delPattern(`gold:holding:${userId}:*`).catch((err) => logger.warn('[Gold] Cache invalidation for gold holding after buy failed', { error: err.message }));

    logger.info(`[GOLD] Buy completed: user=${userId}, grams=${grams}, amount=${amount}, price=${pricePerGram}`);

    return sendSuccess(res, {
      type: 'buy',
      grams,
      amount,
      pricePerGram,
      date: txEntry.date,
      newBalance: updatedHolding.balanceGrams,
    }, 'Gold purchased successfully', 201);
  } catch (err: any) {
    await session.abortTransaction();
    logger.error(`[GOLD] Buy failed: user=${userId}, error=${err.message}`);
    return sendError(res, 'Failed to process gold purchase', 500);
  } finally {
    session.endSession();
  }
});

/**
 * @desc    Sell gold (grams → amount)
 * @route   POST /api/gold/sell
 * @access  Private
 */
export const sellGold = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);
  const region = ((req.headers['x-rez-region'] as string) || '').toLowerCase();

  const { grams, idempotencyKey } = req.body;

  if (!grams || typeof grams !== 'number' || grams <= 0) {
    return sendBadRequest(res, 'Grams must be a positive number');
  }

  if (!idempotencyKey) {
    return sendBadRequest(res, 'idempotencyKey is required');
  }

  // Idempotency check
  const existingTx = await GoldHolding.findOne({
    userId,
    'transactions.idempotencyKey': idempotencyKey,
  }).lean();

  if (existingTx) {
    const matchedTx = existingTx.transactions.find(
      (t) => t.idempotencyKey === idempotencyKey
    );
    if (matchedTx) {
      logger.info(`[GOLD] Duplicate sell request detected for user=${userId}, key=${idempotencyKey}`);
      return sendSuccess(res, {
        type: 'sell',
        grams: matchedTx.grams,
        amount: matchedTx.amount,
        pricePerGram: matchedTx.pricePerGram,
        date: matchedTx.date,
        duplicate: true,
      }, 'Duplicate request — already processed');
    }
  }

  // Check balance
  const holding = await GoldHolding.findOne({ userId });
  if (!holding || holding.balanceGrams < grams) {
    return sendBadRequest(res, `Insufficient gold balance. You have ${holding?.balanceGrams?.toFixed(4) || 0} gm`);
  }

  // Get region-specific price
  const latestPrice = await getRegionPrice(region);
  if (!latestPrice) {
    return sendError(res, 'Gold price not available. Cannot process sell.', 503);
  }

  const pricePerGram = latestPrice.pricePerGram;
  const amount = parseFloat((grams * pricePerGram).toFixed(2));

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Atomic decrement with $gte guard to prevent overselling
    const result = await GoldHolding.findOneAndUpdate(
      { userId, balanceGrams: { $gte: grams } },
      {
        $inc: {
          balanceGrams: -grams,
          totalSold: amount,
        },
        $push: {
          transactions: {
            type: 'sell' as const,
            grams,
            pricePerGram,
            amount,
            idempotencyKey,
            date: new Date(),
          },
        },
      },
      { new: true, session }
    );

    if (!result) {
      await session.abortTransaction();
      return sendBadRequest(res, 'Insufficient gold balance (concurrent modification)');
    }

    await session.commitTransaction();

    // Invalidate cache
    await redisService.delPattern(`gold:holding:${userId}:*`).catch((err) => logger.warn('[Gold] Cache invalidation for gold holding after sell failed', { error: err.message }));

    logger.info(`[GOLD] Sell completed: user=${userId}, grams=${grams}, amount=${amount}, price=${pricePerGram}`);

    return sendSuccess(res, {
      type: 'sell',
      grams,
      amount,
      pricePerGram,
      date: new Date(),
      newBalance: result.balanceGrams,
    }, 'Gold sold successfully');
  } catch (err: any) {
    await session.abortTransaction();
    logger.error(`[GOLD] Sell failed: user=${userId}, error=${err.message}`);
    return sendError(res, 'Failed to process gold sale', 500);
  } finally {
    session.endSession();
  }
});

/**
 * @desc    Get paginated gold transaction history
 * @route   GET /api/gold/transactions
 * @access  Private
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

  const holding = await GoldHolding.findOne({ userId }).lean();

  if (!holding || !holding.transactions.length) {
    return sendPaginated(res, [], page, limit, 0, 'No transactions found');
  }

  // Sort transactions by date descending
  const allTxs = [...holding.transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const total = allTxs.length;
  const skip = (page - 1) * limit;
  const paginatedTxs = allTxs.slice(skip, skip + limit);

  return sendPaginated(res, paginatedTxs, page, limit, total, 'Transactions fetched');
});

/**
 * @desc    Set gold price (admin only)
 * @route   POST /api/admin/gold/price
 * @access  Admin
 */
export const setGoldPrice = asyncHandler(async (req: Request, res: Response) => {
  const { pricePerGram, currency, source, region } = req.body;

  if (!pricePerGram || typeof pricePerGram !== 'number' || pricePerGram <= 0) {
    return sendBadRequest(res, 'pricePerGram must be a positive number');
  }

  const newPrice = await GoldPrice.create({
    pricePerGram,
    currency: currency || 'INR',
    region: (region || '').toLowerCase(),
    source: source || 'manual',
    effectiveAt: new Date(),
  });

  // Invalidate price cache for all regions
  await redisService.delPattern(`${GOLD_PRICE_CACHE_KEY}:*`).catch((err) => logger.warn('[Gold] Cache invalidation for gold price failed', { error: err.message }));

  logger.info(`[GOLD ADMIN] New gold price set: ${pricePerGram} ${currency || 'INR'} region=${region || 'global'}`);

  return sendSuccess(res, {
    pricePerGram: newPrice.pricePerGram,
    currency: newPrice.currency,
    source: newPrice.source,
    effectiveAt: newPrice.effectiveAt,
  }, 'Gold price updated', 201);
});
