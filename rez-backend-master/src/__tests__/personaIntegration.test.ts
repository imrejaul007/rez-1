/**
 * Integration Test: Full Persona Flow
 *
 * End-to-end test of the complete persona system flow:
 * 1. Resolve persona from user segment
 * 2. Apply feed filtering to homepage sections
 * 3. Rank search results
 * 4. Build notification titles
 * 5. Simulate segment change → invalidate cache → re-resolve
 *
 * All DB (MongoDB) and Redis calls are mocked — no live infrastructure required.
 * Follows the mock-first pattern from rewardEngine.test.ts.
 */

import { Types } from 'mongoose';

// ─── Mock Redis ───────────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
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
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { personaResolverService } from '../services/personaResolverService';
import type { ResolvedPersona, PersonaId, FeedConfig, RankingProfile } from '../services/personaResolverService';

// ─── Inline simulation helpers ────────────────────────────────────────────────

interface MockMerchant {
  id: string;
  name: string;
  avgTicket: number;
  rating: number;
  cashbackPercent: number;
  category: string;
  distanceKm: number;
  priceBucket: 'low' | 'mid' | 'high';
}

interface HomepageSection {
  title: string;
  category: string;
  merchants: MockMerchant[];
}

function applyFeedFilter(merchants: MockMerchant[], feedConfig: FeedConfig): MockMerchant[] {
  const PREMIUM_THRESHOLD = 800;
  return merchants.filter((m) => {
    if (m.distanceKm > feedConfig.maxRadius) return false;
    if (feedConfig.hiddenCategories.includes(m.category)) return false;
    if (feedConfig.priceBucket === 'low' && m.avgTicket > PREMIUM_THRESHOLD) return false;
    return true;
  });
}

function buildHomepageSections(allMerchants: MockMerchant[], feedConfig: FeedConfig): HomepageSection[] {
  const filtered = applyFeedFilter(allMerchants, feedConfig);
  const byCategory = new Map<string, MockMerchant[]>();
  for (const m of filtered) {
    if (!byCategory.has(m.category)) byCategory.set(m.category, []);
    byCategory.get(m.category)!.push(m);
  }

  const sections: HomepageSection[] = [];
  // Priority categories first
  for (const cat of feedConfig.priorityCategories) {
    if (byCategory.has(cat)) {
      sections.push({ title: cat, category: cat, merchants: byCategory.get(cat)! });
    }
  }
  // Remaining
  for (const [cat, merchants] of byCategory) {
    if (!sections.find((s) => s.category === cat)) {
      sections.push({ title: cat, category: cat, merchants });
    }
  }
  return sections;
}

function rankSearchResults(merchants: MockMerchant[], profile: RankingProfile, persona: PersonaId): MockMerchant[] {
  const boosted = merchants.map((m) => {
    let relevance = 0.8; // base
    if (persona === 'student' && m.cashbackPercent >= 10) relevance += 0.2;
    if (persona === 'employee' && m.rating >= 4.0) relevance += 0.2;
    return { ...m, _relevance: relevance };
  }) as (MockMerchant & { _relevance: number })[];

  return boosted.sort((a, b) => {
    const priceScoreA = Math.max(0, 1 - a.avgTicket / 5000);
    const priceScoreB = Math.max(0, 1 - b.avgTicket / 5000);
    const scoreA =
      profile.priceWeight * priceScoreA +
      profile.ratingWeight * (a.rating / 5) +
      profile.popularityWeight * a._relevance;
    const scoreB =
      profile.priceWeight * priceScoreB +
      profile.ratingWeight * (b.rating / 5) +
      profile.popularityWeight * b._relevance;
    return scoreB - scoreA;
  });
}

function buildNotificationTitle(
  persona: PersonaId,
  merchantName: string,
  savings: number,
  timeBucket: FeedConfig['timeBucket'],
): string {
  if (persona === 'student') return `Student deal near campus! Save Rs.${savings} at ${merchantName}`;
  if (persona === 'employee') {
    if (timeBucket === 'lunch') return `Save on lunch near office! Rs.${savings} at ${merchantName}`;
    if (timeBucket === 'evening') return `After-work deal nearby — Rs.${savings} at ${merchantName}`;
  }
  return `Save Rs.${savings} at ${merchantName}`;
}

// ─── Test fixture data ────────────────────────────────────────────────────────

const ALL_MERCHANTS: MockMerchant[] = [
  // Student-friendly
  {
    id: 'm1',
    name: 'Campus Dosa',
    avgTicket: 80,
    rating: 3.8,
    cashbackPercent: 15,
    category: 'budget-food',
    distanceKm: 1.0,
    priceBucket: 'low',
  },
  {
    id: 'm2',
    name: 'Study Cafe',
    avgTicket: 120,
    rating: 3.9,
    cashbackPercent: 12,
    category: 'cafes',
    distanceKm: 0.8,
    priceBucket: 'low',
  },
  {
    id: 'm3',
    name: 'Print & Copy',
    avgTicket: 20,
    rating: 3.5,
    cashbackPercent: 8,
    category: 'student-utility',
    distanceKm: 0.5,
    priceBucket: 'low',
  },
  // Mid-range (employee-friendly)
  {
    id: 'm4',
    name: 'Office Grill',
    avgTicket: 350,
    rating: 4.3,
    cashbackPercent: 9,
    category: 'lunch-deals',
    distanceKm: 3.0,
    priceBucket: 'mid',
  },
  {
    id: 'm5',
    name: 'Prestige Wellness',
    avgTicket: 600,
    rating: 4.6,
    cashbackPercent: 6,
    category: 'grooming-wellness',
    distanceKm: 4.5,
    priceBucket: 'mid',
  },
  {
    id: 'm6',
    name: 'FitLife Gym',
    avgTicket: 500,
    rating: 4.2,
    cashbackPercent: 7,
    category: 'fitness',
    distanceKm: 4.0,
    priceBucket: 'mid',
  },
  // Premium (hidden for students)
  {
    id: 'm7',
    name: 'Le Gourmet',
    avgTicket: 2500,
    rating: 4.9,
    cashbackPercent: 3,
    category: 'fine-dining',
    distanceKm: 2.0,
    priceBucket: 'high',
  },
  {
    id: 'm8',
    name: 'Aura Luxury Spa',
    avgTicket: 3500,
    rating: 4.8,
    cashbackPercent: 2,
    category: 'luxury-spa',
    distanceKm: 1.5,
    priceBucket: 'high',
  },
  // Restaurant for search tests
  {
    id: 'm9',
    name: 'Budget Bites',
    avgTicket: 60,
    rating: 3.5,
    cashbackPercent: 18,
    category: 'restaurant',
    distanceKm: 0.6,
    priceBucket: 'low',
  },
  {
    id: 'm10',
    name: 'Upscale Table',
    avgTicket: 1800,
    rating: 4.7,
    cashbackPercent: 4,
    category: 'restaurant',
    distanceKm: 3.5,
    priceBucket: 'high',
  },
];

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('Full Persona Flow — Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);
  });

  // ── Step 1–5: Student persona full flow ────────────────────────────────────

  describe('Student persona full flow (segment=verified_student)', () => {
    const userId = new Types.ObjectId().toString();

    beforeEach(() => {
      mockUserFindById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        segment: 'verified_student',
        statedIdentity: undefined,
        activeZones: ['campus-zone'],
        profile: { location: { coordinates: [77.5946, 12.9716] } },
      });
    });

    it('Step 1: creates user with segment=verified_student', () => {
      // Verified by beforeEach — mockUserFindById returns verified_student user
      expect(mockUserFindById).not.toHaveBeenCalled(); // not called yet
    });

    it('Step 2: resolves persona → student, confidence=100', async () => {
      const persona = await personaResolverService.resolvePersona(userId);

      expect(persona.personaId).toBe('student');
      expect(persona.confidence).toBe(100);
      expect(persona.source).toBe('verified');
    });

    it('Step 3: homepage feed — student sections present, premium hidden', async () => {
      const persona = await personaResolverService.resolvePersona(userId);
      const sections = buildHomepageSections(ALL_MERCHANTS, persona.feedConfig);

      const sectionCategories = sections.map((s) => s.category);

      // Student priority sections should be present
      expect(sectionCategories).toContain('budget-food');
      expect(sectionCategories).toContain('cafes');
      expect(sectionCategories).toContain('student-utility');

      // Premium/hidden sections must be absent
      expect(sectionCategories).not.toContain('fine-dining');
      expect(sectionCategories).not.toContain('luxury-spa');
    });

    it('Step 3b: student homepage feed respects 3km radius', async () => {
      const persona = await personaResolverService.resolvePersona(userId);
      const sections = buildHomepageSections(ALL_MERCHANTS, persona.feedConfig);
      const allVisible = sections.flatMap((s) => s.merchants);

      // m4 is exactly 3km — within 3km student radius (filter is distanceKm > maxRadius, strict)
      expect(allVisible.find((m) => m.id === 'm4')).toBeDefined();
      // m5 is 4.5km, m6 is 4km — both strictly beyond 3km, should be excluded
      expect(allVisible.find((m) => m.id === 'm5')).toBeUndefined();
      expect(allVisible.find((m) => m.id === 'm6')).toBeUndefined();
    });

    it('Step 4: search "restaurant" → budget restaurants ranked first', async () => {
      const persona = await personaResolverService.resolvePersona(userId);
      const restaurants = ALL_MERCHANTS.filter((m) => m.category === 'restaurant');
      const ranked = rankSearchResults(restaurants, persona.rankingProfile, 'student');

      // m9 (avgTicket=60, cashback=18%) should beat m10 (avgTicket=1800) for students
      const m9Rank = ranked.findIndex((m) => m.id === 'm9');
      const m10Rank = ranked.findIndex((m) => m.id === 'm10');
      expect(m9Rank).toBeLessThan(m10Rank);
    });

    it('Step 5: student opportunity notification has student-specific title', async () => {
      const persona = await personaResolverService.resolvePersona(userId);
      const title = buildNotificationTitle(persona.personaId, 'Campus Dosa', 50, persona.feedConfig.timeBucket);

      expect(title).toContain('Student deal near campus!');
    });
  });

  // ── Steps 6–9: Segment change → employee persona full flow ────────────────

  describe('Employee persona full flow (segment changes to verified_employee)', () => {
    const userId = new Types.ObjectId().toString();

    it('Step 6: segment changes to verified_employee — old cache is invalidated', async () => {
      await personaResolverService.invalidate(userId);

      expect(mockRedisDel).toHaveBeenCalledWith(`persona:${userId}`);
    });

    it('Step 7: re-resolve after segment change → employee, confidence=100', async () => {
      mockUserFindById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        segment: 'verified_employee',
        statedIdentity: undefined,
        activeZones: ['office-zone'],
        profile: { location: { coordinates: [72.8777, 19.076] } },
      });

      const persona = await personaResolverService.resolvePersonaFresh(userId);

      expect(persona.personaId).toBe('employee');
      expect(persona.confidence).toBe(100);
      expect(persona.source).toBe('verified');
    });

    it('Step 8: homepage feed — employee sections present, student-utility hidden', async () => {
      mockUserFindById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        segment: 'verified_employee',
        statedIdentity: undefined,
        activeZones: [],
        profile: {},
      });

      const persona = await personaResolverService.resolvePersonaFresh(userId);
      const sections = buildHomepageSections(ALL_MERCHANTS, persona.feedConfig);
      const sectionCategories = sections.map((s) => s.category);

      // Employee-specific sections
      expect(sectionCategories).toContain('lunch-deals');
      expect(sectionCategories).toContain('fitness');

      // student-utility must be hidden from employee feed
      expect(sectionCategories).not.toContain('student-utility');
    });

    it('Step 8b: employee homepage feed respects 5km radius', async () => {
      mockUserFindById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        segment: 'verified_employee',
        statedIdentity: undefined,
        activeZones: [],
        profile: {},
      });

      const persona = await personaResolverService.resolvePersonaFresh(userId);
      const sections = buildHomepageSections(ALL_MERCHANTS, persona.feedConfig);
      const allVisible = sections.flatMap((s) => s.merchants);

      // m5 is 4.5km — within 5km employee radius → should be visible
      expect(allVisible.find((m) => m.id === 'm5')).toBeDefined();

      // m4 is 3km → also visible for employee
      expect(allVisible.find((m) => m.id === 'm4')).toBeDefined();
    });

    it('Step 9: search "salon" → top-rated salons first for employee', async () => {
      mockUserFindById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        segment: 'verified_employee',
        statedIdentity: undefined,
        activeZones: [],
        profile: {},
      });

      const persona = await personaResolverService.resolvePersonaFresh(userId);

      const salonMerchants: MockMerchant[] = [
        {
          id: 'sl1',
          name: 'Budget Cuts',
          avgTicket: 150,
          rating: 3.4,
          cashbackPercent: 5,
          category: 'salon',
          distanceKm: 1.0,
          priceBucket: 'low',
        },
        {
          id: 'sl2',
          name: 'Elite Grooming',
          avgTicket: 900,
          rating: 4.8,
          cashbackPercent: 4,
          category: 'salon',
          distanceKm: 3.0,
          priceBucket: 'high',
        },
        {
          id: 'sl3',
          name: 'Mid Salon',
          avgTicket: 400,
          rating: 4.2,
          cashbackPercent: 8,
          category: 'salon',
          distanceKm: 2.0,
          priceBucket: 'mid',
        },
      ];

      const ranked = rankSearchResults(salonMerchants, persona.rankingProfile, 'employee');

      // Employee prioritises rating → Elite Grooming (4.8) should be first
      expect(ranked[0].id).toBe('sl2');
      // Budget Cuts (rating=3.4) should be last
      expect(ranked[ranked.length - 1].id).toBe('sl1');
    });
  });

  // ── Cache invalidation on segment change ──────────────────────────────────

  describe('Cache invalidation on segment change', () => {
    it('stale cache is bypassed by resolvePersonaFresh', async () => {
      const userId = new Types.ObjectId().toString();

      // User's segment was updated to employee in DB
      mockUserFindById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        segment: 'verified_employee',
        statedIdentity: undefined,
        activeZones: [],
        profile: {},
      });

      // resolvePersonaFresh: invalidates cache first (del), then resolves fresh from DB.
      // After del, the subsequent get should return null (cache cleared) → falls through to DB.
      // We model this by having get return null (default from beforeEach).
      mockRedisGet.mockResolvedValue(null);

      // Fresh resolve bypasses cache and reads from DB
      const freshPersona = await personaResolverService.resolvePersonaFresh(userId);

      // Must return employee (from DB)
      expect(freshPersona.personaId).toBe('employee');
      expect(freshPersona.source).toBe('verified');
    });

    it('regular resolve would return cached student persona (not yet invalidated)', async () => {
      const userId = new Types.ObjectId().toString();

      const cachedPersona: Partial<ResolvedPersona> = {
        personaId: 'student',
        confidence: 100,
        source: 'verified',
      };
      mockRedisGet.mockResolvedValue(cachedPersona);

      const result = await personaResolverService.resolvePersona(userId);

      expect(result.personaId).toBe('student');
      // DB should NOT be called (served from cache)
      expect(mockUserFindById).not.toHaveBeenCalled();
    });
  });

  // ── Stated identity flow ───────────────────────────────────────────────────

  describe('Stated identity flow (non-verified user)', () => {
    it('stated student gets persona=student, confidence=80, source=stated', async () => {
      const userId = new Types.ObjectId().toString();
      mockUserFindById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        segment: 'normal',
        statedIdentity: 'student',
        activeZones: [],
        profile: {},
      });

      const persona = await personaResolverService.resolvePersona(userId);

      expect(persona.personaId).toBe('student');
      expect(persona.confidence).toBe(80);
      expect(persona.source).toBe('stated');
    });

    it('stated student still gets student feed config (3km radius, low priceBucket)', async () => {
      const userId = new Types.ObjectId().toString();
      mockUserFindById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        segment: 'normal',
        statedIdentity: 'student',
        activeZones: [],
        profile: {},
      });

      const persona = await personaResolverService.resolvePersona(userId);

      expect(persona.feedConfig.maxRadius).toBe(3);
      expect(persona.feedConfig.priceBucket).toBe('low');
      expect(persona.feedConfig.hiddenCategories).toContain('luxury-spa');
    });

    it('stated corporate gets persona=employee with employee feed config (5km radius)', async () => {
      const userId = new Types.ObjectId().toString();
      mockUserFindById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        segment: 'normal',
        statedIdentity: 'corporate',
        activeZones: [],
        profile: {},
      });

      const persona = await personaResolverService.resolvePersona(userId);

      expect(persona.personaId).toBe('employee');
      expect(persona.confidence).toBe(80);
      expect(persona.feedConfig.maxRadius).toBe(5);
      expect(persona.feedConfig.hiddenCategories).toContain('student-utility');
    });
  });

  // ── Default persona fallthrough ────────────────────────────────────────────

  describe('Default (general) persona flow', () => {
    it('user with no segment/statedIdentity gets general persona, all content visible', async () => {
      const userId = new Types.ObjectId().toString();
      mockUserFindById.mockResolvedValue({
        _id: new Types.ObjectId(userId),
        segment: 'normal',
        statedIdentity: undefined,
        activeZones: [],
        profile: {},
      });

      const persona = await personaResolverService.resolvePersona(userId);

      expect(persona.personaId).toBe('general');
      expect(persona.feedConfig.priceBucket).toBe('all');
      expect(persona.feedConfig.hiddenCategories).toHaveLength(0);
      expect(persona.feedConfig.maxRadius).toBe(10);

      // All merchant categories should be visible
      const sections = buildHomepageSections(ALL_MERCHANTS, persona.feedConfig);
      const sectionCategories = sections.map((s) => s.category);
      expect(sectionCategories).toContain('fine-dining');
      expect(sectionCategories).toContain('luxury-spa');
      expect(sectionCategories).toContain('student-utility');
    });
  });
});
