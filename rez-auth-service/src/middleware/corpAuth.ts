/**
 * CorpPerks Auth Middleware
 *
 * Shared middleware for CorpPerks authentication and authorization.
 * Use this in other services that need CorpPerks auth.
 */

import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { logger } from '../config/logger';
import { errorResponse, errors } from '../utils/response';

// CorpPerks roles
export const CORP_ROLES = {
  CORP_ADMIN: 'corp_admin',
  CORP_HR: 'corp_hr',
  CORP_FINANCE: 'corp_finance',
  CORP_MANAGER: 'corp_manager',
  CORP_EMPLOYEE: 'corp_employee',
} as const;

export type CorpRole = typeof CORP_ROLES[keyof typeof CORP_ROLES];

// Admin corp roles that can access admin endpoints
const ADMIN_CORP_ROLES = [CORP_ROLES.CORP_ADMIN, CORP_ROLES.CORP_HR, CORP_ROLES.CORP_FINANCE];

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      companyId?: string;
      corpRole?: string;
    }
  }
}

interface CorpJwtPayload extends JwtPayload {
  userId?: string;
  role?: string;
  companyId?: string;
  corpRole?: string;
}

/**
 * Validate CorpPerks JWT and extract user/company info
 */
export function validateCorpJWT(token: string, secret: string): CorpJwtPayload | null {
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] }) as CorpJwtPayload;
  } catch (err) {
    logger.warn('[CorpAuth] JWT verification failed', { error: err });
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Require CorpPerks authentication
 */
export async function requireCorpAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    return errorResponse(res, errors.authTokenMissing());
  }

  const secret = process.env.JWT_SECRET || process.env.CORP_JWT_SECRET;
  if (!secret) {
    logger.error('[CorpAuth] No JWT secret configured');
    return errorResponse(res, errors.serviceUnavailable('Authentication'));
  }

  const decoded = validateCorpJWT(token, secret);

  if (!decoded || !decoded.userId) {
    return errorResponse(res, errors.authTokenInvalid());
  }

  req.userId = decoded.userId;
  req.userRole = decoded.role;
  req.companyId = decoded.companyId;
  req.corpRole = decoded.corpRole;

  next();
}

/**
 * Require CorpPerks admin (corp_admin, corp_hr, corp_finance)
 */
export async function requireCorpAdminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireCorpAuth(req, res, () => {
    if (!req.companyId) {
      return errorResponse(res, errors.missingField('Company ID'));
    }

    if (!req.corpRole || !ADMIN_CORP_ROLES.includes(req.corpRole as typeof ADMIN_CORP_ROLES[number])) {
      return errorResponse(res, errors.authInsufficientPermissions());
    }

    next();
  });
}

/**
 * Require specific CorpPerks role(s)
 */
export function requireCorpRoleAuth(...allowedRoles: CorpRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireCorpAuth(req, res, () => {
      if (!req.companyId) {
        return errorResponse(res, errors.missingField('Company ID'));
      }

      if (!req.corpRole || !allowedRoles.includes(req.corpRole as CorpRole)) {
        return errorResponse(res, errors.authInsufficientPermissions());
      }

      next();
    });
  };
}

/**
 * Check if user has required role (helper for inline checks)
 */
export function hasCorpRole(userRole: string | undefined, requiredRoles: CorpRole[]): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole as CorpRole);
}
