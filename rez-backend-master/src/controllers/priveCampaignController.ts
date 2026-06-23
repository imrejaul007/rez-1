/**
 * Privé Campaign Controller
 * Handles user-facing campaign operations and post submissions
 */

import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { PriveCampaign } from '../models/PriveCampaign';
import { PrivePostSubmission } from '../models/PrivePostSubmission';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { sendSuccess, sendError } from '../utils/response';

// ─── Feature Flag Check ────────────────────────────────────────────────────

const isPriveCampaignsEnabled = (): boolean => {
  return process.env.FEATURE_PRIVE_CAMPAIGNS !== 'false';
};

// ─── Campaigns ──────────────────────────────────────────────────────────

/**
 * GET /api/prive/campaigns
 * List active campaigns with optional filters
 */
export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const filter: any = {
      isActive: true,
      isDeleted: false,
      status: { $in: ['active', 'paused'] },
      startDate: { $lte: new Date() },
    };

    if (req.query.type) {
      filter.type = req.query.type;
    }

    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    const [campaigns, total] = await Promise.all([
      PriveCampaign.find(filter)
        .select('-guidelinesText -moderatorNotes')
        .sort({ isFeatured: -1, priority: -1, startDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      PriveCampaign.countDocuments(filter),
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
    logger.error('[Privé] Error fetching campaigns:', error);
    return sendError(res, 'Failed to fetch campaigns', 500);
  }
});

/**
 * GET /api/prive/campaigns/:campaignId
 * Get campaign details
 */
export const getCampaign = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const { campaignId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return sendError(res, 'Invalid campaign ID', 400);
    }

    const campaign = await PriveCampaign.findOne({
      _id: campaignId,
      isDeleted: false,
    }).lean();

    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    // Increment views
    await PriveCampaign.updateOne({ _id: campaignId }, { $inc: { views: 1 } });

    return sendSuccess(res, { campaign }, 'Campaign details fetched');
  } catch (error) {
    logger.error('[Privé] Error fetching campaign:', error);
    return sendError(res, 'Failed to fetch campaign', 500);
  }
});

// ─── Submissions ────────────────────────────────────────────────────────

/**
 * POST /api/prive/campaigns/:campaignId/submit
 * Submit a post to a campaign
 */
export const submitPost = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const { campaignId } = req.params;
    const { caption, mediaUrl, mediaType, mediaMetadata } = req.body;
    const userId = (req.user as any)._id;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return sendError(res, 'Invalid campaign ID', 400);
    }

    // Check campaign exists and is active
    const campaign = await PriveCampaign.findOne({
      _id: campaignId,
      isActive: true,
      status: 'active',
      isDeleted: false,
      submissionDeadline: { $gte: new Date() },
    }).lean();

    if (!campaign) {
      return sendError(res, 'Campaign not found or closed for submissions', 404);
    }

    // Check if user already submitted
    const existingSubmission = await PrivePostSubmission.findOne({
      campaign: campaignId,
      user: userId,
      status: { $ne: 'deleted' },
    }).lean();

    if (existingSubmission) {
      return sendError(res, 'You have already submitted to this campaign', 400);
    }

    // Check submission limit
    if (campaign.maxSubmissions && campaign.maxSubmissions > 0) {
      const userSubmissionCount = await PrivePostSubmission.countDocuments({
        campaign: campaignId,
        user: userId,
        status: { $ne: 'deleted' },
      });

      if (userSubmissionCount >= campaign.maxSubmissions) {
        return sendError(res, `Submission limit (${campaign.maxSubmissions}) exceeded`, 400);
      }
    }

    // Create submission
    const submission = await PrivePostSubmission.create({
      campaign: campaignId,
      user: userId,
      caption,
      mediaUrl,
      mediaType,
      mediaMetadata,
      status: 'submitted',
      isPublished: false,
    });

    // Increment campaign submission count
    await PriveCampaign.updateOne(
      { _id: campaignId },
      {
        $inc: { submissionCount: 1, participantCount: 1 },
      },
    );

    return sendSuccess(res, { submission }, 'Post submitted successfully', 201);
  } catch (error) {
    logger.error('[Privé] Error submitting post:', error);
    return sendError(res, 'Failed to submit post', 500);
  }
});

/**
 * GET /api/prive/campaigns/:campaignId/submissions
 * Get my submissions for a campaign
 */
export const getMySubmissions = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const { campaignId } = req.params;
    const userId = (req.user as any)._id;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return sendError(res, 'Invalid campaign ID', 400);
    }

    const submissions = await PrivePostSubmission.find({
      campaign: campaignId,
      user: userId,
      isDeleted: false,
    })
      .select('-ipAddress -userAgent -moderatorNotes')
      .lean();

    return sendSuccess(res, { submissions }, 'Submissions fetched');
  } catch (error) {
    logger.error('[Privé] Error fetching submissions:', error);
    return sendError(res, 'Failed to fetch submissions', 500);
  }
});

/**
 * GET /api/prive/campaigns/:campaignId/results
 * Get campaign results (approved submissions, rankings)
 */
export const getCampaignResults = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const { campaignId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      return sendError(res, 'Invalid campaign ID', 400);
    }

    const campaign = await PriveCampaign.findOne({
      _id: campaignId,
      isDeleted: false,
    })
      .select('endDate status')
      .lean();

    if (!campaign) {
      return sendError(res, 'Campaign not found', 404);
    }

    // Get ranked approved submissions
    const submissions = await PrivePostSubmission.find({
      campaign: campaignId,
      status: 'approved',
      isPublished: true,
      isDeleted: false,
    })
      .select('-ipAddress -userAgent -moderatorNotes')
      .populate('user', 'name avatar')
      .sort({ rank: 1 })
      .lean();

    return sendSuccess(
      res,
      {
        campaign,
        submissions,
        totalApproved: submissions.length,
      },
      'Campaign results fetched',
    );
  } catch (error) {
    logger.error('[Privé] Error fetching campaign results:', error);
    return sendError(res, 'Failed to fetch campaign results', 500);
  }
});

/**
 * DELETE /api/prive/campaigns/:campaignId/submissions/:submissionId
 * Delete own submission
 */
export const deleteSubmission = asyncHandler(async (req: Request, res: Response) => {
  if (!isPriveCampaignsEnabled()) {
    return sendError(res, 'Privé campaigns feature is disabled', 403);
  }

  try {
    const { campaignId, submissionId } = req.params;
    const userId = (req.user as any)._id;

    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      return sendError(res, 'Invalid submission ID', 400);
    }

    const submission = await PrivePostSubmission.findOneAndUpdate(
      {
        _id: submissionId,
        campaign: campaignId,
        user: userId,
        isDeleted: false,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        },
      },
      { new: true },
    );

    if (!submission) {
      return sendError(res, 'Submission not found or already deleted', 404);
    }

    return sendSuccess(res, { submission }, 'Submission deleted');
  } catch (error) {
    logger.error('[Privé] Error deleting submission:', error);
    return sendError(res, 'Failed to delete submission', 500);
  }
});

// ─── Merchant/Admin Routes (in separate file) ────────────────────────────
