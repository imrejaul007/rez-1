import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { ClassSchedule } from '../models/ClassSchedule';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/** GET /api/class-schedules?storeId=&from=&to= */
export const getClasses = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const storeId = req.query.storeId as string;
  if (!storeId) {
    sendError(res, 'storeId is required', 400);
    return;
  }

  const store = await Store.findOne({ _id: storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Store not found or access denied', 403);
    return;
  }

  const filter: Record<string, unknown> = { storeId: new Types.ObjectId(storeId) };

  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  if (from || to) {
    filter.startTime = {};
    if (from) (filter.startTime as Record<string, unknown>)['$gte'] = new Date(from);
    if (to) (filter.startTime as Record<string, unknown>)['$lte'] = new Date(to);
  }

  const classes = await ClassSchedule.find(filter).sort({ startTime: 1 });
  sendSuccess(res, classes, 'Class schedules retrieved');
});

/** POST /api/class-schedules */
export const createClass = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const {
    storeId,
    name,
    description,
    instructorId,
    instructorName,
    duration,
    capacity,
    price,
    startTime,
    endTime,
    recurring,
    recurringDays,
    color,
  } = req.body;

  if (!storeId || !name || !duration || !capacity || price === undefined || !startTime || !endTime) {
    sendError(res, 'storeId, name, duration, capacity, price, startTime, and endTime are required', 400);
    return;
  }

  const store = await Store.findOne({ _id: storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Store not found or access denied', 403);
    return;
  }

  const classSchedule = await ClassSchedule.create({
    storeId: new Types.ObjectId(storeId),
    name: name.trim(),
    description: description?.trim(),
    instructorId: instructorId ? new Types.ObjectId(instructorId) : undefined,
    instructorName: instructorName?.trim(),
    duration: Number(duration),
    capacity: Number(capacity),
    price: Number(price),
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    recurring: Boolean(recurring),
    recurringDays: recurringDays ?? undefined,
    color: color || '#6366F1',
  });

  sendCreated(res, classSchedule, 'Class schedule created');
});

/** PUT /api/class-schedules/:id */
export const updateClass = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const classSchedule = await ClassSchedule.findById(req.params.id);
  if (!classSchedule) {
    sendNotFound(res, 'Class schedule not found');
    return;
  }

  const store = await Store.findOne({ _id: classSchedule.storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Access denied', 403);
    return;
  }

  const {
    name,
    description,
    instructorId,
    instructorName,
    duration,
    capacity,
    price,
    startTime,
    endTime,
    recurring,
    recurringDays,
    color,
    active,
  } = req.body;

  if (name !== undefined) classSchedule.name = name.trim();
  if (description !== undefined) classSchedule.description = description?.trim();
  if (instructorId !== undefined)
    classSchedule.instructorId = instructorId ? new Types.ObjectId(instructorId) : undefined;
  if (instructorName !== undefined) classSchedule.instructorName = instructorName?.trim();
  if (duration !== undefined) classSchedule.duration = Number(duration);
  if (capacity !== undefined) classSchedule.capacity = Number(capacity);
  if (price !== undefined) classSchedule.price = Number(price);
  if (startTime !== undefined) classSchedule.startTime = new Date(startTime);
  if (endTime !== undefined) classSchedule.endTime = new Date(endTime);
  if (recurring !== undefined) classSchedule.recurring = Boolean(recurring);
  if (recurringDays !== undefined) classSchedule.recurringDays = recurringDays;
  if (color !== undefined) classSchedule.color = color;
  if (active !== undefined) classSchedule.active = Boolean(active);

  await classSchedule.save();
  sendSuccess(res, classSchedule, 'Class schedule updated');
});

/** DELETE /api/class-schedules/:id */
export const deleteClass = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const classSchedule = await ClassSchedule.findById(req.params.id);
  if (!classSchedule) {
    sendNotFound(res, 'Class schedule not found');
    return;
  }

  const store = await Store.findOne({ _id: classSchedule.storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Access denied', 403);
    return;
  }

  await ClassSchedule.deleteOne({ _id: classSchedule._id });
  sendSuccess(res, null, 'Class schedule deleted');
});

/** POST /api/class-schedules/:id/book */
export const bookClass = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const classSchedule = await ClassSchedule.findById(req.params.id);
  if (!classSchedule) {
    sendNotFound(res, 'Class schedule not found');
    return;
  }

  if (!classSchedule.active) {
    sendError(res, 'This class is not available for booking', 400);
    return;
  }

  if (classSchedule.bookedCount >= classSchedule.capacity) {
    sendError(res, 'Class is at full capacity', 409);
    return;
  }

  classSchedule.bookedCount += 1;
  await classSchedule.save();

  sendSuccess(
    res,
    {
      _id: classSchedule._id,
      name: classSchedule.name,
      bookedCount: classSchedule.bookedCount,
      capacity: classSchedule.capacity,
      availableSpots: classSchedule.capacity - classSchedule.bookedCount,
    },
    'Class booked successfully',
  );
});
