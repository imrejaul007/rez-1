import { CoinGift } from '../models/CoinGift';
import { Wallet } from '../models/Wallet';
import { CoinTransaction } from '../models/CoinTransaction';
import { User } from '../models/User';
import { logTransaction } from '../models/TransactionAuditLog';
import { ledgerService } from '../services/ledgerService';
import { runFinancialTxn } from '../utils/financialTransactionWrapper';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import { invalidateWalletCache } from '../services/walletCacheService';
import pushNotificationService from '../services/pushNotificationService';
import mongoose from 'mongoose';

const logger = createServiceLogger('gift-expiry');

/**
 * Gift Expiry Processing Job
 * Runs daily.
 * Finds unclaimed gifts past their expiresAt date and:
 * 1. Marks them as 'expired'
 * 2. Refunds the sender's wallet
 * 3. Creates a reversing ledger entry
 */
export async function runGiftExpiry(): Promise<void> {
  const lockKey = 'job:gift-expiry';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 600); // 10min lock
    if (!lockToken) {
      logger.info('Gift expiry job skipped — lock held');
      return;
    }

    const now = new Date();
    const expiredGifts = await CoinGift.find({
      status: 'delivered',
      expiresAt: { $lt: now },
    }).limit(500);

    if (expiredGifts.length === 0) {
      logger.info('No expired gifts found');
      await redisService.releaseLock(lockKey, lockToken);
      return;
    }

    logger.info(`Found ${expiredGifts.length} expired gifts to process`);

    let processed = 0;
    let errors = 0;

    for (const gift of expiredGifts) {
      try {
        // Atomic status transition
        const updated = await CoinGift.findOneAndUpdate(
          { _id: gift._id, status: 'delivered' },
          { $set: { status: 'expired' } },
          { new: true }
        );

        if (!updated) continue; // Already processed

        // Refund sender wallet + ledger atomically within a transaction
        let senderWallet: any = null;
        await runFinancialTxn(async ({ session, recordLedger }) => {
          senderWallet = await Wallet.findOneAndUpdate(
            { user: gift.sender },
            {
              $inc: {
                'balance.available': gift.amount,
                'balance.total': gift.amount,
              },
              $set: { lastTransactionAt: new Date() },
            },
            { new: true, session }
          );

          await recordLedger({
            debitAccount: { type: 'platform_float', id: ledgerService.getPlatformAccountId('platform_float') },
            creditAccount: { type: 'user_wallet', id: gift.sender },
            amount: gift.amount,
            coinType: (gift.coinType as any) || 'nuqta',
            operationType: 'gift_refund',
            referenceId: String(gift._id),
            referenceModel: 'CoinGift',
            metadata: {
              description: 'Gift expired - refund to sender',
            },
          });
        });

        // Invalidate sender's wallet cache so they see the refund immediately
        await invalidateWalletCache(String(gift.sender));

        // Create CoinTransaction (source of truth for auto-sync)
        try {
          await CoinTransaction.createTransaction(
            String(gift.sender),
            'refunded',
            gift.amount,
            'transfer',
            `Expired gift refund — recipient did not claim`,
            { giftId: gift._id, recipientId: gift.recipient }
          );
        } catch (ctxError) {
          logger.error('Failed to create refund CoinTransaction', ctxError, { giftId: String(gift._id) });
        }

        // Audit log
        if (senderWallet) {
          logTransaction({
            userId: gift.sender,
            walletId: senderWallet._id as mongoose.Types.ObjectId,
            walletType: 'user',
            operation: 'credit',
            amount: gift.amount,
            balanceBefore: {
              total: senderWallet.balance.total - gift.amount,
              available: senderWallet.balance.available - gift.amount,
              pending: 0,
              cashback: 0,
            },
            balanceAfter: {
              total: senderWallet.balance.total,
              available: senderWallet.balance.available,
              pending: 0,
              cashback: 0,
            },
            reference: {
              type: 'refund',
              id: String(gift._id),
              description: `Expired gift refund — recipient ${gift.recipient} did not claim`,
            },
            metadata: { source: 'cron' },
          });
        }

        // Notify sender about the refund
        try {
          const [sender, recipient] = await Promise.all([
            User.findById(gift.sender).select('phoneNumber').lean(),
            User.findById(gift.recipient).select('fullName phoneNumber').lean(),
          ]);
          if (sender?.phoneNumber) {
            const recipientName = recipient?.fullName || recipient?.phoneNumber || 'the recipient';
            await pushNotificationService.sendGiftExpiredRefund(
              recipientName,
              gift.amount,
              sender.phoneNumber
            );
          }
        } catch (notifErr) {
          logger.error('Failed to send expiry notification', notifErr, { giftId: String(gift._id) });
        }

        processed++;
        logger.info('Expired gift processed', {
          giftId: String(gift._id),
          sender: String(gift.sender),
          amount: gift.amount,
        });
      } catch (error) {
        errors++;
        logger.error('Failed to process expired gift', error, {
          giftId: String(gift._id),
        });
      }
    }

    logger.info('Gift expiry job complete', { processed, errors, total: expiredGifts.length });
    await redisService.releaseLock(lockKey, lockToken);
  } catch (error) {
    logger.error('Gift expiry job failed', error);
  }
}
