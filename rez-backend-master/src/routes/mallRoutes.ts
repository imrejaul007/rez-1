/**
 * Mall Routes
 *
 * API routes for ReZ Mall feature including brands, categories, collections, offers, and banners.
 */

import { Router } from 'express';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth';
import { validate, validateParams } from '../middleware/validation';
import {
  createBrandSchema,
  updateBrandSchema,
  createCategorySchema,
  updateCategorySchema,
  createCollectionSchema,
  updateCollectionSchema,
  createOfferSchema,
  updateOfferSchema,
  createBannerSchema,
  updateBannerSchema,
  objectIdParamsSchema,
  toggleAllianceSchema
} from '../validators/mallValidators';
import {
  // Public endpoints
  getMallHomepageData,
  getMallBrands,
  getFeaturedBrands,
  getNewArrivals,
  getTopRatedBrands,
  getLuxuryBrands,
  searchBrands,
  getMallBrandById,
  getMallCategories,
  getBrandsByCategory,
  getMallCollections,
  getBrandsByCollection,
  getExclusiveOffers,
  getMallOffers,
  getMallHeroBanners,
  getMallBanners,
  trackBrandClick,
  trackBrandPurchase,
  // Store-based mall endpoints (in-app delivery marketplace)
  getMallStoresHomepage,
  getMallStores,
  getFeaturedMallStores,
  getNewMallStores,
  getTopRatedMallStores,
  getPremiumMallStores,
  getMallStoreById,
  searchMallStores,
  getMallStoreCategories,
  getMallStoresByCategory,
  getMallStoresByCategorySlug,
  // New store-based endpoints
  getAllianceMallStores,
  getTrendingMallStores,
  getRewardBoosterStores,
  getDealsOfDay,
  getMallHomepageBatch,
  getAdminStats,
  // Admin endpoints
  createMallBrand,
  updateMallBrand,
  deleteMallBrand,
  createMallCategory,
  updateMallCategory,
  deleteMallCategory,
  createMallCollection,
  updateMallCollection,
  deleteMallCollection,
  createMallOffer,
  updateMallOffer,
  deleteMallOffer,
  createMallBanner,
  updateMallBanner,
  deleteMallBanner,
  toggleStoreAlliance,
  getAdminAllianceStores,
  getAdminMallStores,
  toggleStoreMall,
  updateStoreMallProperties,
  getAdminBanners,
  getAdminCollections,
  getAdminBrands,
  getAdminCategories,
  getAdminOffers,
  // Listing requests
  getAdminListingRequests,
  approveListingRequest,
  rejectListingRequest,
} from '../controllers/mallController';

const router = Router();

// ==================== PUBLIC ROUTES ====================

/**
 * @route   GET /api/mall/homepage
 * @desc    Get aggregated mall homepage data
 * @access  Public (optionalAuth for personalization)
 */
router.get('/homepage', optionalAuth, getMallHomepageData);

// ==================== BRAND ROUTES ====================

/**
 * @route   GET /api/mall/brands
 * @desc    Get all mall brands with filters
 * @access  Public
 */
router.get('/brands', optionalAuth, getMallBrands);

/**
 * @route   GET /api/mall/brands/featured
 * @desc    Get featured brands
 * @access  Public
 */
router.get('/brands/featured', optionalAuth, getFeaturedBrands);

/**
 * @route   GET /api/mall/brands/new
 * @desc    Get new arrival brands
 * @access  Public
 */
router.get('/brands/new', optionalAuth, getNewArrivals);

/**
 * @route   GET /api/mall/brands/top-rated
 * @desc    Get top rated brands
 * @access  Public
 */
router.get('/brands/top-rated', optionalAuth, getTopRatedBrands);

/**
 * @route   GET /api/mall/brands/luxury
 * @desc    Get luxury brands
 * @access  Public
 */
router.get('/brands/luxury', optionalAuth, getLuxuryBrands);

/**
 * @route   GET /api/mall/brands/search
 * @desc    Search brands by name
 * @access  Public
 */
router.get('/brands/search', optionalAuth, searchBrands);

/**
 * @route   GET /api/mall/brands/:brandId
 * @desc    Get brand by ID
 * @access  Public
 */
router.get('/brands/:brandId', optionalAuth, getMallBrandById);

/**
 * @route   POST /api/mall/brands/:brandId/click
 * @desc    Track brand click
 * @access  Public (optionalAuth for user tracking)
 */
router.post('/brands/:brandId/click', optionalAuth, trackBrandClick);

/**
 * @route   POST /api/mall/brands/:brandId/purchase
 * @desc    Track brand purchase
 * @access  Private
 */
router.post('/brands/:brandId/purchase', authenticate, trackBrandPurchase);

// ==================== STORE-BASED MALL ROUTES ====================
// These endpoints fetch stores with deliveryCategories.mall === true
// For the in-app delivery marketplace (users earn ReZ Coins)

/**
 * @route   GET /api/mall/homepage-batch
 * @desc    Get ALL mall homepage data in one call (stores + banners + trending + reward boosters + deals)
 * @access  Public
 */
router.get('/homepage-batch', optionalAuth, getMallHomepageBatch);

/**
 * @route   GET /api/mall/stores/homepage
 * @desc    Get mall stores homepage data (featured, new, top-rated, premium stores)
 * @access  Public
 */
router.get('/stores/homepage', optionalAuth, getMallStoresHomepage);

/**
 * @route   GET /api/mall/stores/featured
 * @desc    Get featured mall stores
 * @access  Public
 */
router.get('/stores/featured', optionalAuth, getFeaturedMallStores);

/**
 * @route   GET /api/mall/stores/new
 * @desc    Get newly registered mall stores
 * @access  Public
 */
router.get('/stores/new', optionalAuth, getNewMallStores);

/**
 * @route   GET /api/mall/stores/top-rated
 * @desc    Get top rated mall stores
 * @access  Public
 */
router.get('/stores/top-rated', optionalAuth, getTopRatedMallStores);

/**
 * @route   GET /api/mall/stores/premium
 * @desc    Get premium mall stores
 * @access  Public
 */
router.get('/stores/premium', optionalAuth, getPremiumMallStores);

/**
 * @route   GET /api/mall/stores/alliance
 * @desc    Get alliance mall stores (partner stores)
 * @access  Public
 */
router.get('/stores/alliance', optionalAuth, getAllianceMallStores);

/**
 * @route   GET /api/mall/stores/trending
 * @desc    Get trending mall stores (by views/activity)
 * @access  Public
 */
router.get('/stores/trending', optionalAuth, getTrendingMallStores);

/**
 * @route   GET /api/mall/stores/reward-boosters
 * @desc    Get stores with highest coin reward percentages
 * @access  Public
 */
router.get('/stores/reward-boosters', optionalAuth, getRewardBoosterStores);

/**
 * @route   GET /api/mall/stores/search
 * @desc    Search mall stores
 * @access  Public
 */
router.get('/stores/search', optionalAuth, searchMallStores);

/**
 * @route   GET /api/mall/stores/categories
 * @desc    Get mall store categories (categories with mall stores)
 * @access  Public
 */
router.get('/stores/categories', optionalAuth, getMallStoreCategories);

/**
 * @route   GET /api/mall/stores/category/:categoryId
 * @desc    Get mall stores by category ID
 * @access  Public
 */
router.get('/stores/category/:categoryId', optionalAuth, getMallStoresByCategory);

/**
 * @route   GET /api/mall/stores/category-slug/:slug
 * @desc    Get mall stores by category slug (for frontend routes)
 * @access  Public
 */
router.get('/stores/category-slug/:slug', optionalAuth, getMallStoresByCategorySlug);

/**
 * @route   GET /api/mall/stores/:storeId
 * @desc    Get mall store by ID
 * @access  Public
 */
router.get('/stores/:storeId', optionalAuth, getMallStoreById);

/**
 * @route   GET /api/mall/stores
 * @desc    Get all mall stores with filters
 * @access  Public
 */
router.get('/stores', optionalAuth, getMallStores);

// ==================== CATEGORY ROUTES ====================

/**
 * @route   GET /api/mall/categories
 * @desc    Get all mall categories
 * @access  Public
 */
router.get('/categories', optionalAuth, getMallCategories);

/**
 * @route   GET /api/mall/categories/:slug/brands
 * @desc    Get brands by category slug
 * @access  Public
 */
router.get('/categories/:slug/brands', optionalAuth, getBrandsByCategory);

// ==================== COLLECTION ROUTES ====================

/**
 * @route   GET /api/mall/collections
 * @desc    Get all mall collections
 * @access  Public
 */
router.get('/collections', optionalAuth, getMallCollections);

/**
 * @route   GET /api/mall/collections/:slug/brands
 * @desc    Get brands by collection slug
 * @access  Public
 */
router.get('/collections/:slug/brands', optionalAuth, getBrandsByCollection);

// ==================== OFFER ROUTES ====================

/**
 * @route   GET /api/mall/offers
 * @desc    Get all active offers
 * @access  Public
 */
router.get('/offers', optionalAuth, getMallOffers);

/**
 * @route   GET /api/mall/offers/today
 * @desc    Get deals of the day (flash sales)
 * @access  Public
 */
router.get('/offers/today', optionalAuth, getDealsOfDay);

/**
 * @route   GET /api/mall/offers/exclusive
 * @desc    Get exclusive mall offers
 * @access  Public
 */
router.get('/offers/exclusive', optionalAuth, getExclusiveOffers);

// ==================== BANNER ROUTES ====================

/**
 * @route   GET /api/mall/banners
 * @desc    Get all banners
 * @access  Public
 */
router.get('/banners', optionalAuth, getMallBanners);

/**
 * @route   GET /api/mall/banners/hero
 * @desc    Get hero banners
 * @access  Public
 */
router.get('/banners/hero', optionalAuth, getMallHeroBanners);

// ==================== ADMIN ROUTES ====================

// Admin Stats
router.get('/admin/stats', authenticate, requireAdmin, getAdminStats);

// Brand Admin Routes
router.get('/admin/brands', authenticate, requireAdmin, getAdminBrands);
router.post('/admin/brands', authenticate, requireAdmin, validate(createBrandSchema), createMallBrand);
router.put('/admin/brands/:brandId', authenticate, requireAdmin, validateParams(objectIdParamsSchema), validate(updateBrandSchema), updateMallBrand);
router.delete('/admin/brands/:brandId', authenticate, requireAdmin, validateParams(objectIdParamsSchema), deleteMallBrand);

// Category Admin Routes
router.get('/admin/categories', authenticate, requireAdmin, getAdminCategories);
router.post('/admin/categories', authenticate, requireAdmin, validate(createCategorySchema), createMallCategory);
router.put('/admin/categories/:categoryId', authenticate, requireAdmin, validateParams(objectIdParamsSchema), validate(updateCategorySchema), updateMallCategory);
router.delete('/admin/categories/:categoryId', authenticate, requireAdmin, validateParams(objectIdParamsSchema), deleteMallCategory);

// Collection Admin Routes
router.get('/admin/collections', authenticate, requireAdmin, getAdminCollections);
router.post('/admin/collections', authenticate, requireAdmin, validate(createCollectionSchema), createMallCollection);
router.put('/admin/collections/:collectionId', authenticate, requireAdmin, validateParams(objectIdParamsSchema), validate(updateCollectionSchema), updateMallCollection);
router.delete('/admin/collections/:collectionId', authenticate, requireAdmin, validateParams(objectIdParamsSchema), deleteMallCollection);

// Offer Admin Routes
router.get('/admin/offers', authenticate, requireAdmin, getAdminOffers);
router.post('/admin/offers', authenticate, requireAdmin, validate(createOfferSchema), createMallOffer);
router.put('/admin/offers/:offerId', authenticate, requireAdmin, validateParams(objectIdParamsSchema), validate(updateOfferSchema), updateMallOffer);
router.delete('/admin/offers/:offerId', authenticate, requireAdmin, validateParams(objectIdParamsSchema), deleteMallOffer);

// Banner Admin Routes
router.get('/admin/banners', authenticate, requireAdmin, getAdminBanners);
router.post('/admin/banners', authenticate, requireAdmin, validate(createBannerSchema), createMallBanner);
router.put('/admin/banners/:bannerId', authenticate, requireAdmin, validateParams(objectIdParamsSchema), validate(updateBannerSchema), updateMallBanner);
router.delete('/admin/banners/:bannerId', authenticate, requireAdmin, validateParams(objectIdParamsSchema), deleteMallBanner);

// Alliance Store Admin Routes
router.get('/admin/stores/alliance', authenticate, requireAdmin, getAdminAllianceStores);
router.put('/admin/stores/:storeId/alliance', authenticate, requireAdmin, validateParams(objectIdParamsSchema), validate(toggleAllianceSchema), toggleStoreAlliance);

// Mall Store Management Admin Routes
router.get('/admin/stores/manage', authenticate, requireAdmin, getAdminMallStores);
router.put('/admin/stores/:storeId/mall-toggle', authenticate, requireAdmin, validateParams(objectIdParamsSchema), toggleStoreMall);
router.put('/admin/stores/:storeId/mall-properties', authenticate, requireAdmin, validateParams(objectIdParamsSchema), updateStoreMallProperties);

// Mall Listing Request Admin Routes
router.get('/admin/listing-requests', authenticate, requireAdmin, getAdminListingRequests);
router.put('/admin/listing-requests/:requestId/approve', authenticate, requireAdmin, approveListingRequest);
router.put('/admin/listing-requests/:requestId/reject', authenticate, requireAdmin, rejectListingRequest);

export default router;
