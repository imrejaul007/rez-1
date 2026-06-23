/**
 * Ad Campaign Admin Controller
 *
 * Admin endpoints for reviewing, approving, rejecting, and pausing ad campaigns.
 */

import { Request, Response } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';
import { AppError } from '../../middleware/errorHandler';
import AdCampaign from '../../models/AdCampaign';

/**
 * GET /api/admin/ad-campaigns
 * Paginated list of ad campaigns with optional status filter.
 */
export const getAdCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [ads, total] = await Promise.all([
    AdCampaign.find(filter)
      .populate('merchantId', 'name businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AdCampaign.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    ads,
    pagination: {
      page,
      limit,
      total,
      hasNext: skip + limit < total,
    },
  });
});

/**
 * GET /api/admin/ad-campaigns/stats
 * Aggregate stats: counts by status, total impressions/clicks/spent.
 */
export const getAdCampaignStats = asyncHandler(async (req: Request, res: Response) => {
  const [statusCounts, aggregates] = await Promise.all([
    AdCampaign.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    AdCampaign.aggregate([
      {
        $group: {
          _id: null,
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
          totalSpent: { $sum: '$totalSpent' },
          total: { $sum: 1 },
        },
      },
    ]),
  ]);

  const byStatus: Record<string, number> = {};
  for (const entry of statusCounts) {
    byStatus[entry._id] = entry.count;
  }

  const agg = aggregates[0] || { total: 0, totalImpressions: 0, totalClicks: 0, totalSpent: 0 };

  return sendSuccess(res, {
    total: agg.total,
    byStatus,
    totalImpressions: agg.totalImpressions,
    totalClicks: agg.totalClicks,
    totalSpent: agg.totalSpent,
  });
});

/**
 * POST /api/admin/ad-campaigns/:id/approve
 * Set campaign status to 'active'.
 */
export const approveAdCampaign = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await AdCampaign.findById(req.params.id);
  if (!campaign) {
    throw new AppError('Ad campaign not found', 404);
  }

  campaign.status = 'active';
  await campaign.save();

  return sendSuccess(res, campaign, 'Ad campaign approved');
});

/**
 * POST /api/admin/ad-campaigns/:id/reject
 * Set campaign status to 'rejected' with a reason.
 */
export const rejectAdCampaign = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await AdCampaign.findById(req.params.id);
  if (!campaign) {
    throw new AppError('Ad campaign not found', 404);
  }

  const { reason } = req.body;
  if (!reason) {
    return sendError(res, 'Rejection reason is required', 400);
  }

  campaign.status = 'rejected';
  campaign.rejectionReason = reason;
  await campaign.save();

  return sendSuccess(res, campaign, 'Ad campaign rejected');
});

/**
 * POST /api/admin/ad-campaigns/:id/pause
 * Set campaign status to 'paused'.
 */
export const pauseAdCampaign = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await AdCampaign.findById(req.params.id);
  if (!campaign) {
    throw new AppError('Ad campaign not found', 404);
  }

  campaign.status = 'paused';
  await campaign.save();

  return sendSuccess(res, campaign, 'Ad campaign paused');
});
