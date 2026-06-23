// Audit Middleware
// Automatically logs API calls and changes

import { Request, Response, NextFunction } from 'express';
import AuditService from '../services/AuditService';
import AuditAlertService from '../services/AuditAlertService';
import { logger } from '../config/logger';

/**
 * Middleware to log all API calls
 */
export function auditMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Capture original send and json methods
    const originalSend = res.send;
    const originalJson = res.json;

    // Flag to ensure we only log once
    let logged = false;

    const logRequest = async () => {
      if (logged) return;
      logged = true;

      const duration = Date.now() - startTime;

      try {
        await AuditService.logApiCall(req, res, duration);
      } catch (error) {
        logger.error('❌ [AUDIT MIDDLEWARE] Failed to log API call:', error);
      }
    };

    // Override send
    res.send = function (data: any) {
      logRequest();
      return originalSend.call(this, data);
    };

    // Override json
    res.json = function (data: any) {
      logRequest();
      return originalJson.call(this, data);
    };

    // Handle request completion
    res.on('finish', () => {
      logRequest();
    });

    next();
  };
}

/**
 * Middleware to capture state before change
 * Use this before update/delete operations
 */
export function captureBeforeState(
  modelGetter: (req: Request) => Promise<any>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const before = await modelGetter(req);
      (req as any).auditBefore = before;
      next();
    } catch (error) {
      logger.error('❌ [AUDIT] Failed to capture before state:', error);
      next(); // Continue even if audit fails
    }
  };
}

/**
 * Middleware to log after successful operation
 * Use this after update/delete operations
 */
export function logAfterChange(
  resourceType: string,
  action: string,
  getAfterState: (req: Request, res: Response) => any = () => null
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Capture original send
    const originalSend = res.send;
    const originalJson = res.json;

    const logChange = async (data: any) => {
      try {
        const merchant = (req as any).merchant;
        if (!merchant) return;

        const before = (req as any).auditBefore;
        const after = getAfterState(req, res) || data;

        await AuditService.log({
          merchantId: merchant._id,
          merchantUserId: (req as any).merchantUser?._id,
          action,
          resourceType,
          resourceId: req.params.id || after?._id || after?.id,
          details: {
            before,
            after,
            metadata: {
              method: req.method,
              path: req.path
            }
          },
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
          severity: action.includes('delete') ? 'warning' : 'info'
        });
      } catch (error) {
        logger.error('❌ [AUDIT] Failed to log change:', error);
      }
    };

    // Override send
    res.send = function (data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logChange(data);
      }
      return originalSend.call(this, data);
    };

    // Override json
    res.json = function (data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logChange(data);
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Middleware to check for suspicious activity
 */
export function checkSuspiciousActivity() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const merchant = (req as any).merchant;
      if (!merchant) {
        next();
        return;
      }

      const result = await AuditAlertService.checkSuspiciousActivity(merchant._id);

      if (result.suspicious) {
        logger.warn('⚠️ [AUDIT] Suspicious activity detected:', result.reasons);

        // Log security event
        await AuditService.logSecurityEvent(
          merchant._id,
          'suspicious_activity',
          {
            reasons: result.reasons,
            endpoint: req.path,
            method: req.method
          },
          req
        );

        // Optionally block the request
        // return res.status(403).json({
        //   success: false,
        //   message: 'Suspicious activity detected. Please contact support.'
        // });
      }

      next();
    } catch (error) {
      logger.error('❌ [AUDIT] Failed to check suspicious activity:', error);
      next(); // Continue even if check fails
    }
  };
}

/**
 * Middleware to log authentication events
 */
export function logAuthEvent(
  action: 'login' | 'logout' | 'failed_login' | 'password_reset'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Capture original send
    const originalSend = res.send;
    const originalJson = res.json;

    const logEvent = async () => {
      try {
        const merchant = (req as any).merchant || (req.body.merchantId ? { _id: req.body.merchantId } : null);

        if (!merchant) return;

        await AuditService.logAuth(
          merchant._id,
          action,
          {
            email: req.body.email,
            success: res.statusCode >= 200 && res.statusCode < 300
          },
          req
        );

        // Check for multiple failed logins
        if (action === 'failed_login') {
          const failedCount = await AuditAlertService.getFailedLoginCount(merchant._id);

          if (failedCount >= 3) {
            await AuditService.logSecurityEvent(
              merchant._id,
              'multiple_failed_logins',
              {
                count: failedCount,
                email: req.body.email
              },
              req
            );
          }
        }
      } catch (error) {
        logger.error('❌ [AUDIT] Failed to log auth event:', error);
      }
    };

    // Override send
    res.send = function (data: any) {
      logEvent();
      return originalSend.call(this, data);
    };

    // Override json
    res.json = function (data: any) {
      logEvent();
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Middleware to log bulk operations
 */
export function logBulkOperation(
  resourceType: string,
  action: string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Capture original send
    const originalSend = res.send;
    const originalJson = res.json;

    const logOperation = async (data: any) => {
      try {
        const merchant = (req as any).merchant;
        if (!merchant) return;

        const count = data?.count || data?.affected || data?.deleted || 0;

        await AuditService.logBulkOperation(
          merchant._id,
          action,
          resourceType,
          count,
          (req as any).merchantUser?._id,
          req
        );

        // Alert on large bulk deletions
        if (action.includes('delete') && count > 10) {
          await AuditService.logSecurityEvent(
            merchant._id,
            'bulk_deletion_warning',
            {
              resourceType,
              count,
              action
            },
            req
          );
        }
      } catch (error) {
        logger.error('❌ [AUDIT] Failed to log bulk operation:', error);
      }
    };

    // Override send
    res.send = function (data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logOperation(data);
      }
      return originalSend.call(this, data);
    };

    // Override json
    res.json = function (data: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logOperation(data);
      }
      return originalJson.call(this, data);
    };

    next();
  };
}

export default {
  auditMiddleware,
  captureBeforeState,
  logAfterChange,
  checkSuspiciousActivity,
  logAuthEvent,
  logBulkOperation
};
