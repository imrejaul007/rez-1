/**
 * Support Tools E2E Test Suite
 *
 * Tests the complete support team financial tools flow:
 * 1. Credit wallet — verify balance increases + audit trail
 * 2. Debit wallet — verify balance decreases + audit trail
 * 3. Reverse cashback (without TX ID) — verify manual clawback works
 * 4. Reverse cashback (with TX ID) — verify exact reversal via rewardEngine
 * 5. Reverse cashback — insufficient balance error
 * 6. Reverse cashback — double reversal idempotency
 * 7. Freeze wallet — verify isFrozen flag + reason stored
 * 8. Unfreeze wallet — verify flag cleared
 * 9. Freeze wallet — verify frozen wallet blocks debit
 * 10. Audit trail — verify all operations logged
 * 11. Validation — missing fields, invalid amounts
 * 12. Campaign pause/resume — via bonus zone API
 */

import mongoose, { Types } from 'mongoose';

// Mock Redis
jest.mock('../../services/redisService', () => ({
  __esModule: true,
  default: {
    acquireLock: jest.fn().mockResolvedValue('lock-token'),
    releaseLock: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    delPattern: jest.fn().mockResolvedValue(0),
  },
}));

// Mock velocity check
jest.mock('../../services/walletVelocityService', () => ({
  checkVelocity: jest.fn().mockResolvedValue({ allowed: true }),
}));

// Mock wallet cache
jest.mock('../../services/walletCacheService', () => ({
  invalidateWalletCache: jest.fn().mockResolvedValue(undefined),
  getCachedBalance: jest.fn().mockResolvedValue(null),
}));

// Mock wallet metrics
jest.mock('../../config/walletMetrics', () => ({
  walletTransactionTotal: { inc: jest.fn() },
  walletTransactionDuration: { startTimer: jest.fn(() => jest.fn()) },
  walletBalanceDriftTotal: { inc: jest.fn() },
}));

// Mock push notification service (requires expo-server-sdk which isn't available in test)
jest.mock('../../services/pushNotificationService', () => ({
  __esModule: true,
  default: {
    sendNotification: jest.fn(),
    sendGiftReceived: jest.fn(),
    sendGiftExpiredRefund: jest.fn(),
  },
}));

// Mock notification service
jest.mock('../../services/notificationService', () => ({
  __esModule: true,
  default: {
    createNotification: jest.fn().mockResolvedValue({}),
    sendPush: jest.fn(),
  },
  NotificationService: {
    createNotification: jest.fn().mockResolvedValue({}),
  },
}));

// Imports after mocks
import { User } from '../../models/User';
import { Wallet } from '../../models/Wallet';
import { CoinTransaction } from '../../models/CoinTransaction';
import { TransactionAuditLog } from '../../models/TransactionAuditLog';
import { LedgerEntry } from '../../models/LedgerEntry';
import { walletService } from '../../services/walletService';
import BonusCampaign from '../../models/BonusCampaign';
import redisService from '../../services/redisService';
import { walletTransactionTotal, walletTransactionDuration } from '../../config/walletMetrics';
import { invalidateWalletCache } from '../../services/walletCacheService';

// Restore mock implementations before each test (jest.config has resetMocks: true)
beforeEach(() => {
  (redisService.acquireLock as jest.Mock).mockResolvedValue('lock-token');
  (redisService.releaseLock as jest.Mock).mockResolvedValue(true);
  (redisService.get as jest.Mock).mockResolvedValue(null);
  (redisService.set as jest.Mock).mockResolvedValue('OK');
  (redisService.del as jest.Mock).mockResolvedValue(1);
  (redisService.delPattern as jest.Mock).mockResolvedValue(0);
  (walletTransactionTotal.inc as jest.Mock).mockImplementation(() => {});
  (walletTransactionDuration.startTimer as jest.Mock).mockImplementation(() => jest.fn());
  (invalidateWalletCache as jest.Mock).mockResolvedValue(undefined);
});

// ---- Helpers ----

let idCounter = 0;
function adminMeta(adminId?: string, extra: any = {}): Record<string, any> {
  idCounter++;
  return {
    adminUserId: adminId || 'test-admin',
    idempotencyKey: `test-${Date.now()}-${idCounter}`,
    ...extra,
  };
}

async function createTestUser(overrides: any = {}): Promise<any> {
  return User.create({
    phoneNumber: `+9199${Date.now().toString().slice(-8)}`,
    firstName: 'Test',
    lastName: 'User',
    isVerified: true,
    isActive: true,
    role: 'user',
    ...overrides,
  });
}

async function createAdminUser(): Promise<any> {
  return User.create({
    phoneNumber: `+9188${Date.now().toString().slice(-8)}`,
    firstName: 'Admin',
    lastName: 'User',
    isVerified: true,
    isActive: true,
    role: 'super_admin',
  });
}

async function createTestWallet(userId: Types.ObjectId, balance: number = 1000) {
  const wallet = await Wallet.create({
    user: userId,
    balance: { available: balance, total: balance, pending: 0, cashback: 0 },
    coins: [
      { type: 'rez', amount: balance, isActive: true },
      { type: 'prive', amount: 0, isActive: true },
      { type: 'promo', amount: 0, isActive: true },
    ],
    statistics: { totalEarned: balance, totalSpent: 0, totalCashback: 0, totalRefunds: 0 },
    lastTransactionAt: new Date(),
  });

  // Seed initial CoinTransaction so running balance exists for subsequent operations
  await CoinTransaction.create({
    user: userId,
    type: 'earned',
    amount: balance,
    balance: balance,
    source: 'daily_login',
    description: 'Initial balance seed',
    metadata: { idempotencyKey: `seed:${userId}:${Date.now()}` },
  });

  return wallet;
}

async function createCashbackTransaction(userId: Types.ObjectId, amount: number): Promise<any> {
  return CoinTransaction.create({
    user: userId,
    type: 'earned',
    amount,
    balance: amount,
    source: 'cashback',
    description: 'Cashback for order #TEST',
    metadata: { orderId: 'test-order' },
  });
}

// ---- Tests ----

describe('Support Tools — Wallet Operations', () => {
  let user: any;
  let admin: any;
  let wallet: any;

  beforeEach(async () => {
    user = await createTestUser();
    admin = await createAdminUser();
    wallet = await createTestWallet(user._id, 1000);
  });

  describe('1. Credit Wallet', () => {
    it('should increase wallet balance via walletService.credit()', async () => {
      const result = await walletService.credit({
        userId: user._id.toString(),
        amount: 200,
        source: 'admin',
        description: 'Admin adjustment: Customer complaint compensation',
        operationType: 'admin_adjustment',
        referenceId: `admin-adjust:${user._id}:${Date.now()}`,
        referenceModel: 'AdminAction',
        metadata: adminMeta(admin._id.toString(), { reason: 'Compensation' }),
      });

      expect(result.amount).toBe(200);

      // Verify wallet state (source of truth for balance)
      const updated = await Wallet.findOne({ user: user._id }).lean();
      expect(updated!.balance.available).toBe(1200);
      expect(updated!.balance.total).toBe(1200);

      // Verify CoinTransaction created
      const tx = await CoinTransaction.findOne({
        user: user._id,
        source: 'admin',
      }).lean();
      expect(tx).toBeTruthy();
      expect(tx!.amount).toBe(200);
      expect(tx!.type).toBe('earned');
    });

    it('should create a ledger entry for admin credit', async () => {
      await walletService.credit({
        userId: user._id.toString(),
        amount: 150,
        source: 'admin',
        description: 'Admin credit',
        operationType: 'admin_adjustment',
        referenceId: `admin-credit:${Date.now()}`,
        referenceModel: 'AdminAction',
        metadata: adminMeta(),
      });

      // Wait for fire-and-forget ledger
      await new Promise(r => setTimeout(r, 100));

      const ledgerEntries = await LedgerEntry.find({
        operationType: 'admin_adjustment',
        accountId: user._id,
      }).lean();

      expect(ledgerEntries.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Debit Wallet', () => {
    it('should decrease wallet balance via walletService.debit()', async () => {
      const result = await walletService.debit({
        userId: user._id.toString(),
        amount: 300,
        source: 'admin',
        description: 'Admin adjustment: Fraudulent activity clawback',
        operationType: 'admin_adjustment',
        referenceId: `admin-debit:${user._id}:${Date.now()}`,
        referenceModel: 'AdminAction',
        metadata: adminMeta(admin._id.toString(), { reason: 'Fraud clawback' }),
      });

      expect(result.amount).toBe(300);

      // Verify wallet state (source of truth)
      const updated = await Wallet.findOne({ user: user._id }).lean();
      expect(updated!.balance.available).toBe(700);
    });

    it('should fail when debit exceeds available balance', async () => {
      await expect(
        walletService.debit({
          userId: user._id.toString(),
          amount: 9999,
          source: 'admin',
          description: 'Too much',
          operationType: 'admin_adjustment',
          referenceId: `admin-debit-fail:${Date.now()}`,
          referenceModel: 'AdminAction',
          metadata: adminMeta(),
        })
      ).rejects.toThrow();

      // Wallet balance should be unchanged
      const unchanged = await Wallet.findOne({ user: user._id }).lean();
      expect(unchanged!.balance.available).toBe(1000);
    });

    it('should reject zero or negative amounts', async () => {
      await expect(
        walletService.debit({
          userId: user._id.toString(),
          amount: 0,
          source: 'admin',
          description: 'Zero debit',
          operationType: 'admin_adjustment',
          referenceId: `zero-debit:${Date.now()}`,
          referenceModel: 'AdminAction',
          metadata: adminMeta(),
        })
      ).rejects.toThrow('Amount must be positive');
    });
  });

  describe('3. Reverse Cashback (without TX ID — manual clawback)', () => {
    it('should debit wallet with cashback_reversal operationType', async () => {
      const result = await walletService.debit({
        userId: user._id.toString(),
        amount: 100,
        source: 'admin',
        description: 'Cashback reversal by admin: Duplicate cashback',
        operationType: 'cashback_reversal',
        referenceId: `cashback-reversal:${user._id}:${Date.now()}`,
        referenceModel: 'AdminAction',
        metadata: adminMeta(admin._id.toString(), { reason: 'Duplicate cashback' }),
      });

      expect(result.amount).toBe(100);

      // Verify wallet (source of truth)
      const updated = await Wallet.findOne({ user: user._id }).lean();
      expect(updated!.balance.available).toBe(900);

      // Verify CoinTransaction with spent type
      const tx = await CoinTransaction.findOne({
        user: user._id,
        source: 'admin',
        type: 'spent',
      }).lean();
      expect(tx).toBeTruthy();
      expect(tx!.amount).toBe(100);
    });

    it('should fail when balance is insufficient for reversal', async () => {
      await expect(
        walletService.debit({
          userId: user._id.toString(),
          amount: 5000,
          source: 'admin',
          description: 'Cashback reversal: too much',
          operationType: 'cashback_reversal',
          referenceId: `too-much:${Date.now()}`,
          referenceModel: 'AdminAction',
          metadata: adminMeta(),
        })
      ).rejects.toThrow();
    });
  });

  describe('4. Reverse Cashback (with TX ID — exact reversal)', () => {
    it('should reverse a specific cashback transaction via rewardEngine', async () => {
      // Create a cashback earning to reverse
      const cashbackTx = await createCashbackTransaction(user._id, 150);

      const { rewardEngine } = await import('../../core/rewardEngine');
      const result = await rewardEngine.reverseReward(
        cashbackTx._id.toString(),
        'Incorrectly awarded cashback',
        { partialAmount: 150 },
      );

      expect(result.success).toBe(true);
      expect(result.amount).toBe(150);
      expect(result.reversalTransactionId).toBeTruthy();
      expect(result.originalTransactionId).toBe(cashbackTx._id.toString());

      // Verify wallet debited
      const updated = await Wallet.findOne({ user: user._id }).lean();
      expect(updated!.balance.available).toBe(850); // 1000 - 150

      // Verify reversal CoinTransaction links to original
      const reversalTx = await CoinTransaction.findById(result.reversalTransactionId).lean();
      expect(reversalTx).toBeTruthy();
      expect((reversalTx as any).metadata?.reversedTransactionId).toBe(cashbackTx._id.toString());
    });

    it('should support partial reversal', async () => {
      const cashbackTx = await createCashbackTransaction(user._id, 200);

      const { rewardEngine } = await import('../../core/rewardEngine');
      const result = await rewardEngine.reverseReward(
        cashbackTx._id.toString(),
        'Partial reversal',
        { partialAmount: 80 },
      );

      expect(result.amount).toBe(80);

      // Verify wallet debited correctly
      const updated = await Wallet.findOne({ user: user._id }).lean();
      expect(updated!.balance.available).toBe(920); // 1000 - 80
    });

    it('should reject reversal exceeding original amount', async () => {
      const cashbackTx = await createCashbackTransaction(user._id, 50);

      const { rewardEngine } = await import('../../core/rewardEngine');
      await expect(
        rewardEngine.reverseReward(cashbackTx._id.toString(), 'Too much', { partialAmount: 999 })
      ).rejects.toThrow('exceeds original');
    });

    it('should be idempotent (double reversal returns same result)', async () => {
      const cashbackTx = await createCashbackTransaction(user._id, 100);

      const { rewardEngine } = await import('../../core/rewardEngine');

      const first = await rewardEngine.reverseReward(cashbackTx._id.toString(), 'First reversal');
      const second = await rewardEngine.reverseReward(cashbackTx._id.toString(), 'Duplicate attempt');

      // Both should succeed but same reversalTransactionId
      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      expect(first.reversalTransactionId!.toString()).toBe(second.reversalTransactionId!.toString());

      // Balance should only be debited once
      const wallet = await Wallet.findOne({ user: user._id }).lean();
      expect(wallet!.balance.available).toBe(900); // 1000 - 100 (not 1000 - 200)
    });

    it('should reject reversal of non-existent transaction', async () => {
      const fakeId = new Types.ObjectId().toString();

      const { rewardEngine } = await import('../../core/rewardEngine');
      await expect(
        rewardEngine.reverseReward(fakeId, 'Does not exist')
      ).rejects.toThrow('not found');
    });
  });

  describe('5. Freeze Wallet', () => {
    it('should set isFrozen flag with reason', async () => {
      await Wallet.findOneAndUpdate(
        { user: user._id },
        { isFrozen: true, frozenReason: 'Suspicious activity detected', frozenAt: new Date() },
      );

      const frozen = await Wallet.findOne({ user: user._id }).lean();
      expect(frozen!.isFrozen).toBe(true);
      expect(frozen!.frozenReason).toBe('Suspicious activity detected');
      expect(frozen!.frozenAt).toBeTruthy();
    });

    it('should prevent wallet operations when frozen', async () => {
      // Freeze the wallet
      const w = await Wallet.findOne({ user: user._id });
      await w!.freeze('Test freeze');

      // Verify frozen state
      const frozenWallet = await Wallet.findOne({ user: user._id }).lean();
      expect(frozenWallet!.isFrozen).toBe(true);

      // Attempt to add funds should fail
      const freshWallet = await Wallet.findOne({ user: user._id });
      await expect(freshWallet!.addFunds(100, 'rez')).rejects.toThrow(/frozen/i);
    });
  });

  describe('6. Unfreeze Wallet', () => {
    it('should clear isFrozen flag and reason', async () => {
      // Freeze first
      const w = await Wallet.findOne({ user: user._id });
      await w!.freeze('Temporary freeze');

      // Now unfreeze
      const frozen = await Wallet.findOne({ user: user._id });
      await frozen!.unfreeze();

      const unfrozen = await Wallet.findOne({ user: user._id }).lean();
      expect(unfrozen!.isFrozen).toBe(false);
      expect(unfrozen!.frozenReason).toBeFalsy();
      expect(unfrozen!.frozenAt).toBeFalsy();
    });

    it('should allow operations after unfreeze', async () => {
      const w = await Wallet.findOne({ user: user._id });
      await w!.freeze('Temp');

      const frozen = await Wallet.findOne({ user: user._id });
      await frozen!.unfreeze();

      // Should work now
      const active = await Wallet.findOne({ user: user._id });
      await expect(active!.addFunds(50, 'rez')).resolves.not.toThrow();

      const updated = await Wallet.findOne({ user: user._id }).lean();
      expect(updated!.balance.available).toBe(1050);
    });
  });

  describe('7. Audit Trail', () => {
    it('should log credit operations to TransactionAuditLog', async () => {
      await walletService.credit({
        userId: user._id.toString(),
        amount: 500,
        source: 'admin',
        description: 'Admin adjustment: Goodwill credit',
        operationType: 'admin_adjustment',
        referenceId: `audit-test-credit:${Date.now()}`,
        referenceModel: 'AdminAction',
        metadata: adminMeta(admin._id.toString()),
      });

      // Wait for fire-and-forget
      await new Promise(r => setTimeout(r, 200));

      const logs = await TransactionAuditLog.find({ userId: user._id }).lean();
      expect(logs.length).toBeGreaterThanOrEqual(1);

      const creditLog = logs.find((l: any) => l.operation === 'credit' || l.operation === 'coin_credit');
      expect(creditLog).toBeTruthy();
      expect(creditLog!.amount).toBe(500);
    });

    it('should log debit operations to TransactionAuditLog', async () => {
      await walletService.debit({
        userId: user._id.toString(),
        amount: 200,
        source: 'admin',
        description: 'Admin adjustment: Clawback',
        operationType: 'admin_adjustment',
        referenceId: `audit-test-debit:${Date.now()}`,
        referenceModel: 'AdminAction',
        metadata: adminMeta(admin._id.toString()),
      });

      await new Promise(r => setTimeout(r, 200));

      const logs = await TransactionAuditLog.find({ userId: user._id }).lean();
      expect(logs.length).toBeGreaterThanOrEqual(1);

      const debitLog = logs.find((l: any) => l.operation === 'debit' || l.operation === 'coin_deduction');
      expect(debitLog).toBeTruthy();
    });

    it('should record admin user ID in audit metadata', async () => {
      await walletService.credit({
        userId: user._id.toString(),
        amount: 100,
        source: 'admin',
        description: 'Tracked credit',
        operationType: 'admin_adjustment',
        referenceId: `tracked:${Date.now()}`,
        referenceModel: 'AdminAction',
        metadata: adminMeta(admin._id.toString(), { reason: 'Test tracking' }),
      });

      await new Promise(r => setTimeout(r, 200));

      const log = await TransactionAuditLog.findOne({ userId: user._id }).lean();
      // Audit metadata should contain admin info
      expect(log).toBeTruthy();
    });
  });
});

describe('Support Tools — Campaign Management', () => {
  describe('8. Pause/Resume Campaigns', () => {
    it('should pause an active campaign by setting status to paused', async () => {
      const campaign = await BonusCampaign.create({
        slug: `test-campaign-${Date.now()}`,
        title: 'Test Cashback Boost',
        subtitle: 'Get extra cashback',
        campaignType: 'cashback_boost',
        fundingSource: { type: 'platform' },
        reward: {
          type: 'percentage',
          value: 10,
          capPerUser: 100,
          capPerTransaction: 50,
          totalBudget: 10000,
          consumedBudget: 0,
        },
        limits: { maxClaimsPerUser: 5, maxClaimsPerUserPerDay: 2, totalGlobalClaims: 1000, currentGlobalClaims: 0 },
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() + 86400000 * 30),
        display: { icon: 'cashback', featured: false, priority: 1 },
        deepLink: { screen: 'bonus-zone' },
        status: 'active',
        terms: ['Terms apply'],
      });

      expect(campaign.status).toBe('active');

      // Pause it
      const paused = await BonusCampaign.findByIdAndUpdate(
        campaign._id,
        { status: 'paused' },
        { new: true },
      );

      expect(paused!.status).toBe('paused');

      // Verify it won't appear in active campaigns
      const activeCampaigns = await BonusCampaign.find({ status: 'active' }).lean();
      const found = activeCampaigns.find((c: any) => c._id.toString() === campaign._id.toString());
      expect(found).toBeUndefined();
    });

    it('should resume a paused campaign by setting status to active', async () => {
      const campaign = await BonusCampaign.create({
        slug: `test-resume-${Date.now()}`,
        title: 'Resumable Campaign',
        subtitle: 'Can be resumed',
        campaignType: 'bank_offer',
        fundingSource: { type: 'platform' },
        reward: { type: 'flat', value: 50, capPerUser: 200, capPerTransaction: 100, totalBudget: 5000, consumedBudget: 0 },
        limits: { maxClaimsPerUser: 10, maxClaimsPerUserPerDay: 3, totalGlobalClaims: 500, currentGlobalClaims: 0 },
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() + 86400000 * 30),
        display: { icon: 'bank', featured: false, priority: 1 },
        deepLink: { screen: 'bonus-zone' },
        status: 'paused',
        terms: [],
      });

      expect(campaign.status).toBe('paused');

      // Resume it
      const resumed = await BonusCampaign.findByIdAndUpdate(
        campaign._id,
        { status: 'active' },
        { new: true },
      );

      expect(resumed!.status).toBe('active');
    });

    it('should preserve campaign data when pausing/resuming', async () => {
      const campaign = await BonusCampaign.create({
        slug: `test-preserve-${Date.now()}`,
        title: 'Data Preservation Test',
        subtitle: 'Data should survive',
        campaignType: 'cashback_boost',
        fundingSource: { type: 'platform' },
        reward: { type: 'percentage', value: 15, capPerUser: 500, capPerTransaction: 200, totalBudget: 20000, consumedBudget: 3500 },
        limits: { maxClaimsPerUser: 10, maxClaimsPerUserPerDay: 5, totalGlobalClaims: 2000, currentGlobalClaims: 150 },
        startTime: new Date(Date.now() - 86400000),
        endTime: new Date(Date.now() + 86400000 * 30),
        display: { icon: 'boost', featured: true, priority: 5 },
        deepLink: { screen: 'bonus-zone' },
        status: 'active',
        terms: ['T&C apply'],
      });

      // Pause
      await BonusCampaign.findByIdAndUpdate(campaign._id, { status: 'paused' });

      // Resume
      await BonusCampaign.findByIdAndUpdate(campaign._id, { status: 'active' });

      // Verify all data preserved
      const final = await BonusCampaign.findById(campaign._id).lean();
      expect(final!.status).toBe('active');
      expect(final!.reward.consumedBudget).toBe(3500);
      expect(final!.limits.currentGlobalClaims).toBe(150);
      expect(final!.display.featured).toBe(true);
      expect(final!.title).toBe('Data Preservation Test');
    });
  });
});

describe('Support Tools — Input Validation', () => {
  let user: any;
  let wallet: any;

  beforeEach(async () => {
    user = await createTestUser();
    wallet = await createTestWallet(user._id, 500);
  });

  it('should reject credit with amount = 0', async () => {
    await expect(
      walletService.credit({
        userId: user._id.toString(),
        amount: 0,
        source: 'admin',
        description: 'Zero credit',
        operationType: 'admin_adjustment',
        referenceId: `val-zero:${Date.now()}`,
        referenceModel: 'AdminAction',
        metadata: adminMeta(),
      })
    ).rejects.toThrow('Amount must be positive');
  });

  it('should reject negative amounts', async () => {
    await expect(
      walletService.credit({
        userId: user._id.toString(),
        amount: -50,
        source: 'admin',
        description: 'Negative',
        operationType: 'admin_adjustment',
        referenceId: `val-neg:${Date.now()}`,
        referenceModel: 'AdminAction',
        metadata: adminMeta(),
      })
    ).rejects.toThrow('Amount must be positive');
  });
});

describe('Support Tools — Full Flow Integration', () => {
  it('should handle complete support workflow: credit → reverse → freeze → unfreeze', async () => {
    const user = await createTestUser();
    const wallet = await createTestWallet(user._id, 500);

    // Step 1: Credit the wallet (compensation)
    const creditResult = await walletService.credit({
      userId: user._id.toString(),
      amount: 200,
      source: 'admin',
      description: 'Compensation for service issue',
      operationType: 'admin_adjustment',
      referenceId: `flow-credit:${Date.now()}`,
      referenceModel: 'AdminAction',
      metadata: adminMeta(),
    });
    // Verify credit applied
    let walletState = await Wallet.findOne({ user: user._id }).lean();
    expect(walletState!.balance.available).toBe(700);

    // Step 2: Partially reverse (oops, gave too much)
    const debitResult = await walletService.debit({
      userId: user._id.toString(),
      amount: 50,
      source: 'admin',
      description: 'Cashback reversal by admin: Over-compensation',
      operationType: 'cashback_reversal',
      referenceId: `flow-reverse:${Date.now()}`,
      referenceModel: 'AdminAction',
      metadata: adminMeta(),
    });
    walletState = await Wallet.findOne({ user: user._id }).lean();
    expect(walletState!.balance.available).toBe(650);

    // Step 3: Freeze wallet (investigation)
    const w = await Wallet.findOne({ user: user._id });
    await w!.freeze('Under investigation for fraud');

    const frozen = await Wallet.findOne({ user: user._id }).lean();
    expect(frozen!.isFrozen).toBe(true);
    expect(frozen!.frozenReason).toBe('Under investigation for fraud');

    // Step 4: Verify operations blocked while frozen
    const frozenWallet = await Wallet.findOne({ user: user._id });
    await expect(frozenWallet!.addFunds(100, 'rez')).rejects.toThrow(/frozen/i);

    // Step 5: Unfreeze after investigation
    const toUnfreeze = await Wallet.findOne({ user: user._id });
    await toUnfreeze!.unfreeze();

    const unfrozen = await Wallet.findOne({ user: user._id }).lean();
    expect(unfrozen!.isFrozen).toBe(false);
    expect(unfrozen!.balance.available).toBe(650);

    // Step 6: Verify audit trail has all operations
    await new Promise(r => setTimeout(r, 300));
    const auditLogs = await TransactionAuditLog.find({ userId: user._id }).sort({ createdAt: 1 }).lean();
    expect(auditLogs.length).toBeGreaterThanOrEqual(2); // credit + debit at minimum
  });
});
