/**
 * Logger Utility
 *
 * Centralized logging service that replaces console.log statements
 * in production code. Provides different log levels and integrates
 * with monitoring services like Sentry.
 */

import { MonitoringHelpers } from '@/config/monitoring.config';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  persistLogs: boolean;
  maxLogs: number;
}

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  context?: string;
}

const REDACTION_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /(token|secret|password)["']?\s*[:=]\s*["'][^"']+["']/gi,
];

const redact = (input: unknown): string => {
  const raw = typeof input === 'string' ? input : JSON.stringify(input);
  return REDACTION_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, '[REDACTED]'), raw);
};

/**
 * Logger class
 */
class Logger {
  private config: LoggerConfig = {
    enabled: __DEV__, // Only enable in development
    level: __DEV__ ? LogLevel.DEBUG : LogLevel.ERROR,
    persistLogs: true,
    maxLogs: 100,
  };

  private logs: LogEntry[] = [];

  /**
   * Configure logger
   */
  configure(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;

    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Add log entry
   */
  private addLog(level: LogLevel, message: string, data?: any, context?: string): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      context,
    };

    if (this.config.persistLogs) {
      this.logs.push(entry);

      // Keep only last N logs
      if (this.logs.length > this.config.maxLogs) {
        this.logs.shift();
      }
    }
  }

  /**
   * Format log message
   */
  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` [${context}]` : '';
    return `[${timestamp}] [${level.toUpperCase()}]${contextStr} ${message}`;
  }

  /**
   * Debug level logging
   * Use for detailed debugging information
   */
  debug(message: string, data?: any, context?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    this.addLog(LogLevel.DEBUG, message, data, context);

    if (__DEV__) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context), data || '');
    }
  }

  /**
   * Info level logging
   * Use for general information
   */
  info(message: string, data?: any, context?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    this.addLog(LogLevel.INFO, message, data, context);

    if (__DEV__) {
      console.info(this.formatMessage(LogLevel.INFO, message, context), data || '');
    }
  }

  /**
   * Warning level logging
   * Use for warnings that should be addressed
   */
  warn(message: string, data?: any, context?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    this.addLog(LogLevel.WARN, message, data, context);


    // Send warnings to monitoring in production
    if (!__DEV__) {
      MonitoringHelpers.trackEvent('warning', {
        message,
        data,
        context,
      });
    }
  }

  /**
   * Error level logging
   * Use for errors that need immediate attention
   */
  error(message: string, error?: Error, context?: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    this.addLog(LogLevel.ERROR, message, error, context);


    // Send errors to monitoring
    if (error) {
      MonitoringHelpers.trackError(error, {
        message,
        context,
      });
    }
  }

  /**
   * Log API request
   */
  logRequest(method: string, url: string, data?: any): void {
    this.debug(`API Request: ${method} ${url}`, data, 'API');
  }

  /**
   * Log API response
   */
  logResponse(method: string, url: string, status: number, data?: any): void {
    if (status >= 200 && status < 300) {
      this.debug(`API Response: ${method} ${url} - ${status}`, data, 'API');
    } else if (status >= 400) {
      this.error(`API Error: ${method} ${url} - ${status}`, undefined, 'API');
    }
  }

  /**
   * Log navigation
   */
  logNavigation(from: string, to: string): void {
    this.debug(`Navigation: ${from} → ${to}`, undefined, 'Navigation');

    // Track page view in analytics
    if (!__DEV__) {
      MonitoringHelpers.trackPageView(to, { from });
    }
  }

  /**
   * Log user action
   */
  logAction(action: string, data?: any): void {
    this.info(`User Action: ${action}`, data, 'User');

    // Track event in analytics
    if (!__DEV__) {
      MonitoringHelpers.trackEvent(action, data);
    }
  }

  /**
   * Log performance metric
   */
  logPerformance(metric: string, duration: number, context?: string): void {
    this.debug(`Performance: ${metric} took ${duration}ms`, undefined, context);

    // Track performance in monitoring
    if (!__DEV__) {
      MonitoringHelpers.trackPerformance(metric, duration, { context });
    }
  }

  /**
   * Get all logs
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Backward compatibility methods
  log(...args: any[]): void {
    if (args.length > 0) {
      this.debug(String(args[0]), args.slice(1));
    }
  }
}

/**
 * Singleton logger instance
 */
const logger = new Logger();

/**
 * Export logger instance and types
 */
export { logger, Logger, LogEntry };
export default logger;

/**
 * Convenience exports for common logging operations
 */
export const log = {
  debug: (message: string, data?: any, context?: string) => logger.debug(message, data, context),
  info: (message: string, data?: any, context?: string) => logger.info(message, data, context),
  warn: (message: string, data?: any, context?: string) => logger.warn(message, data, context),
  error: (message: string, error?: Error, context?: string) => logger.error(message, error, context),
  request: (method: string, url: string, data?: any) => logger.logRequest(method, url, data),
  response: (method: string, url: string, status: number, data?: any) => logger.logResponse(method, url, status, data),
  navigation: (from: string, to: string) => logger.logNavigation(from, to),
  action: (action: string, data?: any) => logger.logAction(action, data),
  performance: (metric: string, duration: number, context?: string) => logger.logPerformance(metric, duration, context),
};

export const installProductionConsoleGuard = (): void => {
  if (__DEV__) return;

  const originalError = console.error.bind(console);
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  console.error = (...args: unknown[]) => {
    originalError(...args.map((arg) => redact(arg)));
  };
};
