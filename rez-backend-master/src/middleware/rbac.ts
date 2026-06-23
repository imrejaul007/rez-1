import { Request, Response, NextFunction } from 'express';
import { MerchantUserRole } from '../models/MerchantUser';
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '../config/permissions';
import { logger } from '../config/logger';

/**
 * RBAC Middleware
 *
 * Provides role-based access control for merchant routes.
 * Requires the auth middleware to run first to populate req.merchant or req.merchantUser
 */

/**
 * Check if user has a specific permission
 *
 * Usage:
 * router.post('/products', checkPermission('products:create'), createProduct);
 */
export function checkPermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user role from either merchantUser or merchant (owner)
      const role: MerchantUserRole = req.merchantUser?.role || 'owner';
      const userId = req.merchantUser?._id || req.merchantId;

      logger.info(`🔐 [RBAC] Checking permission "${permission}" for role "${role}"`);

      if (!userId) {
        logger.warn('⚠️ [RBAC] No authenticated user found');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user's account is active
      if (req.merchantUser && req.merchantUser.status !== 'active') {
        logger.warn(`⚠️ [RBAC] User account is ${req.merchantUser.status}`);
        return res.status(403).json({
          success: false,
          message: `Account is ${req.merchantUser.status}. Please contact your administrator.`
        });
      }

      // Check permission
      if (!hasPermission(role, permission)) {
        logger.warn(`⚠️ [RBAC] Permission denied: "${permission}" for role "${role}"`);
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Insufficient permissions',
          required: permission,
          userRole: role
        });
      }

      logger.info(`✅ [RBAC] Permission granted: "${permission}" for role "${role}"`);
      next();
    } catch (error: any) {
      logger.error('❌ [RBAC] Error in checkPermission middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
}

/**
 * Check if user has any of the specified permissions
 *
 * Usage:
 * router.get('/analytics', checkAnyPermission(['analytics:view', 'reports:view']), getAnalytics);
 */
export function checkAnyPermission(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const role: MerchantUserRole = req.merchantUser?.role || 'owner';
      const userId = req.merchantUser?._id || req.merchantId;

      logger.info(`🔐 [RBAC] Checking any of permissions [${permissions.join(', ')}] for role "${role}"`);

      if (!userId) {
        logger.warn('⚠️ [RBAC] No authenticated user found');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user's account is active
      if (req.merchantUser && req.merchantUser.status !== 'active') {
        logger.warn(`⚠️ [RBAC] User account is ${req.merchantUser.status}`);
        return res.status(403).json({
          success: false,
          message: `Account is ${req.merchantUser.status}. Please contact your administrator.`
        });
      }

      // Check if user has any of the permissions
      if (!hasAnyPermission(role, permissions)) {
        logger.warn(`⚠️ [RBAC] Permission denied: User needs any of [${permissions.join(', ')}]`);
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Insufficient permissions',
          required: `Any of: ${permissions.join(', ')}`,
          userRole: role
        });
      }

      logger.info(`✅ [RBAC] Permission granted for role "${role}"`);
      next();
    } catch (error: any) {
      logger.error('❌ [RBAC] Error in checkAnyPermission middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
}

/**
 * Check if user has all of the specified permissions
 *
 * Usage:
 * router.post('/bulk-import', checkAllPermissions(['products:create', 'products:bulk_import']), bulkImport);
 */
export function checkAllPermissions(permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const role: MerchantUserRole = req.merchantUser?.role || 'owner';
      const userId = req.merchantUser?._id || req.merchantId;

      logger.info(`🔐 [RBAC] Checking all permissions [${permissions.join(', ')}] for role "${role}"`);

      if (!userId) {
        logger.warn('⚠️ [RBAC] No authenticated user found');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user's account is active
      if (req.merchantUser && req.merchantUser.status !== 'active') {
        logger.warn(`⚠️ [RBAC] User account is ${req.merchantUser.status}`);
        return res.status(403).json({
          success: false,
          message: `Account is ${req.merchantUser.status}. Please contact your administrator.`
        });
      }

      // Check if user has all permissions
      if (!hasAllPermissions(role, permissions)) {
        logger.warn(`⚠️ [RBAC] Permission denied: User needs all of [${permissions.join(', ')}]`);
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Insufficient permissions',
          required: `All of: ${permissions.join(', ')}`,
          userRole: role
        });
      }

      logger.info(`✅ [RBAC] All permissions granted for role "${role}"`);
      next();
    } catch (error: any) {
      logger.error('❌ [RBAC] Error in checkAllPermissions middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
}

/**
 * Check if user has a specific role
 *
 * Usage:
 * router.delete('/account', requireRole('owner'), deleteAccount);
 */
export function requireRole(...roles: MerchantUserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const role: MerchantUserRole = req.merchantUser?.role || 'owner';
      const userId = req.merchantUser?._id || req.merchantId;

      logger.info(`🔐 [RBAC] Checking if role "${role}" is in [${roles.join(', ')}]`);

      if (!userId) {
        logger.warn('⚠️ [RBAC] No authenticated user found');
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check if user's account is active
      if (req.merchantUser && req.merchantUser.status !== 'active') {
        logger.warn(`⚠️ [RBAC] User account is ${req.merchantUser.status}`);
        return res.status(403).json({
          success: false,
          message: `Account is ${req.merchantUser.status}. Please contact your administrator.`
        });
      }

      // Check role
      if (!roles.includes(role)) {
        logger.warn(`⚠️ [RBAC] Role denied: "${role}" not in [${roles.join(', ')}]`);
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Insufficient role',
          required: `One of: ${roles.join(', ')}`,
          userRole: role
        });
      }

      logger.info(`✅ [RBAC] Role authorized: "${role}"`);
      next();
    } catch (error: any) {
      logger.error('❌ [RBAC] Error in requireRole middleware:', error);
      return res.status(500).json({
        success: false,
        message: 'Authorization error'
      });
    }
  };
}

/**
 * Require owner role (shorthand for requireRole('owner'))
 *
 * Usage:
 * router.delete('/account', requireOwner, deleteAccount);
 */
export const requireOwner = requireRole('owner');

/**
 * Require admin or owner role
 *
 * Usage:
 * router.post('/team/invite', requireAdminOrOwner, inviteTeamMember);
 */
export const requireAdminOrOwner = requireRole('owner', 'admin');

/**
 * Require manager or higher role (owner, admin, or manager)
 *
 * Usage:
 * router.post('/products', requireManagerOrHigher, createProduct);
 */
export const requireManagerOrHigher = requireRole('owner', 'admin', 'manager');
