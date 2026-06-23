import { Request, Response } from 'express';
import HeroBanner from '../models/HeroBanner';
import { sendSuccess, sendError } from '../utils/response';
import redisService from '../services/redisService';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * GET /api/hero-banners
 * Get active hero banners
 */
export const getActiveBanners = asyncHandler(async (req: Request, res: Response) => {
    const { page = 'offers', position = 'top', limit = 5 } = req.query;

    const cacheKey = `hero-banners:${page}:${position}:${limit}`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return sendSuccess(res, cached);
    }

    const banners = await HeroBanner.findActiveBanners(page as string, position as string);
    const limitedBanners = banners.slice(0, Number(limit));

    redisService.set(cacheKey, limitedBanners, 300).catch((err) => logger.warn('[HeroBanner] Cache set for active banners failed', { error: err.message })); // 5min cache

    sendSuccess(res, limitedBanners, 'Active hero banners fetched successfully');
});

/**
 * GET /api/hero-banners/user
 * Get banners for specific user (with targeting)
 */
export const getBannersForUser = asyncHandler(async (req: Request, res: Response) => {
    const { page = 'offers', limit = 5 } = req.query;

    const userData = req.user ? {
      userType: req.user.userType,
      age: req.user.age,
      location: req.user.location,
      interests: req.user.interests
    } : undefined;

    // Cache by user type (not per-user) for better hit rate
    const userType = userData?.userType || 'anonymous';
    const cacheKey = `hero-banners:user:${userType}:${page}:${limit}`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return sendSuccess(res, cached);
    }

    const banners = await HeroBanner.findBannersForUser(userData, page as string);
    const limitedBanners = banners.slice(0, Number(limit));

    redisService.set(cacheKey, limitedBanners, 300).catch((err) => logger.warn('[HeroBanner] Cache set for user-targeted banners failed', { error: err.message })); // 5min cache

    sendSuccess(res, limitedBanners, 'User-targeted hero banners fetched successfully');
});

/**
 * GET /api/hero-banners/:id
 * Get single banner by ID
 */
export const getHeroBannerById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const banner = await HeroBanner.findById(id);

    if (!banner) {
      return sendError(res, 'Hero banner not found', 404);
    }

    const isActive = banner.isCurrentlyActive();

    const bannerData = {
      ...banner.toObject(),
      isCurrentlyActive: isActive
    };

    sendSuccess(res, bannerData, 'Hero banner fetched successfully');
});

/**
 * POST /api/hero-banners/:id/view
 * Track banner view (analytics)
 */
export const trackBannerView = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { source, device, location } = req.body;

    const banner = await HeroBanner.findById(id);
    if (!banner) {
      return sendError(res, 'Hero banner not found', 404);
    }

    // Increment view count
    await banner.incrementView();

    // Track additional analytics if needed
    // This could be extended to store detailed view analytics

    sendSuccess(res, { success: true }, 'Banner view tracked');
  } catch (error) {
    logger.error('Error tracking banner view:', error);
    // Don't return error for analytics endpoints
    res.status(200).json({ success: true });
  }
};

/**
 * POST /api/hero-banners/:id/click
 * Track banner click (analytics)
 */
export const trackBannerClick = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { source, device, location } = req.body;

    const banner = await HeroBanner.findById(id);
    if (!banner) {
      return sendError(res, 'Hero banner not found', 404);
    }

    // Increment click count
    await banner.incrementClick();

    // Track additional analytics if needed
    // This could be extended to store detailed click analytics

    sendSuccess(res, { success: true }, 'Banner click tracked');
  } catch (error) {
    logger.error('Error tracking banner click:', error);
    // Don't return error for analytics endpoints
    res.status(200).json({ success: true });
  }
};

/**
 * POST /api/hero-banners/:id/conversion
 * Track banner conversion (analytics)
 */
export const trackBannerConversion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { conversionType, value, source, device } = req.body;

    const banner = await HeroBanner.findById(id);
    if (!banner) {
      return sendError(res, 'Hero banner not found', 404);
    }

    // Increment conversion count
    await banner.incrementConversion();

    // Track additional conversion analytics if needed
    // This could be extended to store detailed conversion analytics

    sendSuccess(res, { success: true }, 'Banner conversion tracked');
  } catch (error) {
    logger.error('Error tracking banner conversion:', error);
    // Don't return error for analytics endpoints
    res.status(200).json({ success: true });
  }
};
