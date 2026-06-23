import { Request, Response } from 'express';
import { ServiceCategory } from '../models/ServiceCategory';
import { Product } from '../models/Product';
import { logger } from '../config/logger';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Get all active service categories
 * GET /api/service-categories
 */
export const getServiceCategories = asyncHandler(async (req: Request, res: Response) => {
    const { includeCount = 'true' } = req.query;

    let categories;

    if (includeCount === 'true') {
      // Get categories with actual service counts
      categories = await ServiceCategory.aggregate([
        { $match: { isActive: true, parentCategory: null } },
        {
          $lookup: {
            from: 'products',
            let: { categoryId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$serviceCategory', '$$categoryId'] },
                      { $eq: ['$productType', 'service'] },
                      { $eq: ['$isActive', true] },
                      { $ne: ['$isDeleted', true] }
                    ]
                  }
                }
              }
            ],
            as: 'services'
          }
        },
        {
          $addFields: {
            serviceCount: { $size: '$services' }
          }
        },
        {
          $project: {
            services: 0
          }
        },
        { $sort: { sortOrder: 1, name: 1 } }
      ]);
    } else {
      categories = await ServiceCategory.find({
        isActive: true,
        parentCategory: null
      }).sort({ sortOrder: 1, name: 1 }).lean();
    }

    res.status(200).json({
      success: true,
      data: categories,
      count: categories.length
    });
});

/**
 * Get a single service category by slug
 * GET /api/service-categories/:slug
 */
export const getServiceCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const category = await ServiceCategory.findOne({
      slug,
      isActive: true
    }).populate('childCategories').lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }

    // Get service count for this category
    const serviceCount = await Product.countDocuments({
      serviceCategory: category._id,
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true }
    });

    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        serviceCount
      }
    });
});

/**
 * Get services in a category
 * GET /api/service-categories/:slug/services
 */
export const getServicesInCategory = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const {
      page = '1',
      limit = '20',
      sortBy = 'rating',
      minPrice,
      maxPrice,
      serviceType
    } = req.query;

    // Find the category
    const category = await ServiceCategory.findOne({ slug, isActive: true }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Service category not found'
      });
    }

    // Build query
    const query: any = {
      serviceCategory: category._id,
      productType: 'service',
      isActive: true,
      isDeleted: { $ne: true }
    };

    // Price filter
    if (minPrice || maxPrice) {
      query['pricing.selling'] = {};
      if (minPrice) query['pricing.selling'].$gte = Number(minPrice);
      if (maxPrice) query['pricing.selling'].$lte = Number(maxPrice);
    }

    // Service type filter
    if (serviceType) {
      query['serviceDetails.serviceType'] = serviceType;
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
        .populate('serviceCategory', 'name icon cashbackPercentage')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        services,
        category: {
          _id: category._id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
          cashbackPercentage: category.cashbackPercentage,
          description: category.description
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
});

/**
 * Get all child categories of a parent category
 * GET /api/service-categories/:slug/children
 */
export const getChildCategories = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const parentCategory = await ServiceCategory.findOne({ slug, isActive: true }).lean();

    if (!parentCategory) {
      return res.status(404).json({
        success: false,
        message: 'Parent category not found'
      });
    }

    const childCategories = await ServiceCategory.find({
      parentCategory: parentCategory._id,
      isActive: true
    }).sort({ sortOrder: 1, name: 1 }).lean();

    res.status(200).json({
      success: true,
      data: childCategories,
      parent: {
        _id: parentCategory._id,
        name: parentCategory.name,
        slug: parentCategory.slug
      }
    });
});

// Export all controller functions
export default {
  getServiceCategories,
  getServiceCategoryBySlug,
  getServicesInCategory,
  getChildCategories
};
