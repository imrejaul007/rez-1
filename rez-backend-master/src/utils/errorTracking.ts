import * as Sentry from '@sentry/node';
import { logger } from '../config/logger';

/**
 * Custom Error Tracking Utilities for Sentry
 * Provides domain-specific error capturing and context management
 */

// ============================================================================
// ORDER ERROR TRACKING
// ============================================================================

export interface OrderErrorContext {
  orderId?: string;
  userId?: string;
  storeId?: string;
  amount?: number;
  status?: string;
  items?: number;
  paymentMethod?: string;
  error?: string;
}

export const captureOrderError = (error: Error, context: OrderErrorContext, severity: Sentry.SeverityLevel = 'error') => {
  const tags = {
    domain: 'order',
    orderId: context.orderId || 'unknown',
    userId: context.userId || 'unknown',
    storeId: context.storeId || 'unknown',
    status: context.status || 'unknown'
  };

  const breadcrumb = {
    message: `Order Error: ${error.message}`,
    level: severity,
    category: 'order',
    data: {
      orderId: context.orderId,
      userId: context.userId,
      amount: context.amount,
      itemCount: context.items,
      paymentMethod: context.paymentMethod
    }
  };

  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
    Sentry.captureException(error, {
      tags,
      level: severity,
      contexts: {
        order: {
          id: context.orderId,
          userId: context.userId,
          amount: context.amount,
          itemCount: context.items,
          status: context.status,
          paymentMethod: context.paymentMethod
        }
      }
    });
  }

  logger.error('Order error captured', error, {
    ...context,
    tags
  });
};

// ============================================================================
// PAYMENT ERROR TRACKING
// ============================================================================

export interface PaymentErrorContext {
  paymentId?: string;
  orderId?: string;
  userId?: string;
  amount?: number;
  gateway?: string;
  status?: string;
  transactionId?: string;
  errorCode?: string;
  retryCount?: number;
  error?: string;
}

export const capturePaymentError = (error: Error, context: PaymentErrorContext, severity: Sentry.SeverityLevel = 'error') => {
  const tags = {
    domain: 'payment',
    paymentId: context.paymentId || 'unknown',
    gateway: context.gateway || 'unknown',
    status: context.status || 'unknown',
    retryable: ['timeout', 'network', 'temporarily_unavailable'].includes(context.errorCode || '') ? 'true' : 'false'
  };

  const breadcrumb = {
    message: `Payment Error: ${error.message}`,
    level: severity,
    category: 'payment',
    data: {
      paymentId: context.paymentId,
      orderId: context.orderId,
      amount: context.amount,
      gateway: context.gateway,
      errorCode: context.errorCode
    }
  };

  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
    Sentry.captureException(error, {
      tags,
      level: severity,
      contexts: {
        payment: {
          id: context.paymentId,
          orderId: context.orderId,
          userId: context.userId,
          amount: context.amount,
          gateway: context.gateway,
          status: context.status,
          transactionId: context.transactionId,
          errorCode: context.errorCode,
          retryCount: context.retryCount
        }
      }
    });
  }

  logger.error('Payment error captured', error, {
    ...context,
    tags
  });
};

// ============================================================================
// AUTHENTICATION ERROR TRACKING
// ============================================================================

export interface AuthErrorContext {
  userId?: string;
  email?: string;
  phone?: string;
  method?: string; // 'otp', 'password', 'social'
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  attemptCount?: number;
  error?: string;
}

export const captureAuthError = (error: Error, context: AuthErrorContext, severity: Sentry.SeverityLevel = 'warning') => {
  const tags = {
    domain: 'authentication',
    method: context.method || 'unknown',
    reason: context.reason || 'unknown',
    suspicious: context.attemptCount && context.attemptCount > 3 ? 'true' : 'false'
  };

  const breadcrumb = {
    message: `Auth Error: ${error.message}`,
    level: severity,
    category: 'auth',
    data: {
      email: context.email,
      method: context.method,
      reason: context.reason,
      attemptCount: context.attemptCount
    }
  };

  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
    Sentry.captureException(error, {
      tags,
      level: severity,
      contexts: {
        auth: {
          userId: context.userId,
          email: context.email,
          phone: context.phone,
          method: context.method,
          reason: context.reason,
          ipAddress: context.ipAddress,
          attemptCount: context.attemptCount
        }
      }
    });
  }

  logger.warn('Auth error captured', error, {
    ...context,
    tags
  });
};

// ============================================================================
// DATABASE ERROR TRACKING
// ============================================================================

export interface DatabaseErrorContext {
  operation?: string; // 'find', 'create', 'update', 'delete'
  collection?: string;
  query?: string;
  duration?: number;
  connectionError?: boolean;
  timeout?: boolean;
  error?: string;
}

export const captureDatabaseError = (error: Error, context: DatabaseErrorContext, severity: Sentry.SeverityLevel = 'error') => {
  const tags = {
    domain: 'database',
    operation: context.operation || 'unknown',
    collection: context.collection || 'unknown',
    critical: context.connectionError ? 'true' : 'false'
  };

  const breadcrumb = {
    message: `Database Error: ${error.message}`,
    level: severity,
    category: 'database',
    data: {
      operation: context.operation,
      collection: context.collection,
      duration: context.duration,
      connectionError: context.connectionError
    }
  };

  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
    Sentry.captureException(error, {
      tags,
      level: severity,
      contexts: {
        database: {
          operation: context.operation,
          collection: context.collection,
          duration: context.duration,
          connectionError: context.connectionError,
          timeout: context.timeout
        }
      }
    });
  }

  logger.error('Database error captured', error, {
    ...context,
    tags
  });
};

// ============================================================================
// API INTEGRATION ERROR TRACKING
// ============================================================================

export interface APIErrorContext {
  service?: string; // 'razorpay', 'stripe', 'cloudinary', etc.
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: number;
  retryable?: boolean;
  attemptNumber?: number;
  error?: string;
}

export const captureAPIError = (error: Error, context: APIErrorContext, severity: Sentry.SeverityLevel = 'error') => {
  const tags = {
    domain: 'api-integration',
    service: context.service || 'unknown',
    retryable: context.retryable ? 'true' : 'false',
    statusCode: context.statusCode?.toString() || 'unknown'
  };

  const breadcrumb = {
    message: `API Error: ${context.service} - ${error.message}`,
    level: severity,
    category: 'api',
    data: {
      service: context.service,
      endpoint: context.endpoint,
      statusCode: context.statusCode,
      responseTime: context.responseTime
    }
  };

  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
    Sentry.captureException(error, {
      tags,
      level: severity,
      contexts: {
        api: {
          service: context.service,
          endpoint: context.endpoint,
          method: context.method,
          statusCode: context.statusCode,
          responseTime: context.responseTime,
          retryable: context.retryable,
          attemptNumber: context.attemptNumber
        }
      }
    });
  }

  logger.error('API error captured', error, {
    ...context,
    tags
  });
};

// ============================================================================
// VALIDATION ERROR TRACKING
// ============================================================================

export interface ValidationErrorContext {
  field?: string;
  value?: any;
  rule?: string;
  message?: string;
  userId?: string;
  error?: string;
}

export const captureValidationError = (error: Error, context: ValidationErrorContext, severity: Sentry.SeverityLevel = 'info') => {
  const tags = {
    domain: 'validation',
    field: context.field || 'unknown',
    rule: context.rule || 'unknown'
  };

  const breadcrumb = {
    message: `Validation Error: ${context.field}`,
    level: severity,
    category: 'validation',
    data: {
      field: context.field,
      rule: context.rule,
      message: context.message
    }
  };

  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
    Sentry.captureException(error, {
      tags,
      level: severity,
      contexts: {
        validation: {
          field: context.field,
          rule: context.rule,
          message: context.message
        }
      }
    });
  }

  logger.info('Validation error captured', error, {
    ...context,
    tags
  });
};

// ============================================================================
// BUSINESS LOGIC ERROR TRACKING
// ============================================================================

export interface BusinessErrorContext {
  type?: string; // 'insufficient_balance', 'product_out_of_stock', 'invalid_coupon', etc.
  userId?: string;
  resourceId?: string;
  resourceType?: string;
  expectedValue?: any;
  actualValue?: any;
  error?: string;
}

export const captureBusinessError = (error: Error, context: BusinessErrorContext, severity: Sentry.SeverityLevel = 'warning') => {
  const tags = {
    domain: 'business-logic',
    type: context.type || 'unknown',
    resourceType: context.resourceType || 'unknown'
  };

  const breadcrumb = {
    message: `Business Error: ${context.type}`,
    level: severity,
    category: 'business',
    data: {
      type: context.type,
      resourceId: context.resourceId,
      expectedValue: context.expectedValue,
      actualValue: context.actualValue
    }
  };

  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
    Sentry.captureException(error, {
      tags,
      level: severity,
      contexts: {
        business: {
          type: context.type,
          userId: context.userId,
          resourceId: context.resourceId,
          resourceType: context.resourceType,
          expectedValue: context.expectedValue,
          actualValue: context.actualValue
        }
      }
    });
  }

  logger.warn('Business error captured', error, {
    ...context,
    tags
  });
};

// ============================================================================
// PERFORMANCE ERROR TRACKING
// ============================================================================

export interface PerformanceErrorContext {
  operation?: string;
  duration?: number;
  threshold?: number;
  userId?: string;
  endpoint?: string;
  error?: string;
}

export const capturePerformanceIssue = (error: Error, context: PerformanceErrorContext, severity: Sentry.SeverityLevel = 'warning') => {
  const tags = {
    domain: 'performance',
    operation: context.operation || 'unknown',
    slowQuery: context.duration && context.threshold && context.duration > context.threshold ? 'true' : 'false'
  };

  const breadcrumb = {
    message: `Performance Issue: ${context.operation}`,
    level: severity,
    category: 'performance',
    data: {
      operation: context.operation,
      duration: `${context.duration}ms`,
      threshold: `${context.threshold}ms`,
      exceeded: context.duration! > context.threshold!
    }
  };

  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb(breadcrumb);
    Sentry.captureException(error, {
      tags,
      level: severity,
      contexts: {
        performance: {
          operation: context.operation,
          duration: context.duration,
          threshold: context.threshold,
          endpoint: context.endpoint
        }
      }
    });
  }

  logger.warn('Performance issue captured', error, {
    ...context,
    tags
  });
};

// ============================================================================
// GENERIC BREADCRUMB TRACKING
// ============================================================================

export interface BreadcrumbData {
  category: string;
  message: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
}

export const addBreadcrumb = (breadcrumb: BreadcrumbData) => {
  if (process.env.SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message: breadcrumb.message,
      level: breadcrumb.level || 'info',
      category: breadcrumb.category,
      data: breadcrumb.data
    });
  }

  logger.info(`Breadcrumb: ${breadcrumb.message}`, {
    category: breadcrumb.category,
    data: breadcrumb.data
  });
};

// ============================================================================
// TRANSACTION TRACKING FOR PERFORMANCE MONITORING
// ============================================================================

export const startTransaction = (name: string, op: string) => {
  if (process.env.SENTRY_DSN) {
    return Sentry.startTransaction({
      name,
      op
    });
  }
  return null;
};

export const setTransactionTag = (transaction: any, key: string, value: string | number) => {
  if (transaction && process.env.SENTRY_DSN) {
    transaction.setTag(key, value);
  }
};

export const finishTransaction = (transaction: any, status: string = 'ok') => {
  if (transaction && process.env.SENTRY_DSN) {
    transaction.setStatus(status as 'ok' | 'cancelled' | 'unknown' | 'unauthenticated' | 'permission_denied' | 'invalid_argument' | 'deadline_exceeded' | 'not_found' | 'already_exists' | 'permission_error' | 'resource_exhausted' | 'failed_precondition' | 'aborted' | 'out_of_range' | 'unimplemented' | 'internal_error' | 'unavailable' | 'data_loss');
    transaction.finish();
  }
};

// ============================================================================
// HELPER: Get severity level based on HTTP status code
// ============================================================================

export const getSeverityFromStatusCode = (statusCode: number): Sentry.SeverityLevel => {
  if (statusCode < 400) return 'info';
  if (statusCode < 500) return 'warning';
  return 'error';
};
