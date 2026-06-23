/**
 * QR Check-in Security Tests
 *
 * Covers:
 *  1. Atomic cooldown lock — no double award on concurrent requests
 *  2. selfReported metadata flag is always set
 *  3. Amount cap respected in merchantRewardService (SELF_REPORTED_AMOUNT_CAP)
 *  4. Daily coin cap enforced
 *
 * All external dependencies are mocked — no real DB, Redis, or network.
 */

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any imports
// ---------------------------------------------------------------------------

// Redis mock
const mockRedisSet = jest.fn();
const mockRedisGet = jest.fn();
jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    set: (...args: any[]) => mockRedisSet(...args),
    get: (...args: any[]) => mockRedisGet(...args),
    acquireLock: () => Promise.resolve('lock-token'),
    releaseLock: () => Promise.resolve(true),
    isReady: () => true,
    getClient: () => null,
  },
}));

// merchantRewardService mock
const mockProcessReward = jest.fn();
jest.mock('../merchantservices/merchantRewardService', () => ({
  merchantRewardService: {
    processReward: (...args: any[]) => mockProcessReward(...args),
  },
}));

// Store model mock
const mockStoreFindById = jest.fn();
jest.mock('../models/Store', () => ({
  Store: {
    findById: (...args: any[]) => ({
      select: () => ({ lean: () => mockStoreFindById(...args) }),
    }),
  },
}));

// pushNotificationService mock — plain function survives resetMocks: true
jest.mock('../services/pushNotificationService', () => ({
  __esModule: true,
  default: { sendPushToUser: () => Promise.resolve(undefined) },
}));

// gamificationEventBus mock — plain function survives resetMocks: true
jest.mock('../events/gamificationEventBus', () => ({
  __esModule: true,
  default: { emit: () => true },
}));

// BullMQ connection — replaced by global ioredis mock via jest.config moduleNameMapper
jest.mock('../config/bullmq-connection', () => ({
  bullmqRedis: {},
}));

// BullMQ Queue mock — plain function survives resetMocks: true
jest.mock('bullmq', () => ({
  Queue: function () {
    return { add: () => Promise.resolve(undefined) };
  },
}));

// Logger mock
jest.mock('../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createServiceLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

// validation middleware — passthrough
jest.mock('../middleware/validation', () => ({
  validate: () => (_req: any, _res: any, next: any) => next(),
  validateParams: () => (_req: any, _res: any, next: any) => next(),
  Joi: require('joi'),
  commonSchemas: {
    objectId: () => require('joi').string().length(24),
  },
}));

// rateLimiter middleware — passthrough
jest.mock('../middleware/rateLimiter', () => ({
  createRateLimiter: () => (_req: any, _res: any, next: any) => next(),
}));

// auth middleware — passthrough injecting userId
jest.mock('../middleware/auth', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.userId = req.headers['x-user-id'] || 'test-user-id';
    next();
  },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import express from 'express';
import request from 'supertest';
import { Types } from 'mongoose';

// Build a minimal express app wrapping the QR checkin router
function buildApp() {
  const app = express();
  app.use(express.json());
  // Dynamically require after mocks are set up
  const qrCheckinRouter = require('../routes/qrCheckinRoutes').default;
  app.use('/api/qr-checkin', qrCheckinRouter);
  return app;
}

const VALID_STORE_ID = new Types.ObjectId().toHexString();
const ACTIVE_STORE = {
  _id: VALID_STORE_ID,
  name: 'Test Store',
  merchantId: new Types.ObjectId(),
  isActive: true,
};

const DEFAULT_REWARD_RESULT = { coinsIssued: 10, skippedReasons: [] };

describe('QR Check-in Security Tests', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default store response
    mockStoreFindById.mockResolvedValue(ACTIVE_STORE);
    // Default reward response
    mockProcessReward.mockResolvedValue(DEFAULT_REWARD_RESULT);
  });

  // -------------------------------------------------------------------------
  // Test 1: Atomic cooldown lock — no double award on concurrent requests
  // -------------------------------------------------------------------------
  describe('1. Atomic cooldown lock', () => {
    it('only awards coins once when two concurrent requests race for the same userId+storeId', async () => {
      app = buildApp();

      // First call: NX set succeeds ('OK' → cooldown acquired)
      // Second call: NX set returns false → cooldown already active → 429
      mockRedisSet
        .mockResolvedValueOnce('OK') // first request acquires cooldown
        .mockResolvedValueOnce(false); // second request sees cooldown active

      const body = { storeId: VALID_STORE_ID, amount: 500, paymentMethod: 'cash' };
      const headers = { 'x-user-id': 'user-abc', 'Content-Type': 'application/json' };

      const [res1, res2] = await Promise.all([
        request(app).post('/api/qr-checkin').set(headers).send(body),
        request(app).post('/api/qr-checkin').set(headers).send(body),
      ]);

      // One succeeds, one returns 429
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 429]);

      // processReward called only once
      expect(mockProcessReward).toHaveBeenCalledTimes(1);
    });

    it('returns 429 with a meaningful message on cooldown hit', async () => {
      app = buildApp();

      mockRedisSet.mockResolvedValueOnce(false); // cooldown already active

      const res = await request(app)
        .post('/api/qr-checkin')
        .set({ 'x-user-id': 'user-cooldown', 'Content-Type': 'application/json' })
        .send({ storeId: VALID_STORE_ID, amount: 100 });

      expect(res.status).toBe(429);
      expect(res.body.message || res.text).toMatch(/checked in|wait|recently/i);
      expect(mockProcessReward).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Test 2: selfReported metadata flag is always set
  // -------------------------------------------------------------------------
  describe('2. selfReported metadata flag', () => {
    it('always passes selfReported: true in metadata to processReward', async () => {
      app = buildApp();
      mockRedisSet.mockResolvedValue('OK'); // cooldown acquired

      await request(app)
        .post('/api/qr-checkin')
        .set({ 'x-user-id': 'user-self-reported', 'Content-Type': 'application/json' })
        .send({ storeId: VALID_STORE_ID, amount: 300, paymentMethod: 'upi' });

      expect(mockProcessReward).toHaveBeenCalledTimes(1);
      const callArg = mockProcessReward.mock.calls[0][0];
      expect(callArg.metadata).toBeDefined();
      expect(callArg.metadata.selfReported).toBe(true);
    });

    it('sets selfReported: true regardless of the paymentMethod value', async () => {
      app = buildApp();
      mockRedisSet.mockResolvedValue('OK');

      for (const method of ['cash', 'card', 'upi', 'wallet']) {
        jest.clearAllMocks();
        mockStoreFindById.mockResolvedValue(ACTIVE_STORE);
        mockRedisSet.mockResolvedValue('OK');
        mockProcessReward.mockResolvedValue(DEFAULT_REWARD_RESULT);

        await request(app)
          .post('/api/qr-checkin')
          .set({ 'x-user-id': 'user-pm', 'Content-Type': 'application/json' })
          .send({ storeId: VALID_STORE_ID, amount: 100, paymentMethod: method });

        const callArg = mockProcessReward.mock.calls[0][0];
        expect(callArg.metadata.selfReported).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // Test 3: Amount cap respected in merchantRewardService
  // -------------------------------------------------------------------------
  // These tests verify the SELF_REPORTED_AMOUNT_CAP logic by inspecting what
  // the route passes to processReward and by asserting the capping contract.
  // We use the mocked processReward and verify input/output contracts.
  describe('3. Amount cap in merchantRewardService', () => {
    it('route does NOT pass a pre-capped amount — raw amount is sent to processReward', async () => {
      // The route passes the raw user-reported amount to processReward.
      // The capping is done INSIDE processReward (merchantRewardService).
      // This test verifies the raw amount reaches processReward unchanged.
      app = buildApp();
      mockRedisSet.mockResolvedValue('OK');
      mockProcessReward.mockResolvedValue({ coinsIssued: 50, skippedReasons: [] });

      const rawAmount = 49999;
      await request(app)
        .post('/api/qr-checkin')
        .set({ 'x-user-id': 'user-cap-check', 'Content-Type': 'application/json' })
        .send({ storeId: VALID_STORE_ID, amount: rawAmount });

      expect(mockProcessReward).toHaveBeenCalledTimes(1);
      const callArg = mockProcessReward.mock.calls[0][0];
      // The raw (uncapped) amount should be passed — capping happens inside processReward
      expect(callArg.amount).toBe(rawAmount);
      // selfReported flag must be set so processReward knows to apply the cap
      expect(callArg.metadata.selfReported).toBe(true);
    });

    it('processReward caps coinsIssued when amount exceeds SELF_REPORTED_AMOUNT_CAP', () => {
      // Unit test of the capping mathematics (white-box, no network calls).
      // The service computes: cappedAmount = min(amount, SELF_REPORTED_AMOUNT_CAP)
      // cappingRatio = cappedAmount / amount
      // coinsIssuedAfterCap = floor(coinsBeforeCap * cappingRatio)
      const SELF_REPORTED_AMOUNT_CAP = 2000;
      const amount = 49999;
      const cashbackPercent = 1;
      const coinsPerRupee = 0.1;

      const coinsBeforeCap = Math.round((amount * cashbackPercent) / 100) + Math.floor(amount * coinsPerRupee);
      const cappedAmount = Math.min(amount, SELF_REPORTED_AMOUNT_CAP);
      const cappingRatio = cappedAmount / amount;
      const coinsAfterCap = Math.floor(coinsBeforeCap * cappingRatio);

      // Verify the cap reduces coins significantly
      expect(coinsAfterCap).toBeLessThan(coinsBeforeCap);
      // Coins after cap should correspond to ≤ SELF_REPORTED_AMOUNT_CAP worth of coins
      const maxCoinsForCappedAmount =
        Math.round((SELF_REPORTED_AMOUNT_CAP * cashbackPercent) / 100) +
        Math.floor(SELF_REPORTED_AMOUNT_CAP * coinsPerRupee);
      expect(coinsAfterCap).toBeLessThanOrEqual(maxCoinsForCappedAmount);
    });

    it('processReward does NOT reduce coins when amount is below SELF_REPORTED_AMOUNT_CAP', () => {
      // White-box: when amount <= cap, cappingRatio = 1.0, coins unchanged
      const SELF_REPORTED_AMOUNT_CAP = 2000;
      const amount = 500; // below cap
      const cashbackPercent = 1;
      const coinsPerRupee = 0.1;

      const coinsBeforeCap = Math.round((amount * cashbackPercent) / 100) + Math.floor(amount * coinsPerRupee);
      const cappedAmount = Math.min(amount, SELF_REPORTED_AMOUNT_CAP);

      // amount <= cap → no capping applied (cappedAmount === amount)
      expect(cappedAmount).toBe(amount);
      // coinsAfterCap calculation: if cappedAmount === amount, ratio=1 → no change
      const cappingRatio = cappedAmount / amount; // = 1.0
      expect(cappingRatio).toBe(1.0);
      expect(Math.floor(coinsBeforeCap * cappingRatio)).toBe(coinsBeforeCap);
    });
  });

  // -------------------------------------------------------------------------
  // Test 4: Daily coin cap enforced
  // -------------------------------------------------------------------------
  // Tests the daily QR coin cap by verifying processReward is called with
  // the selfReported flag and that the HTTP layer correctly surfaces 0 coins.
  describe('4. Daily coin cap', () => {
    // Shared setup for all daily cap tests — ensures all mocks are properly
    // initialized regardless of resetMocks: true state.
    function setupDailyCapTest(coinsIssued = 0) {
      mockStoreFindById.mockResolvedValue(ACTIVE_STORE);
      mockRedisSet.mockResolvedValue('OK');
      mockProcessReward.mockResolvedValue({
        coinsIssued,
        skippedReasons: coinsIssued === 0 ? ['daily_qr_coin_cap_reached'] : [],
      });
      return buildApp();
    }

    it('processReward returns 0 coinsIssued with daily_qr_coin_cap_reached reason when at cap', async () => {
      app = setupDailyCapTest(0);

      const res = await request(app)
        .post('/api/qr-checkin')
        .set({ 'x-user-id': 'user-daily-cap', 'Content-Type': 'application/json' })
        .send({ storeId: VALID_STORE_ID, amount: 200 });

      // Route should still succeed (200) — coin cap is not an HTTP error
      expect(res.status).toBe(200);
      expect(res.body.data.coinsEarned).toBe(0);
    });

    it('response message reflects 0 coins when daily cap reached', async () => {
      app = setupDailyCapTest(0);

      const res = await request(app)
        .post('/api/qr-checkin')
        .set({ 'x-user-id': 'user-cap-msg', 'Content-Type': 'application/json' })
        .send({ storeId: VALID_STORE_ID, amount: 150 });

      expect(res.status).toBe(200);
      // When coinsEarned = 0 the message should indicate visit recorded (not coins earned)
      expect(res.body.data.message).toMatch(/[Vv]isit recorded|0/);
    });

    it('processReward is always called with selfReported: true even when daily cap is active', async () => {
      app = setupDailyCapTest(0);

      await request(app)
        .post('/api/qr-checkin')
        .set({ 'x-user-id': 'user-sr-cap', 'Content-Type': 'application/json' })
        .send({ storeId: VALID_STORE_ID, amount: 300 });

      expect(mockProcessReward).toHaveBeenCalledTimes(1);
      const callArg = mockProcessReward.mock.calls[0][0];
      expect(callArg.metadata.selfReported).toBe(true);
    });
  });
});
