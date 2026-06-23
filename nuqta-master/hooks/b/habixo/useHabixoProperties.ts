/**
 * useHabixoProperties — fetches the Habixo property catalogue.
 *
 * Phase 4.5 of the REZ-vs-NUQTA migration. Wraps
 * `GET /api/b/habixo/properties?city=&type=` and exposes a
 * component-friendly shape with explicit loading / error states.
 *
 * Lifecycle
 * ---------
 *  - On mount, fires a single HTTP fetch with no filters.
 *  - `search(filters)` re-issues the fetch with a new query string. It
 *    is also wired up to the filter bar's `onChange` callback so every
 *    chip / slider change triggers a fresh search.
 *  - `refresh()` re-runs the most recent query — used by pull-to-refresh.
 *  - While in flight, `isLoading` is `true` and `error` is `null`.
 *  - On failure, the `Error` is captured into `error` and the previous
 *    list (if any) is kept. A `habixo_properties_fetch_failed` warn is
 *    logged.
 *  - The hook never throws out of `search` / `refresh`; all errors are
 *    caught and surfaced through state.
 *
 * Defensive notes
 * ---------------
 *   - The backend payload is validated defensively; malformed fields
 *     are coerced into safe defaults so a server bug never crashes the
 *     UI.
 *   - `type` is verified against the closed `HabixoPropertyType` union;
 *     unknown values fall back to `'apartment'`.
 *   - `amenities` and `imageUrls` are always arrays; missing entries
 *     default to `[]`.
 *
 * Usage
 * -----
 *  ```tsx
 *  const { properties, isLoading, error, search, refresh } = useHabixoProperties();
 *  useEffect(() => { search({ city: '', type: null, minRentPaise: null, maxRentPaise: null }); }, []);
 *  ```
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import apiClient from '@/services/apiClient';
import logger from '@/utils/logger';
import {
  HABIXO_PROPERTY_TYPES,
  type HabixoProperty,
  type HabixoPropertyFilters,
  type HabixoPropertyType,
} from '@/types/habixo.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROPERTIES_ENDPOINT = '/api/b/habixo/properties';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface UseHabixoPropertiesResult {
  properties: HabixoProperty[];
  isLoading: boolean;
  error: Error | null;
  /**
   * Re-fetch with the supplied filters. Wired up to the filter bar
   * `onChange` callback. Returns a promise that resolves once the
   * search completes (or rejects silently via `error`).
   */
  search: (filters: HabixoPropertyFilters) => Promise<void>;
  /**
   * Re-run the most recent query. Used by pull-to-refresh.
   * Returns a promise that never throws.
   */
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Defensive normalisers
// ---------------------------------------------------------------------------

function safeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function safeNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.floor(value);
}

function safeNonNegativeIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value < 0 ? 0 : Math.floor(value);
}

/**
 * Coerce to an optional non-negative integer. `null` becomes
 * `undefined` so the result can be assigned to a property marked
 * `?:` in the `HabixoProperty` interface.
 */
function safeNonNegativeIntOptional(value: unknown): number | undefined {
  const resolved = safeNonNegativeIntOrNull(value);
  return resolved === null ? undefined : resolved;
}

function safeBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === 'string' && item.length > 0) {
      out.push(item);
    }
  }
  return out;
}

function safePropertyType(value: unknown): HabixoPropertyType {
  if (typeof value === 'string') {
    for (const candidate of HABIXO_PROPERTY_TYPES) {
      if (candidate === value) return candidate;
    }
  }
  return 'apartment';
}

function isProperty(value: unknown): value is HabixoProperty {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.type === 'string' &&
    typeof v.city === 'string' &&
    typeof v.area === 'string' &&
    typeof v.rentPaise === 'number' &&
    typeof v.ownerName === 'string' &&
    Array.isArray(v.amenities) &&
    Array.isArray(v.imageUrls) &&
    typeof v.available === 'boolean'
  );
}

function normalizeProperty(raw: unknown): HabixoProperty {
  const v = (typeof raw === 'object' && raw !== null
    ? raw
    : {}) as Record<string, unknown>;
  return {
    id: safeString(v.id, ''),
    title: safeString(v.title, 'Untitled property'),
    type: safePropertyType(v.type),
    city: safeString(v.city, 'Unknown'),
    area: safeString(v.area, ''),
    rentPaise: safeNonNegativeInt(v.rentPaise, 0),
    depositPaise: safeNonNegativeIntOptional(v.depositPaise),
    bedrooms: safeNonNegativeIntOptional(v.bedrooms),
    bathrooms: safeNonNegativeIntOptional(v.bathrooms),
    areaSqft: safeNonNegativeIntOptional(v.areaSqft),
    amenities: safeStringArray(v.amenities),
    imageUrls: safeStringArray(v.imageUrls),
    ownerName: safeString(v.ownerName, 'Owner'),
    available: safeBool(v.available, true),
  };
}

function normalizeProperties(raw: unknown): HabixoProperty[] {
  if (!Array.isArray(raw)) return [];
  const out: HabixoProperty[] = [];
  for (const item of raw) {
    if (isProperty(item)) {
      out.push(normalizeProperty(item));
    } else {
      // Be lenient: try to normalise even partially-typed objects so
      // a backend hiccup doesn't blank the entire list.
      const normalised = normalizeProperty(item);
      if (normalised.id.length > 0) {
        out.push(normalised);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/**
 * Build the query params for a search. Empty / null values are omitted
 * so the backend can fall back to its "all" defaults.
 */
function buildQuery(filters: HabixoPropertyFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.city.trim().length > 0) {
    params['city'] = filters.city.trim();
  }
  if (filters.type !== null) {
    params['type'] = filters.type;
  }
  if (filters.minRentPaise !== null) {
    params['minRent'] = String(filters.minRentPaise);
  }
  if (filters.maxRentPaise !== null) {
    params['maxRent'] = String(filters.maxRentPaise);
  }
  return params;
}

async function fetchProperties(
  filters: HabixoPropertyFilters,
): Promise<HabixoProperty[]> {
  const params = buildQuery(filters);
  const response = await apiClient.get<HabixoProperty[]>(
    PROPERTIES_ENDPOINT,
    Object.keys(params).length > 0 ? params : undefined,
    { timeout: 8000, deduplicate: false },
  );
  if (!response.success || response.data === undefined) {
    const message =
      typeof response.error === 'string'
        ? response.error
        : 'Failed to load properties';
    throw new Error(message);
  }
  return normalizeProperties(response.data);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Default filter set used on initial mount. */
const DEFAULT_FILTERS: HabixoPropertyFilters = {
  city: '',
  type: null,
  minRentPaise: null,
  maxRentPaise: null,
};

/**
 * Returns the current properties list + a `search` action and a
 * `refresh` action. The most recent filters are remembered in a ref so
 * `refresh()` can re-run them.
 */
export function useHabixoProperties(): UseHabixoPropertiesResult {
  const [properties, setProperties] = useState<HabixoProperty[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Track whether we've ever populated so the UI can tell apart
  // "still loading" from "loaded but empty".
  const hasLoadedRef = useRef<boolean>(false);

  // Remember the most recent filters so `refresh` can re-run them.
  const latestFiltersRef = useRef<HabixoPropertyFilters>(DEFAULT_FILTERS);

  /**
   * Internal fetch routine. Shared by the initial-load effect, `search`
   * and `refresh` so we don't need to duplicate the bookkeeping.
   */
  const runFetch = useCallback(
    async (filters: HabixoPropertyFilters): Promise<void> => {
      setIsLoading(true);
      setError(null);
      latestFiltersRef.current = filters;
      try {
        const next = await fetchProperties(filters);
        setProperties(next);
        hasLoadedRef.current = true;
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'habixo_properties_fetch_failed',
          { error: wrapped.message },
          'B Features',
        );
        setError(wrapped);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Initial fetch — runs once on mount. Cancellation-safe.
  useEffect(() => {
    let cancelled = false;
    const run = async (): Promise<void> => {
      if (cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const next = await fetchProperties(DEFAULT_FILTERS);
        if (cancelled) return;
        setProperties(next);
        hasLoadedRef.current = true;
        latestFiltersRef.current = DEFAULT_FILTERS;
      } catch (err) {
        if (cancelled) return;
        const wrapped = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          'habixo_properties_initial_fetch_failed',
          { error: wrapped.message },
          'B Features',
        );
        setError(wrapped);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * `search` — re-fetch with the supplied filters. Wired to the filter
   * bar `onChange` callback. Never throws; errors surface via `error`.
   */
  const search = useCallback(
    async (filters: HabixoPropertyFilters): Promise<void> => {
      await runFetch(filters);
    },
    [runFetch],
  );

  /**
   * `refresh` — re-runs the most recent query. Used by pull-to-refresh.
   * Never throws; errors surface via `error`.
   */
  const refresh = useCallback(async (): Promise<void> => {
    await runFetch(latestFiltersRef.current);
  }, [runFetch]);

  // Reference `hasLoadedRef` so future additions (e.g. a refetch
  // condition) don't trigger an unused-var warning under strict TS.
  void hasLoadedRef;

  return { properties, isLoading, error, search, refresh };
}

export default useHabixoProperties;
