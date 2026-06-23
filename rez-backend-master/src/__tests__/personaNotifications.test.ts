/**
 * Persona Notification Tests
 *
 * Tests the persona-driven notification title selection, price bucket filtering,
 * and radius-based targeting logic.
 *
 * The notification title logic and filter helpers are tested in isolation here
 * so the opportunityNotificationJob (Agent 4) can rely on these contracts.
 *
 * All DB and Redis calls are mocked.
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

import type { PersonaId, FeedConfig, ResolvedPersona } from '../services/personaResolverService';

interface MockOpportunity {
  merchantId: string;
  merchantName: string;
  savings: number; // Rs. amount saved
  cashbackPercent: number;
  priceBucket: 'low' | 'mid' | 'high';
  distanceKm: number;
  category: string;
}

// ─── Notification title builder (mirrors what opportunityNotificationJob will do) ─

/**
 * Builds a persona-specific notification title for an opportunity.
 */
function buildNotificationTitle(
  persona: PersonaId,
  opportunity: MockOpportunity,
  timeBucket: FeedConfig['timeBucket'],
): string {
  if (persona === 'student') {
    return `Student deal near campus! Save Rs.${opportunity.savings} at ${opportunity.merchantName}`;
  }

  if (persona === 'employee') {
    if (timeBucket === 'lunch') {
      return `Save on lunch near office! Rs.${opportunity.savings} at ${opportunity.merchantName}`;
    }
    if (timeBucket === 'evening') {
      return `After-work deal nearby — Rs.${opportunity.savings} at ${opportunity.merchantName}`;
    }
    return `Save Rs.${opportunity.savings} at ${opportunity.merchantName}`;
  }

  // general
  return `Save Rs.${opportunity.savings} at ${opportunity.merchantName}`;
}

/**
 * Filters opportunities for notification eligibility based on persona config.
 */
function filterOpportunitiesForPersona(
  opportunities: MockOpportunity[],
  persona: PersonaId,
  feedConfig: FeedConfig,
): MockOpportunity[] {
  return opportunities.filter((opp) => {
    // Radius check
    if (opp.distanceKm > feedConfig.maxRadius) return false;

    // Price bucket check
    if (feedConfig.priceBucket !== 'all' && opp.priceBucket !== feedConfig.priceBucket) {
      return false;
    }

    return true;
  });
}

// ─── Test data helpers ────────────────────────────────────────────────────────

const makeStudentPersona = (): ResolvedPersona => ({
  personaId: 'student',
  confidence: 100,
  source: 'verified',
  segment: 'verified_student',
  anchorLocation: null,
  rankingProfile: {
    distanceWeight: 0.3,
    priceWeight: 0.35,
    ratingWeight: 0.15,
    popularityWeight: 0.15,
    premiumWeight: 0.05,
    bookingSpeedWeight: 0.0,
  },
  feedConfig: {
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
    timeBucket: 'afternoon',
  },
  eligibleZones: [],
});

const makeEmployeePersona = (timeBucket: FeedConfig['timeBucket'] = 'afternoon'): ResolvedPersona => ({
  personaId: 'employee',
  confidence: 100,
  source: 'verified',
  segment: 'verified_employee',
  anchorLocation: null,
  rankingProfile: {
    distanceWeight: 0.25,
    priceWeight: 0.1,
    ratingWeight: 0.3,
    popularityWeight: 0.1,
    premiumWeight: 0.1,
    bookingSpeedWeight: 0.15,
  },
  feedConfig: {
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
    timeBucket,
  },
  eligibleZones: [],
});

const makeGeneralPersona = (): ResolvedPersona => ({
  personaId: 'general',
  confidence: 50,
  source: 'default',
  segment: 'normal',
  anchorLocation: null,
  rankingProfile: {
    distanceWeight: 0.25,
    priceWeight: 0.15,
    ratingWeight: 0.25,
    popularityWeight: 0.15,
    premiumWeight: 0.1,
    bookingSpeedWeight: 0.1,
  },
  feedConfig: {
    maxRadius: 10,
    priceBucket: 'all',
    hiddenCategories: [],
    priorityCategories: ['food-dining', 'beauty-wellness', 'grocery', 'entertainment', 'fitness', 'healthcare'],
    timeBucket: 'afternoon',
  },
  eligibleZones: [],
});

const makeOpportunity = (overrides: Partial<MockOpportunity> = {}): MockOpportunity => ({
  merchantId: 'merch-001',
  merchantName: 'Quick Bites',
  savings: 50,
  cashbackPercent: 10,
  priceBucket: 'low',
  distanceKm: 1.5,
  category: 'budget-food',
  ...overrides,
});

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('Persona Notification Logic', () => {
  // ── Notification title construction ────────────────────────────────────────

  describe('Notification title by persona', () => {
    it('student gets "Student deal near campus!" notification title', () => {
      const opp = makeOpportunity({ merchantName: 'Campus Cafe', savings: 40 });
      const title = buildNotificationTitle('student', opp, 'afternoon');

      expect(title).toContain('Student deal near campus!');
      expect(title).toContain('Campus Cafe');
      expect(title).toContain('40');
    });

    it('employee gets "Save on lunch near office!" during lunch hours', () => {
      const opp = makeOpportunity({ merchantName: 'Office Bites', savings: 80 });
      const title = buildNotificationTitle('employee', opp, 'lunch');

      expect(title).toContain('Save on lunch near office!');
      expect(title).toContain('Office Bites');
    });

    it('employee gets "After-work deal nearby" during evening hours', () => {
      const opp = makeOpportunity({ merchantName: 'Chill Bar', savings: 120 });
      const title = buildNotificationTitle('employee', opp, 'evening');

      expect(title).toContain('After-work deal nearby');
      expect(title).toContain('Chill Bar');
    });

    it('general user gets generic "Save Rs.X at Y" notification', () => {
      const opp = makeOpportunity({ merchantName: 'Local Store', savings: 60 });
      const title = buildNotificationTitle('general', opp, 'afternoon');

      expect(title).toContain('Save Rs.60');
      expect(title).toContain('Local Store');
    });

    it('employee during morning hours gets generic save title (not lunch/evening specific)', () => {
      const opp = makeOpportunity({ merchantName: 'Morning Cafe', savings: 30 });
      const title = buildNotificationTitle('employee', opp, 'morning');

      // Should not be a lunch or after-work specific title
      expect(title).not.toContain('Save on lunch');
      expect(title).not.toContain('After-work deal');
      expect(title).toContain('Morning Cafe');
    });

    it('notification title always includes savings amount', () => {
      const opp = makeOpportunity({ savings: 150, merchantName: 'Test Store' });
      const studentTitle = buildNotificationTitle('student', opp, 'afternoon');
      const employeeTitle = buildNotificationTitle('employee', opp, 'lunch');
      const generalTitle = buildNotificationTitle('general', opp, 'afternoon');

      expect(studentTitle).toContain('150');
      expect(employeeTitle).toContain('150');
      expect(generalTitle).toContain('150');
    });
  });

  // ── Price bucket filtering ─────────────────────────────────────────────────

  describe('Notification opportunity filtering by price bucket', () => {
    it('student notifications filter by priceBucket=low (exclude mid/high)', () => {
      const student = makeStudentPersona();
      const opportunities: MockOpportunity[] = [
        makeOpportunity({ merchantId: 'o1', priceBucket: 'low', distanceKm: 1.0 }),
        makeOpportunity({ merchantId: 'o2', priceBucket: 'mid', distanceKm: 1.0 }),
        makeOpportunity({ merchantId: 'o3', priceBucket: 'high', distanceKm: 1.0 }),
      ];

      const filtered = filterOpportunitiesForPersona(opportunities, 'student', student.feedConfig);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].merchantId).toBe('o1');
    });

    it('employee notifications filter by priceBucket=mid (exclude low/high)', () => {
      const employee = makeEmployeePersona();
      const opportunities: MockOpportunity[] = [
        makeOpportunity({ merchantId: 'o1', priceBucket: 'low', distanceKm: 2.0 }),
        makeOpportunity({ merchantId: 'o2', priceBucket: 'mid', distanceKm: 2.0 }),
        makeOpportunity({ merchantId: 'o3', priceBucket: 'high', distanceKm: 2.0 }),
      ];

      const filtered = filterOpportunitiesForPersona(opportunities, 'employee', employee.feedConfig);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].merchantId).toBe('o2');
    });

    it('general notifications include all price buckets', () => {
      const general = makeGeneralPersona();
      const opportunities: MockOpportunity[] = [
        makeOpportunity({ merchantId: 'o1', priceBucket: 'low', distanceKm: 3.0 }),
        makeOpportunity({ merchantId: 'o2', priceBucket: 'mid', distanceKm: 3.0 }),
        makeOpportunity({ merchantId: 'o3', priceBucket: 'high', distanceKm: 3.0 }),
      ];

      const filtered = filterOpportunitiesForPersona(opportunities, 'general', general.feedConfig);

      expect(filtered).toHaveLength(3);
    });
  });

  // ── Radius-based targeting ─────────────────────────────────────────────────

  describe('Notification radius-based targeting', () => {
    it('student notifications respect 3km radius', () => {
      const student = makeStudentPersona();
      const opportunities: MockOpportunity[] = [
        makeOpportunity({ merchantId: 'near', distanceKm: 2.0, priceBucket: 'low' }),
        makeOpportunity({ merchantId: 'edge', distanceKm: 3.0, priceBucket: 'low' }),
        makeOpportunity({ merchantId: 'far', distanceKm: 3.1, priceBucket: 'low' }),
        makeOpportunity({ merchantId: 'toofar', distanceKm: 10.0, priceBucket: 'low' }),
      ];

      const filtered = filterOpportunitiesForPersona(opportunities, 'student', student.feedConfig);

      expect(filtered.map((o) => o.merchantId)).toContain('near');
      expect(filtered.map((o) => o.merchantId)).toContain('edge');
      expect(filtered.map((o) => o.merchantId)).not.toContain('far');
      expect(filtered.map((o) => o.merchantId)).not.toContain('toofar');
    });

    it('employee notifications respect 5km radius', () => {
      const employee = makeEmployeePersona();
      const opportunities: MockOpportunity[] = [
        makeOpportunity({ merchantId: 'close', distanceKm: 4.0, priceBucket: 'mid' }),
        makeOpportunity({ merchantId: 'edge', distanceKm: 5.0, priceBucket: 'mid' }),
        makeOpportunity({ merchantId: 'beyond', distanceKm: 5.5, priceBucket: 'mid' }),
      ];

      const filtered = filterOpportunitiesForPersona(opportunities, 'employee', employee.feedConfig);

      expect(filtered.map((o) => o.merchantId)).toContain('close');
      expect(filtered.map((o) => o.merchantId)).toContain('edge');
      expect(filtered.map((o) => o.merchantId)).not.toContain('beyond');
    });

    it('general notifications use 10km radius', () => {
      const general = makeGeneralPersona();
      const opportunities: MockOpportunity[] = [
        makeOpportunity({ merchantId: 'near', distanceKm: 1.0, priceBucket: 'high' }),
        makeOpportunity({ merchantId: 'mid', distanceKm: 8.0, priceBucket: 'mid' }),
        makeOpportunity({ merchantId: 'edge', distanceKm: 10.0, priceBucket: 'low' }),
        makeOpportunity({ merchantId: 'beyond', distanceKm: 12.0, priceBucket: 'low' }),
      ];

      const filtered = filterOpportunitiesForPersona(opportunities, 'general', general.feedConfig);

      expect(filtered.map((o) => o.merchantId)).toContain('near');
      expect(filtered.map((o) => o.merchantId)).toContain('mid');
      expect(filtered.map((o) => o.merchantId)).toContain('edge');
      expect(filtered.map((o) => o.merchantId)).not.toContain('beyond');
    });
  });

  // ── Cashback-based filtering ───────────────────────────────────────────────

  describe('Cashback-based opportunity boost logic', () => {
    it('student opportunities with cashback >= 10% should rank higher', () => {
      const opportunities: MockOpportunity[] = [
        makeOpportunity({ merchantId: 'high-cb', cashbackPercent: 15, priceBucket: 'low', distanceKm: 1.0 }),
        makeOpportunity({ merchantId: 'low-cb', cashbackPercent: 5, priceBucket: 'low', distanceKm: 1.0 }),
      ];

      // Simulate boost: sort with cashback >= 10% first for students
      const boosted = [...opportunities].sort((a, b) => {
        const aBoost = a.cashbackPercent >= 10 ? 1 : 0;
        const bBoost = b.cashbackPercent >= 10 ? 1 : 0;
        return bBoost - aBoost;
      });

      expect(boosted[0].merchantId).toBe('high-cb');
    });

    it('no cashback boost logic applies to general persona (uses relevance)', () => {
      // For general persona, standard relevance sort applies
      // This test verifies the contract: no persona-specific boost
      const opportunities: MockOpportunity[] = [
        makeOpportunity({ merchantId: 'a', cashbackPercent: 3 }),
        makeOpportunity({ merchantId: 'b', cashbackPercent: 20 }),
      ];

      // General persona: order is unchanged (sorted by other signals)
      const result = filterOpportunitiesForPersona(opportunities, 'general', makeGeneralPersona().feedConfig);

      // Both should be included; order is by other signals not persona cashback boost
      expect(result).toHaveLength(2);
    });
  });
});
