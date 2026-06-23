/**
 * src/jobs/anomalyDetectionJob.ts
 * Real-time anomaly detection for business metrics
 *
 * Runs every 15 minutes to detect:
 * - Payment failure rate spikes
 * - Suspicious coin issuance
 * - Revenue anomalies
 *
 * Sends alerts via Socket.IO to admin dashboard in real-time
 */

import cron from 'node-cron';
import redisService from '../services/redisService';
import { logger } from '../config/logger';
import { getIO } from '../config/socket';

export interface AnomalyAlert {
  type: string;
  value: number | string;
  threshold?: number;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  detectedAt: string;
}

/**
 * Check if payment failure rate is abnormally high
 */
async function checkPaymentHealthAnomaly() {
  const today = new Date().toISOString().split('T')[0];
  const redisClient = redisService.getClient();

  const successCount = parseInt((await redisClient?.hGet(`events:daily:${today}`, 'payment.success')) || '0');
  const failureCount = parseInt((await redisClient?.hGet(`events:daily:${today}`, 'payment.failure')) || '0');
  const total = successCount + failureCount;

  // Only flag if there's significant volume
  if (total <= 10) return null;

  const failureRate = (failureCount / total) * 100;

  // Alert if failure rate exceeds 15%
  if (failureRate > 15) {
    const severity = failureRate > 30 ? 'critical' : 'warning';
    return {
      type: 'payment_failure_rate_spike',
      value: failureRate.toFixed(1),
      threshold: 15,
      message: `Payment failure rate is ${failureRate.toFixed(1)}% (threshold: 15%) — ${failureCount}/${total} payments failed`,
      severity,
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Check if coin issuance is suspiciously high
 */
async function checkCoinIssuanceAnomaly() {
  const today = new Date().toISOString().split('T')[0];
  const redisClient = redisService.getClient();

  const coinsEarned = parseInt((await redisClient?.hGet(`events:daily:${today}`, 'coins.earned')) || '0');

  // Alert if more than 10,000 coins earned in a day (suspicious spike)
  const DAILY_COIN_SPIKE_THRESHOLD = 10000;
  if (coinsEarned > DAILY_COIN_SPIKE_THRESHOLD) {
    return {
      type: 'coin_issuance_spike',
      value: coinsEarned,
      threshold: DAILY_COIN_SPIKE_THRESHOLD,
      message: `Unusual coin issuance detected: ${coinsEarned} coins earned today (threshold: ${DAILY_COIN_SPIKE_THRESHOLD})`,
      severity: coinsEarned > 20000 ? 'critical' : 'warning',
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * MIGUEL: abuse prevention — per-user hourly coin velocity check
 * Detects farming loops where single user rapidly earns coins through exploits.
 * Finds users earning >500 coins in 1 hour, adds to monitoring list for review.
 *
 * Exploit pattern detected: User earns coins at unnatural rate via:
 * - Multiple rapid referral bonus claims
 * - Cashback loop with coin redemption
 * - Promo abuse
 *
 * Action: Add to monitoring list (not auto-block, manual review)
 */
async function checkPerUserCoinVelocityAnomaly() {
  try {
    const redisClient = redisService.getClient();
    if (!redisClient) return null;

    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour window

    // MP-D003 FIX: The previous implementation called KEYS user:coin:velocity:*
    // which is an O(N) blocking command that iterates the entire Redis keyspace.
    // On a large keyspace this blocks the Redis event loop for tens to hundreds
    // of milliseconds, stalling every other Redis command in the server (including
    // real-time payment and session lookups) for the duration.
    //
    // Replaced with a non-blocking SCAN-based iteration (cursor = 0, count = 100
    // per batch) so the Redis server remains responsive throughout.  Each SCAN call
    // returns at most ~100 keys and yields control between batches.
    const suspiciousUsers: Array<{ userId: string; coinsEarned: number }> = [];

    let cursor = 0;
    do {
      const [nextCursor, keys]: [number, string[]] = await (redisClient as any).scan(
        cursor,
        'MATCH',
        'user:coin:velocity:*',
        'COUNT',
        100,
      );
      cursor = Number(nextCursor);

      for (const key of keys) {
        const coinsInHour = parseInt((await redisClient.get(key)) || '0', 10);

        // MIGUEL: threshold = 500 coins/hour is abnormally high
        // Legitimate users earn 1-50 coins per transaction, max 10 transactions/day
        const HOURLY_COIN_VELOCITY_THRESHOLD = 500;

        if (coinsInHour > HOURLY_COIN_VELOCITY_THRESHOLD) {
          const userId = key.replace('user:coin:velocity:', '');
          suspiciousUsers.push({ userId, coinsEarned: coinsInHour });
        }
      }
    } while (cursor !== 0);

    if (suspiciousUsers.length === 0) return null;

    // Queue suspicious users for monitoring/review
    try {
      const AnomalyMonitor = require('../models/AnomalyMonitor') as any;
      if (AnomalyMonitor.model) {
        for (const user of suspiciousUsers) {
          await AnomalyMonitor.model
            .findOneAndUpdate(
              { userId: user.userId, type: 'high_coin_velocity' },
              {
                userId: user.userId,
                type: 'high_coin_velocity',
                coinsEarned: user.coinsEarned,
                windowMinutes: 60,
                flaggedAt: new Date(),
                status: 'monitoring',
              },
              { upsert: true },
            )
            .catch(() => {
              // Ignore error, just log
            });
        }
      }
    } catch (err) {
      // Ignore model loading errors
    }

    const topUser = suspiciousUsers.sort((a, b) => b.coinsEarned - a.coinsEarned)[0];

    return {
      type: 'per_user_coin_velocity_spike',
      value: `${topUser.coinsEarned} coins (user: ${topUser.userId.substring(0, 8)}...)`,
      threshold: 500,
      message: `High coin velocity detected: user earned ${topUser.coinsEarned} coins in 1 hour. ${suspiciousUsers.length} total users flagged for monitoring.`,
      severity: 'warning',
      detectedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Silently ignore errors in this check
    return null;
  }
}

/**
 * Check for unusual booking completion drop (potential system issue)
 */
async function checkBookingCompletionAnomaly() {
  const today = new Date().toISOString().split('T')[0];
  const redisClient = redisService.getClient();

  const bookingsCreated = parseInt((await redisClient?.hGet(`events:daily:${today}`, 'booking.created')) || '0');
  const bookingsCompleted = parseInt((await redisClient?.hGet(`events:daily:${today}`, 'booking.completed')) || '0');

  // Only check if there are recent bookings
  if (bookingsCreated <= 5) return null;

  // Completion rate should be reasonable
  const completionRate = (bookingsCompleted / bookingsCreated) * 100;

  // Alert if completion rate is suspiciously low (potential system issue)
  if (completionRate < 20 && bookingsCreated > 20) {
    return {
      type: 'booking_completion_anomaly',
      value: completionRate.toFixed(1),
      threshold: 20,
      message: `Low booking completion rate: ${completionRate.toFixed(1)}% (${bookingsCompleted}/${bookingsCreated} completed) — possible system issue`,
      severity: 'warning',
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Check coin earned vs redeemed ratio for sustainability
 */
async function checkCoinEconomyAnomaly() {
  const today = new Date().toISOString().split('T')[0];
  const redisClient = redisService.getClient();

  const coinsEarned = parseInt((await redisClient?.hGet(`events:daily:${today}`, 'coins.earned')) || '0');
  const coinsRedeemed = parseInt((await redisClient?.hGet(`events:daily:${today}`, 'coins.redeemed')) || '0');

  // If no activity, skip
  if (coinsEarned === 0 && coinsRedeemed === 0) return null;

  // Alert if redemption exceeds issuance (unsustainable)
  if (coinsRedeemed > coinsEarned && coinsEarned > 100) {
    const ratio = (coinsRedeemed / coinsEarned).toFixed(2);
    return {
      type: 'coin_economy_unsustainable',
      value: ratio,
      threshold: 1.0,
      message: `Coin economy imbalance: ${coinsRedeemed} redeemed vs ${coinsEarned} earned (ratio: ${ratio}) — unsustainable`,
      severity: 'warning',
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Send anomaly alert to admin dashboard via Socket.IO
 */
function emitAnomalyAlert(alert: AnomalyAlert) {
  try {
    const io = getIO();
    if (io) {
      io.to('admin-room').emit('anomaly:alert', alert);
      logger.info('[AnomalyDetection] Alert emitted', {
        type: alert.type,
        severity: alert.severity,
      });
    }
  } catch (err) {
    logger.warn('[AnomalyDetection] Socket.IO not initialized, alert not emitted', {
      alertType: alert.type,
    });
  }
}

/**
 * Run all anomaly checks
 */
async function runAnomalyChecks() {
  try {
    logger.debug('[AnomalyDetection] Starting anomaly checks');

    const checks = [
      checkPaymentHealthAnomaly(),
      checkCoinIssuanceAnomaly(),
      checkBookingCompletionAnomaly(),
      checkCoinEconomyAnomaly(),
      checkPerUserCoinVelocityAnomaly(), // MIGUEL: per-user hourly velocity check
    ];

    const results = await Promise.all(checks);
    const alerts = results.filter((r) => r !== null) as AnomalyAlert[];

    if (alerts.length > 0) {
      logger.info('[AnomalyDetection] Found anomalies', {
        count: alerts.length,
        types: alerts.map((a) => a.type),
      });

      alerts.forEach((alert) => emitAnomalyAlert(alert));
    } else {
      logger.debug('[AnomalyDetection] No anomalies detected');
    }
  } catch (err) {
    logger.error('[AnomalyDetection] Error during anomaly checks', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Initialize anomaly detection job
 * Runs every 15 minutes
 */
export function startAnomalyDetectionJob() {
  logger.info('[AnomalyDetection] Initializing anomaly detection job');

  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await runAnomalyChecks();
  });

  // Run immediately on startup to ensure job is registered
  runAnomalyChecks().catch((err) => {
    logger.error('[AnomalyDetection] Initial check failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  logger.info('[AnomalyDetection] Job scheduled (every 15 minutes)');
}

export default {
  startAnomalyDetectionJob,
  runAnomalyChecks,
};
