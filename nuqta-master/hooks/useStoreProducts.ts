// @ts-nocheck
/**
 * useStoreProducts Hook
 *
 * Custom hook for fetching and managing store products with filtering, sorting, and pagination
 * Supports search, category filtering, price range filtering, and multiple sort options
 *
 * @module hooks/useStoreProducts
 */

import { useState, useEffect, useCallback } from 'react';
import productsService from '@/services/productsApi';
import { errorReporter } from '@/utils/errorReporter';

export interface ProductFilters {
  category?: string;
  priceRange?: { min: number; max: number };
  sortBy?: 'price_low' | 'price_high' | 'rating' | 'newest';
  searchQuery?: string;
}

interface UseStoreProductsResult {
  products: any[];
  loading: boolean;
  error: Error | null;
  totalCount: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  applyFilters: (filters: ProductFilters) => void;
  clearFilters: () => void;
  activeFilters: ProductFilters;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching store products with filtering and pagination
 *
 * @param storeId - The ID of the store
 * @param initialLimit - Number of products to fetch per page (default: 20)
 * @returns Object containing products array, loading state, pagination controls, and filter management
 *
 * @example
 * ```tsx
 * const {
 *   products,
 *   loading,
 *   hasMore,
 *   loadMore,
 *   applyFilters,
 *   clearFilters
 * } = useStoreProducts('store-123');
 *
 * // Apply filters
 * applyFilters({ category: 'electronics', sortBy: 'price_low' });
 *
 * // Load more products
 * if (hasMore && !loading) {
 *   await loadMore();
 * }
 * ```
 */
export function useStoreProducts(
  storeId: string,
  initialLimit: number = 20
): UseStoreProductsResult {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({});

  const fetchProducts = useCallback(async (pageNum: number, reset: boolean = false) => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const queryParams: any = {
        page: pageNum,
        limit: initialLimit,
      };

      // Add filters to query
      if (filters.category) {
        queryParams.category = filters.category;
      }
      if (filters.priceRange) {
        queryParams.minPrice = filters.priceRange.min;
        queryParams.maxPrice = filters.priceRange.max;
      }
      if (filters.sortBy) {
        queryParams.sort = filters.sortBy;
      }
      if (filters.searchQuery) {
        queryParams.search = filters.searchQuery;
      }

      const response = await productsService.getProductsByStore(storeId, queryParams);

      if (response.success) {
        const newProducts = response.data?.products || response.data || [];
        const total = response.data?.total || response.data?.pagination?.total || 0;

        if (reset) {
          setProducts(newProducts);
        } else {
          setProducts(prev => [...prev, ...newProducts]);
        }

        setTotalCount(total);
        setHasMore(newProducts.length === initialLimit);
      } else {
        throw new Error(response.message || 'Failed to load products');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load products');
      setError(error);

      // Report error to monitoring service
      errorReporter.captureError(error, {
        context: 'useStoreProducts',
        storeId,
        page: pageNum,
        filters,
        severity: 'error',
        category: 'network'
      });
    } finally {
      setLoading(false);
    }
  }, [storeId, initialLimit, filters]);

  // Initial fetch and refetch when filters change
  useEffect(() => {
    setPage(1);
    fetchProducts(1, true);
  }, [storeId, filters]);

  /**
   * Load more products (pagination)
   */
  const loadMore = async () => {
    if (!hasMore || loading) return;

    const nextPage = page + 1;
    setPage(nextPage);
    await fetchProducts(nextPage, false);
  };

  /**
   * Apply new filters (merges with existing filters)
   */
  const applyFilters = (newFilters: ProductFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  /**
   * Clear all filters
   */
  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  /**
   * Refetch products from beginning
   */
  const refetch = async () => {
    setPage(1);
    await fetchProducts(1, true);
  };

  return {
    products,
    loading,
    error,
    totalCount,
    hasMore,
    loadMore,
    applyFilters,
    clearFilters,
    activeFilters: filters,
    refetch
  };
}
