import { Request, Response, NextFunction } from 'express';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

/**
 * IP Blocker Middleware
 * Blocks IPs that have been flagged for suspicious activity
 * Uses Redis for persistence across pod restarts
 */

const BLOCKED_IPS_KEY = 'ip_blocker:blocked_ips';
const VIOLATION_KEY_PREFIX = 'ip_blocker:violations:';

// Configuration
const MAX_VIOLATIONS = 10;
const VIOLATION_TTL = 86400; // 24 hours in seconds

// In-memory cache to avoid Redis lookup on every single request
let cachedBlockedSet: Set<string> = new Set();
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000; // Refresh from Redis every 30s

/**
 * IP Blocker Middleware
 * Checks if the requesting IP is blocked
 */
export const ipBlocker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIP = req.ip || req.socket.remoteAddress || 'unknown';

    // Use in-memory cache; refresh from Redis periodically
    const now = Date.now();
    if (now - cacheTimestamp > CACHE_TTL_MS) {
      const data = await redisService.get<string[]>(BLOCKED_IPS_KEY);
      cachedBlockedSet = new Set(data || []);
      cacheTimestamp = now;
    }

    if (cachedBlockedSet.has(clientIP)) {
      return res.status(403).json({
        success: false,
        error: 'Your IP has been blocked due to suspicious activity. Please contact support if you believe this is a mistake.'
      });
    }

    next();
  } catch {
    // Fail open — if Redis is down, don't block legitimate users
    next();
  }
};

// Get blocked IPs set from Redis
async function getBlockedSet(): Promise<Set<string>> {
  const data = await redisService.get<string[]>(BLOCKED_IPS_KEY);
  return new Set(data || []);
}

// Save blocked IPs set to Redis
async function saveBlockedSet(blockedSet: Set<string>): Promise<void> {
  await redisService.set(BLOCKED_IPS_KEY, Array.from(blockedSet));
}

/**
 * Manually block an IP address
 */
export const blockIP = async (ip: string, reason?: string): Promise<void> => {
  const blockedSet = await getBlockedSet();
  blockedSet.add(ip);
  await saveBlockedSet(blockedSet);
  cachedBlockedSet = blockedSet; // Sync in-memory cache immediately
  cacheTimestamp = Date.now();
  logger.info(`[IP_BLOCKER] Blocked IP: ${ip}${reason ? ` - Reason: ${reason}` : ''}`);
};

/**
 * Unblock an IP address
 */
export const unblockIP = async (ip: string): Promise<void> => {
  const blockedSet = await getBlockedSet();
  blockedSet.delete(ip);
  await saveBlockedSet(blockedSet);
  cachedBlockedSet = blockedSet; // Sync in-memory cache immediately
  cacheTimestamp = Date.now();
  logger.info(`[IP_BLOCKER] Unblocked IP: ${ip}`);
};

/**
 * Get list of all blocked IPs
 */
export const getBlockedIPs = async (): Promise<string[]> => {
  const data = await redisService.get<string[]>(BLOCKED_IPS_KEY);
  return data || [];
};

/**
 * Check if an IP is blocked
 */
export const isIPBlocked = async (ip: string): Promise<boolean> => {
  const blockedSet = await getBlockedSet();
  return blockedSet.has(ip);
};

/**
 * Record a violation for an IP
 * Automatically blocks IP if violations exceed threshold
 */
export const recordViolation = async (ip: string, violationType: string): Promise<void> => {
  const key = `${VIOLATION_KEY_PREFIX}${ip}`;
  const count = await redisService.incr(key);

  // Set TTL on first violation (auto-resets after 24h)
  if (count === 1) {
    await redisService.expire(key, VIOLATION_TTL);
  }

  if (count !== null && count >= MAX_VIOLATIONS) {
    await blockIP(ip, `Automatic block: ${count} violations - Last: ${violationType}`);
  }
};

/**
 * Get violation count for an IP
 */
export const getViolations = async (ip: string): Promise<number> => {
  const count = await redisService.get<number>(`${VIOLATION_KEY_PREFIX}${ip}`);
  return count || 0;
};

/**
 * Clear all violations for an IP
 */
export const clearViolations = async (ip: string): Promise<void> => {
  await redisService.del(`${VIOLATION_KEY_PREFIX}${ip}`);
};

/**
 * Middleware to record violations when rate limit is hit
 */
export const recordRateLimitViolation = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress || 'unknown';
  recordViolation(clientIP, 'Rate Limit Exceeded').catch((err) => logger.error('[IPBlocker] Rate limit violation recording failed', { error: err.message, clientIP }));
  next();
};

/**
 * Clear blocked IPs (admin function)
 */
export const clearAllBlockedIPs = async (): Promise<void> => {
  await redisService.del(BLOCKED_IPS_KEY);
  cachedBlockedSet = new Set();
  cacheTimestamp = Date.now();
};

/**
 * Get IP blocker statistics
 */
export const getIPBlockerStats = async () => {
  const blocked = await getBlockedIPs();
  return {
    blockedIPsCount: blocked.length,
    blockedIPs: blocked,
  };
};

export const ipBlockerConfig = {
  MAX_VIOLATIONS,
  VIOLATION_TTL,
};
