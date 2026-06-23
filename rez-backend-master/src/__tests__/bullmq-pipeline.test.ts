/**
 * BullMQ Queue Pipeline — Unit Tests
 *
 * Tests the event publishing layer (fail-open) and worker group classification.
 * Uses mocked BullMQ (no real Redis needed) to verify:
 *   1. Events are published without throwing
 *   2. Fail-open: publish errors don't bubble up
 *   3. Event payloads match expected shapes
 *   4. Worker group classification is correct
 *
 * NOTE: Run with --setupFilesAfterEnv=[] to skip MongoDB setup:
 *   npx jest bullmq-pipeline --no-coverage --setupFilesAfterEnv=[]
 */

import { CRITICAL_QUEUE_NAMES, NONCRITICAL_QUEUE_NAMES, isCriticalQueue } from '../workers/workerGroups';

// ── Mock BullMQ before any queue imports ──────────────────────────────────────
// Use a stable reference that survives jest.resetMocks() by re-assigning in beforeEach
// Initialise with real jest.fn() so the Queue constructor (called at module load)
// captures a valid function reference, not undefined.
let mockAdd: jest.Mock = jest.fn().mockResolvedValue({ id: 'test-job-id', name: 'test' });
let mockOn: jest.Mock = jest.fn();
let mockClose: jest.Mock = jest.fn().mockResolvedValue(undefined);

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: (...args: any[]) => mockAdd(...args),
    on: (...args: any[]) => mockOn(...args),
    close: (...args: any[]) => mockClose(...args),
  })),
  Worker: jest.fn().mockImplementation((_name: string, _processor: any) => ({
    on: (...args: any[]) => mockOn(...args),
    close: (...args: any[]) => mockClose(...args),
    name: 'test-worker',
  })),
  Job: jest.fn(),
}));

beforeEach(() => {
  // Reset module registry so each test gets fresh queue singletons (_queue = null).
  // Without this, the first test's Queue instance (with the old mockAdd) persists.
  jest.resetModules();
  mockAdd = jest.fn().mockResolvedValue({ id: 'test-job-id', name: 'test' });
  mockOn = jest.fn();
  mockClose = jest.fn().mockResolvedValue(undefined);
});

jest.mock('../config/bullmq-connection', () => ({
  bullmqRedis: {},
}));

jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createServiceLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Worker Group Classification', () => {
  test('CRITICAL queues are correctly classified', () => {
    for (const name of CRITICAL_QUEUE_NAMES) {
      expect(isCriticalQueue(name)).toBe(true);
    }
  });

  test('NONCRITICAL queues are not classified as critical', () => {
    for (const name of NONCRITICAL_QUEUE_NAMES) {
      expect(isCriticalQueue(name)).toBe(false);
    }
  });

  test('unknown queue is not critical', () => {
    expect(isCriticalQueue('random-queue')).toBe(false);
  });

  test('payment-events is in CRITICAL group', () => {
    expect(isCriticalQueue('payment-events')).toBe(true);
  });

  test('order-events is in CRITICAL group', () => {
    expect(isCriticalQueue('order-events')).toBe(true);
  });

  test('wallet-events is in CRITICAL group', () => {
    expect(isCriticalQueue('wallet-events')).toBe(true);
  });

  test('catalog-events is in NONCRITICAL group', () => {
    expect(isCriticalQueue('catalog-events')).toBe(false);
  });
});

describe('Analytics Queue — publish + fail-open', () => {
  beforeEach(() => {
    // mockAdd is re-created in global beforeEach
  });

  test('publishAnalyticsEvent enqueues an event', async () => {
    const { publishAnalyticsEvent } = await import('../events/analyticsQueue');

    await publishAnalyticsEvent({
      eventId: 'test-analytics-001',
      eventType: 'visit_event',
      userId: 'user-123',
      data: { entityId: 'store-1', entityType: 'store', category: 'food' },
      sourceEventId: 'src-event-001',
      timestamp: new Date().toISOString(),
    });

    expect(mockAdd).toHaveBeenCalledWith(
      'visit_event',
      expect.objectContaining({ eventId: 'test-analytics-001' }),
      expect.objectContaining({ jobId: 'test-analytics-001' }),
    );
  });

  test('fail-open: publish error does not throw', async () => {
    mockAdd.mockRejectedValueOnce(new Error('Redis connection refused'));
    const { publishAnalyticsEvent } = await import('../events/analyticsQueue');

    await expect(
      publishAnalyticsEvent({
        eventId: 'test-fail-001',
        eventType: 'visit_event',
        userId: 'user-123',
        data: {},
        sourceEventId: 'src-fail-001',
        timestamp: new Date().toISOString(),
      }),
    ).resolves.toBeUndefined();
  });
});

describe('Payment Queue — publish + fail-open', () => {
  beforeEach(() => {
    // mockAdd is re-created in global beforeEach
  });

  test('publishPaymentEvent enqueues a captured payment', async () => {
    const { publishPaymentEvent } = await import('../events/paymentQueue');

    await publishPaymentEvent({
      eventId: 'payment-captured:pay_123',
      eventType: 'payment.captured',
      userId: 'user-456',
      orderId: 'order-789',
      payload: {
        paymentId: 'pay_123',
        amount: 500,
        currency: 'INR',
        method: 'upi',
        status: 'captured',
      },
      createdAt: new Date().toISOString(),
    });

    expect(mockAdd).toHaveBeenCalledWith(
      'payment.captured',
      expect.objectContaining({ eventType: 'payment.captured' }),
      expect.objectContaining({ jobId: 'payment-captured:pay_123' }),
    );
  });

  test('fail-open: Redis error is swallowed', async () => {
    mockAdd.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const { publishPaymentEvent } = await import('../events/paymentQueue');

    await expect(
      publishPaymentEvent({
        eventId: 'test-fail-pay',
        eventType: 'payment.failed',
        userId: 'user-1',
        payload: { amount: 100 },
        createdAt: new Date().toISOString(),
      }),
    ).resolves.toBeUndefined();
  });
});

describe('Order Queue — publish + fail-open', () => {
  beforeEach(() => {
    // mockAdd is re-created in global beforeEach
  });

  test('publishOrderEvent enqueues an order placed event', async () => {
    const { publishOrderEvent } = await import('../events/orderQueue');

    await publishOrderEvent({
      eventId: 'order-placed:ord-001',
      eventType: 'order.placed',
      userId: 'user-1',
      merchantId: 'merch-1',
      payload: { orderId: 'ord-001', orderTotal: 1200, itemCount: 3, fulfillmentType: 'delivery' },
      createdAt: new Date().toISOString(),
    });

    expect(mockAdd).toHaveBeenCalledWith(
      'order.placed',
      expect.objectContaining({ eventType: 'order.placed' }),
      expect.objectContaining({ jobId: 'order-placed:ord-001' }),
    );
  });
});

describe('Wallet Queue — publish + fail-open', () => {
  beforeEach(() => {
    // mockAdd is re-created in global beforeEach
  });

  test('publishWalletEvent enqueues a wallet credit event', async () => {
    const walletQueue = require('../events/walletQueue');

    await walletQueue.publishWalletEvent({
      eventId: 'wallet-credit:txn-001',
      eventType: 'wallet.credited',
      userId: 'user-1',
      payload: { amount: 50, currency: 'INR', source: 'cashback', transactionId: 'txn-001' },
      createdAt: new Date().toISOString(),
    });

    expect(mockAdd).toHaveBeenCalledWith(
      'wallet.credited',
      expect.objectContaining({ eventType: 'wallet.credited' }),
      expect.objectContaining({ jobId: 'wallet-credit:txn-001' }),
    );
  });
});

describe('Catalog Queue — publish + fail-open', () => {
  beforeEach(() => {
    // mockAdd is re-created in global beforeEach
  });

  test('publishCatalogEvent enqueues a product update', async () => {
    const catalogQueue = require('../events/catalogQueue');

    await catalogQueue.publishCatalogEvent({
      eventId: 'catalog-update:prod-001',
      eventType: 'product.updated',
      merchantId: 'merch-1',
      payload: { productId: 'prod-001', changes: { price: 299 } },
      createdAt: new Date().toISOString(),
    });

    expect(mockAdd).toHaveBeenCalledWith(
      'product.updated',
      expect.objectContaining({ eventType: 'product.updated' }),
      expect.objectContaining({ jobId: 'catalog-update:prod-001' }),
    );
  });
});
