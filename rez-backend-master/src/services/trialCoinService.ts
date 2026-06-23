import { logger } from '../config/logger';
import { TrialCoinWallet, ITrialCoinWallet } from '../models/TrialCoinWallet';
import { TrialCoinLedger } from '../models/TrialCoinLedger';
import mongoose, { Types } from 'mongoose';

const SUBSCRIPTION_PLANS = {
  basic: { coins: 120, expiryDays: 30 },
  pro: { coins: 350, expiryDays: 30 },
  premium: { coins: 900, expiryDays: 30 },
};

const PURCHASE_PACKS = [
  { coins: 60, price: 49, expiryDays: 60 },
  { coins: 140, price: 99, expiryDays: 60 },
  { coins: 320, price: 199, expiryDays: 60 },
  { coins: 700, price: 399, expiryDays: 60 },
];

class TrialCoinService {
  /**
   * Get wallet, create if not exists
   */
  async getWallet(userId: Types.ObjectId): Promise<ITrialCoinWallet> {
    try {
      let wallet = await TrialCoinWallet.findOne({ userId });

      if (!wallet) {
        wallet = await TrialCoinWallet.create({
          userId,
          balance: 0,
          expiryBuckets: [],
          totalEarned: 0,
          totalSpent: 0,
          totalExpired: 0,
          lastUpdated: new Date(),
        });
        logger.info('[TrialCoinService] Wallet created', { userId: userId.toString() });
      }

      return wallet;
    } catch (error) {
      logger.error('[TrialCoinService] getWallet error', {
        userId: userId.toString(),
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get current balance
   */
  async getBalance(userId: Types.ObjectId): Promise<number> {
    try {
      const wallet = await TrialCoinWallet.findOne({ userId }).lean();
      return wallet?.balance ?? 0;
    } catch (error) {
      logger.error('[TrialCoinService] getBalance error', {
        userId: userId.toString(),
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Deduct coins from earliest-expiring bucket
   */
  async deductCoins(userId: Types.ObjectId, amount: number, referenceId?: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wallet = await TrialCoinWallet.findOne({ userId }).session(session);

      if (!wallet) {
        throw new Error(`Wallet not found for user ${userId}`);
      }

      if (wallet.balance < amount) {
        throw new Error(`Insufficient balance. Required: ${amount}, Available: ${wallet.balance}`);
      }

      // Sort buckets by expiry date (earliest first)
      wallet.expiryBuckets.sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

      let remainingDeduction = amount;

      // Deduct from earliest-expiring buckets first
      for (let i = 0; i < wallet.expiryBuckets.length && remainingDeduction > 0; i++) {
        const bucket = wallet.expiryBuckets[i];
        const deductFromBucket = Math.min(bucket.amount, remainingDeduction);

        bucket.amount -= deductFromBucket;
        remainingDeduction -= deductFromBucket;

        // Mark empty (will be filtered after loop — splice-in-loop skips adjacent elements)
      }

      // Remove empty buckets (filter here — splice-in-loop skips adjacent zero buckets)
      wallet.expiryBuckets = wallet.expiryBuckets.filter((b: any) => b.amount > 0);

      // Update wallet
      wallet.balance -= amount;
      wallet.totalSpent += amount;
      wallet.lastUpdated = new Date();

      await wallet.save({ session });

      // Write to ledger
      await TrialCoinLedger.create(
        [
          {
            userId,
            type: 'spend',
            amount: -amount,
            balanceAfter: wallet.balance,
            referenceId,
          },
        ],
        { session },
      );

      await session.commitTransaction();
      logger.info('[TrialCoinService] Coins deducted', {
        userId: userId.toString(),
        amount,
        referenceId,
      });
    } catch (error) {
      await session.abortTransaction();
      logger.error('[TrialCoinService] deductCoins error', {
        userId: userId.toString(),
        amount,
        error: (error as Error).message,
      });
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Credit coins with expiry
   */
  async creditCoins(
    userId: Types.ObjectId,
    amount: number,
    source: 'subscription' | 'purchase',
    expiresAt: Date,
    referenceId?: string,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const wallet = await TrialCoinWallet.findOne({ userId }).session(session);

      if (!wallet) {
        throw new Error(`Wallet not found for user ${userId}`);
      }

      // Add new expiry bucket
      wallet.expiryBuckets.push({
        amount,
        expiresAt,
        source,
        warningSent: false,
      });

      wallet.balance += amount;
      wallet.totalEarned += amount;
      wallet.lastUpdated = new Date();

      await wallet.save({ session });

      // Write to ledger
      await TrialCoinLedger.create(
        [
          {
            userId,
            type: source === 'subscription' ? 'subscription_allocation' : 'purchase',
            amount,
            balanceAfter: wallet.balance,
            expiresAt,
            referenceId,
          },
        ],
        { session },
      );

      await session.commitTransaction();
      logger.info('[TrialCoinService] Coins credited', {
        userId: userId.toString(),
        amount,
        source,
        expiresAt,
        referenceId,
      });
    } catch (error) {
      await session.abortTransaction();
      logger.error('[TrialCoinService] creditCoins error', {
        userId: userId.toString(),
        amount,
        error: (error as Error).message,
      });
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Allocate subscription coins
   */
  async allocateSubscriptionCoins(userId: Types.ObjectId, plan: 'basic' | 'pro' | 'premium'): Promise<void> {
    const planConfig = SUBSCRIPTION_PLANS[plan];

    if (!planConfig) {
      throw new Error(`Invalid subscription plan: ${plan}`);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + planConfig.expiryDays);

    await this.creditCoins(userId, planConfig.coins, 'subscription', expiresAt, `subscription_${plan}`);
  }

  /**
   * Handle coin purchase
   */
  async purchaseCoins(userId: Types.ObjectId, packIndex: 0 | 1 | 2 | 3, paymentId: string): Promise<void> {
    const pack = PURCHASE_PACKS[packIndex];

    if (!pack) {
      throw new Error(`Invalid pack index: ${packIndex}`);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + pack.expiryDays);

    await this.creditCoins(userId, pack.coins, 'purchase', expiresAt, paymentId);
  }

  /**
   * Expire old coins (called by cron job)
   */
  async expireCoins(): Promise<{ usersProcessed: number; coinsExpired: number }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    let usersProcessed = 0;
    let coinsExpired = 0;

    try {
      const now = new Date();

      // Find all wallets with expired buckets
      const walletsWithExpiredCoins = await TrialCoinWallet.find({
        'expiryBuckets.expiresAt': { $lte: now },
      }).session(session);

      for (const wallet of walletsWithExpiredCoins) {
        let totalExpiredInWallet = 0;

        // Filter out expired buckets
        const expiredBuckets = wallet.expiryBuckets.filter((b) => b.expiresAt.getTime() <= now.getTime());

        for (const bucket of expiredBuckets) {
          totalExpiredInWallet += bucket.amount;
          coinsExpired += bucket.amount;
        }

        if (totalExpiredInWallet > 0) {
          // Update wallet
          wallet.expiryBuckets = wallet.expiryBuckets.filter((b) => b.expiresAt.getTime() > now.getTime());
          wallet.balance -= totalExpiredInWallet;
          wallet.totalExpired += totalExpiredInWallet;
          wallet.lastUpdated = new Date();

          await wallet.save({ session });

          // Write to ledger
          await TrialCoinLedger.create(
            [
              {
                userId: wallet.userId,
                type: 'expired',
                amount: -totalExpiredInWallet,
                balanceAfter: wallet.balance,
                expiresAt: now,
              },
            ],
            { session },
          );

          usersProcessed++;
        }
      }

      await session.commitTransaction();
      logger.info('[TrialCoinService] Expiry job completed', {
        usersProcessed,
        coinsExpired,
      });

      return { usersProcessed, coinsExpired };
    } catch (error) {
      await session.abortTransaction();
      logger.error('[TrialCoinService] expireCoins error', {
        error: (error as Error).message,
      });
      throw error;
    } finally {
      await session.endSession();
    }
  }
}

export default new TrialCoinService();
