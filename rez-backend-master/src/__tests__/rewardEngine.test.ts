/**
 * Reward Engine Tests
 *
 * Tests for the central reward issuance engine (src/core/rewardEngine.ts).
 * All MongoDB and Redis calls are mocked — no live infrastructure required.
 */

import { Types } from 'mongoose';

// ─── Mock all heavy dependencies first (before any import of rewardEngine) ───

// Mock Wallet model
const mockWalletFindOne = jest.fn();
jest.mock('../models/Wallet', () => ({
  Wallet: { findOne: (...args: any[]) => mockWalletFindOne(...args) },
}));

// Mock CoinTransaction model
const mockCoinTxFindOne = jest.fn();
const mockCoinTxCreate = jest.fn();
jest.mock('../models/CoinTransaction', () => ({
  CoinTransaction: {
    findOne: (...args: any[]) => mockCoinTxFindOne(...args),
    createTransaction: (...args: any[]) => mockCoinTxCreate(...args),
  },
}));

// Mock walletService
const mockWalletServiceCredit = jest.fn();
jest.mock('../services/walletService', () => ({
  walletService: { credit: (...args: any[]) => mockWalletServiceCredit(...args) },
}));

// Mock specialProgramService
const mockCheckEarningCap = jest.fn();
const mockCalculateMultiplierBonus = jest.fn();
const mockIncrementMonthlyEarnings = jest.fn();
const mockIncrementMultiplierBonus = jest.fn();
jest.mock('../services/specialProgramService', () => ({
  __esModule: true,
  default: {
    checkEarningCap: (...args: any[]) => mockCheckEarningCap(...args),
    calculateMultiplierBonus: (...args: any[]) => mockCalculateMultiplierBonus(...args),
    incrementMonthlyEarnings: (...args: any[]) => mockIncrementMonthlyEarnings(...args),
    incrementMultiplierBonus: (...args: any[]) => mockIncrementMultiplierBonus(...args),
  },
}));

// Mock Redis service
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisIncr = jest.fn();
const mockRedisExpire = jest.fn();
jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    incr: (...args: any[]) => mockRedisIncr(...args),
    expire: (...args: any[]) => mockRedisExpire(...args),
  },
}));

// Mock walletCacheService
const mockGetCachedWalletConfig = jest.fn();
jest.mock('../services/walletCacheService', () => ({
  getCachedWalletConfig: (...args: any[]) => mockGetCachedWalletConfig(...args),
}));

// Mock gamificationEventBus
jest.mock('../events/gamificationEventBus', () => ({
  __esModule: true,
  default: { emit: jest.fn() },
}));

// Mock ledgerService
jest.mock('../services/ledgerService', () => ({
  ledgerService: { recordEntry: jest.fn().mockResolvedValue('ledger-pair-id') },
}));

// Mock UserStreak (used for streak multiplier)
const mockUserStreakFindOne = jest.fn();
jest.mock('../models/UserStreak', () => ({
  default: {
    findOne: (...args: any[]) => ({
      select: () => ({
        lean: () => mockUserStreakFindOne(...args),
      }),
    }),
  },
}));

// Mock MerchantLiability
jest.mock('../models/MerchantLiability', () => ({
  MerchantLiability: { findOneAndUpdate: jest.fn().mockResolvedValue(null) },
}));

// Mock UserLoyalty
jest.mock('../models/UserLoyalty', () => ({
  UserLoyalty: { findOneAndUpdate: jest.fn().mockResolvedValue(null) },
}));

// Mock logger
jest.mock('../config/logger', () => ({
  createServiceLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock prometheus
jest.mock('../config/prometheus', () => ({
  coinIssuanceCounter: { inc: jest.fn() },
}));

// Mock CoinExchangeRate
jest.mock('../models/CoinExchangeRate', () => ({
  getHistoricalCoinRate: jest.fn().mockResolvedValue(1),
}));

// Mock config/currencyRules
jest.mock('../config/currencyRules', () => ({
  CURRENCY_RULES: {
    rez: { expiryDays: 90 },
    promo: { expiryDays: 30 },
    branded: { expiryDays: 60 },
    prive: { expiryDays: 365 },
  },
}));

// Mock walletMetrics — use plain functions so resetMocks: true doesn't clear startTimer return value
jest.mock('../config/walletMetrics', () => {
  const c = () => ({ inc: () => {} });
  const h = () => ({ startTimer: () => () => {}, observe: () => {} });
  const g = () => ({ set: () => {}, inc: () => {}, dec: () => {} });
  return {
    walletTransactionTotal: c(),
    walletTransactionDuration: h(),
    walletBalanceDriftTotal: c(),
    walletActiveLocks: g(),
    walletVelocityBlockedTotal: c(),
    walletTransferAmount: h(),
    walletGiftAmount: h(),
    walletLedgerEntriesTotal: c(),
    walletCacheOps: c(),
    walletWriteTotal: c(),
    walletCommitRetryTotal: c(),
    walletCacheStaleTotal: c(),
  };
});

// ─── Import after all mocks ──────────────────────────────────────────────────
import { RewardEngine, RewardError } from '../core/rewardEngine';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeRequest = (overrides: Record<string, any> = {}) => ({
  userId: new Types.ObjectId().toString(),
  amount: 100,
  rewardType: 'cashback' as const,
  source: 'order',
  description: 'Test cashback',
  operationType: 'purchase_cashback' as const,
  referenceId: new Types.ObjectId().toString(),
  referenceModel: 'Order',
  coinType: 'rez' as const,
  ...overrides,
});

const makeActiveWallet = (overrides: Record<string, any> = {}) => ({
  _id: new Types.ObjectId(),
  user: new Types.ObjectId(),
  isFrozen: false,
  balance: { available: 1000, total: 1000 },
  ...overrides,
});

// ─── Test Suites ─────────────────────────────────────────────────────────────

describe('RewardEngine', () => {
  let engine: RewardEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new RewardEngine();

    // Default: wallet exists, not frozen
    mockWalletFindOne.mockReturnValue({ lean: () => makeActiveWallet() });

    // Default: no duplicate in Redis or DB
    mockRedisGet.mockResolvedValue(null);
    mockCoinTxFindOne.mockReturnValue({ lean: () => null });

    // Default: daily cap not exceeded
    mockCheckEarningCap.mockResolvedValue({ allowed: true, adjustedAmount: 100 });

    // Default: no multiplier bonus
    mockCalculateMultiplierBonus.mockResolvedValue({ bonus: 0, programBonuses: [] });
    mockIncrementMonthlyEarnings.mockResolvedValue(undefined);
    mockIncrementMultiplierBonus.mockResolvedValue(undefined);

    // Default: no streak
    mockUserStreakFindOne.mockResolvedValue(null);

    // Default: wallet config has reward issuance enabled
    mockGetCachedWalletConfig.mockResolvedValue({ rewardIssuanceEnabled: true });

    // Default: credit succeeds
    mockWalletServiceCredit.mockResolvedValue({
      transactionId: new Types.ObjectId(),
      amount: 100,
      newBalance: 1100,
      source: 'order',
      description: 'Test cashback',
      category: null,
    });

    // Redis ops succeed silently
    mockRedisSet.mockResolvedValue('OK');
    mockRedisIncr.mockResolvedValue(100);
    mockRedisExpire.mockResolvedValue(1);
  });

  // ── Kill switch ────────────────────────────────────────────────────────────

  describe('Kill switch', () => {
    it('returns empty result when rewardIssuanceEnabled is false', async () => {
      mockGetCachedWalletConfig.mockResolvedValue({ rewardIssuanceEnabled: false });

      const result = await engine.issue(makeRequest());

      expect(result.success).toBe(true);
      expect(result.amount).toBe(0);
      expect(result.transactionId).toBeNull();
      // Wallet credit must NOT be called
      expect(mockWalletServiceCredit).not.toHaveBeenCalled();
    });

    it('proceeds normally when kill switch is enabled (true)', async () => {
      mockGetCachedWalletConfig.mockResolvedValue({ rewardIssuanceEnabled: true });

      const result = await engine.issue(makeRequest());

      expect(result.success).toBe(true);
      expect(result.amount).toBe(100);
      expect(mockWalletServiceCredit).toHaveBeenCalledTimes(1);
    });

    it('proceeds when config fetch throws (fail-open on config)', async () => {
      mockGetCachedWalletConfig.mockRejectedValue(new Error('Redis down'));

      const result = await engine.issue(makeRequest());

      // Should proceed — fail-open for config, fail-closed for cap
      expect(result.amount).toBe(100);
    });
  });

  // ── Daily cap enforcement ──────────────────────────────────────────────────

  describe('Daily cap enforcement', () => {
    it('rejects reward when daily cap is fully reached (adjustedAmount = 0)', async () => {
      mockCheckEarningCap.mockResolvedValue({
        allowed: false,
        adjustedAmount: 0,
        reason: 'Daily earning cap reached (1000 coins)',
      });

      const result = await engine.issue(makeRequest());

      expect(result.success).toBe(true);
      expect(result.amount).toBe(0);
      expect(result.cappedReason).toContain('Daily earning cap');
      expect(mockWalletServiceCredit).not.toHaveBeenCalled();
    });

    it('issues partial amount when cap allows a reduced amount', async () => {
      mockCheckEarningCap.mockResolvedValue({
        allowed: true,
        adjustedAmount: 50,
        reason: 'Partial — near daily cap',
      });
      mockWalletServiceCredit.mockResolvedValue({
        transactionId: new Types.ObjectId(),
        amount: 50,
        newBalance: 1050,
        source: 'order',
        description: 'Test',
        category: null,
      });

      const result = await engine.issue(makeRequest({ amount: 100 }));

      expect(result.amount).toBe(50);
      expect(result.cappedReason).toBe('Partial — near daily cap');
      expect(mockWalletServiceCredit).toHaveBeenCalledWith(expect.objectContaining({ amount: 50 }));
    });

    it('blocks reward when cap check service throws (fail-closed)', async () => {
      mockCheckEarningCap.mockRejectedValue(new Error('Cap service unavailable'));

      const result = await engine.issue(makeRequest());

      // Must return empty (fail-closed) — cannot let runaway inflation happen
      expect(result.amount).toBe(0);
      expect(mockWalletServiceCredit).not.toHaveBeenCalled();
    });

    it('skips cap when skipCap=true', async () => {
      const result = await engine.issue(makeRequest({ skipCap: true }));

      expect(mockCheckEarningCap).not.toHaveBeenCalled();
      expect(result.amount).toBe(100);
    });
  });

  // ── Idempotency ────────────────────────────────────────────────────────────

  describe('Idempotency (same source+userId+referenceId does not double-issue)', () => {
    it('returns cached result when Redis hit detects duplicate', async () => {
      const cachedResult = {
        success: true,
        transactionId: new Types.ObjectId().toString(),
        amount: 100,
        newBalance: 1100,
        source: 'order',
        description: 'Test cashback',
        category: null,
        idempotencyKey: 'cached-key',
        duplicate: false,
      };
      mockRedisGet.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await engine.issue(makeRequest());

      expect(result.duplicate).toBe(true);
      expect(result.amount).toBe(100);
      // No DB write should happen
      expect(mockWalletServiceCredit).not.toHaveBeenCalled();
    });

    it('returns duplicate=true when DB-level idempotency key found', async () => {
      mockRedisGet.mockResolvedValue(null); // Redis miss
      mockCoinTxFindOne.mockReturnValue({
        lean: () => ({
          _id: new Types.ObjectId(),
          amount: 100,
          balance: 1100,
        }),
      });

      const result = await engine.issue(makeRequest());

      expect(result.duplicate).toBe(true);
      expect(mockWalletServiceCredit).not.toHaveBeenCalled();
    });

    it('treats DB duplicate key error (E11000) from wallet credit as idempotent', async () => {
      mockCoinTxFindOne.mockReturnValue({ lean: () => null }); // No prior record
      const dupError = new Error('duplicate key error') as any;
      dupError.code = 11000;
      mockWalletServiceCredit.mockRejectedValue(dupError);

      const result = await engine.issue(makeRequest());

      expect(result.duplicate).toBe(true);
      expect(result.success).toBe(true);
    });
  });

  // ── Frozen wallet ──────────────────────────────────────────────────────────

  describe('Frozen wallet blocks reward', () => {
    it('throws WALLET_FROZEN when wallet is frozen', async () => {
      mockWalletFindOne.mockReturnValue({
        lean: () => makeActiveWallet({ isFrozen: true, frozenReason: 'Fraud review' }),
      });

      await expect(engine.issue(makeRequest())).rejects.toMatchObject({
        code: 'WALLET_FROZEN',
      });

      expect(mockWalletServiceCredit).not.toHaveBeenCalled();
    });

    it('proceeds when wallet is explicitly not frozen', async () => {
      mockWalletFindOne.mockReturnValue({
        lean: () => makeActiveWallet({ isFrozen: false }),
      });

      const result = await engine.issue(makeRequest());

      expect(result.amount).toBe(100);
    });
  });

  // ── Fraud-flagged user (isFraudFlagged) ───────────────────────────────────
  //
  // NOTE: The fraud flag is checked at a higher layer (rewardAbuseGuard middleware)
  // not inside rewardEngine.issue() itself. The engine checks wallet.isFrozen instead.
  // A user flagged for fraud should have their wallet frozen by the abuse system.
  // We test that the isFrozen path correctly blocks rewards.

  describe('Fraud-flagged path (wallet frozen by abuse system)', () => {
    it('blocks rewards when wallet is frozen with fraud reason', async () => {
      mockWalletFindOne.mockReturnValue({
        lean: () => makeActiveWallet({ isFrozen: true, frozenReason: 'Fraud detected' }),
      });

      await expect(engine.issue(makeRequest())).rejects.toMatchObject({
        code: 'WALLET_FROZEN',
      });
    });
  });

  // ── Coin types ─────────────────────────────────────────────────────────────

  describe('Coin type routing', () => {
    it('issues rez coins by default', async () => {
      await engine.issue(makeRequest({ coinType: 'rez' }));

      expect(mockWalletServiceCredit).toHaveBeenCalledWith(
        expect.objectContaining({ coinType: 'rez' }), // rez coin type in ledger
      );
    });

    it('issues promo coins when coinType=promo', async () => {
      await engine.issue(makeRequest({ coinType: 'promo' }));

      expect(mockWalletServiceCredit).toHaveBeenCalledWith(expect.objectContaining({ coinType: 'promo' }));
    });

    it('issues branded coins when coinType=branded', async () => {
      await engine.issue(makeRequest({ coinType: 'branded' }));

      expect(mockWalletServiceCredit).toHaveBeenCalledWith(expect.objectContaining({ coinType: 'branded' }));
    });
  });

  // ── Streak multiplier ──────────────────────────────────────────────────────

  describe('Streak multiplier applied to cashback earnings', () => {
    it('applies 5% bonus for Bronze Saver streak (1+ days)', async () => {
      mockUserStreakFindOne.mockResolvedValue({ currentStreak: 3 }); // 3 days = Bronze
      // Cap check must allow the streak-multiplied amount (100 * 1.05 = 105)
      mockCheckEarningCap.mockResolvedValue({ allowed: true, adjustedAmount: 105 });

      await engine.issue(makeRequest({ amount: 100, source: 'cashback' }));

      // With 5% bonus, adjusted amount should be 105
      expect(mockWalletServiceCredit).toHaveBeenCalledWith(expect.objectContaining({ amount: 105 }));
    });

    it('applies 10% bonus for Silver Saver streak (7+ days)', async () => {
      mockUserStreakFindOne.mockResolvedValue({ currentStreak: 10 }); // 10 days = Silver

      // Cap check needs to pass the higher amount
      mockCheckEarningCap.mockResolvedValue({ allowed: true, adjustedAmount: 110 });

      await engine.issue(makeRequest({ amount: 100, source: 'cashback' }));

      expect(mockWalletServiceCredit).toHaveBeenCalledWith(expect.objectContaining({ amount: 110 }));
    });

    it('does NOT apply streak multiplier to non-cashback sources', async () => {
      mockUserStreakFindOne.mockResolvedValue({ currentStreak: 30 }); // 30 days = Gold

      await engine.issue(makeRequest({ amount: 100, source: 'game_prize' }));

      // game_prize doesn't trigger streak multiplier — amount stays 100
      expect(mockWalletServiceCredit).toHaveBeenCalledWith(expect.objectContaining({ amount: 100 }));
    });

    it('skips multiplier when skipMultiplier=true', async () => {
      mockUserStreakFindOne.mockResolvedValue({ currentStreak: 30 }); // Gold tier

      await engine.issue(makeRequest({ amount: 100, source: 'cashback', skipMultiplier: true }));

      expect(mockWalletServiceCredit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 100 }), // No multiplier
      );
    });
  });

  // ── Zero / negative amount guard ───────────────────────────────────────────

  describe('Zero and negative amount guards', () => {
    it('returns empty result without wallet credit for amount=0', async () => {
      const result = await engine.issue(makeRequest({ amount: 0 }));

      expect(result.amount).toBe(0);
      expect(result.transactionId).toBeNull();
      expect(mockWalletServiceCredit).not.toHaveBeenCalled();
    });
  });
});
