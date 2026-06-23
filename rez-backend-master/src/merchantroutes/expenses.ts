/**
 * Merchant Expense Routes
 * POST /api/merchant/expenses  — log a new operational expense
 * GET  /api/merchant/expenses  — list expenses (paginated)
 *
 * Analytics summary (GET /analytics/expenses) lives in analytics.ts.
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { Expense } from '../models/Expense';
import { logger } from '../config/logger';

const router = Router();
router.use(authMiddleware);

const ALLOWED_CATEGORIES = [
  'rent',
  'salary',
  'utilities',
  'marketing',
  'inventory',
  'maintenance',
  'equipment',
  'other',
] as const;

const ALLOWED_PAYMENT_MODES = ['cash', 'upi', 'bank_transfer', 'card'] as const;

/**
 * POST /api/merchant/expenses
 * Create a new expense entry.
 * Body: { storeId, category, description, amount, mode, date?, gstAmount?, isRecurring? }
 */
router.post('/expenses', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id || (req as any).merchantId;
    const { storeId, category, description, amount, mode = 'upi', date, gstAmount, isRecurring = false } = req.body;

    // Validate required fields
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'storeId is required' });
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`,
      });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ success: false, message: 'description is required' });
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }
    if (!ALLOWED_PAYMENT_MODES.includes(mode)) {
      return res.status(400).json({
        success: false,
        message: `mode must be one of: ${ALLOWED_PAYMENT_MODES.join(', ')}`,
      });
    }

    const expense = await Expense.create({
      merchantId,
      storeId,
      category,
      description: description.trim(),
      amount: Number(amount),
      paymentMode: mode,
      date: date ? new Date(date) : new Date(),
      gstAmount: gstAmount != null ? Number(gstAmount) : 0,
      isRecurring: Boolean(isRecurring),
      addedBy: (req as any).merchant?.name || 'merchant',
    });

    return res.status(201).json({
      success: true,
      data: { expense },
      message: 'Expense recorded',
    });
  } catch (err: any) {
    logger.error('[Expenses] POST /expenses error', err);
    return res.status(500).json({ success: false, message: 'Failed to record expense' });
  }
});

/**
 * GET /api/merchant/expenses
 * List expenses for the merchant (most recent first, paginated).
 * Query: storeId?, category?, page=1, limit=20
 */
router.get('/expenses', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id || (req as any).merchantId;
    const { storeId, category, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, any> = { merchantId };
    if (storeId) filter.storeId = storeId;
    if (category && ALLOWED_CATEGORIES.includes(category as any)) {
      filter.category = category;
    }

    // BE-MER-024: Validate pagination parameters — parseInt returns NaN for non-numeric input
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    if (!Number.isFinite(parsedPage) || !Number.isFinite(parsedLimit)) {
      return res.status(400).json({ success: false, message: 'Invalid pagination parameters' });
    }
    const pageNum = Math.max(1, parsedPage);
    const limitNum = Math.min(100, Math.max(1, parsedLimit));
    const skip = (pageNum - 1) * limitNum;

    const [expenses, total] = await Promise.all([
      Expense.find(filter).sort({ date: -1 }).skip(skip).limit(limitNum).lean(),
      Expense.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: {
        expenses: expenses.map((e) => ({
          id: String(e._id),
          category: e.category,
          amount: e.amount,
          description: e.description,
          mode: e.paymentMode,
          date: (e.date as Date).toISOString(),
          gstAmount: e.gstAmount || 0,
          isRecurring: e.isRecurring,
        })),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err: any) {
    logger.error('[Expenses] GET /expenses error', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
});

/**
 * DELETE /api/merchant/expenses/:id
 * Remove an expense entry.
 */
router.delete('/expenses/:id', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchant?._id || (req as any).merchantId;
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, merchantId });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    return res.json({ success: true, message: 'Expense deleted' });
  } catch (err: any) {
    logger.error('[Expenses] DELETE /expenses error', err);
    return res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
});

export default router;
