/**
 * Daily Actions Job — nightly cron that materialises
 * MerchantDailyAction rows for every active merchant.
 *
 * Schedule: Daily at 6:00 AM IST (00:30 UTC). Chosen so merchants see
 *           fresh actions when they open the app for the morning ops
 *           review. Retries are NOT configured at cron level — if the
 *           job misses, the merchant's dashboard still shows yesterday's
 *           actions (or nothing, if their first run) until tomorrow.
 *
 * Concurrency: Guarded by a Redis distributed lock so multiple app
 *              instances don't double-run. Lock TTL 30 min.
 *
 * Mode flag: DAILY_ACTIONS_MODE=off|shadow|primary
 *   off     — cron still registers but skips the actual work.
 *   shadow  — rows written with `shadow:true`, hidden from the default
 *             merchant API response. Safe in prod for observability.
 *   primary — rows written with `shadow:false`, surfaced to merchants.
 *
 * Operational safety:
 *   - Merchant iteration uses a cursor, not a big in-memory array, so
 *     the job's memory footprint stays flat at ~50k merchants.
 *   - Per-merchant generate failures are caught + logged; one bad
 *     merchant never poisons the run.
 */

import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import { Merchant } from '../models/Merchant';
import { generateForMerchant, getDailyActionsMode } from '../services/dailyActions/generate';

const logger = createServiceLogger('daily-actions-job');

const LOCK_KEY = 'job:daily-actions';
// Date-stamped so growthScoreJob on day N+1 never consumes day N's marker.
const doneKey = (d: Date) => `job:daily-actions:done:${d.toISOString().slice(0, 10)}`;
const LOCK_TTL = 30 * 60; // 30 minutes

interface RunOutcome {
  merchantsProcessed: number;
  merchantsWithActions: number;
  merchantsFailed: number;
  totalActions: number;
  mode: ReturnType<typeof getDailyActionsMode>;
  skipped?: string;
}

/**
 * Run one iteration of the job. Returns outcome metrics — useful for
 * tests + on-demand invocations via an admin endpoint.
 */
export async function runDailyActionsJob(): Promise<RunOutcome> {
  const mode = getDailyActionsMode();

  if (mode === 'off') {
    logger.info('[DailyActions] mode=off — job is registered but skipping this run');
    return {
      merchantsProcessed: 0,
      merchantsWithActions: 0,
      merchantsFailed: 0,
      totalActions: 0,
      mode,
      skipped: 'mode-off',
    };
  }

  let lockToken: string | null = null;

  try {
    lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.debug('[DailyActions] Lock held by another instance — skipping');
      return {
        merchantsProcessed: 0,
        merchantsWithActions: 0,
        merchantsFailed: 0,
        totalActions: 0,
        mode,
        skipped: 'lock-held',
      };
    }

    logger.info('[DailyActions] job started', { mode });

    let merchantsProcessed = 0;
    let merchantsWithActions = 0;
    let merchantsFailed = 0;
    let totalActions = 0;

    const cursor = Merchant.find({
      isActive: true,
      verificationStatus: 'verified',
    })
      .select('_id')
      .lean()
      .cursor();

    const now = new Date();

    for await (const doc of cursor) {
      merchantsProcessed++;
      try {
        const count = await generateForMerchant((doc as { _id: unknown })._id as any, now);
        if (count > 0) {
          merchantsWithActions++;
          totalActions += count;
        }
      } catch (err) {
        merchantsFailed++;
        logger.error('[DailyActions] generateForMerchant threw — skipping merchant', {
          merchantId: String((doc as { _id: unknown })._id),
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info('[DailyActions] job complete', {
      mode,
      merchantsProcessed,
      merchantsWithActions,
      merchantsFailed,
      totalActions,
    });

    // Publish a completion marker so growthScoreJob can wait for us.
    // This ensures growthScoreJob always runs AFTER dailyActionsJob, even
    // when the 30-min cron offset isn't enough.
    try {
      await redisService.set(doneKey(now), '1', 4 * 60 * 60); // 4h TTL
    } catch (_err) {
      // Non-fatal — growthScoreJob falls back to polling the lock.
    }

    return {
      merchantsProcessed,
      merchantsWithActions,
      merchantsFailed,
      totalActions,
      mode,
    };
  } finally {
    if (lockToken) {
      try {
        await redisService.releaseLock(LOCK_KEY, lockToken);
      } catch (err) {
        logger.warn('[DailyActions] lock release failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

/**
 * Register the daily-actions job with node-cron. Runs at 00:30 UTC
 * (= 06:00 IST) every day. Safe to call multiple times per process
 * — node-cron will just add multiple tasks; the distributed lock
 * stops double-processing across runs.
 */
export function scheduleDailyActionsJob(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cron = require('node-cron');

    // 30 0 * * * == 00:30 UTC daily == 06:00 IST
    cron.schedule('30 0 * * *', async () => {
      try {
        await runDailyActionsJob();
      } catch (err) {
        logger.error('[DailyActions] Unexpected error in scheduled task', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });

    logger.info('[DailyActions] job scheduled (daily at 00:30 UTC / 06:00 IST)');
  } catch (err) {
    logger.error('[DailyActions] failed to schedule job', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
