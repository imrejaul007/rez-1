import { logger } from '../../config/logger';
/**
 * Admin Routes - Double Cashback Campaigns
 * CRUD for DoubleCashbackCampaign model (used by Extra Rewards page)
 */

import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import DoubleCashbackCampaign from '../../models/DoubleCashbackCampaign';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/double-campaigns
 * List all double cashback campaigns with pagination
 */
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (req.query.status === 'active') {
    filter.isActive = true;
  } else if (req.query.status === 'inactive') {
    filter.isActive = false;
  }

  if (req.query.running === 'true') {
    const now = new Date();
    filter.isActive = true;
    filter.startTime = { $lte: now };
    filter.endTime = { $gte: now };
  }

  const [campaigns, total] = await Promise.all([
    DoubleCashbackCampaign.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DoubleCashbackCampaign.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    campaigns,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, 'Double campaigns fetched');
}));

/**
 * GET /api/admin/double-campaigns/:id
 * Get single campaign by ID
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid campaign ID', 400);
  }

  const campaign = await DoubleCashbackCampaign.findById(req.params.id).lean();
  if (!campaign) {
    return sendError(res, 'Campaign not found', 404);
  }

  return sendSuccess(res, campaign, 'Campaign fetched');
}));

/**
 * POST /api/admin/double-campaigns
 * Create new double cashback campaign
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    subtitle,
    description,
    multiplier,
    startTime,
    endTime,
    eligibleStores,
    eligibleStoreNames,
    eligibleCategories,
    terms,
    minOrderValue,
    maxCashback,
    backgroundColor,
    bannerImage,
    icon,
    priority,
  } = req.body;

  if (!title || !subtitle || !multiplier || !startTime || !endTime) {
    return sendError(res, 'title, subtitle, multiplier, startTime, and endTime are required', 400);
  }

  const campaign = await DoubleCashbackCampaign.create({
    title,
    subtitle,
    description,
    multiplier,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    eligibleStores: eligibleStores || [],
    eligibleStoreNames: eligibleStoreNames || [],
    eligibleCategories: eligibleCategories || [],
    terms: terms || [],
    minOrderValue,
    maxCashback,
    backgroundColor: backgroundColor || '#FEF3C7',
    bannerImage,
    icon: icon || 'flash',
    isActive: true,
    priority: priority || 0,
    createdBy: (req as any).user?._id,
  });

  return sendSuccess(res, campaign, 'Double campaign created');
}));

/**
 * PUT /api/admin/double-campaigns/:id
 * Update existing campaign
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid campaign ID', 400);
  }

  const campaign = await DoubleCashbackCampaign.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!campaign) {
    return sendError(res, 'Campaign not found', 404);
  }

  return sendSuccess(res, campaign, 'Campaign updated');
}));

/**
 * PATCH /api/admin/double-campaigns/:id/toggle
 * Toggle campaign active status
 */
router.patch('/:id/toggle', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid campaign ID', 400);
  }

  const campaign = await DoubleCashbackCampaign.findById(req.params.id);
  if (!campaign) {
    return sendError(res, 'Campaign not found', 404);
  }

  campaign.isActive = !campaign.isActive;
  await campaign.save();

  return sendSuccess(res, campaign, `Campaign ${campaign.isActive ? 'activated' : 'deactivated'}`);
}));

/**
 * DELETE /api/admin/double-campaigns/:id
 * Delete campaign
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  if (!Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 'Invalid campaign ID', 400);
  }

  const campaign = await DoubleCashbackCampaign.findByIdAndDelete(req.params.id);
  if (!campaign) {
    return sendError(res, 'Campaign not found', 404);
  }

  return sendSuccess(res, null, 'Campaign deleted');
}));

export default router;
