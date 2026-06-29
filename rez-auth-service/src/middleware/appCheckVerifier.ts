/**
 * App Check Verification Middleware
 *
 * Verifies attestation tokens on incoming requests.
 * This helps prevent API abuse from bots and non-genuine app instances.
 *
 * Token format: HMAC-SHA256 of `<timestamp>.<platform>.<appVersion>` with
 * `APP_CHECK_SECRET_KEY`. The client is expected to mint these tokens using
 * the same shared secret. (For real Firebase App Check, replace this with
 * `firebase-admin/app-check` verifyToken() — this current implementation is
 * a shared-secret HMAC placeholder.)
 *
 * @see https://firebase.google.com/docs/app-check
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { logger } from '../config/logger';

const APP_CHECK_SECRET_KEY = process.env.APP_CHECK_SECRET_KEY;

// Cache for verified tokens. Bounded by CACHE_MAX; older entries are evicted.
// In production, prefer Redis with natural TTL eviction (see find 4.2).
const verifiedTokens = new Map<string, { valid: boolean; expiresAt: number }>();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX = 5000;
const TIMESTAMP_TOLERANCE_S = 5 * 60; // accept tokens minted up to 5 min in the past or future

/**
 * Verify an App Check token using constant-time HMAC-SHA256.
 *
 * Returns false if the secret is not configured (fail-closed in production)
 * or the token is malformed, expired, or has a bad signature.
 */
function verifyToken(token: string): boolean {
  if (!token || token.length < 10) return false;
  if (!APP_CHECK_SECRET_KEY) {
    // Refuse to verify anything when the secret is missing. Without this we
    // would silently accept any token and provide false confidence.
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [tsStr, platform, appVersion, sig] = parts;
  const ts = Number(tsStr);
  if (!Number.isFinite(ts)) return false;
  const nowS = Math.floor(Date.now() / 1000);
  if (Math.abs(nowS - ts) > TIMESTAMP_TOLERANCE_S) return false;
  if (!platform || !appVersion || !sig) return false;

  const expected = crypto
    .createHmac('sha256', APP_CHECK_SECRET_KEY)
    .update(`${ts}.${platform}.${appVersion}`)
    .digest('hex');
  const a = Buffer.from(sig, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Middleware to verify App Check tokens.
 *
 * Behavior:
 * - If APP_CHECK_SECRET_KEY is not configured: refuse ALL requests in production
 *   (fail closed). In dev, allow through with a warning so local hacking is easy.
 * - If the secret is configured: token is required and must verify.
 */
export function verifyAppCheck(req: Request, res: Response, next: NextFunction): void {
  if (!APP_CHECK_SECRET_KEY) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[AppCheck] FATAL: APP_CHECK_SECRET_KEY not configured in production — refusing request', { path: req.path });
      res.status(503).json({
        success: false,
        error: 'App Check not configured',
        code: 'APP_CHECK_NOT_CONFIGURED',
      });
      return;
    }
    next();
    return;
  }

  const token = req.headers['x-firebase-appcheck'] as string;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'App Check token required',
      code: 'APP_CHECK_REQUIRED',
    });
    return;
  }

  // Check cache first
  const cached = verifiedTokens.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    next();
    return;
  }

  if (verifyToken(token)) {
    verifiedTokens.set(token, {
      valid: true,
      expiresAt: Date.now() + TOKEN_CACHE_TTL,
    });

    // Bounded cache eviction: when over the cap, drop expired entries.
    // If still over, drop oldest-inserted by re-inserting the survivors.
    if (verifiedTokens.size > CACHE_MAX) {
      const now = Date.now();
      for (const [key, value] of verifiedTokens.entries()) {
        if (value.expiresAt < now) verifiedTokens.delete(key);
      }
      if (verifiedTokens.size > CACHE_MAX) {
        // Drop the oldest half by expiresAt
        const sorted = [...verifiedTokens.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
        const toDrop = sorted.slice(0, Math.floor(CACHE_MAX / 2));
        for (const [key] of toDrop) verifiedTokens.delete(key);
      }
    }

    next();
  } else {
    logger.warn('[AppCheck] Invalid token received', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({
      success: false,
      error: 'Invalid App Check token',
      code: 'APP_CHECK_INVALID',
    });
  }
}

/**
 * Optional App Check verification — runs the verifier only if a token header is present.
 *
 * SECURITY FIX: Now logs all requests that pass through without App Check tokens,
 * enabling abuse detection and alerting. In production with APP_CHECK_SECRET_KEY
 * configured, requests without tokens are rejected to prevent bot bypass of OTP endpoints.
 *
 * Behavior:
 * - Production + APP_CHECK_SECRET_KEY configured: REJECT requests without tokens (fail-closed)
 * - Production + APP_CHECK_SECRET_KEY not configured: ALLOW with warning log
 * - Development: ALLOW with debug log
 * - Any environment: ALWAYS log/monitor absent tokens for abuse detection
 */
export function optionalAppCheck(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-firebase-appcheck'] as string;

  if (!token) {
    // Log ALL absent App Check tokens for abuse detection
    // This creates an audit trail for security monitoring
    const logData = {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent'],
      method: req.method,
      timestamp: new Date().toISOString(),
    };

    // In production with App Check configured, reject the request entirely
    // This is the fail-closed approach — bots cannot bypass OTP endpoints
    if (APP_CHECK_SECRET_KEY && process.env.NODE_ENV === 'production') {
      logger.error('[AppCheck] CRITICAL: Request without App Check token in production', logData);
      res.status(401).json({
        success: false,
        error: 'App Check token required',
        code: 'APP_CHECK_REQUIRED',
      });
      return;
    }

    // Allow through but log at appropriate level based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production but no secret configured — allow with warning (graceful degradation)
      logger.warn('[AppCheck] Request passed without token (App Check not configured)', logData);
    } else {
      // Development — debug log for local testing without tokens
      logger.debug('[AppCheck] Dev mode: allowing request without token', logData);
    }

    next();
    return;
  }

  // Token present — verify it
  verifyAppCheck(req, res, next);
}

export function clearAppCheckCache(): void {
  verifiedTokens.clear();
}

export function getAppCheckStats(): { size: number; oldestEntry: number | null } {
  let oldest: number | null = null;
  for (const entry of verifiedTokens.values()) {
    if (!oldest || entry.expiresAt < oldest) {
      oldest = entry.expiresAt;
    }
  }
  return { size: verifiedTokens.size, oldestEntry: oldest };
}
