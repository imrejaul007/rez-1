import { logger } from '../config/logger';
import { Request, Response } from 'express';
import { PaymentMethod, IPaymentMethod } from '../models/PaymentMethod';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendNotFound } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

// Get all payment methods for user
export const getUserPaymentMethods = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const paymentMethods = await PaymentMethod.find({
    user: req.user._id,
    isActive: true
  }).sort({ isDefault: -1, createdAt: -1 }).lean();

  // Map _id to id for frontend compatibility
  const mappedPaymentMethods = paymentMethods.map((pm: any) => ({
    ...pm,
    id: pm._id.toString(),
    _id: undefined
  }));

  sendSuccess(res, mappedPaymentMethods, 'Payment methods retrieved successfully');
});

// Get single payment method by ID
export const getPaymentMethodById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  const paymentMethod = await PaymentMethod.findOne({ _id: id, user: req.user._id }).lean();

  if (!paymentMethod) {
    return sendNotFound(res, 'Payment method not found');
  }

  // Map _id to id for frontend compatibility
  const mappedPaymentMethod = {
    ...paymentMethod,
    id: (paymentMethod as any)._id.toString(),
    _id: undefined
  };

  sendSuccess(res, mappedPaymentMethod, 'Payment method retrieved successfully');
});

// Create new payment method
export const createPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const paymentMethodData = {
    ...req.body,
    user: req.user._id
  };

  // Validate based on type
  if (paymentMethodData.type === 'CARD' && !paymentMethodData.card) {
    throw new AppError('Card details are required', 400);
  }

  if (paymentMethodData.type === 'BANK_ACCOUNT' && !paymentMethodData.bankAccount) {
    throw new AppError('Bank account details are required', 400);
  }

  if (paymentMethodData.type === 'UPI' && !paymentMethodData.upi) {
    throw new AppError('UPI details are required', 400);
  }

  const paymentMethod = await PaymentMethod.create(paymentMethodData);

  // Convert to plain object and map _id to id
  const paymentMethodObj: any = paymentMethod.toObject();
  const mappedPaymentMethod = {
    ...paymentMethodObj,
    id: paymentMethodObj._id.toString(),
    _id: undefined
  };

  sendSuccess(res, mappedPaymentMethod, 'Payment method created successfully', 201);
});

// Update payment method
export const updatePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  // Find payment method and ensure it belongs to the user
  const paymentMethod = await PaymentMethod.findOne({ _id: id, user: req.user._id }).lean();

  if (!paymentMethod) {
    return sendNotFound(res, 'Payment method not found');
  }

  // Update only allowed fields (prevent type change)
  const allowedUpdates = ['card', 'bankAccount', 'upi', 'isDefault'];
  const updates: any = {};

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  Object.assign(paymentMethod, updates);
  await paymentMethod.save();

  // Convert to plain object and map _id to id
  const paymentMethodObj: any = paymentMethod.toObject();
  const mappedPaymentMethod = {
    ...paymentMethodObj,
    id: paymentMethodObj._id.toString(),
    _id: undefined
  };

  sendSuccess(res, mappedPaymentMethod, 'Payment method updated successfully');
});

// Delete payment method (soft delete - set isActive to false)
export const deletePaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  logger.info('[DELETE] Request to delete payment method ID:', id);
  logger.info('[DELETE] User ID:', req.user._id);

  const paymentMethod = await PaymentMethod.findOne({ _id: id, user: req.user._id });

  if (!paymentMethod) {
    logger.info('[DELETE] Payment method not found');
    return sendNotFound(res, 'Payment method not found');
  }

  logger.info('[DELETE] Found payment method:', {
    id: paymentMethod._id,
    type: paymentMethod.type,
    isActive: paymentMethod.isActive,
    isDefault: paymentMethod.isDefault
  });

  // Soft delete
  logger.info('[DELETE] Setting isActive to false...');
  paymentMethod.isActive = false;
  await paymentMethod.save();

  logger.info('[DELETE] Payment method soft-deleted successfully');
  logger.info('[DELETE] Verifying update - isActive:', paymentMethod.isActive);

  sendSuccess(res, { deletedId: id }, 'Payment method deleted successfully');
});

// Set default payment method
export const setDefaultPaymentMethod = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }

  const { id } = req.params;

  // Find payment method and ensure it belongs to the user
  const paymentMethod = await PaymentMethod.findOne({ _id: id, user: req.user._id });

  if (!paymentMethod) {
    return sendNotFound(res, 'Payment method not found');
  }

  // Update all payment methods to non-default
  await PaymentMethod.updateMany(
    { user: req.user._id },
    { $set: { isDefault: false } }
  );

  // Set this payment method as default
  paymentMethod.isDefault = true;
  await paymentMethod.save();

  // Convert to plain object and map _id to id
  const paymentMethodObj: any = paymentMethod.toObject();
  const mappedPaymentMethod = {
    ...paymentMethodObj,
    id: paymentMethodObj._id.toString(),
    _id: undefined
  };

  sendSuccess(res, mappedPaymentMethod, 'Default payment method updated successfully');
});