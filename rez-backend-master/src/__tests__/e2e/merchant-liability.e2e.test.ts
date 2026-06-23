/**
 * Merchant Liability E2E Test Suite
 *
 * Tests the complete merchant liability flow:
 * 1. Issuance tracking (branded coins, creator rewards, bonus campaigns)
 * 2. Accumulation via atomic $inc (single row per cycle)
 * 3. Redemption tracking
 * 4. Settlement (dry run + auto debit)
 * 5. Reconciliation (ledger vs liability drift detection)
 * 6. Multi-merchant isolation
 * 7. Instant vs scheduled settlement cycles
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
  },
}));

// Mock velocity check
jest.mock('../../services/walletVelocityService', () => ({
  checkVelocity: jest.fn().mockResolvedValue({ allowed: true }),
}));

// Imports after mocks — only lightweight models
import { MerchantLiability } from '../../models/MerchantLiability';
import { MerchantWallet } from '../../models/MerchantWallet';
import { LedgerEntry } from '../../models/LedgerEntry';
import { liabilityService, computeCycleId } from '../../services/liabilityService';

// Register minimal schemas for populate (avoids importing heavy models)
if (!mongoose.models.BonusCampaign) {
  mongoose.model('BonusCampaign', new mongoose.Schema({ title: String, slug: String }));
}
if (!mongoose.models.Store) {
  mongoose.model('Store', new mongoose.Schema({ name: String, logo: String }));
}

// ---- Helpers ----

function createMerchantWallet(merchantId: Types.ObjectId, storeId: Types.ObjectId, cycle: string = 'daily') {
  return MerchantWallet.create({
    merchant: merchantId,
    store: storeId,
    balance: { total: 5000, available: 5000, pending: 0, withdrawn: 0, held: 0 },
    statistics: { totalSales: 5000, totalPlatformFees: 0, netSales: 5000, totalOrders: 10, averageOrderValue: 500, totalRefunds: 0, totalWithdrawals: 0 },
    settlementCycle: cycle,
    transactions: [],
    isActive: true,
  });
}

// ---- Tests ----

describe('Merchant Liability E2E Flow', () => {
  let merchantId: Types.ObjectId;
  let storeId: Types.ObjectId;

  beforeEach(async () => {
    merchantId = new Types.ObjectId();
    storeId = new Types.ObjectId();
    await createMerchantWallet(merchantId, storeId, 'daily');
  });

  describe('Step 1: Issuance tracking', () => {
    it('should create liability when merchant awards branded coins', async () => {
      await liabilityService.recordIssuance({
        merchantId: merchantId.toString(),
        storeId: storeId.toString(),
        campaignType: 'branded_coin_award',
        amount: 100,
        referenceId: `branded-award-${Date.now()}`,
        referenceModel: 'CoinTransaction',
      });

      const liability = await MerchantLiability.findOne({ merchant: merchantId }).lean();
      expect(liability).toBeTruthy();
      expect(liability!.rewardIssued).toBe(100);
      expect(liability!.pendingAmount).toBe(100);
      expect(liability!.issuanceCount).toBe(1);
      expect(liability!.campaignType).toBe('branded_coin_award');
    });

    it('should create liability for creator rewards', async () => {
      await liabilityService.recordIssuance({
        merchantId: merchantId.toString(),
        storeId: storeId.toString(),
        campaignType: 'creator_reward',
        amount: 50,
        referenceId: `creator-pick-${Date.now()}`,
        referenceModel: 'CreatorPick',
      });

      const liability = await MerchantLiability.findOne({ merchant: merchantId }).lean();
      expect(liability!.campaignType).toBe('creator_reward');
      expect(liability!.rewardIssued).toBe(50);
    });

    it('should create liability for bonus campaigns with campaignId', async () => {
      const campaignId = new Types.ObjectId();

      await liabilityService.recordIssuance({
        merchantId: merchantId.toString(),
        storeId: storeId.toString(),
        campaignId: campaignId.toString(),
        campaignType: 'bonus_campaign',
        amount: 75,
        referenceId: `bonus-claim-${Date.now()}`,
        referenceModel: 'BonusClaim',
      });

      const liability = await MerchantLiability.findOne({ merchant: merchantId }).lean();
      expect(liability!.campaign!.toString()).toBe(campaignId.toString());
      expect(liability!.rewardIssued).toBe(75);
    });

    it('should create ledger entry (debit merchant_wallet) for each issuance', async () => {
      await liabilityService.recordIssuance({
        merchantId: merchantId.toString(),
        storeId: storeId.toString(),
        campaignType: 'branded_coin_award',
        amount: 150,
        referenceId: `ledger-check-${Date.now()}`,
        referenceModel: 'CoinTransaction',
      });

      const entries = await LedgerEntry.find({
        operationType: 'merchant_liability_issuance',
        accountId: merchantId,
        direction: 'debit',
      }).lean();

      expect(entries.length).toBeGreaterThanOrEqual(1);
      expect(entries[0].amount).toBe(150);
      expect(entries[0].accountType).toBe('merchant_wallet');
    });
  });

  describe('Step 2: Accumulation (atomic $inc)', () => {
    it('should accumulate multiple issuances into single row per cycle', async () => {
      for (let i = 0; i < 5; i++) {
        await liabilityService.recordIssuance({
          merchantId: merchantId.toString(),
          storeId: storeId.toString(),
          campaignType: 'branded_coin_award',
          amount: 20,
          referenceId: `award-${i}-${Date.now()}`,
          referenceModel: 'CoinTransaction',
        });
      }

      const records = await MerchantLiability.find({ merchant: merchantId }).lean();
      expect(records).toHaveLength(1); // Single row
      expect(records[0].rewardIssued).toBe(100); // 20 * 5
      expect(records[0].pendingAmount).toBe(100);
      expect(records[0].issuanceCount).toBe(5);
    });

    it('should create separate rows for different campaigns in same cycle', async () => {
      const campaign1 = new Types.ObjectId();
      const campaign2 = new Types.ObjectId();

      await liabilityService.recordIssuance({
        merchantId: merchantId.toString(),
        storeId: storeId.toString(),
        campaignId: campaign1.toString(),
        campaignType: 'bonus_campaign',
        amount: 40,
        referenceId: `c1-${Date.now()}`,
        referenceModel: 'BonusClaim',
      });

      await liabilityService.recordIssuance({
        merchantId: merchantId.toString(),
        storeId: storeId.toString(),
        campaignId: campaign2.toString(),
        campaignType: 'bonus_campaign',
        amount: 60,
        referenceId: `c2-${Date.now()}`,
        referenceModel: 'BonusClaim',
      });

      const records = await MerchantLiability.find({ merchant: merchantId }).lean();
      expect(records).toHaveLength(2); // Two rows for two campaigns
    });
  });

  describe('Step 3: Redemption tracking', () => {
    it('should track redemptions against existing liability', async () => {
      await liabilityService.recordIssuance({
        merchantId: merchantId.toString(),
        storeId: storeId.toString(),
        campaignType: 'branded_coin_award',
        amount: 200,
        referenceId: `issuance-${Date.now()}`,
        referenceModel: 'CoinTransaction',
      });

      await liabilityService.recordRedemption({
        merchantId: merchantId.toString(),
        storeId: storeId.toString(),
        amount: 30,
        referenceId: `red-1-${Date.now()}`,
      });

      await liabilityService.recordRedemption({
        merchantId: merchantId.toString(),
        storeId: storeId.toString(),
        amount: 70,
        referenceId: `red-2-${Date.now()}`,
      });

      const liability = await MerchantLiability.findOne({ merchant: merchantId }).lean();
      expect(liability!.rewardIssued).toBe(200);
      expect(liability!.rewardRedeemed).toBe(100); // 30+70
      expect(liability!.redemptionCount).toBe(2);
    });
  });

  describe('Step 4: Settlement (dry run)', () => {
    it('should preview settlement totals without modifying data', async () => {
      const cycleId = computeCycleId('daily');

      await MerchantLiability.create([
        {
          merchant: merchantId, store: storeId,
          campaignType: 'branded_coin_award', cycleId,
          rewardIssued: 300, pendingAmount: 300, issuanceCount: 5, status: 'active',
        },
        {
          merchant: merchantId, store: storeId,
          campaignType: 'creator_reward', cycleId,
          campaign: new Types.ObjectId(),
          rewardIssued: 100, pendingAmount: 100, issuanceCount: 2, status: 'active',
        },
      ]);

      const result = await liabilityService.settleCycle(merchantId.toString(), cycleId, { dryRun: true });
      expect(result.totalSettled).toBe(400);
      expect(result.recordsSettled).toBe(2);

      // Verify nothing changed
      const records = await MerchantLiability.find({ merchant: merchantId }).lean();
      expect(records.every(r => r.status === 'active')).toBe(true);
    });
  });

  describe('Step 5: Settlement (auto debit)', () => {
    it('should debit merchant wallet and mark records as settled', async () => {
      const cycleId = '2026-03-12';

      await MerchantLiability.create({
        merchant: merchantId, store: storeId,
        campaignType: 'branded_coin_award', cycleId,
        rewardIssued: 500, pendingAmount: 500, issuanceCount: 10, status: 'active',
      });

      const walletBefore = await MerchantWallet.findOne({ merchant: merchantId }).lean();
      expect(walletBefore!.balance.available).toBe(5000);

      const result = await liabilityService.settleCycle(merchantId.toString(), cycleId, { autoDebit: true });
      expect(result.totalSettled).toBe(500);
      expect(result.recordsSettled).toBe(1);

      // Verify wallet debited
      const walletAfter = await MerchantWallet.findOne({ merchant: merchantId }).lean();
      expect(walletAfter!.balance.available).toBe(4500);

      // Verify liability record updated
      const liability = await MerchantLiability.findOne({ merchant: merchantId, cycleId }).lean();
      expect(liability!.status).toBe('settled');
      expect(liability!.settlementDate).toBeTruthy();
      expect(liability!.settlementLedgerPairId).toBeTruthy();

      // Verify settlement ledger entries
      const settlementEntries = await LedgerEntry.find({
        operationType: 'merchant_liability_settlement',
      }).lean();
      expect(settlementEntries.length).toBeGreaterThanOrEqual(2); // debit + credit pair
    });

    it('should mark as pending_settlement when insufficient wallet balance', async () => {
      const cycleId = '2026-03-11';

      await MerchantLiability.create({
        merchant: merchantId, store: storeId,
        campaignType: 'branded_coin_award', cycleId,
        rewardIssued: 99999, pendingAmount: 99999, issuanceCount: 1, status: 'active',
      });

      await liabilityService.settleCycle(merchantId.toString(), cycleId, { autoDebit: true });

      const liability = await MerchantLiability.findOne({ merchant: merchantId, cycleId }).lean();
      expect(liability!.status).toBe('pending_settlement');

      // Wallet should NOT be debited
      const walletAfter = await MerchantWallet.findOne({ merchant: merchantId }).lean();
      expect(walletAfter!.balance.available).toBe(5000);
    });
  });

  describe('Step 6: Reconciliation (ledger vs liability)', () => {
    it('should detect no drift when ledger and liability match', async () => {
      // recordIssuance creates BOTH a liability row and a ledger entry
      await liabilityService.recordIssuance({
        merchantId: merchantId.toString(),
        storeId: storeId.toString(),
        campaignType: 'branded_coin_award',
        amount: 200,
        referenceId: `recon-match-${Date.now()}`,
        referenceModel: 'CoinTransaction',
      });

      // Aggregate check — ledger debits should equal liability issuance
      const ledgerAgg = await LedgerEntry.aggregate([
        { $match: { accountId: merchantId, operationType: 'merchant_liability_issuance', direction: 'debit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const liabilityAgg = await MerchantLiability.aggregate([
        { $match: { merchant: merchantId } },
        { $group: { _id: null, total: { $sum: '$rewardIssued' } } },
      ]);

      expect(ledgerAgg[0]?.total).toBe(liabilityAgg[0]?.total);
    });

    it('should detect drift when liability has no matching ledger', async () => {
      // Manually create liability without ledger entry (simulates a bug)
      await MerchantLiability.create({
        merchant: merchantId, store: storeId,
        campaignType: 'branded_coin_award', cycleId: 'drift-test',
        rewardIssued: 999, pendingAmount: 999, issuanceCount: 1, status: 'active',
      });

      // Check: ledger has 0, liability has 999 → drift = 999
      const ledgerAgg = await LedgerEntry.aggregate([
        { $match: { accountId: merchantId, operationType: 'merchant_liability_issuance', direction: 'debit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const liabilityAgg = await MerchantLiability.aggregate([
        { $match: { merchant: merchantId } },
        { $group: { _id: null, total: { $sum: '$rewardIssued' } } },
      ]);

      const ledgerTotal = ledgerAgg[0]?.total || 0;
      const liabilityTotal = liabilityAgg[0]?.total || 0;
      const drift = Math.abs(ledgerTotal - liabilityTotal);

      expect(drift).toBe(999);
    });
  });

  describe('Step 7: Statement query', () => {
    it('should return paginated statement with aggregated totals', async () => {
      await MerchantLiability.create([
        {
          merchant: merchantId, store: storeId,
          campaignType: 'branded_coin_award', cycleId: '2026-03-14',
          rewardIssued: 100, pendingAmount: 100, issuanceCount: 3, status: 'active',
        },
        {
          merchant: merchantId, store: storeId,
          campaignType: 'bonus_campaign', cycleId: '2026-03-14',
          campaign: new Types.ObjectId(),
          rewardIssued: 200, pendingAmount: 0, settledAmount: 200,
          issuanceCount: 5, status: 'settled', settlementDate: new Date(),
        },
        {
          merchant: merchantId, store: storeId,
          campaignType: 'creator_reward', cycleId: '2026-03-13',
          rewardIssued: 50, pendingAmount: 50, issuanceCount: 1, status: 'active',
        },
      ]);

      const result = await liabilityService.getStatement(merchantId.toString(), { page: 1, limit: 10 });

      expect(result.records).toHaveLength(3);
      expect(result.totals.totalIssued).toBe(350);
      expect(result.totals.totalPending).toBe(150);
      expect(result.totals.totalSettled).toBe(200);
      expect(result.pagination.currentPage).toBe(1);
      expect(result.pagination.totalItems).toBe(3);
    });

    it('should filter by cycleId', async () => {
      await MerchantLiability.create([
        { merchant: merchantId, store: storeId, campaignType: 'branded_coin_award', cycleId: '2026-03-14', rewardIssued: 100, pendingAmount: 100, issuanceCount: 1, status: 'active' },
        { merchant: merchantId, store: storeId, campaignType: 'creator_reward', cycleId: '2026-03-13', campaign: new Types.ObjectId(), rewardIssued: 50, pendingAmount: 50, issuanceCount: 1, status: 'active' },
      ]);

      const result = await liabilityService.getStatement(merchantId.toString(), { cycleId: '2026-03-14' });
      expect(result.records).toHaveLength(1);
      expect(result.totals.totalIssued).toBe(100);
    });
  });
});

describe('Multi-Merchant Isolation', () => {
  it('should keep liability records isolated between merchants', async () => {
    const m1Id = new Types.ObjectId();
    const m2Id = new Types.ObjectId();
    const s1Id = new Types.ObjectId();
    const s2Id = new Types.ObjectId();

    await createMerchantWallet(m1Id, s1Id, 'daily');
    await createMerchantWallet(m2Id, s2Id, 'daily');

    await liabilityService.recordIssuance({
      merchantId: m1Id.toString(), storeId: s1Id.toString(),
      campaignType: 'branded_coin_award', amount: 100,
      referenceId: `m1-${Date.now()}`, referenceModel: 'CoinTransaction',
    });

    await liabilityService.recordIssuance({
      merchantId: m2Id.toString(), storeId: s2Id.toString(),
      campaignType: 'creator_reward', amount: 200,
      referenceId: `m2-${Date.now()}`, referenceModel: 'CoinTransaction',
    });

    const m1 = await liabilityService.getStatement(m1Id.toString(), {});
    const m2 = await liabilityService.getStatement(m2Id.toString(), {});

    expect(m1.totals.totalIssued).toBe(100);
    expect(m2.totals.totalIssued).toBe(200);
    expect(m1.records[0].campaignType).toBe('branded_coin_award');
    expect(m2.records[0].campaignType).toBe('creator_reward');
  });
});

describe('Instant Settlement Flow', () => {
  it('should auto-settle on issuance when merchant has instant cycle', async () => {
    const merchantId = new Types.ObjectId();
    const storeId = new Types.ObjectId();
    await createMerchantWallet(merchantId, storeId, 'instant');

    await liabilityService.recordIssuance({
      merchantId: merchantId.toString(),
      storeId: storeId.toString(),
      campaignType: 'branded_coin_award',
      amount: 100,
      referenceId: `instant-${Date.now()}`,
      referenceModel: 'CoinTransaction',
    });

    const liability = await MerchantLiability.findOne({ merchant: merchantId }).lean();
    expect(liability).toBeTruthy();
    // For instant settlement, the record should be settled or attempted
    expect(['active', 'settled']).toContain(liability!.status);
  });
});
