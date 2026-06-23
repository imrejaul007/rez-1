import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { validateRequest, validateQuery, validateParams } from '../middleware/merchantvalidation';
import { MProduct } from '../models/MerchantProduct';
import { Store } from '../models/Store';
import mongoose from 'mongoose';
import Joi from 'joi';
// P-12: Cache invalidation on category mutations
import { CacheInvalidator } from '../utils/cacheHelper';
import { logger } from '../config/logger';

// Extend Request interface to include merchantId
declare global {
  namespace Express {
    interface Request {
      merchantId?: string;
      merchant?: any;
    }
  }
}

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Validation schemas
const createCategorySchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  parentId: Joi.string().optional(),
  description: Joi.string().max(500),
  icon: Joi.string().optional(),
  sortOrder: Joi.number().min(0).default(0),
  isActive: Joi.boolean().default(true),
  metaTitle: Joi.string().max(60),
  metaDescription: Joi.string().max(160),
  seoSlug: Joi.string().pattern(/^[a-z0-9-]+$/),
});

const updateCategorySchema = createCategorySchema.fork(
  ['name'],
  (schema) => schema.optional()
);

const categoryIdSchema = Joi.object({
  id: Joi.string().required()
});

const searchCategoriesSchema = Joi.object({
  query: Joi.string().optional(),
  parentId: Joi.string().optional(),
  storeId: Joi.string().optional(), // Add storeId filter
  isActive: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false').custom((value) => value === 'true')
  ).optional(),
  sortBy: Joi.string()
    .valid('name', 'sortOrder', 'created', 'productCount')
    .default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  includeEmpty: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false').custom((value) => value === 'true')
  ).default(false),
});



interface CategoryWithStats {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
  icon?: string;
  sortOrder: number;
  isActive: boolean;
  metaTitle?: string;
  metaDescription?: string;
  seoSlug?: string;
  productCount: number;
  subcategories: CategoryWithStats[];
  createdAt: Date;
  updatedAt: Date;
}

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

const buildCategoryTree = (categories: any[]): CategoryWithStats[] => {
  const categoryMap = new Map();
  const rootCategories: CategoryWithStats[] = [];

  // First pass: create map of all categories
  categories.forEach(cat => {
    categoryMap.set(cat.id || cat._id.toString(), {
      ...cat,
      id: cat.id || cat._id.toString(),
      subcategories: [],
    });
  });

  // Second pass: build tree structure
  categories.forEach(cat => {
    const category = categoryMap.get(cat.id || cat._id.toString());
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.subcategories.push(category);
      } else {
        // Parent not found, treat as root
        rootCategories.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  });

  // Sort categories and subcategories
  const sortCategories = (cats: CategoryWithStats[]) => {
    cats.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });
    cats.forEach(cat => {
      if (cat.subcategories.length > 0) {
        sortCategories(cat.subcategories);
      }
    });
  };

  sortCategories(rootCategories);
  return rootCategories;
};
// @route   GET /api/categories/stats
// @desc    Get category statistics
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const { storeId } = req.query as { storeId?: string };
    
    // Build match criteria
    const productMatchCriteria: any = { merchantId: req.merchantId };
    
    // Add storeId filter if provided
    if (storeId) {
      const store = await Store.findOne({
        _id: storeId,
        merchantId: req.merchantId
      });
      
      if (!store) {
        return res.status(400).json({
          success: false,
          message: 'Store not found or does not belong to this merchant'
        });
      }
      
      productMatchCriteria.storeId = new mongoose.Types.ObjectId(storeId);
    }
    
    const stats = await MProduct.aggregate([
      { $match: productMatchCriteria },
      {
        $group: {
          _id: null,
          totalCategories: { $addToSet: '$category' },
          totalSubcategories: { $addToSet: '$subcategory' },
          totalProducts: { $sum: 1 },
          categoriesWithProducts: {
            $push: {
              category: '$category',
              subcategory: '$subcategory',
              status: '$status'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalCategories: { $size: '$totalCategories' },
          totalSubcategories: {
            $size: {
              $filter: {
                input: '$totalSubcategories',
                cond: {
                  $and: [
                    { $ne: ['$$this', null] },
                    { $ne: ['$$this', ''] }
                  ]
                }
              }
            }
          },
          totalProducts: 1,
          categoriesWithProducts: 1
        }
      }
    ]);

    const categoryStats = stats[0] || {
      totalCategories: 0,
      totalSubcategories: 0,
      totalProducts: 0,
      categoriesWithProducts: []
    };

    // Get top categories by product count (using same store filter)
    const topCategoriesMatchCriteria: any = { 
      ...productMatchCriteria, 
      status: 'active' 
    };
    
    const topCategories = await MProduct.aggregate([
      { $match: topCategoriesMatchCriteria },
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          totalValue: { $sum: '$price' }
        }
      },
      { $sort: { productCount: -1 } },
      { $limit: 10 },
      {
        $project: {
          _id: 0,
          category: '$_id',
          productCount: 1,
          averagePrice: { $round: ['$averagePrice', 2] },
          totalValue: { $round: ['$totalValue', 2] }
        }
      }
    ]);

    return res.json({
      success: true,
      data: {
        overview: categoryStats,
        topCategories,
        insights: {
          averageProductsPerCategory: categoryStats.totalCategories > 0 
            ? Math.round(categoryStats.totalProducts / categoryStats.totalCategories) 
            : 0,
          categoriesNeedingAttention: topCategories.filter(cat => cat.productCount < 5).length,
        }
      }
    });
  } catch (error: any) {
    logger.error('Get category stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category statistics',
      error: error.message
    });
  }
});

// @route   GET /api/categories
// @desc    Get categories with product counts and tree structure
// @access  Private
// @route   GET /api/categories
// @desc    Get categories with product counts and tree structure
// @access  Private
router.get('/', validateQuery(searchCategoriesSchema), async (req, res) => {
  try {
    const {
      query,
      parentId,
      storeId,
      isActive,
      sortBy,
      sortOrder,
      includeEmpty
    } = req.query as any;

    // Build match criteria for products
    const productMatchCriteria: any = { merchantId: req.merchantId };
    
    // Add storeId filter if provided
    if (storeId) {
      // Validate that the store belongs to this merchant
      const store = await Store.findOne({
        _id: storeId,
        merchantId: req.merchantId
      });
      
      if (!store) {
        return res.status(400).json({
          success: false,
          message: 'Store not found or does not belong to this merchant'
        });
      }
      
      productMatchCriteria.storeId = new mongoose.Types.ObjectId(storeId);
    }

    // Get all categories for this merchant (filtered by store if provided)
    const categoriesFromProducts = await MProduct.aggregate([
      { $match: productMatchCriteria },
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
          subcategories: { $addToSet: '$subcategory' },
          isActive: { $first: true }, // Assume all products in category are active
          sortOrder: { $first: 0 },
        }
      },
      {
        $project: {
          id: '$_id',
          name: '$_id',
          productCount: 1,
          subcategories: {
            $filter: {
              input: '$subcategories',
              as: 'sub',
              cond: {
                $and: [
                  { $ne: ['$$sub', null] },
                  { $ne: ['$$sub', ''] }
                ]
              }
            }
          },
          isActive: 1,
          sortOrder: { $literal: 0 },
          createdAt: { $literal: new Date() },
          updatedAt: { $literal: new Date() }
        }
      },
      {
        $unset: '_id'
      }
    ]);

    // Get subcategories (using same store filter)
    const subcategoriesFromProducts = await MProduct.aggregate([
      { 
        $match: { 
          ...productMatchCriteria,
          subcategory: { $nin: [null, ''] }
        } 
      },
      {
        $group: {
          _id: {
            category: '$category',
            subcategory: '$subcategory'
          },
          productCount: { $sum: 1 },
        }
      },
      {
        $project: {
          id: { $concat: ['$_id.category', '-', '$_id.subcategory'] },
          name: '$_id.subcategory',
          parentId: '$_id.category',
          productCount: 1,
          subcategories: { $literal: [] },
          isActive: { $literal: true },
          sortOrder: { $literal: 0 },
          createdAt: { $literal: new Date() },
          updatedAt: { $literal: new Date() }
        }
      },
      {
        $unset: '_id'
      }
    ]);

    let allCategories = [...categoriesFromProducts, ...subcategoriesFromProducts];

    // Apply filters
    if (query) {
      const q = query as string;
      const searchRegex = new RegExp(q, 'i');
      allCategories = allCategories.filter(cat => 
        searchRegex.test(cat.name)
      );
    }

    if (parentId !== undefined) {
      allCategories = allCategories.filter(cat => cat.parentId === parentId);
    }

    if (isActive !== undefined) {
      allCategories = allCategories.filter(cat => cat.isActive === isActive);
    }

    if (!includeEmpty) {
      allCategories = allCategories.filter(cat => cat.productCount > 0);
    }

    // Sort categories
    allCategories.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'productCount':
          comparison = a.productCount - b.productCount;
          break;
        case 'sortOrder':
          comparison = a.sortOrder - b.sortOrder;
          break;
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        default:
          comparison = a.sortOrder - b.sortOrder;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Build tree structure for root categories only
    const categoryTree = parentId === undefined ? buildCategoryTree(allCategories) : allCategories;

    return res.json({
      success: true,
      data: {
        categories: categoryTree,
        totalCount: allCategories.length,
      }
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




// @route   POST /api/categories/bulk-update
// @desc    Bulk update product categories
// @access  Private
router.post('/bulk-update', async (req, res) => {
  try {
    const { operations } = req.body;

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        message: 'Operations array is required'
      });
    }

    const results = [];

    for (const operation of operations) {
      const { type, oldCategory, newCategory, subcategory } = operation;

      let updateResult;
      switch (type) {
        case 'rename_category':
          updateResult = await MProduct.updateMany(
            {
              merchantId: req.merchantId,
              category: oldCategory
            },
            {
              $set: { category: newCategory, updatedAt: new Date() }
            }
          );
          break;

        case 'merge_categories':
          updateResult = await MProduct.updateMany(
            {
              merchantId: req.merchantId,
              category: { $in: operation.sourceCategories }
            },
            {
              $set: { category: newCategory, updatedAt: new Date() }
            }
          );
          break;

        case 'move_to_subcategory':
          updateResult = await MProduct.updateMany(
            {
              merchantId: req.merchantId,
              category: oldCategory,
              subcategory: { $in: [null, ''] }
            },
            {
              $set: { 
                subcategory: subcategory,
                updatedAt: new Date()
              }
            }
          );
          break;

        case 'delete_category':
          // Move products to 'Uncategorized' instead of deleting
          updateResult = await MProduct.updateMany(
            {
              merchantId: req.merchantId,
              category: oldCategory
            },
            {
              $set: { 
                category: 'Uncategorized',
                subcategory: null,
                updatedAt: new Date()
              }
            }
          );
          break;

        default:
          results.push({
            operation,
            success: false,
            error: 'Unknown operation type'
          });
          continue;
      }

      results.push({
        operation,
        success: true,
        modifiedCount: updateResult.modifiedCount
      });
    }

    // P-12: Invalidate all category caches after bulk update.
    // P-13: Failures are logged as warnings but never break the request.
    CacheInvalidator.invalidateAllCategories().catch((err) => {
      logger.warn('[CACHE-INVALIDATION-WARN] categories.bulk-update — invalidation failed:', err);
    });

    return res.json({
      success: true,
      message: 'Bulk category update completed',
      data: { results }
    });
  } catch (error: any) {
    logger.error('Bulk category update error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to perform bulk category update',
      error: error.message
    });
  }
});

// @route   PUT /api/categories/organize
// @desc    Reorganize category structure
// @access  Private
router.put('/organize', async (req, res) => {
  try {
    const { categoryMappings } = req.body;

    if (!categoryMappings || !Array.isArray(categoryMappings)) {
      return res.status(400).json({
        success: false,
        message: 'Category mappings array is required'
      });
    }

    const updatePromises = categoryMappings.map(async (mapping) => {
      const { oldCategory, oldSubcategory, newCategory, newSubcategory } = mapping;
      const query: any = {
        merchantId: req.merchantId,
        category: oldCategory
      };

      if (oldSubcategory) {
        query.subcategory = oldSubcategory;
      }

      const updateData: any = {
        category: newCategory,
        updatedAt: new Date()
      };

      if (newSubcategory !== undefined) {
        updateData.subcategory = newSubcategory || null;
      }

      return await MProduct.updateMany(query, { $set: updateData });
    });

    const results = await Promise.all(updatePromises);
    const totalModified = results.reduce((sum, result) => sum + result.modifiedCount, 0);

    // P-12: Invalidate all category caches after reorganization.
    // P-13: Failures are logged as warnings but never break the request.
    CacheInvalidator.invalidateAllCategories().catch((err) => {
      logger.warn('[CACHE-INVALIDATION-WARN] categories.organize — invalidation failed:', err);
    });

    return res.json({
      success: true,
      message: `Successfully reorganized ${totalModified} products`,
      data: {
        totalModified,
        operationsCompleted: results.length
      }
    });
  } catch (error: any) {
    logger.error('Category reorganization error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reorganize categories',
      error: error.message
    });
  }
});

// @route   GET /api/categories/suggestions
// @desc    Get category suggestions based on product data
// @access  Private
router.get('/suggestions', async (req, res) => {
  try {
    const { query } = req.query as { query?: string };

    // Get existing categories for suggestions
    const existingCategories = await MProduct.distinct('category', { 
      merchantId: req.merchantId 
    });

    const existingSubcategories = await MProduct.aggregate([
      { $match: { merchantId: req.merchantId, subcategory: { $nin: [null, ''] } } },
      {
        $group: {
          _id: '$category',
          subcategories: { $addToSet: '$subcategory' }
        }
      }
    ]);

    let suggestions = {
      categories: existingCategories,
      subcategories: existingSubcategories,
      recommended: [
        'Electronics', 'Clothing & Apparel', 'Home & Garden', 'Sports & Outdoors',
        'Books & Media', 'Health & Beauty', 'Food & Beverages', 'Automotive',
        'Toys & Games', 'Office Supplies', 'Pet Supplies', 'Jewelry & Accessories'
      ]
    };

    // Filter suggestions if query provided
    if (query) {
      const searchRegex = new RegExp(query, 'i');
      suggestions.categories = suggestions.categories.filter(cat => 
        searchRegex.test(cat)
      );
      suggestions.recommended = suggestions.recommended.filter(cat => 
        searchRegex.test(cat)
      );
    }

    return res.json({
      success: true,
      data: suggestions
    });
  } catch (error: any) {
    logger.error('Get category suggestions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch category suggestions',
      error: error.message
    });
  }
});

// @route   POST /api/categories/auto-categorize
// @desc    Auto-categorize products based on AI/ML suggestions
// @access  Private
router.post('/auto-categorize', async (req, res) => {
  try {
    const { productIds, force = false } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    // Get products to categorize
    const products = await MProduct.find({
      _id: { $in: productIds },
      merchantId: req.merchantId
    });

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No products found'
      });
    }

    const categorizedResults = [];

    for (const product of products) {
      // Skip if already categorized and not forcing
      if (product.category && product.category !== 'Uncategorized' && !force) {
        categorizedResults.push({
          productId: product._id,
          productName: product.name,
          skipped: true,
          reason: 'Already categorized'
        });
        continue;
      }

      // Simple keyword-based categorization (in production, use ML service)
      let suggestedCategory = 'General';
      let suggestedSubcategory = null;

      const productText = `${product.name} ${product.description} ${product.tags?.join(' ') || ''}`.toLowerCase();

      // Electronics
      if (/\b(phone|laptop|computer|tablet|headphone|speaker|tv|monitor|camera|gaming|electronic|tech|digital|smart|wireless|bluetooth|usb|charger|cable|battery)\b/.test(productText)) {
        suggestedCategory = 'Electronics';
        if (/\b(phone|smartphone|mobile)\b/.test(productText)) suggestedSubcategory = 'Mobile Phones';
        else if (/\b(laptop|computer|pc|desktop)\b/.test(productText)) suggestedSubcategory = 'Computers';
        else if (/\b(headphone|speaker|audio|sound)\b/.test(productText)) suggestedSubcategory = 'Audio';
        else if (/\b(tv|television|monitor|display)\b/.test(productText)) suggestedSubcategory = 'Displays';
      }
      // Clothing
      else if (/\b(shirt|pants|dress|shoes|clothing|apparel|fashion|wear|jacket|coat|jeans|sweater|t-shirt|blouse|skirt|shorts|socks|underwear|hat|cap|belt|scarf)\b/.test(productText)) {
        suggestedCategory = 'Clothing & Apparel';
        if (/\b(shirt|t-shirt|blouse|top)\b/.test(productText)) suggestedSubcategory = 'Shirts & Tops';
        else if (/\b(pants|jeans|trousers|shorts)\b/.test(productText)) suggestedSubcategory = 'Bottoms';
        else if (/\b(shoes|sneakers|boots|sandals)\b/.test(productText)) suggestedSubcategory = 'Footwear';
        else if (/\b(dress|skirt|gown)\b/.test(productText)) suggestedSubcategory = 'Dresses & Skirts';
      }
      // Home & Garden
      else if (/\b(furniture|home|kitchen|garden|decor|decoration|lamp|chair|table|bed|sofa|plant|outdoor|indoor|living|bedroom|bathroom|dining)\b/.test(productText)) {
        suggestedCategory = 'Home & Garden';
        if (/\b(kitchen|cooking|cookware|utensil)\b/.test(productText)) suggestedSubcategory = 'Kitchen';
        else if (/\b(furniture|chair|table|bed|sofa|desk)\b/.test(productText)) suggestedSubcategory = 'Furniture';
        else if (/\b(garden|plant|outdoor|lawn|flower|soil)\b/.test(productText)) suggestedSubcategory = 'Garden';
        else if (/\b(decor|decoration|lamp|light|art|frame)\b/.test(productText)) suggestedSubcategory = 'Decor';
      }
      // Books & Media
      else if (/\b(book|magazine|cd|dvd|blu-ray|media|novel|textbook|guide|manual|literature|reading|author)\b/.test(productText)) {
        suggestedCategory = 'Books & Media';
        if (/\b(novel|fiction|literature|story)\b/.test(productText)) suggestedSubcategory = 'Fiction';
        else if (/\b(textbook|educational|learning|study|academic)\b/.test(productText)) suggestedSubcategory = 'Educational';
        else if (/\b(cd|music|album|soundtrack)\b/.test(productText)) suggestedSubcategory = 'Music';
        else if (/\b(dvd|blu-ray|movie|film)\b/.test(productText)) suggestedSubcategory = 'Movies';
      }
      // Sports & Outdoors
      else if (/\b(sport|sports|fitness|exercise|outdoor|camping|hiking|fishing|cycling|running|gym|workout|athletic|recreation)\b/.test(productText)) {
        suggestedCategory = 'Sports & Outdoors';
        if (/\b(fitness|gym|workout|exercise|weight|dumbbell)\b/.test(productText)) suggestedSubcategory = 'Fitness';
        else if (/\b(camping|hiking|outdoor|tent|backpack)\b/.test(productText)) suggestedSubcategory = 'Outdoor Recreation';
        else if (/\b(cycling|bike|bicycle)\b/.test(productText)) suggestedSubcategory = 'Cycling';
        else if (/\b(running|jogging|athletic|sport)\b/.test(productText)) suggestedSubcategory = 'Athletic';
      }

      // Update product with suggested category
      await MProduct.findByIdAndUpdate(product._id, {
        category: suggestedCategory,
        subcategory: suggestedSubcategory,
        updatedAt: new Date()
      });

      categorizedResults.push({
        productId: product._id,
        productName: product.name,
        suggestedCategory,
        suggestedSubcategory,
        success: true
      });
    }

    // P-12: Invalidate category caches after auto-categorization.
    CacheInvalidator.invalidateAllCategories().catch((err) => {
      logger.warn('[CACHE-INVALIDATION-WARN] categories.auto-categorize — invalidation failed:', err);
    });

    return res.json({
      success: true,
      message: `Auto-categorized ${categorizedResults.filter(r => r.success).length} products`,
      data: {
        results: categorizedResults,
        totalProcessed: categorizedResults.length,
        successCount: categorizedResults.filter(r => r.success).length,
        skippedCount: categorizedResults.filter(r => r.skipped).length
      }
    });
  } catch (error: any) {
    logger.error('Auto-categorize error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to auto-categorize products',
      error: error.message
    });
  }
});

// @route   GET /api/categories/export
// @desc    Export category data
// @access  Private
router.get('/export', async (req, res) => {
  try {
    const { format = 'json' } = req.query as { format?: string };

    const categories = await MProduct.aggregate([
      { $match: { merchantId: req.merchantId } },
      {
        $group: {
          _id: {
            category: '$category',
            subcategory: '$subcategory'
          },
          productCount: { $sum: 1 },
          products: {
            $push: {
              id: '$_id',
              name: '$name',
              sku: '$sku',
              price: '$price',
              status: '$status'
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id.category',
          subcategory: '$_id.subcategory',
          productCount: 1,
          products: 1
        }
      },
      { $sort: { category: 1, subcategory: 1 } }
    ]);

    if (format === 'csv') {
      // Convert to CSV format
      let csv = 'Category,Subcategory,Product Count,Product Names\n';
      categories.forEach(cat => {
        const productNames = cat.products.map((p: any) => p.name).join('; ');
        csv += `"${cat.category}","${cat.subcategory || ''}",${cat.productCount},"${productNames}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="categories.csv"');
      return res.send(csv);
    } else {
      // JSON format
      return res.json({
        success: true,
        data: {
          categories,
          exportedAt: new Date(),
          totalCategories: categories.length
        }
      });
    }
  } catch (error: any) {
    logger.error('Export categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to export categories',
      error: error.message
    });
  }
});


export default router;
