import { logger } from '../config/logger';
import { Router, Request, Response } from 'express';
import ProductGallery from '../models/ProductGallery';
import { Product } from '../models/Product';
import Joi from 'joi';
import mongoose from 'mongoose';
import { sendSuccess, sendBadRequest, sendNotFound, sendError } from '../utils/response';
import { validateQuery, validateParams } from '../middleware/validation';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @route   GET /api/products/:productId/gallery
 * @desc    Get product gallery items (public)
 * @access  Public
 */
router.get(
  '/:productId/gallery',
  validateParams(Joi.object({ productId: Joi.string().required() })),
  validateQuery(Joi.object({
    category: Joi.string().optional(),
    variantId: Joi.string().optional(),
    type: Joi.string().valid('image', 'video').optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
    sortBy: Joi.string().valid('order', 'uploadedAt', 'views').optional(),
    sortOrder: Joi.string().valid('asc', 'desc').optional(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
      const { productId } = req.params;
      const { category, variantId, type, limit = 50, offset = 0, sortBy = 'order', sortOrder = 'asc' } = req.query;

      // Verify product exists (allow viewing gallery even if product is unavailable)
      const product = await Product.findById(productId);
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.isDeleted) {
        return sendBadRequest(res, 'Product has been deleted');
      }

      // Build query - only visible items
      const query: any = {
        productId: new mongoose.Types.ObjectId(productId),
        isVisible: true,
        deletedAt: { $exists: false },
      };

      if (category) {
        query.category = (category as string).toLowerCase();
      }

      if (variantId) {
        query.variantId = variantId;
      }

      if (type) {
        query.type = type;
      }

      // Build sort
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      // Get gallery items
      const items = await ProductGallery.find(query)
        .sort(sort)
        .limit(parseInt(limit as string))
        .skip(parseInt(offset as string));

      // Get total count
      const total = await ProductGallery.countDocuments(query);

      // Get categories (only for visible items)
      const categories = await ProductGallery.aggregate([
        {
          $match: {
            productId: new mongoose.Types.ObjectId(productId),
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
                { $arrayElemAt: ['$url', 0] },
              ],
            },
            _id: 0,
          },
        },
      ]);

      return sendSuccess(res, {
        items: items.map(item => ({
          id: item._id,
          url: item.url,
          type: item.type,
          category: item.category,
          title: item.title,
          description: item.description,
          variantId: item.variantId,
          tags: item.tags,
          order: item.order,
          isCover: item.isCover,
          isVisible: item.isVisible,
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
 * @route   GET /api/products/:productId/gallery/categories
 * @desc    Get product gallery categories with counts (public)
 * @access  Public
 */
router.get(
  '/:productId/gallery/categories',
  validateParams(Joi.object({ productId: Joi.string().required() })),
  asyncHandler(async (req: Request, res: Response) => {
      const { productId } = req.params;

      // Verify product exists
      const product = await Product.findById(productId);
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.isDeleted) {
        return sendBadRequest(res, 'Product has been deleted');
      }

      // Get categories with aggregation
      const categories = await ProductGallery.aggregate([
        {
          $match: {
            productId: new mongoose.Types.ObjectId(productId),
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
              $ifNull: ['$coverImage', null],
            },
            _id: 0,
          },
        },
        {
          $sort: { count: -1 },
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
 * @route   GET /api/products/:productId/gallery/:itemId
 * @desc    Get single product gallery item (public)
 * @access  Public
 */
router.get(
  '/:productId/gallery/:itemId',
  validateParams(Joi.object({
    productId: Joi.string().required(),
    itemId: Joi.string().required(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
      const { productId, itemId } = req.params;

      // Verify product exists
      const product = await Product.findById(productId);
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.isDeleted) {
        return sendBadRequest(res, 'Product has been deleted');
      }

      // Get gallery item
      const item = await ProductGallery.findOne({
        _id: itemId,
        productId,
        isVisible: true,
        deletedAt: { $exists: false },
      });

      if (!item) {
        return sendNotFound(res, 'Gallery item not found');
      }

      // Increment view count (async, don't wait)
      ProductGallery.updateOne(
        { _id: itemId },
        { $inc: { views: 1 } }
      ).catch(err => logger.error('Failed to increment view count:', err));

      return sendSuccess(res, {
        item: {
          id: item._id,
          url: item.url,
          type: item.type,
          category: item.category,
          title: item.title,
          description: item.description,
          variantId: item.variantId,
          tags: item.tags,
          order: item.order,
          isCover: item.isCover,
          isVisible: item.isVisible,
          views: item.views + 1,
          likes: item.likes,
          shares: item.shares,
          uploadedAt: item.uploadedAt,
        },
      });
  })
);

export default router;
