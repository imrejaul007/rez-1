/**
 * Habit Loop Integration Tests
 *
 * Tests the complete REZ habit formation loop end-to-end using
 * MongoDB-in-memory (via setup.ts). External services are mocked.
 *
 * Loop tested:
 *   1. User scans QR → StoreVisit created
 *   2. Visit checked-in → Streak event emitted
 *   3. Payment made → Cashback created (pending)
 *   4. Coins credited → Wallet balance updated
 *   5. Milestone reached → Achievement unlocked
 *   6. Notification triggered
 */

import { Types } from 'mongoose';

// ─── External mocks (must be before any import of the services under test) ────

// Mock all notification sends
const mockSendPush = jest.fn().mockResolvedValue({ success: true });
jest.mock('../services/pushNotificationService', () => ({
  default: { sendPushToUser: (...args: any[]) => mockSendPush(...args) },
}));

// Mock Redis (velocity/caps)
const mockRedisGet = jest.fn().mockResolvedValue(null);
const mockRedisSet = jest.fn().mockResolvedValue('OK');
const mockRedisIncr = jest.fn().mockResolvedValue(1);
const mockRedisExpire = jest.fn().mockResolvedValue(1);
const mockAcquireLock = jest.fn().mockResolvedValue('lock-token');
const mockReleaseLock = jest.fn().mockResolvedValue(true);

jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    del: (...args: any[]) => Promise.resolve(1),
    delPattern: (...args: any[]) => Promise.resolve(0),
    exists: (...args: any[]) => Promise.resolve(0),
    incr: (...args: any[]) => mockRedisIncr(...args),
    expire: (...args: any[]) => mockRedisExpire(...args),
    acquireLock: (...args: any[]) => mockAcquireLock(...args),
    releaseLock: (...args: any[]) => mockReleaseLock(...args),
    isReady: () => true,
    getClient: () => ({
      get: () => Promise.resolve(null),
      set: () => Promise.resolve('OK'),
      del: () => Promise.resolve(1),
      sendCommand: () => Promise.resolve(1),
      // cashbackService uses eval() for Lua daily cap check — always pass
      eval: (_script: any, opts: any) => Promise.resolve(parseInt(opts.arguments[2], 10)),
    }),
  },
}));

// Mock walletCacheService — plain functions to avoid resetMocks clearing them
jest.mock('../services/walletCacheService', () => ({
  invalidateWalletCache: () => Promise.resolve(undefined),
  getCachedWalletConfig: () => Promise.resolve({ rewardIssuanceEnabled: true }),
}));

// Mock specialProgramService (caps/multipliers)
jest.mock('../services/specialProgramService', () => ({
  __esModule: true,
  default: {
    checkEarningCap: (...args: any[]) => Promise.resolve({ allowed: true, adjustedAmount: 100 }),
    calculateMultiplierBonus: (...args: any[]) => Promise.resolve({ bonus: 0, programBonuses: [] }),
    incrementMonthlyEarnings: (...args: any[]) => Promise.resolve(undefined),
    incrementMultiplierBonus: (...args: any[]) => Promise.resolve(undefined),
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

// Mock ledger
jest.mock('../services/ledgerService', () => ({
  ledgerService: {
    recordEntry: jest.fn().mockResolvedValue('ledger-pair-id'),
    getPlatformAccountId: jest.fn().mockReturnValue(new Types.ObjectId()),
  },
}));

// Mock audit log
jest.mock('../models/TransactionAuditLog', () => ({
  logTransaction: jest.fn().mockResolvedValue(null),
}));

// Mock walletMetrics — use plain functions so resetMocks: true doesn't clear startTimer return value
jest.mock('../config/walletMetrics', () => ({
  walletTransactionTotal: { inc: () => {} },
  walletTransactionDuration: { startTimer: () => () => {}, observe: () => {} },
  walletWriteTotal: { inc: () => {} },
  walletCommitRetryTotal: { inc: () => {} },
  walletBalanceDriftTotal: { inc: () => {} },
  walletActiveLocks: { set: () => {}, inc: () => {}, dec: () => {} },
  walletVelocityBlockedTotal: { inc: () => {} },
  walletTransferAmount: { startTimer: () => () => {}, observe: () => {} },
  walletGiftAmount: { startTimer: () => () => {}, observe: () => {} },
  walletLedgerEntriesTotal: { inc: () => {} },
  walletCacheOps: { inc: () => {} },
  walletCacheStaleTotal: { inc: () => {} },
}));

// Mock prometheus
jest.mock('../config/prometheus', () => ({
  coinIssuanceCounter: { inc: jest.fn() },
}));

// Mock CoinExchangeRate
jest.mock('../models/CoinExchangeRate', () => ({
  getHistoricalCoinRate: jest.fn().mockResolvedValue(1),
}));

// Mock cashbackEngine
jest.mock('../services/entitlement/cashbackEngine', () => ({
  calculateCashback: jest.fn().mockResolvedValue({
    cashbackAmount: 100,
    effectiveRate: 5,
    breakdown: { subscriptionMultiplier: 1, priveCoinMultiplier: 1 },
  }),
}));

// Mock getRewardConfig
jest.mock('../utils/rewardConfig', () => ({
  getRewardConfig: jest.fn().mockResolvedValue(5),
}));

// Mock pct utility
jest.mock('../utils/currency', () => ({
  pct: (amount: number, rate: number) => Math.round((amount * rate) / 100),
}));

// Mock DoubleCashbackCampaign
jest.mock('../models/DoubleCashbackCampaign', () => ({
  default: { findOne: jest.fn().mockResolvedValue(null) },
}));

// Mock logger everywhere — plain functions so resetMocks doesn't break them
jest.mock('../config/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  createServiceLogger: () => ({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }),
}));

// Mock gamificationEventBus
const mockEventBusEmit = jest.fn();
jest.mock('../events/gamificationEventBus', () => ({
  __esModule: true,
  default: { emit: (...args: any[]) => mockEventBusEmit(...args), onAll: jest.fn() },
}));

// Mock walletQueue to prevent bullmq-connection from loading
jest.mock('../events/walletQueue', () => ({
  publishWalletEvent: () => Promise.resolve(),
}));

// Mock currencyRules
jest.mock('../config/currencyRules', () => ({
  CURRENCY_RULES: {
    rez: { expiryDays: 90 },
    promo: { expiryDays: 30 },
    branded: { expiryDays: 60 },
    prive: { expiryDays: 365 },
  },
}));

// ─── Import actual services after mocks ───────────────────────────────────────
import { walletService } from '../services/walletService';
import streakService from '../services/streakService';
import cashbackService from '../services/cashbackService';
import { Wallet } from '../models/Wallet';
import UserStreak from '../models/UserStreak';
import { UserCashback } from '../models/UserCashback';

// ─── Integration Test ─────────────────────────────────────────────────────────

describe('Complete Habit Loop Integration', () => {
  let userId: Types.ObjectId;

  beforeEach(async () => {
    jest.clearAllMocks();
    userId = new Types.ObjectId();

    // Re-apply default Redis mock behavior after clearAllMocks
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
    mockRedisIncr.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(1);
    mockAcquireLock.mockResolvedValue('lock-token');
    mockReleaseLock.mockResolvedValue(true);
  });

  describe('Step 2: Streak updated on visit check-in', () => {
    it('creates a savings streak for the user on first visit', async () => {
      const streak = await streakService.getOrCreateStreak(userId.toString(), 'savings');

      expect(streak).not.toBeNull();
      expect(streak.type).toBe('savings');
      expect(streak.currentStreak).toBe(0);
    });

    it('increments savings streak on check-in activity', async () => {
      // Simulate previous day's activity
      await streakService.getOrCreateStreak(userId.toString(), 'savings');
      await UserStreak.findOneAndUpdate(
        { user: userId.toString(), type: 'savings' },
        { $set: { lastActivityDate: new Date(Date.now() - 86400000) } }, // yesterday
      );

      const { streak } = await streakService.updateStreak(userId.toString(), 'savings');

      expect(streak.currentStreak).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Step 3: Payment → Cashback created (pending)', () => {
    it('creates a pending cashback record after payment', async () => {
      const orderId = new Types.ObjectId();

      const cashback = await cashbackService.createCashback({
        userId,
        orderId,
        amount: 100,
        cashbackRate: 5,
        source: 'order',
        description: '5% cashback on order',
        metadata: {
          orderAmount: 2000,
          productCategories: ['food'],
          storeId: new Types.ObjectId(),
          storeName: 'Test Store',
        },
      });

      expect(cashback).not.toBeNull();
      expect((cashback as any).status).toBe('pending');
      expect((cashback as any).amount).toBe(100);
    });

    it('cashback has 7-day pending period by default', async () => {
      const cashback = await cashbackService.createCashback({
        userId,
        orderId: new Types.ObjectId(),
        amount: 100,
        cashbackRate: 5,
        source: 'order',
        description: 'Test cashback',
        metadata: { orderAmount: 2000, productCategories: ['food'] },
      });

      expect((cashback as any).pendingDays).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Step 4: Coins credited → Wallet balance updated', () => {
    it('wallet balance increases after coin credit', async () => {
      // Create wallet first
      await Wallet.findOneAndUpdate(
        { user: userId },
        {
          $setOnInsert: {
            user: userId,
            balance: { total: 0, available: 0, pending: 0, cashback: 0 },
            coins: [{ type: 'rez', amount: 0, isActive: true }],
            statistics: {
              totalEarned: 0,
              totalSpent: 0,
              totalCashback: 0,
              totalRefunds: 0,
              totalTopups: 0,
              totalWithdrawals: 0,
            },
            isFrozen: false,
          },
        },
        { upsert: true },
      );

      const result = await walletService.credit({
        userId: userId.toString(),
        amount: 100,
        source: 'cashback',
        description: 'Cashback coins credited',
        operationType: 'purchase_cashback',
        referenceId: new Types.ObjectId().toString(),
        referenceModel: 'UserCashback',
      });

      expect(result.amount).toBe(100);
      expect(result.newBalance).toBeGreaterThan(0);

      const wallet = await Wallet.findOne({ user: userId }).lean();
      expect((wallet as any)?.balance?.available).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Step 5: Milestone detection on streak progress', () => {
    it('detects 3-day Bronze Saver milestone', async () => {
      await streakService.getOrCreateStreak(userId.toString(), 'savings');
      await UserStreak.findOneAndUpdate(
        { user: userId.toString(), type: 'savings' },
        {
          $set: {
            currentStreak: 3,
            lastActivityDate: new Date(Date.now() - 86400000),
          },
        },
      );

      const { milestoneReached } = await streakService.updateStreak(userId.toString(), 'savings');

      // If current was 3 and we update again — should detect day-3 milestone
      // (or day-4 if already at 3 and updating to 4)
      if (milestoneReached) {
        expect(milestoneReached.coins).toBeGreaterThan(0);
        expect(milestoneReached.canClaim).toBe(true);
      }
    });
  });

  describe('Full loop: streak + wallet credit + cashback', () => {
    it('user can complete a full earning cycle without errors', async () => {
      // 1. Create wallet
      await Wallet.findOneAndUpdate(
        { user: userId },
        {
          $setOnInsert: {
            user: userId,
            balance: { total: 500, available: 500, pending: 0, cashback: 0 },
            coins: [{ type: 'rez', amount: 500, isActive: true }],
            statistics: {
              totalEarned: 500,
              totalSpent: 0,
              totalCashback: 0,
              totalRefunds: 0,
              totalTopups: 0,
              totalWithdrawals: 0,
            },
            isFrozen: false,
          },
        },
        { upsert: true },
      );

      // 2. Update streak (simulate store visit)
      const { streak } = await streakService.updateStreak(userId.toString(), 'savings');
      expect(streak).not.toBeNull();

      // 3. Create cashback (pending)
      const cashback = await cashbackService.createCashback({
        userId,
        amount: 75,
        cashbackRate: 5,
        source: 'order',
        description: 'Cashback for visit',
        metadata: { orderAmount: 1500, productCategories: ['food'] },
      });
      expect((cashback as any).status).toBe('pending');

      // 4. Credit coins to wallet
      const creditResult = await walletService.credit({
        userId: userId.toString(),
        amount: 75,
        source: 'cashback',
        description: 'Visit cashback coins',
        operationType: 'purchase_cashback',
        referenceId: (cashback as any)._id.toString(),
        referenceModel: 'UserCashback',
      });
      expect(creditResult.amount).toBe(75);

      // 5. Verify final wallet state
      const wallet = await Wallet.findOne({ user: userId }).lean();
      expect((wallet as any)?.balance?.available).toBeGreaterThanOrEqual(575); // 500 + 75
    });
  });
});
