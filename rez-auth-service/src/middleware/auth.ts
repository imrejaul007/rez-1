import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { errorResponse, errors } from '../utils/response';

interface REZJwtPayload extends JwtPayload {
  userId?: string;
  merchantId?: string;
  role?: string;
  phone?: string;
  companyId?: string;  // CorpPerks company ID
  corpRole?: string;    // CorpPerks role
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: string;
      merchantId?: string;
      userPhone?: string;
      companyId?: string;   // CorpPerks company ID
      corpRole?: string;    // CorpPerks role
    }
  }
}

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

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return errorResponse(res, errors.authTokenMissing());
  }

  const token = header.slice(7);

  let decoded: REZJwtPayload;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as REZJwtPayload;
  } catch {
    return errorResponse(res, errors.authTokenInvalid());
  }

  req.userId = decoded.userId;
  req.userRole = decoded.role;
  req.merchantId = decoded.merchantId;
  req.userPhone = decoded.phone;
  req.companyId = decoded.companyId;
  req.corpRole = decoded.corpRole;

  next();
}

/**
 * Require CorpPerks admin auth (corp_admin, corp_hr, or corp_finance)
 */
export async function requireCorpAdminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
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
export function requireCorpRole(...allowedRoles: CorpRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await requireAuth(req, res, () => {
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
