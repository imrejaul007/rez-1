/**
 * Wallet Service — Frozen Wallet Tests (ITER24)
 *
 * Tests for src/services/walletService.ts
 *
 * ITER24 fix: the centralized `credit()` method had no `isFrozen` check.
 * A user under fraud/compliance review could still receive cashback and
 * loyalty credits, defeating the freeze.
 *
 * The fix:
 *   - New `allowOnFrozenWallet` flag (default false).
 *   - Refunds pass `allowOnFrozenWallet: true` — users have a legal right
 *     to their money back.
 *   - All other credit types (cashback, loyalty, sign-up bonus) reject
 *     frozen wallets with a logged alert.
 *
 * Note: the existing walletService.test.ts file covers general credit/debit
 * behavior. This file is focused specifically on the ITER24 frozen-wallet
 * bypass fix.
 */

import mongoose, { Types } from 'mongoose';

// ─── Mock Redis (all tests run without Redis) ───────────────────────────────
const mockAcquireLock = jest.fn();
const mockReleaseLock = jest.fn();
jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    acquireLock: (...args: any[]) => mockAcquireLock(...args),
    releaseLock: (...args: any[]) => mockReleaseLock(...args),
    isReady: () => true,
    del: () => Promise.resolve(1),
    delPattern: () => Promise.resolve(0),
    get: () => Promise.resolve(null),
    set: () => Promise.resolve('OK'),
  },
}));

jest.mock('../services/ledgerService', () => ({
  ledgerService: {
    recordEntry: jest.fn().mockResolvedValue('ledger-pair-id'),
    getPlatformAccountId: jest.fn().mockReturnValue(new Types.ObjectId()),
  },
}));

jest.mock('../models/TransactionAuditLog', () => ({
  logTransaction: jest.fn().mockResolvedValue(null),
}));

jest.mock('../services/walletCacheService', () => ({
  invalidateWalletCache: () => Promise.resolve(undefined),
  getCachedWalletConfig: () => Promise.resolve(null),
}));

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

jest.mock('../models/CoinExchangeRate', () => ({
  getHistoricalCoinRate: jest.fn().mockResolvedValue(1),
}));

// Track logged errors so we can verify the alert is fired
const loggedErrors: Array<{ args: any[] }> = [];
jest.mock('../config/logger', () => ({
  logger: {
    info: () => {}, warn: () => {},
    error: (...args: any[]) => loggedErrors.push({ args }),
    debug: () => {},
  },
  createServiceLogger: () => ({
    info: () => {}, warn: () => {},
    error: (...args: any[]) => loggedErrors.push({ args }),
    debug: () => {},
  }),
}));

jest.mock('../events/walletQueue', () => ({
  publishWalletEvent: () => Promise.resolve(),
}));

// ─── Import after mocks ──────────────────────────────────────────────────────
import { walletService } from './walletService';
import { Wallet as WalletModel } from '../models/Wallet';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createFrozenWallet(userId: Types.ObjectId, balance: number) {
  await (WalletModel as any).findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: {
        user: userId,
        balance: { total: balance, available: balance, pending: 0, cashback: 0 },
        coins: [{ type: 'rez', amount: balance, isActive: true }],
        statistics: {
          totalEarned: balance, totalSpent: 0, totalCashback: 0,
          totalRefunds: 0, totalTopups: 0, totalWithdrawals: 0,
        },
        isFrozen: true,
        frozenReason: 'Compliance hold',
      },
    },
    { upsert: true, new: true },
  );
}

async function createActiveWallet(userId: Types.ObjectId, balance: number) {
  await (WalletModel as any).findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: {
        user: userId,
        balance: { total: balance, available: balance, pending: 0, cashback: 0 },
        coins: [{ type: 'rez', amount: balance, isActive: true }],
        statistics: {
          totalEarned: balance, totalSpent: 0, totalCashback: 0,
          totalRefunds: 0, totalTopups: 0, totalWithdrawals: 0,
        },
        isFrozen: false,
      },
    },
    { upsert: true, new: true },
  );
}

const makeCreditParams = (userId: string, amount: number, overrides: Record<string, any> = {}) => ({
  userId,
  amount,
  source: 'cashback',
  description: 'Cashback credit',
  operationType: 'cashback' as const,
  referenceId: new Types.ObjectId().toString(),
  referenceModel: 'Order',
  ...overrides,
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('walletService (ITER24 frozen-wallet bypass fix)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loggedErrors.length = 0;
    mockAcquireLock.mockResolvedValue('lock-token-abc');
    mockReleaseLock.mockResolvedValue(true);
  });

  // ── 1. Happy path: credit works on active wallet ─────────────────────────

  it('credit() succeeds on an active wallet (no freeze)', async () => {
    const userId = new Types.ObjectId();
    await createActiveWallet(userId, 500);

    await walletService.credit(makeCreditParams(userId.toString(), 100));

    const wallet = await WalletModel.findOne({ user: userId }).lean();
    expect((wallet as any)?.balance?.available).toBe(600);
  });

  // ── 2. ITER24 attack scenario: cashback credit is REJECTED on frozen wallet

  it('credit() REJECTS cashback on a frozen wallet (ITER24 — no more bypass)', async () => {
    // ATTACK SCENARIO: a user under fraud review with a frozen wallet used
    // to be able to receive cashback credits, growing their balance while
    // supposedly locked out. The fix rejects non-refund credits.
    const userId = new Types.ObjectId();
    await createFrozenWallet(userId, 1000);

    await expect(
      walletService.credit(makeCreditParams(userId.toString(), 100))
    ).rejects.toThrow(/frozen or inactive/i);

    // Balance unchanged
    const wallet = await WalletModel.findOne({ user: userId }).lean();
    expect((wallet as any)?.balance?.available).toBe(1000);
  });

  // ── 3. ITER24: refund with allowOnFrozenWallet=true SUCCEEDS ─────────────

  it('credit() SUCCEEDS for refunds (allowOnFrozenWallet=true) on a frozen wallet', async () => {
    // Refunds MUST always process — users have a legal right to their money.
    const userId = new Types.ObjectId();
    await createFrozenWallet(userId, 500);

    await walletService.credit(
      makeCreditParams(userId.toString(), 200, { allowOnFrozenWallet: true, source: 'refund' })
    );

    const wallet = await WalletModel.findOne({ user: userId }).lean();
    expect((wallet as any)?.balance?.available).toBe(700);
  });

  // ── 4. ITER24: rejected credit fires a logged alert (for monitoring) ────

  it('credit() logs an error when refusing to credit a frozen wallet (security alert)', async () => {
    const userId = new Types.ObjectId();
    await createFrozenWallet(userId, 0);

    await expect(
      walletService.credit(makeCreditParams(userId.toString(), 50))
    ).rejects.toThrow();

    // The "🚨 [WalletService] Refusing credit to frozen/inactive wallet" log
    // must have been emitted for ops monitoring
    const allErrorMessages = loggedErrors
      .flatMap(({ args }) => args)
      .map(a => (typeof a === 'string' ? a : JSON.stringify(a)))
      .join(' | ');
    expect(allErrorMessages).toMatch(/Refusing credit/i);
  });

  // ── 5. Edge case: inactive wallet (isActive=false) is also rejected ─────

  it('credit() REJECTS on inactive wallet (isActive=false)', async () => {
    const userId = new Types.ObjectId();
    await (WalletModel as any).findOneAndUpdate(
      { user: userId },
      {
        $setOnInsert: {
          user: userId,
          balance: { total: 100, available: 100, pending: 0, cashback: 0 },
          coins: [{ type: 'rez', amount: 100, isActive: true }],
          statistics: {
            totalEarned: 100, totalSpent: 0, totalCashback: 0,
            totalRefunds: 0, totalTopups: 0, totalWithdrawals: 0,
          },
          isFrozen: false,
          isActive: false, // inactive
        },
      },
      { upsert: true, new: true },
    );

    await expect(
      walletService.credit(makeCreditParams(userId.toString(), 50))
    ).rejects.toThrow(/frozen or inactive/i);
  });

  // ── 6. Edge case: refund on inactive wallet still succeeds ──────────────

  it('credit() for refund SUCCEEDS even on inactive wallet when allowOnFrozenWallet=true', async () => {
    const userId = new Types.ObjectId();
    await (WalletModel as any).findOneAndUpdate(
      { user: userId },
      {
        $setOnInsert: {
          user: userId,
          balance: { total: 100, available: 100, pending: 0, cashback: 0 },
          coins: [{ type: 'rez', amount: 100, isActive: true }],
          statistics: {
            totalEarned: 100, totalSpent: 0, totalCashback: 0,
            totalRefunds: 0, totalTopups: 0, totalWithdrawals: 0,
          },
          isFrozen: false,
          isActive: false,
        },
      },
      { upsert: true, new: true },
    );

    await walletService.credit(
      makeCreditParams(userId.toString(), 50, { allowOnFrozenWallet: true, source: 'refund' })
    );

    const wallet = await WalletModel.findOne({ user: userId }).lean();
    expect((wallet as any)?.balance?.available).toBe(150);
  });

  // ── 7. Edge case: non-positive amount throws (unchanged behavior) ───────

  it('credit() throws for non-positive amount (edge case)', async () => {
    const userId = new Types.ObjectId();
    await createActiveWallet(userId, 500);

    await expect(
      walletService.credit(makeCreditParams(userId.toString(), 0))
    ).rejects.toThrow(/positive/i);
  });
});