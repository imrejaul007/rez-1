// @ts-nocheck
/**
 * Redis Connection Pooling Configuration
 * ScalePilot Optimization: Optimized for 10x user growth with minimal latency
 */

import type { Redis as RedisType } from 'ioredis';
import RedisImpl from 'ioredis';
import { logger } from './logger';
import { Counter, Gauge } from 'prom-client';

// ── Redis observability metrics ────────────────────────────────────────────
// These counters fire on every connection lifecycle event so that Prometheus
// dashboards (and alert rules) have real-time visibility into Redis stability.
// Counters are declared lazily-guarded to prevent duplicate-registration errors
// if this module is required more than once (e.g. during tests).

function makeCounter(name: string, help: string, labelNames: string[]) {
  try {
    return new Counter({ name, help, labelNames });
  } catch {
    // Already registered — return a no-op shim so callers never throw
    const { register } = require('prom-client');
    return register.getSingleMetric(name) as Counter<string>;
  }
}

function makeGauge(name: string, help: string, labelNames: string[]) {
  try {
    return new Gauge({ name, help, labelNames });
  } catch {
    const { register } = require('prom-client');
    return register.getSingleMetric(name) as Gauge<string>;
  }
}

export const redisReconnectTotal = makeCounter('redis_reconnect_total', 'Total number of Redis reconnect attempts', [
  'role',
]);

export const redisErrorTotal = makeCounter('redis_error_total', 'Total number of Redis connection errors', ['role']);

export const redisDisconnectTotal = makeCounter(
  'redis_disconnect_total',
  'Total number of Redis disconnects (close/end events)',
  ['role'],
);

export const redisConnectionStatus = makeGauge(
  'redis_connection_up',
  '1 if the Redis connection is currently up, 0 otherwise',
  ['role'],
);

let redis: RedisType | null = null;
let redisRead: RedisType | null = null;

/**
 * Create optimized Redis client with connection pooling
 */
export function initializeRedisPool(): { redis: RedisType; redisRead: RedisType } {
  if (redis && redisRead) {
    return { redis, redisRead };
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisReadUrl = process.env.REDIS_READ_URL || redisUrl;

  // Main Redis connection (for writes and all commands)
  redis = new RedisImpl(redisUrl, {
    // Connection pool options
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    commandTimeout: 5000,
    enableReadyCheck: true,
    enableOfflineQueue: true,

    // Retry indefinitely — returning null permanently closes the connection.
    // Render's Redis drops idle connections every ~15-20 min; we must survive that.
    retryStrategy: (times: number) => {
      const base = Math.min(Math.pow(2, times) * 200, 15000);
      return Math.floor(base + Math.random() * 1000);
    },

    // Reconnect on specific errors
    reconnectOnError: (err) => {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'];
      return targetErrors.some((msg) => err.message.includes(msg));
    },

    // Keep connection alive
    lazyConnect: false,
    keepAlive: 10000, // 10s — shorter than Render's idle timeout // TCP keep-alive every 30 seconds

    // TLS/SSL support if needed
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  });

  // Read-only replica client (for cache reads only)
  redisRead = new RedisImpl(redisReadUrl, {
    // Optimized for reads only
    maxRetriesPerRequest: 1,
    commandTimeout: 3000,
    enableReadyCheck: false, // Skip ready check for faster connect
    readOnly: true,
    lazyConnect: false,
    keepAlive: 10000, // 10s — shorter than Render's idle timeout

    // Same as write client — retry indefinitely with backoff.
    retryStrategy: (times: number) => {
      const base = Math.min(Math.pow(2, times) * 200, 15000);
      return Math.floor(base + Math.random() * 1000);
    },

    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
  });

  // Event handlers — also fire Prometheus counters/gauges for observability
  redis.on('connect', () => {
    logger.info('✅ Redis (write) connected');
    redisConnectionStatus.set({ role: 'write' }, 1);
  });
  redis.on('ready', () => logger.info('✅ Redis (write) ready'));
  redis.on('error', (err: any) => {
    logger.error('❌ Redis (write) error:', err.message);
    redisErrorTotal.inc({ role: 'write' });
    redisConnectionStatus.set({ role: 'write' }, 0);
  });
  redis.on('reconnecting', () => {
    logger.warn('[REDIS] Write client reconnecting');
    redisReconnectTotal.inc({ role: 'write' });
    redisConnectionStatus.set({ role: 'write' }, 0);
  });
  redis.on('close', () => {
    logger.warn('[REDIS] Write client connection closed');
    redisDisconnectTotal.inc({ role: 'write' });
    redisConnectionStatus.set({ role: 'write' }, 0);
  });
  redis.on('end', () => {
    logger.warn('[REDIS] Write client connection ended');
    redisDisconnectTotal.inc({ role: 'write' });
    redisConnectionStatus.set({ role: 'write' }, 0);
  });

  redisRead.on('connect', () => {
    logger.info('✅ Redis (read) connected');
    redisConnectionStatus.set({ role: 'read' }, 1);
  });
  redisRead.on('ready', () => logger.info('✅ Redis (read) ready'));
  redisRead.on('error', (err: any) => {
    logger.error('❌ Redis (read) error:', err.message);
    redisErrorTotal.inc({ role: 'read' });
    redisConnectionStatus.set({ role: 'read' }, 0);
  });
  redisRead.on('reconnecting', () => {
    logger.warn('[REDIS] Read client reconnecting');
    redisReconnectTotal.inc({ role: 'read' });
    redisConnectionStatus.set({ role: 'read' }, 0);
  });
  redisRead.on('close', () => {
    logger.warn('[REDIS] Read client connection closed');
    redisDisconnectTotal.inc({ role: 'read' });
    redisConnectionStatus.set({ role: 'read' }, 0);
  });
  redisRead.on('end', () => {
    logger.warn('[REDIS] Read client connection ended');
    redisDisconnectTotal.inc({ role: 'read' });
    redisConnectionStatus.set({ role: 'read' }, 0);
  });

  return { redis, redisRead };
}

/**
 * Get Redis connection (for writes)
 */
export function getRedis(): RedisType {
  if (!redis) {
    const { redis: r } = initializeRedisPool();
    redis = r;
  }
  return redis;
}

/**
 * Get Redis read-only connection (for cache reads, can point to replica)
 */
export function getRedisRead(): RedisType {
  if (!redisRead) {
    const { redisRead: r } = initializeRedisPool();
    redisRead = r;
  }
  return redisRead;
}

/**
 * Health check for Redis connections
 */
export async function checkRedisHealth(): Promise<{
  write: boolean;
  read: boolean;
  latencyMs: number;
}> {
  const start = Date.now();

  try {
    await getRedis().ping();
    await getRedisRead().ping();

    return {
      write: true,
      read: true,
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      write: false,
      read: false,
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Close all Redis connections (for graceful shutdown)
 */
export async function closeRedisConnections(): Promise<void> {
  const promises = [];

  if (redis) {
    promises.push(
      redis.quit().catch((err: any) => {
        logger.warn('Error closing Redis write connection:', err.message);
      }),
    );
  }

  if (redisRead) {
    promises.push(
      redisRead.quit().catch((err: any) => {
        logger.warn('Error closing Redis read connection:', err.message);
      }),
    );
  }

  await Promise.all(promises);
  redis = null;
  redisRead = null;
  logger.info('Redis connections closed');
}

export default {
  initializeRedisPool,
  getRedis,
  getRedisRead,
  checkRedisHealth,
  closeRedisConnections,
};
