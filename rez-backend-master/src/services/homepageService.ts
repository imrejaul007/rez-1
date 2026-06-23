import { Product } from '../models/Product';
import { Store } from '../models/Store';
import Event from '../models/Event';
import Offer from '../models/Offer';
import { Category } from '../models/Category';
import { Video } from '../models/Video';
import { Article } from '../models/Article';
import { MallBrand } from '../models/MallBrand';
import { ModeId } from './modeService';
import { regionService, RegionId, isValidRegion, DEFAULT_REGION } from './regionService';
import { withCache, CacheKeys } from '../utils/cacheHelper';
import { CacheTTL } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Homepage Service
 * Aggregates data from multiple sources for the homepage
 * Uses parallel execution for optimal performance
 * Uses Redis caching to avoid repeated DB queries
 */

// In-memory cache for region-to-storeIds mapping (avoids repeated pre-queries)
const regionStoreCache = new Map<string, { ids: string[], timestamp: number }>();
const REGION_STORE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getStoreIdsForRegion(region: RegionId): Promise<string[]> {
  const cacheKey = String(region);
  const cached = regionStoreCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < REGION_STORE_CACHE_TTL) {
    return cached.ids;
  }
  const regionFilter = regionService.getStoreFilter(region);
  const stores = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
  const ids = stores.map((s: any) => s._id);
  regionStoreCache.set(cacheKey, { ids, timestamp: Date.now() });
  return ids;
}

// Default limits for each section
const DEFAULT_LIMITS = {
  featuredProducts: 10,
  newArrivals: 10,
  featuredStores: 8,
  trendingStores: 8,
  upcomingEvents: 6,
  megaOffers: 5,
  studentOffers: 5,
  categories: 12,
  trendingVideos: 6,
  latestArticles: 4,
  brandPartnerships: 6
};

// Gradient colors based on brand tier
const TIER_GRADIENTS: Record<string, [string, string]> = {
  luxury: ['#1a1a2e', '#16213e'],
  exclusive: ['#4a0072', '#8e2de2'],
  premium: ['#DBEAFE', '#E9D5FF'],
  standard: ['#D1FAE5', '#FED7AA']
};

interface HomepageQueryParams {
  userId?: string;
  sections?: string[];
  limit?: number;
  location?: {
    lat: number;
    lng: number;
  };
  mode?: ModeId;
  region?: RegionId;
}

interface HomepageResponse {
  success: boolean;
  data: {
    [key: string]: any;
  };
  errors?: {
    [key: string]: string;
  };
  metadata: {
    timestamp: Date;
    requestedSections: string[];
    successfulSections: string[];
    failedSections: string[];
  };
}

/**
 * Fetch featured products (cached)
 */
async function fetchFeaturedProducts(limit: number, region?: RegionId): Promise<any[]> {
  const cacheKey = region
    ? CacheKeys.productFeaturedByRegion(String(region), limit)
    : CacheKeys.productFeatured(limit);

  return withCache(cacheKey, CacheTTL.PRODUCT_FEATURED, async () => {
    const startTime = Date.now();
    try {
      const query: Record<string, any> = {
        isActive: true,
        isFeatured: true,
        'inventory.isAvailable': true
      };

      if (region) {
        const storeIds = await getStoreIdsForRegion(region);
        query.store = { $in: storeIds };
      }

      const products: any = await (Product as any).find(query)
        .populate('category', 'name slug')
        .populate('store', 'name slug logo location')
        .select('name slug images pricing ratings analytics')
        .sort({ 'analytics.views': -1, 'ratings.average': -1 })
        .limit(limit)
        .lean();

      const duration = Date.now() - startTime;
      logger.info(` [Homepage Service] Fetched ${products.length} featured products (region: ${region || 'all'}) in ${duration}ms`);
      return products;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(` [Homepage Service] Failed to fetch featured products in ${duration}ms:`, error);
      throw error;
    }
  });
}

/**
 * Fetch new arrival products (cached)
 */
async function fetchNewArrivals(limit: number, region?: RegionId): Promise<any[]> {
  const cacheKey = region
    ? CacheKeys.productNewArrivalsByRegion(String(region), limit)
    : CacheKeys.productNewArrivals(limit);

  return withCache(cacheKey, CacheTTL.PRODUCT_NEW_ARRIVALS, async () => {
    const startTime = Date.now();
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const query: Record<string, any> = {
        isActive: true,
        'inventory.isAvailable': true,
        createdAt: { $gte: thirtyDaysAgo }
      };

      if (region) {
        const storeIds = await getStoreIdsForRegion(region);
        query.store = { $in: storeIds };
      }

      const products: any = await (Product as any).find(query)
        .populate('category', 'name slug')
        .populate('store', 'name slug logo location cashback')
        .select('name title slug images pricing ratings createdAt cashback')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      const transformedProducts = products.map((product: any) => ({
        _id: product._id,
        id: product._id,
        name: product.name,
        title: product.title || product.name,
        image: product.images?.[0] || '',
        images: product.images || [],
        pricing: product.pricing || {
          selling: product.price?.current || 0,
          original: product.price?.original || 0,
          currency: product.price?.currency || 'INR',
          discount: product.price?.discount || 0
        },
        category: product.category,
        ratings: product.ratings || {
          average: 0,
          count: 0
        },
        isNewArrival: true,
        createdAt: product.createdAt,
        store: product.store,
        cashback: product.cashback?.percentage || (product.store as any)?.cashback?.percentage
          ? {
              percentage: product.cashback?.percentage || (product.store as any)?.cashback?.percentage || 5,
              maxAmount: product.cashback?.maxAmount || (product.store as any)?.cashback?.maxAmount || 500
            }
          : {
              percentage: 5,
              maxAmount: 500
            }
      }));

      const duration = Date.now() - startTime;
      logger.info(` [Homepage Service] Fetched ${transformedProducts.length} new arrivals (region: ${region || 'all'}) in ${duration}ms`);
      return transformedProducts;
    } catch (error) {
      throw error;
    }
  });
}

/**
 * Fetch featured stores (cached)
 */
async function fetchFeaturedStores(limit: number, region?: RegionId): Promise<any[]> {
  const cacheKey = region
    ? CacheKeys.homepageByRegion(String(region), `featuredStores:${limit}`)
    : `homepage:featuredStores:${limit}`;

  return withCache(cacheKey, CacheTTL.STORE_LIST, async () => {
    const startTime = Date.now();
    try {
      const query: Record<string, any> = {
        isActive: true,
        isFeatured: true
      };

      if (region) {
        const regionFilter = regionService.getStoreFilter(region);
        Object.assign(query, regionFilter);
      }

      const stores = await Store.find(query)
        .populate('category', 'name slug')
        .select('name slug logo ratings location tags')
        .sort({ 'ratings.average': -1 })
        .limit(limit)
        .lean();

      const duration = Date.now() - startTime;
      logger.info(` [Homepage Service] Fetched ${stores.length} featured stores (region: ${region || 'all'}) in ${duration}ms`);
      return stores;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(` [Homepage Service] Failed to fetch featured stores in ${duration}ms:`, error);
      throw error;
    }
  });
}

/**
 * Fetch trending stores (cached)
 */
async function fetchTrendingStores(limit: number, region?: RegionId): Promise<any[]> {
  const cacheKey = region
    ? CacheKeys.homepageByRegion(String(region), `trendingStores:${limit}`)
    : `homepage:trendingStores:${limit}`;

  return withCache(cacheKey, CacheTTL.STORE_LIST, async () => {
    const startTime = Date.now();
    try {
      const query: Record<string, any> = {
        isActive: true
      };

      if (region) {
        const regionFilter = regionService.getStoreFilter(region);
        Object.assign(query, regionFilter);
      }

      const stores = await Store.find(query)
        .populate('category', 'name slug')
        .select('name slug logo ratings location tags analytics')
        .sort({ 'analytics.totalOrders': -1, 'ratings.average': -1 })
        .limit(limit)
        .lean();

      const duration = Date.now() - startTime;
      logger.info(` [Homepage Service] Fetched ${stores.length} trending stores (region: ${region || 'all'}) in ${duration}ms`);
      return stores;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(` [Homepage Service] Failed to fetch trending stores in ${duration}ms:`, error);
      throw error;
    }
  });
}

/**
 * Fetch upcoming events (cached)
 */
async function fetchUpcomingEvents(limit: number): Promise<any[]> {
  const cacheKey = `homepage:upcomingEvents:${limit}`;

  return withCache(cacheKey, CacheTTL.PRODUCT_SEARCH, async () => {
    const startTime = Date.now();
    try {
      const now = new Date();

      const events = await Event.find({
        isActive: true,
        'dateTime.start': { $gte: now },
        status: 'upcoming'
      })
        .select('title slug category images price location dateTime organizer tags')
        .sort({ 'dateTime.start': 1 })
        .limit(limit)
        .lean();

      const duration = Date.now() - startTime;
      logger.info(` [Homepage Service] Fetched ${events.length} upcoming events in ${duration}ms`);
      return events;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(` [Homepage Service] Failed to fetch upcoming events in ${duration}ms:`, error);
      throw error;
    }
  });
}

/**
 * Fetch mega offers (cached)
 */
async function fetchMegaOffers(limit: number): Promise<any[]> {
  const cacheKey = `homepage:megaOffers:${limit}`;

  return withCache(cacheKey, CacheTTL.PRODUCT_SEARCH, async () => {
    const startTime = Date.now();
    try {
      const now = new Date();

      const offers = await Offer.find({
        category: 'mega',
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
      })
        .select('title subtitle image category type cashbackPercentage originalPrice discountedPrice store validity')
        .sort({ 'engagement.viewsCount': -1 })
        .limit(limit)
        .lean();

      const duration = Date.now() - startTime;
      logger.info(` [Homepage Service] Fetched ${offers.length} mega offers in ${duration}ms`);
      return offers;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(` [Homepage Service] Failed to fetch mega offers in ${duration}ms:`, error);
      throw error;
    }
  });
}

/**
 * Fetch student offers (cached)
 */
async function fetchStudentOffers(limit: number): Promise<any[]> {
  const cacheKey = `homepage:studentOffers:${limit}`;

  return withCache(cacheKey, CacheTTL.PRODUCT_SEARCH, async () => {
    const startTime = Date.now();
    try {
      const now = new Date();

      const offers = await Offer.find({
        category: 'student',
        'validity.isActive': true,
        'validity.startDate': { $lte: now },
        'validity.endDate': { $gte: now }
      })
        .select('title subtitle image category type cashbackPercentage originalPrice discountedPrice store validity')
        .sort({ 'engagement.viewsCount': -1 })
        .limit(limit)
        .lean();

      const duration = Date.now() - startTime;
      logger.info(` [Homepage Service] Fetched ${offers.length} student offers in ${duration}ms`);
      return offers;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(` [Homepage Service] Failed to fetch student offers in ${duration}ms:`, error);
      throw error;
    }
  });
}

/**
 * Fetch all categories (cached - long TTL since categories rarely change)
 */
async function fetchCategories(limit: number): Promise<any[]> {
  const cacheKey = `homepage:categories:${limit}`;

  return withCache(cacheKey, CacheTTL.CATEGORY_LIST, async () => {
    const startTime = Date.now();
    try {
      const categories = await Category.find({ isActive: true })
        .select('name slug icon image description productCount')
        .sort({ productCount: -1, name: 1 })
        .limit(limit)
        .lean();

      const duration = Date.now() - startTime;
      logger.info(` [Homepage Service] Fetched ${categories.length} categories in ${duration}ms`);
      return categories;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(` [Homepage Service] Failed to fetch categories in ${duration}ms:`, error);
      throw error;
    }
  });
}

/**
 * Fetch trending videos (cached)
 */
async function fetchTrendingVideos(limit: number): Promise<any[]> {
  const cacheKey = `homepage:trendingVideos:${limit}`;

  return withCache(cacheKey, CacheTTL.PRODUCT_LIST, async () => {
    const startTime = Date.now();
    try {
      const videos = await Video.find({
        isActive: true,
        type: { $in: ['merchant', 'ugc'] }
      })
        .populate('creator', 'name avatar')
        .select('title thumbnail url duration views likes category tags createdAt')
        .sort({ views: -1, likes: -1 })
        .limit(limit)
        .lean();

      const duration = Date.now() - startTime;
      logger.info(` [Homepage Service] Fetched ${videos.length} trending videos in ${duration}ms`);
      return videos;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(` [Homepage Service] Failed to fetch trending videos in ${duration}ms:`, error);
      throw error;
    }
  });
}

/**
 * Fetch latest articles (cached)
 */
async function fetchLatestArticles(limit: number): Promise<any[]> {
  const cacheKey = `homepage:latestArticles:${limit}`;

  return withCache(cacheKey, CacheTTL.PRODUCT_LIST, async () => {
    const startTime = Date.now();
    try {
      const articles = await Article.find({
        isActive: true,
        status: 'published'
      })
        .populate('author', 'name avatar')
        .select('title slug thumbnail excerpt category tags readTime publishedAt')
        .sort({ publishedAt: -1 })
        .limit(limit)
        .lean();

      const duration = Date.now() - startTime;
      logger.info(` [Homepage Service] Fetched ${articles.length} latest articles in ${duration}ms`);
      return articles;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(` [Homepage Service] Failed to fetch latest articles in ${duration}ms:`, error);
      throw error;
    }
  });
}

/**
 * Format deal text from cashback info
 */
function formatDeal(cashback: any): string {
  if (!cashback) return 'Special Offer';

  if (cashback.maxAmount && cashback.maxAmount >= 1000) {
    return `Up to ₹${Math.floor(cashback.maxAmount / 1000)}k cashback`;
  }
  if (cashback.percentage >= 10) {
    return `${cashback.percentage}% cashback`;
  }
  return `Up to ${cashback.percentage}% off`;
}

/**
 * Fetch brand partnerships for homepage (cached)
 */
async function fetchBrandPartnerships(limit: number): Promise<any[]> {
  const cacheKey = `homepage:brandPartnerships:${limit}`;

  return withCache(cacheKey, CacheTTL.PRODUCT_FEATURED, async () => {
    const startTime = Date.now();
    try {
      const brands = await MallBrand.find({
        isFeatured: true,
        isActive: true,
        'cashback.percentage': { $gt: 0 }
      })
        .populate('mallCategory', 'name slug color')
        .select('name slug logo tier cashback ratings')
        .sort({ 'ratings.average': -1, 'analytics.clicks': -1 })
        .limit(limit)
        .lean();

      const transformedBrands = brands.map((brand: any) => ({
        id: brand._id,
        name: brand.name,
        slug: brand.slug,
        logo: brand.logo,
        tier: brand.tier,
        deal: formatDeal(brand.cashback),
        cashback: brand.cashback,
        rating: brand.ratings?.average || 4.0,
        category: brand.mallCategory?.name,
        gradientColors: TIER_GRADIENTS[brand.tier] || TIER_GRADIENTS.standard
      }));

      const duration = Date.now() - startTime;
      logger.info(` [Homepage Service] Fetched ${transformedBrands.length} brand partnerships in ${duration}ms`);
      return transformedBrands;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(` [Homepage Service] Failed to fetch brand partnerships in ${duration}ms:`, error);
      throw error;
    }
  });
}

/**
 * Main function to fetch all homepage data
 * Executes all queries in parallel for optimal performance
 */
export async function getHomepageData(params: HomepageQueryParams): Promise<HomepageResponse> {
  const startTime = Date.now();
  logger.info('[Homepage Service] Starting homepage data fetch...');

  // Determine which sections to fetch (default: all)
  const requestedSections = params.sections || [
    'featuredProducts',
    'newArrivals',
    'featuredStores',
    'trendingStores',
    'upcomingEvents',
    'megaOffers',
    'studentOffers',
    'categories',
    'trendingVideos',
    'latestArticles',
    'brandPartnerships'
  ];

  // Prepare promises for parallel execution
  const promises: Record<string, Promise<any>> = {};
  const errors: Record<string, string> = {};

  // Get region for filtering (if specified)
  const region = params.region;
  logger.info(` [Homepage Service] Region filter: ${region || 'none'}`);

  // Add each requested section to promises
  if (requestedSections.includes('featuredProducts')) {
    promises.featuredProducts = fetchFeaturedProducts(params.limit || DEFAULT_LIMITS.featuredProducts, region)
      .catch(err => {
        errors.featuredProducts = err.message;
        return [];
      });
  }

  if (requestedSections.includes('newArrivals')) {
    promises.newArrivals = fetchNewArrivals(params.limit || DEFAULT_LIMITS.newArrivals, region)
      .catch(err => {
        errors.newArrivals = err.message;
        return [];
      });
  }

  if (requestedSections.includes('featuredStores')) {
    promises.featuredStores = fetchFeaturedStores(params.limit || DEFAULT_LIMITS.featuredStores, region)
      .catch(err => {
        errors.featuredStores = err.message;
        return [];
      });
  }

  if (requestedSections.includes('trendingStores')) {
    promises.trendingStores = fetchTrendingStores(params.limit || DEFAULT_LIMITS.trendingStores, region)
      .catch(err => {
        errors.trendingStores = err.message;
        return [];
      });
  }

  if (requestedSections.includes('upcomingEvents')) {
    promises.upcomingEvents = fetchUpcomingEvents(params.limit || DEFAULT_LIMITS.upcomingEvents)
      .catch(err => {
        errors.upcomingEvents = err.message;
        return [];
      });
  }

  if (requestedSections.includes('megaOffers')) {
    promises.megaOffers = fetchMegaOffers(params.limit || DEFAULT_LIMITS.megaOffers)
      .catch(err => {
        errors.megaOffers = err.message;
        return [];
      });
  }

  if (requestedSections.includes('studentOffers')) {
    promises.studentOffers = fetchStudentOffers(params.limit || DEFAULT_LIMITS.studentOffers)
      .catch(err => {
        errors.studentOffers = err.message;
        return [];
      });
  }

  if (requestedSections.includes('categories')) {
    promises.categories = fetchCategories(params.limit || DEFAULT_LIMITS.categories)
      .catch(err => {
        errors.categories = err.message;
        return [];
      });
  }

  if (requestedSections.includes('trendingVideos')) {
    promises.trendingVideos = fetchTrendingVideos(params.limit || DEFAULT_LIMITS.trendingVideos)
      .catch(err => {
        errors.trendingVideos = err.message;
        return [];
      });
  }

  if (requestedSections.includes('latestArticles')) {
    promises.latestArticles = fetchLatestArticles(params.limit || DEFAULT_LIMITS.latestArticles)
      .catch(err => {
        errors.latestArticles = err.message;
        return [];
      });
  }

  if (requestedSections.includes('brandPartnerships')) {
    promises.brandPartnerships = fetchBrandPartnerships(params.limit || DEFAULT_LIMITS.brandPartnerships)
      .catch(err => {
        errors.brandPartnerships = err.message;
        return [];
      });
  }

  // Execute all queries in parallel
  logger.info(` [Homepage Service] Executing ${Object.keys(promises).length} queries in parallel...`);
  const results = await Promise.all(Object.values(promises));
  const data = Object.keys(promises).reduce((acc, key, index) => {
    acc[key] = results[index];
    return acc;
  }, {} as Record<string, any>);

  const duration = Date.now() - startTime;
  const successfulSections = Object.keys(data).filter(key => !errors[key]);
  const failedSections = Object.keys(errors);

  logger.info(` [Homepage Service] Homepage data fetched in ${duration}ms`);
  logger.info(` Successful sections: ${successfulSections.length}`);
  logger.info(` Failed sections: ${failedSections.length}`);

  return {
    success: true,
    data,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    metadata: {
      timestamp: new Date(),
      requestedSections,
      successfulSections,
      failedSections
    }
  };
}
