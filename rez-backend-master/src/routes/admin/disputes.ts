import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { disputeService } from '../../services/disputeService';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from '../../utils/response';
import { logger } from '../../config/logger';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/disputes/stats — Dashboard stats
 */
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const stats = await disputeService.getDisputeStats();
  return sendSuccess(res, stats, 'Dispute stats fetched');
}));

/**
 * GET /api/admin/disputes — List all disputes (paginated, filtered)
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const filters: any = {};
  if (req.query.status) filters.status = req.query.status;
  if (req.query.priority) filters.priority = req.query.priority;
  if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo;
  if (req.query.search) filters.search = req.query.search;
  if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
  if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);

  const result = await disputeService.getAdminDisputes(filters, page, limit);

  return sendSuccess(res, result, 'Disputes fetched');
}));

/**
 * GET /api/admin/disputes/:id — Get dispute detail
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const dispute = await disputeService.getDisputeById(req.params.id);
  if (!dispute) {
    return sendNotFound(res, 'Dispute not found');
  }
  return sendSuccess(res, dispute, 'Dispute fetched');
}));

/**
 * POST /api/admin/disputes/:id/assign — Assign dispute to self
 */
router.post('/:id/assign', asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).userId;
  const dispute = await disputeService.assignDispute(req.params.id, adminId);
  return sendSuccess(res, dispute, 'Dispute assigned');
}));

/**
 * POST /api/admin/disputes/:id/resolve — Resolve dispute
 */
router.post('/:id/resolve', asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).userId;
  const { decision, amount, reason } = req.body;

  if (!decision || !reason) {
    return sendBadRequest(res, 'decision and reason are required');
  }

  const validDecisions = ['refund', 'reject', 'partial_refund'];
  if (!validDecisions.includes(decision)) {
    return sendBadRequest(res, `Invalid decision. Must be one of: ${validDecisions.join(', ')}`);
  }

  if (decision === 'partial_refund' && (!amount || amount <= 0)) {
    return sendBadRequest(res, 'Partial refund requires a positive amount');
  }

  const dispute = await disputeService.resolveDispute({
    disputeId: req.params.id,
    adminId,
    decision,
    amount,
    reason,
  });

  return sendSuccess(res, dispute, `Dispute ${decision === 'reject' ? 'rejected' : 'resolved with refund'}`);
}));

/**
 * POST /api/admin/disputes/:id/escalate — Escalate dispute
 */
router.post('/:id/escalate', asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).userId;
  const { reason } = req.body;

  if (!reason) {
    return sendBadRequest(res, 'Escalation reason is required');
  }

  const dispute = await disputeService.escalateDispute(req.params.id, adminId, reason);
  return sendSuccess(res, dispute, 'Dispute escalated');
}));

/**
 * POST /api/admin/disputes/:id/note — Add internal note
 */
router.post('/:id/note', asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).userId;
  const { note } = req.body;

  if (!note?.trim()) {
    return sendBadRequest(res, 'Note content is required');
  }

  const dispute = await disputeService.addAdminNote(req.params.id, adminId, note);
  return sendSuccess(res, dispute, 'Note added');
}));

export default router;
