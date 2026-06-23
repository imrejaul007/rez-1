import { useState, useEffect, useCallback } from 'react';
import realOffersApi from '@/services/realOffersApi';

// Feature flag - set to true to use real API
const USE_REAL_API = process.env.EXPO_PUBLIC_MOCK_API !== 'true';

// Feature flag - set to true to use aggregated endpoint (single call instead of 21)
const USE_AGGREGATED = true;

// Helper to normalize MongoDB _id to id for all raw data
const normalizeId = (item: any) => ({ ...item, id: item._id || item.id });

// Helper function to transform offers to ensure proper store structure
const transformOfferWithStore = (offer: any) => {
  if (!offer) return offer;

  // If store is already properly structured, return as-is
  if (offer.store && typeof offer.store === 'object' && offer.store.name) {
    return {
      ...offer,
      id: offer._id || offer.id,
    };
  }

  // Transform flat structure to nested store structure
  return {
    ...offer,
    id: offer._id || offer.id,
    store: {
      id: offer.storeId || offer.store?.id || offer.store?._id || '',
      name: offer.storeName || offer.store?.name || 'Store',
      logo: offer.storeLogo || offer.store?.logo || offer.image || '',
      rating: offer.storeRating || offer.store?.rating,
      verified: offer.storeVerified || offer.store?.verified,
    },
  };
};

// Helper to transform an array of offers
const transformOffersArray = (offers: any[]): any[] => {
  if (!Array.isArray(offers)) return [];
  return offers.map(transformOfferWithStore);
};

// Helper to transform flash sales to LightningDeal format (has stores[] array instead of store object)
const transformFlashSaleToLightningDeal = (flashSale: any) => {
  if (!flashSale) return flashSale;

  return {
    id: flashSale._id || flashSale.id,
    title: flashSale.title,
    subtitle: flashSale.description || '',
    image: flashSale.image,
    store: {
      id: flashSale.stores?.[0]?._id || flashSale.stores?.[0]?.id || '',
      name: flashSale.stores?.[0]?.name || 'Store',
      logo: flashSale.stores?.[0]?.logo || flashSale.image,
    },
    originalPrice: flashSale.originalPrice,
    discountedPrice: flashSale.flashSalePrice,
    discountPercentage: flashSale.discountPercentage,
    cashbackPercentage: flashSale.cashbackPercentage || 0,
    totalQuantity: flashSale.maxQuantity || 100,
    claimedQuantity: flashSale.soldQuantity || 0,
    endTime: flashSale.endTime,
    promoCode: flashSale.promoCode,
  };
};

// Transform flash sales array
const transformFlashSalesArray = (flashSales: any[]): any[] => {
  if (!Array.isArray(flashSales)) return [];
  return flashSales.map(transformFlashSaleToLightningDeal);
};

interface OffersPageApiData {
  // Existing sections
  lightningDeals: any[];
  nearbyOffers: any[];
  trendingOffers: any[];
  friendsRedeemed: any[];

  // Discount buckets (real-time counts)
  discountBuckets: any[];

  // Cashback tab
  hotspots: any[];
  doubleCashback: any[];
  coinDrops: any[];
  uploadBillStores: any[];
  bankOffers: any[];
  superCashbackStores: any[];

  // Exclusive tab
  exclusiveZones: any[];
  specialProfiles: any[];
  loyaltyMilestones: any[];

  // Offer types
  bogoOffers: any[];
  saleOffers: any[];
  freeDeliveryOffers: any[];

  // Additional sections (previously using dummy data)
  todaysOffers: any[];
  aiRecommendedOffers: any[];
  lastChanceOffers: any[];
  newTodayOffers: any[];

  // Hero banner
  heroBanner: any | null;
}

export function useOffersData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // API data states
  const [apiData, setApiData] = useState<OffersPageApiData>({
    lightningDeals: [],
    nearbyOffers: [],
    trendingOffers: [],
    friendsRedeemed: [],
    discountBuckets: [],
    hotspots: [],
    doubleCashback: [],
    coinDrops: [],
    uploadBillStores: [],
    bankOffers: [],
    superCashbackStores: [],
    exclusiveZones: [],
    specialProfiles: [],
    loyaltyMilestones: [],
    bogoOffers: [],
    saleOffers: [],
    freeDeliveryOffers: [],
    todaysOffers: [],
    aiRecommendedOffers: [],
    lastChanceOffers: [],
    newTodayOffers: [],
    heroBanner: null,
  });

  // Fetch data via aggregated endpoint (single API call)
  const fetchAggregatedData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await realOffersApi.getAggregatedPageData({
        lat: 12.9716, lng: 77.5946, tab: 'all',
      });

      if (response.success && response.data) {
        const { sections } = response.data;
        const getSectionData = (key: string): any[] => sections?.[key]?.data || [];

        // Transform friends redeemed data
        const friendsRedeemedRaw = getSectionData('friendsRedeemed');
        const transformedFriendsRedeemed = friendsRedeemedRaw.map((item: any) => ({
          id: item._id || item.id,
          friendId: item.friendId,
          friendName: item.friendName,
          friendAvatar: item.friendAvatar,
          offer: {
            id: item.offerId || item._id,
            title: item.offerTitle,
            image: item.offerImage,
            store: item.storeName,
            savings: item.savings || 0,
            cashbackPercentage: item.cashbackPercentage || 0,
          },
          redeemedAt: item.redeemedAt,
        }));

        setApiData({
          lightningDeals: transformFlashSalesArray(getSectionData('lightningDeals')),
          discountBuckets: getSectionData('discountBuckets'),
          trendingOffers: transformOffersArray(getSectionData('trendingOffers')),
          nearbyOffers: transformOffersArray(getSectionData('nearbyOffers')),
          friendsRedeemed: transformedFriendsRedeemed,
          hotspots: getSectionData('hotspots').map((d: any) => ({ ...normalizeId(d), areaId: d._id || d.id })),
          doubleCashback: getSectionData('doubleCashback').map(normalizeId),
          coinDrops: getSectionData('coinDrops').map(normalizeId),
          uploadBillStores: getSectionData('uploadBillStores').map(normalizeId),
          bankOffers: getSectionData('bankOffers').map(normalizeId),
          superCashbackStores: getSectionData('superCashbackStores').map((s: any) => ({ ...normalizeId(s), isSuper: s.isSuperCashback ?? true })),
          exclusiveZones: getSectionData('exclusiveZones').map(normalizeId),
          specialProfiles: getSectionData('specialProfiles').map((p: any) => ({ ...normalizeId(p), isVerified: p.userEligible ?? false })),
          loyaltyMilestones: getSectionData('loyaltyMilestones').map((m: any) => ({ ...normalizeId(m), currentValue: m.currentProgress ?? 0 })),
          bogoOffers: transformOffersArray(getSectionData('bogoOffers')),
          saleOffers: transformOffersArray(getSectionData('saleOffers')),
          freeDeliveryOffers: transformOffersArray(getSectionData('freeDeliveryOffers')),
          todaysOffers: transformOffersArray(getSectionData('todaysOffers')),
          aiRecommendedOffers: transformOffersArray(getSectionData('aiRecommendedOffers')),
          lastChanceOffers: transformFlashSalesArray(getSectionData('lastChanceOffers')),
          newTodayOffers: transformOffersArray(getSectionData('newTodayOffers')),
          heroBanner: response.data.heroBanner || null,
        });

      } else {
        setError('Failed to load offers data');
      }
    } catch (err) {
      setError('Failed to load offers data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fallback: Fetch data from individual APIs (21 parallel calls)
  const fetchOffersDataLegacy = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        flashSalesRes, discountBucketsRes, trendingRes, nearbyRes,
        hotspotsRes, doubleCashbackRes, coinDropsRes, uploadBillRes,
        bankOffersRes, superCashbackStoresRes, exclusiveZonesRes,
        specialProfilesRes, loyaltyRes, bogoRes, saleRes,
        freeDeliveryRes, friendsRedeemedRes, todaysOffersRes,
        aiRecommendedRes, lastChanceRes, newTodayRes, heroBannerRes,
      ] = await Promise.allSettled([
        realOffersApi.getFlashSales(10),
        realOffersApi.getDiscountBuckets(),
        realOffersApi.getTrendingOffers(10),
        realOffersApi.getNearbyOffers({ lat: 12.9716, lng: 77.5946, limit: 10 }),
        realOffersApi.getHotspots({ limit: 10 }),
        realOffersApi.getDoubleCashbackCampaigns(5),
        realOffersApi.getCoinDrops({ limit: 20 }),
        realOffersApi.getUploadBillStores({ limit: 20 }),
        realOffersApi.getBankOffers({ limit: 10 }),
        realOffersApi.getSuperCashbackStores({ limit: 20 }),
        realOffersApi.getExclusiveZones(),
        realOffersApi.getSpecialProfiles(),
        realOffersApi.getLoyaltyMilestones(),
        realOffersApi.getBOGOOffers({ limit: 10 }),
        realOffersApi.getSaleOffers({ limit: 10 }),
        realOffersApi.getFreeDeliveryOffers(10),
        realOffersApi.getFriendsRedeemed(10),
        realOffersApi.getTodaysOffers(10),
        realOffersApi.getRecommendedOffers(10),
        realOffersApi.getExpiringSoonOffers(10),
        realOffersApi.getNewArrivals(10),
        realOffersApi.getHeroBanners({ page: 'offers' }),
      ]);

      const extractData = (result: PromiseSettledResult<any>) => {
        if (result.status === 'fulfilled' && result.value?.success && result.value?.data) {
          return result.value.data;
        }
        return [];
      };

      const friendsRedeemedData = extractData(friendsRedeemedRes);
      const transformedFriendsRedeemed = friendsRedeemedData.map((item: any) => ({
        id: item._id || item.id,
        friendId: item.friendId,
        friendName: item.friendName,
        friendAvatar: item.friendAvatar,
        offer: {
          id: item.offerId || item._id,
          title: item.offerTitle,
          image: item.offerImage,
          store: item.storeName,
          savings: item.savings || 0,
          cashbackPercentage: item.cashbackPercentage || 0,
        },
        redeemedAt: item.redeemedAt,
      }));

      const heroBannerData = extractData(heroBannerRes);

      setApiData({
        lightningDeals: transformFlashSalesArray(extractData(flashSalesRes)),
        discountBuckets: extractData(discountBucketsRes),
        trendingOffers: transformOffersArray(extractData(trendingRes)),
        nearbyOffers: transformOffersArray(extractData(nearbyRes)),
        friendsRedeemed: transformedFriendsRedeemed,
        hotspots: extractData(hotspotsRes).map((d: any) => ({ ...normalizeId(d), areaId: d._id || d.id })),
        doubleCashback: extractData(doubleCashbackRes).map(normalizeId),
        coinDrops: extractData(coinDropsRes).map(normalizeId),
        uploadBillStores: extractData(uploadBillRes).map(normalizeId),
        bankOffers: extractData(bankOffersRes).map(normalizeId),
        superCashbackStores: extractData(superCashbackStoresRes).map((s: any) => ({ ...normalizeId(s), isSuper: s.isSuperCashback ?? true })),
        exclusiveZones: extractData(exclusiveZonesRes).map(normalizeId),
        specialProfiles: extractData(specialProfilesRes).map((p: any) => ({ ...normalizeId(p), isVerified: p.userEligible ?? false })),
        loyaltyMilestones: extractData(loyaltyRes).map((m: any) => ({ ...normalizeId(m), currentValue: m.currentProgress ?? 0 })),
        bogoOffers: transformOffersArray(extractData(bogoRes)),
        saleOffers: transformOffersArray(extractData(saleRes)),
        freeDeliveryOffers: transformOffersArray(extractData(freeDeliveryRes)),
        todaysOffers: transformOffersArray(extractData(todaysOffersRes)),
        aiRecommendedOffers: transformOffersArray(extractData(aiRecommendedRes)),
        lastChanceOffers: transformFlashSalesArray(extractData(lastChanceRes)),
        newTodayOffers: transformOffersArray(extractData(newTodayRes)),
        heroBanner: Array.isArray(heroBannerData) ? heroBannerData[0] || null : heroBannerData || null,
      });
    } catch (err) {
      setError('Failed to load offers data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Choose fetch strategy
  const fetchOffersData = USE_AGGREGATED ? fetchAggregatedData : fetchOffersDataLegacy;

  // Load initial data
  useEffect(() => {
    if (USE_REAL_API) {
      fetchOffersData();
    } else {
      setLoading(true);
      // Simulate loading delay for dummy data
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [fetchOffersData]);

  // Refresh data
  const refreshData = useCallback(() => {
    if (USE_REAL_API) {
      fetchOffersData();
    }
  }, [fetchOffersData]);

  return {
    loading,
    error,
    apiData,
    isUsingRealApi: USE_REAL_API,
    refreshData,
  };
}
