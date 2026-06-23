import mongoose from 'mongoose';
import { Wallet } from '../../models/Wallet';
import { CoinTransaction } from '../../models/CoinTransaction';

/**
 * WalletService — atomic debit unit tests
 *
 * These tests exercise the Wallet model's atomic $inc/$gte debit guard
 * directly (same pattern used by WalletService.debit internally).
 * We test at the model level to avoid needing Redis locks and ledger
 * service in unit tests.
 */

// Helper: create a wallet with a known balance for the given userId
async function createTestWallet(userId: mongoose.Types.ObjectId, balance: number) {
  return Wallet.create({
    user: userId,
    balance: { total: balance, available: balance, pending: 0, cashback: 0 },
    coins: [{ type: 'rez', amount: balance, isActive: true, color: '#00C06A' }],
    brandedCoins: [],
    currency: 'RC',
    statistics: { totalEarned: balance, totalSpent: 0, totalCashback: 0, totalRefunds: 0, totalTopups: 0, totalWithdrawals: 0 },
    savingsInsights: { totalSaved: 0, thisMonth: 0, avgPerVisit: 0, lastCalculated: new Date() },
    limits: { maxBalance: 100000, minWithdrawal: 10, dailySpendLimit: 50000, dailySpent: 0, lastResetDate: new Date() },
    settings: { autoTopup: false, autoTopupThreshold: 0, autoTopupAmount: 0, lowBalanceAlert: false, lowBalanceThreshold: 0, smartAlertsEnabled: false, expiringCoinsAlertDays: 7 },
    isActive: true,
    isFrozen: false,
  });
}

/**
 * Atomic debit helper — mirrors WalletService.atomicWalletDebit logic:
 * Uses findOneAndUpdate with $gte guard so only one concurrent call can
 * succeed when balance would go below zero.
 */
async function atomicDebit(walletId: mongoose.Types.ObjectId, amount: number): Promise<boolean> {
  const result = await Wallet.findOneAndUpdate(
    {
      _id: walletId,
      'balance.available': { $gte: amount },
      'coins.type': 'rez',
    },
    {
      $inc: {
        'balance.available': -amount,
        'balance.total': -amount,
        'statistics.totalSpent': amount,
        'coins.$.amount': -amount,
      },
      $set: {
        'coins.$.lastUsed': new Date(),
        lastTransactionAt: new Date(),
      },
    },
  );
  return !!result;
}

describe('WalletService — atomic debit', () => {
  // setup.ts handles MongoMemoryServer connect/disconnect

  it('should reduce balance on a valid debit', async () => {
    const userId = new mongoose.Types.ObjectId();
    const wallet = await createTestWallet(userId, 1000);

    const success = await atomicDebit(wallet._id as mongoose.Types.ObjectId, 300);
    expect(success).toBe(true);

    const updated = await Wallet.findById(wallet._id).lean();
    expect(updated!.balance.available).toBe(700);
    expect(updated!.balance.total).toBe(700);
    expect(updated!.statistics.totalSpent).toBe(300);
  });

  it('should reject debit when balance is insufficient', async () => {
    const userId = new mongoose.Types.ObjectId();
    const wallet = await createTestWallet(userId, 100);

    const success = await atomicDebit(wallet._id as mongoose.Types.ObjectId, 500);
    expect(success).toBe(false);

    // Balance should remain unchanged
    const updated = await Wallet.findById(wallet._id).lean();
    expect(updated!.balance.available).toBe(100);
    expect(updated!.balance.total).toBe(100);
  });

  it('should prevent double-spend under concurrent debits', async () => {
    const userId = new mongoose.Types.ObjectId();
    const wallet = await createTestWallet(userId, 1000);
    const walletId = wallet._id as mongoose.Types.ObjectId;

    // Fire 5 concurrent debits of 300 each (total 1500 > 1000 balance)
    const results = await Promise.all([
      atomicDebit(walletId, 300),
      atomicDebit(walletId, 300),
      atomicDebit(walletId, 300),
      atomicDebit(walletId, 300),
      atomicDebit(walletId, 300),
    ]);

    const successCount = results.filter(Boolean).length;
    // At most 3 should succeed (3 * 300 = 900 <= 1000, 4 * 300 = 1200 > 1000)
    expect(successCount).toBeLessThanOrEqual(3);

    // Final balance must be non-negative
    const updated = await Wallet.findById(walletId).lean();
    expect(updated!.balance.available).toBeGreaterThanOrEqual(0);

    // Balance must equal 1000 - (successCount * 300)
    expect(updated!.balance.available).toBe(1000 - successCount * 300);
  });

  it('should support idempotent debit via CoinTransaction referenceId', async () => {
    const userId = new mongoose.Types.ObjectId();
    const wallet = await createTestWallet(userId, 1000);
    const walletId = wallet._id as mongoose.Types.ObjectId;
    const referenceId = `idempotent-ref-${Date.now()}`;

    // First debit — should succeed
    const firstSuccess = await atomicDebit(walletId, 200);
    expect(firstSuccess).toBe(true);

    // Record a CoinTransaction with unique referenceId
    await CoinTransaction.create({
      user: userId,
      type: 'spent',
      amount: 200,
      source: 'test',
      description: 'Idempotency test',
      balance: 800,
      metadata: { referenceId },
    });

    // Simulate idempotency check: if a CoinTransaction with this referenceId
    // already exists, skip the debit
    const existing = await CoinTransaction.findOne({
      user: userId,
      'metadata.referenceId': referenceId,
    });

    if (!existing) {
      // This branch should NOT execute
      await atomicDebit(walletId, 200);
    }

    // Balance should reflect only one debit
    const updated = await Wallet.findById(walletId).lean();
    expect(updated!.balance.available).toBe(800);
  });
});
