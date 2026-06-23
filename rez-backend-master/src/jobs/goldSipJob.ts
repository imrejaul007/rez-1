import * as cron from 'node-cron';
import { GoldSip } from '../models/GoldSip';
import { GoldPrice } from '../models/GoldSavings';
import { logger } from '../config/logger';
import redisService from '../services/redisService';

const AUGMONT_LIVE = process.env.AUGMONT_API_LIVE === 'true'; // default false
const GOLD_PRICE_PER_GRAM = parseFloat(process.env.AUGMONT_GOLD_PRICE || '6840');
const JOB_LOCK_KEY = 'goldSip:job:processing';
const JOB_LOCK_TTL = 1800; // 30 minutes

// Job instance
let goldSipJob: ReturnType<typeof cron.schedule> | null = null;

/**
 * Helper: Get current gold price with fallback
 */
async function getCurrentGoldPrice(): Promise<number> {
  try {
    const latestPrice = await GoldPrice.findOne().sort({ effectiveAt: -1 }).lean();
    if (latestPrice) {
      return latestPrice.pricePerGram;
    }
  } catch (err) {
    logger.warn('[GoldSIP Job] Failed to fetch gold price from DB, using fallback');
  }
  return GOLD_PRICE_PER_GRAM;
}

/**
 * Helper: Calculate next debit date (same day next month)
 */
function calculateNextDebitDate(deductionDate: number, baseDate: Date): Date {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, deductionDate);
}

/**
 * Main job: Process all SIPs due today
 */
async function processGoldSips(): Promise<void> {
  const startTime = Date.now();
  const today = new Date();
  const dayOfMonth = today.getDate();

  logger.info(`[GoldSIP] Processing SIPs for day ${dayOfMonth}`);

  // QF-006 FIX: Replaced raw setex/del lock with acquireLock/releaseLock.
  // The previous pattern used a plain SETEX with NX but then released the lock
  // with a bare DEL — any instance could delete another instance's lock because
  // there was no owner-token check.  acquireLock generates a unique token;
  // releaseLock verifies the token before deleting, preventing cross-instance
  // lock theft.  Also moved release to finally so it runs on every exit path.
  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(JOB_LOCK_KEY, JOB_LOCK_TTL);

    if (!lockToken) {
      logger.info('[GoldSIP] Another instance is processing. Skipping this run.');
      return;
    }

    // Fetch current gold price
    const currentGoldPrice = await getCurrentGoldPrice();

    // Find all active SIPs due today
    const dueSips = await GoldSip.find({
      isActive: true,
      deductionDate: dayOfMonth,
    }).limit(2000);

    logger.info(`[GoldSIP] Found ${dueSips.length} SIPs due today`);

    let processedCount = 0;
    let failedCount = 0;

    if (!AUGMONT_LIVE) {
      logger.info(
        '[GoldSipJob] Augmont API not live — skipping wallet deduction. Update AUGMONT_API_LIVE=true when ready.',
      );
      // Still update SIP status so it doesn't retry endlessly, but mark as pending_provider
      for (const sip of dueSips) {
        try {
          await sip.updateOne({ status: 'pending_provider' });
        } catch (err: any) {
          logger.warn(`[GoldSipJob] Failed to mark SIP ${sip._id} as pending_provider:`, err.message);
        }
      }
    } else {
      for (const sip of dueSips) {
        try {
          // Calculate grams added
          const gramsAdded = parseFloat((sip.monthlyAmount / currentGoldPrice).toFixed(4));

          // Create history entry
          const entry = {
            date: today,
            amount: sip.monthlyAmount,
            gramsAdded,
            pricePerGram: currentGoldPrice,
            status: 'success' as const,
          };

          // Update SIP
          sip.history.push(entry);
          sip.totalGramsAccumulated = parseFloat((sip.totalGramsAccumulated + gramsAdded).toFixed(4));
          sip.totalInvested += sip.monthlyAmount;

          // Set next debit date (same day next month)
          sip.nextDebitDate = calculateNextDebitDate(sip.deductionDate, today);

          await sip.save();
          processedCount++;

          logger.info(
            `[GoldSIP] ✅ Processed SIP ${sip._id} — +${gramsAdded}g at ₹${currentGoldPrice}/g for user ${sip.userId}`,
          );

          // TODO: Send push notification to user
        } catch (err: any) {
          failedCount++;
          logger.error(`[GoldSIP] ❌ Failed for SIP ${sip._id}: ` + err.message);
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`[GoldSIP] Job completed:`, {
      processed: processedCount,
      failed: failedCount,
      total: dueSips.length,
      goldPrice: `₹${currentGoldPrice}/g`,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error('[GoldSIP] ❌ Job error: ' + err.message);
  } finally {
    // QF-006: Owner-token safe release — always runs, no bare DEL.
    if (lockToken) {
      await redisService.releaseLock(JOB_LOCK_KEY, lockToken).catch(() => {});
    }
  }
}

/**
 * Initialize the Gold SIP cron job
 * Runs daily at 9:00 AM
 */
export function startGoldSipJob(): void {
  if (goldSipJob) {
    logger.warn('[GoldSIP] Job already started, skipping initialization');
    return;
  }

  goldSipJob = cron.schedule('0 9 * * *', async () => {
    await processGoldSips();
  });

  logger.info('[GoldSIP] Job scheduled — runs daily at 9:00 AM');
}

/**
 * Stop the Gold SIP cron job
 */
export function stopGoldSipJob(): void {
  if (goldSipJob) {
    goldSipJob.stop();
    goldSipJob = null;
    logger.info('[GoldSIP] Job stopped');
  }
}
