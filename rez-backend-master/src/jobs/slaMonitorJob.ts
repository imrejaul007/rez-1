import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../config/logger';
import { bullmqRedis } from '../config/bullmq-connection';

/**
 * SLA Monitor Job — runs every 5 minutes to detect SLA breaches.
 *
 * SLA Thresholds (per v3 architecture Part 13):
 *   - Customer snapshot freshness: < 5 min after payment (alert at > 15 min)
 *   - BullMQ merchant-events queue depth: alert if > 500 pending
 *   - Daily stats availability: by 2am daily (alert after 3am if missing)
 *
 * On breach: emits socket alert to admin room + updates Prometheus gauges.
 *
 * v3 Architecture: Part 13 — SLA dashboard + observability contract.
 */

let slaMonitorTask: ScheduledTask | null = null;

export function initializeSlaMonitorJob(): void {
  if (slaMonitorTask) {
    logger.warn('[SlaMonitorJob] Already initialized — skipping duplicate init');
    return;
  }

  // Run every 5 minutes
  slaMonitorTask = cron.schedule('*/5 * * * *', async () => {
    try {
      await runSlaChecks();
    } catch (err) {
      logger.error('[SlaMonitorJob] Unhandled error in SLA check run', err);
    }
  });

  logger.info('[SlaMonitorJob] SLA monitor started (runs every 5 minutes)');
}

async function runSlaChecks(): Promise<void> {
  await Promise.allSettled([
    checkCustomerSnapshotFreshness(),
    checkMerchantEventQueueDepth(),
    checkDailyStatsAvailability(),
  ]);
}

// ── Check 1: Customer snapshot freshness ─────────────────────────────────────
async function checkCustomerSnapshotFreshness(): Promise<void> {
  try {
    // Dynamic import to avoid circular deps at module load
    const MerchantCustomerSnapshot = await import('../models/MerchantCustomerSnapshot')
      .then((m) => m.default || m.MerchantCustomerSnapshot)
      .catch(() => null);

    if (!MerchantCustomerSnapshot) return;

    const oldestSnapshot = await (MerchantCustomerSnapshot as any)
      .findOne()
      .sort({ updatedAt: 1 })
      .select('updatedAt merchantId')
      .lean();

    if (!oldestSnapshot) return;

    const ageSeconds = (Date.now() - new Date(oldestSnapshot.updatedAt).getTime()) / 1000;

    // Update Prometheus gauge (import lazily)
    try {
      const { readModelStaleness } = await import('../config/prometheus').catch(() => ({ readModelStaleness: null }));
      if (readModelStaleness) {
        (readModelStaleness as any).set({ model_name: 'customer_snapshot' }, ageSeconds);
      }
    } catch {
      /* prometheus may not be initialized */
    }

    if (ageSeconds > 900) {
      // > 15 minutes
      const message = `Customer snapshot is ${Math.round(ageSeconds / 60)} minutes stale`;
      logger.warn('[SlaMonitorJob] SLA BREACH — customer_snapshot', {
        ageMinutes: Math.round(ageSeconds / 60),
        merchantId: (oldestSnapshot as any).merchantId,
      });
      await emitAdminAlert('customer_snapshot', message, 'warning');
    }
  } catch (err) {
    logger.debug('[SlaMonitorJob] customer_snapshot check skipped (model may not exist)', {
      err: (err as Error)?.message,
    });
  }
}

// ── Check 2: Merchant event queue depth ──────────────────────────────────────
async function checkMerchantEventQueueDepth(): Promise<void> {
  try {
    const { Queue } = await import('bullmq');
    const queue = new Queue('merchant-events', { connection: bullmqRedis });
    const waitingCount = await queue.getWaitingCount().catch(() => 0);
    await queue.close();

    // Update Prometheus gauge
    try {
      const { merchantEventQueueBacklog } = await import('../config/prometheus').catch(() => ({
        merchantEventQueueBacklog: null,
      }));
      if (merchantEventQueueBacklog) {
        (merchantEventQueueBacklog as any).set(waitingCount);
      }
    } catch {
      /* ok */
    }

    if (waitingCount > 500) {
      const message = `merchant-events queue has ${waitingCount} pending jobs`;
      logger.warn('[SlaMonitorJob] SLA BREACH — merchant-events queue depth', { waitingCount });
      await emitAdminAlert('merchant_event_queue', message, 'error');
    }
  } catch (err) {
    logger.debug('[SlaMonitorJob] queue depth check skipped', { err: (err as Error)?.message });
  }
}

// ── Check 3: Daily stats availability ────────────────────────────────────────
async function checkDailyStatsAvailability(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();

  // Only check between 3am and 6am (window where nightly batch should have completed)
  if (hour < 3 || hour > 6) return;

  try {
    const MerchantDailyStat = await import('../models/MerchantDailyStat').then((m) => m.default).catch(() => null);

    if (!MerchantDailyStat) return;

    // Get today's date in YYYY-MM-DD format (stat should have run for yesterday)
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];

    // If no merchants exist yet, stats will naturally be absent — not an SLA breach
    const merchantCount = await import('../models/Store')
      .then((m) => (m.Store as any).countDocuments({ isActive: true }))
      .catch(() => 1); // fail-open: assume merchants exist if model unavailable

    if (merchantCount === 0) return;

    const statCount = await (MerchantDailyStat as any).countDocuments({
      date: yesterdayDate,
    });

    if (statCount === 0) {
      const message = `No merchant daily stats found for ${yesterdayDate} — nightly batch may have failed`;
      logger.warn('[SlaMonitorJob] daily stats missing for yesterday', { date: yesterdayDate });
      await emitAdminAlert('daily_stats', message, 'warning');
    }
  } catch (err) {
    logger.debug('[SlaMonitorJob] daily stats check skipped', { err: (err as Error)?.message });
  }
}

// ── Admin socket alert ────────────────────────────────────────────────────────
async function emitAdminAlert(metric: string, message: string, severity: 'warning' | 'error'): Promise<void> {
  try {
    const { getIO } = await import('../config/socket').catch(() => ({ getIO: null }));
    if (!getIO) return;

    const io = (getIO as any)();
    if (!io) return;

    io.to('admin').emit('sla:breach', {
      metric,
      value: message,
      severity,
      timestamp: new Date().toISOString(),
    });
  } catch {
    /* socket is best-effort */
  }
}

export default { initializeSlaMonitorJob };
