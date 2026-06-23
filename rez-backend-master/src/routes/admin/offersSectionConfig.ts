import { logger } from '../../config/logger';
/**
 * Admin API for Offers Section Configuration
 * Controls visibility, ordering, and limits for offers page sections
 */

import { Router, Request, Response } from 'express';
import OffersSectionConfig from '../../models/OffersSectionConfig';
import { requireAdmin, requireSuperAdmin } from '../../middleware/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// All routes require admin auth
router.use(requireAdmin);

// Default section configurations for seeding
const DEFAULT_SECTIONS = [
  // Offers tab
  { sectionKey: 'lightningDeals', displayName: 'Lightning Deals', tab: 'offers', sortOrder: 1, maxItems: 10 },
  { sectionKey: 'discountBuckets', displayName: 'Discount Buckets', tab: 'offers', sortOrder: 2, maxItems: 4 },
  { sectionKey: 'nearbyOffers', displayName: 'Nearby Offers', tab: 'offers', sortOrder: 3, maxItems: 10 },
  { sectionKey: 'saleOffers', displayName: 'Sales & Clearance', tab: 'offers', sortOrder: 4, maxItems: 10 },
  { sectionKey: 'bogoOffers', displayName: 'Buy 1 Get 1', tab: 'offers', sortOrder: 5, maxItems: 10 },
  { sectionKey: 'freeDeliveryOffers', displayName: 'Free Delivery', tab: 'offers', sortOrder: 6, maxItems: 10 },
  { sectionKey: 'todaysOffers', displayName: "Today's Offers", tab: 'offers', sortOrder: 7, maxItems: 10 },
  { sectionKey: 'trendingOffers', displayName: 'Trending Now', tab: 'offers', sortOrder: 8, maxItems: 10 },
  { sectionKey: 'aiRecommendedOffers', displayName: 'Recommended For You', tab: 'offers', sortOrder: 9, maxItems: 10 },
  { sectionKey: 'friendsRedeemed', displayName: 'Friends Redeemed', tab: 'offers', sortOrder: 10, maxItems: 10 },
  { sectionKey: 'hotspots', displayName: 'Hotspot Deals', tab: 'offers', sortOrder: 11, maxItems: 10 },
  { sectionKey: 'lastChanceOffers', displayName: 'Last Chance', tab: 'offers', sortOrder: 12, maxItems: 10 },
  { sectionKey: 'newTodayOffers', displayName: 'New Today', tab: 'offers', sortOrder: 13, maxItems: 10 },
  // Cashback tab
  { sectionKey: 'doubleCashback', displayName: 'Double Cashback', tab: 'cashback', sortOrder: 1, maxItems: 5 },
  { sectionKey: 'coinDrops', displayName: 'Coin Drops', tab: 'cashback', sortOrder: 2, maxItems: 20 },
  { sectionKey: 'superCashbackStores', displayName: 'Super Cashback Stores', tab: 'cashback', sortOrder: 3, maxItems: 20 },
  { sectionKey: 'uploadBillStores', displayName: 'Upload Bill Stores', tab: 'cashback', sortOrder: 4, maxItems: 20 },
  { sectionKey: 'bankOffers', displayName: 'Bank & Wallet Offers', tab: 'cashback', sortOrder: 5, maxItems: 10 },
  // Exclusive tab
  { sectionKey: 'exclusiveZones', displayName: 'Exclusive Categories', tab: 'exclusive', sortOrder: 1, maxItems: 20 },
  { sectionKey: 'specialProfiles', displayName: 'Special Profiles', tab: 'exclusive', sortOrder: 2, maxItems: 20 },
  { sectionKey: 'loyaltyMilestones', displayName: 'Loyalty Progress', tab: 'exclusive', sortOrder: 3, maxItems: 20 },
] as const;

/**
 * GET /api/admin/offers-sections
 * List all section configurations
 */
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
    const configs = await OffersSectionConfig.find()
      .sort({ tab: 1, sortOrder: 1 })
      .lean();

    sendSuccess(res, configs, 'Section configs retrieved');
  }));

/**
 * PUT /api/admin/offers-sections/:sectionKey
 * Update section visibility, ordering, or limits
 */
router.put('/:sectionKey', asyncHandler(async (req: Request, res: Response) => {
    const { sectionKey } = req.params;
    const { isEnabled, sortOrder, maxItems, regions, displayName } = req.body;
    const adminId = (req as any).user?._id;

    const update: any = { updatedBy: adminId };
    if (typeof isEnabled === 'boolean') update.isEnabled = isEnabled;
    if (typeof sortOrder === 'number') update.sortOrder = sortOrder;
    if (typeof maxItems === 'number') update.maxItems = maxItems;
    if (Array.isArray(regions)) update.regions = regions;
    if (typeof displayName === 'string') update.displayName = displayName;

    const config = await OffersSectionConfig.findOneAndUpdate(
      { sectionKey },
      { $set: update },
      { new: true }
    );

    if (!config) {
      return sendError(res, 'Section config not found', 404);
    }

    sendSuccess(res, config, 'Section config updated');
  }));

/**
 * POST /api/admin/offers-sections/seed
 * Seed default configurations for all 21 sections
 */
router.post('/seed', requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
    if (!req.body.confirmReset) {
      return res.status(400).json({
        success: false,
        error: 'This will seed/reset offer section configurations. Send confirmReset: true to proceed.',
      });
    }

    const results = [];

    for (const section of DEFAULT_SECTIONS) {
      const existing = await OffersSectionConfig.findOne({ sectionKey: section.sectionKey });
      if (!existing) {
        const config = await OffersSectionConfig.create({
          ...section,
          isEnabled: true,
          regions: [],
        });
        results.push({ sectionKey: section.sectionKey, action: 'created' });
      } else {
        results.push({ sectionKey: section.sectionKey, action: 'exists' });
      }
    }

    sendSuccess(res, results, 'Section configs seeded');
  }));

export default router;
