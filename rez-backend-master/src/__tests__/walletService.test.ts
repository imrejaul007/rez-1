/**
 * Wallet Service Tests
 *
 * Tests for src/services/walletService.ts
 * Uses mongodb-memory-server (via setup.ts) for real MongoDB atomicity tests.
 * Redis is mocked.
 */

import mongoose, { Types } from 'mongoose';

// ─── Mock Redis (all tests run without Redis) ────────────────────────────────
const mockAcquireLock = jest.fn();
const mockReleaseLock = jest.fn();
jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    acquireLock: (...args: any[]) => mockAcquireLock(...args),
    releaseLock: (...args: any[]) => mockReleaseLock(...args),
    isReady: () => true,
    // CoinTransaction.createTransaction calls these for cache invalidation
    del: () => Promise.resolve(1),
    delPattern: () => Promise.resolve(0),
    get: () => Promise.resolve(null),
    set: () => Promise.resolve('OK'),
  },
}));

// ─── Mock ledger (fire-and-forget, not under test here) ──────────────────────
jest.mock('../services/ledgerService', () => ({
  ledgerService: {
    recordEntry: jest.fn().mockResolvedValue('ledger-pair-id'),
    getPlatformAccountId: jest.fn().mockReturnValue(new Types.ObjectId()),
  },
}));

// Mock TransactionAuditLog
jest.mock('../models/TransactionAuditLog', () => ({
  logTransaction: jest.fn().mockResolvedValue(null),
}));

// Mock invalidateWalletCache — use plain functions so resetMocks: true doesn't break them
jest.mock('../services/walletCacheService', () => ({
  invalidateWalletCache: () => Promise.resolve(undefined),
  getCachedWalletConfig: () => Promise.resolve(null),
}));

// Mock walletMetrics — cover all exported counters/histograms/gauges
// Use plain functions (not jest.fn()) for timer so resetMocks: true doesn't clear startTimer return value
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

// Mock CoinExchangeRate
jest.mock('../models/CoinExchangeRate', () => ({
  getHistoricalCoinRate: jest.fn().mockResolvedValue(1),
}));

// Mock logger
jest.mock('../config/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  createServiceLogger: () => ({ info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }),
}));

// Mock walletQueue to prevent bullmq-connection from being loaded
jest.mock('../events/walletQueue', () => ({
  publishWalletEvent: () => Promise.resolve(),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import { walletService } from '../services/walletService';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createWalletWithBalance(userId: Types.ObjectId, balance: number) {
  // Use the model's createForUser if available, otherwise insert directly
  const wallet = await (Wallet as any).findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: {
        user: userId,
        balance: { total: balance, available: balance, pending: 0, cashback: 0 },
        coins: [{ type: 'rez', amount: balance, isActive: true }],
        statistics: {
          totalEarned: balance,
          totalSpent: 0,
          totalCashback: 0,
          totalRefunds: 0,
          totalTopups: 0,
          totalWithdrawals: 0,
        },
        isFrozen: false,
      },
    },
    { upsert: true, new: true },
  );
  return wallet;
}

const makeDebitParams = (userId: string, amount: number, overrides: Record<string, any> = {}) => ({
  userId,
  amount,
  source: 'order',
  description: 'Order payment deduction',
  operationType: 'purchase' as const,
  referenceId: new Types.ObjectId().toString(),
  referenceModel: 'Order',
  ...overrides,
});

const makeCreditParams = (userId: string, amount: number, overrides: Record<string, any> = {}) => ({
  userId,
  amount,
  source: 'cashback',
  description: 'Cashback credit',
  operationType: 'purchase_cashback' as const,
  referenceId: new Types.ObjectId().toString(),
  referenceModel: 'Order',
  ...overrides,
});

// ─── Test Suites ──────────────────────────────────────────────────────────────

describe('WalletService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Redis lock succeeds
    mockAcquireLock.mockResolvedValue('lock-token-abc');
    mockReleaseLock.mockResolvedValue(true);
  });

  // ── Credit ─────────────────────────────────────────────────────────────────

  describe('credit()', () => {
    it('increases balance by credited amount', async () => {
      const userId = new Types.ObjectId();
      await createWalletWithBalance(userId, 500);

      await walletService.credit(makeCreditParams(userId.toString(), 100));

      const wallet = await Wallet.findOne({ user: userId }).lean();
      expect((wallet as any)?.balance?.available).toBe(600);
    });

    it('throws for non-positive amount', async () => {
      const userId = new Types.ObjectId();
      await createWalletWithBalance(userId, 500);

      await expect(walletService.credit(makeCreditParams(userId.toString(), 0))).rejects.toThrow(
        'Amount must be positive',
      );

      await expect(walletService.credit(makeCreditParams(userId.toString(), -10))).rejects.toThrow(
        'Amount must be positive',
      );
    });

    it('creates wallet via upsert when wallet does not exist', async () => {
      const newUserId = new Types.ObjectId();

      // No wallet created for newUserId — credit should upsert-create it
      const result = await walletService.credit(makeCreditParams(newUserId.toString(), 200));

      expect(result.amount).toBe(200);
      const wallet = await Wallet.findOne({ user: newUserId }).lean();
      // Wallet should now exist (created during upsert)
      expect(wallet).not.toBeNull();
    });

    it('records a CoinTransaction for the credit', async () => {
      const userId = new Types.ObjectId();
      await createWalletWithBalance(userId, 500);

      await walletService.credit(makeCreditParams(userId.toString(), 75));

      const tx = await CoinTransaction.findOne({ user: userId.toString(), type: 'earned' });
      expect(tx).not.toBeNull();
      expect((tx as any)?.amount).toBe(75);
    });
  });

  // ── Debit ──────────────────────────────────────────────────────────────────

  describe('debit()', () => {
    it('decreases balance by debited amount', async () => {
      const userId = new Types.ObjectId();
      await createWalletWithBalance(userId, 500);

      await walletService.debit(makeDebitParams(userId.toString(), 100));

      const wallet = await Wallet.findOne({ user: userId }).lean();
      expect((wallet as any)?.balance?.available).toBe(400);
    });

    it('throws Insufficient balance when debit amount > available balance', async () => {
      const userId = new Types.ObjectId();
      await createWalletWithBalance(userId, 100);

      await expect(walletService.debit(makeDebitParams(userId.toString(), 200))).rejects.toThrow(/Insufficient/i);
    });

    it('does not go negative even under rapid concurrent debits', async () => {
      const userId = new Types.ObjectId();
      await createWalletWithBalance(userId, 100);

      // Fire 3 concurrent debits of 80 each — at most 1 should succeed
      const results = await Promise.allSettled([
        walletService.debit(makeDebitParams(userId.toString(), 80)),
        walletService.debit(makeDebitParams(userId.toString(), 80)),
        walletService.debit(makeDebitParams(userId.toString(), 80)),
      ]);

      const wallet = await Wallet.findOne({ user: userId }).lean();
      // Balance can be 20 (one debit succeeded) or 100 (all blocked) — never negative
      expect((wallet as any)?.balance?.available).toBeGreaterThanOrEqual(0);

      const succeeded = results.filter((r) => r.status === 'fulfilled');
      // At most one can succeed given balance of 100 and each debit is 80
      expect(succeeded.length).toBeLessThanOrEqual(1);
    });

    it('throws for non-positive amount', async () => {
      const userId = new Types.ObjectId();
      await createWalletWithBalance(userId, 500);

      await expect(walletService.debit(makeDebitParams(userId.toString(), 0))).rejects.toThrow(
        'Amount must be positive',
      );
    });

    it('records a CoinTransaction for the debit', async () => {
      const userId = new Types.ObjectId();
      await createWalletWithBalance(userId, 500);

      await walletService.debit(makeDebitParams(userId.toString(), 50));

      const tx = await CoinTransaction.findOne({ user: userId.toString(), type: 'spent' });
      expect(tx).not.toBeNull();
      expect((tx as any)?.amount).toBe(50);
    });
  });

  // ── Frozen wallet blocks all operations ───────────────────────────────────

  describe('Frozen wallet', () => {
    it('debit throws when wallet is frozen', async () => {
      const userId = new Types.ObjectId();

      await Wallet.findOneAndUpdate(
        { user: userId },
        {
          $set: {
            user: userId,
            isFrozen: true,
            frozenReason: 'Compliance hold',
            balance: { total: 500, available: 500, pending: 0, cashback: 0 },
            coins: [{ type: 'rez', amount: 500, isActive: true }],
          },
        },
        { upsert: true },
      );

      // The atomicWalletDebit $gte check against a frozen wallet should return no doc
      // Frozen flag prevents debit at MongoDB query level
      await expect(walletService.debit(makeDebitParams(userId.toString(), 100))).rejects.toThrow(
        /Insufficient|concurrent/i,
      );
    });
  });
});
