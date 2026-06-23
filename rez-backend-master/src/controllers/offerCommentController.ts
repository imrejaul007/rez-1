import { logger } from '../config/logger';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import OfferComment from '../models/OfferComment';
import Offer from '../models/Offer';
import engagementRewardService from '../services/engagementRewardService';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Create a comment on an offer.
 * POST /api/offers/:offerId/comments
 */
export const createOfferComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { offerId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length < 20) {
      return res.status(400).json({ success: false, error: 'Comment must be at least 20 characters' });
    }

    // Verify offer exists
    const offer = await Offer.findById(offerId).lean();
    if (!offer) {
      return res.status(404).json({ success: false, error: 'Offer not found' });
    }

    // Check for duplicate text by same user on same offer
    const duplicate = await OfferComment.findOne({
      offer: offerId,
      user: userId,
      text: text.trim(),
    }).lean();
    if (duplicate) {
      return res.status(400).json({ success: false, error: 'You have already posted this exact comment on this offer' });
    }

    // Calculate quality score
    const trimmedText = text.trim();
    let qualityScore = 0;
    if (trimmedText.length >= 20) qualityScore += 1;
    if (trimmedText.length >= 50) qualityScore += 1;
    if (trimmedText.length >= 100) qualityScore += 1;
    if (trimmedText.length >= 200) qualityScore += 1;

    const comment = await OfferComment.create({
      offer: new mongoose.Types.ObjectId(offerId),
      user: new mongoose.Types.ObjectId(userId),
      text: trimmedText,
      moderationStatus: 'pending',
      qualityScore,
    });

    // Grant pending reward
    const rewardResult = await engagementRewardService.grantReward(
      userId.toString(),
      'offer_comment',
      (comment._id as any).toString(),
      { offerId, textLength: trimmedText.length, qualityScore },
      { textLength: trimmedText.length }
    );

    res.status(201).json({
      success: true,
      message: 'Comment submitted for review',
      data: {
        id: comment._id,
        text: comment.text,
        moderationStatus: comment.moderationStatus,
        qualityScore,
        coinReward: rewardResult.success
          ? { coinsAwarded: rewardResult.coinsAwarded, status: rewardResult.status, message: rewardResult.message }
          : null,
      },
    });
});

/**
 * Get approved comments for an offer (public).
 * GET /api/offers/:offerId/comments
 */
export const getOfferComments = asyncHandler(async (req: Request, res: Response) => {
    const { offerId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { offer: offerId, moderationStatus: 'approved' };

    const [comments, total] = await Promise.all([
      OfferComment.find(filter)
        .populate('user', 'firstName lastName profilePicture')
        .populate('replies.user', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OfferComment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        comments: comments.map((c: any) => ({
          id: c._id,
          text: c.text,
          likes: c.likes?.length || 0,
          replies: (c.replies || []).map((r: any) => ({
            id: r._id,
            text: r.text,
            likes: r.likes?.length || 0,
            user: r.user ? {
              id: r.user._id,
              name: `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim(),
              avatar: r.user.profilePicture,
            } : null,
            createdAt: r.createdAt,
          })),
          user: c.user ? {
            id: c.user._id,
            name: `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim(),
            avatar: c.user.profilePicture,
          } : null,
          createdAt: c.createdAt,
        })),
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + comments.length < total,
        },
      },
    });
});

/**
 * Toggle like on an offer comment.
 * POST /api/offers/:offerId/comments/:commentId/like
 */
export const toggleCommentLike = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { commentId } = req.params;
    const comment = await OfferComment.findById(commentId).lean();
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const userObjId = new mongoose.Types.ObjectId(userId);
    const isLiked = comment.likes.some(id => id.equals(userObjId));

    if (isLiked) {
      comment.likes = comment.likes.filter(id => !id.equals(userObjId));
    } else {
      comment.likes.push(userObjId);
    }
    await comment.save();

    res.status(200).json({
      success: true,
      data: { isLiked: !isLiked, likes: comment.likes.length },
    });
});

/**
 * Reply to an offer comment.
 * POST /api/offers/:offerId/comments/:commentId/reply
 */
export const replyToComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { commentId } = req.params;
    const { text } = req.body;

    if (!text || text.trim().length < 1) {
      return res.status(400).json({ success: false, error: 'Reply text is required' });
    }

    const comment = await OfferComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    comment.replies.push({
      user: new mongoose.Types.ObjectId(userId),
      text: text.trim(),
      likes: [],
      createdAt: new Date(),
    } as any);
    await comment.save();

    const reply = comment.replies[comment.replies.length - 1];

    res.status(201).json({
      success: true,
      data: {
        id: reply._id,
        text: reply.text,
        createdAt: reply.createdAt,
      },
    });
});

/**
 * Get user's offer comments with moderation status.
 * GET /api/offers/comments/my-comments
 */
export const getMyComments = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { page = 1, limit = 20, status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter: any = { user: userId };
    if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
      filter.moderationStatus = status;
    }

    const [comments, total] = await Promise.all([
      OfferComment.find(filter)
        .populate('offer', 'title description store')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OfferComment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        comments: comments.map((c: any) => ({
          id: c._id,
          text: c.text,
          moderationStatus: c.moderationStatus,
          coinsAwarded: c.coinsAwarded,
          qualityScore: c.qualityScore,
          likes: c.likes?.length || 0,
          offer: c.offer ? { id: c.offer._id, title: c.offer.title } : null,
          createdAt: c.createdAt,
        })),
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + comments.length < total,
        },
      },
    });
});

/**
 * Moderate an offer comment (admin/merchant).
 * PATCH /api/offers/comments/:commentId/moderate
 */
export const moderateComment = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id || (req as any).user?._id;
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { commentId } = req.params;
    const { action, notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be approve or reject' });
    }

    const comment = await OfferComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    if (comment.moderationStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'Comment has already been moderated' });
    }

    if (action === 'approve') {
      comment.moderationStatus = 'approved';
    } else {
      comment.moderationStatus = 'rejected';
    }

    comment.moderatedBy = new mongoose.Types.ObjectId(adminId);
    if (notes) comment.moderationNotes = notes;
    await comment.save();

    // Credit or reject pending coin reward
    try {
      const { PendingCoinReward } = require('../models/PendingCoinReward');
      const pendingReward = await PendingCoinReward.findOne({
        user: comment.user,
        source: 'offer_comment',
        referenceId: comment._id,
        status: 'pending',
      }).lean();

      if (pendingReward) {
        if (action === 'approve') {
          await pendingReward.approve(new mongoose.Types.ObjectId(adminId), notes);
          await pendingReward.creditCoins();
          comment.coinsAwarded = pendingReward.coins;
          await comment.save();
          await engagementRewardService.updateRewardStatus(pendingReward._id.toString(), 'credited');
        } else {
          await pendingReward.reject(new mongoose.Types.ObjectId(adminId), notes || 'Comment rejected');
          await engagementRewardService.updateRewardStatus(pendingReward._id.toString(), 'rejected');
        }
      }
    } catch (rewardError) {
      logger.error('[OFFER COMMENT MODERATION] Failed to update reward:', rewardError);
    }

    res.status(200).json({
      success: true,
      message: `Comment ${action}d successfully`,
      data: {
        id: comment._id,
        moderationStatus: comment.moderationStatus,
        coinsAwarded: comment.coinsAwarded,
      },
    });
});

/**
 * Get pending comments for moderation (admin).
 * GET /api/offers/comments/pending
 */
export const getPendingComments = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { moderationStatus: 'pending' };

    const [comments, total] = await Promise.all([
      OfferComment.find(filter)
        .populate('user', 'firstName lastName profilePicture')
        .populate('offer', 'title description')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OfferComment.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        comments: comments.map((c: any) => ({
          id: c._id,
          text: c.text,
          qualityScore: c.qualityScore,
          user: c.user ? {
            id: c.user._id,
            name: `${c.user.firstName || ''} ${c.user.lastName || ''}`.trim(),
            avatar: c.user.profilePicture,
          } : null,
          offer: c.offer ? { id: c.offer._id, title: c.offer.title } : null,
          createdAt: c.createdAt,
        })),
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + comments.length < total,
        },
      },
    });
});

/**
 * Get active offers available for commenting.
 * GET /api/offers/commentable
 */
export const getCommentableOffers = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const now = new Date();
    const filter: any = {
      $or: [
        { endDate: { $gt: now } },
        { endDate: { $exists: false } },
      ],
      isActive: true,
    };

    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .populate('store', 'name logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Offer.countDocuments(filter),
    ]);

    // Get comment counts per offer
    const offerIds = offers.map(o => o._id);
    const commentCounts = await OfferComment.aggregate([
      { $match: { offer: { $in: offerIds }, moderationStatus: 'approved' } },
      { $group: { _id: '$offer', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(commentCounts.map((c: any) => [c._id.toString(), c.count]));

    res.status(200).json({
      success: true,
      data: {
        offers: offers.map((o: any) => ({
          id: o._id,
          title: o.title || o.name,
          description: o.description,
          store: o.store ? { id: o.store._id, name: o.store.name, logo: o.store.logo } : null,
          commentCount: countMap.get(o._id.toString()) || 0,
          endDate: o.endDate,
        })),
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + offers.length < total,
        },
      },
    });
});
