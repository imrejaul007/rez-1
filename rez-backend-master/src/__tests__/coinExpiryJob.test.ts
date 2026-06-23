/**
 * Branded Coin Expiry Job Tests
 *
 * Covers runBrandedCoinExpiryJob():
 * - Coins past expiresAt are marked isActive=false
 * - Coins not yet expired are untouched
 * - Active coins with no expiresAt are untouched
 * - Notifications are enqueued for affected users (best-effort)
 * - Job skips when Redis lock cannot be acquired
 */

import { Types } from 'mongoose';

// ─── Mock: redisService ───────────────────────────────────────────────────────
// Use jest.mock with __esModule to satisfy ts-jest esModuleInterop. The mock
// stubs are retrieved via jest.mocked() after import so they're always the same
// function references regardless of resetMocks clearing implementations.
jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
  },
}));

// ─── Mock: Wallet model ───────────────────────────────────────────────────────
// Wallet mock uses wrapper fns so it's immune to resetMocks removing the inner
// jest.fn() references (the wrapper closures are stable; only inner fn is reset).
const mockWalletUpdateMany = jest.fn();
const mockWalletFind = jest.fn();

jest.mock('../models/Wallet', () => ({
  Wallet: {
    updateMany: (...args: any[]) => mockWalletUpdateMany(...args),
    find: (...args: any[]) => ({
      lean: () => mockWalletFind(...args),
    }),
  },
}));

// ─── Mock: BullMQ Queue ───────────────────────────────────────────────────────
const mockQueueAdd = jest.fn();

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: (...args: any[]) => mockQueueAdd(...args),
  })),
}));

// ─── Mock: bullmq-connection ──────────────────────────────────────────────────
jest.mock('../config/bullmq-connection', () => ({
  bullmqRedis: {},
}));

// ─── Mock: other models / services used indirectly ───────────────────────────
jest.mock('../models/CoinTransaction', () => ({ CoinTransaction: {} }));
jest.mock('../models/User', () => ({ User: {} }));
jest.mock('../config/bullmq-queues', () => ({ notificationQueue: { add: jest.fn() } }));
jest.mock('../config/logger', () => ({
  createServiceLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ─── Resolve redisService mock stubs ─────────────────────────────────────────
// Import the mocked module after jest.mock() is registered. ts-jest will
// return the mock factory's object, giving us stable jest.fn() references.
import redisServiceDefault from '../services/redisService';

const mockAcquireLock = redisServiceDefault.acquireLock as jest.Mock;
const mockReleaseLock = redisServiceDefault.releaseLock as jest.Mock;

// ─── Subject under test ───────────────────────────────────────────────────────
import { runBrandedCoinExpiryJob } from '../jobs/coinExpiry';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const userId1 = new Types.ObjectId();
const userId2 = new Types.ObjectId();
const merchantId1 = new Types.ObjectId();

function makeUpdateManyResult(matchedCount: number, modifiedCount: number) {
  return { matchedCount, modifiedCount };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  // Default: lock acquired successfully
  mockAcquireLock.mockResolvedValue('lock-token-123');
  mockReleaseLock.mockResolvedValue(undefined);
  // Default: no wallets modified
  mockWalletUpdateMany.mockResolvedValue(makeUpdateManyResult(0, 0));
  mockWalletFind.mockResolvedValue([]);
  mockQueueAdd.mockResolvedValue(undefined);
});

describe('runBrandedCoinExpiryJob', () => {
  describe('when the Redis lock cannot be acquired', () => {
    it('skips the job without touching Wallet', async () => {
      mockAcquireLock.mockResolvedValue(null);

      await runBrandedCoinExpiryJob();

      expect(mockWalletUpdateMany).not.toHaveBeenCalled();
      expect(mockReleaseLock).not.toHaveBeenCalled();
    });
  });

  describe('when no coins have expired', () => {
    it('calls updateMany for both arrays and makes no notifications', async () => {
      mockWalletUpdateMany.mockResolvedValue(makeUpdateManyResult(0, 0));
      mockWalletFind.mockResolvedValue([]);

      await runBrandedCoinExpiryJob();

      // Two updateMany calls: one for brandedCoins, one for coins
      expect(mockWalletUpdateMany).toHaveBeenCalledTimes(2);
      expect(mockQueueAdd).not.toHaveBeenCalled();
      expect(mockReleaseLock).toHaveBeenCalledWith('job:branded-coin-expiry', 'lock-token-123');
    });
  });

  describe('when brandedCoins past expiresAt exist', () => {
    it('issues the correct updateMany with arrayFilters to mark them isActive=false', async () => {
      // First call = brandedCoins (1 wallet modified), second call = coins (0)
      mockWalletUpdateMany
        .mockResolvedValueOnce(makeUpdateManyResult(1, 1))
        .mockResolvedValueOnce(makeUpdateManyResult(0, 0));

      mockWalletFind.mockResolvedValue([{ user: userId1 }]);

      await runBrandedCoinExpiryJob();

      const [brandedCall, coinsCall] = mockWalletUpdateMany.mock.calls;

      // brandedCoins query filter
      expect(brandedCall[0]).toEqual({
        brandedCoins: { $elemMatch: { expiresAt: { $lte: expect.any(Date) }, isActive: true } },
      });
      // brandedCoins $set update
      expect(brandedCall[1]).toEqual({ $set: { 'brandedCoins.$[elem].isActive': false } });
      // arrayFilters
      expect(brandedCall[2]).toEqual({
        arrayFilters: [{ 'elem.expiresAt': { $lte: expect.any(Date) }, 'elem.isActive': true }],
      });

      // coins array update is similar
      expect(coinsCall[0]).toEqual({
        coins: { $elemMatch: { expiresAt: { $lte: expect.any(Date) }, isActive: true } },
      });
    });

    it('enqueues a notification for each affected user', async () => {
      mockWalletUpdateMany
        .mockResolvedValueOnce(makeUpdateManyResult(2, 2))
        .mockResolvedValueOnce(makeUpdateManyResult(0, 0));

      mockWalletFind.mockResolvedValue([{ user: userId1 }, { user: userId2 }]);

      await runBrandedCoinExpiryJob();

      expect(mockQueueAdd).toHaveBeenCalledTimes(2);
      const firstCall = mockQueueAdd.mock.calls[0];
      expect(firstCall[0]).toBe('branded_coin_expired');
      expect(firstCall[1]).toMatchObject({
        eventType: 'branded_coin_expired',
        channels: ['push'],
        userId: userId1.toString(),
      });
    });

    it('includes brandName and merchantId in the notification payload when branded coin data is present', async () => {
      mockWalletUpdateMany
        .mockResolvedValueOnce(makeUpdateManyResult(1, 1))
        .mockResolvedValueOnce(makeUpdateManyResult(0, 0));

      const pastDate = new Date(Date.now() - 1000);
      mockWalletFind.mockResolvedValue([
        {
          user: userId1,
          brandedCoins: [
            {
              merchantId: merchantId1,
              merchantName: 'BurgerHub',
              amount: 150,
              expiresAt: pastDate,
              isActive: false,
            },
          ],
        },
      ]);

      await runBrandedCoinExpiryJob();

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      const [jobName, jobData] = mockQueueAdd.mock.calls[0];
      expect(jobName).toBe('branded_coin_expired');

      // Core identity fields
      expect(jobData).toMatchObject({
        eventType: 'branded_coin_expired',
        userId: userId1.toString(),
        channels: ['push'],
        source: 'automated',
        category: 'coin_expiry',
      });

      // Brand-specific payload fields
      expect(jobData.payload).toMatchObject({
        title: 'BurgerHub coins expired',
        data: {
          coinType: 'branded',
          brandName: 'BurgerHub',
          coinsExpired: 150,
          merchantId: merchantId1.toString(),
        },
      });

      // Message body should mention the brand name
      expect(jobData.payload.body).toContain('BurgerHub');
    });

    it('falls back to merchantId string when merchantName is absent', async () => {
      mockWalletUpdateMany
        .mockResolvedValueOnce(makeUpdateManyResult(1, 1))
        .mockResolvedValueOnce(makeUpdateManyResult(0, 0));

      const pastDate = new Date(Date.now() - 1000);
      mockWalletFind.mockResolvedValue([
        {
          user: userId1,
          brandedCoins: [
            {
              merchantId: merchantId1,
              // no merchantName
              amount: 50,
              expiresAt: pastDate,
              isActive: false,
            },
          ],
        },
      ]);

      await runBrandedCoinExpiryJob();

      const [, jobData] = mockQueueAdd.mock.calls[0];
      expect(jobData.payload.data.brandName).toBe(merchantId1.toString());
      expect(jobData.payload.data.merchantId).toBe(merchantId1.toString());
    });

    it('falls back to "a partner brand" when neither merchantName nor merchantId is available', async () => {
      mockWalletUpdateMany
        .mockResolvedValueOnce(makeUpdateManyResult(1, 1))
        .mockResolvedValueOnce(makeUpdateManyResult(0, 0));

      mockWalletFind.mockResolvedValue([
        {
          user: userId1,
          brandedCoins: [],
        },
      ]);

      await runBrandedCoinExpiryJob();

      const [, jobData] = mockQueueAdd.mock.calls[0];
      expect(jobData.payload.data.brandName).toBe('a partner brand');
      expect(jobData.payload.data).not.toHaveProperty('merchantId');
    });
  });

  describe('when coins in the main coins array have expired (prive/promo)', () => {
    it('marks coins isActive=false and notifies affected users', async () => {
      mockWalletUpdateMany
        .mockResolvedValueOnce(makeUpdateManyResult(0, 0)) // brandedCoins: nothing
        .mockResolvedValueOnce(makeUpdateManyResult(1, 1)); // coins: 1 wallet

      mockWalletFind.mockResolvedValue([{ user: userId2 }]);

      await runBrandedCoinExpiryJob();

      const [, coinsCall] = mockWalletUpdateMany.mock.calls;
      expect(coinsCall[1]).toEqual({ $set: { 'coins.$[elem].isActive': false } });
      expect(coinsCall[2]).toEqual({
        arrayFilters: [{ 'elem.expiresAt': { $lte: expect.any(Date) }, 'elem.isActive': true }],
      });

      expect(mockQueueAdd).toHaveBeenCalledTimes(1);
      expect(mockQueueAdd.mock.calls[0][1]).toMatchObject({ userId: userId2.toString() });
    });
  });

  describe('when a coin has no expiresAt', () => {
    it('does not expire that coin — updateMany uses $lte filter which excludes docs without expiresAt', async () => {
      // MongoDB $lte on a missing field does not match, so modifiedCount stays 0
      mockWalletUpdateMany.mockResolvedValue(makeUpdateManyResult(0, 0));
      mockWalletFind.mockResolvedValue([]);

      await runBrandedCoinExpiryJob();

      // Confirm the arrayFilter requires expiresAt to be <= now — null/undefined fields
      // are excluded by MongoDB's $lte comparison behaviour.
      const [brandedCall] = mockWalletUpdateMany.mock.calls;
      // Use array form of toHaveProperty so Jest treats 'elem.expiresAt' as a
      // literal object key (not a dot-separated path).
      expect(brandedCall[2].arrayFilters[0]).toHaveProperty(['elem.expiresAt']);
      expect(brandedCall[2].arrayFilters[0]['elem.isActive']).toBe(true);

      expect(mockQueueAdd).not.toHaveBeenCalled();
    });
  });

  describe('when a notification enqueue fails', () => {
    it('continues processing remaining users without throwing', async () => {
      mockWalletUpdateMany
        .mockResolvedValueOnce(makeUpdateManyResult(2, 2))
        .mockResolvedValueOnce(makeUpdateManyResult(0, 0));

      mockWalletFind.mockResolvedValue([{ user: userId1 }, { user: userId2 }]);

      // First notification fails, second succeeds
      mockQueueAdd.mockRejectedValueOnce(new Error('BullMQ connection lost')).mockResolvedValueOnce(undefined);

      // Should not throw
      await expect(runBrandedCoinExpiryJob()).resolves.toBeUndefined();

      expect(mockQueueAdd).toHaveBeenCalledTimes(2);
      // Lock must still be released
      expect(mockReleaseLock).toHaveBeenCalledWith('job:branded-coin-expiry', 'lock-token-123');
    });
  });

  describe('when Wallet.updateMany throws', () => {
    it('releases the lock and does not rethrow', async () => {
      mockWalletUpdateMany.mockRejectedValue(new Error('DB timeout'));

      await expect(runBrandedCoinExpiryJob()).resolves.toBeUndefined();

      expect(mockReleaseLock).toHaveBeenCalledWith('job:branded-coin-expiry', 'lock-token-123');
    });
  });
});
