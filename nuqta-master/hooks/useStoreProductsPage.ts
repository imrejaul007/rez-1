/**
 * useStoreProductsPage Hook
 *
 * Comprehensive data hook for the StoreProductsPage.
 * Handles product fetching, filtering, sorting, pagination, search history,
 * search suggestions, offline caching, and analytics tracking.
 *
 * @module hooks/useStoreProductsPage
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import storesApi from '@/services/storesApi';
import apiClient from '@/services/apiClient';
import { useStoreData } from '@/hooks/useStoreData';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ProductItem } from '@/types/homepage.types';
import { handleNetworkError } from '@/utils/networkErrorHandler';
import { errorReporter } from '@/utils/errorReporter';
import analyticsService from '@/services/analyticsService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SortOption = 'newest' | 'price_low' | 'price_high' | 'rating' | 'popular';
export type AvailabilityFilter = 'all' | 'in_stock' | 'out_of_stock';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

export interface ErrorInfo {
  message: string;
  isRetryable: boolean;
  suggestions?: string[];
}

export interface StoreProductsFilters {
  searchQuery: string;
  selectedCategory: string | null;
  sortBy: SortOption;
  availabilityFilter: AvailabilityFilter;
  minPrice: string;
  maxPrice: string;
}

export interface UseStoreProductsPageResult {
  // Data
  products: ProductItem[];
  filteredProducts: ProductItem[];
  categories: CategoryItem[];
  storeData: any;
  displayStoreName: string;

  // Loading states
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  storeLoading: boolean;
  loadingCategories: boolean;

  // Error states
  error: string | null;
  errorInfo: ErrorInfo | null;

  // Pagination
  hasMore: boolean;
  loadMore: () => void;
  onRefresh: () => void;

  // Filter state and handlers
  filters: StoreProductsFilters;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSortBy: (sort: SortOption) => void;
  setAvailabilityFilter: (filter: AvailabilityFilter) => void;
  setMinPrice: (price: string) => void;
  setMaxPrice: (price: string) => void;
  clearAllFilters: () => void;
  hasActiveFilters: boolean;

  // Search
  searchHistory: string[];
  searchSuggestions: string[];
  showSearchSuggestions: boolean;
  setShowSearchSuggestions: (show: boolean) => void;
  saveSearchHistory: (query: string) => void;

  // Retry
  retryCount: number;
  retryFetch: () => void;

  // Network
  isOnline: boolean;
  isOffline: boolean;
  waitForNetwork: (timeout?: number) => Promise<boolean>;
  connectionQuality: string | undefined;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useStoreProductsPage(
  storeId: string,
  storeName?: string,
  pathname?: string,
): UseStoreProductsPageResult {
  // Product data state
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Categories
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Search history and suggestions
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  // Performance tracking
  const pageLoadStartTime = useRef<number>(Date.now());

  // Fetch store data
  const { data: storeData, loading: storeLoading } = useStoreData(storeId || '');

  // Network status
  const { isOnline, isOffline, connectionQuality, waitForNetwork } = useNetworkStatus();

  const displayStoreName = storeData?.name || storeName || 'Store';

  // ─── URL params sync (web only) ──────────────────────────────────────────

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location?.search || '');
        const urlSearch = urlParams.get('search');
        const urlCategory = urlParams.get('category');
        const urlSort = urlParams.get('sort');

        if (urlSearch && urlSearch !== searchQuery) setSearchQuery(urlSearch);
        if (urlCategory && urlCategory !== selectedCategory) setSelectedCategory(urlCategory);
        if (urlSort && urlSort !== sortBy) setSortBy(urlSort as SortOption);
      } catch {
        // Ignore URL parsing errors
      }
    }
  }, []); // Only on mount

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && pathname) {
      const urlParams = new URLSearchParams();
      if (searchQuery.trim()) urlParams.set('search', searchQuery.trim());
      if (selectedCategory) urlParams.set('category', selectedCategory);
      if (sortBy !== 'newest') urlParams.set('sort', sortBy);

      const newUrl = urlParams.toString() ? `${pathname}?${urlParams.toString()}` : pathname;
      try {
        window.history?.replaceState?.({}, '', newUrl);
      } catch {
        // Ignore history API errors
      }
    }
  }, [searchQuery, selectedCategory, sortBy, pathname]);

  // ─── Offline caching ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!storeId || products.length === 0 || loading) return;

    const cacheProducts = async () => {
      try {
        const cacheKey = `products_cache_${storeId}`;
        const cacheData = {
          products,
          timestamp: Date.now(),
          filters: { searchQuery, selectedCategory, sortBy },
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch {
        // Silent: non-critical AsyncStorage cache write
      }
    };

    const timeoutId = setTimeout(cacheProducts, 1000);
    return () => clearTimeout(timeoutId);
  }, [products, storeId, searchQuery, selectedCategory, sortBy, loading]);

  // ─── Fetch categories ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const loadCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await apiClient.get('/categories', {
          type: 'home_delivery',
        });

        if (cancelled) return;
        if (response.success && response.data) {
          const categoryList = Array.isArray(response.data)
            ? response.data
            : ((response.data as any).categories || []);

          setCategories(categoryList.map((cat: any) => ({
            id: cat._id || cat.id || '',
            name: cat.name || '',
            slug: cat.slug || cat.name?.toLowerCase().replace(/\s+/g, '-') || '',
          })));
        }
      } catch (err: any) {
        if (cancelled) return;
        errorReporter.captureError(
          err instanceof Error ? err : new Error('Failed to fetch product categories'),
          { context: 'useStoreProductsPage.loadCategories' },
          'info'
        );
        setCategories([]);
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    loadCategories();
    return () => { cancelled = true; };
  }, []);

  // ─── Fetch products ───────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (
    pageNum: number = 1,
    append: boolean = false,
    retryAttempt: number = 0
  ) => {
    if (!storeId) {
      const errorMsg = 'Store ID is required';
      setError(errorMsg);
      setErrorInfo({ message: errorMsg, isRetryable: false });
      setLoading(false);
      return;
    }

    if (isOffline) {
      const errorMsg = 'No internet connection. Please check your network and try again.';
      setError(errorMsg);
      setErrorInfo({
        message: errorMsg,
        isRetryable: true,
        suggestions: [
          'Check your WiFi or mobile data connection',
          'Try switching between WiFi and mobile data',
          'Move to an area with better reception',
        ],
      });
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      return;
    }

    try {
      if (!append) {
        setLoading(true);
        setError(null);
        setErrorInfo(null);
      } else {
        setLoadingMore(true);
      }

      const queryParams: any = { page: pageNum, limit: 20 };
      if (searchQuery.trim()) queryParams.search = searchQuery.trim();
      if (selectedCategory) queryParams.category = selectedCategory;
      if (sortBy) queryParams.sortBy = sortBy;

      const response = await storesApi.getStoreProducts(storeId, queryParams);

      if (response.success && response.data) {
        if (!response.data.products || !Array.isArray(response.data.products)) {
          throw new Error('Invalid response format from server');
        }

        const newProducts: ProductItem[] = (response.data.products || []).map((product: any) => {
          const productId = product._id || product.id;
          if (!productId) return null;

          const productImage = Array.isArray(product.images) && product.images.length > 0
            ? product.images[0]
            : product.image;

          const isValidImageUrl = typeof productImage === 'string' &&
            (productImage.startsWith('http') || productImage.startsWith('https') || productImage.startsWith('/'));

          const sellingPrice = product.pricing?.selling || product.pricing?.basePrice || 0;
          const originalPrice = product.pricing?.original || product.pricing?.basePrice || 0;
          const discount = product.pricing?.discount || (originalPrice > sellingPrice
            ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
            : 0);

          const stock = product.inventory?.stock || 0;
          const isAvailable = product.inventory?.isAvailable !== false && stock > 0;

          return {
            id: productId,
            _id: productId,
            type: 'product' as const,
            name: product.name || 'Unnamed Product',
            title: product.name || 'Unnamed Product',
            brand: product.brand || storeData?.name || 'Store',
            image: isValidImageUrl ? productImage : undefined,
            description: product.description || product.shortDescription || '',
            price: {
              current: Math.max(0, sellingPrice),
              original: originalPrice > sellingPrice ? Math.max(0, originalPrice) : undefined,
              currency: product.pricing?.currency || 'INR',
              discount: Math.max(0, Math.min(100, discount)),
            },
            category: product.category?.name || product.category || 'General',
            subcategory: product.subcategory,
            rating: product.ratings ? {
              value: typeof product.ratings.average === 'string'
                ? parseFloat(product.ratings.average) || 0
                : (product.ratings.average || 0),
              count: product.ratings.count || 0,
            } : undefined,
            cashback: product.cashback ? {
              percentage: product.cashback.percentage || 0,
              maxAmount: product.cashback.maxAmount,
            } : undefined,
            availabilityStatus: isAvailable ? 'in_stock' : 'out_of_stock',
            inventory: {
              stock: Math.max(0, stock),
              lowStockThreshold: product.inventory?.lowStockThreshold || 5,
            },
            tags: Array.isArray(product.tags) ? product.tags : [],
            isNewArrival: product.isNewArrival,
            isRecommended: product.isFeatured || product.isRecommended,
            storeName: storeData?.name || storeName || 'Store',
            storeId: storeId,
          } as ProductItem;
        }).filter((product): product is ProductItem => product !== null);

        if (append) {
          setProducts(prev => [...prev, ...newProducts]);
        } else {
          setProducts(newProducts);
        }

        const pagination = response.data.pagination;
        setHasMore(pagination ? (pageNum < pagination.pages) : false);
        setRetryCount(0);
      } else {
        throw new Error(response.message || 'Failed to fetch products');
      }
    } catch (err: any) {
      const networkError = handleNetworkError(err);
      const errorMessage = networkError.userMessage;
      const isRetryable = networkError.isRetryable && retryAttempt < maxRetries;

      setError(errorMessage);
      setErrorInfo({
        message: errorMessage,
        isRetryable,
        suggestions: networkError.suggestions,
      });

      if (!append) setProducts([]);

      if (isRetryable && retryAttempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryAttempt), 5000);
        setTimeout(() => {
          setRetryCount(retryAttempt + 1);
          fetchProducts(pageNum, append, retryAttempt + 1);
        }, delay);
        return;
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [storeId, storeData, storeName, searchQuery, selectedCategory, sortBy, isOffline]);

  // ─── Search history ───────────────────────────────────────────────────────

  const saveSearchHistory = useCallback(async (query: string) => {
    if (!query.trim() || !storeId) return;

    try {
      const sanitizedQuery = query.trim().toLowerCase();
      setSearchHistory(prev => {
        const updatedHistory = [
          sanitizedQuery,
          ...prev.filter(item => item !== sanitizedQuery),
        ].slice(0, 10);

        AsyncStorage.setItem(`search_history_${storeId}`, JSON.stringify(updatedHistory)).catch(() => {});
        return updatedHistory;
      });
    } catch {
      // Silent: non-critical search history save
    }
  }, [storeId]);

  // Load search history from storage
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await AsyncStorage.getItem(`search_history_${storeId}`);
        if (history) {
          const parsed = JSON.parse(history);
          setSearchHistory(Array.isArray(parsed) ? parsed.slice(0, 10) : []);
        }
      } catch {
        // Silent: non-critical AsyncStorage read
      }
    };

    if (storeId) loadSearchHistory();
  }, [storeId]);

  // ─── Debounced search ─────────────────────────────────────────────────────

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!storeId) return;

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        analyticsService.track('product_search', {
          storeId,
          query: searchQuery.trim(),
          hasCategoryFilter: !!selectedCategory,
          sortBy,
          resultCount: products.length,
        });
        saveSearchHistory(searchQuery);
      }

      setPage(1);
      setHasMore(true);
      fetchProducts(1, false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, storeId, fetchProducts, selectedCategory, sortBy, products.length, saveSearchHistory]);

  // ─── Filter change refetch ────────────────────────────────────────────────

  useEffect(() => {
    if (!storeId) return;

    if (selectedCategory || sortBy !== 'newest') {
      analyticsService.track('product_filter_applied', {
        storeId,
        category: selectedCategory,
        sortBy,
        availabilityFilter,
        hasPriceFilter: !!(minPrice || maxPrice),
      });
    }

    setPage(1);
    setHasMore(true);
    fetchProducts(1, false);
  }, [selectedCategory, sortBy, storeId, fetchProducts, availabilityFilter, minPrice, maxPrice]);

  // ─── Client-side filtering (price + availability) ─────────────────────────

  const filteredProducts = useMemo(() => {
    if (products.length === 0) return [];

    let filtered = [...products];

    if (availabilityFilter !== 'all') {
      filtered = filtered.filter(product => {
        if (availabilityFilter === 'in_stock') return product.availabilityStatus === 'in_stock';
        return product.availabilityStatus === 'out_of_stock';
      });
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min) && min > 0) {
        filtered = filtered.filter(product => product.price.current >= min);
      }
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max) && max > 0) {
        filtered = filtered.filter(product => product.price.current <= max);
      }
    }

    return filtered;
  }, [products, availabilityFilter, minPrice, maxPrice]);

  // ─── Search suggestions ───────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const suggestions: string[] = [];

    searchHistory
      .filter(item => item.includes(query) && item !== query)
      .slice(0, 3)
      .forEach(item => suggestions.push(item));

    products
      .filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.category?.toLowerCase().includes(query)
      )
      .slice(0, 5)
      .forEach(product => {
        if (!suggestions.includes(product.name.toLowerCase())) {
          suggestions.push(product.name);
        }
      });

    setSearchSuggestions(suggestions.slice(0, 5));
    setShowSearchSuggestions(suggestions.length > 0);
  }, [searchQuery, products, searchHistory]);

  // ─── Analytics tracking ───────────────────────────────────────────────────

  useEffect(() => {
    if (storeId) {
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      pageLoadStartTime.current = startTime;

      analyticsService.trackPageView('store_products_page', {
        storeId,
        storeName: storeData?.name || storeName,
        productCount: products.length,
        platform: Platform.OS,
      });
    }
  }, [storeId, storeData?.name, storeName, products.length]);

  useEffect(() => {
    if (!loading && products.length > 0 && pageLoadStartTime.current) {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const startTime = pageLoadStartTime.current;
      const loadTime = typeof performance !== 'undefined'
        ? Math.round(endTime - startTime)
        : Date.now() - startTime;

      const metrics = {
        storeId,
        loadTime,
        productCount: products.length,
        hasFilters: !!(selectedCategory || searchQuery || sortBy !== 'newest'),
        networkStatus: isOnline ? 'online' : 'offline',
        connectionQuality: connectionQuality || 'unknown',
        platform: Platform.OS,
      };

      analyticsService.track('store_products_page_load_performance', metrics);

      if (loadTime > 3000) {
        analyticsService.track('performance_warning', {
          ...metrics,
          warning: 'slow_load_time',
          threshold: 3000,
        });
      }
    }
  }, [loading, products.length, storeId, selectedCategory, searchQuery, sortBy, isOnline, connectionQuality]);

  // ─── Initial load ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (storeId) fetchProducts(1, false);
  }, [storeId, fetchProducts]);

  // ─── Pagination ───────────────────────────────────────────────────────────

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, true);
    }
  }, [page, hasMore, loadingMore, loading, fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchProducts(1, false);
  }, [fetchProducts]);

  // ─── Filter helpers ───────────────────────────────────────────────────────

  const hasActiveFilters = !!(
    selectedCategory ||
    sortBy !== 'newest' ||
    availabilityFilter !== 'all' ||
    minPrice ||
    maxPrice
  );

  const clearAllFilters = useCallback(() => {
    analyticsService.track('filters_cleared', {
      storeId,
      hadSearch: !!searchQuery,
      hadCategory: !!selectedCategory,
      hadSort: sortBy !== 'newest',
      hadAvailability: availabilityFilter !== 'all',
      hadPrice: !!(minPrice || maxPrice),
    });

    setSearchQuery('');
    setSelectedCategory(null);
    setAvailabilityFilter('all');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
  }, [storeId, searchQuery, selectedCategory, sortBy, availabilityFilter, minPrice, maxPrice]);

  const retryFetch = useCallback(() => {
    setRetryCount(0);
    setError(null);
    setErrorInfo(null);
    fetchProducts(1, false, 0);
  }, [fetchProducts]);

  // ─── Return ───────────────────────────────────────────────────────────────

  return {
    products,
    filteredProducts,
    categories,
    storeData,
    displayStoreName,

    loading,
    refreshing,
    loadingMore,
    storeLoading,
    loadingCategories,

    error,
    errorInfo,

    hasMore,
    loadMore,
    onRefresh,

    filters: {
      searchQuery,
      selectedCategory,
      sortBy,
      availabilityFilter,
      minPrice,
      maxPrice,
    },
    setSearchQuery,
    setSelectedCategory,
    setSortBy,
    setAvailabilityFilter,
    setMinPrice,
    setMaxPrice,
    clearAllFilters,
    hasActiveFilters,

    searchHistory,
    searchSuggestions,
    showSearchSuggestions,
    setShowSearchSuggestions,
    saveSearchHistory,

    retryCount,
    retryFetch,

    isOnline,
    isOffline,
    waitForNetwork,
    connectionQuality,
  };
}
