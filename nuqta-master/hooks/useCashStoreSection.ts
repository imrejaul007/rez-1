// @ts-nocheck
/**
 * useCashStoreSection Hook
 *
 * Custom hook for managing cash store section data and state.
 * Uses react-query for server data (caching, dedup, retry) and
 * local state for UI concerns (selected category, category filtering).
 *
 * Sections filtered by category: TopOnlineBrands, TrendingCashback, HighCashbackDeals
 * Sections NOT filtered: BuyCoupon, BestCoupons, Travel, HowItWorks, Activity
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Clipboard, Linking } from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import cashStoreApi from '../services/cashStoreApi';
import travelApi from '../services/travelApi';
import { BRAND } from '@/constants/brand';
import {
  CashStoreBrand,
  TrendingDeal,
  GiftCardBrand,
  CashStoreCoupon,
  HighCashbackDeal,
  TravelDeal,
  CashbackActivity,
  CashStoreHeroBanner,
  CashStoreQuickAction,
  CashStoreCategoryFilter,
  CashStoreCategoryFilterKey,
  UseCashStoreSectionReturn,
} from '../types/cash-store.types';
import type { Coupon } from '../services/couponApi';
import { colors } from '@/constants/theme';
import {
  useCashStoreHomepageQuery,
  useCashbackSummaryQuery,
  useFeaturedCouponsQuery,
  useGiftCardBrandsQuery,
  useCashbackActivityQuery,
} from './queries/useCashStoreData';

// Default quick actions
const DEFAULT_QUICK_ACTIONS: CashStoreQuickAction[] = [
  {
    id: 'buy-coupons',
    title: 'Buy coupons & save instantly',
    subtitle: 'Get extra cashback on gift cards',
    icon: 'pricetag',
    backgroundColor: colors.warning,
    gradientColors: [colors.warning, '#F77F00'],
    action: 'buy-coupons',
  },
  {
    id: 'extra-coins',
    title: `Extra ${BRAND.COIN_NAME} on brands`,
    subtitle: 'Double rewards on selected stores',
    icon: 'wallet',
    backgroundColor: '#9B59B6',
    gradientColors: ['#9B59B6', '#8E44AD'],
    action: 'extra-coins',
  },
];

// Default hero banners
const DEFAULT_HERO_BANNERS: CashStoreHeroBanner[] = [
  {
    _id: 'hero-1',
    id: 'hero-1',
    title: `Earn ${BRAND.COIN_NAME} on every online order`,
    subtitle: 'Shop from 1000+ brands and get instant rewards',
    backgroundColor: colors.warning,
    gradientColors: [colors.warning, '#F77F00'],
    textColor: '#FFFFFF',
    ctaText: 'Start Shopping',
    ctaAction: 'shop',
    badge: 'Hot Deal',
    priority: 1,
    isActive: true,
  },
];

// Travel deals data
const DEFAULT_TRAVEL_DEALS: TravelDeal[] = [
  {
    _id: 'travel-flights',
    id: 'travel-flights',
    category: 'flights',
    title: 'Flights',
    cashbackRate: 5,
    icon: 'airplane',
    backgroundColor: '#667EEA',
    gradientColors: ['#667EEA', '#764BA2'],
  },
  {
    _id: 'travel-hotels',
    id: 'travel-hotels',
    category: 'hotels',
    title: 'Hotels',
    cashbackRate: 8,
    icon: 'bed',
    backgroundColor: '#F093FB',
    gradientColors: ['#F093FB', '#F5576C'],
  },
  {
    _id: 'travel-cabs',
    id: 'travel-cabs',
    category: 'cabs',
    title: 'Cabs',
    cashbackRate: 3,
    icon: 'car',
    backgroundColor: '#FFE259',
    gradientColors: ['#FFE259', '#FFA751'],
  },
  {
    _id: 'travel-experiences',
    id: 'travel-experiences',
    category: 'experiences',
    title: 'Experiences',
    cashbackRate: 6,
    icon: 'compass',
    backgroundColor: '#A18CD1',
    gradientColors: ['#A18CD1', '#FBC2EB'],
  },
];

/**
 * Adjust a hex color brightness for gradient second color
 */
function adjustCategoryColor(color: string): string {
  try {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = -30;
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  } catch {
    return '#764BA2';
  }
}

/**
 * Transform MallBrand (from backend) -> CashStoreBrand (frontend type)
 */
function transformMallBrandToCashStoreBrand(brand: any): CashStoreBrand {
  return {
    _id: brand._id,
    id: brand._id,
    name: brand.name,
    slug: brand.slug,
    logo: brand.logo || '',
    description: brand.description,
    category: brand.mallCategory?.slug || '',
    brandType: brand.externalUrl ? 'affiliate' : 'hybrid',
    cashbackRate: brand.cashback?.percentage || 0,
    maxCashback: brand.cashback?.maxAmount,
    minPurchase: brand.cashback?.minPurchase,
    externalUrl: brand.externalUrl,
    isActive: brand.isActive,
    isFeatured: brand.isFeatured,
    isTopBrand: brand.isFeatured || (brand.ratings?.average >= 4),
    rating: brand.ratings?.average,
    ratingCount: brand.ratings?.count,
    successRate: brand.ratings?.successRate,
    rezCoinReward: brand.rezCoinReward ? {
      coinsPerHundred: brand.rezCoinReward.coinsPerHundred,
      isActive: brand.rezCoinReward.isActive,
      minimumOrderAmount: brand.rezCoinReward.minimumOrderAmount,
      maximumCoinsPerOrder: brand.rezCoinReward.maximumCoinsPerOrder,
    } : undefined,
    analytics: brand.analytics ? {
      views: brand.analytics.views,
      clicks: brand.analytics.clicks,
      purchases: brand.analytics.purchases,
    } : undefined,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
}

/**
 * Transform MallBrand -> TrendingDeal
 */
function transformMallBrandToTrendingDeal(brand: any): TrendingDeal {
  const cashback = brand.cashback?.percentage || 0;
  return {
    _id: brand._id,
    id: brand._id,
    brand: {
      id: brand._id,
      name: brand.name,
      logo: brand.logo || '',
    },
    category: brand.mallCategory?.slug || '',
    cashbackRate: cashback,
    bonusCoins: brand.isFeatured ? 50 : undefined,
    validUntil: brand.cashback?.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    badge: brand.badges?.includes('trending') ? 'trending' : brand.isNewArrival ? 'new' : undefined,
    isFlashSale: false,
    priority: brand.isFeatured ? 1 : 0,
    externalUrl: brand.externalUrl,
  };
}

/**
 * Transform MallBrand -> HighCashbackDeal
 */
function transformMallBrandToHighCashbackDeal(brand: any): HighCashbackDeal {
  const cashback = brand.cashback?.percentage || 0;
  return {
    _id: brand._id,
    id: brand._id,
    brand: {
      id: brand._id,
      name: brand.name,
      logo: brand.logo || '',
    },
    title: `${brand.name} - Up to ${cashback}% Cashback`,
    subtitle: brand.description,
    cashbackRate: cashback,
    bonusCoins: brand.isFeatured ? 75 : undefined,
    validUntil: brand.cashback?.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    badge: cashback >= 15 ? 'hot' : cashback >= 10 ? 'best-deal' : undefined,
    externalUrl: brand.externalUrl,
  };
}

/**
 * Transform Coupon -> CashStoreCoupon
 */
function transformCouponToCashStoreCoupon(coupon: Coupon): CashStoreCoupon {
  return {
    _id: coupon._id,
    id: coupon._id,
    code: coupon.couponCode,
    brand: {
      id: coupon.applicableTo?.stores?.[0] as string || '',
      name: coupon.title.split(' - ')[0] || coupon.title,
      logo: coupon.imageUrl || '',
    },
    title: coupon.title,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderValue: coupon.minOrderValue,
    maxDiscountCap: coupon.maxDiscountCap,
    validUntil: coupon.validTo,
    isVerified: true,
    isExclusive: coupon.tags?.includes('rez-exclusive') || false,
    usageCount: coupon.usageCount,
    successRate: 95,
    tags: coupon.tags,
  };
}

export function useCashStoreSection(
  _options: { autoFetch?: boolean; cacheTimeout?: number } = {}
): UseCashStoreSectionReturn {
  const router = useRouter();
  const queryClient = useQueryClient();

  // ── react-query hooks ──────────────────────────────────────────────
  const homepageQuery = useCashStoreHomepageQuery();
  const summaryQuery = useCashbackSummaryQuery();
  const couponsQuery = useFeaturedCouponsQuery();
  const giftCardsQuery = useGiftCardBrandsQuery();
  const activityQuery = useCashbackActivityQuery();

  // ── Local UI state ─────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<CashStoreCategoryFilterKey>('all');
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTravelLoading, setIsTravelLoading] = useState(true);

  // Filtered data when a category is selected (server-side filtered)
  const [filteredTopBrandsOverride, setFilteredTopBrandsOverride] = useState<CashStoreBrand[] | null>(null);
  const [filteredTrendingDealsOverride, setFilteredTrendingDealsOverride] = useState<TrendingDeal[] | null>(null);
  const [filteredHighCashbackDealsOverride, setFilteredHighCashbackDealsOverride] = useState<HighCashbackDeal[] | null>(null);

  // Travel deals (fetched once, separate from the 5 query hooks since it's a fire-and-forget)
  const [travelDeals, setTravelDeals] = useState<TravelDeal[]>(DEFAULT_TRAVEL_DEALS);
  const travelFetchedRef = useRef(false);

  // Fetch travel categories once
  useEffect(() => {
    if (travelFetchedRef.current) return;
    travelFetchedRef.current = true;

    let isMounted = true;
    const controller = new AbortController();

    (async () => {
      try {
        const response = await travelApi.getCategories(controller.signal);
        if (!isMounted) return;
        if (response.success && response.data && response.data.length > 0) {
          setTravelDeals(
            response.data.map((cat: any) => ({
              _id: `travel-${cat.id}`,
              id: `travel-${cat.id}`,
              category: cat.id || cat.title?.toLowerCase(),
              title: cat.title,
              cashbackRate: cat.cashback || 0,
              icon: cat.icon || 'compass',
              backgroundColor: cat.color || '#667EEA',
              gradientColors: [cat.color || '#667EEA', adjustCategoryColor(cat.color || '#667EEA')],
            }))
          );
        }
      } catch (err) {
        // Log error
        console.error('[useCashStoreSection] Travel fetch failed:', err);
      } finally {
        if (isMounted) {
          setIsTravelLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // ── Derived server data (memoised from query results) ──────────────

  const categories = useMemo<CashStoreCategoryFilter[]>(
    () => homepageQuery.data?.categories || [],
    [homepageQuery.data],
  );

  const topBrands = useMemo<CashStoreBrand[]>(
    () => (homepageQuery.data?.topBrands || []).map(transformMallBrandToCashStoreBrand),
    [homepageQuery.data],
  );

  const trendingDeals = useMemo<TrendingDeal[]>(
    () => (homepageQuery.data?.trendingBrands || []).map(transformMallBrandToTrendingDeal),
    [homepageQuery.data],
  );

  const highCashbackDeals = useMemo<HighCashbackDeal[]>(
    () => (homepageQuery.data?.highCashbackBrands || []).map(transformMallBrandToHighCashbackDeal),
    [homepageQuery.data],
  );

  const heroBanners = useMemo<CashStoreHeroBanner[]>(
    () => DEFAULT_HERO_BANNERS,
    [],
  );

  const quickActions = useMemo<CashStoreQuickAction[]>(
    () => DEFAULT_QUICK_ACTIONS,
    [],
  );

  const cashbackSummary = useMemo(() => {
    if (!summaryQuery.data?.success || !summaryQuery.data?.data) {
      return { total: 0, pending: 0, confirmed: 0, available: 0 };
    }
    const s = summaryQuery.data.data;
    return {
      total: s.totalEarned ?? (s as any).total ?? 0,
      pending: s.pending ?? 0,
      confirmed: s.credited ?? (s as any).confirmed ?? 0,
      available: s.credited ?? (s as any).available ?? 0,
    };
  }, [summaryQuery.data]);

  const couponCodes = useMemo<CashStoreCoupon[]>(() => {
    if (!couponsQuery.data?.success || !couponsQuery.data?.data) return [];
    const coupons = couponsQuery.data.data.coupons || [];
    return coupons.map(transformCouponToCashStoreCoupon);
  }, [couponsQuery.data]);

  const giftCardBrands = useMemo<GiftCardBrand[]>(() => {
    if (!giftCardsQuery.data?.success || !giftCardsQuery.data?.data) return [];
    const brands = giftCardsQuery.data.data || [];
    return brands.map((brand: any) => ({
      _id: brand._id,
      id: brand._id,
      name: brand.name,
      logo: brand.logo,
      backgroundColor: brand.backgroundColor,
      cashbackRate: brand.cashbackRate,
      denominations: brand.denominations,
      category: brand.category,
      rating: brand.rating,
      ratingCount: brand.ratingCount,
      isFeatured: brand.isFeatured,
      isNewlyAdded: brand.isNewlyAdded,
      termsAndConditions: brand.termsAndConditions,
      purchaseCount: brand.purchaseCount,
    }));
  }, [giftCardsQuery.data]);

  const recentActivity = useMemo<CashbackActivity[]>(() => {
    if (!activityQuery.data?.success || !activityQuery.data?.data) return [];
    const cashbacks = activityQuery.data.data.cashbacks || [];
    return cashbacks.map((cb: any) => ({
      _id: cb._id,
      id: cb._id,
      brand: {
        id: cb.metadata?.storeId || '',
        name: cb.metadata?.storeName || `${BRAND.APP_NAME} Store`,
        logo: '',
      },
      orderNumber: cb.order?.orderNumber,
      purchaseAmount: cb.metadata?.orderAmount || 0,
      cashbackAmount: cb.amount,
      status: cb.status === 'credited' ? 'confirmed' : cb.status,
      date: cb.earnedDate,
      source: cb.source,
    }));
  }, [activityQuery.data]);

  // ── Filtered data (category selection) ─────────────────────────────

  const filteredTopBrands = useMemo<CashStoreBrand[]>(
    () => filteredTopBrandsOverride ?? topBrands,
    [filteredTopBrandsOverride, topBrands],
  );

  const filteredTrendingDeals = useMemo<TrendingDeal[]>(
    () => filteredTrendingDealsOverride ?? trendingDeals,
    [filteredTrendingDealsOverride, trendingDeals],
  );

  const filteredHighCashbackDeals = useMemo<HighCashbackDeal[]>(
    () => filteredHighCashbackDealsOverride ?? highCashbackDeals,
    [filteredHighCashbackDealsOverride, highCashbackDeals],
  );

  // ── Category change handler (server-side filtering) ────────────────

  const categoryAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // "All" = restore base data (clear overrides)
    if (selectedCategory === 'all') {
      // Cancel any in-flight category fetch
      if (categoryAbortRef.current) {
        categoryAbortRef.current.abort();
        categoryAbortRef.current = null;
      }
      setFilteredTopBrandsOverride(null);
      setFilteredTrendingDealsOverride(null);
      setFilteredHighCashbackDealsOverride(null);
      return;
    }

    // Cancel previous category fetch
    if (categoryAbortRef.current) {
      categoryAbortRef.current.abort();
    }
    categoryAbortRef.current = new AbortController();

    let cancelled = false;

    const fetchFilteredBrands = async () => {
      setIsCategoryLoading(true);
      try {
        let params: { category?: string; filter?: 'popular' | 'high-cashback'; limit: number } = { limit: 20 };

        if (selectedCategory === 'most-popular') {
          params.filter = 'popular';
        } else if (selectedCategory === 'high-cashback') {
          params.filter = 'high-cashback';
        } else {
          params.category = selectedCategory;
        }

        const result = await cashStoreApi.getBrands(params, categoryAbortRef.current?.signal);
        const brands = result.brands || [];

        if (!cancelled) {
          setFilteredTopBrandsOverride(brands.map(transformMallBrandToCashStoreBrand));
          setFilteredTrendingDealsOverride(brands.slice(0, 10).map(transformMallBrandToTrendingDeal));
          setFilteredHighCashbackDealsOverride(
            brands
              .filter((b: any) => (b.cashback?.percentage || 0) >= 10)
              .map(transformMallBrandToHighCashbackDeal)
          );
        }
      } catch {
        // Handle error but DON'T call setSelectedCategory - it re-fires the effect!
        if (!cancelled) {
          setFilteredTopBrandsOverride(null);
          setFilteredTrendingDealsOverride(null);
          setFilteredHighCashbackDealsOverride(null);
          setIsCategoryLoading(false);
        }
      }
    };

    fetchFilteredBrands();

    return () => {
      cancelled = true;
    };
  }, [selectedCategory]);

  // ── Loading / error ────────────────────────────────────────────────

  const isLoading = homepageQuery.isLoading;
  const isInitialLoad = homepageQuery.isLoading && !homepageQuery.data;
  const error = homepageQuery.error?.message ?? null;

  // ── Actions ────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setSelectedCategory('all');
    setFilteredTopBrandsOverride(null);
    setFilteredTrendingDealsOverride(null);
    setFilteredHighCashbackDealsOverride(null);

    await Promise.allSettled([
      queryClient.invalidateQueries({ queryKey: queryKeys.cashStore.all }),
    ]);

    setIsRefreshing(false);
  }, [queryClient]);

  const copyCouponCode = useCallback(async (code: string, couponId?: string): Promise<boolean> => {
    try {
      await Clipboard.setString(code);
      // Track the coupon claim if we have a couponId
      if (couponId) {
        try {
          const couponApi = (await import('../services/couponApi')).default;
          await couponApi.claimCoupon(couponId);
        } catch {
          // Claim tracking is best-effort — copy still succeeds
        }
      }
      platformAlertSimple('Copied!', `Coupon code "${code}" copied to clipboard`);
      return true;
    } catch {
      return false;
    }
  }, []);

  const navigateToBrand = useCallback(
    async (brand: CashStoreBrand) => {
      if (brand.brandType === 'in-app' && brand.storeId) {
        router.push(`/MainStorePage?storeId=${brand.storeId}` as any);
      } else if (brand.externalUrl) {
        try {
          const trackingResult = await cashStoreApi.trackAffiliateClick(brand.id);
          const urlToOpen = trackingResult?.trackingUrl || brand.externalUrl;

          await WebBrowser.openBrowserAsync(urlToOpen, {
            toolbarColor: colors.lightMustard,
            controlsColor: '#FFFFFF',
            enableBarCollapsing: true,
            showTitle: true,
          });

          if (trackingResult) {
            platformAlertSimple(
              'Tracking Active',
              `Complete your purchase on ${brand.name} to earn ${trackingResult.coinsPerHundred} ${BRAND.COIN_NAME} per ₹100!`
            );
          }
        } catch {
          if (brand.externalUrl) {
            try { await Linking.openURL(brand.externalUrl); } catch {}
          }
        }
      }
    },
    [router]
  );

  // ── Return (exact same shape as before) ────────────────────────────

  return {
    // Data
    cashbackSummary,
    heroBanners,
    quickActions,
    topBrands,
    trendingDeals,
    giftCardBrands,
    couponCodes,
    highCashbackDeals,
    travelDeals,
    recentActivity,

    // Dynamic categories
    categories,

    // Category filter
    selectedCategory,
    setSelectedCategory,
    filteredTopBrands,
    filteredTrendingDeals,
    filteredHighCashbackDeals,
    isCategoryLoading,

    // Loading states
    isLoading,
    isRefreshing,
    isInitialLoad,

    // Error state
    error,

    // Actions
    refresh,
    copyCouponCode,
    navigateToBrand,
  };
}

export default useCashStoreSection;
