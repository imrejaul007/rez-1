import { logger } from '../config/logger';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Offer, { IOffer } from '../models/Offer';
import OfferCategory from '../models/OfferCategory';
import HeroBanner from '../models/HeroBanner';
import UserOfferInteraction from '../models/UserOfferInteraction';
import OfferRedemption from '../models/OfferRedemption';
import Favorite from '../models/Favorite';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { Store } from '../models/Store';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { filterExclusiveOffers, getUserFollowedStores } from '../middleware/exclusiveOfferMiddleware';
import { validateSortField } from '../utils/sanitize';
import { recordExclusiveOfferView, recordExclusiveOfferRedemption } from '../services/followerAnalyticsService';
import { regionService, isValidRegion, RegionId } from '../services/regionService';
import redisService from '../services/redisService';
import { asyncHandler } from '../utils/asyncHandler';
import { privilegeResolutionService } from '../services/entitlement/privilegeResolutionService';

/**
 * GET /api/offers
 * Get offers with filters, sorting, and pagination
 */
export const getOffers = asyncHandler(async (req: Request, res: Response) => {
    const {
      page = 1,
      limit = 20,
      category,
      store,
      type,
      tags,
      featured,
      trending,
      new: isNew,
      minCashback,
      maxCashback,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    // Get region from header for filtering
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Build filter query
    const filter: any = {
      'validity.isActive': true,
      'validity.startDate': { $lte: new Date() },
      'validity.endDate': { $gte: new Date() },
    };

    // Add region filter by finding stores in region first
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      // Filter offers: either from stores in region OR global offers (no store)
      filter.$or = [
        { 'store.id': { $in: storeIds } },
        { 'store.id': { $exists: false } },
        { 'store.id': null }
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (store) {
      filter['store.id'] = store;
    }

    if (type) {
      filter.type = type;
    }

    if (tags) {
      filter['metadata.tags'] = { $in: [tags] };
    }

    if (featured === 'true') {
      filter['metadata.featured'] = true;
    }

    if (trending === 'true') {
      filter['metadata.isTrending'] = true;
    }

    if (isNew === 'true') {
      filter['metadata.isNew'] = true;
    }

    if (minCashback || maxCashback) {
      filter.cashbackPercentage = {};
      if (minCashback) {
        filter.cashbackPercentage.$gte = Number(minCashback);
      }
      if (maxCashback) {
        filter.cashbackPercentage.$lte = Number(maxCashback);
      }
    } else if (minCashback) {
      filter.cashbackPercentage = { $gte: Number(minCashback) };
    }

    // Sort options (whitelist to prevent injection)
    const ALLOWED_SORT_FIELDS = ['createdAt', 'title', 'cashbackPercentage', 'metadata.priority', 'discountedPrice', 'engagement.viewCount'] as const;
    const safeSortBy = validateSortField(sortBy as string, ALLOWED_SORT_FIELDS, 'createdAt');
    const sortOptions: any = {};
    sortOptions[safeSortBy] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Zone-based filtering: hide exclusive offers from users who haven't unlocked the zone
    const userId = req.user?.id;
    if (userId) {
      const priv = await privilegeResolutionService.resolve(userId);
      const zoneCondition = priv.activeZones && priv.activeZones.length > 0
        ? {
            $or: [
              { exclusiveZone: null },
              { exclusiveZone: { $exists: false } },
              { exclusiveZone: '' },
              { exclusiveZone: { $in: priv.activeZones } },
            ]
          }
        : {
            $or: [
              { exclusiveZone: null },
              { exclusiveZone: { $exists: false } },
              { exclusiveZone: '' },
            ]
          };

      // Combine with existing $or (region filter) using $and
      if (filter.$or) {
        const existingOr = filter.$or;
        delete filter.$or;
        filter.$and = [{ $or: existingOr }, zoneCondition];
      } else {
        Object.assign(filter, zoneCondition);
      }
    } else {
      // Anonymous users: only show non-exclusive offers
      if (filter.$or) {
        const existingOr = filter.$or;
        delete filter.$or;
        filter.$and = [
          { $or: existingOr },
          { $or: [{ exclusiveZone: null }, { exclusiveZone: { $exists: false } }, { exclusiveZone: '' }] },
        ];
      } else {
        filter.$or = [
          { exclusiveZone: null },
          { exclusiveZone: { $exists: false } },
          { exclusiveZone: '' },
        ];
      }
    }

    // Cache key for public (non-user-specific) offer queries
    const cacheKey = !userId
      ? `offers:${region || 'all'}:${category || ''}:${type || ''}:${safeSortBy}:${order}:${pageNum}:${limitNum}`
      : null;

    // Try cache for anonymous/public requests
    if (cacheKey) {
      const cached = await redisService.get<{ offers: any[]; total: number }>(cacheKey);
      if (cached) {
        return sendPaginated(res, cached.offers, pageNum, limitNum, cached.total, 'Offers fetched successfully');
      }
    }

    // Execute query
    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .select('title subtitle image category type cashbackPercentage originalPrice discountedPrice store validity engagement metadata isFollowerExclusive exclusiveZone saleTag bogoType isFreeDelivery deliveryTime location createdAt')
        .lean(),
      Offer.countDocuments(filter),
    ]);

    // Filter exclusive offers based on user follow status
    const followedStores = userId ? await getUserFollowedStores(userId) : [];
    const filteredOffers = await filterExclusiveOffers(offers, userId, followedStores);

    // Cache public results (60s TTL)
    if (cacheKey) {
      redisService.set(cacheKey, { offers: filteredOffers, total }, 60).catch((err) => logger.warn('[OfferCtrl] Redis cache set failed for offers list', { error: err.message }));
    }

    sendPaginated(res, filteredOffers, pageNum, limitNum, total, 'Offers fetched successfully');
});

/**
 * GET /api/offers/featured
 * Get featured offers
 */
export const getFeaturedOffers = asyncHandler(async (req: Request, res: Response) => {
    const { limit: rawLimit = 10 } = req.query;
    const limit = Math.min(50, Math.max(1, Number(rawLimit) || 10));

    // Get region from header for filtering
    const regionHeader = req.headers['x-rez-region'] as string;
    const region: RegionId | undefined = regionHeader && isValidRegion(regionHeader)
      ? regionHeader as RegionId
      : undefined;

    // Build filter
    const filter: any = {
      'metadata.featured': true,
      'validity.isActive': true,
      'validity.startDate': { $lte: new Date() },
      'validity.endDate': { $gte: new Date() }
    };

    // Add region filter
    if (region) {
      const regionFilter = regionService.getStoreFilter(region);
      const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
      const storeIds = storesInRegion.map((s: any) => s._id);
      filter.$or = [
        { 'store.id': { $in: storeIds } },
        { 'store.id': { $exists: false } },
        { 'store.id': null }
      ];
    }

    const cacheKey = `offers:featured:${region || 'all'}:${limit}`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return sendSuccess(res, cached);
    }

    const offers = await Offer.find(filter)
    .sort({ 'metadata.priority': -1, createdAt: -1 })
    .limit(limit)
    .select('title subtitle image category type cashbackPercentage originalPrice discountedPrice store validity engagement metadata isFollowerExclusive exclusiveZone saleTag bogoType isFreeDelivery deliveryTime location createdAt')
    .populate('store.id', 'name logo rating')
    .lean();

    redisService.set(cacheKey, offers, 300).catch((err) => logger.warn('[OfferCtrl] Redis cache set failed for featured offers', { error: err.message })); // 5min cache

    sendSuccess(res, offers, 'Featured offers fetched successfully');
});

/**
 * GET /api/offers/trending
 * Get trending offers
 */
export const getTrendingOffers = asyncHandler(async (req: Request, res: Response) => {
    const { limit: rawLimit = 10 } = req.query;
    const limit = Math.min(50, Math.max(1, Number(rawLimit) || 10));

    const cacheKey = `offers:trending:${limit}`;
    const cached = await redisService.get<any>(cacheKey);
    if (cached) {
      return sendSuccess(res, cached);
    }

    const offers = await Offer.findTrendingOffers(limit);

    redisService.set(cacheKey, offers, 300).catch((err) => logger.warn('[OfferCtrl] Redis cache set failed for trending offers', { error: err.message })); // 5min cache

    sendSuccess(res, offers, 'Trending offers fetched successfully');
});

/**
 * GET /api/offers/search
 * Search offers by query
 */
export const searchOffers = asyncHandler(async (req: Request, res: Response) => {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || typeof q !== 'string') {
      return sendError(res, 'Search query is required', 400);
    }

    // Text search
    const filter: any = {
      $text: { $search: q },
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    };

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      Offer.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Offer.countDocuments(filter),
    ]);

    sendPaginated(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
});

/**
 * GET /api/offers/category/:categoryId
 * Get offers by category
 */
export const getOffersByCategory = asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

    const filter: any = {
      category: categoryId,
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    };

    // Sort options (whitelist to prevent sort field injection)
    const ALLOWED_OFFER_SORT_FIELDS = ['createdAt', 'title', 'cashbackPercentage', 'metadata.priority'] as const;
    const safeSortBy = validateSortField(sortBy as string, ALLOWED_OFFER_SORT_FIELDS, 'createdAt');
    const sortOptions: any = {};
    sortOptions[safeSortBy] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Offer.countDocuments(filter),
    ]);

    sendPaginated(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
});

/**
 * GET /api/offers/store/:storeId
 * Get offers for a specific store
 */
export const getOffersByStore = asyncHandler(async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const { page = 1, limit = 20, active } = req.query;

    const filter: any = {
      'store.id': new mongoose.Types.ObjectId(storeId),
    };

    // Filter by active status if provided
    if (active !== undefined) {
      // Convert query param to boolean (handle string 'true'/'false')
      const activeStr = String(active).toLowerCase();
      const isActive = activeStr === 'true' || activeStr === '1';
      filter['validity.isActive'] = isActive;
    } else {
      // Default to active offers
      filter['validity.isActive'] = true;
    }

    // Filter by validity dates (only show offers that are currently valid)
    const now = new Date();
    filter['validity.startDate'] = { $lte: now };
    filter['validity.endDate'] = { $gte: now };

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [offers, total] = await Promise.all([
      Offer.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Offer.countDocuments(filter),
    ]);

    sendPaginated(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
});

/**
 * GET /api/offers/:id
 * Get single offer by ID
 */
export const getOfferById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const cacheKey = `offer:detail:${id}`;
    let offer = await redisService.get<any>(cacheKey);

    if (!offer) {
      offer = await Offer.findById(id).lean();
      if (!offer) {
        return sendError(res, 'Offer not found', 404);
      }
      redisService.set(cacheKey, offer, 300).catch((err) => logger.warn('[OfferCtrl] Redis cache set failed for offer detail', { offerId: id, error: err.message }));
    }

    // Check zone-exclusive access
    const userId = req.user?.id;

    if (offer.exclusiveZone && offer.exclusiveZone !== '') {
      if (!userId) {
        return sendError(res, 'Sign in to access exclusive offers', 401);
      }
      const priv = await privilegeResolutionService.resolve(userId);
      const hasAccess = priv.activeZones.includes(offer.exclusiveZone);
      if (!hasAccess) {
        return sendError(res, 'You don\'t have access to this exclusive offer', 403, {
          requiresVerification: true,
          zone: offer.exclusiveZone,
        });
      }
    }

    // Check if offer is follower-exclusive and user has access
    const offerStoreId = (offer.store as any)?._id?.toString() || (offer.store as any)?.id?.toString() || offer.store?.toString();

    if (offer.isFollowerExclusive && userId) {
      const followedStores = await getUserFollowedStores(userId);
      const filteredOffers = await filterExclusiveOffers([offer], userId, followedStores);

      if (filteredOffers.length === 0) {
        return sendError(
          res,
          'This is a follower-exclusive offer. Please follow the store to access it.',
          403,
          { requiresFollow: true, storeId: offerStoreId }
        );
      }

      // Record analytics for exclusive offer view
      if (offer.isFollowerExclusive && offerStoreId) {
        recordExclusiveOfferView(offerStoreId).catch(err =>
          logger.error('Failed to record exclusive offer view:', err)
        );
      }
    }

    // Check if user has favorited (if authenticated)
    let isFavorite = false;
    if (req.user) {
      const favorite = await Favorite.findOne({
        user: req.user.id,
        itemType: 'offer',
        item: id,
      }).lean();
      isFavorite = !!favorite;
    }

    sendSuccess(res, { ...offer, isFavorite }, 'Offer fetched successfully');
});

/**
 * POST /api/offers/:id/redeem
 * Redeem an offer (authenticated users only)
 */
export const redeemOffer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { redemptionType = 'online' } = req.body;

    // Find offer
    const offer = await Offer.findById(id).lean();

    if (!offer) {
      return sendError(res, 'Offer not found', 404);
    }

    // Check if offer is valid
    const now = new Date();
    if (now > offer.validity.endDate || now < offer.validity.startDate || !offer.validity.isActive) {
      return sendError(res, 'Offer is no longer valid', 400);
    }

    // Check exclusive zone eligibility
    if (offer.exclusiveZone) {
      const user = await User.findById(userId).lean();
      if (!user) {
        return sendError(res, 'User not found', 404);
      }

      const zone = offer.exclusiveZone;
      let isEligible = false;
      let eligibilityMessage = '';

      switch (zone) {
        case 'student':
          isEligible = user.verifications?.student?.verified === true;
          eligibilityMessage = 'This offer is exclusive to verified students. Please verify your student status to redeem.';
          break;
        case 'corporate':
          isEligible = user.verifications?.corporate?.verified === true;
          eligibilityMessage = 'This offer is exclusive to verified corporate employees. Please verify your corporate email to redeem.';
          break;
        case 'defence':
          isEligible = user.verifications?.defence?.verified === true;
          eligibilityMessage = 'This offer is exclusive to verified defence personnel. Please verify your service ID to redeem.';
          break;
        case 'healthcare':
          isEligible = user.verifications?.healthcare?.verified === true;
          eligibilityMessage = 'This offer is exclusive to verified healthcare workers. Please verify your medical ID to redeem.';
          break;
        case 'senior':
          // Check if user is 60+ based on dateOfBirth
          if (user.profile?.dateOfBirth) {
            const age = Math.floor((Date.now() - new Date(user.profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            isEligible = age >= 60;
          }
          eligibilityMessage = 'This offer is exclusive to senior citizens (60+). Please update your date of birth in profile.';
          break;
        case 'women':
          isEligible = user.profile?.gender === 'female';
          eligibilityMessage = 'This offer is exclusive to women. Please update your gender in profile.';
          break;
        case 'birthday':
          if (user.profile?.dateOfBirth) {
            const birthMonth = new Date(user.profile.dateOfBirth).getMonth();
            const currentMonth = new Date().getMonth();
            isEligible = birthMonth === currentMonth;
          }
          eligibilityMessage = 'This offer is only valid during your birthday month. Please update your date of birth in profile.';
          break;
        default:
          isEligible = true; // Unknown zone, allow by default
      }

      if (!isEligible) {
        return sendError(res, eligibilityMessage, 403);
      }
    }

    // Check if user already has an active redemption for this offer
    const existingActiveRedemption = await OfferRedemption.findOne({
      user: userId,
      offer: id,
      status: { $in: ['active', 'pending'] }
    }).lean();

    if (existingActiveRedemption) {
      return sendError(res, 'You have already redeemed this offer. Please check "My Vouchers" to view your voucher.', 400);
    }

    // Check user redemption limit (count all redemptions including used ones)
    const userRedemptionCount = await OfferRedemption.countDocuments({
      user: userId,
      offer: id
    });

    if (offer.restrictions.usageLimitPerUser && userRedemptionCount >= offer.restrictions.usageLimitPerUser) {
      return sendError(res, 'You have already reached the redemption limit for this offer', 400);
    }

    // Check global redemption limit atomically (prevents race condition on limited offers)
    if (offer.restrictions.usageLimit) {
      const totalRedemptions = await OfferRedemption.countDocuments({ offer: id });
      if (totalRedemptions >= offer.restrictions.usageLimit) {
        return sendError(res, 'Offer redemption limit reached', 400);
      }
    }

    // Create redemption with cashback details
    // Use try-catch to handle concurrent limit breach (if two requests pass the count check simultaneously)
    let redemption;
    try {
      redemption = new OfferRedemption({
        user: userId,
        offer: id,
        redemptionType,
        redemptionDate: new Date(),
        validityDays: 30,
        status: 'active',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      await redemption.save();

      // Post-save: verify limit wasn't exceeded by concurrent requests
      if (offer.restrictions.usageLimit) {
        const postCount = await OfferRedemption.countDocuments({ offer: id });
        if (postCount > offer.restrictions.usageLimit) {
          // Race condition: rollback this redemption
          await OfferRedemption.deleteOne({ _id: redemption._id });
          return sendError(res, 'Offer redemption limit reached', 400);
        }
      }
    } catch (saveError: any) {
      if (saveError.code === 11000) {
        return sendError(res, 'Duplicate redemption detected', 409);
      }
      throw saveError;
    }

    // Update offer redemption count
    await Offer.findByIdAndUpdate(id, {
      $inc: { 'redemptionCount': 1 }
    });

    // Invalidate cached offer detail after redemption count change
    redisService.del(`offer:detail:${id}`).catch((err) => logger.warn('[OfferCtrl] Redis cache invalidation failed after redeem', { offerId: id, error: err.message }));

    // Create FriendRedemption records for user's followers (social proof feed, non-blocking)
    setImmediate(async () => {
      try {
        const Follow = (await import('../models/Follow')).default;
        const FriendRedemption = (await import('../models/FriendRedemption')).default;
        const user = await User.findById(userId).select('fullName profile.avatar').lean();
        const followers = await Follow.find({ following: userId }).select('follower').lean();
        if (followers.length > 0 && user) {
          const storeName = (offer.store as any)?.name || '';
          const storeLogo = (offer.store as any)?.logo || '';
          const docs = followers.map((f: any) => ({
            userId: f.follower,
            friendId: userId,
            friendName: (user as any).fullName || 'A friend',
            friendAvatar: (user as any).profile?.avatar || '',
            offerId: id,
            offerTitle: offer.title,
            offerImage: offer.image || '',
            storeName,
            storeLogo,
            savings: offer.cashbackPercentage || 0,
            cashbackPercentage: offer.cashbackPercentage || 0,
            redeemedAt: new Date(),
            isVisible: true,
          }));
          await FriendRedemption.insertMany(docs, { ordered: false }).catch((err) => logger.error('[OfferCtrl] FriendRedemption bulk insert failed', { error: err.message }));
        }
      } catch (err) {
        logger.error('[OFFER] FriendRedemption creation failed (non-blocking):', err);
      }
    });

    // Record analytics for exclusive offer redemption
    if (offer.isFollowerExclusive) {
      const storeId = offer.store?.id?.toString() || offer.store?.toString();
      if (storeId) {
        recordExclusiveOfferRedemption(storeId).catch(err =>
          logger.error('Failed to record exclusive offer redemption:', err)
        );
      }
    }

    // Populate for response with cashback info and restrictions
    await redemption.populate('offer', 'title image cashbackPercentage validUntil type category restrictions');

    // Return response with cashback details and terms
    const responseData = {
      ...redemption.toObject(),
      cashbackPercentage: offer.cashbackPercentage,
      offerType: offer.type,
      restrictions: {
        minOrderValue: offer.restrictions.minOrderValue,
        maxDiscountAmount: offer.restrictions.maxDiscountAmount,
        usageLimitPerUser: offer.restrictions.usageLimitPerUser,
      },
    };

    sendSuccess(res, responseData, 'Offer redeemed successfully', 201);
});

/**
 * GET /api/offers/my-redemptions
 * Get user's offer redemptions
 */
export const getUserRedemptions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { status, page = 1, limit = 20 } = req.query;

    const filter: any = { user: userId };

    if (status) {
      filter.status = status;
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [redemptions, total] = await Promise.all([
      OfferRedemption.find(filter)
        .populate('offer', 'title image cashbackPercentage category validUntil type restrictions')
        .populate('order', 'orderNumber totalAmount status')
        .sort({ redemptionDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      OfferRedemption.countDocuments(filter),
    ]);

    // Enhance redemptions with cashback info and restrictions
    const enhancedRedemptions = redemptions.map((redemption: any) => ({
      ...redemption,
      cashbackPercentage: redemption.offer?.cashbackPercentage || 0,
      restrictions: {
        minOrderValue: redemption.offer?.restrictions?.minOrderValue,
        maxDiscountAmount: redemption.offer?.restrictions?.maxDiscountAmount,
        usageLimitPerUser: redemption.offer?.restrictions?.usageLimitPerUser,
      },
    }));

    sendPaginated(res, enhancedRedemptions, pageNum, limitNum, total, 'Redemptions fetched successfully');
});

/**
 * POST /api/offers/:id/favorite
 * Add offer to favorites
 */
export const addOfferToFavorites = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if offer exists
    const offer = await Offer.findById(id).lean();

    if (!offer) {
      return sendError(res, 'Offer not found', 404);
    }

    // Check if already favorited
    const existing = await Favorite.findOne({
      user: userId,
      itemType: 'offer',
      item: id,
    }).lean();

    if (existing) {
      return sendError(res, 'Offer already in favorites', 400);
    }

    // Create favorite
    const favorite = new Favorite({
      user: userId,
      itemType: 'offer',
      item: id,
    });

    await favorite.save();

    // Update offer engagement
    await Offer.findByIdAndUpdate(id, {
      $inc: { 'engagement.favoriteCount': 1 }
    });

    sendSuccess(res, { success: true }, 'Offer added to favorites', 201);
});

/**
 * DELETE /api/offers/:id/favorite
 * Remove offer from favorites
 */
export const removeOfferFromFavorites = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    // Remove favorite
    const result = await Favorite.findOneAndDelete({
      user: userId,
      itemType: 'offer',
      item: id,
    });

    if (!result) {
      return sendError(res, 'Favorite not found', 404);
    }

    // Update offer engagement
    await Offer.findByIdAndUpdate(id, {
      $inc: { 'engagement.favoriteCount': -1 }
    });

    sendSuccess(res, { success: true }, 'Offer removed from favorites');
});

/**
 * GET /api/offers/favorites
 * Get user's favorite offers
 */
export const getUserFavoriteOffers = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Get favorites
    const [favorites, total] = await Promise.all([
      Favorite.find({
        user: userId,
        itemType: 'offer',
      })
        .populate({
          path: 'item',
          model: 'Offer',
          populate: [
            { path: 'category', select: 'name slug' },
            { path: 'store', select: 'name logo location ratings' },
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Favorite.countDocuments({
        user: userId,
        itemType: 'offer',
      }),
    ]);

    // Extract offers
    const offers = favorites.map((fav: any) => ({
      ...fav.item,
      isFavorite: true,
    }));

    sendPaginated(res, offers, pageNum, limitNum, total, 'Offers fetched successfully');
});

/**
 * POST /api/offers/:id/view
 * Track offer view (analytics)
 */
export const trackOfferView = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (userId) {
      // Authenticated: dedup per user per 24h
      const viewKey = `offer-view:${userId}:${id}`;
      const alreadyViewed = await redisService.get(viewKey);
      if (!alreadyViewed) {
        await Offer.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
        await redisService.set(viewKey, '1', 86400);
      }
    } else {
      // Anonymous: cap at 3 views per IP per offer per 24h
      const ip = req.ip || 'unknown';
      const ipKey = `offer-view-ip:${ip}:${id}`;
      const ipViews = parseInt(await redisService.get(ipKey) || '0', 10);
      if (ipViews < 3) {
        await Offer.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });
        await redisService.set(ipKey, String(ipViews + 1), 86400);
      }
    }

    sendSuccess(res, { success: true }, 'View tracked');
  } catch (error) {
    logger.error('Error tracking view:', error);
    // Don't return error for analytics endpoints
    res.status(200).json({ success: true });
  }
};

/**
 * POST /api/offers/:id/click
 * Track offer click (analytics)
 */
export const trackOfferClick = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Increment click count
    await Offer.findByIdAndUpdate(id, { $inc: { clickCount: 1 } });

    sendSuccess(res, { success: true }, 'Click tracked');
  } catch (error) {
    logger.error('Error tracking click:', error);
    // Don't return error for analytics endpoints
    res.status(200).json({ success: true });
  }
};

/**
 * GET /api/offers/recommendations
 * Get personalized offer recommendations (optional auth)
 */
export const getRecommendedOffers = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    const userId = req.user?.id;

    const now = new Date();
    const baseFilter: any = {
      'validity.isActive': true,
      'validity.startDate': { $lte: now },
      'validity.endDate': { $gte: now },
    };

    // If authenticated, try to personalize based on transaction history
    if (userId) {
      try {
        const { CoinTransaction } = await import('../models/CoinTransaction');
        const recentTxns = await CoinTransaction.find({
          userId,
          type: 'credit',
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        })
          .select('metadata.storeId')
          .limit(50)
          .lean();

        const storeIds = [...new Set(recentTxns
          .map((t: any) => t.metadata?.storeId?.toString())
          .filter(Boolean)
        )];

        if (storeIds.length > 0) {
          const personalizedOffers = await Offer.find({
            ...baseFilter,
            'store.id': { $in: storeIds },
          })
            .sort({ 'engagement.viewsCount': -1 })
            .limit(Number(limit))
            .lean();

          if (personalizedOffers.length >= 3) {
            return sendSuccess(res, personalizedOffers, 'Personalized offers fetched successfully');
          }
        }
      } catch {
        // Fall through to trending offers
      }
    }

    // Fallback: trending offers
    const offers = await Offer.find(baseFilter)
      .sort({ 'engagement.viewsCount': -1, 'engagement.likesCount': -1 })
      .limit(Number(limit))
      .populate('store.id', 'name logo rating')
      .lean();

    sendSuccess(res, offers, 'Recommended offers fetched successfully');
});

/**
 * GET /api/offers/mega
 * Get mega offers
 */
export const getMegaOffers = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;

    const offers = await Offer.findMegaOffers();
    const limitedOffers = offers.slice(0, Number(limit));

    sendSuccess(res, limitedOffers, 'Mega offers fetched successfully');
});

/**
 * GET /api/offers/students
 * Get student offers
 */
export const getStudentOffers = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;

    const offers = await Offer.findStudentOffers();
    const limitedOffers = offers.slice(0, Number(limit));

    sendSuccess(res, limitedOffers, 'Student offers fetched successfully');
});

/**
 * GET /api/offers/new-arrivals
 * Get new arrival offers
 */
export const getNewArrivalOffers = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;

    const offers = await Offer.findNewArrivals(Number(limit));

    sendSuccess(res, offers, 'New arrival offers fetched successfully');
});

/**
 * GET /api/offers/nearby
 * Get nearby offers based on user location
 */
export const getNearbyOffers = asyncHandler(async (req: Request, res: Response) => {
    const { lat, lng, maxDistance = 10, limit = 20 } = req.query;

    if (!lat || !lng) {
      return sendError(res, 'Latitude and longitude are required', 400);
    }

    const userLocation: [number, number] = [Number(lng), Number(lat)];
    const offers = await Offer.findNearbyOffers(userLocation, Number(maxDistance));
    const limitedOffers = offers.slice(0, Number(limit));

    // Calculate distances for each offer
    const offersWithDistance = limitedOffers.map(offer => ({
      ...offer.toObject(),
      distance: offer.calculateDistance(userLocation)
    }));

    sendSuccess(res, offersWithDistance, 'Nearby offers fetched successfully');
});

/**
 * GET /api/offers/page-data
 * Get complete offers page data (hero banner, sections, etc.)
 */
export const getOffersPageData = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { lat, lng } = req.query;

    // Get hero banner
    const heroBanner = await HeroBanner.findActiveBanners('offers', 'top');
    const activeHeroBanner = heroBanner.length > 0 ? heroBanner[0] : null;

    // Get mega offers
    const megaOffers = await Offer.findMegaOffers();
    const limitedMegaOffers = megaOffers.slice(0, 5);

    // Get student offers
    const studentOffers = await Offer.findStudentOffers();
    const limitedStudentOffers = studentOffers.slice(0, 4);

    // Get new arrival offers
    const newArrivalOffers = await Offer.findNewArrivals(4);

    // Get trending offers
    const trendingOffers = await Offer.findTrendingOffers(5);

    // Get user's liked offers if authenticated
    let userLikedOffers: string[] = [];
    if (userId) {
      const likedInteractions = await UserOfferInteraction.find({
        user: userId,
        action: 'like'
      }).select('offer').lean();
      userLikedOffers = likedInteractions.map(interaction => interaction.offer.toString());
    }

    // Calculate distances if location provided
    let offersWithDistance: any = {
      mega: limitedMegaOffers,
      students: limitedStudentOffers,
      newArrivals: newArrivalOffers,
      trending: trendingOffers
    };

    if (lat && lng) {
      const userLocation: [number, number] = [Number(lng), Number(lat)];
      
      // Helper function to calculate distance
      const calculateDistance = (offer: any): number => {
        if (!offer.location?.coordinates) return 0;
        const [lng, lat] = offer.location.coordinates;
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat - userLocation[1]) * Math.PI / 180;
        const dLng = (lng - userLocation[0]) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(userLocation[1] * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return Math.round(R * c * 10) / 10; // Round to 1 decimal place
      };
      
      offersWithDistance = {
        mega: limitedMegaOffers.map(offer => ({
          ...offer,
          distance: calculateDistance(offer)
        })),
        students: limitedStudentOffers.map(offer => ({
          ...offer,
          distance: calculateDistance(offer)
        })),
        newArrivals: newArrivalOffers.map(offer => ({
          ...offer,
          distance: calculateDistance(offer)
        })),
        trending: trendingOffers.map(offer => ({
          ...offer,
          distance: calculateDistance(offer)
        }))
      };
    }

    // Add user engagement data
    const offersWithEngagement: any = {
      mega: offersWithDistance.mega.map((offer: any) => ({
        ...offer,
        engagement: {
          ...offer.engagement,
          isLikedByUser: userLikedOffers.includes(offer._id.toString())
        }
      })),
      students: offersWithDistance.students.map((offer: any) => ({
        ...offer,
        engagement: {
          ...offer.engagement,
          isLikedByUser: userLikedOffers.includes(offer._id.toString())
        }
      })),
      newArrivals: offersWithDistance.newArrivals.map((offer: any) => ({
        ...offer,
        engagement: {
          ...offer.engagement,
          isLikedByUser: userLikedOffers.includes(offer._id.toString())
        }
      })),
      trending: offersWithDistance.trending.map((offer: any) => ({
        ...offer,
        engagement: {
          ...offer.engagement,
          isLikedByUser: userLikedOffers.includes(offer._id.toString())
        }
      }))
    };

    // Get user's wallet balance - check Wallet model first, then User.wallet
    let userWalletBalance = 0;
    if (userId) {
      // Check Wallet model first (more accurate)
      const wallet = await Wallet.findOne({ user: userId }).lean();
      
      if (wallet) {
        userWalletBalance = wallet.balance.available || wallet.balance.total || 0;
      } else {
        // Fallback to User.wallet
        const user = await User.findById(userId).select('wallet walletBalance phoneNumber').lean();
        userWalletBalance = user?.wallet?.balance || user?.walletBalance || req.user?.wallet?.balance || 0;
      }
    }

    const pageData: any = {
      heroBanner: activeHeroBanner,
      sections: {
        mega: {
          title: 'MEGA OFFERS',
          offers: offersWithEngagement.mega
        },
        students: {
          title: 'Offer for the students',
          offers: offersWithEngagement.students
        },
        newArrivals: {
          title: 'New arrival',
          offers: offersWithEngagement.newArrivals
        },
        trending: {
          title: 'Trending Now',
          offers: offersWithEngagement.trending
        }
      },
      userEngagement: {
        likedOffers: userLikedOffers,
        userPoints: userWalletBalance
      }
    };

    sendSuccess(res, pageData, 'Offers page data fetched successfully');
});

/**
 * POST /api/offers/:id/like
 * Like/unlike an offer
 */
export const toggleOfferLike = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    const offer = await Offer.findById(id).lean();
    if (!offer) {
      return sendError(res, 'Offer not found', 404);
    }

    // Check if user already liked this offer
    const existingInteraction = await UserOfferInteraction.findOne({
      user: userId,
      offer: id,
      action: 'like'
    }).lean();

    let isLiked = false;

    if (existingInteraction) {
      // Unlike the offer
      await UserOfferInteraction.findByIdAndDelete(existingInteraction._id);
      // Atomic decrement (floor at 0 handled by Math.max on read)
      await Offer.findByIdAndUpdate(id, {
        $inc: { 'engagement.likesCount': -1 }
      });
    } else {
      // Like the offer
      await UserOfferInteraction.trackInteraction(
        userId,
        new mongoose.Types.ObjectId(id),
        'like',
        {
          source: 'offers_page',
          device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
          ipAddress: req.ip
        }
      );
      // Atomic increment
      await Offer.findByIdAndUpdate(id, {
        $inc: { 'engagement.likesCount': 1 }
      });
      isLiked = true;
    }

    // Re-read the updated count
    const updatedOffer = await Offer.findById(id).select('engagement.likesCount').lean();
    const likesCount = Math.max(0, updatedOffer?.engagement?.likesCount || 0);

    sendSuccess(res, {
      isLiked,
      likesCount
    }, isLiked ? 'Offer liked successfully' : 'Offer unliked successfully');
});

/**
 * POST /api/offers/:id/share
 * Share an offer
 */
export const shareOffer = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const { platform, message } = req.body;

    const offer = await Offer.findById(id).lean();
    if (!offer) {
      return sendError(res, 'Offer not found', 404);
    }

    // Track share interaction
    if (userId) {
      await UserOfferInteraction.trackInteraction(
        userId,
        new mongoose.Types.ObjectId(id),
        'share',
        {
          source: 'offers_page',
          platform,
          message,
          device: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
          ipAddress: req.ip
        }
      );
    }

    // Update offer share count
    await Offer.findByIdAndUpdate(id, {
      $inc: { 'engagement.sharesCount': 1 }
    });

    sendSuccess(res, { success: true }, 'Offer shared successfully');
});

/**
 * GET /api/offer-categories
 * Get all offer categories
 */
export const getOfferCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await OfferCategory.findActiveCategories();

    sendSuccess(res, categories, 'Offer categories fetched successfully');
});

/**
 * GET /api/hero-banners
 * Get active hero banners
 */
export const getHeroBanners = asyncHandler(async (req: Request, res: Response) => {
    const { page = 'offers', position = 'top' } = req.query;
    const userData = req.user ? {
      userType: req.user.userType,
      age: req.user.age,
      location: req.user.location,
      interests: req.user.interests
    } : undefined;

    const banners = await HeroBanner.findBannersForUser(userData, page as string);

    sendSuccess(res, banners, 'Hero banners fetched successfully');
});

/**
 * POST /api/offers/redemptions/validate
 * Validate a redemption code before use
 */
export const validateRedemptionCode = asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body;
    const userId = req.user?.id;

    // Require authentication
    if (!userId) {
      return sendError(res, 'Authentication required', 401);
    }

    if (!code) {
      return sendError(res, 'Redemption code is required', 400);
    }

    // Find redemption by code
    const redemption = await OfferRedemption.findOne({
      redemptionCode: code.toUpperCase()
    }).populate('offer', 'title image cashbackPercentage category type restrictions store');

    if (!redemption) {
      return sendError(res, 'Invalid redemption code', 404);
    }

    // Check ownership - user can only validate their own vouchers
    if (redemption.user.toString() !== userId) {
      return sendError(res, 'This voucher belongs to another user', 403);
    }

    // Check if valid
    if (!redemption.isValid()) {
      if (redemption.status === 'used') {
        return sendError(res, 'This voucher has already been used', 400);
      }
      if (redemption.status === 'expired') {
        return sendError(res, 'This voucher has expired', 400);
      }
      if (redemption.status === 'cancelled') {
        return sendError(res, 'This voucher has been cancelled', 400);
      }
      return sendError(res, 'This voucher is no longer valid', 400);
    }

    // Get offer details for discount calculation
    const offer = redemption.offer as any;

    sendSuccess(res, {
      valid: true,
      redemption: {
        _id: redemption._id,
        redemptionCode: redemption.redemptionCode,
        status: redemption.status,
        expiryDate: redemption.expiryDate,
        redemptionType: redemption.redemptionType,
        verificationCode: redemption.verificationCode,
      },
      offer: {
        _id: offer._id,
        title: offer.title,
        image: offer.image,
        cashbackPercentage: offer.cashbackPercentage,
        type: offer.type,
        restrictions: {
          minOrderValue: offer.restrictions?.minOrderValue || 0,
          maxDiscountAmount: offer.restrictions?.maxDiscountAmount || null,
        }
      }
    }, 'Voucher is valid');
});

/**
 * POST /api/offers/redemptions/:id/use
 * Mark a redemption as used and credit cashback to wallet
 * Uses MongoDB transaction for atomicity
 */
export const markRedemptionAsUsed = async (req: Request, res: Response) => {
  // Start MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { orderAmount, orderId, storeId } = req.body;

    if (!orderAmount || orderAmount <= 0) {
      await session.abortTransaction();
      session.endSession();
      return sendError(res, 'Valid order amount is required', 400);
    }

    // Atomic find and update - prevents race conditions
    // Only update if status is 'active' to prevent double-spending
    const redemption = await OfferRedemption.findOneAndUpdate(
      {
        _id: id,
        user: userId,
        status: 'active', // Only match active redemptions
        expiryDate: { $gt: new Date() } // Not expired
      },
      {
        $set: {
          status: 'used',
          usedDate: new Date(),
          ...(orderId && { order: orderId }),
          ...(storeId && { usedAtStore: storeId })
        }
      },
      {
        new: false, // Return the document BEFORE update to get offer details
        session
      }
    ).populate('offer', 'title cashbackPercentage type restrictions');

    if (!redemption) {
      await session.abortTransaction();
      session.endSession();
      // Could be: not found, already used, expired, or belongs to another user
      return sendError(res, 'Voucher not found, already used, or expired', 400);
    }

    const offer = redemption.offer as any;

    if (!offer) {
      await session.abortTransaction();
      session.endSession();
      return sendError(res, 'Associated offer not found', 404);
    }

    // Check minimum order value
    if (offer.restrictions?.minOrderValue && orderAmount < offer.restrictions.minOrderValue) {
      // Rollback - set status back to active
      await OfferRedemption.findByIdAndUpdate(id, { status: 'active', usedDate: null }, { session });
      await session.abortTransaction();
      session.endSession();
      return sendError(res, `Minimum order value of ₹${offer.restrictions.minOrderValue} required`, 400);
    }

    // Calculate cashback
    let cashbackAmount = (orderAmount * offer.cashbackPercentage) / 100;

    // Apply max discount cap if set
    if (offer.restrictions?.maxDiscountAmount && cashbackAmount > offer.restrictions.maxDiscountAmount) {
      cashbackAmount = offer.restrictions.maxDiscountAmount;
    }

    // Round to 2 decimal places
    cashbackAmount = Math.round(cashbackAmount * 100) / 100;

    // Update redemption with amount
    await OfferRedemption.findByIdAndUpdate(id, { usedAmount: cashbackAmount }, { session });

    // Credit cashback via walletService (atomic $inc + CoinTransaction + LedgerEntry)
    const { walletService } = await import('../services/walletService');
    await walletService.credit({
      userId,
      amount: cashbackAmount,
      source: 'cashback',
      description: `Cashback from ${offer.title}`,
      operationType: 'offer_cashback',
      referenceId: `offer-cashback:${redemption._id}`,
      referenceModel: 'OfferRedemption',
      metadata: {
        offerId: offer._id,
        offerTitle: offer.title,
        orderAmount,
        cashbackPercentage: offer.cashbackPercentage,
        redemptionId: redemption._id,
      },
      session,
    });

    const walletAfter = await Wallet.findOne({ user: userId }).lean();
    const walletBalance = walletAfter
      ? { total: walletAfter.balance.total, available: walletAfter.balance.available }
      : { total: 0, available: 0 };

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Send push notification (async, don't wait - after transaction committed)
    try {
      const NotificationService = require('../services/notificationService').default;
      NotificationService.sendToUser(userId, {
        title: 'Cashback Credited! 🎉',
        body: `₹${cashbackAmount} cashback from ${offer.title} has been added to your wallet!`,
        data: {
          type: 'cashback_credited',
          amount: cashbackAmount,
          redemptionId: (redemption as any)._id?.toString() || id,
        }
      }).catch((err: any) => logger.error('Failed to send cashback notification:', err));
    } catch (notifError) {
      logger.error('Failed to send cashback notification:', notifError);
    }

    sendSuccess(res, {
      success: true,
      redemption: {
        _id: (redemption as any)._id || id,
        status: 'used',
        usedDate: new Date(),
        usedAmount: cashbackAmount,
      },
      cashback: {
        amount: cashbackAmount,
        percentage: offer.cashbackPercentage,
        orderAmount,
      },
      wallet: walletBalance.total > 0 ? walletBalance : null,
    }, `₹${cashbackAmount} cashback credited to your wallet!`);
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    session.endSession();
    logger.error('Error marking redemption as used:', error);
    sendError(res, 'Failed to process voucher', 500);
  }
};

/**
 * GET /api/offers/redemptions/:id
 * Get single redemption details with QR code
 */
export const getRedemptionById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    const redemption = await OfferRedemption.findOne({
      _id: id,
      user: userId
    }).populate('offer', 'title image cashbackPercentage category type restrictions store').lean();

    if (!redemption) {
      return sendError(res, 'Redemption not found', 404);
    }

    const offer = redemption.offer as any;

    sendSuccess(res, {
      ...redemption,
      cashbackPercentage: offer?.cashbackPercentage || 0,
      restrictions: {
        minOrderValue: offer?.restrictions?.minOrderValue || 0,
        maxDiscountAmount: offer?.restrictions?.maxDiscountAmount || null,
      }
    }, 'Redemption fetched successfully');
});