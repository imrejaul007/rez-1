import { logger } from '../config/logger';
/**
 * Mall Service
 *
 * Business logic for ReZ Mall feature including caching, aggregation, and analytics.
 */

import { Types } from 'mongoose';
import { MallBrand, IMallBrand } from '../models/MallBrand';
import { MallCategory, IMallCategory } from '../models/MallCategory';
import { MallCollection, IMallCollection } from '../models/MallCollection';
import { MallOffer, IMallOffer } from '../models/MallOffer';
import { MallBanner, IMallBanner } from '../models/MallBanner';
import { Store, IStore } from '../models/Store';
import { Category } from '../models/Category';
import redisService from './redisService';
import type { Lean } from '../types/lean';

/**
 * Escape special regex characters to prevent ReDoS attacks
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Cache TTL constants (in seconds)
const CACHE_TTL = {
  HOMEPAGE: 1800,     // 30 minutes (admin changes invalidate cache immediately)
  BRANDS: 3600,       // 1 hour
  CATEGORIES: 7200,   // 2 hours (rarely change)
  COLLECTIONS: 1800,  // 30 minutes
  OFFERS: 600,        // 10 minutes (time-sensitive but not per-second)
  BANNERS: 1800,      // 30 minutes (admin changes invalidate cache immediately)
};

// Cache key prefixes
const CACHE_KEYS = {
  HOMEPAGE: 'mall:homepage',
  FEATURED_BRANDS: 'mall:brands:featured',
  NEW_ARRIVALS: 'mall:brands:new',
  TOP_RATED: 'mall:brands:top-rated',
  LUXURY_BRANDS: 'mall:brands:luxury',
  CATEGORIES: 'mall:categories',
  COLLECTIONS: 'mall:collections',
  OFFERS: 'mall:offers',
  BANNERS: 'mall:banners',
  BRAND: 'mall:brand',
  // Store-based mall keys
  MALL_STORES: 'mall:stores',
  FEATURED_STORES: 'mall:stores:featured',
  NEW_STORES: 'mall:stores:new',
  TOP_RATED_STORES: 'mall:stores:top-rated',
  PREMIUM_STORES: 'mall:stores:premium',
  ALLIANCE_STORES: 'mall:stores:alliance',
  TRENDING_STORES: 'mall:stores:trending',
  REWARD_BOOSTERS: 'mall:stores:reward-boosters',
  DEALS_TODAY: 'mall:offers:today',
  ADMIN_STATS: 'mall:admin:stats',
};

// Types
export interface MallBrandFilters {
  category?: string;
  tier?: string;
  collection?: string;
  minCashback?: number;
  badges?: string[];
  search?: string;
  sort?: Record<string, 1 | -1>;
}

export interface MallHomepageData {
  banners: IMallBanner[];
  featuredBrands: IMallBrand[];
  collections: IMallCollection[];
  categories: IMallCategory[];
  exclusiveOffers: IMallOffer[];
  newArrivals: IMallBrand[];
  topRatedBrands: IMallBrand[];
  luxuryBrands: IMallBrand[];
}

// Store-based mall types for in-app delivery marketplace
export interface MallStoreFilters {
  category?: string;
  premium?: boolean;
  minCoinReward?: number;
  search?: string;
}

export interface MallStoreHomepageData {
  featuredStores: IStore[];
  newStores: IStore[];
  topRatedStores: IStore[];
  premiumStores: IStore[];
  categories: any[]; // Category documents
}

class MallService {
  private static instance: MallService;

  private constructor() {}

  public static getInstance(): MallService {
    if (!MallService.instance) {
      MallService.instance = new MallService();
    }
    return MallService.instance;
  }

  /**
   * Get homepage data (aggregated)
   */
  async getHomepageData(): Promise<MallHomepageData> {
    // Try to get from cache first
    const cacheKey = CACHE_KEYS.HOMEPAGE;
    const cached = await redisService.get<MallHomepageData>(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch all data in parallel
    const [
      banners,
      featuredBrands,
      collections,
      categories,
      exclusiveOffers,
      newArrivals,
      topRatedBrands,
      luxuryBrands
    ] = await Promise.all([
      this.getHeroBanners(5),
      this.getFeaturedBrands(10),
      this.getCollections(5),
      this.getCategories(),
      this.getExclusiveOffers(6),
      this.getNewArrivals(8),
      this.getTopRatedBrands(5),
      this.getLuxuryBrands(6)
    ]);

    const homepageData: MallHomepageData = {
      banners,
      featuredBrands,
      collections,
      categories,
      exclusiveOffers,
      newArrivals,
      topRatedBrands,
      luxuryBrands
    };

    // Cache the result
    await redisService.set(cacheKey, homepageData, CACHE_TTL.HOMEPAGE);

    return homepageData;
  }

  /**
   * Get featured brands
   */
  async getFeaturedBrands(limit: number = 10): Promise<IMallBrand[]> {
    const cacheKey = `${CACHE_KEYS.FEATURED_BRANDS}:${limit}`;
    const cached = await redisService.get<IMallBrand[]>(cacheKey);
    if (cached) return cached;

    const brands = await MallBrand.find({
      isFeatured: true,
      isActive: true
    })
      .populate('mallCategory', 'name slug color icon')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    await redisService.set(cacheKey, brands, CACHE_TTL.BRANDS);
    return brands as unknown as IMallBrand[];
  }

  /**
   * Get new arrivals
   */
  async getNewArrivals(limit: number = 10): Promise<IMallBrand[]> {
    const cacheKey = `${CACHE_KEYS.NEW_ARRIVALS}:${limit}`;
    const cached = await redisService.get<IMallBrand[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const brands = await MallBrand.find({
      isActive: true,
      $or: [
        { isNewArrival: true },
        { newUntil: { $gte: now } }
      ]
    })
      .populate('mallCategory', 'name slug color icon')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    await redisService.set(cacheKey, brands, CACHE_TTL.BRANDS);
    return brands as unknown as IMallBrand[];
  }

  /**
   * Get top rated brands
   */
  async getTopRatedBrands(limit: number = 10): Promise<IMallBrand[]> {
    const cacheKey = `${CACHE_KEYS.TOP_RATED}:${limit}`;
    const cached = await redisService.get<IMallBrand[]>(cacheKey);
    if (cached) return cached;

    const brands = await MallBrand.find({
      isActive: true,
      'ratings.count': { $gte: 5 }
    })
      .populate('mallCategory', 'name slug color icon')
      .sort({ 'ratings.average': -1, 'ratings.successRate': -1 })
      .limit(limit)
      .lean();

    await redisService.set(cacheKey, brands, CACHE_TTL.BRANDS);
    return brands as unknown as IMallBrand[];
  }

  /**
   * Get luxury brands
   */
  async getLuxuryBrands(limit: number = 10): Promise<IMallBrand[]> {
    const cacheKey = `${CACHE_KEYS.LUXURY_BRANDS}:${limit}`;
    const cached = await redisService.get<IMallBrand[]>(cacheKey);
    if (cached) return cached;

    const brands = await MallBrand.find({
      isLuxury: true,
      isActive: true
    })
      .populate('mallCategory', 'name slug color icon')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    await redisService.set(cacheKey, brands, CACHE_TTL.BRANDS);
    return brands as unknown as IMallBrand[];
  }

  /**
   * Get all brands with filters
   */
  async getBrands(
    filters: MallBrandFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ brands: Lean<IMallBrand>[]; total: number; pages: number }> {
    // Build cache key from filter params (skip caching for text search queries)
    if (!filters.search) {
      const sortKey = filters.sort ? JSON.stringify(filters.sort) : 'default';
      const cacheKey = `mall:brands:q:${filters.category || 'all'}:${filters.tier || 'all'}:${filters.minCashback || 0}:${sortKey}:p${page}:l${limit}`;
      const cached = await redisService.get<{ brands: Lean<IMallBrand>[]; total: number; pages: number }>(cacheKey);
      if (cached) return cached;

      const result = await this._fetchBrands(filters, page, limit);
      await redisService.set(cacheKey, result, CACHE_TTL.BRANDS);
      return result;
    }

    return this._fetchBrands(filters, page, limit);
  }

  /**
   * Internal brand fetch (used by getBrands with/without cache)
   */
  private async _fetchBrands(
    filters: MallBrandFilters,
    page: number,
    limit: number
  ): Promise<{ brands: Lean<IMallBrand>[]; total: number; pages: number }> {
    const query: any = { isActive: true };

    if (filters.category) {
      query.mallCategory = new Types.ObjectId(filters.category);
    }

    if (filters.tier) {
      query.tier = filters.tier;
    }

    if (filters.collection) {
      query.collections = new Types.ObjectId(filters.collection);
    }

    if (filters.minCashback) {
      query['cashback.percentage'] = { $gte: filters.minCashback };
    }

    if (filters.badges && filters.badges.length > 0) {
      query.badges = { $in: filters.badges };
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: escapeRegex(filters.search), $options: 'i' } },
        { tags: { $in: [new RegExp(escapeRegex(filters.search), 'i')] } }
      ];
    }

    const skip = (page - 1) * limit;

    const sortOptions = filters.sort || { 'ratings.average': -1 };

    const [brands, total] = await Promise.all([
      MallBrand.find(query)
        .select('name slug logo description cashback rezCoinReward externalUrl isActive isFeatured isLuxury isNewArrival tier ratings analytics badges tags mallCategory collections createdAt')
        .populate('mallCategory', 'name slug color icon')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      MallBrand.countDocuments(query)
    ]);

    return {
      brands,
      total,
      pages: Math.ceil(total / limit)
    };
  }

  /**
   * Get brand by ID
   */
  async getBrandById(brandId: string): Promise<IMallBrand | null> {
    const cacheKey = `${CACHE_KEYS.BRAND}:${brandId}`;
    const cached = await redisService.get<IMallBrand>(cacheKey);
    if (cached) return cached;

    const brand = await MallBrand.findById(brandId)
      .populate('mallCategory', 'name slug color icon')
      .populate('collections', 'name slug image')
      .lean();

    if (brand) {
      await redisService.set(cacheKey, brand, CACHE_TTL.BRANDS);
    }

    return brand as unknown as IMallBrand | null;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<IMallCategory[]> {
    const cacheKey = CACHE_KEYS.CATEGORIES;
    const cached = await redisService.get<IMallCategory[]>(cacheKey);
    if (cached) return cached;

    const categories = await MallCategory.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean();

    await redisService.set(cacheKey, categories, CACHE_TTL.CATEGORIES);
    return categories as unknown as IMallCategory[];
  }

  /**
   * Get brands by category
   */
  async getBrandsByCategory(
    categorySlug: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ brands: Lean<IMallBrand>[]; total: number; category: Lean<IMallCategory> | null }> {
    const category = await MallCategory.findOne({ slug: categorySlug, isActive: true }).lean();

    if (!category) {
      return { brands: [], total: 0, category: null };
    }

    const skip = (page - 1) * limit;
    const query = { mallCategory: category._id, isActive: true };

    const [brands, total] = await Promise.all([
      MallBrand.find(query)
        .populate('mallCategory', 'name slug color icon')
        .sort({ 'ratings.average': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MallBrand.countDocuments(query)
    ]);

    return { brands, total, category };
  }

  /**
   * Get all collections
   */
  async getCollections(limit: number = 10): Promise<IMallCollection[]> {
    const cacheKey = `${CACHE_KEYS.COLLECTIONS}:${limit}`;
    const cached = await redisService.get<IMallCollection[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const collections = await MallCollection.find({
      isActive: true,
      $or: [
        { validFrom: { $exists: false } },
        { validFrom: { $lte: now } }
      ]
    })
      .sort({ sortOrder: 1 })
      .limit(limit)
      .lean();

    // Filter out expired collections
    const validCollections = collections.filter(c =>
      !c.validUntil || new Date(c.validUntil) >= now
    );

    await redisService.set(cacheKey, validCollections, CACHE_TTL.COLLECTIONS);
    return validCollections as unknown as IMallCollection[];
  }

  /**
   * Get brands by collection
   */
  async getBrandsByCollection(
    collectionSlug: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ brands: Lean<IMallBrand>[]; total: number; collection: Lean<IMallCollection> | null }> {
    const collection = await MallCollection.findOne({ slug: collectionSlug, isActive: true }).lean();

    if (!collection) {
      return { brands: [], total: 0, collection: null };
    }

    const skip = (page - 1) * limit;
    const query = { collections: collection._id, isActive: true };

    const [brands, total] = await Promise.all([
      MallBrand.find(query)
        .populate('mallCategory', 'name slug color icon')
        .sort({ 'ratings.average': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MallBrand.countDocuments(query)
    ]);

    return { brands, total, collection };
  }

  /**
   * Get exclusive offers
   */
  async getExclusiveOffers(limit: number = 10): Promise<IMallOffer[]> {
    const cacheKey = `${CACHE_KEYS.OFFERS}:exclusive:${limit}`;
    const cached = await redisService.get<IMallOffer[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    let offers = await MallOffer.find({
      isActive: true,
      isMallExclusive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    })
      .populate('brand', 'name slug logo tier')
      .populate('store', 'name logo tags')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    // Fallback: if no exclusive offers, return any active offers
    if (offers.length === 0) {
      offers = await MallOffer.find({
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now }
      })
        .populate('brand', 'name slug logo tier')
        .populate('store', 'name logo tags')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit)
        .lean();
    }

    await redisService.set(cacheKey, offers, CACHE_TTL.OFFERS);
    return offers as unknown as IMallOffer[];
  }

  /**
   * Get all active offers
   */
  async getActiveOffers(page: number = 1, limit: number = 20): Promise<{ offers: Lean<IMallOffer>[]; total: number }> {
    const now = new Date();
    const query = {
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    };

    const skip = (page - 1) * limit;

    const [offers, total] = await Promise.all([
      MallOffer.find(query)
        .populate('brand', 'name slug logo tier')
        .populate('store', 'name logo tags')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MallOffer.countDocuments(query)
    ]);

    return { offers, total };
  }

  /**
   * Get hero banners
   */
  async getHeroBanners(limit: number = 5): Promise<IMallBanner[]> {
    const cacheKey = `${CACHE_KEYS.BANNERS}:hero:${limit}`;
    const cached = await redisService.get<IMallBanner[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    let banners = await MallBanner.find({
      isActive: true,
      position: 'hero',
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    })
      .populate('ctaBrand', 'name slug logo')
      .populate('ctaCategory', 'name slug')
      .populate('ctaCollection', 'name slug')
      .sort({ priority: -1 })
      .limit(limit)
      .lean();

    // Fallback: if no banners with valid date range, return any active hero banners
    if (banners.length === 0) {
      banners = await MallBanner.find({
        isActive: true,
        position: 'hero',
      })
        .populate('ctaBrand', 'name slug logo')
        .populate('ctaCategory', 'name slug')
        .populate('ctaCollection', 'name slug')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit)
        .lean();
    }

    // Final fallback: any active banners regardless of position
    if (banners.length === 0) {
      banners = await MallBanner.find({
        isActive: true,
      })
        .populate('ctaBrand', 'name slug logo')
        .populate('ctaCategory', 'name slug')
        .populate('ctaCollection', 'name slug')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit)
        .lean();
    }

    await redisService.set(cacheKey, banners, CACHE_TTL.BANNERS);
    return banners as unknown as IMallBanner[];
  }

  /**
   * Get all banners
   */
  async getAllBanners(): Promise<IMallBanner[]> {
    const cacheKey = `${CACHE_KEYS.BANNERS}:all`;
    const cached = await redisService.get<IMallBanner[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const banners = await MallBanner.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now }
    })
      .populate('ctaBrand', 'name slug logo')
      .populate('ctaCategory', 'name slug')
      .populate('ctaCollection', 'name slug')
      .sort({ position: 1, priority: -1 })
      .limit(50)
      .lean();

    await redisService.set(cacheKey, banners, CACHE_TTL.BANNERS);
    return banners as unknown as IMallBanner[];
  }

  /**
   * Track brand click
   */
  async trackBrandClick(brandId: string, userId?: string): Promise<void> {
    try {
      await MallBrand.findByIdAndUpdate(brandId, {
        $inc: { 'analytics.clicks': 1 }
      });

      // Invalidate brand cache
      await redisService.del(`${CACHE_KEYS.BRAND}:${brandId}`);
    } catch (error) {
      logger.error('Error tracking brand click:', error);
    }
  }

  /**
   * Track brand view
   */
  async trackBrandView(brandId: string): Promise<void> {
    try {
      await MallBrand.findByIdAndUpdate(brandId, {
        $inc: { 'analytics.views': 1 }
      });
    } catch (error) {
      logger.error('Error tracking brand view:', error);
    }
  }

  /**
   * Track brand purchase
   */
  async trackBrandPurchase(brandId: string, cashbackAmount: number = 0): Promise<void> {
    try {
      await MallBrand.findByIdAndUpdate(brandId, {
        $inc: {
          'analytics.purchases': 1,
          'analytics.totalCashbackGiven': cashbackAmount
        }
      });

      // Invalidate brand cache
      await redisService.del(`${CACHE_KEYS.BRAND}:${brandId}`);
    } catch (error) {
      logger.error('Error tracking brand purchase:', error);
    }
  }

  /**
   * Search brands
   */
  async searchBrands(query: string, limit: number = 20): Promise<IMallBrand[]> {
    if (!query || query.length < 2) return [];

    const brands = await MallBrand.find({
      isActive: true,
      $or: [
        { name: { $regex: escapeRegex(query), $options: 'i' } },
        { tags: { $in: [new RegExp(escapeRegex(query), 'i')] } },
        { description: { $regex: escapeRegex(query), $options: 'i' } }
      ]
    })
      .populate('mallCategory', 'name slug color icon')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    return brands as unknown as IMallBrand[];
  }

  /**
   * Invalidate all mall caches
   */
  async invalidateAllCaches(): Promise<void> {
    const keys = [
      CACHE_KEYS.HOMEPAGE,
      `${CACHE_KEYS.FEATURED_BRANDS}:*`,
      `${CACHE_KEYS.NEW_ARRIVALS}:*`,
      `${CACHE_KEYS.TOP_RATED}:*`,
      `${CACHE_KEYS.LUXURY_BRANDS}:*`,
      CACHE_KEYS.CATEGORIES,
      `${CACHE_KEYS.COLLECTIONS}:*`,
      `${CACHE_KEYS.OFFERS}:*`,
      `${CACHE_KEYS.BANNERS}:*`,
      // Store-based cache keys
      `${CACHE_KEYS.MALL_STORES}:*`,
      `${CACHE_KEYS.FEATURED_STORES}:*`,
      `${CACHE_KEYS.NEW_STORES}:*`,
      `${CACHE_KEYS.TOP_RATED_STORES}:*`,
      `${CACHE_KEYS.PREMIUM_STORES}:*`,
      `${CACHE_KEYS.ALLIANCE_STORES}:*`,
      `${CACHE_KEYS.TRENDING_STORES}:*`,
      `${CACHE_KEYS.REWARD_BOOSTERS}:*`,
      `${CACHE_KEYS.DEALS_TODAY}:*`,
      CACHE_KEYS.ADMIN_STATS,
    ];

    for (const key of keys) {
      if (key.includes('*')) {
        await redisService.delPattern(key);
      } else {
        await redisService.del(key);
      }
    }
  }

  // ==================== STORE-BASED MALL METHODS ====================
  // These methods fetch from Store model where deliveryCategories.mall === true
  // Used for the in-app delivery marketplace (users earn ReZ Coins)

  /**
   * Get mall stores homepage data (using Store model)
   */
  async getMallStoresHomepage(): Promise<MallStoreHomepageData> {
    const cacheKey = `${CACHE_KEYS.MALL_STORES}:homepage`;
    const cached = await redisService.get<MallStoreHomepageData>(cacheKey);
    if (cached) return cached;

    const [featuredStores, newStores, topRatedStores, premiumStores, categories] = await Promise.all([
      this.getFeaturedMallStores(10),
      this.getNewMallStores(8),
      this.getTopRatedMallStores(6),
      this.getPremiumMallStores(6),
      this.getMallStoreCategories(),
    ]);

    const data: MallStoreHomepageData = {
      featuredStores,
      newStores,
      topRatedStores,
      premiumStores,
      categories,
    };

    await redisService.set(cacheKey, data, CACHE_TTL.HOMEPAGE);
    return data;
  }

  /**
   * Get all mall stores with filters
   */
  async getMallStores(
    filters: MallStoreFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{ stores: Lean<IStore>[]; total: number; pages: number }> {
    const query: any = {
      isActive: true,
      adminApproved: true,
      'deliveryCategories.mall': true,
    };

    if (filters.category) {
      query.category = new Types.ObjectId(filters.category);
    }

    if (filters.premium) {
      query['deliveryCategories.premium'] = true;
    }

    if (filters.minCoinReward) {
      query['rewardRules.baseCashbackPercent'] = { $gte: filters.minCoinReward };
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: escapeRegex(filters.search), $options: 'i' } },
        { description: { $regex: escapeRegex(filters.search), $options: 'i' } },
        { tags: { $in: [new RegExp(escapeRegex(filters.search), 'i')] } },
      ];
    }

    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      Store.find(query)
        .populate('category', 'name slug')
        .sort({ 'ratings.average': -1, isFeatured: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(query),
    ]);

    return {
      stores,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get featured mall stores
   */
  async getFeaturedMallStores(limit: number = 10): Promise<IStore[]> {
    const cacheKey = `${CACHE_KEYS.FEATURED_STORES}:${limit}`;
    const cached = await redisService.get<IStore[]>(cacheKey);
    if (cached) return cached;

    let stores = await Store.find({
      isActive: true,
      adminApproved: true,
      isFeatured: true,
      'deliveryCategories.mall': true,
    })
      .populate('category', 'name slug')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    // Fallback: if no featured stores, return highest-rated mall stores
    if (stores.length === 0) {
      stores = await Store.find({
        isActive: true,
        adminApproved: true,
        'deliveryCategories.mall': true,
      })
        .populate('category', 'name slug')
        .sort({ 'ratings.average': -1, createdAt: -1 })
        .limit(limit)
        .lean();
    }

    await redisService.set(cacheKey, stores, CACHE_TTL.BRANDS);
    return stores as unknown as IStore[];
  }

  /**
   * Get new mall stores (recently registered)
   */
  async getNewMallStores(limit: number = 10): Promise<IStore[]> {
    const cacheKey = `${CACHE_KEYS.NEW_STORES}:${limit}`;
    const cached = await redisService.get<IStore[]>(cacheKey);
    if (cached) return cached;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let stores = await Store.find({
      isActive: true,
      adminApproved: true,
      'deliveryCategories.mall': true,
      createdAt: { $gte: thirtyDaysAgo },
    })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Fallback: if no stores within 30 days, return most recently created mall stores
    if (stores.length === 0) {
      stores = await Store.find({
        isActive: true,
        adminApproved: true,
        'deliveryCategories.mall': true,
      })
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    await redisService.set(cacheKey, stores, CACHE_TTL.BRANDS);
    return stores as unknown as IStore[];
  }

  /**
   * Get top rated mall stores
   */
  async getTopRatedMallStores(limit: number = 10): Promise<IStore[]> {
    const cacheKey = `${CACHE_KEYS.TOP_RATED_STORES}:${limit}`;
    const cached = await redisService.get<IStore[]>(cacheKey);
    if (cached) return cached;

    let stores = await Store.find({
      isActive: true,
      adminApproved: true,
      'deliveryCategories.mall': true,
      'ratings.count': { $gte: 5 },
    })
      .populate('category', 'name slug')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    // Fallback: lower threshold to 1 rating
    if (stores.length === 0) {
      stores = await Store.find({
        isActive: true,
        adminApproved: true,
        'deliveryCategories.mall': true,
        'ratings.count': { $gte: 1 },
      })
        .populate('category', 'name slug')
        .sort({ 'ratings.average': -1 })
        .limit(limit)
        .lean();
    }

    // Final fallback: any mall stores sorted by rating
    if (stores.length === 0) {
      stores = await Store.find({
        isActive: true,
        adminApproved: true,
        'deliveryCategories.mall': true,
      })
        .populate('category', 'name slug')
        .sort({ 'ratings.average': -1 })
        .limit(limit)
        .lean();
    }

    await redisService.set(cacheKey, stores, CACHE_TTL.BRANDS);
    return stores as unknown as IStore[];
  }

  /**
   * Get premium mall stores
   */
  async getPremiumMallStores(limit: number = 10): Promise<IStore[]> {
    const cacheKey = `${CACHE_KEYS.PREMIUM_STORES}:${limit}`;
    const cached = await redisService.get<IStore[]>(cacheKey);
    if (cached) return cached;

    let stores = await Store.find({
      isActive: true,
      adminApproved: true,
      'deliveryCategories.mall': true,
      'deliveryCategories.premium': true,
    })
      .populate('category', 'name slug')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    // Fallback: if no premium stores, return highest-rated mall stores
    if (stores.length === 0) {
      stores = await Store.find({
        isActive: true,
        adminApproved: true,
        'deliveryCategories.mall': true,
      })
        .populate('category', 'name slug')
        .sort({ 'ratings.average': -1 })
        .limit(limit)
        .lean();
    }

    await redisService.set(cacheKey, stores, CACHE_TTL.BRANDS);
    return stores as unknown as IStore[];
  }

  /**
   * Get mall store by ID
   */
  async getMallStoreById(storeId: string): Promise<IStore | null> {
    const cacheKey = `${CACHE_KEYS.MALL_STORES}:${storeId}`;
    const cached = await redisService.get<IStore>(cacheKey);
    if (cached) return cached;

    const store = await Store.findOne({
      _id: new Types.ObjectId(storeId),
      isActive: true,
      adminApproved: true,
      'deliveryCategories.mall': true,
    })
      .populate('category', 'name slug')
      .lean();

    if (store) {
      await redisService.set(cacheKey, store, CACHE_TTL.BRANDS);
    }

    return store as unknown as IStore | null;
  }

  /**
   * Get mall store categories (categories that have mall stores)
   */
  async getMallStoreCategories(): Promise<any[]> {
    const cacheKey = `${CACHE_KEYS.MALL_STORES}:categories`;
    const cached = await redisService.get<any[]>(cacheKey);
    if (cached) return cached;

    // Get distinct categories that have mall stores
    const categoriesWithStores = await Store.aggregate([
      {
        $match: {
          isActive: true,
          adminApproved: true,
          'deliveryCategories.mall': true,
        },
      },
      {
        $group: {
          _id: '$category',
          storeCount: { $sum: 1 },
          avgRating: { $avg: '$ratings.average' },
          maxCoinReward: { $max: '$rewardRules.baseCashbackPercent' },
        },
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo',
        },
      },
      {
        $unwind: '$categoryInfo',
      },
      {
        $project: {
          _id: 1,
          name: '$categoryInfo.name',
          slug: '$categoryInfo.slug',
          icon: '$categoryInfo.icon',
          storeCount: 1,
          avgRating: { $round: ['$avgRating', 1] },
          maxCoinReward: 1,
        },
      },
      {
        $sort: { storeCount: -1 },
      },
    ]);

    await redisService.set(cacheKey, categoriesWithStores, CACHE_TTL.CATEGORIES);
    return categoriesWithStores;
  }

  /**
   * Search mall stores
   */
  async searchMallStores(query: string, limit: number = 20): Promise<IStore[]> {
    if (!query || query.length < 2) return [];

    const stores = await Store.find({
      isActive: true,
      adminApproved: true,
      'deliveryCategories.mall': true,
      $or: [
        { name: { $regex: escapeRegex(query), $options: 'i' } },
        { description: { $regex: escapeRegex(query), $options: 'i' } },
        { tags: { $in: [new RegExp(escapeRegex(query), 'i')] } },
      ],
    })
      .populate('category', 'name slug')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    return stores as unknown as IStore[];
  }

  /**
   * Get mall stores by category ID
   */
  async getMallStoresByCategory(
    categoryId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ stores: Lean<IStore>[]; total: number }> {
    const query = {
      isActive: true,
      adminApproved: true,
      'deliveryCategories.mall': true,
      category: new Types.ObjectId(categoryId),
    };

    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      Store.find(query)
        .populate('category', 'name slug')
        .sort({ 'ratings.average': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(query),
    ]);

    return { stores, total };
  }

  /**
   * Get mall stores by category slug
   * Used by frontend category pages that use slug in URL
   */
  async getMallStoresByCategorySlug(
    categorySlug: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ stores: Lean<IStore>[]; total: number; category: any }> {
    // First find the category by slug
    const category = await Category.findOne({ slug: categorySlug, isActive: true }).lean();

    if (!category) {
      return { stores: [], total: 0, category: null };
    }

    const query = {
      isActive: true,
      adminApproved: true,
      'deliveryCategories.mall': true,
      category: category._id,
    };

    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      Store.find(query)
        .populate('category', 'name slug icon color description')
        .sort({ 'ratings.average': -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Store.countDocuments(query),
    ]);

    return { stores, total, category };
  }

  /**
   * Get alliance mall stores (stores with deliveryCategories.alliance=true)
   */
  async getAllianceMallStores(limit: number = 20): Promise<IStore[]> {
    const cacheKey = `${CACHE_KEYS.ALLIANCE_STORES}:${limit}`;
    const cached = await redisService.get<IStore[]>(cacheKey);
    if (cached) return cached;

    const stores = await Store.find({
      isActive: true,
      adminApproved: true,
      'deliveryCategories.alliance': true,
    })
      .populate('category', 'name slug')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean();

    await redisService.set(cacheKey, stores, CACHE_TTL.BRANDS);
    return stores as unknown as IStore[];
  }

  /**
   * Get trending mall stores (sorted by orders, ratings, and recent activity)
   */
  async getTrendingMallStores(limit: number = 10): Promise<IStore[]> {
    const cacheKey = `${CACHE_KEYS.TRENDING_STORES}:${limit}`;
    const cached = await redisService.get<IStore[]>(cacheKey);
    if (cached) return cached;

    let stores = await Store.find({
      isActive: true,
      adminApproved: true,
      'deliveryCategories.mall': true,
      'analytics.totalOrders': { $gt: 0 },
    })
      .populate('category', 'name slug')
      .sort({ 'analytics.totalOrders': -1, 'ratings.average': -1, 'ratings.count': -1 })
      .limit(limit)
      .lean();

    // Fallback: if no stores have orders, return highest-rated mall stores
    if (stores.length === 0) {
      stores = await Store.find({
        isActive: true,
        adminApproved: true,
        'deliveryCategories.mall': true,
      })
        .populate('category', 'name slug')
        .sort({ 'ratings.average': -1, 'ratings.count': -1, createdAt: -1 })
        .limit(limit)
        .lean();
    }

    await redisService.set(cacheKey, stores, CACHE_TTL.BRANDS);
    return stores as unknown as IStore[];
  }

  /**
   * Get reward booster mall stores (highest coin reward percentage)
   */
  async getRewardBoosterStores(limit: number = 10): Promise<IStore[]> {
    const cacheKey = `${CACHE_KEYS.REWARD_BOOSTERS}:${limit}`;
    const cached = await redisService.get<IStore[]>(cacheKey);
    if (cached) return cached;

    let stores = await Store.find({
      isActive: true,
      adminApproved: true,
      'deliveryCategories.mall': true,
      'offers.cashback': { $gt: 0 },
    })
      .populate('category', 'name slug')
      .sort({ 'offers.cashback': -1, 'ratings.average': -1 })
      .limit(limit)
      .lean();

    // Fallback: try stores with any reward rules configured
    if (stores.length === 0) {
      stores = await Store.find({
        isActive: true,
        adminApproved: true,
        'deliveryCategories.mall': true,
        $or: [
          { 'rewardRules.baseCashbackPercent': { $gt: 0 } },
          { 'offers.cashback': { $exists: true } },
        ],
      })
        .populate('category', 'name slug')
        .sort({ 'rewardRules.baseCashbackPercent': -1, 'ratings.average': -1 })
        .limit(limit)
        .lean();
    }

    // Final fallback: any mall stores
    if (stores.length === 0) {
      stores = await Store.find({
        isActive: true,
        adminApproved: true,
        'deliveryCategories.mall': true,
      })
        .populate('category', 'name slug')
        .sort({ 'ratings.average': -1 })
        .limit(limit)
        .lean();
    }

    await redisService.set(cacheKey, stores, CACHE_TTL.BRANDS);
    return stores as unknown as IStore[];
  }

  /**
   * Get deals of the day (flash sale offers valid today)
   */
  async getDealsOfDay(limit: number = 10): Promise<IMallOffer[]> {
    const cacheKey = `${CACHE_KEYS.DEALS_TODAY}:${limit}`;
    const cached = await redisService.get<IMallOffer[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    let offers = await MallOffer.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      $or: [
        { badge: 'flash-sale' },
        { badge: 'limited-time' },
      ],
    })
      .populate('brand', 'name logo slug')
      .populate('store', 'name logo tags')
      .sort({ priority: -1, validUntil: 1 })
      .limit(limit)
      .lean();

    // Fallback: if no flash-sale/limited-time offers, return any active offers
    if (offers.length === 0) {
      offers = await MallOffer.find({
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
      })
        .populate('brand', 'name logo slug')
        .populate('store', 'name logo tags')
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit)
        .lean();
    }

    await redisService.set(cacheKey, offers, CACHE_TTL.OFFERS);
    return offers as unknown as IMallOffer[];
  }

  /**
   * Get Mall Homepage Batch — ALL homepage data in one Redis-cached call
   * Combines: stores homepage + hero banners + trending + reward boosters + deals of day
   */
  async getMallHomepageBatch(): Promise<{
    featuredStores: IStore[];
    newStores: IStore[];
    topRatedStores: IStore[];
    premiumStores: IStore[];
    categories: any[];
    heroBanners: IMallBanner[];
    trendingStores: IStore[];
    rewardBoosters: IStore[];
    dealsOfDay: IMallOffer[];
    collections: IMallCollection[];
    exclusiveOffers: IMallOffer[];
  }> {
    const cacheKey = `${CACHE_KEYS.MALL_STORES}:homepage-batch`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) return cached;

    // Fetch everything in parallel with graceful degradation
    // Each section is wrapped so one failure doesn't kill the entire batch
    const safeCall = async <T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> => {
      try {
        return await fn();
      } catch (err) {
        logger.error(`[MallService] getMallHomepageBatch - ${label} failed:`, err);
        return fallback;
      }
    };

    const defaultHomepage = { featuredStores: [], newStores: [], topRatedStores: [], premiumStores: [], categories: [] };

    const [homepageData, heroBanners, trendingStores, rewardBoosters, dealsOfDay, collections, exclusiveOffers] = await Promise.all([
      safeCall(() => this.getMallStoresHomepage(), defaultHomepage, 'homepage'),
      safeCall(() => this.getHeroBanners(5), [], 'heroBanners'),
      safeCall(() => this.getTrendingMallStores(10), [], 'trendingStores'),
      safeCall(() => this.getRewardBoosterStores(10), [], 'rewardBoosters'),
      safeCall(() => this.getDealsOfDay(10), [], 'dealsOfDay'),
      safeCall(() => this.getCollections(5), [], 'collections'),
      safeCall(() => this.getExclusiveOffers(6), [], 'exclusiveOffers'),
    ]);

    const batch = {
      ...homepageData,
      heroBanners,
      trendingStores,
      rewardBoosters,
      dealsOfDay,
      collections,
      exclusiveOffers,
    };

    await redisService.set(cacheKey, batch, CACHE_TTL.HOMEPAGE); // 5 min
    return batch;
  }

  /**
   * Get admin dashboard stats
   */
  async getAdminStats(): Promise<any> {
    const cacheKey = CACHE_KEYS.ADMIN_STATS;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) return cached;

    const [
      totalBrands,
      activeBrands,
      totalCategories,
      activeCategories,
      activeOffers,
      totalOffers,
      activeBanners,
      totalBanners,
      totalCollections,
      activeCollections,
      totalMallStores,
    ] = await Promise.all([
      MallBrand.countDocuments(),
      MallBrand.countDocuments({ isActive: true }),
      MallCategory.countDocuments(),
      MallCategory.countDocuments({ isActive: true }),
      MallOffer.countDocuments({ isActive: true, validUntil: { $gte: new Date() } }),
      MallOffer.countDocuments(),
      MallBanner.countDocuments({ isActive: true, validUntil: { $gte: new Date() } }),
      MallBanner.countDocuments(),
      MallCollection.countDocuments(),
      MallCollection.countDocuments({ isActive: true }),
      Store.countDocuments({ isActive: true, 'deliveryCategories.mall': true }),
    ]);

    const stats = {
      totalBrands,
      activeBrands,
      totalCategories,
      activeCategories,
      activeOffers,
      totalOffers,
      activeBanners,
      totalBanners,
      totalCollections,
      activeCollections,
      totalMallStores,
    };

    await redisService.set(cacheKey, stats, CACHE_TTL.HOMEPAGE);
    return stats;
  }
}

export default MallService.getInstance();
