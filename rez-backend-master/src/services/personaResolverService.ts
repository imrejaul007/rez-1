/**
 * PersonaResolverService
 *
 * SINGLE SOURCE OF TRUTH for user persona resolution.
 * All APIs that need to personalise content must call this service.
 *
 * Resolution priority (per product spec):
 *  1. Verified persona  — derived from User.segment
 *  2. Behaviour-derived — (future; skipped for now)
 *  3. Stated persona    — derived from User.statedIdentity
 *  4. Default           — 'general'
 *
 * Results are cached in Redis with a 10-minute TTL: `persona:{userId}`
 * Cache is invalidated when segment or statedIdentity changes.
 */

import { Types } from 'mongoose';
import { User } from '../models/User';
import redisService from './redisService';
import { logger } from '../config/logger';

// ============================================================================
// Constants
// ============================================================================

const CACHE_TTL = 600; // 10 minutes
const CACHE_PREFIX = 'persona';

// ============================================================================
// Types
// ============================================================================

export type PersonaId = 'student' | 'employee' | 'general';
export type PersonaSource = 'verified' | 'stated' | 'default';
export type TimeBucket = 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night' | 'weekend';
export type PriceBucket = 'low' | 'mid' | 'high' | 'all';
export type AnchorLocationType = 'campus' | 'office' | 'home' | 'live';

export interface AnchorLocation {
  type: AnchorLocationType;
  lat: number;
  lng: number;
  radius: number;
}

export interface RankingProfile {
  distanceWeight: number;
  priceWeight: number;
  ratingWeight: number;
  popularityWeight: number;
  premiumWeight: number;
  bookingSpeedWeight: number;
}

export interface FeedConfig {
  maxRadius: number;
  priceBucket: PriceBucket;
  hiddenCategories: string[];
  priorityCategories: string[];
  timeBucket: TimeBucket;
}

export interface ResolvedPersona {
  personaId: PersonaId;
  confidence: number; // 100 = verified, 80 = stated, 50 = default
  source: PersonaSource;
  segment: string; // raw User.segment value
  anchorLocation: AnchorLocation | null;
  rankingProfile: RankingProfile;
  feedConfig: FeedConfig;
  eligibleZones: string[]; // from User.activeZones
}

// ============================================================================
// Persona configuration tables
// ============================================================================

const RANKING_PROFILES: Record<PersonaId, RankingProfile> = {
  student: {
    distanceWeight: 0.3,
    priceWeight: 0.35,
    ratingWeight: 0.15,
    popularityWeight: 0.15,
    premiumWeight: 0.05,
    bookingSpeedWeight: 0.0,
  },
  employee: {
    distanceWeight: 0.25,
    priceWeight: 0.1,
    ratingWeight: 0.3,
    popularityWeight: 0.1,
    premiumWeight: 0.1,
    bookingSpeedWeight: 0.15,
  },
  general: {
    distanceWeight: 0.25,
    priceWeight: 0.15,
    ratingWeight: 0.25,
    popularityWeight: 0.15,
    premiumWeight: 0.1,
    bookingSpeedWeight: 0.1,
  },
};

const FEED_BASE_CONFIG: Record<PersonaId, Omit<FeedConfig, 'timeBucket'>> = {
  student: {
    maxRadius: 3,
    priceBucket: 'low',
    hiddenCategories: ['luxury-spa', 'fine-dining', 'premium-clinic', 'elite-experience', 'corporate-lunch'],
    priorityCategories: [
      'budget-food',
      'cafes',
      'street-food',
      'entertainment',
      'grooming',
      'student-utility',
      'events',
    ],
  },
  employee: {
    maxRadius: 5,
    priceBucket: 'mid',
    hiddenCategories: ['student-utility'],
    priorityCategories: [
      'lunch-deals',
      'grooming-wellness',
      'after-work-dining',
      'fitness',
      'home-services',
      'premium-offers',
    ],
  },
  general: {
    maxRadius: 10,
    priceBucket: 'all',
    hiddenCategories: [],
    priorityCategories: ['food-dining', 'beauty-wellness', 'grocery', 'entertainment', 'fitness', 'healthcare'],
  },
};

// ============================================================================
// Time bucket helper
// ============================================================================

function getTimeBucket(hour: number, isWeekend: boolean): TimeBucket {
  if (isWeekend) return 'weekend';
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function currentTimeBucket(): TimeBucket {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = now.getHours();
  const isWeekend = day === 0 || day === 6;
  return getTimeBucket(hour, isWeekend);
}

// ============================================================================
// Segment → PersonaId mapping
// ============================================================================

function segmentToPersona(segment: string | undefined): PersonaId | null {
  if (!segment) return null;
  if (segment === 'verified_student') return 'student';
  if (segment === 'verified_employee') return 'employee';
  return null;
}

function statedIdentityToPersona(statedIdentity: string | undefined): PersonaId | null {
  if (!statedIdentity) return null;
  if (statedIdentity === 'student') return 'student';
  if (statedIdentity === 'corporate') return 'employee';
  // 'other' and 'general' fall through to default
  return null;
}

// ============================================================================
// Service
// ============================================================================

class PersonaResolverService {
  /**
   * Resolve a user's persona snapshot.
   * Returns cached result if available; otherwise derives from DB and caches.
   */
  async resolvePersona(userId: string): Promise<ResolvedPersona> {
    const cacheKey = `${CACHE_PREFIX}:${userId}`;

    // Try Redis cache first
    try {
      const cached = await redisService.get<ResolvedPersona>(cacheKey);
      if (cached) return cached;
    } catch {
      // Redis unavailable — continue with DB fetch
    }

    // Fetch only the fields we need (lean for speed)
    const user = await User.findById(new Types.ObjectId(userId))
      .select('segment statedIdentity activeZones profile.location')
      .lean()
      .catch(() => null);

    const rawSegment: string = (user as any)?.segment || 'normal';
    const statedIdentity: string | undefined = (user as any)?.statedIdentity;
    const activeZones: string[] = (user as any)?.activeZones || [];
    const profileLocation: any = (user as any)?.profile?.location;

    // Resolution priority 1 — Verified
    let personaId: PersonaId | null = segmentToPersona(rawSegment);
    let confidence = 100;
    let source: PersonaSource = 'verified';

    // Resolution priority 2 — Behaviour-derived (future; skipped)

    // Resolution priority 3 — Stated
    if (!personaId) {
      personaId = statedIdentityToPersona(statedIdentity);
      confidence = 80;
      source = 'stated';
    }

    // Resolution priority 4 — Default
    if (!personaId) {
      personaId = 'general';
      confidence = 50;
      source = 'default';
    }

    // Build anchor location from profile coordinates (live location)
    let anchorLocation: AnchorLocation | null = null;
    if (profileLocation?.coordinates?.length === 2) {
      anchorLocation = {
        type: 'live',
        lng: profileLocation.coordinates[0],
        lat: profileLocation.coordinates[1],
        radius: FEED_BASE_CONFIG[personaId].maxRadius * 1000, // metres
      };
    }

    const feedConfig: FeedConfig = {
      ...FEED_BASE_CONFIG[personaId],
      timeBucket: currentTimeBucket(),
    };

    const result: ResolvedPersona = {
      personaId,
      confidence,
      source,
      segment: rawSegment,
      anchorLocation,
      rankingProfile: RANKING_PROFILES[personaId],
      feedConfig,
      eligibleZones: activeZones,
    };

    // Cache (fire-and-forget)
    redisService.set(cacheKey, result, CACHE_TTL).catch((err) =>
      logger.warn('[PersonaResolver] Cache set failed', {
        error: (err as Error).message,
      }),
    );

    logger.info('[PersonaResolver] Resolved persona', {
      userId,
      personaId,
      source,
      confidence,
    });

    return result;
  }

  /**
   * Invalidate cached persona for a user.
   * Call this after segment or statedIdentity changes.
   */
  async invalidate(userId: string): Promise<void> {
    try {
      await redisService.del(`${CACHE_PREFIX}:${userId}`);
      logger.info('[PersonaResolver] Persona cache invalidated', { userId });
    } catch {
      // Redis unavailable — TTL will handle expiry naturally
    }
  }

  /**
   * Force-refresh persona (bypasses cache).
   * Use sparingly — for admin overrides or post-verification flows.
   */
  async resolvePersonaFresh(userId: string): Promise<ResolvedPersona> {
    await this.invalidate(userId);
    return this.resolvePersona(userId);
  }

  /**
   * Resolve persona for an anonymous / unauthenticated request.
   * Returns a pure default 'general' persona with no user-specific data.
   */
  resolveAnonymousPersona(): ResolvedPersona {
    const personaId: PersonaId = 'general';
    const feedConfig: FeedConfig = {
      ...FEED_BASE_CONFIG[personaId],
      timeBucket: currentTimeBucket(),
    };
    return {
      personaId,
      confidence: 50,
      source: 'default',
      segment: 'normal',
      anchorLocation: null,
      rankingProfile: RANKING_PROFILES[personaId],
      feedConfig,
      eligibleZones: [],
    };
  }
}

export const personaResolverService = new PersonaResolverService();
export default personaResolverService;
