import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Order } from '../models/Order';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import {
  sendSuccess,
  sendNotFound,
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { CoinTransaction } from '../models/CoinTransaction';
import { LedgerEntry } from '../models/LedgerEntry';
import { Refund } from '../models/Refund';
import { logger } from '../config/logger';
import { ACTIVE_STATUSES, PAST_STATUSES, getOrderProgress } from '../config/orderStateMachine';
import etaService from '../services/etaService';
import { escapeRegex } from '../utils/sanitize';

// ─── getUserOrders ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List user orders
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: statusGroup
 *         schema:
 *           type: string
 *           enum: [active, past]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [newest, oldest, amount_high, amount_low]
 *           default: newest
 *     responses:
 *       200:
 *         description: Paginated list of user orders
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         orders:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/OrderSummary'
 *                         nextCursor:
 *                           type: string
 *                         hasMore:
 *                           type: boolean
 *                         counts:
 *                           type: object
 *                           properties:
 *                             active:
 *                               type: integer
 *                             past:
 *                               type: integer
 *                         pagination:
 *                           type: object
 *       401:
 *         description: Unauthorized
 */
export const getUserOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;
  const { status, statusGroup, page = 1, limit = 20, cursor, search, dateFrom, dateTo, sort = 'newest' } = req.query;

  try {
    const query: any = { user: userId };

    // Status group filter (for tracking page tabs)
    if (statusGroup === 'active') {
      query.status = { $in: ACTIVE_STATUSES };
    } else if (statusGroup === 'past') {
      query.status = { $in: PAST_STATUSES };
    } else if (status && status !== 'all') {
      // Individual status filter (backwards compatible)
      query.status = status;
    }

    // Cursor-based pagination: fetch orders older than cursor
    if (cursor) {
      query._id = { $lt: new Types.ObjectId(cursor as string) };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) query.createdAt.$lte = new Date(dateTo as string);
    }

    // Server-side search: order number, item name, store name
    if (search && (search as string).trim()) {
      const searchStr = (search as string).trim();
      const safeSearch = escapeRegex(searchStr);
      query.$or = [
        { orderNumber: { $regex: safeSearch, $options: 'i' } },
        { 'items.name': { $regex: safeSearch, $options: 'i' } },
        { 'items.storeName': { $regex: safeSearch, $options: 'i' } },
      ];
    }

    // Sort options
    const sortMap: Record<string, any> = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      amount_high: { 'totals.total': -1 },
      amount_low: { 'totals.total': 1 },
    };
    const sortOption = sortMap[sort as string] || { createdAt: -1 };

    const safeLimit = Math.min(Number(limit) || 20, 50);

    // If using cursor pagination, don't use skip
    const useCursor = !!cursor;
    const skip = useCursor ? 0 : (Number(page) - 1) * safeLimit;

    // Fetch orders without populate() — populate issues one query per
    // referenced doc. For 20 orders × 5 items each, that's 100+ extra queries.
    // We hydrate refs manually with a single $in lookup per collection below.
    const [orders, total, counts] = await Promise.all([
      Order.find(query)
        .sort(sortOption)
        .skip(skip)
        .limit(safeLimit + 1) // Fetch one extra to check hasMore
        .lean(),
      Order.countDocuments(query),
      // Always return active/past counts for the user
      Order.aggregate([
        { $match: { user: new Types.ObjectId(userId) } },
        {
          $facet: {
            active: [
              { $match: { status: { $in: ACTIVE_STATUSES } } },
              { $count: 'count' },
            ],
            past: [
              { $match: { status: { $in: PAST_STATUSES } } },
              { $count: 'count' },
            ],
          },
        },
      ]).option({ allowDiskUse: true }),
    ]);

    // Batched hydration of items.product / items.store / store refs.
    // 3 $in queries total, regardless of result size.
    if (orders.length > 0) {
      const productIds = new Set<string>();
      const storeIds = new Set<string>();
      for (const order of orders as any[]) {
        if (order.store) storeIds.add(String(order.store));
        if (Array.isArray(order.items)) {
          for (const it of order.items) {
            if (it?.product) productIds.add(String(it.product));
            if (it?.store) storeIds.add(String(it.store));
          }
        }
      }
      const [products, stores] = await Promise.all([
        productIds.size > 0
          ? Product.find({ _id: { $in: Array.from(productIds) } }, 'name images basePrice').lean()
          : Promise.resolve([] as any[]),
        storeIds.size > 0
          ? Store.find({ _id: { $in: Array.from(storeIds) } }, 'name logo location').lean()
          : Promise.resolve([] as any[]),
      ]);
      const productMap = new Map(products.map((p: any) => [String(p._id), p]));
      const storeMap = new Map(stores.map((s: any) => [String(s._id), s]));
      for (const order of orders as any[]) {
        if (order.store) {
          order.store = storeMap.get(String(order.store)) || order.store;
        }
        if (Array.isArray(order.items)) {
          order.items = order.items.map((it: any) => ({
            ...it,
            product: it.product ? productMap.get(String(it.product)) || it.product : null,
            store: it.store ? storeMap.get(String(it.store)) || it.store : null,
          }));
        }
      }
    }

    // Check if there are more results
    const hasMore = orders.length > safeLimit;
    if (hasMore) orders.pop(); // Remove the extra item

    const nextCursor = hasMore && orders.length > 0 ? String(orders[orders.length - 1]._id) : null;
    const totalPages = Math.ceil(total / safeLimit);

    const activeCounts = counts[0]?.active?.[0]?.count || 0;
    const pastCounts = counts[0]?.past?.[0]?.count || 0;

    // Attach ETA and progress to each order (non-blocking, best-effort)
    const enrichedOrders = await Promise.all(
      orders.map(async (order: any) => {
        try {
          const calculatedETA = await etaService.getFormattedETA(order);
          const progress = getOrderProgress(order.status);
          return { ...order, calculatedETA, progress };
        } catch {
          return order;
        }
      })
    );

    sendSuccess(res, {
      orders: enrichedOrders,
      nextCursor,
      hasMore,
      counts: { active: activeCounts, past: pastCounts },
      pagination: {
        page: Number(page),
        limit: safeLimit,
        total,
        totalPages,
        current: Number(page),
        pages: totalPages,
        hasNext: hasMore || Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      }
    }, 'Orders retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch orders', 500);
  }
});

// ─── getOrderCounts ─────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/counts:
 *   get:
 *     summary: Quick order count by status
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order counts grouped by status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
export const getOrderCounts = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const counts = await Order.aggregate([
      { $match: { user: new Types.ObjectId(userId) } },
      {
        $facet: {
          active: [
            { $match: { status: { $in: ACTIVE_STATUSES } } },
            { $count: 'count' },
          ],
          past: [
            { $match: { status: { $in: PAST_STATUSES } } },
            { $count: 'count' },
          ],
        },
      },
    ]).option({ allowDiskUse: true });

    sendSuccess(res, {
      active: counts[0]?.active?.[0]?.count || 0,
      past: counts[0]?.past?.[0]?.count || 0,
    }, 'Order counts retrieved');
  } catch (error) {
    throw new AppError('Failed to fetch order counts', 500);
  }
});

// ─── getOrderById ───────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Get single order with populated items, store, progress, and ETA
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    const orders = await Order.aggregate([
      { $match: { _id: new Types.ObjectId(orderId), user: new Types.ObjectId(userId) } },
      // Lookup top-level store
      { $lookup: {
        from: 'stores', localField: 'store', foreignField: '_id', as: '_storeDoc',
        pipeline: [{ $project: { name: 1, logo: 1, location: 1 } }]
      }},
      { $unwind: { path: '$_storeDoc', preserveNullAndEmptyArrays: true } },
      // Lookup user
      { $lookup: {
        from: 'users', localField: 'user', foreignField: '_id', as: '_userDoc',
        pipeline: [{ $project: { 'profile.firstName': 1, 'profile.lastName': 1, 'profile.phoneNumber': 1, 'profile.email': 1 } }]
      }},
      { $unwind: { path: '$_userDoc', preserveNullAndEmptyArrays: true } },
      // Collect all product IDs and store IDs from items for batch lookups
      { $lookup: {
        from: 'products',
        let: { productIds: '$items.product' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$productIds'] } } },
          { $project: { name: 1, images: 1, basePrice: 1, description: 1 } }
        ],
        as: '_products'
      }},
      { $lookup: {
        from: 'stores',
        let: { storeIds: '$items.store' },
        pipeline: [
          { $match: { $expr: { $in: ['$_id', '$$storeIds'] } } },
          { $project: { name: 1, logo: 1, location: 1 } }
        ],
        as: '_itemStores'
      }},
      // Merge looked-up data into items
      { $addFields: {
        items: {
          $map: {
            input: '$items',
            as: 'item',
            in: {
              $mergeObjects: [
                '$$item',
                {
                  product: {
                    $ifNull: [
                      { $arrayElemAt: [{ $filter: { input: '$_products', as: 'p', cond: { $eq: ['$$p._id', '$$item.product'] } } }, 0] },
                      '$$item.product'
                    ]
                  },
                  store: {
                    $ifNull: [
                      { $arrayElemAt: [{ $filter: { input: '$_itemStores', as: 's', cond: { $eq: ['$$s._id', '$$item.store'] } } }, 0] },
                      '$$item.store'
                    ]
                  }
                }
              ]
            }
          }
        },
        store: { $ifNull: ['$_storeDoc', '$store'] },
        user: { $ifNull: ['$_userDoc', '$user'] }
      }},
      // Remove temporary lookup arrays
      { $project: { _storeDoc: 0, _userDoc: 0, _products: 0, _itemStores: 0 } }
    ]).option({ allowDiskUse: true });

    const order = orders[0] || null;

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Enrich with ETA and progress
    let enrichedOrder: any = order;
    try {
      const calculatedETA = await etaService.getFormattedETA(order);
      const progress = getOrderProgress(order.status);
      enrichedOrder = { ...order, calculatedETA, progress };
    } catch {
      // Non-critical, use order as-is
    }

    sendSuccess(res, enrichedOrder, 'Order retrieved successfully');

  } catch (error: any) {
    logger.error('[GET ORDER BY ID] Error:', error.message);
    throw new AppError('Failed to fetch order', 500);
  }
});

// ─── getOrderStats ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     summary: Get user order statistics (totalOrders, totalSpent, completedOrders, etc.)
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User order statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 */
export const getOrderStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId!;

  try {
    const stats = await Order.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$pricing.total' },
          averageOrderValue: { $avg: '$pricing.total' },
          pendingOrders: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'confirmed', 'preparing', 'shipped']] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]).option({ allowDiskUse: true });

    const userStats = stats[0] || {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0
    };

    // Get recent orders
    const recentOrders = await Order.find({ user: userId })
      .populate('items.product', 'name images')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    sendSuccess(res, {
      stats: userStats,
      recentOrders
    }, 'Order statistics retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch order statistics', 500);
  }
});

// ─── getOrderFinancialDetails ───────────────────────────────────────────────

/**
 * @swagger
 * /api/orders/{orderId}/financial:
 *   get:
 *     summary: Financial audit trail with ledger entries, coin transactions, and refunds
 *     tags: [User Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order financial details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Order not found
 */
export const getOrderFinancialDetails = asyncHandler(async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const userId = req.userId!;

  try {
    const order = await Order.findOne({ _id: orderId, user: userId })
      .select('orderNumber status totals payment timeline cancellation createdAt')
      .lean();

    if (!order) {
      return sendNotFound(res, 'Order not found');
    }

    // Get coin transactions related to this order
    const coinTransactions = await CoinTransaction.find({
      $or: [
        { 'metadata.orderId': orderId },
        { 'metadata.orderId': String(order._id) },
      ],
    }).select('amount source type description createdAt metadata').lean();

    // Get ledger entries for this order
    const ledgerEntries = await LedgerEntry.find({
      referenceId: String(order._id),
      referenceModel: 'Order',
    }).select('pairId accountType direction amount coinType operationType createdAt').lean();

    // Get refunds for this order
    const refunds = await Refund.find({
      order: order._id,
      user: userId,
    }).select('amount status reason processedAt createdAt refundedItems').lean();

    sendSuccess(res, {
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        totals: order.totals,
        payment: order.payment,
        cancellation: order.cancellation,
        createdAt: order.createdAt,
      },
      coinTransactions,
      ledgerEntries,
      refunds,
    }, 'Order financial details retrieved');

  } catch (error: any) {
    logger.error('[ORDER FINANCIAL] Error:', error);
    throw new AppError('Failed to fetch order financial details', 500);
  }
});
