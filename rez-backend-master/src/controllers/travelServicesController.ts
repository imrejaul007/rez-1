import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { ServiceCategory } from '../models/ServiceCategory';
import { Store } from '../models/Store';
import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { regionService, isValidRegion, RegionId } from '../services/regionService';

/**
 * Get travel service categories for homepage section
 * GET /api/travel-services/categories
 */
export const getTravelServicesCategories = asyncHandler(async (req: Request, res: Response) => {
  try {
    const categories = await ServiceCategory.find({
      isActive: true,
      slug: { $in: ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages'] }
    })
      .select('name slug icon iconType cashbackPercentage metadata')
      .sort({ sortOrder: 1 })
      .lean();

    // Get live counts from actual Product documents per category
    const categoryIds = categories.map(c => c._id);
    const liveCounts = await Product.aggregate([
      {
        $match: {
          productType: 'service',
          isActive: true,
          isDeleted: { $ne: true },
          serviceCategory: { $in: categoryIds },
        },
      },
      { $group: { _id: '$serviceCategory', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    for (const item of liveCounts) {
      countMap[item._id.toString()] = item.count;
    }

    // Transform to match frontend format
    const transformed = categories.map(cat => ({
      id: cat.slug,
      title: cat.name,
      icon: cat.icon,
      color: cat.metadata?.color || '#3B82F6',
      count: `${countMap[cat._id.toString()] || 0}+ options`,
      cashback: cat.cashbackPercentage
    }));

    return sendSuccess(res, transformed, 'Travel service categories fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching travel service categories:', error);
    return sendError(res, 'Failed to fetch travel service categories', 500);
  }
});

/**
 * Get featured travel services for homepage section
 * GET /api/travel-services/featured
 */
export const getFeaturedTravelServices = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { limit = '6' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Get travel service categories directly (flights, hotels, trains, bus, cab, packages)
    const travelCategorySlugs = ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages'];
    const travelCategories = await ServiceCategory.find({
      slug: { $in: travelCategorySlugs },
      isActive: true
    }).select('_id').lean();

    if (travelCategories.length === 0) {
      return sendSuccess(res, [], 'No travel services found');
    }

    const categoryIds = travelCategories.map(c => c._id);

    // Build query with region filter
    const query: any = {
      productType: 'service',
      isActive: true,
      isFeatured: true,
      isDeleted: { $ne: true },
      serviceCategory: { $in: categoryIds }
    };

    // Add region filter by finding stores in region first
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      query.store = { $in: storeIds };
    }

    const services = await Product.find(query)
      .populate('store', 'name logo location contact operationalInfo')
      .populate('serviceCategory', 'name icon cashbackPercentage slug')
      .sort({ 'ratings.average': -1, 'analytics.purchases': -1 })
      .limit(limitNum)
      .lean();

    return sendSuccess(res, services, 'Featured travel services fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching featured travel services:', error);
    return sendError(res, 'Failed to fetch featured travel services', 500);
  }
});

/**
 * Get travel services by category slug
 * GET /api/travel-services/category/:slug
 */
export const getTravelServicesByCategory = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const {
      page = '1',
      limit = '20',
      sortBy = 'rating',
      minPrice,
      maxPrice,
      rating
    } = req.query;

    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Find category
    const category = await ServiceCategory.findOne({ slug, isActive: true }).lean();
    if (!category) {
      return sendNotFound(res, 'Category not found');
    }

    // Build query
    const query: any = {
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      serviceCategory: category._id
    };

    // Add region filter by finding stores in region first
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      query.store = { $in: storeIds };
    }

    // Price filter
    if (minPrice || maxPrice) {
      query['pricing.selling'] = {};
      if (minPrice) query['pricing.selling'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.selling'].$lte = Number(maxPrice);
    }

    // Rating filter
    if (rating) {
      query['ratings.average'] = { $gte: Number(rating) };
    }

    // Sorting
    let sortOptions: any = {};
    switch (sortBy) {
      case 'price_low':
        sortOptions = { 'pricing.selling': 1 };
        break;
      case 'price_high':
        sortOptions = { 'pricing.selling': -1 };
        break;
      case 'rating':
        sortOptions = { 'ratings.average': -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'popular':
        sortOptions = { 'analytics.purchases': -1 };
        break;
      default:
        sortOptions = { 'ratings.average': -1, createdAt: -1 };
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [services, total] = await Promise.all([
      Product.find(query)
        .populate('store', 'name logo location contact operationalInfo')
        .populate('serviceCategory', 'name icon cashbackPercentage slug')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    return sendSuccess(res, {
      services,
      category: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        description: category.description,
        cashbackPercentage: category.cashbackPercentage
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Travel services fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching travel services by category:', error);
    return sendError(res, 'Failed to fetch travel services', 500);
  }
});

/**
 * Get travel services stats for homepage
 * GET /api/travel-services/stats
 */
export const getTravelServicesStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get travel service categories directly (flights, hotels, trains, bus, cab, packages)
    const travelCategorySlugs = ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages'];
    const travelCategories = await ServiceCategory.find({
      slug: { $in: travelCategorySlugs },
      isActive: true
    }).select('_id cashbackPercentage').lean();

    // Configurable coin multiplier — can be overridden via environment variable
    const coinMultiplier = Number(process.env.TRAVEL_COIN_MULTIPLIER) || 2;

    if (travelCategories.length === 0) {
      return sendSuccess(res, {
        hotels: 0,
        maxCashback: 0,
        serviceCount: 0,
        coinMultiplier
      }, 'Travel services stats');
    }

    const categoryIds = travelCategories.map(c => c._id);

    const serviceCount = await Product.countDocuments({
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      serviceCategory: { $in: categoryIds }
    });

    // Get hotel count specifically
    const hotelsCategory = travelCategories.find(c => {
      const cat = travelCategories.find(tc => tc._id.toString() === c._id.toString());
      return cat;
    });
    const hotelsCategoryId = await ServiceCategory.findOne({ slug: 'hotels' }).select('_id').lean();
    const hotelCount = hotelsCategoryId ? await Product.countDocuments({
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      serviceCategory: hotelsCategoryId._id
    }) : 0;

    // Get max cashback from travel categories
    const maxCashback = travelCategories.length > 0
      ? Math.max(...travelCategories.map(c => c.cashbackPercentage || 0))
      : 0;

    return sendSuccess(res, {
      hotels: hotelCount,
      maxCashback,
      serviceCount,
      coinMultiplier
    }, 'Travel services stats fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching travel services stats:', error);
    return sendError(res, 'Failed to fetch travel services stats', 500);
  }
});

/**
 * Get popular travel services (for homepage section)
 * GET /api/travel-services/popular
 */
export const getPopularTravelServices = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Get travel service categories directly (flights, hotels, trains, bus, cab, packages)
    const travelCategorySlugs = ['flights', 'hotels', 'trains', 'bus', 'cab', 'packages'];
    const travelCategories = await ServiceCategory.find({
      slug: { $in: travelCategorySlugs },
      isActive: true
    }).select('_id').lean();

    if (travelCategories.length === 0) {
      return sendSuccess(res, [], 'No travel services found');
    }

    const categoryIds = travelCategories.map(c => c._id);

    // Build query with region filter
    const query: any = {
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      serviceCategory: { $in: categoryIds }
    };

    // Add region filter by finding stores in region first
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      query.store = { $in: storeIds };
    }

    const services = await Product.find(query)
      .populate('store', 'name logo location')
      .populate('serviceCategory', 'name icon cashbackPercentage slug')
      .sort({ 'analytics.purchases': -1, 'ratings.average': -1 })
      .limit(limitNum)
      .lean();

    return sendSuccess(res, services, 'Popular travel services fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching popular travel services:', error);
    return sendError(res, 'Failed to fetch popular travel services', 500);
  }
});

export default {
  getTravelServicesCategories,
  getFeaturedTravelServices,
  getTravelServicesByCategory,
  getTravelServicesStats,
  getPopularTravelServices
};
