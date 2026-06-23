/**
 * Mall Controller
 *
 * Handles all ReZ Mall API endpoints for brands, categories, collections, offers, and banners.
 *
 * NOTE: ReZ Mall has two systems:
 * 1. MallBrand-based (external affiliate brands) - legacy, use Cash Store instead
 * 2. Store-based (in-app delivery marketplace) - stores with deliveryCategories.mall=true
 */

import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import mallService from '../services/mallService';
import { MallBrand } from '../models/MallBrand';
import { MallCategory } from '../models/MallCategory';
import { MallCollection } from '../models/MallCollection';
import { MallOffer } from '../models/MallOffer';
import { MallBanner } from '../models/MallBanner';
import { Store } from '../models/Store';
import {
  sendSuccess,
  sendPaginated,
  sendNotFound,
  sendBadRequest,
  sendCreated,
  sendError
} from '../utils/response';

// Async handler wrapper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Get Mall Homepage Data (aggregated)
 * GET /api/mall/homepage
 */
export const getMallHomepageData = asyncHandler(async (req: Request, res: Response) => {
  const homepageData = await mallService.getHomepageData();
  return sendSuccess(res, homepageData, 'Mall homepage data retrieved successfully');
});

/**
 * Get All Mall Brands with filters
 * GET /api/mall/brands
 */
export const getMallBrands = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    tier,
    collection,
    minCashback,
    badges,
    search,
    page = '1',
    limit = '20'
  } = req.query;

  const filters = {
    category: category as string,
    tier: tier as string,
    collection: collection as string,
    minCashback: minCashback ? parseInt(minCashback as string) : undefined,
    badges: badges ? (badges as string).split(',') : undefined,
    search: search as string
  };

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const { brands, total, pages } = await mallService.getBrands(filters, pageNum, limitNum);

  return sendPaginated(res, brands, pageNum, limitNum, total, 'Mall brands retrieved successfully');
});

/**
 * Get Featured Brands
 * GET /api/mall/brands/featured
 */
export const getFeaturedBrands = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const brands = await mallService.getFeaturedBrands(limit);
  return sendSuccess(res, brands, 'Featured brands retrieved successfully');
});

/**
 * Get New Arrivals
 * GET /api/mall/brands/new
 */
export const getNewArrivals = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const brands = await mallService.getNewArrivals(limit);
  return sendSuccess(res, brands, 'New arrivals retrieved successfully');
});

/**
 * Get Top Rated Brands
 * GET /api/mall/brands/top-rated
 */
export const getTopRatedBrands = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const brands = await mallService.getTopRatedBrands(limit);
  return sendSuccess(res, brands, 'Top rated brands retrieved successfully');
});

/**
 * Get Luxury Brands
 * GET /api/mall/brands/luxury
 */
export const getLuxuryBrands = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const brands = await mallService.getLuxuryBrands(limit);
  return sendSuccess(res, brands, 'Luxury brands retrieved successfully');
});

/**
 * Search Brands
 * GET /api/mall/brands/search
 */
export const searchBrands = asyncHandler(async (req: Request, res: Response) => {
  const { q, limit = '20' } = req.query;

  if (!q || (q as string).length < 2) {
    return sendBadRequest(res, 'Search query must be at least 2 characters');
  }

  const brands = await mallService.searchBrands(q as string, parseInt(limit as string));
  return sendSuccess(res, brands, 'Search results retrieved successfully');
});

/**
 * Get Brand by ID
 * GET /api/mall/brands/:brandId
 */
export const getMallBrandById = asyncHandler(async (req: Request, res: Response) => {
  const { brandId } = req.params;

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  const brand = await mallService.getBrandById(brandId);

  if (!brand) {
    return sendNotFound(res, 'Brand not found');
  }

  // Track view
  await mallService.trackBrandView(brandId);

  return sendSuccess(res, brand, 'Brand retrieved successfully');
});

/**
 * Get Mall Categories
 * GET /api/mall/categories
 */
export const getMallCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await mallService.getCategories();
  return sendSuccess(res, categories, 'Mall categories retrieved successfully');
});

/**
 * Get Brands by Category
 * GET /api/mall/categories/:slug/brands
 */
export const getBrandsByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const { brands, total, category } = await mallService.getBrandsByCategory(slug, pageNum, limitNum);

  if (!category) {
    return sendNotFound(res, 'Category not found');
  }

  return sendSuccess(res, {
    category,
    brands,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  }, 'Brands by category retrieved successfully');
});

/**
 * Get Mall Collections
 * GET /api/mall/collections
 */
export const getMallCollections = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const collections = await mallService.getCollections(limit);
  return sendSuccess(res, collections, 'Mall collections retrieved successfully');
});

/**
 * Get Brands by Collection
 * GET /api/mall/collections/:slug/brands
 */
export const getBrandsByCollection = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const { brands, total, collection } = await mallService.getBrandsByCollection(slug, pageNum, limitNum);

  if (!collection) {
    return sendNotFound(res, 'Collection not found');
  }

  return sendSuccess(res, {
    collection,
    brands,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  }, 'Brands by collection retrieved successfully');
});

/**
 * Get Exclusive Offers
 * GET /api/mall/offers/exclusive
 */
export const getExclusiveOffers = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const offers = await mallService.getExclusiveOffers(limit);
  return sendSuccess(res, offers, 'Exclusive offers retrieved successfully');
});

/**
 * Get All Active Offers
 * GET /api/mall/offers
 */
export const getMallOffers = asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '20' } = req.query;

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const { offers, total } = await mallService.getActiveOffers(pageNum, limitNum);

  return sendPaginated(res, offers, pageNum, limitNum, total, 'Mall offers retrieved successfully');
});

/**
 * Get Hero Banners
 * GET /api/mall/banners/hero
 */
export const getMallHeroBanners = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);
  const banners = await mallService.getHeroBanners(limit);
  return sendSuccess(res, banners, 'Hero banners retrieved successfully');
});

/**
 * Get All Banners
 * GET /api/mall/banners
 */
export const getMallBanners = asyncHandler(async (req: Request, res: Response) => {
  const banners = await mallService.getAllBanners();
  return sendSuccess(res, banners, 'Mall banners retrieved successfully');
});

/**
 * Track Brand Click
 * POST /api/mall/brands/:brandId/click
 */
export const trackBrandClick = asyncHandler(async (req: Request, res: Response) => {
  const { brandId } = req.params;
  const userId = (req as any).user?._id?.toString();

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  await mallService.trackBrandClick(brandId, userId);
  return sendSuccess(res, null, 'Click tracked successfully');
});

/**
 * Track Brand Purchase
 * POST /api/mall/brands/:brandId/purchase
 */
export const trackBrandPurchase = asyncHandler(async (req: Request, res: Response) => {
  const { brandId } = req.params;
  const { cashbackAmount = 0 } = req.body;

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  // Validate cashbackAmount is a non-negative number
  const amount = Number(cashbackAmount);
  if (isNaN(amount) || amount < 0 || amount > 1000000) {
    return sendBadRequest(res, 'Invalid cashback amount');
  }

  await mallService.trackBrandPurchase(brandId, amount);
  return sendSuccess(res, null, 'Purchase tracked successfully');
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * Create Mall Brand (Admin)
 * POST /api/mall/admin/brands
 */
export const createMallBrand = asyncHandler(async (req: Request, res: Response) => {
  const brandData = req.body;

  // Validate required fields
  if (!brandData.name || !brandData.logo || !brandData.mallCategory) {
    return sendBadRequest(res, 'Name, logo, and category are required');
  }

  // Check if category exists
  const category = await MallCategory.findById(brandData.mallCategory).lean();
  if (!category) {
    return sendBadRequest(res, 'Invalid category');
  }

  const brand = new MallBrand(brandData);
  await brand.save();

  // Update category brand count
  await MallCategory.findByIdAndUpdate(brandData.mallCategory, {
    $inc: { brandCount: 1 }
  });

  // Update collection brand counts
  if (brand.collections && brand.collections.length > 0) {
    await Promise.all(
      brand.collections.map((colId: Types.ObjectId) =>
        (MallCollection as any).updateBrandCount(colId)
      )
    );
  }

  // Invalidate caches
  await mallService.invalidateAllCaches();

  return sendCreated(res, brand, 'Mall brand created successfully');
});

/**
 * Update Mall Brand (Admin)
 * PUT /api/mall/admin/brands/:brandId
 */
export const updateMallBrand = asyncHandler(async (req: Request, res: Response) => {
  const { brandId } = req.params;
  const updateData = req.body;

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  // Get old brand to detect collection/category changes
  const oldBrand = await MallBrand.findById(brandId).lean();
  if (!oldBrand) {
    return sendNotFound(res, 'Brand not found');
  }

  const brand = await MallBrand.findByIdAndUpdate(brandId, updateData, { new: true });

  // If category changed, update both old and new category brand counts
  if (updateData.mallCategory && oldBrand.mallCategory?.toString() !== updateData.mallCategory) {
    if (oldBrand.mallCategory) {
      await (MallCategory as any).updateBrandCount(oldBrand.mallCategory);
    }
    await (MallCategory as any).updateBrandCount(new Types.ObjectId(updateData.mallCategory));
  }

  // If collections changed, update brand counts for all affected collections
  if (updateData.collections) {
    const oldCollections = (oldBrand.collections || []).map((c: Types.ObjectId) => c.toString());
    const newCollections = (updateData.collections || []).map((c: string) => c.toString());
    const allAffected = new Set([...oldCollections, ...newCollections]);
    await Promise.all(
      Array.from(allAffected).map((colId) =>
        (MallCollection as any).updateBrandCount(new Types.ObjectId(colId))
      )
    );
  }

  // Invalidate caches
  await mallService.invalidateAllCaches();

  return sendSuccess(res, brand!, 'Mall brand updated successfully');
});

/**
 * Delete Mall Brand (Admin)
 * DELETE /api/mall/admin/brands/:brandId
 */
export const deleteMallBrand = asyncHandler(async (req: Request, res: Response) => {
  const { brandId } = req.params;

  if (!Types.ObjectId.isValid(brandId)) {
    return sendBadRequest(res, 'Invalid brand ID');
  }

  const brand = await MallBrand.findById(brandId).lean();

  if (!brand) {
    return sendNotFound(res, 'Brand not found');
  }

  // Update category brand count
  if (brand.mallCategory) {
    await MallCategory.findByIdAndUpdate(brand.mallCategory, {
      $inc: { brandCount: -1 }
    });
  }

  // Update collection brand counts
  if (brand.collections && brand.collections.length > 0) {
    await Promise.all(
      brand.collections.map((colId: Types.ObjectId) =>
        (MallCollection as any).updateBrandCount(colId)
      )
    );
  }

  await MallBrand.findByIdAndDelete(brandId);

  // Invalidate caches
  await mallService.invalidateAllCaches();

  return sendSuccess(res, null, 'Mall brand deleted successfully');
});

/**
 * Create Mall Category (Admin)
 * POST /api/mall/admin/categories
 */
export const createMallCategory = asyncHandler(async (req: Request, res: Response) => {
  const categoryData = req.body;

  if (!categoryData.name || !categoryData.icon || !categoryData.color) {
    return sendBadRequest(res, 'Name, icon, and color are required');
  }

  const category = new MallCategory(categoryData);
  await category.save();

  await mallService.invalidateAllCaches();

  return sendCreated(res, category, 'Mall category created successfully');
});

/**
 * Update Mall Category (Admin)
 * PUT /api/mall/admin/categories/:categoryId
 */
export const updateMallCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const updateData = req.body;

  if (!Types.ObjectId.isValid(categoryId)) {
    return sendBadRequest(res, 'Invalid category ID');
  }

  const category = await MallCategory.findByIdAndUpdate(categoryId, updateData, { new: true });

  if (!category) {
    return sendNotFound(res, 'Category not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, category, 'Mall category updated successfully');
});

/**
 * Delete Mall Category (Admin)
 * DELETE /api/mall/admin/categories/:categoryId
 */
export const deleteMallCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;

  if (!Types.ObjectId.isValid(categoryId)) {
    return sendBadRequest(res, 'Invalid category ID');
  }

  // Check if any brands use this category
  const brandsCount = await MallBrand.countDocuments({ mallCategory: categoryId });
  if (brandsCount > 0) {
    return sendBadRequest(res, `Cannot delete category. ${brandsCount} brands are using it.`);
  }

  const category = await MallCategory.findByIdAndDelete(categoryId);

  if (!category) {
    return sendNotFound(res, 'Category not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, null, 'Mall category deleted successfully');
});

/**
 * Create Mall Collection (Admin)
 * POST /api/mall/admin/collections
 */
export const createMallCollection = asyncHandler(async (req: Request, res: Response) => {
  const collectionData = req.body;

  if (!collectionData.name || !collectionData.image) {
    return sendBadRequest(res, 'Name and image are required');
  }

  const collection = new MallCollection(collectionData);
  await collection.save();

  await mallService.invalidateAllCaches();

  return sendCreated(res, collection, 'Mall collection created successfully');
});

/**
 * Update Mall Collection (Admin)
 * PUT /api/mall/admin/collections/:collectionId
 */
export const updateMallCollection = asyncHandler(async (req: Request, res: Response) => {
  const { collectionId } = req.params;
  const updateData = req.body;

  if (!Types.ObjectId.isValid(collectionId)) {
    return sendBadRequest(res, 'Invalid collection ID');
  }

  const collection = await MallCollection.findByIdAndUpdate(collectionId, updateData, { new: true });

  if (!collection) {
    return sendNotFound(res, 'Collection not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, collection, 'Mall collection updated successfully');
});

/**
 * Delete Mall Collection (Admin)
 * DELETE /api/mall/admin/collections/:collectionId
 */
export const deleteMallCollection = asyncHandler(async (req: Request, res: Response) => {
  const { collectionId } = req.params;

  if (!Types.ObjectId.isValid(collectionId)) {
    return sendBadRequest(res, 'Invalid collection ID');
  }

  const collection = await MallCollection.findByIdAndDelete(collectionId);

  if (!collection) {
    return sendNotFound(res, 'Collection not found');
  }

  // Remove collection reference from brands
  await MallBrand.updateMany(
    { collections: collectionId },
    { $pull: { collections: collectionId } }
  );

  await mallService.invalidateAllCaches();

  return sendSuccess(res, null, 'Mall collection deleted successfully');
});

/**
 * Create Mall Offer (Admin)
 * POST /api/mall/admin/offers
 */
export const createMallOffer = asyncHandler(async (req: Request, res: Response) => {
  const offerData = req.body;

  if (!offerData.title || !offerData.image || !offerData.value) {
    return sendBadRequest(res, 'Title, image, and value are required');
  }

  // Validate referenced entity exists
  if (offerData.brand) {
    const brand = await MallBrand.findById(offerData.brand).lean();
    if (!brand) {
      return sendBadRequest(res, 'Invalid brand ID');
    }
  } else if (offerData.store) {
    const store = await Store.findById(offerData.store).lean();
    if (!store) {
      return sendBadRequest(res, 'Invalid store ID');
    }
  }

  const offer = new MallOffer(offerData);
  await offer.save();

  await mallService.invalidateAllCaches();

  return sendCreated(res, offer, 'Mall offer created successfully');
});

/**
 * Update Mall Offer (Admin)
 * PUT /api/mall/admin/offers/:offerId
 */
export const updateMallOffer = asyncHandler(async (req: Request, res: Response) => {
  const { offerId } = req.params;
  const updateData = req.body;

  if (!Types.ObjectId.isValid(offerId)) {
    return sendBadRequest(res, 'Invalid offer ID');
  }

  const offer = await MallOffer.findByIdAndUpdate(offerId, updateData, { new: true });

  if (!offer) {
    return sendNotFound(res, 'Offer not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, offer, 'Mall offer updated successfully');
});

/**
 * Delete Mall Offer (Admin)
 * DELETE /api/mall/admin/offers/:offerId
 */
export const deleteMallOffer = asyncHandler(async (req: Request, res: Response) => {
  const { offerId } = req.params;

  if (!Types.ObjectId.isValid(offerId)) {
    return sendBadRequest(res, 'Invalid offer ID');
  }

  const offer = await MallOffer.findByIdAndDelete(offerId);

  if (!offer) {
    return sendNotFound(res, 'Offer not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, null, 'Mall offer deleted successfully');
});

/**
 * Create Mall Banner (Admin)
 * POST /api/mall/admin/banners
 */
export const createMallBanner = asyncHandler(async (req: Request, res: Response) => {
  const bannerData = req.body;

  if (!bannerData.title || !bannerData.image) {
    return sendBadRequest(res, 'Title and image are required');
  }

  const banner = new MallBanner(bannerData);
  await banner.save();

  await mallService.invalidateAllCaches();

  return sendCreated(res, banner, 'Mall banner created successfully');
});

/**
 * Update Mall Banner (Admin)
 * PUT /api/mall/admin/banners/:bannerId
 */
export const updateMallBanner = asyncHandler(async (req: Request, res: Response) => {
  const { bannerId } = req.params;
  const updateData = req.body;

  if (!Types.ObjectId.isValid(bannerId)) {
    return sendBadRequest(res, 'Invalid banner ID');
  }

  const banner = await MallBanner.findByIdAndUpdate(bannerId, updateData, { new: true });

  if (!banner) {
    return sendNotFound(res, 'Banner not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, banner, 'Mall banner updated successfully');
});

/**
 * Delete Mall Banner (Admin)
 * DELETE /api/mall/admin/banners/:bannerId
 */
export const deleteMallBanner = asyncHandler(async (req: Request, res: Response) => {
  const { bannerId } = req.params;

  if (!Types.ObjectId.isValid(bannerId)) {
    return sendBadRequest(res, 'Invalid banner ID');
  }

  const banner = await MallBanner.findByIdAndDelete(bannerId);

  if (!banner) {
    return sendNotFound(res, 'Banner not found');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, null, 'Mall banner deleted successfully');
});

// ==================== STORE-BASED MALL ENDPOINTS ====================
// These endpoints fetch from Store model where deliveryCategories.mall === true
// Used for the in-app delivery marketplace (users earn ReZ Coins)

/**
 * Get Mall Stores Homepage Data
 * GET /api/mall/stores/homepage
 *
 * Returns aggregated mall store data:
 * - Featured stores
 * - New stores
 * - Top rated stores
 * - Premium stores
 * - Categories
 */
export const getMallStoresHomepage = asyncHandler(async (req: Request, res: Response) => {
  const data = await mallService.getMallStoresHomepage();
  return sendSuccess(res, data, 'Mall stores homepage data retrieved successfully');
});

/**
 * Get Mall Homepage Batch — ALL homepage data in one call
 * GET /api/mall/homepage-batch
 * Returns stores, banners, trending, reward boosters, deals in a single response
 */
export const getMallHomepageBatch = asyncHandler(async (req: Request, res: Response) => {
  const data = await mallService.getMallHomepageBatch();
  return sendSuccess(res, data, 'Mall homepage batch data retrieved successfully');
});

/**
 * Get All Mall Stores
 * GET /api/mall/stores
 *
 * Query params:
 * - category: Category ID
 * - premium: true/false
 * - minCoinReward: Minimum coin reward percentage
 * - search: Search term
 * - page: Page number
 * - limit: Items per page
 */
export const getMallStores = asyncHandler(async (req: Request, res: Response) => {
  const {
    category,
    premium,
    minCoinReward,
    search,
    page = '1',
    limit = '20',
  } = req.query;

  const filters = {
    category: category as string,
    premium: premium === 'true',
    minCoinReward: minCoinReward ? parseInt(minCoinReward as string) : undefined,
    search: search as string,
  };

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const { stores, total, pages } = await mallService.getMallStores(filters, pageNum, limitNum);

  return sendPaginated(res, stores, pageNum, limitNum, total, 'Mall stores retrieved successfully');
});

/**
 * Get Featured Mall Stores
 * GET /api/mall/stores/featured
 */
export const getFeaturedMallStores = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const stores = await mallService.getFeaturedMallStores(limit);
  return sendSuccess(res, stores, 'Featured mall stores retrieved successfully');
});

/**
 * Get New Mall Stores
 * GET /api/mall/stores/new
 */
export const getNewMallStores = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const stores = await mallService.getNewMallStores(limit);
  return sendSuccess(res, stores, 'New mall stores retrieved successfully');
});

/**
 * Get Top Rated Mall Stores
 * GET /api/mall/stores/top-rated
 */
export const getTopRatedMallStores = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const stores = await mallService.getTopRatedMallStores(limit);
  return sendSuccess(res, stores, 'Top rated mall stores retrieved successfully');
});

/**
 * Get Premium Mall Stores
 * GET /api/mall/stores/premium
 */
export const getPremiumMallStores = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const stores = await mallService.getPremiumMallStores(limit);
  return sendSuccess(res, stores, 'Premium mall stores retrieved successfully');
});

/**
 * Get Mall Store by ID
 * GET /api/mall/stores/:storeId
 */
export const getMallStoreById = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;

  if (!Types.ObjectId.isValid(storeId)) {
    return sendBadRequest(res, 'Invalid store ID');
  }

  const store = await mallService.getMallStoreById(storeId);

  if (!store) {
    return sendNotFound(res, 'Mall store not found');
  }

  return sendSuccess(res, store, 'Mall store retrieved successfully');
});

/**
 * Search Mall Stores
 * GET /api/mall/stores/search
 */
export const searchMallStores = asyncHandler(async (req: Request, res: Response) => {
  const { q, limit = '20' } = req.query;

  if (!q || (q as string).length < 2) {
    return sendBadRequest(res, 'Search query must be at least 2 characters');
  }

  const stores = await mallService.searchMallStores(q as string, parseInt(limit as string));
  return sendSuccess(res, stores, 'Mall store search results retrieved successfully');
});

/**
 * Get Mall Store Categories
 * GET /api/mall/stores/categories
 */
export const getMallStoreCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await mallService.getMallStoreCategories();
  return sendSuccess(res, categories, 'Mall store categories retrieved successfully');
});

/**
 * Get Mall Stores by Category
 * GET /api/mall/stores/category/:categoryId
 */
export const getMallStoresByCategory = asyncHandler(async (req: Request, res: Response) => {
  const { categoryId } = req.params;
  const { page = '1', limit = '20' } = req.query;

  if (!Types.ObjectId.isValid(categoryId)) {
    return sendBadRequest(res, 'Invalid category ID');
  }

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const { stores, total } = await mallService.getMallStoresByCategory(categoryId, pageNum, limitNum);

  return sendPaginated(res, stores, pageNum, limitNum, total, 'Mall stores by category retrieved successfully');
});

/**
 * Get Mall Stores by Category Slug
 * GET /api/mall/stores/category-slug/:slug
 * Used by frontend that uses slug in URL routes
 */
export const getMallStoresByCategorySlug = asyncHandler(async (req: Request, res: Response) => {
  const { slug } = req.params;
  const { page = '1', limit = '20' } = req.query;

  if (!slug) {
    return sendBadRequest(res, 'Category slug is required');
  }

  const pageNum = parseInt(page as string) || 1;
  const limitNum = Math.min(parseInt(limit as string) || 20, 50);

  const { stores, total, category } = await mallService.getMallStoresByCategorySlug(slug, pageNum, limitNum);

  if (!category) {
    return sendNotFound(res, 'Category not found');
  }

  return sendSuccess(res, {
    category,
    stores,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  }, 'Mall stores by category retrieved successfully');
});

/**
 * Get Alliance Mall Stores
 * GET /api/mall/stores/alliance
 */
export const getAllianceMallStores = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const stores = await mallService.getAllianceMallStores(limit);
  return sendSuccess(res, stores, 'Alliance mall stores retrieved successfully');
});

/**
 * Get Trending Mall Stores
 * GET /api/mall/stores/trending
 */
export const getTrendingMallStores = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const stores = await mallService.getTrendingMallStores(limit);
  return sendSuccess(res, stores, 'Trending mall stores retrieved successfully');
});

/**
 * Get Reward Booster Stores
 * GET /api/mall/stores/reward-boosters
 */
export const getRewardBoosterStores = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const stores = await mallService.getRewardBoosterStores(limit);
  return sendSuccess(res, stores, 'Reward booster stores retrieved successfully');
});

/**
 * Get Deals of the Day
 * GET /api/mall/offers/today
 */
export const getDealsOfDay = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);
  const offers = await mallService.getDealsOfDay(limit);
  return sendSuccess(res, offers, 'Deals of the day retrieved successfully');
});

/**
 * Get Admin Dashboard Stats
 * GET /api/mall/admin/stats
 */
export const getAdminStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await mallService.getAdminStats();
  return sendSuccess(res, stats, 'Admin stats retrieved successfully');
});

/**
 * Get Admin Alliance Stores
 * GET /api/mall/admin/stores/alliance
 * Returns all approved mall stores with alliance status for admin management
 */
export const getAdminAllianceStores = asyncHandler(async (req: Request, res: Response) => {
  const { search } = req.query;

  const query: any = {
    'deliveryCategories.mall': true,
    adminApproved: true,
    isActive: true,
  };

  if (search && (search as string).length >= 2) {
    // Escape special regex characters to prevent ReDoS
    const escapedSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { 'tags': { $regex: escapedSearch, $options: 'i' } },
    ];
  }

  const stores = await Store.find(query)
    .select('name logo tags deliveryCategories.alliance deliveryCategories.mall ratings category isVerified')
    .populate('category', 'name slug')
    .sort({ 'deliveryCategories.alliance': -1, name: 1 })
    .limit(100)
    .lean();

  return sendSuccess(res, stores, 'Admin alliance stores retrieved successfully');
});

/**
 * Toggle Store Alliance Status
 * PUT /api/mall/admin/stores/:storeId/alliance
 * Sets or unsets deliveryCategories.alliance on a store
 */
export const toggleStoreAlliance = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { alliance } = req.body;

  if (!Types.ObjectId.isValid(storeId)) {
    return sendBadRequest(res, 'Invalid store ID');
  }

  const store = await Store.findOneAndUpdate(
    { _id: storeId, 'deliveryCategories.mall': true, adminApproved: true },
    { $set: { 'deliveryCategories.alliance': alliance } },
    { new: true }
  ).select('name logo deliveryCategories');

  if (!store) {
    return sendNotFound(res, 'Store not found or not a mall store');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, store, `Store ${alliance ? 'added to' : 'removed from'} alliance`);
});

// ==================== STORE MALL MANAGEMENT ADMIN ENDPOINTS ====================

/**
 * Get All Stores for Mall Management
 * GET /api/mall/admin/stores/manage
 * Returns all approved stores with their mall-related flags for admin management
 */
export const getAdminMallStores = asyncHandler(async (req: Request, res: Response) => {
  const { search, filter } = req.query;

  const query: any = {
    adminApproved: true,
    isActive: true,
  };

  // Filter by mall status
  if (filter === 'mall') {
    query['deliveryCategories.mall'] = true;
  } else if (filter === 'non-mall') {
    query.$or = [
      { 'deliveryCategories.mall': { $exists: false } },
      { 'deliveryCategories.mall': false },
    ];
  }

  if (search && (search as string).length >= 2) {
    const escapedSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchOr = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { tags: { $regex: escapedSearch, $options: 'i' } },
    ];
    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: searchOr }];
      delete query.$or;
    } else {
      query.$or = searchOr;
    }
  }

  const stores = await Store.find(query)
    .select('name logo tags deliveryCategories ratings category isVerified isFeatured offers rewardRules createdAt')
    .populate('category', 'name slug')
    .sort({ 'deliveryCategories.mall': -1, name: 1 })
    .limit(200)
    .lean();

  return sendSuccess(res, stores, 'Admin mall stores retrieved successfully');
});

/**
 * Toggle Store Mall Status
 * PUT /api/mall/admin/stores/:storeId/mall-toggle
 * Sets or unsets deliveryCategories.mall on a store
 */
export const toggleStoreMall = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { mall } = req.body;

  if (!Types.ObjectId.isValid(storeId)) {
    return sendBadRequest(res, 'Invalid store ID');
  }

  if (typeof mall !== 'boolean') {
    return sendBadRequest(res, 'mall must be a boolean');
  }

  const store = await Store.findOneAndUpdate(
    { _id: storeId, adminApproved: true, isActive: true },
    { $set: { 'deliveryCategories.mall': mall } },
    { new: true }
  ).select('name logo deliveryCategories isFeatured');

  if (!store) {
    return sendNotFound(res, 'Store not found or not approved');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, store, `Store ${mall ? 'added to' : 'removed from'} mall`);
});

/**
 * Update Store Mall Properties (Featured, Premium, Cashback)
 * PUT /api/mall/admin/stores/:storeId/mall-properties
 * Updates mall-related properties on a store
 */
export const updateStoreMallProperties = asyncHandler(async (req: Request, res: Response) => {
  const { storeId } = req.params;
  const { isFeatured, premium, cashbackPercent, maxCashback } = req.body;

  if (!Types.ObjectId.isValid(storeId)) {
    return sendBadRequest(res, 'Invalid store ID');
  }

  const updateObj: any = {};

  if (typeof isFeatured === 'boolean') {
    updateObj.isFeatured = isFeatured;
  }
  if (typeof premium === 'boolean') {
    updateObj['deliveryCategories.premium'] = premium;
  }
  if (typeof cashbackPercent === 'number' && cashbackPercent >= 0 && cashbackPercent <= 100) {
    updateObj['offers.cashback'] = cashbackPercent;
    updateObj['rewardRules.baseCashbackPercent'] = cashbackPercent;
  }
  if (typeof maxCashback === 'number' && maxCashback >= 0) {
    updateObj['offers.maxCashback'] = maxCashback;
    updateObj['rewardRules.maxCashback'] = maxCashback;
  }

  if (Object.keys(updateObj).length === 0) {
    return sendBadRequest(res, 'No valid properties to update');
  }

  const store = await Store.findOneAndUpdate(
    { _id: storeId, adminApproved: true, 'deliveryCategories.mall': true },
    { $set: updateObj },
    { new: true }
  ).select('name logo deliveryCategories isFeatured offers rewardRules ratings');

  if (!store) {
    return sendNotFound(res, 'Store not found or not a mall store');
  }

  await mallService.invalidateAllCaches();

  return sendSuccess(res, store, 'Store mall properties updated successfully');
});

/**
 * Get Admin Banners (All banners, including inactive/expired)
 * GET /api/mall/admin/banners
 */
export const getAdminBanners = asyncHandler(async (req: Request, res: Response) => {
  const banners = await MallBanner.find({})
    .populate('ctaBrand', 'name slug logo')
    .populate('ctaCategory', 'name slug')
    .populate('ctaCollection', 'name slug')
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, banners, 'Admin banners retrieved successfully');
});

/**
 * Get Admin Collections (All collections, including inactive)
 * GET /api/mall/admin/collections
 */
export const getAdminCollections = asyncHandler(async (req: Request, res: Response) => {
  const collections = await MallCollection.find({})
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  return sendSuccess(res, collections, 'Admin collections retrieved successfully');
});

/**
 * Get Admin Brands (All brands, including inactive)
 * GET /api/mall/admin/brands
 */
export const getAdminBrands = asyncHandler(async (req: Request, res: Response) => {
  const { search, tier } = req.query;
  const query: any = {};

  if (search && (search as string).length >= 2) {
    const escapedSearch = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    query.$or = [
      { name: { $regex: escapedSearch, $options: 'i' } },
      { slug: { $regex: escapedSearch, $options: 'i' } },
    ];
  }
  if (tier && tier !== 'all') query.tier = tier;

  const brands = await MallBrand.find(query)
    .populate('mallCategory', 'name slug')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return sendSuccess(res, brands, 'Admin brands retrieved successfully');
});

/**
 * Get Admin Categories (All categories, including inactive)
 * GET /api/mall/admin/categories
 */
export const getAdminCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await MallCategory.find({})
    .sort({ sortOrder: 1, createdAt: -1 })
    .lean();

  return sendSuccess(res, categories, 'Admin categories retrieved successfully');
});

/**
 * Get Admin Offers (All offers, including inactive/expired)
 * GET /api/mall/admin/offers
 */
export const getAdminOffers = asyncHandler(async (req: Request, res: Response) => {
  const offers = await MallOffer.find({})
    .populate('brand', 'name logo slug')
    .populate('store', 'name logo tags')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return sendSuccess(res, offers, 'Admin offers retrieved successfully');
});

// ==================== LISTING REQUESTS ====================

import { MallListingRequest } from '../models/MallListingRequest';

/**
 * Get Admin Listing Requests
 * GET /api/mall/admin/listing-requests
 */
export const getAdminListingRequests = asyncHandler(async (req: Request, res: Response) => {
  const { status, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string, 10) || 1;
  const limitNum = parseInt(limit as string, 10) || 20;

  const filter: Record<string, any> = {};
  if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
    filter.status = status;
  }

  const [requests, total] = await Promise.all([
    MallListingRequest.find(filter)
      .populate('storeId', 'name logo tags category')
      .populate('merchantId', 'name email phoneNumber')
      .populate('reviewedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    MallListingRequest.countDocuments(filter),
  ]);

  return sendPaginated(res, requests, pageNum, limitNum, total, 'Listing requests retrieved successfully');
});

/**
 * Approve Listing Request
 * PUT /api/mall/admin/listing-requests/:requestId/approve
 */
export const approveListingRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const adminId = (req as any).user?._id;
  const { adminNotes } = req.body;

  const request = await MallListingRequest.findById(requestId);
  if (!request) {
    return sendNotFound(res, 'Listing request not found');
  }
  if (request.status !== 'pending') {
    return sendBadRequest(res, `Request is already ${request.status}`);
  }

  // Enable mall on the store
  await Store.findByIdAndUpdate(request.storeId, {
    $set: { 'deliveryCategories.mall': true },
  });

  request.status = 'approved';
  request.adminNotes = adminNotes || undefined;
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();
  await request.save();

  return sendSuccess(res, { request }, 'Listing request approved — store is now in Mall');
});

/**
 * Reject Listing Request
 * PUT /api/mall/admin/listing-requests/:requestId/reject
 */
export const rejectListingRequest = asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  const adminId = (req as any).user?._id;
  const { adminNotes } = req.body;

  const request = await MallListingRequest.findById(requestId);
  if (!request) {
    return sendNotFound(res, 'Listing request not found');
  }
  if (request.status !== 'pending') {
    return sendBadRequest(res, `Request is already ${request.status}`);
  }

  request.status = 'rejected';
  request.adminNotes = adminNotes || 'Request rejected';
  request.reviewedBy = adminId;
  request.reviewedAt = new Date();
  await request.save();

  return sendSuccess(res, { request }, 'Listing request rejected');
});
