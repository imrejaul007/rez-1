import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { ServiceCategory } from '../models/ServiceCategory';
import { Store } from '../models/Store';
import { logger } from '../config/logger';
import { sendSuccess, sendError, sendNotFound } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { escapeRegex } from '../utils/sanitize';
import { regionService, isValidRegion, RegionId } from '../services/regionService';

// Financial service category slugs
const FINANCIAL_CATEGORY_SLUGS = ['bills', 'ott', 'recharge', 'gold', 'insurance', 'offers'];

/**
 * Get financial services categories
 * GET /api/financial-services/categories
 */
export const getFinancialCategories = asyncHandler(async (req: Request, res: Response) => {
  try {
    const categories = await ServiceCategory.find({
      isActive: true,
      slug: { $in: FINANCIAL_CATEGORY_SLUGS }
    })
      .select('name slug icon iconType cashbackPercentage maxCashback serviceCount metadata')
      .sort({ sortOrder: 1 })
      .lean();

    // Transform to match frontend format
    const transformed = categories.map(cat => ({
      _id: cat._id,
      id: cat.slug,
      name: cat.name,
      slug: cat.slug,
      icon: cat.icon,
      iconType: cat.iconType,
      color: cat.metadata?.color || '#3B82F6',
      cashbackPercentage: cat.cashbackPercentage,
      maxCashback: cat.maxCashback,
      serviceCount: cat.serviceCount || 0,
      metadata: cat.metadata,
    }));

    return sendSuccess(res, transformed, 'Financial services categories fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching financial services categories:', error);
    return sendError(res, 'Failed to fetch financial services categories', 500);
  }
});

/**
 * Get featured financial services
 * GET /api/financial-services/featured
 */
export const getFeaturedFinancialServices = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { limit = '6' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Get financial service categories
    const financialCategories = await ServiceCategory.find({
      slug: { $in: FINANCIAL_CATEGORY_SLUGS },
      isActive: true
    }).select('_id').lean();

    const categoryIds = financialCategories.map(c => c._id);

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
      .populate('store', 'name logo')
      .populate('serviceCategory', 'name icon cashbackPercentage slug')
      .select('name slug description shortDescription images pricing cashback ratings serviceDetails serviceCategory store')
      .sort({ 'ratings.average': -1, 'analytics.purchases': -1 })
      .limit(limitNum)
      .lean();

    return sendSuccess(res, services, 'Featured financial services fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching featured financial services:', error);
    return sendError(res, 'Failed to fetch featured financial services', 500);
  }
});

/**
 * Get financial services statistics
 * GET /api/financial-services/stats
 */
export const getFinancialStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Get financial service categories
    const financialCategories = await ServiceCategory.find({
      slug: { $in: FINANCIAL_CATEGORY_SLUGS },
      isActive: true
    }).select('_id').lean();

    const categoryIds = financialCategories.map(c => c._id);

    // Get total services count
    const totalServices = await Product.countDocuments({
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      serviceCategory: { $in: categoryIds }
    });

    // Get max cashback percentage
    const maxCashbackCategory = await ServiceCategory.findOne({
      slug: { $in: FINANCIAL_CATEGORY_SLUGS },
      isActive: true
    })
      .sort({ cashbackPercentage: -1 })
      .select('cashbackPercentage')
      .lean();

    // Get total billers (services in bills category)
    const billsCategory = await ServiceCategory.findOne({ slug: 'bills' }).lean();
    const totalBillers = billsCategory ? await Product.countDocuments({
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      serviceCategory: billsCategory._id
    }) : 0;

    const stats = {
      totalServices,
      totalCategories: financialCategories.length,
      maxCashback: maxCashbackCategory?.cashbackPercentage || 10,
      totalBillers,
    };

    return sendSuccess(res, stats, 'Financial services statistics fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching financial services statistics:', error);
    return sendError(res, 'Failed to fetch financial services statistics', 500);
  }
});

/**
 * Get financial services by category slug
 * GET /api/financial-services/category/:slug
 */
export const getFinancialServicesByCategory = asyncHandler(async (req: Request, res: Response) => {
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

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Validate category slug
    if (!FINANCIAL_CATEGORY_SLUGS.includes(slug)) {
      return sendNotFound(res, 'Financial service category not found');
    }

    // Get category
    const category = await ServiceCategory.findOne({
      slug,
      isActive: true
    }).lean();

    if (!category) {
      return sendNotFound(res, 'Financial service category not found');
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

    // Price filters
    if (minPrice) {
      query['pricing.selling'] = { $gte: parseFloat(minPrice as string) };
    }
    if (maxPrice) {
      query['pricing.selling'] = {
        ...query['pricing.selling'],
        $lte: parseFloat(maxPrice as string)
      };
    }

    // Rating filter
    if (rating) {
      query['ratings.average'] = { $gte: parseFloat(rating as string) };
    }

    // Build sort
    let sort: any = {};
    switch (sortBy) {
      case 'price_low':
        sort = { 'pricing.selling': 1 };
        break;
      case 'price_high':
        sort = { 'pricing.selling': -1 };
        break;
      case 'rating':
        sort = { 'ratings.average': -1, 'ratings.count': -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'popular':
        sort = { 'analytics.purchases': -1, 'analytics.views': -1 };
        break;
      default:
        sort = { 'ratings.average': -1 };
    }

    // Get services
    const [services, total] = await Promise.all([
      Product.find(query)
        .populate('store', 'name logo')
        .populate('serviceCategory', 'name icon cashbackPercentage slug')
        .select('name slug description shortDescription images pricing cashback ratings serviceDetails serviceCategory store analytics')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    return sendSuccess(res, {
      services,
      category,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    }, 'Financial services fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching financial services by category:', error);
    return sendError(res, 'Failed to fetch financial services', 500);
  }
});

/**
 * Get financial service by ID
 * GET /api/financial-services/:id
 */
export const getFinancialServiceById = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendNotFound(res, 'Invalid service ID');
    }

    const service = await Product.findOne({
      _id: id,
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true }
    })
      .populate('store', 'name logo location contact')
      .populate('serviceCategory', 'name icon cashbackPercentage slug')
      .lean();

    if (!service) {
      return sendNotFound(res, 'Financial service not found');
    }

    // Verify it's a financial service
    const serviceCategoryId = (service as any).serviceCategory?._id || (service as any).serviceCategory;
    if (serviceCategoryId) {
      const category = await ServiceCategory.findById(serviceCategoryId).lean();
      if (!category || !FINANCIAL_CATEGORY_SLUGS.includes(category.slug)) {
        return sendNotFound(res, 'Financial service not found');
      }
    }

    return sendSuccess(res, service, 'Financial service fetched successfully');
  } catch (error: any) {
    logger.error('Error fetching financial service by ID:', error);
    return sendError(res, 'Failed to fetch financial service', 500);
  }
});

/**
 * Search financial services
 * GET /api/financial-services/search
 */
export const searchFinancialServices = asyncHandler(async (req: Request, res: Response) => {
  try {
    const {
      q,
      category,
      page = '1',
      limit = '20',
      sortBy = 'relevance'
    } = req.query;

    if (!q || (q as string).trim().length === 0) {
      return sendError(res, 'Search query is required', 400);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get region from X-Rez-Region header
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Get financial service categories
    let categoryIds: any[] = [];
    if (category) {
      const cat = await ServiceCategory.findOne({
        slug: category,
        isActive: true
      }).lean();
      if (cat) {
        categoryIds = [cat._id];
      }
    } else {
      const financialCategories = await ServiceCategory.find({
        slug: { $in: FINANCIAL_CATEGORY_SLUGS },
        isActive: true
      }).select('_id').lean();
      categoryIds = financialCategories.map(c => c._id);
    }

    // Build search query
    const escaped = escapeRegex(String(q).substring(0, 200));
    const searchQuery: any = {
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true },
      serviceCategory: { $in: categoryIds },
      $or: [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
        { shortDescription: { $regex: escaped, $options: 'i' } },
        { tags: { $in: [new RegExp(escaped, 'i')] } }
      ]
    };

    // Add region filter by finding stores in region first
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      searchQuery.store = { $in: storeIds };
    }

    // Build sort
    let sort: any = {};
    switch (sortBy) {
      case 'price_low':
        sort = { 'pricing.selling': 1 };
        break;
      case 'price_high':
        sort = { 'pricing.selling': -1 };
        break;
      case 'rating':
        sort = { 'ratings.average': -1 };
        break;
      case 'newest':
        sort = { createdAt: -1 };
        break;
      default:
        sort = { 'ratings.average': -1, 'analytics.purchases': -1 };
    }

    // Get services
    const [services, total] = await Promise.all([
      Product.find(searchQuery)
        .populate('store', 'name logo')
        .populate('serviceCategory', 'name icon cashbackPercentage slug')
        .select('name slug description shortDescription images pricing cashback ratings serviceDetails serviceCategory store')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(searchQuery)
    ]);

    return sendSuccess(res, {
      services,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      query: q
    }, 'Financial services search completed successfully');
  } catch (error: any) {
    logger.error('Error searching financial services:', error);
    return sendError(res, 'Failed to search financial services', 500);
  }
});
