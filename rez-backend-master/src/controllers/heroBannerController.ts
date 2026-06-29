import { Request, Response } from 'express';
import HeroBanner from '../models/HeroBanner';
import { sendSuccess, sendError } from '../utils/response';
import redisService from '../services/redisService';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { Types } from 'mongoose';

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

  redisService
    .set(cacheKey, limitedBanners, 300)
    .catch((err) => logger.warn('[HeroBanner] Cache set for active banners failed', { error: err.message })); // 5min cache

  sendSuccess(res, limitedBanners, 'Active hero banners fetched successfully');
});

/**
 * GET /api/hero-banners/user
 * Get banners for specific user (with targeting)
 */
export const getBannersForUser = asyncHandler(async (req: Request, res: Response) => {
  const { page = 'offers', limit = 5 } = req.query;

  const userData = req.user
    ? {
        userType: req.user.userType,
        age: req.user.age,
        location: req.user.location,
        interests: req.user.interests,
      }
    : undefined;

  // Cache by user type (not per-user) for better hit rate
  const userType = userData?.userType || 'anonymous';
  const cacheKey = `hero-banners:user:${userType}:${page}:${limit}`;
  const cached = await redisService.get<any>(cacheKey);
  if (cached) {
    return sendSuccess(res, cached);
  }

  const banners = await HeroBanner.findBannersForUser(userData, page as string);
  const limitedBanners = banners.slice(0, Number(limit));

  redisService
    .set(cacheKey, limitedBanners, 300)
    .catch((err) => logger.warn('[HeroBanner] Cache set for user-targeted banners failed', { error: err.message })); // 5min cache

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
    isCurrentlyActive: isActive,
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

// ============================================
// ADMIN CONTROLLER METHODS
// ============================================

/**
 * GET /api/hero-banners/admin/all
 * List all banners including inactive/expired
 */
export const getAllHeroBanners = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 20, isActive, search, pageType } = req.query;

  const query: any = {};

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { subtitle: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (pageType) {
    query['metadata.page'] = pageType;
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const [banners, total] = await Promise.all([
    HeroBanner.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    HeroBanner.countDocuments(query),
  ]);

  const bannersWithStatus = banners.map((banner: any) => ({
    ...banner,
    isCurrentlyActive: banner.isCurrentlyActive
      ? banner.isCurrentlyActive()
      : new Date() >= banner.validFrom && new Date() <= banner.validUntil,
  }));

  sendSuccess(
    res,
    {
      banners: bannersWithStatus,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    },
    'All hero banners fetched successfully',
  );
});

/**
 * POST /api/hero-banners/admin/create
 * Create a new hero banner
 */
export const createHeroBanner = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    subtitle,
    description,
    image,
    ctaText,
    ctaAction,
    ctaUrl,
    backgroundColor,
    textColor,
    isActive,
    priority,
    validFrom,
    validUntil,
    targetAudience,
    metadata,
  } = req.body;

  // Validate date range
  if (new Date(validUntil) <= new Date(validFrom)) {
    return sendError(res, 'Valid until date must be after valid from date', 400);
  }

  // Ensure createdBy is set to the current admin user
  const createdBy = (req as any).user?._id || new Types.ObjectId();

  const banner = new HeroBanner({
    title,
    subtitle,
    description,
    image,
    ctaText,
    ctaAction,
    ctaUrl,
    backgroundColor,
    textColor,
    isActive: isActive !== undefined ? isActive : true,
    priority: priority || 0,
    validFrom: new Date(validFrom),
    validUntil: new Date(validUntil),
    targetAudience: targetAudience || {},
    metadata: {
      page: metadata?.page || 'all',
      position: metadata?.position || 'top',
      size: metadata?.size || 'medium',
      animation: metadata?.animation || 'fade',
      tags: metadata?.tags || [],
      colors: metadata?.colors || [],
      shareBonus: metadata?.shareBonus || 50,
    },
    createdBy,
  });

  await banner.save();

  logger.info('[HeroBanner] Admin created new banner', {
    bannerId: banner._id,
    title: banner.title,
    createdBy,
  });

  sendSuccess(res, banner, 'Hero banner created successfully', 201);
});

/**
 * PUT /api/hero-banners/admin/:id
 * Update an existing hero banner
 */
export const updateHeroBanner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const banner = await HeroBanner.findById(id);
  if (!banner) {
    return sendError(res, 'Hero banner not found', 404);
  }

  const allowedUpdates = [
    'title',
    'subtitle',
    'description',
    'image',
    'ctaText',
    'ctaAction',
    'ctaUrl',
    'backgroundColor',
    'textColor',
    'isActive',
    'priority',
    'validFrom',
    'validUntil',
    'targetAudience',
    'metadata',
  ];

  // Build update object with only provided fields
  const updates: any = {};
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      if (key === 'validFrom' || key === 'validUntil') {
        updates[key] = new Date(req.body[key]);
      } else if (key === 'targetAudience' && req.body[key]) {
        updates[key] = req.body[key];
      } else if (key === 'metadata' && req.body[key]) {
        // Merge with existing metadata - cast to any to handle typed schema
        const existingMetadata = banner.metadata as unknown as Record<string, unknown>;
        updates[key] = { ...existingMetadata, ...req.body[key] };
      } else {
        updates[key] = req.body[key];
      }
    }
  }

  // Validate date range if both dates are being updated
  const newValidFrom = updates.validFrom || banner.validFrom;
  const newValidUntil = updates.validUntil || banner.validUntil;
  if (new Date(newValidUntil) <= new Date(newValidFrom)) {
    return sendError(res, 'Valid until date must be after valid from date', 400);
  }

  const updatedBanner = await HeroBanner.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });

  // Invalidate cache
  await redisService.del('hero-banners:*');

  logger.info('[HeroBanner] Admin updated banner', {
    bannerId: id,
    updatedFields: Object.keys(updates),
  });

  sendSuccess(res, updatedBanner, 'Hero banner updated successfully');
});

/**
 * DELETE /api/hero-banners/admin/:id
 * Delete a hero banner
 */
export const deleteHeroBanner = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const banner = await HeroBanner.findById(id);
  if (!banner) {
    return sendError(res, 'Hero banner not found', 404);
  }

  await HeroBanner.findByIdAndDelete(id);

  // Invalidate cache
  await redisService.del('hero-banners:*');

  logger.info('[HeroBanner] Admin deleted banner', {
    bannerId: id,
    title: banner.title,
  });

  sendSuccess(res, { deletedId: id }, 'Hero banner deleted successfully');
});

/**
 * PATCH /api/hero-banners/admin/:id/toggle
 * Toggle isActive status of a hero banner
 */
export const toggleHeroBannerActive = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const banner = await HeroBanner.findById(id);
  if (!banner) {
    return sendError(res, 'Hero banner not found', 404);
  }

  banner.isActive = !banner.isActive;
  await banner.save();

  // Invalidate cache
  await redisService.del('hero-banners:*');

  logger.info('[HeroBanner] Admin toggled banner active status', {
    bannerId: id,
    newStatus: banner.isActive,
  });

  sendSuccess(
    res,
    {
      _id: banner._id,
      isActive: banner.isActive,
    },
    `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
  );
});
