/**
 * Cash Store Controller
 *
 * Handles Cash Store browsing endpoints:
 * - Dynamic categories for filter row
 * - Brands filtered by category/special filters
 * - Brand search
 * - Aggregated homepage data (single call)
 *
 * Delegates to mallService for all data access (MallBrand + MallCategory).
 *
 * NOTE: Caching is handled by cacheMiddleware on routes (cashStoreRoutes.ts).
 * Do NOT add manual redisService.get/set here — it causes double caching.
 */

import { Request, Response } from 'express';
import mallService from '../services/mallService';
import { logger } from '../config/logger';
import { sendSuccess, sendError } from '../utils/response';
import { MallOffer } from '../models/MallOffer';
import { asyncHandler } from '../utils/asyncHandler';

// Sort option mapping
const SORT_OPTIONS: Record<string, Record<string, 1 | -1>> = {
  'rating': { 'ratings.average': -1 },
  'cashback-high': { 'cashback.percentage': -1 },
  'cashback-low': { 'cashback.percentage': 1 },
  'name-asc': { name: 1 },
  'newest': { createdAt: -1 },
};

// Virtual filter entries prepended to real categories
const VIRTUAL_FILTERS = [
  {
    _id: 'all',
    slug: 'all',
    name: 'All',
    icon: 'grid-outline',
    color: '#1a3a52',
    backgroundColor: '#faf1e0',
    maxCashback: 0,
    sortOrder: -2,
    brandCount: 0,
    isActive: true,
    isFeatured: false,
    isSpecialFilter: true,
  },
  {
    _id: 'most-popular',
    slug: 'most-popular',
    name: 'Popular',
    icon: 'star',
    color: '#E8B896',
    backgroundColor: '#faf1e0',
    maxCashback: 0,
    sortOrder: -1,
    brandCount: 0,
    isActive: true,
    isFeatured: false,
    isSpecialFilter: true,
  },
  {
    _id: 'high-cashback',
    slug: 'high-cashback',
    name: 'High Cashback',
    icon: 'flame',
    color: '#E8B896',
    backgroundColor: '#ffd7b5',
    maxCashback: 0,
    sortOrder: 0,
    brandCount: 0,
    isActive: true,
    isFeatured: false,
    isSpecialFilter: true,
  },
];

/**
 * GET /api/cashstore/categories
 * Returns active MallCategories with virtual filters prepended
 */
export const getCashStoreCategories = asyncHandler(async (req: Request, res: Response) => {
    const dbCategories = await mallService.getCategories();

    // Map DB categories to include isSpecialFilter: false
    const mappedCategories = dbCategories.map((cat: any) => ({
      _id: cat._id,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      backgroundColor: cat.backgroundColor || '#dfebf7',
      maxCashback: cat.maxCashback || 0,
      sortOrder: cat.sortOrder,
      brandCount: cat.brandCount || 0,
      isActive: cat.isActive,
      isFeatured: cat.isFeatured,
      isSpecialFilter: false,
    }));

    const allCategories = [...VIRTUAL_FILTERS, ...mappedCategories];

    return sendSuccess(res, allCategories, 'Categories fetched');
});

/**
 * GET /api/cashstore/brands?category=<slug>&filter=<popular|high-cashback>&sort=<option>&limit=12&page=1
 * Returns brands filtered by category slug or special filter, with optional sort
 */
export const getCashStoreBrands = asyncHandler(async (req: Request, res: Response) => {
    const { category, filter, sort, limit = '12', page = '1' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 12, 50);
    const pageNum = parseInt(page as string) || 1;
    const sortOption = SORT_OPTIONS[sort as string] || SORT_OPTIONS['rating'];

    let brands: any[] = [];
    let total = 0;

    if (filter === 'popular') {
      // Featured/popular brands
      const result = await mallService.getBrands(
        { sort: sortOption },
        pageNum,
        limitNum
      );
      // Sort by isFeatured first, then by requested sort
      brands = result.brands.sort((a: any, b: any) => {
        if (a.isFeatured !== b.isFeatured) return b.isFeatured ? 1 : -1;
        return 0; // Preserve DB sort order for non-featured comparison
      });
      total = result.total;
    } else if (filter === 'high-cashback') {
      // High cashback brands (10%+)
      const result = await mallService.getBrands(
        { minCashback: 10, sort: sortOption },
        pageNum,
        limitNum
      );
      brands = result.brands;
      total = result.total;
    } else if (category && category !== 'all') {
      // Filter by category slug
      const result = await mallService.getBrandsByCategory(
        category as string,
        pageNum,
        limitNum
      );
      brands = result.brands;
      total = result.total;
    } else {
      // All brands (default)
      const result = await mallService.getBrands(
        { sort: sortOption },
        pageNum,
        limitNum
      );
      brands = result.brands;
      total = result.total;
    }

    const responseData = { brands, total, page: pageNum, limit: limitNum };

    return sendSuccess(res, responseData, 'Brands fetched');
});

/**
 * GET /api/cashstore/brands/search?q=<query>&limit=20
 * Search brands by name
 */
export const searchCashStoreBrands = asyncHandler(async (req: Request, res: Response) => {
    const { q, limit = '20' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 50);

    if (!q || (q as string).length < 2) {
      return sendSuccess(res, { brands: [], total: 0 }, 'Search requires at least 2 characters');
    }

    const brands = await mallService.searchBrands(q as string, limitNum);

    return sendSuccess(
      res,
      { brands, total: brands.length },
      'Search results'
    );
});

/**
 * GET /api/cashstore/homepage
 * Aggregated data for initial Cash Store load (single call instead of many)
 * Returns categories + top brands + trending brands + high cashback brands
 */
export const getCashStoreHomepage = asyncHandler(async (req: Request, res: Response) => {
    const [
      dbCategories,
      topBrandsResult,
      featuredBrands,
      highCashbackResult,
    ] = await Promise.all([
      mallService.getCategories(),
      mallService.getBrands({}, 1, 12),
      mallService.getFeaturedBrands(12),
      mallService.getBrands({ minCashback: 10 }, 1, 10),
    ]);

    // Build categories with virtual filters
    const mappedCategories = dbCategories.map((cat: any) => ({
      _id: cat._id,
      slug: cat.slug,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      backgroundColor: cat.backgroundColor || '#dfebf7',
      maxCashback: cat.maxCashback || 0,
      sortOrder: cat.sortOrder,
      brandCount: cat.brandCount || 0,
      isActive: cat.isActive,
      isFeatured: cat.isFeatured,
      isSpecialFilter: false,
    }));

    const categories = [...VIRTUAL_FILTERS, ...mappedCategories];

    const homepageData = {
      categories,
      topBrands: topBrandsResult.brands,
      trendingBrands: featuredBrands,
      highCashbackBrands: highCashbackResult.brands,
    };

    return sendSuccess(res, homepageData, 'Cash Store homepage data fetched');
});

/**
 * GET /api/cashstore/gift-cards?category=<slug>&limit=20&page=1
 * Returns brands sorted by cashback rate for gift card browsing
 */
export const getCashStoreGiftCards = asyncHandler(async (req: Request, res: Response) => {
    const { category, limit = '20', page = '1' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 50);
    const pageNum = parseInt(page as string) || 1;

    let result;
    if (category && category !== 'all') {
      result = await mallService.getBrandsByCategory(category as string, pageNum, limitNum);
    } else {
      result = await mallService.getBrands(
        { sort: { 'cashback.percentage': -1 } },
        pageNum,
        limitNum
      );
    }

    const responseData = {
      brands: result.brands,
      total: result.total,
      page: pageNum,
      limit: limitNum,
    };

    return sendSuccess(res, responseData, 'Gift cards fetched');
});

/**
 * GET /api/cashstore/trending
 * Aggregated trending data: popular brands + active offers + high cashback brands
 */
export const getCashStoreTrending = asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();

    const [
      popularResult,
      highCashbackResult,
      activeOffers,
    ] = await Promise.all([
      // Popular brands sorted by clicks
      mallService.getBrands(
        { sort: { 'analytics.clicks': -1 } },
        1,
        20
      ),
      // High cashback brands (10%+)
      mallService.getBrands(
        { minCashback: 10, sort: { 'cashback.percentage': -1 } },
        1,
        20
      ),
      // Active offers not yet expired
      MallOffer.find({
        isActive: true,
        validUntil: { $gt: now },
        validFrom: { $lte: now },
      })
        .populate('brand', 'name slug logo cashback externalUrl')
        .sort({ priority: -1, validUntil: 1 })
        .limit(20)
        .lean(),
    ]);

    const trendingData = {
      popularBrands: popularResult.brands,
      highCashbackBrands: highCashbackResult.brands,
      activeOffers,
    };

    return sendSuccess(res, trendingData, 'Trending data fetched');
});
