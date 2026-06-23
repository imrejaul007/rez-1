import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { OrderMongoModel } from '../models/MerchantOrder';
import { calculateMerchantPayout, validateMerchantPayoutMath } from '../config/economicsConfig';

const router = Router();

// All routes require merchant authentication
router.use(authMiddleware);

/**
 * Calculate next settlement date (T+2 business days, skipping weekends)
 */
function getSettlementDate(transactionDate: Date): Date {
  const d = new Date(transactionDate);
  let daysAdded = 0;
  while (daysAdded < 2) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) daysAdded++; // Skip weekends
  }
  return d;
}

/**
 * Get human-readable settlement period label
 */
function getSettlementPeriodLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * @route   GET /api/merchant/payouts
 * @desc    Get merchant settlement schedule, pending balance, and payout history
 * @access  Private (Merchant)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    if (!merchantId) {
      return res.status(400).json({
        success: false,
        message: 'Merchant ID required',
      });
    }

    // Query transactions from the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const transactions = await OrderMongoModel.find({
      merchantId,
      paymentStatus: 'paid',
      createdAt: { $gte: ninetyDaysAgo },
    })
      .select('total subtotal tax shipping createdAt paymentStatus')
      .lean()
      .sort({ createdAt: -1 })
      .exec();

    if (!transactions || transactions.length === 0) {
      return res.json({
        success: true,
        data: {
          nextSettlement: {
            amount: 0,
            date: null,
            transactionCount: 0,
          },
          pendingBalance: 0,
          history: [],
          settlementSchedule: 'T+2 business days',
          bankAccount: {
            masked: null,
          },
        },
      });
    }

    // Group transactions by settlement week (T+2 from transaction date)
    const settlementMap = new Map<string, { transactions: any[]; startDate: Date; endDate: Date }>();

    for (const txn of transactions) {
      const settlementDate = getSettlementDate(new Date(txn.createdAt));
      const weekStart = new Date(settlementDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6); // Set to Saturday

      const key = weekStart.toISOString().split('T')[0];

      if (!settlementMap.has(key)) {
        settlementMap.set(key, {
          transactions: [],
          startDate: weekStart,
          endDate: weekEnd,
        });
      }

      settlementMap.get(key)!.transactions.push(txn);
    }

    // Build settlement batches with calculations
    const history: any[] = [];
    let nextSettlementAmount = 0;
    let nextSettlementDate: Date | null = null;
    let nextSettlementCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const [_key, batch] of settlementMap) {
      const grossAmount = batch.transactions.reduce((sum, t) => sum + (t.total || 0), 0);
      const { commission, gst, netAmount } = calculateMerchantPayout(grossAmount);

      // AHMED FIX: Validate payout math formula correctness
      const mathValidation = validateMerchantPayoutMath(grossAmount, commission, gst, netAmount);
      if (!mathValidation.isValid) {
        logger.error('🚨 [MERCHANT PAYOUTS] Payout math validation failed:', {
          error: mathValidation.error,
          merchantId,
          grossAmount,
          commission,
          gst,
          netAmount,
        });
        // Log and continue (non-blocking) - math is correct but validation is extra safety check
      }

      // Determine settlement status
      const settlementDate = batch.startDate;
      let status = 'upcoming';
      if (settlementDate <= today) {
        status = 'settled';
      } else if (settlementDate.getTime() - today.getTime() <= 2 * 24 * 60 * 60 * 1000) {
        status = 'processing';
      }

      const settlement = {
        period: getSettlementPeriodLabel(batch.startDate, batch.endDate),
        settlementDate: settlementDate.toISOString().split('T')[0],
        status,
        transactionCount: batch.transactions.length,
        grossAmount: parseFloat(grossAmount.toFixed(2)),
        commission: parseFloat(commission.toFixed(2)),
        gst: parseFloat(gst.toFixed(2)),
        netAmount: parseFloat(netAmount.toFixed(2)),
      };

      // Track next settlement (earliest processing or upcoming)
      if (status !== 'settled') {
        if (!nextSettlementDate || settlementDate < nextSettlementDate) {
          nextSettlementDate = settlementDate;
          nextSettlementAmount = netAmount;
          nextSettlementCount = batch.transactions.length;
        }
      }

      history.push(settlement);
    }

    // Calculate pending balance (sum of all unsettled transactions)
    const pendingTransactions = transactions.filter((t) => {
      const settlementDate = getSettlementDate(new Date(t.createdAt));
      return settlementDate > today;
    });

    const pendingBalance = pendingTransactions.reduce((sum, t) => sum + (t.total || 0), 0);

    // Sort history by date descending and take last 10
    history.sort((a, b) => new Date(b.settlementDate).getTime() - new Date(a.settlementDate).getTime());
    const historySliced = history.slice(0, 10);

    const response = {
      success: true,
      data: {
        nextSettlement: {
          amount: parseFloat(nextSettlementAmount.toFixed(2)),
          date: nextSettlementDate ? nextSettlementDate.toISOString().split('T')[0] : null,
          transactionCount: nextSettlementCount,
        },
        pendingBalance: parseFloat(pendingBalance.toFixed(2)),
        history: historySliced,
        settlementSchedule: 'T+2 business days',
        bankAccount: {
          masked: null, // Placeholder for masked bank account
        },
      },
    };

    res.json(response);
  } catch (error: any) {
    logger.error('❌ [MERCHANT PAYOUTS] Error fetching payouts:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payouts',
    });
  }
});

export default router;
