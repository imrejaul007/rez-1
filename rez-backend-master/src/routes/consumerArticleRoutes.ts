// @ts-nocheck
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { title, content, category, tags, isPublic } = req.body;
    const userId = (req as any).user?._id;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    // In production, save to Article model and publish to feed
    // For now, acknowledge and return a mock article ID
    const articleId = new (require('mongoose').Types.ObjectId)();

    res.status(201).json({
      success: true,
      data: {
        _id: articleId,
        title,
        content,
        category,
        tags: tags || [],
        isPublic,
        author: userId,
        status: 'published',
        createdAt: new Date().toISOString(),
      },
      message: 'Article published successfully',
    });
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    // Return articles for the feed
    // In production, filter by visibility, pagination, etc.
    res.json({
      success: true,
      data: [],
      total: 0,
      message: 'Articles retrieved successfully',
    });
  }),
);

router.get(
  '/:articleId',
  asyncHandler(async (req, res) => {
    const { articleId } = req.params;

    // In production, fetch article by ID
    res.json({
      success: true,
      data: null,
      message: 'Article not found',
    });
  }),
);

export default router;
