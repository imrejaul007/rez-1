/**
 * useNearUStores — fetch and shape the hyperlocal Near-U stores for a
 * given vertical on the `/b/near-u` screens.
 *
 * Source
 * ------
 *   Calls the B-namespace endpoint `/api/b/nearu/:vertical?lat=&lng=`,
 *   where `:vertical` is one of `food | express | budget | student-offers | all`.
 *   The endpoint returns a canonical envelope:
 *
 *     { success: true, data: { stores: NearUStore[], vertical: string } }
 *
 *   Today this returns a hardcoded Bangalore fixture; once the stores
 *   collection is migrated over to project A the response shape will
 *   stay the same.
 *
 * Location
 * --------
 *   Reads the user's location from `useLocationStore` (existing Zustand
 *   store). When no GPS fix is available we fall back to a bundled
 *   Bangalore coordinate so the screen always has *something* to render.
 *
 * Behaviour
 * ---------
 *   - Filters results to within `DEFAULT_RADIUS_KM` of the user.
 *   - The server already sorts per-vertical — we keep that order, but
 *     filter out anything outside the radius client-side as a safety net.
 *   - Returns `{ stores, isLoading, error, refresh }`. `refresh()` re-runs
 *     the fetch and is wired to pull-to-refresh on the screens.
 *
 * Loading/error semantics
 * -----------------------
 *   - `isLoading` is `true` on the first fetch and resets to `false` on
 *     both success and failure. The screens use it to show a skeleton.
 *   - `error` is the human-readable failure reason or `null` when the
 *     last attempt succeeded. The hook never throws out.
 *
 * @example
 *   ```tsx
 *   const { stores, isLoading, error, refresh } = useNearUStores('food');
 *   ```
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '@/services/apiClient';
import { useLocationStore } from '@/stores/locationStore';
import type { LocationCoordinates, UserLocation } from '@/types/location.types';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * The set of verticals the B-side Near-U feature understands.
 *
 * This is a duplicate of the backend `NearUVertical` union — we keep it
 * here so the frontend never has to import from the backend. If a new
 * vertical is added on the server, add it here too.
 */
export type NearUVertical =
  | 'food'
  | 'express'
  | 'budget'
  | 'student-offers'
  | 'all';

/**
 * Canonical "near-u store" shape returned by the backend and used by the
 * B-side Near-U screens.
 */
export interface NearUStore {
  id: string;
  name: string;
  category: string;
  distanceKm: number;
  etaMinutes: number;
  logoUrl?: string;
  currentOffersCount: number;
  isStudentDiscount: boolean;
  isOpen: boolean;
  rating: number;
}

export interface UseNearUStoresResult {
  stores: NearUStore[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default search radius in kilometres. Matches the map view. */
export const DEFAULT_RADIUS_KM = 5;

/** Hardcoded fallback coordinates (Bangalore) used when no GPS is available. */
const FALLBACK_COORDS: LocationCoordinates = {
  latitude: 12.9716,
  longitude: 77.5946,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Narrow a `NearUVertical` union to its printable label — used in logs
 * and analytics events so we don't accidentally leak the raw union type
 * into a non-TypeScript consumer.
 */
function verticalLabel(vertical: NearUVertical): string {
  return vertical;
}

/**
 * Validate that an unknown value is at least shaped like a `NearUStore`.
 *
 * Accepts partial payloads (extra fields are ignored) and defaults to
 * safe fallbacks for missing primitives so the screen can always render
 * something rather than crashing on a half-loaded record.
 */
function isNearUStore(value: unknown): value is NearUStore {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.category === 'string' &&
    typeof v.distanceKm === 'number' &&
    typeof v.etaMinutes === 'number' &&
    typeof v.currentOffersCount === 'number' &&
    typeof v.isStudentDiscount === 'boolean' &&
    typeof v.isOpen === 'boolean' &&
    typeof v.rating === 'number'
  );
}

/**
 * Pull coordinates out of the location store, falling back to a
 * hardcoded Bangalore centroid when the user hasn't granted GPS yet.
 */
function resolveCoords(loc: UserLocation | null): LocationCoordinates {
  if (loc?.coordinates) {
    const lat = loc.coordinates.latitude;
    const lng = loc.coordinates.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }
  return FALLBACK_COORDS;
}

/**
 * Filter out stores that are clearly outside our radius.
 *
 * The server already filters, but a slow-drifting user location can
 * surface stale fixtures; this is a cheap safety net.
 */
function applyRadius(
  stores: NearUStore[],
  radiusKm: number,
): NearUStore[] {
  return stores.filter(
    (s) => Number.isFinite(s.distanceKm) && s.distanceKm <= radiusKm,
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Read near-u stores for the current user location + given vertical.
 *
 * Subscribes to the location store so the hook re-runs when the user
 * grants GPS permission, moves, or manually sets a different city.
 *
 * @param vertical One of `food | express | budget | student-offers | all`.
 * @param radiusKm Optional override of the default search radius.
 */
export function useNearUStores(
  vertical: NearUVertical,
  radiusKm: number = DEFAULT_RADIUS_KM,
): UseNearUStoresResult {
  const currentLocation = useLocationStore((s) => s.state.currentLocation);

  const coords = useMemo<LocationCoordinates>(
    () => resolveCoords(currentLocation ?? null),
    [currentLocation],
  );

  const [stores, setStores] = useState<NearUStore[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Manual refresh trigger — bumped by `refresh()` to force a refetch
  // even when coords haven't changed.
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const fetchStores = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    const { latitude, longitude } = coords;
    const userLat =
      typeof latitude === 'number' && Number.isFinite(latitude)
        ? latitude
        : FALLBACK_COORDS.latitude;
    const userLng =
      typeof longitude === 'number' && Number.isFinite(longitude)
        ? longitude
        : FALLBACK_COORDS.longitude;

    try {
      const endpoint = `/api/b/nearu/${verticalLabel(vertical)}`;
      const response = await apiClient.get<{
        stores: NearUStore[];
        vertical: NearUVertical;
      }>(endpoint, { lat: userLat, lng: userLng }, { timeout: 8000 });

      if (!response.success || response.data === undefined) {
        const message =
          typeof response.error === 'string' && response.error.length > 0
            ? response.error
            : `Failed to load ${verticalLabel(vertical)} stores`;
        throw new Error(message);
      }

      const rawStores = Array.isArray(response.data.stores)
        ? response.data.stores
        : [];
      const valid = rawStores.filter(isNearUStore);
      setStores(applyRadius(valid, radiusKm));
    } catch (err: unknown) {
      const wrapped = err instanceof Error ? err : new Error(String(err));
      try {
        logger.warn(
          'b_nearu_stores_failed',
          {
            vertical: verticalLabel(vertical),
            error: wrapped.message,
            radiusKm,
          },
          'B Features',
        );
      } catch {
        /* logger is optional */
      }
      setStores([]);
      setError(wrapped.message);
    } finally {
      setIsLoading(false);
    }
  }, [coords, radiusKm, vertical]);

  useEffect(() => {
    void fetchStores();
  }, [fetchStores, refreshTick]);

  const refresh = useCallback(async (): Promise<void> => {
    setRefreshTick((t) => t + 1);
  }, []);

  return useMemo<UseNearUStoresResult>(
    () => ({
      stores,
      isLoading,
      error,
      refresh,
    }),
    [stores, isLoading, error, refresh],
  );
}

export default useNearUStores;
