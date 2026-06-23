/**
 * Centralized File Upload Constants
 *
 * This file contains all file upload configuration constants to ensure consistency
 * across the entire application. All file upload validations should reference these values.
 *
 * WHY THESE LIMITS:
 * - 5MB max ensures fast uploads even on slow networks (3G/4G)
 * - Prevents server overload and timeout issues
 * - Compatible with most mobile data plans
 * - Balances quality vs. performance
 * - Reduces server storage costs
 *
 * @version 1.0.0
 */

// =============================================================================
// FILE SIZE LIMITS
// =============================================================================

/**
 * File size limits in bytes
 * These are the AUTHORITATIVE limits for the entire application
 */
export const FILE_SIZE_LIMITS = {
  /**
   * Maximum image size: 5MB
   * - Safe for mobile networks
   * - Fast upload times
   * - Good quality retention
   */
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB in bytes

  /**
   * Minimum image size: 50KB
   * - Ensures sufficient quality
   * - Prevents tiny/corrupted images
   * - Minimum for OCR processing
   */
  MIN_IMAGE_SIZE: 50 * 1024, // 50KB in bytes

  /**
   * Maximum document size: 10MB
   * - Safe for document uploads (PDFs, bills, etc.)
   * - Reasonable for cache storage
   * - Balanced for server processing
   */
  MAX_DOCUMENT_SIZE: 10 * 1024 * 1024, // 10MB in bytes

  /**
   * Maximum video size: 50MB
   * - Reasonable for user-generated content
   * - Prevents excessive bandwidth usage
   */
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50MB in bytes

  /**
   * Minimum video size: 100KB
   * - Ensures valid video content
   */
  MIN_VIDEO_SIZE: 100 * 1024, // 100KB in bytes
} as const;

// =============================================================================
// FILE FORMAT WHITELIST
// =============================================================================

/**
 * Allowed file formats (extensions)
 * Only these formats are accepted for uploads
 */
export const ALLOWED_FILE_FORMATS = {
  /**
   * Image formats
   * - JPEG/JPG: Most common, good compression
   * - PNG: Supports transparency, lossless
   * - HEIC/HEIF: Modern iOS format, efficient compression
   */
  IMAGES: ['jpg', 'jpeg', 'png', 'heic', 'heif'] as const,

  /**
   * Video formats
   * - MP4: Universal support, good compression
   * - MOV: Apple format, high quality
   * - WEBM: Modern web format
   */
  VIDEOS: ['mp4', 'mov', 'webm'] as const,
} as const;

/**
 * Allowed MIME types for validation
 */
export const ALLOWED_MIME_TYPES = {
  /**
   * Image MIME types
   */
  IMAGES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif',
  ] as const,

  /**
   * Video MIME types
   */
  VIDEOS: [
    'video/mp4',
    'video/quicktime', // .mov files
    'video/webm',
  ] as const,
} as const;

// =============================================================================
// IMAGE QUALITY REQUIREMENTS
// =============================================================================

/**
 * Image quality requirements for bill uploads
 */
export const IMAGE_QUALITY_REQUIREMENTS = {
  /**
   * Minimum resolution (pixels)
   */
  MIN_WIDTH: 800,
  MIN_HEIGHT: 600,

  /**
   * Ideal resolution for best quality
   */
  IDEAL_WIDTH: 1600,
  IDEAL_HEIGHT: 1200,

  /**
   * Maximum resolution (to prevent excessive sizes)
   */
  MAX_WIDTH: 4000,
  MAX_HEIGHT: 3000,

  /**
   * Minimum megapixels
   */
  MIN_MEGAPIXELS: 0.48, // 800x600

  /**
   * Quality thresholds for blur detection
   * - Values below this indicate blurry images
   */
  BLUR_THRESHOLD: 100, // Laplacian variance

  /**
   * Brightness range (0-255 scale)
   */
  BRIGHTNESS_MIN: 30,
  BRIGHTNESS_MAX: 225,
} as const;

// =============================================================================
// UPLOAD TIMEOUT SETTINGS
// =============================================================================

/**
 * Upload timeout settings (milliseconds)
 */
export const UPLOAD_TIMEOUTS = {
  /**
   * Default upload timeout: 2 minutes
   * - Sufficient for 5MB on slow networks
   */
  DEFAULT: 120000, // 120 seconds

  /**
   * Image upload timeout: 2 minutes
   */
  IMAGE: 120000, // 120 seconds

  /**
   * Video upload timeout: 5 minutes
   */
  VIDEO: 300000, // 300 seconds

  /**
   * Retry delay: 1 second
   * - Time to wait before retrying failed upload
   */
  RETRY_DELAY: 1000, // 1 second

  /**
   * Maximum retry attempts
   */
  MAX_RETRIES: 3,
} as const;

// =============================================================================
// COMPRESSION SETTINGS
// =============================================================================

/**
 * Image compression settings
 */
export const COMPRESSION_SETTINGS = {
  /**
   * JPEG quality (0-1 scale)
   * - 0.8 provides good balance between quality and size
   */
  JPEG_QUALITY: 0.8,

  /**
   * PNG quality (0-1 scale)
   */
  PNG_QUALITY: 0.9,

  /**
   * Target size after compression (bytes)
   */
  TARGET_SIZE: 2 * 1024 * 1024, // 2MB

  /**
   * Enable compression for images larger than this
   */
  COMPRESS_THRESHOLD: 3 * 1024 * 1024, // 3MB
} as const;

// =============================================================================
// ERROR MESSAGES
// =============================================================================

/**
 * User-friendly error messages
 */
export const UPLOAD_ERROR_MESSAGES = {
  FILE_TOO_LARGE: `File size exceeds ${FILE_SIZE_LIMITS.MAX_IMAGE_SIZE / (1024 * 1024)}MB limit. Please choose a smaller file.`,
  FILE_TOO_SMALL: `File size is too small. Minimum size is ${FILE_SIZE_LIMITS.MIN_IMAGE_SIZE / 1024}KB.`,
  INVALID_FORMAT: `Invalid file format. Allowed formats: ${ALLOWED_FILE_FORMATS.IMAGES.join(', ')}`,
  RESOLUTION_TOO_LOW: `Image resolution is too low. Minimum: ${IMAGE_QUALITY_REQUIREMENTS.MIN_WIDTH}x${IMAGE_QUALITY_REQUIREMENTS.MIN_HEIGHT}`,
  IMAGE_TOO_BLURRY: 'Image is too blurry. Please take a clearer photo.',
  IMAGE_TOO_DARK: 'Image is too dark. Please use better lighting.',
  IMAGE_TOO_LIGHT: 'Image is overexposed. Please reduce lighting or flash.',
  UPLOAD_TIMEOUT: 'Upload timed out. Please check your connection and try again.',
  NETWORK_ERROR: 'Network error. Please check your internet connection.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if file size is within allowed limits
 */
export function isFileSizeValid(sizeInBytes: number): boolean {
  return (
    sizeInBytes >= FILE_SIZE_LIMITS.MIN_IMAGE_SIZE &&
    sizeInBytes <= FILE_SIZE_LIMITS.MAX_IMAGE_SIZE
  );
}

/**
 * Check if file format is allowed
 */
export function isFileFormatValid(filename: string): boolean {
  const extension = getFileExtension(filename);
  return ALLOWED_FILE_FORMATS.IMAGES.includes(extension as any);
}

/**
 * Check if MIME type is allowed
 */
export function isMimeTypeValid(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.IMAGES.includes(mimeType as any);
}

/**
 * Get file extension from filename or URI
 */
export function getFileExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match ? match[1] : '';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Check if image resolution meets minimum requirements
 */
export function isResolutionValid(width: number, height: number): boolean {
  return (
    width >= IMAGE_QUALITY_REQUIREMENTS.MIN_WIDTH &&
    height >= IMAGE_QUALITY_REQUIREMENTS.MIN_HEIGHT
  );
}

/**
 * Calculate megapixels from dimensions
 */
export function calculateMegapixels(width: number, height: number): number {
  return (width * height) / 1_000_000;
}

/**
 * Check if megapixels meet minimum requirement
 */
export function isMegapixelsValid(width: number, height: number): boolean {
  const mp = calculateMegapixels(width, height);
  return mp >= IMAGE_QUALITY_REQUIREMENTS.MIN_MEGAPIXELS;
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/**
 * File validation result type
 */
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    fileSize?: number;
    format?: string;
    width?: number;
    height?: number;
  };
}

/**
 * Complete file validation function
 */
export function validateFile(
  fileSize: number,
  filename: string,
  width?: number,
  height?: number,
  mimeType?: string
): FileValidationResult {
  // Check file size
  if (!isFileSizeValid(fileSize)) {
    if (fileSize > FILE_SIZE_LIMITS.MAX_IMAGE_SIZE) {
      return { isValid: false, error: UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE };
    }
    return { isValid: false, error: UPLOAD_ERROR_MESSAGES.FILE_TOO_SMALL };
  }

  // Check file format
  if (!isFileFormatValid(filename)) {
    return { isValid: false, error: UPLOAD_ERROR_MESSAGES.INVALID_FORMAT };
  }

  // Check MIME type if provided
  if (mimeType && !isMimeTypeValid(mimeType)) {
    return { isValid: false, error: UPLOAD_ERROR_MESSAGES.INVALID_FORMAT };
  }

  // Check resolution if provided
  if (width && height && !isResolutionValid(width, height)) {
    return { isValid: false, error: UPLOAD_ERROR_MESSAGES.RESOLUTION_TOO_LOW };
  }

  return {
    isValid: true,
    details: {
      fileSize,
      format: getFileExtension(filename),
      width,
      height,
    },
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  FILE_SIZE_LIMITS,
  ALLOWED_FILE_FORMATS,
  ALLOWED_MIME_TYPES,
  IMAGE_QUALITY_REQUIREMENTS,
  UPLOAD_TIMEOUTS,
  COMPRESSION_SETTINGS,
  UPLOAD_ERROR_MESSAGES,
  isFileSizeValid,
  isFileFormatValid,
  isMimeTypeValid,
  isResolutionValid,
  isMegapixelsValid,
  validateFile,
  formatFileSize,
  getFileExtension,
  calculateMegapixels,
};
