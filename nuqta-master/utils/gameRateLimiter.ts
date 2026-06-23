/**
 * Game Rate Limiter
 *
 * Prevents spam clicking and abuse of game endpoints
 * Implements cooldown timers and visual feedback
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const RATE_LIMIT_PREFIX = 'rate_limit_';
const COOLDOWN_PREFIX = 'cooldown_';

// Rate limit configuration
export interface RateLimitConfig {
  maxAttempts: number; // Max attempts within time window
  windowMs: number; // Time window in milliseconds
  cooldownMs: number; // Cooldown period after max attempts
  blockDuration?: number; // How long to block after exceeding limits
}

// Default rate limits for different game actions
export const GAME_RATE_LIMITS: Record<string, RateLimitConfig> = {
  SPIN_WHEEL: {
    maxAttempts: 1,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    cooldownMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  SCRATCH_CARD: {
    maxAttempts: 3,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    cooldownMs: 8 * 60 * 60 * 1000, // 8 hours per card
  },
  QUIZ_START: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    cooldownMs: 5 * 60 * 1000, // 5 minutes
  },
  QUIZ_ANSWER: {
    maxAttempts: 30,
    windowMs: 10 * 60 * 1000, // 10 minutes
    cooldownMs: 2000, // 2 seconds between answers
  },
  CLAIM_REWARD: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
    cooldownMs: 5000, // 5 seconds
  },
  GAME_ACTION: {
    maxAttempts: 100,
    windowMs: 60 * 60 * 1000, // 1 hour
    cooldownMs: 1000, // 1 second
  },
};

// Rate limit result
export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
  cooldownRemaining: number;
  reason?: string;
}

// Attempt record
interface AttemptRecord {
  timestamps: number[];
  blockedUntil?: number;
}

/**
 * Rate Limiter Class
 */
export class GameRateLimiter {
  private memoryCache: Map<string, AttemptRecord> = new Map();

  /**
   * Check if action is allowed
   */
  async checkRateLimit(
    userId: string,
    action: string,
    config?: RateLimitConfig
  ): Promise<RateLimitResult> {
    const rateLimitConfig = config || GAME_RATE_LIMITS[action] || GAME_RATE_LIMITS.GAME_ACTION;
    const key = `${userId}_${action}`;
    const now = Date.now();

    // Get attempt record
    const record = await this.getAttemptRecord(key);

    // Check if user is blocked
    if (record.blockedUntil && record.blockedUntil > now) {
      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: record.blockedUntil,
        cooldownRemaining: record.blockedUntil - now,
        reason: 'BLOCKED',
      };
    }

    // Clean up old attempts outside the time window
    const windowStart = now - rateLimitConfig.windowMs;
    const recentAttempts = record.timestamps.filter((timestamp) => timestamp > windowStart);

    // Check cooldown from last attempt
    const lastAttempt = recentAttempts[recentAttempts.length - 1];
    if (lastAttempt && now - lastAttempt < rateLimitConfig.cooldownMs) {
      return {
        allowed: false,
        remainingAttempts: rateLimitConfig.maxAttempts - recentAttempts.length,
        resetTime: lastAttempt + rateLimitConfig.cooldownMs,
        cooldownRemaining: rateLimitConfig.cooldownMs - (now - lastAttempt),
        reason: 'COOLDOWN',
      };
    }

    // Check if max attempts exceeded
    if (recentAttempts.length >= rateLimitConfig.maxAttempts) {
      // Block user if configured
      const blockDuration = rateLimitConfig.blockDuration || rateLimitConfig.windowMs;
      const blockedUntil = now + blockDuration;

      await this.setAttemptRecord(key, {
        timestamps: recentAttempts,
        blockedUntil,
      });

      return {
        allowed: false,
        remainingAttempts: 0,
        resetTime: blockedUntil,
        cooldownRemaining: blockDuration,
        reason: 'MAX_ATTEMPTS_EXCEEDED',
      };
    }

    // Action is allowed
    return {
      allowed: true,
      remainingAttempts: rateLimitConfig.maxAttempts - recentAttempts.length - 1,
      resetTime: windowStart + rateLimitConfig.windowMs,
      cooldownRemaining: 0,
    };
  }

  /**
   * Record an attempt
   */
  async recordAttempt(userId: string, action: string): Promise<void> {
    const key = `${userId}_${action}`;
    const now = Date.now();

    const record = await this.getAttemptRecord(key);
    record.timestamps.push(now);

    await this.setAttemptRecord(key, record);
  }

  /**
   * Reset rate limit for a user action
   */
  async resetRateLimit(userId: string, action: string): Promise<void> {
    const key = `${userId}_${action}`;
    await AsyncStorage.removeItem(`${RATE_LIMIT_PREFIX}${key}`);
    this.memoryCache.delete(key);
  }

  /**
   * Get cooldown information
   */
  async getCooldownInfo(
    userId: string,
    action: string,
    config?: RateLimitConfig
  ): Promise<{
    isOnCooldown: boolean;
    remainingMs: number;
    nextAvailableTime: number;
  }> {
    const rateLimitConfig = config || GAME_RATE_LIMITS[action] || GAME_RATE_LIMITS.GAME_ACTION;
    const key = `${userId}_${action}`;
    const now = Date.now();

    const record = await this.getAttemptRecord(key);

    // Check if blocked
    if (record.blockedUntil && record.blockedUntil > now) {
      return {
        isOnCooldown: true,
        remainingMs: record.blockedUntil - now,
        nextAvailableTime: record.blockedUntil,
      };
    }

    // Check cooldown from last attempt
    const lastAttempt = record.timestamps[record.timestamps.length - 1];
    if (lastAttempt && now - lastAttempt < rateLimitConfig.cooldownMs) {
      const nextAvailableTime = lastAttempt + rateLimitConfig.cooldownMs;
      return {
        isOnCooldown: true,
        remainingMs: nextAvailableTime - now,
        nextAvailableTime,
      };
    }

    return {
      isOnCooldown: false,
      remainingMs: 0,
      nextAvailableTime: now,
    };
  }

  /**
   * Format remaining time for display
   */
  formatRemainingTime(ms: number): string {
    if (ms <= 0) return 'Now';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Get attempt record from storage
   */
  private async getAttemptRecord(key: string): Promise<AttemptRecord> {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      return this.memoryCache.get(key)!;
    }

    // Check AsyncStorage
    try {
      const stored = await AsyncStorage.getItem(`${RATE_LIMIT_PREFIX}${key}`);
      if (stored) {
        const record = JSON.parse(stored);
        this.memoryCache.set(key, record);
        return record;
      }
    } catch (_error) {
      // silently handle
    }

    return { timestamps: [] };
  }

  /**
   * Save attempt record to storage
   */
  private async setAttemptRecord(key: string, record: AttemptRecord): Promise<void> {
    // Update memory cache
    this.memoryCache.set(key, record);

    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem(`${RATE_LIMIT_PREFIX}${key}`, JSON.stringify(record));
    } catch (_error) {
      // silently handle
    }
  }

  /**
   * Clear all rate limit data (for testing or logout)
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const rateLimitKeys = keys.filter((key) => key.startsWith(RATE_LIMIT_PREFIX));
      await AsyncStorage.multiRemove(rateLimitKeys);
    } catch (_error) {
      // silently handle
    }
  }
}

// Singleton instance
const gameRateLimiter = new GameRateLimiter();

/**
 * Hook for using rate limiter in components
 */
export function useGameRateLimiter(userId: string, action: string) {
  const checkLimit = async () => {
    return await gameRateLimiter.checkRateLimit(userId, action);
  };

  const recordAttempt = async () => {
    await gameRateLimiter.recordAttempt(userId, action);
  };

  const getCooldown = async () => {
    return await gameRateLimiter.getCooldownInfo(userId, action);
  };

  const formatTime = (ms: number) => {
    return gameRateLimiter.formatRemainingTime(ms);
  };

  return {
    checkLimit,
    recordAttempt,
    getCooldown,
    formatTime,
  };
}

// Export singleton
export default gameRateLimiter;
