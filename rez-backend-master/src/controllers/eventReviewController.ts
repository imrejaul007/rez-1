import { Request, Response } from 'express';
import mongoose from 'mongoose';
import EventReview from '../models/EventReview';
import { logger } from '../config/logger';
import Event from '../models/Event';
import EventBooking from '../models/EventBooking';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Get reviews for an event
 * GET /api/events/:id/reviews
 */
export const getEventReviews = asyncHandler(async (req: Request, res: Response) => {
    const { id: eventId } = req.params;
    const { page = 1, limit = 10, sortBy = 'newest' } = req.query;

    // Validate eventId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID',
      });
    }

    // Check if event exists
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Build sort query
    let sortQuery: any = { createdAt: -1 }; // default: newest
    switch (sortBy) {
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'highest':
        sortQuery = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortQuery = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sortQuery = { helpfulCount: -1, createdAt: -1 };
        break;
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Get reviews
    const [reviews, total] = await Promise.all([
      EventReview.find({ eventId, status: 'approved' })
        .populate('userId', 'firstName lastName profilePicture')
        .sort(sortQuery)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      EventReview.countDocuments({ eventId, status: 'approved' }),
    ]);

    // Calculate rating distribution
    const ratingDistribution = await EventReview.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId), status: 'approved' } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingDistribution.forEach((item) => {
      distribution[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        reviews: reviews.map((review: any) => ({
          id: review._id,
          rating: review.rating,
          title: review.title,
          review: review.review,
          helpfulCount: review.helpfulCount,
          isVerifiedBooking: review.isVerifiedBooking,
          createdAt: review.createdAt,
          user: review.userId
            ? {
                id: review.userId._id,
                name: `${review.userId.firstName || ''} ${review.userId.lastName || ''}`.trim() || 'Anonymous',
                profilePicture: review.userId.profilePicture,
              }
            : { name: 'Anonymous' },
          response: review.response,
        })),
        pagination: {
          current: pageNum,
          pages: Math.ceil(total / limitNum),
          total,
          hasMore: skip + reviews.length < total,
        },
        summary: {
          averageRating: event.rating || 0,
          totalReviews: event.reviewCount || 0,
          distribution,
        },
      },
    });
});

/**
 * Submit a review for an event
 * POST /api/events/:id/reviews
 * Requires authentication and verified booking
 */
export const submitReview = async (req: Request, res: Response) => {
  try {
    const { id: eventId } = req.params;
    const userId = (req as any).user?.id || (req as any).user?._id;
    const { rating, title, review } = req.body;

    // Validate user
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Validate eventId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID',
      });
    }

    // Validate required fields
    if (!rating || !title || !review) {
      return res.status(400).json({
        success: false,
        error: 'Rating, title, and review are required',
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
    }

    // Validate title length
    if (title.trim().length < 3 || title.trim().length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Title must be between 3 and 100 characters',
      });
    }

    // Validate review length
    if (review.trim().length < 10 || review.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        error: 'Review must be between 10 and 2000 characters',
      });
    }

    // Check if event exists
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    // Check if user already reviewed this event
    const existingReview = await EventReview.findOne({ eventId, userId }).lean();
    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: 'You have already reviewed this event',
      });
    }

    // Check if user has a confirmed/completed booking for this event
    const booking = await EventBooking.findOne({
      eventId,
      userId,
      status: { $in: ['confirmed', 'completed'] },
    }).lean();

    const isVerifiedBooking = !!booking;

    // Create review
    const newReview = new EventReview({
      eventId,
      userId,
      bookingId: booking?._id,
      rating: Math.round(rating),
      title: title.trim(),
      review: review.trim(),
      isVerifiedBooking,
      status: 'approved', // Auto-approve reviews
    });

    await newReview.save();

    // The post-save hook in EventReview model will update the event's rating

    // Award coins for event rating via engagement reward service
    let coinReward = null;
    try {
      const engagementRewardService = require('../services/engagementRewardService').default;
      const rewardResult = await engagementRewardService.grantReward(
        userId.toString(),
        'event_rating',
        eventId,
        {
          reviewId: newReview._id,
          rating: newReview.rating,
          isVerifiedBooking,
          eventName: event.title,
        }
      );
      if (rewardResult.success) {
        coinReward = {
          coinsAwarded: rewardResult.coinsAwarded,
          status: rewardResult.status,
          message: rewardResult.message,
        };
      }
    } catch (rewardError) {
      logger.error('[EVENT REVIEW] Failed to award engagement coins:', rewardError);
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: {
        id: newReview._id,
        rating: newReview.rating,
        title: newReview.title,
        review: newReview.review,
        isVerifiedBooking: newReview.isVerifiedBooking,
        createdAt: newReview.createdAt,
        coinReward,
      },
    });
  } catch (error: any) {
    logger.error('Error submitting review:', error);

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'You have already reviewed this event',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to submit review',
      message: error.message,
    });
  }
};

/**
 * Update a review
 * PUT /api/events/reviews/:reviewId
 */
export const updateReview = asyncHandler(async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const userId = (req as any).user?.id || (req as any).user?._id;
    const { rating, title, review } = req.body;

    // Validate user
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Validate reviewId
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid review ID',
      });
    }

    // Find review
    const existingReview = await EventReview.findById(reviewId);
    if (!existingReview) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    // Check ownership
    if (existingReview.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only update your own reviews',
      });
    }

    // Update fields
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5',
        });
      }
      existingReview.rating = Math.round(rating);
    }

    if (title !== undefined) {
      if (title.trim().length < 3 || title.trim().length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Title must be between 3 and 100 characters',
        });
      }
      existingReview.title = title.trim();
    }

    if (review !== undefined) {
      if (review.trim().length < 10 || review.trim().length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'Review must be between 10 and 2000 characters',
        });
      }
      existingReview.review = review.trim();
    }

    await existingReview.save();

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: {
        id: existingReview._id,
        rating: existingReview.rating,
        title: existingReview.title,
        review: existingReview.review,
        updatedAt: existingReview.updatedAt,
      },
    });
});

/**
 * Delete a review
 * DELETE /api/events/reviews/:reviewId
 */
export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const userId = (req as any).user?.id || (req as any).user?._id;

    // Validate user
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Validate reviewId
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid review ID',
      });
    }

    // Find review
    const review = await EventReview.findById(reviewId).lean();
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    // Check ownership
    if (review.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own reviews',
      });
    }

    // Store eventId before deletion
    const eventId = review.eventId;

    // Delete review
    await review.deleteOne();

    // Recalculate event rating
    const stats = await (EventReview as any).calculateEventRating(eventId);
    await Event.findByIdAndUpdate(eventId, {
      rating: stats.rating,
      reviewCount: stats.reviewCount,
    });

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
});

/**
 * Mark a review as helpful
 * PUT /api/events/reviews/:reviewId/helpful
 */
export const markReviewHelpful = asyncHandler(async (req: Request, res: Response) => {
    const { reviewId } = req.params;

    // Validate reviewId
    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid review ID',
      });
    }

    // Find and update review
    const review = await EventReview.findByIdAndUpdate(
      reviewId,
      { $inc: { helpfulCount: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Review marked as helpful',
      data: {
        helpfulCount: review.helpfulCount,
      },
    });
});

/**
 * Get user's review for an event
 * GET /api/events/:id/my-review
 */
export const getUserReview = asyncHandler(async (req: Request, res: Response) => {
    const { id: eventId } = req.params;
    const userId = (req as any).user?.id || (req as any).user?._id;

    // Validate user
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    // Validate eventId
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid event ID',
      });
    }

    // Find user's review
    const review = await EventReview.findOne({ eventId, userId }).lean();

    // Check if user can review (has booking)
    const booking = await EventBooking.findOne({
      eventId,
      userId,
      status: { $in: ['confirmed', 'completed'] },
    }).lean();

    res.status(200).json({
      success: true,
      data: {
        review: review
          ? {
              id: review._id,
              rating: review.rating,
              title: review.title,
              review: review.review,
              isVerifiedBooking: review.isVerifiedBooking,
              createdAt: review.createdAt,
              updatedAt: review.updatedAt,
            }
          : null,
        canReview: !review && !!booking, // Can review if no existing review and has booking
        hasBooking: !!booking,
      },
    });
});

export default {
  getEventReviews,
  submitReview,
  updateReview,
  deleteReview,
  markReviewHelpful,
  getUserReview,
};
