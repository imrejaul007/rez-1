import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { Article } from '../models/Article';
import { SearchHistory } from '../models/SearchHistory';
import { sendSuccess, sendError, sendBadRequest, sendCreated, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import redisService from '../services/redisService';
import { modeService, ModeId } from '../services/modeService';
import { regionService, isValidRegion, RegionId } from '../services/regionService';
import { logger } from '../config/logger';

/**
 * Escape special regex characters in user input to prevent regex injection / ReDoS
 */
const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Calculate relevance score for search results
 * Scoring: exact match > starts with > contains
 */
const calculateRelevance = (text: string, query: string): number => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  if (lowerText === lowerQuery) return 100; // Exact match
  if (lowerText.startsWith(lowerQuery)) return 75; // Starts with
  if (lowerText.includes(lowerQuery)) return 50; // Contains
  return 0;
};

/**
 * Sort items by relevance score
 */
const sortByRelevance = (items: any[], query: string, fields: string[]): any[] => {
  return items.map(item => {
    let maxScore = 0;
    fields.forEach(field => {
      const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], item);
      if (fieldValue && typeof fieldValue === 'string') {
        const score = calculateRelevance(fieldValue, query);
        maxScore = Math.max(maxScore, score);
      }
    });
    return { ...item, relevanceScore: maxScore };
  }).sort((a, b) => b.relevanceScore - a.relevanceScore);
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Normalize product name for grouping (remove special chars, lowercase)
 */
const normalizeProductName = (name: string, brand?: string): string => {
  const normalized = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const brandPart = brand ? brand.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  return brandPart ? `${brandPart} ${normalized}` : normalized;
};

/**
 * Search products by query with optional mode and region filtering
 * Uses weighted $text index (name:10, brand:5, tags:3, description:1)
 * for fast full-text search with $regex fallback (capped at 50 results) for partial matches
 */
const searchProducts = async (query: string, limit: number, mode?: ModeId, region?: RegionId): Promise<any> => {
  try {
    // Validate query length to prevent DoS via complex text search
    if (query.length > 200) {
      return { items: [], total: 0, hasMore: false };
    }

    // Build base filter (shared by both text and regex paths)
    const baseFilter: any = { isActive: true };

    // Build store filter combining mode and region in a single query
    let storeFilter: any = { isActive: true };
    let needsStoreFilter = false;

    if (mode && mode !== 'near-u') {
      const modeStoreFilter = modeService.getStoreFilter(mode);
      Object.assign(storeFilter, modeStoreFilter);
      needsStoreFilter = true;
    }

    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      Object.assign(storeFilter, regionFilter);
      needsStoreFilter = true;
    }

    // Single combined store query for mode + region
    if (needsStoreFilter) {
      const filteredStores = await Store.find(storeFilter).select('_id').lean();
      const storeIds = filteredStores.map(s => s._id);
      if (storeIds.length > 0) {
        baseFilter.store = { $in: storeIds };
      } else if (region) {
        return { items: [], total: 0, hasMore: false };
      }
    }

    // Try text search first (uses index, fast)
    const textQuery = { ...baseFilter, $text: { $search: query } };
    const [textProducts, textTotal] = await Promise.all([
      Product.find(textQuery, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .populate('category', 'name slug')
        .populate('store', 'name logo')
        .select('name slug images pricing ratings inventory brand tags')
        .limit(limit)
        .lean(),
      Product.countDocuments(textQuery)
    ]);

    if (textProducts.length > 0) {
      return {
        items: textProducts.map(p => ({
          ...p,
          type: 'product',
          id: p._id?.toString()
        })),
        total: textTotal,
        hasMore: textTotal > limit
      };
    }

    // $regex fallback — runs only when $text search returns 0 results
    // The weighted text index (name:10, brand:5, tags:3, description:1)
    // should minimize how often this path executes
    // Cache regex results to avoid repeated expensive scans
    const regexCacheKey = `search:regex:${escapeRegex(query)}:${mode || ''}:${region || ''}:${limit}`;
    const cachedRegex = await redisService.get<any>(regexCacheKey);
    if (cachedRegex) return cachedRegex;

    const regexQuery = {
      ...baseFilter,
      $or: [
        { name: { $regex: escapeRegex(query), $options: 'i' } },
        { brand: { $regex: escapeRegex(query), $options: 'i' } },
        { tags: { $regex: escapeRegex(query), $options: 'i' } },
      ]
    };

    const [regexProducts, regexTotal] = await Promise.all([
      Product.find(regexQuery)
        .populate('category', 'name slug')
        .populate('store', 'name logo')
        .select('name slug images pricing ratings inventory brand tags')
        .limit(50)
        .lean(),
      Product.countDocuments(regexQuery)
    ]);

    // Sort by relevance and limit
    const sortedProducts = sortByRelevance(
      regexProducts,
      query,
      ['name', 'brand', 'description']
    ).slice(0, limit);

    const regexResult = {
      items: sortedProducts.map(p => ({
        ...p,
        type: 'product',
        id: p._id?.toString()
      })),
      total: regexTotal,
      hasMore: regexTotal > limit
    };

    // Cache regex results for 5 minutes
    await redisService.set(regexCacheKey, regexResult, 300);

    return regexResult;
  } catch (error) {
    logger.error('Error searching products:', error);
    return { items: [], total: 0, hasMore: false };
  }
};

/**
 * Search products grouped by name with seller options
 * Returns products grouped by normalized name with all seller options
 */
const searchProductsGroupedInternal = async (
  query: string,
  limit: number,
  userLocation?: { latitude: number; longitude: number },
  region?: RegionId,
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    categories?: string[];
    cashbackMin?: number;
    inStock?: boolean;
  }
): Promise<any> => {
  try {
    // Build base store query with region filter
    const baseStoreQuery: any = { isActive: true };
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      Object.assign(baseStoreQuery, regionFilter);
    }

    // First, find stores that match the query (by name or tags) AND are in region.
    // This allows searching for "Biryani" and getting products from "Paradise Biryani" store.
    // $regex queries are capped at 10 results to bound scan cost.
    const matchingStores = await Store.find({
      ...baseStoreQuery,
      $or: [
        { name: { $regex: escapeRegex(query), $options: 'i' } },
        { tags: { $regex: escapeRegex(query), $options: 'i' } },
        { description: { $regex: escapeRegex(query), $options: 'i' } },
        { 'location.city': { $regex: escapeRegex(query), $options: 'i' } }
      ]
    }).select('_id name slug logo description tags location ratings isVerified category')
      .populate('category', 'name slug')
      .limit(10)
      .lean();

    const matchingStoreIds = matchingStores.map(s => s._id);

    // Get all stores in region for product filtering
    let regionStoreIds: any[] = [];
    if (region) {
      const regionStores = await Store.find(baseStoreQuery).select('_id').lean();
      regionStoreIds = regionStores.map(s => s._id);
    }

    // Build base filter for grouped search (shared by text and regex paths)
    const baseGroupedFilter: any = {
      isActive: true,
      'inventory.isAvailable': true,
    };

    // Apply filter params
    if (filters) {
      if (filters.minPrice !== undefined) {
        baseGroupedFilter['pricing.selling'] = { ...baseGroupedFilter['pricing.selling'], $gte: filters.minPrice };
      }
      if (filters.maxPrice !== undefined) {
        baseGroupedFilter['pricing.selling'] = { ...baseGroupedFilter['pricing.selling'], $lte: filters.maxPrice };
      }
      if (filters.rating !== undefined) {
        baseGroupedFilter['ratings.average'] = { $gte: filters.rating };
      }
      if (filters.categories && filters.categories.length > 0) {
        // Accept category ids or slugs
        const categoryIds = filters.categories.filter(c => mongoose.Types.ObjectId.isValid(c));
        const categorySlugs = filters.categories.filter(c => !mongoose.Types.ObjectId.isValid(c));
        if (categoryIds.length > 0 && categorySlugs.length === 0) {
          baseGroupedFilter.category = { $in: categoryIds.map(id => new mongoose.Types.ObjectId(id)) };
        } else if (categorySlugs.length > 0) {
          // Will resolve after category lookup below
        }
      }
      if (filters.inStock) {
        baseGroupedFilter['inventory.stock'] = { $gt: 0 };
      }
    }

    // Apply region filter to products
    if (region && regionStoreIds.length > 0) {
      baseGroupedFilter.store = { $in: regionStoreIds };
    } else if (region) {
      // No stores in region, return empty
      return {
        groupedProducts: [],
        matchingStores: [],
        summary: { sellerCount: 0, minPrice: 0, maxCashback: 0, priceRange: { min: 0, max: 0 } },
        total: 0,
        hasMore: false
      };
    }

    // Try $text search first (uses weighted index: name:10, brand:5, tags:3, description:1), with $regex fallback
    let textSearchQuery: any = { ...baseGroupedFilter, $text: { $search: query } };
    // For text search, add matching store products via separate $or isn't possible
    // (MongoDB doesn't allow $text with $or at top level), so we run it plain first.
    let products = await Product.find(textSearchQuery, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .populate('category', 'name slug')
      .populate({
        path: 'store',
        select: 'name logo location ratings isVerified operationalInfo rewardRules',
        populate: { path: 'category', select: 'name' }
      })
      .select('name slug images pricing ratings inventory brand tags model cashback deliveryInfo category store')
      .limit(limit * 5)
      .lean();

    // $regex fallback — runs only when $text search returns fewer than `limit` results
    // The weighted text index (name:10, brand:5, tags:3, description:1)
    // should minimize how often this path executes
    if (products.length < limit) {
      const regexSearchQuery: any = {
        ...baseGroupedFilter,
        $or: [
          { name: { $regex: escapeRegex(query), $options: 'i' } },
          { brand: { $regex: escapeRegex(query), $options: 'i' } },
          { tags: { $regex: escapeRegex(query), $options: 'i' } },
        ]
      };

      // Include matching store products in the regex fallback
      if (matchingStoreIds.length > 0) {
        regexSearchQuery.$or.push({ store: { $in: matchingStoreIds } });
      }

      const regexProducts = await Product.find(regexSearchQuery)
        .populate('category', 'name slug')
        .populate({
          path: 'store',
          select: 'name logo location ratings isVerified operationalInfo rewardRules',
          populate: { path: 'category', select: 'name' }
        })
        .select('name slug images pricing ratings inventory brand tags model cashback deliveryInfo category store')
        .limit(50)
        .lean();

      // Merge: add regex results that aren't already in text results
      const existingIds = new Set(products.map((p: any) => p._id?.toString()));
      for (const rp of regexProducts) {
        if (!existingIds.has((rp as any)._id?.toString())) {
          products.push(rp);
        }
      }
    } else if (matchingStoreIds.length > 0) {
      // Text search returned enough results but we should still include matching store products
      const storeProductsQuery: any = {
        ...baseGroupedFilter,
        store: { $in: matchingStoreIds }
      };
      const storeProducts = await Product.find(storeProductsQuery)
        .populate('category', 'name slug')
        .populate({
          path: 'store',
          select: 'name logo location ratings isVerified operationalInfo rewardRules',
          populate: { path: 'category', select: 'name' }
        })
        .select('name slug images pricing ratings inventory brand tags model cashback deliveryInfo category store')
        .limit(limit * 2)
        .lean();

      const existingIds = new Set(products.map((p: any) => p._id?.toString()));
      for (const sp of storeProducts) {
        if (!existingIds.has((sp as any)._id?.toString())) {
          products.push(sp);
        }
      }
    }

    // Group products by normalized name
    const productGroups = new Map<string, any[]>();

    products.forEach((product: any) => {
      const normalizedName = normalizeProductName(product.name, product.brand);
      if (!productGroups.has(normalizedName)) {
        productGroups.set(normalizedName, []);
      }
      productGroups.get(normalizedName)!.push(product);
    });

    // Transform grouped products into seller options
    const groupedProducts: any[] = [];
    let totalSellers = 0;
    let minPrice = Infinity;
    let maxCashback = 0;

    for (const [normalizedName, productList] of productGroups.entries()) {
      if (groupedProducts.length >= limit) break;

      const firstProduct = productList[0];
      const sellers: any[] = [];
      const seenStoreProducts = new Set<string>(); // Dedup by storeId+productId

      for (const product of productList) {
        const store = product.store;
        if (!store) continue;

        // Deduplicate: skip if same store already has a product in this group
        const dedupKey = `${store._id?.toString()}-${normalizeProductName(product.name, product.brand)}`;
        if (seenStoreProducts.has(dedupKey)) continue;
        seenStoreProducts.add(dedupKey);

        const currentPrice = product.pricing?.selling || product.pricing?.original || product.pricing?.mrp || 0;
        const originalPrice = product.pricing?.original || product.pricing?.mrp || currentPrice;
        const savings = originalPrice > currentPrice ? originalPrice - currentPrice : 0;

        // Skip if price is 0 or invalid
        if (!currentPrice || currentPrice <= 0) {
          logger.warn(`[SEARCH] Product ${product._id} has invalid price: ${currentPrice}`);
          continue;
        }

        // Calculate cashback - check product cashback first, then store reward rules, then default
        let cashbackPercentage = 0;

        // Check if product has active cashback
        if (product.cashback?.percentage &&
          product.cashback.percentage > 0 &&
          (product.cashback.isActive !== false) && // Active by default unless explicitly false
          (!product.cashback.validUntil || new Date(product.cashback.validUntil) > new Date())) {
          cashbackPercentage = product.cashback.percentage;
        }

        // Fallback to store reward rules if product doesn't have cashback
        if (cashbackPercentage === 0 && store.rewardRules?.baseCashbackPercent) {
          cashbackPercentage = store.rewardRules.baseCashbackPercent;
        }

        // Default to 5% if still no cashback (matching Product model's calculateCashback method)
        if (cashbackPercentage === 0) {
          cashbackPercentage = 5;
        }

        // Apply cashbackMin filter (post-processing since cashback is computed)
        if (filters?.cashbackMin && cashbackPercentage < filters.cashbackMin) {
          continue;
        }

        // Calculate cashback amount
        let cashbackAmount = Math.round((currentPrice * cashbackPercentage) / 100);

        // Apply max amount limit if specified in product cashback
        if (product.cashback?.maxAmount && cashbackAmount > product.cashback.maxAmount) {
          cashbackAmount = product.cashback.maxAmount;
        }

        // Calculate coins (5% of product price - rezcoins earned on every purchase)
        // Ensure minimum 1 coin if price > 0
        const coins = currentPrice > 0 ? Math.max(1, Math.round((currentPrice * 5) / 100)) : 0;

        // Debug logging for first product in first group
        if (groupedProducts.length === 0 && sellers.length === 0) {
          logger.debug(`[SEARCH] First product cashback calculation:`, {
            productId: product._id,
            productName: product.name?.substring(0, 30),
            currentPrice,
            originalPrice,
            cashbackPercentage,
            cashbackAmount,
            coins,
          });
        }

        // Determine availability
        const stock = product.inventory?.stock || 0;
        const lowStockThreshold = product.inventory?.lowStockThreshold || 5;
        let availability: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
        if (stock === 0) {
          availability = 'out_of_stock';
        } else if (stock <= lowStockThreshold) {
          availability = 'low_stock';
        }

        // Calculate distance if user location provided
        // Store coordinates are stored as [longitude, latitude] in store.location.coordinates
        let distance: number | undefined;
        if (userLocation && store.location?.coordinates) {
          const [storeLon, storeLat] = store.location.coordinates; // [longitude, latitude]
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            storeLat,
            storeLon
          );
        }

        // Get delivery info
        const deliveryInfo = product.deliveryInfo || store.operationalInfo;
        const deliveryTime = deliveryInfo?.estimatedDays ||
          deliveryInfo?.deliveryTime ||
          deliveryInfo?.standardDeliveryTime ||
          '2-3 days';

        let deliveryType: 'express' | 'standard' | 'pickup' = 'standard';
        if (deliveryInfo?.expressAvailable || deliveryTime.includes('min')) {
          deliveryType = 'express';
        } else if (deliveryTime.toLowerCase().includes('pickup')) {
          deliveryType = 'pickup';
        }

        // Build location string - format: "City • Distance" or "City - Distance"
        // Extract city name (prefer city over address for cleaner display)
        let cityName = store.location?.city || '';
        if (!cityName && store.location?.address) {
          // Extract city from address if city not available
          const addressParts = store.location.address.split(',');
          cityName = addressParts[addressParts.length - 1]?.trim() || store.location.address;
        }
        const location = cityName || 'Location not available';

        // Determine badges
        const badges: string[] = [];

        // Hot Deal: Show if there's any discount (savings > 0) or if price is competitive
        // Lowered threshold to 5% to show on more cards
        if (savings > 0 && savings > currentPrice * 0.05) {
          badges.push('Hot Deal');
        }

        // Limited Stock: Show when stock is low
        if (availability === 'low_stock') {
          badges.push('Limited Stock');
        }

        // Lock Available: Show on ALL cards - all products have cashback/rezcoins available
        // This badge indicates cashback/rezcoins are available on every purchase
        badges.push('Lock Available');

        const sellerOption = {
          storeId: store._id?.toString() || '',
          storeName: store.name || 'Unknown Store',
          storeLogo: store.logo || '',
          location,
          distance: distance ? Math.round(distance * 10) / 10 : undefined, // Round to 1 decimal
          rating: store.ratings?.average || 0,
          reviewCount: store.ratings?.count || 0,
          price: {
            current: currentPrice,
            original: originalPrice > currentPrice ? originalPrice : undefined,
            currency: product.pricing?.currency || 'INR'
          },
          savings,
          cashback: {
            percentage: cashbackPercentage,
            amount: cashbackAmount,
            coins
          },
          delivery: {
            time: deliveryTime,
            type: deliveryType,
            available: availability !== 'out_of_stock'
          },
          availability,
          isVerified: store.isVerified || false,
          badges,
          productId: product._id?.toString()
        };

        sellers.push(sellerOption);
        totalSellers++;

        if (currentPrice < minPrice) minPrice = currentPrice;
        if (cashbackAmount > maxCashback) maxCashback = cashbackAmount;
      }

      if (sellers.length > 0) {
        // Sort sellers by best value (price, cashback, rating, distance)
        sellers.sort((a, b) => {
          // Best value score = lower price + higher cashback + higher rating + closer distance
          const scoreA =
            (a.price.current * 0.4) -
            (a.cashback.amount * 0.3) -
            (a.rating * 100 * 0.2) +
            ((a.distance || 999) * 0.1);
          const scoreB =
            (b.price.current * 0.4) -
            (b.cashback.amount * 0.3) -
            (b.rating * 100 * 0.2) +
            ((b.distance || 999) * 0.1);
          return scoreA - scoreB;
        });

        groupedProducts.push({
          productId: firstProduct._id?.toString(),
          productName: firstProduct.name,
          productImage: firstProduct.images?.[0] || '',
          category: firstProduct.category?.name || '',
          sellers,
          sellerCount: sellers.length
        });
      }
    }

    // Calculate summary
    const prices = groupedProducts.flatMap(gp =>
      gp.sellers.map((s: any) => s.price.current)
    );
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0
    };

    // Build store results for display (sorted by relevance)
    const storeResults = sortByRelevance(
      matchingStores,
      query,
      ['name', 'description']
    ).slice(0, 5).map((store: any) => {
      let distance: number | undefined;
      if (userLocation && store.location?.coordinates) {
        const [storeLon, storeLat] = store.location.coordinates;
        distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          storeLat,
          storeLon
        );
      }

      return {
        storeId: store._id?.toString(),
        name: store.name,
        slug: store.slug,
        logo: store.logo || '',
        description: store.description || '',
        category: store.category?.name || '',
        location: store.location?.city || store.location?.address || '',
        distance: distance ? Math.round(distance * 10) / 10 : undefined,
        rating: store.ratings?.average || 0,
        reviewCount: store.ratings?.count || 0,
        isVerified: store.isVerified || false,
        tags: store.tags || []
      };
    });

    return {
      groupedProducts,
      matchingStores: storeResults,
      summary: {
        sellerCount: totalSellers,
        minPrice: minPrice === Infinity ? 0 : minPrice,
        maxCashback,
        priceRange
      },
      total: groupedProducts.length,
      hasMore: productGroups.size > limit
    };
  } catch (error) {
    logger.error('Error searching grouped products:', error);
    return {
      groupedProducts: [],
      matchingStores: [],
      summary: {
        sellerCount: 0,
        minPrice: 0,
        maxCashback: 0,
        priceRange: { min: 0, max: 0 }
      },
      total: 0,
      hasMore: false
    };
  }
};

/**
 * Search stores by query with optional mode and region filtering.
 * Uses $regex (no $text index on Store) — results capped at 50 to bound scan cost.
 */
const searchStores = async (query: string, limit: number, mode?: ModeId, region?: RegionId): Promise<any> => {
  try {
    const searchQuery: any = {
      isActive: true,
      $or: [
        { name: { $regex: escapeRegex(query), $options: 'i' } },
        { description: { $regex: escapeRegex(query), $options: 'i' } },
        { tags: { $regex: escapeRegex(query), $options: 'i' } },
        { 'location.address': { $regex: escapeRegex(query), $options: 'i' } },
        { 'location.city': { $regex: escapeRegex(query), $options: 'i' } }
      ]
    };

    // Apply mode-based store filter
    if (mode && mode !== 'near-u') {
      const modeStoreFilter = modeService.getStoreFilter(mode);
      Object.assign(searchQuery, modeStoreFilter);
    }

    // Apply region-based store filter
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      Object.assign(searchQuery, regionFilter);
    }

    // $regex queries are capped at 50 results to bound scan cost
    const regexLimit = Math.min(limit + 10, 50);
    const [stores, total] = await Promise.all([
      Store.find(searchQuery)
        .populate('category', 'name slug')
        .select('name slug logo coverImage description tags location ratings category')
        .limit(regexLimit)
        .lean(),
      Store.countDocuments(searchQuery)
    ]);

    // Sort by relevance and limit
    const sortedStores = sortByRelevance(
      stores,
      query,
      ['name', 'description']
    ).slice(0, limit);

    return {
      items: sortedStores.map(s => ({
        ...s,
        type: 'store',
        id: s._id?.toString()
      })),
      total,
      hasMore: total > limit
    };
  } catch (error) {
    logger.error('Error searching stores:', error);
    return { items: [], total: 0, hasMore: false };
  }
};

/**
 * Search articles by query.
 * Uses $regex (no $text index on Article) — results capped at 50 to bound scan cost.
 */
const searchArticles = async (query: string, limit: number): Promise<any> => {
  try {
    const searchQuery: any = {
      isPublished: true,
      isApproved: true,
      $or: [
        { title: { $regex: escapeRegex(query), $options: 'i' } },
        { excerpt: { $regex: escapeRegex(query), $options: 'i' } },
        { content: { $regex: escapeRegex(query), $options: 'i' } },
        { tags: { $in: [new RegExp(escapeRegex(query), 'i')] } }
      ]
    };

    // $regex queries are capped at 50 results to bound scan cost
    const regexLimit = Math.min(limit + 10, 50);
    const [articles, total] = await Promise.all([
      Article.find(searchQuery)
        .populate('author', 'profile.firstName profile.lastName profile.avatar')
        .select('title slug excerpt coverImage category tags analytics author authorType')
        .limit(regexLimit)
        .lean(),
      Article.countDocuments(searchQuery)
    ]);

    // Sort by relevance and limit
    const sortedArticles = sortByRelevance(
      articles,
      query,
      ['title', 'excerpt']
    ).slice(0, limit);

    return {
      items: sortedArticles.map((a: any) => ({
        ...a,
        type: 'article',
        id: a._id?.toString(),
        viewCount: a.analytics?.totalViews || 0,
        author: a.author ? {
          id: a.author._id?.toString(),
          name: `${a.author.profile?.firstName || ''} ${a.author.profile?.lastName || ''}`.trim() || 'Unknown',
          avatar: a.author.profile?.avatar || ''
        } : undefined
      })),
      total,
      hasMore: total > limit
    };
  } catch (error) {
    logger.error('Error searching articles:', error);
    return { items: [], total: 0, hasMore: false };
  }
};

/**
 * Global Search Controller
 * Searches across products, stores, and articles simultaneously
 *
 * Query Parameters:
 * - q (required): search query
 * - types (optional): comma-separated list (products,stores,articles) - default: all
 * - limit (optional): results per type (default: 10, max: 50)
 *
 * Features:
 * - Parallel search execution using Promise.all
 * - Redis caching (10 minutes TTL)
 * - Relevance scoring (exact match > starts with > contains)
 * - Results sorted by relevance within each type
 *
 * Performance:
 * - Uses Promise.all for parallel searches
 * - Limits fields returned (only essential data)
 * - Target execution time < 500ms
 */
export const globalSearch = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();

  const {
    q: query,
    types: typesParam,
    limit: limitParam = 10,
    mode // New: mode filter for 4-mode system
  } = req.query;

  // Parse and validate mode
  const activeMode: ModeId = modeService.getModeFromRequest(
    mode as string | undefined,
    (req as any).user?.preferences?.activeMode
  );

  // Get region from X-Rez-Region header
  const regionHeader = req.headers['x-rez-region'] as string;
  const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
    ? regionHeader as RegionId
    : undefined;

  // Validate query parameter
  if (!query || typeof query !== 'string') {
    return sendBadRequest(res, 'Search query (q) is required');
  }

  // Validate and parse limit
  const limit = Math.min(Number(limitParam) || 10, 50); // Max 50 per type

  // Parse search types
  const defaultTypes = ['products', 'stores', 'articles'];
  const requestedTypes = typesParam
    ? (typesParam as string).split(',').map(t => t.trim().toLowerCase())
    : defaultTypes;

  // Validate types
  const validTypes = requestedTypes.filter(t => defaultTypes.includes(t));
  if (validTypes.length === 0) {
    return sendBadRequest(res, 'Invalid types parameter. Valid types: products, stores, articles');
  }

  // Generate cache key (include mode AND region)
  const cacheKey = `search:global:${query}:${validTypes.sort().join(',')}:${limit}:${activeMode}:${region || 'all'}`;

  try {
    // Check cache first
    const cachedResult = await redisService.get(cacheKey);
    if (cachedResult) {
      const executionTime = Date.now() - startTime;
      logger.debug(`[GLOBAL SEARCH] Cache hit for query: "${query}" (${executionTime}ms)`);

      return sendSuccess(res, {
        ...cachedResult,
        cached: true,
        executionTime
      }, 'Global search completed successfully (cached)');
    }

    logger.debug(`[GLOBAL SEARCH] Searching for: "${query}" across types: ${validTypes.join(', ')}`);

    // Prepare search promises based on requested types
    const searchPromises: Promise<any>[] = [];
    const typeMap: string[] = [];

    if (validTypes.includes('products')) {
      searchPromises.push(searchProducts(query, limit, activeMode, region));
      typeMap.push('products');
    }

    if (validTypes.includes('stores')) {
      searchPromises.push(searchStores(query, limit, activeMode, region));
      typeMap.push('stores');
    }

    if (validTypes.includes('articles')) {
      searchPromises.push(searchArticles(query, limit));
      typeMap.push('articles');
    }

    // Execute all searches in parallel
    const searchResults = await Promise.all(searchPromises);

    // Map results to their types
    const results: any = {
      products: { items: [], total: 0, hasMore: false },
      stores: { items: [], total: 0, hasMore: false },
      articles: { items: [], total: 0, hasMore: false }
    };

    searchResults.forEach((result, index) => {
      const type = typeMap[index];
      results[type] = result;
    });

    // Calculate total results
    const totalResults = Object.values(results).reduce(
      (sum: number, r: any) => sum + r.total,
      0
    );

    const responseData = {
      query,
      results,
      totalResults,
      requestedTypes: validTypes,
      limit,
      mode: activeMode // Include mode in response
    };

    // Cache the results for 10 minutes (600 seconds)
    const CACHE_TTL = 600;
    await redisService.set(cacheKey, responseData, CACHE_TTL);

    const executionTime = Date.now() - startTime;
    logger.info(`[GLOBAL SEARCH] Completed in ${executionTime}ms. Total results: ${totalResults}`);

    return sendSuccess(res, {
      ...responseData,
      cached: false,
      executionTime
    }, 'Global search completed successfully');

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error(`[GLOBAL SEARCH] Error after ${executionTime}ms:`, error);
    return sendError(res, 'Failed to perform global search', 500);
  }
});

/**
 * Clear search cache
 * Useful for cache invalidation when data is updated
 */
export const clearSearchCache = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Note: This is a simplified version. In production, you might want to
    // use Redis SCAN to find and delete all keys matching "search:global:*"
    logger.info('[GLOBAL SEARCH] Cache clearing requested');

    return sendSuccess(res, {
      message: 'Search cache cleared successfully'
    }, 'Cache cleared');
  } catch (error) {
    logger.error('[GLOBAL SEARCH] Error clearing cache:', error);
    return sendError(res, 'Failed to clear search cache', 500);
  }
});

/**
 * Search products grouped by name with seller comparison
 * GET /api/search/products-grouped?q=query&limit=20&lat=...&lon=...
 * 
 * Returns products grouped by name with all seller options for comparison
 */
export const searchProductsGrouped = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();

  const {
    q: query,
    limit: limitParam = 20,
    lat,
    lon,
    minPrice: minPriceParam,
    maxPrice: maxPriceParam,
    rating: ratingParam,
    categories: categoriesParam,
    cashbackMin: cashbackMinParam,
    inStock: inStockParam,
  } = req.query;

  // Get region from X-Rez-Region header
  const regionHeader = req.headers['x-rez-region'] as string;
  const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
    ? regionHeader as RegionId
    : undefined;

  // Validate query parameter
  if (!query || typeof query !== 'string') {
    return sendBadRequest(res, 'Search query (q) is required');
  }

  // Validate and parse limit
  const limit = Math.min(Number(limitParam) || 20, 50); // Max 50 products

  // Parse user location if provided
  let userLocation: { latitude: number; longitude: number } | undefined;
  if (lat && lon) {
    const latitude = Number(lat);
    const longitude = Number(lon);
    if (!isNaN(latitude) && !isNaN(longitude)) {
      userLocation = { latitude, longitude };
    }
  }

  // Parse filter params
  const filters: {
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    categories?: string[];
    cashbackMin?: number;
    inStock?: boolean;
  } = {};
  if (minPriceParam) filters.minPrice = Number(minPriceParam);
  if (maxPriceParam) filters.maxPrice = Number(maxPriceParam);
  if (ratingParam) filters.rating = Number(ratingParam);
  if (categoriesParam && typeof categoriesParam === 'string') {
    filters.categories = categoriesParam.split(',').map(c => c.trim());
  }
  if (cashbackMinParam) filters.cashbackMin = Number(cashbackMinParam);
  if (inStockParam === 'true') filters.inStock = true;

  const hasFilters = Object.keys(filters).length > 0;

  // Generate cache key (include region and filters)
  const filterKey = hasFilters ? JSON.stringify(filters) : 'nofilter';
  const cacheKey = `search:grouped:${query}:${limit}:${userLocation ? `${userLocation.latitude},${userLocation.longitude}` : 'noloc'}:${region || 'all'}:${filterKey}`;

  try {
    // Check cache first
    const cachedResult = await redisService.get(cacheKey);
    if (cachedResult) {
      const executionTime = Date.now() - startTime;
      logger.debug(`[GROUPED SEARCH] Cache hit for query: "${query}" (${executionTime}ms)`);
      return sendSuccess(res, {
        ...cachedResult,
        cached: true,
        executionTime
      }, 'Grouped product search completed successfully (cached)');
    }

    logger.debug(`[GROUPED SEARCH] Searching for: "${query}" with limit: ${limit}, region: ${region || 'all'}`);

    // Perform grouped search with region and filter support
    const result = await searchProductsGroupedInternal(query, limit, userLocation, region, hasFilters ? filters : undefined);

    // Cache the results for 10 minutes (600 seconds)
    const CACHE_TTL = 600;
    await redisService.set(cacheKey, result, CACHE_TTL);

    const executionTime = Date.now() - startTime;
    logger.info(`[GROUPED SEARCH] Completed in ${executionTime}ms. Products: ${result.total}, Sellers: ${result.summary.sellerCount}`);

    return sendSuccess(res, {
      ...result,
      cached: false,
      executionTime
    }, 'Grouped product search completed successfully');

  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error(`[GROUPED SEARCH] Error after ${executionTime}ms:`, error);
    return sendError(res, 'Failed to perform grouped product search', 500);
  }
});

// ============================================
// AI SEARCH ENDPOINT
// ============================================

/**
 * AI Search - Smart search that parses natural language queries
 * GET /api/search/ai-search
 *
 * Extracts keywords, price constraints, and category hints from natural language,
 * then uses existing search infrastructure to find results.
 */
export const aiSearch = asyncHandler(async (req: Request, res: Response) => {
  const { q: rawQuery } = req.query;

  if (!rawQuery || typeof rawQuery !== 'string') {
    return sendBadRequest(res, 'Search query (q) is required');
  }

  const regionHeader = req.headers['x-rez-region'] as string;
  const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
    ? regionHeader as RegionId
    : undefined;

  // Parse natural language query
  const queryLower = rawQuery.toLowerCase();

  // Extract price constraints
  let maxPrice: number | undefined;
  let minPrice: number | undefined;
  const underMatch = queryLower.match(/(?:under|below|less than|max|upto|up to|within)\s*(?:₹|aed|rs\.?|inr|dhs?)?\s*(\d+[\d,]*)/i);
  if (underMatch) {
    maxPrice = parseInt(underMatch[1].replace(/,/g, ''));
  }
  const aboveMatch = queryLower.match(/(?:above|over|more than|min|at least)\s*(?:₹|aed|rs\.?|inr|dhs?)?\s*(\d+[\d,]*)/i);
  if (aboveMatch) {
    minPrice = parseInt(aboveMatch[1].replace(/,/g, ''));
  }

  // Remove price phrases from keywords
  let keywords = rawQuery
    .replace(/(?:under|below|less than|max|upto|up to|within|above|over|more than|min|at least)\s*(?:₹|aed|rs\.?|inr|dhs?)?\s*\d+[\d,]*/gi, '')
    .replace(/(?:near me|nearby|around me|close by)/gi, '')
    .replace(/(?:find me|get me|show me|i need|i want|looking for|search for)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // If keywords are empty after parsing, use original query
  if (!keywords) keywords = rawQuery;

  // Build filters
  const filters: any = {};
  if (minPrice) filters.minPrice = minPrice;
  if (maxPrice) filters.maxPrice = maxPrice;

  // Search products using existing internal function
  const productResult = await searchProductsGroupedInternal(keywords, 10, undefined, region, Object.keys(filters).length > 0 ? filters : undefined);

  // Also search stores
  const storeResult = await searchStores(keywords, 5, undefined, region);

  // Build unified results with relevance scoring
  const results: any[] = [];

  // Add product results
  if (productResult.groupedProducts) {
    for (const group of productResult.groupedProducts) {
      const bestSeller = group.sellers?.[0];
      results.push({
        id: group.productId,
        type: 'product',
        title: group.productName,
        subtitle: bestSeller ? `From ${bestSeller.storeName}` : group.category || '',
        price: bestSeller?.price?.current,
        image: group.productImage || '',
        relevance: 90 - results.length * 2,
        storeId: bestSeller?.storeId,
      });
    }
  }

  // Add store results
  if (storeResult.items) {
    for (const store of storeResult.items) {
      results.push({
        id: store._id?.toString() || store.id,
        type: 'store',
        title: store.name,
        subtitle: store.description || store.location?.city || '',
        image: store.logo || '',
        relevance: 85 - results.length,
        storeId: store._id?.toString() || store.id,
      });
    }
  }

  return sendSuccess(res, {
    query: rawQuery,
    parsedKeywords: keywords,
    filters,
    results,
    total: results.length,
  }, 'AI search completed');
});

// ============================================
// SEARCH HISTORY ENDPOINTS
// ============================================

/**
 * Save search query to history
 * POST /api/search/history
 */
export const saveSearchHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const { query, type = 'general', resultCount = 0, filters, region } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new AppError('Search query is required', 400);
  }

  const trimmedQuery = query.trim().toLowerCase();

  // Check for duplicate searches within last 5 minutes
  const isDuplicate = await (SearchHistory as any).isDuplicate(
    userId,
    trimmedQuery,
    type,
    5
  );

  if (isDuplicate) {
    logger.debug('[SEARCH HISTORY] Duplicate search detected, skipping', { query: trimmedQuery });
    return sendSuccess(res, { message: 'Search already recorded recently' });
  }

  // Merge region into filters.location if provided
  const mergedFilters = { ...(filters || {}) };
  if (region && typeof region === 'string') {
    mergedFilters.location = region.trim().toLowerCase();
  }

  // Create new search history entry
  const searchHistory = await SearchHistory.create({
    user: userId,
    query: trimmedQuery,
    type,
    resultCount: Number(resultCount) || 0,
    filters: mergedFilters
  });

  // Maintain max 50 entries per user (async, don't block response)
  (SearchHistory as any).maintainUserLimit(userId, 50).catch((err: Error) => {
    logger.error('[SEARCH HISTORY] Error maintaining user limit', { error: err.message });
  });

  logger.debug('[SEARCH HISTORY] Saved search', {
    userId,
    query: trimmedQuery,
    type,
    resultCount,
    region: mergedFilters.location || 'none'
  });

  return sendCreated(res, searchHistory, 'Search history saved successfully');
});

/**
 * Get user's search history
 * GET /api/search/history
 */
export const getSearchHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const {
    type,
    limit = 20,
    page = 1,
    includeClicked = 'true'
  } = req.query;

  const query: any = { user: userId };

  if (type && ['product', 'store', 'general'].includes(type as string)) {
    query.type = type;
  }

  if (includeClicked === 'false') {
    query.clicked = false;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const limitNum = Math.min(Number(limit), 100); // Max 100 per page

  const [searches, total] = await Promise.all([
    SearchHistory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean(),
    SearchHistory.countDocuments(query)
  ]);

  logger.debug('[SEARCH HISTORY] Retrieved history:', {
    userId,
    count: searches.length,
    total
  });

  return sendSuccess(res, {
    searches,
    pagination: {
      page: Number(page),
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  });
});

/**
 * Get popular/frequent searches for autocomplete
 * GET /api/search/history/popular
 * Works with or without authentication - for discovery UI
 * Supports optional `region` query param for location-filtered trending
 */
export const getPopularSearches = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const { limit = 10, type, region } = req.query;
  const limitNum = Math.min(Number(limit), 20);
  const regionStr = region ? String(region).trim().toLowerCase() : undefined;

  // Build Redis cache key including region
  const cacheKey = `search:popular:${type || 'all'}:${regionStr || 'global'}`;

  // Try Redis cache first for global (non-user) results
  if (!userId) {
    const cached = await redisService.get<any[]>(cacheKey);
    if (cached) {
      logger.debug('[SEARCH HISTORY] Popular searches served from cache', { cacheKey });
      return sendSuccess(res, {
        searches: cached,
        count: cached.length
      });
    }
  }

  let popularSearches: any[] = [];

  if (userId) {
    // If authenticated, get user-specific popular searches
    popularSearches = await (SearchHistory as any).getPopularSearches(
      userId,
      limitNum
    );
  }

  // If no user-specific searches or not authenticated, get global popular searches
  if (!userId || popularSearches.length === 0) {
    // Build aggregation pipeline with optional region filter
    const pipeline: any[] = [];

    // Add region match stage if region is provided
    if (regionStr) {
      pipeline.push({
        $match: {
          'filters.location': { $regex: new RegExp(`^${escapeRegex(regionStr)}$`, 'i') }
        }
      });
    }

    // Add type filter if specified
    if (type && ['product', 'store', 'general'].includes(type as string)) {
      pipeline.push({ $match: { type: type as string } });
    }

    pipeline.push(
      {
        $group: {
          _id: '$query',
          count: { $sum: 1 },
          type: { $first: '$type' },
          lastSearched: { $max: '$createdAt' }
        }
      },
      { $sort: { count: -1, lastSearched: -1 } },
      { $limit: limitNum }
    );

    popularSearches = await SearchHistory.aggregate(pipeline).then(results =>
      results.map(item => ({
        query: item._id,
        count: item.count,
        type: item.type,
        lastSearched: item.lastSearched
      }))
    );
  } else {
    // Filter by type if specified (for user-specific results)
    if (type && ['product', 'store', 'general'].includes(type as string)) {
      popularSearches = popularSearches.filter((s: any) => s.type === type);
    }
  }

  // Cache global results for 5 minutes
  if (!userId) {
    await redisService.set(cacheKey, popularSearches, 300);
  }

  logger.debug('[SEARCH HISTORY] Popular searches', {
    userId: userId || 'anonymous',
    region: regionStr || 'global',
    count: popularSearches.length
  });

  return sendSuccess(res, {
    searches: popularSearches,
    count: popularSearches.length
  });
});

/**
 * Get recent unique searches (for autocomplete dropdown)
 * GET /api/search/history/recent
 */
export const getRecentSearches = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const { limit = 5, type } = req.query;
  const limitNum = Math.min(Number(limit), 10);

  const query: any = { user: userId };

  if (type && ['product', 'store', 'general'].includes(type as string)) {
    query.type = type;
  }

  // Get recent unique searches
  const recentSearches = await SearchHistory.aggregate([
    { $match: query },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: '$query',
        type: { $first: '$type' },
        lastSearched: { $first: '$createdAt' },
        resultCount: { $first: '$resultCount' }
      }
    },
    { $sort: { lastSearched: -1 } },
    { $limit: limitNum },
    {
      $project: {
        _id: 0,
        query: '$_id',
        type: 1,
        lastSearched: 1,
        resultCount: 1
      }
    }
  ]);

  logger.debug('[SEARCH HISTORY] Recent searches:', {
    userId,
    count: recentSearches.length
  });

  return sendSuccess(res, {
    searches: recentSearches,
    count: recentSearches.length
  });
});

/**
 * Mark search as clicked
 * PATCH /api/search/history/:id/click
 */
export const markSearchAsClicked = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const { id } = req.params;
  const { itemId, itemType } = req.body;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid search history ID', 400);
  }

  if (!itemId || !itemType || !['product', 'store'].includes(itemType)) {
    throw new AppError('Valid itemId and itemType (product/store) are required', 400);
  }

  // Find and verify ownership
  const searchHistory = await SearchHistory.findOne({
    _id: id,
    user: userId
  }).lean();

  if (!searchHistory) {
    throw new AppError('Search history not found', 404);
  }

  // Update using static method
  const updated = await (SearchHistory as any).markAsClicked(
    new mongoose.Types.ObjectId(id),
    new mongoose.Types.ObjectId(itemId),
    itemType
  );

  logger.debug('[SEARCH HISTORY] Marked as clicked:', {
    searchId: id,
    itemId,
    itemType
  });

  return sendSuccess(res, updated, 'Search marked as clicked');
});

/**
 * Delete specific search history entry
 * DELETE /api/search/history/:id
 */
export const deleteSearchHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const { id } = req.params;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid search history ID', 400);
  }

  const searchHistory = await SearchHistory.findOneAndDelete({
    _id: id,
    user: userId
  });

  if (!searchHistory) {
    throw new AppError('Search history not found', 404);
  }

  logger.debug('[SEARCH HISTORY] Deleted entry:', { id, userId });

  return sendSuccess(res, null, 'Search history deleted successfully');
});

/**
 * Clear all search history for user
 * DELETE /api/search/history
 */
export const clearSearchHistory = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const { type } = req.query;

  const query: any = { user: userId };

  if (type && ['product', 'store', 'general'].includes(type as string)) {
    query.type = type;
  }

  const result = await SearchHistory.deleteMany(query);

  logger.debug('[SEARCH HISTORY] Cleared history:', {
    userId,
    type: type || 'all',
    deletedCount: result.deletedCount
  });

  return sendSuccess(res, {
    deletedCount: result.deletedCount
  }, 'Search history cleared successfully');
});

/**
 * Get search analytics for user
 * GET /api/search/history/analytics
 */
export const getSearchAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const analytics = await SearchHistory.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(String(userId)) } },
    {
      $facet: {
        totalSearches: [
          { $count: 'count' }
        ],
        searchesByType: [
          { $group: { _id: '$type', count: { $sum: 1 } } },
          { $project: { type: '$_id', count: 1, _id: 0 } }
        ],
        clickRate: [
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              clicked: {
                $sum: { $cond: [{ $eq: ['$clicked', true] }, 1, 0] }
              }
            }
          },
          {
            $project: {
              _id: 0,
              clickRate: {
                $multiply: [{ $divide: ['$clicked', '$total'] }, 100]
              }
            }
          }
        ],
        avgResultCount: [
          {
            $group: {
              _id: null,
              avgResults: { $avg: '$resultCount' }
            }
          },
          { $project: { _id: 0, avgResults: 1 } }
        ],
        topSearches: [
          {
            $group: {
              _id: '$query',
              count: { $sum: 1 },
              avgResults: { $avg: '$resultCount' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
          {
            $project: {
              query: '$_id',
              count: 1,
              avgResults: 1,
              _id: 0
            }
          }
        ]
      }
    }
  ]);

  const result = analytics[0] || {};

  logger.debug('[SEARCH HISTORY] Analytics retrieved:', { userId });

  return sendSuccess(res, {
    totalSearches: result.totalSearches?.[0]?.count || 0,
    searchesByType: result.searchesByType || [],
    clickRate: result.clickRate?.[0]?.clickRate || 0,
    avgResultCount: result.avgResultCount?.[0]?.avgResults || 0,
    topSearches: result.topSearches || []
  });
});


// ============================================
// AUTOCOMPLETE ENDPOINT (Phase 2)
// ============================================

/**
 * Enhanced Autocomplete Endpoint
 * Returns structured suggestions for products, stores, categories, and brands
 *
 * GET /api/search/autocomplete?q=query
 */
export const getAutocomplete = asyncHandler(async (req: Request, res: Response) => {
  const { q: searchQuery } = req.query;

  if (!searchQuery || typeof searchQuery !== 'string') {
    return sendError(res, 'Search query is required', 400);
  }

  if (searchQuery.trim().length < 2) {
    return sendError(res, 'Search query must be at least 2 characters', 400);
  }

  const normalizedQuery = searchQuery.trim();

  // Get region from X-Rez-Region header
  const regionHeader = req.headers['x-rez-region'] as string;
  const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
    ? regionHeader as RegionId
    : undefined;

  try {
    logger.debug('[AUTOCOMPLETE] Processing query:', normalizedQuery, 'region:', region || 'all');

    // Include region in cache key
    const cacheKey = `search:autocomplete:${normalizedQuery.toLowerCase()}:${region || 'all'}`;
    const cachedResults = await redisService.get<any>(cacheKey);

    if (cachedResults) {
      logger.debug('[AUTOCOMPLETE] Returning from cache');
      return sendSuccess(res, cachedResults, 'Autocomplete suggestions retrieved successfully');
    }

    const searchRegex = new RegExp(escapeRegex(normalizedQuery), 'i');

    // Get stores in region for filtering products
    let regionStoreIds: any[] = [];
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const regionStores = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      regionStoreIds = regionStores.map(s => s._id);
    }

    // Build product query with region filter
    const productQuery: any = {
      isActive: true,
      'inventory.isAvailable': true,
      $or: [
        { name: searchRegex },
        { title: searchRegex },
        { brand: searchRegex },
        { description: searchRegex }
      ]
    };

    if (region && regionStoreIds.length > 0) {
      productQuery.store = { $in: regionStoreIds };
    }

    // Build store query with region filter
    const storeQuery: any = {
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex }
      ]
    };

    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      Object.assign(storeQuery, regionFilter);
    }

    const [products, stores, categories, brands] = await Promise.all([
      Product.find(productQuery)
        .select('_id name title price pricing image images brand store')
        .populate('store', 'name')
        .sort({ 'analytics.views': -1, 'analytics.purchases': -1 })
        .limit(5)
        .lean(),

      Store.find(storeQuery)
        .select('_id name logo')
        .sort({ 'ratings.average': -1, 'ratings.count': -1 })
        .limit(3)
        .lean(),

      (async () => {
        try {
          const { Category } = await import('../models/Category');
          return await Category.find({
            isActive: true,
            $or: [
              { name: searchRegex },
              { description: searchRegex }
            ]
          })
            .select('_id name')
            .sort({ productCount: -1 })
            .limit(3)
            .lean();
        } catch (error) {
          logger.warn('[AUTOCOMPLETE] Category search failed:', error);
          return [];
        }
      })(),

      Product.aggregate([
        {
          $match: {
            isActive: true,
            brand: { $exists: true, $ne: '', $regex: searchRegex }
          }
        },
        {
          $group: {
            _id: '$brand',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 3 },
        {
          $project: {
            _id: 0,
            name: '$_id'
          }
        }
      ])
    ]);

    const transformedProducts = products.map(product => ({
      _id: product._id,
      name: product.name || product.title,
      price: product.pricing?.selling || product.price || 0,
      image: product.image || product.images?.[0] || '',
      store: {
        name: (product.store as any)?.name || 'Unknown Store'
      }
    }));

    const transformedStores = stores.map(store => ({
      _id: store._id,
      name: store.name,
      logo: store.logo || ''
    }));

    const transformedCategories = categories.map(category => ({
      _id: category._id,
      name: category.name
    }));

    const brandNames = brands.map(b => b.name);

    const response = {
      products: transformedProducts,
      stores: transformedStores,
      categories: transformedCategories,
      brands: brandNames
    };

    await redisService.set(cacheKey, response, 300);

    logger.debug('[AUTOCOMPLETE] Results:', {
      products: transformedProducts.length,
      stores: transformedStores.length,
      categories: transformedCategories.length,
      brands: brandNames.length
    });

    sendSuccess(res, response, 'Autocomplete suggestions retrieved successfully');

  } catch (error) {
    logger.error('[AUTOCOMPLETE] Error:', error);
    logger.error('[AUTOCOMPLETE] Error message:', error instanceof Error ? error.message : 'Unknown error');
    logger.error('[AUTOCOMPLETE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return sendError(res, 'Failed to get autocomplete suggestions', 500);
  }
});

/**
 * Levenshtein distance between two strings (standard DP)
 */
const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

/**
 * "Did you mean?" typo correction based on popular search terms
 * GET /api/search/did-you-mean?q=shamppo
 */
export const getDidYouMean = asyncHandler(async (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  if (q.length < 3) return sendSuccess(res, { suggestions: [] });

  // Check Redis cache
  const cacheKey = `didyoumean:${q}`;
  const cached = await redisService.get(cacheKey);
  if (cached) return sendSuccess(res, cached);

  // Get popular search terms from SearchHistory
  const popular = await SearchHistory.aggregate([
    { $group: { _id: { $toLower: '$query' }, count: { $sum: 1 } } },
    { $match: { count: { $gte: 2 } } },
    { $sort: { count: -1 } },
    { $limit: 100 },
  ]);

  const suggestions = popular
    .map(s => ({ query: String(s._id), distance: levenshtein(q, (String(s._id)).toLowerCase()) }))
    .filter(s => s.distance > 0 && s.distance <= 3)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map(s => s.query);

  const result = { suggestions };
  await redisService.set(cacheKey, result, 300);
  sendSuccess(res, result);
});
