import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import { Store } from '../models/Store';
import {
  sendSuccess,
  sendNotFound,
  sendPaginated,
  sendError
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import redisService from '../services/redisService';
import { CacheTTL } from '../config/redis';
import { escapeRegex } from '../utils/sanitize';
import { CacheKeys, generateQueryCacheKey, withCache } from '../utils/cacheHelper';
import { logProductSearch } from '../services/searchHistoryService';
import { modeService, ModeId } from '../services/modeService';
import { regionService, isValidRegion, RegionId, getRegionConfig } from '../services/regionService';
import { logger } from '../config/logger';

// Get all products with filtering and pagination
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    store,
    minPrice,
    maxPrice,
    rating,
    inStock,
    featured,
    search,
    sortBy = 'createdAt',
    page = 1,
    limit = 20,
    excludeProducts,
    diversityMode = 'none',
    mode, // New: mode filter for 4-mode system
    region, // Region filter parameter
    tags, // Vibe/tag filtering for Shop by Vibe feature
    occasion, // Occasion filtering for Shop by Occasion feature
    brand // Brand filtering
  } = req.query;

  // Parse and validate mode
  const activeMode: ModeId = modeService.getModeFromRequest(
    mode as string | undefined,
    (req as any).user?.preferences?.activeMode
  );

  // Get region for cache key
  const regionHeader = req.headers['x-rez-region'] as string;
  const effectiveRegionForCache = (region as string) || regionHeader || 'all';

  // Try to get from cache first (skip if excludeProducts or diversityMode is used)
  if (!excludeProducts && diversityMode === 'none') {
    const filterHash = generateQueryCacheKey({
      category, store, minPrice, maxPrice, rating, inStock, featured, search, sortBy, page, limit, mode: activeMode, region: effectiveRegionForCache, tags, occasion, brand
    });
    const cacheKey = CacheKeys.productList(filterHash);
    const cachedData = await redisService.get<any>(cacheKey);

    if (cachedData) {
      return sendPaginated(res, cachedData.products, Number(page), Number(limit), cachedData.total);
    }
  }

  // Build query
  const query: any = {
    isActive: true,
    'inventory.isAvailable': true
  };

  // Build combined store filter for mode + region in a single query
  const effectiveRegion = (region as string) || regionHeader;
  const needsModeFilter = activeMode !== 'near-u';
  const needsRegionFilter = effectiveRegion && isValidRegion(effectiveRegion);

  if (needsModeFilter || needsRegionFilter) {
    // Build a single combined store filter
    const combinedStoreFilter: any = { isActive: true };

    if (needsModeFilter) {
      const modeStoreFilter = modeService.getStoreFilter(activeMode);
      Object.assign(combinedStoreFilter, modeStoreFilter);
    }

    if (needsRegionFilter) {
      const regionStoreFilter = regionService.getStoreFilter(effectiveRegion as RegionId);
      Object.assign(combinedStoreFilter, regionStoreFilter);
    }

    // Single DB query instead of two sequential ones
    const filteredStores = await Store.find(combinedStoreFilter).select('_id').lean();
    const filteredStoreIds = filteredStores.map(s => s._id);

    if (filteredStoreIds.length > 0) {
      if (store) {
        // Specific store requested, check if it matches the filters
        const storeInFiltered = filteredStoreIds.some((id: any) =>
          id.toString() === (store as string).toString()
        );
        if (!storeInFiltered && needsRegionFilter) {
          // Store not in region - return empty result
          return sendPaginated(res, [], Number(page), Number(limit), 0);
        }
        // If store matches or only mode filter, let the specific store override below
      } else {
        query.store = { $in: filteredStoreIds };
      }
    } else if (needsRegionFilter) {
      // No stores match filters - return empty result
      return sendPaginated(res, [], Number(page), Number(limit), 0);
    }
  }

  // Apply filters
  if (category) {
    // Category can be either an ObjectId or a slug
    const categoryStr = category as string;
    if (mongoose.isValidObjectId(categoryStr)) {
      query.category = categoryStr;
    } else {
      // Treat as slug - look up the category
      const categoryDoc = await Category.findOne({ slug: categoryStr }).select('_id').lean();
      if (categoryDoc) {
        query.category = categoryDoc._id;
      } else {
        // Return empty results if category not found
        return sendPaginated(res, [], Number(page), Number(limit), 0);
      }
    }
  }
  if (store) query.store = store; // Override mode filter if specific store requested
  if (featured !== undefined) query.isFeatured = featured === 'true';
  if (inStock === 'true') query['inventory.stock'] = { $gt: 0 };

  // Tag/Vibe filtering - for Shop by Vibe feature
  if (tags) {
    // Support comma-separated tags for multiple tag filtering
    const tagList = (tags as string).split(',').map(t => t.trim().toLowerCase());
    if (tagList.length === 1) {
      // Single tag - use $regex for case-insensitive search
      query.tags = { $regex: escapeRegex(tagList[0]), $options: 'i' };
    } else {
      // Multiple tags - use $or with regex for each tag
      const tagConditions = tagList.map(t => ({ tags: { $regex: escapeRegex(t), $options: 'i' } }));
      if (query.$or) {
        // If $or already exists, combine with $and
        query.$and = query.$and || [];
        query.$and.push({ $or: tagConditions });
      } else {
        query.$or = tagConditions;
      }
    }
  }

  // Occasion filtering - for Shop by Occasion feature
  if (occasion) {
    // Products may have occasion field or be tagged with occasion names
    const occasionConditions = [
      { occasion: { $regex: escapeRegex(occasion as string), $options: 'i' } },
      { tags: { $regex: escapeRegex(occasion as string), $options: 'i' } },
      { 'metadata.occasion': { $regex: escapeRegex(occasion as string), $options: 'i' } }
    ];

    if (query.$or) {
      // If $or already used (e.g., by tags), use $and to combine
      query.$and = query.$and || [];
      query.$and.push({ $or: occasionConditions });
    } else {
      query.$or = occasionConditions;
    }
  }

  // Brand filtering
  if (brand) {
    query.brand = { $regex: escapeRegex(brand as string), $options: 'i' };
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query['pricing.selling'] = {};
    if (minPrice) query['pricing.selling'].$gte = Number(minPrice);
    if (maxPrice) query['pricing.selling'].$lte = Number(maxPrice);
  }

  // Rating filter
  if (rating) {
    query['ratings.average'] = { $gte: Number(rating) };
  }

  // Exclude products filter - parse comma-separated string to ObjectId array
  if (excludeProducts && typeof excludeProducts === 'string') {
    const excludedIds = excludeProducts.split(',').map(id => {
      try {
        return new mongoose.Types.ObjectId(id.trim());
      } catch (error) {
        return null;
      }
    }).filter(id => id !== null);

    if (excludedIds.length > 0) {
      query._id = { $nin: excludedIds };
    }
  }

  try {
    let productsQuery = Product.find(query)
      .populate('category', 'name slug')
      .populate('store', 'name logo location.city').lean();

    // Apply search if provided
    if (search) {
      productsQuery = Product.find({
        ...query,
        $text: { $search: search as string }
      })
        .select({ score: { $meta: 'textScore' } })
        .populate('category', 'name slug')
        .populate('store', 'name logo location.city')
        .sort({ score: { $meta: 'textScore' } }).lean();
    } else {
      // Apply sorting
      let sortOptions: any = {};
      switch (sortBy) {
        case 'price_low':
          sortOptions = { 'pricing.selling': 1 };
          break;
        case 'price_high':
          sortOptions = { 'pricing.selling': -1 };
          break;
        case 'rating':
          sortOptions = { 'ratings.average': -1, 'ratings.count': -1 };
          break;
        case 'newest':
          sortOptions = { createdAt: -1 };
          break;
        case 'popular':
          sortOptions = { 'analytics.views': -1, 'analytics.purchases': -1 };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }

      productsQuery = productsQuery.sort(sortOptions);
    }

    // Run count and paginated find in parallel
    const skip = (Number(page) - 1) * Number(limit);
    const [totalProducts, products] = await Promise.all([
      Product.countDocuments(search ? { ...query, $text: { $search: search as string } } : query),
      productsQuery
        .skip(skip)
        .limit(Number(limit))
        .lean()
    ]);

    // Track views for authenticated users
    if (req.user && products.length > 0) {
      // Increment view count for products (async, don't wait)
      Product.updateMany(
        { _id: { $in: products.map(p => p._id) } },
        { $inc: { 'analytics.views': 1 } }
      ).catch((err) => logger.error('[ProductCtrl] Product view count increment failed', { error: err.message }));
    }

    // Log search history for authenticated users (async, don't block)
    if (req.user && search) {
      logProductSearch(
        (req.user as any)._id,
        search as string,
        totalProducts,
        {
          category: category as string,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          rating: rating ? Number(rating) : undefined
        }
      ).catch((err) => logger.error('[ProductCtrl] Product search history logging failed', { error: err.message, userId: (req.user as any)?._id }));
    }

    // Apply diversity mode if specified
    let finalProducts = products;
    if (diversityMode && diversityMode !== 'none') {
      // Import diversityService dynamically to avoid circular dependencies
      const { diversityService } = await import('../services/diversityService');

      // Cast products to any to avoid type mismatch (Mongoose lean() types vs DiversityProduct)
      const diverseProducts = await diversityService.applyDiversityMode(
        products as any,
        diversityMode as 'balanced' | 'category_diverse' | 'price_diverse',
        {
          maxPerCategory: 2,
          maxPerBrand: 2,
          priceRanges: 3,
          minRating: 3.0
        }
      );

      // Cast back to original type
      finalProducts = diverseProducts as any;
    }

    // Cache the results (only if no excludeProducts or diversityMode)
    if (!excludeProducts && diversityMode === 'none') {
      const filterHash = generateQueryCacheKey({
        category, store, minPrice, maxPrice, rating, inStock, featured, search, sortBy, page, limit, tags, occasion, brand
      });
      const cacheKey = CacheKeys.productList(filterHash);
      await redisService.set(
        cacheKey,
        { products: finalProducts, total: totalProducts },
        CacheTTL.PRODUCT_LIST
      );
    }

    sendPaginated(res, finalProducts, Number(page), Number(limit), totalProducts);

  } catch (error) {
    throw new AppError('Failed to fetch products', 500);
  }
});

// Get single product by ID
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Try to get from cache first
    const cacheKey = CacheKeys.product(id);
    const cachedProduct = await redisService.get<any>(cacheKey);

    if (cachedProduct) {
      return sendSuccess(res, cachedProduct, 'Product retrieved successfully');
    }

    // Use non-lean query to access Mongoose instance methods (calculateCashback, getEstimatedDelivery)
    const productDoc = await Product.findOne({
      _id: id,
      isActive: true
    })
      .populate('category', 'name slug type')
      .populate('store', 'name logo slug location contact ratings operationalInfo')
      .populate('serviceCategory', 'name slug icon cashbackPercentage');

    if (!productDoc) {
      return sendNotFound(res, 'Product not found');
    }

    // Run instance method computation and similar products query in parallel
    const cashbackAmount = productDoc.calculateCashback();
    const estimatedDelivery = productDoc.getEstimatedDelivery();

    const similarProducts = await Product.find({
      category: productDoc.category,
      _id: { $ne: productDoc._id },
      isActive: true,
      'inventory.isAvailable': true
    })
      .select('name title image price rating')
      .limit(6)
      .lean();

    const product = productDoc.toObject();

    const response = {
      ...product,
      similarProducts,
      // Add computed fields for immediate use
      computedCashback: {
        amount: cashbackAmount,
        percentage: product.cashback?.percentage || 5
      },
      computedDelivery: estimatedDelivery,
      todayPurchases: product.analytics?.todayPurchases || 0,
      todayViews: product.analytics?.todayViews || 0
    };

    // Cache the product data
    await redisService.set(cacheKey, response, CacheTTL.PRODUCT_DETAIL);

    sendSuccess(res, response, 'Product retrieved successfully');

  } catch (error) {
    logger.error('[GET PRODUCT BY ID] Error occurred:', error);
    throw new AppError('Failed to fetch product', 500);
  }
});

// Get products by category
export const getProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categorySlug } = req.params;
  const {
    minPrice,
    maxPrice,
    rating,
    sort,
    sortBy: sortByParam,
    page = 1,
    limit = 20
  } = req.query;
  const sortBy = sort || sortByParam || 'createdAt';

  try {
    // Try to get from cache first
    const categoryFilterHash = generateQueryCacheKey({ minPrice, maxPrice, rating, sortBy, page, limit });
    const categoryCacheKey = CacheKeys.productsByCategory(categorySlug, categoryFilterHash);
    const cachedData = await redisService.get<any>(categoryCacheKey);

    if (cachedData) {
      return sendPaginated(res, [cachedData.response], Number(page), Number(limit), cachedData.total);
    }

    // Find category
    const category = await Category.findOne({
      slug: categorySlug,
      isActive: true
    }).lean();

    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    // Build query
    const query: any = {
      category: category._id,
      isActive: true,
      'inventory.isAvailable': true
    };

    // Apply filters
    if (minPrice || maxPrice) {
      query['pricing.selling'] = {};
      if (minPrice) query['pricing.selling'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.selling'].$lte = Number(maxPrice);
    }

    if (rating) {
      query['ratings.average'] = { $gte: Number(rating) };
    }

    // Get total count
    const totalProducts = await Product.countDocuments(query);

    // Apply sorting
    let sortOptions: any = {};
    switch (sortBy) {
      case 'price_low':
        sortOptions = { 'pricing.selling': 1 };
        break;
      case 'price_high':
        sortOptions = { 'pricing.selling': -1 };
        break;
      case 'rating':
        sortOptions = { 'ratings.average': -1 };
        break;
      case 'popularity':
        sortOptions = { 'ratings.count': -1, 'ratings.average': -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Get products
    const skip = (Number(page) - 1) * Number(limit);
    const products = await Product.find(query)
      .populate('store', 'name logo location.city')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const response = {
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image
      },
      products
    };

    // Cache the results
    await redisService.set(
      categoryCacheKey,
      { response, total: totalProducts },
      CacheTTL.PRODUCT_LIST
    );

    sendPaginated(res, [response], Number(page), Number(limit), totalProducts);

  } catch (error) {
    throw new AppError('Failed to fetch products by category', 500);
  }
});

// Get products by subcategory slug - FOR BROWSE CATEGORIES SLIDER
export const getProductsBySubcategory = asyncHandler(async (req: Request, res: Response) => {
  const { subcategorySlug } = req.params;
  const { limit = 10 } = req.query;

  try {
    // First, try to find subcategory in Category collection
    const subcategory = await Category.findOne({
      slug: subcategorySlug,
      isActive: true
    }).lean();

    let products: any[] = [];

    if (subcategory) {
      // Found subcategory - get products with this subCategory
      products = await Product.find({
        $or: [
          { subCategory: subcategory._id },
          { category: subcategory._id }
        ],
        isActive: true
      })
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug')
        .populate('store', 'name logo operationalInfo location subcategorySlug')
        .sort({ 'ratings.average': -1, 'cashback.percentage': -1 })
        .limit(Number(limit))
        .lean();
    }

    // If no products found via Category, try via Store's subcategorySlug
    if (products.length === 0) {
      // Find stores with this subcategorySlug
      const stores = await Store.find({
        subcategorySlug: subcategorySlug,
        isActive: true
      }).select('_id').lean();

      if (stores.length > 0) {
        const storeIds = stores.map(s => s._id);

        products = await Product.find({
          store: { $in: storeIds },
          isActive: true
        })
          .populate('category', 'name slug')
          .populate('subCategory', 'name slug')
          .populate('store', 'name logo operationalInfo location subcategorySlug')
          .sort({ 'ratings.average': -1, 'cashback.percentage': -1 })
          .limit(Number(limit))
          .lean();
      }
    }

    // Transform products for frontend
    const transformedProducts = products.map((product: any) => {
      let productImage = '';
      if (Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];
        productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
      } else if (product.image) {
        productImage = product.image;
      }

      return {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.name || 'Unnamed Product',
        image: productImage,
        images: product.images,
        price: product.pricing?.selling || product.pricing?.salePrice || 0,
        originalPrice: product.pricing?.original || product.pricing?.basePrice || product.pricing?.selling || 0,
        discount: product.pricing?.discount || 0,
        rating: product.ratings?.average || 0,
        reviewCount: product.ratings?.count || 0,
        category: product.category?.name || '',
        subCategory: product.subCategory?.name || '',
        subSubCategory: product.subSubCategory || '',
        store: product.store ? {
          id: product.store._id?.toString(),
          name: product.store.name,
          logo: product.store.logo,
          subcategorySlug: product.store.subcategorySlug
        } : null,
        cashback: product.cashback?.percentage || 0,
        description: product.description || '',
        isFeatured: product.isFeatured || false
      };
    });

    sendSuccess(res, transformedProducts, `Products for subcategory: ${subcategorySlug}`);

  } catch (error) {
    logger.error('❌ [SUBCATEGORY PRODUCTS] Error:', error);
    throw new AppError('Failed to fetch products by subcategory', 500);
  }
});

// Get products by store
export const getProductsByStore = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const {
    category,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    page = 1,
    limit = 20
  } = req.query;

  try {
    // Check if storeId is a valid ObjectId format (24 hex characters)
    // If not, return empty results immediately since store field only accepts ObjectIds
    if (!mongoose.Types.ObjectId.isValid(storeId) || !/^[0-9a-fA-F]{24}$/.test(storeId)) {
      return sendPaginated(res, [], Number(page), Number(limit), 0);
    }

    // Try to get from cache first
    const storeFilterHash = generateQueryCacheKey({ category, minPrice, maxPrice, sortBy, page, limit });
    const storeCacheKey = CacheKeys.productsByStore(storeId, storeFilterHash);
    const cachedData = await redisService.get<any>(storeCacheKey);

    if (cachedData) {
      return sendPaginated(res, [cachedData.response], Number(page), Number(limit), cachedData.total);
    }

    // Verify store exists
    const store = await Store.findOne({
      _id: new mongoose.Types.ObjectId(storeId),
      isActive: true
    }).lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Build query
    const query: any = {
      store: new mongoose.Types.ObjectId(storeId),
      isActive: true,
      'inventory.isAvailable': true
    };

    // Apply filters
    if (category) {
      // Category can be either an ObjectId or a slug
      const categoryStr = category as string;
      if (mongoose.isValidObjectId(categoryStr)) {
        query.category = categoryStr;
      } else {
        // Treat as slug - look up the category
        const categoryDoc = await Category.findOne({ slug: categoryStr }).select('_id').lean();
        if (categoryDoc) {
          query.category = categoryDoc._id;
        }
        // If category not found, skip the filter (will return all products for the store)
      }
    }
    if (minPrice || maxPrice) {
      query['pricing.selling'] = {};
      if (minPrice) query['pricing.selling'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.selling'].$lte = Number(maxPrice);
    }

    // Get total count
    const totalProducts = await Product.countDocuments(query);

    // Apply sorting
    let sortOptions: any = {};
    switch (sortBy) {
      case 'price_low':
        sortOptions = { 'pricing.selling': 1 };
        break;
      case 'price_high':
        sortOptions = { 'pricing.selling': -1 };
        break;
      case 'rating':
        sortOptions = { 'ratings.average': -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Get products
    const skip = (Number(page) - 1) * Number(limit);
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const response = {
      store: {
        id: store._id,
        name: store.name,
        logo: store.logo,
        ratings: store.ratings
      },
      products
    };

    // Cache the results
    await redisService.set(
      storeCacheKey,
      { response, total: totalProducts },
      CacheTTL.STORE_PRODUCTS
    );

    sendPaginated(res, [response], Number(page), Number(limit), totalProducts);

  } catch (error) {
    throw new AppError('Failed to fetch store products', 500);
  }
});

// Get featured products - FOR FRONTEND "Just for You" SECTION
export const getFeaturedProducts = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Try to get from cache first (cache key includes region)
    const cacheKey = `${CacheKeys.productFeatured(Number(limit))}:${region || 'all'}`;
    const cachedProducts = await redisService.get<any[]>(cacheKey);

    if (cachedProducts) {
      return sendSuccess(res, cachedProducts, 'Featured products retrieved successfully');
    }

    // Build base query with region filter
    const baseQuery: Record<string, any> = {
      isActive: true,
      'inventory.isAvailable': true
    };

    // Add region filter by finding stores in region first
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      baseQuery.store = { $in: storeIds };
    }

    // Try the full query for featured products first
    let products = await Product.find({
      ...baseQuery,
      isFeatured: true
    })
      .populate('category', 'name slug')
      .populate('store', 'name slug logo location')
      .sort({ 'ratings.average': -1, createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Fallback: If no featured products, get any active products with good ratings
    if (products.length === 0) {
      products = await Product.find(baseQuery)
        .populate('category', 'name slug')
        .populate('store', 'name slug logo location')
        .sort({ 'ratings.average': -1, 'ratings.count': -1, createdAt: -1 })
        .limit(Number(limit))
        .lean();
    }

    // Second fallback: If still no products in region, get any active products (still respecting region)
    if (products.length === 0) {
      const fallbackQuery = { ...baseQuery };
      delete fallbackQuery['inventory.isAvailable'];
      products = await Product.find(fallbackQuery)
        .populate('category', 'name slug')
        .populate('store', 'name slug logo location')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .lean();
    }

    // Transform data to match frontend ProductItem interface
    const transformedProducts = products.map(product => {
      return {
        id: product._id,
        type: 'product',
        title: product.title || product.name,
        name: product.name,
        brand: product.brand || 'Generic',
        image: product.image || product.images?.[0] || '',
        description: product.description || '',
        price: {
          current: product.price?.current || product.pricing?.selling || 0,
          original: product.price?.original || product.pricing?.original || 0,
          currency: product.price?.currency || product.pricing?.currency || '₹',
          discount: product.price?.discount || product.pricing?.discount || 0
        },
        category: (product.category as any)?.name || product.category || 'General',
        rating: {
          value: product.rating?.value || product.ratings?.average || 0,
          count: product.rating?.count || product.ratings?.count || 0
        },
        availabilityStatus: product.availabilityStatus || (product.inventory?.stock > 0 ? 'in_stock' : 'out_of_stock'),
        tags: product.tags || [],
        isRecommended: true,
        store: product.store
      };
    });

    // Cache the results
    await redisService.set(cacheKey, transformedProducts, CacheTTL.PRODUCT_FEATURED);

    sendSuccess(res, transformedProducts, 'Featured products retrieved successfully');
  } catch (error) {
    logger.error('❌ [FEATURED PRODUCTS] Error occurred:', error);
    logger.error('❌ [FEATURED PRODUCTS] Error message:', error instanceof Error ? error.message : 'Unknown error');
    logger.error('❌ [FEATURED PRODUCTS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new AppError('Failed to fetch featured products', 500);
  }
});

// Get new arrival products - FOR FRONTEND "New Arrivals" SECTION
export const getNewArrivals = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Try to get from cache first (cache key includes region)
    const cacheKey = `${CacheKeys.productNewArrivals(Number(limit))}:${region || 'all'}`;
    const cachedProducts = await redisService.get<any[]>(cacheKey);

    if (cachedProducts) {
      return sendSuccess(res, cachedProducts, 'New arrival products retrieved successfully');
    }

    // Build query with region filter
    const query: Record<string, any> = {
      isActive: true,
      'inventory.isAvailable': true
    };

    // Add region filter by finding stores in region first
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      query.store = { $in: storeIds };
    }

    // Execute query
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('store', 'name slug logo location')
      .sort({ createdAt: -1 }) // Most recent first
      .limit(Number(limit))
      .lean();

    // Transform data to match frontend ProductItem interface
    const transformedProducts = products.map(product => {
      return {
        id: product._id,
        type: 'product',
        title: product.title || product.name,
        name: product.name,
        brand: product.brand || 'Generic',
        image: product.image || product.images?.[0] || '',
        description: product.description || '',
        price: {
          current: product.price?.current || product.pricing?.selling || 0,
          original: product.price?.original || product.pricing?.original || 0,
          currency: product.price?.currency || product.pricing?.currency || '₹',
          discount: product.price?.discount || product.pricing?.discount || 0
        },
        category: (product.category as any)?.name || product.category || 'General',
        rating: {
          value: product.rating?.value || product.ratings?.average || 0,
          count: product.rating?.count || product.ratings?.count || 0
        },
        availabilityStatus: product.availabilityStatus || (product.inventory?.stock > 0 ? 'in_stock' : 'out_of_stock'),
        tags: product.tags || [],
        isNewArrival: true,
        arrivalDate: product.arrivalDate || product.createdAt.toISOString().split('T')[0], // Format as YYYY-MM-DD
        store: product.store,
        // Include cashback information
        cashback: product.cashback?.percentage || (product.store as any)?.cashback?.percentage 
          ? {
              percentage: product.cashback?.percentage || (product.store as any)?.cashback?.percentage || 5,
              maxAmount: product.cashback?.maxAmount || (product.store as any)?.cashback?.maxAmount
            }
          : {
              percentage: 5, // Default cashback for new arrivals
              maxAmount: 500
            }
      };
    });

    // Cache the results
    await redisService.set(cacheKey, transformedProducts, CacheTTL.PRODUCT_NEW_ARRIVALS);

    sendSuccess(res, transformedProducts, 'New arrival products retrieved successfully');
  } catch (error) {
    logger.error('❌ [NEW ARRIVALS] Error occurred:', error);
    logger.error('❌ [NEW ARRIVALS] Error message:', error instanceof Error ? error.message : 'Unknown error');
    logger.error('❌ [NEW ARRIVALS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    throw new AppError('Failed to fetch new arrival products', 500);
  }
});

// Search products
export const searchProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    q: searchText,
    category,
    store,
    brand,
    minPrice,
    maxPrice,
    rating,
    inStock,
    page = 1,
    limit = 20
  } = req.query;

  if (!searchText) {
    return sendError(res, 'Search query is required', 400);
  }

  try {
    // Try to get from cache first
    const searchFilterHash = generateQueryCacheKey({
      category, store, brand, minPrice, maxPrice, rating, inStock, page, limit
    });
    const searchCacheKey = CacheKeys.productSearch(searchText as string, searchFilterHash);
    const cachedData = await redisService.get<any>(searchCacheKey);

    if (cachedData) {
      return sendPaginated(res, cachedData.products, Number(page), Number(limit), cachedData.total);
    }

    // Build filters
    const filters: any = {};
    if (category) filters.category = category;
    if (store) filters.store = store;
    if (brand) filters.brand = brand;
    if (minPrice || maxPrice) {
      filters.priceRange = {};
      if (minPrice) filters.priceRange.min = Number(minPrice);
      if (maxPrice) filters.priceRange.max = Number(maxPrice);
    }
    if (rating) filters.rating = Number(rating);
    if (inStock === 'true') filters.inStock = true;

    // Pagination options
    const options = {
      limit: Number(limit),
      skip: (Number(page) - 1) * Number(limit)
    };

    // Search products using text search and filters
    const searchQuery: any = {
      isActive: true,
      $text: { $search: searchText as string }
    };

    // Apply filters to the query
    if (filters.category) searchQuery.category = filters.category;
    if (filters.store) searchQuery.store = filters.store;
    if (filters.priceRange) {
      searchQuery.basePrice = {};
      if (filters.priceRange.min) searchQuery.basePrice.$gte = filters.priceRange.min;
      if (filters.priceRange.max) searchQuery.basePrice.$lte = filters.priceRange.max;
    }
    if (filters.rating) searchQuery.averageRating = { $gte: filters.rating };
    if (filters.inStock) searchQuery.inventory = { $gt: 0 };

    let products = await Product.find(searchQuery)
      .populate('category', 'name slug')
      .populate('store', 'name slug')
      .skip(options.skip)
      .limit(options.limit)
      .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
      .lean();

    let total = 0;

    if (products.length > 0) {
      // Get total count for text search
      total = await Product.countDocuments({
        $text: { $search: searchText as string },
        isActive: true,
        ...filters
      });
    } else {
      // Fallback to regex search for partial matches (e.g. "ch" -> "chicken")
      const regexQuery: any = {
        isActive: true,
        name: { $regex: escapeRegex(searchText as string), $options: 'i' },
      };
      if (filters.category) regexQuery.category = filters.category;
      if (filters.store) regexQuery.store = filters.store;
      if (filters.priceRange) {
        regexQuery.basePrice = {};
        if (filters.priceRange.min) regexQuery.basePrice.$gte = filters.priceRange.min;
        if (filters.priceRange.max) regexQuery.basePrice.$lte = filters.priceRange.max;
      }
      if (filters.rating) regexQuery.averageRating = { $gte: filters.rating };
      if (filters.inStock) regexQuery.inventory = { $gt: 0 };

      products = await Product.find(regexQuery)
        .populate('category', 'name slug')
        .populate('store', 'name slug')
        .skip(options.skip)
        .limit(options.limit)
        .sort({ createdAt: -1 })
        .lean();

      total = await Product.countDocuments(regexQuery);
    }

    // Cache the results
    await redisService.set(
      searchCacheKey,
      { products, total },
      CacheTTL.PRODUCT_SEARCH
    );

    sendPaginated(res, products, Number(page), Number(limit), total);

  } catch (error) {
    throw new AppError('Search failed', 500);
  }
});

// Get product recommendations
export const getRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { limit = 6 } = req.query;

  try {
    const product = await Product.findById(productId).lean() as any;

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    // Get recommendations based on category and price range
    const priceRange = {
      min: product.pricing.selling * 0.5,
      max: product.pricing.selling * 1.5
    };

    const recommendations = await Product.find({
      category: product.category,
      _id: { $ne: productId },
      isActive: true,
      'inventory.isAvailable': true,
      'pricing.selling': {
        $gte: priceRange.min,
        $lte: priceRange.max
      }
    })
      .populate('category', 'name slug')  // ✅ Populate category
      .populate('store', 'name logo')
      .sort({ 'ratings.average': -1, 'analytics.purchases': -1 })
      .limit(Number(limit))
      .lean();

    // ✅ CRITICAL FIX: Transform data for frontend
    const transformedRecommendations = recommendations.map((product: any) => {
      // Safely extract pricing
      const sellingPrice = product.pricing?.selling || product.price || 0;
      const originalPrice = product.pricing?.original || product.originalPrice || sellingPrice;
      const discount = product.pricing?.discount ||
        (originalPrice > sellingPrice ?
          Math.round(((originalPrice - sellingPrice) / originalPrice) * 100) : 0);

      // Safely extract image
      let productImage = '';
      if (Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];
        productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
      } else if (product.image) {
        productImage = product.image;
      }

      return {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.name || 'Unnamed Product',
        image: productImage,
        price: sellingPrice,  // ✅ FIXED: Now properly extracts price
        originalPrice: originalPrice,
        discount: discount,
        rating: product.ratings?.average || 0,
        reviewCount: product.ratings?.count || 0,
        brand: product.brand || '',
        cashback: (product.cashback?.percentage || 0) > 0,
        cashbackPercentage: product.cashback?.percentage || 0,
        category: product.category?.name || (typeof product.category === 'string' ? product.category : ''),  // ✅ FIXED: Properly extract category
        store: product.store,
      };
    });

    sendSuccess(res, transformedRecommendations, 'Product recommendations retrieved successfully');

  } catch (error) {
    logger.error('❌ [RECOMMENDATIONS] Error:', error);
    throw new AppError('Failed to get recommendations', 500);
  }
});

// Track product view and increment analytics
export const trackProductView = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id) as any;

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    // Increment views with daily analytics
    await product.incrementViews();

    // Track user-specific view if authenticated
    if (req.user) {
      // You could also track in user activity here
    }

    sendSuccess(res, {
      views: product.analytics.views,
      todayViews: product.analytics.todayViews
    }, 'Product view tracked successfully');

  } catch (error) {
    logger.error('❌ [TRACK VIEW] Error:', error);
    throw new AppError('Failed to track product view', 500);
  }
});

// Get product analytics including "people bought today"
export const getProductAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // Use non-lean query to access Mongoose instance methods
    const product = await Product.findById(id)
      .select('analytics cashback deliveryInfo pricing inventory store');

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    // Calculate cashback for display
    const cashbackAmount = product.calculateCashback();

    // Get estimated delivery based on user location (if available)
    let userLocation = null;
    try {
      userLocation = req.query.location ? JSON.parse(req.query.location as string) : null;
    } catch { /* ignore malformed location JSON */ }
    const estimatedDelivery = product.getEstimatedDelivery(userLocation);

    const analytics = {
      totalViews: product.analytics.views,
      totalPurchases: product.analytics.purchases,
      todayViews: product.analytics.todayViews || 0,
      todayPurchases: product.analytics.todayPurchases || 0,
      peopleBoughtToday: product.analytics.todayPurchases || Math.floor(Math.random() * 50) + 100, // Fallback for demo
      cashback: {
        percentage: product.cashback?.percentage || 5,
        amount: cashbackAmount,
        maxAmount: product.cashback?.maxAmount,
        terms: product.cashback?.terms
      },
      delivery: {
        estimated: estimatedDelivery,
        freeShippingThreshold: product.deliveryInfo?.freeShippingThreshold || 500,
        expressAvailable: product.deliveryInfo?.expressAvailable || false
      },
      rating: {
        average: product.analytics.avgRating,
        conversions: product.analytics.conversions
      }
    };

    sendSuccess(res, analytics, 'Product analytics retrieved successfully');

  } catch (error) {
    logger.error('❌ [PRODUCT ANALYTICS] Error:', error);
    throw new AppError('Failed to get product analytics', 500);
  }
});

// Get frequently bought together products
export const getFrequentlyBoughtTogether = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit = 4 } = req.query;

  try {
    const product = await Product.findById(id)
      .populate({
        path: 'frequentlyBoughtWith.productId',
        select: 'name title price pricing image images rating ratings inventory'
      }).lean() as any;

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    // Sort by purchase count and get top items
    const frequentProducts = product.frequentlyBoughtWith
      ?.sort((a: any, b: any) => (b.purchaseCount || 0) - (a.purchaseCount || 0))
      .slice(0, Number(limit))
      .map((item: any) => item.productId)
      .filter((p: any) => p) || [];

    // If we don't have enough frequently bought products, get from same category
    if (frequentProducts.length < Number(limit)) {
      const additionalProducts = await Product.find({
        category: product.category,
        _id: { $ne: product._id, $nin: frequentProducts.map((p: any) => p._id) },
        isActive: true,
        'inventory.isAvailable': true
      })
        .select('name title price pricing image images rating ratings inventory')
        .limit(Number(limit) - frequentProducts.length)
        .lean();

      frequentProducts.push(...additionalProducts);
    }

    sendSuccess(res, frequentProducts, 'Frequently bought products retrieved successfully');

  } catch (error) {
    logger.error('❌ [FREQUENTLY BOUGHT] Error:', error);
    throw new AppError('Failed to get frequently bought products', 500);
  }
});

// Get bundle products
export const getBundleProducts = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id)
      .populate({
        path: 'bundleProducts',
        select: 'name title price pricing image images rating ratings inventory cashback'
      }).lean() as any;

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    const bundleProducts = product.bundleProducts || [];

    // Calculate bundle discount if products exist
    let bundleDiscount = 0;
    if (bundleProducts.length > 0) {
      const individualTotal = bundleProducts.reduce((sum: number, p: any) => {
        return sum + (p.pricing?.selling || p.price?.current || 0);
      }, 0) + (product.pricing?.selling || 0);

      // Offer 10% bundle discount
      bundleDiscount = Math.round(individualTotal * 0.1);
    }

    const response = {
      mainProduct: {
        id: product._id,
        name: product.name,
        price: product.pricing?.selling || 0
      },
      bundleProducts,
      bundleDiscount,
      bundlePrice: bundleProducts.reduce((sum: number, p: any) => {
        return sum + (p.pricing?.selling || p.price?.current || 0);
      }, product.pricing?.selling || 0) - bundleDiscount
    };

    sendSuccess(res, response, 'Bundle products retrieved successfully');

  } catch (error) {
    logger.error('❌ [BUNDLE PRODUCTS] Error:', error);
    throw new AppError('Failed to get bundle products', 500);
  }
});

// Get search suggestions - FOR FRONTEND SEARCH AUTOCOMPLETE
export const getSearchSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const { q: searchQuery } = req.query;

  if (!searchQuery || typeof searchQuery !== 'string') {
    return sendError(res, 'Search query is required', 400);
  }

  try {
    // Try to get from cache first
    const cacheKey = `product:suggestions:${searchQuery.toLowerCase()}`;
    const cachedSuggestions = await redisService.get<string[]>(cacheKey);

    if (cachedSuggestions) {
      return sendSuccess(res, cachedSuggestions, 'Search suggestions retrieved successfully');
    }

    // Search for products matching the query
    const products = await Product.find({
      isActive: true,
      'inventory.isAvailable': true,
      name: { $regex: escapeRegex(searchQuery), $options: 'i' }
    })
      .select('name')
      .sort({ 'analytics.views': -1, 'analytics.purchases': -1 })
      .limit(10)
      .lean();

    // Extract unique product names
    const suggestions = products.map(p => p.name);

    // Cache the results for 5 minutes
    await redisService.set(cacheKey, suggestions, CacheTTL.SHORT_CACHE);

    sendSuccess(res, suggestions, 'Search suggestions retrieved successfully');

  } catch (error) {
    logger.error('❌ [SEARCH SUGGESTIONS] Error:', error);
    throw new AppError('Failed to get search suggestions', 500);
  }
});

// Get popular searches - FOR FRONTEND SEARCH
export const getPopularSearches = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    // Try to get from cache first
    const cacheKey = `product:popular-searches:${limit}`;
    const cachedSearches = await redisService.get<string[]>(cacheKey);

    if (cachedSearches) {
      return sendSuccess(res, cachedSearches, 'Popular searches retrieved successfully');
    }

    // Get top categories and brands as popular search terms
    const [topCategories, topBrands] = await Promise.all([
      Category.find({ isActive: true })
        .sort({ productCount: -1 })
        .limit(5)
        .select('name')
        .lean(),
      Product.aggregate([
        { $match: { isActive: true, brand: { $exists: true, $ne: '' } } },
        { $group: { _id: '$brand', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, name: '$_id' } }
      ])
    ]);

    // Combine popular search terms
    const popularSearches = [
      ...topCategories.map(c => c.name),
      ...topBrands.map(b => b.name),
      'best deals',
      'new arrivals',
      'trending'
    ].slice(0, Number(limit));

    // Cache for 1 hour
    await redisService.set(cacheKey, popularSearches, 3600); // 1 hour in seconds

    sendSuccess(res, popularSearches, 'Popular searches retrieved successfully');

  } catch (error) {
    logger.error('❌ [POPULAR SEARCHES] Error:', error);
    throw new AppError('Failed to get popular searches', 500);
  }
});

// Get trending products - FOR FRONTEND TRENDING SECTION
export const getTrendingProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    limit = 20,
    page = 1,
    days = 7
  } = req.query;

  try {
    // Try to get from cache first
    const cacheKey = `product:trending:${category || 'all'}:${limit}:${page}:${days}`;
    const cachedProducts = await redisService.get<any>(cacheKey);

    if (cachedProducts) {
      return sendSuccess(res, cachedProducts, 'Trending products retrieved successfully');
    }

    // Calculate date threshold for trending (default last 7 days)
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    // Build query
    const query: any = {
      isActive: true,
      'inventory.isAvailable': true,
      createdAt: { $gte: daysAgo } // Only products from last N days
    };

    if (category) {
      // Category can be either an ObjectId or a slug
      const categoryStr = category as string;
      if (mongoose.isValidObjectId(categoryStr)) {
        query.category = categoryStr;
      } else {
        // Treat as slug - look up the category
        const categoryDoc = await Category.findOne({ slug: categoryStr }).select('_id').lean();
        if (categoryDoc) {
          query.category = categoryDoc._id;
        }
        // If category not found, skip the filter
      }
    }

    // Aggregate trending products with weighted scoring
    const trendingProducts = await Product.aggregate([
      { $match: query },
      {
        $addFields: {
          // Calculate trending score: (views * 1) + (purchases * 5) + (wishlist * 2)
          trendingScore: {
            $add: [
              { $ifNull: ['$analytics.views', 0] },
              { $multiply: [{ $ifNull: ['$analytics.purchases', 0] }, 5] },
              { $multiply: [{ $ifNull: ['$analytics.wishlistCount', 0] }, 2] }
            ]
          }
        }
      },
      { $sort: { trendingScore: -1, 'analytics.views': -1 } },
      { $skip: (Number(page) - 1) * Number(limit) },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'stores',
          localField: 'store',
          foreignField: '_id',
          as: 'storeDetails'
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          images: 1,
          price: 1,
          originalPrice: 1,
          discount: 1,
          ratings: 1,
          analytics: 1,
          trendingScore: 1,
          inventory: 1,
          category: { $arrayElemAt: ['$categoryDetails.name', 0] },
          store: {
            _id: { $arrayElemAt: ['$storeDetails._id', 0] },
            name: { $arrayElemAt: ['$storeDetails.name', 0] },
            logo: { $arrayElemAt: ['$storeDetails.logo', 0] }
          }
        }
      }
    ]);

    // Get total count for pagination
    const totalCount = await Product.countDocuments({
      ...query,
      $expr: {
        $gt: [
          {
            $add: [
              { $ifNull: ['$analytics.views', 0] },
              { $multiply: [{ $ifNull: ['$analytics.purchases', 0] }, 5] },
              { $multiply: [{ $ifNull: ['$analytics.wishlistCount', 0] }, 2] }
            ]
          },
          0
        ]
      }
    });

    const result = {
      products: trendingProducts,
      pagination: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalCount / Number(limit))
      }
    };

    // Cache for 30 minutes (trending data changes frequently)
    await redisService.set(cacheKey, result, 1800); // 30 minutes in seconds

    sendSuccess(res, result, 'Trending products retrieved successfully');

  } catch (error) {
    logger.error('❌ [TRENDING PRODUCTS] Error:', error);
    throw new AppError('Failed to get trending products', 500);
  }
});

// Get related products - FOR FRONTEND PRODUCT DETAILS PAGE
export const getRelatedProducts = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit = 5 } = req.query;

  try {
    // Try to get from cache first
    // Added :v2 suffix to bust old cache with missing price data
    const cacheKey = `${CacheKeys.productRecommendations(id, Number(limit))}:v2`;
    const cachedProducts = await redisService.get<any[]>(cacheKey);

    if (cachedProducts) {
      return sendSuccess(res, cachedProducts, 'Related products retrieved successfully');
    }

    const product = await Product.findById(id).lean() as any;

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    // Get related products from the same category OR same brand
    const relatedProducts = await Product.find({
      $or: [
        { category: product.category },
        { brand: product.brand }
      ],
      _id: { $ne: id },
      isActive: true,
      'inventory.isAvailable': true
    })
      .populate('store', 'name logo')
      .populate('category', 'name slug')
      .sort({ 'ratings.average': -1, 'analytics.views': -1 })
      .limit(Number(limit))
      .lean();

    // ✅ CRITICAL FIX: Transform data for frontend
    const transformedRelatedProducts = relatedProducts.map((product: any) => {
      // Safely extract pricing
      const sellingPrice = product.pricing?.selling || product.price || 0;
      const originalPrice = product.pricing?.original || product.originalPrice || sellingPrice;
      const discount = product.pricing?.discount ||
        (originalPrice > sellingPrice ?
          Math.round(((originalPrice - sellingPrice) / originalPrice) * 100) : 0);

      // Safely extract image
      let productImage = '';
      if (Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];
        productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
      } else if (product.image) {
        productImage = product.image;
      }

      return {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.name || 'Unnamed Product',
        image: productImage,
        price: sellingPrice,  // ✅ FIXED: Now properly extracts price
        originalPrice: originalPrice,
        discount: discount,
        rating: product.ratings?.average || 0,
        reviewCount: product.ratings?.count || 0,
        brand: product.brand || '',
        cashback: (product.cashback?.percentage || 0) > 0,
        cashbackPercentage: product.cashback?.percentage || 0,
        category: product.category?.name || (typeof product.category === 'string' ? product.category : ''),
        store: product.store,
      };
    });

    // Cache the results
    await redisService.set(cacheKey, transformedRelatedProducts, CacheTTL.PRODUCT_DETAIL);

    sendSuccess(res, transformedRelatedProducts, 'Related products retrieved successfully');

  } catch (error) {
    logger.error('❌ [RELATED PRODUCTS] Error:', error);
    throw new AppError('Failed to get related products', 500);
  }
});

// Check product availability - FOR FRONTEND CART/CHECKOUT
export const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { variantId, quantity = 1 } = req.query;

  try {
    const product = await Product.findById(id).lean() as any;

    if (!product) {
      return sendNotFound(res, 'Product not found');
    }

    let availableStock = product.inventory.stock;
    let isLowStock = false;

    // Check variant stock if variantId is provided
    if (variantId && product.inventory.variants) {
      const variant = product.inventory.variants.find(
        (v: any) => v._id?.toString() === variantId || v.sku === variantId
      );

      if (variant) {
        availableStock = variant.stock;
      } else {
        return sendNotFound(res, 'Variant not found');
      }
    }

    // Check if unlimited (digital products)
    if (product.inventory.unlimited) {
      return sendSuccess(res, {
        available: true,
        maxQuantity: 999,
        isLowStock: false,
        estimatedRestockDate: null
      }, 'Product availability checked successfully');
    }

    // Check stock availability
    const requestedQuantity = Number(quantity);
    const available = availableStock >= requestedQuantity;
    isLowStock = availableStock <= (product.inventory.lowStockThreshold || 5);

    const response = {
      available,
      maxQuantity: availableStock,
      isLowStock,
      estimatedRestockDate: !available && availableStock === 0 ?
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : // 7 days from now
        null
    };

    sendSuccess(res, response, 'Product availability checked successfully');

  } catch (error) {
    logger.error('❌ [CHECK AVAILABILITY] Error:', error);
    throw new AppError('Failed to check product availability', 500);
  }
});

// Get popular products - FOR FRONTEND "Popular" SECTION
export const getPopularProducts = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Build query with region filtering
    const query: any = {
      isActive: true,
      'inventory.isAvailable': true
    };

    // Filter by stores in region if region specified
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      query.store = { $in: storeIds };
    }

    // Query products sorted by purchases (most ordered first)
    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('store', 'name logo operationalInfo location')
      .sort({ 'analytics.purchases': -1, 'analytics.views': -1 })
      .limit(Number(limit))
      .lean();

    // Transform data to include delivery info from store
    const transformedProducts = products.map((product: any) => {
      // Safely extract image
      let productImage = '';
      if (Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];
        productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
      } else if (product.image) {
        productImage = product.image;
      }

      return {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.name || product.title || 'Unnamed Product',
        image: productImage,
        price: product.pricing?.selling || 0,
        originalPrice: product.pricing?.original || product.pricing?.selling || 0,
        discount: product.pricing?.discount || 0,
        rating: product.ratings?.average || 0,
        reviewCount: product.ratings?.count || 0,
        purchases: product.analytics?.purchases || 0,
        category: product.category?.name || '',
        store: {
          _id: product.store?._id,
          name: product.store?.name || '',
          logo: product.store?.logo || '',
          deliveryTime: product.store?.operationalInfo?.deliveryTime || '30-45 min',
          deliveryFee: product.store?.operationalInfo?.deliveryFee || 0,
          city: product.store?.location?.city || ''
        }
      };
    });

    sendSuccess(res, transformedProducts, 'Popular products retrieved successfully');

  } catch (error) {
    logger.error('❌ [POPULAR PRODUCTS] Error:', error);
    throw new AppError('Failed to get popular products', 500);
  }
});

// Get nearby products - FOR FRONTEND "In Your Area" SECTION
export const getNearbyProducts = asyncHandler(async (req: Request, res: Response) => {
  const {
    longitude,
    latitude,
    radius = 10, // default 10km
    limit = 10
  } = req.query;

  try {
    // Validate coordinates
    if (!longitude || !latitude) {
      return sendError(res, 'Longitude and latitude are required', 400);
    }

    const lng = parseFloat(longitude as string);
    const lat = parseFloat(latitude as string);
    const radiusKm = parseFloat(radius as string);
    const limitNum = parseInt(limit as string);

    if (isNaN(lng) || isNaN(lat)) {
      return sendError(res, 'Invalid coordinates', 400);
    }

    // Step 1: Find nearby stores using geospatial query
    const nearbyStores = await Store.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distance',
          maxDistance: radiusKm * 1000, // Convert km to meters
          spherical: true,
          query: { isActive: true }
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          logo: 1,
          operationalInfo: 1,
          location: 1,
          distance: { $divide: ['$distance', 1000] } // Convert to km
        }
      },
      { $limit: 50 } // Get up to 50 nearby stores
    ]);

    if (nearbyStores.length === 0) {
      return sendSuccess(res, [], 'No nearby products found');
    }

    // Step 2: Get products from nearby stores
    const storeIds = nearbyStores.map(s => s._id);
    const storeMap = new Map(nearbyStores.map(s => [s._id.toString(), s]));

    const products = await Product.find({
      store: { $in: storeIds },
      isActive: true,
      'inventory.isAvailable': true
    })
      .populate('category', 'name slug')
      .sort({ 'analytics.purchases': -1 })
      .limit(limitNum)
      .lean();

    // Transform data with distance info
    const transformedProducts = products.map((product: any) => {
      const store = storeMap.get(product.store?.toString());

      // Safely extract image
      let productImage = '';
      if (Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];
        productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
      } else if (product.image) {
        productImage = product.image;
      }

      return {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.name || product.title || 'Unnamed Product',
        image: productImage,
        price: product.pricing?.selling || 0,
        originalPrice: product.pricing?.original || product.pricing?.selling || 0,
        discount: product.pricing?.discount || 0,
        rating: product.ratings?.average || 0,
        reviewCount: product.ratings?.count || 0,
        category: product.category?.name || '',
        store: {
          _id: store?._id,
          name: store?.name || '',
          logo: store?.logo || '',
          deliveryTime: store?.operationalInfo?.deliveryTime || '30-45 min',
          deliveryFee: store?.operationalInfo?.deliveryFee || 0,
          city: store?.location?.city || '',
          distance: store?.distance ? parseFloat(store.distance.toFixed(1)) : null
        }
      };
    });

    // Sort by distance (closest first)
    transformedProducts.sort((a: any, b: any) => {
      if (a.store.distance === null) return 1;
      if (b.store.distance === null) return -1;
      return a.store.distance - b.store.distance;
    });

    sendSuccess(res, transformedProducts, 'Nearby products retrieved successfully');

  } catch (error) {
    logger.error('❌ [NEARBY PRODUCTS] Error:', error);
    throw new AppError('Failed to get nearby products', 500);
  }
});

// Get hot deals products - FOR FRONTEND "Hot Deals" SECTION
export const getHotDeals = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    // Step 1: Try to find products with 'hot-deal' tag
    let products = await Product.find({
      tags: 'hot-deal',
      isActive: true,
      'inventory.isAvailable': true
    })
      .populate('category', 'name slug')
      .populate('store', 'name logo operationalInfo location')
      .sort({ 'cashback.percentage': -1 })
      .limit(Number(limit))
      .lean();

    // Step 2: Fallback to high-cashback products if no tagged products
    if (products.length === 0) {
      products = await Product.find({
        isActive: true,
        'inventory.isAvailable': true,
        'cashback.percentage': { $gte: 15 },
        'cashback.isActive': true
      })
        .populate('category', 'name slug')
        .populate('store', 'name logo operationalInfo location')
        .sort({ 'cashback.percentage': -1 })
        .limit(Number(limit))
        .lean();
    }

    // Transform data for frontend
    const transformedProducts = products.map((product: any) => {
      let productImage = '';
      if (Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];
        productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
      } else if (product.image) {
        productImage = product.image;
      }

      return {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.name || 'Unnamed Product',
        image: productImage,
        price: product.pricing?.selling || 0,
        originalPrice: product.pricing?.original || product.pricing?.selling || 0,
        discount: product.pricing?.discount || 0,
        rating: product.ratings?.average || 0,
        reviewCount: product.ratings?.count || 0,
        cashbackPercentage: product.cashback?.percentage || 0,
        category: product.category?.name || '',
        store: {
          _id: product.store?._id,
          name: product.store?.name || '',
          logo: product.store?.logo || '',
          city: product.store?.location?.city || ''
        }
      };
    });

    sendSuccess(res, transformedProducts, 'Hot deals retrieved successfully');

  } catch (error) {
    logger.error('❌ [HOT DEALS] Error:', error);
    throw new AppError('Failed to get hot deals', 500);
  }
});

// Get products by category slug - FOR FRONTEND HOMEPAGE CATEGORY SECTIONS
export const getProductsByCategorySlugHomepage = asyncHandler(async (req: Request, res: Response) => {
  const { categorySlug } = req.params;
  const { limit = 10 } = req.query;

  try {
    // Find the category by slug
    const category = await Category.findOne({
      slug: categorySlug,
      isActive: true
    }).lean();

    if (!category) {
      return sendSuccess(res, [], 'Category not found');
    }

    // Get products in this category
    const products = await Product.find({
      category: category._id,
      isActive: true,
      'inventory.isAvailable': true
    })
      .populate('category', 'name slug')
      .populate('store', 'name logo operationalInfo location')
      .sort({ 'cashback.percentage': -1, 'analytics.purchases': -1 })
      .limit(Number(limit))
      .lean();

    // Transform data for frontend (same format as getHotDeals)
    const transformedProducts = products.map((product: any) => {
      let productImage = '';
      if (Array.isArray(product.images) && product.images.length > 0) {
        const firstImage = product.images[0];
        productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url || '';
      } else if (product.image) {
        productImage = product.image;
      }

      return {
        id: product._id.toString(),
        _id: product._id.toString(),
        name: product.name || 'Unnamed Product',
        image: productImage,
        price: product.pricing?.selling || 0,
        originalPrice: product.pricing?.original || product.pricing?.selling || 0,
        discount: product.pricing?.discount || 0,
        rating: product.ratings?.average || 0,
        reviewCount: product.ratings?.count || 0,
        cashbackPercentage: product.cashback?.percentage || 0,
        category: product.category?.name || '',
        categorySlug: product.category?.slug || '',
        store: {
          _id: product.store?._id,
          name: product.store?.name || '',
          logo: product.store?.logo || '',
          city: product.store?.location?.city || ''
        }
      };
    });

    sendSuccess(res, transformedProducts, `Products for ${category.name} retrieved successfully`);

  } catch (error) {
    logger.error('❌ [CATEGORY SECTION] Error:', error);
    throw new AppError('Failed to get products by category', 500);
  }
});

// Get similar products based on query or category
// GET /api/products/similar
export const getSimilarProducts = asyncHandler(async (req: Request, res: Response) => {
  const { query, category, limit = 10 } = req.query;

  try {
    let similarProducts: any[] = [];

    if (category) {
      // Find products in the same category
      similarProducts = await Product.find({
        category: category,
        isActive: true,
        'inventory.isAvailable': true
      })
        .populate('category', 'name slug')
        .populate('store', 'name logo slug location')
        .sort({ 'ratings.average': -1, 'analytics.views': -1 })
        .limit(Number(limit))
        .lean();
    } else if (query) {
      // Find products with similar tags or in similar categories
      // First, try to find products with matching tags
      const searchQuery = query as string;
      const searchTerms = searchQuery.toLowerCase().split(/\s+/);

      // Build query for similar products
      const queryObj: any = {
        isActive: true,
        'inventory.isAvailable': true,
        $or: [
          { name: { $regex: escapeRegex(searchQuery), $options: 'i' } },
          { tags: { $in: searchTerms } },
          { 'shortDescription': { $regex: escapeRegex(searchQuery), $options: 'i' } }
        ]
      };

      similarProducts = await Product.find(queryObj)
        .populate('category', 'name slug')
        .populate('store', 'name logo slug location')
        .sort({ 'ratings.average': -1, 'analytics.views': -1 })
        .limit(Number(limit))
        .lean();

      // If not enough results, get products from same categories as search results
      if (similarProducts.length < Number(limit)) {
        const categoryIds = [...new Set(similarProducts.map(p => p.category?._id || p.category).filter(Boolean))];
        
        if (categoryIds.length > 0) {
          const additionalProducts = await Product.find({
            category: { $in: categoryIds },
            isActive: true,
            'inventory.isAvailable': true,
            _id: { $nin: similarProducts.map(p => p._id) }
          })
            .populate('category', 'name slug')
            .populate('store', 'name logo slug location')
            .sort({ 'ratings.average': -1, createdAt: -1 })
            .limit(Number(limit) - similarProducts.length)
            .lean();

          similarProducts = [...similarProducts, ...additionalProducts];
        }
      }
    } else {
      // If no query or category, return popular products
      similarProducts = await Product.find({
        isActive: true,
        'inventory.isAvailable': true
      })
        .populate('category', 'name slug')
        .populate('store', 'name logo slug location')
        .sort({ 'ratings.average': -1, 'analytics.views': -1 })
        .limit(Number(limit))
        .lean();
    }

    // Format response
    const formattedProducts = similarProducts.map((product: any) => ({
      _id: product._id,
      name: product.name,
      slug: product.slug,
      price: product.pricing?.selling || product.pricing?.original || 0,
      originalPrice: product.pricing?.original,
      image: product.images?.[0] || product.images?.[0]?.url || null,
      category: product.category,
      store: product.store,
      rating: product.ratings?.average || 0,
      reviewCount: product.ratings?.count || 0
    }));

    sendSuccess(res, { products: formattedProducts }, 'Similar products retrieved successfully');

  } catch (error) {
    logger.error('❌ [SIMILAR PRODUCTS] Error:', error);
    throw new AppError('Failed to fetch similar products', 500);
  }
});