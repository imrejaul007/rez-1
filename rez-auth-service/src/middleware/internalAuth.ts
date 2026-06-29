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
 * IP allowlisting (CD-XS-18):
 *   ALLOWED_INTERNAL_IPS env var — comma-separated IPs or CIDRs (e.g. "10.0.0.0/8,172.16.0.0/12").
 *   If not set, IP check is skipped (backward compatible). If set, requests from IPs
 *   outside the allowlist are rejected. For K8s deployments, the pod IP should be
 *   added to this list. In production, this is best enforced at the network layer
 *   (Kubernetes NetworkPolicy or cloud security groups) — the application-level check
 *   here is defense-in-depth.
 *
 * SECURITY FIX (AUTH-IPWARN-001): Added startup warning when ALLOWED_INTERNAL_IPS
 * is not set in production environments. This encourages proper configuration.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger';
import { errorResponse, errors } from '../utils/response';

/** Augmented Express Request with user set by internal auth middleware */
declare module 'express' {
  interface Request {
    user?: {
      sub?: string;
      [key: string]: unknown;
    };
  }
}

let _ipAllowlistCache: string[] | null = null;

/**
 * Parse ALLOWED_INTERNAL_IPS env var into an array of IPs/CIDRs.
 * Cached after first call.
 * SECURITY FIX (AUTH-IPWARN-001): Logs warning in production if not configured.
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

  // Warn in production if IP allowlist is not configured
  if (_ipAllowlistCache.length === 0 && process.env.NODE_ENV === 'production') {
    logger.warn('[INTERNAL_AUTH] SECURITY WARNING: ALLOWED_INTERNAL_IPS not configured. ' +
      'Internal endpoints will accept requests from any IP. ' +
      'Configure ALLOWED_INTERNAL_IPS for production deployments.');
  }

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
 * Check if a given IP is in a private range.
 */
function isPrivateIp(ip: string): boolean {
  const normalized = ip.replace(/^::ffff:/, '');
  if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/.test(normalized)) return true;
  if (normalized === '::1' || normalized === 'fe80:' || normalized.startsWith('fc') || normalized.startsWith('fd'))
    return true;
  return false;
}

/**
 * Extract the caller's real IP from the request.
 * Prefers X-Forwarded-For (for proxied calls), then req.ip, then remoteAddress.
 */
function getCallerIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'] as string | undefined;
  if (forwarded) {
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
    if (parts.length > 0) {
      return parts[parts.length - 1].replace(/^::ffff:/, '');
    }
  }
  // req.ip and req.socket.remoteAddress are Express properties; include them
  // in the type via a narrow intersection to avoid `as any`.
  const reqWithIp = req as Request & { ip?: string; socket?: { remoteAddress?: string } };
  return reqWithIp.ip || reqWithIp.socket?.remoteAddress || null;
}

/**
 * CD-XS-18 FIX: Verify the caller's IP is in the allowlist.
 *
 * SECURITY FIX (AUTH-IPWARN-002): In production, require IP allowlist to be configured.
 * Previously returned true when not configured (allow all IPs).
 */
function checkIpAllowlist(req: Request): boolean {
  const allowlist = getIpAllowlist();

  // In production, require IP allowlist to be configured
  if (allowlist.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      logger.error('[INTERNAL_AUTH] FATAL: ALLOWED_INTERNAL_IPS not configured in production. Rejecting request.');
      return false;
    }
    // In non-production, allow all IPs (backward compatible for development)
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
  try {
    const raw = process.env.INTERNAL_SERVICE_TOKENS_JSON;
    const parsed = raw ? JSON.parse(raw) as Record<string, string> : {};
    return Object.keys(parsed).length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function requireInternalToken(req: Request, res: Response, next: NextFunction): void {
  // CD-XS-18 FIX: IP allowlist check — defense-in-depth.
  // Best enforced at the network layer (K8s NetworkPolicy / cloud SG), but this
  // app-level check prevents accidental exposure if the token leaks.
  if (!checkIpAllowlist(req)) {
    return errorResponse(res, errors.ipNotAllowed());
  }

  const token = req.headers['x-internal-token'] as string;
  const callerService = req.headers['x-internal-service'] as string | undefined;
  const scopedTokens = resolveScopedTokens();
  const legacyToken = process.env.INTERNAL_SERVICE_TOKEN;

  if (!scopedTokens && !legacyToken) {
    return errorResponse(res, errors.authServiceUnavailable({ message: 'Internal auth not configured — set INTERNAL_SERVICE_TOKENS_JSON or INTERNAL_SERVICE_TOKEN' }));
  }

  let isValid = false;

  if (!token) {
    return errorResponse(res, errors.authTokenInvalid());
  }

  const tokenBuf = Buffer.from(token);

  if (scopedTokens && callerService) {
    const expected = scopedTokens[callerService];
    if (expected && tokenBuf.length > 0) {
      const expectedBuf = Buffer.from(expected);
      if (tokenBuf.length === expectedBuf.length) {
        try {
          isValid = crypto.timingSafeEqual(tokenBuf, expectedBuf);
        } catch {
          isValid = false;
        }
      }
    }
  }

  // Legacy fallback: single shared token
  if (!isValid && legacyToken && tokenBuf.length > 0) {
    const legacyBuf = Buffer.from(legacyToken);
    if (tokenBuf.length === legacyBuf.length) {
      try {
        isValid = crypto.timingSafeEqual(tokenBuf, legacyBuf);
      } catch {
        isValid = false;
      }
    }
  }

  if (!isValid) {
    return errorResponse(res, errors.authTokenInvalid());
  }

  next();
}
