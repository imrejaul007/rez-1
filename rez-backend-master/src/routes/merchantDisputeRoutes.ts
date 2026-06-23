// @ts-nocheck
import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { MerchantDispute, MerchantDisputeStatus } from '../models/MerchantDispute';
import { logger } from '../config/logger';

const router = Router();

router.use(requireAuth);

const VALID_STATUSES: MerchantDisputeStatus[] = ['open', 'under_review', 'resolved', 'rejected', 'closed'];

/**
 * GET /api/merchant/disputes
 * List disputes for the authenticated merchant (paginated, filterable by status).
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).userId || (req as any).user?._id || (req as any).user?.id;
    if (!merchantId || !mongoose.isValidObjectId(merchantId)) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {
      merchantId: new mongoose.Types.ObjectId(merchantId.toString()),
    };

    const statusParam = String(req.query.status || '');
    if (statusParam && VALID_STATUSES.includes(statusParam as MerchantDisputeStatus)) {
      filter.status = statusParam;
    }

    const [disputes, total] = await Promise.all([
      MerchantDispute.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      MerchantDispute.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      disputes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }),
);

/**
 * PATCH /api/merchant/disputes/:id
 * Update dispute status and/or notes.
 * Body: { status?, notes? }
 */
router.patch(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = (req as any).userId || (req as any).user?._id || (req as any).user?.id;
    if (!merchantId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid dispute ID' });
    }

    const { status, notes } = req.body as { status?: string; notes?: string };

    if (status && !VALID_STATUSES.includes(status as MerchantDisputeStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const updateFields: Record<string, any> = {};
    if (status) updateFields.status = status;
    if (notes !== undefined) updateFields.notes = notes;

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields to update' });
    }

    const dispute = await MerchantDispute.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        merchantId: new mongoose.Types.ObjectId(merchantId.toString()),
      },
      { $set: updateFields },
      { new: true },
    );

    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found or access denied' });
    }

    logger.info('[MerchantDisputeRoutes] Dispute updated', {
      disputeId: id,
      merchantId: merchantId.toString(),
      updates: updateFields,
    });

    return res.json({ success: true, dispute });
  }),
);

export default router;
