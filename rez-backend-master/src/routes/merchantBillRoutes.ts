// @ts-nocheck
/**
 * Merchant Bill Builder Routes — Phase R2
 *
 * Handles:
 * - POST /api/merchant-bill/create  — create bill + Razorpay order → return QR/pay URL
 * - GET  /api/merchant-bill/:billId — get bill details (customer-facing, public)
 * - GET  /api/merchant-bill/:billId/status — check if bill is paid (public)
 * - GET  /api/merchant-bill/store/:storeSlug/active — list active bills for store (merchant)
 * - PATCH /api/merchant-bill/:billId/cancel — cancel a pending bill (merchant)
 */

import * as crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { MerchantBill, IBillItem } from '../models/MerchantBill';
import { Store } from '../models/Store';
import { StorePayment } from '../models/StorePayment';
import { createRazorpayOrder } from '../services/razorpayService';
import { authMiddleware as merchantAuth } from '../middleware/merchantauth';
import mongoose from 'mongoose';

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────────

function sendError(res: Response, status: number, msg: string, code: string) {
  return res.status(status).json({ success: false, message: msg, code });
}

function buildPayUrl(storeSlug: string, billId: string, paymentId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://now.rez.money';
  return `${base}/${storeSlug}/pay/checkout?billId=${billId}&paymentId=${paymentId}`;
}

// ─── POST /api/merchant-bill/create ─────────────────────────────────────────────
// Merchant creates a bill with items + a Razorpay order.
// Returns the shareable payment URL and bill metadata.
router.post(
  '/create',
  merchantAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const {
      storeSlug,
      items,
      discount = 0,
      customerName,
      customerPhone,
    } = req.body as {
      storeSlug: string;
      items: IBillItem[];
      discount?: number;
      customerName?: string;
      customerPhone?: string;
    };

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'At least one item is required', 'ITEMS_REQUIRED');
    }
    for (const item of items) {
      if (!item.name?.trim()) return sendError(res, 400, 'Item name is required', 'INVALID_ITEM');
      if (!item.qty || item.qty < 1) return sendError(res, 400, 'Item quantity must be at least 1', 'INVALID_QTY');
      if (item.unitPrice == null || item.unitPrice < 0)
        return sendError(res, 400, 'Invalid item price', 'INVALID_PRICE');
      item.total = Math.round(item.qty * item.unitPrice);
    }

    // Look up store
    const store = await Store.findOne({ slug: storeSlug }).select('_id merchant name slug paymentSettings').lean();
    if (!store) return sendError(res, 404, 'Store not found', 'STORE_NOT_FOUND');

    // Verify merchant owns this store
    const merchantId = (req as any).user?._id || (req as any).user?.id;
    if (!merchantId || String((store as any).merchant) !== String(merchantId)) {
      return sendError(res, 403, 'Not authorized for this store', 'FORBIDDEN');
    }

    const subtotal = items.reduce((sum, i) => sum + i.total, 0);
    const total = Math.max(0, subtotal - (discount || 0));

    if (total <= 0) return sendError(res, 400, 'Bill total must be greater than zero', 'INVALID_TOTAL');

    const billNumber = MerchantBill.generateBillNumber();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create Razorpay order (amount in RUPEES — razorpayService multiplies by 100 internally)
    const razorpayOrder = await createRazorpayOrder(total / 100, `bill_${billNumber}`, {
      billNumber,
      storeSlug,
      storeName: (store as any).name,
    });

    // Persist the bill
    const merchantBill = new MerchantBill({
      billNumber,
      merchantId: new mongoose.Types.ObjectId(String(merchantId)),
      storeId: (store as any)._id,
      storeSlug,
      items,
      subtotal,
      discount: discount || 0,
      total,
      status: 'pending',
      expiresAt,
      razorpayOrderId: razorpayOrder.id,
      customerName: customerName?.trim() || undefined,
      customerPhone: customerPhone?.trim() || undefined,
    });
    await merchantBill.save();

    const payUrl = buildPayUrl(storeSlug, String(merchantBill._id), billNumber);

    logger.info('[MerchantBill] Created', { billNumber, storeSlug, total, merchant: merchantId });

    return res.json({
      success: true,
      data: {
        billId: String(merchantBill._id),
        billNumber,
        items,
        subtotal,
        discount: discount || 0,
        total,
        expiresAt: expiresAt.toISOString(),
        payUrl,
        razorpayOrderId: razorpayOrder.id,
      },
    });
  }),
);

// ─── GET /api/merchant-bill/:billId ─────────────────────────────────────────────
// Customer-facing: get bill details for the pay page.
// Public — billId is the secret. Shows amount, items, store info.
router.get(
  '/:billId',
  asyncHandler(async (req: Request, res: Response) => {
    const { billId } = req.params;

    const bill = await MerchantBill.findById(billId)
      .populate('storeId', 'name logo slug address paymentSettings')
      .lean();

    if (!bill) return sendError(res, 404, 'Bill not found', 'NOT_FOUND');

    const store = bill.storeId as any;
    const isExpired = bill.status === 'expired' || (bill.status === 'pending' && new Date(bill.expiresAt) < new Date());
    const isPaid = bill.status === 'paid';

    return res.json({
      success: true,
      data: {
        billId: String(bill._id),
        billNumber: bill.billNumber,
        storeName: store?.name || bill.storeSlug,
        storeLogo: store?.logo || null,
        storeSlug: bill.storeSlug,
        items: bill.items,
        subtotal: bill.subtotal,
        discount: bill.discount,
        total: bill.total,
        status: isPaid ? 'paid' : isExpired ? 'expired' : 'pending',
        expiresAt: bill.expiresAt.toISOString(),
        paidAt: bill.paidAt?.toISOString() || null,
        razorpayOrderId: bill.razorpayOrderId || null,
        paymentId: bill.paymentId || null,
        isEditable: bill.status === 'pending' && !isExpired,
      },
    });
  }),
);

// ─── GET /api/merchant-bill/:billId/status ──────────────────────────────────────
// Lightweight status check for the pay page (does not return item details).
router.get(
  '/:billId/status',
  asyncHandler(async (req: Request, res: Response) => {
    const { billId } = req.params;

    const bill = await MerchantBill.findById(billId).select('status expiresAt paidAt paymentId razorpayOrderId').lean();
    if (!bill) return sendError(res, 404, 'Bill not found', 'NOT_FOUND');

    return res.json({
      success: true,
      data: {
        status: bill.status,
        expiresAt: bill.expiresAt.toISOString(),
        paidAt: bill.paidAt?.toISOString() || null,
        paymentId: bill.paymentId || null,
        razorpayOrderId: bill.razorpayOrderId || null,
      },
    });
  }),
);

// ─── GET /api/merchant-bill/store/:storeSlug/active ────────────────────────────────
// List active (pending) bills for a store — for the merchant's bill builder UI.
router.get(
  '/store/:storeSlug/active',
  merchantAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { storeSlug } = req.params;

    const store = await Store.findOne({ slug: storeSlug }).select('_id merchant').lean();
    if (!store) return sendError(res, 404, 'Store not found', 'STORE_NOT_FOUND');

    const merchantId = (req as any).user?._id || (req as any).user?.id;
    if (!merchantId || String((store as any).merchant) !== String(merchantId)) {
      return sendError(res, 403, 'Not authorized', 'FORBIDDEN');
    }

    const bills = await MerchantBill.find({
      storeSlug,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('billNumber items subtotal discount total expiresAt createdAt')
      .lean();

    return res.json({
      success: true,
      data: {
        bills: bills.map((b) => ({
          billId: String(b._id),
          billNumber: b.billNumber,
          items: b.items,
          subtotal: b.subtotal,
          discount: b.discount,
          total: b.total,
          expiresAt: b.expiresAt.toISOString(),
          createdAt: b.createdAt.toISOString(),
        })),
        count: bills.length,
      },
    });
  }),
);

// ─── PATCH /api/merchant-bill/:billId/cancel ─────────────────────────────────────
// Merchant cancels a pending bill.
router.patch(
  '/:billId/cancel',
  merchantAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { billId } = req.params;

    const bill = await MerchantBill.findById(billId).lean();
    if (!bill) return sendError(res, 404, 'Bill not found', 'NOT_FOUND');

    const merchantId = (req as any).user?._id || (req as any).user?.id;
    if (!merchantId || String(bill.merchantId) !== String(merchantId)) {
      return sendError(res, 403, 'Not authorized', 'FORBIDDEN');
    }

    if (bill.status !== 'pending') {
      return sendError(res, 400, `Cannot cancel a ${bill.status} bill`, 'INVALID_STATE');
    }

    await MerchantBill.updateOne({ _id: billId }, { $set: { status: 'cancelled' } });
    logger.info('[MerchantBill] Cancelled', { billNumber: bill.billNumber });

    return res.json({ success: true, data: { billId, status: 'cancelled' } });
  }),
);

export default router;
