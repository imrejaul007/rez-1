/**
 * AI Chat Rate Limiter Middleware
 * Enforces 30 messages per hour per customerId (or IP if anonymous).
 * Uses an in-memory Map — suitable for single-instance deployments.
 * For multi-instance, replace with Redis-backed counting using redisService.atomicIncr.
 */

import { Request, Response, NextFunction } from 'express';
import { sendTooManyRequests } from '../utils/response';

const MESSAGES_PER_HOUR = 30;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp (ms)
}

interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
  limit: number;
}

// In-memory store: key = customerId or IP address
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Prune expired entries on every check to prevent unbounded memory growth.
 */
function pruneExpired(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Determine the rate-limit key for a request.
 * Prefer customerId (authenticated) over IP (anonymous).
 */
function getRateLimitKey(req: Request): string {
  const userId = (req as Request & { userId?: string }).userId;
  if (userId) return `uid:${userId}`;

  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    (req.headers['x-real-ip'] as string)?.trim() ??
    req.ip ??
    'unknown';

  return `ip:${ip}`;
}

/**
 * Check and increment the rate limit counter for the given key.
 * Returns { allowed, remaining, resetAt }.
 */
function checkAndIncrement(key: string): { allowed: boolean; remaining: number; resetAt: Date } {
  pruneExpired();

  const now = Date.now();
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    // New or expired window — start fresh
    const resetAt = now + WINDOW_MS;
    rateLimitStore.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: MESSAGES_PER_HOUR - 1, resetAt: new Date(resetAt) };
  }

  if (entry.count >= MESSAGES_PER_HOUR) {
    return { allowed: false, remaining: 0, resetAt: new Date(entry.resetAt) };
  }

  entry.count += 1;
  rateLimitStore.set(key, entry);
  return {
    allowed: true,
    remaining: MESSAGES_PER_HOUR - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}

/**
 * Rate limiter middleware for AI chat endpoints.
 * Attaches rate limit info to req.aiRateLimit and returns 429 if exceeded.
 */
export function aiRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const key = getRateLimitKey(req);
  const { allowed, remaining, resetAt } = checkAndIncrement(key);

  // Attach rate limit info to the request for use in route handlers
  (req as Request & { aiRateLimit?: RateLimitInfo }).aiRateLimit = {
    remaining,
    resetAt,
    limit: MESSAGES_PER_HOUR,
  };

  // Set standard rate-limit headers
  res.setHeader('X-RateLimit-Limit', MESSAGES_PER_HOUR);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.floor(resetAt.getTime() / 1000));
  res.setHeader('Retry-After', Math.ceil((resetAt.getTime() - Date.now()) / 1000));

  if (!allowed) {
    logger.warn(`[AIRateLimiter] Rate limit exceeded for key=${key}`);
    sendTooManyRequests(
      res,
      `Too many messages. Please wait before sending another. Retry after ${resetAt.toLocaleTimeString()}.`,
    );
    return;
  }

  next();
}

// Logger — imported directly to avoid circular deps
import { logger } from '../config/logger';

// Exported for testing
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}

export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}
