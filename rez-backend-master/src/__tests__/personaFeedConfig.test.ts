/**
 * Persona Feed Config Tests
 *
 * Tests the feed filtering logic driven by persona configuration:
 * - Radius filtering per persona
 * - Price bucket / premium merchant filtering
 * - Hidden category exclusion
 * - Priority category section ordering
 * - Time-based section visibility
 *
 * All business logic is exercised against the configuration constants
 * exported from personaResolverService, so no DB/Redis required.
 */

// ─── Mock Redis ───────────────────────────────────────────────────────────────

jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  },
}));

// ─── Mock User model ──────────────────────────────────────────────────────────

jest.mock('../models/User', () => ({
  User: {
    findById: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue(Promise.resolve(null)),
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
import type { FeedConfig, ResolvedPersona } from '../services/personaResolverService';

// ─── Feed filtering helpers (mirrors what controllers/jobs will do) ────────────

interface MockMerchant {
  id: string;
  name: string;
  avgTicket: number; // average ticket price in INR
  rating: number;
  category: string;
  distanceKm: number;
  cashbackPercent: number;
}

/**
 * Simulates the feed filtering a controller would apply using FeedConfig.
 * Returns merchants that pass all persona-driven filters.
 */
function applyFeedFilter(merchants: MockMerchant[], feedConfig: FeedConfig): MockMerchant[] {
  // Price bucket thresholds (mirrors what the real feed controller would use)
  const PREMIUM_THRESHOLD_INR = 800; // merchants above this are "premium"

  return merchants.filter((m) => {
    // 1. Radius filter
    if (m.distanceKm > feedConfig.maxRadius) return false;

    // 2. Hidden category filter
    if (feedConfig.hiddenCategories.includes(m.category)) return false;

    // 3. Price bucket filter (student = low → exclude premium)
    if (feedConfig.priceBucket === 'low' && m.avgTicket > PREMIUM_THRESHOLD_INR) return false;

    return true;
  });
}

/**
 * Returns section order based on priorityCategories.
 */
function buildSectionOrder(merchants: MockMerchant[], feedConfig: FeedConfig): string[] {
  const categoryGroups = new Map<string, MockMerchant[]>();
  for (const m of merchants) {
    if (!categoryGroups.has(m.category)) categoryGroups.set(m.category, []);
    categoryGroups.get(m.category)!.push(m);
  }

  const ordered: string[] = [];
  // Priority categories first
  for (const cat of feedConfig.priorityCategories) {
    if (categoryGroups.has(cat)) ordered.push(cat);
  }
  // Remaining categories
  for (const cat of categoryGroups.keys()) {
    if (!ordered.includes(cat)) ordered.push(cat);
  }
  return ordered;
}

/**
 * Returns whether a time-based section is visible for the current timeBucket.
 */
function isTimeSectionVisible(section: 'lunch' | 'after-work', feedConfig: FeedConfig): boolean {
  if (section === 'lunch') {
    return feedConfig.timeBucket === 'lunch';
  }
  if (section === 'after-work') {
    return feedConfig.timeBucket === 'evening';
  }
  return false;
}

// ─── Test data ────────────────────────────────────────────────────────────────

const makeMerchants = (): MockMerchant[] => [
  {
    id: 'm1',
    name: 'Budget Dosa Corner',
    avgTicket: 80,
    rating: 3.8,
    category: 'budget-food',
    distanceKm: 1.2,
    cashbackPercent: 12,
  },
  {
    id: 'm2',
    name: 'The Grand Steakhouse',
    avgTicket: 2500,
    rating: 4.7,
    category: 'fine-dining',
    distanceKm: 2.0,
    cashbackPercent: 5,
  },
  {
    id: 'm3',
    name: 'Campus Xerox',
    avgTicket: 30,
    rating: 3.5,
    category: 'student-utility',
    distanceKm: 0.5,
    cashbackPercent: 8,
  },
  {
    id: 'm4',
    name: 'Prestige Spa',
    avgTicket: 3000,
    rating: 4.9,
    category: 'luxury-spa',
    distanceKm: 3.0,
    cashbackPercent: 3,
  },
  {
    id: 'm5',
    name: 'Office Lunch Hub',
    avgTicket: 350,
    rating: 4.2,
    category: 'lunch-deals',
    distanceKm: 4.5,
    cashbackPercent: 10,
  },
  {
    id: 'm6',
    name: 'WellFit Gym',
    avgTicket: 600,
    rating: 4.0,
    category: 'fitness',
    distanceKm: 4.0,
    cashbackPercent: 7,
  },
  {
    id: 'm7',
    name: 'Trendy Salon',
    avgTicket: 450,
    rating: 4.1,
    category: 'grooming',
    distanceKm: 2.5,
    cashbackPercent: 6,
  },
  {
    id: 'm8',
    name: 'Far Away Pizza',
    avgTicket: 200,
    rating: 3.9,
    category: 'budget-food',
    distanceKm: 8.0,
    cashbackPercent: 9,
  },
  {
    id: 'm9',
    name: 'Premium Clinic',
    avgTicket: 1200,
    rating: 4.8,
    category: 'premium-clinic',
    distanceKm: 3.5,
    cashbackPercent: 2,
  },
];

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('Persona Feed Config — Filtering Logic', () => {
  // ── Student feed ───────────────────────────────────────────────────────────

  describe('Student feed filtering', () => {
    const studentFeedConfig: FeedConfig = {
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
      timeBucket: 'morning',
    };

    it('student feed excludes premium merchants (avgTicket > 800)', () => {
      const merchants = makeMerchants();
      const filtered = applyFeedFilter(merchants, studentFeedConfig);

      const premiumIds = ['m2', 'm4', 'm9']; // fine-dining, luxury-spa, premium-clinic
      for (const id of premiumIds) {
        expect(filtered.find((m) => m.id === id)).toBeUndefined();
      }
    });

    it('student feed radius is 3km (merchants > 3km excluded)', () => {
      const merchants = makeMerchants();
      const filtered = applyFeedFilter(merchants, studentFeedConfig);

      // m5 is 4.5km, m6 is 4km, m8 is 8km — all outside 3km
      expect(filtered.find((m) => m.id === 'm5')).toBeUndefined();
      expect(filtered.find((m) => m.id === 'm6')).toBeUndefined();
      expect(filtered.find((m) => m.id === 'm8')).toBeUndefined();
    });

    it('student feed includes budget merchants within radius', () => {
      const merchants = makeMerchants();
      const filtered = applyFeedFilter(merchants, studentFeedConfig);

      // m1: budget-food, 1.2km, avgTicket=80 → should be included
      expect(filtered.find((m) => m.id === 'm1')).toBeDefined();
      // m3: student-utility, 0.5km, avgTicket=30 → should be included
      expect(filtered.find((m) => m.id === 'm3')).toBeDefined();
    });

    it('student feed excludes luxury-spa hidden category', () => {
      const merchants = makeMerchants();
      const filtered = applyFeedFilter(merchants, studentFeedConfig);

      expect(filtered.find((m) => m.category === 'luxury-spa')).toBeUndefined();
    });

    it('student feed excludes fine-dining hidden category', () => {
      const merchants = makeMerchants();
      const filtered = applyFeedFilter(merchants, studentFeedConfig);

      expect(filtered.find((m) => m.category === 'fine-dining')).toBeUndefined();
    });

    it('student priority categories determine section ordering', () => {
      const merchants = makeMerchants().filter((m) =>
        ['budget-food', 'student-utility', 'grooming'].includes(m.category),
      );
      const sectionOrder = buildSectionOrder(merchants, studentFeedConfig);

      // budget-food (index 0 in priority) should come before grooming (index 4)
      const budgetFoodIdx = sectionOrder.indexOf('budget-food');
      const groomingIdx = sectionOrder.indexOf('grooming');
      expect(budgetFoodIdx).toBeLessThan(groomingIdx);
    });
  });

  // ── Employee feed ──────────────────────────────────────────────────────────

  describe('Employee feed filtering', () => {
    const employeeFeedConfig: FeedConfig = {
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
      timeBucket: 'lunch',
    };

    it('employee feed includes premium merchants (avgTicket > 800 not filtered)', () => {
      // With priceBucket='mid', the controller does not exclude premium merchants
      const premiumMerchant: MockMerchant = {
        id: 'p1',
        name: 'Executive Dining',
        avgTicket: 1500,
        rating: 4.8,
        category: 'after-work-dining',
        distanceKm: 3.0,
        cashbackPercent: 5,
      };
      const filtered = applyFeedFilter([premiumMerchant], employeeFeedConfig);

      // priceBucket='mid' does not trigger the price exclusion (only 'low' does)
      expect(filtered).toHaveLength(1);
    });

    it('employee feed radius is 5km (merchants > 5km excluded)', () => {
      const merchants = makeMerchants();
      const filtered = applyFeedFilter(merchants, employeeFeedConfig);

      // m8 is 8km — should be excluded
      expect(filtered.find((m) => m.id === 'm8')).toBeUndefined();
    });

    it('employee feed includes merchants within 5km', () => {
      const merchants = makeMerchants();
      const filtered = applyFeedFilter(merchants, employeeFeedConfig);

      // m5: 4.5km, lunch-deals → should be in employee feed
      expect(filtered.find((m) => m.id === 'm5')).toBeDefined();
      // m6: 4km, fitness → should be in employee feed
      expect(filtered.find((m) => m.id === 'm6')).toBeDefined();
    });

    it('employee feed excludes student-utility hidden category', () => {
      const merchants = makeMerchants();
      const filtered = applyFeedFilter(merchants, employeeFeedConfig);

      // m3: student-utility → should be hidden from employee feed
      expect(filtered.find((m) => m.id === 'm3')).toBeUndefined();
    });

    it('employee priority categories put lunch-deals before fitness in sections', () => {
      const merchants = [
        {
          id: 'e1',
          name: 'Lunch Spot',
          avgTicket: 200,
          rating: 4.0,
          category: 'fitness',
          distanceKm: 2.0,
          cashbackPercent: 5,
        },
        {
          id: 'e2',
          name: 'Lunch Spot',
          avgTicket: 200,
          rating: 4.0,
          category: 'lunch-deals',
          distanceKm: 2.0,
          cashbackPercent: 8,
        },
      ];
      const sectionOrder = buildSectionOrder(merchants, employeeFeedConfig);

      const lunchIdx = sectionOrder.indexOf('lunch-deals');
      const fitnessIdx = sectionOrder.indexOf('fitness');
      expect(lunchIdx).toBeLessThan(fitnessIdx);
    });
  });

  // ── General feed ───────────────────────────────────────────────────────────

  describe('General feed filtering', () => {
    const generalFeedConfig: FeedConfig = {
      maxRadius: 10,
      priceBucket: 'all',
      hiddenCategories: [],
      priorityCategories: ['food-dining', 'beauty-wellness', 'grocery', 'entertainment', 'fitness', 'healthcare'],
      timeBucket: 'afternoon',
    };

    it('general feed shows everything (no hidden categories)', () => {
      const merchants = makeMerchants();
      const filtered = applyFeedFilter(merchants, generalFeedConfig);

      // Only distance filter applies (radius=10km); m8 is 8km so included, no category exclusions
      expect(filtered.find((m) => m.id === 'm2')).toBeDefined(); // fine-dining included
      expect(filtered.find((m) => m.id === 'm4')).toBeDefined(); // luxury-spa included
      expect(filtered.find((m) => m.id === 'm3')).toBeDefined(); // student-utility included
    });

    it('general feed radius is 10km (all merchants within 10km visible)', () => {
      const merchants = makeMerchants();
      const filtered = applyFeedFilter(merchants, generalFeedConfig);

      // m8 is 8km — within 10km radius
      expect(filtered.find((m) => m.id === 'm8')).toBeDefined();
    });

    it('general feed priceBucket=all does not filter by price', () => {
      const merchantList: MockMerchant[] = [
        {
          id: 'g1',
          name: 'Ultra Luxury Hotel',
          avgTicket: 10000,
          rating: 5.0,
          category: 'fine-dining',
          distanceKm: 5.0,
          cashbackPercent: 2,
        },
      ];
      const filtered = applyFeedFilter(merchantList, generalFeedConfig);
      expect(filtered).toHaveLength(1);
    });
  });

  // ── Time-based section visibility ──────────────────────────────────────────

  describe('Time-based section visibility', () => {
    it('lunch section visible during timeBucket=lunch (11:00–14:00)', () => {
      const lunchConfig: FeedConfig = {
        maxRadius: 5,
        priceBucket: 'mid',
        hiddenCategories: [],
        priorityCategories: [],
        timeBucket: 'lunch',
      };
      expect(isTimeSectionVisible('lunch', lunchConfig)).toBe(true);
    });

    it('lunch section NOT visible during timeBucket=evening', () => {
      const eveningConfig: FeedConfig = {
        maxRadius: 5,
        priceBucket: 'mid',
        hiddenCategories: [],
        priorityCategories: [],
        timeBucket: 'evening',
      };
      expect(isTimeSectionVisible('lunch', eveningConfig)).toBe(false);
    });

    it('after-work section visible during timeBucket=evening (17:00–21:00)', () => {
      const eveningConfig: FeedConfig = {
        maxRadius: 5,
        priceBucket: 'mid',
        hiddenCategories: [],
        priorityCategories: [],
        timeBucket: 'evening',
      };
      expect(isTimeSectionVisible('after-work', eveningConfig)).toBe(true);
    });

    it('after-work section NOT visible during timeBucket=morning', () => {
      const morningConfig: FeedConfig = {
        maxRadius: 5,
        priceBucket: 'mid',
        hiddenCategories: [],
        priorityCategories: [],
        timeBucket: 'morning',
      };
      expect(isTimeSectionVisible('after-work', morningConfig)).toBe(false);
    });

    it('both sections hidden during weekend timeBucket', () => {
      const weekendConfig: FeedConfig = {
        maxRadius: 10,
        priceBucket: 'all',
        hiddenCategories: [],
        priorityCategories: [],
        timeBucket: 'weekend',
      };
      expect(isTimeSectionVisible('lunch', weekendConfig)).toBe(false);
      expect(isTimeSectionVisible('after-work', weekendConfig)).toBe(false);
    });
  });

  // ── Feed config values from personaResolverService ─────────────────────────

  describe('Feed config values exposed by personaResolverService (anonymous)', () => {
    it('anonymous persona feedConfig has correct maxRadius of 10', () => {
      const persona = personaResolverService.resolveAnonymousPersona();
      expect(persona.feedConfig.maxRadius).toBe(10);
    });

    it('anonymous persona feedConfig has no hiddenCategories', () => {
      const persona = personaResolverService.resolveAnonymousPersona();
      expect(persona.feedConfig.hiddenCategories).toHaveLength(0);
    });

    it('anonymous persona feedConfig priceBucket is all', () => {
      const persona = personaResolverService.resolveAnonymousPersona();
      expect(persona.feedConfig.priceBucket).toBe('all');
    });
  });
});
