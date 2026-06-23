import { Request, Response } from 'express';
import { getHomepageData } from '../services/homepageService';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendInternalError, sendUnauthorized } from '../utils/response';
import { modeService, ModeId } from '../services/modeService';
import { isValidRegion, RegionId, DEFAULT_REGION } from '../services/regionService';
import { Wallet } from '../models/Wallet';
import { UserVoucher } from '../models/Voucher';
import OfferRedemption from '../models/OfferRedemption';
import Offer from '../models/Offer';
import redisService from '../services/redisService';
import { Cart } from '../models/Cart';
import subscriptionBenefitsService from '../services/subscriptionBenefitsService';

/**
 * Homepage Controller
 * Handles homepage data requests with caching and error handling
 */

/**
 * @route   GET /api/homepage
 * @desc    Get all homepage data in a single batch request
 * @access  Public (optionalAuth)
 * @query   {string} sections - Comma-separated list of sections to fetch (optional)
 * @query   {number} limit - Limit for each section (optional, default varies by section)
 * @query   {string} location - User location as "lat,lng" (optional)
 * @query   {string} mode - Mode filter: 'near-u' | 'mall' | 'cash' | 'prive' (optional)
 */
export const getHomepage = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Parse query parameters
    const { sections, limit, location, mode, region: regionQuery, segment, featureLevel: featureLevelQuery } = req.query;
    const userId = (req as any).userId; // From optionalAuth middleware

    // Get region from X-Rez-Region header or query param
    const regionHeader = req.headers['x-rez-region'] as string;
    let region: RegionId | undefined;

    // Priority: header > query param > user preference
    if (regionHeader && isValidRegion(regionHeader)) {
      region = regionHeader as RegionId;
    } else if (regionQuery && typeof regionQuery === 'string' && isValidRegion(regionQuery)) {
      region = regionQuery as RegionId;
    } else if ((req as any).user?.preferences?.region && isValidRegion((req as any).user.preferences.region)) {
      region = (req as any).user.preferences.region;
    }

    // Parse and validate mode
    const activeMode: ModeId = modeService.getModeFromRequest(
      mode as string | undefined,
      (req as any).user?.preferences?.activeMode
    );

    // Parse sections if provided, or use mode-specific sections
    let requestedSections: string[] | undefined;
    if (sections && typeof sections === 'string') {
      requestedSections = sections.split(',').map(s => s.trim());
    } else {
      // Use mode-specific default sections
      requestedSections = modeService.getHomepageSections(activeMode);
    }

    // Parse location if provided
    let locationCoords: { lat: number; lng: number } | undefined;
    if (location && typeof location === 'string') {
      const [lat, lng] = location.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        locationCoords = { lat, lng };
      }
    }

    // Parse limit
    const limitNumber = limit ? parseInt(limit as string, 10) : undefined;

    logger.info('🏠 [Homepage Controller] Request params:', {
      userId: userId || 'anonymous',
      mode: activeMode,
      region: region || 'none',
      regionHeader: regionHeader || 'NOT_RECEIVED',
      regionQuery: regionQuery || 'none',
      sections: requestedSections?.join(', ') || 'all',
      limit: limitNumber || 'default',
      location: locationCoords ? `${locationCoords.lat},${locationCoords.lng}` : 'none',
      allHeaders: JSON.stringify(req.headers)
    });

    // Server-side Redis cache — region-based (homepage content is the same for
    // all users in the same region; personalization is done client-side)
    const homepageCacheKey = `homepage:${region || 'default'}:${activeMode}`;
    const HOMEPAGE_TTL = 300; // 5 minutes — reduces DB load at scale, client can force-refresh via pull-to-refresh

    // Fetch homepage sections (cached) and user context (per-user, not cached) in parallel
    // userContext is only fetched if user is authenticated — it adds wallet, cart, voucher, etc.
    const cachedPromise = redisService.get<any>(homepageCacheKey);
    const parsedSegment = segment as string | undefined;
    const parsedFeatureLevel = featureLevelQuery ? parseInt(featureLevelQuery as string, 10) : undefined;
    const userContextPromise = userId
      ? fetchUserContext(userId, { segment: parsedSegment, featureLevel: parsedFeatureLevel })
      : Promise.resolve(parsedSegment ? { segment: parsedSegment, featureLevel: parsedFeatureLevel || 1 } : null);

    const [cached, userContext] = await Promise.all([cachedPromise, userContextPromise]);

    if (cached) {
      const duration = Date.now() - startTime;
      res.set({
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'Vary': 'X-Rez-Region',
        'X-Response-Time': `${duration}ms`,
        'X-Cache': 'HIT',
      });
      // Merge per-user context into cached shared data
      return sendSuccess(res, {
        ...cached,
        ...(userContext ? { userContext } : {}),
      }, 'Homepage data retrieved');
    }

    // Cache miss — fetch from DB
    const result = await getHomepageData({
      userId,
      sections: requestedSections,
      limit: limitNumber,
      location: locationCoords,
      mode: activeMode,
      region,
    });

    const duration = Date.now() - startTime;

    // Store in Redis (fire and forget — don't delay response)
    // Note: userContext is NOT cached here — it's per-user data
    redisService.set(homepageCacheKey, result.data, HOMEPAGE_TTL).catch((err) => logger.warn('[Homepage] Cache set for homepage data failed', { error: err.message }));

    res.set({
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'Vary': 'X-Rez-Region',
      'X-Response-Time': `${duration}ms`,
      'X-Cache': 'MISS',
    });

    logger.info(`✅ [Homepage Controller] Response sent in ${duration}ms`);
    logger.info(`   Sections returned: ${Object.keys(result.data).length}`);
    logger.info(`   Total items: ${Object.values(result.data).reduce((sum: number, arr: any) => sum + (Array.isArray(arr) ? arr.length : 0), 0)}`);

    // Send response with mode, region info, and user context
    sendSuccess(res, {
      ...result.data,
      ...(userContext ? { userContext } : {}),
      _metadata: {
        ...result.metadata,
        mode: activeMode,
        region: region || null,
      },
      _errors: result.errors
    }, 'Homepage data retrieved successfully');

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`❌ [Homepage Controller] Error after ${duration}ms:`, error);

    sendInternalError(res, 'Failed to fetch homepage data');
  }
});

/**
 * @route   GET /api/homepage/sections
 * @desc    Get available sections for homepage
 * @access  Public
 */
export const getAvailableSections = asyncHandler(async (req: Request, res: Response) => {
  const sections = [
    {
      name: 'featuredProducts',
      description: 'Featured products highlighted on homepage',
      defaultLimit: 10
    },
    {
      name: 'newArrivals',
      description: 'Recently added products (last 30 days)',
      defaultLimit: 10
    },
    {
      name: 'featuredStores',
      description: 'Featured stores with high ratings',
      defaultLimit: 8
    },
    {
      name: 'trendingStores',
      description: 'Stores with most orders and engagement',
      defaultLimit: 8
    },
    {
      name: 'upcomingEvents',
      description: 'Upcoming events sorted by date',
      defaultLimit: 6
    },
    {
      name: 'megaOffers',
      description: 'Mega offers and deals',
      defaultLimit: 5
    },
    {
      name: 'studentOffers',
      description: 'Special offers for students',
      defaultLimit: 5
    },
    {
      name: 'categories',
      description: 'All product categories',
      defaultLimit: 12
    },
    {
      name: 'trendingVideos',
      description: 'Most viewed videos',
      defaultLimit: 6
    },
    {
      name: 'latestArticles',
      description: 'Recently published articles',
      defaultLimit: 4
    }
  ];

  sendSuccess(res, { sections }, 'Available homepage sections');
});

/**
 * Shared helper: fetch user-specific context data (wallet, cart, vouchers, etc.)
 * Used by both the homepage batch endpoint and the standalone user-context endpoint.
 */
/** Global offer count — same for all users, cached separately (300s) */
async function getCachedGlobalOfferCount(): Promise<number> {
  const cacheKey = 'homepage:globalOfferCount';
  const cached = await redisService.get<number>(cacheKey);
  if (cached !== null) return cached;

  const count = await Offer.countDocuments({
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() },
  }).catch(() => 0);

  await redisService.set(cacheKey, count, 300).catch((err) => logger.warn('[Homepage] Cache set for active offers count failed', { error: err.message }));
  return count;
}

async function fetchUserContext(userId: string, extra?: { segment?: string; featureLevel?: number }): Promise<{
  walletBalance: number;
  totalSaved: number;
  voucherCount: number;
  offersCount: number;
  cartItemCount: number;
  subscription: { tier: string; status: string };
  segment?: string;
  featureLevel?: number;
} | null> {
  try {
    // Short-cache per-user context (30s) to avoid 6 DB queries on every homepage load
    const userContextCacheKey = `homepage:uc:${userId}`;
    const cachedContext = await redisService.get<any>(userContextCacheKey);
    if (cachedContext) return cachedContext;

    const [wallet, activeVoucherCount, activeRedemptionCount, totalOffersCount, cart, subscription] = await Promise.all([
      Wallet.findOne({ user: userId }).select('balance coins brandedCoins statistics').lean().catch(() => null),
      UserVoucher.countDocuments({ user: userId, status: 'active' }).catch(() => 0),
      OfferRedemption.countDocuments({ user: userId, status: 'active' }).catch(() => 0),
      getCachedGlobalOfferCount(),
      Cart.getActiveCart(String(userId)).then(c => c).catch(() => null),
      subscriptionBenefitsService.getUserSubscription(userId).catch(() => null),
    ]);

    const rezCoin = wallet?.coins?.find((c: any) => c.type === 'rez');
    const walletBalance = rezCoin?.amount || 0;
    const totalSaved = wallet?.statistics
      ? (wallet.statistics.totalCashback || 0) + (wallet.statistics.totalRefunds || 0)
      : 0;
    const cartItemCount = cart?.items?.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0) || 0;

    const context = {
      walletBalance,
      totalSaved,
      voucherCount: activeVoucherCount + activeRedemptionCount,
      offersCount: totalOffersCount,
      cartItemCount,
      subscription: subscription ? {
        tier: subscription.tier,
        status: subscription.status,
      } : { tier: 'free', status: 'active' },
      segment: extra?.segment,
      featureLevel: extra?.featureLevel,
    };

    // Cache for 30s — acceptable staleness for display counts
    await redisService.set(userContextCacheKey, context, 30).catch((err) => logger.warn('[Homepage] Cache set for user context failed', { error: err.message }));

    return context;
  } catch (error) {
    logger.error('Error fetching user context:', error);
    return null;
  }
}

/**
 * @route   GET /api/homepage/user-context
 * @desc    Get all user-specific homepage data in a single request
 *          Combines: wallet balance, voucher count, offer count, cart count, subscription tier
 * @access  Private (requireAuth)
 */
export const getUserContext = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as any).userId || (req as any).user?._id || (req as any).user?.id;

  if (!userId) {
    return sendUnauthorized(res, 'Authentication required');
  }

  const data = await fetchUserContext(userId);
  if (!data) {
    return sendInternalError(res, 'Failed to fetch user context');
  }

  sendSuccess(res, data, 'User context retrieved');
});
