/**
 * Network Error Handler
 *
 * Classifies and handles network errors with user-friendly messages
 * and actionable suggestions.
 *
 * @module networkErrorHandler
 */

import { Platform } from 'react-native';
import { errorReporter } from './errorReporter';

// ============================================================================
// Type Definitions
// ============================================================================

export type NetworkErrorType =
  | 'NO_INTERNET'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'CLIENT_ERROR'
  | 'RATE_LIMIT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN';

export interface NetworkErrorInfo {
  type: NetworkErrorType;
  message: string;
  userMessage: string;
  suggestions: string[];
  isRetryable: boolean;
  statusCode?: number;
  originalError?: any;
}

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  NO_INTERNET: 'Unable to connect. Please check your internet connection.',
  TIMEOUT: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
  CLIENT_ERROR: 'There was a problem with your request.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  UNAUTHORIZED: 'Please sign in to continue.',
  FORBIDDEN: "You don't have permission to access this resource.",
  NOT_FOUND: 'The requested resource was not found.',
  BAD_REQUEST: 'Invalid request. Please check your input and try again.',
  CONFLICT: 'This action conflicts with the current state.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  UNKNOWN: 'An unexpected error occurred. Please try again.',
} as const;

// ============================================================================
// Error Handler Functions
// ============================================================================

/**
 * Handle network error and return user-friendly information
 */
export function handleNetworkError(error: any): NetworkErrorInfo {
  const errorInfo = classifyError(error);

  // Log error to error reporter
  errorReporter.captureError(
    error instanceof Error ? error : new Error(String(error)),
    {
      context: 'networkErrorHandler',
      metadata: {
        type: errorInfo.type,
        statusCode: errorInfo.statusCode,
      },
    }
  );

  return errorInfo;
}

/**
 * Classify error and determine type
 */
export function classifyError(error: any): NetworkErrorInfo {
  const errorMessage = error?.message?.toLowerCase() || '';
  const statusCode = error?.response?.status || error?.status;

  // No internet connection
  if (isNoInternetError(error)) {
    return {
      type: 'NO_INTERNET',
      message: 'No internet connection',
      userMessage: ERROR_MESSAGES.NO_INTERNET,
      suggestions: [
        'Check your WiFi or mobile data connection',
        'Try switching between WiFi and mobile data',
        'Move to an area with better reception',
      ],
      isRetryable: true,
      originalError: error,
    };
  }

  // Timeout error
  if (isTimeoutError(error)) {
    return {
      type: 'TIMEOUT',
      message: 'Request timeout',
      userMessage: ERROR_MESSAGES.TIMEOUT,
      suggestions: [
        'Check your internet connection',
        'Try again in a moment',
        'The server might be experiencing high load',
      ],
      isRetryable: true,
      originalError: error,
    };
  }

  // HTTP Status Code errors
  if (statusCode) {
    return classifyHttpError(statusCode, error);
  }

  // Unknown error
  return {
    type: 'UNKNOWN',
    message: errorMessage || 'Unknown error',
    userMessage: ERROR_MESSAGES.UNKNOWN,
    suggestions: [
      'Try again in a moment',
      'Check your internet connection',
      'Contact support if the problem persists',
    ],
    isRetryable: true,
    originalError: error,
  };
}

/**
 * Classify HTTP error by status code
 */
function classifyHttpError(statusCode: number, error: any): NetworkErrorInfo {
  const errorMessage = error?.response?.data?.message || error?.message || '';

  // 400 Bad Request
  if (statusCode === 400) {
    return {
      type: 'BAD_REQUEST',
      message: errorMessage || 'Bad request',
      userMessage: ERROR_MESSAGES.BAD_REQUEST,
      suggestions: [
        'Check that all required fields are filled',
        'Verify the format of your input',
        'Contact support if the problem persists',
      ],
      isRetryable: false,
      statusCode,
      originalError: error,
    };
  }

  // 401 Unauthorized
  if (statusCode === 401) {
    return {
      type: 'UNAUTHORIZED',
      message: errorMessage || 'Unauthorized',
      userMessage: ERROR_MESSAGES.UNAUTHORIZED,
      suggestions: [
        'Sign in to continue',
        'Your session may have expired',
        'Check your account credentials',
      ],
      isRetryable: false,
      statusCode,
      originalError: error,
    };
  }

  // 403 Forbidden
  if (statusCode === 403) {
    return {
      type: 'FORBIDDEN',
      message: errorMessage || 'Forbidden',
      userMessage: ERROR_MESSAGES.FORBIDDEN,
      suggestions: [
        'You may not have permission for this action',
        'Contact support for access',
        'Verify your account permissions',
      ],
      isRetryable: false,
      statusCode,
      originalError: error,
    };
  }

  // 404 Not Found
  if (statusCode === 404) {
    return {
      type: 'NOT_FOUND',
      message: errorMessage || 'Not found',
      userMessage: ERROR_MESSAGES.NOT_FOUND,
      suggestions: [
        'The item may have been removed',
        'Check the URL or search again',
        'Go back and try a different route',
      ],
      isRetryable: false,
      statusCode,
      originalError: error,
    };
  }

  // 409 Conflict
  if (statusCode === 409) {
    return {
      type: 'CONFLICT',
      message: errorMessage || 'Conflict',
      userMessage: ERROR_MESSAGES.CONFLICT,
      suggestions: [
        'Refresh the page and try again',
        'The data may have been updated by another user',
        'Check for duplicate entries',
      ],
      isRetryable: true,
      statusCode,
      originalError: error,
    };
  }

  // 422 Validation Error
  if (statusCode === 422) {
    return {
      type: 'VALIDATION_ERROR',
      message: errorMessage || 'Validation error',
      userMessage: ERROR_MESSAGES.VALIDATION_ERROR,
      suggestions: [
        'Check that all fields are filled correctly',
        'Verify the format of your input',
        'Review any error messages shown',
      ],
      isRetryable: false,
      statusCode,
      originalError: error,
    };
  }

  // 429 Rate Limit
  if (statusCode === 429) {
    return {
      type: 'RATE_LIMIT',
      message: errorMessage || 'Rate limit exceeded',
      userMessage: ERROR_MESSAGES.RATE_LIMIT,
      suggestions: [
        'Wait a moment before trying again',
        'You may be making requests too quickly',
        'Try again in a few minutes',
      ],
      isRetryable: true,
      statusCode,
      originalError: error,
    };
  }

  // 5xx Server Error
  if (statusCode >= 500) {
    return {
      type: 'SERVER_ERROR',
      message: errorMessage || 'Server error',
      userMessage: ERROR_MESSAGES.SERVER_ERROR,
      suggestions: [
        'Try again in a moment',
        'The server is experiencing issues',
        'Contact support if the problem persists',
      ],
      isRetryable: true,
      statusCode,
      originalError: error,
    };
  }

  // Other 4xx Client Errors
  if (statusCode >= 400 && statusCode < 500) {
    return {
      type: 'CLIENT_ERROR',
      message: errorMessage || 'Client error',
      userMessage: ERROR_MESSAGES.CLIENT_ERROR,
      suggestions: [
        'Check your request and try again',
        'Contact support if the problem persists',
      ],
      isRetryable: false,
      statusCode,
      originalError: error,
    };
  }

  // Unknown status code
  return {
    type: 'UNKNOWN',
    message: errorMessage || 'Unknown error',
    userMessage: ERROR_MESSAGES.UNKNOWN,
    suggestions: [
      'Try again in a moment',
      'Contact support if the problem persists',
    ],
    isRetryable: true,
    statusCode,
    originalError: error,
  };
}

// ============================================================================
// Error Detection Functions
// ============================================================================

/**
 * Check if error is a no internet error
 */
export function isNoInternetError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';

  return (
    errorMessage.includes('network request failed') ||
    errorMessage.includes('failed to fetch') ||
    errorMessage.includes('no internet') ||
    errorMessage.includes('offline') ||
    errorCode === 'network_error' ||
    errorCode === 'enotfound'
  );
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorName = error?.name?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';

  return (
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorName === 'timeouterror' ||
    errorName === 'aborterror' ||
    errorCode === 'econnaborted' ||
    error?.response?.status === 408
  );
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const errorInfo = classifyError(error);
  return errorInfo.isRetryable;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: any): string {
  const errorInfo = classifyError(error);
  return errorInfo.userMessage;
}

/**
 * Get error suggestions
 */
export function getErrorSuggestions(error: any): string[] {
  const errorInfo = classifyError(error);
  return errorInfo.suggestions;
}

// ============================================================================
// Export
// ============================================================================

export default {
  handleNetworkError,
  classifyError,
  isNoInternetError,
  isTimeoutError,
  isRetryableError,
  getUserFriendlyMessage,
  getErrorSuggestions,
  ERROR_MESSAGES,
};
