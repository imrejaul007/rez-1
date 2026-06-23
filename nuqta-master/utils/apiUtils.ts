// API Utilities
// Enhanced utilities for API error handling, retry logic, and response standardization

export interface StandardApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatuses: number[];
  backoffMultiplier: number;
}

export interface TimeoutConfig {
  timeout: number;
  timeoutMessage?: string;
}

// Default configurations
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  backoffMultiplier: 2,
};

export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  timeout: 30000,
  timeoutMessage: 'Request timeout - Please try again',
};

/**
 * Retry wrapper for async functions
 * Implements exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const {
    maxRetries,
    retryDelay,
    retryableStatuses,
    backoffMultiplier,
  } = { ...DEFAULT_RETRY_CONFIG, ...config };

  // If maxRetries is 0, just execute once without retry logic
  if (maxRetries === 0) {
    return await fn();
  }

  let lastError: Error;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      attempt++;

      // Check if error is retryable
      const isRetryable =
        error?.status &&
        retryableStatuses.includes(error.status);

      if (!isRetryable || attempt >= maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = retryDelay * Math.pow(backoffMultiplier, attempt - 1);

      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Timeout wrapper for async functions
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  config: Partial<TimeoutConfig> = {}
): Promise<T> {
  const { timeout, timeoutMessage } = {
    ...DEFAULT_TIMEOUT_CONFIG,
    ...config,
  };

  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(timeoutMessage || 'Request timeout')
          ),
        timeout
      )
    ),
  ]);
}

/**
 * Combined retry + timeout wrapper
 */
export async function withRetryAndTimeout<T>(
  fn: () => Promise<T>,
  retryConfig: Partial<RetryConfig> = {},
  timeoutConfig: Partial<TimeoutConfig> = {}
): Promise<T> {
  return withRetry(
    () => withTimeout(fn, timeoutConfig),
    retryConfig
  );
}

/**
 * Standardize API response format
 */
export function standardizeResponse<T>(
  response: any
): StandardApiResponse<T> {
  // Already standardized
  if (
    response &&
    typeof response === 'object' &&
    'success' in response
  ) {
    return {
      success: response.success,
      data: response.data,
      error: response.error,
      message: response.message,
      errors: response.errors,
      timestamp: response.timestamp || new Date().toISOString(),
    };
  }

  // Non-standard success response
  return {
    success: true,
    data: response,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: any,
  defaultMessage: string = 'An error occurred'
): StandardApiResponse {
  // Handle null/undefined
  if (!error) {
    return {
      success: false,
      error: defaultMessage,
      message: defaultMessage,
      timestamp: new Date().toISOString(),
    };
  }

  // Handle empty object - check if it's a plain object with no message
  const errorMessage = error?.message || error?.error || null;

  // If error is an object with no useful message, use default
  if (!errorMessage && typeof error === 'object') {
    // Check if toString gives us something useful (not just "[object Object]")
    const toStringResult = error.toString?.();
    if (toStringResult && toStringResult !== '[object Object]') {
      return {
        success: false,
        error: toStringResult,
        message: toStringResult,
        errors: error?.errors,
        timestamp: new Date().toISOString(),
      };
    }

    // Use default message for empty objects
    return {
      success: false,
      error: defaultMessage,
      message: defaultMessage,
      errors: error?.errors,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: false,
    error: errorMessage || defaultMessage,
    message: errorMessage || defaultMessage,
    errors: error?.errors,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate API response structure
 */
export function validateResponse<T>(
  response: any,
  requiredFields: string[] = []
): response is StandardApiResponse<T> {
  if (!response || typeof response !== 'object') {
    return false;
  }

  if (!('success' in response)) {
    return false;
  }

  if (response.success && requiredFields.length > 0) {
    const data = response.data;
    if (!data || typeof data !== 'object') {
      return false;
    }

    for (const field of requiredFields) {
      if (!(field in data)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T>(
  json: string,
  defaultValue: T
): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: any): boolean {
  return (
    error?.message?.includes('Network') ||
    error?.message?.includes('Failed to fetch') ||
    error?.name === 'NetworkError' ||
    error?.code === 'ECONNREFUSED' ||
    error?.code === 'ENOTFOUND'
  );
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: any): boolean {
  return (
    error?.name === 'AbortError' ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('Timeout') ||
    error?.code === 'ETIMEDOUT'
  );
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(
  error: any
): string {
  if (isNetworkError(error)) {
    return 'Network connection error. Please check your internet connection.';
  }

  if (isTimeoutError(error)) {
    return 'Request timed out. Please try again.';
  }

  if (error?.status === 401) {
    return 'Authentication required. Please log in again.';
  }

  if (error?.status === 403) {
    return 'You do not have permission to access this resource.';
  }

  if (error?.status === 404) {
    return 'Resource not found.';
  }

  if (error?.status === 429) {
    return 'Too many requests. Please try again later.';
  }

  if (error?.status >= 500) {
    return 'Server error. Please try again later.';
  }

  return (
    error?.message ||
    error?.error ||
    'An unexpected error occurred. Please try again.'
  );
}

/**
 * Sleep utility for delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create abort controller with timeout
 */
export function createAbortController(
  timeout: number
): {
  controller: AbortController;
  timeoutId: NodeJS.Timeout;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    timeout
  );

  return { controller, timeoutId };
}

/**
 * Log API request for debugging
 */
export function logApiRequest(
  _method: string,
  _url: string,
  _data?: any
): void {
  // Silenced - enable __DEV__ guard if needed for debugging
}

/**
 * Log API response for debugging
 */
export function logApiResponse(
  _method: string,
  _url: string,
  _response: any,
  _duration: number
): void {
  // Silenced - enable __DEV__ guard if needed for debugging
}

/**
 * Parse query parameters
 */
export function parseQueryParams(
  params: Record<string, any>
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) =>
          searchParams.append(key, String(v))
        );
      } else {
        searchParams.append(key, String(value));
      }
    }
  });

  return searchParams.toString();
}

/**
 * Merge partial responses (useful for pagination)
 */
export function mergeResponses<T>(
  responses: StandardApiResponse<T>[]
): StandardApiResponse<T[]> {
  const successfulResponses = responses.filter(
    (r) => r.success
  );

  if (successfulResponses.length === 0) {
    return {
      success: false,
      error: 'All requests failed',
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: true,
    data: successfulResponses
      .map((r) => r.data)
      .filter((d): d is T => d !== undefined),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private queue: Array<() => void> = [];
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForSlot();
    this.requestCount++;
    return fn();
  }

  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    const timeElapsed = now - this.windowStart;

    if (timeElapsed > this.windowMs) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    if (this.requestCount >= this.maxRequests) {
      const waitTime =
        this.windowMs - timeElapsed;
      await sleep(waitTime);
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
  }
}

/**
 * Batch request executor
 */
export async function executeBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number = 5,
  delayBetweenBatches: number = 100
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(fn)
    );
    results.push(...batchResults);

    // Delay between batches
    if (i + batchSize < items.length) {
      await sleep(delayBetweenBatches);
    }
  }

  return results;
}
