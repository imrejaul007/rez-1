/**
 * Infinite Scroll Hook
 * Implements infinite scrolling with pagination, caching, and optimizations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useCachedQuery } from './useCachedQuery';

// ============================================================================
// Types
// ============================================================================

export interface UseInfiniteScrollOptions<T> {
  initialPage?: number;
  pageSize?: number;
  cacheKey?: string;
  cacheTTL?: number;
  enabled?: boolean;
  onSuccess?: (data: T[], page: number) => void;
  onError?: (error: Error, page: number) => void;
  hasMore?: (lastPage: T[], allData: T[]) => boolean;
  getNextPage?: (currentPage: number, lastPage: T[]) => number | null;
}

export interface UseInfiniteScrollResult<T> {
  data: T[];
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  currentPage: number;
  totalItems: number;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Hook for infinite scroll / pagination
 *
 * @example
 * ```tsx
 * const { data, loadingMore, hasMore, fetchMore } = useInfiniteScroll(
 *   (page) => productsApi.getProducts({ page, limit: 20 }),
 *   {
 *     pageSize: 20,
 *     cacheKey: 'products',
 *   }
 * );
 *
 * <FlatList
 *   data={data}
 *   onEndReached={fetchMore}
 *   ListFooterComponent={loadingMore && <ActivityIndicator />}
 * />
 * ```
 */
export function useInfiniteScroll<T = any>(
  fetcher: (page: number, pageSize: number) => Promise<T[]>,
  options: UseInfiniteScrollOptions<T> = {}
): UseInfiniteScrollResult<T> {
  const {
    initialPage = 1,
    pageSize = 20,
    cacheKey,
    cacheTTL = 5 * 60 * 1000, // 5 minutes
    enabled = true,
    onSuccess,
    onError,
    hasMore: hasMoreFn,
    getNextPage,
  } = options;

  // State
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);

  // Refs
  const isMounted = useRef(true);
  const isFetching = useRef(false);
  const allPages = useRef<T[][]>([]);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Fetch a single page
   */
  const fetchPage = useCallback(
    async (page: number, append: boolean = false): Promise<void> => {
      if (isFetching.current) {
        return;
      }

      isFetching.current = true;

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        setError(null);


        const pageData = await fetcher(page, pageSize);

        if (!isMounted.current) return;

        // Store page data
        allPages.current[page - initialPage] = pageData;

        // Flatten all pages
        const allData = allPages.current.flat();

        setData(allData);
        setCurrentPage(page);

        // Determine if there's more data
        let moreAvailable = true;

        if (hasMoreFn) {
          moreAvailable = hasMoreFn(pageData, allData);
        } else {
          // Default: if page returned less than pageSize, no more data
          moreAvailable = pageData.length === pageSize;
        }

        setHasMore(moreAvailable);

        if (onSuccess) {
          onSuccess(pageData, page);
        }

      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch data');

        if (!isMounted.current) return;


        setError(error);

        if (onError) {
          onError(error, page);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setLoadingMore(false);
        }
        isFetching.current = false;
      }
    },
    [fetcher, pageSize, initialPage, hasMoreFn, onSuccess, onError]
  );

  /**
   * Fetch initial data
   */
  useEffect(() => {
    if (enabled && data.length === 0) {
      fetchPage(initialPage, false);
    }
  }, [enabled, initialPage]);

  /**
   * Fetch more data (next page)
   */
  const fetchMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loadingMore || loading) {
      return;
    }

    let nextPage: number | null = currentPage + 1;

    if (getNextPage) {
      const lastPage = allPages.current[allPages.current.length - 1] || [];
      nextPage = getNextPage(currentPage, lastPage);
    }

    if (nextPage === null) {
      setHasMore(false);
      return;
    }

    await fetchPage(nextPage, true);
  }, [hasMore, loadingMore, loading, currentPage, fetchPage, getNextPage]);

  /**
   * Refresh data (reload from first page)
   */
  const refresh = useCallback(async (): Promise<void> => {

    allPages.current = [];
    setData([]);
    setCurrentPage(initialPage);
    setHasMore(true);
    setError(null);

    await fetchPage(initialPage, false);
  }, [initialPage, fetchPage]);

  /**
   * Reset to initial state
   */
  const reset = useCallback((): void => {

    allPages.current = [];
    setData([]);
    setCurrentPage(initialPage);
    setHasMore(true);
    setError(null);
    setLoading(false);
    setLoadingMore(false);
  }, [initialPage]);

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    currentPage,
    totalItems: data.length,
    fetchMore,
    refresh,
    reset,
  };
}

// ============================================================================
// Cursor-based Infinite Scroll
// ============================================================================

export interface UseCursorInfiniteScrollOptions<T> {
  initialCursor?: string | null;
  pageSize?: number;
  enabled?: boolean;
  onSuccess?: (data: T[], cursor: string | null) => void;
  onError?: (error: Error) => void;
}

export interface UseCursorInfiniteScrollResult<T> {
  data: T[];
  loading: boolean;
  loadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  nextCursor: string | null;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook for cursor-based infinite scroll
 * Useful for APIs that use cursor pagination instead of page numbers
 *
 * @example
 * ```tsx
 * const { data, fetchMore } = useCursorInfiniteScroll(
 *   (cursor, limit) => api.getItems({ cursor, limit }),
 *   { pageSize: 20 }
 * );
 * ```
 */
export function useCursorInfiniteScroll<T = any>(
  fetcher: (cursor: string | null, limit: number) => Promise<{
    items: T[];
    nextCursor: string | null;
  }>,
  options: UseCursorInfiniteScrollOptions<T> = {}
): UseCursorInfiniteScrollResult<T> {
  const {
    initialCursor = null,
    pageSize = 20,
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(true);

  const isMounted = useRef(true);
  const isFetching = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchData = useCallback(
    async (cursor: string | null, append: boolean = false): Promise<void> => {
      if (isFetching.current) return;

      isFetching.current = true;

      try {
        if (append) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }

        setError(null);

        const result = await fetcher(cursor, pageSize);

        if (!isMounted.current) return;

        const newData = append ? [...data, ...result.items] : result.items;

        setData(newData);
        setNextCursor(result.nextCursor);
        setHasMore(result.nextCursor !== null);

        if (onSuccess) {
          onSuccess(result.items, result.nextCursor);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch data');

        if (!isMounted.current) return;

        setError(error);

        if (onError) {
          onError(error);
        }
      } finally {
        if (isMounted.current) {
          setLoading(false);
          setLoadingMore(false);
        }
        isFetching.current = false;
      }
    },
    [fetcher, pageSize, data, onSuccess, onError]
  );

  useEffect(() => {
    if (enabled && data.length === 0) {
      fetchData(initialCursor, false);
    }
  }, [enabled, initialCursor]);

  const fetchMore = useCallback(async (): Promise<void> => {
    if (!hasMore || loadingMore || loading) return;

    await fetchData(nextCursor, true);
  }, [hasMore, loadingMore, loading, nextCursor, fetchData]);

  const refresh = useCallback(async (): Promise<void> => {
    setData([]);
    setNextCursor(initialCursor);
    setHasMore(true);
    await fetchData(initialCursor, false);
  }, [initialCursor, fetchData]);

  const reset = useCallback((): void => {
    setData([]);
    setNextCursor(initialCursor);
    setHasMore(true);
    setError(null);
    setLoading(false);
    setLoadingMore(false);
  }, [initialCursor]);

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    nextCursor,
    fetchMore,
    refresh,
    reset,
  };
}

export default useInfiniteScroll;
