// @ts-nocheck
/**
 * Payment Store Search Hook
 *
 * Custom hook for managing store search in the Pay-In-Store flow.
 * Handles search, nearby stores, recent payments, and popular stores.
 *
 * Internally delegates server-data fetching to react-query hooks from
 * usePaymentStoreData.ts while keeping local UI state (search query,
 * filters, tabs, pagination) as plain useState.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  PaymentStoreInfo,
  PaymentSearchCategory,
  PaymentSearchError,
  UsePaymentStoreSearchReturn,
  UserLocation,
  PAYMENT_CATEGORIES,
  PAYMENT_SEARCH_CONSTANTS,
} from '@/types/paymentStoreSearch.types';
import { useCurrentLocation } from '@/hooks/useLocation';
import { useIsAuthenticated } from '@/stores/selectors';
import { storeSearchService } from '@/services/storeSearchService';
import { queryKeys } from '@/lib/queryKeys';
import {
  usePaymentNearbyStores,
  usePaymentRecentStores,
  usePaymentPopularStores,
  transformToPaymentStore,
} from '@/hooks/queries/usePaymentStoreData';

/**
 * Debounce helper
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Store tab types
export type StoreTab = 'all' | 'brands' | 'local' | 'services';

// Filter types
export interface StoreFilters {
  nearMe: boolean;
  offersAvailable: boolean;
  cashback: boolean;
}

/**
 * Main hook for payment store search
 */
export const usePaymentStoreSearch = (): UsePaymentStoreSearchReturn => {
  const isAuthenticated = useIsAuthenticated();
  const queryClient = useQueryClient();
  const { currentLocation, refreshLocation, isLoading: isLoadingLocationContext } = useCurrentLocation();

  // Search state (local — not server-driven)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PaymentStoreInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<PaymentSearchError | null>(null);

  // Category filter - default to 'all' to show all stores initially
  const [selectedCategory, setSelectedCategory] = useState<string | null>('all');

  // Filter chips state
  const [filters, setFilters] = useState<StoreFilters>({
    nearMe: true,
    offersAvailable: false,
    cashback: false,
  });

  // Tab state
  const [activeTab, setActiveTab] = useState<StoreTab>('all');

  // Pagination (search-specific)
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Location state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Refs
  const searchAbortController = useRef<AbortController | null>(null);

  // Debounced search query
  const debouncedSearchQuery = useDebounce(searchQuery, PAYMENT_SEARCH_CONSTANTS.DEBOUNCE_DELAY);

  // -------- react-query hooks for section data --------

  const nearbyQuery = usePaymentNearbyStores(userLocation?.latitude, userLocation?.longitude);
  const recentQuery = usePaymentRecentStores(isAuthenticated);
  const popularQuery = usePaymentPopularStores();

  // Derive section arrays from react-query (fall back to empty arrays)
  const nearbyStores = nearbyQuery.data ?? [];
  const recentStores = recentQuery.data ?? [];
  const popularStores = popularQuery.data ?? [];

  // Derive loading flags
  const isLoadingNearby = nearbyQuery.isLoading;
  const isLoadingRecent = recentQuery.isLoading;
  const isLoadingPopular = popularQuery.isLoading;
  const isInitialLoading = popularQuery.isLoading;

  // -------- location helpers --------

  const formatLocationForAPI = useCallback((location: UserLocation): string => {
    return `${location.longitude},${location.latitude}`;
  }, []);

  const requestLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      const location = await refreshLocation();
      if (location) {
        const lat = location.coordinates?.latitude;
        const lng = location.coordinates?.longitude;

        if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
          setUserLocation({
            latitude: lat,
            longitude: lng,
            timestamp: Date.now(),
          });
        }
      }
    } catch {
      setLocationError('Unable to get your location. Please enable location services.');
    } finally {
      setIsLoadingLocation(false);
    }
  }, [refreshLocation]);

  // Initialize location from context
  useEffect(() => {
    if (currentLocation && !userLocation) {
      const lat = currentLocation.coordinates?.latitude;
      const lng = currentLocation.coordinates?.longitude;

      if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
        setUserLocation({
          latitude: lat,
          longitude: lng,
          timestamp: Date.now(),
        });
      }
    }
  }, [currentLocation, userLocation]);

  // -------- search (imperative — not a react-query queryFn because it
  //          depends on accumulated pagination state) --------

  const executeSearch = useCallback(async (query: string, category: string | null, page: number = 1) => {
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }
    searchAbortController.current = new AbortController();

    if (!query.trim() && category === null) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    if (page === 1) {
      setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }
    setSearchError(null);

    try {
      const locationParam = userLocation ? formatLocationForAPI(userLocation) : undefined;
      let response;

      if (!query.trim() && (!category || category === 'all')) {
        response = await storeSearchService.searchStoresByCategory({
          category: 'all',
          page,
          limit: PAYMENT_SEARCH_CONSTANTS.DEFAULT_PAGE_SIZE,
          sortBy: userLocation ? 'distance' : 'rating',
          ...(locationParam && {
            location: locationParam,
            radius: PAYMENT_SEARCH_CONSTANTS.DEFAULT_RADIUS,
          }),
        });
      } else {
        const searchTerm = query.trim() || category || '';
        response = await storeSearchService.advancedStoreSearch({
          search: searchTerm,
          page,
          limit: PAYMENT_SEARCH_CONSTANTS.DEFAULT_PAGE_SIZE,
          sortBy: userLocation ? 'distance' : 'rating',
          ...(locationParam && {
            location: locationParam,
            radius: PAYMENT_SEARCH_CONSTANTS.DEFAULT_RADIUS,
          }),
        });
      }

      if (response.success && response.data.stores) {
        const transformedStores = response.data.stores.map((store: any) =>
          transformToPaymentStore(store, store.distance)
        );

        if (page === 1) {
          setSearchResults(transformedStores);
        } else {
          setSearchResults(prev => [...prev, ...transformedStores]);
        }

        setHasMore(response.data.pagination.hasNext);
        setCurrentPage(page);
      } else {
        if (page === 1) {
          setSearchResults([]);
        }
        setHasMore(false);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;

      setSearchError({
        code: 'SERVER_ERROR',
        message: error.message || 'Failed to search stores',
        recoverable: true,
      });
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  }, [userLocation, formatLocationForAPI]);

  // -------- actions --------

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    await executeSearch(debouncedSearchQuery, selectedCategory || 'all', currentPage + 1);
  }, [isLoadingMore, hasMore, debouncedSearchQuery, selectedCategory, currentPage, executeSearch]);

  const refresh = useCallback(async () => {
    // Invalidate all react-query caches so they refetch
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentStore.popular() }),
      isAuthenticated
        ? queryClient.invalidateQueries({ queryKey: queryKeys.paymentStore.recent() })
        : Promise.resolve(),
      userLocation
        ? queryClient.invalidateQueries({
            queryKey: queryKeys.paymentStore.nearby(userLocation.latitude, userLocation.longitude),
          })
        : Promise.resolve(),
    ]);
  }, [queryClient, isAuthenticated, userLocation]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSearchError(null);
    setCurrentPage(1);
    setHasMore(false);
  }, []);

  const handleFilterChange = useCallback((
    filter: 'nearMe' | 'offersAvailable' | 'cashback',
    value: boolean,
  ) => {
    setFilters(prev => ({ ...prev, [filter]: value }));
  }, []);

  const handleTabChange = useCallback((tab: StoreTab) => {
    setActiveTab(tab);
    if (tab === 'all' && !debouncedSearchQuery) {
      setCurrentPage(1);
      setHasMore(false);
      executeSearch('', 'all', 1);
    }
  }, [debouncedSearchQuery, executeSearch]);

  const getFilteredStores = useCallback((stores: PaymentStoreInfo[]): PaymentStoreInfo[] => {
    let filtered = [...stores];

    if (filters.nearMe && userLocation) {
      filtered = filtered.filter(store =>
        store.distance !== undefined || store.location?.coordinates
      );
      filtered.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }

    if (filters.offersAvailable) {
      filtered = filtered.filter(store =>
        (store.offers?.discount && store.offers.discount > 0) ||
        (store.offers?.cashback && store.offers.cashback > 0) ||
        (store.maxCashback && store.maxCashback > 0)
      );
    }

    if (filters.cashback) {
      filtered = filtered.filter(store =>
        (store.offers?.cashback && store.offers.cashback > 0) ||
        (store.maxCashback && store.maxCashback > 0)
      );
    }

    switch (activeTab) {
      case 'brands':
        filtered = filtered.filter(store => store.isBrand === true);
        break;
      case 'local':
        filtered = filtered.filter(store => store.isLocal === true);
        break;
      case 'services':
        filtered = filtered.filter(store => store.isService === true);
        break;
      case 'all':
      default:
        break;
    }

    return filtered;
  }, [filters, activeTab, userLocation]);

  const retry = useCallback(() => {
    setSearchError(null);
    if (debouncedSearchQuery || selectedCategory) {
      executeSearch(debouncedSearchQuery, selectedCategory, 1);
    } else {
      refresh();
    }
  }, [debouncedSearchQuery, selectedCategory, executeSearch, refresh]);

  // -------- effects --------

  // Execute search when debounced query or category changes
  useEffect(() => {
    if (debouncedSearchQuery || selectedCategory) {
      executeSearch(debouncedSearchQuery, selectedCategory, 1);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, selectedCategory, executeSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchAbortController.current) {
        searchAbortController.current.abort();
      }
    };
  }, []);

  // -------- return (exact same shape as before) --------

  return {
    // Search
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchError,

    // Data sections
    nearbyStores,
    recentStores,
    popularStores,

    // Loading states
    isLoadingNearby,
    isLoadingRecent,
    isLoadingPopular,
    isInitialLoading,

    // Category filter
    selectedCategory,
    setSelectedCategory,
    categories: PAYMENT_CATEGORIES,

    // Filter chips
    filters,
    setFilters,
    handleFilterChange,

    // Tabs
    activeTab,
    setActiveTab,
    handleTabChange,

    // Filtered results helper
    getFilteredStores,

    // Pagination
    hasMore,
    loadMore,
    isLoadingMore,

    // Actions
    refresh,
    clearSearch,
    retry,

    // Location
    userLocation,
    isLoadingLocation: isLoadingLocation || isLoadingLocationContext,
    locationError,
    requestLocation,
  };
};

export default usePaymentStoreSearch;
