import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { Dispute } from '../models/Dispute';
import { Store } from '../models/Store';
import { disputeService } from '../services/disputeService';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../utils/response';
import { logger } from '../config/logger';

const router = Router();

/**
 * GET /api/merchant/disputes — List disputes for merchant's stores
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const skip = (page - 1) * limit;

    // Get all store IDs belonging to this merchant
    const stores = await Store.find({ merchantId }).select('_id').lean();
    const storeIds = stores.map((s: any) => s._id);

    if (storeIds.length === 0) {
      return sendSuccess(res, {
        disputes: [],
        pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
      }, 'No stores found');
    }

    const query: any = { store: { $in: storeIds } };
    if (req.query.status) query.status = req.query.status;

    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .populate('user', 'profile.firstName profile.lastName phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Dispute.countDocuments(query),
    ]);

    return sendSuccess(res, {
      disputes,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    }, 'Disputes fetched');
  } catch (err: any) {
    logger.error('[MERCHANT-DISPUTES] List error:', err);
    return sendError(res, 'Failed to fetch disputes', 500);
  }
});

/**
 * GET /api/merchant/disputes/:id — Get dispute detail
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).userId;
    const dispute = await disputeService.getDisputeById(req.params.id);

    if (!dispute) {
      return sendNotFound(res, 'Dispute not found');
    }

    // Verify merchant owns the store
    if (!dispute.merchant || dispute.merchant.toString() !== merchantId) {
      return sendNotFound(res, 'Dispute not found');
    }

    return sendSuccess(res, dispute, 'Dispute fetched');
  } catch (err: any) {
    logger.error('[MERCHANT-DISPUTES] Detail error:', err);
    return sendError(res, 'Failed to fetch dispute', 500);
  }
});

/**
 * POST /api/merchant/disputes/:id/respond — Submit counter-evidence
 */
router.post('/:id/respond', async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).userId;
    const { response: responseText, attachments } = req.body;

    if (!responseText?.trim()) {
      return sendBadRequest(res, 'Response text is required');
    }

    const dispute = await disputeService.submitMerchantResponse({
      disputeId: req.params.id,
      merchantId,
      response: responseText.trim(),
      attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [],
    });

    return sendSuccess(res, dispute, 'Response submitted');
  } catch (err: any) {
    logger.error('[MERCHANT-DISPUTES] Respond error:', err);
    if (err.message?.includes('not found')) {
      return sendNotFound(res, err.message);
    }
    if (err.message?.includes('not authorized') || err.message?.includes('no longer open')) {
      return sendError(res, err.message, 403);
    }
    return sendError(res, 'Failed to submit response', 500);
  }
});

export default router;
