import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { StaffTimeEntry } from '../models/StaffTimeEntry';
import { MerchantStaff } from '../models/MerchantStaff';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Get today's date string in YYYY-MM-DD format (UTC)
 */
function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Verify the authenticated user owns the given store.
 * Returns the store doc or null. Sends an error response if invalid.
 */
async function verifyStoreOwnership(res: Response, userId: string, storeId: string): Promise<boolean> {
  if (!Types.ObjectId.isValid(storeId)) {
    sendError(res, 'Invalid storeId', 400);
    return false;
  }
  const store = await Store.findById(storeId).select('merchantId').lean();
  if (!store) {
    sendNotFound(res, 'Store not found');
    return false;
  }
  if ((store as any).merchantId?.toString() !== userId) {
    sendError(res, 'Unauthorized: you do not own this store', 403);
    return false;
  }
  return true;
}

/**
 * POST /api/staff-time/clock-in
 * Clock a staff member in. Returns 409 if they already have an open entry today.
 */
export const clockIn = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { storeId, staffId, staffName, notes } = req.body;

  if (!storeId || !staffId || !staffName) {
    sendError(res, 'storeId, staffId and staffName are required', 400);
    return;
  }

  if (!Types.ObjectId.isValid(staffId)) {
    sendError(res, 'Invalid staffId', 400);
    return;
  }

  const owned = await verifyStoreOwnership(res, userId, storeId);
  if (!owned) return;

  const today = todayDateString();

  // Check for existing open entry
  const existing = await StaffTimeEntry.findOne({
    staffId: new Types.ObjectId(staffId),
    date: today,
    clockOut: { $exists: false },
  }).lean();

  if (existing) {
    sendError(res, 'Staff member already has an open clock-in entry for today', 409);
    return;
  }

  const now = new Date();
  const entry = await StaffTimeEntry.create({
    storeId: new Types.ObjectId(storeId),
    staffId: new Types.ObjectId(staffId),
    staffName,
    clockIn: now,
    breakMinutes: 0,
    date: today,
    ...(notes ? { notes } : {}),
  });

  sendCreated(res, entry, 'Clocked in successfully');
});

/**
 * POST /api/staff-time/clock-out
 * Clock out a staff member by closing their open entry today.
 */
export const clockOut = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { storeId, staffId, notes } = req.body;

  if (!storeId || !staffId) {
    sendError(res, 'storeId and staffId are required', 400);
    return;
  }

  if (!Types.ObjectId.isValid(staffId)) {
    sendError(res, 'Invalid staffId', 400);
    return;
  }

  const owned = await verifyStoreOwnership(res, userId, storeId);
  if (!owned) return;

  const today = todayDateString();

  const entry = await StaffTimeEntry.findOne({
    staffId: new Types.ObjectId(staffId),
    date: today,
    clockOut: { $exists: false },
  });

  if (!entry) {
    sendNotFound(res, 'No open clock-in entry found for this staff member today');
    return;
  }

  entry.clockOut = new Date();
  if (notes) entry.notes = notes;
  await entry.save(); // pre-save hook computes totalMinutes

  sendSuccess(res, entry, 'Clocked out successfully');
});

/**
 * PATCH /api/staff-time/:id/break
 * Add break minutes to an existing time entry.
 */
export const addBreak = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { id } = req.params;
  const { breakMinutes, storeId } = req.body;

  if (!Types.ObjectId.isValid(id)) {
    sendError(res, 'Invalid entry id', 400);
    return;
  }

  if (typeof breakMinutes !== 'number' || breakMinutes < 0) {
    sendError(res, 'breakMinutes must be a non-negative number', 400);
    return;
  }

  if (storeId) {
    const owned = await verifyStoreOwnership(res, userId, storeId);
    if (!owned) return;
  }

  const entry = await StaffTimeEntry.findById(id);
  if (!entry) {
    sendNotFound(res, 'Time entry not found');
    return;
  }

  // Verify ownership via storeId on the entry
  const storeOwned = await verifyStoreOwnership(res, userId, entry.storeId.toString());
  if (!storeOwned) return;

  entry.breakMinutes = (entry.breakMinutes || 0) + breakMinutes;

  // Recompute totalMinutes if already clocked out
  if (entry.clockOut) {
    const diffMs = entry.clockOut.getTime() - entry.clockIn.getTime();
    entry.totalMinutes = Math.round(diffMs / 60000) - entry.breakMinutes;
  }

  await entry.save();

  sendSuccess(res, entry, 'Break updated successfully');
});

/**
 * GET /api/staff-time/timesheet
 * Get time entries for a store, optionally filtered by date range and staffId.
 * Query params: storeId (required), dateFrom, dateTo, staffId
 */
export const getTimesheet = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { storeId, dateFrom, dateTo, staffId } = req.query as Record<string, string | undefined>;

  if (!storeId) {
    sendError(res, 'storeId is required', 400);
    return;
  }

  const owned = await verifyStoreOwnership(res, userId, storeId);
  if (!owned) return;

  const query: any = { storeId: new Types.ObjectId(storeId) };

  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo) query.date.$lte = dateTo;
  }

  if (staffId && Types.ObjectId.isValid(staffId)) {
    query.staffId = new Types.ObjectId(staffId);
  }

  const entries = await StaffTimeEntry.find(query).sort({ date: -1, clockIn: -1 }).lean();

  // Build per-staff summary
  const summaryMap: Record<string, { staffName: string; totalMinutes: number; entryCount: number }> = {};
  for (const entry of entries) {
    const key = entry.staffId.toString();
    if (!summaryMap[key]) {
      summaryMap[key] = { staffName: entry.staffName, totalMinutes: 0, entryCount: 0 };
    }
    summaryMap[key].totalMinutes += entry.totalMinutes || 0;
    summaryMap[key].entryCount += 1;
  }

  const summary = Object.entries(summaryMap).map(([staffId, data]) => ({
    staffId,
    staffName: data.staffName,
    totalMinutes: data.totalMinutes,
    totalHours: parseFloat((data.totalMinutes / 60).toFixed(2)),
    entryCount: data.entryCount,
  }));

  sendSuccess(res, { entries, summary, total: entries.length }, 'Timesheet retrieved');
});

/**
 * GET /api/staff-time/status
 * Get current clock status for all staff in a store today.
 * Query params: storeId (required)
 */
export const getCurrentStatus = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { storeId } = req.query as Record<string, string | undefined>;

  if (!storeId) {
    sendError(res, 'storeId is required', 400);
    return;
  }

  const owned = await verifyStoreOwnership(res, userId, storeId);
  if (!owned) return;

  const today = todayDateString();

  // Get today's entries for the store
  const todayEntries = await StaffTimeEntry.find({
    storeId: new Types.ObjectId(storeId),
    date: today,
  }).lean();

  // Build a map of staffId -> entry
  const entryByStaff: Record<string, (typeof todayEntries)[0]> = {};
  for (const entry of todayEntries) {
    const key = entry.staffId.toString();
    // Prefer the most recent entry per staff if multiple exist
    if (!entryByStaff[key] || entry.clockIn > entryByStaff[key].clockIn) {
      entryByStaff[key] = entry;
    }
  }

  // Get all active staff for this store's merchant
  const store = await Store.findById(storeId).select('merchantId').lean();
  const merchantId = (store as any)?.merchantId;

  const allStaff = await MerchantStaff.find({
    merchantId,
    isActive: true,
  }).lean();

  const statusList = allStaff.map((staff) => {
    const staffIdStr = staff._id.toString();
    const entry = entryByStaff[staffIdStr];

    let clockStatus: 'clocked_in' | 'clocked_out' | 'not_started';
    let clockInTime: Date | undefined;
    let clockOutTime: Date | undefined;
    let entryId: string | undefined;

    if (!entry) {
      clockStatus = 'not_started';
    } else if (entry.clockOut) {
      clockStatus = 'clocked_out';
      clockInTime = entry.clockIn;
      clockOutTime = entry.clockOut;
      entryId = entry._id.toString();
    } else {
      clockStatus = 'clocked_in';
      clockInTime = entry.clockIn;
      entryId = entry._id.toString();
    }

    return {
      staffId: staffIdStr,
      staffName: staff.name,
      role: staff.role,
      clockStatus,
      clockInTime,
      clockOutTime,
      entryId,
      breakMinutes: entry?.breakMinutes || 0,
    };
  });

  sendSuccess(res, { date: today, staff: statusList }, 'Staff clock status retrieved');
});
