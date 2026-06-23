// WhatsNew Controller
// Handles API requests for What's New stories feature

import { Request, Response } from 'express';
import { logger } from '../config/logger';
import whatsNewService from '../services/whatsNewService';
import { sendSuccess, sendError, sendNotFound, sendCreated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Get active stories for the current user
 * GET /api/whats-new
 */
export const getActiveStories = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id || (req as any).user?.id;
    const includeViewed = req.query.includeViewed !== 'false';

    const stories = await whatsNewService.getStoriesForUser({
      userId,
      includeViewed,
    });

    sendSuccess(res, stories, 'Stories fetched successfully');
});

/**
 * Get a single story by ID
 * GET /api/whats-new/:id
 */
export const getStoryById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?._id || (req as any).user?.id;

    const story = await whatsNewService.getStoryById(id, userId);

    if (!story) {
      sendNotFound(res, 'Story not found');
      return;
    }

    sendSuccess(res, story, 'Story fetched successfully');
});

/**
 * Track story view
 * POST /api/whats-new/:id/view
 */
export const trackView = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?._id || (req as any).user?.id;

    await whatsNewService.trackView(id, userId);

    sendSuccess(res, null, 'View tracked successfully');
});

/**
 * Track CTA click
 * POST /api/whats-new/:id/click
 */
export const trackClick = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?._id || (req as any).user?.id;

    await whatsNewService.trackClick(id, userId);

    sendSuccess(res, null, 'Click tracked successfully');
});

/**
 * Track story completion
 * POST /api/whats-new/:id/complete
 */
export const trackCompletion = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?._id || (req as any).user?.id;

    await whatsNewService.trackCompletion(id, userId);

    sendSuccess(res, null, 'Completion tracked successfully');
});

/**
 * Get unseen stories count for current user
 * GET /api/whats-new/unseen-count
 */
export const getUnseenCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id || (req as any).user?.id;

    if (!userId) {
      // For non-authenticated users, count all active stories as unseen
      const stories = await whatsNewService.getStoriesForUser({});
      sendSuccess(res, { count: stories.length, hasUnseen: stories.length > 0 }, 'Unseen count fetched');
      return;
    }

    const count = await whatsNewService.getUnseenCount(userId);

    sendSuccess(res, { count, hasUnseen: count > 0 }, 'Unseen count fetched');
});

// ============ ADMIN CONTROLLERS ============

/**
 * Create a new story (Admin)
 * POST /api/admin/whats-new
 */
export const createStory = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id || (req as any).user?.id;

    const {
      title, subtitle, icon, slides, ctaButton,
      validity, targeting, priority,
    } = req.body;

    const storyData = {
      title, subtitle, icon, slides, ctaButton,
      validity, targeting, priority,
      createdBy: userId,
    };

    const story = await whatsNewService.createStory(storyData);

    sendCreated(res, story, 'Story created successfully');
});

/**
 * Update a story (Admin)
 * PUT /api/admin/whats-new/:id
 */
export const updateStory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const {
      title, subtitle, icon, slides, ctaButton,
      validity, targeting, priority,
    } = req.body;

    // Only include defined fields in the update
    const updateData: Record<string, any> = {};
    const allowedFields = {
      title, subtitle, icon, slides, ctaButton,
      validity, targeting, priority,
    };

    for (const [key, value] of Object.entries(allowedFields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const story = await whatsNewService.updateStory(id, updateData);

    if (!story) {
      sendNotFound(res, 'Story not found');
      return;
    }

    sendSuccess(res, story, 'Story updated successfully');
});

/**
 * Delete a story (Admin) - Soft delete
 * DELETE /api/admin/whats-new/:id
 */
export const deleteStory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const hardDelete = req.query.hard === 'true';

    if (hardDelete) {
      const success = await whatsNewService.hardDeleteStory(id);
      if (!success) {
        sendNotFound(res, 'Story not found');
        return;
      }
      sendSuccess(res, null, 'Story permanently deleted');
    } else {
      const story = await whatsNewService.deleteStory(id);
      if (!story) {
        sendNotFound(res, 'Story not found');
        return;
      }
      sendSuccess(res, story, 'Story deactivated successfully');
    }
});

/**
 * Get all stories with analytics (Admin)
 * GET /api/admin/whats-new
 */
export const getAllStories = asyncHandler(async (req: Request, res: Response) => {
    const stories = await whatsNewService.getAllStoriesWithAnalytics();

    sendSuccess(res, stories, 'Stories fetched successfully');
});

/**
 * Get analytics summary (Admin)
 * GET /api/admin/whats-new/analytics
 */
export const getAnalyticsSummary = asyncHandler(async (req: Request, res: Response) => {
    const summary = await whatsNewService.getAnalyticsSummary();

    sendSuccess(res, summary, 'Analytics summary fetched successfully');
});
