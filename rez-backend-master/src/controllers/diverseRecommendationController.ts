import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { diversityService, DiversityProduct } from '../services/diversityService';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import redisService from '../services/redisService';
import { regionService, isValidRegion, RegionId } from '../services/regionService';
import { logger } from '../config/logger';

/**
 * Diverse Recommendation Controller
 *
 * This controller provides a specialized endpoint for fetching diverse product recommendations.
 * It uses sophisticated algorithms to eliminate duplicates and ensure variety across categories,
 * brands, and price ranges.
 *
 * @module diverseRecommendationController
 */

/**
 * Request body interface for diverse recommendations
 */
interface DiverseRecommendationRequest {
  excludeProducts?: string[];
  excludeStores?: string[];
  shownProducts?: string[];
  limit?: number;
  context?: 'homepage' | 'product_page' | 'store_page' | 'category_page';
  options?: {
    minCategories?: number;
    maxPerCategory?: number;
    maxPerBrand?: number;
    diversityScore?: number;
    includeStores?: boolean;
    algorithm?: 'hybrid' | 'collaborative' | 'content_based';
    minRating?: number;
    priceRanges?: number;
  };
}

/**
 * Calculate relevance score for a product
 *
 * This scoring system combines multiple signals:
 * - Rating (40%)
 * - Popularity (views + purchases) (30%)
 * - Recency (20%)
 * - Availability (10%)
 *
 * @param product - Product to score
 * @returns Relevance score between 0 and 1
 */
function calculateRelevanceScore(product: any): number {
  // Rating score (0-1, based on 5-star scale)
  const rating = product.ratings?.average || product.rating?.value || 0;
  const ratingScore = rating / 5;

  // Popularity score (normalized by log scale to prevent extreme values)
  const views = product.analytics?.views || 0;
  const purchases = product.analytics?.purchases || 0;
  const popularityRaw = views + (purchases * 10); // Weight purchases 10x more than views
  const popularityScore = Math.min(Math.log10(popularityRaw + 1) / 4, 1); // Cap at log10(10000) = 4

  // Recency score (products created in last 30 days get bonus)
  const createdAt = product.createdAt || new Date();
  const daysSinceCreation = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(1 - (daysSinceCreation / 30), 0);

  // Availability score
  const stock = product.inventory?.stock || 0;
  const availabilityScore = stock > 0 ? 1 : 0;

  // Weighted combination
  const relevanceScore = (
    ratingScore * 0.4 +
    popularityScore * 0.3 +
    recencyScore * 0.2 +
    availabilityScore * 0.1
  );

  return parseFloat(relevanceScore.toFixed(3));
}

/**
 * Calculate diversity contribution of adding a product to a set
 *
 * This measures how much a product would increase diversity if added.
 *
 * @param product - Product to evaluate
 * @param selectedProducts - Products already selected
 * @returns Diversity contribution score (0-1)
 */
function calculateDiversityContribution(
  product: any,
  selectedProducts: any[]
): number {
  if (selectedProducts.length === 0) return 1;

  // Get product attributes
  const category = product.category?.name || product.category || 'unknown';
  const brand = product.brand || product.store?.name || 'generic';
  const price = product.pricing?.selling || product.price?.current || 0;

  // Check uniqueness
  const categoryCount = selectedProducts.filter(p =>
    (p.category?.name || p.category) === category
  ).length;

  const brandCount = selectedProducts.filter(p =>
    (p.brand || p.store?.name) === brand
  ).length;

  // Price range uniqueness (divide into 3 ranges)
  const allPrices = selectedProducts.map(p => p.pricing?.selling || p.price?.current || 0);
  allPrices.push(price);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = (maxPrice - minPrice) / 3;

  let priceRangeIndex = 0;
  if (price > minPrice + priceRange) priceRangeIndex = 1;
  if (price > minPrice + 2 * priceRange) priceRangeIndex = 2;

  const samePriceRange = selectedProducts.filter(p => {
    const pPrice = p.pricing?.selling || p.price?.current || 0;
    let pRangeIndex = 0;
    if (pPrice > minPrice + priceRange) pRangeIndex = 1;
    if (pPrice > minPrice + 2 * priceRange) pRangeIndex = 2;
    return pRangeIndex === priceRangeIndex;
  }).length;

  // Calculate diversity contribution (lower counts = higher contribution)
  const categoryDiversity = 1 / (categoryCount + 1);
  const brandDiversity = 1 / (brandCount + 1);
  const priceDiversity = 1 / (samePriceRange + 1);

  const diversityContribution = (
    categoryDiversity * 0.4 +
    brandDiversity * 0.3 +
    priceDiversity * 0.3
  );

  return parseFloat(diversityContribution.toFixed(3));
}

/**
 * POST /api/v1/recommendations/diverse
 *
 * Get diverse product recommendations with advanced deduplication
 *
 * This endpoint implements a hybrid scoring algorithm:
 * 1. Fetch candidate products (5x requested limit)
 * 2. Score each: (0.6 × relevance) + (0.4 × diversity)
 * 3. Greedy selection maximizing diversity
 * 4. Cache results for 5 minutes
 *
 * @route POST /api/v1/recommendations/diverse
 * @access Public (optionalAuth for personalization)
 *
 * @example Request Body
 * ```json
 * {
 *   "excludeProducts": ["507f1f77bcf86cd799439011"],
 *   "excludeStores": ["507f1f77bcf86cd799439012"],
 *   "shownProducts": ["507f1f77bcf86cd799439013"],
 *   "limit": 10,
 *   "context": "homepage",
 *   "options": {
 *     "minCategories": 3,
 *     "maxPerCategory": 2,
 *     "diversityScore": 0.7,
 *     "algorithm": "hybrid"
 *   }
 * }
 * ```
 *
 * @example Response
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "recommendations": [...],
 *     "metadata": {
 *       "categoriesShown": ["Electronics", "Fashion", "Home"],
 *       "diversityScore": 0.83,
 *       "deduplicatedCount": 15
 *     }
 *   }
 * }
 * ```
 */
export const getDiverseRecommendations = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const userId = req.user?.id;

  logger.info('[DIVERSE RECOMMENDATIONS] Request received');
  logger.info('[DIVERSE RECOMMENDATIONS] User ID:', userId || 'Anonymous');

  // Parse and validate request body
  const {
    excludeProducts = [],
    excludeStores = [],
    shownProducts = [],
    limit = 10,
    context = 'homepage',
    options = {}
  } = req.body as DiverseRecommendationRequest;

  // Validate limit
  const requestLimit = Math.min(Math.max(limit, 1), 50); // Clamp between 1-50

  logger.info('[DIVERSE RECOMMENDATIONS] Parameters:', {
    excludeProducts: excludeProducts.length,
    excludeStores: excludeStores.length,
    shownProducts: shownProducts.length,
    limit: requestLimit,
    context,
    options
  });

  // Extract options with defaults
  const {
    minCategories = 3,
    maxPerCategory = 2,
    maxPerBrand = 2,
    diversityScore: targetDiversityScore = 0.7,
    includeStores = false,
    algorithm = 'hybrid',
    minRating = 3.0,
    priceRanges = 3
  } = options;

  // Get region from X-Rez-Region header for cache key
  const regionHeaderForCache = req.headers['x-rez-region'] as string;
  const regionForCache: string = regionHeaderForCache && isValidRegion(regionHeaderForCache)
    ? regionHeaderForCache
    : 'all';

  // Generate cache key (include region for region-specific caching)
  const cacheKey = `diverse-recommendations:${context}:${userId || 'anon'}:${requestLimit}:${regionForCache}:${JSON.stringify(options)}`;

  try {
    // Try to get from cache first
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      logger.info('[DIVERSE RECOMMENDATIONS] Returning from cache');
      logger.debug('[DIVERSE RECOMMENDATIONS] Response time:', Date.now() - startTime, 'ms');

      return sendSuccess(res, cached, 'Diverse recommendations retrieved from cache');
    }

    logger.info('[DIVERSE RECOMMENDATIONS] Fetching candidates from database');

    // Build exclusion lists
    const allExcludedProducts = [
      ...excludeProducts,
      ...shownProducts
    ].map(id => {
      try {
        return new Types.ObjectId(id);
      } catch {
        return null;
      }
    }).filter(id => id !== null) as Types.ObjectId[];

    const excludedStoreIds = excludeStores.map(id => {
      try {
        return new Types.ObjectId(id);
      } catch {
        return null;
      }
    }).filter(id => id !== null) as Types.ObjectId[];

    logger.info('[DIVERSE RECOMMENDATIONS] Exclusions:', {
      products: allExcludedProducts.length,
      stores: excludedStoreIds.length
    });

    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Build query
    const query: any = {
      isActive: true,
      'inventory.isAvailable': true,
      'inventory.stock': { $gt: 0 }
    };

    // Add exclusions
    if (allExcludedProducts.length > 0) {
      query._id = { $nin: allExcludedProducts };
    }

    if (excludedStoreIds.length > 0) {
      query.store = { $nin: excludedStoreIds };
    }

    // Add region filter by finding stores in region first
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      // Combine with any excluded stores
      if (query.store && query.store.$nin) {
        query.store = { $in: storeIds, $nin: query.store.$nin };
      } else {
        query.store = { $in: storeIds };
      }
    }

    // Fetch candidates (5x limit to have good selection pool)
    const candidateLimit = requestLimit * 5;
    logger.info('[DIVERSE RECOMMENDATIONS] Fetching', candidateLimit, 'candidates');

    const candidates = await Product.find(query)
      .populate('category', 'name slug type')
      .populate('store', 'name logo ratings')
      .sort({ 'ratings.average': -1, 'analytics.views': -1 })
      .limit(candidateLimit)
      .lean();

    logger.info('[DIVERSE RECOMMENDATIONS] Found', candidates.length, 'candidates');

    if (candidates.length === 0) {
      logger.info('[DIVERSE RECOMMENDATIONS] No candidates found');
      return sendSuccess(res, {
        recommendations: [],
        metadata: {
          categoriesShown: [],
          brandsShown: [],
          diversityScore: 0,
          deduplicatedCount: 0,
          priceDistribution: { budget: 0, mid: 0, premium: 0 }
        }
      }, 'No recommendations available');
    }

    // Apply algorithm based on type
    let recommendations: any[] = [];

    if (algorithm === 'hybrid' || algorithm === 'content_based') {
      logger.info('[DIVERSE RECOMMENDATIONS] Applying hybrid scoring algorithm');

      // Score each candidate
      const scoredCandidates = candidates.map(product => {
        const relevance = calculateRelevanceScore(product);
        const diversity = calculateDiversityContribution(product, recommendations);
        const hybridScore = (relevance * 0.6) + (diversity * 0.4);

        return {
          product,
          relevance,
          diversity,
          hybridScore
        };
      });

      // Sort by hybrid score
      scoredCandidates.sort((a, b) => b.hybridScore - a.hybridScore);

      logger.info('[DIVERSE RECOMMENDATIONS] Top scored candidates:', scoredCandidates.slice(0, 3).map(c => ({
        name: c.product.name,
        relevance: c.relevance,
        diversity: c.diversity,
        hybridScore: c.hybridScore
      })));

      // Greedy selection maximizing diversity
      const selectedProducts: any[] = [];

      for (const { product } of scoredCandidates) {
        if (selectedProducts.length >= requestLimit) break;

        // Recalculate diversity contribution for current selection
        const diversityContribution = calculateDiversityContribution(product, selectedProducts);

        // Accept product if it contributes to diversity
        if (diversityContribution > 0.3 || selectedProducts.length < 5) {
          selectedProducts.push(product);
        }
      }

      recommendations = selectedProducts;

      logger.info('[DIVERSE RECOMMENDATIONS] Greedy selection complete:', recommendations.length);
    } else {
      // Collaborative filtering (simplified - just use diversity service)
      logger.info('[DIVERSE RECOMMENDATIONS] Applying diversity service');

      recommendations = await diversityService.applyDiversityMode(
        candidates as any,
        'balanced',
        {
          maxPerCategory,
          maxPerBrand,
          priceRanges,
          minRating
        }
      ) as any;

      // Limit to requested amount
      recommendations = recommendations.slice(0, requestLimit);
    }

    // Validate minimum categories requirement
    const categoriesRepresented = new Set(
      recommendations.map(p => p.category?.name || p.category || 'unknown')
    );

    logger.info('[DIVERSE RECOMMENDATIONS] Categories represented:', categoriesRepresented.size);

    if (categoriesRepresented.size < minCategories) {
      logger.info('[DIVERSE RECOMMENDATIONS] Not enough categories, fetching more');

      // Fetch from underrepresented categories
      const missingCategories = minCategories - categoriesRepresented.size;
      const additionalQuery = {
        ...query,
        _id: { $nin: [...allExcludedProducts, ...recommendations.map(p => p._id)] },
        category: { $nin: Array.from(categoriesRepresented) }
      };

      const additionalProducts = await Product.find(additionalQuery)
        .populate('category', 'name slug type')
        .populate('store', 'name logo ratings')
        .limit(missingCategories)
        .lean();

      recommendations = [...recommendations.slice(0, requestLimit - additionalProducts.length), ...additionalProducts];
      logger.info('[DIVERSE RECOMMENDATIONS] Added', additionalProducts.length, 'products from new categories');
    }

    // Calculate final diversity score
    const finalDiversityScore = diversityService.calculateDiversityScore(recommendations as DiversityProduct[]);

    // Generate metadata
    const metadata = diversityService.getMetadata(recommendations as DiversityProduct[]);
    metadata.deduplicatedCount = candidates.length - recommendations.length;

    logger.info('[DIVERSE RECOMMENDATIONS] Final diversity score:', finalDiversityScore);
    logger.info('[DIVERSE RECOMMENDATIONS] Metadata:', {
      categories: metadata.categoriesShown.length,
      brands: metadata.brandsShown.length,
      deduplicatedCount: metadata.deduplicatedCount
    });

    // Transform for response
    const transformedRecommendations = recommendations.map(product => ({
      id: product._id,
      name: product.name,
      slug: product.slug,
      description: product.shortDescription || product.description,
      image: product.images?.[0] || '',
      images: product.images || [],
      pricing: product.pricing,
      rating: product.ratings,
      category: product.category,
      store: product.store,
      tags: product.tags || [],
      cashback: product.cashback,
      inventory: {
        inStock: product.inventory?.stock > 0,
        stock: product.inventory?.stock
      }
    }));

    const responseData = {
      recommendations: transformedRecommendations,
      metadata: {
        ...metadata,
        algorithm,
        context,
        requestedLimit: requestLimit,
        returnedCount: transformedRecommendations.length
      }
    };

    // Cache for 5 minutes (300 seconds)
    await redisService.set(cacheKey, responseData, 300);

    logger.info('[DIVERSE RECOMMENDATIONS] Request complete');
    logger.debug('[DIVERSE RECOMMENDATIONS] Response time:', Date.now() - startTime, 'ms');

    // Track analytics (async, don't wait)
    trackRecommendationAnalytics(context, requestLimit, finalDiversityScore, Date.now() - startTime)
      .catch(err => logger.error('[DIVERSE RECOMMENDATIONS] Analytics error:', err));

    return sendSuccess(res, responseData, 'Diverse recommendations retrieved successfully');

  } catch (error) {
    logger.error('[DIVERSE RECOMMENDATIONS] Error:', error);
    logger.error('[DIVERSE RECOMMENDATIONS] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    throw new AppError('Failed to get diverse recommendations', 500);
  }
});

/**
 * Track recommendation analytics (async)
 *
 * This logs metrics to help monitor and improve the recommendation system.
 *
 * @param context - Request context
 * @param limit - Number of recommendations requested
 * @param diversityScore - Final diversity score achieved
 * @param responseTime - Time taken to generate recommendations (ms)
 */
async function trackRecommendationAnalytics(
  context: string,
  limit: number,
  diversityScore: number,
  responseTime: number
): Promise<void> {
  try {
    // Store in Redis for aggregation
    const analyticsKey = `analytics:recommendations:${new Date().toISOString().split('T')[0]}`;

    const analytics = {
      timestamp: new Date().toISOString(),
      context,
      limit,
      diversityScore,
      responseTime
    };

    // Push to a Redis list (for time-series analysis)
    // Note: Using set instead of lpush for simpler analytics storage
    await redisService.set(analyticsKey, analytics, 30 * 24 * 60 * 60);

    logger.info('[ANALYTICS] Tracked recommendation request:', {
      context,
      diversityScore,
      responseTime: `${responseTime}ms`
    });
  } catch (error) {
    logger.error('[ANALYTICS] Failed to track:', error);
  }
}

export default {
  getDiverseRecommendations
};
