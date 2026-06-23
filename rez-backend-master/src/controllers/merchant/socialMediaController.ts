import { logger } from '../../config/logger';
// Merchant Social Media Controller
// Handles merchant verification of user-submitted social media posts

import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import SocialMediaPost from '../../models/SocialMediaPost';
import { Wallet } from '../../models/Wallet';
import { User } from '../../models/User';
import { Store } from '../../models/Store';
import AuditLog from '../../models/AuditLog';
import { sendSuccess, sendNotFound, sendBadRequest, sendInternalError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

/**
 * GET /api/merchant/social-media-posts
 * List social media posts for merchant's store(s)
 */
export const listSocialMediaPosts = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  const storeId = req.query.storeId as string; // Allow filtering by specific store

  logger.info('\n========================================');
  logger.info('📱 [MERCHANT SOCIAL] LIST POSTS REQUEST');
  logger.info('========================================');
  logger.info('📱 [MERCHANT SOCIAL] Merchant ID:', merchantId);
  logger.info('📱 [MERCHANT SOCIAL] Store ID filter:', storeId || 'none (all stores)');

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status as string;

    // First, get all stores belonging to this merchant
    // NOTE: Store model uses 'merchantId' field, not 'merchant'
    const stores = await Store.find({ merchantId: merchantId }).select('_id name').lean();
    const storeIds = stores.map(s => s._id);

    logger.info('📱 [MERCHANT SOCIAL] Found stores for this merchant:', stores.map(s => ({ id: s._id, name: s.name })));
    logger.info('📱 [MERCHANT SOCIAL] Store IDs:', storeIds);

    // DEBUG: Check ALL social media posts in the system
    const allPosts = await SocialMediaPost.find({}).select('_id user order store status postUrl submittedAt').lean();
    logger.info('📱 [MERCHANT SOCIAL] DEBUG - All posts in system:', allPosts.length);
    allPosts.forEach((p, i) => {
      logger.info(`   Post ${i + 1}: id=${p._id}, store=${p.store}, status=${p.status}`);
    });

    // Build query to filter posts by merchant's stores
    // If specific storeId provided, use that; otherwise use all merchant's stores
    let targetStoreIds = storeIds;
    if (storeId) {
      // Verify the provided storeId belongs to this merchant
      const isValidStore = storeIds.some(id => id.toString() === storeId);
      if (isValidStore) {
        targetStoreIds = [new mongoose.Types.ObjectId(storeId)];
        logger.info('📱 [MERCHANT SOCIAL] Filtering by specific store:', storeId);
      } else {
        logger.info('⚠️ [MERCHANT SOCIAL] Store ID not owned by merchant:', storeId);
      }
    }

    const query: any = {
      store: { $in: targetStoreIds }
    };

    if (status && status !== 'all') {
      query.status = status;
    }

    logger.info('📱 [MERCHANT SOCIAL] Query:', JSON.stringify(query, null, 2));

    const [posts, total] = await Promise.all([
      SocialMediaPost.find(query)
        .populate('user', 'profile.firstName profile.lastName fullName email avatar phone')
        .populate('order', 'orderNumber totals.total createdAt')
        .populate('store', 'name')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SocialMediaPost.countDocuments(query)
    ]);

    logger.info(`📱 [MERCHANT SOCIAL] Found ${posts.length} posts, total: ${total}`);

    // Format posts for response
    const formattedPosts = posts.map(post => {
      // Extract user name from profile
      const userObj = post.user as any;
      const userName = userObj?.fullName ||
        [userObj?.profile?.firstName, userObj?.profile?.lastName].filter(Boolean).join(' ') ||
        'Unknown User';

      return {
        _id: post._id,
        user: {
          _id: userObj?._id,
          name: userName,
          email: userObj?.email,
          avatar: userObj?.avatar,
          phone: userObj?.phone
        },
        order: post.order,
        store: post.store,
        platform: post.platform,
        postUrl: post.postUrl,
        status: post.status,
        cashbackAmount: post.cashbackAmount,
        cashbackPercentage: post.cashbackPercentage,
        submittedAt: post.submittedAt,
        reviewedAt: post.reviewedAt,
        rejectionReason: post.rejectionReason,
        approvalNotes: (post as any).approvalNotes,
        metadata: {
          orderNumber: post.metadata?.orderNumber
        }
      };
    });

    return sendSuccess(res, {
      posts: formattedPosts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    }, 'Social media posts retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [MERCHANT SOCIAL] Error listing posts:', error);
    return sendInternalError(res, error.message);
  }
});

/**
 * GET /api/merchant/social-media-posts/stats
 * Get social media verification statistics for merchant
 */
export const getSocialMediaStats = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;

  logger.info('📱 [MERCHANT SOCIAL] Getting stats for merchant:', merchantId);

  try {
    // Get all stores belonging to this merchant
    // NOTE: Store model uses 'merchantId' field, not 'merchant'
    const stores = await Store.find({ merchantId: merchantId }).select('_id').lean();
    const storeIds = stores.map(s => s._id);

    const stats = await SocialMediaPost.aggregate([
      { $match: { store: { $in: storeIds } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalCashbackAmount: { $sum: '$cashbackAmount' },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$cashbackAmount', 0] }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          approvedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$cashbackAmount', 0] }
          },
          credited: {
            $sum: { $cond: [{ $eq: ['$status', 'credited'] }, 1, 0] }
          },
          creditedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'credited'] }, '$cashbackAmount', 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      totalCashbackAmount: 0,
      pending: 0,
      pendingAmount: 0,
      approved: 0,
      approvedAmount: 0,
      credited: 0,
      creditedAmount: 0,
      rejected: 0
    };

    // Calculate approval rate
    const totalReviewed = result.approved + result.credited + result.rejected;
    const approvalRate = totalReviewed > 0
      ? Math.round(((result.approved + result.credited) / totalReviewed) * 100)
      : 0;

    logger.info('📱 [MERCHANT SOCIAL] Stats:', result);

    return sendSuccess(res, {
      stats: {
        ...result,
        approvalRate
      }
    }, 'Social media statistics retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [MERCHANT SOCIAL] Error getting stats:', error);
    return sendInternalError(res, error.message);
  }
});

/**
 * GET /api/merchant/social-media-posts/:postId
 * Get single social media post details
 */
export const getSocialMediaPost = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  const { postId } = req.params;

  logger.info('📱 [MERCHANT SOCIAL] Getting post:', postId);

  try {
    // Get merchant's stores
    const stores = await Store.find({ merchantId: merchantId }).select('_id').lean();
    const storeIds = stores.map(s => s._id);

    const post = await SocialMediaPost.findOne({
      _id: postId,
      store: { $in: storeIds }
    })
      .populate('user', 'profile.firstName profile.lastName fullName email avatar phone createdAt')
      .populate('order', 'orderNumber totals items createdAt')
      .populate('store', 'name logo')
      .populate('reviewedBy', 'name email')
      .lean();

    if (!post) {
      return sendNotFound(res, 'Social media post not found or does not belong to your store');
    }

    return sendSuccess(res, { post }, 'Social media post retrieved successfully');

  } catch (error: any) {
    logger.error('❌ [MERCHANT SOCIAL] Error getting post:', error);
    return sendInternalError(res, error.message);
  }
});

/**
 * PUT /api/merchant/social-media-posts/:postId/approve
 * Approve a social media post and credit REZ coins to user
 */
export const approveSocialMediaPost = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  const merchantUserId = (req as any).userId;
  const { postId } = req.params;
  const { notes } = req.body;

  logger.info('📱 [MERCHANT SOCIAL] Approving post:', postId);

  // Step 1: Update post status atomically in a transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  let postUserId: string;
  let cashbackAmount: number;
  let postOrderId: any;
  let postPlatform: string;
  let savedPostId: any;
  let reviewedAt: Date;
  let creditedAt: Date;

  try {
    // Get merchant's stores
    const stores = await Store.find({ merchantId: merchantId }).select('_id').lean();
    const storeIds = stores.map(s => s._id);

    // Find and validate post
    const post = await SocialMediaPost.findOne({
      _id: postId,
      store: { $in: storeIds }
    }).session(session);

    if (!post) {
      await session.abortTransaction();
      return sendNotFound(res, 'Social media post not found or does not belong to your store');
    }

    if (post.status !== 'pending') {
      await session.abortTransaction();
      return sendBadRequest(res, `Cannot approve post with status '${post.status}'. Only pending posts can be approved.`);
    }

    // Save post data for coin crediting after transaction
    postUserId = post.user.toString();
    cashbackAmount = post.cashbackAmount;
    postOrderId = post.order;
    postPlatform = post.platform;
    savedPostId = post._id;

    // Update post status to credited
    post.status = 'credited';
    post.reviewedAt = new Date();
    post.creditedAt = new Date();
    post.reviewedBy = merchantUserId ? new Types.ObjectId(merchantUserId) : undefined;
    (post as any).approvalNotes = notes;
    reviewedAt = post.reviewedAt;
    creditedAt = post.creditedAt;

    await post.save({ session });

    // Audit Log
    try {
      await AuditLog.log({
        merchantId: new Types.ObjectId(merchantId),
        merchantUserId: merchantUserId ? new Types.ObjectId(merchantUserId) : new Types.ObjectId('000000000000000000000000'),
        action: 'social_media_post_approved_by_merchant',
        resourceType: 'SocialMediaPost',
        resourceId: post._id as Types.ObjectId,
        details: {
          changes: {
            postUser: post.user,
            platform: post.platform,
            cashbackAmount,
            notes
          }
        },
        ipAddress: (req.ip || req.socket?.remoteAddress || '0.0.0.0') as string,
        userAgent: (req.headers['user-agent'] || 'unknown') as string
      });
    } catch (auditError) {
      logger.error('❌ [MERCHANT SOCIAL] Audit log error (non-fatal):', auditError);
    }

    await session.commitTransaction();
  } catch (error: any) {
    await session.abortTransaction();
    logger.error('❌ [MERCHANT SOCIAL] Error approving post:', error);
    return sendInternalError(res, error.message);
  } finally {
    session.endSession();
  }

  // Step 2: Credit coins via coinService (outside transaction - creates CoinTransaction record)
  // CoinTransaction is the source of truth for wallet balance (auto-synced on /wallet/balance)
  let newBalance = 0;
  try {
    const coinService = require('../../services/coinService');
    const result = await coinService.awardCoins(
      postUserId,
      cashbackAmount,
      'social_share_reward',
      `Social media cashback (${postPlatform}) for order ${postOrderId}`,
      { postId: savedPostId, platform: postPlatform, orderId: postOrderId }
    );
    newBalance = result.newBalance || 0;
    logger.info(`✅ [MERCHANT SOCIAL] Post approved and ${cashbackAmount} REZ coins credited to user via CoinTransaction`);
  } catch (coinError) {
    logger.error('❌ [MERCHANT SOCIAL] Failed to credit coins via coinService:', coinError);
    // Post is already approved - log error but don't fail the response
  }

  return sendSuccess(res, {
    post: {
      id: savedPostId,
      status: 'credited',
      cashbackAmount,
      reviewedAt,
      creditedAt
    },
    walletUpdate: {
      amountCredited: cashbackAmount,
      newBalance
    }
  }, `Post approved! ${cashbackAmount} REZ coins have been credited to the user's wallet.`);
});

/**
 * PUT /api/merchant/social-media-posts/:postId/reject
 * Reject a social media post with reason
 */
export const rejectSocialMediaPost = asyncHandler(async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  const merchantUserId = (req as any).userId;
  const { postId } = req.params;
  const { reason } = req.body;

  logger.info('📱 [MERCHANT SOCIAL] Rejecting post:', postId);

  if (!reason || reason.trim().length === 0) {
    return sendBadRequest(res, 'Rejection reason is required');
  }

  try {
    // Get merchant's stores
    const stores = await Store.find({ merchantId: merchantId }).select('_id').lean();
    const storeIds = stores.map(s => s._id);

    // Find and validate post
    const post = await SocialMediaPost.findOne({
      _id: postId,
      store: { $in: storeIds }
    });

    if (!post) {
      return sendNotFound(res, 'Social media post not found or does not belong to your store');
    }

    if (post.status !== 'pending') {
      return sendBadRequest(res, `Cannot reject post with status '${post.status}'. Only pending posts can be rejected.`);
    }

    // Update post status
    post.status = 'rejected';
    post.reviewedAt = new Date();
    post.reviewedBy = merchantUserId ? new Types.ObjectId(merchantUserId) : undefined;
    post.rejectionReason = reason.trim();

    await post.save();

    // Audit Log
    try {
      await AuditLog.log({
        merchantId: new Types.ObjectId(merchantId),
        merchantUserId: merchantUserId ? new Types.ObjectId(merchantUserId) : new Types.ObjectId('000000000000000000000000'),
        action: 'social_media_post_rejected_by_merchant',
        resourceType: 'SocialMediaPost',
        resourceId: post._id as Types.ObjectId,
        details: {
          changes: {
            postUser: post.user,
            platform: post.platform,
            rejectionReason: reason
          }
        },
        ipAddress: (req.ip || req.socket?.remoteAddress || '0.0.0.0') as string,
        userAgent: (req.headers['user-agent'] || 'unknown') as string
      });
    } catch (auditError) {
      logger.error('❌ [MERCHANT SOCIAL] Audit log error (non-fatal):', auditError);
    }

    logger.info('✅ [MERCHANT SOCIAL] Post rejected:', postId);

    return sendSuccess(res, {
      post: {
        id: post._id,
        status: post.status,
        reviewedAt: post.reviewedAt,
        rejectionReason: post.rejectionReason
      }
    }, 'Post has been rejected.');

  } catch (error: any) {
    logger.error('❌ [MERCHANT SOCIAL] Error rejecting post:', error);
    return sendInternalError(res, error.message);
  }
});
