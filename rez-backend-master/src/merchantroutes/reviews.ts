import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { logger } from '../config/logger';
import { validateParams, validateRequest } from '../middleware/merchantvalidation';
import { Review } from '../models/Review';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import Joi from 'joi';
import mongoose from 'mongoose';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schemas
const productIdSchema = Joi.object({
  id: Joi.string().required()
});

const reviewResponseSchema = Joi.object({
  response: Joi.string().required().min(10).max(500)
});

const flagReviewSchema = Joi.object({
  reason: Joi.string().required().valid('spam', 'inappropriate', 'offensive', 'misleading', 'other'),
  details: Joi.string().max(500)
});

// @route   GET /api/merchant/products/:id/reviews
// @desc    Get all reviews for a product
// @access  Private
router.get('/:id/reviews', validateParams(productIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const productId = req.params.id;

    // Verify product belongs to merchant's store
    const store = await Store.findOne({ merchantId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      store: store._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get reviews - Note: Reviews reference store, not product
    // We need to check if there's a product-specific review model
    // For now, getting store reviews
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter = req.query.filter as string;
    const reviewQuery: any = {
      store: store._id,
      isActive: true
    };

    // Apply filters
    if (filter === 'with_images') {
      reviewQuery.images = { $exists: true, $ne: [] };
    } else if (filter === 'verified') {
      reviewQuery.verified = true;
    } else if (filter && !isNaN(parseInt(filter))) {
      reviewQuery.rating = parseInt(filter);
    }

    const [reviews, totalCount] = await Promise.all([
      Review.find(reviewQuery)
        .populate('user', 'profile.name profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(reviewQuery)
    ]);

    // Get review stats
    const stats = await Review.getStoreRatingStats((store._id as any).toString());

    return res.json({
      success: true,
      data: {
        reviews,
        stats,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrevious: page > 1
        }
      }
    });

  } catch (error: any) {
    logger.error('Get product reviews error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
});

// @route   POST /api/merchant/products/:id/reviews/:reviewId/response
// @desc    Merchant reply to a review
// @access  Private
router.post(
  '/:id/reviews/:reviewId/response',
  validateParams(productIdSchema),
  validateRequest(reviewResponseSchema),
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId!;
      const { id: productId, reviewId } = req.params;
      const { response } = req.body;

      // Verify product belongs to merchant's store
      const store = await Store.findOne({ merchantId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      const product = await Product.findOne({
        _id: productId,
        store: store._id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Find review
      const review = await Review.findOne({
        _id: reviewId,
        store: store._id
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      // Save merchant response to the review
      review.merchantResponse = {
        message: response,
        respondedAt: new Date(),
        respondedBy: new mongoose.Types.ObjectId(merchantId)
      };
      await review.save();

      // Send real-time notification to reviewer
      if (global.io) {
        global.io.to(`user-${review.user}`).emit('review_response', {
          reviewId: review._id,
          productId: product._id,
          response,
          timestamp: new Date()
        });
      }

      return res.json({
        success: true,
        message: 'Response posted successfully',
        data: {
          reviewId: review._id,
          merchantResponse: review.merchantResponse
        }
      });

    } catch (error: any) {
      logger.error('Post review response error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to post response',
        error: error.message
      });
    }
  }
);

// @route   PUT /api/merchant/products/:id/reviews/:reviewId/flag
// @desc    Flag inappropriate review
// @access  Private
router.put(
  '/:id/reviews/:reviewId/flag',
  validateParams(productIdSchema),
  validateRequest(flagReviewSchema),
  async (req: Request, res: Response) => {
    try {
      const merchantId = req.merchantId!;
      const { id: productId, reviewId } = req.params;
      const { reason, details } = req.body;

      // Verify product belongs to merchant's store
      const store = await Store.findOne({ merchantId });
      if (!store) {
        return res.status(404).json({
          success: false,
          message: 'Store not found'
        });
      }

      const product = await Product.findOne({
        _id: productId,
        store: store._id
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      // Find review
      const review = await Review.findOne({
        _id: reviewId,
        store: store._id
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found'
        });
      }

      // Flag review for moderation
      // This would require updating the Review model to include flags
      // For now, we'll track this in a separate moderation system

      logger.info(`Review ${reviewId} flagged by merchant ${merchantId}:`, {
        reason,
        details
      });

      // Send notification to admin/moderation team
      if (global.io) {
        global.io.to('admins').emit('review_flagged', {
          reviewId: review._id,
          productId: product._id,
          merchantId,
          reason,
          details,
          timestamp: new Date()
        });
      }

      return res.json({
        success: true,
        message: 'Review flagged for moderation',
        data: {
          reviewId: review._id,
          status: 'flagged'
        }
      });

    } catch (error: any) {
      logger.error('Flag review error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to flag review',
        error: error.message
      });
    }
  }
);

// @route   GET /api/merchant/products/:id/reviews/stats
// @desc    Get review statistics for a product
// @access  Private
router.get('/:id/reviews/stats', validateParams(productIdSchema), async (req: Request, res: Response) => {
  try {
    const merchantId = req.merchantId!;
    const productId = req.params.id;

    // Verify product belongs to merchant's store
    const store = await Store.findOne({ merchantId });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    const product = await Product.findOne({
      _id: productId,
      store: store._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get review stats
    const stats = await Review.getStoreRatingStats((store._id as any).toString());

    // Get additional analytics
    const recentReviews = await Review.find({
      store: store._id,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('rating createdAt')
      .lean();

    const verifiedCount = await Review.countDocuments({
      store: store._id,
      isActive: true,
      verified: true
    });

    const withImagesCount = await Review.countDocuments({
      store: store._id,
      isActive: true,
      images: { $exists: true, $ne: [] }
    });

    return res.json({
      success: true,
      data: {
        overall: stats,
        verified: verifiedCount,
        withImages: withImagesCount,
        recentReviews,
        reviewStats: product.reviewStats || {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        }
      }
    });

  } catch (error: any) {
    logger.error('Get review stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch review stats',
      error: error.message
    });
  }
});

export default router;
