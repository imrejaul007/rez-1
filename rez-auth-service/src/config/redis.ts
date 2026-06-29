// Connection modes (set via environment variables):
//   Single node: REDIS_URL=redis://host:6379
//   Sentinel:    REDIS_SENTINEL_HOSTS=s1:26379,s2:26379,s3:26379
//                REDIS_SENTINEL_NAME=mymaster  (optional, default: mymaster)
//                REDIS_PASSWORD=...            (optional)
//
// When REDIS_SENTINEL_HOSTS is set, Sentinel mode is used and REDIS_URL is
// ignored. When it is not set, REDIS_URL is used (single-node fallback).

import IORedis from 'ioredis';
import { logger } from './logger';
import { randomUUID, randomInt } from 'crypto';

function createRedisClient(): IORedis {
  const sentinelRaw = process.env.REDIS_SENTINEL_HOSTS;
  const retryStrategy = (times: number) => {
    const base = Math.min(times * 200, 5000);
    // SECURITY FIX (AUTH-RAND-001): Use crypto.randomInt for retry jitter.
    return Math.floor(base + randomInt(500));
  };
  const reconnectOnError = (err: Error) =>
    err.message.includes('ECONNRESET') ||
    err.message.includes('EPIPE') ||
    err.message.includes('READONLY');

  // SECURITY FIX: Validate REDIS_SENTINEL_HOSTS is set when using sentinel mode
  if (sentinelRaw && !sentinelRaw.includes(',')) {
    throw new Error('REDIS_SENTINEL_HOSTS must contain at least one sentinel host');
  }

  if (sentinelRaw) {
    const sentinels = sentinelRaw.split(',').map((h) => {
      const [host, port] = h.trim().split(':');
      if (!host) throw new Error('Sentinel host cannot be empty');
      return { host, port: parseInt(port || '26379', 10) };
    });
    return new IORedis({
      sentinels,
      name: process.env.REDIS_SENTINEL_NAME || 'mymaster',
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      keepAlive: 10000,
      retryStrategy,
      reconnectOnError,
    });
  }

  // SECURITY FIX: Fail at startup if REDIS_URL is not set
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) {
    throw new Error('REDIS_URL environment variable is required');
  }
  return new IORedis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    keepAlive: 10000,
    password: process.env.REDIS_PASSWORD,
    retryStrategy,
    reconnectOnError,
  });
}

export const redis = createRedisClient();

redis.on('error', (err) => logger.error('[Redis] Error: ' + err.message));
redis.on('connect', () => logger.info('[Redis] Connection established'));
redis.on('ready', () => logger.info('[Redis] Connection ready'));
redis.on('reconnecting', () => logger.warn('[Redis] Reconnecting...'));
redis.on('end', () => logger.error('[Redis] Connection permanently closed'));
