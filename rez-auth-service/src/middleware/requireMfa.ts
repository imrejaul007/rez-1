import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { redis } from '../config/redis';
import { MfaConfig } from '../models/MfaConfig';
import { createServiceLogger } from '../config/logger';
import jwt from 'jsonwebtoken';
import { errorResponse, errors } from '../utils/response';

const logger = createServiceLogger('mfa-middleware');

// Redis key prefix for MFA verification sessions
const MFA_VERIFIED_PREFIX = 'mfa:verified:';

/**
 * Mark a session as MFA verified (call after successful MFA verification)
 * @param sessionId - Unique session identifier (from token or request)
 * @param userId - User ID
 * @param ttlSeconds - How long the MFA verification should be valid (default: 5 minutes)
 */
export async function markMfaVerified(sessionId: string, userId: string, ttlSeconds = 300): Promise<void> {
  const key = `${MFA_VERIFIED_PREFIX}${userId}:${sessionId}`;
  await redis.set(key, '1', 'EX', ttlSeconds);
}

/**
 * Check if a session is MFA verified
 * @param sessionId - Unique session identifier
 * @param userId - User ID
 */
export async function isMfaVerified(sessionId: string, userId: string): Promise<boolean> {
  const key = `${MFA_VERIFIED_PREFIX}${userId}:${sessionId}`;
  const result = await redis.exists(key);
  return result === 1;
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: string;
    mfaVerified?: boolean;
  };
}

/**
 * Middleware: Require MFA for sensitive operations
 *
 * SECURITY FIX (AUTH-MFA-002): Server-side MFA verification state storage.
 * Previously trusted x-mfa-verified header which could be injected by attackers.
 * Now uses Redis to track MFA verification per session.
 *
 * Checks if user has MFA enabled.
 * If enabled:
 *   - Checks Redis for verified session
 *   - Returns 403 with { requiresMfa: true } if not verified
 * If not enabled:
 *   - Allows request to proceed
 */
export async function requireMfa(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    // Extract user from JWT token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return errorResponse(res, errors.authTokenMissing());
    }

    const secret = process.env.JWT_SECRET || process.env.JWT_ADMIN_SECRET;
    if (!secret) {
      return errorResponse(res, errors.serviceUnavailable('Authentication'));
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch (err: any) {
      return errorResponse(res, errors.authTokenInvalid());
    }

    const userId = decoded.userId;
    req.user = {
      userId,
      role: decoded.role,
    };

    // Check if MFA is enabled for this user
    const mfaConfig = await MfaConfig.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isEnabled: true,
    });

    // If MFA not enabled, allow request
    if (!mfaConfig) {
      next();
      return;
    }

    // SECURITY FIX: Use session-based verification from Redis instead of trusting header
    const sessionId = decoded.jti || decoded.sid || userId; // Use jti/sid from token, fallback to userId
    const verified = await isMfaVerified(sessionId, userId);

    if (verified) {
      req.user.mfaVerified = true;
      next();
      return;
    }

    // MFA enabled but not verified — return 403
    logger.info('MFA required but not verified', { userId, role: decoded.role });
    return errorResponse(res, errors.authInsufficientPermissions({
      requiresMfa: true,
      message: 'Multi-factor authentication required. Please verify with your authenticator app or backup code',
    }));
  } catch (err: any) {
    logger.error('MFA middleware error', { error: err.message });
    return errorResponse(res, errors.internalError());
  }
}

/**
 * Optional: Enforce MFA for specific roles (admin, merchant)
 * Use this to require MFA setup for high-privilege users
 *
 * SECURITY FIX (AUTH-MFA-002): Server-side MFA verification state storage.
 */
export async function enforceAdminMfa(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return errorResponse(res, errors.authTokenMissing());
    }

    const secret = process.env.JWT_SECRET || process.env.JWT_ADMIN_SECRET;
    if (!secret) {
      return errorResponse(res, errors.serviceUnavailable('Authentication'));
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    } catch (err: any) {
      return errorResponse(res, errors.authTokenInvalid());
    }

    const role = decoded.role;
    const isAdminRole = ['admin', 'super_admin', 'operator', 'support'].includes(role);
    const isMerchantRole = role === 'merchant';

    // Only admin and merchant roles require MFA
    if (!isAdminRole && !isMerchantRole) {
      next();
      return;
    }

    const userId = decoded.userId;
    req.user = {
      userId,
      role,
    };

    // Check if MFA is enabled for this admin/merchant user
    const mfaConfig = await MfaConfig.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isEnabled: true,
    });

    if (!mfaConfig) {
      logger.warn('Admin/merchant user without MFA enabled', { userId, role });
      return errorResponse(res, errors.authInsufficientPermissions({
        requiresMfaSetup: true,
        message: 'Multi-factor authentication is required for your account. Please set up MFA by calling POST /auth/mfa/setup',
      }));
    }

    // SECURITY FIX: Use session-based verification from Redis instead of trusting header
    const sessionId = decoded.jti || decoded.sid || userId;
    const verified = await isMfaVerified(sessionId, userId);

    if (!verified) {
      logger.info('Admin MFA required but not verified', { userId, role });
      return errorResponse(res, errors.authInsufficientPermissions({
        requiresMfa: true,
        message: 'Multi-factor authentication required. Please verify with your authenticator app or backup code',
      }));
    }

    req.user.mfaVerified = true;
    next();
  } catch (err: any) {
    logger.error('Admin MFA enforcement error', { error: err.message });
    return errorResponse(res, errors.internalError());
  }
}
