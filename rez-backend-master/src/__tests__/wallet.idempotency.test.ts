/**
 * Wallet Idempotency Middleware Tests
 *
 * Tests src/middleware/idempotency.ts in isolation via a lightweight Express app.
 *
 * Covers:
 *  1. Same Idempotency-Key returns cached response (handler called only once)
 *  2. Missing Idempotency-Key returns 400 when requireKey: true
 *  3. Different Idempotency-Keys execute independently (handler called twice)
 *  4. Redis unavailable with failClosed: true returns 503
 */

// ---------------------------------------------------------------------------
// Redis mock — fully controllable per-test
// ---------------------------------------------------------------------------

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisAcquireLock = jest.fn();
const mockRedisReleaseLock = jest.fn();

jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    acquireLock: (...args: any[]) => mockRedisAcquireLock(...args),
    releaseLock: (...args: any[]) => mockRedisReleaseLock(...args),
    isReady: () => true,
  },
}));

// Logger mock — suppress output during tests
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createServiceLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import express, { Request, Response } from 'express';
import request from 'supertest';
import { idempotencyMiddleware } from '../middleware/idempotency';

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

/**
 * Build a minimal Express app with the idempotency middleware applied to POST /topup.
 * The handler is injected so tests can track call counts and control responses.
 */
function buildApp(
  handler: (req: Request, res: Response) => void,
  middlewareOptions: Parameters<typeof idempotencyMiddleware>[0] = {},
) {
  const app = express();
  app.use(express.json());

  app.post(
    '/api/wallet/topup',
    // Inject a fake authenticated user so the middleware can scope the key
    (req: any, _res, next) => {
      req.user = { id: req.headers['x-user-id'] || 'default-user-id' };
      next();
    },
    idempotencyMiddleware(middlewareOptions),
    handler,
  );

  return app;
}

/** A standard successful topup handler response */
const TOPUP_RESPONSE = { success: true, message: 'Top-up successful', balance: 500 };

/** Build a cached response object (the shape stored in Redis by the middleware) */
function buildCachedEntry(body = TOPUP_RESPONSE, statusCode = 200) {
  return {
    statusCode,
    body,
    headers: { 'content-type': 'application/json' },
    cachedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Wallet Idempotency Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no cached entry, lock acquired successfully
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
    mockRedisAcquireLock.mockResolvedValue('lock-token-xyz');
    mockRedisReleaseLock.mockResolvedValue(true);
  });

  // -------------------------------------------------------------------------
  // Test 1: Same Idempotency-Key returns cached response
  // -------------------------------------------------------------------------
  describe('1. Cached response on duplicate key', () => {
    it('calls the handler only once and returns cached response on second call', async () => {
      const handlerFn = jest.fn((req: Request, res: Response) => {
        res.status(200).json(TOPUP_RESPONSE);
      });

      const app = buildApp(handlerFn, { failClosed: true, requireKey: true });

      // First request — cache miss, handler executes
      mockRedisGet.mockResolvedValueOnce(null); // no cache

      const res1 = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-001', 'Idempotency-Key': 'test-key-001', 'Content-Type': 'application/json' })
        .send({ amount: 100 });

      expect(res1.status).toBe(200);
      expect(handlerFn).toHaveBeenCalledTimes(1);

      // Second request — simulate cache hit (key was written after first response)
      const cached = buildCachedEntry(TOPUP_RESPONSE, 200);
      mockRedisGet.mockResolvedValueOnce(cached); // cache hit

      const res2 = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-001', 'Idempotency-Key': 'test-key-001', 'Content-Type': 'application/json' })
        .send({ amount: 100 });

      expect(res2.status).toBe(200);
      expect(res2.body).toEqual(TOPUP_RESPONSE);
      // Handler still called only once (second request served from cache)
      expect(handlerFn).toHaveBeenCalledTimes(1);
      // Replay header set on cached response
      expect(res2.headers['x-idempotency-replayed']).toBe('true');
    });

    it('returns the exact body and status from the cached response', async () => {
      const handlerFn = jest.fn((_req: Request, res: Response) => {
        res.status(201).json({ success: true, transactionId: 'abc-123' });
      });

      const app = buildApp(handlerFn, { failClosed: true, requireKey: true });

      const cachedEntry = buildCachedEntry({ success: true, transactionId: 'abc-123' }, 201);
      mockRedisGet.mockResolvedValue(cachedEntry); // immediate cache hit

      const res = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-002', 'Idempotency-Key': 'key-cached', 'Content-Type': 'application/json' })
        .send({ amount: 50 });

      expect(res.status).toBe(201);
      expect(res.body.transactionId).toBe('abc-123');
      expect(handlerFn).not.toHaveBeenCalled(); // handler bypassed
    });
  });

  // -------------------------------------------------------------------------
  // Test 2: Missing Idempotency-Key returns 400 when requireKey: true
  // -------------------------------------------------------------------------
  describe('2. Missing Idempotency-Key header', () => {
    it('returns 400 when requireKey is true and header is absent', async () => {
      const handlerFn = jest.fn((_req: Request, res: Response) => {
        res.status(200).json(TOPUP_RESPONSE);
      });

      const app = buildApp(handlerFn, { failClosed: true, requireKey: true });

      const res = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-no-key', 'Content-Type': 'application/json' })
        .send({ amount: 200 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('proceeds without header when requireKey is false (default)', async () => {
      const handlerFn = jest.fn((_req: Request, res: Response) => {
        res.status(200).json(TOPUP_RESPONSE);
      });

      const app = buildApp(handlerFn, { failClosed: false, requireKey: false });

      const res = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-no-key', 'Content-Type': 'application/json' })
        .send({ amount: 50 });

      expect(res.status).toBe(200);
      expect(handlerFn).toHaveBeenCalledTimes(1);
    });

    it('returns correct error body structure on missing key', async () => {
      const handlerFn = jest.fn((_req: Request, res: Response) => res.status(200).json({}));
      const app = buildApp(handlerFn, { requireKey: true });

      const res = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-400', 'Content-Type': 'application/json' })
        .send({});

      expect(res.body).toMatchObject({
        success: false,
        code: 'IDEMPOTENCY_KEY_REQUIRED',
      });
      expect(typeof res.body.message).toBe('string');
    });
  });

  // -------------------------------------------------------------------------
  // Test 3: Different Idempotency-Keys execute independently
  // -------------------------------------------------------------------------
  describe('3. Different Idempotency-Keys execute independently', () => {
    it('calls handler twice for two different keys', async () => {
      const handlerFn = jest.fn((_req: Request, res: Response) => {
        res.status(200).json(TOPUP_RESPONSE);
      });

      const app = buildApp(handlerFn, { failClosed: true, requireKey: false });

      // Both requests are cache misses (different keys, neither cached)
      mockRedisGet.mockResolvedValue(null);

      const res1 = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-dual', 'Idempotency-Key': 'key-001', 'Content-Type': 'application/json' })
        .send({ amount: 100 });

      const res2 = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-dual', 'Idempotency-Key': 'key-002', 'Content-Type': 'application/json' })
        .send({ amount: 200 });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      // Handler called once for each unique key
      expect(handlerFn).toHaveBeenCalledTimes(2);
    });

    it('does not replay X-Idempotency-Replayed header for distinct keys', async () => {
      const handlerFn = jest.fn((_req: Request, res: Response) => res.status(200).json({}));
      const app = buildApp(handlerFn, {});

      mockRedisGet.mockResolvedValue(null); // always cache miss

      const res = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-new', 'Idempotency-Key': 'brand-new-key' })
        .send({});

      // No replay header on fresh execution
      expect(res.headers['x-idempotency-replayed']).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Test 4: Redis unavailable with failClosed: true returns 503
  // -------------------------------------------------------------------------
  describe('4. Redis unavailable — fail-closed mode', () => {
    it('returns 503 when Redis throws and failClosed is true', async () => {
      const handlerFn = jest.fn((_req: Request, res: Response) => {
        res.status(200).json(TOPUP_RESPONSE);
      });

      const app = buildApp(handlerFn, { failClosed: true, requireKey: true });

      // Simulate Redis connection error
      const redisError = new Error('ECONNREFUSED — Redis unavailable');
      mockRedisGet.mockRejectedValue(redisError);

      const res = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-503', 'Idempotency-Key': 'key-redis-down', 'Content-Type': 'application/json' })
        .send({ amount: 100 });

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('IDEMPOTENCY_STORE_UNAVAILABLE');
      // Handler must NOT be called — fail-closed means reject, not allow through
      expect(handlerFn).not.toHaveBeenCalled();
    });

    it('returns 503 body with correct structure', async () => {
      const handlerFn = jest.fn((_req: Request, res: Response) => res.status(200).json({}));
      const app = buildApp(handlerFn, { failClosed: true, requireKey: true });

      mockRedisGet.mockRejectedValue(new Error('Redis timeout'));

      const res = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-503b', 'Idempotency-Key': 'key-503b' })
        .send({});

      expect(res.body).toMatchObject({
        success: false,
        code: 'IDEMPOTENCY_STORE_UNAVAILABLE',
      });
      expect(typeof res.body.message).toBe('string');
    });

    it('allows request through when Redis throws and failClosed is false (fail-open)', async () => {
      const handlerFn = jest.fn((_req: Request, res: Response) => {
        res.status(200).json(TOPUP_RESPONSE);
      });

      const app = buildApp(handlerFn, { failClosed: false }); // fail-open

      mockRedisGet.mockRejectedValue(new Error('Redis unavailable'));

      const res = await request(app)
        .post('/api/wallet/topup')
        .set({ 'x-user-id': 'user-failopen', 'Idempotency-Key': 'key-failopen' })
        .send({ amount: 75 });

      // Fail-open: allow through, handler executes
      expect(res.status).toBe(200);
      expect(handlerFn).toHaveBeenCalledTimes(1);
    });
  });
});
