import { logger } from '../config/logger';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Waitlist } from '../models/Waitlist';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const WAITLIST_TTL_DAYS = 7;

/**
 * POST /api/waitlist
 * Add authenticated user to a store's waitlist
 */
export const addToWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const {
    storeId,
    customerName,
    customerPhone,
    customerEmail,
    serviceType,
    preferredDate,
    preferredTimeRange,
    duration,
    staffId,
  } = req.body;

  if (!storeId || !customerName || !customerPhone || !serviceType || !preferredDate) {
    sendError(res, 'storeId, customerName, customerPhone, serviceType, and preferredDate are required', 400);
    return;
  }

  if (!Types.ObjectId.isValid(storeId)) {
    sendError(res, 'Invalid storeId', 400);
    return;
  }

  const store = await Store.findById(storeId).select('_id').lean();
  if (!store) {
    sendNotFound(res, 'Store not found');
    return;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + WAITLIST_TTL_DAYS);

  const entry = await Waitlist.create({
    store: new Types.ObjectId(storeId),
    user: new Types.ObjectId(userId),
    customerName,
    customerPhone,
    customerEmail,
    serviceType,
    preferredDate: new Date(preferredDate),
    ...(preferredTimeRange && { preferredTimeRange }),
    ...(duration && { duration }),
    ...(staffId && Types.ObjectId.isValid(staffId) && { staffId: new Types.ObjectId(staffId) }),
    status: 'waiting',
    expiresAt,
  });

  logger.info(`[WAITLIST] User ${userId} added to waitlist for store ${storeId}`);
  sendCreated(res, entry, 'Added to waitlist');
});

/**
 * GET /api/waitlist/store/:storeId
 * Get store's waitlist (merchant only, paginated)
 */
export const getStoreWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { storeId } = req.params;
  const { status, page: pageStr, limit: limitStr } = req.query as Record<string, string | undefined>;

  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  if (!Types.ObjectId.isValid(storeId)) {
    sendError(res, 'Invalid storeId', 400);
    return;
  }

  const store = await Store.findById(storeId).select('merchantId').lean();
  if (!store) {
    sendNotFound(res, 'Store not found');
    return;
  }

  if ((store as any).merchantId?.toString() !== userId) {
    sendError(res, 'Unauthorized: you do not own this store', 403);
    return;
  }

  const query: any = { store: new Types.ObjectId(storeId) };
  if (status) query.status = status;

  const page = Math.max(1, parseInt(pageStr || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(limitStr || '20', 10)));
  const skip = (page - 1) * limit;

  const [entries, totalCount] = await Promise.all([
    Waitlist.find(query).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    Waitlist.countDocuments(query),
  ]);

  sendSuccess(
    res,
    { entries, page, limit, totalCount, totalPages: Math.ceil(totalCount / limit) },
    'Waitlist retrieved',
  );
});

/**
 * GET /api/waitlist/user
 * Get the current user's own waitlist entries
 */
export const getUserWaitlist = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const entries = await Waitlist.find({ user: new Types.ObjectId(userId) })
    .populate('store', 'name logo location.city location.area')
    .sort({ createdAt: -1 })
    .lean();

  sendSuccess(res, { entries, total: entries.length }, 'Your waitlist entries');
});

/**
 * DELETE /api/waitlist/:id
 * Customer cancels their own waitlist entry
 */
export const cancelWaitlistEntry = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  if (!Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid id', 400);
    return;
  }

  const entry = await Waitlist.findById(id);
  if (!entry) {
    sendNotFound(res, 'Waitlist entry not found');
    return;
  }

  if (entry.user.toString() !== userId) {
    sendError(res, 'Unauthorized to cancel this entry', 403);
    return;
  }

  if (['cancelled', 'booked', 'expired'].includes(entry.status)) {
    sendError(res, `Entry is already ${entry.status}`, 400);
    return;
  }

  entry.status = 'cancelled';
  await entry.save();

  sendSuccess(res, entry, 'Waitlist entry cancelled');
});

/**
 * PUT /api/waitlist/:id/notify
 * Merchant marks a waitlist entry as notified
 */
export const notifyWaitlistEntry = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { id } = req.params;

  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  if (!Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid id', 400);
    return;
  }

  const entry = await Waitlist.findById(id);
  if (!entry) {
    sendNotFound(res, 'Waitlist entry not found');
    return;
  }

  // Verify merchant owns the store
  const store = await Store.findById(entry.store).select('merchantId').lean();
  if (!store || (store as any).merchantId?.toString() !== userId) {
    sendError(res, 'Unauthorized: you do not own this store', 403);
    return;
  }

  if (entry.status !== 'waiting') {
    sendError(res, `Cannot notify entry with status: ${entry.status}`, 400);
    return;
  }

  entry.status = 'notified';
  entry.notifiedAt = new Date();
  await entry.save();

  // Non-blocking push notification
  import('../services/pushNotificationService')
    .then(({ default: push }) => {
      push
        .sendPushToUser(entry.user.toString(), {
          title: 'Slot Available',
          body: `A slot for ${entry.serviceType} is now available at your requested store. Book now!`,
          data: { screen: 'service-appointments', storeId: entry.store.toString() },
        })
        .catch(() => {});
    })
    .catch(() => {});

  logger.info(`[WAITLIST] Entry ${id} marked as notified by merchant ${userId}`);
  sendSuccess(res, entry, 'Customer notified');
});
