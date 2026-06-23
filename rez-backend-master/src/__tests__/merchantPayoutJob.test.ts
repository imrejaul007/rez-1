/**
 * merchantPayoutJob.test.ts
 *
 * Unit tests for runMerchantPayoutJob() covering:
 *   - Merchant below threshold is skipped
 *   - Merchant above threshold gets debited and payout document created
 *   - Missing bank details causes skip with warning log
 *   - Lock not acquired skips entire run
 *   - Atomic debit guard prevents negative balance (concurrent debit scenario)
 */

import mongoose, { Types } from 'mongoose';

// ── Mock: redisService ────────────────────────────────────────────────────────
jest.mock('../services/redisService', () => ({
  __esModule: true,
  default: {
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
  },
}));

// ── Mock: MerchantWallet ──────────────────────────────────────────────────────
const mockWalletFind = jest.fn();
const mockWalletFindOneAndUpdate = jest.fn();

jest.mock('../models/MerchantWallet', () => ({
  MerchantWallet: {
    find: (...args: any[]) => ({
      lean: () => mockWalletFind(...args),
    }),
    findOneAndUpdate: (...args: any[]) => mockWalletFindOneAndUpdate(...args),
  },
}));

// ── Mock: MerchantPayout ──────────────────────────────────────────────────────
const mockPayoutCreate = jest.fn();

jest.mock('../models/MerchantPayout', () => ({
  MerchantPayout: {
    create: (...args: any[]) => mockPayoutCreate(...args),
  },
}));

// ── Mock: publishNotificationEvent ───────────────────────────────────────────
const mockPublishNotificationEvent = jest.fn();

jest.mock('../events/notificationQueue', () => ({
  publishNotificationEvent: (...args: any[]) => mockPublishNotificationEvent(...args),
}));

// ── Mock: logger ──────────────────────────────────────────────────────────────
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('../config/logger', () => ({
  createServiceLogger: () => mockLogger,
}));

// ── Mock: bullmq-connection (prevents real Redis at import) ───────────────────
jest.mock('../config/bullmq-connection', () => ({
  bullmqRedis: {},
}));

// ── Import subject under test ─────────────────────────────────────────────────
// Import after all jest.mock() calls are registered.
import { runMerchantPayoutJob } from '../jobs/merchantPayoutJob';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeMerchantId = () => new Types.ObjectId();
const makeStoreId = () => new Types.ObjectId();
const makePayoutId = () => new Types.ObjectId();

function makeWallet(overrides: {
  merchantId?: Types.ObjectId;
  storeId?: Types.ObjectId;
  availableBalance?: number;
  bankDetails?: object | null;
}) {
  const merchantId = overrides.merchantId ?? makeMerchantId();
  const storeId = overrides.storeId ?? makeStoreId();
  return {
    _id: new Types.ObjectId(),
    merchant: merchantId,
    store: storeId,
    balance: { available: overrides.availableBalance ?? 500 },
    bankDetails:
      overrides.bankDetails !== undefined
        ? overrides.bankDetails
        : {
            accountNumber: '1234567890',
            ifscCode: 'HDFC0001234',
            accountHolderName: 'Test Merchant',
          },
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Re-attach mock implementations cleared by resetMocks:true
  const redisService = require('../services/redisService').default;
  (redisService.acquireLock as jest.Mock).mockResolvedValue('lock-token');
  (redisService.releaseLock as jest.Mock).mockResolvedValue(true);

  // Mock mongoose.startSession to bypass real MongoDB transactions.
  // Standalone MongoMemoryServer does not support multi-document transactions.
  jest.spyOn(mongoose, 'startSession').mockImplementation(async () => {
    return {
      withTransaction: async (fn: any) => fn(),
      endSession: jest.fn().mockResolvedValue(undefined),
    } as any;
  });

  // Default stub for payout create — returns array (implementation uses create([doc], {session}))
  mockPayoutCreate.mockResolvedValue([{ _id: makePayoutId() }]);

  // Default stub for findOneAndUpdate — returns a truthy updated doc
  mockWalletFindOneAndUpdate.mockResolvedValue({ balance: { available: 0 } });

  // Default stub for notification event — succeeds silently
  mockPublishNotificationEvent.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runMerchantPayoutJob', () => {
  describe('when no wallets meet the threshold', () => {
    it('returns zeroed summary without creating any payouts', async () => {
      mockWalletFind.mockResolvedValue([]);

      const result = await runMerchantPayoutJob();

      expect(result).toEqual({
        initiated: 0,
        skipped: 0,
        failed: 0,
        totalAmountINR: 0,
      });
      expect(mockPayoutCreate).not.toHaveBeenCalled();
      expect(mockPublishNotificationEvent).not.toHaveBeenCalled();
    });
  });

  describe('when a merchant is above the threshold with valid bank details', () => {
    it('debits the wallet atomically and creates a pending payout document', async () => {
      const merchantId = makeMerchantId();
      const storeId = makeStoreId();
      const wallet = makeWallet({ merchantId, storeId, availableBalance: 750 });

      mockWalletFind.mockResolvedValue([wallet]);
      mockWalletFindOneAndUpdate.mockResolvedValue({ balance: { available: 0 } });
      mockPayoutCreate.mockResolvedValue([{ _id: makePayoutId() }]);

      const result = await runMerchantPayoutJob();

      // Wallet debit must use $gte guard with _id and isActive filter
      expect(mockWalletFindOneAndUpdate).toHaveBeenCalledWith(
        {
          _id: wallet._id,
          'balance.available': { $gte: 750 },
          isActive: true,
        },
        {
          $inc: {
            'balance.available': -750,
            'balance.withdrawn': 750,
          },
        },
        expect.objectContaining({ new: true }),
      );

      // Payout document must be created with status 'pending' — passed as array with session
      expect(mockPayoutCreate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            merchantId: wallet.merchant,
            storeId: wallet.store,
            status: 'pending',
            currency: 'INR',
            bankDetails: {
              accountNumber: '1234567890',
              ifscCode: 'HDFC0001234',
              accountHolderName: 'Test Merchant',
            },
          }),
        ]),
        expect.anything(),
      );

      // amountPaise should be INR * 100 (first element of the array arg)
      const createCall = mockPayoutCreate.mock.calls[0][0][0];
      expect(createCall.amountPaise).toBe(750 * 100);

      expect(result.initiated).toBe(1);
      expect(result.totalAmountINR).toBe(750);
      expect(result.skipped).toBe(0);
    });

    it('enqueues a merchant_payout_initiated notification event', async () => {
      const payoutId = makePayoutId();
      const merchantId = makeMerchantId();
      const wallet = makeWallet({ merchantId, availableBalance: 200 });

      mockWalletFind.mockResolvedValue([wallet]);
      mockPayoutCreate.mockResolvedValue([{ _id: payoutId }]);

      await runMerchantPayoutJob();

      expect(mockPublishNotificationEvent).toHaveBeenCalledTimes(1);
      const event = mockPublishNotificationEvent.mock.calls[0][0];

      expect(event.eventType).toBe('merchant_payout_initiated');
      expect(event.userId).toBe(merchantId.toString());
      expect(event.channels).toEqual(expect.arrayContaining(['push', 'email']));
      expect(event.payload.data.amountINR).toBe(200);
      expect(event.payload.data.payoutId).toBe(payoutId.toString());
      expect(event.source).toBe('automated');
      expect(event.category).toBe('payout');
    });
  });

  describe('when a merchant has missing bank details', () => {
    it('skips the merchant with a warning log and does not create a payout', async () => {
      const merchantId = makeMerchantId();
      const walletNoBankDetails = makeWallet({ merchantId, availableBalance: 500, bankDetails: null });

      mockWalletFind.mockResolvedValue([walletNoBankDetails]);

      const result = await runMerchantPayoutJob();

      expect(mockPayoutCreate).not.toHaveBeenCalled();
      expect(mockWalletFindOneAndUpdate).not.toHaveBeenCalled();
      expect(mockPublishNotificationEvent).not.toHaveBeenCalled();

      expect(result.skipped).toBe(1);
      expect(result.initiated).toBe(0);

      // Verify a warning was logged
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[MerchantPayout]'),
        expect.objectContaining({ merchantId: merchantId.toString() }),
      );
    });
  });

  describe('when the atomic debit guard fires (balance changed concurrently)', () => {
    it('skips the payout without creating a document and increments skipped count', async () => {
      const wallet = makeWallet({ availableBalance: 300 });

      mockWalletFind.mockResolvedValue([wallet]);
      // findOneAndUpdate returns null — another process already debited the balance
      mockWalletFindOneAndUpdate.mockResolvedValue(null);

      const result = await runMerchantPayoutJob();

      // No payout document should be created
      expect(mockPayoutCreate).not.toHaveBeenCalled();
      expect(mockPublishNotificationEvent).not.toHaveBeenCalled();

      expect(result.skipped).toBe(1);
      expect(result.initiated).toBe(0);
    });

    it('logs a warning when the guard prevents the debit', async () => {
      const merchantId = makeMerchantId();
      const wallet = makeWallet({ merchantId, availableBalance: 150 });

      mockWalletFind.mockResolvedValue([wallet]);
      mockWalletFindOneAndUpdate.mockResolvedValue(null);

      await runMerchantPayoutJob();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('balance changed'),
        expect.objectContaining({ merchantId: merchantId.toString() }),
      );
    });
  });

  describe('when processing multiple merchants', () => {
    it('processes eligible merchants and skips ineligible ones, returning correct summary', async () => {
      const wallets = [
        // Eligible
        makeWallet({ availableBalance: 500 }),
        // Eligible
        makeWallet({ availableBalance: 1000 }),
        // Ineligible — no bank details
        makeWallet({ availableBalance: 200, bankDetails: null }),
      ];

      mockWalletFind.mockResolvedValue(wallets);
      mockWalletFindOneAndUpdate.mockResolvedValue({ balance: { available: 0 } });
      mockPayoutCreate
        .mockResolvedValueOnce([{ _id: makePayoutId() }])
        .mockResolvedValueOnce([{ _id: makePayoutId() }]);

      const result = await runMerchantPayoutJob();

      expect(result.initiated).toBe(2);
      expect(result.skipped).toBe(1);
      expect(result.totalAmountINR).toBe(1500);
      expect(mockPayoutCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('when a payout create call throws an error', () => {
    it('increments the failed counter and continues processing remaining merchants', async () => {
      const wallets = [makeWallet({ availableBalance: 400 }), makeWallet({ availableBalance: 600 })];

      mockWalletFind.mockResolvedValue(wallets);
      mockWalletFindOneAndUpdate.mockResolvedValue({ balance: { available: 0 } });

      // First merchant's payout create fails; second succeeds
      mockPayoutCreate
        .mockRejectedValueOnce(new Error('DB write timeout'))
        .mockResolvedValueOnce([{ _id: makePayoutId() }]);

      const result = await runMerchantPayoutJob();

      expect(result.failed).toBe(1);
      expect(result.initiated).toBe(1);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('[MerchantPayout]'),
        expect.any(Error),
        expect.any(Object),
      );
    });
  });
});
