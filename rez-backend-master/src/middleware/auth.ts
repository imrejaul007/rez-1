import jwt, { SignOptions } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import redisService from '../services/redisService';
import { logger } from '../config/logger';
import * as deviceFingerprintService from '../services/deviceFingerprintService';

/** Device risk levels from fingerprint service */
export type DeviceRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Extended Request with device risk information */
export interface AuthenticatedDeviceRequest extends Request {
  deviceRisk?: DeviceRiskLevel;
  deviceHash?: string;
}

// Token blacklist helpers (Redis-backed)
const TOKEN_BLACKLIST_PREFIX = 'blacklist:token:';

export async function blacklistToken(token: string, ttlSeconds: number): Promise<void> {
  try {
    await redisService.set(`${TOKEN_BLACKLIST_PREFIX}${token}`, '1', ttlSeconds);
  } catch {
    logger.error('[AUTH] Failed to blacklist token (Redis unavailable)');
  }
}

export async function isTokenBlacklisted(token: string, failClosed = false): Promise<boolean> {
  try {
    if (!redisService.isReady()) {
      logger.warn(`[AUTH] Redis unavailable for blacklist check — failing ${failClosed ? 'closed' : 'open'}`);
      return failClosed;
    }
    return await redisService.exists(`${TOKEN_BLACKLIST_PREFIX}${token}`);
  } catch {
    logger.warn(`[AUTH] Redis error during blacklist check — failing ${failClosed ? 'closed' : 'open'}`);
    return failClosed;
  }
}

// JWT payload interface
interface JWTPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

// Admin roles that use the separate admin JWT secret
const ADMIN_ROLES = ['admin', 'super_admin', 'operator', 'support'];

// Get the appropriate JWT secret based on role
const getJwtSecret = (role: string): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }

  if (ADMIN_ROLES.includes(role) && process.env.JWT_ADMIN_SECRET) {
    if (process.env.JWT_ADMIN_SECRET.length < 32) {
      throw new Error('JWT_ADMIN_SECRET must be at least 32 characters long for security');
    }
    return process.env.JWT_ADMIN_SECRET;
  }

  return process.env.JWT_SECRET;
};

// Generate JWT token
export const generateToken = (userId: string, role: string = 'user'): string => {
  const payload = { userId, role };
  const secret = getJwtSecret(role);
  const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as string;
  const options: SignOptions = { expiresIn };

  return jwt.sign(payload, secret, options);
};

// Generate refresh token
export const generateRefreshToken = (userId: string): string => {
  const payload = { userId };

  // Validate refresh secret exists and is strong
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }
  if (process.env.JWT_REFRESH_SECRET.length < 32) {
    throw new Error('JWT_REFRESH_SECRET must be at least 32 characters long for security');
  }

  const secret = process.env.JWT_REFRESH_SECRET;
  const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as string;
  const options: SignOptions = { expiresIn };

  return jwt.sign(payload, secret, options);
};

// Verify JWT token — tries admin secret first if available, then falls back to user secret
export const verifyToken = (token: string): JWTPayload => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  // If admin secret is configured, try it first (admin tokens are signed with it)
  if (process.env.JWT_ADMIN_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET, { algorithms: ['HS256'] }) as JWTPayload;
      if (ADMIN_ROLES.includes(decoded.role)) {
        return decoded;
      }
    } catch {
      // Not an admin token — fall through to user secret
    }
  }

  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] }) as JWTPayload;
};

// Verify refresh token
export const verifyRefreshToken = (token: string): JWTPayload => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET environment variable is required');
  }
  const secret = process.env.JWT_REFRESH_SECRET;
  return jwt.verify(token, secret, { algorithms: ['HS256'] }) as JWTPayload;
};

// Logout all devices for a user — invalidates all existing tokens
const ALL_LOGOUT_PREFIX = 'allLogout:';

export async function logoutAllDevices(userId: string): Promise<void> {
  try {
    // Store the timestamp — any token issued before this time is invalid
    await redisService.set(`${ALL_LOGOUT_PREFIX}${userId}`, Date.now(), 30 * 24 * 60 * 60); // 30d TTL
    logger.info(`[AUTH] Logout-all-devices triggered for user ${userId}`);
  } catch {
    logger.error(`[AUTH] Failed to set logout-all-devices for user ${userId}`);
  }
}

async function isTokenIssuedBeforeLogoutAll(userId: string, iat: number): Promise<boolean> {
  try {
    const logoutTimestamp = await redisService.get<number>(`${ALL_LOGOUT_PREFIX}${userId}`);
    if (logoutTimestamp && iat < Math.floor(logoutTimestamp / 1000)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Extract token from request
const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    logger.info('🔐 [AUTH] Authenticating request:', {
      path: req.path,
      method: req.method,
      hasToken: !!token
    });

    if (!token) {
      logger.warn('⚠️ [AUTH] No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    try {
      // Check if token is blacklisted (e.g. after logout or refresh).
      // SECURITY: fail CLOSED for ALL authenticated routes. If Redis is unavailable
      // and we can't verify the blacklist, a stolen-but-revoked token would be
      // accepted. Always fail closed for sensitive operations.
      if (await isTokenBlacklisted(token, true)) {
        return res.status(401).json({ success: false, message: 'Token has been revoked' });
      }

      const decoded = verifyToken(token);

      // Check if user triggered logout-all-devices after this token was issued
      if (await isTokenIssuedBeforeLogoutAll(decoded.userId, decoded.iat)) {
        return res.status(401).json({ success: false, message: 'Session invalidated. Please login again.' });
      }

      const user = await User.findById(decoded.userId).select('-auth.refreshToken -auth.otpCode -auth.otpExpiry -__v');

      if (!user) {
        // Phase 22 fix: user created in auth-service but not in the monolith's
        // local DB. This happens because the auth-service is a separate microservice
        // with its own user collection. For dev/local, auto-create a shadow user
        // from the JWT claims so authenticated routes work. In production with a
        // unified user store, this fallback should be removed.
        //
        // SECURITY: hardcode `role: 'user'` regardless of the JWT's `role`
        // claim. Trusting the JWT's role here would allow privilege escalation:
        // an attacker who somehow obtains a JWT with `role: 'admin'` could
        // auto-create a shadow admin in the monolith's DB on first request.
        // Admin / merchant / operator roles MUST be provisioned through the
        // admin service, not claimed by the client.
        //
        // CRITICAL SECURITY FIX: Shadow users are created with `isActive: false`
        // and `auth.lockUntil: new Date()` to ensure the status checks below
        // ALWAYS block access. Without this, deactivated/locked users could
        // bypass security by presenting a valid JWT — the shadow user bypass
        // mechanism would grant access because the checks were never reached
        // (isActive was hardcoded to true).
        const shadowUser = await User.create({
          _id: decoded.userId,
          phone: (decoded as any).phoneNumber || '',
          phoneNumber: (decoded as any).phoneNumber || '',
          role: 'user',
          isActive: false,  // SECURITY: Must be false so status checks block access
          auth: {
            isVerified: false,
            isOnboarded: false,
            loginAttempts: 0,
            lockUntil: new Date(),  // SECURITY: Lock until explicitly activated
          },
          profile: {},
          preferences: {},
        }).catch((err: any) => {
          logger.warn('⚠️ [AUTH] Failed to create shadow user:', err.message, 'code:', err.code, 'name:', err.name);
          return null;
        });
        if (!shadowUser) {
          logger.warn('⚠️ [AUTH] User not found and shadow creation failed:', decoded.userId);
          return res.status(401).json({ success: false, message: 'User not found' });
        }
        // SECURITY: log the requested role (from JWT) so we can detect
        // suspicious activity — a legitimate user should never have an admin
        // role in their JWT if they're not actually admin in the auth-service.
        const requestedRole = decoded.role || 'user';
        if (requestedRole !== 'user') {
          logger.warn('🚨 [AUTH] Shadow user created but JWT requested privileged role', {
            userId: decoded.userId,
            requestedRole,
            provisionedRole: 'user',
          });
        }
        logger.info('✅ [AUTH] Created shadow user for cross-service auth:', decoded.userId);

        // SECURITY FIX: Check account status BEFORE granting access.
        // Shadow users are created with isActive=false and locked to ensure
        // that only users verified in the monolith's own DB can proceed.
        // This prevents deactivated/locked users from accessing the system
        // via JWTs that were valid before deactivation/lock occurred.
        if (!shadowUser.isActive) {
          logger.warn('⚠️ [AUTH] Shadow user account not activated:', shadowUser._id);
          return res.status(401).json({
            success: false,
            message: 'Account requires activation. Please complete registration.'
          });
        }

        if (shadowUser.isAccountLocked()) {
          logger.warn('⚠️ [AUTH] Shadow user account locked:', shadowUser._id);
          return res.status(423).json({
            success: false,
            message: 'Account is temporarily locked. Please try again later.'
          });
        }

        // Attach user to request only after passing all security checks
        req.user = shadowUser;
        req.userId = String(shadowUser._id);

        // Continue past the user checks — shadow user is trusted by virtue of valid JWT
        return next();
      }

      if (!user.isActive) {
        logger.warn('⚠️ [AUTH] Account deactivated:', user._id);
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      if (user.isAccountLocked()) {
        logger.warn('⚠️ [AUTH] Account locked:', user._id);
        return res.status(423).json({
          success: false,
          message: 'Account is temporarily locked. Please try again later.'
        });
      }

      // Attach user to request
      req.user = user;
      req.userId = String(user._id);

      // Device fingerprint check (non-blocking for old app versions without header)
      const deviceHash = req.headers['x-device-fingerprint'] as string | undefined;
      if (deviceHash) {
        try {
          const deviceStatus = await deviceFingerprintService.checkDeviceStatus(deviceHash);
          if (deviceStatus.isBlocked) {
            return res.status(423).json({
              success: false,
              blocked: true,
              message: 'This device has been blocked due to suspicious activity.',
            });
          }
          // Attach risk level for downstream handlers
          const deviceReq = req as AuthenticatedDeviceRequest;
          deviceReq.deviceRisk = deviceStatus.riskLevel;
          deviceReq.deviceHash = deviceHash;

          // Fire-and-forget: register device usage
          const osHeader = req.headers['x-device-os'] as string || '';
          const parts = osHeader.split(' ');
          const platform = parts[0] || 'web';
          const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
          deviceFingerprintService.registerDevice(
            deviceHash, parts.slice(1).join(' ') || '', '', platform, String(user._id), ip
          ).catch((err) => logger.error('[Auth] Device fingerprint registration failed', { error: err.message, userId: user._id }));
        } catch (deviceErr) {
          // Graceful degradation — don't block auth on device service failure
          logger.warn('[AUTH] Device fingerprint check failed, allowing request', { error: (deviceErr as Error).message });
        }
      }

      next();
    } catch (tokenError: any) {
      logger.error('❌ [AUTH] Token verification failed:', {
        error: tokenError.message,
        name: tokenError.name,
        expiredAt: tokenError.expiredAt
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        error: process.env.NODE_ENV === 'development' ? tokenError.message : undefined
      });
    }
  } catch (error: any) {
    logger.error('❌ [AUTH] Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
// SECURITY: For sensitive operations, prefer authenticate() instead.
// This middleware logs all auth bypasses for security monitoring.
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.userId).select('-auth.refreshToken -auth.otpCode -auth.otpExpiry -__v');

        if (user && user.isActive && !user.isAccountLocked()) {
          req.user = user;
          req.userId = String(user._id);
        } else if (user) {
          // User exists but is inactive or locked — log the bypass attempt
          logger.warn(`[AUTH] optionalAuth: authenticated user ${decoded.userId} is ${!user.isActive ? 'inactive' : 'locked'}, proceeding unauthenticated on ${req.method} ${req.path}`);
        }
      } catch (tokenError) {
        // SECURITY: Log ALL invalid token attempts for monitoring
        // (even though we don't fail, we need visibility into abuse attempts)
        logger.warn(`[AUTH] optionalAuth: invalid token on ${req.method} ${req.path}: ${(tokenError as Error).message}`);
      }
    } else {
      // Log when auth is bypassed due to no token (for audit trails)
      logger.debug(`[AUTH] optionalAuth: no token provided, proceeding unauthenticated on ${req.method} ${req.path}`);
    }

    next();
  } catch (error) {
    // SECURITY: Catch-all — log unexpected errors, don't silently swallow
    logger.error(`[AUTH] optionalAuth: unexpected error on ${req.method} ${req.path}:`, error);
    next();
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Admin role hierarchy: support(60) < operator(70) < admin(80) < super_admin(100)
const ADMIN_ROLE_LEVELS: Record<string, number> = {
  support: 60,
  operator: 70,
  admin: 80,
  super_admin: 100,
};

// Check if user has at least the given admin role level
export const requireAdminRole = (minRole: string) => {
  const minLevel = ADMIN_ROLE_LEVELS[minRole] || 0;
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userLevel = ADMIN_ROLE_LEVELS[req.user.role] || 0;
    if (userLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: `Insufficient permissions. Requires ${minRole} role or higher.`
      });
    }

    next();
  };
};

// Check if user is any admin portal role (support or higher)
export const requireAdmin = requireAdminRole('support');

// Check if user is operator or higher (blocks support from write operations)
export const requireOperator = requireAdminRole('operator');

// Check if user is admin or super_admin (for sensitive ops like refunds, user bans, merchant approval)
export const requireSeniorAdmin = requireAdminRole('admin');

// Check if user is super_admin (for destructive ops like deletions, system config)
export const requireSuperAdmin = requireAdminRole('super_admin');

// Check if user is store owner or admin
export const requireStoreOwnerOrAdmin = authorize('store_owner', 'admin', 'super_admin');

// Alias for authenticate (commonly used name)
export const requireAuth = authenticate;

// Alias for authenticate (commonly used in routes)
export const protect = authenticate;