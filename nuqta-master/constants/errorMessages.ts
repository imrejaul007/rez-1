/**
 * Error Messages Configuration
 *
 * Centralized error messages for consistent UX across the app.
 * Messages are user-friendly and provide actionable guidance.
 *
 * @module errorMessages
 */

// ============================================================================
// Network Errors
// ============================================================================

export const NETWORK_ERRORS = {
  NO_CONNECTION: {
    title: 'No Internet Connection',
    message: 'Please check your internet connection and try again.',
    action: 'Check Connection',
  },
  TIMEOUT: {
    title: 'Request Timed Out',
    message: 'The request took too long. Please try again.',
    action: 'Try Again',
  },
  SERVER_ERROR: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
    action: 'Try Again',
  },
  RATE_LIMIT: {
    title: 'Too Many Requests',
    message: 'Please wait a moment before trying again.',
    action: 'Wait and Retry',
  },
} as const;

// ============================================================================
// Authentication Errors
// ============================================================================

export const AUTH_ERRORS = {
  UNAUTHORIZED: {
    title: 'Sign In Required',
    message: 'Please sign in to continue.',
    action: 'Sign In',
  },
  SESSION_EXPIRED: {
    title: 'Session Expired',
    message: 'Your session has expired. Please sign in again.',
    action: 'Sign In',
  },
  INVALID_CREDENTIALS: {
    title: 'Invalid Credentials',
    message: 'The email or password you entered is incorrect.',
    action: 'Try Again',
  },
  FORBIDDEN: {
    title: 'Access Denied',
    message: "You don't have permission to access this resource.",
    action: 'Go Back',
  },
} as const;

// ============================================================================
// Validation Errors
// ============================================================================

export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_PASSWORD: 'Password must be at least 8 characters',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  INVALID_OTP: 'Please enter a valid OTP',
  INVALID_FORMAT: 'Invalid format',
  TOO_SHORT: 'Value is too short',
  TOO_LONG: 'Value is too long',
  INVALID_NUMBER: 'Please enter a valid number',
  INVALID_URL: 'Please enter a valid URL',
  INVALID_DATE: 'Please enter a valid date',
} as const;

// ============================================================================
// Resource Errors
// ============================================================================

export const RESOURCE_ERRORS = {
  NOT_FOUND: {
    title: 'Not Found',
    message: 'The requested resource was not found.',
    action: 'Go Back',
  },
  ALREADY_EXISTS: {
    title: 'Already Exists',
    message: 'This resource already exists.',
    action: 'Update Instead',
  },
  CONFLICT: {
    title: 'Conflict',
    message: 'This action conflicts with the current state.',
    action: 'Refresh and Try Again',
  },
} as const;

// ============================================================================
// Feature-Specific Errors
// ============================================================================

export const CART_ERRORS = {
  EMPTY_CART: {
    title: 'Empty Cart',
    message: 'Your cart is empty. Add some items to continue.',
    action: 'Browse Products',
  },
  OUT_OF_STOCK: {
    title: 'Out of Stock',
    message: 'Some items in your cart are out of stock.',
    action: 'Update Cart',
  },
  QUANTITY_EXCEEDED: {
    title: 'Quantity Limit Exceeded',
    message: 'You have reached the maximum quantity for this item.',
    action: 'Update Quantity',
  },
  PRICE_CHANGED: {
    title: 'Price Changed',
    message: 'The price of some items has changed.',
    action: 'Review Cart',
  },
} as const;

export const PAYMENT_ERRORS = {
  PAYMENT_FAILED: {
    title: 'Payment Failed',
    message: 'Your payment could not be processed. Please try again.',
    action: 'Try Again',
  },
  INVALID_CARD: {
    title: 'Invalid Card',
    message: 'The card information you entered is invalid.',
    action: 'Update Card',
  },
  INSUFFICIENT_FUNDS: {
    title: 'Insufficient Funds',
    message: 'Your card has insufficient funds.',
    action: 'Use Different Card',
  },
  PAYMENT_DECLINED: {
    title: 'Payment Declined',
    message: 'Your payment was declined. Please try another payment method.',
    action: 'Try Another Method',
  },
} as const;

export const UPLOAD_ERRORS = {
  FILE_TOO_LARGE: {
    title: 'File Too Large',
    message: 'The file you selected is too large. Maximum size is {maxSize}.',
    action: 'Select Smaller File',
  },
  INVALID_FILE_TYPE: {
    title: 'Invalid File Type',
    message: 'This file type is not supported. Please select {allowedTypes}.',
    action: 'Select Different File',
  },
  UPLOAD_FAILED: {
    title: 'Upload Failed',
    message: 'Failed to upload the file. Please try again.',
    action: 'Try Again',
  },
  NO_FILE_SELECTED: {
    title: 'No File Selected',
    message: 'Please select a file to upload.',
    action: 'Select File',
  },
} as const;

export const LOCATION_ERRORS = {
  PERMISSION_DENIED: {
    title: 'Location Permission Denied',
    message: 'Please enable location permissions in your device settings.',
    action: 'Open Settings',
  },
  LOCATION_UNAVAILABLE: {
    title: 'Location Unavailable',
    message: 'Unable to determine your location. Please try again.',
    action: 'Try Again',
  },
  LOCATION_TIMEOUT: {
    title: 'Location Timeout',
    message: 'Location request timed out. Please try again.',
    action: 'Try Again',
  },
} as const;

// ============================================================================
// Generic Errors
// ============================================================================

export const GENERIC_ERRORS = {
  UNKNOWN: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    action: 'Try Again',
  },
  MAINTENANCE: {
    title: 'Under Maintenance',
    message: 'The app is currently under maintenance. Please check back later.',
    action: 'OK',
  },
  UPDATE_REQUIRED: {
    title: 'Update Required',
    message: 'Please update the app to continue.',
    action: 'Update Now',
  },
  FEATURE_UNAVAILABLE: {
    title: 'Feature Unavailable',
    message: 'This feature is currently unavailable.',
    action: 'Go Back',
  },
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  SAVED: 'Saved successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  SENT: 'Sent successfully',
  COPIED: 'Copied to clipboard',
  SHARED: 'Shared successfully',
  UPLOADED: 'Uploaded successfully',
  DOWNLOADED: 'Downloaded successfully',
  ADDED_TO_CART: 'Added to cart',
  REMOVED_FROM_CART: 'Removed from cart',
  ADDED_TO_WISHLIST: 'Added to wishlist',
  REMOVED_FROM_WISHLIST: 'Removed from wishlist',
  ORDER_PLACED: 'Order placed successfully',
  PAYMENT_SUCCESS: 'Payment successful',
  REVIEW_SUBMITTED: 'Review submitted successfully',
  SUBSCRIPTION_ACTIVATED: 'Subscription activated',
  SUBSCRIPTION_CANCELLED: 'Subscription cancelled',
} as const;

// ============================================================================
// Info Messages
// ============================================================================

export const INFO_MESSAGES = {
  LOADING: 'Loading...',
  SYNCING: 'Syncing...',
  SAVING: 'Saving...',
  UPLOADING: 'Uploading...',
  DOWNLOADING: 'Downloading...',
  PROCESSING: 'Processing...',
  PLEASE_WAIT: 'Please wait...',
  OFFLINE_MODE: 'You are offline. Changes will sync when you reconnect.',
  NO_RESULTS: 'No results found',
  NO_DATA: 'No data available',
  EMPTY_LIST: 'Nothing here yet',
  COMING_SOON: 'Coming soon',
} as const;

// ============================================================================
// Confirmation Messages
// ============================================================================

export const CONFIRMATION_MESSAGES = {
  DELETE_ITEM: 'Are you sure you want to delete this item?',
  DELETE_ACCOUNT: 'Are you sure you want to delete your account? This action cannot be undone.',
  REMOVE_FROM_CART: 'Remove this item from your cart?',
  CANCEL_ORDER: 'Are you sure you want to cancel this order?',
  LOGOUT: 'Are you sure you want to log out?',
  DISCARD_CHANGES: 'Discard unsaved changes?',
  CLEAR_CART: 'Clear all items from your cart?',
  CANCEL_SUBSCRIPTION: 'Cancel your subscription?',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format error message with variables
 */
export function formatErrorMessage(message: string, variables: Record<string, string>): string {
  let formatted = message;
  Object.entries(variables).forEach(([key, value]) => {
    formatted = formatted.replace(`{${key}}`, value);
  });
  return formatted;
}

/**
 * Get error message by code
 */
export function getErrorMessage(errorCode: string): string {
  // Search through all error categories
  const allErrors = {
    ...NETWORK_ERRORS,
    ...AUTH_ERRORS,
    ...VALIDATION_ERRORS,
    ...RESOURCE_ERRORS,
    ...CART_ERRORS,
    ...PAYMENT_ERRORS,
    ...UPLOAD_ERRORS,
    ...LOCATION_ERRORS,
    ...GENERIC_ERRORS,
  };

  const error = allErrors[errorCode as keyof typeof allErrors];
  if (error && typeof error === 'object' && 'message' in error) {
    return error.message;
  }

  return GENERIC_ERRORS.UNKNOWN.message;
}

// ============================================================================
// Export All
// ============================================================================

export default {
  NETWORK_ERRORS,
  AUTH_ERRORS,
  VALIDATION_ERRORS,
  RESOURCE_ERRORS,
  CART_ERRORS,
  PAYMENT_ERRORS,
  UPLOAD_ERRORS,
  LOCATION_ERRORS,
  GENERIC_ERRORS,
  SUCCESS_MESSAGES,
  INFO_MESSAGES,
  CONFIRMATION_MESSAGES,
  formatErrorMessage,
  getErrorMessage,
};
