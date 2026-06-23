import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { CustomerCredit } from '../models/CustomerCredit';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';
import pushNotificationService from '../services/pushNotificationService';
import { createRateLimiter } from '../middleware/rateLimiter';
import mongoose from 'mongoose';

// Escape regex special characters to prevent ReDoS attacks
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Rate limiter for financial operations (Khata endpoints)
const khataFinancialLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 financial operations per 15 min per user
  prefix: 'khata-financial',
  message: 'Too many requests to Khata. Please try again later.',
});

// Joi validation schemas for Khata endpoints
const addCreditSchema = Joi.object({
  customerPhone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone must be a valid Indian mobile number',
    }),
  customerName: Joi.string().min(2).max(100).required(),
  amount: Joi.number().positive().max(100000).required(),
  note: Joi.string().max(200).optional().allow(''),
  storeId: Joi.string().optional(),
});

const recordPaymentSchema = Joi.object({
  amount: Joi.number().positive().max(100000).required(),
  note: Joi.string().max(200).optional().allow(''),
});

const router = Router();
router.use(authMiddleware);

// GET /api/merchant/khata — list customers with balances
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const { page = 1, limit = 20, search } = req.query;

    // RACHEL: attack surface — input validation: validate pagination and search parameters
    const pageNum = Math.max(1, Math.min(Number(page) || 1, 1000));
    const limitNum = Math.max(1, Math.min(Number(limit) || 20, 100));
    const searchStr = search ? String(search).trim().slice(0, 100) : '';

    const query: any = { merchantId };
    if (searchStr) {
      const safeSearch = escapeRegex(searchStr);
      query.$or = [
        { customerName: { $regex: safeSearch, $options: 'i' } },
        { customerPhone: { $regex: safeSearch, $options: 'i' } },
      ];
    }
    const customers = await CustomerCredit.find(query)
      .sort({ lastActivityAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);
    const total = await CustomerCredit.countDocuments(query);
    res.json({ success: true, data: { customers, total, page: pageNum, limit: limitNum } });
  } catch (err: any) {
    // RACHEL: attack surface — verbose error responses: hide implementation details
    res.status(500).json({ success: false, error: 'An error occurred retrieving customers' });
  }
});

// POST /api/merchant/khata — add credit entry for customer
router.post('/', khataFinancialLimiter, async (req: Request, res: Response) => {
  try {
    const { error } = addCreditSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const merchantId = req.merchantId;
    const { storeId, customerPhone, customerName, amount, note } = req.body;
    const entry = await CustomerCredit.findOneAndUpdate(
      { merchantId, customerPhone },
      {
        $setOnInsert: { merchantId, storeId, customerPhone, customerName },
        $inc: { balance: amount },
        $push: { transactions: { amount, type: 'credit', note, date: new Date() } },
        $set: { lastActivityAt: new Date() },
      },
      { upsert: true, new: true },
    );

    // Notify consumer about khata entry (fire-and-forget)
    try {
      const { User } = await import('../models/User');
      const { Merchant } = await import('../models/Merchant');
      const consumer = await User.findOne({ phoneNumber: customerPhone });
      const merchant = await Merchant.findById(merchantId).select('businessName').lean();

      if (consumer?._id) {
        const isDebit = amount > 0; // positive = owes merchant
        const newBalance = entry?.balance || amount;

        await pushNotificationService
          .sendPushToUser(consumer._id.toString(), {
            title: isDebit
              ? `New credit at ${merchant?.businessName || 'merchant'}`
              : `Payment recorded at ${merchant?.businessName || 'merchant'}`,
            body: isDebit
              ? `₹${Math.abs(amount)} added. Your balance: ₹${newBalance}`
              : `₹${Math.abs(amount)} payment recorded. Remaining: ₹${newBalance}`,
            data: { screen: 'khata', merchantId },
          })
          .catch((err: any) => logger.error('[KHATA] Failed to send consumer push: ' + err.message));
      }
    } catch (notifErr: any) {
      logger.error('[KHATA] Notification error: ' + notifErr.message);
    }

    res.json({ success: true, data: { entry } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/merchant/khata/:customerId
router.get('/:customerId', async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId;
    const { customerId } = req.params;

    // RACHEL: attack surface — sequential ID validation: validate ObjectId format
    if (!mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({ success: false, error: 'Invalid customer ID format' });
    }

    const entry = await CustomerCredit.findOne({ _id: customerId, merchantId });
    if (!entry) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: { entry } });
  } catch (err: any) {
    // RACHEL: attack surface — verbose error responses: hide implementation details
    res.status(500).json({ success: false, error: 'An error occurred retrieving customer information' });
  }
});

// POST /api/merchant/khata/:customerId/payment — record a payment
router.post('/:customerId/payment', khataFinancialLimiter, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;

    // RACHEL: attack surface — sequential ID validation: validate ObjectId format
    if (!mongoose.isValidObjectId(customerId)) {
      return res.status(400).json({ success: false, error: 'Invalid customer ID format' });
    }

    const { error } = recordPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const merchantId = req.merchantId;
    const { amount, note } = req.body;
    const entry = await CustomerCredit.findOneAndUpdate(
      { _id: customerId, merchantId },
      {
        $inc: { balance: -amount },
        $push: { transactions: { amount, type: 'payment', note, date: new Date() } },
        $set: { lastActivityAt: new Date() },
      },
      { new: true },
    );
    if (!entry) return res.status(404).json({ success: false, error: 'Customer not found' });
    res.json({ success: true, data: { entry } });
  } catch (err: any) {
    // RACHEL: attack surface — verbose error responses: hide implementation details
    res.status(500).json({ success: false, error: 'An error occurred processing the payment' });
  }
});

export default router;
