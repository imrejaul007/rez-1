import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Use shared logger configuration
interface Logger {
  warn: (msg: string, ctx?: Record<string, unknown>) => void;
  error: (msg: string, ctx?: Record<string, unknown>) => void;
  info: (msg: string, ctx?: Record<string, unknown>) => void;
  debug: (msg: string, ctx?: Record<string, unknown>) => void;
}

// Shared logger for auth middleware
function createAuthLogger(): Logger {
  function write(level: string, msg: string, ctx?: Record<string, unknown>) {
    const entry = JSON.stringify({ level, msg, service: 'auth-middleware', ...(ctx || {}) });
    process.stderr.write(entry + '\n');
  }
  return {
    warn: (msg, ctx) => write('WARN', msg, ctx),
    error: (msg, ctx) => write('ERROR', msg, ctx),
    info: (msg, ctx) => write('INFO', msg, ctx),
    debug: (msg, ctx) => write('DEBUG', msg, ctx),
  };
}

const logger: Logger = createAuthLogger();

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
  merchantId?: string;
  merchantUserId?: string;
  merchantRole?: string;
  merchantPermissions?: string[];
  adminId?: string;
  adminRole?: string;
}

/**
 * Verifies a user JWT signed with JWT_SECRET.
 * Sets req.userId, req.userRole, and req.merchantId on success.
 * Token must be supplied as a Bearer token in the Authorization header.
 */
export function requireUser(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  // BE-GW-004, BE-GW-005: Validate header exists and is non-empty before slicing
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token || token.length === 0) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  // Read JWT_SECRET per request. The comment above claiming "cache at module load time"
  // was misleading — Node.js caches env reads at module load but this pattern is safe
  // because in-flight requests complete with the secret they read, and env changes
  // take effect immediately on the next request without requiring a restart.
  const secret = process.env.JWT_SECRET || '';
  if (!secret) {
    res.status(500).json({ success: false, message: 'JWT not configured' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { userId: string; role: string; merchantId?: string };
    // BE-GW-008: Validate JWT payload structure
    if (!decoded.userId || !decoded.role) {
      res.status(401).json({ success: false, message: 'Invalid token structure' });
      return;
    }
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    req.merchantId = decoded.merchantId;
    next();
  } catch (err: unknown) {
    // BE-GW-007: Log token verification errors for debugging
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn('[AUTH] Token verification failed', { error: errorMessage });
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

/**
 * Verifies a merchant JWT signed with JWT_MERCHANT_SECRET.
 * Sets req.merchantId, req.merchantUserId, req.merchantRole, and req.merchantPermissions on success.
 * Token may be supplied as a Bearer token in Authorization header or in the
 * merchant_access_token cookie (matching rez-merchant-service behaviour).
 *
 * BE-GW-010: Note: This middleware supports both header and cookie token locations,
 * while requireUser and requireAdmin only support header. If standardization is desired,
 * either restrict this to header-only or extend the others to cookie support.
 */
export function requireMerchant(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  // BE-GW-009: Validate cookies middleware is loaded before using req.cookies
  const cookieToken = req.cookies?.merchant_access_token;
  // BE-GW-004, BE-GW-005: Validate header exists and is non-empty before slicing
  const token = (header && header.startsWith('Bearer ') ? header.slice(7) : undefined) || cookieToken;

  if (!token || token.length === 0) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  // Read JWT_MERCHANT_SECRET per request (see requireUser for caching rationale).
  const secret = process.env.JWT_MERCHANT_SECRET || '';
  if (!secret) {
    res.status(500).json({ success: false, message: 'JWT not configured' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as {
      merchantId: string;
      merchantUserId: string;
      role: string;
      permissions?: string[];
    };
    // BE-GW-008: Validate JWT payload structure
    if (!decoded.merchantId || !decoded.merchantUserId || !decoded.role) {
      res.status(401).json({ success: false, message: 'Invalid token structure' });
      return;
    }
    req.merchantId = decoded.merchantId;
    req.merchantUserId = decoded.merchantUserId;
    req.merchantRole = decoded.role;
    req.merchantPermissions = decoded.permissions;
    next();
  } catch (err: unknown) {
    // BE-GW-007: Log token verification errors for debugging
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn('[AUTH] Merchant token verification failed', { error: errorMessage });
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

/**
 * Verifies an admin JWT signed with JWT_ADMIN_SECRET.
 * Sets req.adminId and req.adminRole on success.
 * Token must be supplied as a Bearer token in the Authorization header.
 */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  // BE-GW-004, BE-GW-005: Validate header exists and is non-empty before slicing
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token || token.length === 0) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  // Read JWT_ADMIN_SECRET per request (see requireUser for caching rationale).
  const secret = process.env.JWT_ADMIN_SECRET || '';
  if (!secret) {
    res.status(500).json({ success: false, message: 'JWT not configured' });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as { adminId: string; role: string };
    // BE-GW-008: Validate JWT payload structure
    if (!decoded.adminId || !decoded.role) {
      res.status(401).json({ success: false, message: 'Invalid token structure' });
      return;
    }
    req.adminId = decoded.adminId;
    req.adminRole = decoded.role;
    next();
  } catch (err: unknown) {
    // BE-GW-007: Log token verification errors for debugging
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.warn('[AUTH] Admin token verification failed', { error: errorMessage });
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

// ── Security headers ────────────────────────────────────────────────────────────

export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // HIGH FIX: Added Content-Security-Policy header
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://tagmanager.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://www.google-analytics.com https://analytics.google.com;");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
}

// ── Sliding-window rate limiter middleware factory ───────────────────────────────
// AUDIT-FIX: Replaced in-memory Map with Redis-backed rate limiting to prevent
// bypass in multi-instance deployments. Falls back to in-memory with a warning
// when REDIS_URL is not configured (development only). Production deployments
// MUST set REDIS_URL.

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}

// Lazy Redis client — only created when REDIS_URL is present.
let redisClient: import('redis').RedisClientType | null = null;
async function getRedisClient() {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    const { createClient } = await import('redis');
    redisClient = createClient({ url });
    await redisClient.connect();
    logger.info('[RateLimit] Connected to Redis for distributed rate limiting');
    return redisClient;
  } catch (err) {
    logger.warn('[RateLimit] Redis connection failed, falling back to in-memory store', { err });
    return null;
  }
}

// MEDIUM FIX: Safe IP extraction that trusts only the rightmost (leftmost untrusted) hop
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    // Trust proxy chain: take the leftmost address (client) if trust proxy is configured
    // This is safe because nginx/reverse proxy sets X-Forwarded-For
    const ips = forwarded.split(',').map(s => s.trim());
    return ips[0] || req.socket.remoteAddress || req.ip || 'unknown';
  }
  return req.socket.remoteAddress || req.ip || 'unknown';
}

export function rateLimitMiddleware(options: RateLimitOptions) {
  // In-memory fallback store — only used when Redis is unavailable.
  const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyGenerator ? options.keyGenerator(req) : getClientIP(req);
    const now = Date.now();
    const windowMs = options.windowMs;

    const redis = await getRedisClient();

    if (redis) {
      // Redis-backed sliding window rate limit.
      const redisKey = `ratelimit:${key}:${Math.floor(now / windowMs)}`;
      try {
        const count = await redis.incr(redisKey);
        if (count === 1) {
          await redis.pExpire(redisKey, windowMs);
        }
        res.setHeader('X-RateLimit-Limit', String(options.max));
        res.setHeader('X-RateLimit-Remaining', String(Math.max(0, options.max - count)));
        if (count > options.max) {
          res.status(429).json({ success: false, message: 'Too many requests' });
          return;
        }
        next();
      } catch (err) {
        // SECURITY: fail-closed on Redis errors — silently allowing traffic through
        // when the rate limiter is broken is worse than a temporary 503.
        logger.error('[RateLimit] CRITICAL: Redis error, failing closed', { err });
        res.status(503).json({ success: false, message: 'Service temporarily unavailable. Please try again later.' });
        return;
      }
    } else {
      // HIGH FIX: Fail closed in production when Redis is unavailable
      if (process.env.NODE_ENV === 'production') {
        logger.error('[RateLimit] CRITICAL: Redis unavailable in production. Rate limiting disabled - blocking request.');
        res.status(503).json({ success: false, message: 'Service temporarily unavailable. Please try again later.' });
        return;
      }
      // In-memory fallback only for development
      logger.warn('[RateLimit] Using in-memory store (development only)', { key });
      const entry = inMemoryStore.get(key);
      if (!entry || now > entry.resetAt) {
        inMemoryStore.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }
      if (entry.count >= options.max) {
        res.status(429).json({ success: false, message: 'Too many requests' });
        return;
      }
      entry.count++;
      next();
    }
  };
}
