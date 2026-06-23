/**
 * Nearby Stores routes — REZ-vs-NUQTA migration (Phase 1.5)
 *
 * Sub-router mounted under `/api/b/nearby`. Provides a lightweight endpoint
 * that returns REZ-accepting stores near the requested coordinates.
 *
 * Today this returns a small, hardcoded fixture of Bangalore landmarks so
 * the B-side frontend has something to render against a freshly-stood-up
 * backend. The contract — request shape and response envelope — is the
 * stable surface. The fixture will be replaced by a real geo lookup once
 * the stores collection is migrated over to project A.
 *
 * Mounted in `src/routes/b/index.ts` as `router.use('/nearby', nearbyBRoutes)`.
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess, bError } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Canonical "nearby store" shape returned by this router.
 *
 * Stable surface — do not rename fields without bumping the migration plan.
 * Latitude / longitude are decimal degrees (WGS-84). `distanceM` is the
 * straight-line distance from the request's `lat`/`lng` to the store, in
 * metres.
 */
export interface NearbyStore {
  id: string;
  name: string;
  category: string;
  isPartner: boolean;
  cashbackPercent: number;
  offersCount: number;
  isOpen: boolean;
  address: string;
  latitude: number;
  longitude: number;
  /** Distance in metres, computed at request time. */
  distanceM: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_RADIUS_M = 5000; // 5km.
const MAX_RADIUS_M = 50000; // 50km cap — prevents abuse.

/**
 * Hardcoded Indian stores near Bangalore. Replaces a real geo lookup while
 * the stores collection is being migrated from project B.
 */
const FIXTURE_STORES: ReadonlyArray<Omit<NearbyStore, 'distanceM'>> = [
  {
    id: 'fixture-bigbazaar-koramangala',
    name: 'BigBazaar Koramangala',
    category: 'Grocery',
    isPartner: true,
    cashbackPercent: 10,
    offersCount: 3,
    isOpen: true,
    address: '80 Feet Road, Koramangala 4th Block, Bangalore',
    latitude: 12.9352,
    longitude: 77.6245,
  },
  {
    id: 'fixture-ccd-indiranagar',
    name: 'Cafe Coffee Day Indiranagar',
    category: 'Cafe',
    isPartner: true,
    cashbackPercent: 5,
    offersCount: 2,
    isOpen: true,
    address: '100 Feet Road, Indiranagar, Bangalore',
    latitude: 12.9719,
    longitude: 77.6412,
  },
  {
    id: 'fixture-reliance-mart-jayanagar',
    name: 'Reliance Mart Jayanagar',
    category: 'Grocery',
    isPartner: true,
    cashbackPercent: 8,
    offersCount: 1,
    isOpen: false,
    address: '4th Block, Jayanagar, Bangalore',
    latitude: 12.9279,
    longitude: 77.5938,
  },
  {
    id: 'fixture-nykaa-mg-road',
    name: 'Nykaa MG Road',
    category: 'Beauty',
    isPartner: false,
    cashbackPercent: 0,
    offersCount: 0,
    isOpen: true,
    address: 'MG Road, Bangalore',
    latitude: 12.9758,
    longitude: 77.6053,
  },
  {
    id: 'fixture-spencer-hsr',
    name: 'Spencer’s HSR Layout',
    category: 'Grocery',
    isPartner: true,
    cashbackPercent: 6,
    offersCount: 2,
    isOpen: true,
    address: '27th Main, HSR Layout, Bangalore',
    latitude: 12.9116,
    longitude: 77.6473,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function haversineMetres(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6371000; // Earth's radius in metres.
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

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// Authenticated like the rest of the B namespace.
router.use(authenticate);

/**
 * GET /api/b/nearby/stores?lat=&lng=&radius=
 *
 * - `lat` / `lng` are required (decimal degrees).
 * - `radius` is optional, defaults to 5000m, capped at 50000m.
 * - Response: `{ success: true, data: { stores: NearbyStore[] } }`.
 */
router.get('/stores', (req, res) => {
  const latRaw = toFiniteNumber(req.query.lat);
  const lngRaw = toFiniteNumber(req.query.lng);
  const radiusRaw = toFiniteNumber(req.query.radius);

  if (latRaw === null || lngRaw === null) {
    return bError(res, 'lat and lng query parameters are required', 400);
  }
  if (latRaw < -90 || latRaw > 90 || lngRaw < -180 || lngRaw > 180) {
    return bError(res, 'lat/lng out of range', 400);
  }

  const radius = (() => {
    if (radiusRaw === null) return DEFAULT_RADIUS_M;
    if (radiusRaw <= 0) return DEFAULT_RADIUS_M;
    return Math.min(radiusRaw, MAX_RADIUS_M);
  })();

  try {
    logger.info('b_nearby_stores_query', { lat: latRaw, lng: lngRaw, radius });
  } catch {
    /* logger must never block the response */
  }

  const stores: NearbyStore[] = [];
  for (const fixture of FIXTURE_STORES) {
    const distanceM = haversineMetres(
      latRaw,
      lngRaw,
      fixture.latitude,
      fixture.longitude,
    );
    if (distanceM > radius) continue;
    stores.push({ ...fixture, distanceM });
  }

  // Closest first.
  stores.sort((a, b) => a.distanceM - b.distanceM);

  return bSuccess(res, { stores });
});

export default router;
