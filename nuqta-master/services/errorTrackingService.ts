// @ts-nocheck
/**
 * Error Tracking Service
 * Comprehensive error tracking and monitoring system
 *
 * Features:
 * - Global error capture
 * - Network error tracking
 * - API error tracking
 * - Component error tracking
 * - User context capture
 * - Stack trace capture
 * - Error categorization
 * - Error deduplication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

// ============================================================================
// Types
// ============================================================================

export type ErrorType = 'network' | 'api' | 'component' | 'global' | 'timeout' | 'validation';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  userId?: string;
  sessionId: string;
  route: string;
  component?: string;
  timestamp: Date;
  userAgent: string;
  platform: string;
  networkStatus: string;
  appVersion?: string;
  metadata?: Record<string, any>;
}

export interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  type: ErrorType;
  severity: ErrorSeverity;
  context: ErrorContext;
  fingerprint: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

export interface ErrorStats {
  total: number;
  byType: Record<ErrorType, number>;
  bySeverity: Record<ErrorSeverity, number>;
  recentErrors: TrackedError[];
  topErrors: Array<{ message: string; count: number; severity: ErrorSeverity }>;
}

export interface ErrorTrends {
  increasing: boolean;
  errorRate: number;
  topErrors: Array<{ message: string; count: number }>;
  comparison: {
    current: number;
    previous: number;
    change: number;
  };
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'error_tracking';
const MAX_STORED_ERRORS = 200;
const DEDUPLICATION_WINDOW = 60 * 1000; // 1 minute

// ============================================================================
// Error Tracking Service Class
// ============================================================================

class ErrorTrackingService {
  private errors: TrackedError[] = [];
  private sessionId: string;
  private userId?: string;
  private currentRoute: string = 'unknown';
  private networkStatus: string = 'unknown';
  private isEnabled = true;
  private errorListeners: ((error: TrackedError) => void)[] = [];
  private netInfoUnsubscribe: (() => void) | null = null;
  private unhandledRejectionHandler: ((event: PromiseRejectionEvent) => void) | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.init();
  }

  /**
   * Initialize service
   */
  private async init(): Promise<void> {
    await this.loadErrors();
    this.setupNetworkListener();
    this.setupGlobalErrorHandler();
  }

  /**
   * Setup network status listener
   */
  private setupNetworkListener(): void {
    // Cleanup existing listener before adding new one
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    this.netInfoUnsubscribe = NetInfo.addEventListener(state => {
      this.networkStatus = state.isConnected
        ? state.type || 'unknown'
        : 'offline';
    });
  }

  /**
   * Setup global error handler
   */
  private setupGlobalErrorHandler(): void {
    if (typeof ErrorUtils !== 'undefined') {
      const originalHandler = ErrorUtils.getGlobalHandler();

      ErrorUtils.setGlobalHandler((error, isFatal) => {
        this.trackError(error, 'global', isFatal ? 'critical' : 'high', {
          isFatal,
        });

        // Call original handler
        if (originalHandler) {
          originalHandler(error, isFatal);
        }
      });
    }

    // Web unhandled rejection handler
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // Cleanup existing handler before adding new one
      if (this.unhandledRejectionHandler) {
        window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
        this.unhandledRejectionHandler = null;
      }

      this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
        this.trackError(
          new Error(event.reason?.message || 'Unhandled Promise Rejection'),
          'global',
          'high',
          {
            reason: event.reason,
          }
        );
      };

      window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate error fingerprint for deduplication
   */
  private generateFingerprint(
    message: string,
    stack?: string,
    type?: ErrorType
  ): string {
    const normalizedMessage = message.toLowerCase().trim();
    const stackLine = stack?.split('\n')[0] || '';
    return `${type || 'unknown'}_${normalizedMessage}_${stackLine}`.replace(/\s+/g, '_');
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Set current route
   */
  setCurrentRoute(route: string): void {
    this.currentRoute = route;
  }

  /**
   * Enable/disable error tracking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    devLog.log(`[ErrorTracking] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Add error listener
   */
  addErrorListener(listener: (error: TrackedError) => void): () => void {
    this.errorListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify error listeners
   */
  private notifyErrorListeners(error: TrackedError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        devLog.error('[ErrorTracking] Error in listener:', err);
      }
    });
  }

  // ============================================================================
  // Error Tracking Methods
  // ============================================================================

  /**
   * Track error
   */
  trackError(
    error: Error,
    type: ErrorType,
    severity: ErrorSeverity,
    context?: Partial<ErrorContext>
  ): void {
    if (!this.isEnabled) return;

    const errorContext: ErrorContext = {
      userId: this.userId,
      sessionId: this.sessionId,
      route: this.currentRoute,
      timestamp: new Date(),
      userAgent: Platform.OS === 'web' ? navigator.userAgent : Platform.OS,
      platform: Platform.OS,
      networkStatus: this.networkStatus,
      ...context,
    };

    const fingerprint = this.generateFingerprint(error.message, error.stack, type);

    // Check for existing error (deduplication)
    const existingError = this.findExistingError(fingerprint);

    if (existingError) {
      // Update existing error
      existingError.count++;
      existingError.lastSeen = new Date();
      existingError.severity = this.getHigherSeverity(existingError.severity, severity);
    } else {
      // Create new error
      const trackedError: TrackedError = {
        id: this.generateErrorId(),
        message: error.message,
        stack: error.stack,
        type,
        severity,
        context: errorContext,
        fingerprint,
        count: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
      };

      this.errors.push(trackedError);
      this.limitErrorsSize();

      // Notify listeners
      this.notifyErrorListeners(trackedError);

      // Forward to Sentry if a DSN is configured. Sentry becomes a no-op
      // when EXPO_PUBLIC_SENTRY_DSN is unset (placeholder), so this is safe
      // to leave in for all builds.
      this.sendToSentry(error, trackedError);
    }

    // Log error
    this.logError(error, type, severity);

    // Save to storage
    this.saveErrors();
  }

  /**
   * Forward a tracked error to Sentry, if the SDK is loaded and a DSN
   * is configured. Tagged with severity, error type, route, and user id
   * so issues can be filtered in the Sentry dashboard.
   */
  private sendToSentry(error: Error, tracked: TrackedError): void {
    try {
      // Lazy require so the SDK is only loaded when an error actually occurs.
      // Without a DSN, Sentry.CaptureException is a no-op.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Sentry = require('@sentry/react-native');
      Sentry?.withScope?.((scope: any) => {
        scope.setTag?.('errorType', tracked.type);
        scope.setTag?.('severity', tracked.severity);
        scope.setTag?.('route', tracked.context.route);
        scope.setUser?.(tracked.context.userId ? { id: tracked.context.userId } : null);
        Sentry.captureException?.(error);
      });
    } catch {
      // Sentry not installed or DSN missing — silently no-op.
    }
  }

  /**
   * Track network error
   */
  trackNetworkError(
    endpoint: string,
    statusCode: number,
    error: Error,
    context?: any
  ): void {
    const severity = this.getNetworkErrorSeverity(statusCode);

    this.trackError(error, 'network', severity, {
      component: 'NetworkLayer',
      metadata: {
        endpoint,
        statusCode,
        ...context,
      },
    });
  }

  /**
   * Track API error
   */
  trackAPIError(
    endpoint: string,
    response: any,
    context?: any
  ): void {
    const statusCode = response?.status || 0;
    const message = response?.data?.message || response?.message || 'API Error';

    const error = new Error(`API Error [${statusCode}]: ${message}`);
    const severity = this.getAPIErrorSeverity(statusCode);

    this.trackError(error, 'api', severity, {
      component: 'APIClient',
      metadata: {
        endpoint,
        statusCode,
        response: response?.data,
        ...context,
      },
    });
  }

  /**
   * Track component error
   */
  trackComponentError(
    componentName: string,
    error: Error,
    errorInfo?: any
  ): void {
    this.trackError(error, 'component', 'high', {
      component: componentName,
      metadata: {
        componentStack: errorInfo?.componentStack,
      },
    });
  }

  /**
   * Track timeout error
   */
  trackTimeoutError(
    operation: string,
    timeout: number,
    context?: any
  ): void {
    const error = new Error(`Timeout: ${operation} exceeded ${timeout}ms`);

    this.trackError(error, 'timeout', 'medium', {
      metadata: {
        operation,
        timeout,
        ...context,
      },
    });
  }

  /**
   * Track validation error
   */
  trackValidationError(
    message: string,
    field?: string,
    value?: any
  ): void {
    const error = new Error(`Validation Error: ${message}`);

    this.trackError(error, 'validation', 'low', {
      metadata: {
        field,
        value,
      },
    });
  }

  // ============================================================================
  // Error Analysis Methods
  // ============================================================================

  /**
   * Get error statistics
   */
  getErrorStats(timeRange?: 'hour' | 'day' | 'week'): ErrorStats {
    const filtered = this.filterByTimeRange(timeRange);

    const byType: Record<ErrorType, number> = {
      network: 0,
      api: 0,
      component: 0,
      global: 0,
      timeout: 0,
      validation: 0,
    };

    const bySeverity: Record<ErrorSeverity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    filtered.forEach(error => {
      byType[error.type] += error.count;
      bySeverity[error.severity] += error.count;
    });

    const topErrors = this.getTopErrors(filtered);
    const recentErrors = this.getRecentErrors(10);

    return {
      total: filtered.reduce((sum, e) => sum + e.count, 0),
      byType,
      bySeverity,
      recentErrors,
      topErrors,
    };
  }

  /**
   * Get error trends
   */
  getErrorTrends(timeRange: 'hour' | 'day' | 'week' = 'hour'): ErrorTrends {
    const now = Date.now();
    const ranges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const rangeMs = ranges[timeRange];
    const currentPeriodErrors = this.errors.filter(
      e => e.lastSeen.getTime() > now - rangeMs
    );
    const previousPeriodErrors = this.errors.filter(
      e => e.lastSeen.getTime() > now - rangeMs * 2 &&
           e.lastSeen.getTime() <= now - rangeMs
    );

    const currentCount = currentPeriodErrors.reduce((sum, e) => sum + e.count, 0);
    const previousCount = previousPeriodErrors.reduce((sum, e) => sum + e.count, 0);
    const change = previousCount > 0
      ? ((currentCount - previousCount) / previousCount) * 100
      : 0;

    const topErrors = this.getTopErrors(currentPeriodErrors);

    return {
      increasing: change > 0,
      errorRate: currentCount / (rangeMs / 1000 / 60), // errors per minute
      topErrors,
      comparison: {
        current: currentCount,
        previous: previousCount,
        change,
      },
    };
  }

  /**
   * Get recent errors
   */
  private getRecentErrors(count: number): TrackedError[] {
    return [...this.errors]
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
      .slice(0, count);
  }

  /**
   * Get top errors by count
   */
  private getTopErrors(errors: TrackedError[]): Array<{
    message: string;
    count: number;
    severity: ErrorSeverity;
  }> {
    return [...errors]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(e => ({
        message: e.message,
        count: e.count,
        severity: e.severity,
      }));
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Find existing error by fingerprint
   */
  private findExistingError(fingerprint: string): TrackedError | undefined {
    const now = Date.now();
    return this.errors.find(
      e => e.fingerprint === fingerprint &&
           now - e.lastSeen.getTime() < DEDUPLICATION_WINDOW
    );
  }

  /**
   * Generate error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get higher severity
   */
  private getHigherSeverity(
    severity1: ErrorSeverity,
    severity2: ErrorSeverity
  ): ErrorSeverity {
    const levels: Record<ErrorSeverity, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    return levels[severity1] > levels[severity2] ? severity1 : severity2;
  }

  /**
   * Get network error severity
   */
  private getNetworkErrorSeverity(statusCode: number): ErrorSeverity {
    if (statusCode >= 500) return 'critical';
    if (statusCode >= 400) return 'medium';
    return 'low';
  }

  /**
   * Get API error severity
   */
  private getAPIErrorSeverity(statusCode: number): ErrorSeverity {
    if (statusCode === 401 || statusCode === 403) return 'high';
    if (statusCode >= 500) return 'critical';
    if (statusCode >= 400) return 'medium';
    return 'low';
  }

  /**
   * Log error to console
   */
  private logError(error: Error, type: ErrorType, severity: ErrorSeverity): void {
    const emoji = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '❌',
      critical: '🔥',
    }[severity];

    devLog.error(
      `${emoji} [ErrorTracking] [${type}] [${severity}] ${error.message}`,
      {
        stack: error.stack,
        route: this.currentRoute,
        networkStatus: this.networkStatus,
      }
    );
  }

  /**
   * Filter errors by time range
   */
  private filterByTimeRange(timeRange?: 'hour' | 'day' | 'week'): TrackedError[] {
    if (!timeRange) return this.errors;

    const now = Date.now();
    const ranges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - ranges[timeRange];
    return this.errors.filter(e => e.lastSeen.getTime() > cutoff);
  }

  /**
   * Limit errors array size
   */
  private limitErrorsSize(): void {
    if (this.errors.length > MAX_STORED_ERRORS) {
      // Remove oldest errors
      this.errors.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
      this.errors = this.errors.slice(0, MAX_STORED_ERRORS);
    }
  }

  /**
   * Save errors to storage
   */
  private async saveErrors(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(this.errors.slice(0, MAX_STORED_ERRORS))
      );
    } catch (error) {
      devLog.error('[ErrorTracking] Failed to save errors:', error);
    }
  }

  /**
   * Load errors from storage
   */
  private async loadErrors(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.errors = JSON.parse(stored).map((e: any) => ({
          ...e,
          firstSeen: new Date(e.firstSeen),
          lastSeen: new Date(e.lastSeen),
          context: {
            ...e.context,
            timestamp: new Date(e.context.timestamp),
          },
        }));

        devLog.log(`[ErrorTracking] Loaded ${this.errors.length} stored errors`);
      }
    } catch (error) {
      devLog.error('[ErrorTracking] Failed to load errors:', error);
    }
  }

  /**
   * Clear all errors
   */
  async clearErrors(): Promise<void> {
    this.errors = [];
    await AsyncStorage.removeItem(STORAGE_KEY);
    devLog.log('[ErrorTracking] All errors cleared');
  }

  /**
   * Export errors as JSON
   */
  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  /**
   * Cleanup and destroy service
   */
  destroy(): void {
    // Cleanup NetInfo listener
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }

    // Cleanup window event listener
    if (this.unhandledRejectionHandler && Platform.OS === 'web' && typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
      this.unhandledRejectionHandler = null;
    }

    // Clear error listeners
    this.errorListeners = [];

    devLog.log('[ErrorTracking] Service destroyed');
  }

  /**
   * Print error report
   */
  printReport(): void {
    const stats = this.getErrorStats('day');
    const trends = this.getErrorTrends('hour');

    devLog.log('\n========================================');
    devLog.log('       ERROR TRACKING REPORT');
    devLog.log('========================================\n');

    devLog.log(`Total Errors (24h): ${stats.total}\n`);

    devLog.log('By Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      if (count > 0) {
        devLog.log(`  ${type}: ${count}`);
      }
    });

    devLog.log('\nBy Severity:');
    Object.entries(stats.bySeverity).forEach(([severity, count]) => {
      if (count > 0) {
        devLog.log(`  ${severity}: ${count}`);
      }
    });

    devLog.log('\nTop Errors:');
    stats.topErrors.slice(0, 5).forEach((error, index) => {
      devLog.log(`  ${index + 1}. [${error.severity}] ${error.message} (${error.count}x)`);
    });

    devLog.log('\nTrends (last hour):');
    devLog.log(`  Error Rate: ${trends.errorRate.toFixed(2)} errors/min`);
    devLog.log(`  Trend: ${trends.increasing ? '📈 Increasing' : '📉 Decreasing'}`);
    devLog.log(`  Change: ${trends.comparison.change.toFixed(1)}%\n`);

    devLog.log('========================================\n');
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const ERROR_TRACKING_SERVICE_KEY = '__rezErrorTrackingService__';

function getErrorTrackingService(): ErrorTrackingService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[ERROR_TRACKING_SERVICE_KEY]) {
      (globalThis as any)[ERROR_TRACKING_SERVICE_KEY] = new ErrorTrackingService();
    }
    return (globalThis as any)[ERROR_TRACKING_SERVICE_KEY];
  }
  return new ErrorTrackingService();
}

export const errorTrackingService = getErrorTrackingService();
export default errorTrackingService;
