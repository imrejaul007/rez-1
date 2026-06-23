import { logger } from '../config/logger';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { PhotoUpload } from '../models/PhotoUpload';
import engagementRewardService from '../services/engagementRewardService';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Upload photos — creates a PhotoUpload + PendingCoinReward for moderation.
 * POST /api/photos/upload
 */
export const uploadPhotos = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { photos, caption, taggedProducts, taggedStores, contentType, storeId, productId } = req.body;

    // Validate photos array
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one photo is required' });
    }

    if (photos.length > 10) {
      return res.status(400).json({ success: false, error: 'Maximum 10 photos per upload' });
    }

    // Validate each photo has url and publicId
    for (const photo of photos) {
      if (!photo.url || !photo.publicId) {
        return res.status(400).json({ success: false, error: 'Each photo must have url and publicId' });
      }
    }

    // Create the photo upload
    const photoUpload = await PhotoUpload.create({
      user: new mongoose.Types.ObjectId(userId),
      store: storeId ? new mongoose.Types.ObjectId(storeId) : undefined,
      product: productId ? new mongoose.Types.ObjectId(productId) : undefined,
      photos,
      caption: caption?.trim(),
      taggedProducts: (taggedProducts || []).map((id: string) => new mongoose.Types.ObjectId(id)),
      taggedStores: (taggedStores || []).map((id: string) => new mongoose.Types.ObjectId(id)),
      contentType: contentType || 'store_photo',
      moderationStatus: 'pending',
    });

    // Grant engagement reward (creates PendingCoinReward since moderation required)
    const rewardResult = await engagementRewardService.grantReward(
      userId.toString(),
      'photo_upload',
      (photoUpload._id as any).toString(),
      { photoCount: photos.length, contentType, storeId, productId },
      { photoCount: photos.length }
    );

    res.status(201).json({
      success: true,
      message: 'Photos uploaded successfully. Pending review.',
      data: {
        id: photoUpload._id,
        photos: photoUpload.photos,
        moderationStatus: photoUpload.moderationStatus,
        coinReward: rewardResult.success
          ? { coinsAwarded: rewardResult.coinsAwarded, status: rewardResult.status, message: rewardResult.message }
          : null,
      },
    });
});

/**
 * Get user's photo upload history.
 * GET /api/photos/my-uploads
 */
export const getMyUploads = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || (req as any).user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { page = 1, limit = 20, status } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const query: any = { user: userId };
    if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
      query.moderationStatus = status;
    }

    const [uploads, total] = await Promise.all([
      PhotoUpload.find(query)
        .populate('store', 'name logo')
        .populate('product', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PhotoUpload.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        uploads,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + uploads.length < total,
        },
      },
    });
});

/**
 * Get approved photos for a store (public).
 * GET /api/photos/store/:storeId
 */
export const getStorePhotos = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ success: false, error: 'Invalid store ID' });
    }

    const query = {
      $or: [{ store: storeId }, { taggedStores: storeId }],
      moderationStatus: 'approved',
      isPublic: true,
    };

    const [photos, total] = await Promise.all([
      PhotoUpload.find(query)
        .populate('user', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PhotoUpload.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        photos,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + photos.length < total,
        },
      },
    });
});

/**
 * Moderate a photo upload (admin/merchant).
 * PATCH /api/photos/:id/moderate
 */
export const moderatePhoto = asyncHandler(async (req: Request, res: Response) => {
    const adminId = (req as any).user?.id || (req as any).user?._id;
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { id } = req.params;
    const { action, notes, qualityScore } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Action must be approve or reject' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid photo ID' });
    }

    const photoUpload = await PhotoUpload.findById(id);
    if (!photoUpload) {
      return res.status(404).json({ success: false, error: 'Photo upload not found' });
    }

    if (photoUpload.moderationStatus !== 'pending') {
      return res.status(400).json({ success: false, error: 'Photo has already been moderated' });
    }

    photoUpload.moderationStatus = action === 'approve' ? 'approved' : 'rejected';
    photoUpload.moderatedBy = new mongoose.Types.ObjectId(adminId);
    photoUpload.moderationNotes = notes;
    if (qualityScore !== undefined) {
      photoUpload.qualityScore = qualityScore;
    }

    await photoUpload.save();

    // If approved, credit the pending reward
    if (action === 'approve') {
      try {
        const { PendingCoinReward } = require('../models/PendingCoinReward');
        const pendingReward = await PendingCoinReward.findOne({
          user: photoUpload.user,
          source: 'photo_upload',
          referenceId: photoUpload._id,
          status: 'pending',
        }).lean();

        if (pendingReward) {
          await pendingReward.approve(new mongoose.Types.ObjectId(adminId), notes);
          await pendingReward.creditCoins();
          photoUpload.coinsAwarded = pendingReward.amount;
          await photoUpload.save();

          // Update engagement reward log status
          await engagementRewardService.updateRewardStatus(pendingReward._id.toString(), 'credited');
        }
      } catch (rewardError) {
        logger.error('[PHOTO MODERATION] Failed to credit coins:', rewardError);
      }
    } else {
      // Rejected — update engagement reward log
      try {
        const { PendingCoinReward } = require('../models/PendingCoinReward');
        const pendingReward = await PendingCoinReward.findOne({
          user: photoUpload.user,
          source: 'photo_upload',
          referenceId: photoUpload._id,
          status: 'pending',
        }).lean();

        if (pendingReward) {
          await pendingReward.reject(new mongoose.Types.ObjectId(adminId), notes || 'Photo rejected');
          await engagementRewardService.updateRewardStatus(pendingReward._id.toString(), 'rejected');
        }
      } catch (rewardError) {
        logger.error('[PHOTO MODERATION] Failed to update pending reward:', rewardError);
      }
    }

    res.status(200).json({
      success: true,
      message: `Photo ${action}d successfully`,
      data: {
        id: photoUpload._id,
        moderationStatus: photoUpload.moderationStatus,
        coinsAwarded: photoUpload.coinsAwarded,
      },
    });
});

/**
 * Get pending photos for moderation (admin).
 * GET /api/photos/pending
 */
export const getPendingPhotos = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [photos, total] = await Promise.all([
      PhotoUpload.find({ moderationStatus: 'pending' })
        .populate('user', 'firstName lastName profilePicture')
        .populate('store', 'name logo')
        .populate('taggedStores', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      PhotoUpload.countDocuments({ moderationStatus: 'pending' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        photos,
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + photos.length < total,
        },
      },
    });
});
