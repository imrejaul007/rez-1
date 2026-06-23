/**
 * Product Routes — Read section (Phase 6.3)
 *
 * Extracted from the original monolithic products.ts. Handles:
 * - GET /, GET /validate-sku, GET /categories, GET /:id
 * - GET /:id/variants, GET /:id/reviews
 */

import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/merchantauth";
import { validateQuery, validateParams } from "../middleware/merchantvalidation";
import { Product } from "../models/Product";
import { MProduct as MerchantProduct } from "../models/MerchantProduct";
import { Store } from "../models/Store";
import { Category } from "../models/Category";
import { Review } from "../models/Review";
import mongoose, { Types } from "mongoose";
import { productGetLimiter, productWriteLimiter, productDeleteLimiter } from "../middleware/rateLimiter";
import { logger } from "../config/logger";
import { searchProductsSchema, productIdSchema, generateSKU } from "./productsHelpers";

const router = Router();

router.use(authMiddleware);


// @route   GET /api/products
// @desc    Get merchant products with search and filtering
// @access  Private
router.get('/', productGetLimiter, validateQuery(searchProductsSchema), async (req, res) => {
  try {
   const {
  query,
  category,
  status,
  visibility,
  stockLevel,
  storeId,
  sortBy,
  sortOrder,
  page,
  limit
} = (req as any).validatedQuery;


    // Build search criteria - Products are linked to stores, not directly to merchants
    logger.info('🔍 [PRODUCTS] Query params:', { storeId, category, status, visibility, page, limit });
    logger.info('🔍 [PRODUCTS] Merchant ID:', req.merchantId);
    
    // First, find all stores belonging to this merchant
    const merchantStores = await Store.find({ merchantId: req.merchantId }).select('_id').lean();
    const storeIds = merchantStores.map(store => store._id);

    logger.info('🔍 [PRODUCTS] Found', storeIds.length, 'stores for merchant');

    // If no stores found, return empty
    if (storeIds.length === 0) {
      logger.info('⚠️ [PRODUCTS] No stores found for merchant, returning empty');
      return res.json({
        success: true,
        data: {
          products: [],
          pagination: {
            totalCount: 0,
            page,
            limit,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
          }
        }
      });
    }
    
    const searchCriteria: any = { store: { $in: storeIds } };

    if (category) searchCriteria.category = category;
    if (status) searchCriteria.status = status;
    if (visibility) searchCriteria.visibility = visibility;
    if (storeId) {
      logger.info('🔍 [PRODUCTS] Filtering by specific store:', storeId);
      
      // Validate store belongs to merchant
      const store = await Store.findOne({
        _id: storeId,
        merchantId: req.merchantId
      }).lean();

      logger.info('🔍 [PRODUCTS] Store validation:', store ? `Found: ${store.name}` : 'NOT FOUND');

      if (!store) {
        logger.info('❌ [PRODUCTS] Store does not belong to merchant');
        return res.status(403).json({
          success: false,
          message: 'Store does not belong to this merchant'
        });
      }
      
      // Override to query only this specific store
      searchCriteria.store = storeId;
      logger.info('🔍 [PRODUCTS] Search criteria updated to specific store');
    }
    
    logger.info('🔍 [PRODUCTS] Final search criteria:', JSON.stringify(searchCriteria));

    // Text search
    if (query) {
      searchCriteria.$text = { $search: query };
    }

    // Stock level filtering
    if (stockLevel && stockLevel !== 'all') {
      switch (stockLevel) {
        case 'in_stock':
          searchCriteria['inventory.stock'] = { $gt: 0 };
          break;
        case 'low_stock':
          searchCriteria.$expr = {
            $lte: ['$inventory.stock', '$inventory.lowStockThreshold']
          };
          break;
        case 'out_of_stock':
          searchCriteria['inventory.stock'] = 0;
          break;
      }
    }

    // Build sort criteria
    const sortCriteria: any = {};
    switch (sortBy) {
      case 'name':
        sortCriteria.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'price':
        sortCriteria.price = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'stock':
        sortCriteria['inventory.stock'] = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'updated':
        sortCriteria.updatedAt = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'created':
      default:
        sortCriteria.createdAt = sortOrder === 'asc' ? 1 : -1;
        break;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    logger.info('🔍 [PRODUCTS] Executing query...');
    const [products, totalCount] = await Promise.all([
      Product.find(searchCriteria)
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(searchCriteria)
    ]);

    logger.info('✅ [PRODUCTS] Query complete:', totalCount, 'products found');
    logger.info('📦 [PRODUCTS] Returning', products.length, 'products for this page');

    const totalPages = Math.ceil(totalCount / limit);
    const hasNext = page < totalPages;
    const hasPrevious = page > 1;

    return res.json({
      success: true,
      data: {
        products,
        pagination: {
          totalCount,
          page,
          limit,
          totalPages,
          hasNext,
          hasPrevious
        }
      }
    });
  } catch (error: any) {
    logger.error('Get products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
});
// @route   GET /api/products/validate-sku
// @desc    Validate if SKU is unique
// @access  Private
router.get('/validate-sku', productGetLimiter, async (req, res) => {
  try {
    const { sku, excludeProductId } = req.query;
    const merchantId = req.merchantId;

    if (!sku || typeof sku !== 'string' || !sku.trim()) {
      return res.status(400).json({
        success: false,
        message: 'SKU is required'
      });
    }

    // Build query to check for existing SKU
    const query: any = {
      sku: { $regex: new RegExp(`^${sku.trim()}$`, 'i') }, // Case-insensitive exact match
      merchantId: new mongoose.Types.ObjectId(merchantId)
    };

    // Exclude specific product if provided (for edit mode)
    if (excludeProductId && mongoose.Types.ObjectId.isValid(excludeProductId as string)) {
      query._id = { $ne: new mongoose.Types.ObjectId(excludeProductId as string) };
    }

    // Check if SKU exists in MerchantProduct
    const existingProduct = await MerchantProduct.findOne(query).select('name sku').lean() as { name: string; sku: string } | null;

    if (existingProduct) {
      // SKU is already in use
      const timestamp = Date.now().toString().slice(-4);
      const suggestion = `${sku.trim()}-${timestamp}`;

      return res.json({
        success: true,
        data: {
          isAvailable: false,
          message: `SKU "${sku}" is already used by product "${existingProduct.name}"`,
          suggestion
        }
      });
    }

    // SKU is available
    return res.json({
      success: true,
      data: {
        isAvailable: true,
        message: 'SKU is available'
      }
    });
  } catch (error: any) {
    logger.error('Validate SKU error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate SKU',
      error: error.message
    });
  }
});

// @route   GET /api/products/categories
// @desc    Get all available product categories from Category model
// @access  Private
router.get('/categories', productGetLimiter, async (req, res) => {
  try {
    // Fetch only PARENT categories (no parentCategory) - subcategories are fetched separately
    const categories = await Category.find({
      isActive: true,
      $or: [
        { parentCategory: null },
        { parentCategory: { $exists: false } }
      ]
    })
      .select('name slug _id')
      .sort({ name: 1 })
      .lean();

    // Get merchant stores for querying products
    const merchantStores = await Store.find({ merchantId: req.merchantId }).select('_id').lean();
    const storeIds = merchantStores.map(store => store._id);

    // Also get categories that are already used in products (for backward compatibility)
    const usedCategories = storeIds.length > 0 
      ? await Product.distinct('category', { 
          $or: [
            { merchantId: req.merchantId },
            { store: { $in: storeIds } }
          ]
        })
      : [];

    // Combine and format response
    const categoryList = categories.map((cat: any) => ({
      label: cat.name,
      value: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
      id: cat._id ? cat._id.toString() : ''
    }));

    // Add any used parent categories that might not be in the list (for backward compatibility)
    const usedCategoryIds = new Set(categories.map((c: any) => c._id ? c._id.toString() : ''));
    for (const usedCatId of usedCategories) {
      if (usedCatId && !usedCategoryIds.has(usedCatId.toString())) {
        // This category is used but not in the list - check if it's a parent category
        const cat = await Category.findById(usedCatId).lean();
        // Only add if it's a parent category (no parentCategory)
        if (cat && !cat.parentCategory) {
          categoryList.push({
            label: cat.name,
            value: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
            id: cat._id ? cat._id.toString() : ''
          });
        }
      }
    }

    return res.json({
      success: true,
      data: { categories: categoryList }
    });
  } catch (error: any) {
    logger.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});
// @route   GET /api/products/:id
// @desc    Get single product
// @access  Private
router.get('/:id', productGetLimiter, validateParams(productIdSchema), async (req, res) => {
  try {
    const productId = req.params.id;
    const merchantId = req.merchantId;
    
    logger.info('🔍 [GET PRODUCT] Request received:');
    logger.info('   Product ID:', productId);
    logger.info('   Merchant ID:', merchantId);
    logger.info('   Merchant ID type:', typeof merchantId);
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      logger.info('❌ [GET PRODUCT] Invalid product ID format');
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }
    
    // Convert to ObjectId for proper comparison
    const productObjectId = new mongoose.Types.ObjectId(productId);

    // Find all stores belonging to this merchant (same approach as list endpoint)
    const merchantStores = await Store.find({ merchantId: merchantId }).select('_id').lean();
    const storeIds = merchantStores.map(store => store._id);

    logger.info('   Merchant stores:', storeIds.length);

    // Query product by ID, verifying ownership via store OR direct merchantId
    const product = await Product.findOne({
      _id: productObjectId,
      $or: [
        { store: { $in: storeIds } },
        { merchantId: merchantId }
      ]
    })
    .populate('category', 'name')
    .populate('store', 'name logo')
    .lean() as any;

    if (!product) {
      logger.info('❌ [GET PRODUCT] Product not found or does not belong to merchant');

      const productExists = await Product.findById(productObjectId).lean() as any;
      if (productExists) {
        logger.info('   Product exists but belongs to different merchant. Store:', productExists.store?.toString(), 'MerchantId:', productExists.merchantId?.toString());
      }

      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    logger.info('✅ [GET PRODUCT] Product found:', product.name);
    logger.info('✅ [GET PRODUCT] Category:', product.category);
    return res.json({
      success: true,
      data: product
    });
  } catch (error: any) {
    logger.error('❌ [GET PRODUCT] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

// @route   POST /api/products
// @desc    Create new product
router.get('/:id/variants', productGetLimiter, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      merchantId: req.merchantId
    }).lean() as any;

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    return res.json({
      success: true,
      data: {
        variants: product.variants || []
      }
    });
  } catch (error: any) {
    logger.error('Get product variants error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product variants',
      error: error.message
    });
  }
});

// @route   GET /api/products/:id/reviews
// @desc    Get product reviews
// @access  Private
router.get('/:id/reviews', productGetLimiter, async (req, res) => {
  try {
    const merchantId = req.merchantId!;
    const productId = req.params.id;

    // Verify product belongs to merchant
    const product = await Product.findOne({
      _id: productId,
      merchantId: merchantId
    }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get merchant's store to query reviews (reviews reference store, not product)
    const store = await Store.findOne({ merchantId }).lean();
    if (!store) {
      return res.status(404).json({
        success: false,
        message: 'Store not found'
      });
    }

    // Pagination
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Filters
    const filter = req.query.filter as string;
    const reviewQuery: any = {
      store: store._id,
      isActive: true
    };

    // Apply filters
    if (filter === 'with_images') {
      reviewQuery.images = { $exists: true, $ne: [] };
    } else if (filter === 'verified') {
      reviewQuery.verified = true;
    } else if (filter && !isNaN(parseInt(filter))) {
      reviewQuery.rating = parseInt(filter);
    }

    // Query reviews from database
    const [reviews, totalCount] = await Promise.all([
      Review.find(reviewQuery)
        .populate('user', 'profile.name profile.avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(reviewQuery)
    ]);

    // Get review stats using the Review model's static method
    const stats = await Review.getStoreRatingStats((store._id as any).toString());

    return res.json({
      success: true,
      data: {
        reviews,
        stats,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrevious: page > 1
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching store reviews:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

export default router;
