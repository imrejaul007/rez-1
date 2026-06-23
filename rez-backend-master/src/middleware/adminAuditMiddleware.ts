import { Request, Response, NextFunction } from 'express';
import { AdminAuditLog } from '../models/AdminAuditLog';
import { logger } from '../config/logger';

/**
 * Sensitive fields to strip from request bodies before logging.
 * Prevents passwords, tokens, and secrets from appearing in audit logs.
 */
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'secret',
  'otp',
  'pin',
  'cvv',
  'cardNumber',
  'authorization',
  'apiKey',
  'privateKey',
  'creditCard',
]);

/**
 * Sanitize request body by removing sensitive fields (shallow + one level deep).
 */
function sanitizeBody(body: any): Record<string, any> | undefined {
  if (!body || typeof body !== 'object') return undefined;

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(body)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // One level deep sanitization
      const nested: Record<string, any> = {};
      for (const [nk, nv] of Object.entries(value as Record<string, any>)) {
        nested[nk] = SENSITIVE_FIELDS.has(nk.toLowerCase()) ? '[REDACTED]' : nv;
      }
      sanitized[key] = nested;
    } else {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Extract a target ID from route params.
 * Looks for common param names: id, merchantId, userId, storeId, campaignId, etc.
 */
function extractTargetId(params: Record<string, any>): string | undefined {
  if (!params) return undefined;

  // Priority order for param names
  const paramPriority = [
    'id',
    'merchantId',
    'userId',
    'storeId',
    'campaignId',
    'orderId',
    'giftCardId',
    'configId',
    'achievementId',
    'tournamentId',
    'eventId',
    'voucherId',
    'couponId',
    'walletId',
    'actionId',
  ];

  for (const name of paramPriority) {
    if (params[name]) return String(params[name]);
  }

  // Fallback: return the first param value that looks like an ID
  const values = Object.values(params);
  if (values.length > 0) return String(values[0]);

  return undefined;
}

/**
 * Infer target type from the request path.
 * Extracts the resource segment from admin routes like /api/admin/merchants/:id
 */
function inferTargetType(path: string): string | undefined {
  // Match /api/admin/<resource-type> pattern
  const match = path.match(/\/api\/admin\/([a-z-]+)/i);
  if (!match) return undefined;

  // Convert kebab-case to readable type: "merchant-wallets" -> "merchant-wallet"
  const segment = match[1];

  // Map common plural segments to singular
  const typeMap: Record<string, string> = {
    'merchants': 'merchant',
    'users': 'user',
    'orders': 'order',
    'stores': 'store',
    'campaigns': 'campaign',
    'categories': 'category',
    'vouchers': 'voucher',
    'coupons': 'coupon',
    'events': 'event',
    'offers': 'offer',
    'experiences': 'experience',
    'achievements': 'achievement',
    'tournaments': 'tournament',
    'challenges': 'challenge',
    'uploads': 'upload',
    'gift-cards': 'gift-card',
    'coin-gifts': 'coin-gift',
    'coin-drops': 'coin-drop',
    'coin-rewards': 'coin-reward',
    'merchant-wallets': 'merchant-wallet',
    'user-wallets': 'user-wallet',
    'surprise-coin-drops': 'surprise-coin-drop',
    'feature-flags': 'feature-flag',
    'quick-actions': 'quick-action',
    'value-cards': 'value-card',
    'special-programs': 'special-program',
    'event-categories': 'event-category',
    'event-rewards': 'event-reward',
    'homepage-deals': 'homepage-deal',
    'zone-verifications': 'zone-verification',
    'double-campaigns': 'double-campaign',
    'bonus-zone': 'bonus-campaign',
    'learning-content': 'learning-content',
    'daily-checkin-config': 'daily-checkin-config',
    'engagement-config': 'engagement-config',
    'wallet-config': 'wallet-config',
    'game-config': 'game-config',
    'leaderboard': 'leaderboard-config',
    'gamification-stats': 'gamification-stats',
    'explore': 'explore',
    'creators': 'creator',
    'dashboard': 'dashboard',
    'wallet': 'wallet',
    'loyalty': 'loyalty',
    'travel': 'travel',
    'system': 'system',
  };

  return typeMap[segment] || segment;
}

/** Mutation HTTP methods we want to audit */
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Admin Audit Middleware
 *
 * Intercepts mutation responses (POST/PUT/PATCH/DELETE) on admin routes
 * and asynchronously logs them to AdminAuditLog.
 *
 * - Does NOT block the response (fire-and-forget logging)
 * - Only logs mutations, skips GET/HEAD/OPTIONS
 * - Captures sanitized request body (strips passwords, tokens, etc.)
 * - Extracts target ID from route params
 * - Infers target type from route path
 */
export function adminAuditMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only audit mutation methods
  if (!MUTATION_METHODS.has(req.method)) {
    return next();
  }

  // Wrap res.json to capture response data
  const originalJson = res.json.bind(res);
  let logged = false;

  res.json = function (data: any) {
    // Fire-and-forget audit log — don't await, don't block
    if (!logged) {
      logged = true;

      const isSuccess = data?.success === true;
      const adminId = (req as any).userId;

      if (adminId) {
        // Construct the action string using the route pattern when available
        const routePath = req.route?.path
          ? `${req.baseUrl}${req.route.path}`
          : req.originalUrl.split('?')[0]; // fallback to actual path without query

        const action = `${req.method} ${routePath}`;

        // Async fire-and-forget
        setImmediate(() => {
          AdminAuditLog.create({
            adminId,
            action,
            method: req.method,
            path: req.originalUrl.split('?')[0],
            targetId: extractTargetId(req.params),
            targetType: inferTargetType(req.originalUrl),
            ip: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
            requestBody: sanitizeBody(req.body),
            responseSuccess: isSuccess,
            responseStatus: res.statusCode,
            timestamp: new Date(),
          }).catch((err: Error) => {
            logger.error('[ADMIN_AUDIT] Failed to write audit log:', err.message);
          });
        });
      }
    }

    return originalJson(data);
  };

  next();
}

export default adminAuditMiddleware;
