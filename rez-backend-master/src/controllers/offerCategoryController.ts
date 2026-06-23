import { logger } from '../config/logger';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import OfferCategory from '../models/OfferCategory';
import Offer from '../models/Offer';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { validateSortField } from '../utils/sanitize';

/**
 * GET /api/offer-categories
 * Get all active offer categories
 */
export const getOfferCategories = asyncHandler(async (req: Request, res: Response) => {
    const { featured, parent } = req.query;

    let categories;
    if (featured === 'true') {
      categories = await OfferCategory.findFeaturedCategories();
    } else if (parent === 'true') {
      categories = await OfferCategory.findParentCategories();
    } else {
      categories = await OfferCategory.findActiveCategories();
    }

    sendSuccess(res, categories, 'Offer categories fetched successfully');
});

/**
 * GET /api/offer-categories/featured
 * Get featured categories
 */
export const getFeaturedCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await OfferCategory.findFeaturedCategories();

    sendSuccess(res, categories, 'Featured categories fetched successfully');
});

/**
 * GET /api/offer-categories/parents
 * Get parent categories only
 */
export const getParentCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await OfferCategory.findParentCategories();

    sendSuccess(res, categories, 'Parent categories fetched successfully');
});

/**
 * GET /api/offer-categories/:slug
 * Get category by slug
 */
export const getOfferCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const category = await OfferCategory.findBySlug(slug);

    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    // Get active offers count for this category
    const activeOffersCount = await category.getActiveOffersCount();

    const categoryWithCount = {
      ...category.toObject(),
      activeOffersCount
    };

    sendSuccess(res, categoryWithCount, 'Category fetched successfully');
});

/**
 * GET /api/offer-categories/:parentId/subcategories
 * Get subcategories of a parent category
 */
export const getSubcategories = asyncHandler(async (req: Request, res: Response) => {
    const { parentId } = req.params;

    const subcategories = await OfferCategory.findSubcategories(new mongoose.Types.ObjectId(parentId));

    sendSuccess(res, subcategories, 'Subcategories fetched successfully');
});

/**
 * GET /api/offer-categories/:slug/offers
 * Get offers by category slug
 */
export const getOffersByCategorySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc', lat, lng } = req.query;

    // Find category by slug
    const category = await OfferCategory.findBySlug(slug);
    if (!category) {
      return sendError(res, 'Category not found', 404);
    }

    // Build filter query
    const filter: any = {
      category: category.name.toLowerCase(),
      'validity.isActive': true,
      'validity.startDate': { $lte: new Date() },
      'validity.endDate': { $gte: new Date() }
    };

    // Sort options (whitelist to prevent sort field injection)
    const ALLOWED_SORT_FIELDS = ['createdAt', 'title', 'metadata.priority', 'cashbackPercentage', 'distance'] as const;
    const safeSortBy = validateSortField(sortBy as string, ALLOWED_SORT_FIELDS, 'createdAt');
    const sortOptions: any = {};
    if (safeSortBy === 'distance' && lat && lng) {
      // For distance sorting, we'll sort after calculating distances
      sortOptions['metadata.priority'] = -1;
    } else {
      sortOptions[safeSortBy] = order === 'asc' ? 1 : -1;
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .populate('store.id', 'name logo rating')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Offer.countDocuments(filter)
    ]);

    // Calculate distances if location provided
    let offersWithDistance = offers;
    if (lat && lng) {
      const userLocation: [number, number] = [Number(lng), Number(lat)];
      offersWithDistance = offers.map(offer => {
        const offerDoc = new Offer(offer);
        return {
          ...offer,
          distance: offerDoc.calculateDistance(userLocation)
        };
      });

      // Sort by distance if requested
      if (sortBy === 'distance') {
        offersWithDistance.sort((a, b) => {
          const distanceA = a.distance || Infinity;
          const distanceB = b.distance || Infinity;
          return order === 'asc' ? distanceA - distanceB : distanceB - distanceA;
        });
      }
    }

    sendPaginated(res, offersWithDistance, pageNum, limitNum, total, 'Category offers fetched successfully');
});
