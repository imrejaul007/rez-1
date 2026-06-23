import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Category } from '../models/Category';
import { logger } from '../config/logger';
import { Order } from '../models/Order';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import {
  sendSuccess,
  sendNotFound
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { withCache } from '../utils/cacheHelper';
import { CacheTTL } from '../config/redis';

/**
 * Simple hex color lightener. Takes a hex color and returns a lighter version.
 */
function lightenHex(hex: string, percent: number = 30): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xFF) + Math.round(255 * percent / 100));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Get all categories with optional filtering
export const getCategories = asyncHandler(async (req: Request, res: Response) => {
  const { type, featured, parent, page = 1, limit = 50 } = req.query;

  try {
    const query: any = { isActive: true };

    if (type) query.type = type;
    if (featured !== undefined) query['metadata.featured'] = featured === 'true';
    if (parent === 'null' || parent === 'root') {
      query.parentCategory = null;
    } else if (parent) {
      query.parentCategory = parent;
    }

    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100); // cap at 100
    const skip = (pageNum - 1) * limitNum;

    const cacheKey = `categories:list:${JSON.stringify(query)}:${pageNum}:${limitNum}`;
    const [categories, total] = await withCache(cacheKey, CacheTTL.CATEGORY_LIST, () =>
      Promise.all([
        Category.find(query)
          .select('name slug image icon sortOrder type parentCategory childCategories metadata isActive')
          .populate('parentCategory', 'name slug')
          .populate('childCategories', 'name slug icon image sortOrder metadata isActive')
          .sort({ sortOrder: 1, name: 1 })
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Category.countDocuments(query)
      ])
    );

    sendSuccess(res, {
      categories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    }, 'Categories retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch categories', 500);
  }
});

// Get category tree structure
export const getCategoryTree = asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;

  try {
    // Get root categories first
    const query: any = { parentCategory: null, isActive: true };
    if (type) query.type = type;

    const treeCacheKey = `categories:tree:${type || 'all'}`;
    const rootCategories = await withCache(treeCacheKey, CacheTTL.CATEGORY_LIST, () =>
      Category.find(query)
        .select('name slug image icon sortOrder type childCategories isActive')
        .populate('childCategories', 'name slug icon image sortOrder metadata isActive')
        .sort({ sortOrder: 1, name: 1 })
        .limit(50)
        .lean()
    );

    sendSuccess(res, rootCategories, 'Category tree retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch category tree', 500);
  }
});

// Get single category by slug
export const getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const category = await Category.findOne({
      slug,
      isActive: true
    })
      .populate('parentCategory', 'name slug')
      .populate('childCategories', 'name slug icon image sortOrder metadata isActive')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    // Compute store count and max cashback for this category
    const storeStats = await Store.aggregate([
      { $match: { category: (category as any)._id, isActive: true } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          maxCashback: { $max: '$offers.cashback' }
        }
      }
    ]);

    const stats = storeStats[0] || { count: 0, maxCashback: 0 };
    const categoryWithStats = {
      ...category,
      storeCount: stats.count || (category as any).storeCount || 0,
      maxCashback: stats.maxCashback || (category as any).maxCashback || 0
    };

    sendSuccess(res, categoryWithStats, 'Category retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch category', 500);
  }
});

// Get categories with product/store counts
export const getCategoriesWithCounts = asyncHandler(async (req: Request, res: Response) => {
  const { type = 'general', page = 1, limit = 50 } = req.query;

  try {
    const query: any = { isActive: true };
    if (type) query.type = type;

    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const [categories, total] = await Promise.all([
      Category.find(query)
        .select('name slug image icon sortOrder type storeCount productCount maxCashback isActive')
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Category.countDocuments(query),
    ]);

    // Batch compute store stats and product counts for all categories at once
    const categoryIds = categories.map((c: any) => c._id);

    const [storeStatsArr, productStatsArr] = await Promise.all([
      Store.aggregate([
        { $match: { category: { $in: categoryIds }, isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            maxCashback: { $max: '$offers.cashback' }
          }
        }
      ]),
      Product.aggregate([
        { $match: { category: { $in: categoryIds }, isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const storeStatsMap = new Map(storeStatsArr.map((s: any) => [s._id?.toString(), s]));
    const productStatsMap = new Map(productStatsArr.map((p: any) => [p._id?.toString(), p]));

    const categoriesWithCounts = categories.map((category: any) => {
      const catId = category._id.toString();
      const storeStats = storeStatsMap.get(catId);
      const productStats = productStatsMap.get(catId);

      return {
        ...category,
        storeCount: storeStats?.count || category.storeCount || 0,
        productCount: productStats?.count || category.productCount || 0,
        maxCashback: storeStats?.maxCashback || category.maxCashback || 0
      };
    });

    sendSuccess(res, {
      categories: categoriesWithCounts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    }, 'Categories with counts retrieved successfully');

  } catch (error) {
    logger.error('Error fetching categories with counts:', error);
    throw new AppError('Failed to fetch categories with counts', 500);
  }
});

// Get root categories (no parent)
export const getRootCategories = asyncHandler(async (req: Request, res: Response) => {
  const { type, page = 1, limit = 50 } = req.query;

  try {
    const query: any = { parentCategory: null, isActive: true };
    if (type) query.type = type;

    const pageNum = Number(page);
    const limitNum = Math.min(Number(limit), 100);
    const skip = (pageNum - 1) * limitNum;

    const [rootCategories, total] = await Promise.all([
      Category.find(query)
        .select('name slug image icon sortOrder type childCategories isActive')
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Category.countDocuments(query)
    ]);

    sendSuccess(res, {
      categories: rootCategories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: pageNum < Math.ceil(total / limitNum),
        hasPrev: pageNum > 1
      }
    }, 'Root categories retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch root categories', 500);
  }
});

// Get featured categories
export const getFeaturedCategories = asyncHandler(async (req: Request, res: Response) => {
  const { type, limit = 6 } = req.query;

  try {
    const query: any = {
      isActive: true,
      'metadata.featured': true
    };

    if (type) query.type = type;

    const categories = await Category.find(query)
      .select('name slug image icon sortOrder type metadata isActive')
      .sort({ sortOrder: 1, name: 1 })
      .limit(Number(limit))
      .lean();

    sendSuccess(res, categories, 'Featured categories retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch featured categories', 500);
  }
});

// Get best discount categories
export const getBestDiscountCategories = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;
  const limitNum = Number(limit);

  try {
    const cacheKey = `category:bestDiscount:${limitNum}`;
    const categories = await withCache(cacheKey, 3600, async () => {
      // First try to get categories marked as best discount
      let cats = await Category.find({
        isActive: true,
        isBestDiscount: true
      })
        .select('name slug image icon sortOrder maxCashback storeCount isBestDiscount isActive')
        .sort({ maxCashback: -1, sortOrder: 1 })
        .limit(limitNum)
        .lean();

      // If no categories marked as best discount, get categories with highest cashback from stores
      if (cats.length === 0) {
        // Aggregate to find categories with highest cashback
        const categoryStats = await Store.aggregate([
          { $match: { isActive: true, 'offers.cashback': { $gt: 0 } } },
          {
            $group: {
              _id: '$category',
              maxCashback: { $max: '$offers.cashback' },
              storeCount: { $sum: 1 }
            }
          },
          { $sort: { maxCashback: -1 } },
          { $limit: limitNum }
        ]);

        if (categoryStats.length > 0) {
          const categoryIds = categoryStats.map(s => s._id).filter(Boolean);
          const categoryMap = new Map(categoryStats.map(s => [s._id?.toString(), s]));

          cats = await Category.find({
            _id: { $in: categoryIds },
            isActive: true
          })
            .select('name slug image icon sortOrder maxCashback storeCount isActive')
            .lean();

          // Add computed stats
          cats = cats.map((cat: any) => {
            const stats = categoryMap.get(cat._id.toString());
            return {
              ...cat,
              maxCashback: stats?.maxCashback || cat.maxCashback || 0,
              storeCount: stats?.storeCount || cat.storeCount || 0
            };
          });

          // Sort by maxCashback
          cats.sort((a: any, b: any) => (b.maxCashback || 0) - (a.maxCashback || 0));
        }
      } else {
        // Batch compute stats for all marked categories at once
        const markedCategoryIds = cats.map((c: any) => c._id);
        const batchStoreStats = await Store.aggregate([
          { $match: { category: { $in: markedCategoryIds }, isActive: true } },
          {
            $group: {
              _id: '$category',
              maxCashback: { $max: '$offers.cashback' },
              storeCount: { $sum: 1 }
            }
          }
        ]);
        const discountStatsMap = new Map(batchStoreStats.map((s: any) => [s._id?.toString(), s]));

        cats = cats.map((category: any) => {
          const stats = discountStatsMap.get(category._id.toString());
          return {
            ...category,
            maxCashback: stats?.maxCashback || category.maxCashback || 0,
            storeCount: stats?.storeCount || category.storeCount || 0
          };
        });
      }

      return cats;
    });

    sendSuccess(res, categories, 'Best discount categories retrieved successfully');

  } catch (error) {
    logger.error('Error fetching best discount categories:', error);
    throw new AppError('Failed to fetch best discount categories', 500);
  }
});

// Get best seller categories
export const getBestSellerCategories = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    // First try to get categories marked as best seller
    let categories = await Category.find({
      isActive: true,
      isBestSeller: true
    })
      .select('name slug image icon sortOrder productCount storeCount isBestSeller isActive')
      .sort({ productCount: -1, storeCount: -1, sortOrder: 1 })
      .limit(Number(limit))
      .lean();

    // If no categories marked as best seller, get categories with most products/stores
    if (categories.length === 0) {
      // Aggregate to find categories with most products
      const categoryStats = await Product.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            productCount: { $sum: 1 }
          }
        },
        { $sort: { productCount: -1 } },
        { $limit: Number(limit) }
      ]);

      if (categoryStats.length > 0) {
        const categoryIds = categoryStats.map(s => s._id).filter(Boolean);
        const categoryMap = new Map(categoryStats.map(s => [s._id?.toString(), s]));

        categories = await Category.find({
          _id: { $in: categoryIds },
          isActive: true
        })
          .select('name slug image icon sortOrder productCount storeCount isActive')
          .lean();

        // Batch compute store counts for all categories at once
        const fallbackCategoryIds = categories.map((c: any) => c._id);
        const fallbackStoreStats = await Store.aggregate([
          { $match: { category: { $in: fallbackCategoryIds }, isActive: true } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);
        const fallbackStoreMap = new Map(fallbackStoreStats.map((s: any) => [s._id?.toString(), s.count]));

        categories = categories.map((cat: any) => {
          const catId = cat._id.toString();
          const productStats = categoryMap.get(catId);
          return {
            ...cat,
            productCount: productStats?.productCount || cat.productCount || 0,
            storeCount: fallbackStoreMap.get(catId) || cat.storeCount || 0
          };
        });

        // Sort by productCount
        categories.sort((a: any, b: any) => (b.productCount || 0) - (a.productCount || 0));
      }
    } else {
      // Batch compute stats for all marked categories at once
      const markedIds = categories.map((c: any) => c._id);
      const [batchProductStats, batchStoreStats] = await Promise.all([
        Product.aggregate([
          { $match: { category: { $in: markedIds }, isActive: true } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ]),
        Store.aggregate([
          { $match: { category: { $in: markedIds }, isActive: true } },
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ])
      ]);
      const prodMap = new Map(batchProductStats.map((p: any) => [p._id?.toString(), p.count]));
      const storeMap = new Map(batchStoreStats.map((s: any) => [s._id?.toString(), s.count]));

      categories = categories.map((category: any) => {
        const catId = category._id.toString();
        return {
          ...category,
          productCount: prodMap.get(catId) || category.productCount || 0,
          storeCount: storeMap.get(catId) || category.storeCount || 0
        };
      });
    }

    sendSuccess(res, categories, 'Best seller categories retrieved successfully');

  } catch (error) {
    logger.error('Error fetching best seller categories:', error);
    throw new AppError('Failed to fetch best seller categories', 500);
  }
});

// Get category vibes
export const getCategoryVibes = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    // Get category with embedded vibes
    const category = await Category.findOne({ slug, isActive: true })
      .select('vibes')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    const vibes = category.vibes || [];

    sendSuccess(res, { vibes }, 'Category vibes retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch category vibes', 500);
  }
});

// Get category occasions
export const getCategoryOccasions = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    // Get category with embedded occasions
    const category = await Category.findOne({ slug, isActive: true })
      .select('occasions')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    const occasions = category.occasions || [];

    sendSuccess(res, { occasions }, 'Category occasions retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch category occasions', 500);
  }
});

// Get category hashtags
export const getCategoryHashtags = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { limit = 6 } = req.query;

  try {
    // Get category with embedded hashtags
    const category = await Category.findOne({ slug, isActive: true })
      .select('trendingHashtags')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    let hashtags = category.trendingHashtags || [];

    // Sort by trending first, then count
    hashtags = hashtags
      .sort((a: any, b: any) => {
        if (a.trending !== b.trending) return b.trending ? 1 : -1;
        return b.count - a.count;
      })
      .slice(0, Number(limit));

    sendSuccess(res, { hashtags }, 'Category hashtags retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch category hashtags', 500);
  }
});

// Get category AI suggestions
export const getCategoryAISuggestions = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const category = await Category.findOne({ slug, isActive: true })
      .select('aiSuggestions aiPlaceholders')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    sendSuccess(res, {
      suggestions: category.aiSuggestions || [],
      placeholders: category.aiPlaceholders || []
    }, 'Category AI suggestions retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch AI suggestions', 500);
  }
});

// Get category loyalty stats for a user
export const getCategoryLoyaltyStats = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const userId = (req as any).userId;

  try {
    const category = await Category.findOne({ slug, isActive: true }).lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    // If no user, return zeros
    if (!userId) {
      return sendSuccess(res, { ordersCount: 0, brandsCount: 0 }, 'Category loyalty stats retrieved successfully');
    }

    // Aggregate user's orders for this category (convert string userId to ObjectId for aggregation)
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const stats = await Order.aggregate([
      { $match: { user: userObjectId } },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'orderProducts'
        }
      },
      {
        $match: {
          'orderProducts.category': category._id
        }
      },
      {
        $group: {
          _id: null,
          ordersCount: { $sum: 1 },
          brands: { $addToSet: '$items.store' }
        }
      },
      {
        $project: {
          _id: 0,
          ordersCount: 1,
          brandsCount: {
            $size: {
              $reduce: {
                input: '$brands',
                initialValue: [],
                in: { $setUnion: ['$$value', '$$this'] }
              }
            }
          }
        }
      }
    ]);

    const result = stats[0] || { ordersCount: 0, brandsCount: 0 };
    sendSuccess(res, result, 'Category loyalty stats retrieved successfully');

  } catch (error) {
    logger.error('Loyalty Stats Error:', error);
    throw new AppError('Failed to fetch loyalty stats', 500);
  }
});

// Get recent orders for a category (for social proof ticker)
export const getRecentOrders = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const limit = parseInt(req.query.limit as string) || 5;

  try {
    const category = await Category.findOne({ slug, isActive: true }).lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    // First, find product IDs in this category to narrow down orders
    const categoryProductIds = await Product.find(
      { category: category._id, isActive: true },
      { _id: 1 }
    ).lean();
    const productIdSet = categoryProductIds.map(p => p._id);

    const recentOrders = await Order.aggregate([
      {
        $match: {
          'items.product': { $in: productIdSet }
        }
      },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: 'items.store',
          foreignField: '_id',
          as: 'storeInfo'
        }
      },
      {
        $project: {
          _id: 1,
          userFirstName: { $arrayElemAt: ['$userInfo.profile.firstName', 0] },
          userLastName: { $arrayElemAt: ['$userInfo.profile.lastName', 0] },
          storeName: { $arrayElemAt: ['$storeInfo.name', 0] },
          createdAt: 1
        }
      }
    ]);

    const formattedOrders = recentOrders.map(order => {
      const minutesAgo = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
      let timeAgo = '';
      if (minutesAgo < 1) timeAgo = 'just now';
      else if (minutesAgo < 60) timeAgo = `${minutesAgo}m ago`;
      else if (minutesAgo < 1440) timeAgo = `${Math.floor(minutesAgo / 60)}h ago`;
      else timeAgo = `${Math.floor(minutesAgo / 1440)}d ago`;

      // Construct display name from firstName and lastName
      const firstName = order.userFirstName || '';
      const lastInitial = order.userLastName ? order.userLastName[0] : '';
      const userName = firstName ? (lastInitial ? `${firstName} ${lastInitial}` : firstName) : 'Someone';

      return {
        id: order._id,
        userName,
        storeName: order.storeName || 'a store',
        timeAgo
      };
    });

    sendSuccess(res, { orders: formattedOrders }, 'Recent orders retrieved successfully');

  } catch (error) {
    logger.error('Recent Orders Error:', error);
    throw new AppError('Failed to fetch recent orders', 500);
  }
});

// Get full page configuration for a main category
// GET /categories/:slug/page-config
export const getCategoryPageConfig = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;

  try {
    const category = await Category.findOne({ slug, isActive: true })
      .select('name slug icon image bannerImage type pageConfig metadata vibes occasions trendingHashtags aiSuggestions aiPlaceholders promotions maxCashback childCategories sortOrder')
      .populate('childCategories', 'name slug icon image sortOrder metadata isActive maxCashback productCount storeCount')
      .lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    // Compute store stats for this category
    const subCategoryIds = (category.childCategories || []).map((c: any) => c._id);
    const allCategoryIds = [category._id, ...subCategoryIds];

    const storeStats = await Store.aggregate([
      { $match: { category: { $in: allCategoryIds }, isActive: true } },
      {
        $group: {
          _id: null,
          totalStores: { $sum: 1 },
          maxCashback: { $max: '$offers.cashback' },
          avgRating: { $avg: '$ratings.average' },
        },
      },
    ]);

    const stats = storeStats[0] || { totalStores: 0, maxCashback: 0, avgRating: 0 };

    // Build response - use pageConfig if available, otherwise return base category data
    const pageConfig = category.pageConfig || {} as any;

    // Default values for new pageConfig fields
    const defaults = {
      sortOptions: [
        { id: 'popularity', label: 'Popularity', icon: 'trending-up-outline', enabled: true, sortOrder: 0 },
        { id: 'rating', label: 'Rating', icon: 'star-outline', enabled: true, sortOrder: 1 },
        { id: 'delivery_time', label: 'Delivery Time', icon: 'time-outline', enabled: true, sortOrder: 2 },
        { id: 'newest', label: 'Newest', icon: 'sparkles-outline', enabled: true, sortOrder: 3 },
      ],
      filterOptions: { priceMax: 500, ratingThreshold: 4, showPriceFilter: true, showRatingFilter: true, showOpenNow: true },
      storeDisplayConfig: { storesPerPage: 10, tagExclusions: ['halal', 'pure-veg', 'veg', 'non-veg', 'jain'], defaultCoinsMultiplier: 4.5, defaultReviewBonus: 20, defaultVisitMilestone: 5 },
    };

    // Merge defaults with existing pageConfig (configured values take priority)
    const mergedConfig = {
      ...pageConfig,
      sortOptions: pageConfig.sortOptions?.length ? pageConfig.sortOptions : defaults.sortOptions,
      filterOptions: { ...defaults.filterOptions, ...(pageConfig.filterOptions || {}) },
      storeDisplayConfig: { ...defaults.storeDisplayConfig, ...(pageConfig.storeDisplayConfig || {}) },
    };

    // Transform serviceTypes for frontend compatibility (filterField → serviceFilter, add defaults)
    if (mergedConfig?.serviceTypes) {
      (mergedConfig as any).serviceTypes = (mergedConfig.serviceTypes as any[]).map((st: any) => ({
        ...st,
        serviceFilter: st.filterField,
        color: st.color || '#3B82F6',
        gradient: st.gradient?.length >= 2 ? st.gradient : [st.color || '#3B82F6', lightenHex(st.color || '#3B82F6')],
      }));
    }

    // HTTP caching
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    const etag = `"${category._id}-${(category as any).updatedAt?.getTime?.() || Date.now()}"`;
    res.set('ETag', etag);
    if (req.get('If-None-Match') === etag) {
      return res.status(304).end();
    }

    // Sort child categories by sortOrder
    const childCategories = (category.childCategories || [])
      .sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));

    sendSuccess(res, {
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        image: category.image,
        bannerImage: category.bannerImage,
        type: category.type,
        metadata: category.metadata,
        maxCashback: category.maxCashback,
      },
      pageConfig: mergedConfig,
      childCategories,
      // Embedded page data
      vibes: category.vibes || [],
      occasions: category.occasions || [],
      trendingHashtags: category.trendingHashtags || [],
      aiSuggestions: category.aiSuggestions || [],
      aiPlaceholders: category.aiPlaceholders || [],
      promotions: category.promotions || [],
      // Computed stats
      stats,
    }, 'Category page config retrieved successfully');

  } catch (error) {
    logger.error('Category Page Config Error:', error);
    throw new AppError('Failed to fetch category page config', 500);
  }
});