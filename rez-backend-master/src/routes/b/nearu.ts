/**
 * Near-U Discovery routes — REZ-vs-NUQTA migration (Phase 2.3)
 *
 * Sub-router mounted under `/api/b/nearu`. Provides hyperlocal discovery
 * for the B-side Near-U feature — restaurants / express delivery / budget
 * shops / student offers, plus a mixed "All" feed.
 *
 * Each vertical is a slightly different sort + filter combination over the
 * same set of fixture stores; today the data is hardcoded Bangalore-area
 * fixtures so the B-side frontend has something to render while the stores
 * collection is being migrated from project B.
 *
 * Mounted in `src/routes/b/index.ts` as `router.use('/nearu', nearuBRoutes)`.
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { bSuccess, bError } from '../../utils/bResponse';
import { logger } from '../../config/logger';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Canonical "near-u store" shape returned by every vertical handler.
 *
 * Stable surface — do not rename fields without bumping the migration plan.
 */
export interface NearUStore {
  id: string;
  name: string;
  category: string;
  /** Straight-line distance from the request's `lat`/`lng`, in kilometres. */
  distanceKm: number;
  /** Estimated time of arrival in minutes. */
  etaMinutes: number;
  /** Optional remote logo URL. The frontend falls back to a letter badge. */
  logoUrl?: string;
  currentOffersCount: number;
  isStudentDiscount: boolean;
  isOpen: boolean;
  /** 0-5 rating, always a finite number (default 0 when unknown). */
  rating: number;
}

/**
 * The set of verticals supported by the Near-U feature. The same union
 * drives route registration, request validation, and fixture selection.
 */
export type NearUVertical = 'food' | 'express' | 'budget' | 'student-offers' | 'all';

const VERTICALS: ReadonlyArray<NearUVertical> = [
  'food',
  'express',
  'budget',
  'student-offers',
  'all',
];

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

/**
 * Internal fixture entry. Includes the lat/lng so we can compute a
 * realistic `distanceKm` against the request, but those fields are not
 * exposed on the wire — the frontend only sees the canonical `NearUStore`.
 */
interface NearUFixture {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  etaMinutes: number;
  logoUrl?: string;
  currentOffersCount: number;
  isStudentDiscount: boolean;
  isOpen: boolean;
  rating: number;
  verticals: ReadonlyArray<Exclude<NearUVertical, 'all'>>;
}

/**
 * Hardcoded Bangalore-area stores for the Near-U verticals. Each store
 * belongs to one or more verticals via the `verticals` array; the `all`
 * vertical is computed by union.
 */
const FIXTURE_STORES: ReadonlyArray<NearUFixture> = [
  // ── Food / restaurants ────────────────────────────────────────────────
  {
    id: 'nearu-toit-Indiranagar',
    name: 'Toit Brewpub',
    category: 'Restaurant',
    latitude: 12.9784,
    longitude: 77.6408,
    etaMinutes: 28,
    currentOffersCount: 4,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.6,
    verticals: ['food'],
  },
  {
    id: 'nearu-bbcl-Indiranagar',
    name: 'Burger Barn Cafe Lounge',
    category: 'Cafe',
    latitude: 12.9716,
    longitude: 77.6412,
    etaMinutes: 22,
    currentOffersCount: 3,
    isStudentDiscount: true,
    isOpen: true,
    rating: 4.3,
    verticals: ['food'],
  },
  {
    id: 'nearu-brigade-jayanagar',
    name: 'Brigade Restaurant',
    category: 'South Indian',
    latitude: 12.9279,
    longitude: 77.5938,
    etaMinutes: 35,
    currentOffersCount: 2,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.5,
    verticals: ['food'],
  },
  {
    id: 'nearu-meghana-hsr',
    name: 'Meghana Foods',
    category: 'Biryani',
    latitude: 12.9116,
    longitude: 77.6473,
    etaMinutes: 31,
    currentOffersCount: 5,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.4,
    verticals: ['food'],
  },
  {
    id: 'nearu-shanti-sagar-mgroad',
    name: 'Shanti Sagar',
    category: 'South Indian',
    latitude: 12.9758,
    longitude: 77.6053,
    etaMinutes: 19,
    currentOffersCount: 1,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.1,
    verticals: ['food'],
  },
  {
    id: 'nearu-pizza-hut-koramangala',
    name: 'Pizza Hut Koramangala',
    category: 'Pizza',
    latitude: 12.9352,
    longitude: 77.6245,
    etaMinutes: 26,
    currentOffersCount: 6,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.0,
    verticals: ['food', 'express'],
  },
  // ── Express delivery (fast ETA) ───────────────────────────────────────
  {
    id: 'nearu-swiggy-stores-hsr',
    name: 'Swiggy Daily HSR',
    category: 'Grocery',
    latitude: 12.9116,
    longitude: 77.6473,
    etaMinutes: 12,
    currentOffersCount: 4,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.2,
    verticals: ['express'],
  },
  {
    id: 'nearu-bluedart-mgroad',
    name: 'BlueDart Express Mart',
    category: 'Convenience',
    latitude: 12.9758,
    longitude: 77.6053,
    etaMinutes: 15,
    currentOffersCount: 2,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.0,
    verticals: ['express'],
  },
  {
    id: 'nearu-zepto-koramangala',
    name: 'Zepo Quickstop',
    category: 'Convenience',
    latitude: 12.9352,
    longitude: 77.6245,
    etaMinutes: 10,
    currentOffersCount: 3,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.4,
    verticals: ['express'],
  },
  {
    id: 'nearu-dunzo-jayanagar',
    name: 'Dunzo Drop Jayanagar',
    category: 'Convenience',
    latitude: 12.9279,
    longitude: 77.5938,
    etaMinutes: 14,
    currentOffersCount: 1,
    isStudentDiscount: false,
    isOpen: true,
    rating: 3.9,
    verticals: ['express'],
  },
  {
    id: 'nearu-ccd-Indiranagar',
    name: 'Cafe Coffee Day Indiranagar',
    category: 'Cafe',
    latitude: 12.9719,
    longitude: 77.6412,
    etaMinutes: 18,
    currentOffersCount: 2,
    isStudentDiscount: true,
    isOpen: true,
    rating: 4.0,
    verticals: ['express', 'food'],
  },
  // ── Budget stores (lower price point) ─────────────────────────────────
  {
    id: 'nearu-reliance-mart-jayanagar',
    name: 'Reliance Mart Jayanagar',
    category: 'Grocery',
    latitude: 12.9279,
    longitude: 77.5938,
    etaMinutes: 40,
    currentOffersCount: 7,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.0,
    verticals: ['budget'],
  },
  {
    id: 'nearu-bigbazaar-koramangala',
    name: 'BigBazaar Koramangala',
    category: 'Grocery',
    latitude: 12.9352,
    longitude: 77.6245,
    etaMinutes: 33,
    currentOffersCount: 6,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.1,
    verticals: ['budget'],
  },
  {
    id: 'nearu-spencer-hsr',
    name: 'Spencer’s HSR Layout',
    category: 'Grocery',
    latitude: 12.9116,
    longitude: 77.6473,
    etaMinutes: 38,
    currentOffersCount: 5,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.2,
    verticals: ['budget'],
  },
  {
    id: 'nearu-dmart-mgroad',
    name: 'DMart MG Road',
    category: 'Grocery',
    latitude: 12.9758,
    longitude: 77.6053,
    etaMinutes: 29,
    currentOffersCount: 8,
    isStudentDiscount: false,
    isOpen: true,
    rating: 4.3,
    verticals: ['budget'],
  },
  {
    id: 'nearu-easyday-Indiranagar',
    name: 'EasyDay Indiranagar',
    category: 'Grocery',
    latitude: 12.9719,
    longitude: 77.6412,
    etaMinutes: 36,
    currentOffersCount: 4,
    isStudentDiscount: true,
    isOpen: true,
    rating: 3.9,
    verticals: ['budget'],
  },
  {
    id: 'nearu-mega-mart-koramangala',
    name: 'MegaMart Koramangala',
    category: 'Grocery',
    latitude: 12.9352,
    longitude: 77.6245,
    etaMinutes: 42,
    currentOffersCount: 3,
    isStudentDiscount: false,
    isOpen: false,
    rating: 3.8,
    verticals: ['budget'],
  },
  // ── Student offers ────────────────────────────────────────────────────
  {
    id: 'nearu-bookhub-jayanagar',
    name: 'BookHub Jayanagar',
    category: 'Books',
    latitude: 12.9279,
    longitude: 77.5938,
    etaMinutes: 21,
    currentOffersCount: 5,
    isStudentDiscount: true,
    isOpen: true,
    rating: 4.5,
    verticals: ['student-offers'],
  },
  {
    id: 'nearu-cultfit-mgroad',
    name: 'CultFit MG Road',
    category: 'Fitness',
    latitude: 12.9758,
    longitude: 77.6053,
    etaMinutes: 24,
    currentOffersCount: 3,
    isStudentDiscount: true,
    isOpen: true,
    rating: 4.4,
    verticals: ['student-offers'],
  },
  {
    id: 'nearu-printstop-hsr',
    name: 'PrintStop HSR',
    category: 'Stationery',
    latitude: 12.9116,
    longitude: 77.6473,
    etaMinutes: 17,
    currentOffersCount: 4,
    isStudentDiscount: true,
    isOpen: true,
    rating: 4.2,
    verticals: ['student-offers'],
  },
  {
    id: 'nearu-zest-cafe-Indiranagar',
    name: 'Zest Cafe Indiranagar',
    category: 'Cafe',
    latitude: 12.9719,
    longitude: 77.6412,
    etaMinutes: 20,
    currentOffersCount: 2,
    isStudentDiscount: true,
    isOpen: true,
    rating: 4.3,
    verticals: ['student-offers', 'food'],
  },
  {
    id: 'nearu-techkart-koramangala',
    name: 'TechKart Koramangala',
    category: 'Electronics',
    latitude: 12.9352,
    longitude: 77.6245,
    etaMinutes: 32,
    currentOffersCount: 6,
    isStudentDiscount: true,
    isOpen: true,
    rating: 4.1,
    verticals: ['student-offers'],
  },
  {
    id: 'nearu-uniform-corner-jayanagar',
    name: 'Uniform Corner Jayanagar',
    category: 'Apparel',
    latitude: 12.9279,
    longitude: 77.5938,
    etaMinutes: 28,
    currentOffersCount: 3,
    isStudentDiscount: true,
    isOpen: true,
    rating: 4.0,
    verticals: ['student-offers'],
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

function haversineKm(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
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
 * Pick the fixture entries that belong to a given vertical. The `all`
 * vertical returns every fixture (deduplicated).
 */
function pickFixturesForVertical(vertical: NearUVertical): ReadonlyArray<NearUFixture> {
  if (vertical === 'all') return FIXTURE_STORES;
  return FIXTURE_STORES.filter((f) => f.verticals.includes(vertical));
}

/**
 * Sort the candidates for a vertical. Each vertical has its own default
 * sort — the frontend may re-sort, but the server picks a sensible one
 * so first paint is already useful.
 */
function sortForVertical(
  vertical: NearUVertical,
  candidates: ReadonlyArray<NearUStore>,
): NearUStore[] {
  const copy = [...candidates];
  switch (vertical) {
    case 'food':
      // Best rated first.
      copy.sort((a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm);
      return copy;
    case 'express':
      // Fastest delivery first.
      copy.sort((a, b) => a.etaMinutes - b.etaMinutes || a.distanceKm - b.distanceKm);
      return copy;
    case 'budget':
      // Closest first (still want to know what's near).
      copy.sort((a, b) => a.distanceKm - b.distanceKm);
      return copy;
    case 'student-offers':
      // Most offers first, then closest.
      copy.sort(
        (a, b) =>
          b.currentOffersCount - a.currentOffersCount || a.distanceKm - b.distanceKm,
      );
      return copy;
    case 'all':
    default:
      // Mixed: closest first as a neutral default.
      copy.sort((a, b) => a.distanceKm - b.distanceKm);
      return copy;
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// Authenticated like the rest of the B namespace.
router.use(authenticate);

/**
 * GET /api/b/nearu/:vertical
 *
 * `:vertical` must be one of `food`, `express`, `budget`, `student-offers`,
 * or `all`. `lat` / `lng` are required (decimal degrees).
 *
 * Response: `{ success: true, data: { stores: NearUStore[], vertical } }`.
 */
router.get('/:vertical', (req, res) => {
  const verticalParam = String(req.params.vertical ?? '');
  if (!VERTICALS.includes(verticalParam as NearUVertical)) {
    return bError(
      res,
      `Unknown vertical '${verticalParam}'. Expected one of: ${VERTICALS.join(', ')}`,
      400,
    );
  }
  const vertical = verticalParam as NearUVertical;

  const latRaw = toFiniteNumber(req.query.lat);
  const lngRaw = toFiniteNumber(req.query.lng);
  if (latRaw === null || lngRaw === null) {
    return bError(res, 'lat and lng query parameters are required', 400);
  }
  if (latRaw < -90 || latRaw > 90 || lngRaw < -180 || lngRaw > 180) {
    return bError(res, 'lat/lng out of range', 400);
  }

  try {
    logger.info('b_nearu_query', { vertical, lat: latRaw, lng: lngRaw });
  } catch {
    /* logger must never block the response */
  }

  const candidates: NearUStore[] = [];
  for (const fixture of pickFixturesForVertical(vertical)) {
    const distanceKm = haversineKm(
      latRaw,
      lngRaw,
      fixture.latitude,
      fixture.longitude,
    );
    const store: NearUStore = {
      id: fixture.id,
      name: fixture.name,
      category: fixture.category,
      distanceKm,
      etaMinutes: fixture.etaMinutes,
      currentOffersCount: fixture.currentOffersCount,
      isStudentDiscount: fixture.isStudentDiscount,
      isOpen: fixture.isOpen,
      rating: fixture.rating,
    };
    if (fixture.logoUrl !== undefined) {
      store.logoUrl = fixture.logoUrl;
    }
    candidates.push(store);
  }

  const stores = sortForVertical(vertical, candidates);

  return bSuccess(res, { stores, vertical });
});

export default router;
