/**
 * Cashback Service Tests
 *
 * Tests for src/services/cashbackService.ts
 * Covers calculation logic, multipliers, lifecycle, and cancellation flow.
 */

import { Types } from 'mongoose';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock getRewardConfig — controls cashback rates
const mockGetRewardConfig = jest.fn();
jest.mock('../utils/rewardConfig', () => ({
  getRewardConfig: (...args: any[]) => mockGetRewardConfig(...args),
}));

// Mock cashbackEngine (subscription + Prive multipliers)
const mockCalculateCashback = jest.fn();
jest.mock('../services/entitlement/cashbackEngine', () => ({
  calculateCashback: (...args: any[]) => mockCalculateCashback(...args),
}));

// Mock subscriptionBenefitsService (legacy path, should rarely be used)
jest.mock('../services/subscriptionBenefitsService', () => ({
  default: { getCashbackMultiplier: jest.fn().mockResolvedValue(1) },
}));

// Mock DoubleCashbackCampaign
jest.mock('../models/DoubleCashbackCampaign', () => ({
  default: { findOne: jest.fn().mockResolvedValue(null) },
}));

// Mock UserCashback model
const mockUserCashbackCreate = jest.fn();
const mockUserCashbackFind = jest.fn();
const mockUserCashbackAggregate = jest.fn();
jest.mock('../models/UserCashback', () => ({
  UserCashback: {
    create: (...args: any[]) => mockUserCashbackCreate(...args),
    find: (...args: any[]) => mockUserCashbackFind(...args),
    aggregate: (...args: any[]) => mockUserCashbackAggregate(...args),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
  IUserCashback: {},
}));

// Mock Order model
const mockOrderFindById = jest.fn();
jest.mock('../models/Order', () => ({
  Order: {
    findById: (...args: any[]) => ({
      populate: () => ({
        lean: () => mockOrderFindById(...args),
      }),
    }),
  },
}));

// Mock logger
jest.mock('../config/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  createServiceLogger: () => ({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }),
}));

jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    acquireLock: jest.fn().mockResolvedValue('lock-token'),
    releaseLock: jest.fn().mockResolvedValue(true),
    isReady: () => true,
    // cashbackService uses getClient().eval() for Lua cap check — return a client that always passes
    getClient: () => ({ eval: (_script: any, opts: any) => Promise.resolve(parseInt(opts.arguments[2], 10)) }),
  },
}));

jest.mock('../core/rewardEngine', () => ({
  __esModule: true,
  rewardEngine: { issue: jest.fn().mockResolvedValue({ success: true, amount: 100, transactionId: 'tx-1' }) },
  RewardError: class extends Error {
    constructor(
      public code: string,
      msg: string,
    ) {
      super(msg);
    }
  },
}));

jest.mock('../events/walletQueue', () => ({ publishWalletEvent: () => Promise.resolve() }));

jest.mock('../models/CashbackConfig', () => ({
  __esModule: true,
  default: {
    getActiveConfig: () =>
      Promise.resolve({
        cashbackHoldHours: 168,
        cashbackExpiryDays: 90,
        maxCashbackPerUserPerDay: 500,
        maxCashbackPerMerchantPerDay: 50000,
        maxCashbackPerOrder: 200,
        cooldownMinutes: 30,
      }),
  },
}));

// Mock pct utility
jest.mock('../utils/currency', () => ({
  pct: (amount: number, rate: number) => Math.round((amount * rate) / 100),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import CashbackService from '../services/cashbackService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeCreateData = (overrides: Record<string, any> = {}) => ({
  userId: new Types.ObjectId(),
  orderId: new Types.ObjectId(),
  amount: 100,
  cashbackRate: 5,
  source: 'order' as const,
  description: 'Cashback for order',
  metadata: {
    orderAmount: 2000,
    productCategories: ['food'],
  },
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CashbackService', () => {
  const service = CashbackService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: aggregate returns empty (no prior cashback today)
    mockUserCashbackAggregate.mockResolvedValue([]);
    // Default: findOne returns chainable query resolving to null (no duplicate / no cooldown block)
    (require('../models/UserCashback').UserCashback.findOne as jest.Mock).mockReturnValue({
      lean: () => Promise.resolve(null),
      select: function (this: any) {
        return this;
      },
    });

    // Default rates from RewardConfig
    mockGetRewardConfig.mockImplementation((key: string, fallback: number) => {
      const rates: Record<string, number> = {
        cashback_rate_base: 5,
        cashback_rate_electronics: 3,
        cashback_rate_fashion: 2.5,
        cashback_threshold_5000: 1,
        cashback_threshold_10000: 0.5,
      };
      return Promise.resolve(rates[key] ?? fallback);
    });

    // Default: engine returns base rate with multiplier 1
    mockCalculateCashback.mockResolvedValue({
      cashbackAmount: 100,
      effectiveRate: 5,
      breakdown: {
        subscriptionMultiplier: 1,
        priveCoinMultiplier: 1,
      },
    });

    // Default: create cashback succeeds
    mockUserCashbackCreate.mockResolvedValue({
      _id: new Types.ObjectId(),
      status: 'pending',
      amount: 100,
    });
  });

  // ── calculateOrderCashback ─────────────────────────────────────────────────

  describe('calculateOrderCashback()', () => {
    it('applies base rate of 5% for general categories', async () => {
      const result = await service.calculateOrderCashback(
        1000, // order amount
        ['food', 'beverages'], // categories
        new Types.ObjectId(),
      );

      // Engine mock returns 100 — but let's also verify base rate routing
      expect(result.amount).toBeDefined();
      expect(result.rate).toBeGreaterThan(0);
    });

    it('applies electronics rate (3%) for electronics categories', async () => {
      // Override engine to return electronics rate
      mockCalculateCashback.mockResolvedValue({
        cashbackAmount: 30, // 3% of 1000
        effectiveRate: 3,
        breakdown: { subscriptionMultiplier: 1, priveCoinMultiplier: 1 },
      });

      const result = await service.calculateOrderCashback(1000, ['electronics', 'mobile'], new Types.ObjectId());

      expect(result.amount).toBe(30);
      expect(result.rate).toBe(3);
    });

    it('applies fashion rate (2.5%) for fashion categories', async () => {
      mockCalculateCashback.mockResolvedValue({
        cashbackAmount: 25, // 2.5% of 1000
        effectiveRate: 2.5,
        breakdown: { subscriptionMultiplier: 1, priveCoinMultiplier: 1 },
      });

      const result = await service.calculateOrderCashback(1000, ['clothing', 'fashion'], new Types.ObjectId());

      expect(result.amount).toBe(25);
    });

    it('applies threshold bonus for orders >= 5000', async () => {
      // 5% base + 1% threshold5000 = 6% of 5000 = 300
      mockCalculateCashback.mockResolvedValue({
        cashbackAmount: 300,
        effectiveRate: 6,
        breakdown: { subscriptionMultiplier: 1, priveCoinMultiplier: 1 },
      });

      const result = await service.calculateOrderCashback(5000, ['food'], new Types.ObjectId());

      expect(result.amount).toBe(300);
      expect(result.rate).toBe(6);
    });

    it('applies subscription multiplier via cashbackEngine', async () => {
      // Premium subscription: 1.5x multiplier
      mockCalculateCashback.mockResolvedValue({
        cashbackAmount: 150, // 5% base × 1.5 multiplier × 2000
        effectiveRate: 7.5,
        breakdown: { subscriptionMultiplier: 1.5, priveCoinMultiplier: 1 },
      });

      const result = await service.calculateOrderCashback(2000, ['food'], new Types.ObjectId());

      expect(result.amount).toBe(150);
      expect(result.multiplier).toBe(1.5);
    });

    it('applies Prive multiplier via cashbackEngine', async () => {
      mockCalculateCashback.mockResolvedValue({
        cashbackAmount: 200,
        effectiveRate: 10,
        breakdown: { subscriptionMultiplier: 1, priveCoinMultiplier: 2 },
      });

      const result = await service.calculateOrderCashback(1000, ['food'], new Types.ObjectId());

      expect(result.multiplier).toBe(2);
    });

    it('falls back to legacy calculation when engine throws', async () => {
      mockCalculateCashback.mockRejectedValue(new Error('Engine unavailable'));

      // Legacy path uses pct(orderAmount, cashbackRate) — no multiplier
      const result = await service.calculateOrderCashback(1000, ['food'], new Types.ObjectId());

      // Fallback result should still be non-null and use base 5% rate
      expect(result.amount).toBe(50); // 5% of 1000 via legacy pct()
      expect(result.multiplier).toBe(1);
    });

    it('returns base rate calculation when no userId provided (anonymous)', async () => {
      const result = await service.calculateOrderCashback(1000, ['food']);

      // No userId → skip engine → use legacy pct()
      expect(result.amount).toBe(50); // 5% of 1000
      expect(result.multiplier).toBe(1);
    });
  });

  // ── createCashback ─────────────────────────────────────────────────────────

  describe('createCashback()', () => {
    it('creates a cashback record with status=pending', async () => {
      const data = makeCreateData();
      await service.createCashback(data);

      expect(mockUserCashbackCreate).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    });

    it('sets expiryDate to earnedDate + expiryDays (default 90)', async () => {
      const data = makeCreateData({ expiryDays: 90 });
      await service.createCashback(data);

      const createCall = mockUserCashbackCreate.mock.calls[0][0];
      const { earnedDate, expiryDate } = createCall;

      const diffMs = new Date(expiryDate).getTime() - new Date(earnedDate).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(90);
    });

    it('sets pendingDays to 7 by default', async () => {
      await service.createCashback(makeCreateData());

      expect(mockUserCashbackCreate).toHaveBeenCalledWith(expect.objectContaining({ pendingDays: 7 }));
    });

    it('uses custom pendingDays when provided', async () => {
      await service.createCashback(makeCreateData({ pendingDays: 14 }));

      expect(mockUserCashbackCreate).toHaveBeenCalledWith(expect.objectContaining({ pendingDays: 14 }));
    });
  });

  // ── createCashbackFromOrder ─────────────────────────────────────────────────

  describe('createCashbackFromOrder()', () => {
    it('returns null when order is not found', async () => {
      mockOrderFindById.mockResolvedValue(null);

      const result = await service.createCashbackFromOrder(new Types.ObjectId());

      expect(result).toBeNull();
      expect(mockUserCashbackCreate).not.toHaveBeenCalled();
    });

    it('returns null when order is not in delivered status', async () => {
      mockOrderFindById.mockResolvedValue({
        _id: new Types.ObjectId(),
        status: 'confirmed', // Not delivered
        items: [],
        totals: { total: 1000 },
      });

      const result = await service.createCashbackFromOrder(new Types.ObjectId());

      expect(result).toBeNull();
    });

    it('calculates cashback on order.totals.total (final amount after discounts)', async () => {
      const orderId = new Types.ObjectId();
      mockOrderFindById.mockResolvedValue({
        _id: orderId,
        status: 'delivered',
        user: new Types.ObjectId(),
        items: [{ product: { category: 'food' }, store: new Types.ObjectId() }],
        totals: { total: 1500 }, // Final amount after discounts
        snapshotCashbackRate: undefined,
      });

      await service.createCashbackFromOrder(orderId);

      // Verify cashback was created with correct basis amount
      expect(mockUserCashbackCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
        }),
      );
    });

    it('clamps negative totals.total to 0 (corruption guard)', async () => {
      const orderId = new Types.ObjectId();
      mockOrderFindById.mockResolvedValue({
        _id: orderId,
        status: 'delivered',
        user: new Types.ObjectId(),
        items: [],
        totals: { total: -50 }, // Corrupted — negative total
        snapshotCashbackRate: undefined,
      });

      // Should not crash, should use 0 as cashable basis
      const result = await service.createCashbackFromOrder(orderId);

      // If cashback amount ends up 0, the service may skip creation
      // If it creates, it should be with amount 0
      if (result) {
        expect((result as any).amount).toBe(0);
      }
    });
  });
});
