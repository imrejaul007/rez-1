/**
 * Unit tests for the CPA attribution subscriber.
 *
 * Mocks every DB collaborator — no real Mongo. What we're verifying
 * is the decision logic: when is a payment a new-customer, when is
 * it a lapsed reactivation, when is it neither, and when does the
 * monthly cap suppress.
 *
 * Audit Round K note: the subscriber was updated to query BOTH
 * PosBill AND StorePayment in parallel (Hard Risk #1 fix). Tests
 * now mock both models; happy-path cases set PosBill to empty by
 * default so StorePayment-only cases still behave as before.
 *
 * ID fixtures use valid 24-char ObjectId hex because the subscriber
 * wraps merchantId/customerId in `new Types.ObjectId(...)` for the
 * PosBill `$match` stage — a non-hex string would otherwise throw.
 */

const mockStorePaymentAggregate = jest.fn();
jest.mock('../../../../models/StorePayment', () => ({
  StorePayment: { aggregate: (...args: unknown[]) => mockStorePaymentAggregate(...args) },
}));

const mockPosBillAggregate = jest.fn();
jest.mock('../../../../models/PosBill', () => ({
  PosBill: { aggregate: (...args: unknown[]) => mockPosBillAggregate(...args) },
}));

const mockPlanFindOne = jest.fn();
const mockPlanUpdate = jest.fn();
jest.mock('../../../../models/CpaPricingPlan', () => ({
  CpaPricingPlan: {
    findOne: (...args: unknown[]) => mockPlanFindOne(...args),
    updateOne: (...args: unknown[]) => mockPlanUpdate(...args),
  },
  DEFAULT_RATES: { newCustomerConversion: 50, lapsedReactivation: 20, scanConversion: 5 },
  DEFAULT_MONTHLY_CAP: 5000,
}));

const mockBillingCreate = jest.fn();
const mockBillingAggregate = jest.fn();
jest.mock('../../../../models/CpaBillingEvent', () => ({
  CpaBillingEvent: {
    create: (...args: unknown[]) => mockBillingCreate(...args),
    aggregate: (...args: unknown[]) => mockBillingAggregate(...args),
  },
}));

jest.mock('../../../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../../config/bullmq-connection', () => ({ bullmqRedis: {} }));

import { __testOnly } from '../cpaAttributionSubscriber';

const { processPaymentSettled, detectOutcome, getMode, LAPSED_DAYS } = __testOnly;

function lean<T>(v: T) {
  return { lean: async () => v };
}

// Valid 24-char ObjectId hex strings so `new Types.ObjectId(...)` in the
// subscriber's $match stage doesn't throw. These are deterministic
// fixtures — don't match any real data.
const M = '507f1f77bcf86cd799439011'; // merchantId
const U = '507f191e810c19729de860ea'; // customerId

const BASE_EVENT = {
  eventId: 'evt-1',
  eventType: 'payment.settled' as const,
  occurredAt: '2026-04-23T10:00:00.000Z',
  merchantId: M,
  customerId: U,
  paymentId: 'p1',
  orderId: 'o1',
  amount: 500,
  gateway: 'razorpay' as const,
};

const ORIG_MODE = process.env.CPA_PRICING_MODE;

beforeEach(() => {
  mockStorePaymentAggregate.mockReset();
  mockPosBillAggregate.mockReset();
  mockPlanFindOne.mockReset();
  mockPlanUpdate.mockReset();
  mockBillingCreate.mockReset();
  mockBillingAggregate.mockReset();
  process.env.CPA_PRICING_MODE = 'primary';

  // Default: no POS bills for this customer — most tests care only about
  // the StorePayment side. Specific tests override as needed.
  mockPosBillAggregate.mockResolvedValue([]);

  mockPlanFindOne.mockImplementation(() => ({
    lean: async () => ({
      merchantId: M,
      rates: { newCustomerConversion: 50, lapsedReactivation: 20, scanConversion: 5 },
      monthlyCap: 1000,
      isActive: true,
    }),
  }));
  mockBillingAggregate.mockResolvedValue([{ total: 100 }]);
  mockBillingCreate.mockResolvedValue({});
  mockPlanUpdate.mockResolvedValue({});
});

afterAll(() => {
  if (ORIG_MODE === undefined) delete (process.env as any).CPA_PRICING_MODE;
  else process.env.CPA_PRICING_MODE = ORIG_MODE;
});

// ─── getMode ─────────────────────────────────────────────────────────────────

describe('getMode', () => {
  it('defaults to off', () => {
    delete (process.env as any).CPA_PRICING_MODE;
    expect(getMode()).toBe('off');
  });
  it('accepts shadow / primary case-insensitively', () => {
    process.env.CPA_PRICING_MODE = 'SHADOW';
    expect(getMode()).toBe('shadow');
    process.env.CPA_PRICING_MODE = 'Primary';
    expect(getMode()).toBe('primary');
  });
  it('falls back to off for garbage', () => {
    process.env.CPA_PRICING_MODE = 'whatever';
    expect(getMode()).toBe('off');
  });
});

// ─── detectOutcome ───────────────────────────────────────────────────────────

describe('detectOutcome', () => {
  const eventAt = new Date('2026-04-23T10:00:00.000Z');

  it('returns new-customer-conversion when customer has no prior payments in either collection', async () => {
    mockStorePaymentAggregate.mockResolvedValueOnce([]);
    mockPosBillAggregate.mockResolvedValueOnce([]);
    const r = await detectOutcome(M, U, eventAt);
    expect(r?.kind).toBe('new-customer-conversion');
  });

  it('returns null for a StorePayment repeat within the lapsed window', async () => {
    mockStorePaymentAggregate.mockResolvedValueOnce([
      { lastAt: new Date('2026-04-01'), count: 3 },
    ]);
    mockPosBillAggregate.mockResolvedValueOnce([]);
    const r = await detectOutcome(M, U, eventAt);
    expect(r).toBeNull();
  });

  it('returns null for a POS-only repeat within the lapsed window', async () => {
    // Previously this would have wrongly fired new-customer-conversion
    // because only StorePayment was checked. Hard Risk #1 fix.
    mockStorePaymentAggregate.mockResolvedValueOnce([]);
    mockPosBillAggregate.mockResolvedValueOnce([
      { lastAt: new Date('2026-04-10'), count: 2 },
    ]);
    const r = await detectOutcome(M, U, eventAt);
    expect(r).toBeNull();
  });

  it('returns lapsed-reactivation when the most-recent of (POS, online) is >= LAPSED_DAYS ago', async () => {
    const longAgo = new Date(eventAt.getTime() - (LAPSED_DAYS + 5) * 24 * 3600 * 1000);
    mockStorePaymentAggregate.mockResolvedValueOnce([{ lastAt: longAgo, count: 8 }]);
    mockPosBillAggregate.mockResolvedValueOnce([]);
    const r = await detectOutcome(M, U, eventAt);
    expect(r?.kind).toBe('lapsed-reactivation');
  });

  it('uses the MOST RECENT last-visit across both collections (not the earliest)', async () => {
    // POS says last visit was 90 days ago (lapsed); online says last
    // visit was 10 days ago (not lapsed). Correct outcome: NOT lapsed,
    // because the customer visited online recently.
    const posOld = new Date(eventAt.getTime() - 90 * 24 * 3600 * 1000);
    const onlineRecent = new Date(eventAt.getTime() - 10 * 24 * 3600 * 1000);
    mockPosBillAggregate.mockResolvedValueOnce([{ lastAt: posOld, count: 2 }]);
    mockStorePaymentAggregate.mockResolvedValueOnce([{ lastAt: onlineRecent, count: 1 }]);
    const r = await detectOutcome(M, U, eventAt);
    expect(r).toBeNull();
  });

  it('returns null on aggregation error (fails closed)', async () => {
    mockStorePaymentAggregate.mockRejectedValueOnce(new Error('db down'));
    expect(await detectOutcome(M, U, eventAt)).toBeNull();
  });

  it('returns null if the ObjectId constructor rejects the input (malformed ID)', async () => {
    // Non-hex → new Types.ObjectId throws → caught in detectOutcome.
    const r = await detectOutcome('not-a-hex-id', 'also-not', eventAt);
    expect(r).toBeNull();
  });
});

// ─── processPaymentSettled ───────────────────────────────────────────────────

describe('processPaymentSettled', () => {
  it('mode=off: does nothing', async () => {
    process.env.CPA_PRICING_MODE = 'off';
    await processPaymentSettled(BASE_EVENT);
    expect(mockPlanFindOne).not.toHaveBeenCalled();
    expect(mockBillingCreate).not.toHaveBeenCalled();
  });

  it('skips anonymous payments (customerId=null)', async () => {
    await processPaymentSettled({ ...BASE_EVENT, customerId: null });
    expect(mockPlanFindOne).not.toHaveBeenCalled();
  });

  it('drops malformed events without writing a row', async () => {
    await processPaymentSettled({ ...BASE_EVENT, eventId: undefined });
    expect(mockPlanFindOne).not.toHaveBeenCalled();
    expect(mockBillingCreate).not.toHaveBeenCalled();
  });

  it('skips when plan is missing', async () => {
    mockPlanFindOne.mockImplementationOnce(() => lean(null));
    await processPaymentSettled(BASE_EVENT);
    expect(mockBillingCreate).not.toHaveBeenCalled();
  });

  it('skips when plan.isActive=false', async () => {
    mockPlanFindOne.mockImplementationOnce(() =>
      lean({
        rates: { newCustomerConversion: 50, lapsedReactivation: 20, scanConversion: 5 },
        monthlyCap: 1000,
        isActive: false,
      }),
    );
    await processPaymentSettled(BASE_EVENT);
    expect(mockBillingCreate).not.toHaveBeenCalled();
  });

  it('happy path new-customer (both collections empty): writes a billing row', async () => {
    mockStorePaymentAggregate.mockResolvedValueOnce([]);
    mockPosBillAggregate.mockResolvedValueOnce([]);
    await processPaymentSettled(BASE_EVENT);
    expect(mockBillingCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantId: M,
        kind: 'new-customer-conversion',
        amount: 50,
        customerId: U,
        sourceEventId: 'evt-1',
        shadow: false,
      }),
    );
  });

  it('does NOT bill new-customer when POS history exists (regression for Hard Risk #1)', async () => {
    mockStorePaymentAggregate.mockResolvedValueOnce([]);
    mockPosBillAggregate.mockResolvedValueOnce([
      { lastAt: new Date('2026-04-15'), count: 3 },
    ]);
    await processPaymentSettled(BASE_EVENT);
    expect(mockBillingCreate).not.toHaveBeenCalled();
  });

  it('shadow mode writes shadow:true', async () => {
    process.env.CPA_PRICING_MODE = 'shadow';
    mockStorePaymentAggregate.mockResolvedValueOnce([]);
    mockPosBillAggregate.mockResolvedValueOnce([]);
    await processPaymentSettled(BASE_EVENT);
    expect(mockBillingCreate).toHaveBeenCalledWith(
      expect.objectContaining({ shadow: true }),
    );
  });

  it('skips when outcome is null (ordinary repeat)', async () => {
    mockStorePaymentAggregate.mockResolvedValueOnce([
      { lastAt: new Date('2026-04-20'), count: 5 },
    ]);
    await processPaymentSettled(BASE_EVENT);
    expect(mockBillingCreate).not.toHaveBeenCalled();
  });

  it('skips in primary mode when monthly cap would be exceeded', async () => {
    mockStorePaymentAggregate.mockResolvedValueOnce([]);
    mockPosBillAggregate.mockResolvedValueOnce([]);
    mockBillingAggregate.mockResolvedValueOnce([{ total: 980 }]); // mtd 980 + 50 > 1000
    await processPaymentSettled(BASE_EVENT);
    expect(mockBillingCreate).not.toHaveBeenCalled();
  });

  it('bypasses cap check in shadow mode (shadow cohort is comparable)', async () => {
    process.env.CPA_PRICING_MODE = 'shadow';
    mockStorePaymentAggregate.mockResolvedValueOnce([]);
    mockPosBillAggregate.mockResolvedValueOnce([]);
    mockBillingAggregate.mockResolvedValueOnce([{ total: 9999 }]);
    await processPaymentSettled(BASE_EVENT);
    expect(mockBillingCreate).toHaveBeenCalled();
  });

  it('silently ignores duplicate billing (E11000)', async () => {
    mockStorePaymentAggregate.mockResolvedValueOnce([]);
    mockPosBillAggregate.mockResolvedValueOnce([]);
    const dup: any = new Error('dup');
    dup.code = 11000;
    mockBillingCreate.mockRejectedValueOnce(dup);
    await expect(processPaymentSettled(BASE_EVENT)).resolves.toBeUndefined();
  });

  it('never throws on plan-lookup errors', async () => {
    mockPlanFindOne.mockImplementationOnce(() => {
      throw new Error('mongo exploded');
    });
    await expect(processPaymentSettled(BASE_EVENT)).resolves.toBeUndefined();
    expect(mockBillingCreate).not.toHaveBeenCalled();
  });
});
