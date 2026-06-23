import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { TreatmentRoom } from '../models/TreatmentRoom';
import { ServiceAppointment } from '../models/ServiceAppointment';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/** GET /api/treatment-rooms */
export const getRooms = asyncHandler(async (req: Request, res: Response) => {
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

  const rooms = await TreatmentRoom.find({ storeId: new Types.ObjectId(storeId) }).sort({ name: 1 });
  sendSuccess(res, rooms, 'Treatment rooms retrieved');
});

/** POST /api/treatment-rooms */
export const createRoom = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { storeId, name, type, capacity, description, color } = req.body;
  if (!storeId || !name) {
    sendError(res, 'storeId and name are required', 400);
    return;
  }

  const store = await Store.findOne({ _id: storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Store not found or access denied', 403);
    return;
  }

  const room = await TreatmentRoom.create({
    storeId: new Types.ObjectId(storeId),
    name: name.trim(),
    type: type || 'treatment_room',
    capacity: capacity || 1,
    description,
    color: color || '#6366F1',
  });
  sendCreated(res, room, 'Treatment room created');
});

/** PUT /api/treatment-rooms/:id */
export const updateRoom = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const room = await TreatmentRoom.findById(req.params.id);
  if (!room) {
    sendNotFound(res, 'Room not found');
    return;
  }

  const store = await Store.findOne({ _id: room.storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Access denied', 403);
    return;
  }

  const { name, type, capacity, description, color, active } = req.body;
  if (name !== undefined) room.name = name.trim();
  if (type !== undefined) room.type = type;
  if (capacity !== undefined) room.capacity = capacity;
  if (description !== undefined) room.description = description;
  if (color !== undefined) room.color = color;
  if (active !== undefined) room.active = active;
  await room.save();
  sendSuccess(res, room, 'Treatment room updated');
});

/** DELETE /api/treatment-rooms/:id */
export const deleteRoom = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const room = await TreatmentRoom.findById(req.params.id);
  if (!room) {
    sendNotFound(res, 'Room not found');
    return;
  }

  const store = await Store.findOne({ _id: room.storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Access denied', 403);
    return;
  }

  await TreatmentRoom.deleteOne({ _id: room._id });
  sendSuccess(res, null, 'Treatment room deleted');
});

/** GET /api/treatment-rooms/:id/availability?date=YYYY-MM-DD */
export const getRoomAvailability = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const room = await TreatmentRoom.findById(req.params.id);
  if (!room) {
    sendNotFound(res, 'Room not found');
    return;
  }

  const { date } = req.query;
  if (!date) {
    sendError(res, 'date query param required', 400);
    return;
  }

  const dayStart = new Date(date as string);
  const dayEnd = new Date(date as string);
  dayEnd.setHours(23, 59, 59, 999);

  const bookings = await ServiceAppointment.find({
    roomId: room._id,
    appointmentDate: { $gte: dayStart, $lte: dayEnd },
    status: { $nin: ['cancelled'] },
  })
    .select('appointmentTime duration customerName staffName status')
    .sort({ appointmentTime: 1 });

  sendSuccess(res, { room, bookings }, 'Room availability retrieved');
});
