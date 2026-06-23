import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Store } from '../models/Store';
import { Product } from '../models/Product';
import { Order } from '../models/Order';
import { Category } from '../models/Category';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest
} from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import redisService from '../services/redisService';
import { withCache } from '../utils/cacheHelper';
import { CacheTTL } from '../config/redis';
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

// Get nearby stores
export const getNearbyStores = asyncHandler(async (req: Request, res: Response) => {
  const { lng, lat, longitude, latitude, location, radius = 5, limit = 10 } = req.query;

  // Accept multiple formats:
  // 1. lng/lat as separate params
  // 2. longitude/latitude as separate params
  // 3. location as "lng,lat" string (from storeSearchService)
  let finalLng = lng || longitude;
  let finalLat = lat || latitude;

  // Parse location string if provided (format: "lng,lat")
  if (!finalLng && !finalLat && location && typeof location === 'string') {
    const [parsedLng, parsedLat] = location.split(',');
    if (parsedLng && parsedLat) {
      finalLng = parsedLng.trim();
      finalLat = parsedLat.trim();
    }
  }

  if (!finalLng || !finalLat) {
    return sendBadRequest(res, 'Longitude and latitude are required. Provide lng/lat, longitude/latitude, or location as "lng,lat"');
  }

  const userLng = Number(finalLng);
  const userLat = Number(finalLat);

  // Validate coordinates
  if (isNaN(userLng) || isNaN(userLat) || userLng < -180 || userLng > 180 || userLat < -90 || userLat > 90) {
    return sendBadRequest(res, 'Invalid coordinates provided');
  }

  try {
    // Use $geoWithin with $centerSphere for better compatibility with legacy coordinate arrays
    const radiusInRadians = Number(radius) / 6371; // Earth's radius is ~6371 km

    // Build query with region filter
    const query: any = {
      isActive: true,
      'location.coordinates': {
        $geoWithin: {
          $centerSphere: [[userLng, userLat], radiusInRadians]
        }
      }
    };

    // Apply region filter if provided
    const regionHeader = req.headers['x-rez-region'] as string;
    const regionParam = req.query.region as string;
    const effectiveRegion = regionParam || regionHeader;

    if (effectiveRegion && isValidRegion(effectiveRegion)) {
      const regionFilter = regionService.getStoreFilter(effectiveRegion as RegionId);
      Object.assign(query, regionFilter);
      logger.info('[NEARBY STORES] Region filter applied:', effectiveRegion);
    }

    const stores = await Store.find(query)
      .select('name slug logo banner category tags ratings location isActive isFeatured offers operationalInfo serviceCapabilities bookingConfig bookingType hasStorePickup')
      .populate('category', 'name slug icon')
      .limit(Number(limit))
      .lean();

    // Calculate distances for each store and add frontend-friendly fields
    const storesWithDistance = stores.map((store: any) => {
      let distance = null;
      if (store.location?.coordinates && Array.isArray(store.location.coordinates) && store.location.coordinates.length === 2) {
        try {
          distance = Math.round(calculateDistance([userLng, userLat], store.location.coordinates) * 100) / 100;
        } catch (e) {
          distance = null;
        }
      }

      // Add frontend-friendly fields at top level for easier consumption
      return {
        ...store,
        distance,
        // Frontend-friendly fields
        rating: store.ratings?.average || 0,
        cashback: store.offers?.cashback || 0,
        deliveryTime: store.operationalInfo?.deliveryTime || null,
        image: store.logo || store.banner
      };
    });

    // Sort by distance
    storesWithDistance.sort((a: any, b: any) => {
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });

    sendSuccess(res, { stores: storesWithDistance }, 'Nearby stores retrieved successfully');

  } catch (error) {
    logger.error('Error fetching nearby stores:', error);
    throw new AppError('Failed to fetch nearby stores', 500);
  }
});

// Get featured stores
export const getFeaturedStores = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  try {
    // Get region from header for filtering
    const regionHeader = req.headers['x-rez-region'] as string;
    const baseQuery: Record<string, any> = { isActive: true, isSuspended: { $ne: true }, adminApproved: { $ne: false } };

    if (regionHeader && isValidRegion(regionHeader)) {
      const regionFilter = regionService.getStoreFilter(regionHeader as RegionId);
      Object.assign(baseQuery, regionFilter);
    }

    const storeListSelect = 'name slug logo banner category tags ratings location isActive isFeatured offers operationalInfo';
    const effectiveRegion = regionHeader || 'all';
    const cacheKey = `store:featured:${effectiveRegion}:${limit}`;

    const transformedStores = await withCache(cacheKey, CacheTTL.STORE_LIST, async () => {
      // First, try to get featured stores
      let stores = await Store.find({
        ...baseQuery,
        isFeatured: true
      })
        .select(storeListSelect)
        .populate('category', 'name slug icon')
        .sort({ 'ratings.average': -1, createdAt: -1 })
        .limit(Number(limit))
        .lean();

      // If no featured stores, get all active stores sorted by rating
      if (stores.length === 0) {
        stores = await Store.find(baseQuery)
          .select(storeListSelect)
          .populate('category', 'name slug icon')
          .sort({ 'ratings.average': -1, createdAt: -1 })
          .limit(Number(limit))
          .lean();
      }
      // If featured stores exist but less than limit, fill with other active stores
      else if (stores.length < Number(limit)) {
        const featuredIds = stores.map(s => s._id);
        const additionalStores = await Store.find({
          ...baseQuery,
          _id: { $nin: featuredIds }
        })
          .select(storeListSelect)
          .populate('category', 'name slug icon')
          .sort({ 'ratings.average': -1, createdAt: -1 })
          .limit(Number(limit) - stores.length)
          .lean();

        stores = [...stores, ...additionalStores];
      }

      // Transform stores to include frontend-friendly fields
      return stores.map((store: any) => ({
        ...store,
        rating: store.ratings?.average || 0,
        cashback: store.offers?.cashback || 0,
        deliveryTime: store.operationalInfo?.deliveryTime || null,
        image: store.logo || store.banner
      }));
    });

    sendSuccess(res, { stores: transformedStores }, 'Featured stores retrieved successfully');

  } catch (error) {
    throw new AppError('Failed to fetch featured stores', 500);
  }
});

// Search stores
export const searchStores = asyncHandler(async (req: Request, res: Response) => {
  const { q: searchText, category, page = 1, limit = 20 } = req.query;

  if (!searchText) {
    return sendBadRequest(res, 'Search query is required');
  }

  try {
    // Get region from header for filtering
    const regionHeader = req.headers['x-rez-region'] as string;

    const safeSearchText = escapeRegex(String(searchText));
    const query: any = {
      isActive: true,
      isSuspended: { $ne: true },
      adminApproved: { $ne: false },
      $or: [
        { name: { $regex: safeSearchText, $options: 'i' } },
        { description: { $regex: safeSearchText, $options: 'i' } },
        { 'location.address': { $regex: safeSearchText, $options: 'i' } },
        { 'location.city': { $regex: safeSearchText, $options: 'i' } },
        { tags: { $regex: safeSearchText, $options: 'i' } }
      ]
    };

    // Apply region filter
    if (regionHeader && isValidRegion(regionHeader)) {
      const regionFilter = regionService.getStoreFilter(regionHeader as RegionId);
      Object.assign(query, regionFilter);
    }

    // Filter by category if provided
    if (category) {
      if (typeof category === 'string' && !mongoose.Types.ObjectId.isValid(category)) {
        // Category is a string slug, find the ObjectId
        const categoryDoc = await Category.findOne({
          slug: category.toLowerCase(),
          isActive: true
        }).lean();

        if (categoryDoc) {
          query.category = categoryDoc._id;
        } else {
          // Category not found, return empty results
          return sendSuccess(res, {
            stores: [],
            pagination: {
              page: Number(page),
              limit: Number(limit),
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            }
          }, 'Store search completed successfully');
        }
      } else {
        // Assume it's an ObjectId
        query.category = category;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [stores, total] = await Promise.all([
      Store.find(query)
        .select('name slug logo banner description category tags ratings location isActive isFeatured offers operationalInfo serviceCapabilities bookingConfig bookingType hasStorePickup')
        .populate('category', 'name slug')
        .sort({ 'ratings.average': -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Store.countDocuments(query),
    ]);
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      stores,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, 'Store search completed successfully');

  } catch (error) {
    throw new AppError('Failed to search stores', 500);
  }
});

// Search stores by delivery category
export const searchStoresByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.params;
  const {
    location,
    radius = 10,
    page = 1,
    limit = 20,
    sortBy = 'rating',
    nuqtaPay
  } = req.query;

  try {
    const query: any = {
      isActive: true
    };

    // Apply region filter if provided
    const regionHeader = req.headers['x-rez-region'] as string;
    if (regionHeader && isValidRegion(regionHeader)) {
      const regionFilter = regionService.getStoreFilter(regionHeader as RegionId);
      Object.assign(query, regionFilter);
    }

    // Only add delivery category filter if category is not 'all'
    if (category && category !== 'all') {
      query[`deliveryCategories.${category}`] = true;
    }

    // Nuqta Pay filter
    if (nuqtaPay === 'true') {
      query['paymentSettings.acceptRezCoins'] = true;
    }

    // Sorting options
    const sortOptions: any = {};
    switch (sortBy) {
      case 'rating':
        sortOptions['ratings.average'] = -1;
        break;
      case 'distance':
        // Distance sorting is handled by $near in location query
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

    // First check if there are any stores matching the query
    const total = await Store.countDocuments(query);

    let stores: any[] = [];
    if (total > 0) {
      stores = await Store.find(query)
        .populate({
          path: 'category',
          select: 'name slug',
          options: { strictPopulate: false }
        })
        .select('name slug description logo banner location ratings operationalInfo deliveryCategories isActive isFeatured offers tags createdAt contact serviceCapabilities bookingConfig bookingType hasStorePickup paymentSettings.acceptRezCoins paymentSettings.acceptPromoCoins paymentSettings.maxCoinRedemptionPercent rewardRules.baseCashbackPercent')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean();

      // Batch-fetch products for all stores in a single aggregation (avoids N+1)
      const storeIds = stores.map((s: any) => s._id);
      const productsPerStore = await Product.aggregate([
        {
          $match: {
            store: { $in: storeIds },
            isActive: true,
            category: { $exists: true, $type: 'objectId' }
          }
        },
        {
          $project: {
            name: 1,
            title: 1,
            slug: 1,
            pricing: 1,
            price: 1,
            images: 1,
            image: 1,
            ratings: 1,
            rating: 1,
            inventory: 1,
            tags: 1,
            brand: 1,
            category: 1,
            variants: 1,
            description: 1,
            subcategory: 1,
            store: 1
          }
        },
        {
          $lookup: {
            from: 'categories',
            let: { categoryId: '$category' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', '$$categoryId']
                  },
                  isActive: true
                }
              },
              {
                $project: {
                  name: 1,
                  slug: 1
                }
              }
            ],
            as: 'category'
          }
        },
        {
          $unwind: {
            path: '$category',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: '$store',
            products: { $push: '$$ROOT' }
          }
        },
        {
          $project: {
            _id: 1,
            products: { $slice: ['$products', 4] }
          }
        }
      ]);

      const productMap = new Map(productsPerStore.map((p: any) => [String(p._id), p.products]));

      for (const store of stores) {
        const products = productMap.get(String(store._id)) || [];

        // Transform products to match frontend ProductItem type
        const transformedProducts = products.map((product: any) => {
          // Extract price values from either price or pricing fields
          const selling = product.price?.current || product.pricing?.selling || product.pricing?.salePrice || product.pricing?.base || 0;
          const original = product.price?.original || product.pricing?.original || product.pricing?.basePrice || product.pricing?.mrp || selling;
          const discount = original > selling ? Math.round(((original - selling) / original) * 100) : 0;

          return {
            productId: product._id.toString(),
            name: product.name || product.title || '',
            description: product.description || '',
            price: selling, // Current/selling price as number
            originalPrice: original > selling ? original : undefined,
            discountPercentage: discount || undefined,
            imageUrl: product.images?.[0] || product.image || 'https://via.placeholder.com/300',
            imageAlt: product.name,
            hasRezPay: true,
            inStock: product.inventory?.isAvailable !== false,
            category: (product.category && typeof product.category === 'object' ? product.category.name : null) || '',
            subcategory: (product.subcategory && typeof product.subcategory === 'object' ? product.subcategory.name : null) || '',
            brand: product.brand || '',
            rating: product.ratings?.average || product.rating?.value || 0,
            reviewCount: product.ratings?.count || product.rating?.count || 0,
            sizes: product.variants?.map((v: any) => v.size).filter(Boolean) || [],
            colors: product.variants?.map((v: any) => v.color).filter(Boolean) || [],
            tags: product.tags || []
          };
        });

        store.products = transformedProducts;
      }

      logger.debug(`[SEARCH BY CATEGORY] Populated ${stores.length} stores with products`);
      if (stores.length > 0 && stores[0].products) {
        logger.debug(`  First store "${stores[0].name}" has ${stores[0].products.length} products`);
        if (stores[0].products.length > 0) {
          const p = stores[0].products[0];
          logger.debug(`  First product: "${p.name}", price: ${p.price} (type: ${typeof p.price}), rating: ${p.rating}`);
        }
      }
    }

    // Calculate distance for each store if location is provided
    let storesWithDistance = stores;
    if (location && stores.length > 0) {
      const [lng, lat] = location.toString().split(',').map(Number);
      if (!isNaN(lng) && !isNaN(lat)) {
        const radiusKm = Number(radius);
        storesWithDistance = stores
          .map((store: any) => {
            if (store.location?.coordinates && Array.isArray(store.location.coordinates) && store.location.coordinates.length === 2) {
              try {
                const distance = calculateDistance(
                  [lng, lat],
                  store.location.coordinates
                );
                return { ...store, distance: Math.round(distance * 100) / 100 };
              } catch (error) {
                logger.error('Error calculating distance for store:', store._id, error);
                return { ...store, distance: null };
              }
            }
            return { ...store, distance: null };
          })
          .filter((store: any) => {
            // Filter by radius if distance was calculated
            if (store.distance !== null && store.distance !== undefined) {
              return store.distance <= radiusKm;
            }
            return true; // Include stores without coordinates
          });
      }
    }

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      stores: storesWithDistance,
      category,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, `Stores found for category: ${category}`);

  } catch (error) {
    logger.error('Search stores by category error:', error);
    throw new AppError('Failed to search stores by category', 500);
  }
});

// Search stores by delivery time range
export const searchStoresByDeliveryTime = asyncHandler(async (req: Request, res: Response) => {
  const {
    minTime = 15,
    maxTime = 60,
    location,
    radius = 10,
    page = 1,
    limit = 20
  } = req.query;

  try {
    const query: any = { isActive: true };

    // Add location filtering
    if (location) {
      const [lng, lat] = location.toString().split(',').map(Number);
      if (!isNaN(lng) && !isNaN(lat)) {
        query['location.coordinates'] = {
          $near: {
            $geometry: { type: 'Point', coordinates: [lng, lat] },
            $maxDistance: Number(radius) * 1000
          }
        };
      }
    }

    const stores = await Store.find(query)
      .select('name slug logo banner category tags ratings location isActive isFeatured offers operationalInfo serviceCapabilities bookingConfig bookingType hasStorePickup')
      .populate('category', 'name slug')
      .sort({ 'ratings.average': -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Filter stores by delivery time range
    const filteredStores = stores.filter((store: any) => {
      const deliveryTime = store.operationalInfo?.deliveryTime;
      if (!deliveryTime) return false;

      // Extract time range from string like "30-45 mins"
      const timeMatch = deliveryTime.match(/(\d+)-(\d+)/);
      if (timeMatch) {
        const minDeliveryTime = parseInt(timeMatch[1]);
        const maxDeliveryTime = parseInt(timeMatch[2]);
        return minDeliveryTime >= Number(minTime) && maxDeliveryTime <= Number(maxTime);
      }

      // Handle single time like "30 mins"
      const singleTimeMatch = deliveryTime.match(/(\d+)/);
      if (singleTimeMatch) {
        const deliveryTime = parseInt(singleTimeMatch[1]);
        return deliveryTime >= Number(minTime) && deliveryTime <= Number(maxTime);
      }

      return false;
    });

    const total = filteredStores.length;
    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      stores: filteredStores,
      deliveryTimeRange: { min: Number(minTime), max: Number(maxTime) },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, `Stores found with delivery time ${minTime}-${maxTime} minutes`);

  } catch (error) {
    throw new AppError('Failed to search stores by delivery time', 500);
  }
});

// Advanced store search with filters
export const advancedStoreSearch = asyncHandler(async (req: Request, res: Response) => {
  const {
    search,
    category,
    deliveryTime,
    priceRange,
    rating,
    paymentMethods,
    features,
    sortBy = 'rating',
    location,
    radius = 10,
    page = 1,
    limit = 20
  } = req.query;

  try {
    const query: any = { isActive: true };

    // Text search (escape special regex characters to prevent ReDoS)
    if (search) {
      const escapedSearch = search.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
        { 'basicInfo.cuisine': { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    // Category filtering
    if (category) {
      query[`deliveryCategories.${category}`] = true;
    }

    // Delivery time filtering
    if (deliveryTime) {
      const [minTime, maxTime] = deliveryTime.toString().split('-').map(Number);
      if (!isNaN(minTime) && !isNaN(maxTime)) {
        query['operationalInfo.deliveryTime'] = {
          $gte: minTime,
          $lte: maxTime
        };
      }
    }

    // Price range filtering
    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.toString().split('-').map(Number);
      if (!isNaN(minPrice) && !isNaN(maxPrice)) {
        query['operationalInfo.minimumOrder'] = {
          $gte: minPrice,
          $lte: maxPrice
        };
      }
    }

    // Rating filtering
    if (rating) {
      query['ratings.average'] = { $gte: Number(rating) };
    }

    // Payment methods filtering
    if (paymentMethods) {
      const methods = paymentMethods.toString().split(',');
      query['operationalInfo.paymentMethods'] = { $in: methods };
    }

    // Features filtering
    if (features) {
      const featureList = features.toString().split(',');
      featureList.forEach((feature: string) => {
        switch (feature) {
          case 'freeDelivery':
            query['operationalInfo.freeDeliveryAbove'] = { $exists: true };
            break;
          case 'walletPayment':
            query['operationalInfo.acceptsWalletPayment'] = true;
            break;
          case 'verified':
            query.isVerified = true;
            break;
          case 'featured':
            query.isFeatured = true;
            break;
          case 'nuqtaPay':
            query['paymentSettings.acceptRezCoins'] = true;
            break;
        }
      });
    }

    // Location-based filtering
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
    let sort: any = {};
    switch (sortBy) {
      case 'rating':
        sort = { 'ratings.average': -1, 'ratings.count': -1 };
        break;
      case 'distance':
        sort = { 'ratings.average': -1 };
        break;
      case 'name':
        sort = { name: 1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'price':
        sort = { 'operationalInfo.minimumOrder': 1 };
        break;
      default:
        sort = { 'ratings.average': -1 };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    const [stores, total] = await Promise.all([
      Store.find(query)
        .select('name slug logo banner category tags ratings location isActive isFeatured offers operationalInfo serviceCapabilities bookingConfig bookingType hasStorePickup paymentSettings.acceptRezCoins paymentSettings.acceptPromoCoins paymentSettings.maxCoinRedemptionPercent rewardRules.baseCashbackPercent')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit))
        .populate('category', 'name slug')
        .lean(),
      Store.countDocuments(query),
    ]);

    // Calculate distances if location provided
    if (userLng !== undefined && userLat !== undefined && stores.length > 0) {
      stores.forEach((store: any) => {
        if (store.location?.coordinates && Array.isArray(store.location.coordinates) && store.location.coordinates.length === 2) {
          try {
            store.distance = calculateDistance(
              [userLng, userLat],
              store.location.coordinates
            );
          } catch (e) {
            store.distance = null;
          }
        }
      });

      // Sort by distance if sortBy is distance
      if (sortBy === 'distance') {
        stores.sort((a: any, b: any) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }
    }

    sendSuccess(res, {
      stores,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalStores: total,
        hasNextPage: skip + stores.length < total,
        hasPrevPage: Number(page) > 1
      }
    });

  } catch (error) {
    logger.error('Advanced store search error:', error);
    throw new AppError('Failed to search stores', 500);
  }
});

// Get trending stores - FOR FRONTEND TRENDING SECTION
export const getTrendingStores = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    limit = 20,
    page = 1,
    days = 7
  } = req.query;

  try {
    // Get region from header for filtering
    const regionHeader = req.headers['x-rez-region'] as string;
    const region = regionHeader && isValidRegion(regionHeader) ? regionHeader : 'all';

    logger.info('[TRENDING STORES] Getting trending stores:', {
      category,
      limit,
      page,
      days,
      region
    });

    // Try to get from cache first (cache key includes region)
    const cacheKey = `store:trending:${category || 'all'}:${limit}:${page}:${days}:${region}`;
    const cachedStores = await redisService.get<any>(cacheKey);

    if (cachedStores) {
      logger.info('[TRENDING STORES] Returning from cache');
      return sendSuccess(res, cachedStores, 'Trending stores retrieved successfully');
    }

    // Calculate date threshold for trending (default last 7 days)
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - Number(days));

    // Get order counts per store in the last N days
    const orderStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: daysAgo },
          status: { $in: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'] }
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: '$items.store',
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$totals.total' }
        }
      }
    ]);

    // Create a map of store IDs to order stats
    const orderStatsMap = new Map(
      orderStats.map(stat => [stat._id.toString(), {
        orderCount: stat.orderCount,
        totalRevenue: stat.totalRevenue
      }])
    );

    // Build query for stores
    const query: any = {
      isActive: true
    };

    // Apply region filter
    if (region !== 'all') {
      const regionFilter = regionService.getStoreFilter(region as RegionId);
      Object.assign(query, regionFilter);
    }

    // Handle category conversion if provided (can be string name/slug or ObjectId)
    if (category) {
      if (typeof category === 'string' && !mongoose.Types.ObjectId.isValid(category)) {
        // Category is a string name/slug, need to find the ObjectId
        const categoryDoc = await Category.findOne({
          $or: [
            { name: { $regex: new RegExp(`^${escapeRegex(String(category))}$`, 'i') } },
            { slug: category.toLowerCase() }
          ],
          isActive: true
        }).lean();

        if (!categoryDoc) {
          logger.info('[TRENDING STORES] Category not found:', category);
          const result = {
            stores: [],
            pagination: {
              total: 0,
              page: Number(page),
              limit: Number(limit),
              pages: 0
            }
          };
          await redisService.set(cacheKey, result, 1800);
          return sendSuccess(res, result, 'Trending stores retrieved successfully');
        }

        query.category = categoryDoc._id;
        logger.info('[TRENDING STORES] Category converted to ObjectId:', categoryDoc.name, categoryDoc._id);
      } else if (mongoose.Types.ObjectId.isValid(category as string)) {
        query.category = new mongoose.Types.ObjectId(category as string);
      }
    }

    // Get stores with analytics - use aggregation to safely populate category
    const matchStage: any = {
      ...query
    };

    // Add condition to only include stores with valid ObjectId category references
    const categoryTypeCheck = { category: { $exists: true, $type: 'objectId' } };

    if (matchStage.$and) {
      matchStage.$and.push(categoryTypeCheck);
    } else {
      matchStage.$and = [categoryTypeCheck];
    }

    const stores = await Store.aggregate([
      { $match: matchStage },
      {
        $project: {
          name: 1,
          logo: 1,
          banner: 1,
          videos: 1,
          category: 1,
          location: 1,
          ratings: 1,
          analytics: 1,
          contact: 1,
          createdAt: 1,
          description: 1,
          offers: 1,
          rewardRules: 1,
          operationalInfo: 1,
          tags: 1
        }
      },
      {
        $lookup: {
          from: 'categories',
          let: { categoryId: '$category' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$categoryId'] },
                    { $eq: ['$isActive', true] }
                  ]
                }
              }
            },
            {
              $project: {
                name: 1,
                slug: 1,
                icon: 1
              }
            }
          ],
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    // Calculate trending score for each store and add frontend-friendly fields
    const storesWithScore = stores
      .map(store => {
        const storeId = store._id.toString();
        const orderData = orderStatsMap.get(storeId) || { orderCount: 0, totalRevenue: 0 };

        // Calculate trending score: (orders * 10) + (views * 1) + (revenue * 0.01) + (rating * 5)
        const trendingScore =
          (orderData.orderCount * 10) +
          ((store.analytics as any)?.views || 0) +
          (orderData.totalRevenue * 0.01) +
          (((store.ratings as any)?.average || 0) * 5);

        // Add frontend-friendly fields at top level for easier consumption
        return {
          ...store,
          rating: (store.ratings as any)?.average || 0,
          cashback: (store.offers as any)?.cashback || 0,
          deliveryTime: (store.operationalInfo as any)?.deliveryTime || null,
          image: store.logo || store.banner,
          trendingScore,
          recentOrders: orderData.orderCount,
          recentRevenue: orderData.totalRevenue
        };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore);

    // Apply pagination
    const startIndex = (Number(page) - 1) * Number(limit);
    const endIndex = startIndex + Number(limit);
    const paginatedStores = storesWithScore.slice(startIndex, endIndex);

    const result = {
      stores: paginatedStores,
      pagination: {
        total: storesWithScore.length,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(storesWithScore.length / Number(limit))
      }
    };

    // Cache for 30 minutes (trending data changes frequently)
    await redisService.set(cacheKey, result, 1800);

    logger.info('[TRENDING STORES] Returning', paginatedStores.length, 'trending stores');
    sendSuccess(res, result, 'Trending stores retrieved successfully');

  } catch (error) {
    logger.error('[TRENDING STORES] Error:', error);
    throw new AppError('Failed to get trending stores', 500);
  }
});

// Get top cashback stores
// GET /api/stores/top-cashback
export const getTopCashbackStores = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, limit = 10, minCashback = 10 } = req.query;

  try {
    // Build query for stores with cashback >= minCashback
    const query: any = {
      isActive: true,
      'offers.cashback': { $exists: true, $gte: Number(minCashback) }
    };

    let stores = await Store.find(query)
      .populate('category', 'name slug icon')
      .sort({ 'offers.cashback': -1, 'ratings.average': -1 })
      .limit(Number(limit))
      .lean();

    // Calculate distance if location provided
    if (latitude && longitude) {
      const userLat = Number(latitude);
      const userLon = Number(longitude);

      stores = stores.map((store: any) => {
        if (store.location?.coordinates && store.location.coordinates.length === 2) {
          const [storeLon, storeLat] = store.location.coordinates;
          const distance = calculateDistance([userLon, userLat], [storeLon, storeLat]);
          return { ...store, distance: Math.round(distance * 10) / 10 };
        }
        return store;
      });

      // Sort by distance if location provided
      stores.sort((a: any, b: any) => {
        if (a.distance && b.distance) {
          return a.distance - b.distance;
        }
        return (b.offers?.cashback || 0) - (a.offers?.cashback || 0);
      });
    }

    // Format response
    const formattedStores = stores.map((store: any) => ({
      _id: store._id,
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      cashbackPercentage: store.offers?.cashback || 0,
      maxCashback: store.offers?.maxCashback,
      minOrderAmount: store.offers?.minOrderAmount,
      distance: store.distance,
      rating: store.ratings?.average || 0,
      reviewCount: store.ratings?.count || 0,
      category: store.category,
      location: store.location
    }));

    sendSuccess(res, { stores: formattedStores }, 'Top cashback stores retrieved successfully');

  } catch (error) {
    logger.error('[GET TOP CASHBACK STORES] Error:', error);
    throw new AppError('Failed to fetch top cashback stores', 500);
  }
});

// Get BNPL (Buy Now Pay Later) stores
// GET /api/stores/bnpl
export const getBNPLStores = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude, limit = 10 } = req.query;

  try {
    // Query stores with BNPL payment methods
    const query: any = {
      isActive: true,
      $or: [
        { 'operationalInfo.paymentMethods': { $in: ['bnpl', 'installment', 'pay-later', 'paylater'] } },
        { 'paymentSettings.acceptPayLater': true }
      ]
    };

    let stores = await Store.find(query)
      .populate('category', 'name slug icon')
      .sort({ 'ratings.average': -1, createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Calculate distance if location provided
    if (latitude && longitude) {
      const userLat = Number(latitude);
      const userLon = Number(longitude);

      stores = stores.map((store: any) => {
        if (store.location?.coordinates && store.location.coordinates.length === 2) {
          const [storeLon, storeLat] = store.location.coordinates;
          const distance = calculateDistance([userLon, userLat], [storeLon, storeLat]);
          return { ...store, distance: Math.round(distance * 10) / 10 };
        }
        return store;
      });

      // Sort by distance if location provided
      stores.sort((a: any, b: any) => {
        if (a.distance && b.distance) {
          return a.distance - b.distance;
        }
        return (b.ratings?.average || 0) - (a.ratings?.average || 0);
      });
    }

    // Format response with BNPL options
    const formattedStores = stores.map((store: any) => {
      // Extract BNPL options from payment methods
      const paymentMethods = store.operationalInfo?.paymentMethods || [];
      const bnplOptions: string[] = [];

      if (paymentMethods.includes('bnpl') || paymentMethods.includes('pay-later') || paymentMethods.includes('paylater')) {
        bnplOptions.push('3 months', '6 months');
      }
      if (paymentMethods.includes('installment')) {
        bnplOptions.push('3 months', '6 months', '12 months');
      }

      return {
        _id: store._id,
        name: store.name,
        slug: store.slug,
        logo: store.logo,
        bnplOptions: bnplOptions.length > 0 ? bnplOptions : ['3 months', '6 months'], // Default options
        paymentMethods: paymentMethods,
        distance: store.distance,
        rating: store.ratings?.average || 0,
        category: store.category,
        location: store.location
      };
    });

    sendSuccess(res, { stores: formattedStores }, 'BNPL stores retrieved successfully');

  } catch (error) {
    logger.error('[GET BNPL STORES] Error:', error);
    throw new AppError('Failed to fetch BNPL stores', 500);
  }
});

// Get stores by tag (cuisine) for Browse by Cuisine feature
// GET /api/stores/by-tag/:tag
export const getStoresByTag = asyncHandler(async (req: Request, res: Response) => {
  const { tag } = req.params;
  const { page = 1, limit = 20, sortBy = 'rating' } = req.query;

  try {
    logger.info(`[GET STORES BY TAG] Searching for tag: ${tag}`);

    // Build query to find stores with matching tag (case insensitive)
    const tagLower = tag.toLowerCase();
    const query: any = {
      isActive: true,
      $or: [
        { tags: { $elemMatch: { $regex: new RegExp(escapeRegex(tagLower), 'i') } } },
        { name: { $regex: new RegExp(escapeRegex(tagLower), 'i') } }
      ]
    };

    // Sorting options
    const sortOptions: any = {};
    switch (sortBy) {
      case 'rating':
        sortOptions['ratings.average'] = -1;
        break;
      case 'cashback':
        sortOptions['offers.cashback'] = -1;
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
        .populate('category', 'name slug icon')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Store.countDocuments(query)
    ]);

    logger.info(`[GET STORES BY TAG] Found ${stores.length} stores for tag: ${tag}`);

    // Format response
    const formattedStores = stores.map((store: any) => ({
      _id: store._id,
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      banner: store.banner,
      rating: store.ratings?.average || 0,
      reviewCount: store.ratings?.count || 0,
      cashback: store.offers?.cashback || 0,
      tags: store.tags || [],
      location: store.location?.address || 'Multiple Locations',
      deliveryTime: store.operationalInfo?.deliveryTime || '30-45 mins',
      isVerified: store.verification?.isVerified || store.isVerified || false,
      category: store.category
    }));

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      stores: formattedStores,
      tag: tag,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1
      }
    }, `Found ${total} stores for tag: ${tag}`);

  } catch (error) {
    logger.error('[GET STORES BY TAG] Error:', error);
    throw new AppError('Failed to get stores by tag', 500);
  }
});

// Get cuisine counts for Browse by Cuisine section
// GET /api/stores/cuisine-counts
export const getCuisineCounts = asyncHandler(async (req: Request, res: Response) => {
  try {
    logger.info('[GET CUISINE COUNTS] Aggregating cuisine counts...');

    // Define the cuisines we want to count
    const cuisines = [
      { id: 'pizza', name: 'Pizza', icon: '🍕' },
      { id: 'biryani', name: 'Biryani', icon: '🍗' },
      { id: 'burgers', name: 'Burgers', icon: '🍔' },
      { id: 'chinese', name: 'Chinese', icon: '🥡' },
      { id: 'desserts', name: 'Desserts', icon: '🍰' },
      { id: 'healthy', name: 'Healthy', icon: '🥗' },
      { id: 'south-indian', name: 'South Indian', icon: '🍛' },
      { id: 'north-indian', name: 'North Indian', icon: '🍛' },
      { id: 'cafe', name: 'Cafe', icon: '☕' },
      { id: 'street-food', name: 'Street Food', icon: '🌮' },
      { id: 'ice-cream', name: 'Ice Cream', icon: '🍦' },
      { id: 'thali', name: 'Thali', icon: '🍱' },
    ];

    // Count stores for all cuisines in a single aggregation (avoids 12 individual queries)
    const facetStages: Record<string, any[]> = {};
    for (const cuisine of cuisines) {
      const regex = new RegExp(cuisine.id, 'i');
      facetStages[cuisine.id] = [
        { $match: { $or: [{ tags: { $elemMatch: { $regex: regex } } }, { name: { $regex: regex } }] } },
        { $count: 'count' }
      ];
    }

    const [facetResult] = await Store.aggregate([
      { $match: { isActive: true } },
      { $facet: facetStages }
    ]);

    // Map aggregation results back to cuisine objects
    const cuisineCounts = cuisines.map((cuisine) => {
      const result = facetResult?.[cuisine.id];
      const count = result && result.length > 0 ? result[0].count : 0;
      return {
        id: cuisine.id,
        name: cuisine.name,
        icon: cuisine.icon,
        count,
        displayCount: count > 0 ? `${count}+ places` : '0 places'
      };
    });

    // Sort by count (most popular first) and filter out zeros
    const sortedCounts = cuisineCounts
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count);

    logger.info(`[GET CUISINE COUNTS] Found ${sortedCounts.length} cuisines with stores`);

    sendSuccess(res, {
      cuisines: sortedCounts,
      total: sortedCounts.reduce((sum, c) => sum + c.count, 0)
    }, 'Cuisine counts retrieved successfully');

  } catch (error) {
    logger.error('[GET CUISINE COUNTS] Error:', error);
    throw new AppError('Failed to get cuisine counts', 500);
  }
});

// Get stores filtered by service capability type
// GET /stores/by-service-type/:serviceType?category=food-dining&page=1&limit=20
export const getStoresByServiceType = asyncHandler(async (req: Request, res: Response) => {
  const { serviceType } = req.params;
  const { category, page = 1, limit = 20, sort = 'rating' } = req.query;

  const validServiceTypes = ['homeDelivery', 'driveThru', 'tableBooking', 'dineIn', 'storePickup'];
  if (!validServiceTypes.includes(serviceType)) {
    return sendBadRequest(res, `Invalid service type. Must be one of: ${validServiceTypes.join(', ')}`);
  }

  try {
    const query: any = {
      isActive: true,
      [`serviceCapabilities.${serviceType}.enabled`]: true,
    };

    // Apply region filter
    const regionHeader = req.headers['x-rez-region'] as string;
    if (regionHeader && isValidRegion(regionHeader)) {
      Object.assign(query, regionService.getStoreFilter(regionHeader as RegionId));
    }

    // Apply category filter (supports slug)
    if (category) {
      const categoryStr = category as string;
      if (mongoose.Types.ObjectId.isValid(categoryStr)) {
        query.category = categoryStr;
      } else {
        const categoryDoc = await Category.findOne({ slug: categoryStr }).select('_id').lean();
        if (categoryDoc) {
          const subCategories = await Category.find({ parentCategory: categoryDoc._id }).select('_id').lean();
          query.category = { $in: [categoryDoc._id, ...subCategories.map(sc => sc._id)] };
        }
      }
    }

    // Sorting
    const sortOptions: any = {};
    switch (sort) {
      case 'rating': sortOptions['ratings.average'] = -1; break;
      case 'newest': sortOptions.createdAt = -1; break;
      case 'popularity': sortOptions['analytics.totalOrders'] = -1; break;
      case 'name': sortOptions.name = 1; break;
      default: sortOptions['ratings.average'] = -1;
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [stores, total] = await Promise.all([
      Store.find(query)
        .select('name slug logo banner ratings tags offers operationalInfo location serviceCapabilities deliveryCategories rewardRules isFeatured priceForTwo bookingType bookingConfig')
        .populate('category', 'name slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Store.countDocuments(query),
    ]);

    sendSuccess(res, {
      stores,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasMore: skip + stores.length < total,
      },
      serviceType,
    }, `Found ${total} stores with ${serviceType} capability`);

  } catch (error) {
    logger.error(`[GET STORES BY SERVICE TYPE] Error for ${serviceType}:`, error);
    throw new AppError('Failed to get stores by service type', 500);
  }
});
