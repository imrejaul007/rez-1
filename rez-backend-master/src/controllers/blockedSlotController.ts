import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { BlockedSlot } from '../models/BlockedSlot';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * POST /api/blocked-slots
 * Create a blocked time slot (merchant only)
 */
export const createBlockedSlot = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { storeId, date, startTime, endTime, reason, isAllDay, staffId, recurring } = req.body;

  if (!storeId || !date) {
    sendError(res, 'storeId and date are required', 400);
    return;
  }

  if (!isAllDay && (!startTime || !endTime)) {
    sendError(res, 'startTime and endTime are required when isAllDay is false', 400);
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

  const slot = await BlockedSlot.create({
    merchantId: new Types.ObjectId(userId),
    storeId: new Types.ObjectId(storeId),
    date: new Date(date),
    startTime: isAllDay ? '00:00' : startTime,
    endTime: isAllDay ? '23:59' : endTime,
    reason,
    isAllDay: !!isAllDay,
    ...(staffId && Types.ObjectId.isValid(staffId) && { serviceId: new Types.ObjectId(staffId) }),
    ...(recurring && { recurring }),
  });

  sendCreated(res, slot, 'Blocked slot created');
});

/**
 * GET /api/blocked-slots/store/:storeId
 * List blocked slots for a store within a date range (merchant only)
 */
export const getBlockedSlots = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  const { storeId } = req.params;
  const { startDate, endDate } = req.query as Record<string, string | undefined>;

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

  const query: any = { storeId: new Types.ObjectId(storeId) };

  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setUTCHours(0, 0, 0, 0);
      query.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
  }

  const slots = await BlockedSlot.find(query).sort({ date: 1, startTime: 1 }).lean();

  sendSuccess(res, { slots, total: slots.length }, 'Blocked slots retrieved');
});

/**
 * DELETE /api/blocked-slots/:id
 * Delete a blocked slot (merchant only)
 */
export const deleteBlockedSlot = asyncHandler(async (req: Request, res: Response) => {
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

  const slot = await BlockedSlot.findById(id).lean();
  if (!slot) {
    sendNotFound(res, 'Blocked slot not found');
    return;
  }

  if ((slot as any).merchantId?.toString() !== userId) {
    sendError(res, 'Unauthorized: you do not own this blocked slot', 403);
    return;
  }

  await BlockedSlot.findByIdAndDelete(id);

  sendSuccess(res, null, 'Blocked slot deleted');
});
