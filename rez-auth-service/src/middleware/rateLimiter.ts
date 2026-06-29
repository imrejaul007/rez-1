import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import jwt from 'jsonwebtoken';
import { errorResponse, errors } from '../utils/response';

// Build a normalized phone key from the request body or query parameters.
// Strips non-digits and removes leading country-code prefixes (91/971)
// so +919876543210, 919876543210, and 9876543210 all share one bucket.
// Also strips spaces, dashes, and other separators to prevent format-based bypass.
function extractPhoneKey(req: Request): string | null {
  // Check body first (POST requests)
  const bodyRaw: string = req.body?.phone || req.body?.phoneNumber || '';
  // Check query params (GET requests like /auth/has-pin)
  const queryRaw: string = (req.query?.phone as string) || (req.query?.phoneNumber as string) || '';

  const raw = bodyRaw || queryRaw;
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length >= 12) return digits.slice(2);
  if (digits.startsWith('971') && digits.length >= 12) return digits.slice(3);
  return digits || null;
}

function createLimiter(prefix: string, maxRequests: number, windowSec: number, failOpen = false) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${prefix}:${req.ip}`;
    try {
      // PERF: Pipeline incr + expire into a single round-trip instead of 2 sequential calls.
      // incr returns the new count atomically; we pipeline both commands so they travel
      // together over the network, reducing latency from 2 RTTs to 1.
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSec);
      const [[incrErr, count], [expireErr]] = await pipeline.exec() as [
        [Error | null, number | null],
        [Error | null, number | null],
      ];
      if (incrErr || count === null || count === undefined) {
        if (!failOpen) { return errorResponse(res, errors.serviceUnavailable('Rate limit')); }
      }
      const currentCount = count as number;
      if (currentCount > maxRequests) {
        return errorResponse(res, errors.tooManyRequests());
      }
    } catch {
      if (!failOpen) {
        // Fail-closed: deny the request rather than bypass rate limiting on Redis outage.
        return errorResponse(res, errors.serviceUnavailable('Rate limit'));
      }
      // Fail-open: allow through when Redis is down (acceptable for low-risk endpoints)
    }
    next();
  };
}

// Per-phone rate limiter: keys on normalized phone number extracted from request body.
// Falls back to IP-keyed limiting when no phone is present.
function createPhoneLimiter(prefix: string, maxRequests: number, windowSec: number, failOpen = false) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const phone = extractPhoneKey(req);
    const key = phone ? `${prefix}:phone:${phone}` : `${prefix}:ip:${req.ip}`;
    try {
      // PERF: Pipeline incr + expire into a single round-trip instead of 2 sequential calls.
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSec);
      const [[incrErr, count], [expireErr]] = await pipeline.exec() as [
        [Error | null, number | null],
        [Error | null, number | null],
      ];
      if (incrErr || count === null || count === undefined) {
        if (!failOpen) { return errorResponse(res, errors.serviceUnavailable('Rate limit')); }
      }
      const currentCount = count as number;
      if (currentCount > maxRequests) {
        return errorResponse(res, errors.tooManyRequests('Too many requests — please wait before retrying'));
      }
    } catch {
      if (!failOpen) {
        return errorResponse(res, errors.serviceUnavailable('Rate limit'));
      }
    }
    next();
  };
}

// OTP send: 10 per 15 min per IP (increased from 5 — original was too tight
// for the parallel requests fired during a single login: has-pin + send-otp +
// checkAppStatus all fire together, each consuming from the same IP bucket)
export const otpLimiter = createLimiter('rl:otp', 10, 900, false);

// OTP send: 5 per 60 sec per phone — increased from 3 to allow legitimate retries
// Users often click "resend" multiple times while waiting, or face network delays.
// The SMS cost is borne by your provider, not by allowing 2 extra attempts per minute.
export const otpSendPhoneLimiter = createPhoneLimiter('rl:otp:send', 5, 60, false);

// OTP verify: 5 per 60 sec per phone — fail-CLOSED (prevents brute-force on 6-digit OTP)
export const otpVerifyPhoneLimiter = createPhoneLimiter('rl:otp:verify', 5, 60, false);

// Auth / login general: 100 per min per IP (increased from 30 — login flows
// fire 5+ parallel requests: has-pin, send-otp, checkAppStatus, /me, etc.
// Original 30r/m was exhausted in seconds, causing 429 on every auth endpoint)
export const authLimiter = createLimiter('rl:auth', 100, 60, false);

// has-pin check: 60 per min per PHONE + 120 per min per IP (dual-layer defense)
// Gets its own bucket so it doesn't starve other auth endpoints.
// SECURITY FIX (AUTH-RATELIMIT-001): Changed from failOpen=true to failOpen=false
// Previously allowed unlimited requests when Redis was unavailable, enabling account enumeration.
// SECURITY FIX (AUTH-APPCHECK-001): Changed from IP-based to PHONE-based limiting.
// Previously attackers could bypass rate limits by rotating IPs while enumerating phone numbers.
// DEFENSE-IN-DEPTH: Added IP-based limiter as secondary layer to catch distributed attacks
// where multiple phones are targeted from the same IP, or when phone extraction fails.
export const hasPinLimiter = createPhoneLimiter('rl:haspin', 60, 60, false);
export const hasPinIpLimiter = createLimiter('rl:haspin:ip', 120, 60, false);

// Phase 6.24: dedicated limiter for /auth/me. Was previously unrate-limited
// (the 5s token-validation cache was used as an implicit rate cap, but only
// for valid tokens — unauthenticated callers hammering /auth/me would get
// 401s without any throttle). 120/min per IP is generous for legitimate
// use (page loads, app focus) but blocks enumeration/scraping.
export const getMeLimiter = createLimiter('rl:getme', 120, 60, false);

// OAuth authorize: 20 per min per IP — dedicated limiter for OAuth flow
export const oauthAuthorizeLimiter = createLimiter('rl:oauth:authorize', 20, 60, false);

// OAuth consent: 10 per min per IP — prevents OAuth consent enumeration
export const oauthConsentLimiter = createLimiter('rl:oauth:consent', 10, 60, false);

// OAuth token: 30 per min per IP — token exchange rate limiting
export const oauthTokenLimiter = createLimiter('rl:oauth:token', 30, 60, false);

// Admin login: 3 per 5 min per IP — fail-CLOSED
export const adminLoginLimiter = createLimiter('rl:admin', 3, 300, false);

// Merchant auth: 10 per min per IP — fail-CLOSED
export const merchantAuthLimiter = createLimiter('rl:merchant:auth', 10, 60, false);

// Profile update: 10 per min per user — fail-CLOSED
// Prevents profile update spam by rate-limiting per authenticated userId.
// Extracts userId from the JWT Authorization header so IP rotation cannot bypass the limit.
function createProfileUpdateLimiter() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // FIX (AUTH-RATE-002): Use userId from JWT for rate limiting when available.
    // Decode JWT without verification to extract userId for rate limit key.
    // This is acceptable because we only use it for rate limiting (non-critical),
    // not for authorization decisions. The actual auth middleware verifies the signature.
    let key = `rl:profile:update:ip:${req.ip}`;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const decoded = jwt.decode(token) as { userId?: string; sub?: string } | null;
        if (decoded?.userId || decoded?.sub) {
          key = `rl:profile:update:user:${decoded.userId || decoded.sub}`;
        }
      } catch {
        // Fall back to IP-based limiting if JWT decode fails
      }
    }

    try {
      // PERF: Pipeline incr + expire into a single round-trip instead of 2 sequential calls.
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, 60);
      const [[incrErr, count], [expireErr]] = await pipeline.exec() as [
        [Error | null, number | null],
        [Error | null, number | null],
      ];
      if (incrErr || count === null || count === undefined) {
        return errorResponse(res, errors.serviceUnavailable('Rate limit'));
      }
      if (count > 10) {
        return errorResponse(res, errors.tooManyRequests('Too many profile updates. Please wait before trying again.'));
      }
    } catch {
      return errorResponse(res, errors.serviceUnavailable('Rate limit'));
    }
    next();
  };
}
export const profileUpdateLimiter = createProfileUpdateLimiter();

// MFA verify: strict rate limit per userId (extracted from JWT, not IP —
// an attacker could rotate IPs to bypass per-IP limits). 5 attempts per
// 60 seconds per user. This prevents brute-forcing 6-digit TOTP codes
// (1M possibilities × no rate limit = trivial to crack in seconds).
function mfaLimiterByUserId(
  prefix: string,
  maxRequests: number,
  windowSec: number,
  failOpen: boolean,
  customMessage: string,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Extract userId from JWT in the Authorization header
    const authHeader = req.header('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    let userId = 'unknown';
    if (token) {
      try {
        const decoded = jwt.decode(token) as { userId?: string } | null;
        if (decoded?.userId) userId = decoded.userId;
      } catch {
        // ignore — fall through to unknown key
      }
    }
    const key = `${prefix}:${userId}`;
    try {
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.expire(key, windowSec);
      const results = await pipeline.exec();
      if (!results) {
        if (!failOpen) return errorResponse(res, errors.serviceUnavailable('Rate limit'));
        return next();
      }
      const [[incrErr, count]] = results as [[Error | null, number | null], unknown];
      if (incrErr || count === null || count === undefined) {
        if (!failOpen) return errorResponse(res, errors.serviceUnavailable('Rate limit'));
        return next();
      }
      if (count > maxRequests) {
        return errorResponse(res, errors.tooManyRequests(customMessage));
      }
    } catch {
      if (!failOpen) {
        return errorResponse(res, errors.serviceUnavailable('Rate limit'));
      }
    }
    next();
  };
}

export const mfaVerifyLimiter = mfaLimiterByUserId(
  'rl:mfa:verify',
  5,
  60,
  false, // FAIL-CLOSED — if Redis is down, deny MFA attempts rather than bypass rate limiting
  'Too many MFA attempts. Please wait before trying again.',
);

export const mfaSetupLimiter = mfaLimiterByUserId(
  'rl:mfa:setup',
  3,
  3600,
  false,
  'Too many MFA setup attempts. Please wait before trying again.',
);

// Email verify request: 5 per hour per user — prevents email bombing attacks
// HIGH FIX (AUTH-EMAIL-001): Add dedicated rate limiter for email verification requests.
// Previously relied only on otpLimiter (10/15min per IP), but since this endpoint
// requires authentication, rate limiting should be per-user to prevent authenticated
// email bombing. An attacker with a stolen token could otherwise flood arbitrary
// email addresses with verification emails.
export const emailVerifyLimiter = mfaLimiterByUserId(
  'rl:email:verify',
  5,
  3600,
  false,
  'Too many email verification requests. Please wait before trying again.',
);
