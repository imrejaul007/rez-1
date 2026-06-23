import redisService from '../services/redisService';
import { logger } from '../config/logger';

// QF-012: Maximum wall-clock seconds a job is allowed to run before we
// consider it "stuck".  Cron jobs typically finish in seconds; give them
// 30 minutes before raising an alert.
const STUCK_JOB_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Job tracking utility for monitoring cron job health.
 * Tracks last run, failures, and emits alerts on consecutive failures.
 *
 * QF-012 FIX: Added isStuck() helper to detect jobs that called started()
 * but never called succeeded() or failed() — i.e., they are still running
 * (or crashed silently without cleanup).  The lastStarted TTL has been
 * aligned with the other keys (30 days) so the signal is not lost early.
 */
export const jobTracker = {
  async started(jobName: string): Promise<void> {
    try {
      const key = `job:${jobName.toLowerCase().replace(/\s+/g, ':')}`;
      // QF-012 FIX: TTL aligned from 86400 (1 day) to 2592000 (30 days) so
      // the lastStarted marker is not evicted before lastRun/consecutiveFailures.
      await redisService.set(`${key}:lastStarted`, Date.now().toString(), 2592000);
      await redisService.set(`${key}:status`, 'running', 2592000);
    } catch (e) {
      // non-fatal — continue if Redis unavailable
    }
  },

  async succeeded(jobName: string): Promise<void> {
    try {
      const key = `job:${jobName.toLowerCase().replace(/\s+/g, ':')}`;
      await redisService.set(`${key}:lastRun`, Date.now().toString(), 2592000);
      await redisService.set(`${key}:consecutiveFailures`, '0', 2592000);
      await redisService.set(`${key}:status`, 'idle', 2592000);
      await redisService.del(`${key}:lastError`);
    } catch (e) {
      // non-fatal
    }
  },

  async failed(jobName: string, error: Error, io?: any): Promise<void> {
    try {
      const key = `job:${jobName.toLowerCase().replace(/\s+/g, ':')}`;
      const failures = await redisService.incr(`${key}:consecutiveFailures`, 1);
      await redisService.set(`${key}:lastError`, error.message.slice(0, 500), 2592000);
      await redisService.set(`${key}:lastFailedAt`, Date.now().toString(), 2592000);
      await redisService.set(`${key}:status`, 'idle', 2592000);

      logger.error(`[Job:${jobName}] FAILED (consecutive: ${failures}): ${error.message}`);

      // Emit alert to admin only after 3+ consecutive failures
      if (failures && failures >= 3 && io) {
        io.to('admin').emit('job:failure', {
          name: jobName,
          error: error.message,
          consecutiveFailures: failures,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (e) {
      // non-fatal
    }
  },

  /**
   * QF-012: Detect jobs that started but have not completed within
   * STUCK_JOB_THRESHOLD_MS.  Returns null if tracking data is unavailable.
   *
   * Usage example (call from a health-check endpoint):
   *   const stuck = await jobTracker.isStuck('cashback-credit');
   *   if (stuck) logger.warn('cashback-credit is stuck!');
   */
  async isStuck(jobName: string): Promise<boolean | null> {
    try {
      const key = `job:${jobName.toLowerCase().replace(/\s+/g, ':')}`;
      const [statusRaw, lastStartedRaw, lastRunRaw] = await Promise.all([
        redisService.get<string>(`${key}:status`),
        redisService.get<string>(`${key}:lastStarted`),
        redisService.get<string>(`${key}:lastRun`),
      ]);

      if (statusRaw !== 'running') return false; // not currently running
      if (!lastStartedRaw) return null; // no tracking data

      const lastStarted = parseInt(lastStartedRaw, 10);
      const lastRun = lastRunRaw ? parseInt(lastRunRaw, 10) : 0;

      // If lastStarted > lastRun the job is still "running" in our view
      if (lastStarted <= lastRun) return false;

      return Date.now() - lastStarted > STUCK_JOB_THRESHOLD_MS;
    } catch {
      return null;
    }
  },

  /**
   * QF-012: Bulk health snapshot for all tracked jobs.
   * Returns an object keyed by job name with status, lastRun, and stuck flag.
   */
  async healthSnapshot(jobNames: string[]): Promise<
    Record<
      string,
      {
        status: string | null;
        lastRun: Date | null;
        consecutiveFailures: number;
        stuck: boolean | null;
      }
    >
  > {
    const result: Record<string, any> = {};
    for (const name of jobNames) {
      const stuck = await this.isStuck(name);
      const key = `job:${name.toLowerCase().replace(/\s+/g, ':')}`;
      try {
        const [lastRunRaw, failuresRaw, statusRaw] = await Promise.all([
          redisService.get<string>(`${key}:lastRun`),
          redisService.get<string>(`${key}:consecutiveFailures`),
          redisService.get<string>(`${key}:status`),
        ]);
        result[name] = {
          status: statusRaw ?? 'unknown',
          lastRun: lastRunRaw ? new Date(parseInt(lastRunRaw, 10)) : null,
          consecutiveFailures: failuresRaw ? parseInt(failuresRaw, 10) : 0,
          stuck,
        };
      } catch {
        result[name] = { status: 'unknown', lastRun: null, consecutiveFailures: 0, stuck: null };
      }
    }
    return result;
  },
};
