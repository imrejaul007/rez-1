import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { authMiddleware } from '../middleware/merchantauth';
import { validateRequest, validateQuery, validateParams } from '../middleware/merchantvalidation';
import ProductGallery, { IProductGallery } from '../models/ProductGallery';
import { Product } from '../models/Product';
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
    cb(null, `product-gallery-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// File filter for images only (no videos per requirements)
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;

  const extname = path.extname(file.originalname).toLowerCase();
  const mimetype = file.mimetype;

  const isImage = allowedImageTypes.test(extname) && mimetype.startsWith('image/');

  if (isImage) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for images
  },
});

// Validation schemas
const uploadGalleryItemSchema = Joi.object({
  category: Joi.string().valid('main', 'variant', 'lifestyle', 'details', 'packaging', 'general').required(),
  title: Joi.string().max(200).optional(),
  description: Joi.string().max(1000).optional(),
  variantId: Joi.string().max(100).optional(),
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
  category: Joi.string().valid('main', 'variant', 'lifestyle', 'details', 'packaging', 'general').optional(),
  variantId: Joi.string().max(100).optional(),
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
 * @route   POST /api/merchant/products/:productId/gallery
 * @desc    Upload a single product image
 * @access  Private (Merchant)
 */
router.post(
  '/:productId/gallery',
  validateParams(Joi.object({ productId: Joi.string().required() })),
  upload.single('file'),
  validateRequest(uploadGalleryItemSchema),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const merchantId = req.merchantId!;
      const { category, title, description, variantId, tags: tagsRaw, order, isVisible, isCover } = req.body;

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

      // Verify product ownership
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this product');
      }

      if (!req.file) {
        return sendBadRequest(res, 'No file uploaded');
      }

      // Upload to Cloudinary (using product image upload method)
      const result = await CloudinaryService.uploadProductImage(
        req.file.path,
        merchantId,
        productId
      );

      // Get current max order for this category
      const maxOrderItem = await ProductGallery.findOne({
        productId,
        category: category.toLowerCase(),
        deletedAt: { $exists: false },
      }).sort({ order: -1 }).lean();

      const itemOrder = order !== undefined ? parseInt(order) : (maxOrderItem?.order || 0) + 1;

      // If setting as cover, unset other covers
      if (isCover === 'true' || isCover === true) {
        await ProductGallery.updateMany(
          {
            productId,
            _id: { $ne: new mongoose.Types.ObjectId() },
            deletedAt: { $exists: false },
          },
          { $set: { isCover: false } }
        );
      }

      // Create gallery item
      const galleryItem = new ProductGallery({
        productId,
        merchantId,
        url: result.secure_url,
        publicId: result.public_id,
        type: 'image',
        category: category.toLowerCase(),
        title: title || undefined,
        description: description || undefined,
        variantId: variantId || undefined,
        tags: tags,
        order: itemOrder,
        isVisible: isVisible !== 'false' && isVisible !== false,
        isCover: isCover === 'true' || isCover === true,
        uploadedAt: new Date(),
      });

      await galleryItem.save();

      // Clean up temp file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return sendSuccess(res, {
        id: galleryItem._id,
        url: galleryItem.url,
        type: galleryItem.type,
        category: galleryItem.category,
        title: galleryItem.title,
        description: galleryItem.description,
        variantId: galleryItem.variantId,
        tags: galleryItem.tags,
        order: galleryItem.order,
        isVisible: galleryItem.isVisible,
        isCover: galleryItem.isCover,
        views: galleryItem.views,
        likes: galleryItem.likes,
        shares: galleryItem.shares,
        uploadedAt: galleryItem.uploadedAt,
      }, 'Product image uploaded successfully');
    } catch (error: any) {
      // Clean up temp file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      logger.error('❌ Product gallery upload error:', error);
      return sendError(res, error.message || 'Failed to upload product image', 500);
    }
  }
);

/**
 * @route   POST /api/merchant/products/:productId/gallery/bulk
 * @desc    Upload multiple product images at once
 * @access  Private (Merchant)
 */
router.post(
  '/:productId/gallery/bulk',
  validateParams(Joi.object({ productId: Joi.string().required() })),
  upload.array('files', 20), // Max 20 files
  validateRequest(Joi.object({
    category: Joi.string().valid('main', 'variant', 'lifestyle', 'details', 'packaging', 'general').required(),
    title: Joi.string().max(200).optional(),
    titles: Joi.alternatives().try(Joi.array().items(Joi.string().max(200)), Joi.string()).optional(),
    description: Joi.string().max(1000).optional(),
    variantId: Joi.string().max(100).optional(),
    tags: Joi.alternatives().try(Joi.array().items(Joi.string().max(50)), Joi.string()).optional(),
    isVisible: Joi.boolean().optional(),
    isCover: Joi.boolean().optional(),
  })),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const merchantId = req.merchantId!;
      const { category, title: singleTitle, titles: titlesRaw, description, variantId, tags: tagsRaw, isVisible, isCover } = req.body;

      // Parse titles
      let titles: string[] | undefined;
      if (titlesRaw) {
        if (Array.isArray(titlesRaw)) {
          titles = titlesRaw;
        } else if (typeof titlesRaw === 'string') {
          try {
            titles = JSON.parse(titlesRaw);
          } catch {
            titles = [titlesRaw];
          }
        }
      }

      // Parse tags
      let tags: string[] | undefined;
      if (tagsRaw) {
        if (Array.isArray(tagsRaw)) {
          tags = tagsRaw;
        } else if (typeof tagsRaw === 'string') {
          try {
            tags = JSON.parse(tagsRaw);
          } catch {
            tags = tagsRaw.split(',').map((t: string) => t.trim()).filter((t: string) => t.length > 0);
          }
        }
      }

      // Verify product ownership
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this product');
      }

      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return sendBadRequest(res, 'No files uploaded');
      }

      const files = req.files as Express.Multer.File[];
      const uploadedItems: any[] = [];
      const failedItems: any[] = [];

      // Get current max order for this category
      const maxOrderItem = await ProductGallery.findOne({
        productId,
        category: category.toLowerCase(),
        deletedAt: { $exists: false },
      }).sort({ order: -1 }).lean();

      let currentOrder = maxOrderItem?.order || 0;

      // Upload files sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // Upload to Cloudinary
          const result = await CloudinaryService.uploadProductImage(
            file.path,
            merchantId,
            productId
          );

          currentOrder += 1;

          // Determine title
          let itemTitle: string | undefined;
          if (titles && Array.isArray(titles) && titles[i]) {
            itemTitle = titles[i];
          } else if (singleTitle) {
            itemTitle = singleTitle;
          }

          // Create gallery item
          const galleryItem = new ProductGallery({
            productId,
            merchantId,
            url: result.secure_url,
            publicId: result.public_id,
            type: 'image',
            category: category.toLowerCase(),
            title: itemTitle,
            description: description || undefined,
            variantId: variantId || undefined,
            tags: tags || undefined,
            order: currentOrder,
            isVisible: isVisible !== 'false' && isVisible !== false && isVisible !== undefined ? isVisible : true,
            isCover: isCover === 'true' || isCover === true ? (i === 0) : false,
            uploadedAt: new Date(),
          });

          await galleryItem.save();

          uploadedItems.push({
            id: galleryItem._id,
            url: galleryItem.url,
            type: galleryItem.type,
            title: galleryItem.title,
          });

          // Clean up temp file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (error: any) {
          logger.error(`❌ Failed to upload file ${i + 1}:`, error);
          failedItems.push({
            fileName: file.originalname,
            error: error.message,
          });

          // Clean up temp file on error
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      return sendSuccess(res, {
        uploaded: uploadedItems,
        failed: failedItems,
        totalUploaded: uploadedItems.length,
        totalFailed: failedItems.length,
      }, `Successfully uploaded ${uploadedItems.length} of ${files.length} images`);
    } catch (error: any) {
      logger.error('❌ Bulk upload error:', error);
      return sendError(res, error.message || 'Failed to upload images', 500);
    }
  }
);

/**
 * @route   GET /api/merchant/products/:productId/gallery
 * @desc    Get all gallery items for a product
 * @access  Private (Merchant)
 */
router.get(
  '/:productId/gallery',
  validateParams(Joi.object({ productId: Joi.string().required() })),
  validateQuery(Joi.object({
    category: Joi.string().valid('main', 'variant', 'lifestyle', 'details', 'packaging', 'general', 'all').optional(),
    variantId: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    offset: Joi.number().integer().min(0).optional(),
    includeDeleted: Joi.boolean().optional(),
  })),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const merchantId = req.merchantId!;
      const { category, variantId, limit = 50, offset = 0, includeDeleted } = req.query;

      // Verify product ownership
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to view this product');
      }

      // Build query
      const query: any = { productId: new mongoose.Types.ObjectId(productId) };
      if (!includeDeleted) {
        query.deletedAt = { $exists: false };
      }
      if (category && category !== 'all') {
        query.category = category.toString().toLowerCase();
      }
      if (variantId) {
        query.variantId = variantId;
      }

      // Get items
      const items = await ProductGallery.find(query)
        .sort({ order: 1, uploadedAt: -1 })
        .limit(parseInt(limit as string))
        .skip(parseInt(offset as string))
        .lean();

      // Get total count
      const totalCount = await ProductGallery.countDocuments(query);

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
          isVisible: item.isVisible,
          isCover: item.isCover,
          views: item.views,
          likes: item.likes,
          shares: item.shares,
          uploadedAt: item.uploadedAt,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        total: totalCount,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      }, 'Gallery items retrieved successfully');
    } catch (error: any) {
      logger.error('❌ Get gallery error:', error);
      return sendError(res, error.message || 'Failed to retrieve gallery items', 500);
    }
  }
);

/**
 * @route   GET /api/merchant/products/:productId/gallery/categories
 * @desc    Get category statistics for product gallery
 * @access  Private (Merchant)
 */
router.get(
  '/:productId/gallery/categories',
  validateParams(Joi.object({ productId: Joi.string().required() })),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const merchantId = req.merchantId!;

      // Verify product ownership
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to view this product');
      }

      const categories = await ProductGallery.aggregate([
        {
          $match: {
            productId: new mongoose.Types.ObjectId(productId),
            deletedAt: { $exists: false },
            isVisible: true,
          },
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            coverImage: {
              $first: {
                $cond: [{ $eq: ['$isCover', true] }, '$url', null],
              },
            },
          },
        },
        {
          $project: {
            name: '$_id',
            count: 1,
            coverImage: 1,
            _id: 0,
          },
        },
        {
          $sort: { name: 1 },
        },
      ]);

      return sendSuccess(res, categories, 'Categories retrieved successfully');
    } catch (error: any) {
      logger.error('❌ Get categories error:', error);
      return sendError(res, error.message || 'Failed to retrieve categories', 500);
    }
  }
);

/**
 * @route   GET /api/merchant/products/:productId/gallery/:itemId
 * @desc    Get a single gallery item
 * @access  Private (Merchant)
 */
router.get(
  '/:productId/gallery/:itemId',
  validateParams(Joi.object({
    productId: Joi.string().required(),
    itemId: Joi.string().required(),
  })),
  async (req: Request, res: Response) => {
    try {
      const { productId, itemId } = req.params;
      const merchantId = req.merchantId!;

      // Verify product ownership
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to view this product');
      }

      const item = await ProductGallery.findOne({
        _id: itemId,
        productId,
        deletedAt: { $exists: false },
      }).lean();

      if (!item) {
        return sendNotFound(res, 'Gallery item not found');
      }

      return sendSuccess(res, {
        id: item._id,
        url: item.url,
        type: item.type,
        category: item.category,
        title: item.title,
        description: item.description,
        variantId: item.variantId,
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
      }, 'Gallery item retrieved successfully');
    } catch (error: any) {
      logger.error('❌ Get gallery item error:', error);
      return sendError(res, error.message || 'Failed to retrieve gallery item', 500);
    }
  }
);

/**
 * @route   PUT /api/merchant/products/:productId/gallery/:itemId
 * @desc    Update gallery item metadata
 * @access  Private (Merchant)
 */
router.put(
  '/:productId/gallery/:itemId',
  validateParams(Joi.object({
    productId: Joi.string().required(),
    itemId: Joi.string().required(),
  })),
  validateRequest(updateGalleryItemSchema),
  async (req: Request, res: Response) => {
    try {
      const { productId, itemId } = req.params;
      const merchantId = req.merchantId!;
      const updates = req.body;

      // Verify product ownership
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this product');
      }

      const item = await ProductGallery.findOne({
        _id: itemId,
        productId,
        deletedAt: { $exists: false },
      });

      if (!item) {
        return sendNotFound(res, 'Gallery item not found');
      }

      // Update fields
      if (updates.title !== undefined) item.title = updates.title;
      if (updates.description !== undefined) item.description = updates.description;
      if (updates.category !== undefined) item.category = updates.category.toLowerCase();
      if (updates.variantId !== undefined) item.variantId = updates.variantId;
      if (updates.tags !== undefined) item.tags = updates.tags;
      if (updates.order !== undefined) item.order = updates.order;
      if (updates.isVisible !== undefined) item.isVisible = updates.isVisible;

      // Handle cover image
      if (updates.isCover !== undefined && updates.isCover && !item.isCover) {
        // Unset other covers
        await ProductGallery.updateMany(
          {
            productId,
            _id: { $ne: itemId },
            deletedAt: { $exists: false },
          },
          { $set: { isCover: false } }
        );
        item.isCover = true;
      } else if (updates.isCover !== undefined) {
        item.isCover = updates.isCover;
      }

      await item.save();

      return sendSuccess(res, {
        id: item._id,
        url: item.url,
        type: item.type,
        category: item.category,
        title: item.title,
        description: item.description,
        variantId: item.variantId,
        tags: item.tags,
        order: item.order,
        isVisible: item.isVisible,
        isCover: item.isCover,
      }, 'Gallery item updated successfully');
    } catch (error: any) {
      logger.error('❌ Update gallery item error:', error);
      return sendError(res, error.message || 'Failed to update gallery item', 500);
    }
  }
);

/**
 * @route   PUT /api/merchant/products/:productId/gallery/:itemId/set-cover
 * @desc    Set an image as the cover/main product image
 * @access  Private (Merchant)
 */
router.put(
  '/:productId/gallery/:itemId/set-cover',
  validateParams(Joi.object({
    productId: Joi.string().required(),
    itemId: Joi.string().required(),
  })),
  async (req: Request, res: Response) => {
    try {
      const { productId, itemId } = req.params;
      const merchantId = req.merchantId!;

      // Verify product ownership
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this product');
      }

      const item = await ProductGallery.findOne({
        _id: itemId,
        productId,
        deletedAt: { $exists: false },
      });

      if (!item) {
        return sendNotFound(res, 'Gallery item not found');
      }

      // Unset all other covers
      await ProductGallery.updateMany(
        {
          productId,
          _id: { $ne: itemId },
          deletedAt: { $exists: false },
        },
        { $set: { isCover: false } }
      );

      // Set this as cover
      item.isCover = true;
      await item.save();

      return sendSuccess(res, {
        id: item._id,
        isCover: item.isCover,
      }, 'Cover image set successfully');
    } catch (error: any) {
      logger.error('❌ Set cover error:', error);
      return sendError(res, error.message || 'Failed to set cover image', 500);
    }
  }
);

/**
 * @route   PUT /api/merchant/products/:productId/gallery/reorder
 * @desc    Reorder gallery items
 * @access  Private (Merchant)
 */
router.put(
  '/:productId/gallery/reorder',
  validateParams(Joi.object({ productId: Joi.string().required() })),
  validateRequest(reorderGalleryItemsSchema),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const merchantId = req.merchantId!;
      const { items } = req.body;

      // Verify product ownership
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this product');
      }

      // Update order for each item
      const updatePromises = items.map(({ id, order }: any) =>
        ProductGallery.findOneAndUpdate(
          {
            _id: id,
            productId,
            deletedAt: { $exists: false },
          },
          { order },
          { new: true }
        )
      );

      await Promise.all(updatePromises);

      return sendSuccess(res, null, 'Gallery items reordered successfully');
    } catch (error: any) {
      logger.error('❌ Reorder error:', error);
      return sendError(res, error.message || 'Failed to reorder gallery items', 500);
    }
  }
);

/**
 * @route   DELETE /api/merchant/products/:productId/gallery/:itemId
 * @desc    Delete a single gallery item
 * @access  Private (Merchant)
 */
router.delete(
  '/:productId/gallery/:itemId',
  validateParams(Joi.object({
    productId: Joi.string().required(),
    itemId: Joi.string().required(),
  })),
  async (req: Request, res: Response) => {
    try {
      const { productId, itemId } = req.params;
      const merchantId = req.merchantId!;

      // Verify product ownership
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this product');
      }

      const item = await ProductGallery.findOne({
        _id: itemId,
        productId,
        deletedAt: { $exists: false },
      });

      if (!item) {
        return sendNotFound(res, 'Gallery item not found');
      }

      // Delete from Cloudinary
      try {
        await CloudinaryService.deleteFile(item.publicId);
      } catch (error) {
        logger.warn('⚠️ Failed to delete from Cloudinary:', error);
        // Continue with database deletion even if Cloudinary fails
      }

      // Soft delete
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
 * @route   DELETE /api/merchant/products/:productId/gallery/bulk
 * @desc    Delete multiple gallery items
 * @access  Private (Merchant)
 */
router.delete(
  '/:productId/gallery/bulk',
  validateParams(Joi.object({ productId: Joi.string().required() })),
  validateRequest(bulkDeleteSchema),
  async (req: Request, res: Response) => {
    try {
      const { productId } = req.params;
      const merchantId = req.merchantId!;
      const { itemIds } = req.body;

      // Verify product ownership
      const product = await Product.findById(productId).lean() as any;
      if (!product) {
        return sendNotFound(res, 'Product not found');
      }

      if (product.merchantId?.toString() !== merchantId.toString()) {
        return sendBadRequest(res, 'You do not have permission to manage this product');
      }

      // Find items
      const items = await ProductGallery.find({
        _id: { $in: itemIds },
        productId,
        deletedAt: { $exists: false },
      }).lean();

      if (items.length === 0) {
        return sendNotFound(res, 'No gallery items found');
      }

      // Delete from Cloudinary
      const deletePromises = items.map(item =>
        CloudinaryService.deleteFile(item.publicId).catch((error: any) => {
          logger.warn(`⚠️ Failed to delete ${item.publicId} from Cloudinary:`, error);
        })
      );

      await Promise.all(deletePromises);

      // Soft delete
      await ProductGallery.updateMany(
        { _id: { $in: itemIds }, productId },
        {
          $set: {
            deletedAt: new Date(),
            isVisible: false,
          },
        }
      );

      return sendSuccess(res, {
        deletedCount: items.length,
      }, `Successfully deleted ${items.length} gallery item(s)`);
    } catch (error: any) {
      logger.error('❌ Bulk delete error:', error);
      return sendError(res, error.message || 'Failed to delete gallery items', 500);
    }
  }
);

export default router;
