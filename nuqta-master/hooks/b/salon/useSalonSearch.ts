/**
 * useSalonSearch — search nearby salons and fetch a salon's services.
 *
 * Phase 4.6 of the REZ-vs-NUQTA migration. Wraps two B-side endpoints:
 *
 *   - `GET /api/b/salon?area=&service=` — paginated list of salons,
 *     optionally filtered by area and/or service category.
 *   - `GET /api/b/salon/:id/services` — services offered by a single
 *     salon.
 *
 * Both are mocked in the migration phase; the request/response contract
 * is the stable surface.
 *
 * Contract
 * --------
 *  - On mount, fires the search fetch with empty filters (lists all).
 *  - While the initial fetch is in flight, `isLoading` is `true`.
 *  - On failure, `error` is populated and `salons` is kept as an empty
 *    array so the UI can render a banner + retry.
 *  - `search(filters)` re-runs the search — wired to debounced search
 *    input and area filter changes.
 *  - `getServices(salonId)` fires a single fetch for one salon's
 *    services; it does NOT update the `salons` state. Returns the list
 *    directly so the caller can render a bottom sheet / modal.
 *  - `refresh()` re-runs the current search — wired to pull-to-refresh.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { salons, isLoading, error, search, getServices, refresh } =
 *    useSalonSearch();
 *  ```
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import {
  type Salon,
  type SalonService,
  type SalonServiceCategory,
  normalizeSalons,
  normalizeSalonServices,
} from '@/types/salon.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Endpoint for the salon search. */
const SEARCH_ENDPOINT = '/api/b/salon';

/** Helper to build the per-salon services endpoint. */
function servicesEndpoint(salonId: string): string {
  return `/api/b/salon/${encodeURIComponent(salonId)}/services`;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Search filters supported by the salon search endpoint. */
export interface SalonSearchFilters {
  /** Free-text area / locality filter, e.g. "Koramangala". */
  area?: string;
  /** Service category filter, e.g. "haircut". */
  service?: SalonServiceCategory;
}

export interface UseSalonSearchResult {
  /** Current salon list (after the most recent search). */
  salons: Salon[];
  /** `true` while the initial search is in flight. */
  isLoading: boolean;
  /** `true` while a manual search/refresh is in flight. */
  isRefreshing: boolean;
  /** Last error message, or `null`. */
  error: string | null;
  /** Most-recently-applied filters (echoed for UI). */
  filters: SalonSearchFilters;
  /**
   * Re-run the search with the supplied filters. Returns the resulting
   * list (also reflected in `salons`).
   */
  search: (filters: SalonSearchFilters) => Promise<Salon[]>;
  /**
   * Fetch the services for a single salon. Does NOT update `salons`.
   * Returns the normalised list.
   */
  getServices: (salonId: string) => Promise<SalonService[]>;
  /** Re-run the current search. Wired to pull-to-refresh. */
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function errorToString(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

interface SearchResponse {
  salons: Salon[];
}

interface ServicesResponse {
  services: SalonService[];
}

async function fetchSearch(filters: SalonSearchFilters): Promise<Salon[]> {
  const params: Record<string, string> = {};
  if (typeof filters.area === 'string' && filters.area.length > 0) {
    params['area'] = filters.area;
  }
  if (typeof filters.service === 'string' && filters.service.length > 0) {
    params['service'] = filters.service;
  }
  const response = await apiClient.get<SearchResponse>(
    SEARCH_ENDPOINT,
    Object.keys(params).length > 0 ? params : undefined,
    { timeout: 8000 },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to load salons',
    );
    throw new Error(message);
  }
  return normalizeSalons(response.data.salons);
}

async function fetchServices(salonId: string): Promise<SalonService[]> {
  const response = await apiClient.get<ServicesResponse>(
    servicesEndpoint(salonId),
    undefined,
    { timeout: 8000 },
  );
  if (!response.success || response.data === undefined) {
    const message = errorToString(
      response.error ?? response.message ?? 'Failed to load services',
    );
    throw new Error(message);
  }
  return normalizeSalonServices(response.data.services);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * `useSalonSearch` — read the salon discovery feed and per-salon services.
 *
 * The hook is *not* backed by a Zustand store; it lives in component
 * state so each page has an independent copy. Filter state is mirrored
 * back to the UI through the `filters` field.
 */
export function useSalonSearch(): UseSalonSearchResult {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SalonSearchFilters>({});

  // Tracks whether the initial search has resolved (success or fail)
  // so the UI can tell apart "still loading" from "loaded but empty".
  const hasLoadedRef = useRef<boolean>(false);

  // Latest filters ref — `refresh()` always re-runs the most recent
  // search even though the state value may have been replaced.
  const filtersRef = useRef<SalonSearchFilters>(filters);
  filtersRef.current = filters;

  /**
   * Public: re-run the search with the supplied filters. Updates
   * `salons`, `filters`, and `error` in place. Throws on failure so the
   * caller can react (the error is also captured into state).
   */
  const search = useCallback(
    async (next: SalonSearchFilters): Promise<Salon[]> => {
      if (hasLoadedRef.current) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const list = await fetchSearch(next);
        setSalons(list);
        setFilters(next);
        return list;
      } catch (err) {
        const message = errorToString(err);
        logger.warn(
          'salon_search_failed',
          { filters: next, error: message },
          'B Features',
        );
        setError(message);
        setSalons([]);
        setFilters(next);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        hasLoadedRef.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  /**
   * Public: fetch services for one salon. Does NOT update `salons`.
   * Throws on failure so the caller can surface a toast.
   */
  const getServices = useCallback(
    async (salonId: string): Promise<SalonService[]> => {
      try {
        const list = await fetchServices(salonId);
        return list;
      } catch (err) {
        const message = errorToString(err);
        logger.warn(
          'salon_services_fetch_failed',
          { salonId, error: message },
          'B Features',
        );
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [],
  );

  /**
   * Public: re-run the most recent search. Wired to pull-to-refresh.
   */
  const refresh = useCallback(async (): Promise<void> => {
    await search(filtersRef.current);
  }, [search]);

  // Initial mount: kick off a search with empty filters. Cancellation-safe.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const list = await fetchSearch({});
        if (cancelled) return;
        setSalons(list);
      } catch (err) {
        if (cancelled) return;
        const message = errorToString(err);
        logger.warn(
          'salon_initial_search_failed',
          { error: message },
          'B Features',
        );
        setError(message);
      } finally {
        if (!cancelled) {
          hasLoadedRef.current = true;
          setIsLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    salons,
    isLoading,
    isRefreshing,
    error,
    filters,
    search,
    getServices,
    refresh,
  };
}

export default useSalonSearch;
