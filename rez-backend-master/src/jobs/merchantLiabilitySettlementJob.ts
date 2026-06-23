import * as cron from 'node-cron';
import redisService from '../services/redisService';
import { liabilityService, computeCycleId } from '../services/liabilityService';
import { MerchantWallet } from '../models/MerchantWallet';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('merchant-liability-settlement');

const SCHEDULE = '0 5 * * *'; // Daily at 5:00 AM (after 4 AM ledger reconciliation)
const LOCK_KEY = 'job:merchant-liability-settlement';
const LOCK_TTL = 3600; // 1 hour
const RESULT_TTL = 7 * 24 * 60 * 60; // 7 days

let job: ReturnType<typeof cron.schedule> | null = null;

async function runMerchantLiabilitySettlement(): Promise<void> {
  const startTime = Date.now();
  logger.info('Starting merchant liability settlement job');

  let settled = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Find merchants with non-instant settlement cycles
    const wallets = await MerchantWallet.find({
      settlementCycle: { $ne: 'instant' },
      isActive: true,
    }).select('merchant settlementCycle').lean();

    const now = new Date();

    for (const wallet of wallets) {
      try {
        const cycle = wallet.settlementCycle as 'daily' | 'weekly' | 'monthly';
        const merchantId = wallet.merchant.toString();

        // Check if cycle has elapsed
        if (!hasCycleElapsed(cycle, now)) {
          skipped++;
          continue;
        }

        // Compute the previous cycle's ID (the one that should be settled)
        const prevCycleId = computePreviousCycleId(cycle, now);

        const result = await liabilityService.settleCycle(merchantId, prevCycleId, { autoDebit: true });
        if (result.recordsSettled > 0) {
          settled++;
          logger.info('Merchant liability settled', {
            merchantId,
            cycleId: prevCycleId,
            totalSettled: result.totalSettled,
            records: result.recordsSettled,
          });
        }
      } catch (error) {
        failed++;
        logger.error('Failed to settle merchant liability', error as Error, {
          merchantId: wallet.merchant.toString(),
        });
      }
    }

    const duration = Date.now() - startTime;

    // Cache results in Redis
    await redisService.set('merchant-liability-settlement:latest', {
      settled,
      skipped,
      failed,
      totalMerchants: wallets.length,
      durationMs: duration,
      runAt: now.toISOString(),
    }, RESULT_TTL);

    logger.info('Merchant liability settlement job complete', {
      settled, skipped, failed, durationMs: duration,
    });
  } catch (error) {
    logger.error('Merchant liability settlement job failed', error as Error);
  }
}

/**
 * Check if a cycle boundary has passed (i.e., we should settle the previous cycle).
 */
function hasCycleElapsed(cycle: 'daily' | 'weekly' | 'monthly', now: Date): boolean {
  switch (cycle) {
    case 'daily':
      // Always settle previous day
      return true;
    case 'weekly':
      // Settle on Monday (day 1)
      return now.getDay() === 1;
    case 'monthly':
      // Settle on 1st of month
      return now.getDate() === 1;
    default:
      return false;
  }
}

/**
 * Compute the cycleId for the previous cycle period.
 */
function computePreviousCycleId(cycle: 'daily' | 'weekly' | 'monthly', now: Date): string {
  switch (cycle) {
    case 'daily': {
      const prev = new Date(now);
      prev.setDate(prev.getDate() - 1);
      return computeCycleId('daily', prev);
    }
    case 'weekly': {
      const prev = new Date(now);
      prev.setDate(prev.getDate() - 7);
      return computeCycleId('weekly', prev);
    }
    case 'monthly': {
      const prev = new Date(now);
      prev.setMonth(prev.getMonth() - 1);
      return computeCycleId('monthly', prev);
    }
    default:
      return 'instant';
  }
}

export function initializeMerchantLiabilitySettlementJob(): void {
  if (job) {
    logger.info('Merchant liability settlement job already scheduled');
    return;
  }

  job = cron.schedule(SCHEDULE, async () => {
    const lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.info('Another instance is running merchant liability settlement, skipping');
      return;
    }

    try {
      await runMerchantLiabilitySettlement();
    } finally {
      await redisService.releaseLock(LOCK_KEY, lockToken);
    }
  });

  logger.info('Merchant liability settlement job scheduled (daily at 5:00 AM)');
}

export function stopMerchantLiabilitySettlementJob(): void {
  if (job) {
    job.stop();
    job = null;
    logger.info('Merchant liability settlement job stopped');
  }
}
