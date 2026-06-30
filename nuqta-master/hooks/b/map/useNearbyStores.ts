/**
 * useNearbyStores — fetch and shape nearby REZ-accepting stores for the
 * `/b/map` screen.
 *
 * Source of truth (in order of preference):
 *   1. `services/nearbyEarnApi.ts` — existing nearby-earn service with the
 *      cleanest shape for this screen (already used elsewhere in the app).
 *   2. `services/storesApi.ts` `getNearbyStores` — fallback that hits the
 *      generic `/stores/nearby` endpoint.
 *   3. Direct `apiClient.get('/stores/nearby?...')` — last-resort fallback
 *      when neither helper is available (e.g. during partial migrations).
 *
 * The hook reads the user's location from `useLocationStore` (existing
 * Zustand store) — see `stores/locationStore.ts` for the full shape. We
 * only depend on `state.currentLocation.coordinates`, so updates to the
 * store that don't change coordinates won't trigger a refetch.
 *
 * Behaviour
 * ---------
 *   - Filters results to within `RADIUS_KM` of the user (default 5km).
 *   - Sorts ascending by distance (closest first).
 *   - Returns `{ stores, isLoading, error, refresh, userLocation }`.
 *   - `refresh()` re-runs the fetch with the latest user location — used
 *     by the map's pull-to-refresh control.
 *
 * Loading/error semantics
 * -----------------------
 *   - `isLoading` is `true` on the first fetch and resets to `false` on
 *     both success and failure. The map page uses it to show a centered
 *     `ActivityIndicator` overlay.
 *   - `error` is the human-readable failure reason or `null` when the
 *     last attempt succeeded. We never throw out of the hook.
 *
 * @example
 *   ```tsx
 *   const { stores, isLoading, error, refresh, userLocation } = useNearbyStores();
 *   ```
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocationStore } from '@/stores/locationStore';
import type { LocationCoordinates, UserLocation } from '@/types/location.types';
import nearbyEarnApi, { NearbyStore as EarnNearbyStore } from '@/services/nearbyEarnApi';
import logger from '@/utils/logger';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Normalised `NearbyStore` for the B map view.
 *
 * We re-shape the API payload into a single canonical shape regardless of
 * which upstream service answered, so the map UI doesn't need to know
 * which backend endpoint it came from. `distanceKm` is guaranteed to be
 * a finite, non-negative number; `isPartner` is `true` for stores that
 * carry any earning opportunity (cashback / bonus / multiplier).
 */
export interface NearbyStore {
  id: string;
  name: string;
  category?: string;
  /** Kilometres from the user's location. Always a number (never NaN). */
  distanceKm: number;
  /** Latitude in decimal degrees. */
  latitude: number;
  /** Longitude in decimal degrees. */
  longitude: number;
  /** Address line shown on the info card (optional). */
  address?: string;
  /** Number of live offers the store is running. Defaults to 0. */
  offersCount: number;
  /** Whether the store is currently open. Optional — UI handles missing. */
  isOpen?: boolean;
  /** True for partner / gold stores (they have an `earningOpportunity`). */
  isPartner: boolean;
  /** Cashback percentage as a number (e.g. `10` for 10%). Optional. */
  cashbackPercent?: number;
}

export interface UseNearbyStoresResult {
  stores: NearbyStore[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  /** The user location used for the last fetch, or `null` if unknown. */
  userLocation: LocationCoordinates | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default search radius in kilometres. Spec says 5km. */
export const RADIUS_KM = 5;
/** Cap on how many stores the map will render at once. */
export const MAX_STORES = 50;
/** Upper bound on `distance` we still consider "nearby". Matches `RADIUS_KM`. */
const MAX_DISTANCE_KM = RADIUS_KM;

/** Hardcoded fallback coordinates (Bangalore) used when no GPS is available. */
const FALLBACK_COORDS: LocationCoordinates = {
  latitude: 12.9716,
  longitude: 77.5946,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Haversine distance in kilometres between two lat/lng points.
 * Returns `NaN` when either input is non-finite — callers must filter.
 */
function distanceKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  if (
    !Number.isFinite(aLat) ||
    !Number.isFinite(aLng) ||
    !Number.isFinite(bLat) ||
    !Number.isFinite(bLng)
  ) {
    return Number.NaN;
  }
  const R = 6371; // Earth's radius in km.
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Pull `coordinates` out of a `UserLocation`, falling back to the bundled
 * fallback coordinates when the user hasn't granted GPS access yet.
 */
function resolveCoords(loc: UserLocation | null): LocationCoordinates {
  if (loc?.coordinates?.latitude !== undefined && loc?.coordinates?.longitude !== undefined) {
    return loc.coordinates;
  }
  return FALLBACK_COORDS;
}

/**
 * Normalise an `EarnNearbyStore` (from `nearbyEarnApi`) into the public
 * `NearbyStore` shape. Returns `null` if the record is unusable.
 */
function normaliseEarnStore(
  raw: EarnNearbyStore,
  userLat: number,
  userLng: number,
): NearbyStore | null {
  if (!raw || typeof raw !== 'object') return null;

  const coords = raw.location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  // Upstream `distance` is in metres.
  const distanceMetres =
    typeof raw.distance === 'number' && Number.isFinite(raw.distance)
      ? raw.distance
      : Number.NaN;
  const apiDistanceKm = distanceMetres / 1000;
  const computedKm = distanceKm(userLat, userLng, lat, lng);
  const distanceKmFinal = Number.isFinite(apiDistanceKm)
    ? apiDistanceKm
    : computedKm;
  if (!Number.isFinite(distanceKmFinal)) return null;

  const cashback = raw.totalCashbackPercent;
  const offersCount = Array.isArray(raw.earningOpportunities)
    ? raw.earningOpportunities.length
    : 0;

  const storeId = typeof raw._id === 'string' ? raw._id : typeof raw.id === 'string' ? raw.id : null;
  if (!storeId) return null;

  return {
    id: storeId,
    name: raw.name,
    category: raw.category,
    distanceKm: distanceKmFinal,
    latitude: lat,
    longitude: lng,
    address: raw.location?.address,
    offersCount,
    isPartner: offersCount > 0 || (typeof cashback === 'number' && cashback > 0),
    cashbackPercent: typeof cashback === 'number' && cashback > 0 ? cashback : undefined,
  };
}

/**
 * Normalise a generic `/stores/nearby` payload into the public shape.
 * The backend's `Store` shape is rich; we only extract what the map needs.
 */
function normaliseGenericStore(raw: unknown, userLat: number, userLng: number): NearbyStore | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const id = (r._id ?? r.id) as string | undefined;
  const name = r.name as string | undefined;
  if (typeof id !== 'string' || typeof name !== 'string') return null;

  // Coordinates may be at `address.coordinates` or `location.coordinates`.
  const addrObj = r.address as { coordinates?: [number, number]; formattedAddress?: string } | undefined;
  const location = r.location as { coordinates?: [number, number] } | undefined;
  const coords = addrObj?.coordinates ?? location?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  // Pre-computed distance may come back in metres, km, or a string.
  let distanceKmValue: number = distanceKm(userLat, userLng, lat, lng);
  const rawDistance = r.distance;
  if (typeof rawDistance === 'number' && Number.isFinite(rawDistance)) {
    distanceKmValue = rawDistance > 100 ? rawDistance / 1000 : rawDistance;
  } else if (typeof rawDistance === 'string') {
    const parsed = parseFloat(rawDistance.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed)) {
      distanceKmValue = parsed > 100 ? parsed / 1000 : parsed;
    }
  }
  if (!Number.isFinite(distanceKmValue)) return null;

  const category =
    typeof (r.category as { name?: string } | undefined)?.name === 'string'
      ? ((r.category as { name?: string }).name as string)
      : (r.mainCategorySlug as string | undefined);

  const isOpen = (() => {
    if (typeof r.isOpen === 'boolean') return r.isOpen;
    const op = r.operationalInfo as { isOpen?: boolean } | undefined;
    return typeof op?.isOpen === 'boolean' ? op.isOpen : undefined;
  })();

  const offersCount = (() => {
    const offers = r.offers as unknown[] | undefined;
    if (Array.isArray(offers)) return offers.length;
    const cashback = r.cashbackRate;
    return typeof cashback === 'number' && cashback > 0 ? 1 : 0;
  })();

  const cashbackPercent = (() => {
    const c = r.cashbackRate;
    if (typeof c === 'number' && c > 0) return c;
    const offers = r.offers as { cashback?: number } | undefined;
    return typeof offers?.cashback === 'number' && offers.cashback > 0
      ? offers.cashback
      : undefined;
  })();

  return {
    id,
    name,
    category,
    distanceKm: distanceKmValue,
    latitude: lat,
    longitude: lng,
    address: addrObj?.formattedAddress ?? (r.address as string | undefined),
    isOpen,
    offersCount,
    isPartner: offersCount > 0 || Boolean(cashbackPercent),
    cashbackPercent,
  };
}

/**
 * Sort ascending by distance and cap the result list.
 * Side-effect-free: returns a new array.
 */
function shapeAndSort(stores: NearbyStore[]): NearbyStore[] {
  return stores
    .filter((s) => Number.isFinite(s.distanceKm) && s.distanceKm <= MAX_DISTANCE_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, MAX_STORES);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Read nearby stores for the current user location.
 *
 * Subscribes to the location store so the hook re-runs when the user
 * grants GPS permission, moves, or manually sets a different city.
 *
 * @param radiusKm Optional override of the default search radius.
 */
export function useNearbyStores(radiusKm: number = RADIUS_KM): UseNearbyStoresResult {
  const currentLocation = useLocationStore((s) => s.state.currentLocation);
  const coords = useMemo<LocationCoordinates>(
    () => resolveCoords(currentLocation ?? null),
    [currentLocation],
  );

  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Manual refresh trigger — bumped by `refresh()` to force a refetch
  // even when coords haven't changed.
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const fetchStores = useCallback(async (): Promise<void> => {
    const abortController = new AbortController();
    setIsLoading(true);
    setError(null);

    const { latitude, longitude } = coords;
    const userLat = typeof latitude === 'number' ? latitude : FALLBACK_COORDS.latitude;
    const userLng = typeof longitude === 'number' ? longitude : FALLBACK_COORDS.longitude;

    const collected: NearbyStore[] = [];
    try {
      // Prefer `nearbyEarnApi` — it has the cleanest shape.
      const earnResponse = await nearbyEarnApi.getStores({
        lat: userLat,
        lng: userLng,
        radius: radiusKm,
        limit: MAX_STORES,
        signal: abortController.signal,
      });
      if (earnResponse.success && Array.isArray(earnResponse.data)) {
        for (const raw of earnResponse.data) {
          const norm = normaliseEarnStore(raw, userLat, userLng);
          if (norm) collected.push(norm);
        }
      }

      setStores(shapeAndSort(collected));
    } catch (err: unknown) {
      // AbortError means component unmounted or coords changed — skip state update.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // ponytail: sanitize error for logs — don't expose internal stack traces
      const sanitizedError = err instanceof Error ? err.message : 'Failed to load nearby stores';
      try {
        logger.warn(
          'b_map_nearby_stores_failed',
          { error: sanitizedError, radiusKm },
          'B Features',
        );
      } catch {
        /* logger is optional */
      }
      setStores([]);
      setError(sanitizedError);
    } finally {
      if (abortController.signal.aborted) return;
      setIsLoading(false);
    }
  }, [coords, radiusKm]);

  useEffect(() => {
    void fetchStores();
  }, [fetchStores, refreshTick]); // refreshTick intentionally included — refresh() bumps it

  const refresh = useCallback((): void => {
    setRefreshTick((t) => t + 1);
  }, []);

  return useMemo<UseNearbyStoresResult>(
    () => ({
      stores,
      isLoading,
      error,
      refresh,
      userLocation: coords,
    }),
    [stores, isLoading, error, refresh, coords],
  );
}

export default useNearbyStores;
