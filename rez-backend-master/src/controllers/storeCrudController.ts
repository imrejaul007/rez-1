import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Category } from '../models/Category';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { regionService, isValidRegion, RegionId } from '../services/regionService';
import { logger } from '../config/logger';

// Escape user input for safe use in RegExp (prevents ReDoS / NoSQL injection)
const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Helper function to calculate distance between two coordinates
function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;

  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

// Get all stores with filtering and pagination
export const getStores = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    location,
    radius = 10,
    rating,
    isOpen,
    search,
    tags,
    isFeatured,
    sort,
    sortBy: sortByParam,
    page = 1,
    limit = 20,
    region, // Region filter parameter
    serviceType // Service capability filter
  } = req.query;
  const sortBy = sort || sortByParam || 'rating';

  try {
    const query: any = { isActive: true, isSuspended: { $ne: true }, adminApproved: { $ne: false } };

    // Apply region filter if provided
    const regionHeader = req.headers['x-rez-region'] as string;
    const effectiveRegion = (region as string) || regionHeader;

    if (effectiveRegion && isValidRegion(effectiveRegion)) {
      const regionFilter = regionService.getStoreFilter(effectiveRegion as RegionId);
      Object.assign(query, regionFilter);
      logger.info('[GET STORES] Region filter applied:', effectiveRegion);
    }

    // Apply category filter (supports both ObjectId and slug)
    if (category) {
      const categoryStr = category as string;
      if (mongoose.Types.ObjectId.isValid(categoryStr)) {
        query.category = categoryStr;
      } else {
        // Look up category by slug
        const categoryDoc = await Category.findOne({ slug: categoryStr }).select('_id').lean();
        if (categoryDoc) {
          // Also find subcategories under this parent
          const subCategories = await Category.find({ parentCategory: categoryDoc._id }).select('_id').lean();
          const categoryIds = [categoryDoc._id, ...subCategories.map(sc => sc._id)];
          query.category = { $in: categoryIds };
        } else {
          query.category = categoryStr; // Fallback: let it match nothing
        }
      }
    }
    if (rating) query['ratings.average'] = { $gte: Number(rating) };

    // Filter by tags
    if (tags) {
      // tags can be a string or array - handle both
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query.tags = { $in: tagArray.map(tag => new RegExp(escapeRegex(String(tag)), 'i')) };
    }

    // Filter by featured status
    if (isFeatured !== undefined) {
      // Convert query parameter to boolean
      const isFeaturedValue = typeof isFeatured === 'string'
        ? isFeatured.toLowerCase() === 'true'
        : Boolean(isFeatured);
      query.isFeatured = isFeaturedValue;
    }

    // Filter by service capability type
    if (serviceType) {
      const validServiceTypes = ['homeDelivery', 'driveThru', 'tableBooking', 'dineIn', 'storePickup'];
      const serviceTypeStr = serviceType as string;
      if (validServiceTypes.includes(serviceTypeStr)) {
        query[`serviceCapabilities.${serviceTypeStr}.enabled`] = true;
      }
    }

    if (search) {
      const safeSearch = escapeRegex(String(search));
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { 'location.address': { $regex: safeSearch, $options: 'i' } },
        { 'location.city': { $regex: safeSearch, $options: 'i' } },
        { tags: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    // Location-based filtering
    // Using $geoWithin with $centerSphere for better compatibility with legacy coordinate arrays
    let userLng: number | undefined;
    let userLat: number | undefined;
    if (location) {
      const [lng, lat] = location.toString().split(',').map(Number);
      if (!isNaN(lng) && !isNaN(lat) && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90) {
        userLng = lng;
        userLat = lat;
        const radiusInRadians = Number(radius) / 6371; // Earth's radius is ~6371 km
        query['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusInRadians]
          }
        };
      }
    }

    // Sorting
    const sortOptions: any = {};
    switch (sortBy) {
      case 'rating':
        sortOptions['ratings.average'] = -1;
        break;
      case 'distance':
        // Distance sorting will be handled after fetching with $geoWithin
        sortOptions['ratings.average'] = -1; // Default sort, will re-sort by distance after
        break;
      case 'name':
        sortOptions.name = 1;
        break;
      case 'popularity':
        sortOptions['ratings.count'] = -1;
        sortOptions['ratings.average'] = -1;
        break;
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      default:
        sortOptions['ratings.average'] = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    logger.debug('[GET STORES] Query:', { query });
    logger.debug('[GET STORES] Sort options:', { sortOptions });

    const [stores, total] = await Promise.all([
      Store.find(query)
        .select('name slug logo banner description category tags ratings location isActive isFeatured offers operationalInfo serviceCapabilities bookingConfig bookingType hasStorePickup')
        .populate({
          path: 'category',
          select: 'name slug',
          options: { strictPopulate: false }
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Store.countDocuments(query),
    ]);

    logger.info(`[GET STORES] Found ${stores.length} stores`);

    // Filter by open status if requested
    let filteredStores: any[] = stores;
    if (isOpen === 'true') {
      filteredStores = stores.filter((store: any) => {
        // Simple open check - in a real app, you'd implement the isOpen method
        return store.isActive;
      });
    }

    // Calculate distances if location was provided
    if (userLng !== undefined && userLat !== undefined) {
      filteredStores = filteredStores.map((store: any) => {
        if (store.location?.coordinates && Array.isArray(store.location.coordinates) && store.location.coordinates.length === 2) {
          try {
            const distance = calculateDistance([userLng, userLat], store.location.coordinates);
            return { ...store, distance: Math.round(distance * 100) / 100 };
          } catch (e) {
            return { ...store, distance: null };
          }
        }
        return { ...store, distance: null };
      });

      // Sort by distance if requested
      if (sortBy === 'distance') {
        filteredStores.sort((a: any, b: any) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }
    }

    const totalPages = Math.ceil(total / Number(limit));

    // Log search history for authenticated users (async, don't block)
    if (req.user && search) {
      const { logStoreSearch } = await import('../services/searchHistoryService');
      logStoreSearch(
        (req.user as any)._id,
        search as string,
        total,
        {
          category: category as string,
          location: location as string,
          rating: rating ? Number(rating) : undefined,
          tags: tags ? (Array.isArray(tags) ? tags : [tags]) as string[] : undefined
        }
      ).catch(err => logger.error('Failed to log store search:', err));
    }

    sendSuccess(res, {
      stores: filteredStores,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Stores retrieved successfully');

  } catch (error) {
    logger.error('[GET STORES] Error fetching stores:', error);
    throw new AppError('Failed to fetch stores', 500);
  }
});

// Get single store by ID or slug
export const getStoreById = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  try {
    const isObjectId = storeId.match(/^[0-9a-fA-F]{24}$/);
    const matchStage: any = isObjectId
      ? { _id: new mongoose.Types.ObjectId(storeId), isActive: true }
      : { slug: storeId, isActive: true };

    // Single aggregation: fetch store with category $lookup (replaces populate)
    const storeResults = await Store.aggregate([
      { $match: matchStage },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      { $project: {
        // Keep all fields, but only project category.name and category.slug
        category: { _id: '$category._id', name: '$category.name', slug: '$category.slug' },
        name: 1, slug: 1, description: 1, logo: 1, coverImage: 1, images: 1,
        location: 1, contact: 1, operationalInfo: 1, ratings: 1, tags: 1,
        isFeatured: 1, isActive: 1, serviceCapabilities: 1, analytics: 1,
        merchantId: 1, merchant: 1, socialMedia: 1, businessHours: 1,
        deliveryInfo: 1, minimumOrder: 1, avgPrepTime: 1, features: 1,
        createdAt: 1, updatedAt: 1
      }}
    ]);

    const store = storeResults[0] || null;

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Region check - log mismatch but allow direct store access by ID
    const regionHeader = req.headers['x-rez-region'] as string;
    if (regionHeader && isValidRegion(regionHeader)) {
      const storeCity = store.location?.city;
      if (!regionService.validateStoreAccess(storeCity, regionHeader as RegionId)) {
        // Region mismatch allowed for direct store access
      }
    }

    // Parallel: fetch products, increment views, resolve category slug, count products
    const VALID_MAIN_SLUGS = ['food-dining', 'beauty-wellness', 'grocery-essentials', 'fitness-sports', 'healthcare', 'fashion', 'education-learning', 'home-services', 'travel-experiences', 'entertainment', 'financial-lifestyle', 'electronics'];

    // Build category resolution promise
    const resolveCategorySlug = async (): Promise<string | null> => {
      try {
        const storeCat = store.category;
        let catId = storeCat && typeof storeCat === 'object' && '_id' in storeCat
          ? storeCat._id?.toString()
          : storeCat?.toString();
        let depth = 5;
        while (catId && depth-- > 0) {
          const cat = await Category.findById(catId).select('slug parentCategory').lean();
          if (!cat) break;
          if (!cat.parentCategory) {
            return VALID_MAIN_SLUGS.includes(cat.slug) ? cat.slug : null;
          }
          catId = cat.parentCategory.toString();
        }
      } catch { /* Non-critical */ }
      return null;
    };

    const [products, , mainCategorySlug, productsCount] = await Promise.all([
      // Fetch products with category $lookup (replaces populate)
      Product.aggregate([
        { $match: { store: store._id, isActive: true } },
        { $sort: { createdAt: -1 } },
        { $limit: 20 },
        { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $addFields: { category: { _id: '$category._id', name: '$category.name', slug: '$category.slug' } } }
      ]),
      // Increment view count (fire-and-forget style, but awaited for safety)
      Store.updateOne({ _id: store._id }, { $inc: { 'analytics.views': 1 } }),
      // Resolve root MainCategory slug
      resolveCategorySlug(),
      // Count total active products
      Product.countDocuments({ store: store._id, isActive: true })
    ]);

    // Track device → merchant access (fire-and-forget)
    const deviceHash = req.headers['x-device-fingerprint'] as string;
    if (deviceHash) {
      import('../services/deviceFingerprintService').then(svc =>
        svc.trackMerchantAccess(deviceHash, String(store._id), store.name)
      ).catch((err) => logger.error('[StoreCrudCtrl] Device fingerprint merchant access tracking failed', { error: err.message, storeId: store._id }));
    }

    sendSuccess(res, {
      store: { ...store, mainCategorySlug },
      products,
      productsCount
    }, 'Store retrieved successfully');

  } catch (error: any) {
    throw new AppError(`Failed to fetch store: ${error.message}`, 500);
  }
});

// Get store products
export const getStoreProducts = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const {
    category,
    search,
    sortBy = 'newest',
    page = 1,
    limit = 20
  } = req.query;

  try {
    const store = await Store.findById(storeId).lean();
    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    const query: any = { store: storeId, isActive: true };

    if (category) query.category = category;
    if (search) {
      const safeSearch = escapeRegex(String(search));
      query.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } }
      ];
    }

    const sortOptions: any = {};
    switch (sortBy) {
      case 'price_low':
        sortOptions['pricing.selling'] = 1;
        break;
      case 'price_high':
        sortOptions['pricing.selling'] = -1;
        break;
      case 'rating':
        sortOptions['ratings.average'] = -1;
        break;
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      case 'popular':
        sortOptions['analytics.views'] = -1;
        break;
      default:
        sortOptions.createdAt = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(query),
    ]);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      products,
      store: {
        _id: store._id,
        name: store.name,
        slug: (store as any).slug
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Store products retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch store products', 500);
  }
});

// Get store operating hours and status
export const getStoreOperatingStatus = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  try {
    const store = await Store.findById(storeId).select('operationalInfo name').lean();

    if (!store) {
      return sendNotFound(res, 'Store not found');
    }

    // Simple implementation - in a real app, you'd use the isOpen method
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5);

    const todayHours = (store as any).operationalInfo?.hours?.[currentDay];
    const isOpen = todayHours && !todayHours.closed &&
      currentTime >= todayHours.open &&
      currentTime <= todayHours.close;

    sendSuccess(res, {
      storeId: store._id,
      storeName: store.name,
      isOpen,
      hours: (store as any).operationalInfo?.hours,
      currentTime,
      currentDay
    }, 'Store operating status retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch store operating status', 500);
  }
});

// Get store categories
export const getStoresByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 20, sortBy = 'rating' } = req.query;

  try {
    const query = {
      isActive: true,
      category: categoryId  // Fixed: was 'categories', should be 'category'
    };

    const sortOptions: any = {};
    switch (sortBy) {
      case 'rating':
        sortOptions['ratings.average'] = -1;
        break;
      case 'name':
        sortOptions.name = 1;
        break;
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      default:
        sortOptions['ratings.average'] = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [stores, total] = await Promise.all([
      Store.find(query)
        .select('name slug logo banner category tags ratings location isActive isFeatured offers operationalInfo serviceCapabilities bookingConfig bookingType hasStorePickup')
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Store.countDocuments(query),
    ]);

    // Fetch products for all stores in a single bulk query (avoids N+1)
    const storeIds = stores.map((s: any) => s._id);
    const allProducts = await Product.find({
      store: { $in: storeIds },
      isActive: true,
      isDeleted: { $ne: true }
    })
      .select('name images pricing ratings inventory tags brand shortDescription subCategory category store')
      .limit(500)
      .lean();

    // Group products by store ID (limit 10 per store)
    const productsByStore = new Map<string, any[]>();
    for (const product of allProducts) {
      const sid = product.store.toString();
      if (!productsByStore.has(sid)) {
        productsByStore.set(sid, []);
      }
      const arr = productsByStore.get(sid)!;
      if (arr.length < 10) {
        arr.push(product);
      }
    }

    // Attach transformed products to each store
    const storesWithProducts = stores.map((store: any) => {
      const products = productsByStore.get(store._id.toString()) || [];
      const transformedProducts = products.map((product: any) => ({
        _id: product._id,
        name: product.name,
        image: product.images?.[0] || '',
        imageUrl: product.images?.[0] || '',
        price: product.pricing?.selling || 0,
        originalPrice: product.pricing?.original || 0,
        rating: product.ratings?.average || 0,
        reviewCount: product.ratings?.count || 0,
        inStock: product.inventory?.isAvailable !== false,
        tags: product.tags || [],
        brand: product.brand || '',
        description: product.shortDescription || '',
        subCategory: product.subCategory?.toString() || null,
        category: product.category?.toString() || null
      }));

      return {
        ...store,
        products: transformedProducts
      };
    });

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      stores: storesWithProducts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Stores by category retrieved successfully');

  } catch (error) {
    logger.error('Error fetching stores by category:', error);
    throw new AppError('Failed to fetch stores by category', 500);
  }
});

// Get available store categories
export const getStoreCategories = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { default: StoreCollectionConfig } = await import('../models/StoreCollectionConfig');
    // Try to read from admin-configurable StoreCollectionConfig
    const configs = await StoreCollectionConfig.find({ isEnabled: true })
      .sort({ sortOrder: 1 })
      .limit(50)
      .lean();

    // Fallback to hardcoded if no configs exist
    const categories = configs.length > 0
      ? configs.map(c => ({
          id: c.categoryKey,
          name: c.displayName,
          description: c.description,
          icon: c.icon,
          color: c.color,
          badgeText: c.badgeText || '',
          imageUrl: c.imageUrl || '',
        }))
      : [
          { id: 'fastDelivery', name: '30 min delivery', description: 'Fast food delivery in 30 minutes or less', icon: '🚀', color: '#7B61FF', badgeText: '', imageUrl: '' },
          { id: 'budgetFriendly', name: '1 rupees store', description: 'Ultra-budget items starting from 1 rupee', icon: '💰', color: '#6E56CF', badgeText: '', imageUrl: '' },
          { id: 'premium', name: 'Luxury store', description: 'Premium brands and luxury products', icon: '👑', color: '#A78BFA', badgeText: '', imageUrl: '' },
          { id: 'organic', name: 'Organic Store', description: '100% organic and natural products', icon: '🌱', color: '#34D399', badgeText: '', imageUrl: '' },
          { id: 'alliance', name: 'Alliance Store', description: 'Trusted neighborhood supermarkets', icon: '🤝', color: '#9F7AEA', badgeText: '', imageUrl: '' },
          { id: 'lowestPrice', name: 'Lowest Price', description: 'Guaranteed lowest prices with price match', icon: '💸', color: '#22D3EE', badgeText: '', imageUrl: '' },
          { id: 'mall', name: 'Rez Mall', description: 'One-stop shopping destination', icon: '🏬', color: '#60A5FA', badgeText: '', imageUrl: '' },
          { id: 'cashStore', name: 'Cash Store', description: 'Cash-only transactions with exclusive discounts', icon: '💵', color: '#8B5CF6', badgeText: '', imageUrl: '' },
        ];

    // Get count for each category
    const categoryCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Store.countDocuments({
          isActive: true,
          [`deliveryCategories.${category.id}`]: true
        });
        return { ...category, count };
      })
    );

    sendSuccess(res, {
      categories: categoryCounts
    }, 'Store categories retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch store categories', 500);
  }
});

// Get stores by category slug (for frontend categories page)
export const getStoresByCategorySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const {
    page = 1,
    limit = 20,
    sortBy = 'rating'
  } = req.query;

  try {
    logger.info(`[GET STORES BY SLUG] Searching for category: ${slug}`);

    // Import Category model (named export)
    const { Category } = require('../models/Category');

    // Find the category by slug (could be main category or subcategory)
    const category = await Category.findOne({
      slug: slug,
      isActive: true
    }).lean();

    if (!category) {
      // Category slug not in DB - return empty results instead of unfiltered cross-category search
      logger.info(`[GET STORES BY SLUG] Category not found in DB: ${slug}`);

      return sendSuccess(res, {
        stores: [],
        category: {
          _id: null,
          name: slug.replace(/-/g, ' '),
          slug: slug,
          icon: null
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      }, `No category found for: ${slug}`);
    }

    logger.info(`[GET STORES BY SLUG] Found category: ${category.name} (${category._id})`);

    // Determine if this is a subcategory or main category
    const isSubcategory = !!category.parentCategory;

    let query: any;

    if (isSubcategory) {
      // For subcategories: search ONLY by subcategory fields, NOT by parent category
      // This ensures we get stores specific to this subcategory
      logger.info(`[GET STORES BY SLUG] Searching as SUBCATEGORY: ${slug}`);
      query = {
        isActive: true,
        isSuspended: { $ne: true },
        adminApproved: { $ne: false },
        $or: [
          { subcategory: category._id },
          { subCategories: category._id },
          { subcategorySlug: slug }
        ]
      };
    } else {
      // For main categories: search by category and all child categories
      const categoryIds = [category._id];
      if (category.childCategories && category.childCategories.length > 0) {
        categoryIds.push(...category.childCategories);
      }
      logger.info(`[GET STORES BY SLUG] Searching as MAIN CATEGORY: ${slug}, including ${categoryIds.length} category IDs`);
      query = {
        isActive: true,
        isSuspended: { $ne: true },
        adminApproved: { $ne: false },
        $or: [
          { category: { $in: categoryIds } },
          { categories: { $in: categoryIds } },
          { subcategory: { $in: categoryIds } },
          { subCategories: { $elemMatch: { $in: categoryIds } } }
        ]
      };
    }

    // Apply region filtering
    const regionHeader = req.headers['x-rez-region'] as string;
    if (regionHeader && isValidRegion(regionHeader)) {
      const regionFilter = regionService.getStoreFilter(regionHeader as RegionId);
      Object.assign(query, regionFilter);
      logger.info(`[GET STORES BY SLUG] Region filter applied: ${regionHeader}`);
    }

    // Sorting
    const sortOptions: any = {};
    switch (sortBy) {
      case 'rating':
        sortOptions['ratings.average'] = -1;
        break;
      case 'name':
        sortOptions.name = 1;
        break;
      case 'newest':
        sortOptions.createdAt = -1;
        break;
      default:
        sortOptions['ratings.average'] = -1;
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Fetch stores
    const [stores, total] = await Promise.all([
      Store.find(query)
        .select('name slug logo banner category tags ratings location isActive isFeatured offers operationalInfo serviceCapabilities bookingConfig bookingType hasStorePickup deliveryCategories type isOpen rewardRules priceForTwo storeVisitConfig')
        .populate('category', 'name slug icon')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Store.countDocuments(query)
    ]);

    logger.info(`[GET STORES BY SLUG] Found ${stores.length} stores for category ${slug}`);

    // Fetch products for all stores in a single bulk query (avoids N+1)
    const storeIds = stores.map((s: any) => s._id);
    const allProducts = await Product.find({
      store: { $in: storeIds },
      isActive: true
    })
      .select('name pricing images slug ratings inventory subSubCategory store')
      .lean();

    // Group products by store ID (limit 4 per store)
    const productsByStore = new Map<string, any[]>();
    for (const product of allProducts) {
      const sid = product.store.toString();
      if (!productsByStore.has(sid)) {
        productsByStore.set(sid, []);
      }
      const arr = productsByStore.get(sid)!;
      if (arr.length < 4) {
        arr.push(product);
      }
    }

    // Attach transformed products to each store
    const storesWithProducts = stores.map((store: any) => {
      const products = productsByStore.get(store._id.toString()) || [];
      // Transform products to expected format
      // Handle both old (price/rating) and new (pricing/ratings) field structures
      const transformedProducts = products.map((product: any) => ({
        _id: product._id,
        productId: product._id,
        name: product.name,
        // Support both pricing.selling (new) and pricing.current/price.current (old)
        price: product.pricing?.selling || product.pricing?.current || product.price?.current || 0,
        originalPrice: product.pricing?.original || product.price?.original || null,
        discountPercentage: product.pricing?.discount || product.price?.discount || null,
        imageUrl: product.images?.[0] || 'https://via.placeholder.com/150',
        // Support both ratings.average (new) and rating.value (old)
        rating: product.ratings?.average || product.rating?.value || 0,
        reviewCount: product.ratings?.count || product.rating?.count || 0,
        inStock: product.inventory?.isAvailable !== false,
        subSubCategory: product.subSubCategory || null
      }));

      return {
        ...store,
        products: transformedProducts
      };
    });

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      stores: storesWithProducts,
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        icon: category.icon
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, `Found ${total} stores for category: ${category.name}`);

  } catch (error) {
    logger.error('[GET STORES BY SLUG] Error:', error);
    throw new AppError('Failed to get stores by category slug', 500);
  }
});
