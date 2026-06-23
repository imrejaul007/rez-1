import { Request, Response } from 'express';
import { Wallet } from '../models/Wallet';
import { Transaction } from '../models/Transaction';
import { sendSuccess, sendError, sendNotFound, sendBadRequest } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import mongoose from 'mongoose';

/**
 * @swagger
 * /api/wallet/transactions:
 *   get:
 *     summary: Get paginated transaction history
 *     description: Returns a paginated list of wallet transactions with filtering options.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by transaction type
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Minimum amount filter
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Maximum amount filter
 *     responses:
 *       200:
 *         description: Transactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/TransactionItem'
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const {
    page = 1,
    limit = 20,
    type,
    category,
    status,
    dateFrom,
    dateTo,
    minAmount,
    maxAmount
  } = req.query;

  // Build filters
  const filters: any = {};

  if (type) filters.type = type;
  if (category) filters.category = category;
  if (status) filters.status = status;

  if (dateFrom || dateTo) {
    filters.dateRange = {
      start: dateFrom ? new Date(dateFrom as string) : new Date(0),
      end: dateTo ? new Date(dateTo as string) : new Date()
    };
  }

  if (minAmount || maxAmount) {
    filters.amountRange = {
      min: minAmount ? Number(minAmount) : 0,
      max: maxAmount ? Number(maxAmount) : Number.MAX_SAFE_INTEGER
    };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const transactions = await Transaction.getUserTransactions(
    userId,
    filters,
    Number(limit),
    skip
  );

  const total = await Transaction.countDocuments({ user: userId, ...filters });
  const totalPages = Math.ceil(total / Number(limit));

  sendSuccess(res, {
    transactions,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
      hasNext: Number(page) < totalPages,
      hasPrev: Number(page) > 1
    }
  }, 'Transactions retrieved successfully');
});

/**
 * @swagger
 * /api/wallet/transaction/{id}:
 *   get:
 *     summary: Get single transaction details
 *     description: Returns details of a specific transaction by ID.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *     responses:
 *       200:
 *         description: Transaction details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/TransactionItem'
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Transaction not found
 *       429:
 *         description: Rate limit exceeded
 */
export const getTransactionById = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const transaction = await Transaction.findOne({
    _id: id,
    user: userId
  }).populate('source.reference').lean();

  if (!transaction) {
    return sendNotFound(res, 'Transaction not found');
  }

  sendSuccess(res, { transaction }, 'Transaction details retrieved successfully');
});

/**
 * @swagger
 * /api/wallet/summary:
 *   get:
 *     summary: Get transaction summary
 *     description: Returns aggregated transaction summary statistics for the given period.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *         description: Time period for the summary
 *     responses:
 *       200:
 *         description: Transaction summary retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
export const getTransactionSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;
  const { period = 'month' } = req.query;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const validPeriods = ['day', 'week', 'month', 'year'];
  if (!validPeriods.includes(period as string)) {
    return sendBadRequest(res, 'Invalid period. Must be day, week, month, or year');
  }

  const summary = await Transaction.getUserTransactionSummary(
    userId,
    period as 'day' | 'week' | 'month' | 'year'
  );

  const wallet = await Wallet.findOne({ user: userId }).lean();

  sendSuccess(res, {
    summary: summary[0] || { summary: [], totalTransactions: 0 },
    period,
    wallet: wallet ? {
      balance: wallet.balance,
      statistics: wallet.statistics
    } : null
  }, 'Transaction summary retrieved successfully');
});

/**
 * @swagger
 * /api/wallet/transaction-counts:
 *   get:
 *     summary: Get transaction counts by category
 *     description: Returns lightweight transaction counts grouped by category (no full data transfer).
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction counts retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
export const getTransactionCounts = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const userObjId = new mongoose.Types.ObjectId(userId);

  const counts = await Transaction.aggregate([
    { $match: { user: userObjId } },
    { $group: { _id: '$category', count: { $sum: 1 } } }
  ]);

  const total = counts.reduce((sum: number, c: any) => sum + c.count, 0);
  const byCategory: Record<string, number> = { ALL: total };
  for (const c of counts) {
    if (c._id) byCategory[c._id] = c.count;
  }

  sendSuccess(res, { counts: byCategory, total }, 'Transaction counts retrieved');
});

/**
 * @swagger
 * /api/wallet/categories:
 *   get:
 *     summary: Get spending breakdown by category
 *     description: Returns wallet spending aggregated by transaction category.
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Categories breakdown retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Not authenticated
 *       429:
 *         description: Rate limit exceeded
 */
export const getCategoriesBreakdown = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId;

  if (!userId) {
    return sendError(res, 'User not authenticated', 401);
  }

  const breakdown = await Transaction.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        'status.current': 'completed'
      }
    },
    {
      $group: {
        _id: '$category',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    {
      $sort: { totalAmount: -1 }
    }
  ]);

  sendSuccess(res, {
    categories: breakdown,
    totalCategories: breakdown.length
  }, 'Categories breakdown retrieved successfully');
});
