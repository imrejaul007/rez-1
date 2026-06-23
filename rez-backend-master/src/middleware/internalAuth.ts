/**
 * internalAuth.ts — Service-to-service authentication middleware
 *
 * Validates that requests to internal-only routes came from a trusted
 * gateway or sibling service, not from the public internet.
 *
 * Usage:
 *   router.post('/internal/some-route', requireInternalToken, handler);
 *
 * Supports two token modes (checked in order):
 *   1. Scoped: INTERNAL_SERVICE_TOKENS_JSON — per-service tokens identified by
 *      the x-internal-service header. Limits blast radius if one service token leaks.
 *   2. Legacy: INTERNAL_SERVICE_TOKEN — single shared secret (backward compatible).
 *
 * IP allowlisting (ROUTE-SEC-001):
 *   ALLOWED_INTERNAL_IPS env var — comma-separated IPs or CIDRs (e.g. "10.0.0.0/8,172.16.0.0/12").
 *   If not set, IP check is skipped (backward compatible). If set, requests from IPs
 *   outside the allowlist are rejected. For K8s deployments, the pod IP should be
 *   added to this list. In production, this is best enforced at the network layer
 *   (Kubernetes NetworkPolicy or cloud security groups) — the application-level check
 *   here is defense-in-depth.
 *
 * In production, at least one token mode must be configured or the route returns 503.
 * In development, if neither is set the middleware warns and allows through.
 */

import * as crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

let _scopedTokensCache: Record<string, string> | null | undefined;
let _ipAllowlistCache: string[] | null = null;

/**
 * Parse ALLOWED_INTERNAL_IPS env var into an array of IPs/CIDRs.
 * Cached after first call.
 */
function getIpAllowlist(): string[] {
  if (_ipAllowlistCache !== null) return _ipAllowlistCache;
  const raw = process.env.ALLOWED_INTERNAL_IPS;
  _ipAllowlistCache = raw
    ? raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return _ipAllowlistCache;
}

/**
 * Check if a given IP is within a CIDR range or matches an exact IP.
 */
function ipInRange(ip: string, cidr: string): boolean {
  if (!cidr.includes('/')) return ip === cidr;
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);
  const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
  const rangeNum = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Extract the caller's real IP from the request.
 * Prefers X-Forwarded-For (for proxied calls), then req.ip, then remoteAddress.
 */
function isPrivateIp(ip: string): boolean {
  const normalized = ip.replace(/^::ffff:/, '');
  // IPv4 private ranges
  if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(normalized)) return true;
  // IPv6 private/local
  if (normalized === '::1' || normalized === 'fe80:' || normalized.startsWith('fc') || normalized.startsWith('fd'))
    return true;
  return false;
}

function getCallerIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'] as string | undefined;
  if (forwarded) {
    // Take the rightmost non-private IP — this is the most trustworthy as it was added
    // by the innermost trusted proxy (or load balancer). Attacker-controlled XFF values
    // appear at the left (client) position.
    const parts = forwarded
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = parts[i].replace(/^::ffff:/, '');
      if (!isPrivateIp(candidate)) {
        return candidate;
      }
    }
    // All IPs are private — fall back to rightmost (trust LB)
    if (parts.length > 0) {
      return parts[parts.length - 1].replace(/^::ffff:/, '');
    }
  }
  return (req as any).ip || (req as any).socket?.remoteAddress || null;
}

/**
 * ROUTE-SEC-001 FIX: Verify the caller's IP is in the allowlist.
 * Skip check if ALLOWED_INTERNAL_IPS is not set (backward compatible).
 * Returns true if IP is allowed or if no allowlist is configured.
 */
function checkIpAllowlist(req: Request): boolean {
  const allowlist = getIpAllowlist();
  // SECURITY: in production, an empty allowlist must FAIL CLOSED. Previously
  // it returned true (silently allowing everyone) when ALLOWED_INTERNAL_IPS
  // was unset — a misconfigured production deploy would expose every internal
  // route to any caller who could guess the service token.
  if (allowlist.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[INTERNAL_AUTH] FATAL: ALLOWED_INTERNAL_IPS not set in production — refusing request', { path: req.path });
      return false;
    }
    return true;
  }

  const callerIp = getCallerIp(req);
  if (!callerIp) {
    logger.warn('[INTERNAL_AUTH] Could not determine caller IP for allowlist check', {
      path: req.path,
      forwarded: req.headers['x-forwarded-for'],
    });
    return false;
  }

  // Strip IPv6 prefix for comparison if present
  const normalizedIp = callerIp.replace(/^::ffff:/, '');
  const allowed = allowlist.some((cidr) => ipInRange(normalizedIp, cidr));
  if (!allowed) {
    logger.warn('[INTERNAL_AUTH] Caller IP not in allowlist', {
      path: req.path,
      callerIp: normalizedIp,
      allowlist,
    });
  }
  return allowed;
}

function resolveScopedTokens(): Record<string, string> | null {
  if (_scopedTokensCache !== undefined) return _scopedTokensCache;
  try {
    const raw = process.env.INTERNAL_SERVICE_TOKENS_JSON;
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    _scopedTokensCache = Object.keys(parsed).length > 0 ? parsed : null;
  } catch {
    _scopedTokensCache = null;
  }
  return _scopedTokensCache;
}

// BAK-CROSS-019 FIX: Wrap crypto.timingSafeEqual in try/catch.
// crypto.timingSafeEqual throws TypeError if buffers differ in length — we want
// a safe false return instead of an unhandled exception.
// Additionally, reject empty strings at the call site so this function always returns false
// for empty input (defense-in-depth).
function timingSafeCompare(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function requireInternalToken(req: Request, res: Response, next: NextFunction): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const scopedTokens = resolveScopedTokens();
  const legacyToken = process.env.INTERNAL_SERVICE_TOKEN;

  // ROUTE-SEC-001 FIX: IP allowlist check — defense-in-depth.
  // Best enforced at the network layer (K8s NetworkPolicy / cloud SG), but this
  // app-level check prevents accidental exposure if the token leaks.
  if (!checkIpAllowlist(req)) {
    res.status(403).json({ success: false, message: 'Caller IP not in allowlist' });
    return;
  }

  // Ensure at least one auth mode is configured
  if (!scopedTokens && !legacyToken) {
    if (isProduction) {
      logger.error('[INTERNAL_AUTH] No internal auth configured — blocking route', {
        path: req.path,
        ip: req.ip,
      });
      res.status(503).json({ success: false, message: 'Internal route unavailable' });
      return;
    }
    logger.error(
      '[INTERNAL_AUTH] No internal auth configured — blocking route (INTERNAL_SERVICE_TOKEN or INTERNAL_SERVICE_TOKENS_JSON must be set)',
      { path: req.path },
    );
    res.status(500).json({ error: 'Internal token not configured' });
    return;
  }

  const requestToken = req.headers['x-internal-token'] as string | undefined;
  const callerService = req.headers['x-internal-service'] as string | undefined;

  if (!requestToken) {
    logger.warn('[INTERNAL_AUTH] Missing internal token', { path: req.path, ip: req.ip });
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (scopedTokens) {
    // Scoped mode: x-internal-service header is REQUIRED when scoped tokens are configured.
    // Without this enforcement, a caller can omit the header and fall through to the
    // legacy token, completely bypassing per-service isolation.
    if (!callerService) {
      logger.warn('[INTERNAL_AUTH] x-internal-service header required with scoped tokens', {
        path: req.path,
        ip: req.ip,
      });
      res.status(401).json({ success: false, message: 'Unauthorized — x-internal-service header required' });
      return;
    }

    const expected = scopedTokens[callerService];
    if (expected && timingSafeCompare(requestToken, expected)) {
      next();
      return;
    }

    logger.warn('[INTERNAL_AUTH] Scoped token mismatch', {
      path: req.path,
      ip: req.ip,
      callerService,
    });
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  // Legacy mode: only used when INTERNAL_SERVICE_TOKENS_JSON is NOT configured
  if (legacyToken && timingSafeCompare(requestToken, legacyToken)) {
    next();
    return;
  }

  logger.warn('[INTERNAL_AUTH] Invalid internal token', {
    path: req.path,
    ip: req.ip,
  });
  res.status(401).json({ success: false, message: 'Unauthorized' });
}
