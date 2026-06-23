import { Request, Response } from 'express';
import { logger } from '../config/logger';
import { GoldSip, IGoldSipEntry } from '../models/GoldSip';
import { GoldPrice } from '../models/GoldSavings';
import { sendSuccess, sendError, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const AUGMONT_LIVE = process.env.AUGMONT_API_LIVE === 'true'; // default false
const GOLD_PRICE_PER_GRAM = parseFloat(process.env.AUGMONT_GOLD_PRICE || '6840');

/**
 * Helper: Calculate the next debit date based on deductionDate
 * If today's date < deductionDate this month, use this month
 * Otherwise, use next month
 */
function calculateNextDebitDate(deductionDate: number): Date {
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), deductionDate);
  if (now.getDate() < deductionDate) {
    return thisMonth;
  }
  // Next month
  return new Date(now.getFullYear(), now.getMonth() + 1, deductionDate);
}

/**
 * Helper: Get current gold price with fallback
 */
async function getCurrentGoldPrice(): Promise<number> {
  try {
    const latestPrice = await GoldPrice.findOne().sort({ effectiveAt: -1 }).lean();
    if (latestPrice) {
      return latestPrice.pricePerGram;
    }
  } catch (err) {
    logger.warn('[GoldSIP] Failed to fetch gold price from DB, using fallback');
  }
  return GOLD_PRICE_PER_GRAM;
}

/**
 * @desc    Get user's active SIP, holdings, and history
 * @route   GET /api/wallet/gold-sip
 * @access  Private
 */
export const getGoldSip = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  try {
    // Find active SIP
    const activeSip = await GoldSip.findOne({ userId, isActive: true }).lean();

    // Get current gold price
    const currentGoldPrice = await getCurrentGoldPrice();

    // Calculate holdings
    const grams = activeSip?.totalGramsAccumulated || 0;
    const currentValue = grams * currentGoldPrice;
    const invested = activeSip?.totalInvested || 0;
    const gainLoss = currentValue - invested;
    const gainLossPercent = invested > 0 ? (gainLoss / invested) * 100 : 0;

    // Get history (last 12 entries)
    const history: IGoldSipEntry[] = activeSip?.history?.slice(-12) || [];

    const response: any = {
      activeSip: activeSip
        ? {
            id: activeSip._id,
            monthlyAmount: activeSip.monthlyAmount,
            deductionDate: activeSip.deductionDate,
            startDate: activeSip.startDate,
            nextDebitDate: activeSip.nextDebitDate,
            totalGramsAccumulated: activeSip.totalGramsAccumulated,
            totalInvested: activeSip.totalInvested,
          }
        : null,
      holdings: {
        grams: parseFloat(grams.toFixed(4)),
        currentValue: parseFloat(currentValue.toFixed(2)),
        invested: parseFloat(invested.toFixed(2)),
        gainLoss: parseFloat(gainLoss.toFixed(2)),
        gainLossPercent: parseFloat(gainLossPercent.toFixed(2)),
      },
      history,
      currentGoldPrice: parseFloat(currentGoldPrice.toFixed(2)),
    };

    // If AUGMONT_API_LIVE !== 'true', return a notice field
    if (!AUGMONT_LIVE) {
      response.notice =
        "Gold SIP is coming soon — your first deduction will begin once our gold partner goes live. We'll notify you.";
    }

    return sendSuccess(res, response, 'Gold SIP fetched successfully');
  } catch (error: any) {
    logger.error('[GoldSIP] Error fetching SIP:', error);
    return sendError(res, 'Failed to fetch SIP data', 500);
  }
});

/**
 * @desc    Create a new SIP
 * @route   POST /api/wallet/gold-sip
 * @access  Private
 * Body: { monthlyAmount: number, deductionDate: 1|5|10|15 }
 */
export const createGoldSip = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  const { monthlyAmount, deductionDate } = req.body;

  // Validation
  if (!monthlyAmount || !deductionDate) {
    return sendBadRequest(res, 'monthlyAmount and deductionDate are required');
  }

  if (monthlyAmount < 100 || monthlyAmount > 100000) {
    return sendBadRequest(res, 'monthlyAmount must be between 100 and 100000');
  }

  if (![1, 5, 10, 15].includes(deductionDate)) {
    return sendBadRequest(res, 'deductionDate must be 1, 5, 10, or 15');
  }

  try {
    // Check for existing active SIP
    const existingActiveSip = await GoldSip.findOne({ userId, isActive: true });
    if (existingActiveSip) {
      return sendError(res, 'You already have an active SIP. Cancel it first to create a new one.', 409);
    }

    // Calculate next debit date
    const nextDebitDate = calculateNextDebitDate(deductionDate);

    // Create new SIP
    const newSip = await GoldSip.create({
      userId,
      monthlyAmount,
      deductionDate,
      isActive: true,
      startDate: new Date(),
      nextDebitDate,
      history: [],
      totalGramsAccumulated: 0,
      totalInvested: 0,
    });

    const createdSip = await GoldSip.findById(newSip._id).lean();

    return sendSuccess(
      res,
      {
        id: createdSip?._id,
        monthlyAmount: createdSip?.monthlyAmount,
        deductionDate: createdSip?.deductionDate,
        startDate: createdSip?.startDate,
        nextDebitDate: createdSip?.nextDebitDate,
        totalGramsAccumulated: createdSip?.totalGramsAccumulated,
        totalInvested: createdSip?.totalInvested,
      },
      'SIP created successfully',
      201,
    );
  } catch (error: any) {
    logger.error('[GoldSIP] Error creating SIP:', error);
    return sendError(res, 'Failed to create SIP', 500);
  }
});

/**
 * @desc    Cancel active SIP
 * @route   DELETE /api/wallet/gold-sip
 * @access  Private
 */
export const cancelGoldSip = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) return sendError(res, 'User not authenticated', 401);

  try {
    // Find active SIP
    const activeSip = await GoldSip.findOne({ userId, isActive: true });
    if (!activeSip) {
      return sendError(res, 'No active SIP found', 404);
    }

    // Cancel it
    activeSip.isActive = false;
    activeSip.cancelledAt = new Date();
    await activeSip.save();

    return sendSuccess(
      res,
      {
        message: 'SIP cancelled successfully',
        totalGramsAccumulated: activeSip.totalGramsAccumulated,
        totalInvested: activeSip.totalInvested,
      },
      'SIP cancelled successfully',
    );
  } catch (error: any) {
    logger.error('[GoldSIP] Error cancelling SIP:', error);
    return sendError(res, 'Failed to cancel SIP', 500);
  }
});
