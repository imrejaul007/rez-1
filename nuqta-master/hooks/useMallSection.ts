/**
 * useMallSection Hook
 *
 * Custom hook for managing mall section data and state.
 *
 * Nuqta Mall = In-app delivery marketplace
 * - Fetches stores with deliveryCategories.mall === true
 * - Users browse stores, order products, earn Nuqta Coins
 *
 * When useStores=true (default), fetches from Store model
 * When useStores=false, fetches from MallBrand model (legacy/affiliate)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { mallApi } from '../services/mallApi';
import { colors } from '@/constants/theme';
import {
  MallBrand,
  MallCategory,
  MallCollection,
  MallOffer,
  MallBanner,
  MallHomepageData
} from '../types/mall.types';

interface UseMallSectionReturn {
  // Data
  heroBanners: MallBanner[];
  featuredBrands: MallBrand[];
  collections: MallCollection[];
  categories: MallCategory[];
  exclusiveOffers: MallOffer[];
  newArrivals: MallBrand[];
  topRatedBrands: MallBrand[];
  luxuryBrands: MallBrand[];
  trendingBrands: MallBrand[];
  rewardBoosters: MallBrand[];
  dealsOfDay: MallOffer[];

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isInitialLoad: boolean;

  // Error state
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  trackBrandClick: (brandId: string) => void;
  loadMore: (section: string) => Promise<void>;
}

interface UseMallSectionOptions {
  autoFetch?: boolean;
  cacheTimeout?: number;
  /** When true, fetches stores with mall=true. When false, uses legacy MallBrand data */
  useStores?: boolean;
}

const CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Transform store data to MallBrand format for compatibility with existing components
 */
function transformStoreToMallBrand(store: any): MallBrand {
  // Handle category - it might be a string ID, an object with name, or null
  let mallCategory = null;
  if (store.category) {
    if (typeof store.category === 'string') {
      mallCategory = { _id: store.category, id: store.category, name: store.category, slug: store.category.toLowerCase() };
    } else if (store.category.name) {
      mallCategory = store.category;
    }
  }

  // Check if store is new (created within last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const isNewArrival = store.createdAt ? new Date(store.createdAt) > thirtyDaysAgo : false;

  return {
    _id: store._id,
    id: store._id,
    name: store.name,
    slug: store.slug || store.name.toLowerCase().replace(/\s+/g, '-'),
    description: store.description || '',
    logo: store.logo,
    banner: store.banner?.[0] || '',
    externalUrl: '', // No external URL for in-app stores
    storeId: store._id,
    isInAppStore: true,
    mallCategory,
    tier: store.deliveryCategories?.premium ? 'premium' : 'standard',
    badges: [
      ...(store.isFeatured ? ['exclusive' as const] : []),
      ...(store.isVerified ? ['verified' as const] : []),
    ],
    cashback: {
      percentage: store.rewardRules?.baseCashbackPercent || store.offers?.cashback || 0,
      maxAmount: store.rewardRules?.maxCashback || store.offers?.maxCashback,
      minPurchase: store.operationalInfo?.minimumOrder || store.rewardRules?.minimumAmountForReward,
    },
    ratings: {
      average: store.ratings?.average || 0,
      count: store.ratings?.count || 0,
      successRate: store.ratings?.successRate || Math.min(Math.round((store.ratings?.average || 0) / 5 * 100), 100),
      distribution: store.ratings?.distribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    },
    isFeatured: store.isFeatured || false,
    isActive: store.isActive !== false,
    isNewArrival,
    isLuxury: store.deliveryCategories?.premium || false,
    isVerified: store.isVerified || false,
    tags: store.tags || [],
    collections: [],
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
  };
}

export function useMallSection(options: UseMallSectionOptions = {}): UseMallSectionReturn {
  const { autoFetch = true, cacheTimeout = CACHE_TIMEOUT, useStores = true } = options;

  // State
  const [heroBanners, setHeroBanners] = useState<MallBanner[]>([]);
  const [featuredBrands, setFeaturedBrands] = useState<MallBrand[]>([]);
  const [collections, setCollections] = useState<MallCollection[]>([]);
  const [categories, setCategories] = useState<MallCategory[]>([]);
  const [exclusiveOffers, setExclusiveOffers] = useState<MallOffer[]>([]);
  const [newArrivals, setNewArrivals] = useState<MallBrand[]>([]);
  const [topRatedBrands, setTopRatedBrands] = useState<MallBrand[]>([]);
  const [luxuryBrands, setLuxuryBrands] = useState<MallBrand[]>([]);
  const [trendingBrands, setTrendingBrands] = useState<MallBrand[]>([]);
  const [rewardBoosters, setRewardBoosters] = useState<MallBrand[]>([]);
  const [dealsOfDay, setDealsOfDay] = useState<MallOffer[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Refs for caching
  const lastFetchRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  /**
   * Fetch all mall data
   * When useStores=true, fetches from Store model (in-app delivery marketplace)
   * When useStores=false, fetches from MallBrand model (legacy/affiliate)
   */
  const fetchMallData = useCallback(async (forceRefresh: boolean = false) => {
    // Check cache
    const now = Date.now();
    if (!forceRefresh && lastFetchRef.current > 0 && now - lastFetchRef.current < cacheTimeout) {
      return; // Use cached data
    }

    try {
      if (!forceRefresh) {
        setIsLoading(true);
      }
      setError(null);

      if (useStores) {
        // Fetch ALL mall data in a single batch call (1 API request instead of 5)

        const batchData = await mallApi.getMallHomepageBatch();

        if (__DEV__) {
          console.log('[Mall] Batch response counts:', {
            featuredStores: batchData.featuredStores?.length ?? 0,
            newStores: batchData.newStores?.length ?? 0,
            topRatedStores: batchData.topRatedStores?.length ?? 0,
            premiumStores: batchData.premiumStores?.length ?? 0,
            categories: batchData.categories?.length ?? 0,
            heroBanners: batchData.heroBanners?.length ?? 0,
            trendingStores: batchData.trendingStores?.length ?? 0,
            rewardBoosters: batchData.rewardBoosters?.length ?? 0,
            dealsOfDay: batchData.dealsOfDay?.length ?? 0,
            collections: batchData.collections?.length ?? 0,
            exclusiveOffers: batchData.exclusiveOffers?.length ?? 0,
          });
        }

        if (isMountedRef.current) {
          // Set banners
          setHeroBanners(batchData.heroBanners || []);

          // Transform stores to MallBrand format for compatibility
          setFeaturedBrands((batchData.featuredStores || []).map(transformStoreToMallBrand));
          setNewArrivals((batchData.newStores || []).map(transformStoreToMallBrand));
          setTopRatedBrands((batchData.topRatedStores || []).map(transformStoreToMallBrand));
          setLuxuryBrands((batchData.premiumStores || []).map(transformStoreToMallBrand));

          // New sections
          setTrendingBrands((batchData.trendingStores || []).map(transformStoreToMallBrand));
          setRewardBoosters((batchData.rewardBoosters || []).map(transformStoreToMallBrand));
          setDealsOfDay(batchData.dealsOfDay || []);

          // Transform categories
          setCategories((batchData.categories || []).map((cat: any) => ({
            _id: cat._id,
            id: cat._id,
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon || 'storefront',
            color: cat.color || colors.nileBlue,
            brandCount: cat.storeCount || 0,
            maxCashback: cat.maxCoinReward || 0,
            sortOrder: cat.sortOrder || 0,
            isActive: cat.isActive !== false,
            isFeatured: cat.isFeatured || false,
          })));

          // Collections and exclusive offers from MallCollection/MallOffer models
          setCollections((batchData.collections || []).map((col: any) => ({
            _id: col._id,
            id: col._id,
            name: col.name,
            slug: col.slug,
            description: col.description || '',
            image: col.image || '',
            type: col.type || 'curated',
            sortOrder: col.sortOrder || 0,
            isActive: col.isActive !== false,
            validFrom: col.validFrom,
            validUntil: col.validUntil,
            brandCount: col.brandCount ?? (Array.isArray(col.brands) ? col.brands.length : 0),
          })));
          setExclusiveOffers(batchData.exclusiveOffers || []);

          lastFetchRef.current = now;
          setIsInitialLoad(false);
        }
      } else {
        // Legacy: Fetch from MallBrand model (affiliate brands)
        const data: MallHomepageData = await mallApi.getMallHomepage();

        if (isMountedRef.current) {
          setHeroBanners(data.banners || []);
          setFeaturedBrands(data.featuredBrands || []);
          setCollections(data.collections || []);
          setCategories(data.categories || []);
          setExclusiveOffers(data.exclusiveOffers || []);
          setNewArrivals(data.newArrivals || []);
          setTopRatedBrands(data.topRatedBrands || []);
          setLuxuryBrands(data.luxuryBrands || []);

          lastFetchRef.current = now;
          setIsInitialLoad(false);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load mall data');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [cacheTimeout, useStores]);

  /**
   * Refresh data (pull-to-refresh)
   */
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchMallData(true);
  }, [fetchMallData]);

  /**
   * Track brand click
   */
  const trackBrandClick = useCallback((brandId: string) => {
    // Fire and forget - don't block UI
    mallApi.trackBrandClick(brandId).catch(() => {
      // Silently fail
    });
  }, []);

  /**
   * Load more items for a specific section
   */
  const loadMore = useCallback(async (section: string) => {
    try {
      if (useStores) {
        // Store-based mall
        switch (section) {
          case 'featuredBrands':
            const moreFeaturedStores = await mallApi.getFeaturedMallStores(featuredBrands.length + 10);
            if (isMountedRef.current) {
              setFeaturedBrands(moreFeaturedStores.map(transformStoreToMallBrand));
            }
            break;

          case 'newArrivals':
            const moreNewStores = await mallApi.getNewMallStores(newArrivals.length + 10);
            if (isMountedRef.current) {
              setNewArrivals(moreNewStores.map(transformStoreToMallBrand));
            }
            break;

          case 'luxuryBrands':
            const morePremiumStores = await mallApi.getPremiumMallStores(luxuryBrands.length + 10);
            if (isMountedRef.current) {
              setLuxuryBrands(morePremiumStores.map(transformStoreToMallBrand));
            }
            break;

          case 'topRatedBrands':
            const moreTopRatedStores = await mallApi.getTopRatedMallStores(topRatedBrands.length + 10);
            if (isMountedRef.current) {
              setTopRatedBrands(moreTopRatedStores.map(transformStoreToMallBrand));
            }
            break;

          default:
        }
      } else {
        // Legacy brand-based mall
        switch (section) {
          case 'featuredBrands':
            const moreFeatured = await mallApi.getFeaturedBrands(featuredBrands.length + 10);
            if (isMountedRef.current) {
              setFeaturedBrands(moreFeatured);
            }
            break;

          case 'newArrivals':
            const moreNewArrivals = await mallApi.getNewArrivals(newArrivals.length + 10);
            if (isMountedRef.current) {
              setNewArrivals(moreNewArrivals);
            }
            break;

          case 'luxuryBrands':
            const moreLuxury = await mallApi.getLuxuryBrands(luxuryBrands.length + 10);
            if (isMountedRef.current) {
              setLuxuryBrands(moreLuxury);
            }
            break;

          case 'exclusiveOffers':
            const moreOffers = await mallApi.getExclusiveOffers(exclusiveOffers.length + 10);
            if (isMountedRef.current) {
              setExclusiveOffers(moreOffers);
            }
            break;

          default:
        }
      }
    } catch (_err) {
      // silently handle
    }
  }, [useStores, featuredBrands.length, newArrivals.length, luxuryBrands.length, topRatedBrands.length, exclusiveOffers.length]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;

    if (autoFetch) {
      fetchMallData();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [autoFetch, fetchMallData]);

  return {
    // Data
    heroBanners,
    featuredBrands,
    collections,
    categories,
    exclusiveOffers,
    newArrivals,
    topRatedBrands,
    luxuryBrands,
    trendingBrands,
    rewardBoosters,
    dealsOfDay,

    // Loading states
    isLoading,
    isRefreshing,
    isInitialLoad,

    // Error state
    error,

    // Actions
    refresh,
    trackBrandClick,
    loadMore
  };
}

// Additional hooks for specific sections

/**
 * Hook for fetching brands by category
 */
export function useMallCategory(categorySlug: string) {
  const [brands, setBrands] = useState<MallBrand[]>([]);
  const [category, setCategory] = useState<MallCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchBrands = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) setIsLoading(true);

      const result = await mallApi.getBrandsByCategory(categorySlug, pageNum, 20);

      if (pageNum === 1) {
        setBrands(result.brands);
        setCategory(result.category);
      } else {
        setBrands(prev => [...prev, ...result.brands]);
      }

      setHasMore(result.brands.length === 20);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  }, [categorySlug]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchBrands(page + 1);
    }
  }, [fetchBrands, hasMore, isLoading, page]);

  useEffect(() => {
    fetchBrands(1);
  }, [fetchBrands]);

  return { brands, category, isLoading, error, hasMore, loadMore, refresh: () => fetchBrands(1) };
}

/**
 * Hook for fetching brands by collection
 */
export function useMallCollection(collectionSlug: string) {
  const [brands, setBrands] = useState<MallBrand[]>([]);
  const [collection, setCollection] = useState<MallCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchBrands = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) setIsLoading(true);

      const result = await mallApi.getBrandsByCollection(collectionSlug, pageNum, 20);

      if (pageNum === 1) {
        setBrands(result.brands);
        setCollection(result.collection);
      } else {
        setBrands(prev => [...prev, ...result.brands]);
      }

      setHasMore(result.brands.length === 20);
      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brands');
    } finally {
      setIsLoading(false);
    }
  }, [collectionSlug]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      fetchBrands(page + 1);
    }
  }, [fetchBrands, hasMore, isLoading, page]);

  useEffect(() => {
    fetchBrands(1);
  }, [fetchBrands]);

  return { brands, collection, isLoading, error, hasMore, loadMore, refresh: () => fetchBrands(1) };
}

/**
 * Hook for brand search
 */
export function useMallSearch() {
  const [results, setResults] = useState<MallBrand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const isMountedRef = useRef(true);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = undefined;
      }
    };
  }, []);

  const search = useCallback((query: string) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    // Debounce search
    debounceRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        setError(null);
        const brands = await mallApi.searchBrands(query);
        if (isMountedRef.current) {
          setResults(brands);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Search failed');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }, 300);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, isLoading, error, search, clearResults };
}

export default useMallSection;
