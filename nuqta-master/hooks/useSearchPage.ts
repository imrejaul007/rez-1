// @ts-nocheck
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearch } from './useSearch';
import { searchCacheService } from '@/services/searchCacheService';
import { searchAnalyticsService } from '@/services/searchAnalyticsService';
import { searchHistoryService } from '@/services/searchHistoryService';
import { SearchPageState, SearchSection, SearchCategory, SearchResult, SearchSuggestion, GroupedProductResult, SearchResultsSummary } from '@/types/search.types';
import { apiClient } from '@/utils/apiClient';
import searchService from '@/services/searchApi';
import searchDiscoveryApi, { TrendingSearch, StoreItem } from '@/services/searchDiscoveryApi';
import type { FilterState } from '@/components/search/FilterModal';
import { useCurrentRegionId } from '@/stores/selectors';

export const useSearchPage = () => {
  const { state: searchHookState, actions } = useSearch();
  const currentRegion = useCurrentRegionId();
  
  const [state, setState] = useState<SearchPageState>({
    query: '',
    isSearching: false,
    sections: [],
    results: [],
    suggestions: [],
    activeFilters: {},
    availableFilters: [],
    sortBy: 'savings',
    searchHistory: [],
    recentSearches: [],
    showSuggestions: false,
    showFilters: false,
    loading: true,
    error: null,
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      hasMore: false,
    },
  });

  // New state for grouped products
  const [groupedProducts, setGroupedProducts] = useState<GroupedProductResult[]>([]);
  const [searchSummary, setSearchSummary] = useState<SearchResultsSummary | null>(null);
  const [matchingStores, setMatchingStores] = useState<any[]>([]);

  // Landing page discovery data
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([]);
  const [popularStores, setPopularStores] = useState<StoreItem[]>([]);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [didYouMeanSuggestions, setDidYouMeanSuggestions] = useState<string[]>([]);

  // Helper function to map backend categories to UI format
  const mapToSearchCategory = useCallback((cat: any): SearchCategory => {
    const imageUrl = cat.image || cat.bannerImage || '';
    
    return {
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      image: imageUrl,
      cashbackPercentage: cat.cashbackPercentage || 10,
      isPopular: cat.metadata?.featured || cat.isFeatured || false,
    };
  }, []);

  // Helper function to map products to search results
  const mapProductToSearchResult = useCallback((product: any): SearchResult => ({
    id: product._id,
    title: product.name,
    description: product.shortDescription || product.description || '',
    image: product.images?.[0],
    category: product.category?.name || '',
    cashbackPercentage: product.cashback?.percentage || 0,
    rating: product.ratings?.average,
    price: {
      current: product.pricing?.selling || 0,
      original: product.pricing?.original,
      currency: 'INR'
    },
    tags: product.tags || [],
  }), []);

  // Helper function to map stores to search results
  const mapStoreToSearchResult = useCallback((store: any): SearchResult => ({
    id: store._id,
    title: store.name,
    description: store.description || '',
    image: store.logo,
    category: 'Store',
    cashbackPercentage: 10,
    rating: store.ratings?.average,
    location: store.location?.address,
  }), []);

  // Load categories from backend
  const loadCategories = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await apiClient.get('/categories', {
        featured: true
      });

      if (response.success && response.data) {
        // Backend returns { categories, pagination } object — extract the array
        const categories = response.data?.categories
          ? response.data.categories
          : (Array.isArray(response.data) ? response.data : []);
        const goingOut = categories.filter((c: any) => c.type === 'going_out');
        const homeDelivery = categories.filter((c: any) => c.type === 'home_delivery');
        
        const sections: SearchSection[] = [];
        
        if (goingOut.length > 0) {
          sections.push({
            id: 'going-out',
            title: 'Going Out',
            subtitle: 'Services for when you\'re out and about',
            categories: goingOut.map(mapToSearchCategory),
          });
        }
        
        if (homeDelivery.length > 0) {
          sections.push({
            id: 'home-delivery',
            title: 'Home Delivery',
            subtitle: 'Everything delivered to your doorstep',
            categories: homeDelivery.map(mapToSearchCategory),
          });
        }
        
        setState(prev => ({
          ...prev,
          sections,
          loading: false,
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        sections: [],
        loading: false,
        error: 'Failed to load categories. Please check your connection and try again.',
      }));
    }
  }, [mapToSearchCategory]);

  // Load search suggestions based on query
  const loadSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      // Load recent searches when no query
      const recentSearches = await searchHistoryService.getRecentSearches();
      const suggestions: SearchSuggestion[] = recentSearches.map((search, index) => ({
        id: `recent-${index}`,
        text: search.query,
        type: 'product' as const,
        isRecent: true,
      }));

      setState(prev => ({
        ...prev,
        suggestions,
        showSuggestions: true,
      }));
      return;
    }

    try {
      // Get suggestions from backend
      const response = await searchService.getSearchSuggestions(query);

      if (response.success && response.data) {
        // Map API suggestions to UI suggestions with ids
        const suggestions: SearchSuggestion[] = response.data.map((suggestion: any, index: number) => ({
          id: `suggestion-${index}-${suggestion.text}`,
          text: suggestion.text,
          type: suggestion.type === 'store' ? 'product' : suggestion.type,
          categoryId: suggestion.categoryId,
          resultCount: suggestion.count,
          isRecent: false,
        }));

        setState(prev => ({
          ...prev,
          suggestions,
          showSuggestions: true,
        }));
      } else {
        // If backend doesn't support suggestions yet, show recent searches
        const recentSearches = await searchHistoryService.getRecentSearches();
        const filteredSearches = recentSearches
          .filter(s => s.query.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 5);

        const suggestions: SearchSuggestion[] = filteredSearches.map((search, index) => ({
          id: `recent-${index}`,
          text: search.query,
          type: 'product' as const,
          isRecent: true,
        }));

        setState(prev => ({
          ...prev,
          suggestions,
          showSuggestions: true,
        }));
      }
    } catch (error) {
      // Silently fail for suggestions
    }
  }, []);

  // Perform grouped product search (new method for seller comparison)
  const performGroupedSearch = useCallback(async (query: string, userLocation?: { latitude: number; longitude: number }, filters?: FilterState) => {
    if (!query.trim()) return;

    setState(prev => ({
      ...prev,
      isSearching: true,
      loading: true,
      showSuggestions: false,
    }));

    try {
      const params: any = {
        q: query,
        limit: 20,
        lat: userLocation?.latitude,
        lon: userLocation?.longitude,
      };

      // Add filter params if provided
      if (filters) {
        if (filters.priceRange.min > 0) params.minPrice = filters.priceRange.min;
        if (filters.priceRange.max < 100000) params.maxPrice = filters.priceRange.max;
        if (filters.rating !== null) params.rating = filters.rating;
        if (filters.categories.length > 0) params.categories = filters.categories.join(',');
        if (filters.cashbackMin > 0) params.cashbackMin = filters.cashbackMin;
        if (filters.inStock) params.inStock = true;
      }

      const response = await searchService.searchProductsGrouped(params);

      if (response.success && response.data) {
        const { groupedProducts: products, summary, matchingStores: stores } = response.data;

        setGroupedProducts(products || []);
        setSearchSummary(summary);
        setMatchingStores(stores || []);

        // Track analytics
        const totalResults = (products?.length || 0) + (stores?.length || 0);
        const resultCount = totalResults || summary?.sellerCount || 0;

        // Fetch "did you mean?" suggestions when no results
        if (totalResults === 0 && query.length >= 3) {
          searchService.getDidYouMean(query).then(suggestions => {
            setDidYouMeanSuggestions(suggestions);
          }).catch(() => {});
        } else {
          setDidYouMeanSuggestions([]);
        }

        await searchAnalyticsService.trackSearch(query, resultCount);

        // Save to search history (local)
        await searchHistoryService.addSearch(query, resultCount);

        // Save to backend history (fire-and-forget, includes region)
        apiClient.post('/search/history', { query, type: 'general', resultCount, region: currentRegion }).catch(() => {});

        setState(prev => ({
          ...prev,
          isSearching: false,
          loading: false,
          pagination: {
            ...prev.pagination,
            total: response.data.total,
            hasMore: response.data.hasMore,
          },
        }));
      } else {
        throw new Error('Failed to fetch grouped products');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSearching: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed. Please try again.',
      }));
      setGroupedProducts([]);
      setMatchingStores([]);
      setSearchSummary(null);
    }
  }, [currentRegion]);

  // Perform search with debouncing and caching
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setState(prev => ({
      ...prev,
      isSearching: true,
      loading: true,
      showSuggestions: false,
    }));

    try {
      // Check cache first
      const cachedResults = await searchCacheService.getFromCache(query);

      if (cachedResults && cachedResults.length > 0) {
        setState(prev => ({
          ...prev,
          results: cachedResults,
          isSearching: false,
          loading: false,
        }));

        // Save to search history
        await searchHistoryService.addSearch(query, cachedResults.length);
        return;
      }

      // Use the search hook to search both products and stores
      await actions.searchAll(query);

      // Map results from hook state
      const results: SearchResult[] = [
        ...searchHookState.productResults.map(mapProductToSearchResult),
        ...searchHookState.storeResults.map(mapStoreToSearchResult),
      ];

      // Track analytics
      await searchAnalyticsService.trackSearch(query, results.length);

      // Save to search history
      await searchHistoryService.addSearch(query, results.length);

      // Cache the results
      await searchCacheService.saveToCache(query, results);

      setState(prev => ({
        ...prev,
        results,
        isSearching: false,
        loading: false,
        pagination: {
          ...prev.pagination,
          total: searchHookState.pagination.total,
          hasMore: searchHookState.pagination.hasMore,
        },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSearching: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Search failed. Please try again.',
      }));
    }
  }, [actions, searchHookState, mapProductToSearchResult, mapStoreToSearchResult]);

  // Debounce ref for suggestions
  const suggestionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle search query change
  const handleSearchChange = useCallback((query: string) => {
    setState(prev => ({ ...prev, query }));

    // Clear pending suggestion request
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }

    // Load suggestions as user types (debounced)
    if (query.length >= 2) {
      suggestionsTimeoutRef.current = setTimeout(() => {
        loadSuggestions(query);
      }, 300);
    } else if (query.length === 0) {
      // Show recent searches immediately when query is cleared
      loadSuggestions('');
    } else {
      // Hide suggestions for single character
      setState(prev => ({ ...prev, suggestions: [], showSuggestions: false }));
    }
  }, [loadSuggestions]);

  // Handle search submit
  const handleSearchSubmit = useCallback((query: string) => {
    if (query.trim().length >= 2) {
      performSearch(query);
    }
  }, [performSearch]);

  // Handle category press
  const handleCategoryPress = useCallback(async (category: SearchCategory) => {
    await searchAnalyticsService.trackCategoryClick(category.id, category.name);
  }, []);

  // Handle result press
  const handleResultPress = useCallback(async (result: SearchResult, position: number) => {
    const resultType = result.category === 'Store' ? 'store' : 'product';
    await searchAnalyticsService.trackResultClick(state.query, result.id, resultType, position);
  }, [state.query]);

  // Handle view all section
  const handleViewAllSection = useCallback((sectionId: string) => {
    // Navigation will be handled by the component
  }, []);

  // Load more results
  const handleLoadMore = useCallback(() => {
    if (state.pagination.hasMore && !state.loading) {
      actions.loadMore();
    }
  }, [state.pagination.hasMore, state.loading, actions]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setState(prev => ({
      ...prev,
      query: '',
      results: [],
      showSuggestions: false,
    }));
    setGroupedProducts([]);
    setMatchingStores([]);
    setSearchSummary(null);
  }, []);

  // Clear error
  const handleClearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Apply filters
  const applyFilters = useCallback((filters: SearchPageState['activeFilters']) => {
    setState(prev => ({ ...prev, activeFilters: filters }));

    // Re-search with new filters
    if (state.query) {
      performSearch(state.query);
    }
  }, [state.query, performSearch]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setState(prev => ({ ...prev, activeFilters: {} }));

    // Re-search without filters
    if (state.query) {
      performSearch(state.query);
    }
  }, [state.query, performSearch]);

  // Clear search history
  const clearSearchHistory = useCallback(async () => {
    try {
      await searchHistoryService.clearHistory();
      setState(prev => ({
        ...prev,
        searchHistory: [],
        recentSearches: [],
        suggestions: [],
      }));
    } catch (_error) {
      // silently handle
    }
  }, []);

  // Load landing page discovery data
  const loadDiscoveryData = useCallback(async () => {
    try {
      const [trending, popular, popularProductsRes] = await Promise.all([
        searchDiscoveryApi.getTrendingSearches(8, currentRegion),
        searchDiscoveryApi.getPopularStores(8),
        apiClient.get('/products/popular', { limit: 6 }).catch(() => ({ success: false, data: null })),
      ]);
      setTrendingSearches(trending);
      setPopularStores(popular);
      if (popularProductsRes.success && popularProductsRes.data) {
        const products = Array.isArray(popularProductsRes.data) ? popularProductsRes.data : popularProductsRes.data.products || [];
        setPopularProducts(products);
      }
    } catch (_error) {
      // silently handle
    }
  }, [currentRegion]);

  // Save search to backend history (fire-and-forget, includes region)
  const saveSearchToBackend = useCallback((query: string, resultCount: number) => {
    apiClient.post('/search/history', { query, type: 'general', resultCount, region: currentRegion }).catch(() => {});
  }, [currentRegion]);

  // Clear suggestions timeout on unmount
  useEffect(() => {
    return () => {
      if (suggestionsTimeoutRef.current) clearTimeout(suggestionsTimeoutRef.current);
    };
  }, []);

  // Load categories, recent searches, and discovery data on mount
  useEffect(() => {
    loadCategories();
    loadSuggestions(''); // Load recent searches
    loadDiscoveryData();
  }, [loadCategories, loadSuggestions, loadDiscoveryData]);

  return {
    state,
    groupedProducts,
    matchingStores,
    searchSummary,
    trendingSearches,
    popularStores,
    popularProducts,
    didYouMeanSuggestions,
    actions: {
      handleSearchChange,
      handleSearchSubmit,
      handleCategoryPress,
      handleResultPress,
      handleViewAllSection,
      handleLoadMore,
      handleClearSearch,
      handleClearError,
      performSearch,
      performGroupedSearch,
      loadCategories,
      loadSuggestions,
      loadDiscoveryData,
      saveSearchToBackend,
      applyFilters,
      clearFilters,
      clearSearchHistory,
    },
  };
};
