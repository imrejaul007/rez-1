/**
 * merchantPayoutJob.ts — Automated weekly merchant wallet payout processing
 *
 * Schedule: Every Monday at 6:00 AM UTC (`0 6 * * 1`)
 *
 * Environment variables:
 *   MERCHANT_PAYOUT_THRESHOLD_INR — minimum balance.available (INR) required
 *     before a payout is initiated. Defaults to 100 (INR).
 *
 * Algorithm:
 *   1. Acquire distributed Redis lock so only one pod runs the job.
 *   2. Find all active MerchantWallet documents where balance.available
 *      is >= MIN_PAYOUT_THRESHOLD.
 *   3. For each eligible wallet:
 *      a. Skip (with warning) if bankDetails is missing.
 *      b. Atomically debit balance.available using a $gte guard on the
 *         actual amount to prevent negative balances under concurrent writes.
 *      c. Create a MerchantPayout document with status 'pending'.
 *      d. Enqueue a `merchant_payout_initiated` event to the
 *         `notification-events` BullMQ queue.
 *   4. Release the lock in a finally block.
 *   5. Log a summary: payouts initiated, total amount, skipped count.
 */

import * as cron from 'node-cron';
import mongoose, { Types } from 'mongoose';
import { MerchantWallet } from '../models/MerchantWallet';
import { MerchantPayout } from '../models/MerchantPayout';
import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';
import { publishNotificationEvent } from '../events/notificationQueue';

const logger = createServiceLogger('merchant-payout-job');

// ── Configuration ─────────────────────────────────────────────────────────────

const SCHEDULE = '0 6 * * 1'; // Every Monday at 6:00 AM UTC
const LOCK_KEY = 'job:merchant-payout';
const LOCK_TTL = 3600; // 1 hour — generous upper bound for large merchant sets

/**
 * Minimum available balance in INR required for a payout to be initiated.
 * Override via MERCHANT_PAYOUT_THRESHOLD_INR env var (default: 100).
 */
const MIN_PAYOUT_THRESHOLD = Number(process.env.MERCHANT_PAYOUT_THRESHOLD_INR ?? 100);

// ── Job implementation ────────────────────────────────────────────────────────

export interface PayoutJobResult {
  initiated: number;
  skipped: number;
  failed: number;
  totalAmountINR: number;
}

/**
 * Core payout processing logic, exported for testing.
 * Callers are responsible for acquiring / releasing the distributed lock.
 */
export async function runMerchantPayoutJob(): Promise<PayoutJobResult> {
  const startTime = Date.now();
  logger.info('[MerchantPayout] Starting weekly payout job', {
    thresholdINR: MIN_PAYOUT_THRESHOLD,
  });

  let initiated = 0;
  let skipped = 0;
  let failed = 0;
  let totalAmountINR = 0;

  // Fetch all active wallets whose available balance meets the threshold.
  // Only select the fields needed — avoids loading the full transactions array.
  //
  // NOTE: Do NOT add .lean() here. MerchantWallet has a post('init') hook that
  // decrypts bankDetails.accountNumber and bankDetails.ifscCode in memory after
  // load. .lean() bypasses all Mongoose middleware, including post('init'), which
  // would cause raw AES-256-GCM ciphertext to be forwarded to Razorpay.
  const eligibleWallets = await MerchantWallet.find(
    {
      isActive: true,
      'balance.available': { $gte: MIN_PAYOUT_THRESHOLD },
    },
    {
      merchant: 1,
      store: 1,
      'balance.available': 1,
      bankDetails: 1,
    },
  );

  logger.info(`[MerchantPayout] Found ${eligibleWallets.length} wallets above threshold`);

  for (const wallet of eligibleWallets) {
    const merchantId = (wallet.merchant as Types.ObjectId).toString();
    const storeId = wallet.store ? (wallet.store as Types.ObjectId).toString() : undefined;
    const payoutAmount = wallet.balance.available;

    let balanceChanged = false;
    try {
      // ── Guard: bank details must exist ──────────────────────────────────────
      if (!wallet.bankDetails) {
        logger.warn('[MerchantPayout] Skipping merchant — bankDetails missing', {
          merchantId,
          availableBalance: payoutAmount,
        });
        skipped++;
        continue;
      }

      const { accountNumber, ifscCode, accountHolderName } = wallet.bankDetails;

      // ── Atomic debit + payout record in a single MongoDB transaction ────────
      // Both writes are wrapped in withTransaction so that if MerchantPayout.create
      // fails after the wallet debit, the debit is automatically rolled back.
      // This prevents ghost debits (balance decremented with no payout record).
      let payoutDoc: (import('../models/MerchantPayout').IMerchantPayout & { _id: Types.ObjectId }) | null = null;

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Step 1: atomic debit with $gte guard — match by _id for precision
          const updated = await MerchantWallet.findOneAndUpdate(
            {
              _id: wallet._id,
              'balance.available': { $gte: payoutAmount },
              isActive: true,
            },
            {
              $inc: {
                'balance.available': -payoutAmount,
                'balance.withdrawn': payoutAmount,
              },
            },
            { new: true, session },
          );

          if (!updated) {
            // Balance shifted between the find() and the update — abort the transaction.
            balanceChanged = true;
            throw new Error('Wallet balance changed — skipping');
          }

          // Step 2: create payout record inside the same transaction.
          // amountPaise is the canonical money field in MerchantPayout. We store
          // INR * 100 for paise precision, and also persist bankDetails via
          // strict:false on the model schema.
          const [doc] = (await MerchantPayout.create(
            [
              {
                merchantId: wallet.merchant,
                storeId: wallet.store,
                amountPaise: Math.round(payoutAmount * 100),
                status: 'pending',
                requestedAt: new Date(),
                // Additional fields stored via strict:false
                currency: 'INR',
                bankDetails: {
                  accountNumber,
                  ifscCode,
                  accountHolderName,
                },
                initiatedAt: new Date(),
              } as any,
            ],
            { session },
          )) as (import('../models/MerchantPayout').IMerchantPayout & { _id: Types.ObjectId })[];

          payoutDoc = doc;
        });
      } finally {
        await session.endSession();
      }

      // At this point the transaction has committed — both the debit and the
      // payout record are durable.
      const payoutId = payoutDoc!._id.toString();

      logger.info('[MerchantPayout] Payout created', {
        merchantId,
        storeId,
        payoutId,
        amountINR: payoutAmount,
      });

      initiated++;
      totalAmountINR += payoutAmount;

      // ── Enqueue notification event (fire-and-forget, outside transaction) ──
      // Notification failures must NOT affect the financial outcome; the payout
      // record is already committed. Log a warning but do not increment `failed`.
      publishNotificationEvent({
        eventId: `merchant_payout_initiated:${payoutId}`,
        eventType: 'merchant_payout_initiated',
        userId: merchantId,
        channels: ['push', 'email'],
        payload: {
          title: 'Payout Initiated',
          body: `Your payout of ₹${payoutAmount.toFixed(2)} has been initiated and will be credited to your bank account within 2-3 business days.`,
          data: {
            payoutId,
            amountINR: payoutAmount,
            storeId: storeId ?? null,
            accountHolderName,
            deepLink: '/merchant/wallet/payouts',
          },
        },
        category: 'payout',
        source: 'automated',
        createdAt: new Date().toISOString(),
      }).catch((notifyErr: unknown) =>
        logger.warn('[MerchantPayout] Notification enqueue failed (payout committed)', {
          merchantId,
          payoutId,
          error: (notifyErr as Error)?.message,
        }),
      );
    } catch (err) {
      if (balanceChanged) {
        logger.warn('[MerchantPayout] Atomic debit guard prevented update — balance changed', {
          merchantId,
          expectedAmount: payoutAmount,
        });
        skipped++;
        continue;
      }
      failed++;
      logger.error('[MerchantPayout] Failed to process payout for merchant', err as Error, {
        merchantId,
        storeId,
        payoutAmount,
      });
    }
  }

  const durationMs = Date.now() - startTime;

  logger.info('[MerchantPayout] Weekly payout job complete', {
    initiated,
    skipped,
    failed,
    totalAmountINR,
    durationMs,
  });

  return { initiated, skipped, failed, totalAmountINR };
}

// ── Cron registration ─────────────────────────────────────────────────────────

let _job: ReturnType<typeof cron.schedule> | null = null;

/**
 * Schedule the weekly merchant payout job.
 * Safe to call multiple times — registers only once.
 */
export function initializeMerchantPayoutJob(): void {
  if (_job) {
    logger.info('[MerchantPayout] Job already scheduled');
    return;
  }

  _job = cron.schedule(SCHEDULE, async () => {
    const lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.info('[MerchantPayout] Another instance is running the payout job — skipping');
      return;
    }

    try {
      await runMerchantPayoutJob();
    } catch (err) {
      logger.error('[MerchantPayout] Unhandled error in payout job', err as Error);
    } finally {
      await redisService.releaseLock(LOCK_KEY, lockToken);
    }
  });

  logger.info('[MerchantPayout] Weekly payout job scheduled (every Monday at 6:00 AM UTC)');
}

export function stopMerchantPayoutJob(): void {
  if (_job) {
    _job.stop();
    _job = null;
    logger.info('[MerchantPayout] Weekly payout job stopped');
  }
}
