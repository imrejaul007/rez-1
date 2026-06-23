import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { StoreDepositPolicy } from '../models/StoreDepositPolicy';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * GET /api/deposit-policy
 * Get the deposit policy for the authenticated merchant's store.
 * Query param: storeId (optional — defaults to the merchant's first store)
 */
export const getDepositPolicy = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const storeId = (req.query.storeId as string) || '';

  if (storeId && !Types.ObjectId.isValid(storeId)) {
    sendError(res, 'Invalid storeId', 400);
    return;
  }

  // Resolve storeId if not provided
  let resolvedStoreId: string = storeId;
  if (!resolvedStoreId) {
    const store = await Store.findOne({ merchantId: new Types.ObjectId(userId) })
      .select('_id')
      .lean();
    if (!store) {
      sendNotFound(res, 'Store not found');
      return;
    }
    resolvedStoreId = (store as any)._id.toString();
  } else {
    // Verify ownership
    const store = await Store.findById(resolvedStoreId).select('merchantId').lean();
    if (!store) {
      sendNotFound(res, 'Store not found');
      return;
    }
    if ((store as any).merchantId?.toString() !== userId) {
      sendError(res, 'Unauthorized: you do not own this store', 403);
      return;
    }
  }

  const policy = await StoreDepositPolicy.findOne({
    storeId: new Types.ObjectId(resolvedStoreId),
  }).lean();

  if (!policy) {
    // Return default (disabled) policy so the UI has a clean initial state
    sendSuccess(
      res,
      {
        storeId: resolvedStoreId,
        enabled: false,
        depositType: 'percentage',
        depositValue: 20,
        requireForNewClients: true,
        requireForAll: false,
        cancellationPolicy: {
          hoursNotice: 24,
          lateFee: 0,
          lateFeeType: 'fixed',
          message: 'Cancellations within 24 hours may incur a fee.',
        },
      },
      'Deposit policy retrieved',
    );
    return;
  }

  sendSuccess(res, policy, 'Deposit policy retrieved');
});

/**
 * PUT /api/deposit-policy
 * Create or update the deposit policy for the authenticated merchant's store.
 */
export const upsertDepositPolicy = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  const { storeId, enabled, depositType, depositValue, requireForNewClients, requireForAll, cancellationPolicy } =
    req.body;

  if (!storeId) {
    sendError(res, 'storeId is required', 400);
    return;
  }

  if (!Types.ObjectId.isValid(storeId)) {
    sendError(res, 'Invalid storeId', 400);
    return;
  }

  // Validate deposit type
  if (depositType && !['fixed', 'percentage'].includes(depositType)) {
    sendError(res, 'depositType must be "fixed" or "percentage"', 400);
    return;
  }

  // Validate deposit value
  if (depositValue !== undefined && (typeof depositValue !== 'number' || depositValue < 0)) {
    sendError(res, 'depositValue must be a non-negative number', 400);
    return;
  }

  if (depositType === 'percentage' && depositValue > 100) {
    sendError(res, 'Percentage deposit cannot exceed 100', 400);
    return;
  }

  // Verify store ownership
  const store = await Store.findById(storeId).select('merchantId').lean();
  if (!store) {
    sendNotFound(res, 'Store not found');
    return;
  }

  if ((store as any).merchantId?.toString() !== userId) {
    sendError(res, 'Unauthorized: you do not own this store', 403);
    return;
  }

  const updateData: Record<string, any> = {};
  if (enabled !== undefined) updateData.enabled = !!enabled;
  if (depositType !== undefined) updateData.depositType = depositType;
  if (depositValue !== undefined) updateData.depositValue = depositValue;
  if (requireForNewClients !== undefined) updateData.requireForNewClients = !!requireForNewClients;
  if (requireForAll !== undefined) updateData.requireForAll = !!requireForAll;

  if (cancellationPolicy) {
    const cp = cancellationPolicy as Record<string, any>;
    if (cp.hoursNotice !== undefined) updateData['cancellationPolicy.hoursNotice'] = cp.hoursNotice;
    if (cp.lateFee !== undefined) updateData['cancellationPolicy.lateFee'] = cp.lateFee;
    if (cp.lateFeeType !== undefined) updateData['cancellationPolicy.lateFeeType'] = cp.lateFeeType;
    if (cp.message !== undefined) updateData['cancellationPolicy.message'] = cp.message;
  }

  const policy = await StoreDepositPolicy.findOneAndUpdate(
    { storeId: new Types.ObjectId(storeId) },
    { $set: updateData },
    { new: true, upsert: true, runValidators: true },
  ).lean();

  sendSuccess(res, policy, 'Deposit policy saved');
});
