/**
 * TEST SUITE 1: Wallet-Ledger Pipeline Integration
 *
 * Verifies the financial integrity invariants between wallet mutations and
 * the double-entry ledger. All external dependencies (Redis, MongoDB) are
 * mocked to keep the tests fast and deterministic.
 */

jest.setTimeout(10000);

// ---------------------------------------------------------------------------
// Mocks — all external dependencies
// ---------------------------------------------------------------------------

// Metrics stubs — walletMetrics are imported at module init time.
// Plain functions prevent resetMocks: true from wiping implementations.
jest.mock('../../config/walletMetrics', () => ({
  walletTransactionTotal: { inc: () => {} },
  walletTransactionDuration: { startTimer: () => () => {} },
  walletWriteTotal: { inc: () => {} },
}));

jest.mock('../../config/logger', () => ({
  createServiceLogger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

jest.mock('@sentry/node', () => ({
  captureMessage: () => {},
  captureException: () => {},
}));

jest.mock('../../events/walletQueue', () => ({
  publishWalletEvent: () => Promise.resolve(undefined),
}));

jest.mock('../../models/CoinExchangeRate', () => ({
  getHistoricalCoinRate: () => Promise.resolve(0.1),
}));

jest.mock('../../models/TransactionAuditLog', () => ({
  logTransaction: () => undefined,
}));

// ---------------------------------------------------------------------------
// Wallet model mock — tracks balance in-memory
// ---------------------------------------------------------------------------
let walletBalance = 0;
let walletDoc: any = null;

const mockWallet = {
  findOne: jest.fn().mockImplementation(() => ({
    lean: jest
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          walletDoc
            ? { _id: 'wallet_id', user: 'user_id', balance: { total: walletBalance, available: walletBalance } }
            : null,
        ),
      ),
    select: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
  })),
  findOneAndUpdate: jest.fn().mockImplementation((_filter: any, update: any, opts: any) => {
    const incAvailable = update.$inc?.['balance.available'] ?? 0;
    const incTotal = update.$inc?.['balance.total'] ?? 0;
    walletBalance += incAvailable;
    walletDoc = { _id: 'wallet_id', user: 'user_id', balance: { total: walletBalance, available: walletBalance } };
    if (opts?.new) {
      return Promise.resolve({ ...walletDoc, lean: () => walletDoc });
    }
    return Promise.resolve(walletDoc);
  }),
  createForUser: jest.fn().mockResolvedValue({}),
};

jest.mock('../../models/Wallet', () => ({
  Wallet: mockWallet,
}));

// ---------------------------------------------------------------------------
// CoinTransaction mock — records balance snapshots
// Plain functions (not jest.fn()) so that Jest's resetMocks: true config does
// not clear their implementations between tests.
// ---------------------------------------------------------------------------
const coinTransactionLog: Array<{ type: string; amount: number; balance: number }> = [];

jest.mock('../../models/CoinTransaction', () => ({
  CoinTransaction: {
    createTransaction: (_userId: any, type: string, amount: number, _source: any, _desc: any, metadata: any) => {
      const balance = metadata?._postMutationBalance ?? walletBalance;
      const entry = { type, amount, balance, _id: new (require('mongoose').Types.ObjectId)() };
      coinTransactionLog.push(entry);
      return Promise.resolve(entry);
    },
  },
}));

// ---------------------------------------------------------------------------
// LedgerEntry mock — records double-entry pairs
// Plain functions so that resetMocks: true does not wipe implementations.
// Individual tests can override via LedgerEntry.insertMany = mockFn (see below).
// ---------------------------------------------------------------------------
const ledgerEntries: Array<{
  pairId: string;
  direction: string;
  amount: number;
  operationType: string;
  referenceId: string;
}> = [];
let duplicateReferenceIds = new Set<string>();

// Mutable handle so individual tests can swap insertMany via assignment
// (cannot use jest.fn() due to resetMocks: true config)
const defaultInsertManyImpl = (entries: any[]): Promise<any> => {
  for (const entry of entries) {
    const key = `${entry.referenceId}:${entry.operationType}:${entry.direction}`;
    if (duplicateReferenceIds.has(key)) {
      const err: any = new Error('Duplicate key');
      err.code = 11000;
      return Promise.reject(err);
    }
    duplicateReferenceIds.add(key);
    ledgerEntries.push(entry);
  }
  return Promise.resolve(entries);
};
let insertManyImpl: (entries: any[]) => Promise<any> = defaultInsertManyImpl;

jest.mock('../../models/LedgerEntry', () => ({
  LedgerEntry: {
    insertMany: (entries: any[], opts?: any) => insertManyImpl(entries),
    findOne: (_q: any) => ({
      lean: () => Promise.resolve(null),
      session: function (this: any) {
        return this;
      },
    }),
    find: () => Promise.resolve([]),
    aggregate: () => {
      const credits = ledgerEntries.filter((e) => e.direction === 'credit').reduce((s, e) => s + e.amount, 0);
      const debits = ledgerEntries.filter((e) => e.direction === 'debit').reduce((s, e) => s + e.amount, 0);
      return Promise.resolve([{ totalCredits: credits, totalDebits: debits }]);
    },
    countDocuments: () => Promise.resolve(0),
  },
}));

// ---------------------------------------------------------------------------
// Wallet cache service mock
// ---------------------------------------------------------------------------
jest.mock('../../services/walletCacheService', () => ({
  invalidateWalletCache: () => Promise.resolve(undefined),
}));

// ---------------------------------------------------------------------------
// Redis service mock — default: lock succeeds
// ---------------------------------------------------------------------------
let redisLockEnabled = true;

// The mock factory cannot reference module-level variables (they are undefined
// at factory-run time due to jest.mock hoisting).  Use a shared proxy object
// that is mutated by resetState() / tests so the factory closure stays valid.
// Plain functions (not jest.fn()) prevent resetMocks: true from wiping them.
jest.mock('../../services/redisService', () => ({
  __esModule: true,
  default: {
    // The implementations read from the outer `redisLockEnabled` via closure
    // at CALL time, not at factory registration time.
    acquireLock: (..._args: any[]) => (redisLockEnabled ? Promise.resolve('lock-token-abc') : Promise.resolve(null)),
    releaseLock: () => Promise.resolve(true),
    getClient: () => null,
  },
}));

// ---------------------------------------------------------------------------
// Mongoose mock
// ---------------------------------------------------------------------------
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    Types: actual.Types,
  };
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { Types } from 'mongoose';
import { walletService } from '../../services/walletService';
import { ledgerService } from '../../services/ledgerService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeParams(overrides: Partial<any> = {}) {
  return {
    userId: new Types.ObjectId().toString(),
    amount: 100,
    source: 'test',
    description: 'Test credit',
    operationType: 'loyalty_credit' as const,
    referenceId: `ref-${Date.now()}-${Math.random()}`,
    referenceModel: 'Order',
    ...overrides,
  };
}

function resetState() {
  walletBalance = 0;
  walletDoc = null;
  coinTransactionLog.length = 0;
  ledgerEntries.length = 0;
  duplicateReferenceIds = new Set();
  redisLockEnabled = true;
  insertManyImpl = defaultInsertManyImpl; // restore default implementation
  jest.clearAllMocks();
  // acquireLock, releaseLock, createTransaction, insertMany, etc. are plain
  // functions — no re-attachment needed
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Wallet-Ledger Pipeline Integration', () => {
  beforeEach(() => {
    resetState();
    // Re-wire findOneAndUpdate after reset — returns a chainable object with
    // .lean() so walletService's atomicWalletCreditReturning can do:
    //   await Wallet.findOneAndUpdate(..., { new: true }).lean()
    mockWallet.findOneAndUpdate.mockImplementation((_filter: any, update: any, _opts: any) => {
      const incAvailable = update.$inc?.['balance.available'] ?? 0;
      walletBalance += incAvailable;
      walletDoc = {
        _id: 'wallet_id',
        user: 'user_id',
        balance: { total: walletBalance, available: walletBalance },
        limits: {},
      };
      const result = walletDoc;
      // Return a chainable thenable with .lean() for compatibility with Mongoose Query API
      return {
        lean: jest.fn().mockResolvedValue(result),
        session: jest.fn().mockReturnThis(),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
      };
    });
    mockWallet.findOne.mockImplementation(() => ({
      lean: jest.fn().mockResolvedValue(walletDoc ? { ...walletDoc } : null),
      select: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
    }));
  });

  // 1. Credit creates a matching ledger entry (debit + credit pair)
  it('credit creates a matching double-entry ledger pair', async () => {
    // insertManyImpl is the plain-function slot; replace it for this test so
    // entries are captured in ledgerEntries (default impl already does this).
    // No override needed — the default insertManyImpl pushes to ledgerEntries.
    const params = makeParams({ amount: 200, referenceId: 'ref-credit-pair' });
    await walletService.credit(params);

    // Ledger service creates 1 debit + 1 credit entry per pair
    const debitEntries = ledgerEntries.filter((e) => e.direction === 'debit');
    const creditEntries = ledgerEntries.filter((e) => e.direction === 'credit');

    expect(debitEntries.length).toBeGreaterThanOrEqual(1);
    expect(creditEntries.length).toBeGreaterThanOrEqual(1);

    const debit = debitEntries[0];
    const credit = creditEntries[0];

    // Both legs must share the same pairId and amount
    expect(debit.pairId).toBe(credit.pairId);
    expect(debit.amount).toBe(credit.amount);
    expect(debit.amount).toBe(200);
  });

  // 2. Wallet balance equals ledger sum after 20 sequential transactions
  it('wallet balance equals ledger sum after 20 sequential credits', async () => {
    // Capture entries inserted by the default insertManyImpl into a local array
    const allLedger: typeof ledgerEntries = [];
    const origImpl = insertManyImpl;
    insertManyImpl = (entries: any[]) => {
      entries.forEach((e: any) => allLedger.push(e));
      return origImpl(entries);
    };

    const userId = new Types.ObjectId().toString();
    for (let i = 0; i < 20; i++) {
      await walletService.credit(makeParams({ userId, amount: 50, referenceId: `ref-seq-${i}` }));
    }

    insertManyImpl = origImpl; // restore

    // Wallet balance
    const expectedWalletBalance = 20 * 50;
    expect(walletBalance).toBe(expectedWalletBalance);

    // Ledger sum (credits for user_wallet minus debits for user_wallet)
    const userCreditLegs = allLedger.filter((e) => e.direction === 'credit');
    const ledgerSum = userCreditLegs.reduce((s, e) => s + e.amount, 0);

    expect(ledgerSum).toBe(expectedWalletBalance);
  });

  // 3. Concurrent credits produce correct balance with 0 drift
  it('10 concurrent credits produce the correct final balance (no drift)', async () => {
    const userId = new Types.ObjectId().toString();
    const AMOUNT = 100;
    const COUNT = 10;

    // Simulate serialized execution via the mock (real Redis lock would serialize in prod)
    // Each credit increments walletBalance atomically in the mock
    const results = await Promise.all(
      Array.from({ length: COUNT }, (_, i) =>
        walletService.credit(makeParams({ userId, amount: AMOUNT, referenceId: `ref-conc-${i}` })),
      ),
    );

    expect(results).toHaveLength(COUNT);
    expect(walletBalance).toBe(AMOUNT * COUNT);
  });

  // 4. Debit below zero is rejected
  it('debit when wallet has insufficient balance throws an error', async () => {
    // Wallet starts at 0; debit attempt with $gte guard fails (returns null).
    // Return a lean()-able chainable so the walletService's .lean() call works.
    mockWallet.findOneAndUpdate.mockImplementationOnce(() => ({
      lean: jest.fn().mockResolvedValue(null),
      session: jest.fn().mockReturnThis(),
      then: (resolve: any, reject: any) => Promise.resolve(null).then(resolve, reject),
    }));

    await expect(walletService.debit(makeParams({ amount: 500 }))).rejects.toThrow(/Insufficient wallet balance/);
  });

  // 5. Idempotency key prevents double-credit via ledger duplicate detection
  it('duplicate referenceId is handled idempotently (no second ledger entry created)', async () => {
    const capturedEntries: any[] = [];
    let callCount = 0;

    // Override insertManyImpl: first call captures entries, second simulates duplicate
    const origImpl = insertManyImpl;
    insertManyImpl = (entries: any[]) => {
      callCount++;
      if (callCount === 1) {
        entries.forEach((e: any) => capturedEntries.push(e));
        return Promise.resolve(entries);
      }
      // Second call — simulate duplicate key error so ledgerService falls back to findOne
      const err: any = new Error('Duplicate key');
      err.code = 11000;
      return Promise.reject(err);
    };

    // Override the LedgerEntry findOne to return existing pairId on idempotency path.
    // We access the mock module object directly and reassign findOne for this test.
    const { LedgerEntry } = require('../../models/LedgerEntry');
    const origFindOne = LedgerEntry.findOne;
    LedgerEntry.findOne = (_q: any) => ({
      lean: () => Promise.resolve({ pairId: 'existing-pair-id' }),
      session: function (this: any) {
        return this;
      },
    });

    const refId = 'idempotent-ref-001';

    await walletService.credit(makeParams({ referenceId: refId }));
    // Second call with same referenceId — ledger layer returns existing pairId
    await walletService.credit(makeParams({ referenceId: refId }));

    insertManyImpl = origImpl; // restore
    LedgerEntry.findOne = origFindOne; // restore

    // Only one batch of ledger entries was actually inserted
    expect(capturedEntries.length).toBe(2); // 1 debit + 1 credit from the first call only
  });

  // 6. Redis lock prevents stale balance snapshots
  it('when Redis lock is unavailable, credit is rejected (fail-closed)', async () => {
    // Setting redisLockEnabled to false makes the plain-function mock return null
    redisLockEnabled = false;

    await expect(walletService.credit(makeParams({ referenceId: 'ref-no-lock' }))).rejects.toMatchObject({
      code: 'WALLET_LOCK_UNAVAILABLE',
    });
  });

  // 7. Credit returns correct newBalance equal to post-mutation wallet balance
  it('credit result newBalance matches wallet balance after mutation', async () => {
    walletBalance = 300; // pre-existing balance
    walletDoc = { _id: 'w', user: 'u', balance: { total: 300, available: 300 }, limits: {} };

    const result = await walletService.credit(makeParams({ amount: 150, referenceId: 'ref-new-bal' }));

    expect(result.newBalance).toBe(450);
  });

  // 8. Amount <= 0 is rejected immediately
  it('credit with amount 0 throws "Amount must be positive"', async () => {
    await expect(walletService.credit(makeParams({ amount: 0 }))).rejects.toThrow('Amount must be positive');
  });

  it('credit with negative amount throws "Amount must be positive"', async () => {
    await expect(walletService.credit(makeParams({ amount: -50 }))).rejects.toThrow('Amount must be positive');
  });

  // 9. Debit with amount 0 is also rejected
  it('debit with amount 0 throws "Amount must be positive"', async () => {
    await expect(walletService.debit(makeParams({ amount: 0 }))).rejects.toThrow('Amount must be positive');
  });

  // 10. Ledger getAccountBalance aggregates credits minus debits
  it('ledgerService.getAccountBalance returns credits minus debits', async () => {
    // Seed ledgerEntries with known credits and debits so the plain aggregate
    // implementation returns the expected totals (1000 credits - 300 debits = 700)
    const fakeCredit = {
      pairId: 'p1',
      direction: 'credit',
      amount: 1000,
      operationType: 'loyalty_credit',
      referenceId: 'r1',
    };
    const fakeDebit = {
      pairId: 'p2',
      direction: 'debit',
      amount: 300,
      operationType: 'loyalty_credit',
      referenceId: 'r2',
    };
    ledgerEntries.push(fakeCredit, fakeDebit);

    const balance = await ledgerService.getAccountBalance(new Types.ObjectId());

    expect(balance).toBe(700);
  });

  // 11. recordEntry throws on missing required fields
  it('ledgerService.recordEntry throws when referenceId is empty', async () => {
    await expect(
      ledgerService.recordEntry({
        debitAccount: { type: 'platform_float', id: new Types.ObjectId() },
        creditAccount: { type: 'user_wallet', id: new Types.ObjectId() },
        amount: 100,
        operationType: 'loyalty_credit',
        referenceId: '   ', // blank
        referenceModel: 'Order',
      }),
    ).rejects.toThrow(/referenceId must be a non-empty string/);
  });
});
