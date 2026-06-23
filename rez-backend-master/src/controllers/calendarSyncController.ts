import { Request, Response } from 'express';
import { Types } from 'mongoose';
import CalendarSync from '../models/CalendarSync';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * GET /api/calendar-sync/status
 * Returns all calendar sync records for the authenticated user's stores.
 */
export const getSyncStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  // Find all stores owned by this user
  const stores = (await Store.find({ merchantId: userId }).select('_id').lean()) as any[];
  const storeIds = stores.map((s: any) => s._id);

  const records = await CalendarSync.find({
    userId: new Types.ObjectId(userId),
    storeId: { $in: storeIds },
  })
    .select('-accessToken -refreshToken')
    .lean();

  sendSuccess(res, records, 'Calendar sync status retrieved');
});

/**
 * POST /api/calendar-sync/connect
 * Upserts a CalendarSync record with token data from the request body.
 * Body: { storeId, provider, accessToken, refreshToken?, tokenExpiry?, calendarId? }
 */
export const saveCalendarToken = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { storeId, provider, accessToken, refreshToken, tokenExpiry, calendarId } = req.body;

  if (!storeId || !provider || !accessToken) {
    sendError(res, 'storeId, provider, and accessToken are required', 400);
    return;
  }

  if (!['google', 'apple'].includes(provider)) {
    sendError(res, 'provider must be "google" or "apple"', 400);
    return;
  }

  if (!Types.ObjectId.isValid(storeId)) {
    sendError(res, 'Invalid storeId', 400);
    return;
  }

  // Verify the user owns this store
  const store = await Store.findOne({
    _id: new Types.ObjectId(storeId),
    merchantId: new Types.ObjectId(userId),
  })
    .select('_id')
    .lean();

  if (!store) {
    sendNotFound(res, 'Store not found or access denied');
    return;
  }

  const updatePayload: Record<string, unknown> = {
    accessToken,
    syncEnabled: true,
  };

  if (refreshToken !== undefined) updatePayload.refreshToken = refreshToken;
  if (tokenExpiry !== undefined) updatePayload.tokenExpiry = new Date(tokenExpiry);
  if (calendarId !== undefined) updatePayload.calendarId = calendarId;

  const record = await CalendarSync.findOneAndUpdate(
    {
      storeId: new Types.ObjectId(storeId),
      userId: new Types.ObjectId(userId),
      provider,
    },
    { $set: updatePayload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
    .select('-accessToken -refreshToken')
    .lean();

  sendSuccess(res, record, 'Calendar connected successfully');
});

/**
 * DELETE /api/calendar-sync/:provider
 * Removes the CalendarSync record for the given provider.
 */
export const disconnectCalendar = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { provider } = req.params;

  if (!['google', 'apple'].includes(provider)) {
    sendError(res, 'provider must be "google" or "apple"', 400);
    return;
  }

  // Find stores owned by this user so we can scope the delete
  const stores = await Store.find({ merchantId: new Types.ObjectId(userId) })
    .select('_id')
    .lean();
  const storeIds = stores.map((s: any) => s._id);

  const result = await CalendarSync.deleteOne({
    userId: new Types.ObjectId(userId),
    storeId: { $in: storeIds },
    provider,
  });

  if (result.deletedCount === 0) {
    sendNotFound(res, 'Calendar connection not found');
    return;
  }

  sendSuccess(res, null, 'Calendar disconnected successfully');
});

/**
 * PATCH /api/calendar-sync/:provider/toggle
 * Toggles the syncEnabled flag for the given provider.
 */
export const toggleSync = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { provider } = req.params;

  if (!['google', 'apple'].includes(provider)) {
    sendError(res, 'provider must be "google" or "apple"', 400);
    return;
  }

  const stores = await Store.find({ merchantId: new Types.ObjectId(userId) })
    .select('_id')
    .lean();
  const storeIds = stores.map((s: any) => s._id);

  const existing = await CalendarSync.findOne({
    userId: new Types.ObjectId(userId),
    storeId: { $in: storeIds },
    provider,
  });

  if (!existing) {
    sendNotFound(res, 'Calendar connection not found');
    return;
  }

  existing.syncEnabled = !existing.syncEnabled;
  await existing.save();

  const response = existing.toObject();
  // Strip token fields before returning
  delete (response as any).accessToken;
  delete (response as any).refreshToken;

  sendSuccess(res, response, `Sync ${existing.syncEnabled ? 'enabled' : 'disabled'}`);
});

/**
 * POST /api/calendar-sync/sync
 * Updates lastSyncAt to now. Actual Google/Apple API integration is out of scope.
 */
export const triggerSync = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const stores = await Store.find({ merchantId: new Types.ObjectId(userId) })
    .select('_id')
    .lean();
  const storeIds = stores.map((s: any) => s._id);

  const now = new Date();

  const result = await CalendarSync.updateMany(
    {
      userId: new Types.ObjectId(userId),
      storeId: { $in: storeIds },
      syncEnabled: true,
    },
    { $set: { lastSyncAt: now } },
  );

  sendSuccess(res, { syncedCount: result.modifiedCount, lastSyncAt: now }, 'Sync triggered successfully');
});
