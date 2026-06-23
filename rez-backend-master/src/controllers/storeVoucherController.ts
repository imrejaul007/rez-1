import { logger } from '../config/logger';
import { Request, Response } from 'express';
import StoreVoucher from '../models/StoreVoucher';
import UserStoreVoucher from '../models/UserStoreVoucher';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * GET /api/store-vouchers/store/:storeId
 * Get available store vouchers for a specific store
 */
export const getStoreVouchers = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user?.id;

    const storeObjId = new mongoose.Types.ObjectId(storeId);
    const userObjId = userId ? new mongoose.Types.ObjectId(userId) : undefined;

    const now = new Date();
    const filter: any = {
      store: storeObjId,
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $expr: { $lt: ['$usedCount', '$usageLimit'] }
    };

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [vouchers, total] = await Promise.all([
      StoreVoucher.find(filter)
        .sort({ discountValue: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      StoreVoucher.countDocuments(filter),
    ]);

    // If user is authenticated, check which vouchers they can use
    if (userObjId) {
      const vouchersWithEligibility = [];

      for (const voucher of vouchers) {
        const voucherDoc = await StoreVoucher.findById(voucher._id).lean();
        if (voucherDoc) {
          const canRedeem = await voucherDoc.canUserRedeem(userObjId);

          // Check if user already has this voucher assigned
          const userVoucher = await UserStoreVoucher.findOne({
            user: userObjId,
            voucher: voucher._id,
          }).lean();

          vouchersWithEligibility.push({
            ...voucher,
            canRedeem: canRedeem.can,
            redeemReason: canRedeem.reason,
            isAssigned: !!userVoucher,
            userVoucherStatus: userVoucher?.status,
          });
        }
      }

      return sendPaginated(
        res,
        vouchersWithEligibility,
        pageNum,
        limitNum,
        total,
        'Store vouchers fetched successfully'
      );
    }

    sendPaginated(res, vouchers, pageNum, limitNum, total, 'Store vouchers fetched successfully');
});

/**
 * GET /api/store-vouchers/:id
 * Get single store voucher by ID
 */
export const getStoreVoucherById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const voucher = await StoreVoucher.findById(id)
      .populate('store', 'name logo location contact')
      .lean();

    if (!voucher) {
      return sendError(res, 'Store voucher not found', 404);
    }

    // If user is authenticated, check eligibility
    if (userId) {
      const userObjId = new mongoose.Types.ObjectId(userId);
      const voucherDoc = await StoreVoucher.findById(id).lean();

      if (voucherDoc) {
        const canRedeem = await voucherDoc.canUserRedeem(userObjId);

        const userVoucher = await UserStoreVoucher.findOne({
          user: userObjId,
          voucher: id,
        }).lean();

        return sendSuccess(
          res,
          {
            ...voucher,
            canRedeem: canRedeem.can,
            redeemReason: canRedeem.reason,
            isAssigned: !!userVoucher,
            userVoucherStatus: userVoucher?.status,
          },
          'Store voucher fetched successfully'
        );
      }
    }

    sendSuccess(res, voucher, 'Store voucher fetched successfully');
});

/**
 * POST /api/store-vouchers/:id/claim
 * Claim a store voucher (assign to user) - authenticated users only
 */
export const claimStoreVoucher = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    // Find voucher
    const voucher = await StoreVoucher.findById(id).lean();

    if (!voucher) {
      return sendError(res, 'Store voucher not found', 404);
    }

    // Check if user can redeem
    const userObjId = new mongoose.Types.ObjectId(userId);
    const canRedeem = await voucher.canUserRedeem(userObjId);

    if (!canRedeem.can) {
      return sendError(res, canRedeem.reason || 'Cannot claim this voucher', 400);
    }

    // Check if user already has this voucher
    const existingUserVoucher = await UserStoreVoucher.findOne({
      user: userId,
      voucher: id,
    }).lean();

    if (existingUserVoucher) {
      return sendError(res, 'You have already claimed this voucher', 400);
    }

    // Create user voucher assignment
    const userVoucher = new UserStoreVoucher({
      user: userId,
      voucher: id,
      status: 'assigned',
    });

    await userVoucher.save();

    // Populate voucher details
    await userVoucher.populate('voucher', 'code name discountType discountValue minBillAmount validUntil');

    sendSuccess(
      res,
      userVoucher,
      'Voucher claimed successfully',
      201
    );
});

/**
 * POST /api/store-vouchers/:id/redeem
 * Redeem a store voucher (mark as used) - authenticated users only
 */
export const redeemStoreVoucher = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;
    const { orderId, billAmount } = req.body;

    if (!orderId || !billAmount) {
      return sendError(res, 'Order ID and bill amount are required', 400);
    }

    // Find user's voucher
    const userVoucher = await UserStoreVoucher.findOne({
      _id: id,
      user: userId,
    }).populate('voucher').lean();

    if (!userVoucher) {
      return sendError(res, 'Voucher not found or not assigned to you', 404);
    }

    if (userVoucher.status !== 'assigned') {
      return sendError(res, 'This voucher has already been used or expired', 400);
    }

    const voucher = await StoreVoucher.findById(userVoucher.voucher).lean();

    if (!voucher) {
      return sendError(res, 'Voucher details not found', 404);
    }

    // Check if bill amount meets minimum requirement
    if (billAmount < voucher.minBillAmount) {
      return sendError(
        res,
        `Minimum bill amount of ₹${voucher.minBillAmount} required`,
        400
      );
    }

    // Calculate discount amount
    const discountAmount = voucher.calculateDiscount(billAmount);

    if (discountAmount === 0) {
      return sendError(res, 'Discount cannot be applied', 400);
    }

    // Mark user voucher as used
    userVoucher.status = 'used';
    userVoucher.usedAt = new Date();
    userVoucher.order = new mongoose.Types.ObjectId(orderId);
    await userVoucher.save();

    // Increment voucher usage count
    voucher.usedCount += 1;
    await voucher.save();

    sendSuccess(
      res,
      {
        discountAmount,
        finalAmount: billAmount - discountAmount,
        voucher: {
          code: voucher.code,
          name: voucher.name,
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
        },
      },
      'Voucher redeemed successfully'
    );
});

/**
 * POST /api/store-vouchers/validate
 * Validate a store voucher code
 */
export const validateStoreVoucher = asyncHandler(async (req: Request, res: Response) => {
    const { code, storeId, billAmount } = req.body;
    const userId = req.user?.id;

    if (!code || !storeId || !billAmount) {
      return sendError(res, 'Code, store ID, and bill amount are required', 400);
    }

    // Find voucher
    const voucher = await StoreVoucher.findOne({
      code: code.toUpperCase(),
      store: storeId,
      isActive: true,
    }).lean();

    if (!voucher) {
      return sendError(res, 'Invalid voucher code', 404);
    }

    // Check if currently valid
    const now = new Date();
    if (voucher.validFrom > now) {
      return sendError(res, 'This voucher is not yet valid', 400);
    }

    if (voucher.validUntil < now) {
      return sendError(res, 'This voucher has expired', 400);
    }

    // Check usage limit
    if (voucher.usedCount >= voucher.usageLimit) {
      return sendError(res, 'This voucher has reached its usage limit', 400);
    }

    // Check minimum bill amount
    if (billAmount < voucher.minBillAmount) {
      return sendError(
        res,
        `Minimum bill amount of ₹${voucher.minBillAmount} required`,
        400
      );
    }

    // Check user-specific restrictions if authenticated
    if (userId) {
      const userObjId = new mongoose.Types.ObjectId(userId);
      const canRedeem = await voucher.canUserRedeem(userObjId);

      if (!canRedeem.can) {
        return sendError(res, canRedeem.reason || 'You cannot use this voucher', 400);
      }
    }

    // Calculate discount amount
    const discountAmount = voucher.calculateDiscount(billAmount);

    sendSuccess(
      res,
      {
        valid: true,
        voucher: {
          _id: voucher._id,
          code: voucher.code,
          name: voucher.name,
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
          minBillAmount: voucher.minBillAmount,
          restrictions: voucher.restrictions,
        },
        discountAmount,
        finalAmount: billAmount - discountAmount,
      },
      'Voucher is valid'
    );
});

/**
 * GET /api/store-vouchers/my-vouchers
 * Get user's claimed store vouchers (authenticated users only)
 */
export const getMyStoreVouchers = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter: any = { user: userId };

    if (status) {
      filter.status = status;
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [vouchers, total] = await Promise.all([
      UserStoreVoucher.find(filter)
        .populate({
          path: 'voucher',
          select: 'code name discountType discountValue minBillAmount validUntil restrictions metadata store',
          populate: {
            path: 'store',
            select: 'name logo'
          }
        })
        .populate('order', 'orderNumber status')
        .sort({ assignedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      UserStoreVoucher.countDocuments(filter),
    ]);

    sendPaginated(res, vouchers, pageNum, limitNum, total, 'My vouchers fetched successfully');
});

/**
 * GET /api/store-vouchers/my-vouchers/:id
 * Get single user voucher details (authenticated users only)
 */
export const getMyStoreVoucherById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const voucher = await UserStoreVoucher.findOne({
      _id: id,
      user: userId,
    })
      .populate({
        path: 'voucher',
        populate: {
          path: 'store',
          select: 'name logo location contact'
        }
      })
      .populate('order', 'orderNumber status totalAmount')
      .lean();

    if (!voucher) {
      return sendError(res, 'Voucher not found', 404);
    }

    sendSuccess(res, voucher, 'Voucher details fetched successfully');
});

/**
 * DELETE /api/store-vouchers/my-vouchers/:id
 * Remove a claimed voucher (only if not used) - authenticated users only
 */
export const removeClaimedVoucher = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const userVoucher = await UserStoreVoucher.findOne({
      _id: id,
      user: userId,
    });

    if (!userVoucher) {
      return sendError(res, 'Voucher not found', 404);
    }

    if (userVoucher.status === 'used') {
      return sendError(res, 'Cannot remove used vouchers', 400);
    }

    await userVoucher.deleteOne();

    sendSuccess(res, { success: true }, 'Voucher removed successfully');
});
