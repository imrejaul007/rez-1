/**
 * Bill Upload Analytics Service
 *
 * Comprehensive analytics and error tracking for the bill upload feature.
 * Tracks user behavior, upload performance, validation errors, and conversion funnel.
 *
 * Features:
 * - Upload attempt tracking
 * - Success/failure metrics
 * - Verification time tracking
 * - User drop-off point analysis
 * - Error type categorization
 * - Validation failure tracking
 * - Conversion funnel analysis
 * - OCR accuracy metrics
 * - Session metrics
 * - Batch event transmission
 *
 * @module billUploadAnalytics
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { telemetryService } from './telemetryService';
import { errorReporter } from '../utils/errorReporter';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Analytics event types
 */
export type AnalyticsEventType =
  | 'upload_started'
  | 'upload_progress'
  | 'upload_complete'
  | 'upload_failed'
  | 'validation_error'
  | 'user_action'
  | 'error_occurrence'
  | 'page_view'
  | 'ocr_result'
  | 'retry_attempt';

/**
 * Analytics event structure
 */
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  billId?: string;
  metadata?: Record<string, any>;
  timestamp: number;
  sessionId?: string;
  userId?: string;
}

/**
 * Upload progress tracking
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'preparing' | 'uploading' | 'processing' | 'verifying';
}

/**
 * Conversion funnel metrics
 */
export interface ConversionFunnel {
  initialLoad: number;
  imageSelected: number;
  formFilled: number;
  billSubmitted: number;
  billApproved: number;
  conversionRate: number;
  dropOffPoints: {
    imageSelection: number;
    formCompletion: number;
    submission: number;
    approval: number;
  };
}

/**
 * Upload metrics
 */
export interface UploadMetrics {
  totalAttempts: number;
  successfulUploads: number;
  failedUploads: number;
  averageUploadTime: number;
  averageFileSize: number;
  successRate: number;
  retryRate: number;
}

/**
 * Validation metrics
 */
export interface ValidationMetrics {
  totalValidations: number;
  validationErrors: number;
  errorsByField: Record<string, number>;
  errorsByType: Record<string, number>;
}

/**
 * OCR metrics
 */
export interface OCRMetrics {
  totalScans: number;
  successfulScans: number;
  averageConfidence: number;
  fieldsExtracted: Record<string, number>;
  accuracy: number;
}

/**
 * Error metrics
 */
export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByContext: Record<string, number>;
  criticalErrors: number;
}

/**
 * Session metrics
 */
export interface SessionMetrics {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  eventsCount: number;
  completedUpload: boolean;
}

/**
 * Comprehensive metrics
 */
export interface Metrics {
  upload: UploadMetrics;
  validation: ValidationMetrics;
  ocr: OCRMetrics;
  errors: ErrorMetrics;
  conversion: ConversionFunnel;
  sessions: SessionMetrics[];
  lastUpdated: number;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEYS = {
  EVENTS: '@billUpload:analytics:events',
  METRICS: '@billUpload:analytics:metrics',
  SESSION: '@billUpload:analytics:session',
  FUNNEL: '@billUpload:analytics:funnel',
} as const;

const BATCH_SIZE = 50;
const FLUSH_INTERVAL = 30000; // 30 seconds
const MAX_EVENTS_IN_MEMORY = 100;

// ============================================================================
// Bill Upload Analytics Service
// ============================================================================

class BillUploadAnalytics {
  private events: AnalyticsEvent[] = [];
  private sessionId: string = '';
  private userId: string = '';
  private flushTimer: NodeJS.Timeout | null = null;
  private sessionStartTime: number = 0;
  private uploadStartTimes: Map<string, number> = new Map();

  constructor() {
    this.initialize();
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initialize analytics service
   * Safely handles both browser and SSR/Node.js environments
   */
  private async initialize(): Promise<void> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        // Skip initialization in SSR/Node.js environment
        console.debug('[BillUploadAnalytics] Skipping initialization in Node.js environment');
        return;
      }

      this.sessionId = this.generateSessionId();
      this.sessionStartTime = Date.now();
      await this.loadStoredEvents();
      this.startAutoFlush();
    } catch (error) {
      // Silently fail in non-browser environments
      if (typeof window !== 'undefined') {
        errorReporter.captureError(error as Error, {
          context: 'BillUploadAnalytics.initialize',
        });
      }
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set user ID for tracking
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }

  // ==========================================================================
  // Event Tracking
  // ==========================================================================

  /**
   * Track generic event
   */
  public trackEvent(type: AnalyticsEventType, metadata?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      type,
      metadata,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addEvent(event);
  }

  /**
   * Track error occurrence
   */
  public trackError(error: Error, context?: string): void {
    const event: AnalyticsEvent = {
      type: 'error_occurrence',
      metadata: {
        message: error.message,
        stack: error.stack,
        context,
        name: error.name,
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addEvent(event);
    errorReporter.captureError(error, { context });
  }

  /**
   * Track upload start
   */
  public trackUploadStart(billId: string, fileSize?: number): void {
    this.uploadStartTimes.set(billId, Date.now());

    const event: AnalyticsEvent = {
      type: 'upload_started',
      billId,
      metadata: {
        fileSize,
        eventName: 'image_upload_started',
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addEvent(event);
  }

  /**
   * Track upload progress
   */
  public trackUploadProgress(billId: string, progress: UploadProgress): void {
    const event: AnalyticsEvent = {
      type: 'upload_progress',
      billId,
      metadata: {
        ...progress,
        eventName: `image_upload_progress_${progress.percentage}`,
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addEvent(event);
  }

  /**
   * Track upload completion
   */
  public trackUploadComplete(billId: string, metadata?: Record<string, any>): void {
    const startTime = this.uploadStartTimes.get(billId);
    const duration = startTime ? Date.now() - startTime : undefined;

    const event: AnalyticsEvent = {
      type: 'upload_complete',
      billId,
      metadata: {
        duration,
        eventName: 'upload_success',
        ...metadata,
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addEvent(event);
    this.uploadStartTimes.delete(billId);
  }

  /**
   * Track upload failure
   */
  public trackUploadFailed(billId: string, error: Error, retryCount?: number): void {
    const startTime = this.uploadStartTimes.get(billId);
    const duration = startTime ? Date.now() - startTime : undefined;

    const event: AnalyticsEvent = {
      type: 'upload_failed',
      billId,
      metadata: {
        error: error.message,
        errorType: error.name,
        duration,
        retryCount,
        eventName: 'upload_failed',
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addEvent(event);
    this.uploadStartTimes.delete(billId);
    this.trackError(error, 'Bill upload failed');
  }

  /**
   * Track validation error
   */
  public trackValidationError(fieldName: string, errorCode: string, errorMessage?: string): void {
    const event: AnalyticsEvent = {
      type: 'validation_error',
      metadata: {
        fieldName,
        errorCode,
        errorMessage,
        eventName: 'validation_error',
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addEvent(event);
  }

  /**
   * Track user action
   */
  public trackUserAction(action: string, metadata?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      type: 'user_action',
      metadata: {
        action,
        eventName: action,
        ...metadata,
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addEvent(event);
  }

  /**
   * Track page view
   */
  public trackPageView(pageName: string): void {
    const event: AnalyticsEvent = {
      type: 'page_view',
      metadata: {
        pageName,
        eventName: 'bill_upload_page_loaded',
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addEvent(event);
  }

  /**
   * Track OCR result
   */
  public trackOCRResult(
    billId: string,
    success: boolean,
    confidence?: number,
    extractedFields?: string[]
  ): void {
    const event: AnalyticsEvent = {
      type: 'ocr_result',
      billId,
      metadata: {
        success,
        confidence,
        extractedFields,
        eventName: 'ocr_completed',
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addEvent(event);
  }

  /**
   * Track retry attempt
   */
  public trackRetryAttempt(billId: string, attemptNumber: number, reason?: string): void {
    const event: AnalyticsEvent = {
      type: 'retry_attempt',
      billId,
      metadata: {
        attemptNumber,
        reason,
        eventName: 'retry_attempted',
      },
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
    };

    this.addEvent(event);
  }

  // ==========================================================================
  // Specific Event Tracking
  // ==========================================================================

  /**
   * Track image selection
   */
  public trackImageSelected(source: 'camera' | 'gallery', fileSize: number): void {
    this.trackUserAction('image_selected', { source, fileSize });
  }

  /**
   * Track image quality warning
   */
  public trackImageQualityWarning(reason: string): void {
    this.trackUserAction('image_quality_warning', { reason });
  }

  /**
   * Track merchant selection
   */
  public trackMerchantSelected(merchantId: string, merchantName: string): void {
    this.trackUserAction('merchant_selected', { merchantId, merchantName });
  }

  /**
   * Track amount validation
   */
  public trackAmountValidated(amount: number, isValid: boolean): void {
    this.trackUserAction('amount_validated', { amount, isValid });
  }

  /**
   * Track date validation
   */
  public trackDateValidated(date: string, isValid: boolean): void {
    this.trackUserAction('date_validated', { date, isValid });
  }

  /**
   * Track form submission
   */
  public trackFormSubmitted(billId: string): void {
    this.trackUserAction('form_submitted', { billId });
  }

  /**
   * Track offline mode detection
   */
  public trackOfflineModeDetected(): void {
    this.trackUserAction('offline_mode_detected');
  }

  /**
   * Track sync completion
   */
  public trackSyncCompleted(billsCount: number): void {
    this.trackUserAction('sync_completed', { billsCount });
  }

  // ==========================================================================
  // Conversion Funnel
  // ==========================================================================

  /**
   * Track conversion funnel step
   * Safely handles SSR/Node.js environments
   */
  private async updateFunnelStep(step: keyof ConversionFunnel): Promise<void> {
    try {
      // Skip in non-browser environment
      if (typeof window === 'undefined') {
        return;
      }

      const funnelData = await AsyncStorage.getItem(STORAGE_KEYS.FUNNEL);
      const funnel: ConversionFunnel = funnelData
        ? JSON.parse(funnelData)
        : {
            initialLoad: 0,
            imageSelected: 0,
            formFilled: 0,
            billSubmitted: 0,
            billApproved: 0,
            conversionRate: 0,
            dropOffPoints: {
              imageSelection: 0,
              formCompletion: 0,
              submission: 0,
              approval: 0,
            },
          };

      if (typeof funnel[step] === 'number') {
        funnel[step] = (funnel[step] as number) + 1;
      }

      await AsyncStorage.setItem(STORAGE_KEYS.FUNNEL, JSON.stringify(funnel));
    } catch (error) {
      if (typeof window !== 'undefined') {
        errorReporter.captureError(error as Error, {
          context: 'BillUploadAnalytics.updateFunnelStep',
        });
      }
    }
  }

  /**
   * Get conversion funnel metrics
   * Safely handles SSR/Node.js environments
   */
  public async trackConversionFunnel(): Promise<ConversionFunnel> {
    try {
      // Default funnel data
      const defaultFunnel: ConversionFunnel = {
        initialLoad: 0,
        imageSelected: 0,
        formFilled: 0,
        billSubmitted: 0,
        billApproved: 0,
        conversionRate: 0,
        dropOffPoints: {
          imageSelection: 0,
          formCompletion: 0,
          submission: 0,
          approval: 0,
        },
      };

      // Skip in non-browser environment
      if (typeof window === 'undefined') {
        return defaultFunnel;
      }

      const funnelData = await AsyncStorage.getItem(STORAGE_KEYS.FUNNEL);
      if (!funnelData) {
        return defaultFunnel;
      }

      const funnel: ConversionFunnel = JSON.parse(funnelData);

      // Calculate conversion rate
      if (funnel.initialLoad > 0) {
        funnel.conversionRate = (funnel.billApproved / funnel.initialLoad) * 100;
      }

      // Calculate drop-off points
      funnel.dropOffPoints = {
        imageSelection: funnel.initialLoad - funnel.imageSelected,
        formCompletion: funnel.imageSelected - funnel.formFilled,
        submission: funnel.formFilled - funnel.billSubmitted,
        approval: funnel.billSubmitted - funnel.billApproved,
      };

      return funnel;
    } catch (error) {
      if (typeof window !== 'undefined') {
        errorReporter.captureError(error as Error, {
          context: 'BillUploadAnalytics.trackConversionFunnel',
        });
      }
      throw error;
    }
  }

  /**
   * Update funnel for page load
   */
  public trackFunnelPageLoad(): void {
    this.updateFunnelStep('initialLoad');
  }

  /**
   * Update funnel for image selection
   */
  public trackFunnelImageSelected(): void {
    this.updateFunnelStep('imageSelected');
  }

  /**
   * Update funnel for form filled
   */
  public trackFunnelFormFilled(): void {
    this.updateFunnelStep('formFilled');
  }

  /**
   * Update funnel for bill submitted
   */
  public trackFunnelBillSubmitted(): void {
    this.updateFunnelStep('billSubmitted');
  }

  /**
   * Update funnel for bill approved
   */
  public trackFunnelBillApproved(): void {
    this.updateFunnelStep('billApproved');
  }

  // ==========================================================================
  // Metrics Calculation
  // ==========================================================================

  /**
   * Get comprehensive metrics
   * Safely handles SSR/Node.js environments
   */
  public async getMetrics(): Promise<Metrics> {
    try {
      const events = await this.getAllEvents();

      const uploadMetrics = this.calculateUploadMetrics(events);
      const validationMetrics = this.calculateValidationMetrics(events);
      const ocrMetrics = this.calculateOCRMetrics(events);
      const errorMetrics = this.calculateErrorMetrics(events);
      const conversion = await this.trackConversionFunnel();
      const sessions = this.calculateSessionMetrics(events);

      const metrics: Metrics = {
        upload: uploadMetrics,
        validation: validationMetrics,
        ocr: ocrMetrics,
        errors: errorMetrics,
        conversion,
        sessions,
        lastUpdated: Date.now(),
      };

      // Store metrics only in browser environment
      if (typeof window !== 'undefined') {
        await AsyncStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(metrics));
      }

      return metrics;
    } catch (error) {
      if (typeof window !== 'undefined') {
        errorReporter.captureError(error as Error, {
          context: 'BillUploadAnalytics.getMetrics',
        });
      }
      throw error;
    }
  }

  /**
   * Calculate upload metrics
   */
  private calculateUploadMetrics(events: AnalyticsEvent[]): UploadMetrics {
    const uploadStarted = events.filter(e => e.type === 'upload_started');
    const uploadComplete = events.filter(e => e.type === 'upload_complete');
    const uploadFailed = events.filter(e => e.type === 'upload_failed');
    const retries = events.filter(e => e.type === 'retry_attempt');

    const totalAttempts = uploadStarted.length;
    const successfulUploads = uploadComplete.length;
    const failedUploads = uploadFailed.length;

    // Calculate average upload time
    let totalDuration = 0;
    let validDurations = 0;
    uploadComplete.forEach(event => {
      if (event.metadata?.duration) {
        totalDuration += event.metadata.duration;
        validDurations++;
      }
    });
    const averageUploadTime = validDurations > 0 ? totalDuration / validDurations : 0;

    // Calculate average file size
    let totalFileSize = 0;
    let validFileSizes = 0;
    uploadStarted.forEach(event => {
      if (event.metadata?.fileSize) {
        totalFileSize += event.metadata.fileSize;
        validFileSizes++;
      }
    });
    const averageFileSize = validFileSizes > 0 ? totalFileSize / validFileSizes : 0;

    const successRate = totalAttempts > 0 ? (successfulUploads / totalAttempts) * 100 : 0;
    const retryRate = totalAttempts > 0 ? (retries.length / totalAttempts) * 100 : 0;

    return {
      totalAttempts,
      successfulUploads,
      failedUploads,
      averageUploadTime,
      averageFileSize,
      successRate,
      retryRate,
    };
  }

  /**
   * Calculate validation metrics
   */
  private calculateValidationMetrics(events: AnalyticsEvent[]): ValidationMetrics {
    const validationEvents = events.filter(e => e.type === 'validation_error');
    const totalValidations = validationEvents.length;

    const errorsByField: Record<string, number> = {};
    const errorsByType: Record<string, number> = {};

    validationEvents.forEach(event => {
      const fieldName = event.metadata?.fieldName || 'unknown';
      const errorCode = event.metadata?.errorCode || 'unknown';

      errorsByField[fieldName] = (errorsByField[fieldName] || 0) + 1;
      errorsByType[errorCode] = (errorsByType[errorCode] || 0) + 1;
    });

    return {
      totalValidations,
      validationErrors: totalValidations,
      errorsByField,
      errorsByType,
    };
  }

  /**
   * Calculate OCR metrics
   */
  private calculateOCRMetrics(events: AnalyticsEvent[]): OCRMetrics {
    const ocrEvents = events.filter(e => e.type === 'ocr_result');
    const totalScans = ocrEvents.length;
    const successfulScans = ocrEvents.filter(e => e.metadata?.success).length;

    let totalConfidence = 0;
    let validConfidences = 0;
    const fieldsExtracted: Record<string, number> = {};

    ocrEvents.forEach(event => {
      if (event.metadata?.confidence !== undefined) {
        totalConfidence += event.metadata.confidence;
        validConfidences++;
      }

      if (event.metadata?.extractedFields) {
        event.metadata.extractedFields.forEach((field: string) => {
          fieldsExtracted[field] = (fieldsExtracted[field] || 0) + 1;
        });
      }
    });

    const averageConfidence = validConfidences > 0 ? totalConfidence / validConfidences : 0;
    const accuracy = totalScans > 0 ? (successfulScans / totalScans) * 100 : 0;

    return {
      totalScans,
      successfulScans,
      averageConfidence,
      fieldsExtracted,
      accuracy,
    };
  }

  /**
   * Calculate error metrics
   */
  private calculateErrorMetrics(events: AnalyticsEvent[]): ErrorMetrics {
    const errorEvents = events.filter(e => e.type === 'error_occurrence');
    const totalErrors = errorEvents.length;

    const errorsByType: Record<string, number> = {};
    const errorsByContext: Record<string, number> = {};
    let criticalErrors = 0;

    errorEvents.forEach(event => {
      const errorType = event.metadata?.name || 'unknown';
      const context = event.metadata?.context || 'unknown';

      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      errorsByContext[context] = (errorsByContext[context] || 0) + 1;

      // Count critical errors (network, authentication, server errors)
      if (errorType.includes('Network') || errorType.includes('Auth') || errorType.includes('Server')) {
        criticalErrors++;
      }
    });

    return {
      totalErrors,
      errorsByType,
      errorsByContext,
      criticalErrors,
    };
  }

  /**
   * Calculate session metrics
   */
  private calculateSessionMetrics(events: AnalyticsEvent[]): SessionMetrics[] {
    const sessionMap = new Map<string, SessionMetrics>();

    events.forEach(event => {
      const sessionId = event.sessionId || 'unknown';

      if (!sessionMap.has(sessionId)) {
        sessionMap.set(sessionId, {
          sessionId,
          startTime: event.timestamp,
          eventsCount: 0,
          completedUpload: false,
        });
      }

      const session = sessionMap.get(sessionId)!;
      session.eventsCount++;
      session.endTime = event.timestamp;
      session.duration = session.endTime - session.startTime;

      if (event.type === 'upload_complete') {
        session.completedUpload = true;
      }
    });

    return Array.from(sessionMap.values());
  }

  // ==========================================================================
  // Event Management
  // ==========================================================================

  /**
   * Add event to queue
   */
  private addEvent(event: AnalyticsEvent): void {
    this.events.push(event);
    
    // Limit in-memory events to prevent memory issues
    if (this.events.length > MAX_EVENTS_IN_MEMORY) {
      // Keep only last MAX_EVENTS_IN_MEMORY events
      this.events = this.events.slice(-MAX_EVENTS_IN_MEMORY);
    }

    // Flush if we've reached the limit
    if (this.events.length >= MAX_EVENTS_IN_MEMORY) {
      this.flushEvents();
    }
  }

  /**
   * Load stored events
   * Safely handles SSR/Node.js environments
   */
  private async loadStoredEvents(): Promise<void> {
    try {
      // Skip in non-browser environment
      if (typeof window === 'undefined') {
        return;
      }

      const storedEvents = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
      if (storedEvents) {
        this.events = JSON.parse(storedEvents);
      }
    } catch (error) {
      // Silently fail in non-browser environments
      if (typeof window !== 'undefined') {
        errorReporter.captureError(error as Error, {
          context: 'BillUploadAnalytics.loadStoredEvents',
        });
      }
    }
  }

  /**
   * Get all events
   */
  private async getAllEvents(): Promise<AnalyticsEvent[]> {
    try {
      const storedEvents = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
      const stored = storedEvents ? JSON.parse(storedEvents) : [];
      return [...stored, ...this.events];
    } catch (error) {
      errorReporter.captureError(error as Error, {
        context: 'BillUploadAnalytics.getAllEvents',
      });
      return this.events;
    }
  }

  /**
   * Flush events to storage and telemetry service
   * Safely handles SSR/Node.js environments
   */
  public async flushEvents(): Promise<void> {
    if (this.events.length === 0) {
      return;
    }

    try {
      // Skip in non-browser environment
      if (typeof window === 'undefined') {
        return;
      }

      // Send events to telemetry service in batches
      const batches = this.chunkArray(this.events, BATCH_SIZE);

      for (const batch of batches) {
        await telemetryService.sendBatch('bill_upload', batch);
      }

      // Store events locally with size limits
      try {
        const storedEvents = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
        const stored = storedEvents ? JSON.parse(storedEvents) : [];
        const allEvents = [...stored, ...this.events];
        
        // Limit stored events to prevent storage quota issues
        // Keep only last 500 events (approximately 100KB)
        const MAX_STORED_EVENTS = 500;
        const limitedEvents = allEvents.slice(-MAX_STORED_EVENTS);
        
        // Check size before saving
        const eventsData = JSON.stringify(limitedEvents);
        const sizeInMB = new Blob([eventsData]).size / (1024 * 1024);
        
        if (sizeInMB > 0.5) { // If larger than 500KB, keep only last 200 events
          const veryLimitedEvents = allEvents.slice(-200);
          await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(veryLimitedEvents));
        } else {
          await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(limitedEvents));
        }
      } catch (error: any) {
        // Handle quota exceeded error
        if (error?.name === 'QuotaExceededError' || error?.message?.includes('quota')) {
          // Clear all stored events and keep only current batch
          try {
            await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(this.events.slice(-50)));
          } catch (clearError) {
            // If still fails, just clear everything
            try {
              await AsyncStorage.removeItem(STORAGE_KEYS.EVENTS);
            } catch (removeError) {
              // Ignore - storage is full
            }
          }
        } else {
          throw error; // Re-throw non-quota errors
        }
      }

      // Clear in-memory events
      this.events = [];
    } catch (error) {
      if (typeof window !== 'undefined') {
        errorReporter.captureError(error as Error, {
          context: 'BillUploadAnalytics.flushEvents',
        });
      }
    }
  }

  /**
   * Clean up old stored events to free storage space
   */
  public async cleanupOldEvents(maxEvents: number = 200): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        return;
      }
      
      const storedEvents = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
      if (!storedEvents) {
        return;
      }
      
      const stored = JSON.parse(storedEvents);
      if (Array.isArray(stored) && stored.length > maxEvents) {
        // Keep only last maxEvents events
        const limitedEvents = stored.slice(-maxEvents);
        await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(limitedEvents));
      }
    } catch (error) {
      // Silently fail - cleanup is best effort
      if (typeof window !== 'undefined') {
      }
    }
  }

  /**
   * Start auto-flush timer
   */
  private startAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flushEvents();
      // Clean up orphaned upload start times older than 10 minutes
      const now = Date.now();
      for (const [id, startTime] of this.uploadStartTimes) {
        if (now - startTime > 10 * 60 * 1000) {
          this.uploadStartTimes.delete(id);
        }
      }
    }, FLUSH_INTERVAL);
  }

  /**
   * Stop auto-flush timer
   */
  public stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Clear all analytics data
   * Safely handles SSR/Node.js environments
   */
  public async clearAnalytics(): Promise<void> {
    try {
      this.events = [];

      // Only access AsyncStorage in browser environment
      if (typeof window !== 'undefined') {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.EVENTS,
          STORAGE_KEYS.METRICS,
          STORAGE_KEYS.FUNNEL,
        ]);
      }
    } catch (error) {
      if (typeof window !== 'undefined') {
        errorReporter.captureError(error as Error, {
          context: 'BillUploadAnalytics.clearAnalytics',
        });
      }
    }
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

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

  /**
   * Get current session info
   */
  public getSessionInfo(): SessionMetrics {
    return {
      sessionId: this.sessionId,
      startTime: this.sessionStartTime,
      endTime: Date.now(),
      duration: Date.now() - this.sessionStartTime,
      eventsCount: this.events.length,
      completedUpload: this.events.some(e => e.type === 'upload_complete'),
    };
  }
}

// ============================================================================
// Export
// ============================================================================

export const billUploadAnalytics = new BillUploadAnalytics();
export default billUploadAnalytics;
