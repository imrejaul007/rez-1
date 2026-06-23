// @ts-nocheck
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { MerchantInvoice } from '../models/MerchantInvoice';
import { logger } from '../config/logger';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/merchant/invoices
 * List invoices for the authenticated merchant (paginated).
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).userId || (req as any).user?._id || (req as any).user?.id;
    if (!merchantId || !mongoose.isValidObjectId(merchantId)) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      merchantId: new mongoose.Types.ObjectId(merchantId.toString()),
    };

    const VALID_INVOICE_STATUSES = ['draft', 'issued', 'paid', 'cancelled'] as const;
    if (req.query.status) {
      const statusValue = String(req.query.status);
      if (!VALID_INVOICE_STATUSES.includes(statusValue as any)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
      }
      filter.status = statusValue;
    }

    const [invoices, total] = await Promise.all([
      MerchantInvoice.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id invoiceNumber customerId storeId totalAmount items issuedAt status')
        .lean(),
      MerchantInvoice.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

/**
 * POST /api/merchant/invoices/generate
 * Generate a new invoice from a transaction.
 * Body: { transactionId, customerName, customerEmail?, items: [{ name, qty, price }] }
 */
router.post(
  '/generate',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).userId || (req as any).user?._id || (req as any).user?.id;
    if (!merchantId || !mongoose.isValidObjectId(merchantId)) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { transactionId, customerName, customerEmail, items } = req.body as {
      transactionId?: string;
      customerName?: string;
      customerEmail?: string;
      items?: Array<{ name: string; qty: number; price: number }>;
    };

    if (!customerName) {
      return res.status(400).json({ success: false, message: 'customerName is required' });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items must be a non-empty array' });
    }

    // Validate items
    for (const item of items) {
      if (!item.name || typeof item.qty !== 'number' || typeof item.price !== 'number') {
        return res.status(400).json({ success: false, message: 'Each item must have name, qty, and price' });
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.qty * item.price, 0);

    const invoice = await MerchantInvoice.create({
      merchantId: new mongoose.Types.ObjectId(merchantId.toString()),
      customerName,
      customerEmail: customerEmail || undefined,
      items,
      totalAmount,
      status: 'draft',
      issuedAt: new Date(),
      ...(transactionId ? { 'metadata.transactionId': transactionId } : {}),
    });

    logger.info('[InvoiceRoutes] Invoice generated', {
      invoiceId: (invoice._id as mongoose.Types.ObjectId).toString(),
      merchantId: merchantId.toString(),
      total: totalAmount,
    });

    return res.status(201).json({
      success: true,
      invoiceId: (invoice._id as mongoose.Types.ObjectId).toString(),
      invoiceNumber: invoice.invoiceNumber,
      total: totalAmount,
    });
  }),
);

export default router;
