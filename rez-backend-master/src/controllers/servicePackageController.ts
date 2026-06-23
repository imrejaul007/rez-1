import { Request, Response } from 'express';
import { Types } from 'mongoose';
import ServicePackage from '../models/ServicePackage';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/** GET /api/service-packages?storeId= */
export const getPackages = asyncHandler(async (req: Request, res: Response) => {
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

  const packages = await ServicePackage.find({ storeId: new Types.ObjectId(storeId) }).sort({ name: 1 });
  sendSuccess(res, packages, 'Service packages retrieved');
});

/** POST /api/service-packages */
export const createPackage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { storeId, name, description, services, price, validityDays } = req.body;
  if (!storeId || !name) {
    sendError(res, 'storeId and name are required', 400);
    return;
  }

  const store = await Store.findOne({ _id: storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Store not found or access denied', 403);
    return;
  }

  const pkg = await ServicePackage.create({
    storeId: new Types.ObjectId(storeId),
    name: name.trim(),
    description: description?.trim(),
    services: services || [],
    price: price ?? 0,
    validityDays: validityDays ?? 365,
  });
  sendCreated(res, pkg, 'Service package created');
});

/** PUT /api/service-packages/:id */
export const updatePackage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const pkg = await ServicePackage.findById(req.params.id);
  if (!pkg) {
    sendNotFound(res, 'Service package not found');
    return;
  }

  const store = await Store.findOne({ _id: pkg.storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Access denied', 403);
    return;
  }

  const { name, description, services, price, validityDays, active } = req.body;
  if (name !== undefined) pkg.name = name.trim();
  if (description !== undefined) pkg.description = description?.trim();
  if (services !== undefined) pkg.services = services;
  if (price !== undefined) pkg.price = price;
  if (validityDays !== undefined) pkg.validityDays = validityDays;
  if (active !== undefined) pkg.active = active;
  await pkg.save();
  sendSuccess(res, pkg, 'Service package updated');
});

/** DELETE /api/service-packages/:id */
export const deletePackage = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const pkg = await ServicePackage.findById(req.params.id);
  if (!pkg) {
    sendNotFound(res, 'Service package not found');
    return;
  }

  const store = await Store.findOne({ _id: pkg.storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Access denied', 403);
    return;
  }

  await ServicePackage.deleteOne({ _id: pkg._id });
  sendSuccess(res, null, 'Service package deleted');
});
