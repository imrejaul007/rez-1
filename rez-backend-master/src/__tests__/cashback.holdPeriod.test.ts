/**
 * Cashback Hold Period Tests
 *
 * Tests the trust-tier hold period logic in src/services/cashbackService.ts.
 *
 * Tier table (from getCashbackHoldHours):
 *   0 completed orders  → 168h (7 days)  — new user
 *   1–2 orders          →  72h (3 days)  — new returning
 *   3–9 orders          →  24h (1 day)   — regular
 *   10+ orders          →   4h           — trusted
 *
 * Covers:
 *  1. New user (0 orders) → 168h
 *  2. User with 1 order   →  72h
 *  3. User with 5 orders  →  24h
 *  4. User with 10+ orders →  4h
 *  5. holdHoursOverride bypasses trust tier
 */

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any imports
// ---------------------------------------------------------------------------

// Order model mock — countDocuments is the key method under test
const mockOrderCountDocuments = jest.fn();
jest.mock('../models/Order', () => ({
  Order: {
    countDocuments: (...args: any[]) => mockOrderCountDocuments(...args),
    findById: jest.fn().mockReturnValue({
      populate: () => ({ lean: () => Promise.resolve(null) }),
    }),
  },
}));

// UserCashback model mock
const mockUserCashbackCreate = jest.fn();
jest.mock('../models/UserCashback', () => ({
  UserCashback: {
    create: (...args: any[]) => mockUserCashbackCreate(...args),
    find: jest.fn().mockReturnValue({
      sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) }),
    }),
    aggregate: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
    findById: jest.fn().mockReturnValue({ lean: () => Promise.resolve(null) }),
    findByIdAndUpdate: jest.fn().mockResolvedValue(null),
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
  },
  IUserCashback: {},
}));

// CashbackConfig mock — use a much higher value (999) to distinguish from schema default (24)
// __esModule: true required for default import interop with ts-jest
jest.mock('../models/CashbackConfig', () => {
  return {
    __esModule: true,
    invalidateCashbackConfigCache: () => {},
    default: {
      getActiveConfig: () =>
        Promise.resolve({
          cashbackHoldHours: 999, // deliberately NOT 24 so test failures are obvious
          minOrderValue: 100,
          maxCashbackPerOrder: 200,
          maxCashbackPerUserPerDay: 500,
          cooldownMinutes: 30,
          isActive: true,
        }),
    },
  };
});

// getRewardConfig mock — plain function so resetMocks: true does not clear it
const mockGetRewardConfig = jest.fn();
jest.mock('../utils/rewardConfig', () => ({
  getRewardConfig: (key: string, defaultVal: number) => {
    if (key === 'cashback_daily_cap_inr') return Promise.resolve(500);
    return Promise.resolve(defaultVal ?? 5);
  },
}));

// cashbackEngine mock (subscription + Prive multipliers)
jest.mock('../services/entitlement/cashbackEngine', () => ({
  calculateCashback: jest.fn().mockResolvedValue({
    cashbackAmount: 50,
    effectiveRate: 5,
    breakdown: { subscriptionMultiplier: 1, priveCoinMultiplier: 1 },
  }),
}));

// subscriptionBenefitsService mock
jest.mock('../services/subscriptionBenefitsService', () => ({
  __esModule: true,
  default: { getCashbackMultiplier: jest.fn().mockResolvedValue(1) },
}));

// DoubleCashbackCampaign mock
jest.mock('../models/DoubleCashbackCampaign', () => ({
  __esModule: true,
  default: { findOne: jest.fn().mockResolvedValue(null) },
}));

// rewardAbuseDetector mock
jest.mock('../services/rewardAbuseDetector', () => ({
  checkDeviceCluster: jest.fn().mockResolvedValue({ flagged: false }),
}));

// riskScoringService mock
jest.mock('../services/riskScoringService', () => ({
  calculateUserRiskScore: jest.fn().mockResolvedValue({ score: 0, level: 'low' }),
}));

// Redis mock — default: Lua cap check returns 1 (under cap, proceed)
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockGetClient = jest.fn();
jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    acquireLock: jest.fn().mockResolvedValue('lock-token'),
    releaseLock: jest.fn().mockResolvedValue(true),
    isReady: () => true,
    getClient: (...args: any[]) => mockGetClient(...args),
  },
}));

// Logger mock
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createServiceLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import { Types } from 'mongoose';

// We import the module under test after mocks are registered
import cashbackService from '../services/cashbackService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ONE_HOUR_MS = 60 * 60 * 1000;

/** Build minimal CreateCashbackData for a test */
function buildCreateCashbackData(
  overrides: Partial<{
    holdHoursOverride: number;
    pendingDays: number;
  }> = {},
) {
  return {
    userId: new Types.ObjectId(),
    orderId: new Types.ObjectId(),
    amount: 50,
    cashbackRate: 5,
    source: 'order' as const,
    description: 'Test cashback',
    metadata: {
      orderAmount: 1000,
      productCategories: ['general'],
    },
    ...overrides,
  };
}

/** Build a mock cashback document returned by UserCashback.create */
function buildCashbackDoc(creditableAt: Date) {
  return {
    _id: new Types.ObjectId(),
    status: 'pending',
    creditableAt,
    amount: 50,
    cashbackRate: 5,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Cashback Hold Period (Trust Tier)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default Redis: Lua cap check client returns a value allowing the cashback
    const mockEval = jest.fn().mockResolvedValue(50); // under cap
    mockGetClient.mockReturnValue({ eval: mockEval });

    // Default cashback create — returns a generic doc
    mockUserCashbackCreate.mockImplementation((data: any) => Promise.resolve({ _id: new Types.ObjectId(), ...data }));
  });

  // -------------------------------------------------------------------------
  // 1. New user (0 orders) → 168h
  // -------------------------------------------------------------------------
  describe('1. New user (0 orders) → 168h hold', () => {
    it('sets creditableAt to approximately now + 168h for a user with 0 completed orders', async () => {
      mockOrderCountDocuments.mockResolvedValue(0);

      const before = Date.now();
      await cashbackService.createCashback(buildCreateCashbackData());

      expect(mockUserCashbackCreate).toHaveBeenCalledTimes(1);
      const callArg = mockUserCashbackCreate.mock.calls[0][0];

      const creditableAt: Date = callArg.creditableAt;
      const holdMs = creditableAt.getTime() - before;
      const holdHours = holdMs / ONE_HOUR_MS;

      // Allow ±2h tolerance for test execution time
      expect(holdHours).toBeGreaterThanOrEqual(166);
      expect(holdHours).toBeLessThanOrEqual(170);
    });
  });

  // -------------------------------------------------------------------------
  // 2. User with 1 order → 72h
  // -------------------------------------------------------------------------
  describe('2. User with 1 order → 72h hold', () => {
    it('sets creditableAt to approximately now + 72h for a user with 1 completed order', async () => {
      mockOrderCountDocuments.mockResolvedValue(1);

      const before = Date.now();
      await cashbackService.createCashback(buildCreateCashbackData());

      const callArg = mockUserCashbackCreate.mock.calls[0][0];
      const holdHours = (callArg.creditableAt.getTime() - before) / ONE_HOUR_MS;

      expect(holdHours).toBeGreaterThanOrEqual(70);
      expect(holdHours).toBeLessThanOrEqual(74);
    });

    it('also applies 72h for a user with 2 completed orders', async () => {
      mockOrderCountDocuments.mockResolvedValue(2);

      const before = Date.now();
      await cashbackService.createCashback(buildCreateCashbackData());

      const callArg = mockUserCashbackCreate.mock.calls[0][0];
      const holdHours = (callArg.creditableAt.getTime() - before) / ONE_HOUR_MS;

      expect(holdHours).toBeGreaterThanOrEqual(70);
      expect(holdHours).toBeLessThanOrEqual(74);
    });
  });

  // -------------------------------------------------------------------------
  // 3. User with 5 orders → 24h
  // -------------------------------------------------------------------------
  describe('3. User with 5 orders → 24h hold', () => {
    it('sets creditableAt to approximately now + 24h for a user with 5 completed orders', async () => {
      mockOrderCountDocuments.mockResolvedValue(5);

      const before = Date.now();
      await cashbackService.createCashback(buildCreateCashbackData());

      const callArg = mockUserCashbackCreate.mock.calls[0][0];
      const holdHours = (callArg.creditableAt.getTime() - before) / ONE_HOUR_MS;

      expect(holdHours).toBeGreaterThanOrEqual(22);
      expect(holdHours).toBeLessThanOrEqual(26);
    });

    it('applies 24h for any count in the range 3–9', async () => {
      for (const count of [3, 4, 7, 9]) {
        jest.clearAllMocks();
        const mockEval = jest.fn().mockResolvedValue(50);
        mockGetClient.mockReturnValue({ eval: mockEval });
        mockUserCashbackCreate.mockImplementation((data: any) =>
          Promise.resolve({ _id: new Types.ObjectId(), ...data }),
        );

        mockOrderCountDocuments.mockResolvedValue(count);

        const before = Date.now();
        await cashbackService.createCashback(buildCreateCashbackData());

        const callArg = mockUserCashbackCreate.mock.calls[0][0];
        const holdHours = (callArg.creditableAt.getTime() - before) / ONE_HOUR_MS;

        expect(holdHours).toBeGreaterThanOrEqual(22);
        expect(holdHours).toBeLessThanOrEqual(26);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 4. User with 10+ orders → 4h
  // -------------------------------------------------------------------------
  describe('4. User with 10+ orders → 4h hold (trusted)', () => {
    it('sets creditableAt to approximately now + 4h for a user with 10 completed orders', async () => {
      mockOrderCountDocuments.mockResolvedValue(10);

      const before = Date.now();
      await cashbackService.createCashback(buildCreateCashbackData());

      const callArg = mockUserCashbackCreate.mock.calls[0][0];
      const holdHours = (callArg.creditableAt.getTime() - before) / ONE_HOUR_MS;

      expect(holdHours).toBeGreaterThanOrEqual(2);
      expect(holdHours).toBeLessThanOrEqual(6);
    });

    it('applies 4h for high-order-count users (50 orders)', async () => {
      mockOrderCountDocuments.mockResolvedValue(50);

      const before = Date.now();
      await cashbackService.createCashback(buildCreateCashbackData());

      const callArg = mockUserCashbackCreate.mock.calls[0][0];
      const holdHours = (callArg.creditableAt.getTime() - before) / ONE_HOUR_MS;

      expect(holdHours).toBeGreaterThanOrEqual(2);
      expect(holdHours).toBeLessThanOrEqual(6);
    });
  });

  // -------------------------------------------------------------------------
  // 5. holdHoursOverride bypasses trust tier
  // -------------------------------------------------------------------------
  describe('5. holdHoursOverride bypasses trust-tier calculation', () => {
    it('uses holdHoursOverride (48h) regardless of order count', async () => {
      // High-trust user — would normally get 4h, but risk engine overrides to 48h
      mockOrderCountDocuments.mockResolvedValue(20);

      const OVERRIDE_HOURS = 48;
      const before = Date.now();

      await cashbackService.createCashback(buildCreateCashbackData({ holdHoursOverride: OVERRIDE_HOURS }));

      const callArg = mockUserCashbackCreate.mock.calls[0][0];
      const holdHours = (callArg.creditableAt.getTime() - before) / ONE_HOUR_MS;

      // Should be ~48h, NOT ~4h (trust tier for 20 orders)
      expect(holdHours).toBeGreaterThanOrEqual(46);
      expect(holdHours).toBeLessThanOrEqual(50);
    });

    it('uses holdHoursOverride (24h) for a new user (0 orders) — shorter than default 168h', async () => {
      mockOrderCountDocuments.mockResolvedValue(0);

      const OVERRIDE_HOURS = 24;
      const before = Date.now();

      await cashbackService.createCashback(buildCreateCashbackData({ holdHoursOverride: OVERRIDE_HOURS }));

      const callArg = mockUserCashbackCreate.mock.calls[0][0];
      const holdHours = (callArg.creditableAt.getTime() - before) / ONE_HOUR_MS;

      // Should be ~24h, NOT ~168h (new user default)
      expect(holdHours).toBeGreaterThanOrEqual(22);
      expect(holdHours).toBeLessThanOrEqual(26);
    });

    it('does NOT call Order.countDocuments when holdHoursOverride is provided', async () => {
      mockOrderCountDocuments.mockResolvedValue(0);

      await cashbackService.createCashback(buildCreateCashbackData({ holdHoursOverride: 12 }));

      // Trust-tier DB query should be bypassed entirely
      expect(mockOrderCountDocuments).not.toHaveBeenCalled();
    });
  });
});
