/**
 * Cached Query Hook
 * React Query-like hook for API calls with caching, deduplication, and stale-while-revalidate
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import cacheService from '@/services/cacheService';
import { CacheOptions } from '@/services/cacheService';

// ============================================================================
// Types
// ============================================================================

export interface UseCachedQueryOptions extends CacheOptions {
  enabled?: boolean; // Whether to auto-fetch on mount
  cacheKey?: string; // Custom cache key (otherwise generated from queryKey)
  staleTime?: number; // Time before data is considered stale (ms)
  cacheTime?: number; // Same as ttl, for compatibility
  retry?: boolean | number; // Retry failed requests
  retryDelay?: number; // Delay between retries
  onSuccess?: (data: any) => void; // Success callback
  onError?: (error: Error) => void; // Error callback
  dedupe?: boolean; // Prevent duplicate requests
}

export interface UseCachedQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  isStale: boolean;
  isFetching: boolean;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

// ============================================================================
// Request Deduplication
// ============================================================================

const ongoingRequests = new Map<string, Promise<any>>();

/**
 * Deduplicate concurrent requests for the same resource
 */
function dedupeRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = ongoingRequests.get(key);

  if (existing) {
    return existing;
  }

  const promise = fetcher().finally(() => {
    ongoingRequests.delete(key);
  });

  ongoingRequests.set(key, promise);
  return promise;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Custom hook for cached API queries
 * Implements cache-first strategy with stale-while-revalidate
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useCachedQuery(
 *   ['products', storeId],
 *   () => productsApi.getProductsByStore(storeId),
 *   { cacheTime: 5 * 60 * 1000 }
 * );
 * ```
 */
export function useCachedQuery<T = any>(
  queryKey: any[],
  fetcher: () => Promise<T>,
  options: UseCachedQueryOptions = {}
): UseCachedQueryResult<T> {
  const {
    enabled = true,
    cacheKey: customCacheKey,
    staleTime = 2 * 60 * 1000, // 2 minutes
    cacheTime,
    ttl = cacheTime || 5 * 60 * 1000, // 5 minutes
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    dedupe = true,
    priority = 'medium',
    compress,
  } = options;

  // Generate cache key from queryKey array
  const cacheKeyString = customCacheKey || JSON.stringify(queryKey);

  // State
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  // Refs to track component lifecycle
  const isMounted = useRef<boolean>(true);
  const lastFetchTime = useRef<number>(0);

  /**
   * Fetch data with retry logic
   */
  const fetchData = useCallback(async (isBackground = false): Promise<void> => {
    if (!isBackground) {
      setIsFetching(true);
      setError(null);
    }

    const maxRetries = typeof retry === 'number' ? retry : (retry ? 3 : 0);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {

        const fetchFn = dedupe
          ? () => dedupeRequest(cacheKeyString, fetcher)
          : fetcher;

        const result = await fetchFn();

        if (!isMounted.current) return;

        // Cache the result
        await cacheService.set(cacheKeyString, result, { ttl, priority, compress });

        setData(result);
        setError(null);
        setIsStale(false);
        lastFetchTime.current = Date.now();

        if (onSuccess) {
          onSuccess(result);
        }

        break; // Success, exit retry loop
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');

        if (attempt === maxRetries) {
          // Last attempt failed
          if (!isMounted.current) return;

          setError(error);

          if (onError) {
            onError(error);
          }
        } else {
          // Retry after delay
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }

    if (!isBackground) {
      setIsFetching(false);
    }
  }, [cacheKeyString, fetcher, ttl, priority, compress, retry, retryDelay, onSuccess, onError, dedupe]);

  /**
   * Load data (cache-first, then network)
   */
  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);

      // Try cache first
      const cached = await cacheService.get<T>(cacheKeyString);

      if (cached !== null) {
        setData(cached);
        setError(null);
        setLoading(false);

        // Check if data is stale
        const age = Date.now() - lastFetchTime.current;
        const dataIsStale = age > staleTime;

        setIsStale(dataIsStale);

        // Stale-while-revalidate: fetch in background if stale
        if (dataIsStale) {
          fetchData(true); // Background fetch
        }

        return;
      }

      // Cache miss - fetch from network
      await fetchData(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [cacheKeyString, fetchData, staleTime]);

  /**
   * Refetch data (bypass cache)
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchData(false);
  }, [fetchData]);

  /**
   * Invalidate cache for this query
   */
  const invalidate = useCallback(async (): Promise<void> => {
    await cacheService.remove(cacheKeyString);
    setIsStale(true);
  }, [cacheKeyString]);

  // Load data on mount or when queryKey changes
  useEffect(() => {
    isMounted.current = true;

    if (enabled) {
      loadData();
    }

    return () => {
      isMounted.current = false;
    };
  }, [enabled, cacheKeyString]); // Re-run when queryKey changes

  return {
    data,
    loading,
    error,
    isStale,
    isFetching,
    refetch,
    invalidate,
  };
}

// ============================================================================
// Mutation Hook
// ============================================================================

export interface UseCachedMutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  invalidateQueries?: string[][]; // Query keys to invalidate on success
}

export interface UseCachedMutationResult<T, V> {
  mutate: (variables: V) => Promise<T | null>;
  mutateAsync: (variables: V) => Promise<T>;
  loading: boolean;
  error: Error | null;
  data: T | null;
  reset: () => void;
}

/**
 * Hook for mutations with cache invalidation
 *
 * @example
 * ```tsx
 * const { mutate, loading } = useCachedMutation(
 *   (productId) => productsApi.deleteProduct(productId),
 *   {
 *     invalidateQueries: [['products']],
 *   }
 * );
 * ```
 */
export function useCachedMutation<T = any, V = any>(
  mutationFn: (variables: V) => Promise<T>,
  options: UseCachedMutationOptions = {}
): UseCachedMutationResult<T, V> {
  const { onSuccess, onError, invalidateQueries = [] } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const mutateAsync = useCallback(async (variables: V): Promise<T> => {
    try {
      setLoading(true);
      setError(null);

      const result = await mutationFn(variables);

      setData(result);

      // Invalidate specified queries
      for (const queryKey of invalidateQueries) {
        const cacheKey = JSON.stringify(queryKey);
        await cacheService.remove(cacheKey);
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);

      if (onError) {
        onError(error);
      }

      throw error;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, invalidateQueries, onSuccess, onError]);

  const mutate = useCallback(async (variables: V): Promise<T | null> => {
    try {
      return await mutateAsync(variables);
    } catch (error) {
      return null;
    }
  }, [mutateAsync]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    mutate,
    mutateAsync,
    loading,
    error,
    data,
    reset,
  };
}

// ============================================================================
// Infinite Query Hook
// ============================================================================

export interface UseInfiniteCachedQueryOptions extends UseCachedQueryOptions {
  getNextPageParam?: (lastPage: any, allPages: any[]) => any;
}

export interface UseInfiniteCachedQueryResult<T> extends UseCachedQueryResult<T[]> {
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  isFetchingNextPage: boolean;
}

/**
 * Hook for infinite scroll / pagination with caching
 *
 * @example
 * ```tsx
 * const { data, fetchNextPage, hasNextPage } = useInfiniteCachedQuery(
 *   ['products', 'infinite'],
 *   ({ pageParam = 0 }) => productsApi.getProducts({ page: pageParam }),
 *   {
 *     getNextPageParam: (lastPage) => lastPage.nextPage,
 *   }
 * );
 * ```
 */
export function useInfiniteCachedQuery<T = any>(
  queryKey: any[],
  fetcher: (context: { pageParam: any }) => Promise<T>,
  options: UseInfiniteCachedQueryOptions = {}
): UseInfiniteCachedQueryResult<T> {
  const { getNextPageParam } = options;

  const [pages, setPages] = useState<T[]>([]);
  const [hasNextPage, setHasNextPage] = useState<boolean>(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState<boolean>(false);
  const currentPage = useRef<any>(0);

  const baseQuery = useCachedQuery<T[]>(
    [...queryKey, 'page', currentPage.current],
    async () => {
      const result = await fetcher({ pageParam: currentPage.current });
      return [result];
    },
    {
      ...options,
      enabled: false, // Don't auto-fetch
    }
  );

  const fetchNextPage = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;

    setIsFetchingNextPage(true);

    try {
      const result = await fetcher({ pageParam: currentPage.current });
      const newPages = [...pages, result];
      setPages(newPages);

      // Check if there's a next page
      if (getNextPageParam) {
        const nextParam = getNextPageParam(result, newPages);
        setHasNextPage(nextParam !== undefined && nextParam !== null);
        if (nextParam) {
          currentPage.current = nextParam;
        }
      }
    } catch (error) {
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [pages, hasNextPage, isFetchingNextPage, fetcher, getNextPageParam]);

  return {
    ...baseQuery,
    data: pages,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  };
}

export default useCachedQuery;
