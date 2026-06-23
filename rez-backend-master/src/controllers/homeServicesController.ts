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
 * Get home services categories for homepage section
 * GET /api/home-services/categories
 */
export const getHomeServicesCategories = asyncHandler(async (req: Request, res: Response) => {
  try {
    const categories = await ServiceCategory.find({
      isActive: true,
      slug: { $in: ['repair', 'cleaning', 'painting', 'carpentry', 'plumbing', 'electrical'] }
    })
      .select('name slug icon iconType cashbackPercentage serviceCount metadata')
      .sort({ sortOrder: 1 })
      .lean();

    // Transform to match frontend format
    const transformed = categories.map(cat => ({
      id: cat.slug,
      title: cat.name,
      icon: cat.icon,
      iconType: cat.iconType || 'emoji',
      color: cat.metadata?.color || '#3B82F6',
      count: `${cat.serviceCount || 0}+ services`,
      cashback: cat.cashbackPercentage
    }));

    return sendSuccess(res, transformed, 'Home services categories fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching home services categories:', error);
    return sendError(res, 'Failed to fetch home services categories', 500);
  }
});

/**
 * Get featured home services for homepage section
 * GET /api/home-services/featured
 */
export const getFeaturedHomeServices = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { limit = '6' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Get home services category
    const homeServicesCategory = await ServiceCategory.findOne({ slug: 'home-services' }).lean();
    if (!homeServicesCategory) {
      return sendSuccess(res, [], 'No home services found');
    }

    // Get child categories
    const childCategories = await ServiceCategory.find({
      parentCategory: homeServicesCategory._id,
      isActive: true
    }).select('_id').lean();

    const categoryIds = [homeServicesCategory._id, ...childCategories.map(c => c._id)];

    // Build query with region filter
    const query: any = {
      productType: 'service',
      isActive: true,
      isFeatured: true,
      isDeleted: { $ne: true },
      $or: [
        { serviceCategory: { $in: categoryIds } },
        { 'serviceDetails.serviceType': 'home' }
      ]
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

    return sendSuccess(res, services, 'Featured home services fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching featured home services:', error);
    return sendError(res, 'Failed to fetch featured home services', 500);
  }
});

/**
 * Get home services by category slug
 * GET /api/home-services/category/:slug
 */
export const getHomeServicesByCategory = asyncHandler(async (req: Request, res: Response) => {
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
    }, 'Home services fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching home services by category:', error);
    return sendError(res, 'Failed to fetch home services', 500);
  }
});

/**
 * Get home services stats for homepage
 * GET /api/home-services/stats
 */
export const getHomeServicesStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const homeServicesCategory = await ServiceCategory.findOne({ slug: 'home-services' }).lean();
    if (!homeServicesCategory) {
      return sendSuccess(res, {
        professionals: 0,
        maxCashback: 0,
        sameDayService: true
      }, 'Home services stats');
    }

    const categoryIds = await ServiceCategory.find({
      $or: [
        { _id: homeServicesCategory._id },
        { parentCategory: homeServicesCategory._id }
      ],
      isActive: true
    }).select('_id').lean();

    const serviceCount = await Product.countDocuments({
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      serviceCategory: { $in: categoryIds.map(c => c._id) }
    });

    // Get unique stores providing home services
    const stores = await Product.distinct('store', {
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      serviceCategory: { $in: categoryIds.map(c => c._id) }
    });

    const maxCashback = await ServiceCategory.find({
      $or: [
        { _id: homeServicesCategory._id },
        { parentCategory: homeServicesCategory._id }
      ],
      isActive: true
    })
      .sort({ cashbackPercentage: -1 })
      .limit(1)
      .select('cashbackPercentage')
      .lean();

    return sendSuccess(res, {
      professionals: stores.length || 200,
      maxCashback: maxCashback[0]?.cashbackPercentage || 30,
      sameDayService: true,
      serviceCount
    }, 'Home services stats fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching home services stats:', error);
    return sendError(res, 'Failed to fetch home services stats', 500);
  }
});

/**
 * Get popular home services (for homepage section)
 * GET /api/home-services/popular
 */
export const getPopularHomeServices = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    const homeServicesCategory = await ServiceCategory.findOne({ slug: 'home-services' }).lean();
    if (!homeServicesCategory) {
      return sendSuccess(res, [], 'No home services found');
    }

    const categoryIds = await ServiceCategory.find({
      $or: [
        { _id: homeServicesCategory._id },
        { parentCategory: homeServicesCategory._id }
      ],
      isActive: true
    }).select('_id').lean();

    // Build query with region filter
    const query: any = {
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      serviceCategory: { $in: categoryIds.map(c => c._id) }
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

    return sendSuccess(res, services, 'Popular home services fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching popular home services:', error);
    return sendError(res, 'Failed to fetch popular home services', 500);
  }
});

export default {
  getHomeServicesCategories,
  getFeaturedHomeServices,
  getHomeServicesByCategory,
  getHomeServicesStats,
  getPopularHomeServices
};
