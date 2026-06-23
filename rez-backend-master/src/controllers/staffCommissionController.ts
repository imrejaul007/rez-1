import { Request, Response } from 'express';
import { Types } from 'mongoose';
import StaffCommission from '../models/StaffCommission';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/** GET /api/staff-commissions?storeId= */
export const getCommissions = asyncHandler(async (req: Request, res: Response) => {
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

  const commissions = await StaffCommission.find({ storeId: new Types.ObjectId(storeId) }).sort({ staffName: 1 });
  sendSuccess(res, commissions, 'Staff commissions retrieved');
});

/** POST /api/staff-commissions — upsert by { storeId, staffId } */
export const upsertCommission = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { storeId, staffId, staffName, commissionType, commissionValue, serviceCategories } = req.body;
  if (!storeId || !staffId || !staffName) {
    sendError(res, 'storeId, staffId and staffName are required', 400);
    return;
  }

  const store = await Store.findOne({ _id: storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Store not found or access denied', 403);
    return;
  }

  const record = await StaffCommission.findOneAndUpdate(
    { storeId: new Types.ObjectId(storeId), staffId: new Types.ObjectId(staffId) },
    {
      $set: {
        staffName,
        commissionType: commissionType || 'percentage',
        commissionValue: commissionValue ?? 0,
        serviceCategories: serviceCategories || [],
        active: true,
      },
    },
    { upsert: true, new: true },
  );
  sendCreated(res, record, 'Commission saved');
});

/** DELETE /api/staff-commissions/:id */
export const deleteCommission = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const commission = await StaffCommission.findById(req.params.id);
  if (!commission) {
    sendNotFound(res, 'Commission not found');
    return;
  }

  const store = await Store.findOne({ _id: commission.storeId, merchantId: userId });
  if (!store) {
    sendError(res, 'Access denied', 403);
    return;
  }

  await StaffCommission.deleteOne({ _id: commission._id });
  sendSuccess(res, null, 'Commission deleted');
});
