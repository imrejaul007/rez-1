/**
 * POS Billing Controller
 *
 * Handles merchant-side point-of-sale bill management:
 * - Create a standard bill
 * - Create a quick bill (amount-only, no line items required)
 * - Get bill status
 * - Mark a bill as paid
 * - List bills for a store
 * - Cancel a bill
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { PosBill } from '../models/PosBill';
import { Store } from '../models/Store';
import { Recipe } from '../models/Recipe';
import { Ingredient } from '../models/Ingredient';
// NB: `User` model is no longer imported directly — post-B7-migration the
// `creditCustomerCoinsForBill` function resolves customers via the shared
// `resolveCustomerIdentity` helper below, which owns all User access.
import { logger } from '../config/logger';
// B7 (Sprint 0): identity resolution + canonical order.placed emit
import { resolveCustomerIdentity } from '../events/resolveCustomerIdentity';
import { emitOrderPlaced } from '../events/emitOrderPlaced';

// ── B7: identity-required gate ───────────────────────────────────────────────
//
// Deliberately NOT replacing the existing controller's loose body parsing
// with a Zod schema at this stage — doing so would tighten the contract
// for every PosBill payload field in a single step, which belongs in
// Sprint 1's audit pass (B7 patch spec §"Zod cleanup follow-ups"). This
// patch stays scoped to identity: resolve, link, emit.

/**
 * Is this merchant required to capture customer identity for every POS bill?
 *
 * Two gates, checked in order:
 *   1. Env-wide kill switch: `POS_REQUIRE_CUSTOMER_IDENTITY=true`. When set,
 *      ALL merchants enforce identity. Use during full-platform rollout.
 *   2. Per-merchant flag: `Merchant.posSettings.requireCustomerIdentity`.
 *      Lets us gradually opt merchants in (aligns with the 4-phase rollout
 *      plan documented in docs/sprint-0/B7_POS_IDENTITY_PATCH.md).
 *
 * Default: both off → walk-ins remain permitted (no regression from today).
 */
async function identityRequired(merchantId: string): Promise<boolean> {
  if (process.env.POS_REQUIRE_CUSTOMER_IDENTITY === 'true') return true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const MerchantMod = require('../models/Merchant');
    const MerchantModel = MerchantMod.Merchant ?? MerchantMod.default ?? MerchantMod;
    if (!MerchantModel || typeof MerchantModel.findById !== 'function') return false;
    const m = await MerchantModel.findById(merchantId).select('posSettings').lean();
    return m?.posSettings?.requireCustomerIdentity === true;
  } catch (err) {
    // Missing Merchant model or lookup failure → fall back to "not required"
    // rather than blocking bill creation. Safe default during rollout.
    logger.warn('[POS B7] identityRequired lookup failed; defaulting to false', {
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate a sequential-style bill number: POS-<storePrefix>-<timestamp>
 */
function generateBillNumber(storeId: string): string {
  const prefix = storeId.slice(-5).toUpperCase();
  return `POS-${prefix}-${Date.now()}`;
}

/**
 * Verify the store exists and belongs to the authenticated merchant.
 * Uses $or on both legacy `merchantId` and new `merchant` fields because
 * the Store collection has a field-name fork between rez-backend and
 * rez-merchant-service.
 */
async function resolveStore(storeId: string, merchantId: string) {
  if (!mongoose.isValidObjectId(storeId)) return null;
  return Store.findOne({
    _id: storeId,
    $or: [{ merchantId }, { merchant: merchantId }],
  })
    .select('_id')
    .lean();
}

/**
 * Project a PosBill document into the DTO shape the merchant app expects.
 * The FE service types (POSBill in services/api/pos.ts) ask for `billId`
 * and `amount`, which aren't on the raw Mongo doc. Keep this mapper in one
 * place so every endpoint returns a consistent shape.
 */
function toPosBillDTO(b: any) {
  if (!b) return b;
  const doc = typeof b.toObject === 'function' ? b.toObject() : b;
  return {
    ...doc,
    billId: doc._id?.toString?.() || doc._id || '',
    amount: doc.totalAmount ?? 0,
  };
}

/**
 * BUG FIX (P2-C8 — role/permission gating): POS endpoints previously did
 * zero role checking. A `cashier` account could issue refunds, close
 * shifts for stores they don't staff, and read arbitrary bill history.
 *
 * This helper centralises role enforcement:
 *   - A token issued for the MERCHANT OWNER (no merchantUserId in the
 *     JWT) has no MerchantUser doc attached — we treat that as `owner`.
 *   - A token issued for a TEAM MEMBER (merchantUserId set) carries a
 *     `role: 'owner' | 'admin' | 'manager' | 'staff' | 'cashier'`.
 *   - Sensitive operations (refund, cancel after paid) require
 *     owner/admin/manager. Everyday register work (create, mark paid)
 *     is allowed for all active roles.
 *
 * The helper returns the calling user's id (for audit trail stamping)
 * on success, or writes a 403 response and returns null on failure.
 */
type MerchantRole = 'owner' | 'admin' | 'manager' | 'staff' | 'cashier';

function requireMerchantRole(req: Request, res: Response, allowed: MerchantRole[]): string | null {
  // Token without a merchantUserId belongs to the merchant owner. Owners
  // always pass.
  const merchantUser: any = (req as any).merchantUser;
  if (!merchantUser) return req.merchantId || null;

  const role: MerchantRole = merchantUser.role || 'cashier';
  if (!allowed.includes(role)) {
    res.status(403).json({
      success: false,
      message: `This action requires one of: ${allowed.join(', ')}. Your role is '${role}'.`,
    });
    return null;
  }
  return merchantUser._id?.toString?.() || merchantUser._id || req.merchantId || null;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/store-payment/create-bill
 * Create a new POS bill with optional line items.
 */
export const createBill = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;
  const {
    storeId,
    items = [],
    lineItems,
    subtotal,
    taxAmount = 0,
    discountAmount = 0,
    totalAmount,
    customerName,
    customerPhone,
    notes,
    splitCount,
    tableNumber,
  } = req.body;

  if (!storeId) {
    return res.status(400).json({ success: false, message: 'storeId is required' });
  }

  // Allow ₹0 bills (100% coin redemption, full-discount promo). Only
  // reject missing, non-numeric, or negative values.
  if (totalAmount == null || isNaN(Number(totalAmount)) || Number(totalAmount) < 0) {
    return res.status(400).json({ success: false, message: 'totalAmount must be a non-negative number' });
  }

  const store = await resolveStore(storeId, merchantId);
  if (!store) {
    return res.status(404).json({ success: false, message: 'Store not found or access denied' });
  }

  // B7 (Sprint 0): Customer identity gate — enforced per-merchant or via
  // env kill switch. Default OFF during rollout.
  const identityNeeded = await identityRequired(merchantId);
  if (identityNeeded && !(req.body as any).customerId && !(req.body as any).customerPhone) {
    return res.status(400).json({
      success: false,
      message: 'Customer identity required — select a customer or mark as Walk-in',
      code: 'CUSTOMER_IDENTITY_REQUIRED',
    });
  }

  // B7 (Sprint 0): Resolve customer identity BEFORE PosBill.create so the
  // bill row persists the User._id at save time. A cashier-typed phone
  // upserts a User row via the shared helper. Walk-ins (no phone, no id)
  // resolve to `{ customerId: null, resolution: 'anonymous' }` — that's
  // the hybrid-nullable canonical contract.
  const identity = await resolveCustomerIdentity({
    customerId: (req.body as any).customerId,
    customerPhone: customerPhone,
    customerName: customerName,
    source: 'pos',
  });

  // BUG FIX (P2-C9): The FE sends two parallel arrays:
  //   • `items`      — cart shape { name, price, quantity, imageUrl, ... }
  //   • `lineItems`  — tax shape  { name, qty, price, gstRate, gstAmount, ... }
  // We merge the GST fields from `lineItems` onto each item by position so
  // the stored PosBillItem has per-line tax breakdown AND the original
  // cart metadata. Previously `lineItems` was accepted and silently
  // dropped; GSTR-1 compliance was impossible as a result.
  const mergedItems = Array.isArray(items)
    ? items.map((item: any, idx: number) => {
        const li = Array.isArray(lineItems) ? lineItems[idx] : undefined;
        if (!li) return item;
        return {
          ...item,
          gstRate: typeof li.gstRate === 'number' ? li.gstRate : item.gstRate,
          gstAmount: typeof li.gstAmount === 'number' ? li.gstAmount : item.gstAmount,
          hsn: li.hsn ?? item.hsn,
          sac: li.sac ?? item.sac,
        };
      })
    : items;

  const parsedSplitCount = splitCount && Number(splitCount) > 1 ? Number(splitCount) : 1;
  const bill = await PosBill.create({
    storeId,
    merchantId,
    billNumber: generateBillNumber(storeId),
    items: mergedItems,
    subtotal: subtotal ?? totalAmount,
    taxAmount,
    discountAmount,
    totalAmount,
    customerName,
    customerPhone,
    // B7 (Sprint 0): stable User._id link. Nullable — walk-ins carry null.
    customerId: identity.customerId ? new mongoose.Types.ObjectId(identity.customerId) : null,
    notes,
    tableNumber,
    isQuickBill: false,
    status: 'pending',
    splitCount: parsedSplitCount,
    splitAmount: parsedSplitCount > 1 ? Math.round((Number(totalAmount) / parsedSplitCount) * 100) / 100 : undefined,
  });

  // B7 (Sprint 0): Canonical order.placed emit. The helper is never-throws;
  // BullMQ/Redis hiccups will not roll back the bill save. Walk-in guard
  // inside `emitOrderPlaced` skips gamification fan-out when customerId=null.
  emitOrderPlaced({
    merchantId: String(merchantId),
    storeId: String(storeId),
    customerId: identity.customerId,
    orderId: String(bill._id),
    orderNumber: bill.billNumber,
    amount: Number(totalAmount),
    source: 'pos',
    items: Array.isArray(mergedItems)
      ? mergedItems.map((i: any) => ({
          productId: String(i.productId ?? i._id ?? ''),
          qty: Number(i.quantity ?? i.qty ?? 1),
          price: Number(i.price ?? 0),
        }))
      : undefined,
  });

  return res.status(201).json({
    success: true,
    message: 'Bill created successfully',
    data: toPosBillDTO(bill),
  });
});

/**
 * POST /api/store-payment/quick-bill
 * Create a quick bill — total amount only, no line items required.
 */
export const createQuickBill = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;
  const { storeId, totalAmount, customerName, customerPhone, notes } = req.body;

  if (!storeId) {
    return res.status(400).json({ success: false, message: 'storeId is required' });
  }

  if (totalAmount == null || isNaN(Number(totalAmount)) || Number(totalAmount) < 0) {
    return res.status(400).json({ success: false, message: 'totalAmount must be a non-negative number' });
  }

  const store = await resolveStore(storeId, merchantId);
  if (!store) {
    return res.status(404).json({ success: false, message: 'Store not found or access denied' });
  }

  // B7 (Sprint 0): Identity gate + resolution — mirrors createBill.
  const identityNeeded = await identityRequired(merchantId);
  if (identityNeeded && !(req.body as any).customerId && !customerPhone) {
    return res.status(400).json({
      success: false,
      message: 'Customer identity required — select a customer or mark as Walk-in',
      code: 'CUSTOMER_IDENTITY_REQUIRED',
    });
  }
  const identity = await resolveCustomerIdentity({
    customerId: (req.body as any).customerId,
    customerPhone: customerPhone,
    customerName: customerName,
    source: 'pos',
  });

  const bill = await PosBill.create({
    storeId,
    merchantId,
    billNumber: generateBillNumber(storeId),
    items: [],
    subtotal: Number(totalAmount),
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: Number(totalAmount),
    customerName,
    customerPhone,
    // B7 (Sprint 0): stable User._id link. Nullable for walk-in quick bills.
    customerId: identity.customerId ? new mongoose.Types.ObjectId(identity.customerId) : null,
    notes,
    isQuickBill: true,
    status: 'pending',
  });

  // B7 (Sprint 0): Canonical order.placed emit — quick bills have no line
  // items, so items is omitted (helper accepts undefined).
  emitOrderPlaced({
    merchantId: String(merchantId),
    storeId: String(storeId),
    customerId: identity.customerId,
    orderId: String(bill._id),
    orderNumber: bill.billNumber,
    amount: Number(totalAmount),
    source: 'pos',
  });

  return res.status(201).json({
    success: true,
    message: 'Quick bill created successfully',
    data: toPosBillDTO(bill),
  });
});

/**
 * GET /api/store-payment/status/:billId
 * Get the status and details of a specific bill.
 */
export const getBillStatus = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;
  const { billId } = req.params;

  if (!mongoose.isValidObjectId(billId)) {
    return res.status(400).json({ success: false, message: 'Invalid bill ID' });
  }

  const bill = await PosBill.findOne({ _id: billId, merchantId }).lean();
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found or access denied' });
  }

  return res.status(200).json({
    success: true,
    data: toPosBillDTO(bill),
  });
});

/**
 * POST /api/store-payment/mark-paid/:billId
 * Mark a pending bill as paid.
 */
export const markBillPaid = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;
  const { billId } = req.params;

  if (!mongoose.isValidObjectId(billId)) {
    return res.status(400).json({ success: false, message: 'Invalid bill ID' });
  }

  const bill = await PosBill.findOne({ _id: billId, merchantId });
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found or access denied' });
  }

  if (bill.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Bill cannot be marked as paid — current status is '${bill.status}'`,
    });
  }

  bill.status = 'paid';
  bill.paidAt = new Date();

  // Persist the payment method the merchant selected. Previously this was
  // silently dropped, which broke analytics and the success screen.
  const { splitCount, paymentMethod, amount } = req.body;
  if (paymentMethod && ['cash', 'card', 'qr', 'upi'].includes(paymentMethod)) {
    bill.paymentMethod = paymentMethod as 'cash' | 'card' | 'qr' | 'upi';
  }

  // If the merchant adds a tip at payment time, `amount` carries the new
  // tip-inclusive total. Compute the tip delta against the original bill
  // total and store both fields. Reject attempts to LOWER the total below
  // the original bill (which would effectively be a discount).
  if (amount != null && !isNaN(Number(amount))) {
    const newTotal = Number(amount);
    if (newTotal >= bill.totalAmount) {
      const tip = Math.round((newTotal - bill.totalAmount) * 100) / 100;
      bill.tipAmount = tip;
      bill.totalAmount = newTotal;
    }
  }

  // Apply split only if it wasn't already set at bill creation.
  // Never allow payment-time splitCount to silently override creation-time value.
  if (splitCount && Number(splitCount) > 1 && (!bill.splitCount || bill.splitCount <= 1)) {
    const count = Number(splitCount);
    const base = Math.floor((bill.totalAmount / count) * 100) / 100;
    const remainder = Math.round((bill.totalAmount - base * count) * 100) / 100;
    bill.splitCount = count;
    // Store base per-person amount; the last person covers any penny remainder
    bill.splitAmount = base;
    if (remainder > 0) {
      (bill as any).splitRemainder = remainder;
    }
  }

  await bill.save();

  // Canonical `payment.settled` emit — never-throws, fire-and-forget.
  // Sprint 2+ subscribers (wallet reconciliation, merchant settlement
  // analytics) react uniformly regardless of channel (POS/web/aggregator).
  // The paymentMethod → gateway mapping mirrors the consumer-side mapping
  // used by the wallet and store-payment services.
  try {
    const { emitPaymentSettled } = await import('../events/emitPaymentSettled');
    const paymentMethod = bill.paymentMethod || 'cash';
    // PaymentSettledEvent.gateway enum: 'razorpay' | 'cash' | 'upi' | 'wallet' | 'card'
    const gateway: 'razorpay' | 'cash' | 'upi' | 'wallet' | 'card' =
      paymentMethod === 'qr' ? 'upi' : (paymentMethod as 'cash' | 'card' | 'upi');
    emitPaymentSettled({
      merchantId: String(bill.merchantId),
      customerId: bill.customerId ? String(bill.customerId) : null,
      paymentId: String(bill._id),
      orderId: String(bill._id),
      amount: Number(bill.totalAmount ?? 0),
      gateway,
    });
  } catch (err) {
    logger.warn('[POS] emitPaymentSettled failed (non-fatal):', err);
  }

  // Fire-and-forget: deduct ingredient stock based on recipes for each bill item
  depleteIngredients(bill.items, bill.storeId.toString()).catch(() => {
    // Non-fatal — never fail a payment due to stock deduction errors
  });

  // BUG FIX (C4): credit customer's coins if the bill has a known customer.
  // This is awaited (unlike depleteIngredients) because we want the
  // `coinsEarned` value in the response so the success screen can show it.
  // The helper swallows every error internally, so this can never throw.
  const coinsEarned = await creditCustomerCoinsForBill(bill, bill.storeId.toString());

  // BUG FIX (P2-C4/C5/C6/C7): Fan out the paid event so every downstream
  // system that tracks revenue, loyalty, and notifications sees it.
  // Previously `markBillPaid` just updated a document and returned — none
  // of the following systems knew a POS sale happened:
  //   • Socket subscribers (other cashier tablets, merchant dashboard)
  //   • Merchant owner push notification
  //   • Consumer push notification (coin-earned receipt)
  //   • Gamification (challenges, streaks, achievements)
  //   • Bonus campaigns (bank_offer auto-claim)
  // Everything below is fire-and-forget; a downstream failure must never
  // fail a payment that's already persisted.
  fanOutPosBillPaid(bill, coinsEarned).catch((err) => {
    logger.warn('[POS] markBillPaid fan-out failure (non-fatal):', err);
  });

  return res.status(200).json({
    success: true,
    message: 'Bill marked as paid',
    data: { ...toPosBillDTO(bill), coinsEarned },
  });
});

/**
 * Emit every downstream event a paid POS bill should trigger.
 *
 * Mirrors the fan-out pattern that storePaymentController uses after
 * `confirmPayment`, but scoped to POS-specific semantics:
 *   1. Socket event to the merchant room (`merchant-<merchantId>`)
 *   2. Merchant notification (push + in-app) via merchantNotificationService
 *   3. Consumer push notification (only when the customer is resolvable)
 *   4. Gamification event bus (`pos_bill_paid`) for streaks/challenges
 *   5. Bonus campaign auto-claim (`bank_offer`) for the paying consumer
 *
 * All side effects are fire-and-forget. Each is wrapped in its own
 * try/catch so one failure never blocks the others.
 */
async function fanOutPosBillPaid(bill: any, coinsEarned: number): Promise<void> {
  const merchantId = bill.merchantId?.toString?.() || String(bill.merchantId || '');
  const storeId = bill.storeId?.toString?.() || String(bill.storeId || '');
  const billId = bill._id?.toString?.() || String(bill._id || '');
  const billAmount = Number(bill.totalAmount) || 0;
  const paymentMethod = bill.paymentMethod || 'cash';

  // 1. Socket — notify the merchant room so any dashboard/POS device
  // subscribed to `merchant-<id>` can live-refresh.
  try {
    const io: any = (global as any).io;
    if (io && merchantId) {
      io.to(`merchant-${merchantId}`).emit('pos_bill_paid', {
        billId,
        storeId,
        billNumber: bill.billNumber,
        totalAmount: billAmount,
        paymentMethod,
        coinsEarned,
        paidAt: bill.paidAt,
      });
    }
  } catch (err) {
    logger.warn('[POS] socket emit failed:', err);
  }

  // 2. Merchant push + in-app notification. Reuses the exact helper the
  // online store-payment confirm path uses, so both channels produce
  // consistent notification shapes on the merchant app.
  try {
    const store: any = await Store.findById(storeId).select('name').lean();
    const merchantNotificationService = (await import('../services/merchantNotificationService')).default;
    await merchantNotificationService.notifyStorePaymentReceived({
      merchantId,
      paymentId: billId,
      storeName: store?.name || 'your store',
      amount: billAmount,
      paymentMethod,
      coinsUsed: Number((bill as any).coinRedemptionAmount) || 0,
      cashbackAwarded: 0,
    });
  } catch (err) {
    logger.warn('[POS] merchant notification failed:', err);
  }

  // 3. Consumer push — only when we could resolve the customer via phone
  // (see `creditCustomerCoinsForBill`). Mirrors storePaymentController's
  // consumer push at line ~1428.
  const creditedUserId = (bill as any).coinsCreditedUserId?.toString?.();
  if (creditedUserId) {
    try {
      const pushSvc = (await import('../services/pushNotificationService')).default;
      const rewardLine = coinsEarned > 0 ? `+${coinsEarned} REZ coins earned!` : 'Payment confirmed.';
      await pushSvc.sendPushToUser(creditedUserId, {
        title: `Payment received ✅`,
        body: `₹${billAmount} paid via POS. ${rewardLine}`,
        data: { screen: 'wallet', billId, source: 'pos' },
      });
    } catch (err) {
      logger.warn('[POS] consumer push failed:', err);
    }
  }

  // 4. Gamification — POS sales now count toward challenges and streaks.
  // P2-C6: previously `pos_bill_paid` wasn't in the EVENT_TO_* maps at
  // rez-gamification-service/src/worker.ts, so streaks/challenges ignored
  // in-store customers. Adding the bus event here plus the worker-side
  // map entry wires the whole loop.
  if (creditedUserId) {
    try {
      const gamificationEventBus = (await import('../events/gamificationEventBus')).default;
      gamificationEventBus.emit('pos_bill_paid', {
        userId: creditedUserId,
        metadata: {
          storeId,
          billId,
          billNumber: bill.billNumber,
          amount: billAmount,
          paymentMethod,
        },
      });
      // Also emit the legacy `store_payment_confirmed` event so existing
      // listeners that ONLY understand the online event still fire — this
      // makes the fix work today while gamification-service is updated.
      gamificationEventBus.emit('store_payment_confirmed', {
        userId: creditedUserId,
        metadata: {
          storeId,
          billId,
          amount: billAmount,
          channel: 'pos',
        },
      });
    } catch (err) {
      logger.warn('[POS] gamification event failed:', err);
    }
  }

  // 5. Bonus campaign auto-claim — P2-C7. Mirrors storePaymentController
  // line ~1441. Without this, POS customers never enter bank_offer draws
  // or seasonal bonus campaigns that online customers auto-enter.
  if (creditedUserId) {
    try {
      const bonusCampaignService = require('../services/bonusCampaignService');
      await bonusCampaignService.autoClaimForTransaction('bank_offer', creditedUserId, {
        transactionRef: { type: 'payment' as const, refId: billId },
        transactionAmount: billAmount,
        paymentMethod,
      });
    } catch (err) {
      logger.warn('[POS] bonus campaign auto-claim failed:', err);
    }
  }
}

/**
 * POST /api/store-payment/refund/:billId
 * Refund a paid bill — full or partial.
 * body: { refundAmount?: number, reason: string }
 */
export const refundBill = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;
  const { billId } = req.params;
  const { refundAmount, reason } = req.body;

  // P2-C8: refunds are restricted. Staff/cashier cannot refund — fraud
  // control. Owner, admin, manager are allowed.
  const actorId = requireMerchantRole(req, res, ['owner', 'admin', 'manager']);
  if (!actorId) return; // 403 already sent

  if (!mongoose.isValidObjectId(billId)) {
    return res.status(400).json({ success: false, message: 'Invalid bill ID' });
  }

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ success: false, message: 'Refund reason is required' });
  }

  const bill = await PosBill.findOne({ _id: billId, merchantId });
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found or access denied' });
  }

  if (bill.status !== 'paid') {
    return res.status(400).json({
      success: false,
      message: `Only paid bills can be refunded — current status is '${bill.status}'`,
    });
  }

  const amount = refundAmount != null ? Number(refundAmount) : bill.totalAmount;
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: 'refundAmount must be a positive number' });
  }
  if (amount > bill.totalAmount) {
    return res.status(400).json({
      success: false,
      message: `Refund amount (₹${amount}) cannot exceed bill total (₹${bill.totalAmount})`,
    });
  }

  const isFullRefund = amount >= bill.totalAmount;
  bill.status = isFullRefund ? 'refunded' : 'partial_refund';
  bill.refundedAt = new Date();
  bill.refundAmount = Math.round(amount * 100) / 100;
  bill.refundReason = String(reason).trim();
  // P2-H5 audit trail: record who triggered the refund so store owners can
  // investigate suspicious refund patterns. `actorId` is the merchant user
  // id when a team member issued the refund, otherwise the merchant id.
  (bill as any).refundedBy = actorId;
  await bill.save();

  // Restore ingredient stock on full refund (fire-and-forget)
  if (isFullRefund) {
    restoreIngredients(bill.items, bill.storeId.toString()).catch(() => {});
  }

  // BUG FIX (C6): On full refund, also reverse any reward coins the
  // customer earned when the bill was marked paid. Previously the
  // `restoreIngredients` path ran but the loyalty credit was never
  // clawed back — so a refund gave cash back but left the customer's
  // wallet inflated. Partial refunds do not currently reverse coins
  // (proportional reversal is ambiguous when rewards used `floor`).
  if (isFullRefund && (bill as any).coinsEarned > 0 && (bill as any).coinsCreditedUserId) {
    try {
      const { walletService } = await import('../services/walletService');
      await walletService.debit({
        userId: (bill as any).coinsCreditedUserId.toString(),
        amount: Number((bill as any).coinsEarned),
        source: 'cashback',
        description: `POS refund reversal for bill ${bill.billNumber}`,
        operationType: 'cashback_reversal',
        referenceId: `pos-bill-refund:${bill._id}`,
        referenceModel: 'PosBill',
        metadata: {
          billId: bill._id?.toString?.() || bill._id,
          billNumber: bill.billNumber,
          channel: 'pos',
          originalCoinsEarned: (bill as any).coinsEarned,
        },
      });
      (bill as any).coinsEarned = 0;
      await bill.save();
    } catch (err) {
      logger.warn('[POS] Refund coin reversal failed (non-fatal):', err);
    }
  }

  return res.status(200).json({
    success: true,
    message: isFullRefund ? 'Bill fully refunded' : `Partial refund of ₹${amount} processed`,
    data: toPosBillDTO(bill),
  });
});

/**
 * Credit reward coins to the customer's wallet for a paid POS bill.
 *
 * BUG FIX (C4 — POS coins): `markBillPaid` previously didn't touch the
 * customer's wallet at all, so `coinsEarned` on the success screen was
 * always 0. The loyalty program was silently broken for every POS sale.
 *
 * Identity resolution (3-tier, post-Sprint 0 B7 migration)
 * ────────────────────────────────────────────────────────
 * Each tier tried in order; first non-null wins:
 *
 *   Tier 1  bill.customerId (FAST PATH)
 *           Set by B7 wire-up in createBill / createQuickBill. Every bill
 *           created post-B7 has this when the cashier captured identity.
 *           No DB lookup needed.
 *
 *   Tier 2  resolveCustomerIdentity({ customerPhone }) — BACKFILL PATH
 *           For in-flight bills created pre-B7 (customerPhone but no
 *           customerId). The shared helper upserts by normalised phone,
 *           and we backfill `bill.customerId` so subsequent lookups land
 *           in Tier 1.
 *
 *   Tier 3  No identity → walk-in → return 0 (loyalty silently skipped,
 *           matches today's behaviour for anonymous POS sales).
 *
 * Remaining flow (unchanged since C4):
 *  - Pull store rewardRules to compute coins-per-rupee (default 0.1).
 *  - Skip if bill total below minimum reward amount.
 *  - Credit via walletService.credit — same write path as consumer
 *    store-payment flow (CoinTransaction + LedgerEntry + Wallet atomic).
 *  - Persist coinsEarned + coinsCreditedUserId on the bill (for refund
 *    reversal + success screen).
 *
 * All errors are swallowed. Payment must never fail because coin credit
 * failed — loyalty is a bonus, not a blocker.
 */
async function creditCustomerCoinsForBill(bill: any, storeId: string): Promise<number> {
  try {
    // ── CANONICAL CASHBACK GATE ──
    //
    // When CANONICAL_CASHBACK_MODE=primary, the canonical cashback
    // subscriber (src/events/canonical/subscribers/cashbackSubscriber.ts)
    // owns cashback credits exclusively via the canonical.order.placed
    // event stream. Skip the legacy path to avoid double-credit.
    //
    // When =off (default) or =shadow, legacy keeps running and the
    // canonical subscriber either no-ops or logs-only. See that file's
    // header for the rollout plan.
    if (process.env.CANONICAL_CASHBACK_MODE === 'primary') {
      logger.debug('[POS] legacy cashback short-circuited (canonical=primary)', {
        billId: bill?._id?.toString?.() ?? String(bill?._id ?? 'unknown'),
        storeId,
      });
      return 0;
    }

    // ── Tier 1: prefer customerId that B7 wire-up already set on the bill ──
    let userId: string | null = null;
    if (bill.customerId) {
      const idStr = bill.customerId?.toString?.() ?? String(bill.customerId);
      if (mongoose.isValidObjectId(idStr)) {
        userId = idStr;
      }
    }

    // ── Tier 2: backfill path for pre-B7 bills ──
    //
    // Uses the shared resolveCustomerIdentity helper (same as create path)
    // so phone normalisation stays consistent — kills the 3-regex divergence
    // that was specifically called out when the helper was introduced.
    // Persisting the newly-resolved id back onto the bill forward-heals so
    // subsequent operations (e.g. refund reversal) get Tier 1 directly.
    if (!userId) {
      const customerPhone = (bill.customerPhone || '').toString().trim();
      if (customerPhone) {
        const identity = await resolveCustomerIdentity({
          customerPhone,
          source: 'pos',
        });
        if (identity.customerId) {
          userId = identity.customerId;
          try {
            bill.customerId = new mongoose.Types.ObjectId(identity.customerId);
            // No save yet — we'll persist once below along with coinsEarned
            // to keep mark-paid to a single write. If coin credit fails after
            // this, the final save below won't run and bill.customerId stays
            // in-memory only; that's acceptable (next mark-paid attempt just
            // re-runs the upsert, which is idempotent on phoneNumber).
          } catch {
            // Non-fatal — ObjectId cast failure falls through to normal
            // credit with a string userId.
          }
        }
      }
    }

    // ── Tier 3: walk-in → skip coin credit ──
    if (!userId) return 0;

    // Pull store reward rules. Absent → platform default (1 coin per ₹10).
    const store: any = await Store.findById(storeId).select('rewardRules storeName name').lean();
    const rewardRules = store?.rewardRules || {};
    const coinsPerRupee = Number(rewardRules.coinsPerRupee) || 0.1;
    const minAmount = Number(rewardRules.minimumAmountForReward) || 0;
    const billTotal = Number(bill.totalAmount) || 0;
    if (billTotal < minAmount) return 0;

    const coinsEarned = Math.floor(billTotal * coinsPerRupee);
    if (coinsEarned <= 0) return 0;

    const { walletService } = await import('../services/walletService');
    await walletService.credit({
      userId,
      amount: coinsEarned,
      source: 'cashback',
      description: `POS reward from ${store?.storeName || store?.name || 'store'}`,
      operationType: 'store_payment_reward',
      referenceId: `pos-bill:${bill._id}`,
      referenceModel: 'PosBill',
      metadata: {
        storeId: storeId,
        billId: bill._id?.toString?.() || bill._id,
        billNumber: bill.billNumber,
        billAmount: billTotal,
        channel: 'pos',
      },
    });

    // Persist the earned amount + linked user onto the bill so the refund
    // path can reverse the credit and the success screen shows a real value.
    // Also persists any Tier-2 backfilled customerId in the same save.
    bill.coinsEarned = coinsEarned;
    bill.coinsCreditedUserId = new mongoose.Types.ObjectId(userId);
    await bill.save();

    return coinsEarned;
  } catch (err) {
    logger.warn('[POS] Failed to credit customer coins (non-fatal):', err);
    return 0;
  }
}

/**
 * Deduct ingredient stock for each sold item based on its recipe.
 * Runs after bill is marked paid. Failures are silently ignored.
 */
async function depleteIngredients(
  items: Array<{ productId?: mongoose.Types.ObjectId; name: string; quantity: number }>,
  storeId: string,
) {
  const productIds = items.map((i) => i.productId).filter((id): id is mongoose.Types.ObjectId => !!id);

  if (productIds.length === 0) return;

  const recipes = await Recipe.find({ storeId, productId: { $in: productIds } }).lean();
  if (recipes.length === 0) return;

  const recipeMap = new Map(recipes.map((r) => [r.productId.toString(), r]));

  // Collect all ingredient decrements first, then execute in a single bulkWrite
  // to avoid N+1 DB round-trips (one per ingredient per order item).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bulkOps: any[] = [];
  for (const item of items) {
    if (!item.productId) continue;
    const recipe = recipeMap.get(item.productId.toString());
    if (!recipe) continue;

    const soldServings = item.quantity;
    for (const ing of recipe.ingredients) {
      const totalUsed = ing.quantity * soldServings;
      bulkOps.push({
        updateOne: {
          filter: { _id: ing.ingredientId },
          update: { $inc: { stockQty: -totalUsed } },
        },
      });
    }
  }
  if (bulkOps.length > 0) {
    await Ingredient.bulkWrite(bulkOps, { ordered: false });
  }
}

/**
 * Restore ingredient stock when a full refund is processed.
 * Mirrors depleteIngredients but adds quantity back.
 */
async function restoreIngredients(
  items: Array<{ productId?: mongoose.Types.ObjectId; name: string; quantity: number }>,
  storeId: string,
) {
  const productIds = items.map((i) => i.productId).filter((id): id is mongoose.Types.ObjectId => !!id);
  if (productIds.length === 0) return;

  const recipes = await Recipe.find({ storeId, productId: { $in: productIds } }).lean();
  if (recipes.length === 0) return;

  const recipeMap = new Map(recipes.map((r) => [r.productId.toString(), r]));

  // Collect all ingredient increments first, then execute in a single bulkWrite
  // to avoid N+1 DB round-trips (one per ingredient per order item).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bulkOps: any[] = [];
  for (const item of items) {
    if (!item.productId) continue;
    const recipe = recipeMap.get(item.productId.toString());
    if (!recipe) continue;
    for (const ing of recipe.ingredients) {
      bulkOps.push({
        updateOne: {
          filter: { _id: ing.ingredientId },
          update: { $inc: { stockQty: ing.quantity * item.quantity } },
        },
      });
    }
  }
  if (bulkOps.length > 0) {
    await Ingredient.bulkWrite(bulkOps, { ordered: false });
  }
}

/**
 * GET /api/store-payment/bills
 * List bills for a store. Requires ?storeId query param.
 * Optional filters: status, page, limit
 */
export const listBills = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;
  const { storeId, status, page = '1', limit = '20' } = req.query as Record<string, string>;

  if (!storeId) {
    return res.status(400).json({ success: false, message: 'storeId query parameter is required' });
  }

  const store = await resolveStore(storeId, merchantId);
  if (!store) {
    return res.status(404).json({ success: false, message: 'Store not found or access denied' });
  }

  const filter: Record<string, any> = { storeId, merchantId };
  if (status && ['pending', 'paid', 'cancelled'].includes(status)) {
    filter.status = status;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [bills, total, summaryAgg] = await Promise.all([
    PosBill.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    PosBill.countDocuments(filter),
    // Compute summary across ALL matching bills, not just the current page.
    PosBill.aggregate([
      {
        $match: { storeId: new mongoose.Types.ObjectId(storeId), merchantId: new mongoose.Types.ObjectId(merchantId) },
      },
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          paidBills: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
          pendingBills: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$totalAmount', 0] },
          },
        },
      },
    ]),
  ]);

  const summary = summaryAgg[0] || { totalBills: 0, paidBills: 0, pendingBills: 0, totalRevenue: 0 };
  const totalPages = Math.max(1, Math.ceil(total / limitNum));

  // Wrap the response so `data.bills`, `data.pagination`, `data.summary`
  // match the frontend BillsListResponse type that recent-orders.tsx reads.
  return res.status(200).json({
    success: true,
    data: {
      bills: bills.map(toPosBillDTO),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
      summary: {
        totalRevenue: summary.totalRevenue,
        totalBills: summary.totalBills,
        paidBills: summary.paidBills,
        pendingBills: summary.pendingBills,
      },
    },
  });
});

/**
 * POST /api/store-payment/cancel/:billId
 * Cancel a pending bill.
 */
export const cancelBill = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = req.merchantId!;
  const { billId } = req.params;

  // P2-C8: any active staff member can void a pending bill they created
  // at their own register (no fraud risk — the money never moved). Still
  // stamp `cancelledBy` for audit.
  const actorId = requireMerchantRole(req, res, ['owner', 'admin', 'manager', 'staff', 'cashier']);
  if (!actorId) return;

  if (!mongoose.isValidObjectId(billId)) {
    return res.status(400).json({ success: false, message: 'Invalid bill ID' });
  }

  const bill = await PosBill.findOne({ _id: billId, merchantId });
  if (!bill) {
    return res.status(404).json({ success: false, message: 'Bill not found or access denied' });
  }

  if (bill.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Bill cannot be cancelled — current status is '${bill.status}'`,
    });
  }

  bill.status = 'cancelled';
  bill.cancelledAt = new Date();
  (bill as any).cancelledBy = actorId;
  await bill.save();

  return res.status(200).json({
    success: true,
    message: 'Bill cancelled successfully',
    data: toPosBillDTO(bill),
  });
});
