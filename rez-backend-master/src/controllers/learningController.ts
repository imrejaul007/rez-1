import { Request, Response } from 'express';
import learningService from '../services/learningService';
import { sendSuccess, sendError } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * GET /api/learning
 * Get all published learning content (with user progress if authenticated)
 */
export const getContent = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const content = await learningService.getPublishedContent(userId);
    sendSuccess(res, { content });
});

/**
 * GET /api/learning/:slug
 * Get a single content item by slug
 */
export const getContentBySlug = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const content = await learningService.getContentBySlug(req.params.slug, userId);

    if (!content) {
      return sendError(res, 'Content not found', 404);
    }

    sendSuccess(res, { content });
});

/**
 * POST /api/learning/:id/complete
 * Mark content as completed and claim reward
 */
export const completeContent = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const contentId = req.params.id;
    const { timeSpentSeconds } = req.body;

    if (!timeSpentSeconds || timeSpentSeconds < 0) {
      return sendError(res, 'timeSpentSeconds is required and must be positive', 400);
    }

    const result = await learningService.markCompleted(userId, contentId, timeSpentSeconds);
    sendSuccess(res, result);
});
