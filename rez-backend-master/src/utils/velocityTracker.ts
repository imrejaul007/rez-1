/**
 * src/utils/velocityTracker.ts
 *
 * High-performance velocity tracking using Redis atomic operations.
 * Used by rewardAbuseDetector and rewardEngine for fast rate limiting.
 *
 * Key design:
 * - Atomic INCR with TTL for O(1) rate limiting
 * - Sliding window via separate keys per time period
 * - Fail-open on Redis errors (log and allow)
 * - No blocking operations in critical path
 */

import redisService from '../services/redisService';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('velocity-tracker');

// ─── Types ──────────────────────────────────────────

export interface VelocityWindow {
  name: string;
  seconds: number;
  limit: number;
}

export interface VelocityCheckParams {
  userId: string;
  action: string;
  amount?: number;
  windows: VelocityWindow[];
}

export interface VelocityCheckResult {
  passed: boolean;
  violations: Array<{
    window: string;
    current: number;
    limit: number;
    percentUsed: number;
  }>;
  remainingCapacity: Map<string, number>; // window name -> remaining
}

// ─── Pre-defined Windows ──────────────────────────────────────────

export const VELOCITY_WINDOWS = {
  // Coin earning
  COINS_PER_MINUTE: { name: 'coins_per_minute', seconds: 60, limit: 50 },
  COINS_PER_HOUR: { name: 'coins_per_hour', seconds: 3600, limit: 500 },
  COINS_PER_DAY: { name: 'coins_per_day', seconds: 86400, limit: 5000 },

  // Event frequency
  EVENTS_PER_MINUTE: { name: 'events_per_minute', seconds: 60, limit: 5 },
  EVENTS_PER_HOUR: { name: 'events_per_hour', seconds: 3600, limit: 20 },
  EVENTS_PER_DAY: { name: 'events_per_day', seconds: 86400, limit: 50 },

  // Bill uploads
  BILLS_PER_DAY: { name: 'bills_per_day', seconds: 86400, limit: 10 },

  // Challenge completions
  CHALLENGES_PER_HOUR: { name: 'challenges_per_hour', seconds: 3600, limit: 2 },
  CHALLENGES_PER_DAY: { name: 'challenges_per_day', seconds: 86400, limit: 10 },
};

// ─── Core Velocity Tracking ──────────────────────────────────────────

/**
 * Check if action violates any velocity window.
 * Returns result with all violations (if any).
 */
export async function checkVelocity(params: VelocityCheckParams): Promise<VelocityCheckResult> {
  const { userId, action, amount = 1, windows } = params;
  const violations: VelocityCheckResult['violations'] = [];
  const remaining = new Map<string, number>();

  try {
    for (const window of windows) {
      const key = buildKey(userId, action, window);
      const increment = amount;

      // Atomic increment with TTL
      const current = await atomicIncr(key, increment, window.seconds);

      if (current === null) {
        // Redis error — skip this window but log
        logger.warn('[VelocityTracker] Redis error, skipping window check', {
          userId,
          action,
          window: window.name,
        });
        remaining.set(window.name, window.limit);
        continue;
      }

      const percentUsed = (current / window.limit) * 100;
      remaining.set(window.name, Math.max(0, window.limit - current));

      if (current > window.limit) {
        violations.push({
          window: window.name,
          current,
          limit: window.limit,
          percentUsed,
        });
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      remainingCapacity: remaining,
    };
  } catch (error) {
    logger.error('[VelocityTracker] Unexpected error', {
      error: (error as Error).message,
      userId,
      action,
    });
    // Fail open — return passed=true
    return {
      passed: true,
      violations: [],
      remainingCapacity: new Map(),
    };
  }
}

/**
 * Increment a velocity counter and return new count.
 * Handles TTL setting atomically.
 */
async function atomicIncr(key: string, increment: number, ttlSeconds: number): Promise<number | null> {
  try {
    const newValue = await redisService.incr(key, increment);

    if (newValue !== null) {
      // Set TTL (fire-and-forget, non-blocking)
      redisService.expire(key, ttlSeconds).catch((err) => {
        logger.warn('[VelocityTracker] Failed to set TTL', {
          error: (err as Error).message,
          key,
        });
      });
    }

    return newValue;
  } catch (error) {
    logger.error('[VelocityTracker] atomicIncr failed', {
      error: (error as Error).message,
      key,
    });
    return null;
  }
}

/**
 * Build Redis key for velocity window.
 */
function buildKey(userId: string, action: string, window: VelocityWindow): string {
  const now = new Date();
  const dayString = now.toISOString().slice(0, 10);
  const hourString = `${dayString}:${now.getUTCHours()}`;
  const minuteString = `${hourString}:${now.getUTCMinutes()}`;

  switch (window.seconds) {
    case 60:
      return `velocity:${userId}:${action}:minute:${minuteString}`;
    case 3600:
      return `velocity:${userId}:${action}:hour:${hourString}`;
    case 86400:
      return `velocity:${userId}:${action}:day:${dayString}`;
    default:
      // Generic window
      const periodMs = window.seconds * 1000;
      const period = Math.floor(Date.now() / periodMs);
      return `velocity:${userId}:${action}:period:${period}`;
  }
}

/**
 * Get current count for a velocity window (without incrementing).
 */
export async function getVelocityCount(
  userId: string,
  action: string,
  window: VelocityWindow
): Promise<number> {
  try {
    const key = buildKey(userId, action, window);
    const value = await redisService.get(key);
    return value ? parseInt(value as string, 10) : 0;
  } catch (error) {
    logger.error('[VelocityTracker] getVelocityCount failed', {
      error: (error as Error).message,
      userId,
      action,
    });
    return 0;
  }
}

/**
 * Reset a velocity window (for testing or admin override).
 */
export async function resetVelocity(userId: string, action: string, window: VelocityWindow): Promise<void> {
  try {
    const key = buildKey(userId, action, window);
    await redisService.del(key);
    logger.info('[VelocityTracker] Velocity reset', { userId, action, window: window.name });
  } catch (error) {
    logger.error('[VelocityTracker] resetVelocity failed', {
      error: (error as Error).message,
      userId,
      action,
    });
  }
}

/**
 * Get summary of all velocity windows for a user+action.
 */
export async function getVelocitySummary(
  userId: string,
  action: string,
  windows: VelocityWindow[]
): Promise<Record<string, { current: number; limit: number; percentUsed: number }>> {
  const summary: Record<string, any> = {};

  try {
    for (const window of windows) {
      const current = await getVelocityCount(userId, action, window);
      summary[window.name] = {
        current,
        limit: window.limit,
        percentUsed: (current / window.limit) * 100,
      };
    }
  } catch (error) {
    logger.error('[VelocityTracker] getVelocitySummary failed', {
      error: (error as Error).message,
      userId,
      action,
    });
  }

  return summary;
}

// ─── Convenience Functions ──────────────────────────────────────────

/**
 * Check coin earning velocity (quick wrapper).
 */
export async function checkCoinVelocity(userId: string, amount: number = 1): Promise<VelocityCheckResult> {
  return checkVelocity({
    userId,
    action: 'coin_earn',
    amount,
    windows: [VELOCITY_WINDOWS.COINS_PER_HOUR, VELOCITY_WINDOWS.COINS_PER_DAY],
  });
}

/**
 * Check event frequency (quick wrapper).
 */
export async function checkEventVelocity(userId: string, action: string): Promise<VelocityCheckResult> {
  return checkVelocity({
    userId,
    action: `event:${action}`,
    amount: 1,
    windows: [VELOCITY_WINDOWS.EVENTS_PER_HOUR, VELOCITY_WINDOWS.EVENTS_PER_DAY],
  });
}

/**
 * Log velocity state to observability (Datadog/ELK).
 */
export async function logVelocityMetrics(
  userId: string,
  action: string,
  result: VelocityCheckResult,
  metadata?: Record<string, any>
): Promise<void> {
  if (result.violations.length > 0) {
    logger.warn('[VelocityTracker] Velocity violation(s)', {
      userId,
      action,
      violations: result.violations,
      ...metadata,
    });
  }
}

export default {
  checkVelocity,
  checkCoinVelocity,
  checkEventVelocity,
  getVelocityCount,
  resetVelocity,
  getVelocitySummary,
  logVelocityMetrics,
  VELOCITY_WINDOWS,
};
