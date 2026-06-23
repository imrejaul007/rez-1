import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Video } from '../models/Video';
import { logger } from '../config/logger';
import engagementRewardService from '../services/engagementRewardService';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Create a UGC reel — sets contentType to 'ugc', moderationStatus to 'pending',
 * and creates a PendingCoinReward.
 * POST /api/ugc/create
 */
export const createUgcReel = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { title, description, videoUrl, thumbnailUrl, duration, tags, taggedProducts, taggedStores, storeId, category } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ success: false, error: 'Video URL is required' });
    }

    if (!title || title.trim().length < 3) {
      return res.status(400).json({ success: false, error: 'Title must be at least 3 characters' });
    }

    // Create the UGC video (field names must match Video schema)
    const video = await Video.create({
      title: title.trim(),
      description: description?.trim(),
      videoUrl: videoUrl,
      thumbnail: thumbnailUrl || 'https://via.placeholder.com/720x1280?text=Processing',
      creator: new mongoose.Types.ObjectId(userId),
      stores: storeId ? [new mongoose.Types.ObjectId(storeId)] : [],
      products: taggedProducts?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
      contentType: 'ugc',
      category: category || 'review',
      tags: tags || [],
      metadata: {
        duration: Math.max(1, duration || 1),
      },
      processing: {
        status: 'completed',
        originalUrl: videoUrl,
        thumbnailUrl: thumbnailUrl || undefined,
      },
      isPublished: false,     // Not published until moderated
      isApproved: false,
      moderationStatus: 'pending',
    });

    // Grant engagement reward (pending moderation)
    const rewardResult = await engagementRewardService.grantReward(
      userId.toString(),
      'ugc_reel',
      (video._id as any).toString(),
      { title, storeId, duration },
      { videoDuration: duration || 0 }
    );

    res.status(201).json({
      success: true,
      message: 'Reel submitted for review',
      data: {
        id: (video._id as any),
        title: video.title,
        moderationStatus: video.moderationStatus,
        coinReward: rewardResult.success
          ? { coinsAwarded: rewardResult.coinsAwarded, status: rewardResult.status, message: rewardResult.message }
          : null,
      },
    });
});

/**
 * Get user's UGC reels with status.
 * GET /api/ugc/my-reels
 */
export const getMyReels = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [videos, total] = await Promise.all([
      Video.find({ creator: userId, contentType: 'ugc' })
        .populate('stores', 'name logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Video.countDocuments({ creator: userId, contentType: 'ugc' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reels: videos.map((v: any) => ({
          id: v._id,
          title: v.title,
          description: v.description,
          thumbnailUrl: v.processing?.thumbnailUrl || v.thumbnail,
          duration: v.metadata?.duration || 0,
          moderationStatus: v.moderationStatus,
          isPublished: v.isPublished,
          likes: v.engagement?.likes?.length || v.likedBy?.length || 0,
          comments: v.engagement?.comments || 0,
          views: v.engagement?.views || 0,
          shares: v.engagement?.shares || 0,
          store: v.stores?.[0] ? { id: v.stores[0]._id, name: v.stores[0].name, logo: v.stores[0].logo } : null,
          createdAt: v.createdAt,
        })),
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + videos.length < total,
        },
      },
    });
});

/**
 * Get approved UGC feed (public).
 * GET /api/ugc/feed
 */
export const getUgcFeed = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [videos, total] = await Promise.all([
      Video.find({ contentType: 'ugc', isPublished: true, moderationStatus: 'approved' })
        .populate('creator', 'profile.firstName profile.lastName profile.avatar')
        .populate('stores', 'name logo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Video.countDocuments({ contentType: 'ugc', isPublished: true, moderationStatus: 'approved' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reels: videos.map((v: any) => ({
          id: v._id,
          title: v.title,
          description: v.description,
          videoUrl: v.processing?.processedUrl || v.videoUrl,
          thumbnailUrl: v.processing?.thumbnailUrl || v.thumbnail,
          duration: v.metadata?.duration || 0,
          creator: v.creator
            ? {
                id: v.creator._id,
                name: `${v.creator.profile?.firstName || ''} ${v.creator.profile?.lastName || ''}`.trim(),
                avatar: v.creator.profile?.avatar,
              }
            : null,
          store: v.stores?.[0] ? { id: v.stores[0]._id, name: v.stores[0].name, logo: v.stores[0].logo } : null,
          likes: v.engagement?.likes?.length || v.likedBy?.length || 0,
          comments: v.engagement?.comments || 0,
          views: v.engagement?.views || 0,
          shares: v.engagement?.shares || 0,
          tags: v.tags || [],
          createdAt: v.createdAt,
        })),
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + videos.length < total,
        },
      },
    });
});

/**
 * Get pending UGC reels for moderation (admin).
 * GET /api/ugc/pending
 */
export const getPendingReels = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const filter = { contentType: 'ugc', moderationStatus: 'pending' };

    const [videos, total] = await Promise.all([
      Video.find(filter)
        .populate('creator', 'profile.firstName profile.lastName profile.avatar')
        .populate('stores', 'name logo')
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Video.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reels: videos.map((v: any) => ({
          id: v._id,
          title: v.title,
          description: v.description,
          videoUrl: v.videoUrl,
          thumbnailUrl: v.processing?.thumbnailUrl || v.thumbnail,
          duration: v.metadata?.duration || 0,
          creator: v.creator
            ? {
                id: v.creator._id,
                name: `${v.creator.profile?.firstName || ''} ${v.creator.profile?.lastName || ''}`.trim(),
                avatar: v.creator.profile?.avatar,
              }
            : null,
          store: v.stores?.[0] ? { id: v.stores[0]._id, name: v.stores[0].name, logo: v.stores[0].logo } : null,
          tags: v.tags || [],
          createdAt: v.createdAt,
        })),
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + videos.length < total,
        },
      },
    });
});

/**
 * Moderate a UGC reel (admin/merchant).
 * PATCH /api/ugc/:id/moderate
 */
export const moderateUgcReel = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id || (req as any).user?._id;
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;
    const { action, notes, qualityScore } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be approve or reject' });
    }

    const video = await Video.findById(id);
    if (!video || video.contentType !== 'ugc') {
      return res.status(404).json({ success: false, error: 'UGC reel not found' });
    }

    if (video.moderationStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'Reel has already been moderated' });
    }

    if (action === 'approve') {
      video.moderationStatus = 'approved';
      video.isPublished = true;
      video.isApproved = true;
      video.publishedAt = new Date();
    } else {
      video.moderationStatus = 'rejected';
      if (notes) {
        video.moderationReasons = [notes];
      }
    }

    await video.save();

    // Credit or reject the pending coin reward
    try {
      const { PendingCoinReward } = require('../models/PendingCoinReward');
      const pendingReward = await PendingCoinReward.findOne({
        user: video.creator,
        source: 'ugc_reel',
        referenceId: (video._id as any),
        status: 'pending',
      }).lean();

      if (pendingReward) {
        if (action === 'approve') {
          await pendingReward.approve(new mongoose.Types.ObjectId(adminId), notes);
          await pendingReward.creditCoins();
          await engagementRewardService.updateRewardStatus(pendingReward._id.toString(), 'credited');
        } else {
          await pendingReward.reject(new mongoose.Types.ObjectId(adminId), notes || 'Reel rejected');
          await engagementRewardService.updateRewardStatus(pendingReward._id.toString(), 'rejected');
        }
      }
    } catch (rewardError) {
      logger.error('[UGC MODERATION] Failed to update reward:', rewardError);
    }

    res.status(200).json({
      success: true,
      message: `Reel ${action}d successfully`,
      data: {
        id: (video._id as any),
        moderationStatus: video.moderationStatus,
        isPublished: video.isPublished,
      },
    });
});
