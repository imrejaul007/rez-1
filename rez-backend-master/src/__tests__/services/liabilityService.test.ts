/**
 * Liability Service Unit Tests
 *
 * Tests:
 * 1. computeCycleId helper — all 4 cycle types
 * 2. MerchantLiability model — creation, indexes, validation
 * 3. liabilityService.recordIssuance — atomic upsert with $inc
 * 4. liabilityService.recordRedemption — increments on existing record
 * 5. liabilityService.getStatement — paginated query with totals
 * 6. liabilityService.settleCycle — dry run + auto debit
 */

import mongoose, { Types } from 'mongoose';

// Mock Redis (not available in test env)
jest.mock('../../services/redisService', () => ({
  __esModule: true,
  default: {
    acquireLock: jest.fn().mockResolvedValue('lock-token'),
    releaseLock: jest.fn().mockResolvedValue(true),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  },
}));

// Mock velocity check
jest.mock('../../services/walletVelocityService', () => ({
  checkVelocity: jest.fn().mockResolvedValue({ allowed: true }),
}));

// Imports after mocks
import { MerchantLiability } from '../../models/MerchantLiability';
import { MerchantWallet } from '../../models/MerchantWallet';
import { LedgerEntry } from '../../models/LedgerEntry';
import { computeCycleId } from '../../services/liabilityService';
import { liabilityService } from '../../services/liabilityService';
import { Store } from '../../models/Store';
// Register a minimal BonusCampaign schema so .populate('campaign') works
// (importing the full model pulls too many deps and causes OOM in some environments)
if (!mongoose.models.BonusCampaign) {
  mongoose.model('BonusCampaign', new mongoose.Schema({ title: String, slug: String }));
}

// ---- Helpers ----

async function createTestStore(merchantId: Types.ObjectId) {
  return Store.create({
    name: 'Test Store',
    slug: `test-store-${merchantId.toString().slice(-6)}-${Date.now()}`,
    merchantId,
    category: new Types.ObjectId(),
    location: {
      type: 'Point',
      coordinates: [55.27, 25.2],
      address: '123 Test St',
      city: 'Dubai',
      state: 'Dubai',
      country: 'UAE',
    },
    isActive: true,
  });
}

async function createTestMerchantWallet(merchantId: Types.ObjectId, storeId: Types.ObjectId, cycle: string = 'instant') {
  return MerchantWallet.create({
    merchant: merchantId,
    store: storeId,
    balance: { total: 10000, available: 10000, pending: 0, withdrawn: 0, held: 0 },
    statistics: { totalSales: 10000, totalPlatformFees: 0, netSales: 10000, totalOrders: 5, averageOrderValue: 2000, totalRefunds: 0, totalWithdrawals: 0 },
    settlementCycle: cycle,
    transactions: [],
    isActive: true,
  });
}

// ---- Tests ----

describe('computeCycleId', () => {
  it('should return "instant" for instant cycle', () => {
    expect(computeCycleId('instant')).toBe('instant');
    expect(computeCycleId('instant', new Date('2026-06-15'))).toBe('instant');
  });

  it('should return YYYY-MM-DD for daily cycle', () => {
    const date = new Date('2026-03-14T10:30:00Z');
    expect(computeCycleId('daily', date)).toBe('2026-03-14');
  });

  it('should return YYYY-WXX for weekly cycle', () => {
    const date = new Date('2026-03-14T10:30:00Z');
    const result = computeCycleId('weekly', date);
    expect(result).toMatch(/^2026-W\d{2}$/);
  });

  it('should return YYYY-MM for monthly cycle', () => {
    const date = new Date('2026-03-14T10:30:00Z');
    expect(computeCycleId('monthly', date)).toBe('2026-03');
  });

  it('should handle year boundaries correctly', () => {
    // Use midday to avoid timezone conversion issues
    const dec31 = new Date('2026-12-31T12:00:00Z');
    expect(computeCycleId('daily', dec31)).toBe('2026-12-31');
    expect(computeCycleId('monthly', dec31)).toBe('2026-12');

    const jan1 = new Date('2027-01-01T12:00:00Z');
    expect(computeCycleId('daily', jan1)).toBe('2027-01-01');
    expect(computeCycleId('monthly', jan1)).toBe('2027-01');
  });
});

describe('MerchantLiability Model', () => {
  const merchantId = new Types.ObjectId();
  const storeId = new Types.ObjectId();

  it('should create a liability record with required fields', async () => {
    const liability = await MerchantLiability.create({
      merchant: merchantId,
      store: storeId,
      campaignType: 'branded_coin_award',
      cycleId: '2026-03-14',
      rewardIssued: 100,
      pendingAmount: 100,
      issuanceCount: 1,
      status: 'active',
    });

    expect(liability).toBeTruthy();
    expect(liability.merchant.toString()).toBe(merchantId.toString());
    expect(liability.store.toString()).toBe(storeId.toString());
    expect(liability.campaignType).toBe('branded_coin_award');
    expect(liability.cycleId).toBe('2026-03-14');
    expect(liability.rewardIssued).toBe(100);
    expect(liability.pendingAmount).toBe(100);
    expect(liability.issuanceCount).toBe(1);
    expect(liability.status).toBe('active');
    expect(liability.currency).toBe('NC');
    expect(liability.campaign).toBeNull();
    expect(liability.settlementDate).toBeNull();
  });

  it('should default status to active', async () => {
    const liability = await MerchantLiability.create({
      merchant: merchantId,
      store: storeId,
      campaignType: 'bonus_campaign',
      cycleId: 'instant',
    });

    expect(liability.status).toBe('active');
    expect(liability.rewardIssued).toBe(0);
    expect(liability.settledAmount).toBe(0);
  });

  it('should enforce unique compound index (merchant + cycleId + campaign)', async () => {
    await MerchantLiability.create({
      merchant: merchantId,
      store: storeId,
      campaignType: 'branded_coin_award',
      cycleId: '2026-03-15',
      campaign: null,
    });

    await expect(
      MerchantLiability.create({
        merchant: merchantId,
        store: storeId,
        campaignType: 'branded_coin_award',
        cycleId: '2026-03-15',
        campaign: null,
      })
    ).rejects.toThrow();
  });

  it('should reject invalid campaignType', async () => {
    await expect(
      MerchantLiability.create({
        merchant: merchantId,
        store: storeId,
        campaignType: 'invalid_type' as any,
        cycleId: 'instant',
      })
    ).rejects.toThrow();
  });

  it('should reject invalid status', async () => {
    await expect(
      MerchantLiability.create({
        merchant: merchantId,
        store: storeId,
        campaignType: 'branded_coin_award',
        cycleId: 'instant',
        status: 'invalid_status' as any,
      })
    ).rejects.toThrow();
  });

  it('should allow all valid campaignType values', async () => {
    const types = ['branded_coin_award', 'bonus_campaign', 'deal_redemption', 'creator_reward'] as const;

    for (let i = 0; i < types.length; i++) {
      const liability = await MerchantLiability.create({
        merchant: new Types.ObjectId(),
        store: storeId,
        campaignType: types[i],
        cycleId: `cycle-${i}`,
      });
      expect(liability.campaignType).toBe(types[i]);
    }
  });

  it('should allow all valid status values', async () => {
    const statuses = ['active', 'pending_settlement', 'settled', 'disputed', 'void'] as const;

    for (let i = 0; i < statuses.length; i++) {
      const liability = await MerchantLiability.create({
        merchant: new Types.ObjectId(),
        store: storeId,
        campaignType: 'branded_coin_award',
        cycleId: `status-${i}`,
        status: statuses[i],
      });
      expect(liability.status).toBe(statuses[i]);
    }
  });
});

describe('liabilityService.recordIssuance', () => {
  let merchantId: Types.ObjectId;
  let storeId: Types.ObjectId;

  beforeEach(async () => {
    merchantId = new Types.ObjectId();
    const store = await createTestStore(merchantId);
    storeId = store._id as Types.ObjectId;
    await createTestMerchantWallet(merchantId, storeId, 'daily');
  });

  it('should create a new liability record on first issuance', async () => {
    await liabilityService.recordIssuance({
      merchantId: merchantId.toString(),
      storeId: storeId.toString(),
      campaignType: 'branded_coin_award',
      amount: 50,
      referenceId: 'test-ref-1',
      referenceModel: 'CoinTransaction',
    });

    const records = await MerchantLiability.find({ merchant: merchantId }).lean();
    expect(records).toHaveLength(1);
    expect(records[0].rewardIssued).toBe(50);
    expect(records[0].pendingAmount).toBe(50);
    expect(records[0].issuanceCount).toBe(1);
    expect(records[0].status).toBe('active');
  });

  it('should atomically increment on subsequent issuances (same cycle)', async () => {
    const params = {
      merchantId: merchantId.toString(),
      storeId: storeId.toString(),
      campaignType: 'branded_coin_award' as const,
      amount: 30,
      referenceId: 'test-ref',
      referenceModel: 'CoinTransaction',
    };

    await liabilityService.recordIssuance({ ...params, referenceId: 'ref-1' });
    await liabilityService.recordIssuance({ ...params, referenceId: 'ref-2' });
    await liabilityService.recordIssuance({ ...params, referenceId: 'ref-3' });

    const records = await MerchantLiability.find({ merchant: merchantId }).lean();
    expect(records).toHaveLength(1); // Same cycle = single row
    expect(records[0].rewardIssued).toBe(90); // 30 * 3
    expect(records[0].pendingAmount).toBe(90);
    expect(records[0].issuanceCount).toBe(3);
  });

  it('should create a ledger entry for each issuance', async () => {
    await liabilityService.recordIssuance({
      merchantId: merchantId.toString(),
      storeId: storeId.toString(),
      campaignType: 'branded_coin_award',
      amount: 75,
      referenceId: 'ledger-test-ref',
      referenceModel: 'CoinTransaction',
    });

    const ledgerEntries = await LedgerEntry.find({
      operationType: 'merchant_liability_issuance',
      accountId: merchantId,
    }).lean();

    expect(ledgerEntries.length).toBeGreaterThanOrEqual(1);
    const debitEntry = ledgerEntries.find(e => e.direction === 'debit');
    expect(debitEntry).toBeTruthy();
    expect(debitEntry!.amount).toBe(75);
    expect(debitEntry!.accountType).toBe('merchant_wallet');
  });

  it('should skip zero or negative amounts', async () => {
    await liabilityService.recordIssuance({
      merchantId: merchantId.toString(),
      storeId: storeId.toString(),
      campaignType: 'branded_coin_award',
      amount: 0,
      referenceId: 'zero-ref',
      referenceModel: 'CoinTransaction',
    });

    const records = await MerchantLiability.find({ merchant: merchantId }).lean();
    expect(records).toHaveLength(0);
  });

  it('should separate records by campaignId', async () => {
    const campaignId1 = new Types.ObjectId();
    const campaignId2 = new Types.ObjectId();

    await liabilityService.recordIssuance({
      merchantId: merchantId.toString(),
      storeId: storeId.toString(),
      campaignId: campaignId1.toString(),
      campaignType: 'bonus_campaign',
      amount: 40,
      referenceId: 'campaign-1-ref',
      referenceModel: 'BonusClaim',
    });

    await liabilityService.recordIssuance({
      merchantId: merchantId.toString(),
      storeId: storeId.toString(),
      campaignId: campaignId2.toString(),
      campaignType: 'bonus_campaign',
      amount: 60,
      referenceId: 'campaign-2-ref',
      referenceModel: 'BonusClaim',
    });

    const records = await MerchantLiability.find({ merchant: merchantId }).lean();
    expect(records).toHaveLength(2);

    const sorted = records.sort((a, b) => a.rewardIssued - b.rewardIssued);
    expect(sorted[0].rewardIssued).toBe(40);
    expect(sorted[1].rewardIssued).toBe(60);
  });
});

describe('liabilityService.recordRedemption', () => {
  let merchantId: Types.ObjectId;
  let storeId: Types.ObjectId;

  beforeEach(async () => {
    merchantId = new Types.ObjectId();
    const store = await createTestStore(merchantId);
    storeId = store._id as Types.ObjectId;
    await createTestMerchantWallet(merchantId, storeId, 'daily');

    // Seed an active liability
    await MerchantLiability.create({
      merchant: merchantId,
      store: storeId,
      campaignType: 'branded_coin_award',
      cycleId: computeCycleId('daily'),
      rewardIssued: 200,
      pendingAmount: 200,
      issuanceCount: 5,
      status: 'active',
    });
  });

  it('should increment rewardRedeemed and redemptionCount', async () => {
    await liabilityService.recordRedemption({
      merchantId: merchantId.toString(),
      storeId: storeId.toString(),
      amount: 50,
      referenceId: 'redemption-ref-1',
    });

    const record = await MerchantLiability.findOne({ merchant: merchantId }).lean();
    expect(record).toBeTruthy();
    expect(record!.rewardRedeemed).toBe(50);
    expect(record!.redemptionCount).toBe(1);
    // rewardIssued and pendingAmount should be unchanged
    expect(record!.rewardIssued).toBe(200);
    expect(record!.pendingAmount).toBe(200);
  });

  it('should accumulate multiple redemptions', async () => {
    await liabilityService.recordRedemption({
      merchantId: merchantId.toString(),
      storeId: storeId.toString(),
      amount: 30,
      referenceId: 'red-1',
    });
    await liabilityService.recordRedemption({
      merchantId: merchantId.toString(),
      storeId: storeId.toString(),
      amount: 20,
      referenceId: 'red-2',
    });

    const record = await MerchantLiability.findOne({ merchant: merchantId }).lean();
    expect(record!.rewardRedeemed).toBe(50);
    expect(record!.redemptionCount).toBe(2);
  });

  it('should skip zero amounts', async () => {
    await liabilityService.recordRedemption({
      merchantId: merchantId.toString(),
      storeId: storeId.toString(),
      amount: 0,
      referenceId: 'zero-red',
    });

    const record = await MerchantLiability.findOne({ merchant: merchantId }).lean();
    expect(record!.rewardRedeemed).toBe(0);
    expect(record!.redemptionCount).toBe(0);
  });
});

describe('liabilityService.getStatement', () => {
  let merchantId: Types.ObjectId;
  let storeId: Types.ObjectId;

  beforeEach(async () => {
    merchantId = new Types.ObjectId();
    storeId = new Types.ObjectId();

    // Seed multiple liability records
    await MerchantLiability.create([
      {
        merchant: merchantId,
        store: storeId,
        campaignType: 'branded_coin_award',
        cycleId: '2026-03-14',
        rewardIssued: 100,
        pendingAmount: 100,
        issuanceCount: 2,
        status: 'active',
      },
      {
        merchant: merchantId,
        store: storeId,
        campaignType: 'bonus_campaign',
        cycleId: '2026-03-14',
        campaign: new Types.ObjectId(),
        rewardIssued: 200,
        pendingAmount: 0,
        settledAmount: 200,
        issuanceCount: 5,
        status: 'settled',
      },
      {
        merchant: merchantId,
        store: storeId,
        campaignType: 'creator_reward',
        cycleId: '2026-03-13',
        rewardIssued: 50,
        pendingAmount: 50,
        issuanceCount: 1,
        status: 'active',
      },
    ]);
  });

  it('should return paginated records with totals', async () => {
    const result = await liabilityService.getStatement(merchantId.toString(), {});

    expect(result.records).toHaveLength(3);
    expect(result.totals.totalIssued).toBe(350); // 100+200+50
    expect(result.totals.totalPending).toBe(150); // 100+50
    expect(result.totals.totalSettled).toBe(200);
    expect(result.pagination.totalItems).toBe(3);
    expect(result.pagination.currentPage).toBe(1);
  });

  it('should filter by cycleId', async () => {
    const result = await liabilityService.getStatement(merchantId.toString(), {
      cycleId: '2026-03-14',
    });

    expect(result.records).toHaveLength(2);
    expect(result.totals.totalIssued).toBe(300); // 100+200
  });

  it('should filter by status', async () => {
    const result = await liabilityService.getStatement(merchantId.toString(), {
      status: 'settled',
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0].campaignType).toBe('bonus_campaign');
  });

  it('should paginate correctly', async () => {
    const page1 = await liabilityService.getStatement(merchantId.toString(), {
      page: 1,
      limit: 2,
    });

    expect(page1.records).toHaveLength(2);
    expect(page1.pagination.totalPages).toBe(2);
    expect(page1.pagination.hasNextPage).toBe(true);
    expect(page1.pagination.hasPrevPage).toBe(false);

    const page2 = await liabilityService.getStatement(merchantId.toString(), {
      page: 2,
      limit: 2,
    });

    expect(page2.records).toHaveLength(1);
    expect(page2.pagination.hasNextPage).toBe(false);
    expect(page2.pagination.hasPrevPage).toBe(true);
  });

  it('should return empty for unknown merchant', async () => {
    const result = await liabilityService.getStatement(new Types.ObjectId().toString(), {});

    expect(result.records).toHaveLength(0);
    expect(result.totals.totalIssued).toBe(0);
    expect(result.pagination.totalItems).toBe(0);
  });
});

describe('liabilityService.settleCycle', () => {
  let merchantId: Types.ObjectId;
  let storeId: Types.ObjectId;

  beforeEach(async () => {
    merchantId = new Types.ObjectId();
    const store = await createTestStore(merchantId);
    storeId = store._id as Types.ObjectId;
    await createTestMerchantWallet(merchantId, storeId, 'daily');

    // Seed active liabilities
    await MerchantLiability.create([
      {
        merchant: merchantId,
        store: storeId,
        campaignType: 'branded_coin_award',
        cycleId: '2026-03-13',
        rewardIssued: 100,
        pendingAmount: 100,
        issuanceCount: 3,
        status: 'active',
      },
      {
        merchant: merchantId,
        store: storeId,
        campaignType: 'bonus_campaign',
        cycleId: '2026-03-13',
        campaign: new Types.ObjectId(),
        rewardIssued: 150,
        pendingAmount: 150,
        issuanceCount: 2,
        status: 'active',
      },
    ]);
  });

  it('should return totals in dry run without modifying records', async () => {
    const result = await liabilityService.settleCycle(merchantId.toString(), '2026-03-13', {
      dryRun: true,
    });

    expect(result.totalSettled).toBe(250); // 100+150
    expect(result.recordsSettled).toBe(2);

    // Verify records unchanged
    const records = await MerchantLiability.find({ merchant: merchantId }).lean();
    expect(records.every(r => r.status === 'active')).toBe(true);
    expect(records.every(r => r.pendingAmount > 0)).toBe(true);
  });

  it('should mark records as pending_settlement when autoDebit is false', async () => {
    await liabilityService.settleCycle(merchantId.toString(), '2026-03-13', {
      autoDebit: false,
    });

    const records = await MerchantLiability.find({ merchant: merchantId }).lean();
    expect(records.every(r => r.status === 'pending_settlement')).toBe(true);
  });

  it('should return zero when no active liabilities exist', async () => {
    const result = await liabilityService.settleCycle(merchantId.toString(), '2026-03-12', {
      dryRun: true,
    });

    expect(result.totalSettled).toBe(0);
    expect(result.recordsSettled).toBe(0);
  });

  it('should not settle records from a different cycle', async () => {
    // Settle a different cycle
    const result = await liabilityService.settleCycle(merchantId.toString(), '2026-03-14', {
      dryRun: true,
    });

    expect(result.totalSettled).toBe(0);
    expect(result.recordsSettled).toBe(0);

    // Original records should be untouched
    const records = await MerchantLiability.find({ merchant: merchantId }).lean();
    expect(records.every(r => r.status === 'active')).toBe(true);
  });
});

describe('LedgerEntry operation types', () => {
  it('should accept merchant_liability_issuance', async () => {
    const entry = await LedgerEntry.create({
      pairId: 'test-pair-1',
      accountType: 'merchant_wallet',
      accountId: new Types.ObjectId(),
      direction: 'debit',
      amount: 100,
      coinType: 'nuqta',
      runningBalance: 900,
      operationType: 'merchant_liability_issuance',
      referenceId: 'test-ref',
      referenceModel: 'MerchantLiability',
      metadata: {},
    });

    expect(entry.operationType).toBe('merchant_liability_issuance');
  });

  it('should accept merchant_liability_settlement', async () => {
    const entry = await LedgerEntry.create({
      pairId: 'test-pair-2',
      accountType: 'merchant_wallet',
      accountId: new Types.ObjectId(),
      direction: 'debit',
      amount: 500,
      coinType: 'nuqta',
      runningBalance: 500,
      operationType: 'merchant_liability_settlement',
      referenceId: 'settlement-ref',
      referenceModel: 'MerchantLiability',
      metadata: {},
    });

    expect(entry.operationType).toBe('merchant_liability_settlement');
  });
});
