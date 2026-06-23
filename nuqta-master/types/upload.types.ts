/**
 * Upload Types
 * Type definitions for file upload, progress tracking, and error handling
 *
 * NOTE: For file size limits and validation constants, see utils/fileUploadConstants.ts
 */

import { FILE_SIZE_LIMITS } from '@/utils/fileUploadConstants';

// Upload Progress Interface
export interface UploadProgress {
  loaded: number; // Bytes uploaded
  total: number; // Total bytes
  percentage: number; // 0-100
  speed: number; // Bytes per second
  timeRemaining: number; // Seconds remaining
  startTime: number; // Timestamp when upload started
  currentTime: number; // Current timestamp
}

// Upload Error Interface
export interface UploadError {
  code: string; // Error code (e.g., 'NETWORK_ERROR', 'TIMEOUT', 'FILE_TOO_LARGE')
  message: string; // Human-readable error message
  details?: string; // Additional error details
  retryable: boolean; // Whether this error can be retried
  httpStatus?: number; // HTTP status code if applicable
  timestamp: number; // When the error occurred
}

// Retry Configuration
export interface RetryConfig {
  maxAttempts: number; // Maximum number of retry attempts
  initialDelay: number; // Initial delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  backoffMultiplier: number; // Exponential backoff multiplier
  retryableErrors: string[]; // List of error codes that can be retried
}

// Upload State
export type UploadState =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

// Upload Metadata
export interface UploadMetadata {
  fileId: string; // Unique identifier for this upload
  fileName: string; // Original file name
  fileSize: number; // File size in bytes
  fileType: string; // MIME type
  uploadUrl?: string; // URL where file was uploaded (after success)
  thumbnailUrl?: string; // Thumbnail URL if applicable
  checksum?: string; // File checksum for integrity verification
}

// Upload Options
export interface UploadOptions {
  timeout?: number; // Request timeout in milliseconds (default: 30000)
  chunkSize?: number; // Size of each chunk for chunked uploads
  useChunkedUpload?: boolean; // Whether to use chunked upload
  retryConfig?: Partial<RetryConfig>; // Retry configuration
  validateBeforeUpload?: boolean; // Whether to validate file before upload
  generateThumbnail?: boolean; // Whether to generate thumbnail
  compressionQuality?: number; // Image compression quality (0-1)
}

// Upload Result
export interface UploadResult {
  success: boolean;
  metadata?: UploadMetadata;
  error?: UploadError;
  duration: number; // Total upload time in milliseconds
  bytesTransferred: number; // Total bytes transferred
  averageSpeed: number; // Average upload speed (bytes/sec)
}

// Chunked Upload Progress
export interface ChunkedUploadProgress extends UploadProgress {
  currentChunk: number;
  totalChunks: number;
  chunkSize: number;
}

// Upload Session (for resumable uploads)
export interface UploadSession {
  sessionId: string;
  fileId: string;
  uploadedChunks: number[];
  totalChunks: number;
  expiresAt: number; // Timestamp when session expires
  metadata: UploadMetadata;
}

// Network Speed Info
export interface NetworkSpeedInfo {
  speed: number; // Current speed in bytes/sec
  averageSpeed: number; // Average speed in bytes/sec
  samples: number[]; // Speed samples for averaging
  lastUpdated: number; // Last update timestamp
}

// File Validation Result
export interface FileValidationResult {
  isValid: boolean;
  errors: Array<{
    code: string;
    message: string;
  }>;
  warnings: Array<{
    code: string;
    message: string;
  }>;
  metadata: {
    fileSize: number;
    dimensions?: { width: number; height: number };
    duration?: number; // For videos
    format: string;
  };
}

// Error Codes
export enum UploadErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INSUFFICIENT_STORAGE = 'INSUFFICIENT_STORAGE',
  SERVER_ERROR = 'SERVER_ERROR',
  CANCELLED = 'CANCELLED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  CHECKSUM_MISMATCH = 'CHECKSUM_MISMATCH',
}

// Upload Event
export interface UploadEvent {
  type: 'progress' | 'error' | 'complete' | 'cancelled' | 'retry';
  timestamp: number;
  data?: any;
}

// Upload Queue Item
export interface UploadQueueItem {
  id: string;
  file: {
    uri: string;
    name: string;
    size: number;
    type: string;
  };
  options: UploadOptions;
  state: UploadState;
  progress?: UploadProgress;
  error?: UploadError;
  retryCount: number;
  priority: number; // Higher number = higher priority
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

// Default Retry Configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2, // Double the delay each time
  retryableErrors: [
    UploadErrorCode.NETWORK_ERROR,
    UploadErrorCode.TIMEOUT,
    UploadErrorCode.SERVER_ERROR,
  ],
};

// Default Upload Options
export const DEFAULT_UPLOAD_OPTIONS: UploadOptions = {
  timeout: 30000, // 30 seconds
  chunkSize: 1024 * 1024, // 1MB chunks
  useChunkedUpload: false,
  validateBeforeUpload: true,
  generateThumbnail: false,
  compressionQuality: 0.8,
  retryConfig: DEFAULT_RETRY_CONFIG,
};

// File Size Limits
// Re-export from centralized constants for backward compatibility
export const FILE_SIZE_LIMITS_UPLOAD = {
  image: FILE_SIZE_LIMITS.MAX_DOCUMENT_SIZE, // 10MB - using document size for general uploads
  video: FILE_SIZE_LIMITS.MAX_VIDEO_SIZE, // 50MB
  document: FILE_SIZE_LIMITS.MAX_IMAGE_SIZE, // 5MB
};

// Allowed File Types
export const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};
