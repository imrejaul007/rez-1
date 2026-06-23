/**
 * merchantroutes/pos.ts
 * Point of Sale operations routes for merchants
 */

import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { authMiddleware } from '../middleware/merchantauth';
import { PosShift } from '../models/PosShift';
import { MerchantRewardJournal } from '../models/MerchantRewardJournal';
import { PosBill } from '../models/PosBill';
import { Store } from '../models/Store';

const router = Router();

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * Verify the store exists and belongs to the requesting merchant.
 * Handles the Store schema fork across services (some docs have `merchant`,
 * some have `merchantId`). Returns the merchantId string on success or null
 * on failure. Caller is responsible for sending the 403/404 response.
 */
async function requireOwnedStore(req: Request, storeId: string): Promise<string | null> {
  const merchantId =
    (req as any).merchantId?.toString() ||
    (req as any).merchant?._id?.toString() ||
    (req as any).user?.merchantId?.toString();
  if (!merchantId || !mongoose.isValidObjectId(storeId)) return null;
  const owned = await Store.findOne({
    _id: storeId,
    $or: [{ merchantId }, { merchant: merchantId }],
  })
    .select('_id')
    .lean();
  return owned ? merchantId : null;
}

/**
 * POST /merchant/pos/bills/:billId/tip
 * Add tip to a bill
 *
 * BUG FIX (H2): Previously only filtered by merchantId — did not verify
 * the bill's store belonged to the requesting merchant. A cross-tenant
 * merchantId collision (or a tampered JWT) could add tips to another
 * store's bill. Now walks bill → store → ownership filter.
 */
router.post('/bills/:billId/tip', async (req: Request, res: Response) => {
  try {
    const { billId } = req.params;
    const { tipAmount } = req.body;

    if (tipAmount === undefined || typeof tipAmount !== 'number' || tipAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'tipAmount is required and must be a non-negative number',
      });
    }

    if (!mongoose.isValidObjectId(billId)) {
      return res.status(400).json({ success: false, message: 'Invalid bill ID' });
    }

    const bill = await PosBill.findById(billId);
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    // Store-ownership check: the bill's store must belong to this merchant.
    const merchantId = await requireOwnedStore(req, bill.storeId.toString());
    if (!merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: bill belongs to a store you do not own',
      });
    }

    if (bill.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot add tip to a bill with status '${bill.status}'. Tip must be added before payment.`,
      });
    }

    const previousTip = bill.tipAmount ?? 0;
    bill.tipAmount = tipAmount;
    // Adjust totalAmount: remove previous tip, add new tip
    bill.totalAmount = bill.totalAmount - previousTip + tipAmount;
    await bill.save();

    return res.json({
      success: true,
      data: {
        billId,
        tipAmount,
        newTotal: bill.totalAmount,
        subtotal: bill.subtotal,
        taxAmount: bill.taxAmount,
        discountAmount: bill.discountAmount,
      },
      message: 'Tip added successfully',
    });
  } catch (error) {
    logger.error('Error adding tip to bill:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add tip',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/pos/bills/:billId/send-receipt
 * Send receipt via SMS, WhatsApp, or email
 *
 * BUG FIX (C11): Previously this route validated the request, logged an
 * info line, then returned `{ success: true, status: 'queued' }` even
 * though no integration exists. That silently lied to the cashier and
 * the customer — both thought the receipt was sent; it wasn't.
 *
 * Until the SMS/WhatsApp/email integration is actually wired (see
 * rez-notification-events), this endpoint returns HTTP 501 Not
 * Implemented so the UI can surface an honest error.
 */
router.post('/bills/:billId/send-receipt', async (req: Request, res: Response) => {
  const { billId } = req.params;
  const { method } = req.body;

  logger.warn(
    `[POS] send-receipt called for billId=${billId} method=${method} — route is not implemented; returning 501`
  );

  return res.status(501).json({
    success: false,
    message:
      'Digital receipt delivery is not yet available on this server. Use "Share Receipt" (native share sheet) as a workaround until SMS/WhatsApp/email integration ships.',
    code: 'NOT_IMPLEMENTED',
  });
});

/**
 * Aggregate paid PosBills inside a shift's time window so the merchant app
 * can show sales breakdown + cash expected on close. Previously the shift
 * API returned just the PosShift doc, so the FE fields `totalRevenue`,
 * `cashRevenue`, `upiRevenue`, `cardRevenue`, `tips`, `totalBills` were
 * always undefined and the cash-expected calculation was wrong.
 */
async function computeShiftTotals(shift: {
  _id: any;
  storeId: any;
  openedAt: Date;
  closedAt?: Date | null;
}) {
  const until = shift.closedAt || new Date();
  const bills = await PosBill.find({
    storeId: shift.storeId,
    status: 'paid',
    paidAt: { $gte: shift.openedAt, $lte: until },
  })
    .select('totalAmount tipAmount paymentMethod')
    .lean();

  let totalRevenue = 0;
  let cashRevenue = 0;
  let upiRevenue = 0;
  let cardRevenue = 0;
  let tips = 0;
  for (const b of bills) {
    const amt = Number(b.totalAmount) || 0;
    totalRevenue += amt;
    tips += Number(b.tipAmount) || 0;
    const method = (b as any).paymentMethod;
    if (method === 'cash') cashRevenue += amt;
    else if (method === 'upi' || method === 'qr') upiRevenue += amt;
    else if (method === 'card') cardRevenue += amt;
  }

  return {
    totalBills: bills.length,
    totalRevenue,
    cashRevenue,
    upiRevenue,
    cardRevenue,
    tips,
  };
}

/**
 * POST /merchant/pos/shift/open
 * Open a new shift
 *
 * BUG FIX (C7/C8/C9/C10):
 *  - Previously did NOT set `merchantId`, but the schema requires it —
 *    every save was silently failing with a ValidationError.
 *  - Previously had NO store-ownership check — a merchant could open
 *    shifts on stores they don't own.
 *  - Previously did not set `expectedCash`, also required.
 */
router.post('/shift/open', async (req: Request, res: Response) => {
  try {
    const { storeId, openingCash, staffName } = req.body;

    if (!storeId || openingCash === undefined) {
      return res.status(400).json({
        success: false,
        message: 'storeId and openingCash are required',
      });
    }

    const merchantId = await requireOwnedStore(req, storeId);
    if (!merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: store not found or not yours',
      });
    }

    const existingShift = await PosShift.findOne({ storeId, status: 'open' });
    if (existingShift) {
      return res.status(400).json({
        success: false,
        message: `A shift is already open for this store (opened at ${existingShift.openedAt})`,
      });
    }

    const shift = new PosShift({
      merchantId,
      storeId,
      openingCash: Number(openingCash) || 0,
      expectedCash: Number(openingCash) || 0, // starts equal; updated on close
      staffName: staffName || 'Unknown',
      status: 'open',
      openedAt: new Date(),
    });

    await shift.save();

    return res.status(201).json({
      success: true,
      data: shift,
      message: 'Shift opened successfully',
    });
  } catch (error) {
    logger.error('Error opening shift:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to open shift',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/pos/shift/close
 * Close an open shift
 *
 * BUG FIX (C10):
 *  - Previously looked up the shift by `_id` only — any authenticated
 *    merchant could close any shift.
 *  - `expectedCash` was hardcoded to opening cash. Now computed as
 *    `openingCash + cashRevenue` from paid PosBills in the shift window.
 */
router.post('/shift/close', async (req: Request, res: Response) => {
  try {
    const { shiftId, closingCash, notes } = req.body;

    if (!shiftId || closingCash === undefined) {
      return res.status(400).json({
        success: false,
        message: 'shiftId and closingCash are required',
      });
    }

    if (!mongoose.isValidObjectId(shiftId)) {
      return res.status(400).json({ success: false, message: 'Invalid shiftId' });
    }

    const shift = await PosShift.findById(shiftId);
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }

    // Verify the shift's store belongs to this merchant
    const merchantId = await requireOwnedStore(req, shift.storeId.toString());
    if (!merchantId || shift.merchantId?.toString() !== merchantId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: shift belongs to a store you do not own',
      });
    }

    if (shift.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: `Cannot close shift with status: ${shift.status}`,
      });
    }

    const totals = await computeShiftTotals({
      _id: shift._id,
      storeId: shift.storeId,
      openedAt: shift.openedAt,
      closedAt: null,
    });

    const expectedCash = (shift.openingCash || 0) + totals.cashRevenue;
    const cashDifference = Number(closingCash) - expectedCash;

    shift.closingCash = Number(closingCash);
    shift.expectedCash = expectedCash;
    shift.cashDifference = cashDifference;
    shift.notes = notes || '';
    shift.closedAt = new Date();
    shift.status = 'closed';

    await shift.save();

    return res.json({
      success: true,
      data: {
        ...shift.toObject(),
        ...totals,
      },
      message: `Shift closed successfully. Cash difference: ${cashDifference >= 0 ? '+' : ''}${cashDifference}`,
    });
  } catch (error) {
    logger.error('Error closing shift:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to close shift',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/pos/shifts
 * List shifts with filtering. Requires store ownership.
 */
router.get('/shifts', async (req: Request, res: Response) => {
  try {
    const { storeId, status, limit = 20 } = req.query;

    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId is required' });
    }

    const merchantId = await requireOwnedStore(req, storeId as string);
    if (!merchantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const filter: any = { storeId, merchantId };
    if (status) filter.status = status;

    const shifts = await PosShift.find(filter).limit(limitNum).sort({ openedAt: -1 });

    return res.json({ success: true, data: shifts, count: shifts.length });
  } catch (error) {
    logger.error('Error fetching shifts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch shifts',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /merchant/pos/shifts/active
 * Get currently active shift for a store, enriched with running sales
 * totals aggregated from paid PosBills inside the shift window.
 */
router.get('/shifts/active', async (req: Request, res: Response) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId is required' });
    }

    const merchantId = await requireOwnedStore(req, storeId as string);
    if (!merchantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const activeShift = await PosShift.findOne({ storeId, merchantId, status: 'open' }).lean();
    if (!activeShift) {
      return res.json({ success: true, data: null, message: 'No active shift for this store' });
    }

    const totals = await computeShiftTotals({
      _id: activeShift._id,
      storeId: activeShift.storeId,
      openedAt: activeShift.openedAt,
      closedAt: null,
    });

    return res.json({
      success: true,
      data: { ...activeShift, ...totals },
    });
  } catch (error) {
    logger.error('Error fetching active shift:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch active shift',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/pos/payment/reward-journal
 * A-06: Log every POS payment to MerchantRewardJournal for auditability.
 * Called by the POS payment handler after coins are issued.
 *
 * Body: {
 *   sessionId, merchantId, storeId, userId?,
 *   transactionAmount, coinsIssued, coinType?,
 *   stampAdded?, tierUpgraded?,
 *   skippedReasons?, balanceBefore?, balanceAfter?, ledgerPairId?
 * }
 */
router.post('/payment/reward-journal', async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      merchantId,
      storeId,
      userId,
      transactionAmount,
      coinsIssued = 0,
      coinType = 'rez',
      stampAdded = false,
      tierUpgraded = false,
      skippedReasons = [],
      balanceBefore = {},
      balanceAfter = {},
      ledgerPairId,
    } = req.body;

    if (!sessionId || !merchantId || !storeId || transactionAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'sessionId, merchantId, storeId, and transactionAmount are required',
      });
    }

    const journalEntry = await MerchantRewardJournal.create({
      sessionId,
      merchantId,
      storeId,
      userId: userId || null,
      eventType: 'payment',
      transactionAmount,
      decision: {
        coinsIssued,
        coinType,
        stampAdded,
        tierUpgraded,
        skippedReasons: [...(!userId ? ['anonymous_user'] : []), ...skippedReasons],
      },
      balanceBefore,
      balanceAfter,
      ledgerPairId: ledgerPairId || null,
    });

    logger.info(`[POS] Reward journal entry created: ${journalEntry._id} for session ${sessionId}`);

    return res.status(201).json({
      success: true,
      data: { journalId: journalEntry._id },
      message: 'Reward journal entry recorded',
    });
  } catch (error: any) {
    logger.error('[POS] Error recording reward journal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record reward journal entry',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /merchant/pos/offline-sync
 * Batch-replay offline transactions. Each entry must have clientTxnId for deduplication.
 * Returns per-item results so client can remove successfully synced items from queue.
 */
router.post('/offline-sync', async (req: Request, res: Response) => {
  const { transactions } = req.body as {
    transactions: Array<{
      clientTxnId: string;
      storeId: string;
      amount: number;
      paymentMethod?: string;
      items?: Array<{ name: string; qty: number; price: number }>;
      createdAt?: number;
    }>;
  };

  if (!Array.isArray(transactions) || transactions.length === 0) {
    res.status(400).json({ success: false, message: 'transactions array required' });
    return;
  }

  const results: Array<{
    clientTxnId: string;
    status: 'ok' | 'duplicate' | 'error';
    paymentId?: string;
    error?: string;
  }> = [];

  // Resolve stores owned by this merchant for ownership check
  const merchantId = (req as any).merchant?._id?.toString() || (req as any).user?.merchantId?.toString();
  let allowedStoreIds: Set<string> | null = null;
  if (merchantId) {
    const { Store } = await import('../models/Store');
    const ownedStores = await Store.find({ merchantId }).select('_id').lean();
    allowedStoreIds = new Set(ownedStores.map((s) => s._id.toString()));
  }

  for (const txn of transactions.slice(0, 50)) {
    // max 50 per batch
    try {
      // Ownership check: reject transactions for stores not owned by this merchant
      if (allowedStoreIds && !allowedStoreIds.has(txn.storeId)) {
        results.push({ clientTxnId: txn.clientTxnId, status: 'error', error: 'Store not authorized' });
        continue;
      }

      const { StorePayment } = await import('../models/StorePayment');

      // Deduplication check
      const existing = await StorePayment.findOne({ clientTxnId: txn.clientTxnId }).lean();
      if (existing) {
        results.push({ clientTxnId: txn.clientTxnId, status: 'duplicate', paymentId: existing.paymentId });
        continue;
      }

      const paymentId = `PAY-OFFLINE-${Date.now()}-${crypto.randomUUID().replace('-', '').substring(0, 5).toUpperCase()}`;
      const payment = new StorePayment({
        paymentId,
        clientTxnId: txn.clientTxnId,
        storeId: new (require('mongoose').Types.ObjectId)(txn.storeId),
        billAmount: txn.amount,
        paymentMethod: txn.paymentMethod || 'cash',
        status: 'completed',
        completedAt: txn.createdAt ? new Date(txn.createdAt) : new Date(),
        offlineSynced: true,
      });
      await payment.save();
      results.push({ clientTxnId: txn.clientTxnId, status: 'ok', paymentId });
    } catch (err: any) {
      results.push({ clientTxnId: txn.clientTxnId, status: 'error', error: err.message });
    }
  }

  res.status(200).json({ success: true, data: { results, synced: results.filter((r) => r.status === 'ok').length } });
});

/**
 * POST /merchant/pos/generate-transaction-ref
 * Generate a cryptographically secure transaction reference for UPI QR codes.
 * This replaces client-side reference generation which was insecure (timing leakage).
 */
router.post('/generate-transaction-ref', async (req: Request, res: Response) => {
  try {
    const { billId, amount } = req.body;
    const merchantId = (req as any).merchant?._id?.toString();

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    // Generate a 12-character cryptographically secure hex nonce
    const nonce = crypto.randomBytes(6).toString('hex');
    // Prefix with merchant-scoped identifier for traceability
    const transactionRef = `RZ${nonce}`;

    logger.info('[POS] Generated transaction ref', { merchantId, billId, transactionRef });

    return res.json({
      success: true,
      data: { transactionRef },
    });
  } catch (err: any) {
    logger.error('[POS] Error generating transaction ref:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
