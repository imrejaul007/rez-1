/**
 * Bill Upload Error Definitions
 *
 * Centralized error handling for bill upload functionality including:
 * - Error type enums
 * - Error messages
 * - Recovery suggestions
 * - Severity levels
 */

/**
 * Comprehensive error types for bill upload
 */
export enum BillUploadErrorType {
  // File/Image errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  IMAGE_QUALITY_LOW = 'IMAGE_QUALITY_LOW',
  CORRUPT_FILE = 'CORRUPT_FILE',
  DUPLICATE_IMAGE = 'DUPLICATE_IMAGE',

  // Validation errors
  MERCHANT_INVALID = 'MERCHANT_INVALID',
  AMOUNT_INVALID = 'AMOUNT_INVALID',
  DATE_INVALID = 'DATE_INVALID',
  BILL_NUMBER_INVALID = 'BILL_NUMBER_INVALID',
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',

  // Network errors
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NO_INTERNET = 'NO_INTERNET',
  UPLOAD_INTERRUPTED = 'UPLOAD_INTERRUPTED',

  // Server errors
  SERVER_ERROR = 'SERVER_ERROR',
  SERVER_UNAVAILABLE = 'SERVER_UNAVAILABLE',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // Rate limiting
  RATE_LIMIT = 'RATE_LIMIT',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',

  // Processing errors
  OCR_FAILED = 'OCR_FAILED',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',

  // Business logic errors
  DUPLICATE_BILL = 'DUPLICATE_BILL',
  BILL_ALREADY_CLAIMED = 'BILL_ALREADY_CLAIMED',
  MERCHANT_NOT_ELIGIBLE = 'MERCHANT_NOT_ELIGIBLE',
  AMOUNT_OUT_OF_RANGE = 'AMOUNT_OUT_OF_RANGE',
  BILL_TOO_OLD = 'BILL_TOO_OLD',

  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW', // User can retry or ignore
  MEDIUM = 'MEDIUM', // User should fix the issue
  HIGH = 'HIGH', // Blocks progress, requires action
  CRITICAL = 'CRITICAL', // System-level issue
}

/**
 * Error category for grouping
 */
export enum ErrorCategory {
  FILE = 'FILE',
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  SERVER = 'SERVER',
  BUSINESS = 'BUSINESS',
  PROCESSING = 'PROCESSING',
}

/**
 * Error information structure
 */
export interface BillUploadErrorInfo {
  type: BillUploadErrorType;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  recoverySuggestions: string[];
  isRetryable: boolean;
  requiresUserAction: boolean;
  technicalDetails?: string;
}

/**
 * Comprehensive error definitions
 */
export const BILL_UPLOAD_ERRORS: Record<BillUploadErrorType, Omit<BillUploadErrorInfo, 'type'>> = {
  // File/Image errors
  [BillUploadErrorType.FILE_TOO_LARGE]: {
    category: ErrorCategory.FILE,
    severity: ErrorSeverity.MEDIUM,
    message: 'File size exceeds maximum allowed limit',
    userMessage: 'The image file is too large. Please compress it or use a different photo.',
    recoverySuggestions: [
      'Compress the image before uploading',
      'Take a new photo with lower resolution',
      'Use an image compression app',
      'Maximum allowed size is 5MB',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.INVALID_FORMAT]: {
    category: ErrorCategory.FILE,
    severity: ErrorSeverity.MEDIUM,
    message: 'Unsupported file format',
    userMessage: 'This file format is not supported. Please upload a JPG, PNG, or HEIC image.',
    recoverySuggestions: [
      'Use JPG, PNG, or HEIC format',
      'Convert the image to a supported format',
      'Take a new photo with your camera',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.IMAGE_QUALITY_LOW]: {
    category: ErrorCategory.FILE,
    severity: ErrorSeverity.MEDIUM,
    message: 'Image quality is too low for processing',
    userMessage: 'The image quality is too low. Please take a clearer photo of your bill.',
    recoverySuggestions: [
      'Ensure the bill is clearly visible',
      'Use better lighting conditions',
      'Hold the camera steady to avoid blur',
      'Make sure all text is readable',
      'Avoid shadows and glare on the bill',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.CORRUPT_FILE]: {
    category: ErrorCategory.FILE,
    severity: ErrorSeverity.HIGH,
    message: 'File is corrupted or cannot be read',
    userMessage: 'The image file appears to be corrupted. Please take a new photo.',
    recoverySuggestions: [
      'Take a new photo of the bill',
      'Restart your camera app',
      'Check your device storage space',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.DUPLICATE_IMAGE]: {
    category: ErrorCategory.FILE,
    severity: ErrorSeverity.MEDIUM,
    message: 'This image has already been uploaded',
    userMessage: 'You have already uploaded this bill image. Each bill can only be submitted once.',
    recoverySuggestions: [
      'Check your previous uploads',
      'Upload a different bill',
      'Contact support if you believe this is an error',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  // Validation errors
  [BillUploadErrorType.MERCHANT_INVALID]: {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    message: 'Invalid merchant/store name',
    userMessage: 'Please enter a valid merchant or store name.',
    recoverySuggestions: [
      'Enter the name shown on the bill',
      'Merchant name must be at least 2 characters',
      'Use letters and numbers only',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.AMOUNT_INVALID]: {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    message: 'Invalid bill amount',
    userMessage: 'Please enter a valid bill amount.',
    recoverySuggestions: [
      'Amount must be between ₹50 and ₹100,000',
      'Enter numbers only (decimals allowed)',
      'Check the total amount on your bill',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.DATE_INVALID]: {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    message: 'Invalid bill date',
    userMessage: 'Please enter a valid bill date.',
    recoverySuggestions: [
      'Date cannot be in the future',
      'Bill must be less than 30 days old',
      'Enter the date shown on the bill',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.BILL_NUMBER_INVALID]: {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    message: 'Invalid bill number format',
    userMessage: 'Please enter a valid bill number.',
    recoverySuggestions: [
      'Bill number can contain letters, numbers, and hyphens',
      'Must be between 3 and 50 characters',
      'Leave blank if not available on bill',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.REQUIRED_FIELD_MISSING]: {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    message: 'Required field is missing',
    userMessage: 'Please fill in all required fields.',
    recoverySuggestions: [
      'Check that all required fields are filled',
      'Merchant, amount, and date are required',
      'Bill image must be uploaded',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  // Network errors
  [BillUploadErrorType.NETWORK_TIMEOUT]: {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message: 'Upload request timed out',
    userMessage: 'Upload is taking too long. Please check your internet connection and try again.',
    recoverySuggestions: [
      'Check your internet connection',
      'Try connecting to a faster network',
      'Move to an area with better signal',
      'Retry the upload',
    ],
    isRetryable: true,
    requiresUserAction: false,
  },

  [BillUploadErrorType.NETWORK_ERROR]: {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message: 'Network error occurred during upload',
    userMessage: 'A network error occurred. Please check your connection and try again.',
    recoverySuggestions: [
      'Check your internet connection',
      'Enable Wi-Fi or mobile data',
      'Restart your network connection',
      'Try again in a few moments',
    ],
    isRetryable: true,
    requiresUserAction: false,
  },

  [BillUploadErrorType.NO_INTERNET]: {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    message: 'No internet connection',
    userMessage: 'No internet connection detected. Please connect to the internet and try again.',
    recoverySuggestions: [
      'Connect to Wi-Fi or enable mobile data',
      'Check if airplane mode is off',
      'Your upload will be saved and retried automatically',
    ],
    isRetryable: true,
    requiresUserAction: true,
  },

  [BillUploadErrorType.UPLOAD_INTERRUPTED]: {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    message: 'Upload was interrupted',
    userMessage: 'The upload was interrupted. Your progress has been saved.',
    recoverySuggestions: [
      'Tap retry to continue upload',
      'Ensure stable internet connection',
      'Do not close the app during upload',
    ],
    isRetryable: true,
    requiresUserAction: false,
  },

  // Server errors
  [BillUploadErrorType.SERVER_ERROR]: {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.HIGH,
    message: 'Server error occurred',
    userMessage: 'Something went wrong on our end. Please try again later.',
    recoverySuggestions: [
      'Try again in a few minutes',
      'Your data has been saved',
      'Contact support if the problem persists',
    ],
    isRetryable: true,
    requiresUserAction: false,
  },

  [BillUploadErrorType.SERVER_UNAVAILABLE]: {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.CRITICAL,
    message: 'Server is temporarily unavailable',
    userMessage: 'Our servers are temporarily unavailable. Please try again later.',
    recoverySuggestions: [
      'Try again in 15-30 minutes',
      'Check our status page for updates',
      'Your upload will be queued automatically',
    ],
    isRetryable: true,
    requiresUserAction: false,
  },

  [BillUploadErrorType.AUTHENTICATION_FAILED]: {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.HIGH,
    message: 'Authentication failed',
    userMessage: 'Your session has expired. Please log in again.',
    recoverySuggestions: [
      'Log out and log back in',
      'Your data will be saved',
      'Try uploading again after logging in',
    ],
    isRetryable: true,
    requiresUserAction: true,
  },

  [BillUploadErrorType.PERMISSION_DENIED]: {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.HIGH,
    message: 'Permission denied',
    userMessage: 'You do not have permission to upload bills.',
    recoverySuggestions: [
      'Verify your account status',
      'Complete account verification if pending',
      'Contact support for assistance',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  // Rate limiting
  [BillUploadErrorType.RATE_LIMIT]: {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.MEDIUM,
    message: 'Rate limit exceeded',
    userMessage: 'You are uploading too quickly. Please wait a moment before trying again.',
    recoverySuggestions: [
      'Wait 1-2 minutes before retrying',
      'Avoid uploading multiple bills simultaneously',
      'Upload will be automatically retried',
    ],
    isRetryable: true,
    requiresUserAction: false,
  },

  [BillUploadErrorType.DAILY_LIMIT_EXCEEDED]: {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.HIGH,
    message: 'Daily upload limit exceeded',
    userMessage: 'You have reached your daily bill upload limit.',
    recoverySuggestions: [
      'Try again tomorrow',
      'Check your account tier limits',
      'Upgrade your account for higher limits',
      'Contact support if you need assistance',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  // Processing errors
  [BillUploadErrorType.OCR_FAILED]: {
    category: ErrorCategory.PROCESSING,
    severity: ErrorSeverity.MEDIUM,
    message: 'Failed to read bill information',
    userMessage: 'We could not read the bill details. Please enter them manually.',
    recoverySuggestions: [
      'Take a clearer photo of the bill',
      'Ensure all text is visible and readable',
      'Enter bill details manually',
      'Try uploading a different image',
    ],
    isRetryable: true,
    requiresUserAction: false,
  },

  [BillUploadErrorType.VERIFICATION_FAILED]: {
    category: ErrorCategory.PROCESSING,
    severity: ErrorSeverity.HIGH,
    message: 'Bill verification failed',
    userMessage: 'We could not verify your bill. Please ensure all details are correct.',
    recoverySuggestions: [
      'Check that bill details match the image',
      'Ensure the bill is genuine and complete',
      'Upload a clearer image',
      'Contact support if you need help',
    ],
    isRetryable: true,
    requiresUserAction: true,
  },

  [BillUploadErrorType.PROCESSING_TIMEOUT]: {
    category: ErrorCategory.PROCESSING,
    severity: ErrorSeverity.MEDIUM,
    message: 'Bill processing timed out',
    userMessage: 'Processing is taking longer than expected. We will notify you when it is complete.',
    recoverySuggestions: [
      'Check back in a few minutes',
      'You will receive a notification when ready',
      'No need to upload again',
    ],
    isRetryable: false,
    requiresUserAction: false,
  },

  // Business logic errors
  [BillUploadErrorType.DUPLICATE_BILL]: {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.HIGH,
    message: 'This bill has already been uploaded',
    userMessage: 'This bill has already been submitted. Each bill can only be uploaded once.',
    recoverySuggestions: [
      'Check your previous uploads',
      'You cannot submit the same bill twice',
      'Contact support if you believe this is an error',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.BILL_ALREADY_CLAIMED]: {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.HIGH,
    message: 'Bill has already been claimed',
    userMessage: 'This bill has already been claimed for rewards.',
    recoverySuggestions: [
      'This bill cannot be resubmitted',
      'Upload a different bill',
      'Contact support if you have questions',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.MERCHANT_NOT_ELIGIBLE]: {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.HIGH,
    message: 'Merchant not eligible for cashback',
    userMessage: 'This merchant is not eligible for cashback rewards at this time.',
    recoverySuggestions: [
      'Check the list of eligible merchants',
      'Try a bill from a different merchant',
      'Some merchants may have limited-time offers',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.AMOUNT_OUT_OF_RANGE]: {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
    message: 'Bill amount outside acceptable range',
    userMessage: 'The bill amount does not meet the requirements for cashback.',
    recoverySuggestions: [
      'Minimum amount: ₹50',
      'Maximum amount: ₹100,000',
      'Check if the amount is correct',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  [BillUploadErrorType.BILL_TOO_OLD]: {
    category: ErrorCategory.BUSINESS,
    severity: ErrorSeverity.MEDIUM,
    message: 'Bill is too old',
    userMessage: 'This bill is too old to be eligible for cashback.',
    recoverySuggestions: [
      'Bills must be less than 30 days old',
      'Upload a more recent bill',
      'Check the date on your bill',
    ],
    isRetryable: false,
    requiresUserAction: true,
  },

  // Unknown
  [BillUploadErrorType.UNKNOWN_ERROR]: {
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.HIGH,
    message: 'An unexpected error occurred',
    userMessage: 'Something went wrong. Please try again.',
    recoverySuggestions: [
      'Try uploading again',
      'Restart the app if the problem persists',
      'Contact support if you need help',
    ],
    isRetryable: true,
    requiresUserAction: false,
  },
};

/**
 * Get error information for a specific error type
 *
 * @param errorType - The error type
 * @returns Complete error information
 */
export function getErrorInfo(errorType: BillUploadErrorType): BillUploadErrorInfo {
  const baseInfo = BILL_UPLOAD_ERRORS[errorType] || BILL_UPLOAD_ERRORS[BillUploadErrorType.UNKNOWN_ERROR];

  return {
    type: errorType,
    ...baseInfo,
  };
}

/**
 * Create a standardized error object
 *
 * @param errorType - The error type
 * @param technicalDetails - Optional technical details for debugging
 * @returns Error information object
 */
export function createBillUploadError(
  errorType: BillUploadErrorType,
  technicalDetails?: string
): BillUploadErrorInfo {
  const errorInfo = getErrorInfo(errorType);

  return {
    ...errorInfo,
    technicalDetails,
  };
}

/**
 * Map HTTP status code to error type
 *
 * @param statusCode - HTTP status code
 * @returns Appropriate error type
 */
export function mapHttpStatusToError(statusCode: number): BillUploadErrorType {
  switch (statusCode) {
    case 400:
      return BillUploadErrorType.REQUIRED_FIELD_MISSING;
    case 401:
      return BillUploadErrorType.AUTHENTICATION_FAILED;
    case 403:
      return BillUploadErrorType.PERMISSION_DENIED;
    case 409:
      return BillUploadErrorType.DUPLICATE_BILL;
    case 413:
      return BillUploadErrorType.FILE_TOO_LARGE;
    case 415:
      return BillUploadErrorType.INVALID_FORMAT;
    case 422:
      return BillUploadErrorType.VERIFICATION_FAILED;
    case 429:
      return BillUploadErrorType.RATE_LIMIT;
    case 500:
    case 502:
    case 503:
      return BillUploadErrorType.SERVER_ERROR;
    case 504:
      return BillUploadErrorType.NETWORK_TIMEOUT;
    default:
      return BillUploadErrorType.UNKNOWN_ERROR;
  }
}

/**
 * Determine if an error should trigger a retry
 *
 * @param errorType - The error type
 * @returns True if retryable
 */
export function isRetryableError(errorType: BillUploadErrorType): boolean {
  return getErrorInfo(errorType).isRetryable;
}

/**
 * Get user-friendly error message
 *
 * @param errorType - The error type
 * @returns User-friendly message
 */
export function getUserErrorMessage(errorType: BillUploadErrorType): string {
  return getErrorInfo(errorType).userMessage;
}

/**
 * Get recovery suggestions for an error
 *
 * @param errorType - The error type
 * @returns Array of recovery suggestions
 */
export function getRecoverySuggestions(errorType: BillUploadErrorType): string[] {
  return getErrorInfo(errorType).recoverySuggestions;
}
