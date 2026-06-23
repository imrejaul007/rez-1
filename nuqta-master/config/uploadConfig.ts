/**
 * Centralized Upload Configuration
 * Single source of truth for all upload-related settings
 *
 * @module uploadConfig
 * @description This file contains all configuration values for file uploads,
 * including bill uploads, image uploads, and related validation settings.
 *
 * All upload-related services should import from this file to ensure consistency.
 */

// Import centralized file size limits
import { FILE_SIZE_LIMITS as BASE_FILE_SIZE_LIMITS, COMPRESSION_SETTINGS } from '@/utils/fileUploadConstants';

// ============================================================================
// FILE SIZE LIMITS
// ============================================================================

/**
 * File size constraints for uploads
 * Re-exports from utils/fileUploadConstants.ts with additional upload-specific limits
 */
export const FILE_SIZE_LIMITS = {
  /** Maximum allowed image size: 5MB */
  MAX_IMAGE_SIZE: BASE_FILE_SIZE_LIMITS.MAX_IMAGE_SIZE,

  /** Minimum image size to ensure quality: 50KB */
  MIN_IMAGE_SIZE: BASE_FILE_SIZE_LIMITS.MIN_IMAGE_SIZE,

  /** Optimal size for processing: 2MB */
  OPTIMAL_SIZE: COMPRESSION_SETTINGS.TARGET_SIZE,

  /** Warning threshold to suggest compression: 3MB */
  WARNING_THRESHOLD: COMPRESSION_SETTINGS.COMPRESS_THRESHOLD,
} as const;

// ============================================================================
// ALLOWED FILE FORMATS
// ============================================================================

/**
 * Supported file formats for uploads
 */
export const ALLOWED_FILE_FORMATS = {
  /** Allowed MIME types */
  IMAGES: ['image/jpeg', 'image/png', 'image/heic', 'image/jpg'],

  /** Allowed file extensions */
  EXTENSIONS: ['.jpg', '.jpeg', '.png', '.heic'],

  /** Primary format for server processing */
  PRIMARY_FORMAT: 'image/jpeg',
} as const;

// ============================================================================
// UPLOAD CONFIGURATION
// ============================================================================

/**
 * Upload behavior and retry settings
 */
export const UPLOAD_CONFIG = {
  /** Request timeout in milliseconds: 60 seconds */
  TIMEOUT_MS: 60000,

  /** Maximum number of retry attempts */
  MAX_RETRIES: 3,

  /** Initial delay before first retry: 1 second */
  INITIAL_RETRY_DELAY: 1000,

  /** Maximum delay between retries: 30 seconds */
  MAX_RETRY_DELAY: 30000,

  /** Exponential backoff multiplier */
  BACKOFF_MULTIPLIER: 2,

  /** Enable exponential backoff strategy */
  USE_EXPONENTIAL_BACKOFF: true,

  /** Add random jitter to retry delays (prevents thundering herd) */
  USE_JITTER: true,

  /** Maximum jitter percentage (0.0 to 1.0) */
  MAX_JITTER: 0.3,
} as const;

// ============================================================================
// QUEUE CONFIGURATION
// ============================================================================

/**
 * Offline queue and batch processing settings
 */
export const QUEUE_CONFIG = {
  /** Maximum number of items in queue */
  MAX_QUEUE_SIZE: 50,

  /** Number of items to process in each batch */
  BATCH_SIZE: 5,

  /** Auto-sync interval: 5 minutes */
  SYNC_INTERVAL: 5 * 60 * 1000,

  /** Automatically sync queue when connection restored */
  AUTO_SYNC_ON_RECONNECT: true,

  /** Retry failed items from queue */
  RETRY_FAILED_ITEMS: true,

  /** Maximum age of queued items: 7 days */
  MAX_QUEUE_AGE: 7 * 24 * 60 * 60 * 1000,

  /** Clear successfully uploaded items from queue */
  CLEAR_ON_SUCCESS: true,
} as const;

// ============================================================================
// IMAGE QUALITY CONFIGURATION
// ============================================================================

/**
 * Image quality validation thresholds
 */
export const IMAGE_QUALITY_CONFIG = {
  /** Minimum acceptable resolution */
  MIN_RESOLUTION: { width: 800, height: 600 },

  /** Recommended resolution for optimal processing */
  RECOMMENDED_RESOLUTION: { width: 1920, height: 1080 },

  /** Maximum resolution to prevent oversized images */
  MAX_RESOLUTION: { width: 4096, height: 4096 },

  /** Minimum file size to ensure content quality: 50KB */
  MIN_FILE_SIZE: BASE_FILE_SIZE_LIMITS.MIN_IMAGE_SIZE,

  /** Minimum quality score (0-100) */
  MIN_QUALITY_SCORE: 60,

  /** JPEG compression quality for resizing */
  JPEG_QUALITY: 0.85,

  /** Enable automatic image compression */
  AUTO_COMPRESS: true,

  /** Compress images larger than this size */
  COMPRESS_THRESHOLD: COMPRESSION_SETTINGS.COMPRESS_THRESHOLD,
} as const;

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

/**
 * Errors that should trigger automatic retry
 */
export const RETRYABLE_ERRORS = [
  'TIMEOUT',
  'NETWORK_ERROR',
  'CONNECTION_RESET',
  'SERVER_ERROR',
  'SERVICE_UNAVAILABLE',
  'GATEWAY_TIMEOUT',
  'CONNECTION_REFUSED',
  'DNS_ERROR',
  'SOCKET_TIMEOUT',
] as const;

/**
 * Errors that should NOT trigger retry (permanent failures)
 */
export const NON_RETRYABLE_ERRORS = [
  'INVALID_FILE_FORMAT',
  'FILE_TOO_LARGE',
  'FILE_TOO_SMALL',
  'INVALID_MERCHANT',
  'DUPLICATE_IMAGE',
  'RATE_LIMITED',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'INVALID_IMAGE',
  'CORRUPTED_FILE',
  'UNSUPPORTED_FORMAT',
] as const;

// ============================================================================
// UPLOAD PROGRESS TRACKING
// ============================================================================

/**
 * Progress update configuration
 */
export const PROGRESS_CONFIG = {
  /** Minimum interval between progress updates: 100ms */
  UPDATE_INTERVAL: 100,

  /** Enable progress callbacks */
  ENABLE_PROGRESS: true,

  /** Progress update granularity (percentage) */
  GRANULARITY: 1,
} as const;

// ============================================================================
// ANALYTICS & MONITORING
// ============================================================================

/**
 * Analytics and monitoring settings
 */
export const ANALYTICS_CONFIG = {
  /** Track upload success rate */
  TRACK_SUCCESS_RATE: true,

  /** Track upload duration */
  TRACK_DURATION: true,

  /** Track file sizes */
  TRACK_FILE_SIZE: true,

  /** Track error types */
  TRACK_ERRORS: true,

  /** Track queue status */
  TRACK_QUEUE: true,

  /** Log verbose upload details (disable in production) */
  VERBOSE_LOGGING: false,
} as const;

// ============================================================================
// NETWORK-SPECIFIC SETTINGS
// ============================================================================

/**
 * Adaptive settings based on network conditions
 */
export const NETWORK_ADAPTIVE_CONFIG = {
  /** Enable adaptive behavior based on network */
  ENABLED: true,

  /** Settings for slow networks (2G/3G) */
  SLOW_NETWORK: {
    MAX_IMAGE_SIZE: COMPRESSION_SETTINGS.TARGET_SIZE, // 2MB
    TIMEOUT_MS: 120000, // 2 minutes
    BATCH_SIZE: 2,
    JPEG_QUALITY: 0.7,
  },

  /** Settings for fast networks (4G/5G/WiFi) */
  FAST_NETWORK: {
    MAX_IMAGE_SIZE: BASE_FILE_SIZE_LIMITS.MAX_IMAGE_SIZE, // 5MB
    TIMEOUT_MS: 60000, // 1 minute
    BATCH_SIZE: 5,
    JPEG_QUALITY: 0.85,
  },
} as const;

// ============================================================================
// BILL UPLOAD SPECIFIC CONFIGURATION
// ============================================================================

/**
 * Bill upload specific settings
 */
export const BILL_SPECIFIC_CONFIG = {
  /** Require merchant selection */
  REQUIRE_MERCHANT: true,

  /** Allow manual merchant entry if not found */
  ALLOW_MANUAL_MERCHANT: true,

  /** Enable OCR for bill data extraction */
  ENABLE_OCR: true,

  /** Validate extracted data before submission */
  VALIDATE_EXTRACTED_DATA: true,

  /** Minimum confidence score for OCR results */
  MIN_OCR_CONFIDENCE: 0.7,

  /** Enable duplicate bill detection */
  ENABLE_DUPLICATE_DETECTION: true,

  /** Time window for duplicate detection: 30 days */
  DUPLICATE_WINDOW: 30 * 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// CONSOLIDATED EXPORT
// ============================================================================

/**
 * Complete upload configuration object
 * Import this to access all upload-related settings
 *
 * @example
 * ```typescript
 * import { BILL_UPLOAD_CONFIG } from '@/config/uploadConfig';
 *
 * const maxSize = BILL_UPLOAD_CONFIG.FILE_SIZE_LIMITS.MAX_IMAGE_SIZE;
 * const timeout = BILL_UPLOAD_CONFIG.UPLOAD_CONFIG.TIMEOUT_MS;
 * ```
 */
export const BILL_UPLOAD_CONFIG = {
  FILE_SIZE_LIMITS,
  ALLOWED_FILE_FORMATS,
  UPLOAD_CONFIG,
  QUEUE_CONFIG,
  IMAGE_QUALITY_CONFIG,
  RETRYABLE_ERRORS,
  NON_RETRYABLE_ERRORS,
  PROGRESS_CONFIG,
  ANALYTICS_CONFIG,
  NETWORK_ADAPTIVE_CONFIG,
  BILL_SPECIFIC_CONFIG,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Type definitions for configuration values
 */
export type RetryableError = typeof RETRYABLE_ERRORS[number];
export type NonRetryableError = typeof NON_RETRYABLE_ERRORS[number];
export type AllowedImageFormat = typeof ALLOWED_FILE_FORMATS.IMAGES[number];
export type AllowedExtension = typeof ALLOWED_FILE_FORMATS.EXTENSIONS[number];

/**
 * Helper function to check if an error should be retried
 */
export const shouldRetryError = (errorCode: string): boolean => {
  return (RETRYABLE_ERRORS as readonly string[]).includes(errorCode);
};

/**
 * Helper function to validate file format
 */
export const isValidFileFormat = (mimeType: string): boolean => {
  return (ALLOWED_FILE_FORMATS.IMAGES as readonly string[]).includes(mimeType);
};

/**
 * Helper function to validate file extension
 */
export const isValidExtension = (extension: string): boolean => {
  return (ALLOWED_FILE_FORMATS.EXTENSIONS as readonly string[]).includes(extension.toLowerCase());
};

/**
 * Helper function to check if file size is within limits
 */
export const isValidFileSize = (size: number): boolean => {
  return size >= FILE_SIZE_LIMITS.MIN_IMAGE_SIZE && size <= FILE_SIZE_LIMITS.MAX_IMAGE_SIZE;
};

/**
 * Helper function to calculate retry delay with exponential backoff
 */
export const calculateRetryDelay = (attemptNumber: number): number => {
  const { INITIAL_RETRY_DELAY, MAX_RETRY_DELAY, BACKOFF_MULTIPLIER, USE_JITTER, MAX_JITTER } = UPLOAD_CONFIG;

  let delay = INITIAL_RETRY_DELAY * Math.pow(BACKOFF_MULTIPLIER, attemptNumber - 1);
  delay = Math.min(delay, MAX_RETRY_DELAY);

  if (USE_JITTER) {
    const jitter = delay * MAX_JITTER * Math.random();
    delay = delay + jitter;
  }

  return Math.floor(delay);
};

// ============================================================================
// VERSION INFO
// ============================================================================

/**
 * Configuration version for tracking changes
 */
export const CONFIG_VERSION = '1.0.0';

/**
 * Last updated timestamp
 */
export const LAST_UPDATED = '2025-11-03';
