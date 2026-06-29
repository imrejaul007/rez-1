/**
 * Redis Sentinel Client Configuration
 * Supports high-availability Redis with automatic failover
 *
 * Connection: Apps connect to Sentinel agents, which route to primary
 * Failover: If primary fails, Sentinel promotes a replica automatically
 *
 * Usage:
 *   const redis = createSentinelClient();
 */

import Redis from 'ioredis';
import { logger } from './logger';

interface SentinelConfig {
  sentinels: Array<{ host: string; port: number }>;
  name: string;
  password?: string;
  sentinelPassword?: string;
  masterPassword?: string;
}

function parseSentinelHosts(hosts: string): Array<{ host: string; port: number }> {
  const sentinelPassword = process.env.SENTINEL_PASSWORD;
  return hosts.split(',').map(s => {
    const [host, port] = s.trim().split(':');
    return { host, port: parseInt(port || '26379', 10) };
  });
}

export function createSentinelClient(name: string = 'mymaster'): Redis {
  const sentinelHosts = process.env.SENTINEL_HOSTS || 'localhost:26379,localhost:26380,localhost:26381';
  const sentinelPassword = process.env.SENTINEL_PASSWORD;
  const masterPassword = process.env.REDIS_PASSWORD;

  const config: SentinelConfig = {
    sentinels: parseSentinelHosts(sentinelHosts),
    name,
    password: sentinelPassword,
    sentinelPassword,
    masterPassword,
  };

  const redis = new Redis({
    // Connect to any sentinel - it will find the master
    sentinels: config.sentinels,
    name: config.name,

    // Authentication
    password: config.masterPassword,

    // Sentinel authentication (if configured)
    ...(config.sentinelPassword && { sentinelPassword: config.sentinelPassword }),

    // Retry strategy
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },

    // Required for Socket.io adapter
    maxRetriesPerRequest: null,

    // Sentinel-specific options
    enableReadyCheck: true,
    // Note: updateSentinelInterval removed - not supported in ioredis v5+
  });

  redis.on('connect', () => {
    logger.info('[Redis Sentinel] Connected to master via Sentinel');
  });

  redis.on('error', (err: Error) => {
    logger.error(`[Redis Sentinel] Error: ${err.message}`);
  });

  redis.on('failover', () => {
    logger.warn('[Redis Sentinel] Failover detected - master changed');
  });

  redis.on('sentinelDisconnect', () => {
    logger.warn('[Redis Sentinel] Disconnected from a sentinel');
  });

  return redis;
}

/**
 * Create a standard Redis client (for non-HA deployments)
 */
export function createRedisClient(url?: string): Redis {
  const redisUrl = url || process.env.REDIS_URL || 'redis://localhost:6379';

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for Socket.io
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('connect', () => {
    logger.info('[Redis] Connected');
  });

  redis.on('error', (err: Error) => {
    logger.error('[Redis] Error:', err.message);
  });

  return redis;
}

/**
 * Get Redis client based on environment configuration
 * Uses Sentinel if SENTINEL_HOSTS is configured, otherwise standard connection
 */
export function getRedisClient(): Redis {
  const useSentinel = process.env.SENTINEL_HOSTS && process.env.SENTINEL_HOSTS.length > 0;

  if (useSentinel) {
    logger.info('[Redis] Using Sentinel for high availability');
    return createSentinelClient();
  }

  return createRedisClient();
}
