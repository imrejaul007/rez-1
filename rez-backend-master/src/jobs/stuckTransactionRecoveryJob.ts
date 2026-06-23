import { Transfer } from '../models/Transfer';
import { Wallet } from '../models/Wallet';
import { logTransaction } from '../models/TransactionAuditLog';
import { ledgerService } from '../services/ledgerService';
import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import mongoose from 'mongoose';

const logger = createServiceLogger('stuck-tx-recovery');

/**
 * Stuck Transaction Recovery Job
 * Runs every 15 minutes.
 * Finds Transfers stuck in 'initiated' or 'otp_pending' status for >10 minutes.
 * Reverses the sender debit and marks the transfer as failed.
 */
export async function runStuckTransactionRecovery(): Promise<void> {
  const lockKey = 'job:stuck-tx-recovery';
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(lockKey, 300); // 5min lock
    if (!lockToken) {
      logger.info('Stuck tx recovery job skipped — lock held by another instance');
      return;
    }

    const cutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago

    const stuckTransfers = await Transfer.find({
      status: { $in: ['initiated', 'otp_pending'] },
      createdAt: { $lt: cutoff },
    }).limit(100);

    if (stuckTransfers.length === 0) {
      logger.info('No stuck transfers found');
      return;
    }

    logger.info(`Found ${stuckTransfers.length} stuck transfers to recover`);

    let recovered = 0;
    let errors = 0;

    for (const transfer of stuckTransfers) {
      try {
        // Atomically mark as failed (status guard prevents double-recovery)
        const updated = await Transfer.findOneAndUpdate(
          { _id: transfer._id, status: { $in: ['initiated', 'otp_pending'] } },
          { $set: { status: 'failed', failureReason: 'timeout' } },
          { new: true }
        );

        if (!updated) {
          // Already handled by another process
          continue;
        }

        // IMPORTANT: For 'initiated' and 'otp_pending' transfers, the sender's wallet
        // was NEVER debited (debit only happens in executeTransfer after OTP confirmation).
        // Do NOT reverse a debit that never occurred — just mark as failed.
        logger.info('Marked stuck transfer as failed (no debit to reverse)', {
          transferId: String(transfer._id),
          sender: String(transfer.sender),
          amount: transfer.amount,
          previousStatus: transfer.status,
        });

        recovered++;
      } catch (error) {
        errors++;
        logger.error('Failed to recover stuck transfer', error, {
          transferId: String(transfer._id),
        });
      }
    }

    logger.info('Stuck transaction recovery complete', { recovered, errors, total: stuckTransfers.length });

    await redisService.releaseLock(lockKey, lockToken);
  } catch (error) {
    logger.error('Stuck transaction recovery job failed', error);
  }
}
