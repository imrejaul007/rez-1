/**
 * GST Invoice Controller
 *
 * Handles GST invoice retrieval and listing for store payments AND POS bills.
 */

import { Request, Response } from 'express';
import { logger } from '../config/logger';
import mongoose, { Types } from 'mongoose';
import { StorePayment } from '../models/StorePayment';
import { Store } from '../models/Store';
import { PosBill } from '../models/PosBill';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Project a Store doc into the address block the invoice UI expects. Tolerates
 * both old flat shapes (address as string) and new nested {address, city,
 * state, pincode} objects. Used by both code paths below.
 */
function formatStoreAddress(store: any): string {
  if (!store) return '';
  const loc = store.location || store;
  if (typeof loc === 'string') return loc;
  const parts = [loc.address, loc.city, loc.state, loc.pincode].filter(Boolean);
  return parts.join(', ');
}

/**
 * GET /api/store-payment/:id/invoice
 * Fetch a GST invoice by ID.
 *
 * BUG FIX (C5 — POS GST invoice missing): Previously this endpoint only
 * looked up `StorePayment` — POS bills (stored in `PosBill`) returned 404,
 * so the "Download GST Invoice" button on the POS success screen was a
 * dead button. Now we try StorePayment first, then fall back to PosBill
 * and return the same FE-compatible shape for either source.
 *
 * Also fixes a pre-existing shape mismatch where this endpoint returned
 * `{ invoiceNumber, merchant, customer, bill, ... }` but the FE
 * `InvoiceData` type (services/api/invoices.ts) expects a FLAT object
 * with `storeName, storeAddress, gstin, invoiceNo, date, billNo,
 * subtotal, cgst, sgst, igst, total, paymentMethod, customerPhone`.
 * The POS invoice screen read `invoice.storeName` and crashed.
 */
export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid invoice ID' });
  }

  // Try StorePayment first (online consumer payments).
  const storePayment = await StorePayment.findById(id)
    .populate('userId', 'name phone')
    .populate('storeId', 'name address phone city state location')
    .populate('merchantId', 'name gstNumber address')
    .lean();

  if (storePayment) {
    if (storePayment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Invoice not available for incomplete payments' });
    }

    const storeRef: any = storePayment.storeId || {};
    const merchantRef: any = storePayment.merchantId || {};
    const gst = storePayment.gstDetails || ({} as any);
    const billTotal = Number((storePayment as any).totalAmount || storePayment.billAmount || 0);
    const gstTotal = Number(gst.totalGst || 0);
    const subtotal = Math.max(0, billTotal - gstTotal);

    return res.json({
      success: true,
      data: {
        storePaymentId: String((storePayment as any)._id),
        invoiceNo: storePayment.invoiceNumber || `INV-${String(storePayment._id).slice(-6).toUpperCase()}`,
        date: new Date(
          storePayment.invoiceDate || storePayment.completedAt || storePayment.createdAt,
        ).toLocaleDateString('en-IN'),
        billNo: storePayment.billNumber || '',
        storeName: storeRef.name || merchantRef.name || '',
        storeAddress: formatStoreAddress(storeRef),
        gstin: merchantRef.gstNumber || gst.gstNumber || undefined,
        customerPhone: (storePayment.userId as any)?.phone || undefined,
        items: [],
        subtotal,
        cgst: Number(gst.cgst || 0) || undefined,
        sgst: Number(gst.sgst || 0) || undefined,
        igst: Number(gst.igst || 0) || undefined,
        total: billTotal,
        paymentMethod: storePayment.paymentMethod || '',
        upiId: undefined,
      },
    });
  }

  // Fall back to PosBill — the POS silo the success screen points at.
  const posBill: any = await PosBill.findById(id)
    .populate('storeId', 'name address phone city state location')
    .populate('merchantId', 'name gstNumber address')
    .lean();

  if (!posBill) {
    return res.status(404).json({ success: false, message: 'Invoice not found' });
  }

  if (!['paid', 'refunded', 'partial_refund'].includes(posBill.status)) {
    return res.status(400).json({ success: false, message: 'Invoice not available until the bill is paid' });
  }

  const storeRef: any = posBill.storeId || {};
  const merchantRef: any = posBill.merchantId || {};
  const subtotal = Number(posBill.subtotal || posBill.totalAmount || 0);
  const tax = Number(posBill.taxAmount || 0);
  // Split the total GST 50/50 into CGST/SGST for display. The POS billing
  // path only tracks total `taxAmount`; if finer-grained breakdown ships
  // later we'll read it here.
  const cgst = tax > 0 ? Math.round((tax / 2) * 100) / 100 : undefined;
  const sgst = cgst;

  return res.json({
    success: true,
    data: {
      storePaymentId: String(posBill._id),
      invoiceNo: posBill.billNumber || `INV-${String(posBill._id).slice(-6).toUpperCase()}`,
      date: new Date(posBill.paidAt || posBill.createdAt).toLocaleDateString('en-IN'),
      billNo: posBill.billNumber || '',
      storeName: storeRef.name || merchantRef.name || '',
      storeAddress: formatStoreAddress(storeRef),
      gstin: merchantRef.gstNumber || undefined,
      customerPhone: posBill.customerPhone || undefined,
      items: Array.isArray(posBill.items)
        ? posBill.items.map((i: any) => ({
            name: i.name || '',
            qty: Number(i.quantity) || 0,
            price: Number(i.price) || 0,
          }))
        : [],
      subtotal,
      cgst,
      sgst,
      igst: undefined,
      total: Number(posBill.totalAmount || 0),
      paymentMethod: posBill.paymentMethod || 'cash',
      upiId: undefined,
    },
  });
});

/**
 * GET /api/store-payment/invoices?storeId=&startDate=&endDate=
 * List paginated GST invoices for GSTR-1 filing
 */
export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const { storeId, startDate, endDate, page = '1', limit = '50' } = req.query;
  const merchantId = req.merchantId;

  if (!merchantId) {
    return res.status(401).json({ success: false, message: 'Merchant auth required' });
  }

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const skip = (pageNum - 1) * pageSize;

  const query: any = {
    status: 'completed',
    'gstDetails.isGstBill': true,
  };

  // Scope invoices to stores owned by this merchant. Without this check,
  // omitting storeId returned ALL GST invoices system-wide.
  //
  // NOTE: stores collection has two writers with divergent field names —
  // rez-backend Store model uses `merchantId`, rez-merchant-service Store
  // model uses `merchant`. Match either so ownership works regardless of
  // which service wrote the store.
  if (storeId && Types.ObjectId.isValid(storeId as string)) {
    const ownedStore = await Store.findOne({
      _id: storeId,
      $or: [{ merchantId }, { merchant: merchantId }],
    })
      .select('_id')
      .lean();
    if (!ownedStore) {
      return res.status(403).json({ success: false, message: 'You do not own this store' });
    }
    query.storeId = new Types.ObjectId(storeId as string);
  } else {
    // No storeId — restrict to all stores owned by this merchant.
    const ownedStores = await Store.find({
      $or: [{ merchantId }, { merchant: merchantId }],
    })
      .select('_id')
      .lean();
    query.storeId = { $in: ownedStores.map((s) => s._id) };
  }

  if (startDate || endDate) {
    query.invoiceDate = {};
    if (startDate) {
      query.invoiceDate.$gte = new Date(startDate as string);
    }
    if (endDate) {
      const endDateObj = new Date(endDate as string);
      endDateObj.setHours(23, 59, 59, 999);
      query.invoiceDate.$lte = endDateObj;
    }
  }

  const [invoices, total] = await Promise.all([
    StorePayment.find(query)
      .select(
        'invoiceNumber invoiceDate billNumber totalAmount gstDetails.totalGst gstDetails.gstRate storeId userId paymentMethod',
      )
      .populate('storeId', 'name')
      .populate('userId', 'phone')
      .sort({ invoiceDate: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    StorePayment.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      billNumber: inv.billNumber,
      storeName: (inv.storeId as any)?.name || '',
      customerPhone: (inv.userId as any)?.phone || '',
      totalAmount: inv.totalAmount,
      gstAmount: inv.gstDetails?.totalGst || 0,
      gstRate: inv.gstDetails?.gstRate || 0,
      paymentMethod: inv.paymentMethod,
    })),
    pagination: {
      page: pageNum,
      limit: pageSize,
      total,
      pages: Math.ceil(total / pageSize),
    },
  });
});
