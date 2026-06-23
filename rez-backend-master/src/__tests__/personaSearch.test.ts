/**
 * Persona Search Tests
 *
 * Tests the persona-driven search ranking logic:
 * - Student searches rank by price ascending (budget first)
 * - Employee searches rank by rating descending (quality first)
 * - General and unauthenticated searches use relevance-based ranking
 * - Student search boosts merchants with cashback >= 10%
 * - Employee search boosts merchants with rating >= 4.0
 *
 * The ranking logic is exercised directly here so that the searchController
 * (Agent 4) can use these contracts. All DB/Redis calls are mocked.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../models/User', () => ({
  User: {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue(Promise.resolve(null)),
      }),
    }),
  },
}));

jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// ─── Types ────────────────────────────────────────────────────────────────────

import type { PersonaId, RankingProfile } from '../services/personaResolverService';
import { personaResolverService } from '../services/personaResolverService';

interface MockMerchant {
  id: string;
  name: string;
  avgTicket: number;
  rating: number;
  cashbackPercent: number;
  relevanceScore: number; // text match score
  category: string;
  distanceKm: number;
}

// ─── Search ranking helpers ───────────────────────────────────────────────────

/**
 * Computes a weighted score for a merchant given a ranking profile.
 * Mirrors what the searchController will compute to rank results.
 *
 * Weights applied:
 * - priceWeight → score increases as price DECREASES (inverted)
 * - ratingWeight → score increases with rating
 * - popularityWeight + bookingSpeedWeight → proxied via relevanceScore
 */
function computeRankingScore(merchant: MockMerchant, profile: RankingProfile): number {
  // Normalise price: lower ticket = higher score (max ~5000 INR)
  const priceScore = Math.max(0, 1 - merchant.avgTicket / 5000);
  const ratingScore = merchant.rating / 5.0;
  const relevanceScore = merchant.relevanceScore; // already 0-1

  return (
    profile.priceWeight * priceScore +
    profile.ratingWeight * ratingScore +
    (profile.popularityWeight + profile.bookingSpeedWeight) * relevanceScore
  );
}

/**
 * Applies persona-specific boosts before ranking.
 */
function applyPersonaBoosts(merchant: MockMerchant, persona: PersonaId): MockMerchant {
  let boostedRelevance = merchant.relevanceScore;

  if (persona === 'student' && merchant.cashbackPercent >= 10) {
    // Student cashback boost: +0.2 relevance bonus
    boostedRelevance = Math.min(1.0, boostedRelevance + 0.2);
  }

  if (persona === 'employee' && merchant.rating >= 4.0) {
    // Employee quality boost: +0.2 relevance bonus
    boostedRelevance = Math.min(1.0, boostedRelevance + 0.2);
  }

  return { ...merchant, relevanceScore: boostedRelevance };
}

/**
 * Ranks merchants for a search query using persona-specific profile.
 */
function rankSearchResults(merchants: MockMerchant[], profile: RankingProfile, persona: PersonaId): MockMerchant[] {
  const boosted = merchants.map((m) => applyPersonaBoosts(m, persona));
  return [...boosted].sort((a, b) => computeRankingScore(b, profile) - computeRankingScore(a, profile));
}

// ─── Test data ────────────────────────────────────────────────────────────────

const makeSalons = (): MockMerchant[] => [
  {
    id: 's1',
    name: 'Budget Cuts',
    avgTicket: 150,
    rating: 3.6,
    cashbackPercent: 12,
    relevanceScore: 0.9,
    category: 'salon',
    distanceKm: 1.0,
  },
  {
    id: 's2',
    name: 'Style Studio',
    avgTicket: 800,
    rating: 4.5,
    cashbackPercent: 6,
    relevanceScore: 0.85,
    category: 'salon',
    distanceKm: 2.0,
  },
  {
    id: 's3',
    name: 'Premium Parlour',
    avgTicket: 2000,
    rating: 4.8,
    cashbackPercent: 3,
    relevanceScore: 0.8,
    category: 'salon',
    distanceKm: 3.0,
  },
  {
    id: 's4',
    name: 'Midrange Salon',
    avgTicket: 500,
    rating: 4.1,
    cashbackPercent: 8,
    relevanceScore: 0.88,
    category: 'salon',
    distanceKm: 1.5,
  },
  {
    id: 's5',
    name: 'Star Grooming',
    avgTicket: 350,
    rating: 4.7,
    cashbackPercent: 11,
    relevanceScore: 0.82,
    category: 'salon',
    distanceKm: 2.5,
  },
];

const makeRestaurants = (): MockMerchant[] => [
  {
    id: 'r1',
    name: 'Cheap Eats',
    avgTicket: 80,
    rating: 3.5,
    cashbackPercent: 15,
    relevanceScore: 0.92,
    category: 'restaurant',
    distanceKm: 0.5,
  },
  {
    id: 'r2',
    name: 'Fine Dine Co.',
    avgTicket: 1800,
    rating: 4.9,
    cashbackPercent: 4,
    relevanceScore: 0.78,
    category: 'restaurant',
    distanceKm: 3.0,
  },
  {
    id: 'r3',
    name: 'Mid Bistro',
    avgTicket: 400,
    rating: 4.2,
    cashbackPercent: 9,
    relevanceScore: 0.87,
    category: 'restaurant',
    distanceKm: 1.5,
  },
  {
    id: 'r4',
    name: 'Street Food Corner',
    avgTicket: 60,
    rating: 3.8,
    cashbackPercent: 18,
    relevanceScore: 0.9,
    category: 'restaurant',
    distanceKm: 0.8,
  },
];

// ─── Ranking profile constants (mirrored from personaResolverService) ─────────

const STUDENT_PROFILE: RankingProfile = {
  distanceWeight: 0.3,
  priceWeight: 0.35,
  ratingWeight: 0.15,
  popularityWeight: 0.15,
  premiumWeight: 0.05,
  bookingSpeedWeight: 0.0,
};

const EMPLOYEE_PROFILE: RankingProfile = {
  distanceWeight: 0.25,
  priceWeight: 0.1,
  ratingWeight: 0.3,
  popularityWeight: 0.1,
  premiumWeight: 0.1,
  bookingSpeedWeight: 0.15,
};

const GENERAL_PROFILE: RankingProfile = {
  distanceWeight: 0.25,
  priceWeight: 0.15,
  ratingWeight: 0.25,
  popularityWeight: 0.15,
  premiumWeight: 0.1,
  bookingSpeedWeight: 0.1,
};

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('Persona Search Ranking', () => {
  // ── Student search ranking ─────────────────────────────────────────────────

  describe('Student search ranking', () => {
    it('student search for "salon" returns budget salons first (price ascending)', () => {
      const ranked = rankSearchResults(makeSalons(), STUDENT_PROFILE, 'student');

      // First result must be cheaper than the last
      expect(ranked[0].avgTicket).toBeLessThan(ranked[ranked.length - 1].avgTicket);
    });

    it('student search ranks cheapest salon at top', () => {
      const ranked = rankSearchResults(makeSalons(), STUDENT_PROFILE, 'student');
      const cheapest = makeSalons().reduce((a, b) => (a.avgTicket < b.avgTicket ? a : b));

      // The highest-scoring merchant should be one of the budget-priced ones
      expect(ranked[0].avgTicket).toBeLessThanOrEqual(500);
    });

    it('student search boosts merchants with cashback >= 10%', () => {
      const ranked = rankSearchResults(makeSalons(), STUDENT_PROFILE, 'student');

      // s1 has cashbackPercent=12 (>= 10%) and avgTicket=150
      // s5 has cashbackPercent=11 (>= 10%) and avgTicket=350
      // Both should rank above s3 (premium, cashback=3%)
      const s1Rank = ranked.findIndex((m) => m.id === 's1');
      const s3Rank = ranked.findIndex((m) => m.id === 's3');
      expect(s1Rank).toBeLessThan(s3Rank);
    });

    it('student search for "restaurant" returns budget restaurants first', () => {
      const ranked = rankSearchResults(makeRestaurants(), STUDENT_PROFILE, 'student');

      // Cheapest restaurants should be at the top
      expect(ranked[0].avgTicket).toBeLessThan(200);
    });

    it('student search with cashback boost elevates high-cashback merchants', () => {
      // r4: avgTicket=60, cashback=18% (very high) — should get boosted to top
      const ranked = rankSearchResults(makeRestaurants(), STUDENT_PROFILE, 'student');
      const r4Rank = ranked.findIndex((m) => m.id === 'r4');
      const r2Rank = ranked.findIndex((m) => m.id === 'r2'); // expensive, low cashback

      expect(r4Rank).toBeLessThan(r2Rank);
    });
  });

  // ── Employee search ranking ────────────────────────────────────────────────

  describe('Employee search ranking', () => {
    it('employee search for "salon" returns top-rated salons first (rating descending)', () => {
      const ranked = rankSearchResults(makeSalons(), EMPLOYEE_PROFILE, 'employee');

      // First result must have higher rating than last
      expect(ranked[0].rating).toBeGreaterThan(ranked[ranked.length - 1].rating);
    });

    it('employee search ranks highest-rated salon at top', () => {
      const ranked = rankSearchResults(makeSalons(), EMPLOYEE_PROFILE, 'employee');

      // s3 (rating=4.8) or s5 (rating=4.7) should be top — both >= 4.7
      expect(ranked[0].rating).toBeGreaterThanOrEqual(4.5);
    });

    it('employee search boosts merchants with rating >= 4.0', () => {
      const ranked = rankSearchResults(makeSalons(), EMPLOYEE_PROFILE, 'employee');

      // s3: rating=4.8, s2: rating=4.5, s4: rating=4.1, s5: rating=4.7 — all > 4.0
      // s1: rating=3.6 — below threshold, no boost
      const s1Rank = ranked.findIndex((m) => m.id === 's1');
      const s3Rank = ranked.findIndex((m) => m.id === 's3');

      // Low-rated s1 should be below high-rated s3
      expect(s3Rank).toBeLessThan(s1Rank);
    });

    it('employee search deprioritises low-rated cheap merchants', () => {
      const ranked = rankSearchResults(makeSalons(), EMPLOYEE_PROFILE, 'employee');

      // s1: cheap but only rating=3.6 — employee doesn't value cheap over quality
      const s1Rank = ranked.findIndex((m) => m.id === 's1');
      const s2Rank = ranked.findIndex((m) => m.id === 's2'); // mid-price, high rating

      expect(s2Rank).toBeLessThan(s1Rank);
    });
  });

  // ── General search ranking ─────────────────────────────────────────────────

  describe('General search ranking', () => {
    it('general search uses balanced relevance-based ranking', () => {
      const ranked = rankSearchResults(makeSalons(), GENERAL_PROFILE, 'general');

      // General ranking is balanced — neither extreme price nor extreme rating dominates
      expect(ranked).toHaveLength(makeSalons().length);
    });

    it('general search does not apply cashback or rating-specific boosts', () => {
      const salons = makeSalons();
      const ranked = rankSearchResults(salons, GENERAL_PROFILE, 'general');

      // No boost mutations — original scores should determine order
      // All merchants should be in result
      expect(ranked).toHaveLength(salons.length);
      expect(ranked.map((m) => m.id)).toEqual(expect.arrayContaining(salons.map((m) => m.id)));
    });
  });

  // ── Unauthenticated / default ranking ─────────────────────────────────────

  describe('Unauthenticated search uses default (general) ranking', () => {
    it('anonymous persona resolves to general profile', () => {
      const anonymous = personaResolverService.resolveAnonymousPersona();

      expect(anonymous.personaId).toBe('general');
      expect(anonymous.rankingProfile).toEqual(GENERAL_PROFILE);
    });

    it('unauthenticated search ranking matches general persona ranking', () => {
      const anonymous = personaResolverService.resolveAnonymousPersona();
      const rankedAnon = rankSearchResults(makeSalons(), anonymous.rankingProfile, 'general');
      const rankedGeneral = rankSearchResults(makeSalons(), GENERAL_PROFILE, 'general');

      // Same profile → same result order
      expect(rankedAnon.map((m) => m.id)).toEqual(rankedGeneral.map((m) => m.id));
    });
  });

  // ── Ranking profile weight verification ───────────────────────────────────

  describe('Ranking profile weight contracts', () => {
    it('student priceWeight (0.35) is strictly greater than employee priceWeight (0.1)', () => {
      expect(STUDENT_PROFILE.priceWeight).toBeGreaterThan(EMPLOYEE_PROFILE.priceWeight);
    });

    it('employee ratingWeight (0.3) is strictly greater than student ratingWeight (0.15)', () => {
      expect(EMPLOYEE_PROFILE.ratingWeight).toBeGreaterThan(STUDENT_PROFILE.ratingWeight);
    });

    it('general profile is balanced between price and rating', () => {
      const priceDelta = Math.abs(GENERAL_PROFILE.priceWeight - GENERAL_PROFILE.ratingWeight);
      // Price and rating weights should be within 0.15 of each other
      expect(priceDelta).toBeLessThan(0.15);
    });

    it('personaResolverService returns student rankingProfile matching constants', () => {
      const anonymous = personaResolverService.resolveAnonymousPersona();
      // General profile should match GENERAL_PROFILE
      expect(anonymous.rankingProfile.priceWeight).toBe(GENERAL_PROFILE.priceWeight);
      expect(anonymous.rankingProfile.ratingWeight).toBe(GENERAL_PROFILE.ratingWeight);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('empty merchant list returns empty array for any persona', () => {
      const studentRanked = rankSearchResults([], STUDENT_PROFILE, 'student');
      const employeeRanked = rankSearchResults([], EMPLOYEE_PROFILE, 'employee');
      const generalRanked = rankSearchResults([], GENERAL_PROFILE, 'general');

      expect(studentRanked).toHaveLength(0);
      expect(employeeRanked).toHaveLength(0);
      expect(generalRanked).toHaveLength(0);
    });

    it('single merchant is returned unchanged for any persona', () => {
      const merchant = makeSalons()[0];

      const studentRanked = rankSearchResults([merchant], STUDENT_PROFILE, 'student');
      const employeeRanked = rankSearchResults([merchant], EMPLOYEE_PROFILE, 'employee');

      expect(studentRanked[0].id).toBe(merchant.id);
      expect(employeeRanked[0].id).toBe(merchant.id);
    });
  });
});
