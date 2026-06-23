import { Router } from 'express';
import { getVideosByStore } from '../controllers/videoController';
import { optionalAuth, authenticate as authenticateToken } from '../middleware/auth';
import { validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';
import { createUgcReel, getMyReels, getUgcFeed, getPendingReels, moderateUgcReel } from '../controllers/ugcController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * UGC (User Generated Content) Routes
 *
 * These routes provide access to user-generated content (photos and videos).
 */

// User endpoints
router.post('/create', authenticateToken, createUgcReel);
router.get('/my-reels', authenticateToken, getMyReels);

// Public feed
router.get('/feed', optionalAuth, getUgcFeed);

// Admin moderation
router.get('/pending', authenticateToken, getPendingReels);
router.patch('/:id/moderate', authenticateToken, moderateUgcReel);

// Create a UGC post or story (photo-based content)
router.post('/create-post', authenticateToken, asyncHandler(async (req: any, res: any) => {
  const mongoose = await import('mongoose');
  const { Video } = await import('../models/Video');
  const engagementRewardService = (await import('../services/engagementRewardService')).default;

  const userId = req.user?.id || req.user?._id;
  if (!userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const { type, imageUrls, caption, tags, taggedProducts, taggedStores, storeId } = req.body;

  if (!imageUrls || imageUrls.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one image URL is required' });
  }

  if (!type || !['post', 'story'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Type must be "post" or "story"' });
  }

  // Create the UGC post using Video model with ugc_post content type
  const post = await Video.create({
    title: caption?.trim()?.substring(0, 100) || `${type === 'story' ? 'Story' : 'Post'} by user`,
    description: caption?.trim(),
    videoUrl: imageUrls[0], // Primary image
    thumbnail: imageUrls[0],
    creator: new mongoose.Types.ObjectId(userId),
    stores: storeId ? [new mongoose.Types.ObjectId(storeId)] : taggedStores?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
    products: taggedProducts?.map((id: string) => new mongoose.Types.ObjectId(id)) || [],
    contentType: 'ugc',
    category: type, // 'post' or 'story'
    tags: tags || [],
    metadata: {
      imageUrls: imageUrls,
      postType: type,
    },
    processing: {
      status: 'completed',
      originalUrl: imageUrls[0],
      thumbnailUrl: imageUrls[0],
    },
    isPublished: false,
    isApproved: false,
    moderationStatus: 'pending',
  });

  // Grant engagement reward (pending moderation)
  const rewardType = type === 'post' ? 'ugc_post' : 'ugc_story';
  let rewardResult = { success: false, coinsAwarded: 0, status: 'pending', message: '' };
  try {
    rewardResult = await engagementRewardService.grantReward(
      userId.toString(),
      rewardType,
      (post._id as any).toString(),
      { type, storeId, imageCount: imageUrls.length },
      {}
    );
  } catch {
    // Reward grant is best-effort — don't fail the post creation
  }

  res.status(201).json({
    success: true,
    message: `${type === 'story' ? 'Story' : 'Post'} submitted for review`,
    data: {
      id: post._id,
      type,
      moderationStatus: post.moderationStatus,
      coinReward: rewardResult.success
        ? { coinsAwarded: rewardResult.coinsAwarded, status: rewardResult.status, message: rewardResult.message }
        : null,
    },
  });
}));

// Get UGC content for a store
router.get('/store/:storeId',
  optionalAuth,
  validateParams(Joi.object({
    // Accept both ObjectId format and string IDs (for mock data compatibility)
    storeId: Joi.string().trim().min(1).required()
  })),
  validateQuery(Joi.object({
    type: Joi.string().valid('photo', 'video').optional(),
    limit: Joi.number().integer().min(1).max(50).default(20),
    offset: Joi.number().integer().min(0).default(0)
  })),
  getVideosByStore
);

export default router;
