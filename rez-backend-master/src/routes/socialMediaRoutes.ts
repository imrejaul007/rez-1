import { logger } from '../config/logger';
// Social Media Routes
// Routes for social media post submissions and cashback tracking

import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import {
  submitPost,
  submitPostWithMedia,
  getUserPosts,
  getUserEarnings,
  getPostById,
  updatePostStatus,
  deletePost,
  getPlatformStats,
  verifyInstagramPost,
  verifyInstagramAccount,
  extractInstagramPostData,
  checkDuplicate,
  checkSharedStatus
} from '../controllers/socialMediaController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';
import { uploadSocialMediaProof } from '../middleware/upload';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// orderId can be a MongoDB ObjectId (24 hex chars) or a StorePayment ID (e.g. SP-MMBVUUPF-SYFZKX)
const orderIdSchema = Joi.alternatives().try(
  commonSchemas.objectId(),
  Joi.string().pattern(/^SP-[A-Z0-9]+-[A-Z0-9]+$/).message('Invalid StorePayment ID format')
);

// Submit a new social media post
router.post('/submit',
  validateBody(Joi.object({
    platform: Joi.string().valid('instagram', 'facebook', 'twitter', 'tiktok').required(),
    postUrl: Joi.string().uri().required(),
    orderId: orderIdSchema,
    // Optional fraud detection metadata from frontend
    fraudMetadata: Joi.object({
      deviceId: Joi.string().optional(),
      trustScore: Joi.number().optional(),
      riskScore: Joi.number().optional(),
      riskLevel: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
      checksPassed: Joi.number().optional(),
      totalChecks: Joi.number().optional(),
      warnings: Joi.array().items(Joi.string()).optional()
    }).optional()
  })),
  submitPost
);

// Submit a social media post with media files (photo/video proof)
router.post('/submit-media',
  uploadSocialMediaProof.array('files', 5),
  validateBody(Joi.object({
    platform: Joi.string().valid('instagram', 'facebook', 'twitter', 'tiktok').required(),
    orderId: orderIdSchema,
    fraudMetadata: Joi.alternatives().try(
      Joi.object({
        deviceId: Joi.string().optional(),
        trustScore: Joi.number().optional(),
        riskScore: Joi.number().optional(),
        riskLevel: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
        checksPassed: Joi.number().optional(),
        totalChecks: Joi.number().optional(),
        warnings: Joi.array().items(Joi.string()).optional()
      }),
      Joi.string() // Allow JSON string from FormData
    ).optional()
  })),
  submitPostWithMedia
);

// Get user's posts
router.get('/posts',
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20), // Increased max to 100
    status: Joi.string().valid('pending', 'approved', 'rejected', 'credited')
  })),
  getUserPosts
);

// Get user's earnings summary
router.get('/earnings',
  getUserEarnings
);

// Check for duplicate post URL
router.post('/check-duplicate',
  validateBody(Joi.object({
    url: Joi.string().uri().optional(),
    postId: Joi.string().optional(),
  })),
  checkDuplicate
);

// Check if user has shared a specific order/payment
router.get('/shared-status',
  validateQuery(Joi.object({
    orderId: Joi.string().required(),
  })),
  checkSharedStatus
);

// Get platform statistics
router.get('/stats',
  getPlatformStats
);

// Get single post by ID
router.get('/posts/:postId',
  validateParams(Joi.object({
    postId: commonSchemas.objectId().required()
  })),
  getPostById
);

// Update post status (Admin only - PROTECTED)
router.patch('/posts/:postId/status',
  requireAdmin, // ✅ Admin verification added
  validateParams(Joi.object({
    postId: commonSchemas.objectId().required()
  })),
  validateBody(Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'credited').required(),
    rejectionReason: Joi.string().max(500).when('status', {
      is: 'rejected',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  })),
  updatePostStatus
);

// Delete a post (user can only delete pending posts)
router.delete('/posts/:postId',
  validateParams(Joi.object({
    postId: commonSchemas.objectId().required()
  })),
  deletePost
);

// ============================================================================
// INSTAGRAM VERIFICATION ENDPOINTS
// ============================================================================

// Verify an Instagram post exists and is accessible
router.post('/instagram/verify-post',
  validateBody(Joi.object({
    url: Joi.string().uri().required(),
    postId: Joi.string().optional(),
    username: Joi.string().optional()
  })),
  verifyInstagramPost
);

// Verify an Instagram account
router.post('/instagram/verify-account',
  validateBody(Joi.object({
    username: Joi.string().required()
  })),
  verifyInstagramAccount
);

// Extract basic data from an Instagram post URL
router.post('/instagram/extract-post-data',
  validateBody(Joi.object({
    url: Joi.string().uri().required(),
    postId: Joi.string().optional()
  })),
  extractInstagramPostData
);

// ============================================================================
// ADMIN FIX: Re-credit social media posts that were marked 'credited' but
// have no CoinTransaction record (one-time fix)
// ============================================================================
router.post('/admin/fix-missing-credits',
  requireAdmin,
  asyncHandler(async (req, res) => {
      const { SocialMediaPost } = require('../models/SocialMediaPost');
      const { CoinTransaction } = require('../models/CoinTransaction');
      const coinService = require('../services/coinService');

      // Find all credited posts
      const creditedPosts = await SocialMediaPost.find({ status: 'credited' }).lean();
      logger.info(`[FIX] Found ${creditedPosts.length} credited social media posts`);

      let fixed = 0;
      let skipped = 0;
      let failed = 0;
      const results: any[] = [];

      for (const post of creditedPosts) {
        // Check if CoinTransaction already exists for this post
        const existingTx = await CoinTransaction.findOne({
          'metadata.postId': post._id,
          source: 'social_share_reward'
        });

        if (existingTx) {
          skipped++;
          continue;
        }

        // Also check by description pattern
        const existingByDesc = await CoinTransaction.findOne({
          user: post.user,
          source: 'social_share_reward',
          description: { $regex: post.order?.toString() || 'nomatch' }
        });

        if (existingByDesc) {
          skipped++;
          continue;
        }

        // No CoinTransaction exists — create one
        try {
          await coinService.awardCoins(
            post.user.toString(),
            post.cashbackAmount,
            'social_share_reward',
            `Social media cashback (${post.platform}) for order ${post.order} [fix]`,
            { postId: post._id, platform: post.platform, orderId: post.order }
          );
          fixed++;
          results.push({
            postId: post._id,
            user: post.user,
            amount: post.cashbackAmount,
            status: 'fixed'
          });
          logger.info(`[FIX] Credited ${post.cashbackAmount} coins to user ${post.user} for post ${post._id}`);
        } catch (err: any) {
          failed++;
          results.push({
            postId: post._id,
            user: post.user,
            amount: post.cashbackAmount,
            status: 'failed',
            error: err.message
          });
          logger.error(`[FIX] Failed for post ${post._id}:`, err.message);
        }
      }

      res.json({
        success: true,
        message: `Fix complete: ${fixed} fixed, ${skipped} already had records, ${failed} failed`,
        data: { total: creditedPosts.length, fixed, skipped, failed, results }
      });
  })
);

export default router;
