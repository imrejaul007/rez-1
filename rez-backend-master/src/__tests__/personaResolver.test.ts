/**
 * PersonaResolverService Tests
 *
 * Tests for the persona resolution logic in src/services/personaResolverService.ts.
 * All MongoDB and Redis calls are mocked — no live infrastructure required.
 *
 * Resolution priority (per spec):
 *  1. Verified  — User.segment (confidence=100, source='verified')
 *  2. Stated    — User.statedIdentity (confidence=80, source='stated')
 *  3. Default   — 'general' (confidence=50, source='default')
 */

import { Types } from 'mongoose';

// ─── Mock Redis before imports ────────────────────────────────────────────────

// IMPORTANT: resetMocks: true (in jest.config.js) resets jest.fn() implementations
// between tests. personaResolverService calls redisService.set() fire-and-forget
// (no await), so the .catch() chain must always get a Promise back.
// We wrap each method so it always returns a Promise regardless of reset state.
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    // Each method delegates to the tracked jest.fn() but guarantees a Promise return.
    get: (...args: any[]) => Promise.resolve(mockRedisGet(...args)),
    set: (...args: any[]) => Promise.resolve(mockRedisSet(...args)).then(() => 'OK'),
    del: (...args: any[]) => Promise.resolve(mockRedisDel(...args)).then(() => 1),
  },
}));

// ─── Mock User model ──────────────────────────────────────────────────────────

const mockUserFindById = jest.fn();

jest.mock('../models/User', () => ({
  User: {
    findById: (...args: any[]) => ({
      select: () => ({
        lean: () => Promise.resolve(mockUserFindById(...args)).catch(() => null),
      }),
    }),
  },
}));

// ─── Mock logger ──────────────────────────────────────────────────────────────

jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { personaResolverService } from '../services/personaResolverService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeUserId = () => new Types.ObjectId().toString();

const makeUser = (overrides: Record<string, any> = {}) => ({
  _id: new Types.ObjectId(),
  segment: 'normal',
  statedIdentity: undefined,
  activeZones: [],
  profile: {},
  ...overrides,
});

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('PersonaResolverService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Redis cache miss
    mockRedisGet.mockResolvedValue(null);
    // Default: Redis writes succeed
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);
  });

  // ── Verified persona resolution ────────────────────────────────────────────

  describe('Verified persona resolution (priority 1)', () => {
    it('resolves verified_student → persona=student, confidence=100, source=verified', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_student' }));

      const result = await personaResolverService.resolvePersona(userId);

      expect(result.personaId).toBe('student');
      expect(result.confidence).toBe(100);
      expect(result.source).toBe('verified');
    });

    it('resolves verified_employee → persona=employee, confidence=100, source=verified', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_employee' }));

      const result = await personaResolverService.resolvePersona(userId);

      expect(result.personaId).toBe('employee');
      expect(result.confidence).toBe(100);
      expect(result.source).toBe('verified');
    });

    it('stores raw segment value in result.segment', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_student' }));

      const result = await personaResolverService.resolvePersona(userId);

      expect(result.segment).toBe('verified_student');
    });
  });

  // ── Stated identity resolution ─────────────────────────────────────────────

  describe('Stated identity resolution (priority 3)', () => {
    it('resolves statedIdentity=student (not verified) → persona=student, confidence=80, source=stated', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal', statedIdentity: 'student' }));

      const result = await personaResolverService.resolvePersona(userId);

      expect(result.personaId).toBe('student');
      expect(result.confidence).toBe(80);
      expect(result.source).toBe('stated');
    });

    it('resolves statedIdentity=corporate → persona=employee, confidence=80, source=stated', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal', statedIdentity: 'corporate' }));

      const result = await personaResolverService.resolvePersona(userId);

      expect(result.personaId).toBe('employee');
      expect(result.confidence).toBe(80);
      expect(result.source).toBe('stated');
    });

    it('statedIdentity=other falls through to default general persona', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal', statedIdentity: 'other' }));

      const result = await personaResolverService.resolvePersona(userId);

      expect(result.personaId).toBe('general');
      expect(result.confidence).toBe(50);
      expect(result.source).toBe('default');
    });

    it('verified segment takes priority over statedIdentity', async () => {
      const userId = makeUserId();
      // User has both verified segment AND stated identity — verified wins
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_employee', statedIdentity: 'student' }));

      const result = await personaResolverService.resolvePersona(userId);

      expect(result.personaId).toBe('employee');
      expect(result.confidence).toBe(100);
      expect(result.source).toBe('verified');
    });
  });

  // ── Default resolution ─────────────────────────────────────────────────────

  describe('Default persona resolution (priority 4)', () => {
    it('returns persona=general, confidence=50, source=default when no segment or statedIdentity', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal', statedIdentity: undefined }));

      const result = await personaResolverService.resolvePersona(userId);

      expect(result.personaId).toBe('general');
      expect(result.confidence).toBe(50);
      expect(result.source).toBe('default');
    });

    it('returns default general persona when user document is null', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(null);

      const result = await personaResolverService.resolvePersona(userId);

      expect(result.personaId).toBe('general');
      expect(result.confidence).toBe(50);
      expect(result.source).toBe('default');
    });
  });

  // ── Anonymous persona ──────────────────────────────────────────────────────

  describe('Anonymous persona resolution', () => {
    it('resolveAnonymousPersona returns general persona with no user data', () => {
      const result = personaResolverService.resolveAnonymousPersona();

      expect(result.personaId).toBe('general');
      expect(result.confidence).toBe(50);
      expect(result.source).toBe('default');
      expect(result.anchorLocation).toBeNull();
      expect(result.eligibleZones).toEqual([]);
    });

    it('anonymous persona does not call Redis or DB', () => {
      personaResolverService.resolveAnonymousPersona();

      expect(mockRedisGet).not.toHaveBeenCalled();
      expect(mockUserFindById).not.toHaveBeenCalled();
    });
  });

  // ── Ranking profiles ───────────────────────────────────────────────────────

  describe('Ranking profiles', () => {
    it('student ranking profile has priceWeight as the highest weight', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_student' }));

      const { rankingProfile } = await personaResolverService.resolvePersona(userId);

      expect(rankingProfile.priceWeight).toBeGreaterThan(rankingProfile.ratingWeight);
      expect(rankingProfile.priceWeight).toBeGreaterThan(rankingProfile.distanceWeight);
      expect(rankingProfile.priceWeight).toBeGreaterThan(rankingProfile.popularityWeight);
      expect(rankingProfile.priceWeight).toBeGreaterThan(rankingProfile.premiumWeight);
    });

    it('employee ranking profile has ratingWeight as the highest weight', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_employee' }));

      const { rankingProfile } = await personaResolverService.resolvePersona(userId);

      expect(rankingProfile.ratingWeight).toBeGreaterThan(rankingProfile.priceWeight);
      expect(rankingProfile.ratingWeight).toBeGreaterThan(rankingProfile.popularityWeight);
      expect(rankingProfile.ratingWeight).toBeGreaterThan(rankingProfile.premiumWeight);
    });

    it('student ranking weights sum to approximately 1.0', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_student' }));

      const { rankingProfile } = await personaResolverService.resolvePersona(userId);

      const total =
        rankingProfile.distanceWeight +
        rankingProfile.priceWeight +
        rankingProfile.ratingWeight +
        rankingProfile.popularityWeight +
        rankingProfile.premiumWeight +
        rankingProfile.bookingSpeedWeight;

      expect(total).toBeCloseTo(1.0, 1);
    });

    it('employee ranking weights sum to approximately 1.0', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_employee' }));

      const { rankingProfile } = await personaResolverService.resolvePersona(userId);

      const total =
        rankingProfile.distanceWeight +
        rankingProfile.priceWeight +
        rankingProfile.ratingWeight +
        rankingProfile.popularityWeight +
        rankingProfile.premiumWeight +
        rankingProfile.bookingSpeedWeight;

      expect(total).toBeCloseTo(1.0, 1);
    });
  });

  // ── Feed config ────────────────────────────────────────────────────────────

  describe('Feed configuration', () => {
    it('student feed config: maxRadius=3', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_student' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.maxRadius).toBe(3);
    });

    it('employee feed config: maxRadius=5', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_employee' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.maxRadius).toBe(5);
    });

    it('general feed config: maxRadius=10', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.maxRadius).toBe(10);
    });

    it('student feed hiddenCategories includes luxury-spa and fine-dining', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_student' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.hiddenCategories).toContain('luxury-spa');
      expect(feedConfig.hiddenCategories).toContain('fine-dining');
    });

    it('employee feed hiddenCategories includes student-utility', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_employee' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.hiddenCategories).toContain('student-utility');
    });

    it('general feed hiddenCategories is empty (shows everything)', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.hiddenCategories).toHaveLength(0);
    });

    it('student feed priceBucket is low', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_student' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.priceBucket).toBe('low');
    });

    it('employee feed priceBucket is mid', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_employee' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.priceBucket).toBe('mid');
    });

    it('general feed priceBucket is all', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.priceBucket).toBe('all');
    });
  });

  // ── Time bucket resolution ─────────────────────────────────────────────────

  describe('Time bucket resolution', () => {
    const RealDate = Date;

    afterEach(() => {
      global.Date = RealDate;
    });

    function mockDate(isoString: string) {
      const fixed = new RealDate(isoString);
      // @ts-ignore
      global.Date = class extends RealDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(isoString);
          } else {
            // @ts-ignore
            super(...args);
          }
        }
        static now() {
          return fixed.getTime();
        }
      };
    }

    it('hour=12, weekday → timeBucket=lunch', async () => {
      // 2026-03-26 is a Thursday (weekday), 12:00
      mockDate('2026-03-26T12:00:00');
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.timeBucket).toBe('lunch');
    });

    it('hour=19, weekday → timeBucket=evening', async () => {
      // 2026-03-26 is a Thursday, 19:00
      mockDate('2026-03-26T19:00:00');
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.timeBucket).toBe('evening');
    });

    it('any hour on weekend → timeBucket=weekend', async () => {
      // 2026-03-28 is a Saturday
      mockDate('2026-03-28T14:00:00');
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.timeBucket).toBe('weekend');
    });

    it('hour=8, weekday → timeBucket=morning', async () => {
      mockDate('2026-03-26T08:00:00');
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.timeBucket).toBe('morning');
    });

    it('hour=15, weekday → timeBucket=afternoon', async () => {
      mockDate('2026-03-26T15:00:00');
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.timeBucket).toBe('afternoon');
    });

    it('hour=23, weekday → timeBucket=night', async () => {
      mockDate('2026-03-26T23:00:00');
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal' }));

      const { feedConfig } = await personaResolverService.resolvePersona(userId);

      expect(feedConfig.timeBucket).toBe('night');
    });
  });

  // ── Redis caching ──────────────────────────────────────────────────────────

  describe('Redis caching', () => {
    it('second call within TTL returns cached result (no DB hit)', async () => {
      const userId = makeUserId();
      const cachedPersona = {
        personaId: 'student',
        confidence: 100,
        source: 'verified',
        segment: 'verified_student',
        anchorLocation: null,
        rankingProfile: {},
        feedConfig: {
          maxRadius: 3,
          priceBucket: 'low',
          hiddenCategories: [],
          priorityCategories: [],
          timeBucket: 'morning',
        },
        eligibleZones: [],
      };
      // First call — cache hit
      mockRedisGet.mockResolvedValue(cachedPersona);

      const result = await personaResolverService.resolvePersona(userId);

      expect(result.personaId).toBe('student');
      // DB must NOT be called when cache hit
      expect(mockUserFindById).not.toHaveBeenCalled();
    });

    it('on cache miss, result is written to Redis after DB fetch', async () => {
      const userId = makeUserId();
      mockRedisGet.mockResolvedValue(null); // cache miss
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_student' }));

      await personaResolverService.resolvePersona(userId);

      // Wait for fire-and-forget cache set
      await new Promise((r) => setImmediate(r));

      expect(mockRedisSet).toHaveBeenCalledWith(
        expect.stringContaining(`persona:${userId}`),
        expect.objectContaining({ personaId: 'student' }),
        600, // TTL
      );
    });

    it('cache key includes userId for isolation between users', async () => {
      const userId1 = makeUserId();
      const userId2 = makeUserId();
      mockRedisGet.mockResolvedValue(null);
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_student' }));

      await personaResolverService.resolvePersona(userId1);
      await personaResolverService.resolvePersona(userId2);

      const [call1, call2] = mockRedisGet.mock.calls;
      expect(call1[0]).toContain(userId1);
      expect(call2[0]).toContain(userId2);
    });

    it('proceeds gracefully when Redis.get throws (cache miss fallback)', async () => {
      const userId = makeUserId();
      mockRedisGet.mockRejectedValue(new Error('Redis connection refused'));
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_employee' }));

      const result = await personaResolverService.resolvePersona(userId);

      // Should still resolve from DB
      expect(result.personaId).toBe('employee');
    });
  });

  // ── Cache invalidation ─────────────────────────────────────────────────────

  describe('Cache invalidation', () => {
    it('invalidate() deletes the persona cache key', async () => {
      const userId = makeUserId();

      await personaResolverService.invalidate(userId);

      expect(mockRedisDel).toHaveBeenCalledWith(`persona:${userId}`);
    });

    it('resolvePersonaFresh() invalidates then re-resolves from DB', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_employee' }));
      // After invalidation, cache will be empty
      mockRedisGet.mockResolvedValue(null);

      const result = await personaResolverService.resolvePersonaFresh(userId);

      expect(mockRedisDel).toHaveBeenCalledWith(`persona:${userId}`);
      expect(result.personaId).toBe('employee');
      expect(result.source).toBe('verified');
    });

    it('invalidate() does not throw when Redis is unavailable', async () => {
      const userId = makeUserId();
      mockRedisDel.mockRejectedValue(new Error('Redis down'));

      await expect(personaResolverService.invalidate(userId)).resolves.not.toThrow();
    });
  });

  // ── Anchor location ────────────────────────────────────────────────────────

  describe('Anchor location building', () => {
    it('builds live anchor location from profile.location.coordinates', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(
        makeUser({
          segment: 'verified_student',
          profile: {
            location: {
              coordinates: [77.5946, 12.9716], // [lng, lat] Bangalore
            },
          },
        }),
      );

      const { anchorLocation } = await personaResolverService.resolvePersona(userId);

      expect(anchorLocation).not.toBeNull();
      expect(anchorLocation!.type).toBe('live');
      expect(anchorLocation!.lng).toBe(77.5946);
      expect(anchorLocation!.lat).toBe(12.9716);
      // Student radius = 3km → 3000 metres
      expect(anchorLocation!.radius).toBe(3000);
    });

    it('anchorLocation is null when profile has no coordinates', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'verified_student', profile: {} }));

      const { anchorLocation } = await personaResolverService.resolvePersona(userId);

      expect(anchorLocation).toBeNull();
    });

    it('employee anchor radius is 5000 metres (5km)', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(
        makeUser({
          segment: 'verified_employee',
          profile: { location: { coordinates: [72.8777, 19.076] } },
        }),
      );

      const { anchorLocation } = await personaResolverService.resolvePersona(userId);

      expect(anchorLocation!.radius).toBe(5000);
    });
  });

  // ── Eligible zones ─────────────────────────────────────────────────────────

  describe('Eligible zones', () => {
    it('passes through user activeZones to eligibleZones', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(
        makeUser({
          segment: 'verified_student',
          activeZones: ['student-zone-bangalore', 'campus-iitb'],
        }),
      );

      const { eligibleZones } = await personaResolverService.resolvePersona(userId);

      expect(eligibleZones).toEqual(['student-zone-bangalore', 'campus-iitb']);
    });

    it('eligibleZones defaults to empty array when user has no activeZones', async () => {
      const userId = makeUserId();
      mockUserFindById.mockResolvedValue(makeUser({ segment: 'normal', activeZones: undefined }));

      const { eligibleZones } = await personaResolverService.resolvePersona(userId);

      expect(eligibleZones).toEqual([]);
    });
  });
});
