import { useState, useEffect, useCallback, useRef } from 'react';
import * as searchApiModule from '@/services/searchApi';
import { useLocationStore } from '@/stores/locationStore';
import { LocationCoordinates } from '@/types/location.types';

/**
 * Debounce delay (in ms) used to coalesce rapid `search` calls into a single
 * network request.
 */
const DEFAULT_DEBOUNCE_MS = 250;

export interface UseStoreSearchOptions {
  /**
   * Optional initial search query. When provided, a search is dispatched
   * automatically once the hook is mounted.
   */
  initialQuery?: string;
  /**
   * Debounce window in milliseconds. Set to 0 to disable debouncing.
   */
  debounceMs?: number;
  /**
   * Whether the hook should run the initial search automatically.
   */
  autoFetch?: boolean;
  /**
   * Optional location coordinates to pass to the API for distance-based
   * sorting and filtering. If not provided, will use the current location
   * from useLocationStore.
   */
  location?: LocationCoordinates;
}

export interface UseStoreSearchReturn {
  query: string;
  results: { stores: any[]; products: any[] } | null;
  stores: any[];
  products: any[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

/**
 * useStoreSearch
 *
 * Lightweight hook for searching stores (and related products) from the
 * search API. Calls are debounced so that rapid typing only fires a single
 * network request after the user stops typing.
 */
export const useStoreSearch = (
  options: UseStoreSearchOptions = {}
): UseStoreSearchReturn => {
  const {
    initialQuery = '',
    debounceMs = DEFAULT_DEBOUNCE_MS,
    autoFetch = true,
    location: optionsLocation,
  } = options;

  // Get current location from location store
  const currentLocation = useLocationStore((s) => s.state.currentLocation);

  // Determine which location to use: options location takes precedence,
  // otherwise fall back to the location store's current location
  const activeLocation: LocationCoordinates | null =
    optionsLocation ||
    (currentLocation?.coordinates
      ? { latitude: currentLocation.coordinates.latitude, longitude: currentLocation.coordinates.longitude }
      : null);

  // Format location for API: "lng,lat" format
  const locationParam = activeLocation
    ? `${activeLocation.longitude},${activeLocation.latitude}`
    : undefined;

  const [query, setQuery] = useState<string>(initialQuery);
  const [results, setResults] = useState<UseStoreSearchReturn['results']>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the latest query requested so that out-of-order responses
  // (e.g. a slow response arriving after a faster newer request) do not
  // overwrite the current results.
  const requestIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  // Abort controller for cancelling pending requests
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      // Cancel any pending request
      abortControllerRef.current?.abort();
    };
  }, []);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      const currentRequestId = ++requestIdRef.current;

      // Cancel previous request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);

        // The module is imported as a namespace so that test mocks that
        // only provide a subset of the surface area (e.g. just
        // `searchStores`) still work. `searchApi`/`searchService` are
        // normally exported, but the mock factory only provides the
        // function under test.
        const api: any = (searchApiModule as any).searchApi
          || (searchApiModule as any).searchService
          || (searchApiModule as any).default
          || searchApiModule;
        const response = await api.searchStores(
          {
            q: searchQuery,
            ...(locationParam && { location: locationParam }),
          },
          { signal: abortControllerRef.current.signal }
        );

        // Drop stale responses
        if (currentRequestId !== requestIdRef.current || !isMountedRef.current) {
          return;
        }

        const data = (response && (response as any).data) || response || {};
        const nextResults = {
          stores: data.stores || [],
          products: data.products || [],
        };
        setResults(nextResults);
      } catch (err: any) {
        // Ignore abort errors - request was cancelled intentionally
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          return;
        }
        if (currentRequestId !== requestIdRef.current || !isMountedRef.current) {
          return;
        }
        setError(
          err && typeof err.message === 'string'
            ? err.message
            : 'Failed to search stores'
        );
        setResults({ stores: [], products: [] });
      } finally {
        if (currentRequestId === requestIdRef.current && isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [locationParam]
  );

  const search = useCallback(
    (nextQuery: string) => {
      setQuery(nextQuery);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (debounceMs <= 0) {
        performSearch(nextQuery);
        return;
      }

      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null;
        performSearch(nextQuery);
      }, debounceMs);
    },
    [performSearch, debounceMs]
  );

  const clear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    // Cancel any pending request
    abortControllerRef.current?.abort();
    setQuery('');
    setResults(null);
    setError(null);
    setLoading(false);
  }, []);

  // Auto-fetch on mount when an initial query is provided.
  useEffect(() => {
    if (autoFetch && initialQuery) {
      search(initialQuery);
    }
    // We only want to auto-fetch on mount, not when `search` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    query,
    results,
    stores: results?.stores ?? [],
    products: results?.products ?? [],
    loading,
    error,
    search,
    clear,
  };
};

// Hook for getting store categories
export const useStoreCategories = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const api: any = (searchApiModule as any).searchApi
        || (searchApiModule as any).searchService
        || (searchApiModule as any).default
        || searchApiModule;
      const response = await (api.getSearchSuggestions
        ? api.getSearchSuggestions('')
        : api.searchStores({ q: '' }));

      if (response && response.success && (response.data as any)) {
        setCategories((response.data as any).categories || []);
      } else {
        throw new Error(
          (response && response.message) || 'Failed to fetch categories'
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
  };
};

// Hook for getting a single store
export const useStore = (storeId: string | null) => {
  const [store, setStore] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStore = useCallback(async () => {
    if (!storeId) return;

    try {
      setLoading(true);
      setError(null);

      const api: any = (searchApiModule as any).searchApi
        || (searchApiModule as any).searchService
        || (searchApiModule as any).default
        || searchApiModule;
      const response = await api.searchStores({ id: storeId });

      if (response && response.success) {
        setStore((response as any).data);
      } else {
        throw new Error(
          (response && response.message) || 'Failed to fetch store'
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchStore();
  }, [fetchStore]);

  return {
    store,
    loading,
    error,
    refetch: fetchStore,
  };
};

export default useStoreSearch;

