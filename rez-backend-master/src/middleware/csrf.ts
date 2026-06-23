import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger';

/**
 * CSRF Protection Middleware
 *
 * This middleware implements Double Submit Cookie pattern for CSRF protection.
 * It generates and validates CSRF tokens to protect against Cross-Site Request Forgery attacks.
 *
 * How it works:
 * 1. Server generates a random CSRF token and sends it to the client in a cookie
 * 2. Client must include this token in a custom header for state-changing requests
 * 3. Server validates that the cookie token matches the header token
 *
 * Security Features:
 * - Cryptographically secure random token generation
 * - HttpOnly cookie to prevent XSS attacks from reading the token
 * - SameSite=Strict cookie to prevent CSRF via browser
 * - JWT-based API clients are automatically exempted (JWT is CSRF-resistant)
 * - Safe methods (GET, HEAD, OPTIONS) are exempted
 * - Comprehensive logging for security monitoring
 */

// Configuration
const CSRF_TOKEN_LENGTH = 32; // 256 bits of randomness
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_MAX_AGE = 60 * 60 * 1000; // 1 hour

// List of safe HTTP methods that don't require CSRF protection
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// List of paths that should be exempted from CSRF protection
const CSRF_EXEMPT_PATHS = [
  '/health',
  '/test',
  '/api-info',
  '/api-docs',
  '/api-docs.json',
  '/api/webhooks', // Webhooks use signature verification instead
  '/api/razorpay/webhook', // Payment webhooks
  '/api/stripe/webhook', // Payment webhooks
];

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Verify that two tokens match using constant-time comparison
 * This prevents timing attacks that could leak information about the token
 */
function verifyToken(token1: string, token2: string): boolean {
  if (!token1 || !token2 || token1.length !== token2.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(token1, 'utf-8'),
      Buffer.from(token2, 'utf-8')
    );
  } catch (error) {
    return false;
  }
}

/**
 * Check if the request should be exempted from CSRF protection
 */
function shouldExemptFromCsrf(req: Request): boolean {
  const method = req.method.toUpperCase();
  const path = req.path;

  // Exempt safe methods
  if (SAFE_METHODS.includes(method)) {
    return true;
  }

  // Exempt specific paths
  if (CSRF_EXEMPT_PATHS.some(exemptPath => path.startsWith(exemptPath))) {
    return true;
  }

  // Exempt requests with valid JWT (API clients)
  // JWT tokens are CSRF-resistant because they're not automatically sent by browsers
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return true;
  }

  return false;
}

/**
 * Middleware to generate and set CSRF token in cookie
 * This should be applied globally to ensure all responses include a CSRF token
 */
export function setCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // JWT is CSRF-resistant — skip token generation for authenticated API requests
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  try {
    // Check if CSRF token cookie already exists
    let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];

    // Generate new token if none exists or if it's invalid
    if (!csrfToken || csrfToken.length !== CSRF_TOKEN_LENGTH * 2) {
      csrfToken = generateCsrfToken();

      // Set CSRF token in cookie
      res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: true, // Prevent XSS attacks from reading the cookie
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'strict', // Prevent CSRF via browser
        maxAge: CSRF_COOKIE_MAX_AGE,
        path: '/'
      });

      logger.debug('Generated new CSRF token', {
        path: req.path,
        method: req.method
      });
    }

    // Also set token in response header for easy access by clients
    res.setHeader(CSRF_HEADER_NAME, csrfToken);

    next();
  } catch (error: any) {
    logger.error('Error setting CSRF token', {
      error: error.message,
      path: req.path,
      method: req.method
    });
    next(error);
  }
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * This should be applied to routes that modify data (POST, PUT, DELETE, PATCH)
 */
export function validateCsrfToken(req: Request, res: Response, next: NextFunction): void {
  try {
    // Check if request should be exempted
    if (shouldExemptFromCsrf(req)) {
      logger.debug('Request exempted from CSRF protection', {
        path: req.path,
        method: req.method,
        hasJWT: !!req.headers.authorization
      });
      return next();
    }

    // Get CSRF token from cookie
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];

    // Get CSRF token from header
    const headerToken = req.headers[CSRF_HEADER_NAME] as string;

    // Check if both tokens exist
    if (!cookieToken) {
      logger.warn('CSRF validation failed: No token in cookie', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(403).json({
        success: false,
        message: 'CSRF token missing. Please refresh the page and try again.',
        code: 'CSRF_TOKEN_MISSING'
      });
      return;
    }

    if (!headerToken) {
      logger.warn('CSRF validation failed: No token in header', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(403).json({
        success: false,
        message: 'CSRF token not provided in request header.',
        code: 'CSRF_TOKEN_NOT_PROVIDED'
      });
      return;
    }

    // Verify tokens match using constant-time comparison
    if (!verifyToken(cookieToken, headerToken)) {
      logger.warn('CSRF validation failed: Token mismatch', {
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        cookieTokenLength: cookieToken?.length || 0,
        headerTokenLength: headerToken?.length || 0
      });

      res.status(403).json({
        success: false,
        message: 'CSRF token validation failed. Please refresh the page and try again.',
        code: 'CSRF_TOKEN_INVALID'
      });
      return;
    }

    // Token is valid
    logger.debug('CSRF token validated successfully', {
      path: req.path,
      method: req.method
    });

    next();
  } catch (error: any) {
    logger.error('Error validating CSRF token', {
      error: error.message,
      path: req.path,
      method: req.method
    });

    res.status(500).json({
      success: false,
      message: 'Error validating CSRF token',
      code: 'CSRF_VALIDATION_ERROR'
    });
    return;
  }
}

/**
 * Combined middleware that both sets and validates CSRF tokens
 * Use this for routes that need both functionalities
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  setCsrfToken(req, res, (err) => {
    if (err) return next(err);
    validateCsrfToken(req, res, next);
  });
}

/**
 * Middleware to validate CSRF for specific routes
 * This is an alias for validateCsrfToken for better readability
 */
export const requireCsrfToken = validateCsrfToken;

/**
 * Extract CSRF token from request (for debugging/logging purposes)
 */
export function getCsrfToken(req: Request): { cookie?: string; header?: string } {
  return {
    cookie: req.cookies?.[CSRF_COOKIE_NAME],
    header: req.headers[CSRF_HEADER_NAME] as string
  };
}

/**
 * Check if a request has a valid CSRF token (without throwing errors)
 */
export function hasCsrfToken(req: Request): boolean {
  if (shouldExemptFromCsrf(req)) {
    return true;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  if (!cookieToken || !headerToken) {
    return false;
  }

  return verifyToken(cookieToken, headerToken);
}

// Export constants for testing and documentation
export const CSRF_CONFIG = {
  TOKEN_LENGTH: CSRF_TOKEN_LENGTH,
  COOKIE_NAME: CSRF_COOKIE_NAME,
  HEADER_NAME: CSRF_HEADER_NAME,
  COOKIE_MAX_AGE: CSRF_COOKIE_MAX_AGE,
  SAFE_METHODS,
  EXEMPT_PATHS: CSRF_EXEMPT_PATHS
};
