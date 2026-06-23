import { logger } from '../config/logger';
/**
 * Offers Page Service
 * Aggregates data from multiple sources for the offers page
 * Uses parallel execution + Redis caching for optimal performance
 * Pattern follows homepageService.ts
 */

import Offer from '../models/Offer';
import FlashSale from '../models/FlashSale';
import HotspotArea from '../models/HotspotArea';
import DoubleCashbackCampaign from '../models/DoubleCashbackCampaign';
import CoinDrop from '../models/CoinDrop';
import UploadBillStore from '../models/UploadBillStore';
import BankOffer from '../models/BankOffer';
import ExclusiveZone from '../models/ExclusiveZone';
import SpecialProfile from '../models/SpecialProfile';
import LoyaltyMilestone from '../models/LoyaltyMilestone';
import FriendRedemption from '../models/FriendRedemption';
import { Store } from '../models/Store';
import OffersSectionConfig from '../models/OffersSectionConfig';
import { withCache, CacheKeys } from '../utils/cacheHelper';
import { CacheTTL } from '../config/redis';
import { regionService, isValidRegion, RegionId } from './regionService';

// Common filter: only show admin-approved, non-suspended offers in public queries
const APPROVED_FILTER = { adminApproved: { $ne: false }, isSuspended: { $ne: true } };

// Default limits for each section
const SECTION_LIMITS = {
  lightningDeals: 10,
  discountBuckets: 4,
  nearbyOffers: 10,
  saleOffers: 10,
  bogoOffers: 10,
  freeDeliveryOffers: 10,
  todaysOffers: 10,
  trendingOffers: 10,
  aiRecommendedOffers: 10,
  friendsRedeemed: 10,
  hotspots: 10,
  lastChanceOffers: 10,
  newTodayOffers: 10,
  doubleCashback: 5,
  coinDrops: 20,
  superCashbackStores: 20,
  uploadBillStores: 20,
  bankOffers: 10,
  exclusiveZones: 20,
  specialProfiles: 20,
  loyaltyMilestones: 20,
};

interface OffersPageParams {
  userId?: string;
  lat?: number;
  lng?: number;
  region?: string;
  tab?: 'offers' | 'cashback' | 'exclusive' | 'all';
}

interface SectionData {
  data: any[];
  order: number;
}

interface OffersPageResponse {
  sections: Record<string, SectionData>;
  heroBanner: any | null;
  metadata: {
    timestamp: Date;
    fetchDurationMs: number;
    populatedSections: number;
    totalSections: number;
  };
}

// ==========================================
// Individual section fetch functions
// ==========================================

async function fetchFlashSales(limit: number): Promise<any[]> {
  const flashSales = await (FlashSale as any).getActive()
    .populate('products', 'name image price stock')
    .populate('stores', 'name logo location')
    .populate('category', 'name slug')
    .limit(limit)
    .lean();
  return flashSales;
}

async function fetchDiscountBuckets(): Promise<any[]> {
  const now = new Date();
  const baseFilter = {
    'validity.isActive': true,
    'validity.startDate': { $lte: now },
    'validity.endDate': { $gte: now },
    ...APPROVED_FILTER,
  };

  const result = await Offer.aggregate([
    { $match: baseFilter },
    {
      $facet: {
        '25off': [
          { $match: { cashbackPercentage: { $gte: 25, $lt: 50 } } },
          { $count: 'count' },
        ],
        '50off': [
          { $match: { cashbackPercentage: { $gte: 50, $lt: 80 } } },
          { $count: 'count' },
        ],
        '80off': [
          { $match: { cashbackPercentage: { $gte: 80 } } },
          { $count: 'count' },
        ],
        freeDelivery: [
          { $match: { isFreeDelivery: true } },
          { $count: 'count' },
        ],
      },
    },
  ]);

  const counts = result[0] || {};
  return [
    { id: 'db-1', label: '25% OFF', icon: 'pricetag', count: counts['25off']?.[0]?.count || 0, filterValue: '25' },
    { id: 'db-2', label: '50% OFF', icon: 'flash', count: counts['50off']?.[0]?.count || 0, filterValue: '50' },
    { id: 'db-3', label: '80% OFF', icon: 'flame', count: counts['80off']?.[0]?.count || 0, filterValue: '80' },
    { id: 'db-4', label: 'Free Delivery', icon: 'car', count: counts['freeDelivery']?.[0]?.count || 0, filterValue: 'free_delivery' },
  ];
}

async function fetchTrendingOffers(limit: number): Promise<any[]> {
  return Offer.find({
    'validity.isActive': true,
    'validity.startDate': { $lte: new Date() },
    'validity.endDate': { $gte: new Date() },
    ...APPROVED_FILTER,
  })
    .sort({ 'engagement.viewsCount': -1 })
    .limit(limit)
    .lean();
}

async function fetchNearbyOffers(lat: number, lng: number, limit: number): Promise<any[]> {
  const offers = await Offer.find({
    'validity.isActive': true,
    'validity.startDate': { $lte: new Date() },
    'validity.endDate': { $gte: new Date() },
    ...APPROVED_FILTER,
    location: {
      $nearSphere: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: 10000, // 10km
      },
    },
  })
    .limit(limit)
    .lean();

  // Enrich with delivery fields expected by NearbyOffersSection
  return offers.map((offer: any) => ({
    ...offer,
    deliveryFee: offer.isFreeDelivery ? 0 : (offer.deliveryFee || 5),
    deliveryTime: '15-30 min',
    rating: offer.store?.rating || 4.5,
    isFreeDelivery: offer.isFreeDelivery || false,
  }));
}

async function fetchSaleOffers(limit: number): Promise<any[]> {
  const offers = await Offer.find({
    'validity.isActive': true,
    'validity.startDate': { $lte: new Date() },
    'validity.endDate': { $gte: new Date() },
    saleTag: { $exists: true, $ne: null },
    ...APPROVED_FILTER,
  })
    .sort({ 'metadata.priority': -1 })
    .limit(limit)
    .lean();

  // Enrich with computed discount fields expected by SaleOffersSection
  return offers.map((offer: any) => {
    const discountPercentage = offer.originalPrice && offer.discountedPrice
      ? Math.round(((offer.originalPrice - offer.discountedPrice) / offer.originalPrice) * 100)
      : offer.cashbackPercentage || 0;

    return {
      ...offer,
      discountPercentage,
      salePrice: offer.discountedPrice || offer.originalPrice,
      tag: offer.saleTag || (discountPercentage > 0 ? `${discountPercentage}% OFF` : ''),
    };
  });
}

async function fetchBOGOOffers(limit: number): Promise<any[]> {
  return Offer.find({
    'validity.isActive': true,
    'validity.startDate': { $lte: new Date() },
    'validity.endDate': { $gte: new Date() },
    bogoType: { $exists: true, $ne: null },
    ...APPROVED_FILTER,
  })
    .sort({ 'metadata.priority': -1 })
    .limit(limit)
    .lean();
}

async function fetchFreeDeliveryOffers(limit: number): Promise<any[]> {
  return Offer.find({
    'validity.isActive': true,
    'validity.startDate': { $lte: new Date() },
    'validity.endDate': { $gte: new Date() },
    isFreeDelivery: true,
    ...APPROVED_FILTER,
  })
    .sort({ 'metadata.priority': -1 })
    .limit(limit)
    .lean();
}

async function fetchFlashSaleOffers(limit: number): Promise<any[]> {
  const offers = await Offer.find({
    'metadata.flashSale.isActive': true,
    'metadata.flashSale.endTime': { $gte: new Date() },
    ...APPROVED_FILTER,
  })
    .populate('store', 'name logo')
    .sort({ 'metadata.flashSale.endTime': 1, 'metadata.priority': -1 })
    .limit(limit)
    .lean();

  return offers.map((offer: any) => ({
    ...offer,
    flashSalePrice: offer.metadata?.flashSale?.salePrice || offer.discountedPrice,
    originalPrice: offer.metadata?.flashSale?.originalPrice || offer.originalPrice,
    endTime: offer.metadata?.flashSale?.endTime || offer.validity?.endDate,
    stock: offer.metadata?.flashSale?.maxQuantity
      ? (offer.metadata.flashSale.maxQuantity - (offer.metadata.flashSale.soldQuantity || 0))
      : 10,
    discountPercentage: offer.cashbackPercentage || 0,
  }));
}

async function fetchRecommendedOffers(limit: number, userId?: string): Promise<any[]> {
  const offers = await Offer.find({
    'validity.isActive': true,
    'validity.startDate': { $lte: new Date() },
    'validity.endDate': { $gte: new Date() },
    ...APPROVED_FILTER,
  })
    .sort({ 'engagement.viewsCount': -1 })
    .limit(limit)
    .lean();

  // Enrich with matchScore and reason expected by AIRecommendedSection
  const reasons = [
    'Popular in your area',
    'Trending this week',
    'Based on your interests',
    'Highly rated by users',
    'Best value offer',
  ];

  return offers.map((offer: any, index: number) => ({
    ...offer,
    matchScore: Math.round(Math.max(65, 100 - (index * 5))),
    reason: reasons[index % reasons.length],
  }));
}

async function fetchNewArrivals(limit: number): Promise<any[]> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  return Offer.find({
    'validity.isActive': true,
    'validity.startDate': { $lte: new Date() },
    'validity.endDate': { $gte: new Date() },
    createdAt: { $gte: threeDaysAgo },
    ...APPROVED_FILTER,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function fetchExpiringSoon(limit: number): Promise<any[]> {
  const now = new Date();
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return (FlashSale as any).find({
    isActive: true,
    endTime: { $gte: now, $lte: oneDayLater },
    status: { $nin: ['ended', 'sold_out'] },
  })
    .populate('stores', 'name logo')
    .sort({ endTime: 1 })
    .limit(limit)
    .lean();
}

async function fetchFriendsRedeemed(limit: number, userId?: string): Promise<any[]> {
  let filter: any = { isVisible: true };

  // If user is authenticated, filter to only show friends they follow
  if (userId) {
    try {
      const Follow = (await import('../models/Follow')).default;
      const followDocs = await Follow.find({ follower: userId }).select('following').lean();
      const followedIds = followDocs.map((f: any) => f.following);
      if (followedIds.length > 0) {
        filter.friendId = { $in: followedIds };
      }
    } catch {
      // Fallback to all visible on error
    }
  }

  return FriendRedemption.find(filter)
    .populate('offerId')
    .populate('friendId', 'fullName avatar')
    .sort({ redeemedAt: -1 })
    .limit(limit)
    .lean();
}

async function fetchHotspots(limit: number): Promise<any[]> {
  return HotspotArea.find({ isActive: true })
    .sort({ priority: -1 })
    .limit(limit)
    .lean();
}

// Cashback tab fetchers
async function fetchDoubleCashback(limit: number, region?: string): Promise<any[]> {
  const filter: any = {
    isActive: true,
    startTime: { $lte: new Date() },
    endTime: { $gte: new Date() },
  };
  if (region) {
    filter.$or = [
      { region },
      { region: 'all' },
      { region: { $exists: false } },
    ];
  }
  return DoubleCashbackCampaign.find(filter)
    .sort({ startTime: 1 })
    .limit(limit)
    .lean();
}

async function fetchCoinDrops(limit: number, region?: string): Promise<any[]> {
  const filter: any = {
    isActive: true,
    startTime: { $lte: new Date() },
    endTime: { $gte: new Date() },
  };
  if (region && isValidRegion(region)) {
    const regionFilter = regionService.getStoreFilter(region as RegionId);
    const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
    filter.storeId = { $in: storesInRegion.map((s: any) => s._id) };
  }
  return CoinDrop.find(filter)
    .populate('storeId', 'name logo')
    .sort({ multiplier: -1 })
    .limit(limit)
    .lean();
}

async function fetchSuperCashbackStores(limit: number, region?: string): Promise<any[]> {
  const storeFilter: any = {
    isActive: true,
    $or: [
      { 'paymentInfo.cashback': { $gte: 10 } },
      { 'paymentInfo.baseCashbackPercent': { $gte: 10 } },
    ],
  };
  if (region && isValidRegion(region)) {
    const regionFilter = regionService.getStoreFilter(region as RegionId);
    Object.assign(storeFilter, regionFilter);
  }
  const stores = await Store.find(storeFilter)
    .select('name logo description category location paymentInfo ratings stats')
    .sort({ 'paymentInfo.cashback': -1, 'paymentInfo.baseCashbackPercent': -1 })
    .limit(limit)
    .lean();

  return stores.map((store: any) => ({
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
    badge: (store.paymentInfo?.cashback || 0) >= 20 ? 'MEGA CASHBACK' : 'SUPER CASHBACK',
  }));
}

async function fetchUploadBillStores(limit: number, region?: string): Promise<any[]> {
  const filter: any = { isActive: true };
  if (region && isValidRegion(region)) {
    const regionFilter = regionService.getStoreFilter(region as RegionId);
    const storesInRegion = await Store.find({ isActive: true, ...regionFilter }).select('_id').lean();
    filter.storeId = { $in: storesInRegion.map((s: any) => s._id) };
  }
  return UploadBillStore.find(filter)
    .sort({ coinsPerRupee: -1 })
    .limit(limit)
    .lean();
}

async function fetchBankOffers(limit: number): Promise<any[]> {
  return BankOffer.find({
    isActive: true,
    validFrom: { $lte: new Date() },
    validUntil: { $gte: new Date() },
  })
    .sort({ priority: -1 })
    .limit(limit)
    .lean();
}

// Exclusive tab fetchers
async function fetchExclusiveZones(userId?: string): Promise<any[]> {
  const zones = await ExclusiveZone.find({ isActive: true })
    .sort({ priority: -1 })
    .lean();

  if (!userId) return zones;

  try {
    const { User } = await import('../models/User');
    const user = await User.findById(userId).lean();
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
            isEligible = birthMonth === new Date().getMonth();
          }
          break;
        case 'age':
          if (user.profile?.dateOfBirth) {
            const age = Math.floor((Date.now() - new Date(user.profile.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            isEligible = age >= 60;
          }
          break;
        case 'verification':
          isEligible = true;
          break;
        default:
          isEligible = !zone.verificationRequired;
      }
      return { ...zone, userEligible: isEligible };
    });
  } catch {
    return zones;
  }
}

async function fetchSpecialProfiles(userId?: string): Promise<any[]> {
  const profiles = await SpecialProfile.find({ isActive: true })
    .sort({ priority: -1 })
    .lean();

  if (!userId) return profiles;

  try {
    const { User } = await import('../models/User');
    const user = await User.findById(userId).lean();
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
      return { ...profile, userEligible: isEligible };
    });
  } catch {
    return profiles;
  }
}

async function fetchLoyaltyMilestones(userId?: string): Promise<any[]> {
  const milestones = await LoyaltyMilestone.find({ isActive: true })
    .sort({ order: 1 })
    .lean();

  if (!userId) {
    return milestones.map((milestone) => ({
      ...milestone,
      currentProgress: 0,
      progressPercentage: 0,
      isCompleted: false,
    }));
  }

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

    return milestones.map((milestone: any) => {
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
  } catch {
    return milestones.map((milestone) => ({
      ...milestone,
      currentProgress: 0,
      progressPercentage: 0,
      isCompleted: false,
    }));
  }
}

// ==========================================
// Main aggregated function
// ==========================================

/**
 * Load section configs from DB. Returns a Map of sectionKey -> config.
 * If no configs exist (not yet seeded), all sections are enabled by default.
 */
async function loadSectionConfigs(): Promise<Map<string, { isEnabled: boolean; sortOrder: number; maxItems: number }>> {
  try {
    const configs = await OffersSectionConfig.find().lean();
    const map = new Map<string, { isEnabled: boolean; sortOrder: number; maxItems: number }>();
    for (const cfg of configs) {
      map.set(cfg.sectionKey, {
        isEnabled: cfg.isEnabled,
        sortOrder: cfg.sortOrder,
        maxItems: cfg.maxItems,
      });
    }
    return map;
  } catch {
    // If config collection doesn't exist yet, return empty (all sections default enabled)
    return new Map();
  }
}

function isSectionEnabled(
  sectionKey: string,
  configMap: Map<string, { isEnabled: boolean; sortOrder: number; maxItems: number }>,
): boolean {
  const cfg = configMap.get(sectionKey);
  // If no config exists for this section, default to enabled
  return cfg ? cfg.isEnabled : true;
}

function getSectionLimit(
  sectionKey: string,
  configMap: Map<string, { isEnabled: boolean; sortOrder: number; maxItems: number }>,
): number {
  const cfg = configMap.get(sectionKey);
  return cfg?.maxItems || (SECTION_LIMITS as any)[sectionKey] || 10;
}

function getSectionOrder(
  sectionKey: string,
  configMap: Map<string, { isEnabled: boolean; sortOrder: number; maxItems: number }>,
  fallback: number,
): number {
  const cfg = configMap.get(sectionKey);
  return cfg?.sortOrder ?? fallback;
}

export async function getOffersPageData(params: OffersPageParams): Promise<OffersPageResponse> {
  const startTime = Date.now();
  const { userId, lat, lng, region = 'all', tab = 'all' } = params;

  logger.info(`[OFFERS_PAGE] Starting aggregated fetch tab=${tab} region=${region} userId=${userId ? 'yes' : 'anon'}`);

  const cacheKey = CacheKeys.offersPageData(region, tab);

  // User-specific data (exclusive zones, special profiles) can't be cached globally
  // For anonymous users, use cache. For authenticated, skip cache for personalized sections
  const useCache = !userId;

  const fetchAll = async (): Promise<OffersPageResponse> => {
    const errors: Record<string, string> = {};
    const sections: Record<string, SectionData> = {};

    // Load admin section configs to respect visibility/ordering/limits
    const configMap = await loadSectionConfigs();

    // Build promise map based on requested tab, skipping disabled sections
    const promises: Record<string, Promise<any>> = {};

    // Offers tab sections
    if (tab === 'all' || tab === 'offers') {
      if (isSectionEnabled('lightningDeals', configMap))
        promises.lightningDeals = fetchFlashSales(getSectionLimit('lightningDeals', configMap)).catch(e => { errors.lightningDeals = e.message; return []; });
      if (isSectionEnabled('discountBuckets', configMap))
        promises.discountBuckets = fetchDiscountBuckets().catch(e => { errors.discountBuckets = e.message; return []; });
      if (isSectionEnabled('trendingOffers', configMap))
        promises.trendingOffers = fetchTrendingOffers(getSectionLimit('trendingOffers', configMap)).catch(e => { errors.trendingOffers = e.message; return []; });
      if (isSectionEnabled('saleOffers', configMap))
        promises.saleOffers = fetchSaleOffers(getSectionLimit('saleOffers', configMap)).catch(e => { errors.saleOffers = e.message; return []; });
      if (isSectionEnabled('bogoOffers', configMap))
        promises.bogoOffers = fetchBOGOOffers(getSectionLimit('bogoOffers', configMap)).catch(e => { errors.bogoOffers = e.message; return []; });
      if (isSectionEnabled('freeDeliveryOffers', configMap))
        promises.freeDeliveryOffers = fetchFreeDeliveryOffers(getSectionLimit('freeDeliveryOffers', configMap)).catch(e => { errors.freeDeliveryOffers = e.message; return []; });
      if (isSectionEnabled('todaysOffers', configMap))
        promises.todaysOffers = fetchFlashSaleOffers(getSectionLimit('todaysOffers', configMap)).catch(e => { errors.todaysOffers = e.message; return []; });
      if (isSectionEnabled('aiRecommendedOffers', configMap))
        promises.aiRecommendedOffers = fetchRecommendedOffers(getSectionLimit('aiRecommendedOffers', configMap), userId).catch(e => { errors.aiRecommendedOffers = e.message; return []; });
      if (isSectionEnabled('friendsRedeemed', configMap))
        promises.friendsRedeemed = fetchFriendsRedeemed(getSectionLimit('friendsRedeemed', configMap), userId).catch(e => { errors.friendsRedeemed = e.message; return []; });
      if (isSectionEnabled('hotspots', configMap))
        promises.hotspots = fetchHotspots(getSectionLimit('hotspots', configMap)).catch(e => { errors.hotspots = e.message; return []; });
      if (isSectionEnabled('lastChanceOffers', configMap))
        promises.lastChanceOffers = fetchExpiringSoon(getSectionLimit('lastChanceOffers', configMap)).catch(e => { errors.lastChanceOffers = e.message; return []; });
      if (isSectionEnabled('newTodayOffers', configMap))
        promises.newTodayOffers = fetchNewArrivals(getSectionLimit('newTodayOffers', configMap)).catch(e => { errors.newTodayOffers = e.message; return []; });

      if (lat && lng && isSectionEnabled('nearbyOffers', configMap)) {
        promises.nearbyOffers = fetchNearbyOffers(lat, lng, getSectionLimit('nearbyOffers', configMap)).catch(e => { errors.nearbyOffers = e.message; return []; });
      }
    }

    // Cashback tab sections
    if (tab === 'all' || tab === 'cashback') {
      if (isSectionEnabled('doubleCashback', configMap))
        promises.doubleCashback = fetchDoubleCashback(getSectionLimit('doubleCashback', configMap), region).catch(e => { errors.doubleCashback = e.message; return []; });
      if (isSectionEnabled('coinDrops', configMap))
        promises.coinDrops = fetchCoinDrops(getSectionLimit('coinDrops', configMap), region).catch(e => { errors.coinDrops = e.message; return []; });
      if (isSectionEnabled('superCashbackStores', configMap))
        promises.superCashbackStores = fetchSuperCashbackStores(getSectionLimit('superCashbackStores', configMap), region).catch(e => { errors.superCashbackStores = e.message; return []; });
      if (isSectionEnabled('uploadBillStores', configMap))
        promises.uploadBillStores = fetchUploadBillStores(getSectionLimit('uploadBillStores', configMap), region).catch(e => { errors.uploadBillStores = e.message; return []; });
      if (isSectionEnabled('bankOffers', configMap))
        promises.bankOffers = fetchBankOffers(getSectionLimit('bankOffers', configMap)).catch(e => { errors.bankOffers = e.message; return []; });
    }

    // Exclusive tab sections
    if (tab === 'all' || tab === 'exclusive') {
      if (isSectionEnabled('exclusiveZones', configMap))
        promises.exclusiveZones = fetchExclusiveZones(userId).catch(e => { errors.exclusiveZones = e.message; return []; });
      if (isSectionEnabled('specialProfiles', configMap))
        promises.specialProfiles = fetchSpecialProfiles(userId).catch(e => { errors.specialProfiles = e.message; return []; });
      if (isSectionEnabled('loyaltyMilestones', configMap))
        promises.loyaltyMilestones = fetchLoyaltyMilestones(userId).catch(e => { errors.loyaltyMilestones = e.message; return []; });
    }

    // Execute all in parallel
    const keys = Object.keys(promises);
    const results = await Promise.all(Object.values(promises));

    // Build sections record with admin-configured sort order
    keys.forEach((key, index) => {
      const data = Array.isArray(results[index]) ? results[index] : [];
      sections[key] = { data, order: getSectionOrder(key, configMap, index) };
    });

    const duration = Date.now() - startTime;
    const populatedSections = keys.filter((_, i) => Array.isArray(results[i]) && results[i].length > 0).length;

    if (Object.keys(errors).length > 0) {
      logger.warn(`[OFFERS_PAGE] Errors in sections: ${Object.keys(errors).join(', ')}`);
    }

    const disabledCount = configMap.size > 0
      ? Array.from(configMap.values()).filter(c => !c.isEnabled).length
      : 0;
    logger.info(`[OFFERS_PAGE] durationMs=${duration} populatedSections=${populatedSections}/${keys.length} disabledSections=${disabledCount} region=${region} tab=${tab}`);

    return {
      sections,
      heroBanner: null, // Will be added separately if needed
      metadata: {
        timestamp: new Date(),
        fetchDurationMs: duration,
        populatedSections,
        totalSections: keys.length,
      },
    };
  };

  // Use cache for anonymous requests
  if (useCache) {
    return withCache(cacheKey, CacheTTL.OFFERS_PAGE_DATA, fetchAll);
  }

  return fetchAll();
}
