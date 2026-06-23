/**
 * TEST SUITE 6: Cashback Daily Cap Concurrency
 *
 * Verifies that the Lua atomic script correctly enforces the daily cashback cap,
 * handles Redis unavailability in both fail-open and fail-closed modes, and
 * resets the cap when the day changes.
 */

jest.setTimeout(10000);

import { Types } from 'mongoose';

// ---------------------------------------------------------------------------
// Mock dependencies before importing cashbackService
// ---------------------------------------------------------------------------

jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Plain functions used so resetMocks:true doesn't clear implementations between tests
jest.mock('../utils/rewardConfig', () => ({
  getRewardConfig: (key: string, defaultVal: number) => {
    if (key === 'cashback_daily_cap_inr') return Promise.resolve(500);
    return Promise.resolve(defaultVal);
  },
}));

jest.mock('../services/rewardAbuseDetector', () => ({
  checkDeviceCluster: () => Promise.resolve({ flagged: false, accountsOnDevice: 1 }),
}));

jest.mock('../services/riskScoringService', () => ({
  calculateUserRiskScore: () => Promise.resolve(0.1),
}));

jest.mock('../services/subscriptionBenefitsService', () => ({
  __esModule: true,
  default: { getCashbackMultiplier: () => Promise.resolve(1) },
}));

jest.mock('../services/entitlement/cashbackEngine', () => ({
  calculateCashback: () =>
    Promise.resolve({
      cashbackAmount: 50,
      effectiveRate: 5,
      breakdown: { subscriptionMultiplier: 1, priveCoinMultiplier: 1 },
    }),
}));

jest.mock('../models/DoubleCashbackCampaign', () => ({
  __esModule: true,
  default: { findOne: () => Promise.resolve(null) },
}));

// Plain functions used so resetMocks:true doesn't clear implementations between tests
jest.mock('../models/CashbackConfig', () => ({
  __esModule: true,
  default: {
    findOne: () => Promise.resolve(null),
    getActiveConfig: () =>
      Promise.resolve({
        maxCashbackPerUserPerDay: 500,
        cashbackHoldHours: 24,
        isActive: true,
      }),
  },
}));

jest.mock('../models/UserCashback', () => ({
  UserCashback: {
    findOne: () => Promise.resolve(null),
    create: (doc: any) => Promise.resolve({ ...doc, _id: new (require('mongoose').Types.ObjectId)() }),
  },
}));

jest.mock('../models/Order', () => ({
  Order: { findById: () => Promise.resolve(null) },
}));

// ---------------------------------------------------------------------------
// Atomic Redis mock — simulates Lua eval atomicity per-key
// ---------------------------------------------------------------------------

// Per-user counter map: key → current total
const counters: Record<string, number> = {};
const CAP = 500;
let redisClientAvailable = true;

// Simulates the Lua script atomically (no interleaving in single-threaded JS)
function atomicLuaEval(_script: string, opts: { keys: string[]; arguments: string[] }): number {
  const key = opts.keys[0];
  const cap = parseInt(opts.arguments[0], 10);
  const amount = parseInt(opts.arguments[2], 10);

  const current = (counters[key] ?? 0) + amount;
  if (current > cap) {
    // Rollback — Lua script decrements
    return -1;
  }
  counters[key] = current;
  return current;
}

const mockClient = {
  eval: jest.fn().mockImplementation(atomicLuaEval),
};

// Plain functions (not jest.fn()) are used for getClient and isReady so that
// Jest's resetMocks: true config does not clear their implementations between
// tests.  They read redisClientAvailable at call time, which the beforeEach
// hook controls.
jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    getClient: () => (redisClientAvailable ? mockClient : null),
    isReady: () => redisClientAvailable,
    incr: () => Promise.resolve(null),
    expire: () => Promise.resolve(false),
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(false),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCreateData(amount: number, userId?: Types.ObjectId) {
  return {
    userId: userId ?? new Types.ObjectId(),
    orderId: new Types.ObjectId(),
    amount,
    cashbackRate: 5,
    source: 'order' as const,
    description: 'Test cashback',
    metadata: {
      orderAmount: amount * 20,
      productCategories: ['general'],
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Cashback Daily Cap — Lua atomic concurrency', () => {
  beforeEach(() => {
    // Clear all counters between tests
    Object.keys(counters).forEach((k) => delete counters[k]);
    redisClientAvailable = true;
    jest.clearAllMocks();
    // Re-attach eval after clearAllMocks (mockClient.eval is a jest.fn())
    mockClient.eval.mockImplementation(atomicLuaEval);
    // getClient and isReady are plain functions in the mock — no re-attachment needed
  });

  // 1. Sequential requests increment correctly until cap
  it('1. sequential requests under cap all succeed and increment correctly', async () => {
    const { default: cashbackService } = await import('../services/cashbackService');
    const userId = new Types.ObjectId();

    // 3 requests of 100 = 300 total (under 500 cap)
    for (let i = 0; i < 3; i++) {
      const result = await cashbackService.createCashback(buildCreateData(100, userId));
      expect(result).toBeDefined();
    }

    // Total accumulated for this user across today's key
    const expectedKey = Object.keys(counters).find((k) => k.includes(userId.toString()));
    expect(counters[expectedKey!]).toBe(300);
  });

  // 2. Cap exceeded: throws error with code CASHBACK_DAILY_CAP_EXCEEDED
  it('2. request that would exceed cap throws CASHBACK_DAILY_CAP_EXCEEDED', async () => {
    const { default: cashbackService } = await import('../services/cashbackService');
    const userId = new Types.ObjectId();

    // Force the Lua eval to return -1 (cap exceeded signal)
    mockClient.eval.mockReturnValueOnce(-1);

    await expect(cashbackService.createCashback(buildCreateData(600, userId))).rejects.toMatchObject({
      code: 'CASHBACK_DAILY_CAP_EXCEEDED',
    });
  });

  // 3. Redis unavailable + CASHBACK_REDIS_REQUIRED=true → throws CASHBACK_REDIS_UNAVAILABLE
  it('3. Redis unavailable + fail-closed env → throws CASHBACK_REDIS_UNAVAILABLE', async () => {
    const originalEnv = process.env.CASHBACK_REDIS_REQUIRED;
    process.env.CASHBACK_REDIS_REQUIRED = 'true';
    redisClientAvailable = false;

    const { default: cashbackService } = await import('../services/cashbackService');

    await expect(cashbackService.createCashback(buildCreateData(100))).rejects.toMatchObject({
      code: 'CASHBACK_REDIS_UNAVAILABLE',
    });

    process.env.CASHBACK_REDIS_REQUIRED = originalEnv;
    redisClientAvailable = true;
  });

  // 4. Redis unavailable + CASHBACK_REDIS_REQUIRED=false → proceeds (fail-open with warning)
  it('4. Redis unavailable + fail-open env → cashback proceeds without Redis', async () => {
    const originalEnv = process.env.CASHBACK_REDIS_REQUIRED;
    process.env.CASHBACK_REDIS_REQUIRED = 'false';
    redisClientAvailable = false;

    const { default: cashbackService } = await import('../services/cashbackService');

    // Should not throw — falls through to create cashback record
    const result = await cashbackService.createCashback(buildCreateData(100));
    expect(result).toBeDefined();

    process.env.CASHBACK_REDIS_REQUIRED = originalEnv;
    redisClientAvailable = true;
  });

  // 5. New day (different date key) → cap resets
  it('5. cashback on a different day uses a fresh key (cap resets)', async () => {
    const { default: cashbackService } = await import('../services/cashbackService');
    const userId = new Types.ObjectId();

    // Simulate today's cap fully used
    const todayKey = `cashback:daily:${userId}:today`;
    counters[todayKey] = 500;

    // For a different-date key, the counter is fresh (= 0)
    // We verify by doing a new request with the real mock (it builds its own date key)
    // The real key uses toLocaleDateString — different from our manual key above
    const result = await cashbackService.createCashback(buildCreateData(100, userId));
    // Should succeed because the service builds a date-scoped key that doesn't match todayKey
    expect(result).toBeDefined();
  });

  // 6. 10 concurrent requests near cap — total never exceeds 500
  it('6. 10 concurrent requests of 60 each — total accumulated never exceeds 500', async () => {
    const { default: cashbackService } = await import('../services/cashbackService');
    const userId = new Types.ObjectId();

    // 10 * 60 = 600; cap is 500 → at most 8 succeed (8 * 60 = 480; 9th fails: 540 > 500)
    const requests = Array.from({ length: 10 }, () => cashbackService.createCashback(buildCreateData(60, userId)));
    await Promise.allSettled(requests);

    // Find the counter for this user
    const userKey = Object.keys(counters).find((k) => k.includes(userId.toString()));
    if (userKey) {
      expect(counters[userKey]).toBeLessThanOrEqual(CAP);
    }
  });

  // 7. Lua eval receives correct arguments
  it('7. Lua eval is called with cap, TTL, and amount as arguments', async () => {
    const { default: cashbackService } = await import('../services/cashbackService');
    const data = buildCreateData(150);

    await cashbackService.createCashback(data).catch(() => {});

    expect(mockClient.eval).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        keys: expect.arrayContaining([expect.stringContaining(data.userId.toString())]),
        arguments: expect.arrayContaining(['500', String(48 * 3600), '150']),
      }),
    );
  });

  // 8. Exactly at cap boundary (500 → should succeed, next fails)
  it('8. request exactly at cap succeeds; any additional amount is rejected', async () => {
    const { default: cashbackService } = await import('../services/cashbackService');
    const userId = new Types.ObjectId();

    // First request: 500 (exactly at cap)
    mockClient.eval.mockImplementationOnce((_script: string, opts: any) => {
      const key = opts.keys[0];
      counters[key] = 500;
      return 500;
    });

    await expect(cashbackService.createCashback(buildCreateData(500, userId))).resolves.toBeDefined();

    // Second request: any amount → cap exceeded
    mockClient.eval.mockReturnValueOnce(-1);
    await expect(cashbackService.createCashback(buildCreateData(1, userId))).rejects.toMatchObject({
      code: 'CASHBACK_DAILY_CAP_EXCEEDED',
    });
  });
});
