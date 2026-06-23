// @ts-nocheck
/**
 * Error Reporter Utility
 *
 * Centralized error reporting and logging system.
 * Captures, categorizes, and reports errors to monitoring services.
 *
 * Features:
 * - Error capturing and categorization
 * - Stack trace analysis
 * - Context preservation
 * - Severity levels
 * - Error fingerprinting
 * - User impact tracking
 * - Performance monitoring
 * - Breadcrumb tracking
 * - Error grouping
 * - Remote logging
 *
 * @module errorReporter
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Sentry } from '@/config/sentry';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Error severity levels
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Error category
 */
export type ErrorCategory =
  | 'network'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'storage'
  | 'upload'
  | 'parsing'
  | 'rendering'
  | 'unknown';

/**
 * Error context
 */
export interface ErrorContext {
  context?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Captured error
 */
export interface CapturedError {
  id: string;
  message: string;
  name: string;
  stack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  timestamp: number;
  fingerprint: string;
  platform: string;
  appVersion?: string;
  userId?: string;
  sessionId?: string;
  breadcrumbs: Breadcrumb[];
  handled: boolean;
}

/**
 * Breadcrumb for error tracking
 */
export interface Breadcrumb {
  type: 'navigation' | 'user_action' | 'network' | 'state_change' | 'error';
  message: string;
  timestamp: number;
  data?: Record<string, any>;
  category?: string;
  level?: ErrorSeverity;
}

/**
 * Error stats
 */
export interface ErrorStats {
  totalErrors: number;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByCategory: Record<ErrorCategory, number>;
  uniqueErrors: number;
  recentErrors: CapturedError[];
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  ERRORS: '@errorReporter:errors',
  BREADCRUMBS: '@errorReporter:breadcrumbs',
  CONFIG: '@errorReporter:config',
} as const;

const MAX_BREADCRUMBS = 50;
const MAX_STORED_ERRORS = 100;
const ERROR_BATCH_SIZE = 20;

// ============================================================================
// Error Reporter
// ============================================================================

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

class ErrorReporter {
  private breadcrumbs: Breadcrumb[] = [];
  private errors: CapturedError[] = [];
  private userId: string = '';
  private sessionId: string = '';
  private appVersion: string = '1.0.0';
  private isEnabled: boolean = true;
  private isInitialized: boolean = false;
  private breadcrumbSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private errorSaveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Initialization deferred to first use (ensureInitialized) to avoid
    // AsyncStorage reads + global handler patching during app startup
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize error reporter
   */
  private async initialize(): Promise<void> {
    // Skip initialization during SSR
    if (!isBrowser || this.isInitialized) {
      return;
    }

    try {
      await this.loadBreadcrumbs();
      await this.loadErrors();
      this.setupGlobalErrorHandlers();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize ErrorReporter:', error);
    }
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Global error handler
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      this.captureError(error, {
        context: 'Global error handler',
        metadata: { isFatal },
      });

      // Call original handler
      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });

    // Unhandled promise rejections
    if (typeof global !== 'undefined') {
      const handleRejection = (event: any) => {
        this.captureError(
          new Error(event.reason || 'Unhandled promise rejection'),
          {
            context: 'Unhandled promise rejection',
            metadata: { reason: event.reason },
          }
        );
      };

      // @ts-ignore
      global.addEventListener?.('unhandledrejection', handleRejection);
    }
  }

  /**
   * Set user ID
   */
  public setUserId(userId: string): void {
    this.userId = userId;
    Sentry.setUser(userId ? { id: userId } : null);
  }

  /**
   * Set session ID
   */
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Set app version
   */
  public setAppVersion(version: string): void {
    this.appVersion = version;
  }

  /**
   * Enable or disable error reporting
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  // ==========================================================================
  // Error Capturing
  // ==========================================================================

  /**
   * Capture error
   */
  private ensureInitialized(): void {
    if (!this.isInitialized && isBrowser) {
      this.initialize();
    }
  }

  public captureError(
    error: Error,
    context?: ErrorContext,
    severity: ErrorSeverity = 'error'
  ): void {
    if (!this.isEnabled) {
      return;
    }
    this.ensureInitialized();

    try {
      const capturedError: CapturedError = {
        id: this.generateErrorId(),
        message: error.message || 'Unknown error',
        name: error.name || 'Error',
        stack: error.stack,
        severity,
        category: this.categorizeError(error),
        context: {
          ...context,
          userId: context?.userId || this.userId,
          sessionId: context?.sessionId || this.sessionId,
        },
        timestamp: Date.now(),
        fingerprint: this.generateFingerprint(error, context),
        platform: Platform.OS,
        appVersion: this.appVersion,
        userId: context?.userId || this.userId,
        sessionId: context?.sessionId || this.sessionId,
        breadcrumbs: [...this.breadcrumbs],
        handled: true,
      };

      this.addError(capturedError);
      this.logError(capturedError);

      // Forward to Sentry in production
      if (!__DEV__) {
        try {
          Sentry.captureException(error, {
            level: severity === 'fatal' ? 'fatal' : severity === 'warning' ? 'warning' : 'error',
            extra: context,
            tags: { category: capturedError.category },
          });
        } catch {}
      }
    } catch (err) {
      console.error('Failed to capture error:', err);
    }
  }

  /**
   * Capture message
   */
  public captureMessage(
    message: string,
    severity: ErrorSeverity = 'info',
    context?: ErrorContext
  ): void {
    if (!this.isEnabled) {
      return;
    }

    const error = new Error(message);
    this.captureError(error, context, severity);
  }

  /**
   * Capture exception
   */
  public captureException(
    exception: any,
    context?: ErrorContext,
    severity: ErrorSeverity = 'error'
  ): void {
    if (!this.isEnabled) {
      return;
    }

    let error: Error;

    if (exception instanceof Error) {
      error = exception;
    } else if (typeof exception === 'string') {
      error = new Error(exception);
    } else {
      error = new Error(JSON.stringify(exception));
    }

    this.captureError(error, context, severity);
  }

  // ==========================================================================
  // Breadcrumbs
  // ==========================================================================

  /**
   * Add breadcrumb
   */
  public addBreadcrumb(breadcrumb: Omit<Breadcrumb, 'timestamp'>): void {
    if (!this.isEnabled) {
      return;
    }
    this.ensureInitialized();

    const fullBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      timestamp: Date.now(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Keep only recent breadcrumbs
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs = this.breadcrumbs.slice(-MAX_BREADCRUMBS);
    }

    // Debounce saves to avoid rapid I/O
    if (this.breadcrumbSaveTimer) clearTimeout(this.breadcrumbSaveTimer);
    this.breadcrumbSaveTimer = setTimeout(() => this.saveBreadcrumbs(), 2000);
  }

  /**
   * Clear breadcrumbs
   */
  public clearBreadcrumbs(): void {
    this.breadcrumbs = [];
    this.saveBreadcrumbs();
  }

  /**
   * Save breadcrumbs to storage
   */
  private async saveBreadcrumbs(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.BREADCRUMBS,
        JSON.stringify(this.breadcrumbs)
      );
    } catch (_error) {
      // silently handle storage errors
    }
  }

  /**
   * Load breadcrumbs from storage
   */
  private async loadBreadcrumbs(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BREADCRUMBS);
      if (data) {
        this.breadcrumbs = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load breadcrumbs:', error);
    }
  }

  // ==========================================================================
  // Error Management
  // ==========================================================================

  /**
   * Add error to collection
   */
  private addError(error: CapturedError): void {
    this.errors.push(error);

    // Keep only recent errors
    if (this.errors.length > MAX_STORED_ERRORS) {
      this.errors = this.errors.slice(-MAX_STORED_ERRORS);
    }

    // Debounce saves to avoid rapid I/O
    if (this.errorSaveTimer) clearTimeout(this.errorSaveTimer);
    this.errorSaveTimer = setTimeout(() => this.saveErrors(), 1000);
  }

  /**
   * Save errors to storage
   */
  private async saveErrors(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.ERRORS,
        JSON.stringify(this.errors)
      );
    } catch (error) {
      console.error('Failed to save errors:', error);
    }
  }

  /**
   * Load errors from storage
   */
  private async loadErrors(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ERRORS);
      if (data) {
        this.errors = JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load errors:', error);
    }
  }

  /**
   * Get all errors
   */
  public getErrors(): CapturedError[] {
    return [...this.errors];
  }

  /**
   * Get errors by severity
   */
  public getErrorsBySeverity(severity: ErrorSeverity): CapturedError[] {
    return this.errors.filter(error => error.severity === severity);
  }

  /**
   * Get errors by category
   */
  public getErrorsByCategory(category: ErrorCategory): CapturedError[] {
    return this.errors.filter(error => error.category === category);
  }

  /**
   * Get error stats
   */
  public getErrorStats(): ErrorStats {
    const errorsBySeverity: Record<ErrorSeverity, number> = {
      fatal: 0,
      error: 0,
      warning: 0,
      info: 0,
      debug: 0,
    };

    const errorsByCategory: Record<ErrorCategory, number> = {
      network: 0,
      validation: 0,
      authentication: 0,
      authorization: 0,
      storage: 0,
      upload: 0,
      parsing: 0,
      rendering: 0,
      unknown: 0,
    };

    const uniqueFingerprints = new Set<string>();

    this.errors.forEach(error => {
      errorsBySeverity[error.severity]++;
      errorsByCategory[error.category]++;
      uniqueFingerprints.add(error.fingerprint);
    });

    return {
      totalErrors: this.errors.length,
      errorsBySeverity,
      errorsByCategory,
      uniqueErrors: uniqueFingerprints.size,
      recentErrors: this.errors.slice(-10),
    };
  }

  /**
   * Clear all errors
   */
  public async clearErrors(): Promise<void> {
    this.errors = [];
    await AsyncStorage.removeItem(STORAGE_KEYS.ERRORS);
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Categorize error
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      name.includes('network')
    ) {
      return 'network';
    }

    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return 'validation';
    }

    if (
      message.includes('auth') ||
      message.includes('token') ||
      message.includes('unauthorized') ||
      name.includes('auth')
    ) {
      return 'authentication';
    }

    if (
      message.includes('forbidden') ||
      message.includes('permission')
    ) {
      return 'authorization';
    }

    if (
      message.includes('storage') ||
      message.includes('asyncstorage') ||
      name.includes('storage')
    ) {
      return 'storage';
    }

    if (
      message.includes('upload') ||
      message.includes('file')
    ) {
      return 'upload';
    }

    if (
      message.includes('parse') ||
      message.includes('json') ||
      message.includes('syntax')
    ) {
      return 'parsing';
    }

    if (
      message.includes('render') ||
      message.includes('component') ||
      message.includes('view')
    ) {
      return 'rendering';
    }

    return 'unknown';
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(error: Error, context?: ErrorContext): string {
    const parts = [
      error.name,
      error.message,
      context?.context || '',
      context?.component || '',
    ];

    // Use first line of stack trace if available
    if (error.stack) {
      const firstLine = error.stack.split('\n')[1];
      if (firstLine) {
        parts.push(firstLine.trim());
      }
    }

    const fingerprint = parts.join('|');
    return this.hashString(fingerprint);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Log error to console
   */
  private logError(error: CapturedError): void {
    const prefix = `[${error.severity.toUpperCase()}] [${error.category}]`;
    const message = `${prefix} ${error.message}`;

    switch (error.severity) {
      case 'fatal':
      case 'error':
        console.error(message, error);
        break;
      case 'warning':
        console.warn(message, error);
        break;
      case 'info':
      case 'debug':
        console.log(message, error);
        break;
    }
  }

  // ==========================================================================
  // Remote Logging
  // ==========================================================================

  /**
   * Send errors to remote service
   */
  public async sendErrors(): Promise<void> {
    if (this.errors.length === 0) {
      return;
    }

    try {
      // Split into batches
      const batches = this.chunkArray(this.errors, ERROR_BATCH_SIZE);

      for (const batch of batches) {
        // TODO: Send to your error tracking service (Sentry, Bugsnag, etc.)
        // await fetch('YOUR_ERROR_TRACKING_ENDPOINT', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(batch),
        // });
      }
    } catch (error) {
      console.error('Failed to send errors:', error);
    }
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// ============================================================================
// Export
// ============================================================================

export const errorReporter = new ErrorReporter();
export default errorReporter;
