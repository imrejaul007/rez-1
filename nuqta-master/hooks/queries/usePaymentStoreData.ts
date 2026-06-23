// @ts-nocheck
/**
 * Payment Store react-query hooks
 *
 * Thin wrappers around storeSearchService / storePaymentApi that expose
 * standard useQuery results. The main usePaymentStoreSearch hook composes
 * these internally so consumers keep the same return shape.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { storeSearchService } from '@/services/storeSearchService';
import storePaymentApi from '@/services/storePaymentApi';
import {
  PaymentStoreInfo,
  PAYMENT_SEARCH_CONSTANTS,
} from '@/types/paymentStoreSearch.types';

// ---------- helpers (pure, module-scoped) ----------

/**
 * Known brand names for brand detection
 */
const KNOWN_BRANDS = [
  'baskin', 'robbins', 'mcdonald', 'kfc', 'burger king', 'starbucks', 'subway',
  'dominos', 'pizza hut', 'central', 'lifestyle', 'westside', 'pantaloons',
  'reliance', 'shoppers stop', 'max', 'bata', 'puma', 'nike', 'adidas',
  'decathlon', 'croma', 'vijay sales', 'big bazaar', 'dmart', 'more',
  'spencer', 'nature basket', 'foodhall', 'zara', 'h&m', 'uniqlo',
];

const SERVICE_CATEGORIES = [
  'service', 'salon', 'spa', 'beauty', 'repair', 'maintenance',
  'healthcare', 'medical', 'dental', 'fitness', 'gym', 'yoga',
  'cleaning', 'laundry', 'car wash', 'automotive',
];

const isStoreOpenNow = (hours: any): { isOpen: boolean; openTime?: string; closeTime?: string } => {
  if (!hours) return { isOpen: true };
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const currentDay = days[now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const todayHours = hours[currentDay];
  if (!todayHours || todayHours.closed) return { isOpen: false };
  const [openHour, openMin] = (todayHours.open || '09:00').split(':').map(Number);
  const [closeHour, closeMin] = (todayHours.close || '21:00').split(':').map(Number);
  return {
    isOpen: currentTime >= openHour * 60 + openMin && currentTime <= closeHour * 60 + closeMin,
    openTime: todayHours.open,
    closeTime: todayHours.close,
  };
};

const detectIsBrand = (store: any): boolean => {
  if (store.isBrand === true) return true;
  if (store.isFeatured === true) return true;
  const nameLower = (store.name || '').toLowerCase();
  if (KNOWN_BRANDS.some(brand => nameLower.includes(brand))) return true;
  const tags = store.tags || [];
  if (tags.some((tag: string) => tag.toLowerCase().includes('brand'))) return true;
  if (store.isVerified === true) return true;
  return false;
};

const detectIsService = (store: any): boolean => {
  if (store.isService === true) return true;
  const categoryName = (store.category?.name || '').toLowerCase();
  const categorySlug = (store.category?.slug || '').toLowerCase();
  if (SERVICE_CATEGORIES.some(svc => categoryName.includes(svc) || categorySlug.includes(svc))) return true;
  const tags = store.tags || [];
  if (tags.some((tag: string) => SERVICE_CATEGORIES.some(svc => tag.toLowerCase().includes(svc)))) return true;
  return false;
};

const detectIsLocal = (store: any, isBrand: boolean, isService: boolean): boolean => {
  if (store.isLocal === true) return true;
  if (!isBrand && !isService) return true;
  const tags = store.tags || [];
  if (tags.some((tag: string) => tag.toLowerCase().includes('local'))) return true;
  return false;
};

export const transformToPaymentStore = (store: any, distance?: number): PaymentStoreInfo => {
  const openStatus = isStoreOpenNow(store.operationalInfo?.hours);
  const isBrand = detectIsBrand(store);
  const isService = detectIsService(store);
  const isLocal = detectIsLocal(store, isBrand, isService);

  return {
    _id: store._id,
    name: store.name,
    slug: store.slug,
    logo: store.logo,
    description: store.description,
    category: {
      _id: store.category?._id || '',
      name: store.category?.name || 'General',
      slug: store.category?.slug || 'general',
      icon: store.category?.icon,
    },
    location: {
      address: store.location?.address || '',
      city: store.location?.city || '',
      state: store.location?.state,
      pincode: store.location?.pincode,
      coordinates: store.location?.coordinates,
    },
    distance: distance || store.distance,
    paymentSettings: {
      acceptUPI: store.paymentSettings?.acceptUPI ?? true,
      acceptCards: store.paymentSettings?.acceptCards ?? true,
      acceptPayLater: store.paymentSettings?.acceptPayLater ?? false,
      acceptRezCoins: store.paymentSettings?.acceptRezCoins ?? true,
      acceptPromoCoins: store.paymentSettings?.acceptPromoCoins ?? true,
      acceptPayBill: store.paymentSettings?.acceptPayBill ?? false,
      maxCoinRedemptionPercent: store.paymentSettings?.maxCoinRedemptionPercent ?? 50,
      allowHybridPayment: store.paymentSettings?.allowHybridPayment ?? true,
      allowOffers: store.paymentSettings?.allowOffers ?? true,
      allowCashback: store.paymentSettings?.allowCashback ?? true,
      upiId: store.paymentSettings?.upiId,
      upiName: store.paymentSettings?.upiName,
    },
    rewardRules: {
      baseCashbackPercent: store.rewardRules?.baseCashbackPercent ?? 2,
      reviewBonusCoins: store.rewardRules?.reviewBonusCoins ?? 10,
      socialShareBonusCoins: store.rewardRules?.socialShareBonusCoins ?? 5,
      minimumAmountForReward: store.rewardRules?.minimumAmountForReward ?? 25,
      extraRewardThreshold: store.rewardRules?.extraRewardThreshold,
      extraRewardCoins: store.rewardRules?.extraRewardCoins,
      visitMilestoneRewards: store.rewardRules?.visitMilestoneRewards,
    },
    ratings: {
      average: store.ratings?.average || 0,
      count: store.ratings?.count || 0,
    },
    isActive: store.isActive ?? true,
    hasRezPay: store.operationalInfo?.acceptsWalletPayment ?? store.hasRezPay ?? true,
    maxCashback: store.rewardRules?.baseCashbackPercent ?? store.offers?.cashback ?? store.maxCashback ?? 0,
    lastPaidAt: store.lastPaidAt,
    totalPayments: store.totalPayments,
    popularityScore: store.popularityScore,
    isFeatured: store.isFeatured ?? false,
    isBrand,
    isHot: store.isHot ?? false,
    isLocal,
    isOnline: store.isOnline ?? false,
    isVerified: store.isVerified ?? false,
    isOpen: openStatus.isOpen,
    isService,
    offers: {
      discount: store.offers?.cashback || store.rewardRules?.baseCashbackPercent || 0,
      cashback: store.offers?.cashback || store.rewardRules?.baseCashbackPercent || 0,
      maxCashback: store.offers?.maxCashback,
      minOrderAmount: store.offers?.minOrderAmount,
      isPartner: store.offers?.isPartner ?? false,
      partnerLevel: store.offers?.partnerLevel,
    },
    operationalInfo: {
      deliveryTime: store.operationalInfo?.deliveryTime,
      minimumOrder: store.operationalInfo?.minimumOrder,
      deliveryFee: store.operationalInfo?.deliveryFee,
      freeDeliveryAbove: store.operationalInfo?.freeDeliveryAbove,
      paymentMethods: store.operationalInfo?.paymentMethods,
      isOpenNow: openStatus.isOpen,
      openingTime: openStatus.openTime,
      closingTime: openStatus.closeTime,
    },
    deliveryCategories: {
      fastDelivery: store.deliveryCategories?.fastDelivery ?? false,
      budgetFriendly: store.deliveryCategories?.budgetFriendly ?? false,
      premium: store.deliveryCategories?.premium ?? false,
      organic: store.deliveryCategories?.organic ?? false,
      lowestPrice: store.deliveryCategories?.lowestPrice ?? false,
    },
    analytics: {
      totalOrders: store.analytics?.totalOrders,
      followersCount: store.analytics?.followersCount,
    },
    contact: {
      phone: store.contact?.phone,
      whatsapp: store.contact?.whatsapp,
    },
    tags: store.tags || [],
  };
};

// ---------- query hooks ----------

/**
 * Fetch nearby payment stores by user coordinates.
 * Disabled until valid lat/lon are provided.
 */
export function usePaymentNearbyStores(lat: number | undefined, lon: number | undefined) {
  return useQuery({
    queryKey: queryKeys.paymentStore.nearby(lat ?? 0, lon ?? 0),
    queryFn: async (): Promise<PaymentStoreInfo[]> => {
      const locationString = `${lon},${lat}`;
      const response = await storeSearchService.getNearbyStores({
        location: locationString,
        radius: PAYMENT_SEARCH_CONSTANTS.DEFAULT_RADIUS,
        limit: PAYMENT_SEARCH_CONSTANTS.NEARBY_LIMIT,
      });
      if (response.success && response.data.stores) {
        return response.data.stores.map((store: any) =>
          transformToPaymentStore(store, store.distance)
        );
      }
      return [];
    },
    enabled: typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon),
  });
}

/**
 * Fetch recent payment stores from transaction history.
 * Requires auth. Resolves full store data for each unique storeId.
 */
export function usePaymentRecentStores(isAuthenticated: boolean) {
  return useQuery({
    queryKey: queryKeys.paymentStore.recent(),
    queryFn: async (): Promise<PaymentStoreInfo[]> => {
      const response = await storePaymentApi.getHistory({
        limit: PAYMENT_SEARCH_CONSTANTS.RECENT_LIMIT,
      });
      if (!response.transactions || response.transactions.length === 0) return [];

      const uniqueStoreIds = [...new Set(response.transactions.map(t => t.storeId))];
      const storePromises = uniqueStoreIds.slice(0, 5).map(async (storeId) => {
        try {
          const storeInfo = await storePaymentApi.getStorePaymentInfo(storeId);
          const transaction = response.transactions.find(t => t.storeId === storeId);
          return {
            ...transformToPaymentStore(storeInfo),
            lastPaidAt: transaction?.completedAt || transaction?.createdAt,
          };
        } catch {
          return null;
        }
      });
      return (await Promise.all(storePromises)).filter(Boolean) as PaymentStoreInfo[];
    },
    enabled: isAuthenticated,
  });
}

/**
 * Fetch popular (featured) payment stores. Public endpoint, always enabled.
 * Falls back to category search sorted by rating when featured endpoint fails.
 */
export function usePaymentPopularStores() {
  return useQuery({
    queryKey: queryKeys.paymentStore.popular(),
    queryFn: async (): Promise<PaymentStoreInfo[]> => {
      try {
        const response = await storeSearchService.getFeaturedStores({
          limit: PAYMENT_SEARCH_CONSTANTS.POPULAR_LIMIT,
        });
        if (response.success && response.data?.stores?.length) {
          return response.data.stores.map((store: any) => transformToPaymentStore(store));
        }
      } catch {
        // fall through to fallback
      }

      // Fallback: all stores sorted by rating
      const fallbackResponse = await storeSearchService.searchStoresByCategory({
        category: 'all',
        sortBy: 'rating',
        limit: PAYMENT_SEARCH_CONSTANTS.POPULAR_LIMIT,
      });
      if (fallbackResponse.success && fallbackResponse.data?.stores) {
        return fallbackResponse.data.stores.map((store: any) => transformToPaymentStore(store));
      }
      return [];
    },
  });
}
