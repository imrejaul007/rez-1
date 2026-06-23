// Comprehensive Error Handling System
// Centralized error handling for the entire app

import { platformAlert } from '@/utils/platformAlert';

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  stack?: string;
}

// Error categories
export enum ErrorCategory {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION', 
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  UNKNOWN = 'UNKNOWN'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Error metadata
interface ErrorMetadata {
  category: ErrorCategory;
  severity: ErrorSeverity;
  userMessage: string;
  actionRequired: boolean;
  retryable: boolean;
}

// Error mapping for common error codes
const ERROR_MAP: Record<string, ErrorMetadata> = {
  // Network errors
  'NETWORK_ERROR': {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    userMessage: 'Network connection failed. Please check your internet connection.',
    actionRequired: true,
    retryable: true
  },
  'TIMEOUT_ERROR': {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Request timed out. Please try again.',
    actionRequired: true,
    retryable: true
  },

  // Authentication errors
  'INVALID_TOKEN': {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    userMessage: 'Your session has expired. Please sign in again.',
    actionRequired: true,
    retryable: false
  },
  'INVALID_OTP': {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Invalid verification code. Please try again.',
    actionRequired: true,
    retryable: true
  },
  'USER_NOT_FOUND': {
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'Account not found. Please register first.',
    actionRequired: true,
    retryable: false
  },

  // Validation errors
  'VALIDATION_ERROR': {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    userMessage: 'Please check your input and try again.',
    actionRequired: true,
    retryable: true
  },
  'INVALID_PHONE': {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    userMessage: 'Please enter a valid phone number.',
    actionRequired: true,
    retryable: true
  },
  'INVALID_EMAIL': {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    userMessage: 'Please enter a valid email address.',
    actionRequired: true,
    retryable: true
  },

  // Server errors
  'SERVER_ERROR': {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.HIGH,
    userMessage: 'Server error occurred. Please try again later.',
    actionRequired: true,
    retryable: true
  },
  'SERVICE_UNAVAILABLE': {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.CRITICAL,
    userMessage: 'Service is temporarily unavailable. Please try again later.',
    actionRequired: true,
    retryable: true
  },

  // Permission errors
  'PERMISSION_DENIED': {
    category: ErrorCategory.PERMISSION,
    severity: ErrorSeverity.HIGH,
    userMessage: 'Access denied. You don\'t have permission for this action.',
    actionRequired: true,
    retryable: false
  },

  // Default
  'UNKNOWN_ERROR': {
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    userMessage: 'An unexpected error occurred. Please try again.',
    actionRequired: true,
    retryable: true
  }
};

// Error logger
class ErrorLogger {
  private static logs: AppError[] = [];
  private static maxLogs = 100;

  static log(error: AppError): void {
    // Add timestamp
    error.timestamp = new Date();

    // Add to logs
    this.logs.unshift(error);

    // Limit log size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Log to console in development
    if (__DEV__) {
      console.error('[AppError]', {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp
      });
    }

    // TODO: Send to crash reporting service in production
    // Example: Sentry, Bugsnag, etc.
  }

  static getLogs(): AppError[] {
    return [...this.logs];
  }

  static clearLogs(): void {
    this.logs = [];
  }

  static getLogsByCategory(category: ErrorCategory): AppError[] {
    return this.logs.filter(log => {
      const metadata = ERROR_MAP[log.code];
      return metadata?.category === category;
    });
  }
}

// Error handler class
export class ErrorHandler {
  // Convert any error to AppError
  static normalize(error: any): AppError {
    // SECURITY: ApiError class was previously imported from './apiClient'
    // but the export doesn't exist there. Check by duck-typing instead so the
    // runtime check works whether or not the class is later added.
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      return {
        code: error.code || 'API_ERROR',
        message: error.message,
        details: error.details,
        timestamp: new Date()
      };
    }

    if (error && typeof error === 'object' && typeof error.code === 'string') {
      return {
        code: error.code || 'API_ERROR',
        message: error.message ?? 'An API error occurred',
        details: error.details,
        timestamp: new Date()
      };
    }

    if (error instanceof Error) {
      return {
        code: 'CLIENT_ERROR',
        message: error.message,
        timestamp: new Date(),
        stack: error.stack
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: typeof error === 'string' ? error : 'An unknown error occurred',
      timestamp: new Date(),
      details: error
    };
  }

  // Get error metadata
  static getMetadata(errorCode: string): ErrorMetadata {
    return ERROR_MAP[errorCode] || ERROR_MAP['UNKNOWN_ERROR'];
  }

  // Handle error with appropriate UI response
  static handle(error: any, options: {
    showAlert?: boolean;
    customMessage?: string;
    onRetry?: () => void;
    onCancel?: () => void;
  } = {}): AppError {
    const appError = this.normalize(error);
    const metadata = this.getMetadata(appError.code);
    
    // Log the error
    ErrorLogger.log(appError);

    // Show user-friendly alert if requested
    if (options.showAlert !== false) {
      const message = options.customMessage || metadata.userMessage;
      
      if (metadata.retryable && options.onRetry) {
        platformAlert(
          'Error',
          message,
          [
            { text: 'Cancel', onPress: options.onCancel, style: 'cancel' },
            { text: 'Retry', onPress: options.onRetry }
          ]
        );
      } else {
        platformAlert(
          'Error',
          message,
          [{ text: 'OK', onPress: options.onCancel }]
        );
      }
    }

    return appError;
  }

  // Handle network errors specifically
  static handleNetworkError(error: any, onRetry?: () => void): AppError {
    return this.handle(error, {
      showAlert: true,
      onRetry,
      customMessage: 'Network connection failed. Please check your internet connection and try again.'
    });
  }

  // Handle authentication errors specifically
  static handleAuthError(error: any, onSignIn?: () => void): AppError {
    const appError = this.normalize(error);
    
    if (appError.code === 'INVALID_TOKEN' || appError.code === 'USER_NOT_FOUND') {
      platformAlert(
        'Authentication Required',
        'Your session has expired. Please sign in again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: onSignIn }
        ]
        );
    } else {
      this.handle(error, { showAlert: true });
    }

    return appError;
  }

  // Handle validation errors with field-specific messages
  static handleValidationError(error: any, fieldName?: string): AppError {
    const appError = this.normalize(error);
    let message = this.getMetadata(appError.code).userMessage;

    if (fieldName) {
      message = `${fieldName}: ${message}`;
    }

    return this.handle(error, {
      showAlert: true,
      customMessage: message
    });
  }

  // Silent error handling (log only, no UI)
  static handleSilent(error: any): AppError {
    const appError = this.normalize(error);
    ErrorLogger.log(appError);
    return appError;
  }

  // Get error statistics
  static getStats(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: number; // last hour
  } {
    const logs = ErrorLogger.getLogs();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const stats = {
      total: logs.length,
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      recent: logs.filter(log => log.timestamp > oneHourAgo).length
    };

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // Count errors
    logs.forEach(log => {
      const metadata = this.getMetadata(log.code);
      stats.byCategory[metadata.category]++;
      stats.bySeverity[metadata.severity]++;
    });

    return stats;
  }
}

// Request/Response Interceptor System
export class InterceptorManager {
  private static requestInterceptors: Array<(config: any) => any> = [];
  private static responseInterceptors: Array<(response: any) => any> = [];
  private static errorInterceptors: Array<(error: any) => any> = [];

  // Add request interceptor
  static addRequestInterceptor(interceptor: (config: any) => any): void {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  static addResponseInterceptor(interceptor: (response: any) => any): void {
    this.responseInterceptors.push(interceptor);
  }

  // Add error interceptor
  static addErrorInterceptor(interceptor: (error: any) => any): void {
    this.errorInterceptors.push(interceptor);
  }

  // Process request through interceptors
  static processRequest(config: any): any {
    return this.requestInterceptors.reduce((acc, interceptor) => {
      return interceptor(acc);
    }, config);
  }

  // Process response through interceptors
  static processResponse(response: any): any {
    return this.responseInterceptors.reduce((acc, interceptor) => {
      return interceptor(acc);
    }, response);
  }

  // Process error through interceptors
  static processError(error: any): any {
    return this.errorInterceptors.reduce((acc, interceptor) => {
      return interceptor(acc);
    }, error);
  }
  // Remove interceptor by reference
  static removeRequestInterceptor(interceptor: (config: any) => any): void {
    this.requestInterceptors = this.requestInterceptors.filter(i => i !== interceptor);
  }

  static removeResponseInterceptor(interceptor: (response: any) => any): void {
    this.responseInterceptors = this.responseInterceptors.filter(i => i !== interceptor);
  }

  static removeErrorInterceptor(interceptor: (error: any) => any): void {
    this.errorInterceptors = this.errorInterceptors.filter(i => i !== interceptor);
  }

  // Clear all interceptors (useful for hot reload)
  static clearAll(): void {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.errorInterceptors = [];
  }
}

// Guard against hot-reload duplication — clear before re-adding
InterceptorManager.clearAll();

// Initialize default interceptors
InterceptorManager.addRequestInterceptor((config) => {
  // Add request timestamp
  config.timestamp = Date.now();
  
  if (__DEV__) {

  }
  
  return config;
});

InterceptorManager.addResponseInterceptor((response) => {
  if (__DEV__) {

  }
  
  return response;
});

InterceptorManager.addErrorInterceptor((error) => {
  // Log all API errors
  ErrorHandler.handleSilent(error);
  return error;
});

// Export everything
export { ErrorLogger };
export default ErrorHandler;