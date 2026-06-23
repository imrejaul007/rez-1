/**
 * Growth Score Job — nightly 0-100 score computation per active merchant.
 *
 * Schedule: 01:00 UTC daily (= 06:30 IST), 30 min after dailyActionsJob
 * so both jobs are aligned with the "06:00 IST dashboard refresh"
 * narrative but don't compete for lock / cursor time.
 *
 * Flag-gated by GROWTH_SCORE_MODE (off|shadow|primary):
 *   - off     → cron registered but runs as a no-op.
 *   - shadow  → writes rows with shadow:true; API hides them.
 *   - primary → writes rows with shadow:false.
 *
 * Distributed-lock'd via Redis (30 min TTL) so multiple app instances
 * don't double-run. Cursor-iterates active+verified merchants.
 */

import { createServiceLogger } from '../config/logger';
import redisService from '../services/redisService';
import { Merchant } from '../models/Merchant';
import MerchantGrowthScore from '../models/MerchantGrowthScore';
import { computeGrowthScore, getGrowthScoreMode, ENGINE_VERSION } from '../services/growthScore/compute';

const logger = createServiceLogger('growth-score-job');

const LOCK_KEY = 'job:growth-score';
// Date-stamped to match dailyActionsJob's doneKey().
const dailyActionsDoneKey = (d: Date) => `job:daily-actions:done:${d.toISOString().slice(0, 10)}`;
const LOCK_TTL = 30 * 60;
const MAX_WAIT_MS = 45 * 60 * 1000; // 45 min — wait at most until ~01:45 UTC
const POLL_INTERVAL_MS = 5 * 60 * 1000; // poll every 5 min

interface RunOutcome {
  merchantsProcessed: number;
  merchantsFailed: number;
  mode: ReturnType<typeof getGrowthScoreMode>;
  skipped?: string;
}

export async function runGrowthScoreJob(): Promise<RunOutcome> {
  const mode = getGrowthScoreMode();

  if (mode === 'off') {
    logger.info('[GrowthScore] mode=off — skipping this run');
    return { merchantsProcessed: 0, merchantsFailed: 0, mode, skipped: 'mode-off' };
  }

  let lockToken: string | null = null;
  try {
    lockToken = await redisService.acquireLock(LOCK_KEY, LOCK_TTL);
    if (!lockToken) {
      logger.debug('[GrowthScore] lock held by another instance — skipping');
      return { merchantsProcessed: 0, merchantsFailed: 0, mode, skipped: 'lock-held' };
    }

    // "now" is captured here — right after lock acquisition — so the wait loop
    // and the cursor iteration both use the same job-run timestamp.
    const now = new Date();

    // Wait for dailyActionsJob to complete before we start.
    // FIX: Without this wait, growthScoreJob could start before dailyActionsJob
    // finishes, reading stale MerchantCustomerSnapshot data.
    const startWait = Date.now();
    while (true) {
      try {
        const done = await redisService.get<string>(dailyActionsDoneKey(now));
        if (done === '1') {
          logger.debug('[GrowthScore] dailyActionsJob completed — proceeding');
          break;
        }
      } catch (_err) {
        // Redis get failed — continue to avoid blocking forever.
        break;
      }

      if (Date.now() - startWait > MAX_WAIT_MS) {
        logger.warn('[GrowthScore] timed out waiting for dailyActionsJob — proceeding anyway', {
          waitedMs: Date.now() - startWait,
        });
        break;
      }

      logger.debug('[GrowthScore] waiting for dailyActionsJob to complete...', {
        waitedMs: Date.now() - startWait,
      });
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    logger.info('[GrowthScore] job started', { mode });

    let merchantsProcessed = 0;
    let merchantsFailed = 0;

    const cursor = Merchant.find({
      isActive: true,
      verificationStatus: 'verified',
    })
      .select('_id')
      .lean()
      .cursor();

    const day = MerchantGrowthScore.dayKey(now);

    for await (const doc of cursor) {
      merchantsProcessed++;
      const merchantId = (doc as { _id: unknown })._id as any;
      try {
        const result = await computeGrowthScore(merchantId, now);
        await MerchantGrowthScore.upsertForDay({
          merchantId,
          day,
          total: result.total,
          breakdown: result.breakdown,
          shadow: mode === 'shadow',
          engineVersion: ENGINE_VERSION,
        });
      } catch (err) {
        merchantsFailed++;
        logger.error('[GrowthScore] per-merchant failure', {
          merchantId: String(merchantId),
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info('[GrowthScore] job complete', {
      mode,
      merchantsProcessed,
      merchantsFailed,
      day,
    });

    return { merchantsProcessed, merchantsFailed, mode };
  } finally {
    if (lockToken) {
      try {
        await redisService.releaseLock(LOCK_KEY, lockToken);
      } catch (err) {
        logger.warn('[GrowthScore] lock release failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

/**
 * Register with node-cron. Runs at 01:00 UTC daily (= 06:30 IST).
 * Safe to call multiple times per process.
 */
export function scheduleGrowthScoreJob(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cron = require('node-cron');
    cron.schedule('0 1 * * *', async () => {
      try {
        await runGrowthScoreJob();
      } catch (err) {
        logger.error('[GrowthScore] unexpected error in scheduled task', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
    logger.info('[GrowthScore] job scheduled (daily at 01:00 UTC / 06:30 IST)');
  } catch (err) {
    logger.error('[GrowthScore] failed to schedule job', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
