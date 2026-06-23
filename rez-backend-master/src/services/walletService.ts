import mongoose, { ClientSession, Types } from 'mongoose';
import { Wallet } from '../models/Wallet';
import { CoinTransaction, MainCategorySlug } from '../models/CoinTransaction';
import { LedgerOperationType, LedgerCoinType } from '../models/LedgerEntry';
import { ledgerService } from './ledgerService';
import { invalidateWalletCache } from './walletCacheService';
import { logTransaction } from '../models/TransactionAuditLog';
import redisService from './redisService';
import { createServiceLogger } from '../config/logger';
import { walletTransactionTotal, walletTransactionDuration } from '../config/walletMetrics';

const logger = createServiceLogger('wallet-service');

export interface WalletMutationParams {
  userId: string;
  amount: number;
  source: string;
  description: string;
  operationType: LedgerOperationType;
  referenceId: string;
  referenceModel: string;
  metadata?: Record<string, any>;
  category?: MainCategorySlug | null;
  coinType?: LedgerCoinType;
  session?: ClientSession;
  /**
   * Set to true for REFUNDS ONLY. Allows the credit to proceed even if the
   * wallet is frozen or inactive. Refunds must always be processed —
   * otherwise a frozen user could never reclaim their money. For all
   * other credit types (cashback, loyalty, rewards, sign-up bonus), leave
   * false so the frozen-wallet guard rejects the credit.
   */
  allowOnFrozenWallet?: boolean;
}

export interface WalletMutationResult {
  transactionId: Types.ObjectId | null;
  amount: number;
  newBalance: number;
  source: string;
  description: string;
  category: MainCategorySlug | null;
  ledgerPairId?: string;
}

class WalletService {
  /**
   * Credit coins to a user's wallet.
   * Creates CoinTransaction + atomic Wallet $inc + LedgerEntry (fire-and-forget).
   */
  async credit(params: WalletMutationParams): Promise<WalletMutationResult> {
    const {
      userId, amount, source, description, operationType,
      referenceId, referenceModel, metadata, category, coinType = 'nuqta', session,
      allowOnFrozenWallet = false,
    } = params;

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    // SECURITY: Refuse to credit coins / cashback to a frozen or inactive wallet
    // UNLESS this is an explicit refund (allowOnFrozenWallet=true). A frozen
    // wallet means the account is under fraud / compliance review. Crediting
    // here would defeat the freeze (the balance would grow while the user is
    // supposed to be locked out). Refunds are an exception — the user has a
    // legal right to their money back regardless of account status.
    if (!allowOnFrozenWallet) {
      const walletStatus = await Wallet.findOne({ user: userId })
        .select('isFrozen isActive')
        .lean();
      if (walletStatus && (walletStatus.isFrozen || walletStatus.isActive === false)) {
        logger.error('🚨 [WalletService] Refusing credit to frozen/inactive wallet', {
          userId,
          amount,
          source,
          referenceId,
          isFrozen: walletStatus.isFrozen,
          isActive: walletStatus.isActive,
        });
        throw new Error('Wallet is frozen or inactive — credit refused');
      }
    }

    const lockKey = `wallet:mutate:${userId}`;
    const lockToken = session ? null : await redisService.acquireLock(lockKey, 15);
    if (!session && !lockToken) {
      throw new Error('Could not acquire wallet lock. Another transaction is in progress.');
    }

    const end = walletTransactionDuration.startTimer({ operation: 'credit' });

    try {
      // 1. Create CoinTransaction (append-only log)
      const transaction = await CoinTransaction.createTransaction(
        userId,
        'earned',
        amount,
        source,
        description,
        metadata || {},
        category || null,
        session,
      );

      // 2. Atomic Wallet update via $inc
      await this.atomicWalletCredit(userId, amount, category, session);

      // 3. Fire-and-forget ledger entry
      const ledgerPairId = await this.recordLedgerEntry(
        'credit', userId, amount, coinType, operationType,
        referenceId, referenceModel, description, session,
      );

      // 4. Fire-and-forget audit log
      this.logAudit(userId, 'coin_credit', amount, referenceId, description).catch((err) => logger.error('[WalletService] Audit log for coin_credit failed', { error: err.message, userId, referenceId }));

      // 5. Invalidate cache
      invalidateWalletCache(userId).catch((err) => logger.warn('[WalletService] Wallet cache invalidation failed after credit', { error: err.message, userId }));

      walletTransactionTotal.inc({ operation: 'credit', coinType, status: 'success' });

      return {
        transactionId: transaction._id as Types.ObjectId,
        amount: transaction.amount,
        newBalance: transaction.balance,
        source: transaction.source,
        description: transaction.description,
        category: category || null,
        ledgerPairId,
      };
    } catch (error) {
      walletTransactionTotal.inc({ operation: 'credit', coinType, status: 'failure' });
      throw error;
    } finally {
      end();
      if (lockToken) {
        await redisService.releaseLock(lockKey, lockToken);
      }
    }
  }

  /**
   * Debit coins from a user's wallet.
   * Creates CoinTransaction + atomic Wallet $inc with $gte guard + LedgerEntry (fire-and-forget).
   */
  async debit(params: WalletMutationParams): Promise<WalletMutationResult> {
    const {
      userId, amount, source, description, operationType,
      referenceId, referenceModel, metadata, category, coinType = 'nuqta', session,
    } = params;

    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    const lockKey = `wallet:mutate:${userId}`;
    const lockToken = session ? null : await redisService.acquireLock(lockKey, 15);
    if (!session && !lockToken) {
      throw new Error('Could not acquire wallet lock. Another transaction is in progress.');
    }

    const end = walletTransactionDuration.startTimer({ operation: 'debit' });

    try {
      // 1. Create CoinTransaction (append-only log)
      const transaction = await CoinTransaction.createTransaction(
        userId,
        'spent',
        amount,
        source,
        description,
        metadata || {},
        category || null,
        session,
      );

      // 2. Atomic Wallet debit via $inc with $gte guard
      const deducted = await this.atomicWalletDebit(userId, amount, category, session);
      if (!deducted) {
        // CoinTransaction was already created — this is a known inconsistency
        // that reconciliation will detect. Log critically and throw.
        logger.error('Atomic debit failed — insufficient balance or concurrent update. CoinTransaction orphaned, reconciliation needed.', {
          userId, amount, source, transactionId: transaction._id,
        });
        throw new Error(`Insufficient wallet balance or concurrent update for user ${userId}`);
      }

      // 3. Fire-and-forget ledger entry
      const ledgerPairId = await this.recordLedgerEntry(
        'debit', userId, amount, coinType, operationType,
        referenceId, referenceModel, description, session,
      );

      // 4. Fire-and-forget audit log
      this.logAudit(userId, 'coin_deduction', amount, referenceId, description).catch((err) => logger.error('[WalletService] Audit log for coin_deduction failed', { error: err.message, userId, referenceId }));

      // 5. Invalidate cache
      invalidateWalletCache(userId).catch((err) => logger.warn('[WalletService] Wallet cache invalidation failed after deduction', { error: err.message, userId }));

      walletTransactionTotal.inc({ operation: 'debit', coinType, status: 'success' });

      return {
        transactionId: transaction._id as Types.ObjectId,
        amount: transaction.amount,
        newBalance: transaction.balance,
        source: transaction.source,
        description: transaction.description,
        category: category || null,
        ledgerPairId,
      };
    } catch (error) {
      walletTransactionTotal.inc({ operation: 'debit', coinType, status: 'failure' });
      throw error;
    } finally {
      end();
      if (lockToken) {
        await redisService.releaseLock(lockKey, lockToken);
      }
    }
  }

  /**
   * Atomically credit wallet balance via $inc (no .save() needed).
   */
  private async atomicWalletCredit(
    userId: string, amount: number,
    category?: MainCategorySlug | null, session?: ClientSession,
  ): Promise<void> {
    let wallet = await Wallet.findOne({ user: userId }).lean();

    if (!wallet) {
      wallet = await (Wallet as any).createForUser(new mongoose.Types.ObjectId(userId));
    }
    if (!wallet) return;

    const updateOpts = session ? { session } : {};

    if (category) {
      await Wallet.findByIdAndUpdate(wallet._id, {
        $inc: {
          [`categoryBalances.${category}.available`]: amount,
          [`categoryBalances.${category}.earned`]: amount,
          'statistics.totalEarned': amount,
          'balance.total': amount,
        },
        $set: { lastTransactionAt: new Date() },
      }, updateOpts);
    } else {
      await Wallet.findOneAndUpdate(
        { _id: wallet._id, 'coins.type': 'rez' },
        {
          $inc: {
            'balance.available': amount,
            'balance.total': amount,
            'statistics.totalEarned': amount,
            'coins.$.amount': amount,
          },
          $set: {
            'coins.$.lastUsed': new Date(),
            lastTransactionAt: new Date(),
          },
        },
        updateOpts,
      );
    }
  }

  /**
   * Atomically debit wallet balance via $inc with $gte guard.
   * Returns true if deduction succeeded, false if balance was insufficient.
   */
  private async atomicWalletDebit(
    userId: string, amount: number,
    category?: MainCategorySlug | null, session?: ClientSession,
  ): Promise<boolean> {
    const wallet = await Wallet.findOne({ user: userId }).lean();
    if (!wallet) return false;

    const updateOpts = session ? { session } : {};

    if (category) {
      const result = await Wallet.findOneAndUpdate(
        {
          _id: wallet._id,
          [`categoryBalances.${category}.available`]: { $gte: amount },
        },
        {
          $inc: {
            [`categoryBalances.${category}.available`]: -amount,
            [`categoryBalances.${category}.spent`]: amount,
            'statistics.totalSpent': amount,
            'balance.total': -amount,
          },
          $set: { lastTransactionAt: new Date() },
        },
        updateOpts,
      );
      return !!result;
    }

    const result = await Wallet.findOneAndUpdate(
      {
        _id: wallet._id,
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
      updateOpts,
    );
    return !!result;
  }

  /**
   * Record a double-entry ledger pair. Fire-and-forget — never blocks the caller.
   */
  private async recordLedgerEntry(
    direction: 'credit' | 'debit',
    userId: string,
    amount: number,
    coinType: LedgerCoinType,
    operationType: LedgerOperationType,
    referenceId: string,
    referenceModel: string,
    description: string,
    session?: ClientSession,
  ): Promise<string | undefined> {
    try {
      const userAccountId = new Types.ObjectId(userId);
      const platformAccountId = ledgerService.getPlatformAccountId('platform_float');

      const debitAccount = direction === 'credit'
        ? { type: 'platform_float' as const, id: platformAccountId }
        : { type: 'user_wallet' as const, id: userAccountId };

      const creditAccount = direction === 'credit'
        ? { type: 'user_wallet' as const, id: userAccountId }
        : { type: 'platform_float' as const, id: platformAccountId };

      const pairId = await ledgerService.recordEntry({
        debitAccount,
        creditAccount,
        amount,
        coinType,
        operationType,
        referenceId,
        referenceModel,
        metadata: { description },
      }, session);

      return pairId;
    } catch (error) {
      if (session) {
        // Within a transaction — propagate to trigger rollback
        throw error;
      }

      // Retry once with 100ms delay before giving up (reduces drift from transient failures)
      try {
        await new Promise(resolve => setTimeout(resolve, 100));
        const userAccountId2 = new Types.ObjectId(userId);
        const platformAccountId2 = ledgerService.getPlatformAccountId('platform_float');

        const debitAccount2 = direction === 'credit'
          ? { type: 'platform_float' as const, id: platformAccountId2 }
          : { type: 'user_wallet' as const, id: userAccountId2 };
        const creditAccount2 = direction === 'credit'
          ? { type: 'user_wallet' as const, id: userAccountId2 }
          : { type: 'platform_float' as const, id: platformAccountId2 };

        const retryPairId = await ledgerService.recordEntry({
          debitAccount: debitAccount2,
          creditAccount: creditAccount2,
          amount, coinType, operationType,
          referenceId, referenceModel,
          metadata: { description },
        });
        logger.warn('Ledger entry succeeded on retry', { userId, amount, operationType });
        return retryPairId;
      } catch (retryError) {
        logger.error('Ledger entry FAILED after retry — wallet-to-ledger drift possible', retryError, {
          userId, amount, operationType, referenceId,
        });
        return undefined;
      }
    }
  }

  /**
   * Fire-and-forget audit log.
   */
  private async logAudit(
    userId: string, operation: string, amount: number,
    referenceId: string, description: string,
  ): Promise<void> {
    try {
      const wallet = await Wallet.findOne({ user: userId }).lean();
      if (!wallet) return;
      logTransaction({
        userId: new Types.ObjectId(userId),
        walletId: wallet._id as Types.ObjectId,
        walletType: 'user',
        operation: operation as any,
        amount,
        balanceBefore: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
        balanceAfter: { total: wallet.balance.total, available: wallet.balance.available, pending: 0, cashback: 0 },
        reference: { type: 'other', id: referenceId, description },
        metadata: { source: 'walletService' },
      });
    } catch {
      // Non-blocking
    }
  }
}

export const walletService = new WalletService();
