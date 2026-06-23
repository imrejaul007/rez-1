// @ts-nocheck
/**
 * Shared BullMQ IORedis Connection
 *
 * ONE ioredis instance shared across ALL BullMQ Queue and Worker instances.
 *
 * Why: Each `new Queue(name, { connection: plainOptions })` and each
 * `new Worker(name, fn, { connection: plainOptions })` opens its own ioredis
 * client connection. With 11 queues + 11 workers in QueueService alone that is
 * 33 connections — on top of the other services we were opening ~54 connections
 * total, far exceeding Render's free Redis limit (~20-30).
 *
 * Sharing semantics in BullMQ v5:
 *   - Queue: uses the shared instance directly → 0 extra connections
 *   - Worker: uses the shared instance for client ops; creates 1 new dedicated
 *     blocking connection internally (for BRPOP) → 1 extra connection per Worker
 *
 * So N workers sharing this instance = 1 (shared client) + N (blocking) connections
 * instead of 2N connections. Saves roughly half the ioredis connections.
 *
 * Settings:
 *   maxRetriesPerRequest: null — required by BullMQ (blocking BRPOP must retry ∞)
 *   keepAlive: 10000           — TCP probe every 10 s (shorter than Render idle ~15-20 s)
 *   retryStrategy: exponential — prevents thundering-herd on simultaneous reconnects
 */

import IORedis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

function parsedUrl() {
  try {
    return new URL(redisUrl);
  } catch {
    return { hostname: 'localhost', port: '6379', password: '' };
  }
}

const u = parsedUrl();

// Cast to `any` so BullMQ's vendored ioredis types don't conflict with the
// standalone ioredis package. At runtime BullMQ detects an IORedis instance
// and uses it directly — the cast is purely a TypeScript workaround.
export const bullmqRedis: any = new IORedis({
  host: u.hostname || 'localhost',
  port: parseInt(u.port || '6379', 10),
  password: u.password || undefined,
  // Required for BullMQ — blocking BRPOP commands must retry indefinitely.
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Keepalive probe shorter than Render's idle-connection timeout (~15-20 s).
  keepAlive: 10000,
  // Retry indefinitely with exponential backoff + jitter.
  // Returning null would permanently close the connection for the process lifetime.
  retryStrategy: (times: number) => {
    const base = Math.min(Math.pow(2, times) * 200, 15000);
    return Math.floor(base + Math.random() * 1000);
  },
  reconnectOnError: (err: Error) => {
    return err.message.includes('ECONNRESET') || err.message.includes('EPIPE') || err.message.includes('READONLY');
  },
  // FIX: lazyConnect=true prevents the module from crashing the process when
  // Redis is unreachable at startup. BullMQ queues/workers will retry and connect
  // when the server's redisService.connect() resolves. This avoids unhandled
  // ioredis connection errors during module initialization (before validateEnv
  // or any try/catch can run).
  lazyConnect: true,
  tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
});

bullmqRedis.on('connect', () => logger.info('[BullMQ] Shared Redis connection established'));
bullmqRedis.on('ready', () => logger.info('[BullMQ] Shared Redis connection ready'));
bullmqRedis.on('reconnecting', () => logger.warn('[BullMQ] Shared Redis connection reconnecting...'));
bullmqRedis.on('error', (err: Error) => logger.error('[BullMQ] Shared Redis connection error: ' + err.message));
bullmqRedis.on('end', () => logger.error('[BullMQ] Shared Redis connection permanently closed'));

// FIX: explicit connect call after event listeners are registered.
// ioredis fires 'error' before 'connect' if lazyConnect=true, so the listener
// above catches startup failures. This also surfaces any REDIS_URL parse errors
// immediately rather than silently failing at first BullMQ use.
try {
  bullmqRedis.connect().catch((err: Error) => {
    logger.error('[BullMQ] Initial connection attempt failed (will retry): ' + err.message);
  });
} catch (err: any) {
  // new IORedis() constructor itself should never throw, but guard anyway.
  logger.error('[BullMQ] Failed to initialize Redis client: ' + err.message);
}
