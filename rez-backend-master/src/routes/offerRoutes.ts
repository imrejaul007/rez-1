import { logger } from '../config/logger';
import { Router, Request, Response } from 'express';
import HomepageDealsSection from '../models/HomepageDealsSection';
import HomepageDealsItem from '../models/HomepageDealsItem';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getOffers,
  getFeaturedOffers,
  getTrendingOffers,
  searchOffers,
  getOffersByCategory,
  getOffersByStore,
  getOfferById,
  redeemOffer,
  getUserRedemptions,
  addOfferToFavorites,
  removeOfferFromFavorites,
  getUserFavoriteOffers,
  trackOfferView,
  trackOfferClick,
  getRecommendedOffers,
  getMegaOffers,
  getStudentOffers,
  getNewArrivalOffers,
  getNearbyOffers,
  getOffersPageData,
  toggleOfferLike,
  shareOffer,
  getOfferCategories,
  getHeroBanners,
  validateRedemptionCode,
  markRedemptionAsUsed,
  getRedemptionById
} from '../controllers/offerController';
import {
  getHotspots,
  getHotspotOffers,
  getBOGOOffers,
  getSaleOffers,
  getFreeDeliveryOffers,
  getBankOffers,
  getExclusiveZones,
  getExclusiveZoneOffers,
  getSpecialProfiles,
  getSpecialProfileOffers,
  getFriendsRedeemed,
  getLoyaltyMilestones,
  getLoyaltyProgress,
  getFlashSaleOffers,
  getDiscountBuckets,
  getAggregatedOffersPageData,
} from '../controllers/offersPageController';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateQuery, validateParams, validate, commonSchemas } from '../middleware/validation';
import { Joi } from '../middleware/validation';

const router = Router();

// Public Routes (no authentication required, but can use optionalAuth for personalization)

// Get all offers with filters
router.get('/',
  optionalAuth,
  validateQuery(Joi.object({
    category: commonSchemas.objectId(),
    store: commonSchemas.objectId(),
    type: Joi.string().valid('cashback', 'discount', 'voucher', 'combo', 'special', 'walk_in'),
    tags: Joi.string(),
    featured: Joi.boolean(),
    trending: Joi.boolean(),
    bestSeller: Joi.boolean(),
    special: Joi.boolean(),
    isNew: Joi.boolean(),
    minCashback: Joi.number().min(0).max(100),
    maxCashback: Joi.number().min(0).max(100),
    sortBy: Joi.string().valid('cashback', 'createdAt', 'redemptionCount', 'endDate'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getOffers
);

// Get featured offers
router.get('/featured',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFeaturedOffers
);

// Get trending offers
router.get('/trending',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getTrendingOffers
);

// Search offers
router.get('/search',
  optionalAuth,
  validateQuery(Joi.object({
    q: Joi.string().required().trim().min(1).max(100),
    category: commonSchemas.objectId(),
    store: commonSchemas.objectId(),
    minCashback: Joi.number().min(0).max(100),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  searchOffers
);

// Get offers by category
router.get('/category/:categoryId',
  optionalAuth,
  validateParams(Joi.object({
    categoryId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    featured: Joi.boolean(),
    trending: Joi.boolean(),
    sortBy: Joi.string().valid('cashback', 'createdAt', 'redemptionCount'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getOffersByCategory
);

// Get offers by store
router.get('/store/:storeId',
  optionalAuth,
  validateParams(Joi.object({
    storeId: commonSchemas.objectId().required()
  })),
  validateQuery(Joi.object({
    category: commonSchemas.objectId(),
    active: Joi.boolean().default(true),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getOffersByStore
);


// Get recommended offers based on user preferences
router.get('/user/recommendations',
  authenticate,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getRecommendedOffers
);

// Authenticated Routes (require user login)

// Redeem an offer
router.post('/:id/redeem',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    redemptionType: Joi.string().valid('online', 'instore').required(),
    location: Joi.object({
      type: Joi.string().valid('Point').default('Point'),
      coordinates: Joi.array().items(Joi.number()).length(2)
    })
  })),
  redeemOffer
);

// Get user's redemptions
router.get('/user/redemptions',
  authenticate,
  validateQuery(Joi.object({
    status: Joi.string().valid('pending', 'active', 'used', 'expired', 'cancelled'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserRedemptions
);

// Validate a redemption/voucher code
router.post('/redemptions/validate',
  authenticate,
  validate(Joi.object({
    code: Joi.string().required().trim().uppercase()
  })),
  validateRedemptionCode
);

// Get single redemption details
router.get('/redemptions/:id',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getRedemptionById
);

// Mark redemption as used (credit cashback)
router.post('/redemptions/:id/use',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    orderAmount: Joi.number().positive().required(),
    orderId: commonSchemas.objectId(),
    storeId: commonSchemas.objectId()
  })),
  markRedemptionAsUsed
);

// Get user's favorite offers
router.get('/user/favorites',
  authenticate,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getUserFavoriteOffers
);

// Add offer to favorites
router.post('/:id/favorite',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  addOfferToFavorites
);

// Remove offer from favorites
router.delete('/:id/favorite',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  removeOfferFromFavorites
);

// Analytics Routes (can be anonymous)

// Track offer view (analytics)
router.post('/:id/view',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  trackOfferView
);

// Track offer click (analytics)
router.post('/:id/click',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  trackOfferClick
);

// New offers page specific routes

// Get complete offers page data
router.get('/page-data',
  optionalAuth,
  validateQuery(Joi.object({
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180)
  })),
  getOffersPageData
);

// Get mega offers
router.get('/mega',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getMegaOffers
);

// Get student offers
router.get('/students',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getStudentOffers
);

// Get new arrival offers
router.get('/new-arrivals',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getNewArrivalOffers
);

// Get nearby offers
router.get('/nearby',
  optionalAuth,
  validateQuery(Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    maxDistance: Joi.number().min(1).max(100).default(10),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getNearbyOffers
);

// Like/unlike an offer
router.post('/:id/like',
  authenticate,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  toggleOfferLike
);

// Share an offer
router.post('/:id/share',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  validate(Joi.object({
    platform: Joi.string().valid('facebook', 'twitter', 'instagram', 'whatsapp', 'telegram', 'copy_link').optional(),
    message: Joi.string().max(500).optional()
  })),
  shareOffer
);

// Get offer categories
router.get('/categories',
  optionalAuth,
  getOfferCategories
);

// Get hero banners
router.get('/hero-banners',
  optionalAuth,
  validateQuery(Joi.object({
    page: Joi.string().valid('offers', 'home', 'category', 'product', 'all').default('offers'),
    position: Joi.string().valid('top', 'middle', 'bottom').default('top')
  })),
  getHeroBanners
);

// =====================
// NEW OFFERS PAGE ROUTES
// =====================

// Get discount buckets (real-time aggregation counts)
router.get('/discount-buckets',
  optionalAuth,
  getDiscountBuckets
);

// Get hotspot areas
router.get('/hotspots',
  optionalAuth,
  validateQuery(Joi.object({
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getHotspots
);

// Get offers for a specific hotspot
router.get('/hotspots/:slug/offers',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getHotspotOffers
);

// Get BOGO offers
router.get('/bogo',
  optionalAuth,
  validateQuery(Joi.object({
    bogoType: Joi.string().valid('buy1get1', 'buy2get1', 'buy1get50', 'buy2get50'),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getBOGOOffers
);

// Get sale/clearance offers
router.get('/sales-clearance',
  optionalAuth,
  validateQuery(Joi.object({
    saleTag: Joi.string().valid('clearance', 'sale', 'last_pieces', 'mega_sale'),
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getSaleOffers
);

// Get flash sale offers (from offers with metadata.flashSale.isActive)
router.get('/flash-sales',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().trim().max(100),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getFlashSaleOffers
);

// Get free delivery offers
router.get('/free-delivery',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getFreeDeliveryOffers
);

// Get bank offers
router.get('/bank-offers',
  optionalAuth,
  validateQuery(Joi.object({
    category: Joi.string().trim().max(100),
    cardType: Joi.string().valid('credit', 'debit', 'wallet', 'upi', 'bnpl'),
    sort: Joi.string().valid('all', 'highest', 'expiring'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })),
  getBankOffers
);

// ============================================
// HOMEPAGE DEALS SECTION (Public API)
// ============================================

/**
 * @route   GET /api/offers/homepage-deals-section
 * @desc    Get the "Deals that save you money" section config and items for frontend
 * @access  Public
 */
router.get('/homepage-deals-section', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
    const region = (req.headers['x-rez-region'] as string) || 'all';

    // Get section config
    let sectionConfig = await HomepageDealsSection.findOne({
      sectionId: 'deals-that-save-money',
      isActive: true,
    });

    // Return empty if section doesn't exist or is inactive
    if (!sectionConfig) {
      return res.json({
        success: true,
        data: null,
        message: 'Section not configured',
      });
    }

    // Check region
    if (sectionConfig.regions.length > 0 && !sectionConfig.regions.includes('all' as any)) {
      if (!sectionConfig.regions.includes(region as any)) {
        return res.json({
          success: true,
          data: null,
          message: 'Section not available in this region',
        });
      }
    }

    // Build region filter for items
    const regionFilter = {
      $or: [
        { regions: { $in: [region, 'all'] } },
        { regions: { $size: 0 } },
      ],
    };

    // Fetch items for each tab in parallel
    const [offersItems, cashbackItems, exclusiveItems] = await Promise.all([
      sectionConfig.tabs.offers.isEnabled
        ? HomepageDealsItem.find({
            tabType: 'offers',
            isActive: true,
            ...regionFilter,
          })
            .sort({ sortOrder: 1 })
            .limit(sectionConfig.tabs.offers.maxItems)
            .lean()
        : Promise.resolve([]),

      sectionConfig.tabs.cashback.isEnabled
        ? HomepageDealsItem.find({
            tabType: 'cashback',
            isActive: true,
            ...regionFilter,
          })
            .sort({ sortOrder: 1 })
            .limit(sectionConfig.tabs.cashback.maxItems)
            .lean()
        : Promise.resolve([]),

      sectionConfig.tabs.exclusive.isEnabled
        ? HomepageDealsItem.find({
            tabType: 'exclusive',
            isActive: true,
            ...regionFilter,
          })
            .sort({ sortOrder: 1 })
            .limit(sectionConfig.tabs.exclusive.maxItems)
            .lean()
        : Promise.resolve([]),
    ]);

    // Build enabled tabs array sorted by sortOrder
    const enabledTabs = Object.entries(sectionConfig.tabs)
      .filter(([_, tab]) => tab.isEnabled)
      .sort((a, b) => a[1].sortOrder - b[1].sortOrder)
      .map(([key, tab]) => ({
        key,
        displayName: tab.displayName,
        sortOrder: tab.sortOrder,
      }));

    return res.json({
      success: true,
      data: {
        section: {
          title: sectionConfig.title,
          subtitle: sectionConfig.subtitle,
          icon: sectionConfig.icon,
        },
        enabledTabs,
        tabs: {
          offers: {
            isEnabled: sectionConfig.tabs.offers.isEnabled,
            displayName: sectionConfig.tabs.offers.displayName,
            items: offersItems,
          },
          cashback: {
            isEnabled: sectionConfig.tabs.cashback.isEnabled,
            displayName: sectionConfig.tabs.cashback.displayName,
            items: cashbackItems,
          },
          exclusive: {
            isEnabled: sectionConfig.tabs.exclusive.isEnabled,
            displayName: sectionConfig.tabs.exclusive.displayName,
            items: exclusiveItems,
          },
        },
      },
    });
}));

/**
 * @route   POST /api/offers/homepage-deals-section/track-impression
 * @desc    Track item impressions (batch)
 * @access  Public
 */
router.post('/homepage-deals-section/track-impression', asyncHandler(async (req: Request, res: Response) => {
    const { itemIds, tabType } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'itemIds array is required',
      });
    }

    // Batch update impressions
    await HomepageDealsItem.updateMany(
      { _id: { $in: itemIds } },
      { $inc: { impressions: 1 } }
    );

    // Also update section total
    await HomepageDealsSection.updateOne(
      { sectionId: 'deals-that-save-money' },
      { $inc: { totalImpressions: itemIds.length } }
    );

    return res.json({
      success: true,
      message: 'Impressions tracked',
    });
}));

/**
 * @route   POST /api/offers/homepage-deals-section/track-click
 * @desc    Track item click
 * @access  Public
 */
router.post('/homepage-deals-section/track-click', asyncHandler(async (req: Request, res: Response) => {
    const { itemId, tabType } = req.body;

    if (!itemId) {
      return res.status(400).json({
        success: false,
        message: 'itemId is required',
      });
    }

    // Update item click count
    await HomepageDealsItem.updateOne(
      { _id: itemId },
      { $inc: { clicks: 1 } }
    );

    // Also update section total
    await HomepageDealsSection.updateOne(
      { sectionId: 'deals-that-save-money' },
      { $inc: { totalClicks: 1 } }
    );

    return res.json({
      success: true,
      message: 'Click tracked',
    });
}));

// Get exclusive zones
router.get('/exclusive-zones',
  optionalAuth,
  getExclusiveZones
);

// Get offers for a specific exclusive zone
router.get('/exclusive-zones/:slug/offers',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getExclusiveZoneOffers
);

// Get special profiles (Defence, Healthcare, etc.)
router.get('/special-profiles',
  optionalAuth,
  getSpecialProfiles
);

// Get offers for a specific special profile
router.get('/special-profiles/:slug/offers',
  optionalAuth,
  validateParams(Joi.object({
    slug: Joi.string().required()
  })),
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(20)
  })),
  getSpecialProfileOffers
);

// Get friends' redeemed offers (social proof)
router.get('/friends-redeemed',
  optionalAuth,
  validateQuery(Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    page: Joi.number().integer().min(1).default(1),
  })),
  getFriendsRedeemed
);

// Get loyalty milestones
router.get('/loyalty/milestones',
  optionalAuth,
  getLoyaltyMilestones
);

// Get user's loyalty progress
router.get('/loyalty/progress',
  optionalAuth,
  getLoyaltyProgress
);

// Aggregated offers page data (replaces 21 parallel API calls)
router.get('/page-data-v2',
  optionalAuth,
  validateQuery(Joi.object({
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    tab: Joi.string().valid('offers', 'cashback', 'exclusive', 'all').default('all'),
  })),
  getAggregatedOffersPageData
);

// Get single offer by ID (must be last to avoid conflicts with specific routes)
router.get('/:id',
  optionalAuth,
  validateParams(Joi.object({
    id: commonSchemas.objectId().required()
  })),
  getOfferById
);

export default router;