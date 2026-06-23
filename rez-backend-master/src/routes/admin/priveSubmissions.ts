/**
 * Admin Privé Submissions Routes
 *
 * A-01  GET    /                → List all submissions with filters + stats
 * A-02  PUT    /:id/approve     → Approve submission (credit cashback + coins)
 *       PUT    /:id/reject      → Reject submission
 */

import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, requireOperator } from '../../middleware/auth';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendError } from '../../utils/response';
import priveCampaignService from '../../services/priveCampaignService';
import { PriveCampaign } from '../../models/PriveCampaign';
import { logger } from '../../config/logger';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

// ── A-01: GET / ──
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const result = await priveCampaignService.getSubmissions({
    status: req.query.status as string,
    campaignId: req.query.campaignId as string,
    page: parseInt(req.query.page as string) || 1,
    limit: Math.min(parseInt(req.query.limit as string) || 20, 50),
  });

  return sendSuccess(res, result, 'Admin submissions fetched');
}));

// ── A-02: PUT /:id/approve ──
router.put('/:id/approve', requireOperator, asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id || (req as any).adminUser?._id;

  const result = await priveCampaignService.approveSubmission(
    req.params.id,
    adminId,
    req.body.note
  );

  if (result.error) {
    return sendError(res, result.message!, result.status!);
  }

  return sendSuccess(res, result.data, 'Submission approved by admin');
}));

// ── PUT /:id/reject ──
router.put('/:id/reject', requireOperator, asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id || (req as any).adminUser?._id;

  if (!req.body.reason) {
    return sendError(res, 'reason is required', 400);
  }

  const result = await priveCampaignService.rejectSubmission(
    req.params.id,
    adminId,
    req.body.reason,
    req.body.note
  );

  if (result.error) {
    return sendError(res, result.message!, result.status!);
  }

  return sendSuccess(res, result.data, 'Submission rejected by admin');
}));

// ── Campaign Approval Routes ──

// GET /campaigns — List campaigns (filterable by status)
router.get('/campaigns', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const status = req.query.status as string || 'pending_approval';

  const query: any = {};
  if (status !== 'all') query.status = status;

  const [campaigns, total] = await Promise.all([
    PriveCampaign.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PriveCampaign.countDocuments(query),
  ]);

  return sendSuccess(res, {
    campaigns,
    pagination: { page, limit, total, hasMore: page * limit < total },
  }, 'Campaigns fetched');
}));

// PUT /campaigns/:id/approve — Approve a campaign
router.put('/campaigns/:id/approve', requireOperator, asyncHandler(async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id || (req as any).adminUser?._id;
  const campaign = await PriveCampaign.findById(req.params.id);

  if (!campaign) {
    return sendError(res, 'Campaign not found', 404);
  }
  if (campaign.status !== 'pending_approval') {
    return sendError(res, `Campaign is already ${campaign.status}`, 400);
  }

  campaign.status = 'active';
  campaign.adminNote = req.body.note || 'Approved';
  (campaign as any).approvedBy = adminId;
  (campaign as any).approvedAt = new Date();
  await campaign.save();

  return sendSuccess(res, { campaignId: campaign._id, status: 'active' }, 'Campaign approved and activated');
}));

// PUT /campaigns/:id/reject — Reject a campaign
router.put('/campaigns/:id/reject', requireOperator, asyncHandler(async (req: Request, res: Response) => {
  const campaign = await PriveCampaign.findById(req.params.id);

  if (!campaign) {
    return sendError(res, 'Campaign not found', 404);
  }
  if (campaign.status !== 'pending_approval') {
    return sendError(res, `Campaign is already ${campaign.status}`, 400);
  }

  campaign.status = 'rejected' as any;
  campaign.adminNote = req.body.note || 'Rejected';
  await campaign.save();

  return sendSuccess(res, { campaignId: campaign._id, status: 'rejected' }, 'Campaign rejected');
}));

export default router;
