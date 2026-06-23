/**
 * Product Routes — Write section (Phase 6.3)
 *
 * Extracted from the original monolithic products.ts. Handles:
 * - POST /, PUT /:id, DELETE /:id (full CRUD)
 * - POST/PUT/DELETE /:id/variants
 */

import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/merchantauth";
import { validateRequest, validateParams } from "../middleware/merchantvalidation";
import { Product } from "../models/Product";
import { Store } from "../models/Store";
import { Category } from "../models/Category";
import { Review } from "../models/Review";
import mongoose, { Types } from "mongoose";
import SMSService from "../services/SMSService";
import { Merchant } from "../models/Merchant";
import AuditService from "../services/AuditService";
import CloudinaryService from "../services/CloudinaryService";
import merchantNotificationService from "../services/merchantNotificationService";
import { productWriteLimiter, productDeleteLimiter } from "../middleware/rateLimiter";
import { sanitizeProductRequest } from "../middleware/sanitization";
import { CacheInvalidator } from "../utils/cacheHelper";
import { logger } from "../config/logger";
import { createProductSchema, updateProductSchema, productIdSchema, generateSKU } from "./productsHelpers";
import { createUserSideProduct, updateUserSideProduct, deleteUserSideProduct } from "./productsUserSideSync";

const router = Router();

router.use(authMiddleware);

// @access  Private
router.post('/', productWriteLimiter, sanitizeProductRequest, validateRequest(createProductSchema), async (req, res) => {
  try {
    const productData = req.body;
    productData.merchantId = req.merchantId;

    // Log images for debugging
    logger.info('📸 Received images:', JSON.stringify(productData.images, null, 2));

    // Handle storeId assignment
    if (productData.storeId) {
      // Validate that the store belongs to this merchant
      const store = await Store.findOne({
        _id: productData.storeId,
        merchantId: req.merchantId
      }).lean();

      if (!store) {
        return res.status(400).json({
          success: false,
          message: 'Store not found or does not belong to this merchant'
        });
      }

      // Convert to ObjectId
      productData.storeId = new mongoose.Types.ObjectId(productData.storeId);
    } else {
      // If no storeId provided, use merchant's active store (backward compatibility)
      const activeStore = await Store.findOne({
        merchantId: req.merchantId,
        isActive: true
      }).sort({ createdAt: 1 }).lean();

      if (activeStore) {
        productData.storeId = activeStore._id;
      } else {
        // Fallback: get any store for this merchant
        const anyStore = await Store.findOne({ merchantId: req.merchantId }).sort({ createdAt: 1 }).lean();
        if (anyStore) {
          productData.storeId = anyStore._id;
        }
      }
    }

    // Handle category conversion if provided (can be string name/slug or ObjectId)
    if (productData.category) {
      if (typeof productData.category === 'string' && !mongoose.Types.ObjectId.isValid(productData.category)) {
        // Category is a string name/slug, need to find the ObjectId
        const category = await Category.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${productData.category}$`, 'i') } },
            { slug: productData.category.toLowerCase() }
          ],
          isActive: true
        }).lean();

        if (!category) {
          logger.info('❌ [CREATE PRODUCT] Category not found:', productData.category);
          return res.status(400).json({
            success: false,
            message: `Category "${productData.category}" not found. Please use a valid category name or ID.`
          });
        }
        
        productData.category = category._id;
        logger.info('✅ [CREATE PRODUCT] Category converted to ObjectId:', category.name, category._id);
      } else if (mongoose.Types.ObjectId.isValid(productData.category)) {
        // Already a valid ObjectId, convert to ObjectId type
        productData.category = new mongoose.Types.ObjectId(productData.category);
      }
    }

    // Handle subcategory conversion if provided (can be string name/slug or ObjectId)
    if (productData.subcategory || productData.subCategory) {
      const subcategoryValue = productData.subcategory || productData.subCategory;
      
      if (typeof subcategoryValue === 'string' && !mongoose.Types.ObjectId.isValid(subcategoryValue)) {
        // Subcategory is a string name/slug, need to find the ObjectId
        const subcategory = await Category.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${subcategoryValue}$`, 'i') } },
            { slug: subcategoryValue.toLowerCase() }
          ],
          isActive: true
        }).lean();

        if (!subcategory) {
          logger.info('❌ [CREATE PRODUCT] Subcategory not found:', subcategoryValue);
          return res.status(400).json({
            success: false,
            message: `Subcategory "${subcategoryValue}" not found. Please use a valid subcategory name or ID.`
          });
        }
        
        productData.subCategory = subcategory._id;
        delete (productData as any).subcategory; // Remove lowercase version if it exists
        logger.info('✅ [CREATE PRODUCT] Subcategory converted to ObjectId:', subcategory.name, subcategory._id);
      } else if (mongoose.Types.ObjectId.isValid(subcategoryValue)) {
        // Already a valid ObjectId, convert to ObjectId type and use subCategory (camelCase)
        productData.subCategory = new mongoose.Types.ObjectId(subcategoryValue);
        delete (productData as any).subcategory; // Remove lowercase version if it exists
      }
    }

    // Convert storeId to store (Product model uses 'store' not 'storeId')
    if (productData.storeId) {
      productData.store = productData.storeId;
      delete (productData as any).storeId;
    }

    // Generate SKU if not provided
    if (!productData.sku) {
      productData.sku = await generateSKU(req.merchantId!, productData.name);
    } else {
      // Check if SKU already exists
      const existingProduct = await Product.findOne({ sku: productData.sku }).lean();
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'SKU already exists'
        });
      }
    }

    // Transform images from objects to array of URLs (Product model expects string[])
    if (productData.images && productData.images.length > 0) {
      const imageUrls = productData.images
        .map((img: any) => {
          if (typeof img === 'string') {
            return img;
          } else if (img && img.url) {
            return img.url;
          }
          return null;
        })
        .filter((url: string | null) => url !== null && url.trim() !== '');
      
      productData.images = imageUrls;
      logger.info('📸 [CREATE PRODUCT] Transformed images to URLs:', imageUrls);
    }

    // Transform pricing from flat structure to nested structure
    // Frontend sends: price, costPrice, compareAtPrice
    // Product model expects: pricing.selling, pricing.original, pricing.cost
    if (productData.price !== undefined) {
      productData.pricing = {
        selling: Number(productData.price),
        original: Number(productData.compareAtPrice || productData.price),
        cost: productData.costPrice ? Number(productData.costPrice) : undefined,
        currency: productData.currency || 'INR',
        discount: productData.compareAtPrice && productData.price
          ? Math.round(((Number(productData.compareAtPrice) - Number(productData.price)) / Number(productData.compareAtPrice)) * 100)
          : 0,
        bulk: []
      };
      
      // Remove old pricing fields
      delete (productData as any).price;
      delete (productData as any).costPrice;
      delete (productData as any).compareAtPrice;
      delete (productData as any).currency; // Already moved to pricing.currency
      
      logger.info('💰 [CREATE PRODUCT] Transformed pricing:', productData.pricing);
    }

    // Generate slug from product name if not provided
    if (!productData.slug && productData.name) {
      const baseSlug = productData.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      // Make slug unique by checking existing slugs and appending number if needed
      let slug = baseSlug;
      let counter = 1;
      let existingProduct = await Product.findOne({ slug }).lean();

      while (existingProduct) {
        slug = `${baseSlug}-${counter}`;
        existingProduct = await Product.findOne({ slug }).lean();
        counter++;
      }
      
      // Add timestamp to ensure uniqueness
      const timestamp = Date.now().toString().slice(-6);
      productData.slug = `${slug}-${timestamp}`;
      
      logger.info('🔗 [CREATE PRODUCT] Generated slug:', productData.slug);
    }

    // Set productType if not provided
    if (!productData.productType) {
      productData.productType = 'product';
    }

    // Map merchant status → isActive boolean for Product model
    if (productData.status) {
      productData.isActive = productData.status === 'active';
    }

    // Ensure inventory structure is correct
    if (productData.inventory) {
      if (productData.inventory.stock === undefined || productData.inventory.stock === null) {
        productData.inventory.stock = 0;
      }
      if (productData.inventory.isAvailable === undefined) {
        productData.inventory.isAvailable = productData.inventory.stock > 0;
      }
      if (productData.inventory.lowStockThreshold === undefined) {
        productData.inventory.lowStockThreshold = 5;
      }
    }

    const product = new Product(productData);
    await product.save();

    // Log saved product images for debugging
    logger.info('💾 Saved merchant product images:', JSON.stringify(product.images, null, 2));
    logger.info('✅ Merchant product created with ID:', product._id);

    // Automatically create product on user side (sync to user Product model)
    let userProductId: string | null = null;
    try {
      await createUserSideProduct(product, req.merchantId!);
      logger.info('✅ Product successfully synced to user-side');
      
      // Get the user-side product ID for cache invalidation
      const UserProduct = require('../models/Product').Product;
      const userProduct = await UserProduct.findOne({
        name: product.name,
        slug: product.slug
      }).lean();
      if (userProduct) {
        userProductId = userProduct._id.toString();
      }
    } catch (syncError: any) {
      // Log error but don't fail the merchant product creation
      logger.error('⚠️ Warning: Failed to sync product to user-side:', syncError.message);
      logger.error('   Product was still created in merchant database');
      // Continue - merchant product creation should succeed even if sync fails
    }

    // P-12: Invalidate product caches so the new product appears immediately.
    // P-13: Failures are logged as warnings but never break the request.
    if (userProductId) {
      CacheInvalidator.invalidateProduct(userProductId).catch((err) => {
        logger.warn('[CACHE-INVALIDATION-WARN] product.created — invalidation failed:', err);
      });
    } else {
      CacheInvalidator.invalidateProductLists().catch((err) => {
        logger.warn('[CACHE-INVALIDATION-WARN] product.created (lists) — invalidation failed:', err);
      });
    }

    // Audit log: Product created
    await AuditService.log({
      merchantId: req.merchantId!,
      action: 'product.created',
      resourceType: 'product',
      resourceId: product._id,
      details: {
        after: product.toObject(),
        metadata: { name: product.name, sku: product.sku }
      },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      severity: 'info'
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${req.merchantId}`).emit('product_created', {
        productId: product._id,
        productName: product.name
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product.toObject ? product.toObject() : product
    });
  } catch (error: any) {
    logger.error('Create product error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'SKU already exists'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
router.put('/:id',
  productWriteLimiter,
  sanitizeProductRequest,
  validateParams(productIdSchema),
  validateRequest(updateProductSchema),
  async (req, res) => {
    try {
      const productId = req.params.id;
      const merchantId = req.merchantId;
      const productData = req.body;

      logger.info('✏️ [UPDATE PRODUCT] Request received:');
      logger.info('   Product ID:', productId);
      logger.info('   Merchant ID:', merchantId);
      
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        logger.info('❌ [UPDATE PRODUCT] Invalid product ID format');
        return res.status(400).json({
          success: false,
          message: 'Invalid product ID format'
        });
      }
      
      // Convert to ObjectId for proper comparison
      const productObjectId = new mongoose.Types.ObjectId(productId);
      const merchantObjectId = new mongoose.Types.ObjectId(merchantId);

      // Find product
      const product = await Product.findOne({
        _id: productObjectId,
        merchantId: merchantObjectId
      });

      if (!product) {
        logger.info('❌ [UPDATE PRODUCT] Product not found');
        
        // Check if product exists but belongs to different merchant
        const productExists = await Product.findById(productObjectId).lean() as any;
        if (productExists) {
          logger.info('   Product exists but belongs to different merchant:', productExists.merchantId?.toString());
        } else {
          logger.info('   Product does not exist at all');
        }
        
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      
      logger.info('✅ [UPDATE PRODUCT] Product found:', product.name);

      // Handle store update if provided (can be storeId or store)
      const storeId = productData.store || productData.storeId;
      if (storeId) {
        // Validate that the store belongs to this merchant
        const store = await Store.findOne({
          _id: storeId,
          merchantId: merchantObjectId
        }).lean();

        if (!store) {
          logger.info('❌ [UPDATE PRODUCT] Store not found or does not belong to merchant');
          return res.status(400).json({
            success: false,
            message: 'Store not found or does not belong to this merchant'
          });
        }
        
        // Convert to ObjectId and set as store (not storeId)
        productData.store = new mongoose.Types.ObjectId(storeId);
        delete (productData as any).storeId; // Remove storeId if it exists
        logger.info('✅ [UPDATE PRODUCT] Store validated:', store.name);
      }

      // Handle category conversion if provided (can be string name/slug or ObjectId)
      if (productData.category) {
        if (typeof productData.category === 'string' && !mongoose.Types.ObjectId.isValid(productData.category)) {
          // Category is a string name/slug, need to find the ObjectId
          const category = await Category.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${productData.category}$`, 'i') } },
              { slug: productData.category.toLowerCase() }
            ],
            isActive: true
          }).lean();

          if (!category) {
            logger.info('❌ [UPDATE PRODUCT] Category not found:', productData.category);
            return res.status(400).json({
              success: false,
              message: `Category "${productData.category}" not found. Please use a valid category name or ID.`
            });
          }
          
          productData.category = category._id;
          logger.info('✅ [UPDATE PRODUCT] Category converted to ObjectId:', category.name, category._id);
        } else if (mongoose.Types.ObjectId.isValid(productData.category)) {
          // Already a valid ObjectId, convert to ObjectId type
          productData.category = new mongoose.Types.ObjectId(productData.category);
        }
      }

      // Handle subcategory conversion if provided (can be string name/slug or ObjectId)
      if (productData.subcategory || productData.subCategory) {
        const subcategoryValue = productData.subcategory || productData.subCategory;
        
        if (typeof subcategoryValue === 'string' && !mongoose.Types.ObjectId.isValid(subcategoryValue)) {
          // Subcategory is a string name/slug, need to find the ObjectId
          const subcategory = await Category.findOne({
            $or: [
              { name: { $regex: new RegExp(`^${subcategoryValue}$`, 'i') } },
              { slug: subcategoryValue.toLowerCase() }
            ],
            isActive: true
          }).lean();

          if (!subcategory) {
            logger.info('❌ [UPDATE PRODUCT] Subcategory not found:', subcategoryValue);
            return res.status(400).json({
              success: false,
              message: `Subcategory "${subcategoryValue}" not found. Please use a valid subcategory name or ID.`
            });
          }
          
          productData.subCategory = subcategory._id;
          delete (productData as any).subcategory; // Remove lowercase version if it exists
          logger.info('✅ [UPDATE PRODUCT] Subcategory converted to ObjectId:', subcategory.name, subcategory._id);
        } else if (mongoose.Types.ObjectId.isValid(subcategoryValue)) {
          // Already a valid ObjectId, convert to ObjectId type and use subCategory (camelCase)
          productData.subCategory = new mongoose.Types.ObjectId(subcategoryValue);
          delete (productData as any).subcategory; // Remove lowercase version if it exists
        }
      }

      // Check SKU uniqueness if being updated
      if (productData.sku && productData.sku !== product.sku) {
        const existingProduct = await Product.findOne({ sku: productData.sku }).lean();
        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: 'SKU already exists'
          });
        }
      }

      // Handle image updates - Product schema expects array of strings (URLs)
      if (productData.images) {
        logger.info('📸 [UPDATE PRODUCT] Received images:', JSON.stringify(productData.images, null, 2));
        
        // Transform images array to array of URLs (strings)
        // If images are objects with url property, extract just the URLs
        // If images are already strings, use them as-is
        const imageUrls = productData.images
          .map((img: any) => {
            if (typeof img === 'string') {
              return img;
            } else if (img && img.url) {
              return img.url;
            }
            return null;
          })
          .filter((url: string | null) => url !== null && url.trim() !== '');
        
        logger.info('📸 [UPDATE PRODUCT] Transformed images to URLs:', imageUrls);
        productData.images = imageUrls;
      }

      // Map merchant status → isActive boolean for Product model
      if (productData.status) {
        productData.isActive = productData.status === 'active';
      }

      // Update product - only assign explicitly allowed fields (prevent mass assignment)
      const allowedFields = [
        'name', 'description', 'shortDescription', 'brand', 'sku', 'barcode',
        'price', 'pricing', 'images', 'category', 'subcategory', 'tags',
        'searchKeywords', 'inventory', 'variants', 'attributes', 'specifications',
        'isActive', 'status', 'seo', 'dimensions', 'weight', 'dietary',
      ];

      const fieldsToUpdate: any = { updatedAt: new Date() };
      for (const key of allowedFields) {
        if (productData[key] !== undefined) {
          fieldsToUpdate[key] = productData[key];
        }
      }

      // Assign allowed fields to product
      Object.assign(product, fieldsToUpdate);
      
      logger.info('💾 [UPDATE PRODUCT] Saving product with data:', {
        name: product.name,
        imagesCount: product.images?.length || 0,
        pricing: product.pricing,
        inventory: product.inventory,
      });
      
      await product.save();

      // Log updated product images for debugging
      logger.info('💾 Updated merchant product images:', JSON.stringify(product.images, null, 2));
      logger.info('✅ Merchant product updated with ID:', product._id);

      // Update corresponding product on user side (sync to user Product model)
      try {
        await updateUserSideProduct(product, req.merchantId!);
        logger.info('✅ Product update successfully synced to user-side');
      } catch (syncError: any) {
        // Log error but don't fail the merchant product update
        logger.error('⚠️ Warning: Failed to sync product update to user-side:', syncError.message);
        logger.error('   Product was still updated in merchant database');
        // Continue - merchant product update should succeed even if sync fails
      }

      // Check for low stock / out of stock and send alerts
      if (product.inventory) {
        const stock = product.inventory.stock;
        const threshold = product.inventory.lowStockThreshold || 5;

        // Out of stock notification (highest priority)
        if (stock === 0) {
          try {
            await merchantNotificationService.notifyOutOfStock({
              merchantId: req.merchantId!,
              productId: (product._id as any).toString(),
              productName: product.name,
              storeId: product.store?.toString(),
            });
            logger.info('📬 [PRODUCT] Sent out of stock notification for:', product.name);
          } catch (notifyError) {
            logger.warn('Failed to send out of stock notification:', notifyError);
          }
        }
        // Low stock notification and SMS
        else if (stock <= threshold) {
          try {
            await merchantNotificationService.notifyLowStock({
              merchantId: req.merchantId!,
              productId: (product._id as any).toString(),
              productName: product.name,
              currentStock: stock,
              threshold: threshold,
              storeId: product.store?.toString(),
            });
            logger.info('📬 [PRODUCT] Sent low stock notification for:', product.name);
          } catch (notifyError) {
            logger.warn('Failed to send low stock notification:', notifyError);
          }

          // Also send SMS alert
          try {
            const merchant = await Merchant.findById(req.merchantId).lean();
            if (merchant && merchant.phone) {
              const formattedPhone = SMSService.formatPhoneNumber(merchant.phone);
              await SMSService.sendLowStockAlert(
                formattedPhone,
                product.name,
                stock
              );
            }
          } catch (smsError) {
            logger.warn('Failed to send low stock SMS:', smsError);
          }
        }
      }

      // P-12: Invalidate product caches so the updated data is served fresh.
      // P-13: Failures are logged as warnings but never break the request.
      CacheInvalidator.invalidateProduct((product._id as any).toString()).catch((err) => {
        logger.warn('[CACHE-INVALIDATION-WARN] product.updated — invalidation failed:', err);
      });

      // Send real-time notification
      if (global.io) {
        global.io.to(`merchant-${req.merchantId}`).emit('product_updated', {
          productId: product._id,
          productName: product.name
        });
      }

      return res.json({
        success: true,
        message: 'Product updated successfully',
        data: { product }
      });
    } catch (error: any) {
      logger.error('Update product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update product',
        error: error.message
      });
    }
  }
);

// @route   DELETE /api/products/:id
// @desc    Delete product and all related data (images, videos, user-side product)
// @access  Private
router.delete('/:id', productDeleteLimiter, validateParams(productIdSchema), async (req, res) => {
  try {
    const productId = req.params.id;
    const merchantId = req.merchantId;
    
    logger.info('🗑️ [DELETE PRODUCT] Request received:');
    logger.info('   Product ID:', productId);
    logger.info('   Merchant ID:', merchantId);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      logger.info('❌ [DELETE PRODUCT] Invalid product ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    const productObjectId = new mongoose.Types.ObjectId(productId);
    const merchantObjectId = new mongoose.Types.ObjectId(merchantId);
    
    // Try to find product by merchantId first (for products with merchantId set)
    let product: any = await Product.findOne({
      _id: productObjectId,
      merchantId: merchantObjectId
    }).lean();

    // If not found by merchantId, try finding through stores (for products linked via store)
    if (!product) {
      logger.info('🔍 [DELETE PRODUCT] Product not found by merchantId, checking through stores...');

      // Find all stores belonging to this merchant
      const merchantStores = await Store.find({ merchantId: merchantObjectId }).select('_id').lean();
      const storeIds = merchantStores.map(store => store._id);

      if (storeIds.length > 0) {
        // Try to find product by store
        product = await Product.findOne({
          _id: productObjectId,
          store: { $in: storeIds }
        }).lean();
        
        if (product) {
          logger.info('✅ [DELETE PRODUCT] Product found via store relationship');
        }
      }
    } else {
      logger.info('✅ [DELETE PRODUCT] Product found via merchantId');
    }

    if (!product) {
      logger.info('❌ [DELETE PRODUCT] Product not found');
      
      // Check if product exists but doesn't belong to this merchant
      const productExists = await Product.findById(productObjectId).lean() as any;
      if (productExists) {
        logger.info('   Product exists but belongs to different merchant/store');
        if (productExists.merchantId) {
          logger.info('   Product merchantId:', productExists.merchantId.toString());
        }
        if (productExists.store) {
          logger.info('   Product store:', productExists.store.toString());
        }
      } else {
        logger.info('   Product does not exist at all');
      }
      
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    logger.info('✅ [DELETE PRODUCT] Product found:', product.name);

    // Delete images from Cloudinary
    if (product.images && Array.isArray(product.images)) {
      const imageDeletePromises = product.images
        .filter((img: any) => img.publicId)
        .map(async (img: any) => {
          try {
            await CloudinaryService.deleteFile(img.publicId);
            logger.info(`🗑️ Deleted image from Cloudinary: ${img.publicId}`);
          } catch (error: any) {
            logger.error(`⚠️ Failed to delete image ${img.publicId} from Cloudinary:`, error.message);
            // Continue even if Cloudinary deletion fails
          }
        });
      await Promise.allSettled(imageDeletePromises);
    }

    // Delete videos from Cloudinary
    if (product.videos && Array.isArray(product.videos)) {
      const videoDeletePromises = product.videos
        .filter((video: any) => video.publicId)
        .map(async (video: any) => {
          try {
            await CloudinaryService.deleteVideo(video.publicId);
            logger.info(`🗑️ Deleted video from Cloudinary: ${video.publicId}`);
          } catch (error: any) {
            logger.error(`⚠️ Failed to delete video ${video.publicId} from Cloudinary:`, error.message);
            // Continue even if Cloudinary deletion fails
          }
        });
      await Promise.allSettled(videoDeletePromises);
    }

    // Delete the merchant product from database
    // Use the same logic: try merchantId first, then store relationship
    const deleteQuery: any = { _id: productObjectId };
    
    // If product has merchantId, use it; otherwise use store relationship
    if (product.merchantId) {
      deleteQuery.merchantId = merchantObjectId;
    } else {
      // Find stores for this merchant and delete by store relationship
      const merchantStores = await Store.find({ merchantId: merchantObjectId }).select('_id').lean();
      const storeIds = merchantStores.map(store => store._id);
      if (storeIds.length > 0) {
        deleteQuery.store = { $in: storeIds };
      } else {
        // No stores found, can't delete
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
    }
    
    const deleteResult = await Product.findOneAndDelete(deleteQuery);
    
    if (!deleteResult) {
      logger.info('❌ [DELETE PRODUCT] Failed to delete product from database');
      return res.status(404).json({
        success: false,
        message: 'Product not found or already deleted'
      });
    }
    
    logger.info('✅ [DELETE PRODUCT] Product deleted from database');

    // Delete corresponding product on user side
    await deleteUserSideProduct(product._id.toString());

    // Delete related reviews (optional - you may want to keep reviews)
    try {
      await Review.deleteMany({ productId: product._id.toString() });
      logger.info(`Deleted reviews for product: ${product._id}`);
    } catch (error: any) {
      logger.error(`Failed to delete reviews:`, error.message);
      // Continue even if review deletion fails
    }

    // P-12: Invalidate product caches so the deleted product disappears immediately.
    // P-13: Failures are logged as warnings but never break the request.
    CacheInvalidator.invalidateProduct(product._id.toString()).catch((err) => {
      logger.warn('[CACHE-INVALIDATION-WARN] product.deleted — invalidation failed:', err);
    });

    // Send real-time notification
    if (global.io) {
      global.io.to(`merchant-${req.merchantId}`).emit('product_deleted', {
        productId: product._id,
        productName: product.name
      });
    }

    logger.info(`✅ Product "${product.name}" (ID: ${product._id}) deleted successfully with all related data`);

    return res.json({
      success: true,
      message: 'Product and all related data deleted successfully'
    });
  } catch (error: any) {
    logger.error('Delete product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
});

// @route   GET /api/products/:id/variants
// @desc    Get product variants
// @access  Private
router.post('/:id/variants', productWriteLimiter, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      merchantId: req.merchantId
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const variantData = {
      name: req.body.name,
      sku: req.body.sku || `${product.sku}-VAR-${Date.now()}`,
      price: req.body.price || product.price,
      compareAtPrice: req.body.compareAtPrice,
      inventory: {
        stock: req.body.quantity || 0,
        trackInventory: true,
        lowStockThreshold: 5
      },
      attributes: req.body.attributes || []
    };

    if (!product.variants) {
      product.variants = [];
    }

    product.variants.push(variantData as any);
    await product.save();

    return res.status(201).json({
      success: true,
      message: 'Variant created successfully',
      data: {
        variant: product.variants[product.variants.length - 1]
      }
    });
  } catch (error: any) {
    logger.error('Create product variant error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create product variant',
      error: error.message
    });
  }
});

// @route   PUT /api/products/:id/variants/:variantId
// @desc    Update product variant
// @access  Private
router.put('/:id/variants/:variantId', productWriteLimiter, async (req, res) => {
  try {
    const { id: productId, variantId } = req.params;

    logger.info('✏️ [UPDATE VARIANT] Request received:');
    logger.info('   Product ID:', productId);
    logger.info('   Variant ID:', variantId);
    logger.info('   Merchant ID:', req.merchantId);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const productObjectId = new mongoose.Types.ObjectId(productId);
    const merchantObjectId = new mongoose.Types.ObjectId(req.merchantId);

    // Find product
    const product = await Product.findOne({
      _id: productObjectId,
      merchantId: merchantObjectId
    });

    if (!product) {
      logger.info('❌ [UPDATE VARIANT] Product not found');
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find variant by variantId
    if (!product.inventory?.variants || product.inventory.variants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product has no variants'
      });
    }

    const variantIndex = product.inventory.variants.findIndex(
      (v: any) => v.variantId === variantId
    );

    if (variantIndex === -1) {
      logger.info('❌ [UPDATE VARIANT] Variant not found');
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    // Update variant fields
    const variant = product.inventory.variants[variantIndex];
    const updateData = req.body;

    if (updateData.type !== undefined) variant.type = updateData.type;
    if (updateData.value !== undefined) variant.value = updateData.value;
    if (updateData.attributes !== undefined) variant.attributes = updateData.attributes;
    if (updateData.price !== undefined) variant.price = updateData.price;
    if (updateData.stock !== undefined) variant.stock = updateData.stock;
    if (updateData.sku !== undefined) variant.sku = updateData.sku;
    if (updateData.images !== undefined) variant.images = updateData.images;
    if (updateData.isAvailable !== undefined) variant.isAvailable = updateData.isAvailable;

    // Mark the variants array as modified for Mongoose to detect the change
    product.markModified('inventory.variants');
    await product.save();

    logger.info('✅ [UPDATE VARIANT] Variant updated successfully');

    return res.json({
      success: true,
      message: 'Variant updated successfully',
      data: {
        variant: product.inventory.variants[variantIndex]
      }
    });
  } catch (error: any) {
    logger.error('❌ [UPDATE VARIANT] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update product variant',
      error: error.message
    });
  }
});

// @route   DELETE /api/products/:id/variants/:variantId
// @desc    Delete product variant
// @access  Private
router.delete('/:id/variants/:variantId', productDeleteLimiter, async (req, res) => {
  try {
    const { id: productId, variantId } = req.params;

    logger.info('🗑️ [DELETE VARIANT] Request received:');
    logger.info('   Product ID:', productId);
    logger.info('   Variant ID:', variantId);
    logger.info('   Merchant ID:', req.merchantId);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const productObjectId = new mongoose.Types.ObjectId(productId);
    const merchantObjectId = new mongoose.Types.ObjectId(req.merchantId);

    // Find product
    const product = await Product.findOne({
      _id: productObjectId,
      merchantId: merchantObjectId
    });

    if (!product) {
      logger.info('❌ [DELETE VARIANT] Product not found');
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find and remove variant by variantId
    if (!product.inventory?.variants || product.inventory.variants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product has no variants'
      });
    }

    const variantIndex = product.inventory.variants.findIndex(
      (v: any) => v.variantId === variantId
    );

    if (variantIndex === -1) {
      logger.info('❌ [DELETE VARIANT] Variant not found');
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    // Remove the variant
    const deletedVariant = product.inventory.variants[variantIndex];
    product.inventory.variants.splice(variantIndex, 1);

    // Mark the variants array as modified for Mongoose to detect the change
    product.markModified('inventory.variants');
    await product.save();

    logger.info('✅ [DELETE VARIANT] Variant deleted successfully');

    return res.json({
      success: true,
      message: 'Variant deleted successfully',
      data: {
        deletedVariant
      }
    });
  } catch (error: any) {
    logger.error('❌ [DELETE VARIANT] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product variant',
      error: error.message
    });
  }
});

export default router;
