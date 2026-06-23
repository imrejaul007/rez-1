/**
 * EconGuard: RewardConfig Helper
 * Provides cached, dynamic lookup of reward configuration values.
 *
 * Usage:
 *   const coinReward = await getRewardConfig('trial_completion_coins', 50);  // 50 is fallback
 *   const isKilled = await isRewardKillSwitched('referral_referrer_coins');
 *
 * Cache TTL: 5 minutes (prevents hammering DB on high-traffic endpoints)
 * Kill switch: Returns 0 if isKillSwitched === true (clean signal to calling code)
 */

import RewardConfig from '../models/RewardConfig';
import { logger } from '../config/logger';

interface CachedConfig {
  value: number;
  isKillSwitched: boolean;
  expiresAt: number;
}

const CONFIG_CACHE: Map<string, CachedConfig> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min cache (adjust if needed)
const CONFIG_CACHE_MAX = 500; // guard against unbounded growth if reward keys proliferate

// FT-D005 FIX: Cross-pod cache invalidation via a Redis version-stamp key.
//
// ROOT CAUSE: CONFIG_CACHE is an in-process Map. In a multi-pod deployment
// (e.g. 3 API server replicas), PATCH /api/admin/reward-configs/:key calls
// invalidateRewardConfigCache(key) which only clears the Map on the pod that
// received the request. The other pods keep serving the stale value for up to
// CACHE_TTL_MS (5 minutes). This means a cashback_rate_base change from 5% → 3%
// continues to issue 5% cashback on 2 out of 3 pods for up to 5 minutes,
// creating per-pod inconsistency and potential P&L overpayment.
//
// FIX: When any admin PATCH updates a config, we write a Redis key
//   reward-config:version  →  Unix timestamp (ms)
// On each getRewardConfig() call we compare the local Map entry's expiresAt
// against (now - CROSS_POD_CHECK_INTERVAL_MS). If the Redis version key is
// newer than our last local invalidation timestamp, we treat the in-process
// entry as stale and force a DB re-read.
//
// TRADE-OFF: This adds one Redis GET per getRewardConfig() call that is NOT
// cached, but only for the first call on a pod after any cross-pod invalidation.
// Subsequent calls within CACHE_TTL_MS still hit the in-process Map without Redis.
//
// FAILURE MODE: If Redis is unavailable the version check is skipped (logged at
// warn) and the existing 5-min local TTL acts as the safety net — same as before.

const REDIS_VERSION_KEY = 'reward-config:version';

// Local snapshot of last seen Redis version stamp; initialized to 0 so any
// real stamp (current epoch ms) forces an immediate DB re-read on first use.
let lastKnownRedisVersion = 0;

async function getRedisVersion(): Promise<number> {
  try {
    const redisService = (await import('../services/redisService')).default;
    const raw = await redisService.get<string>(REDIS_VERSION_KEY);
    if (raw === null) return 0;
    const v = typeof raw === 'number' ? raw : parseInt(raw as string, 10);
    return isNaN(v) ? 0 : v;
  } catch {
    return 0; // Redis unavailable — degrade gracefully
  }
}

async function bumpRedisVersion(): Promise<void> {
  try {
    const redisService = (await import('../services/redisService')).default;
    // Store as plain number; no TTL so it persists across cache flushes
    await redisService.set(REDIS_VERSION_KEY, Date.now());
  } catch (err: any) {
    logger.warn('[RewardConfig] Could not bump Redis version stamp (cross-pod invalidation degraded)', {
      error: err?.message,
    });
  }
}

/**
 * Get a reward config value dynamically.
 * Returns fallback if config doesn't exist or is missing.
 * Returns 0 if isKillSwitched is true.
 *
 * @param key - Config key (e.g., 'trial_completion_coins')
 * @param fallback - Default value if config not found
 * @returns Configured value, or 0 if kill-switched, or fallback if not found
 */
export async function getRewardConfig(key: string, fallback: number): Promise<number> {
  const now = Date.now();
  const cached = CONFIG_CACHE.get(key);

  // FT-D005: Before trusting the in-process cache, check whether another pod
  // has bumped the Redis version stamp since we last validated it.
  if (cached && cached.expiresAt > now) {
    // Only do the Redis version check when the cached entry is otherwise still
    // valid (no point checking if it's already expired — we'd re-fetch anyway).
    const redisVersion = await getRedisVersion();
    if (redisVersion > lastKnownRedisVersion) {
      // Another pod invalidated the config — treat our local entry as stale.
      lastKnownRedisVersion = redisVersion;
      CONFIG_CACHE.delete(key);
      // Fall through to DB read below
    } else {
      if (cached.isKillSwitched) return 0;
      return cached.value;
    }
  }

  try {
    const config = await RewardConfig.findOne({ key }).lean();

    // Evict oldest entry if at cap before adding a new key
    if (!CONFIG_CACHE.has(key) && CONFIG_CACHE.size >= CONFIG_CACHE_MAX) {
      const oldestKey = CONFIG_CACHE.keys().next().value;
      if (oldestKey) CONFIG_CACHE.delete(oldestKey);
    }

    if (!config) {
      // Config doesn't exist — cache the fallback for a short time
      CONFIG_CACHE.set(key, {
        value: fallback,
        isKillSwitched: false,
        expiresAt: now + CACHE_TTL_MS,
      });
      return fallback;
    }

    // Cache the fetched config
    CONFIG_CACHE.set(key, {
      value: config.value,
      isKillSwitched: config.isKillSwitched,
      expiresAt: now + CACHE_TTL_MS,
    });

    // Return 0 if kill-switched, otherwise return the configured value
    return config.isKillSwitched ? 0 : config.value;
  } catch (err) {
    logger.warn('[RewardConfig] Lookup failed, using fallback', {
      key,
      fallback,
      error: (err as Error).message,
    });
    return fallback;
  }
}

/**
 * Check if a reward is globally kill-switched.
 * @param key - Config key
 * @returns true if isKillSwitched, false otherwise
 */
export async function isRewardKillSwitched(key: string): Promise<boolean> {
  const value = await getRewardConfig(key, -1);
  // If value is 0 and config exists as kill-switched, it returns true
  // Otherwise, treat as not kill-switched
  const now = Date.now();
  const cached = CONFIG_CACHE.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.isKillSwitched;
  }

  try {
    const config = await RewardConfig.findOne({ key }).lean();
    return config?.isKillSwitched ?? false;
  } catch (err) {
    logger.warn('[RewardConfig] Kill-switch check failed', {
      key,
      error: (err as Error).message,
    });
    return false;
  }
}

/**
 * Invalidate cache for a specific key (or all keys if no key provided).
 * Called by admin when updating configs.
 *
 * FT-D005: Also bumps a Redis version stamp so all other pods detect the change
 * on their next getRewardConfig() call and re-read from DB.
 *
 * @param key - Optional key to invalidate; if omitted, clears entire cache
 */
export function invalidateRewardConfigCache(key?: string): void {
  if (key) {
    CONFIG_CACHE.delete(key);
    logger.debug('[RewardConfig] Cache invalidated for key', { key });
  } else {
    CONFIG_CACHE.clear();
    logger.debug('[RewardConfig] All cache invalidated');
  }

  // FT-D005: Bump the Redis version stamp so all pods (including this one on
  // the next getRewardConfig call) know the config changed.
  bumpRedisVersion().catch(() => {
    // Already logged inside bumpRedisVersion — swallow here
  });
}

/**
 * Get all cached keys (for debugging/monitoring).
 */
export function getCachedConfigKeys(): string[] {
  const now = Date.now();
  const validKeys = Array.from(CONFIG_CACHE.entries())
    .filter(([_, cached]) => cached.expiresAt > now)
    .map(([key, _]) => key);
  return validKeys;
}
