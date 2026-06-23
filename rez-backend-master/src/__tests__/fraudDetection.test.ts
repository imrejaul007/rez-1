/**
 * Fraud Detection Tests
 *
 * Tests for src/services/rewardAbuseDetector.ts and src/utils/velocityTracker.ts
 * All Redis and DB calls are mocked.
 */

import { Types } from 'mongoose';

// ─── Mock Redis ───────────────────────────────────────────────────────────────
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisIncr = jest.fn();
const mockRedisExpire = jest.fn();
const mockRedisExists = jest.fn();

jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    incr: (...args: any[]) => mockRedisIncr(...args),
    expire: (...args: any[]) => mockRedisExpire(...args),
    exists: (...args: any[]) => mockRedisExists(...args),
    isReady: () => true,
  },
}));

// ─── Mock DeviceFingerprint model ─────────────────────────────────────────────
const mockDeviceFingerprintFind = jest.fn();
const mockDeviceFingerprintCountDocuments = jest.fn();
jest.mock('../models/DeviceFingerprint', () => {
  function mkChain(val: any) {
    const q: any = { select: () => q, lean: () => Promise.resolve(val) };
    return q;
  }
  return {
    DeviceFingerprint: {
      find: (...args: any[]) => mkChain(mockDeviceFingerprintFind(...args)),
      countDocuments: (...args: any[]) => mockDeviceFingerprintCountDocuments(...args),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    },
    default: {
      find: (...args: any[]) => mkChain(mockDeviceFingerprintFind(...args)),
      countDocuments: (...args: any[]) => mockDeviceFingerprintCountDocuments(...args),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    },
  };
});

// ─── Mock CoinTransaction model ───────────────────────────────────────────────
const mockCoinTxFindOne = jest.fn();
const mockCoinTxCountDocuments = jest.fn();
jest.mock('../models/CoinTransaction', () => {
  function mkChain(val: any) {
    const q: any = { select: () => q, lean: () => Promise.resolve(val) };
    return q;
  }
  return {
    CoinTransaction: {
      findOne: (...args: any[]) => mkChain(mockCoinTxFindOne(...args)),
      countDocuments: (...args: any[]) => mockCoinTxCountDocuments(...args),
    },
  };
});

// ─── Mock Referral model ──────────────────────────────────────────────────────
const mockReferralFind = jest.fn();
const mockReferralFindOne = jest.fn();
jest.mock('../models/Referral', () => {
  function mkChain(val: any) {
    const q: any = { select: () => q, lean: () => Promise.resolve(val) };
    return q;
  }
  return {
    default: {
      find: (...args: any[]) => mkChain(mockReferralFind(...args)),
      findOne: (...args: any[]) => mkChain(mockReferralFindOne(...args)),
    },
  };
});

// ─── Mock logger ──────────────────────────────────────────────────────────────
jest.mock('../config/logger', () => ({
  createServiceLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────
import rewardAbuseDetector from '../services/rewardAbuseDetector';
import velocityTracker from '../utils/velocityTracker';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Fraud Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
    mockRedisIncr.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(1);
    mockRedisExists.mockResolvedValue(false);
    // Default: no device fingerprints
    mockDeviceFingerprintFind.mockReturnValue([]);
    mockDeviceFingerprintCountDocuments.mockResolvedValue(1);
  });

  // ── Device clustering detection ────────────────────────────────────────────

  describe('Device clustering (checkDeviceCluster)', () => {
    it('does NOT flag when device has ≤ 3 accounts (family scenario)', async () => {
      // User has 1 device; only 2 accounts on that device
      mockDeviceFingerprintFind.mockReturnValue([{ deviceHash: 'hash-abc' }]);
      mockDeviceFingerprintCountDocuments.mockResolvedValue(2); // 2 accounts — under threshold

      const result = await rewardAbuseDetector.checkDeviceCluster(new Types.ObjectId().toString());

      expect(result.flagged).toBe(false);
    });

    it('flags when device has > 3 accounts', async () => {
      // User has 1 device; 4 accounts share that device
      mockDeviceFingerprintFind.mockReturnValue([{ deviceHash: 'hash-xyz' }]);
      mockDeviceFingerprintCountDocuments.mockResolvedValue(4); // 4 accounts — flag

      const result = await rewardAbuseDetector.checkDeviceCluster(new Types.ObjectId().toString());

      expect(result.flagged).toBe(true);
      expect(result.accountsOnDevice).toBeGreaterThan(3);
    });
  });

  // ── Duplicate bill detection ───────────────────────────────────────────────

  describe('Duplicate bill detection (checkBillDuplication)', () => {
    it('allows first bill upload for a merchant', async () => {
      mockCoinTxFindOne.mockReturnValue(null); // No prior transaction

      const result = await rewardAbuseDetector.checkBillDuplication(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(), // merchantId
        2000, // amount
      );

      expect(result.allowed).toBe(true);
    });

    it('blocks duplicate bill within 3 hours (same merchant + same amount)', async () => {
      // Simulate a prior transaction within 3 hours
      mockCoinTxFindOne.mockReturnValue({
        _id: new Types.ObjectId(),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      });

      const result = await rewardAbuseDetector.checkBillDuplication(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
        2000,
      );

      expect(result.allowed).toBe(false);
    });

    it('allows bill from different merchant even if amount is same', async () => {
      // No prior transaction from THIS merchant
      mockCoinTxFindOne.mockReturnValue(null);

      const result = await rewardAbuseDetector.checkBillDuplication(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(), // Different merchant
        2000,
      );

      expect(result.allowed).toBe(true);
    });
  });

  // ── Referral abuse detection ───────────────────────────────────────────────

  describe('Referral abuse detection (checkReferralAbuse)', () => {
    it('allows referral reward when under daily limit', async () => {
      // No device overlap (empty arrays for both users)
      mockDeviceFingerprintFind.mockReturnValue([]);
      mockRedisGet.mockResolvedValue('1'); // 1 reward today, limit is 2

      const result = await rewardAbuseDetector.checkReferralAbuse(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      );

      expect(result.allowed).toBe(true);
    });

    it('blocks referral reward when daily limit is exceeded', async () => {
      // No device overlap
      mockDeviceFingerprintFind.mockReturnValue([]);
      mockRedisGet.mockResolvedValue('5'); // 5 rewards today, exceeds limit

      const result = await rewardAbuseDetector.checkReferralAbuse(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      );

      expect(result.allowed).toBe(false);
    });

    it('blocks self-referral when referrer and referee share a device', async () => {
      // Both users share device 'hash-shared'
      mockDeviceFingerprintFind.mockReturnValue([{ deviceHash: 'hash-shared' }]);

      const result = await rewardAbuseDetector.checkReferralAbuse(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      );

      expect(result.allowed).toBe(false);
    });
  });
});

// ─── Velocity Tracker Tests ───────────────────────────────────────────────────

describe('VelocityTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: incr returns a low count (well within limits)
    mockRedisIncr.mockResolvedValue(1);
    mockRedisExpire.mockResolvedValue(1);
    mockRedisGet.mockResolvedValue(null);
  });

  describe('checkCoinVelocity()', () => {
    it('allows earning when within hourly limit (< 500 coins/hour)', async () => {
      // After incr, total = 300 (well under 500/hour limit)
      mockRedisIncr.mockResolvedValue(300);

      const result = await velocityTracker.checkCoinVelocity(
        new Types.ObjectId().toString(),
        100, // earn 100 more
      );

      expect(result.passed).toBe(true);
    });

    it('blocks earning when hourly limit would be exceeded', async () => {
      // After incr, total = 530 (over 500/hour limit)
      mockRedisIncr.mockResolvedValue(530);

      const result = await velocityTracker.checkCoinVelocity(new Types.ObjectId().toString(), 50);

      expect(result.passed).toBe(false);
    });

    it('fails OPEN on Redis error (logs but does not block)', async () => {
      mockRedisIncr.mockRejectedValue(new Error('Redis connection refused'));

      const result = await velocityTracker.checkCoinVelocity(new Types.ObjectId().toString(), 100);

      // Fail-open: allow the transaction even on Redis error
      expect(result.passed).toBe(true);
    });
  });

  describe('checkCoinVelocity() tracks usage', () => {
    it('increments sliding window counters for the user', async () => {
      await velocityTracker.checkCoinVelocity(new Types.ObjectId().toString(), 100);

      expect(mockRedisIncr).toHaveBeenCalled();
      expect(mockRedisExpire).toHaveBeenCalled();
    });
  });
});
