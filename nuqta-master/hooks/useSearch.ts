import { useState, useCallback, useEffect } from 'react';
import searchService, {
  ProductSearchParams,
  StoreSearchParams,
  ProductSearchResult,
  StoreSearchResult
} from '@/services/searchApi';

export interface SearchState {
  query: string;
  isSearching: boolean;
  productResults: ProductSearchResult[];
  storeResults: StoreSearchResult[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    rating?: number;
    sortBy?: string;
  };
}

const initialState: SearchState = {
  query: '',
  isSearching: false,
  productResults: [],
  storeResults: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },
  filters: {},
};

export const useSearch = () => {
  const [state, setState] = useState<SearchState>(initialState);

  // Search products
  const searchProducts = useCallback(async (query: string, filters?: Partial<ProductSearchParams>) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, productResults: [], query: '' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, isSearching: true, query, error: null }));

    try {

      const response = await searchService.searchProducts({
        q: query,
        page: state.pagination.page,
        limit: state.pagination.limit,
        ...filters,
        ...state.filters,
      });

      if (response.success && response.data) {
        const { products, pagination } = response.data;

        setState(prev => ({
          ...prev,
          productResults: pagination.page === 1 ? products : [...prev.productResults, ...products],
          loading: false,
          isSearching: false,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            hasMore: pagination.page < pagination.pages,
          },
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        isSearching: false,
        error: error instanceof Error ? error.message : 'Failed to search products',
      }));
    }
  }, [state.pagination.page, state.pagination.limit, state.filters]);

  // Search stores
  const searchStores = useCallback(async (query: string, filters?: Partial<StoreSearchParams>) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, storeResults: [], query: '' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, isSearching: true, query, error: null }));

    try {

      const response = await searchService.searchStores({
        q: query,
        page: state.pagination.page,
        limit: state.pagination.limit,
        ...filters,
      });

      if (response.success && response.data) {
        const { stores, pagination } = response.data;

        setState(prev => ({
          ...prev,
          storeResults: pagination.page === 1 ? stores : [...prev.storeResults, ...stores],
          loading: false,
          isSearching: false,
          pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: pagination.total,
            hasMore: pagination.page < pagination.pages,
          },
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        isSearching: false,
        error: error instanceof Error ? error.message : 'Failed to search stores',
      }));
    }
  }, [state.pagination.page, state.pagination.limit]);

  // Combined search (both products and stores)
  const searchAll = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState(initialState);
      return;
    }

    setState(prev => ({ ...prev, loading: true, isSearching: true, query, error: null }));

    try {

      const [productsResponse, storesResponse] = await Promise.all([
        searchService.searchProducts({
          q: query,
          page: 1,
          limit: 10,
        }),
        searchService.searchStores({
          q: query,
          page: 1,
          limit: 5,
        }),
      ]);

      const productResults = productsResponse.success && productsResponse.data
        ? productsResponse.data.products
        : [];

      const storeResults = storesResponse.success && storesResponse.data
        ? storesResponse.data.stores
        : [];

      setState(prev => ({
        ...prev,
        productResults,
        storeResults,
        loading: false,
        isSearching: false,
        pagination: {
          ...prev.pagination,
          total: (productsResponse.data?.pagination?.total || 0) + (storesResponse.data?.pagination?.total || 0),
        },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        isSearching: false,
        error: error instanceof Error ? error.message : 'Failed to search',
      }));
    }
  }, []);

  // Apply filters
  const applyFilters = useCallback((filters: SearchState['filters']) => {
    setState(prev => ({
      ...prev,
      filters,
      pagination: { ...prev.pagination, page: 1 },
    }));

    // Re-search with new filters
    if (state.query) {
      searchProducts(state.query);
    }
  }, [state.query, searchProducts]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setState(prev => ({
      ...prev,
      filters: {},
      pagination: { ...prev.pagination, page: 1 },
    }));

    // Re-search without filters
    if (state.query) {
      searchProducts(state.query);
    }
  }, [state.query, searchProducts]);

  // Load more results (pagination)
  const loadMore = useCallback(() => {
    if (!state.pagination.hasMore || state.loading) return;

    setState(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page: prev.pagination.page + 1 },
    }));
  }, [state.pagination.hasMore, state.loading]);

  // Clear search
  const clearSearch = useCallback(() => {
    setState(initialState);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Auto-trigger search when pagination changes
  useEffect(() => {
    if (state.pagination.page > 1 && state.query) {
      searchProducts(state.query);
    }
  }, [state.pagination.page]);

  return {
    state,
    actions: {
      searchProducts,
      searchStores,
      searchAll,
      applyFilters,
      clearFilters,
      loadMore,
      clearSearch,
      clearError,
    },
  };
};

export default useSearch;
