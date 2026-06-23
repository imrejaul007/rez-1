/**
 * Unit tests for cashbackSubscriber — mocked ProcessedEvent + walletService.
 *
 * No real Mongo (mongodb-memory-server would be overkill for a pure-logic
 * test); no real BullMQ (the worker wiring is simple enough to inspect by
 * reading — we test the handler body via the `__testOnly` export).
 *
 * Covers:
 *  - walk-in short-circuit (customerId null → no credit, no ProcessedEvent write)
 *  - happy path (first delivery → ProcessedEvent.create + walletService.credit called once)
 *  - idempotent redelivery (duplicate key on ProcessedEvent → skip; no credit)
 *  - zero-coin short-circuit (amount rounds to 0)
 *  - wallet-credit failure rolls back the ProcessedEvent (deleteOne called)
 *  - malformed event is dropped without throwing
 */

import { __testOnly } from '../cashbackSubscriber';

const { processOrderPlaced, baselineCoinsFor, getCashbackMode, PROCESSOR_KEY } = __testOnly;

// Default mode for every test in this file is 'primary' (full path).
// Mode-specific tests override in their own beforeEach.
const ORIGINAL_MODE = process.env.CANONICAL_CASHBACK_MODE;
beforeAll(() => {
  process.env.CANONICAL_CASHBACK_MODE = 'primary';
});
afterAll(() => {
  if (ORIGINAL_MODE === undefined) delete (process.env as any).CANONICAL_CASHBACK_MODE;
  else process.env.CANONICAL_CASHBACK_MODE = ORIGINAL_MODE;
});

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mockCreate = jest.fn();
const mockDeleteOne = jest.fn();

jest.mock('../../../../models/ProcessedEvent', () => ({
  __esModule: true,
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    deleteOne: (...args: unknown[]) => mockDeleteOne(...args),
  },
}));

const mockCredit = jest.fn();
jest.mock('../../../../services/walletService', () => ({
  walletService: {
    credit: (...args: unknown[]) => mockCredit(...args),
  },
}));

// Mock the logger to suppress console noise during tests (and to spy where useful).
jest.mock('../../../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the BullMQ connection (unused in these tests, but the subscriber module
// imports it at module scope).
jest.mock('../../../../config/bullmq-connection', () => ({
  bullmqRedis: {},
}));

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const VALID_EVENT = {
  eventId: 'evt-123',
  eventType: 'order.placed' as const,
  occurredAt: '2026-04-23T10:00:00.000Z',
  merchantId: 'merchant-abc',
  storeId: 'store-def',
  customerId: 'user-xyz',
  orderId: 'order-456',
  orderNumber: 'WEB-456',
  amount: 500,
  source: 'web' as const,
};

beforeEach(() => {
  mockCreate.mockReset();
  mockDeleteOne.mockReset();
  mockCredit.mockReset();
});

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('baselineCoinsFor', () => {
  it.each([
    [0, 0],
    [99.4, 99],
    [100, 100],
    [100.99, 100],
    [-50, 0], // negative amount returns 0 (floor of max(0, n))
  ])('amount %s → %s coins', (amount, expected) => {
    expect(baselineCoinsFor(amount)).toBe(expected);
  });
});

describe('processOrderPlaced', () => {
  it('walk-in order (customerId null) is a no-op — no ProcessedEvent write, no credit', async () => {
    await processOrderPlaced({ ...VALID_EVENT, customerId: null });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('first delivery — claims the event and credits the wallet', async () => {
    mockCreate.mockResolvedValueOnce({ _id: 'anything' });
    mockCredit.mockResolvedValueOnce({});

    await processOrderPlaced(VALID_EVENT);

    // Claim path
    expect(mockCreate).toHaveBeenCalledTimes(1);
    const claim = mockCreate.mock.calls[0][0];
    expect(claim.eventId).toBe(VALID_EVENT.eventId);
    expect(claim.processorKey).toBe(PROCESSOR_KEY);
    expect(claim.processedAt).toBeInstanceOf(Date);

    // Credit path
    expect(mockCredit).toHaveBeenCalledTimes(1);
    const creditArgs = mockCredit.mock.calls[0][0];
    expect(creditArgs.userId).toBe(VALID_EVENT.customerId);
    expect(creditArgs.amount).toBe(500);
    expect(creditArgs.source).toBe('cashback');
    expect(creditArgs.operationType).toBe('store_payment_reward');
    expect(creditArgs.referenceId).toBe(`canonical:${VALID_EVENT.eventId}`);
    expect(creditArgs.metadata.eventId).toBe(VALID_EVENT.eventId);
    expect(creditArgs.metadata.processor).toBe(PROCESSOR_KEY);
  });

  it('redelivered event (duplicate key) — skips credit', async () => {
    // Simulate Mongoose duplicate-key error on the unique (eventId, processorKey) index.
    const dup = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    mockCreate.mockRejectedValueOnce(dup);

    await processOrderPlaced(VALID_EVENT);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('zero-coin amount — no credit call even after claim', async () => {
    mockCreate.mockResolvedValueOnce({});

    await processOrderPlaced({ ...VALID_EVENT, amount: 0 });

    // NB: the subscriber claims before computing coins. Returning 0 from
    // baselineCoinsFor means we short-circuit AFTER the claim, which is
    // fine — the claim acts as a "we acknowledged this event" marker and
    // the TTL cleans it up 7 days later.
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('wallet-credit failure rolls back the ProcessedEvent so the next retry succeeds', async () => {
    mockCreate.mockResolvedValueOnce({});
    mockCredit.mockRejectedValueOnce(new Error('Wallet is temporarily unavailable'));
    mockDeleteOne.mockResolvedValueOnce({ deletedCount: 1 });

    await processOrderPlaced(VALID_EVENT);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCredit).toHaveBeenCalledTimes(1);
    expect(mockDeleteOne).toHaveBeenCalledTimes(1);
    const rollback = mockDeleteOne.mock.calls[0][0];
    expect(rollback).toEqual({
      eventId: VALID_EVENT.eventId,
      processorKey: PROCESSOR_KEY,
    });
  });

  it('wallet-credit failure + rollback failure — still does not throw', async () => {
    mockCreate.mockResolvedValueOnce({});
    mockCredit.mockRejectedValueOnce(new Error('Wallet down'));
    mockDeleteOne.mockRejectedValueOnce(new Error('Mongo also down'));

    // Must not throw — the subscriber is never-throws by contract.
    await expect(processOrderPlaced(VALID_EVENT)).resolves.toBeUndefined();
  });

  it('ProcessedEvent.create failing for a non-duplicate reason — logs and drops', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Mongo connection lost'));

    await expect(processOrderPlaced(VALID_EVENT)).resolves.toBeUndefined();
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it.each([
    [{}],
    [{ eventType: 'order.placed' }], // missing required fields
    [{ ...VALID_EVENT, amount: 'not-a-number' }], // wrong type
    [null],
    [undefined],
    ['a string'],
  ])('malformed event (%o) is dropped without throwing', async (bad) => {
    await expect(processOrderPlaced(bad)).resolves.toBeUndefined();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockCredit).not.toHaveBeenCalled();
  });
});

// ─── Mode gating (CANONICAL_CASHBACK_MODE) ─────────────────────────────────────

describe('CANONICAL_CASHBACK_MODE mode gating', () => {
  it.each([
    [undefined, 'off'],
    ['', 'off'],
    ['off', 'off'],
    ['shadow', 'shadow'],
    ['primary', 'primary'],
    ['SHADOW', 'shadow'], // case-insensitive
    ['Primary', 'primary'],
    ['nonsense', 'off'], // unrecognised → off
  ] as Array<[string | undefined, 'off' | 'shadow' | 'primary']>)(
    'env=%o → mode=%s',
    (envValue, expected) => {
      if (envValue === undefined) delete (process.env as any).CANONICAL_CASHBACK_MODE;
      else process.env.CANONICAL_CASHBACK_MODE = envValue;
      expect(getCashbackMode()).toBe(expected);
    }
  );

  it('mode=off: no envelope parse, no claim, no credit', async () => {
    process.env.CANONICAL_CASHBACK_MODE = 'off';
    // Even a valid event should be ignored — fast-path return.
    await processOrderPlaced(VALID_EVENT);
    // And a malformed one too — no parse, no log-dropping.
    await processOrderPlaced({ total: 'garbage' });
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('mode=shadow: claims the ledger, logs, but does NOT credit', async () => {
    process.env.CANONICAL_CASHBACK_MODE = 'shadow';
    mockCreate.mockResolvedValueOnce({});
    await processOrderPlaced(VALID_EVENT);
    // Claim IS persisted — we want idempotency ledger populated so a later
    // flip to 'primary' doesn't re-process historical events.
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCredit).not.toHaveBeenCalled();
  });

  it('mode=primary: claim + credit (parity with default test above)', async () => {
    process.env.CANONICAL_CASHBACK_MODE = 'primary';
    mockCreate.mockResolvedValueOnce({});
    mockCredit.mockResolvedValueOnce({});
    await processOrderPlaced(VALID_EVENT);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCredit).toHaveBeenCalledTimes(1);
  });
});
