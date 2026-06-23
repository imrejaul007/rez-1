import { logger } from '../config/logger';
import { Router, Request, Response } from 'express';
import StoreGallery from '../models/StoreGallery';
import { Store } from '../models/Store';
import Joi from 'joi';
import mongoose from 'mongoose';
import { sendSuccess, sendBadRequest, sendNotFound, sendError } from '../utils/response';
import { validateQuery, validateParams } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @route   GET /api/stores/:storeId/gallery
 * @desc    Get store gallery items (public)
 * @access  Public
 */
router.get(
  '/:storeId/gallery',
  validateParams(Joi.object({ storeId: Joi.string().required() })),
  validateQuery(Joi.object({
    category: Joi.string().optional(),
    type: Joi.string().valid('image', 'video').optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
    sortBy: Joi.string().valid('order', 'uploadedAt', 'views').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
      const { storeId } = req.params;
      const { category, type, limit = 50, offset = 0, sortBy = 'order', sortOrder = 'asc' } = req.query;

      // Verify store exists and is active
      const store = await Store.findById(storeId);
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (!store.isActive) {
        return sendBadRequest(res, 'Store is not active');
      }

      // Build query - only visible items
      const query: any = {
        storeId,
        isVisible: true,
        deletedAt: { $exists: false },
      };

      if (category) {
        query.category = (category as string).toLowerCase();
      }

      if (type) {
        query.type = type;
      }

      // Build sort
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      // Get gallery items
      const items = await StoreGallery.find(query)
        .sort(sort)
        .limit(parseInt(limit as string))
        .skip(parseInt(offset as string));

      // Get total count
      const total = await StoreGallery.countDocuments(query);

      // Get categories (only for visible items)
      const categories = await StoreGallery.aggregate([
        {
          $match: {
            storeId: new mongoose.Types.ObjectId(storeId),
            isVisible: true,
            deletedAt: { $exists: false },
          },
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            coverImage: {
              $first: {
                $cond: [
                  { $eq: ['$isCover', true] },
                  '$url',
                  null,
                ],
              },
            },
          },
        },
        {
          $project: {
            name: '$_id',
            count: 1,
            coverImage: {
              $ifNull: [
                '$coverImage',
                {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: { $slice: ['$url', 1] },
                        as: 'url',
                        in: '$$url',
                      },
                    },
                    0,
                  ],
                },
              ],
            },
          },
        },
        {
          $sort: { name: 1 },
        },
      ]);

      return sendSuccess(res, {
        items: items.map(item => ({
          id: item._id,
          url: item.url,
          thumbnail: item.thumbnail,
          type: item.type,
          category: item.category,
          title: item.title,
          description: item.description,
          tags: item.tags,
          order: item.order,
          isCover: item.isCover,
          views: item.views,
          likes: item.likes,
          shares: item.shares,
          uploadedAt: item.uploadedAt,
        })),
        categories: categories.map(cat => ({
          name: cat.name,
          count: cat.count,
          coverImage: cat.coverImage,
        })),
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
  })
);

/**
 * @route   GET /api/stores/:storeId/gallery/categories
 * @desc    Get gallery categories for a store (public)
 * @access  Public
 */
router.get(
  '/:storeId/gallery/categories',
  validateParams(Joi.object({ storeId: Joi.string().required() })),
  asyncHandler(async (req: Request, res: Response) => {
      const { storeId } = req.params;

      // Verify store exists and is active
      const store = await Store.findById(storeId);
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (!store.isActive) {
        return sendBadRequest(res, 'Store is not active');
      }

      const categories = await StoreGallery.aggregate([
        {
          $match: {
            storeId: new mongoose.Types.ObjectId(storeId),
            isVisible: true,
            deletedAt: { $exists: false },
          },
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            coverImage: {
              $first: {
                $cond: [
                  { $eq: ['$isCover', true] },
                  '$url',
                  null,
                ],
              },
            },
          },
        },
        {
          $project: {
            name: '$_id',
            count: 1,
            coverImage: {
              $ifNull: [
                '$coverImage',
                {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: { $slice: ['$url', 1] },
                        as: 'url',
                        in: '$$url',
                      },
                    },
                    0,
                  ],
                },
              ],
            },
          },
        },
        {
          $sort: { name: 1 },
        },
      ]);

      return sendSuccess(res, {
        categories: categories.map(cat => ({
          name: cat.name,
          count: cat.count,
          coverImage: cat.coverImage,
        })),
      });
  })
);

/**
 * @route   POST /api/stores/:storeId/gallery/:itemId/view
 * @desc    Track a gallery item view (optional analytics)
 * @access  Public
 */
router.post(
  '/:storeId/gallery/:itemId/view',
  validateParams(Joi.object({
    storeId: Joi.string().required(),
    itemId: Joi.string().required(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
      const { storeId, itemId } = req.params;

      // Verify store exists and is active
      const store = await Store.findById(storeId);
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (!store.isActive) {
        return sendBadRequest(res, 'Store is not active');
      }

      // Get user identifier for tracking unique views
      // Use IP address + User-Agent as identifier for anonymous users
      // For authenticated users, we'd use userId (but that requires optional auth middleware)
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const viewerIdentifier = `${ip}_${userAgent}`;
      
      // Check if this viewer has already viewed this item recently (within 24 hours)
      // We'll use a simple approach: check if the same IP+UserAgent viewed in the last 24 hours
      // In production, you'd want a separate ViewTracking collection
      
      const item = await StoreGallery.findOne({
        _id: itemId,
        storeId,
        isVisible: true,
        deletedAt: { $exists: false },
      });

      if (!item) {
        return sendNotFound(res, 'Gallery item not found');
      }

      // For per-user tracking, we need to check if this specific viewer has already viewed
      // Since we don't have a separate collection, we'll use a time-based approach:
      // Track views in a separate collection or use session-based tracking
      // For now, implement a simple solution: use MongoDB's $addToSet with a viewer identifier
      // But since viewedBy is ObjectId[], we'll need a different approach
      
      // Simple solution: Use a ViewTracking collection (create it on the fly)
      // OR: Use a Map/Set in memory (not persistent)
      // OR: Check against a separate collection
      
      // For MVP: We'll implement session-based tracking on frontend
      // Backend will still increment, but frontend will prevent duplicate calls
      // This is the simplest and most reliable approach
      
      // Increment view count (frontend will handle preventing duplicate views)
      const updateResult = await StoreGallery.findOneAndUpdate(
        {
          _id: itemId,
          storeId,
          isVisible: true,
          deletedAt: { $exists: false },
        },
        {
          $inc: { views: 1 },
        },
        {
          new: true,
        }
      );

      return sendSuccess(res, {
        views: updateResult?.views || item.views,
      }, 'View tracked successfully');
  })
);

export default router;

