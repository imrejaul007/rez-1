/**
 * Auth Middleware Re-exports
 *
 * Provides unified import paths for auth middleware across the gateway.
 */

export {
  requireUser,
  requireMerchant,
  requireAdmin,
  applySecurityHeaders,
  rateLimitMiddleware,
  type AuthenticatedRequest,
  type RateLimitOptions,
} from '../shared/authMiddleware';

// Aliases for backwards compatibility with routes
import {
  requireUser,
  requireMerchant,
  requireAdmin,
  type AuthenticatedRequest as BaseAuthenticatedRequest,
} from '../shared/authMiddleware';

/**
 * Alias for requireUser - verifies user JWT
 */
export const requireAuth = requireUser;

/**
 * Alias for requireMerchant - verifies merchant JWT
 */
export const requireMerchantAuth = requireMerchant;

/**
 * Alias for requireAdmin - verifies admin JWT
 */
export const requireAdminAuth = requireAdmin;

/**
 * Re-export AuthenticatedRequest type
 */
export type { BaseAuthenticatedRequest as AuthenticatedRequest };
