/**
 * Offers Page Controller
 * Handles all offers page specific endpoints
 */

import { Request, Response } from 'express';
import Offer from '../models/Offer';
import HotspotArea from '../models/HotspotArea';
import DoubleCashbackCampaign from '../models/DoubleCashbackCampaign';
import CoinDrop from '../models/CoinDrop';
import UploadBillStore from '../models/UploadBillStore';
import BankOffer from '../models/BankOffer';
import ExclusiveZone from '../models/ExclusiveZone';
import SpecialProfile from '../models/SpecialProfile';
import LoyaltyMilestone from '../models/LoyaltyMilestone';
import FriendRedemption from '../models/FriendRedemption';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { regionService, isValidRegion, RegionId } from '../services/regionService';
import { logger } from '../config/logger';
import { getOffersPageData as getAggregatedData } from '../services/offersPageService';
import { withCache } from '../utils/cacheHelper';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * GET /api/offers/hotspots
 * Get hotspot areas with active offers count
 */
export const getHotspots = asyncHandler(async (req: Request, res: Response) => {
    const { lat, lng, limit = 10 } = req.query;

    let query: any = { isActive: true };

    const allHotspots = await HotspotArea.find(query)
      .sort({ priority: -1 })
      .lean();

    // If coordinates provided, compute distance and sort by it
    if (lat && lng) {
      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      const maxDistKm = 50;

      const withDistance = allHotspots
        .map((h: any) => {
          const dLat = (h.coordinates.lat - userLat) * (Math.PI / 180);
          const dLng = (h.coordinates.lng - userLng) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(userLat * (Math.PI / 180)) *
              Math.cos(h.coordinates.lat * (Math.PI / 180)) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceKm = 6371 * c;
          return { ...h, distance: Math.round(distanceKm * 1000) }; // distance in meters
        })
        .filter((h: any) => h.distance <= maxDistKm * 1000)
        .sort((a: any, b: any) => b.priority - a.priority || a.distance - b.distance)
        .slice(0, parseInt(limit as string));

      return sendSuccess(res, withDistance, 'Hotspots retrieved successfully');
    }

    const hotspots = allHotspots.slice(0, parseInt(limit as string));

    sendSuccess(res, hotspots, 'Hotspots retrieved successfully');
});

/**
 * GET /api/offers/hotspots/:slug/offers
 * Get offers for a specific hotspot area
 */
export const getHotspotOffers = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { limit = 20 } = req.query;

    const hotspot = await HotspotArea.findOne({ slug, isActive: true }).lean();

    if (!hotspot) {
      return sendError(res, 'Hotspot not found', 404);
    }

    const offers = await Offer.find({
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      adminApproved: { $ne: false },
      location: {
        $geoWithin: {
          $centerSphere: [
            [hotspot.coordinates.lng, hotspot.coordinates.lat],
            hotspot.radius / 6378.1, // Convert km to radians
          ],
        },
      },
    })
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, { hotspot, offers }, 'Hotspot offers retrieved successfully');
});

/**
 * GET /api/offers/bogo
 * Get Buy One Get One offers
 */
export const getBOGOOffers = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 20, bogoType } = req.query;

    const filter: any = {
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      bogoType: { $exists: true, $ne: null },
      adminApproved: { $ne: false },
    };

    if (bogoType) {
      filter.bogoType = bogoType;
    }

    const offers = await Offer.find(filter)
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, offers, 'BOGO offers retrieved successfully');
});

/**
 * GET /api/offers/sales-clearance
 * Get sale and clearance offers
 */
export const getSaleOffers = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 20, saleTag } = req.query;

    const filter: any = {
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      saleTag: { $exists: true, $ne: null },
      adminApproved: { $ne: false },
    };

    if (saleTag) {
      filter.saleTag = saleTag;
    }

    const offers = await Offer.find(filter)
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, offers, 'Sale offers retrieved successfully');
});

/**
 * GET /api/offers/free-delivery
 * Get free delivery offers
 */
export const getFreeDeliveryOffers = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 20 } = req.query;

    const offers = await Offer.find({
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      isFreeDelivery: true,
      adminApproved: { $ne: false },
    })
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, offers, 'Free delivery offers retrieved successfully');
});

/**
 * GET /api/offers/bank-offers
 * Get bank and wallet offers
 */
export const getBankOffers = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, cardType, sort } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));

    const filter: any = {
      isActive: true,
      validUntil: { $gte: new Date() },
    };

    if (cardType) {
      filter.cardType = cardType;
    }

    let sortOption: Record<string, 1 | -1> = { priority: -1 };
    if (sort === 'highest') {
      sortOption = { discountPercentage: -1, priority: -1 };
    } else if (sort === 'expiring') {
      sortOption = { validUntil: 1, priority: -1 };
    }

    const [offers, total] = await Promise.all([
      BankOffer.find(filter)
        .sort(sortOption)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      BankOffer.countDocuments(filter),
    ]);

    sendPaginated(res, offers, pageNum, limitNum, total, 'Bank offers retrieved successfully');
});

/**
 * GET /api/offers/exclusive-zones
 * Get exclusive zone categories with user eligibility status
 */
export const getExclusiveZones = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;

    if (!userId) {
      // Unauthenticated: cache for 5 minutes
      const zones = await withCache('offers:exclusiveZones:anon', 300, () =>
        ExclusiveZone.find({ isActive: true })
          .select('name slug description shortDescription icon iconColor backgroundColor image eligibilityType verificationRequired priority isActive cashbackBonusPercent offersCount')
          .sort({ priority: -1 })
          .lean()
      );
      return sendSuccess(res, zones, 'Exclusive zones retrieved successfully');
    }

    // Authenticated: cache per user for 60 seconds
    const zonesWithEligibility = await withCache(`offers:exclusiveZones:${userId}`, 60, async () => {
      const { User } = await import('../models/User');

      // Run zone fetch and user fetch in parallel
      const [zones, user] = await Promise.all([
        ExclusiveZone.find({ isActive: true })
          .select('name slug description shortDescription icon iconColor backgroundColor image eligibilityType verificationRequired priority isActive cashbackBonusPercent offersCount')
          .sort({ priority: -1 })
          .lean(),
        User.findById(userId)
          .select('verifications profile.dateOfBirth profile.gender')
          .lean(),
      ]);

      if (!user) return zones;

      return zones.map((zone: any) => {
        let isEligible = false;

        switch (zone.eligibilityType) {
          case 'student':
            isEligible = (user as any).verifications?.student?.verified === true;
            break;
          case 'corporate_email':
            isEligible = (user as any).verifications?.corporate?.verified === true;
            break;
          case 'gender':
            isEligible = user.profile?.gender === 'female';
            break;
          case 'birthday_month':
            if (user.profile?.dateOfBirth) {
              const birthMonth = new Date(user.profile.dateOfBirth).getMonth();
              const currentMonth = new Date().getMonth();
              isEligible = birthMonth === currentMonth;
            }
            break;
          case 'age':
            if (user.profile?.dateOfBirth) {
              const age = Math.floor((Date.now() - new Date(user.profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
              isEligible = age >= 60;
            }
            break;
          case 'profession':
            isEligible = (user as any).verifications?.profession?.verified === true;
            break;
          case 'disability':
            isEligible = (user as any).verifications?.disability?.verified === true;
            break;
          case 'verification':
            isEligible = true;
            break;
          default:
            isEligible = !zone.verificationRequired;
        }

        return {
          ...zone,
          userEligible: isEligible,
        };
      });
    });

    sendSuccess(res, zonesWithEligibility, 'Exclusive zones retrieved successfully');
});

/**
 * GET /api/offers/exclusive-zones/:slug/offers
 * Get offers for a specific exclusive zone
 */
export const getExclusiveZoneOffers = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { limit = 20 } = req.query;

    const zone = await ExclusiveZone.findOne({ slug, isActive: true }).lean();

    if (!zone) {
      return sendError(res, 'Exclusive zone not found', 404);
    }

    const offers = await Offer.find({
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      exclusiveZone: slug,
      adminApproved: { $ne: false },
    })
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, { zone, offers }, 'Exclusive zone offers retrieved successfully');
});

/**
 * GET /api/offers/special-profiles
 * Get special profile categories (Defence, Healthcare, etc.) with user eligibility
 */
export const getSpecialProfiles = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;

    if (!userId) {
      // Unauthenticated: cache for 5 minutes
      const profiles = await withCache('offers:specialProfiles:anon', 300, () =>
        SpecialProfile.find({ isActive: true })
          .select('name slug description icon image verificationRequired priority isActive')
          .sort({ priority: -1 })
          .lean()
      );
      return sendSuccess(res, profiles, 'Special profiles retrieved successfully');
    }

    // Authenticated: cache per user for 60 seconds
    const profilesWithEligibility = await withCache(`offers:specialProfiles:${userId}`, 60, async () => {
      const { User } = await import('../models/User');

      // Run profile fetch and user fetch in parallel
      const [profiles, user] = await Promise.all([
        SpecialProfile.find({ isActive: true })
          .select('name slug description icon image verificationRequired priority isActive')
          .sort({ priority: -1 })
          .lean(),
        User.findById(userId)
          .select('verifications profile.dateOfBirth profile.gender')
          .lean(),
      ]);

      if (!user) return profiles;

      return profiles.map((profile: any) => {
        let isEligible = false;

        switch (profile.slug) {
          case 'defence':
            isEligible = (user as any).verifications?.defence?.verified === true;
            break;
          case 'healthcare':
            isEligible = (user as any).verifications?.healthcare?.verified === true;
            break;
          case 'senior':
            isEligible = (user as any).verifications?.senior?.verified === true;
            break;
          case 'teachers':
            isEligible = (user as any).verifications?.teacher?.verified === true;
            break;
          case 'government':
            isEligible = (user as any).verifications?.government?.verified === true;
            break;
          case 'differently-abled':
            isEligible = (user as any).verifications?.differentlyAbled?.verified === true;
            break;
          default:
            isEligible = !profile.verificationRequired;
        }

        return {
          ...profile,
          userEligible: isEligible,
        };
      });
    });

    sendSuccess(res, profilesWithEligibility, 'Special profiles retrieved successfully');
});

/**
 * GET /api/offers/special-profiles/:slug/offers
 * Get offers for a specific special profile
 */
export const getSpecialProfileOffers = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { limit = 20 } = req.query;

    const profile = await SpecialProfile.findOne({ slug, isActive: true }).lean();

    if (!profile) {
      return sendError(res, 'Special profile not found', 404);
    }

    // Get offers tagged for this special profile
    const offers = await Offer.find({
      'validity.isActive': true,
      'validity.endDate': { $gte: new Date() },
      'metadata.tags': { $in: [slug, profile.name.toLowerCase()] },
      adminApproved: { $ne: false },
    })
      .sort({ 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, { profile, offers }, 'Special profile offers retrieved successfully');
});

/**
 * GET /api/offers/friends-redeemed
 * Get offers redeemed by user's friends (social proof)
 */
export const getFriendsRedeemed = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10, page = 1 } = req.query;
    const userId = (req as any).user?._id;
    const parsedLimit = parseInt(limit as string);
    const parsedPage = parseInt(page as string);
    const skip = (parsedPage - 1) * parsedLimit;

    let filter: any = { isVisible: true };

    // If authenticated, filter by user's followed accounts
    if (userId) {
      try {
        const Follow = (await import('../models/Follow')).default;
        const following = await Follow.find({ follower: userId })
          .select('following')
          .lean();

        const followedIds = following.map((f: any) => f.following);

        if (followedIds.length > 0) {
          const friendFilter = { isVisible: true, friendId: { $in: followedIds } };
          const friendCount = await FriendRedemption.countDocuments(friendFilter);
          if (friendCount > 0) {
            filter = friendFilter;
          }
        }
      } catch {
        // Fall through to popular redemptions
      }
    }

    const [redemptions, totalItems] = await Promise.all([
      FriendRedemption.find(filter)
        .populate('offerId')
        .populate('friendId', 'fullName avatar')
        .sort({ redeemedAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      FriendRedemption.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / parsedLimit);

    sendSuccess(res, {
      redemptions,
      pagination: {
        currentPage: parsedPage,
        totalPages,
        totalItems,
        hasNextPage: parsedPage < totalPages,
        hasPrevPage: parsedPage > 1,
      },
    }, 'Friends redemptions retrieved successfully');
});

/**
 * GET /api/cashback/double-campaigns
 * Get active double cashback campaigns (region-filtered)
 */
export const getDoubleCashbackCampaigns = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;

    // Get region from header for filtering
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    const filter: any = {
      isActive: true,
      endTime: { $gte: new Date() },
    };

    // Filter by region if specified (campaigns can have region field or be global)
    if (region) {
      filter.$or = [
        { region: region },
        { region: 'all' },
        { region: { $exists: false } },
      ];
    }

    const campaigns = await DoubleCashbackCampaign.find(filter)
      .sort({ startTime: 1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, campaigns, 'Double cashback campaigns retrieved successfully');
});

/**
 * GET /api/cashback/coin-drops
 * Get active coin drop events (region-filtered)
 */
export const getCoinDrops = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 20, category } = req.query;

    // Get region from header for filtering
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    const filter: any = {
      isActive: true,
      endTime: { $gte: new Date() },
    };

    if (category) {
      filter.category = category;
    }

    // If region specified, filter by stores in that region
    if (region) {
      const { Store } = await import('../models/Store');
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      filter.storeId = { $in: storeIds };
    }

    const coinDrops = await CoinDrop.find(filter)
      .populate('storeId', 'name logo')
      .sort({ multiplier: -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, coinDrops, 'Coin drops retrieved successfully');
});

/**
 * GET /api/cashback/upload-bill-stores
 * Get stores that accept bill uploads for cashback (region-filtered)
 */
export const getUploadBillStores = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 20, category } = req.query;

    // Get region from header for filtering
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    const filter: any = { isActive: true };

    if (category) {
      filter.category = category;
    }

    // If region specified, filter by stores in that region
    if (region) {
      const { Store } = await import('../models/Store');
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      filter.storeId = { $in: storeIds };
    }

    const stores = await UploadBillStore.find(filter)
      .sort({ coinsPerRupee: -1 })
      .limit(parseInt(limit as string))
      .lean();

    sendSuccess(res, stores, 'Upload bill stores retrieved successfully');
});

/**
 * GET /api/loyalty/progress
 * Get user's loyalty milestone progress
 */
export const getLoyaltyProgress = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id;

    const milestones = await LoyaltyMilestone.find({ isActive: true })
      .sort({ order: 1 })
      .lean();

    if (!userId) {
      // Unauthenticated: return milestones with zero progress
      const milestonesWithProgress = milestones.map((milestone) => ({
        ...milestone,
        currentProgress: 0,
        progressPercentage: 0,
        isCompleted: false,
      }));
      return sendSuccess(res, milestonesWithProgress, 'Loyalty progress retrieved successfully');
    }

    // Calculate real progress from CoinTransaction + OfferRedemption
    try {
      const { CoinTransaction } = await import('../models/CoinTransaction');
      const OfferRedemption = (await import('../models/OfferRedemption')).default;

      const [totalEarnings, totalRedemptions] = await Promise.all([
        CoinTransaction.aggregate([
          { $match: { userId, type: 'credit' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        OfferRedemption.countDocuments({ userId }),
      ]);

      const userTotalEarned = totalEarnings[0]?.total || 0;
      const userTotalRedeemed = totalRedemptions;

      const milestonesWithProgress = milestones.map((milestone: any) => {
        const targetValue = milestone.targetValue || 100;
        let currentProgress = 0;

        switch (milestone.progressType) {
          case 'coins_earned':
            currentProgress = userTotalEarned;
            break;
          case 'redemptions':
            currentProgress = userTotalRedeemed;
            break;
          default:
            currentProgress = userTotalEarned;
        }

        const progressPercentage = Math.min(100, Math.round((currentProgress / targetValue) * 100));
        return {
          ...milestone,
          currentProgress,
          progressPercentage,
          isCompleted: currentProgress >= targetValue,
        };
      });

      sendSuccess(res, milestonesWithProgress, 'Loyalty progress retrieved successfully');
    } catch {
      // Fallback to zero progress on error
      const milestonesWithProgress = milestones.map((milestone) => ({
        ...milestone,
        currentProgress: 0,
        progressPercentage: 0,
        isCompleted: false,
      }));
      sendSuccess(res, milestonesWithProgress, 'Loyalty progress retrieved successfully');
    }
});

/**
 * GET /api/loyalty/milestones
 * Get all loyalty milestones
 */
export const getLoyaltyMilestones = asyncHandler(async (req: Request, res: Response) => {
    const milestones = await withCache('offers:loyaltyMilestones', 3600, () =>
      LoyaltyMilestone.find({ isActive: true })
        .sort({ order: 1 })
        .lean()
    );

    sendSuccess(res, milestones, 'Loyalty milestones retrieved successfully');
});

/**
 * GET /api/offers/discount-buckets
 * Get real-time aggregation of offers by discount ranges
 * Returns counts for 25% OFF, 50% OFF, 80% OFF, and Free Delivery
 */
export const getDiscountBuckets = asyncHandler(async (req: Request, res: Response) => {
    logger.info('📊 [DISCOUNT BUCKETS] Fetching discount bucket counts');

    const now = new Date();
    const baseFilter = {
      'validity.isActive': true,
      'validity.endDate': { $gte: now },
      adminApproved: { $ne: false },
    };

    // Use MongoDB aggregation with $facet to get all counts in a single query
    const result = await Offer.aggregate([
      { $match: baseFilter },
      {
        $facet: {
          // 25% OFF: cashbackPercentage >= 25 and < 50
          '25off': [
            { $match: { cashbackPercentage: { $gte: 25, $lt: 50 } } },
            { $count: 'count' },
          ],
          // 50% OFF: cashbackPercentage >= 50 and < 80
          '50off': [
            { $match: { cashbackPercentage: { $gte: 50, $lt: 80 } } },
            { $count: 'count' },
          ],
          // 80% OFF: cashbackPercentage >= 80
          '80off': [
            { $match: { cashbackPercentage: { $gte: 80 } } },
            { $count: 'count' },
          ],
          // Free Delivery
          freeDelivery: [
            { $match: { isFreeDelivery: true } },
            { $count: 'count' },
          ],
        },
      },
    ]);

    // Extract counts from aggregation result (default to 0 if no matches)
    const counts = result[0] || {};
    const discountBuckets = [
      {
        id: 'db-1',
        label: '25% OFF',
        icon: 'pricetag',
        count: counts['25off']?.[0]?.count || 0,
        filterValue: '25',
      },
      {
        id: 'db-2',
        label: '50% OFF',
        icon: 'flash',
        count: counts['50off']?.[0]?.count || 0,
        filterValue: '50',
      },
      {
        id: 'db-3',
        label: '80% OFF',
        icon: 'flame',
        count: counts['80off']?.[0]?.count || 0,
        filterValue: '80',
      },
      {
        id: 'db-4',
        label: 'Free Delivery',
        icon: 'car',
        count: counts['freeDelivery']?.[0]?.count || 0,
        filterValue: 'free_delivery',
      },
    ];

    logger.info('✅ [DISCOUNT BUCKETS] Counts:', discountBuckets.map(b => `${b.label}: ${b.count}`).join(', '));

    sendSuccess(res, discountBuckets, 'Discount buckets retrieved successfully');
});

/**
 * GET /api/cashback/super-cashback-stores
 * Get stores with high cashback percentage (10% or more)
 */
export const getSuperCashbackStores = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 20, minCashback = 10 } = req.query;
    const { Store } = await import('../models/Store');

    // Get region from header for filtering
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    logger.info('🔥 [SUPER CASHBACK] Fetching stores with high cashback', { region: region || 'all' });

    // Build store filter
    const storeFilter: any = {
      isActive: true,
      $or: [
        { 'paymentInfo.cashback': { $gte: parseInt(minCashback as string) } },
        { 'paymentInfo.baseCashbackPercent': { $gte: parseInt(minCashback as string) } },
      ],
    };

    // Add region filter if specified
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      Object.assign(storeFilter, regionFilter);
    }

    // Find stores with cashback >= minCashback percentage
    const stores = await Store.find(storeFilter)
      .select('name logo description category location paymentInfo ratings stats')
      .sort({ 'paymentInfo.cashback': -1, 'paymentInfo.baseCashbackPercent': -1 })
      .limit(parseInt(limit as string))
      .lean();

    // Transform stores to super cashback format
    const superCashbackStores = stores.map((store: any) => ({
      id: store._id,
      name: store.name,
      logo: store.logo,
      description: store.description,
      category: store.category,
      cashbackPercentage: store.paymentInfo?.cashback || store.paymentInfo?.baseCashbackPercent || 0,
      rating: store.ratings?.average || 4.5,
      totalReviews: store.ratings?.count || 0,
      location: store.location?.address?.city || '',
      isSuperCashback: true,
      badge: store.paymentInfo?.cashback >= 20 ? 'MEGA CASHBACK' : 'SUPER CASHBACK',
    }));

    logger.info(`✅ [SUPER CASHBACK] Found ${superCashbackStores.length} stores with high cashback`);

    sendSuccess(res, superCashbackStores, 'Super cashback stores retrieved successfully');
});

/**
 * GET /api/offers/flash-sales
 * Get active flash sale offers from the offers collection
 */
export const getFlashSaleOffers = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10, category } = req.query;

    // Find offers with active flash sale metadata
    // Filter by endTime to only show non-expired sales
    const flashQuery: any = {
      'metadata.flashSale.isActive': true,
      'metadata.flashSale.endTime': { $gte: new Date() },
      adminApproved: { $ne: false },
    };

    // Filter by category if provided
    if (category && typeof category === 'string') {
      flashQuery.$or = [
        { 'metadata.category': category },
        { 'metadata.categorySlug': category },
        { 'metadata.category': { $exists: false } }, // Include global flash sales
      ];
    }

    const offers = await Offer.find(flashQuery)
      .populate('store', 'name logo')
      .sort({ 'metadata.flashSale.endTime': 1, 'metadata.priority': -1 })
      .limit(parseInt(limit as string))
      .lean();

    logger.info(`✅ [FLASH SALES] Found ${offers.length} flash sale offers`);

    // Transform offers to include calculated fields
    const transformedOffers = offers.map((offer: any) => ({
      ...offer,
      // Ensure flash sale data is easily accessible
      flashSalePrice: offer.metadata?.flashSale?.salePrice || offer.discountedPrice,
      originalPrice: offer.metadata?.flashSale?.originalPrice || offer.originalPrice,
      endTime: offer.metadata?.flashSale?.endTime || offer.validity?.endDate,
      // Calculate stock from maxQuantity if available
      stock: offer.metadata?.flashSale?.maxQuantity
        ? (offer.metadata.flashSale.maxQuantity - (offer.metadata.flashSale.soldQuantity || 0))
        : 10, // Default stock
      discountPercentage: offer.cashbackPercentage ||
        (offer.metadata?.flashSale?.originalPrice && offer.metadata?.flashSale?.salePrice
          ? Math.round(((offer.metadata.flashSale.originalPrice - offer.metadata.flashSale.salePrice) / offer.metadata.flashSale.originalPrice) * 100)
          : 0),
    }));

    sendSuccess(res, transformedOffers, 'Flash sale offers retrieved successfully');
});

/**
 * GET /api/offers/page-data-v2
 * Aggregated offers page data - single endpoint replaces 21 parallel calls
 */
export const getAggregatedOffersPageData = asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?._id?.toString();
    const { lat, lng, tab = 'all' } = req.query;
    const region = (req.headers['x-rez-region'] as string) || 'all';

    const response = await getAggregatedData({
      userId,
      lat: lat ? parseFloat(lat as string) : undefined,
      lng: lng ? parseFloat(lng as string) : undefined,
      region,
      tab: tab as 'offers' | 'cashback' | 'exclusive' | 'all',
    });

    sendSuccess(res, response, 'Offers page data retrieved successfully');
});
