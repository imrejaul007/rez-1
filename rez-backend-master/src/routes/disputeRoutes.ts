import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { disputeService } from '../services/disputeService';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../utils/response';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

/**
 * POST /api/disputes — Create a dispute
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { targetType, targetId, reason, description, evidence } = req.body;

    if (!targetType || !targetId || !reason || !description) {
      return sendBadRequest(res, 'targetType, targetId, reason, and description are required');
    }

    if (description.length > 1000) {
      return sendBadRequest(res, 'Description must be 1000 characters or less');
    }

    const validReasons = [
      'item_not_received', 'wrong_item', 'damaged_item', 'quality_issue',
      'unauthorized_charge', 'double_charge', 'service_not_rendered', 'other',
    ];
    if (!validReasons.includes(reason)) {
      return sendBadRequest(res, `Invalid reason. Must be one of: ${validReasons.join(', ')}`);
    }

    // Validate evidence attachments
    let evidenceData: { description: string; attachments: string[] } | undefined;
    if (evidence) {
      if (!evidence.description) {
        return sendBadRequest(res, 'Evidence must include a description');
      }
      evidenceData = {
        description: evidence.description,
        attachments: Array.isArray(evidence.attachments) ? evidence.attachments.slice(0, 5) : [],
      };
    }

    try {
      const dispute = await disputeService.createDispute({
        userId,
        targetType,
        targetId,
        reason,
        description,
        evidence: evidenceData,
      });

      return sendSuccess(res, dispute, 'Dispute created successfully', 201);
    } catch (err: any) {
      if (err.message?.includes('not found') || err.message?.includes('does not belong')) {
        return sendNotFound(res, err.message);
      }
      if (err.message?.includes('already exists') || err.message?.includes('active dispute')) {
        return sendError(res, err.message, 409);
      }
      if (err.message?.includes('Cannot dispute')) {
        return sendBadRequest(res, err.message);
      }
      throw err;
    }
}));

/**
 * GET /api/disputes — List user's disputes (paginated)
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const result = await disputeService.getUserDisputes(userId, page, limit);

    return sendSuccess(res, result, 'Disputes fetched');
}));

/**
 * GET /api/disputes/:id — Get dispute detail
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const dispute = await disputeService.getDisputeById(req.params.id);

    if (!dispute) {
      return sendNotFound(res, 'Dispute not found');
    }

    // Ensure user can only see their own disputes
    if (dispute.user.toString() !== userId && (dispute.user as any)?._id?.toString() !== userId) {
      return sendNotFound(res, 'Dispute not found');
    }

    return sendSuccess(res, dispute, 'Dispute fetched');
}));

/**
 * POST /api/disputes/:id/evidence — Add evidence to dispute
 */
router.post('/:id/evidence', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { description, attachments } = req.body;

    if (!description) {
      return sendBadRequest(res, 'Evidence description is required');
    }

    try {
      const dispute = await disputeService.addUserEvidence({
        disputeId: req.params.id,
        userId,
        description,
        attachments: Array.isArray(attachments) ? attachments.slice(0, 5) : [],
      });

      return sendSuccess(res, dispute, 'Evidence added');
    } catch (err: any) {
      if (err.message?.includes('not found') || err.message?.includes('not yours')) {
        return sendNotFound(res, err.message);
      }
      if (err.message?.includes('Maximum')) {
        return sendBadRequest(res, err.message);
      }
      throw err;
    }
}));

export default router;
