/**
 * emitOrderPlaced — unit tests
 *
 * Covers the five behaviours the monolith's order code paths rely on:
 *   1. A fully-populated ctx produces a schema-valid canonical event.
 *   2. `storeId: null` is accepted (aggregator orders).
 *   3. Missing customerId throws a ZodError at emit time (caller-bug path).
 *   4. BullMQ `queue.add` failing does NOT throw — fail-open contract.
 *   5. Repeated calls produce distinct eventIds (UUID uniqueness).
 */

// ─── Mocks (must be declared before the module under test is imported) ────────

// Capture BullMQ calls. By default `add` resolves; individual tests override
// it for the failure-path test case.
const fakeQueueAdd = jest.fn(async (..._args: unknown[]) => ({ id: 'mock-job' }));
const fakeQueueOn = jest.fn((..._args: unknown[]) => {});

jest.mock('bullmq', () => ({
  __esModule: true,
  Queue: jest.fn().mockImplementation(() => ({
    add: (...args: unknown[]) => fakeQueueAdd(...args),
    on: (...args: unknown[]) => fakeQueueOn(...args),
  })),
}));

// bullmq-connection creates a real IORedis at module load — stub it out so
// we don't even require the ioredis mock to kick in for this suite.
jest.mock('../../config/bullmq-connection', () => ({
  __esModule: true,
  bullmqRedis: {} as any,
}));

// Capture gamification bus emits.
const fakeBusEmit = jest.fn();
jest.mock('../gamificationEventBus', () => ({
  __esModule: true,
  default: {
    emit: (...args: unknown[]) => fakeBusEmit(...args),
  },
}));

// Silence logger noise — but keep warn/error as spies so we can assert the
// fail-open path logged without throwing.
const fakeLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};
jest.mock('../../config/logger', () => ({
  __esModule: true,
  logger: fakeLogger,
  createServiceLogger: () => fakeLogger,
}));

// Stable correlation id for assertions.
jest.mock('../../utils/correlationContext', () => ({
  __esModule: true,
  getCurrentCorrelationId: () => 'corr-test-123',
}));

// ─── Imports under test (AFTER mocks) ─────────────────────────────────────────

import { emitOrderPlaced, OrderPlacedEventSchema, EmitOrderPlacedContext } from '../emitOrderPlaced';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function baseCtx(overrides: Partial<EmitOrderPlacedContext> = {}): EmitOrderPlacedContext {
  return {
    merchantId: 'm_1',
    storeId: 's_1',
    customerId: 'c_1',
    orderId: 'o_1',
    orderNumber: 'ORD-001',
    amount: 499.5,
    source: 'web',
    items: [{ productId: 'p_1', qty: 2, price: 249.75 }],
    ...overrides,
  };
}

// A helper to flush the promise chain used by `void enqueueOrderPlacedJob(...)`.
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('emitOrderPlaced', () => {
  beforeEach(() => {
    fakeQueueAdd.mockReset();
    fakeQueueAdd.mockResolvedValue({ id: 'mock-job' });
    fakeBusEmit.mockReset();
    fakeLogger.info.mockReset();
    fakeLogger.warn.mockReset();
    fakeLogger.error.mockReset();
    fakeLogger.debug.mockReset();
  });

  test('emits a schema-valid event with all fields populated', async () => {
    const event = emitOrderPlaced(baseCtx());
    await flushMicrotasks();

    // Envelope passes its own schema (belt-and-braces — emit already parses).
    expect(() => OrderPlacedEventSchema.parse(event)).not.toThrow();

    expect(event.eventType).toBe('order.placed');
    expect(event.merchantId).toBe('m_1');
    expect(event.storeId).toBe('s_1');
    expect(event.customerId).toBe('c_1');
    expect(event.orderNumber).toBe('ORD-001');
    expect(event.amount).toBe(499.5);
    expect(event.source).toBe('web');
    expect(event.correlationId).toBe('corr-test-123');
    expect(event.items).toEqual([{ productId: 'p_1', qty: 2, price: 249.75 }]);
    expect(event.eventId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(new Date(event.occurredAt).toISOString()).toBe(event.occurredAt);

    // In-process bus got the translated activity event.
    expect(fakeBusEmit).toHaveBeenCalledTimes(1);
    expect(fakeBusEmit.mock.calls[0][0]).toBe('order_placed');
    const busPayload = fakeBusEmit.mock.calls[0][1] as {
      userId: string;
      entityId: string;
      metadata: { eventId: string };
    };
    expect(busPayload.userId).toBe('c_1');
    expect(busPayload.entityId).toBe('o_1');
    expect(busPayload.metadata.eventId).toBe(event.eventId);

    // BullMQ compat job enqueued with the eventId as jobId.
    expect(fakeQueueAdd).toHaveBeenCalledTimes(1);
    expect(fakeQueueAdd.mock.calls[0][0]).toBe('process-order-placed');
    expect(fakeQueueAdd.mock.calls[0][1]).toEqual(event);
    expect(fakeQueueAdd.mock.calls[0][2]).toMatchObject({ jobId: event.eventId });
  });

  test('accepts null storeId (aggregator orders)', async () => {
    const event = emitOrderPlaced(baseCtx({ storeId: null, source: 'aggregator' }));
    await flushMicrotasks();

    expect(event.storeId).toBeNull();
    expect(event.source).toBe('aggregator');
    expect(() => OrderPlacedEventSchema.parse(event)).not.toThrow();
    expect(fakeBusEmit).toHaveBeenCalledTimes(1);
    expect(fakeQueueAdd).toHaveBeenCalledTimes(1);
  });

  test('rejects missing customerId (caller-bug — throws schema validation)', () => {
    const badCtx = baseCtx({ customerId: '' });

    expect(() => emitOrderPlaced(badCtx)).toThrow();

    // No side effects should fire when validation fails.
    expect(fakeBusEmit).not.toHaveBeenCalled();
    expect(fakeQueueAdd).not.toHaveBeenCalled();
  });

  test('queue.add failure does NOT throw — logs fail-open warning', async () => {
    fakeQueueAdd.mockRejectedValueOnce(new Error('redis down'));

    // Synchronous emit must not throw even though the compat queue will fail.
    const event = emitOrderPlaced(baseCtx());

    // Let the async `void enqueueOrderPlacedJob` settle so the catch block runs.
    await flushMicrotasks();
    await flushMicrotasks();

    expect(event.eventType).toBe('order.placed');
    expect(fakeBusEmit).toHaveBeenCalledTimes(1);
    expect(fakeQueueAdd).toHaveBeenCalledTimes(1);
    expect(fakeLogger.warn).toHaveBeenCalled();
    const warnMsg = fakeLogger.warn.mock.calls[0][0];
    expect(String(warnMsg)).toMatch(/fail-open|compat job/i);
  });

  test('repeated calls produce unique eventIds', async () => {
    const e1 = emitOrderPlaced(baseCtx({ orderId: 'o_a', orderNumber: 'ORD-A' }));
    const e2 = emitOrderPlaced(baseCtx({ orderId: 'o_b', orderNumber: 'ORD-B' }));
    const e3 = emitOrderPlaced(baseCtx({ orderId: 'o_c', orderNumber: 'ORD-C' }));
    await flushMicrotasks();

    const ids = new Set([e1.eventId, e2.eventId, e3.eventId]);
    expect(ids.size).toBe(3);

    // Each call enqueued its own job with its own unique jobId.
    const jobIds = fakeQueueAdd.mock.calls.map((c) => (c[2] as { jobId: string }).jobId);
    expect(new Set(jobIds).size).toBe(3);
    expect(jobIds).toEqual([e1.eventId, e2.eventId, e3.eventId]);
  });
});
