/**
 * Privé Campaign Merchant Controller
 * Handles merchant operations for campaign management
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../utils/asyncHandler';
import { logger } from '../../config/logger';
import { PriveCampaign } from '../../models/PriveCampaign';
import { PrivePostSubmission } from '../../models/PrivePostSubmission';
import { sendSuccess, sendError } from '../../utils/response';
import rewardEngine from '../../core/rewardEngine';
import pushNotificationService from '../../services/pushNotificationService';

// ─── Feature Flag Check ────────────────────────────────────────────────────

const isPriveCampaignsEnabled = (): boolean => {
  return process.env.FEATURE_PRIVE_CAMPAIGNS !== 'false';
};

// ─── Campaign Management ────────────────────────────────────────────────────

/**
 * GET /api/merchant/prive/campaigns
 * List campaigns created by merchant
 */
export const getMerchantCampaigns = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const merchantId = (req.user as any)._id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const [campaigns, total] = await Promise.all([
      PriveCampaign.find({
        createdBy: merchantId,
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PriveCampaign.countDocuments({
        createdBy: merchantId,
        isDeleted: false,
      }),
    ]);

    return sendSuccess(
      res,
      {
        campaigns,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Campaigns fetched',
    );
  } catch (error) {
    logger.error('[Privé Merchant] Error fetching campaigns:', error);
    return sendError(res, 'Failed to fetch campaigns', 500);
  }
});

/**
 * POST /api/merchant/prive/campaigns
 * Create a new campaign
 */
export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const merchantId = (req.user as any)._id;
    const {
      title,
      description,
      type,
      image,
      startDate,
      endDate,
      submissionDeadline,
      rewards,
      totalRewardPool,
      participationBonus,
      allowedFormats,
    } = req.body;

    const campaign = await PriveCampaign.create({
      title,
      description,
      type,
      image,
      startDate,
      endDate,
      submissionDeadline,
      rewards,
      totalRewardPool,
      participationBonus,
      allowedFormats,
      createdBy: merchantId,
      status: 'draft',
      isActive: false,
    });

    return sendSuccess(res, { campaign }, 'Campaign created successfully', 201);
  } catch (error) {
    logger.error('[Privé Merchant] Error creating campaign:', error);
    return sendError(res, 'Failed to create campaign', 500);
  }
});

/**
 * PATCH /api/merchant/prive/campaigns/:campaignId
 * Update campaign
 */
export const updateCampaign = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const { campaignId } = req.params;
    const merchantId = (req.user as any)._id;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return sendError(res, 'Invalid campaign ID', 400);
    }

    const campaign = await PriveCampaign.findOneAndUpdate(
      {
        _id: campaignId,
        createdBy: merchantId,
        isDeleted: false,
      },
      { $set: req.body },
      { new: true },
    );

    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    return sendSuccess(res, { campaign }, 'Campaign updated');
  } catch (error) {
    logger.error('[Privé Merchant] Error updating campaign:', error);
    return sendError(res, 'Failed to update campaign', 500);
  }
});

/**
 * DELETE /api/merchant/prive/campaigns/:campaignId
 * Soft delete campaign
 */
export const deleteCampaign = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const { campaignId } = req.params;
    const merchantId = (req.user as any)._id;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return sendError(res, 'Invalid campaign ID', 400);
    }

    const campaign = await PriveCampaign.findOneAndUpdate(
      {
        _id: campaignId,
        createdBy: merchantId,
        isDeleted: false,
      },
      { $set: { isDeleted: true, isActive: false } },
      { new: true },
    );

    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    return sendSuccess(res, { campaign }, 'Campaign deleted');
  } catch (error) {
    logger.error('[Privé Merchant] Error deleting campaign:', error);
    return sendError(res, 'Failed to delete campaign', 500);
  }
});

// ─── Submission Moderation ──────────────────────────────────────────────────

/**
 * GET /api/merchant/prive/campaigns/:campaignId/submissions
 * Get submissions for a campaign
 */
export const getCampaignSubmissions = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const { campaignId } = req.params;
    const merchantId = (req.user as any)._id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limit;

    // Verify merchant owns the campaign
    const campaign = await PriveCampaign.findOne({
      _id: campaignId,
      createdBy: merchantId,
      isDeleted: false,
    })
      .select('_id')
      .lean();

    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    const [submissions, total] = await Promise.all([
      PrivePostSubmission.find({
        campaign: campaignId,
        isDeleted: false,
      })
        .populate('user', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PrivePostSubmission.countDocuments({
        campaign: campaignId,
        isDeleted: false,
      }),
    ]);

    return sendSuccess(
      res,
      {
        submissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Submissions fetched',
    );
  } catch (error) {
    logger.error('[Privé Merchant] Error fetching submissions:', error);
    return sendError(res, 'Failed to fetch submissions', 500);
  }
});

/**
 * PATCH /api/merchant/prive/campaigns/:campaignId/submissions/:submissionId/approve
 * Approve a submission
 */
export const approveSubmission = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const { campaignId, submissionId } = req.params;
    const merchantId = (req.user as any)._id;
    const { awardTier, coinReward } = req.body;

    // Verify merchant owns the campaign
    const campaign = await PriveCampaign.findOne({
      _id: campaignId,
      createdBy: merchantId,
      isDeleted: false,
    })
      .select('_id')
      .lean();

    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    const submission = await PrivePostSubmission.findOneAndUpdate(
      {
        _id: submissionId,
        campaign: campaignId,
        isDeleted: false,
      },
      {
        $set: {
          status: 'approved',
          isPublished: true,
          awardTier,
          coinReward,
          reviewedBy: merchantId,
          reviewedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!submission) {
      return sendError(res, 'Submission not found', 404);
    }

    // Issue coins to the user for the approved submission
    const coinsAwarded = coinReward || 50;
    try {
      await rewardEngine.issue({
        userId: submission.user!.toString(),
        amount: coinsAwarded,
        rewardType: 'prive_campaign',
        coinType: 'rez',
        source: `prive_campaign:${campaignId}`,
        description: `Coins awarded for approved Privé campaign submission`,
        operationType: 'loyalty_credit',
        referenceId: `prive-submission:${submission._id}`,
        referenceModel: 'PrivePostSubmission',
      });
      logger.info(`[Privé] Coins issued for submission ${submission._id}`);
    } catch (rewardErr: any) {
      logger.error('[Privé] Failed to issue reward:', rewardErr.message);
      // Don't fail the approval - log and continue
    }

    // Send push notification to user about approval
    try {
      await pushNotificationService.sendPushToUser(submission.user!.toString(), {
        title: '🎉 Your Privé post was approved!',
        body: `${coinsAwarded} REZ coins have been added to your wallet.`,
        data: { screen: 'prive/my-submissions', campaignId: campaignId.toString() },
      });
    } catch (notifErr: any) {
      logger.error('[Privé] Failed to send approval notification:', notifErr.message);
      // Don't fail the approval - log and continue
    }

    return sendSuccess(res, { submission }, 'Submission approved');
  } catch (error) {
    logger.error('[Privé Merchant] Error approving submission:', error);
    return sendError(res, 'Failed to approve submission', 500);
  }
});

/**
 * PATCH /api/merchant/prive/campaigns/:campaignId/submissions/:submissionId/reject
 * Reject a submission
 */
export const rejectSubmission = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const { campaignId, submissionId } = req.params;
    const merchantId = (req.user as any)._id;
    const { rejectionReason } = req.body;

    // Verify merchant owns the campaign
    const campaign = await PriveCampaign.findOne({
      _id: campaignId,
      createdBy: merchantId,
      isDeleted: false,
    })
      .select('_id')
      .lean();

    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    const submission = await PrivePostSubmission.findOneAndUpdate(
      {
        _id: submissionId,
        campaign: campaignId,
        isDeleted: false,
      },
      {
        $set: {
          status: 'rejected',
          rejectionReason,
          reviewedBy: merchantId,
          reviewedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!submission) {
      return sendError(res, 'Submission not found', 404);
    }

    return sendSuccess(res, { submission }, 'Submission rejected');
  } catch (error) {
    logger.error('[Privé Merchant] Error rejecting submission:', error);
    return sendError(res, 'Failed to reject submission', 500);
  }
});

/**
 * GET /api/merchant/prive/campaigns/:campaignId/stats
 * Get campaign statistics
 */
export const getCampaignStats = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const { campaignId } = req.params;
    const merchantId = (req.user as any)._id;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return sendError(res, 'Invalid campaign ID', 400);
    }

    const campaign = await PriveCampaign.findOne({
      _id: campaignId,
      createdBy: merchantId,
      isDeleted: false,
    }).lean();

    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    const [approvedCount, rejectedCount, pendingCount] = await Promise.all([
      PrivePostSubmission.countDocuments({
        campaign: campaignId,
        status: 'approved',
        isDeleted: false,
      }),
      PrivePostSubmission.countDocuments({
        campaign: campaignId,
        status: 'rejected',
        isDeleted: false,
      }),
      PrivePostSubmission.countDocuments({
        campaign: campaignId,
        status: { $in: ['submitted', 'under_review'] },
        isDeleted: false,
      }),
    ]);

    const stats = {
      campaign,
      submissions: {
        approved: approvedCount,
        rejected: rejectedCount,
        pending: pendingCount,
        total: approvedCount + rejectedCount + pendingCount,
      },
    };

    return sendSuccess(res, stats, 'Campaign stats fetched');
  } catch (error) {
    logger.error('[Privé Merchant] Error fetching campaign stats:', error);
    return sendError(res, 'Failed to fetch campaign stats', 500);
  }
});
