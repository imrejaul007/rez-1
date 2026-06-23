import { Request, Response } from 'express';
import mongoose from 'mongoose';
import StoreExperience from '../models/StoreExperience';
import { logger } from '../config/logger';
import { Store } from '../models/Store';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { sendSuccess, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../middleware/errorHandler';
import { regionService, isValidRegion, RegionId } from '../services/regionService';

/**
 * Get all active store experiences
 * GET /api/experiences
 */
export const getExperiences = asyncHandler(async (req: Request, res: Response) => {
  const { featured, limit = 10, category } = req.query;

  try {
    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    const query: any = { isActive: true };

    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Filter by category slug if provided
    if (category && typeof category === 'string') {
      const categoryDoc = await Category.findOne({ slug: category }).lean();
      if (categoryDoc) {
        query.$or = query.$or || [];
        // Show experiences linked to this category or with no category set (global)
        query.category = { $in: [categoryDoc._id, category] };
      }
    }

    // Filter by region - show experiences that have no regions set (global) or include user's region
    if (region) {
      const regionFilter = [
        { regions: { $exists: false } },
        { regions: { $size: 0 } },
        { regions: region }
      ];
      if (query.$or) {
        // Combine with existing $or using $and
        query.$and = [{ $or: query.$or }, { $or: regionFilter }];
        delete query.$or;
      } else {
        query.$or = regionFilter;
      }
    }

    const experiences = await StoreExperience.find(query)
      .sort({ sortOrder: 1 })
      .limit(Number(limit))
      .lean();

    sendSuccess(res, {
      experiences,
      total: experiences.length,
    }, 'Store experiences retrieved successfully');

  } catch (error) {
    logger.error('❌ [EXPERIENCES] Error fetching experiences:', error);
    throw new AppError('Failed to fetch experiences', 500);
  }
});

/**
 * Get experience by slug or ID
 * GET /api/experiences/:experienceId
 */
export const getExperienceById = asyncHandler(async (req: Request, res: Response) => {
  const { experienceId } = req.params;

  try {
    const query = experienceId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: experienceId }
      : { slug: experienceId.toLowerCase() };

    const experience = await StoreExperience.findOne(query).lean();

    if (!experience) {
      return sendNotFound(res, 'Experience not found');
    }

    sendSuccess(res, experience, 'Experience retrieved successfully');

  } catch (error) {
    logger.error('❌ [EXPERIENCES] Error fetching experience:', error);
    throw new AppError('Failed to fetch experience', 500);
  }
});

/**
 * Get stores by experience type
 * GET /api/experiences/:experienceId/stores
 */
export const getStoresByExperience = asyncHandler(async (req: Request, res: Response) => {
  const { experienceId } = req.params;
  const { page = 1, limit = 20, location } = req.query;

  try {
    // Find the experience first
    const query = experienceId.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: experienceId }
      : { slug: experienceId.toLowerCase() };

    const experience = await StoreExperience.findOne(query).lean();

    if (!experience) {
      return sendNotFound(res, 'Experience not found');
    }

    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Check if there are manually assigned stores
    const assignedStoreIds = (experience as any).assignedStores || [];
    const hasAssignedStores = assignedStoreIds.length > 0;
    const hasFilterCriteria = experience.filterCriteria && (
      (experience.filterCriteria.tags && experience.filterCriteria.tags.length > 0) ||
      experience.filterCriteria.minRating ||
      (experience.filterCriteria as any).isPremium ||
      (experience.filterCriteria as any).isOrganic ||
      (experience.filterCriteria as any).isMall ||
      (experience.filterCriteria as any).isFastDelivery ||
      (experience.filterCriteria as any).isBudgetFriendly ||
      (experience.filterCriteria as any).isPartner ||
      (experience.filterCriteria as any).isVerified ||
      (experience.filterCriteria.categories && experience.filterCriteria.categories.length > 0)
    );

    // Build store query based on filter criteria OR assigned stores
    const storeQuery: any = { isActive: true };
    const filterCriteria = experience.filterCriteria;

    // NOTE: Region filter will be applied ONLY to filter-based query, not to assigned stores
    // This allows assigned stores from any region to appear
    let regionFilter: any = null;
    if (region) {
      regionFilter = regionService.getStoreFilter(region);
    }

    // If we have assigned stores but no filter criteria, only show assigned stores (NO region filter)
    if (hasAssignedStores && !hasFilterCriteria) {
      storeQuery._id = { $in: assignedStoreIds };
      // Don't apply region filter - assigned stores should show regardless of region
    }
    // If we have both, show assigned stores OR filter-matched stores
    else if (hasAssignedStores && hasFilterCriteria) {
      // We'll handle this with $or after building filter criteria
      // Region filter will be applied only to filter-based query in that branch
    }
    // If only filter criteria (no assigned stores), apply region filter
    else if (regionFilter) {
      Object.assign(storeQuery, regionFilter);
    }

    if (filterCriteria) {
      // Tags filter
      if (filterCriteria.tags && filterCriteria.tags.length > 0) {
        storeQuery.tags = { $in: filterCriteria.tags };
      }

      // Min rating filter
      if (filterCriteria.minRating) {
        storeQuery['ratings.average'] = { $gte: filterCriteria.minRating };
      }

      // Delivery category filters - use Store's deliveryCategories booleans
      if ((filterCriteria as any).isPremium === true) {
        storeQuery['deliveryCategories.premium'] = true;
      }
      if ((filterCriteria as any).isOrganic === true) {
        storeQuery['deliveryCategories.organic'] = true;
      }
      if ((filterCriteria as any).isMall === true) {
        storeQuery['deliveryCategories.mall'] = true;
      }
      if ((filterCriteria as any).isFastDelivery === true) {
        storeQuery['deliveryCategories.fastDelivery'] = true;
      }
      if ((filterCriteria as any).isBudgetFriendly === true) {
        storeQuery['deliveryCategories.budgetFriendly'] = true;
      }

      // Partner filter
      if ((filterCriteria as any).isPartner === true) {
        storeQuery['offers.isPartner'] = true;
      }

      // Verified filter
      if ((filterCriteria as any).isVerified === true) {
        storeQuery.isVerified = true;
      }

      // Categories filter
      if (filterCriteria.categories && filterCriteria.categories.length > 0) {
        // Support both ObjectIds and category names
        const categoryIds = filterCriteria.categories.filter(
          (c: any) => mongoose.Types.ObjectId.isValid(c)
        );
        const categoryNames = filterCriteria.categories.filter(
          (c: any) => !mongoose.Types.ObjectId.isValid(c)
        );

        let allCategoryIds: any[] = [...categoryIds];

        if (categoryNames.length > 0) {
          const categories = await Category.find({
            $or: [
              { name: { $in: categoryNames } },
              { slug: { $in: categoryNames } },
            ]
          }).select('_id').lean();
          allCategoryIds = [...allCategoryIds, ...categories.map((c: any) => c._id)];
        }

        if (allCategoryIds.length > 0) {
          storeQuery.category = { $in: allCategoryIds };
        } else {
          // If filter specifies categories but none found, return no stores
          storeQuery.category = { $in: [] };
        }
      }
    }

    // Handle location-based filtering
    let userLng: number | undefined;
    let userLat: number | undefined;
    if (location) {
      const [lng, lat] = (location as string).split(',').map(Number);
      if (!isNaN(lng) && !isNaN(lat)) {
        userLng = lng;
        userLat = lat;
        const radiusInRadians = 10 / 6371; // 10km radius
        storeQuery['location.coordinates'] = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radiusInRadians],
          },
        };
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Handle keyword search
    const { q } = req.query;
    if (q) {
      const escapedQ = (q as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedQ, 'i');
      storeQuery.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }

    // If we have both assigned stores AND filter criteria, include both with $or
    let finalQuery = storeQuery;
    if (hasAssignedStores && hasFilterCriteria && !storeQuery._id) {
      // Clone storeQuery for filter-based matching
      const filterBasedQuery = { ...storeQuery };

      // Apply region filter ONLY to filter-based query (not to assigned stores)
      if (regionFilter) {
        Object.assign(filterBasedQuery, regionFilter);
      }

      // Create query that matches either:
      // 1. Manually assigned stores (only need to be active, no other filters)
      // 2. OR filter-matched stores (with all filter criteria including region)
      finalQuery = {
        $or: [
          { _id: { $in: assignedStoreIds }, isActive: true },
          filterBasedQuery
        ]
      };
    }
    // If only assigned stores (no filter criteria), storeQuery already has _id filter set

    const [storesRaw, total] = await Promise.all([
      Store.find(finalQuery)
        .populate({ path: 'category', select: 'name slug' })
        .sort({ 'ratings.average': -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Store.countDocuments(finalQuery),
    ]);

    // Enhance store data for frontend - REAL DATA ONLY
    const stores = storesRaw.map((store: any) => {
      // Calculate real distance only if user location provided
      let distance: string | null = null;
      if (userLng && userLat && store.location?.coordinates) {
        const [storeLng, storeLat] = store.location.coordinates;
        const dist = Math.sqrt(
          Math.pow(storeLng - userLng, 2) + Math.pow(storeLat - userLat, 2)
        ) * 111; // Rough estimation in km
        distance = `${dist.toFixed(1)} km`;
      } else if (store.location?.distance) {
        distance = store.location.distance;
      }

      // Build real offer text from actual data
      let offer: string | null = null;
      if (store.offers?.offer) {
        offer = store.offers.offer;
      } else if (store.offers?.cashback && store.offers.cashback > 0) {
        offer = `${store.offers.cashback}% Cashback`;
      } else if (store.offers?.discount && store.offers.discount > 0) {
        offer = `${store.offers.discount}% Off`;
      }

      return {
        ...store,
        id: store._id,
        image: store.logo || store.image || store.banner || null,
        distance: distance,
        rating: store.ratings?.average || null, // Real rating only
        reviewCount: store.ratings?.count || 0,
        offer: offer,
        cashback: store.offers?.cashback || null, // Raw cashback percentage for stats calculation
      };
    });

    const totalPages = Math.ceil(total / Number(limit));

    sendSuccess(res, {
      experience,
      stores,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
        hasNext: Number(page) < totalPages,
        hasPrev: Number(page) > 1,
      },
    }, 'Stores for experience retrieved successfully');

  } catch (error) {
    logger.error('❌ [EXPERIENCES] Error fetching stores by experience:', error);
    throw new AppError('Failed to fetch stores', 500);
  }
});

/**
 * Get experiences for homepage store experiences section
 * GET /api/experiences/homepage
 */
export const getHomepageExperiences = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 4 } = req.query;

  try {
    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    const query: any = {
      isActive: true,
      isFeatured: true,
    };

    // Filter by region - show experiences that have no regions set (global) or include user's region
    if (region) {
      query.$or = [
        { regions: { $exists: false } },
        { regions: { $size: 0 } },
        { regions: region }
      ];
    }

    const experiences = await StoreExperience.find(query)
      .sort({ sortOrder: 1 })
      .limit(Number(limit))
      .lean();

    // Format for frontend StoreExperiencesSection
    const formattedExperiences = experiences.map(exp => ({
      icon: exp.icon,
      title: exp.title,
      type: exp.type,
      badge: exp.badge,
      subtitle: exp.subtitle,
      slug: exp.slug,
    }));

    sendSuccess(res, {
      experiences: formattedExperiences,
      total: formattedExperiences.length,
    }, 'Homepage experiences retrieved successfully');

  } catch (error) {
    logger.error('❌ [EXPERIENCES] Error fetching homepage experiences:', error);
    throw new AppError('Failed to fetch experiences', 500);
  }
});

/**
 * Get Unique Finds for "Think Outside the Box" section
 * GET /api/experiences/unique-finds
 */
export const getUniqueFinds = asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10, experience } = req.query;

  try {
    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Strategy: Find products with stock that are active
    const query: any = {
      isActive: true,
      'inventory.stock': { $gt: 0 },
    };

    // Add region filter by finding stores in region first
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      query.store = { $in: storeIds };
    }

    // Filter by experience type if provided
    if (experience) {
      const slug = (experience as string).toLowerCase();

      // Define filters based on experience slug
      if (slug.includes('fast') || slug.includes('delivery')) {
        query.tags = { $in: ['fast', 'express', 'essential', 'grocery'] };
      } else if (slug.includes('luxury') || slug.includes('premium')) {
        query.tags = { $in: ['luxury', 'premium', 'designer', 'gold'] };
        // Also filter by high price for luxury
        query['pricing.selling'] = { $gt: 2000 };
      } else if (slug.includes('sample') || slug.includes('trial')) {
        query.tags = { $in: ['sample', 'trial', 'tester', 'mini'] };
      } else if (slug.includes('organic') || slug.includes('green')) {
        query.tags = { $in: ['organic', 'natural', 'eco', 'sustainable'] };
      } else if (slug.includes('men')) {
        query.tags = { $in: ['men', 'male', 'grooming', 'fashion'] };
      } else if (slug.includes('women')) {
        query.tags = { $in: ['women', 'female', 'beauty', 'fashion'] };
      } else if (slug.includes('kid') || slug.includes('child')) {
        query.tags = { $in: ['kids', 'toys', 'baby', 'games'] };
      } else if (slug.includes('gift')) {
        query.tags = { $in: ['gift', 'present', 'hamper'] };
      }
      // If no specific tag mapping, we default to showing best rated products
    }

    // Handle keyword search
    const { q } = req.query;
    if (q) {
      const escapedQ = (q as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedQ, 'i');
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }

    const products = await (Product as any).find(query)
      .sort({ 'ratings.average': -1 }) // Highest rated first
      .select('name category pricing images ratings tags')
      .populate('category', 'name')
      .limit(Number(limit))
      .lean();

    // Get currency symbol based on region
    const getCurrencySymbol = (reg: RegionId | undefined, productCurrency?: string): string => {
      // If product has explicit currency, use that
      if (productCurrency === 'USD') return '$';
      if (productCurrency === 'AED') return 'د.إ';
      if (productCurrency === 'CNY') return '¥';
      if (productCurrency === 'INR') return '₹';

      // Otherwise, use region's default currency
      switch (reg) {
        case 'dubai': return 'د.إ';
        case 'bangalore':
        default: return '₹';
      }
    };

    const formattedProducts = products.map((p: any) => ({
      id: p._id,
      title: p.name,
      category: (p.category as any)?.name || 'General',
      price: p.pricing.selling === 0 ? 'Free' : `${getCurrencySymbol(region, p.pricing.currency)}${p.pricing.selling}`,
      image: p.images?.[0] || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=300',
      rating: p.ratings?.average || 4.5
    }));

    sendSuccess(res, formattedProducts, 'Unique finds retrieved successfully');
  } catch (error) {
    logger.error('❌ [EXPERIENCES] Error fetching unique finds:', error);
    throw new AppError('Failed to fetch unique finds', 500);
  }
});
