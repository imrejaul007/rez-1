import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { CancellationPolicy } from '../models/CancellationPolicy';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Resolve and verify store ownership, returning the storeId string.
 * Returns null and sends an error response if verification fails.
 */
async function resolveStore(res: Response, userId: string, storeIdParam: string | undefined): Promise<string | null> {
  if (storeIdParam) {
    if (!Types.ObjectId.isValid(storeIdParam)) {
      sendError(res, 'Invalid storeId', 400);
      return null;
    }
    const store = await Store.findById(storeIdParam).select('merchantId').lean();
    if (!store) {
      sendNotFound(res, 'Store not found');
      return null;
    }
    if ((store as any).merchantId?.toString() !== userId) {
      sendError(res, 'Unauthorized: you do not own this store', 403);
      return null;
    }
    return storeIdParam;
  }

  const store = await Store.findOne({ merchantId: new Types.ObjectId(userId) })
    .select('_id')
    .lean();
  if (!store) {
    sendNotFound(res, 'Store not found');
    return null;
  }
  return (store as any)._id.toString();
}

/**
 * GET /api/cancellation-policy
 * Retrieve the cancellation policy for the authenticated merchant's store.
 * Query param: storeId (optional)
 */
export const getPolicy = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const storeId = await resolveStore(res, userId, req.query.storeId as string | undefined);
  if (!storeId) return;

  const policy = await CancellationPolicy.findOne({
    storeId: new Types.ObjectId(storeId),
  }).lean();

  if (!policy) {
    sendSuccess(
      res,
      {
        storeId,
        enabled: false,
        freeCancelHours: 24,
        lateFeeType: 'none',
        lateFeeValue: 0,
        noShowFeeType: 'none',
        noShowFeeValue: 0,
      },
      'Cancellation policy retrieved (default)',
    );
    return;
  }

  sendSuccess(res, policy, 'Cancellation policy retrieved');
});

/**
 * POST /api/cancellation-policy
 * Create or update the cancellation policy for the authenticated merchant's store.
 */
export const upsertPolicy = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const {
    storeId: rawStoreId,
    enabled,
    freeCancelHours,
    lateFeeType,
    lateFeeValue,
    noShowFeeType,
    noShowFeeValue,
  } = req.body;

  if (!rawStoreId) {
    sendError(res, 'storeId is required', 400);
    return;
  }

  const storeId = await resolveStore(res, userId, rawStoreId as string);
  if (!storeId) return;

  const updateData: Record<string, unknown> = {};
  if (enabled !== undefined) updateData.enabled = !!enabled;
  if (freeCancelHours !== undefined) updateData.freeCancelHours = Number(freeCancelHours);
  if (lateFeeType !== undefined) updateData.lateFeeType = lateFeeType;
  if (lateFeeValue !== undefined) updateData.lateFeeValue = Number(lateFeeValue);
  if (noShowFeeType !== undefined) updateData.noShowFeeType = noShowFeeType;
  if (noShowFeeValue !== undefined) updateData.noShowFeeValue = Number(noShowFeeValue);

  const policy = await CancellationPolicy.findOneAndUpdate(
    { storeId: new Types.ObjectId(storeId) },
    { $set: updateData },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  sendSuccess(res, policy, 'Cancellation policy saved');
});
