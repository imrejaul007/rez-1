import { Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound, sendBadRequest } from '../utils/response';
import TableSession from '../models/TableSession';
import { Store } from '../models/Store';
import { logger } from '../config/logger';

/**
 * POST /api/table-sessions/open
 * Opens a new table session or joins an existing one.
 */
export const openOrJoinTableSession = asyncHandler(async (req: Request, res: Response) => {
  const { storeId, tableNumber, guestCount = 1 } = req.body;
  const userId = (req as any).user?._id?.toString() || (req as any).userId;

  if (!storeId || !tableNumber) {
    return sendBadRequest(res, 'storeId and tableNumber are required');
  }

  // Check for existing open session on this table
  const existing = await TableSession.findOne({
    storeId,
    tableNumber,
    status: 'open',
  });

  if (existing) {
    return sendSuccess(res, {
      sessionId: existing._id,
      sessionToken: existing.sessionToken,
      tableNumber: existing.tableNumber,
      status: existing.status,
      ordersCount: existing.orders.length,
      currentTotal: existing.total,
      isNew: false,
    }, 'Joined existing table session');
  }

  const store = await Store.findById(storeId).select('merchant name').lean();
  if (!store) return sendNotFound(res, 'Store not found');

  const tokenSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const sessionToken = `${tableNumber.replace(/\s+/g, '')}-${tokenSuffix}`;

  const session = await TableSession.create({
    storeId,
    merchantId: (store as any).merchant,
    tableNumber,
    guestCount,
    userId,
    sessionToken,
    status: 'open',
  });

  return sendSuccess(res, {
    sessionId: session._id,
    sessionToken: session.sessionToken,
    tableNumber: session.tableNumber,
    status: session.status,
    ordersCount: 0,
    currentTotal: 0,
    isNew: true,
  }, 'Table session opened');
});

/**
 * GET /api/table-sessions/:sessionToken
 * Get session details with all orders and running total.
 */
export const getTableSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionToken } = req.params;

  const session = await TableSession.findOne({ sessionToken })
    .populate({
      path: 'orders',
      select: 'status items subtotal total createdAt specialInstructions orderNumber',
    })
    .lean();

  if (!session) return sendNotFound(res, 'Session not found or expired');

  return sendSuccess(res, session);
});

/**
 * POST /api/table-sessions/:sessionToken/add-order
 * Links a placed order to the table session.
 */
export const addOrderToSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionToken } = req.params;
  const { orderId } = req.body;

  if (!orderId) return sendBadRequest(res, 'orderId is required');

  const session = await TableSession.findOne({ sessionToken, status: 'open' });
  if (!session) return sendNotFound(res, 'Session not found or already closed');

  const { Order } = await import('../models/Order');
  const order = await Order.findById(orderId).select('subtotal total').lean();
  if (!order) return sendNotFound(res, 'Order not found');

  session.orders.push(orderId as any);
  session.subtotal += (order as any).subtotal || (order as any).total || 0;
  session.total += (order as any).total || 0;
  await session.save();

  return sendSuccess(res, {
    sessionToken,
    ordersCount: session.orders.length,
    currentTotal: session.total,
  }, 'Order added to table session');
});

/**
 * POST /api/table-sessions/:sessionToken/request-bill
 * Customer requests the bill — session moves to 'bill_requested'.
 */
export const requestBill = asyncHandler(async (req: Request, res: Response) => {
  const { sessionToken } = req.params;

  const session = await TableSession.findOne({ sessionToken, status: 'open' })
    .populate('orders', 'subtotal total status')
    .lean() as any;

  if (!session) return sendNotFound(res, 'Active session not found');

  // Recalculate total from non-cancelled orders
  let recalcTotal = 0;
  for (const order of session.orders || []) {
    if (order.status !== 'cancelled') {
      recalcTotal += order.total || 0;
    }
  }

  await TableSession.findByIdAndUpdate(session._id, {
    $set: { status: 'bill_requested', total: recalcTotal },
  });

  // Notify merchant
  try {
    const merchantNotificationService = (await import('../services/merchantNotificationService')).default;
    await merchantNotificationService.notifyBillRequest({
      merchantId: session.merchantId?.toString(),
      tableNumber: session.tableNumber,
      total: recalcTotal,
      ordersCount: session.orders.length,
    });
  } catch (err) {
    logger.warn('[TABLE SESSION] Bill request notification failed:', err);
  }

  return sendSuccess(res, {
    sessionToken,
    tableNumber: session.tableNumber,
    total: recalcTotal,
    ordersCount: (session.orders || []).length,
    status: 'bill_requested',
  }, 'Bill requested — merchant notified');
});

/**
 * POST /api/table-sessions/:sessionToken/pay
 * Customer pays the full session bill.
 */
export const payTableSession = asyncHandler(async (req: Request, res: Response) => {
  const { sessionToken } = req.params;
  const { paymentMethod, paymentId } = req.body;

  const session = await TableSession.findOne({
    sessionToken,
    status: { $in: ['open', 'bill_requested'] },
  });

  if (!session) return sendNotFound(res, 'Session not found or already paid');

  session.status = 'paid';
  session.paymentId = paymentId;
  session.paymentMethod = paymentMethod || 'cash';
  session.paidAt = new Date();
  session.closedAt = new Date();
  await session.save();

  // Mark all session orders as delivered
  const { Order } = await import('../models/Order');
  await Order.updateMany(
    { _id: { $in: session.orders } },
    { $set: { status: 'delivered' } }
  );

  return sendSuccess(res, {
    sessionToken,
    tableNumber: session.tableNumber,
    total: session.total,
    status: 'paid',
    paidAt: session.paidAt,
  }, 'Payment successful — thank you!');
});
