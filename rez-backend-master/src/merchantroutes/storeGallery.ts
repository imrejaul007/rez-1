import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { authMiddleware } from '../middleware/merchantauth';
import { validateRequest, validateQuery, validateParams } from '../middleware/merchantvalidation';
import StoreGallery, { IStoreGallery } from '../models/StoreGallery';
import { Store } from '../models/Store';
import CloudinaryService from '../services/CloudinaryService';
import Joi from 'joi';
import mongoose from 'mongoose';
import { sendSuccess, sendBadRequest, sendNotFound, sendError } from '../utils/response';
import { logger } from '../config/logger';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `gallery-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// File filter for images and videos
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedVideoTypes = /mp4|mov|avi|wmv|webm/;

  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  const isImage = allowedImageTypes.test(extname) && mimetype.startsWith('image/');
  const isVideo = allowedVideoTypes.test(extname) && mimetype.startsWith('video/');

  if (isImage || isVideo) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Validation schemas
const uploadGalleryItemSchema = Joi.object({
  category: Joi.string().required().min(1).max(50),
  title: Joi.string().max(200).optional(),
  description: Joi.string().max(1000).optional(),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().max(50)),
    Joi.string().max(500) // Allow string (will be parsed later)
  ).optional(),
  order: Joi.number().integer().min(0).optional(),
  isVisible: Joi.boolean().optional(),
  isCover: Joi.boolean().optional(),
});

const updateGalleryItemSchema = Joi.object({
  title: Joi.string().max(200).optional(),
  description: Joi.string().max(1000).optional(),
  category: Joi.string().min(1).max(50).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  order: Joi.number().integer().min(0).optional(),
  isVisible: Joi.boolean().optional(),
  isCover: Joi.boolean().optional(),
});

const reorderGalleryItemsSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      order: Joi.number().integer().min(0).required(),
    })
  ).min(1).required(),
});

const bulkDeleteSchema = Joi.object({
  itemIds: Joi.array().items(Joi.string()).min(1).required(),
});

/**
 * @route   POST /api/merchant/stores/:storeId/gallery
 * @desc    Upload a single gallery item (image or video)
 * @access  Private (Merchant)
 */
router.post(
  '/:storeId/gallery',
  validateParams(Joi.object({ storeId: Joi.string().required() })),
  upload.single('file'),
  validateRequest(uploadGalleryItemSchema),
  async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;
      const merchantId = req.merchantId!;
      const { category, title, description, tags: tagsRaw, order, isVisible, isCover } = req.body;
      
      // Parse tags - handle both array and JSON string
      let tags: string[] | undefined;
      if (tagsRaw) {
        if (Array.isArray(tagsRaw)) {
          tags = tagsRaw;
        } else if (typeof tagsRaw === 'string') {
          try {
            // Try parsing as JSON first
            if (tagsRaw.startsWith('[') || tagsRaw.startsWith('{')) {
              tags = JSON.parse(tagsRaw);
            } else {
              // If not JSON, treat as comma-separated string
              tags = tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0);
            }
          } catch (e) {
            // If JSON parse fails, treat as comma-separated string
            tags = tagsRaw.split(',').map(t => t.trim()).filter(t => t.length > 0);
          }
        }
      }

      // Verify store ownership
      const store = await Store.findById(storeId).lean();
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (store.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this store');
      }

      if (!req.file) {
        return sendBadRequest(res, 'No file uploaded');
      }

      // Determine file type
      const isVideo = req.file.mimetype.startsWith('video/');
      const fileType = isVideo ? 'video' : 'image';

      // Upload to Cloudinary
      let result;
      let thumbnail: string | undefined;

      if (isVideo) {
        result = await CloudinaryService.uploadStoreGalleryVideo(
          req.file.path,
          merchantId,
          storeId
        );
        // Generate thumbnail for video
        thumbnail = CloudinaryService.generateVideoThumbnail(result.public_id);
      } else {
        result = await CloudinaryService.uploadStoreGalleryImage(
          req.file.path,
          merchantId,
          storeId
        );
      }

      // Get current max order for this category
      const maxOrderItem = await StoreGallery.findOne({
        storeId,
        category: category.toLowerCase(),
        deletedAt: { $exists: false },
      }).sort({ order: -1 }).lean();

      const itemOrder = order !== undefined ? parseInt(order) : (maxOrderItem?.order || 0) + 1;

      // If setting as cover, unset other covers in the same category
      if (isCover === 'true' || isCover === true) {
        await StoreGallery.updateMany(
          {
            storeId,
            category: category.toLowerCase(),
            _id: { $ne: new mongoose.Types.ObjectId() }, // Will be set after creation
            deletedAt: { $exists: false },
          },
          { $set: { isCover: false } }
        );
      }

      // Create gallery item
      const galleryItem = new StoreGallery({
        storeId,
        merchantId,
        url: result.secure_url,
        thumbnail,
        publicId: result.public_id,
        type: fileType,
        category: category.toLowerCase(),
        title: title || undefined,
        description: description || undefined,
        tags: tags,
        order: itemOrder,
        isVisible: isVisible !== 'false' && isVisible !== false,
        isCover: isCover === 'true' || isCover === true,
        uploadedAt: new Date(),
      });

      await galleryItem.save();

      return sendSuccess(res, {
        id: galleryItem._id,
        url: galleryItem.url,
        thumbnail: galleryItem.thumbnail,
        type: galleryItem.type,
        category: galleryItem.category,
        title: galleryItem.title,
        description: galleryItem.description,
        tags: galleryItem.tags,
        order: galleryItem.order,
        isVisible: galleryItem.isVisible,
        isCover: galleryItem.isCover,
        views: galleryItem.views,
        likes: galleryItem.likes,
        shares: galleryItem.shares,
        uploadedAt: galleryItem.uploadedAt,
      }, 'Gallery item uploaded successfully');
    } catch (error: any) {
      // Clean up temp file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      logger.error('❌ Gallery upload error:', error);
      return sendError(res, error.message || 'Failed to upload gallery item', 500);
    }
  }
);

/**
 * @route   POST /api/merchant/stores/:storeId/gallery/bulk
 * @desc    Upload multiple gallery items at once
 * @access  Private (Merchant)
 */
router.post(
  '/:storeId/gallery/bulk',
  validateParams(Joi.object({ storeId: Joi.string().required() })),
  upload.array('files', 20), // Max 20 files
  validateRequest(Joi.object({
    category: Joi.string().required().min(1).max(50),
    title: Joi.string().max(200).optional(), // Single title for all items
    titles: Joi.alternatives().try(Joi.array().items(Joi.string().max(200)), Joi.string()).optional(), // Per-item titles (overrides title)
    description: Joi.string().max(1000).optional(),
    tags: Joi.alternatives().try(Joi.array().items(Joi.string().max(50)), Joi.string()).optional(),
    isVisible: Joi.boolean().optional(),
    isCover: Joi.boolean().optional(),
  })),
  async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;
      const merchantId = req.merchantId!;
      const { category, title: singleTitle, titles: titlesRaw, description, tags: tagsRaw, isVisible, isCover } = req.body;
      
      // Parse titles - prioritize per-item titles array, fallback to single title
      let titles: string[] | undefined;
      if (titlesRaw) {
        // If per-item titles array is provided, use that
        if (Array.isArray(titlesRaw)) {
          titles = titlesRaw;
        } else if (typeof titlesRaw === 'string') {
          try {
            titles = JSON.parse(titlesRaw);
          } catch {
            // If JSON parse fails, treat as single title
            titles = [titlesRaw];
          }
        }
      } else if (singleTitle) {
        // If no per-item titles but single title is provided, use it for all items
        titles = undefined; // Will use singleTitle directly in the loop
      }

      // Parse tags - handle both array and JSON string
      let tags: string[] | undefined;
      if (tagsRaw) {
        if (Array.isArray(tagsRaw)) {
          tags = tagsRaw;
        } else if (typeof tagsRaw === 'string') {
          try {
            tags = JSON.parse(tagsRaw);
          } catch {
            // If JSON parse fails, treat as comma-separated string
            tags = tagsRaw.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
          }
        }
      }

      // Verify store ownership
      const store = await Store.findById(storeId).lean();
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (store.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this store');
      }

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return sendBadRequest(res, 'No files uploaded');
      }

      const files = req.files as Express.Multer.File[];
      const uploadedItems: any[] = [];
      const failedItems: any[] = [];

      // Get current max order for this category
      const maxOrderItem = await StoreGallery.findOne({
        storeId,
        category: category.toLowerCase(),
        deletedAt: { $exists: false },
      }).sort({ order: -1 }).lean();

      let currentOrder = maxOrderItem?.order || 0;

      // Upload files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const isVideo = file.mimetype.startsWith('video/');
          const fileType = isVideo ? 'video' : 'image';

          // Upload to Cloudinary
          let result;
          let thumbnail: string | undefined;

          if (isVideo) {
            result = await CloudinaryService.uploadStoreGalleryVideo(
              file.path,
              merchantId,
              storeId
            );
            thumbnail = CloudinaryService.generateVideoThumbnail(result.public_id);
          } else {
            result = await CloudinaryService.uploadStoreGalleryImage(
              file.path,
              merchantId,
              storeId
            );
          }

          currentOrder += 1;

          // Determine title: use per-item title if available, otherwise use single title for all
          let itemTitle: string | undefined;
          if (titles && Array.isArray(titles) && titles[i]) {
            itemTitle = titles[i];
          } else if (singleTitle) {
            itemTitle = singleTitle;
          }

          // Create gallery item
          const galleryItem = new StoreGallery({
            storeId,
            merchantId,
            url: result.secure_url,
            thumbnail,
            publicId: result.public_id,
            type: fileType,
            category: category.toLowerCase(),
            title: itemTitle,
            description: description || undefined,
            tags: tags || undefined,
            order: currentOrder,
            isVisible: isVisible !== 'false' && isVisible !== false && isVisible !== undefined ? isVisible : true,
            isCover: isCover === 'true' || isCover === true ? (i === 0) : false, // Only first item can be cover
            uploadedAt: new Date(),
          });
          
          logger.info(`✅ [Backend] Created gallery item ${i + 1}/${files.length}:`, {
            title: itemTitle,
            category: category.toLowerCase(),
            hasDescription: !!description,
            hasTags: !!tags,
          });

          await galleryItem.save();

          uploadedItems.push({
            id: galleryItem._id,
            url: galleryItem.url,
            thumbnail: galleryItem.thumbnail,
            type: galleryItem.type,
            title: galleryItem.title,
          });
        } catch (error: any) {
          logger.error(`❌ Failed to upload file ${i + 1}:`, error);
          failedItems.push({
            filename: file.originalname,
            error: error.message,
          });
        } finally {
          // Clean up temp file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      return sendSuccess(res, {
        items: uploadedItems,
        uploaded: uploadedItems.length,
        failed: failedItems.length,
        failedItems,
      }, `${uploadedItems.length} items uploaded successfully`);
    } catch (error: any) {
      // Clean up temp files on error
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file: any) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }

      logger.error('❌ Bulk gallery upload error:', error);
      return sendError(res, error.message || 'Failed to upload gallery items', 500);
    }
  }
);

/**
 * @route   GET /api/merchant/stores/:storeId/gallery
 * @desc    Get store gallery items
 * @access  Private (Merchant)
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
  async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;
      const merchantId = req.merchantId!;
      const { category, type, limit = 50, offset = 0, sortBy = 'order', sortOrder = 'asc' } = req.query;

      // Verify store ownership
      const store = await Store.findById(storeId).lean();
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (store.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to view this store');
      }

      // Build query
      const query: any = {
        storeId,
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
        .skip(parseInt(offset as string))
        .lean();

      // Get total count
      const total = await StoreGallery.countDocuments(query);

      // Get categories
      const categories = await StoreGallery.aggregate([
        {
          $match: {
            storeId: new mongoose.Types.ObjectId(storeId),
            deletedAt: { $exists: false },
          },
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            name: '$_id',
            count: 1,
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
          isVisible: item.isVisible,
          isCover: item.isCover,
          views: item.views,
          likes: item.likes,
          shares: item.shares,
          uploadedAt: item.uploadedAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        categories: categories.map(cat => ({
          name: cat.name,
          count: cat.count,
        })),
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });
    } catch (error: any) {
      logger.error('❌ Get gallery error:', error);
      return sendError(res, error.message || 'Failed to get gallery items', 500);
    }
  }
);

/**
 * @route   GET /api/merchant/stores/:storeId/gallery/categories
 * @desc    Get gallery categories for a store
 * @access  Private (Merchant)
 */
router.get(
  '/:storeId/gallery/categories',
  validateParams(Joi.object({ storeId: Joi.string().required() })),
  async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;
      const merchantId = req.merchantId!;

      // Verify store ownership
      const store = await Store.findById(storeId).lean();
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (store.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to view this store');
      }

      const categories = await StoreGallery.aggregate([
        {
          $match: {
            storeId: new mongoose.Types.ObjectId(storeId),
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
    } catch (error: any) {
      logger.error('❌ Get gallery categories error:', error);
      return sendError(res, error.message || 'Failed to get gallery categories', 500);
    }
  }
);

/**
 * @route   GET /api/merchant/stores/:storeId/gallery/:itemId
 * @desc    Get a single gallery item
 * @access  Private (Merchant)
 */
router.get(
  '/:storeId/gallery/:itemId',
  validateParams(Joi.object({
    storeId: Joi.string().required(),
    itemId: Joi.string().required(),
  })),
  async (req: Request, res: Response) => {
    try {
      const { storeId, itemId } = req.params;
      const merchantId = req.merchantId!;

      // Verify store ownership
      const store = await Store.findById(storeId).lean();
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (store.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to view this store');
      }

      const item = await StoreGallery.findOne({
        _id: itemId,
        storeId,
        deletedAt: { $exists: false },
      }).lean();

      if (!item) {
        return sendNotFound(res, 'Gallery item not found');
      }

      return sendSuccess(res, {
        id: item._id,
        url: item.url,
        thumbnail: item.thumbnail,
        type: item.type,
        category: item.category,
        title: item.title,
        description: item.description,
        tags: item.tags,
        order: item.order,
        isVisible: item.isVisible,
        isCover: item.isCover,
        views: item.views,
        likes: item.likes,
        shares: item.shares,
        uploadedAt: item.uploadedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
    } catch (error: any) {
      logger.error('❌ Get gallery item error:', error);
      return sendError(res, error.message || 'Failed to get gallery item', 500);
    }
  }
);

/**
 * @route   PUT /api/merchant/stores/:storeId/gallery/:itemId
 * @desc    Update a gallery item
 * @access  Private (Merchant)
 */
router.put(
  '/:storeId/gallery/:itemId',
  validateParams(Joi.object({
    storeId: Joi.string().required(),
    itemId: Joi.string().required(),
  })),
  validateRequest(updateGalleryItemSchema),
  async (req: Request, res: Response) => {
    try {
      const { storeId, itemId } = req.params;
      const merchantId = req.merchantId!;
      const { title, description, category, tags, order, isVisible, isCover } = req.body;

      // Verify store ownership
      const store = await Store.findById(storeId).lean();
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (store.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this store');
      }

      const item = await StoreGallery.findOne({
        _id: itemId,
        storeId,
        deletedAt: { $exists: false },
      });

      if (!item) {
        return sendNotFound(res, 'Gallery item not found');
      }

      // Update fields
      if (title !== undefined) item.title = title || undefined;
      if (description !== undefined) item.description = description || undefined;
      if (category !== undefined) item.category = category.toLowerCase();
      if (tags !== undefined) item.tags = tags || undefined;
      if (order !== undefined) item.order = parseInt(order);
      if (isVisible !== undefined) item.isVisible = isVisible;
      if (isCover !== undefined) {
        item.isCover = isCover;
        // If setting as cover, unset other covers in the same category
        if (isCover) {
          await StoreGallery.updateMany(
            {
              storeId,
              category: item.category,
              _id: { $ne: item._id },
              deletedAt: { $exists: false },
            },
            { $set: { isCover: false } }
          );
        }
      }

      await item.save();

      return sendSuccess(res, {
        id: item._id,
        url: item.url,
        thumbnail: item.thumbnail,
        type: item.type,
        category: item.category,
        title: item.title,
        description: item.description,
        tags: item.tags,
        order: item.order,
        isVisible: item.isVisible,
        isCover: item.isCover,
        views: item.views,
        likes: item.likes,
        shares: item.shares,
        uploadedAt: item.uploadedAt,
        updatedAt: item.updatedAt,
      }, 'Gallery item updated successfully');
    } catch (error: any) {
      logger.error('❌ Update gallery item error:', error);
      return sendError(res, error.message || 'Failed to update gallery item', 500);
    }
  }
);

/**
 * @route   PUT /api/merchant/stores/:storeId/gallery/reorder
 * @desc    Reorder gallery items
 * @access  Private (Merchant)
 */
router.put(
  '/:storeId/gallery/reorder',
  validateParams(Joi.object({ storeId: Joi.string().required() })),
  validateRequest(reorderGalleryItemsSchema),
  async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;
      const merchantId = req.merchantId!;
      const { items } = req.body;

      // Verify store ownership
      const store = await Store.findById(storeId).lean();
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (store.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this store');
      }

      // Update orders
      const updatePromises = items.map((item: { id: string; order: number }) =>
        StoreGallery.updateOne(
          {
            _id: item.id,
            storeId,
            deletedAt: { $exists: false },
          },
          { $set: { order: item.order } }
        )
      );

      await Promise.all(updatePromises);

      return sendSuccess(res, null, 'Gallery items reordered successfully');
    } catch (error: any) {
      logger.error('❌ Reorder gallery items error:', error);
      return sendError(res, error.message || 'Failed to reorder gallery items', 500);
    }
  }
);

/**
 * @route   PUT /api/merchant/stores/:storeId/gallery/:itemId/set-cover
 * @desc    Set a gallery item as cover image for its category
 * @access  Private (Merchant)
 */
router.put(
  '/:storeId/gallery/:itemId/set-cover',
  validateParams(Joi.object({
    storeId: Joi.string().required(),
    itemId: Joi.string().required(),
  })),
  validateRequest(Joi.object({
    category: Joi.string().optional(),
  })),
  async (req: Request, res: Response) => {
    try {
      const { storeId, itemId } = req.params;
      const merchantId = req.merchantId!;
      const { category } = req.body;

      // Verify store ownership
      const store = await Store.findById(storeId).lean();
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (store.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this store');
      }

      const item = await StoreGallery.findOne({
        _id: itemId,
        storeId,
        deletedAt: { $exists: false },
      });

      if (!item) {
        return sendNotFound(res, 'Gallery item not found');
      }

      const targetCategory = category ? category.toLowerCase() : item.category;

      // Unset other covers in the same category
      await StoreGallery.updateMany(
        {
          storeId,
          category: targetCategory,
          _id: { $ne: item._id },
          deletedAt: { $exists: false },
        },
        { $set: { isCover: false } }
      );

      // Set this item as cover
      item.isCover = true;
      if (category) {
        item.category = targetCategory;
      }
      await item.save();

      return sendSuccess(res, {
        id: item._id,
        isCover: item.isCover,
        category: item.category,
      }, 'Cover image set successfully');
    } catch (error: any) {
      logger.error('❌ Set cover error:', error);
      return sendError(res, error.message || 'Failed to set cover image', 500);
    }
  }
);

/**
 * @route   DELETE /api/merchant/stores/:storeId/gallery/:itemId
 * @desc    Delete a gallery item (soft delete)
 * @access  Private (Merchant)
 */
router.delete(
  '/:storeId/gallery/:itemId',
  validateParams(Joi.object({
    storeId: Joi.string().required(),
    itemId: Joi.string().required(),
  })),
  async (req: Request, res: Response) => {
    try {
      const { storeId, itemId } = req.params;
      const merchantId = req.merchantId!;

      // Verify store ownership
      const store = await Store.findById(storeId).lean();
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (store.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this store');
      }

      const item = await StoreGallery.findOne({
        _id: itemId,
        storeId,
        deletedAt: { $exists: false },
      });

      if (!item) {
        return sendNotFound(res, 'Gallery item not found');
      }

      // Delete from Cloudinary first
      try {
        if (item.type === 'video') {
          await CloudinaryService.deleteVideo(item.publicId);
          // Also delete thumbnail if it exists
          if (item.thumbnail) {
            try {
              const thumbnailPublicId = CloudinaryService.getPublicIdFromUrl(item.thumbnail);
              if (thumbnailPublicId) {
                await CloudinaryService.deleteFile(thumbnailPublicId);
              }
            } catch (thumbError) {
              // Continue even if thumbnail deletion fails
            }
          }
        } else {
          await CloudinaryService.deleteFile(item.publicId);
        }
      } catch (cloudinaryError: any) {
        // Continue with soft delete even if Cloudinary deletion fails
        // This ensures the database is updated even if Cloudinary is temporarily unavailable
      }

      // Soft delete from database
      item.deletedAt = new Date();
      item.isVisible = false;
      await item.save();

      return sendSuccess(res, null, 'Gallery item deleted successfully');
    } catch (error: any) {
      logger.error('❌ Delete gallery item error:', error);
      return sendError(res, error.message || 'Failed to delete gallery item', 500);
    }
  }
);

/**
 * @route   DELETE /api/merchant/stores/:storeId/gallery/bulk
 * @desc    Delete multiple gallery items
 * @access  Private (Merchant)
 */
router.delete(
  '/:storeId/gallery/bulk',
  validateParams(Joi.object({ storeId: Joi.string().required() })),
  validateRequest(bulkDeleteSchema),
  async (req: Request, res: Response) => {
    try {
      const { storeId } = req.params;
      const merchantId = req.merchantId!;
      const { itemIds } = req.body;

      // Verify store ownership
      const store = await Store.findById(storeId).lean();
      if (!store) {
        return sendNotFound(res, 'Store not found');
      }

      if (store.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this store');
      }

      // Get items before deleting to get their publicIds for Cloudinary deletion
      const itemsToDelete = await StoreGallery.find({
        _id: { $in: itemIds },
        storeId,
        deletedAt: { $exists: false },
      });

      // Delete from Cloudinary
      const cloudinaryDeletePromises = itemsToDelete.map(async (item) => {
        try {
          if (item.type === 'video') {
            await CloudinaryService.deleteVideo(item.publicId);
            // Also delete thumbnail if it exists
            if (item.thumbnail) {
              try {
                const thumbnailPublicId = CloudinaryService.getPublicIdFromUrl(item.thumbnail);
                if (thumbnailPublicId) {
                  await CloudinaryService.deleteFile(thumbnailPublicId);
                }
              } catch (thumbError) {
                // Continue even if thumbnail deletion fails
              }
            }
          } else {
            await CloudinaryService.deleteFile(item.publicId);
          }
        } catch (cloudinaryError: any) {
          // Continue with other deletions even if one fails
        }
      });
      await Promise.allSettled(cloudinaryDeletePromises);

      // Soft delete items from database
      const result = await StoreGallery.updateMany(
        {
          _id: { $in: itemIds },
          storeId,
          deletedAt: { $exists: false },
        },
        {
          $set: {
            deletedAt: new Date(),
            isVisible: false,
          },
        }
      );

      return sendSuccess(res, {
        deleted: result.modifiedCount,
      }, `${result.modifiedCount} items deleted successfully`);
    } catch (error: any) {
      logger.error('❌ Bulk delete gallery items error:', error);
      return sendError(res, error.message || 'Failed to delete gallery items', 500);
    }
  }
);

export default router;

