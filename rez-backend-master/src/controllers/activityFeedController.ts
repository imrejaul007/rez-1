import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import * as activityFeedService from '../services/activityFeedService';

/**
 * Get activity feed for authenticated user
 * GET /api/social/feed
 */
export const getFeed = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const { activities, total } = await activityFeedService.getActivityFeed(userId, page, limit);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: activities,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });
  } catch (error: any) {
    logger.error('Error in getFeed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch activity feed'
    });
  }
});

/**
 * Get user's own activities
 * GET /api/social/users/:userId/activities
 */
export const getUserActivities = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const { activities, total } = await activityFeedService.getUserActivities(userId, page, limit);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: activities,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });
  } catch (error: any) {
    logger.error('Error in getUserActivities:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch user activities'
    });
  }
});

/**
 * Create a new activity
 * POST /api/social/activities
 */
export const createActivity = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type, title, description, amount, icon, color, relatedEntity, metadata } = req.body;

    if (!type || !title) {
      return res.status(400).json({
        success: false,
        error: 'Type and title are required'
      });
    }

    const activity = await activityFeedService.createSocialActivity(userId, type, {
      title,
      description,
      amount,
      icon,
      color,
      relatedEntity,
      metadata
    });

    // Update partner social task progress if activity type is 'share'
    if (type === 'share' || metadata?.action === 'share') {
      try {
        const Partner = require('../models/Partner').default;
        const partner = await Partner.findOne({ userId });

        if (partner) {
          const socialTask = partner.tasks.find((t: any) => t.type === 'social');
          if (socialTask && socialTask.progress.current < socialTask.progress.target) {
            socialTask.progress.current += 1;

            if (socialTask.progress.current >= socialTask.progress.target) {
              socialTask.completed = true;
              socialTask.completedAt = new Date();
            }

            await partner.save();
            logger.info('✅ [SOCIAL] Partner social task updated:', socialTask.progress.current, '/', socialTask.progress.target);
          }
        }
      } catch (error) {
        logger.error('❌ [SOCIAL] Error updating partner social task:', error);
      }
    }

    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error: any) {
    logger.error('Error in createActivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create activity'
    });
  }
});

/**
 * Like/Unlike an activity
 * POST /api/social/activities/:activityId/like
 */
export const likeActivity = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { activityId } = req.params;

    const result = await activityFeedService.toggleLike(activityId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Error in likeActivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to like activity'
    });
  }
});

/**
 * Get comments for an activity
 * GET /api/social/activities/:activityId/comments
 */
export const getComments = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const { comments, total } = await activityFeedService.getActivityComments(activityId, page, limit);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: comments,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });
  } catch (error: any) {
    logger.error('Error in getComments:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch comments'
    });
  }
});

/**
 * Comment on an activity
 * POST /api/social/activities/:activityId/comment
 */
export const commentOnActivity = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { activityId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment cannot be empty'
      });
    }

    const interaction = await activityFeedService.addComment(activityId, userId, comment);

    res.status(201).json({
      success: true,
      data: interaction
    });
  } catch (error: any) {
    logger.error('Error in commentOnActivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add comment'
    });
  }
});

/**
 * Follow/Unfollow a user
 * POST /api/social/users/:userId/follow
 */
export const followUser = asyncHandler(async (req: Request, res: Response) => {
  try {
    const followerId = req.user!.id;
    const { userId } = req.params;

    if (followerId === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot follow yourself'
      });
    }

    const result = await activityFeedService.toggleFollow(followerId, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Error in followUser:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to follow/unfollow user'
    });
  }
});

/**
 * Check if following a user
 * GET /api/social/users/:userId/is-following
 */
export const checkFollowStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    const followerId = req.user!.id;
    const { userId } = req.params;

    const isFollowing = await activityFeedService.isFollowing(followerId, userId);

    res.json({
      success: true,
      data: { isFollowing }
    });
  } catch (error: any) {
    logger.error('Error in checkFollowStatus:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check follow status'
    });
  }
});

/**
 * Get user's followers
 * GET /api/social/users/:userId/followers
 */
export const getFollowers = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const { followers, total } = await activityFeedService.getFollowers(userId, page, limit);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: followers,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });
  } catch (error: any) {
    logger.error('Error in getFollowers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch followers'
    });
  }
});

/**
 * Get user's following list
 * GET /api/social/users/:userId/following
 */
export const getFollowing = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const { following, total } = await activityFeedService.getFollowing(userId, page, limit);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: following,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });
  } catch (error: any) {
    logger.error('Error in getFollowing:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch following list'
    });
  }
});

/**
 * Get follow counts for a user
 * GET /api/social/users/:userId/follow-counts
 */
export const getFollowCounts = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const counts = await activityFeedService.getFollowCounts(userId);

    res.json({
      success: true,
      data: counts
    });
  } catch (error: any) {
    logger.error('Error in getFollowCounts:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch follow counts'
    });
  }
});

/**
 * Get suggested users to follow
 * GET /api/social/suggested-users
 */
export const getSuggestedUsers = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const suggestedUsers = await activityFeedService.getSuggestedUsers(userId, limit);

    res.json({
      success: true,
      data: suggestedUsers
    });
  } catch (error: any) {
    logger.error('Error in getSuggestedUsers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch suggested users'
    });
  }
});

/**
 * Share an activity
 * POST /api/social/activities/:activityId/share
 */
export const shareActivity = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { activityId } = req.params;

    await activityFeedService.shareActivity(activityId, userId);

    res.json({
      success: true,
      message: 'Activity shared successfully'
    });
  } catch (error: any) {
    logger.error('Error in shareActivity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to share activity'
    });
  }
});

/**
 * Get activity statistics
 * GET /api/social/activities/:activityId/stats
 */
export const getActivityStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { activityId } = req.params;

    const stats = await activityFeedService.getActivityStats(activityId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('Error in getActivityStats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch activity stats'
    });
  }
});
