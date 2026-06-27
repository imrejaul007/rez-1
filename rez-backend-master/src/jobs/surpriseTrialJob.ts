import * as cron from 'node-cron';
import { logger } from '../config/logger';
import gamificationService from '../services/gamificationService';
// Phase 6.24: distributed lock so multi-replica deploys don't assign the
// same surprise trial to the same user twice (a duplicate assignment could
// grant a duplicate reward and produce duplicate audit log entries).
import { runWithLock } from '../config/cronJobs';

let surpriseTrialJob: ReturnType<typeof cron.schedule> | null = null;
let isRunning = false;

const CRON_SCHEDULE = '0 6 * * 1'; // Monday 6am UTC

/**
 * Surprise Trial Assignment Job
 *
 * Runs every Monday at 6 AM UTC to:
 * 1. Assign one curated mystery trial per active user
 * 2. Selection: active trial in a category the user has NOT tried yet
 * 3. Fallback: pick highest quality trial in least-visited category
 */
export function startSurpriseTrialJob(): void {
  if (surpriseTrialJob) {
    logger.warn('[SurpriseTrialJob] Job already started');
    return;
  }

  surpriseTrialJob = cron.schedule(CRON_SCHEDULE, async () => {
    if (isRunning) {
      logger.warn('[SurpriseTrialJob] Previous run still in progress, skipping');
      return;
    }

    isRunning = true;

    try {
      logger.info('[SurpriseTrialJob] Starting surprise trial assignment job');

      const result = await runWithLock(
        'cron:surprise_trial',
        3600,           // 1h TTL: assignment can take a while for many users
        'surprise trial weekly assignment',
        () => gamificationService.assignSurpriseTrials()
      );
      if (result) {
        logger.info('[SurpriseTrialJob] Assignment job completed', {
          assigned: result.assigned
        });
      } else {
        logger.info('[SurpriseTrialJob] Skipped — another worker held the lock');
      }
    } catch (error) {
      logger.error('[SurpriseTrialJob] Job failed', {
        error: (error as Error).message
      });
    } finally {
      isRunning = false;
    }
  });

  logger.info('[SurpriseTrialJob] Started with schedule:', CRON_SCHEDULE);
}

export function stopSurpriseTrialJob(): void {
  if (surpriseTrialJob) {
    surpriseTrialJob.stop();
    surpriseTrialJob = null;
    logger.info('[SurpriseTrialJob] Stopped');
  }
}

export function isSurpriseTrialJobRunning(): boolean {
  return isRunning;
}
