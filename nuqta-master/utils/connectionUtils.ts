/**
 * Connection Utilities
 * Helper functions for managing API connectivity and error handling
 */

import { Platform } from 'react-native';
import { API_CONFIG } from '@/config/env';

// True when running in a development build. In production builds, dev-only
// error suggestions (e.g. "Run: cd user-backend && npm run dev") are
// suppressed so end users never see internal developer instructions.
const IS_DEV = process.env.EXPO_PUBLIC_ENVIRONMENT !== 'production' && __DEV__;

export interface ConnectionStatus {
  isConnected: boolean;
  isReachable: boolean;
  error: string | null;
  latency: number | null;
  timestamp: number;
}

export interface ConnectionError {
  type: 'NETWORK_ERROR' | 'TIMEOUT' | 'SERVER_ERROR' | 'REFUSED' | 'NOT_FOUND' | 'UNKNOWN';
  message: string;
  originalError: any;
  suggestions: string[];
}

/**
 * URLs for API reachability checks. Prefer /status (gateway) over /health
 * because browser ad blockers often block paths containing "health".
 */
export function getConnectivityPingUrls(apiBaseUrl: string): string[] {
  const origin = apiBaseUrl.replace(/\/api\/?$/, '');
  // On web, only use /status — ad blockers flag paths containing "health".
  if (Platform.OS === 'web') {
    return [`${origin}/status`];
  }
  return [`${origin}/status`, `${origin}/api/health`, `${origin}/health`];
}

/**
 * Check if backend API is reachable
 */
export async function checkBackendConnectivity(): Promise<ConnectionStatus> {
  const startTime = Date.now();

  try {
    const pingUrls = getConnectivityPingUrls(API_CONFIG.baseUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response: Response | null = null;
    for (const healthUrl of pingUrls) {
      try {
        const attempt = await fetch(healthUrl, {
          method: 'GET',
          signal: controller.signal,
        });
        if (attempt.ok) {
          response = attempt;
          break;
        }
      } catch {
        // try next URL
      }
    }

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (response?.ok) {

      return {
        isConnected: true,
        isReachable: true,
        error: null,
        latency,
        timestamp: Date.now(),
      };
    } else {
      return {
        isConnected: true,
        isReachable: false,
        error: response
          ? `Server responded with status ${response.status}`
          : 'Server unreachable',
        latency,
        timestamp: Date.now(),
      };
    }
  } catch (error: any) {
    const latency = Date.now() - startTime;

    return {
      isConnected: false,
      isReachable: false,
      error: error.message || 'Connection failed',
      latency,
      timestamp: Date.now(),
    };
  }
}

/**
 * Parse connection error and provide helpful suggestions
 */
export function parseConnectionError(error: any): ConnectionError {
  const errorMessage = error?.message || String(error);

  // Network connection refused (backend not running)
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
    return {
      type: 'REFUSED',
      message: 'Cannot connect to server. Please check your internet connection and try again.',
      originalError: error,
      // Dev-only suggestions include internal commands and config details
      // that should never reach production end users.
      suggestions: IS_DEV
        ? [
            'Make sure the backend server is running',
            `Check if backend is running on ${API_CONFIG.baseUrl}`,
            'Run: cd user-backend && npm run dev',
            'Verify the PORT in backend .env file matches frontend configuration',
          ]
        : [
            'Please check your internet connection.',
            'Our servers may be temporarily unavailable. Please try again in a moment.',
          ],
    };
  }

  // Timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
    return {
      type: 'TIMEOUT',
      message: 'Request timed out',
      originalError: error,
      suggestions: [
        'Backend server might be slow to respond',
        'Check your network connection',
        'Increase timeout in API configuration',
        'Verify backend server is not overloaded',
      ],
    };
  }

  // Network error
  if (errorMessage.includes('Network request failed') || errorMessage.includes('Failed to fetch')) {
    return {
      type: 'NETWORK_ERROR',
      message: 'Network request failed',
      originalError: error,
      suggestions: [
        'Check your internet connection',
        'Backend server might be offline',
        Platform.OS !== 'web'
          ? 'For Android emulator, make sure backend URL uses 10.0.2.2 instead of localhost'
          : 'Verify backend URL is correct',
        'Check firewall settings',
      ],
    };
  }

  // 404 Not Found
  if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
    return {
      type: 'NOT_FOUND',
      message: 'The requested resource was not found.',
      originalError: error,
      suggestions: IS_DEV
        ? [
            'Verify the API endpoint URL is correct',
            'Backend route might not be registered',
            'Check backend route configuration',
          ]
        : [
            'Please try refreshing the app.',
            'If the issue persists, please contact support.',
          ],
    };
  }

  // Server error (5xx)
  if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
    return {
      type: 'SERVER_ERROR',
      message: 'Something went wrong on our end. Please try again in a moment.',
      originalError: error,
      suggestions: IS_DEV
        ? [
            'Backend server encountered an error',
            'Check backend server logs for details',
            'Verify database connection',
            'Contact backend developer',
          ]
        : [
            'Please try again in a few moments.',
            'If the issue persists, please contact support.',
          ],
    };
  }

  // Unknown error
  return {
    type: 'UNKNOWN',
    // In production, hide the raw error message — it may contain
    // stack traces or internal details. Show a generic message instead.
    message: IS_DEV ? errorMessage : 'An unexpected error occurred. Please try again.',
    originalError: error,
    suggestions: IS_DEV
      ? [
          'Check console logs for more details',
          'Verify backend configuration',
          'Contact support if issue persists',
        ]
      : [
          'Please try again in a few moments.',
          'If the issue persists, please contact support.',
        ],
  };
}

/**
 * Format connection error for user display
 */
export function formatConnectionError(error: ConnectionError): string {
  let message = `❌ ${error.message}\n\n`;

  if (error.suggestions.length > 0) {
    message += 'Suggestions:\n';
    error.suggestions.forEach((suggestion, index) => {
      message += `${index + 1}. ${suggestion}\n`;
    });
  }

  return message;
}

/**
 * Get platform-specific API URL
 * Handles localhost conversion for mobile platforms
 */
export function getPlatformApiUrl(): string {
  const baseUrl = API_CONFIG.baseUrl;

  // For web, use as-is
  if (Platform.OS === 'web') {
    return baseUrl;
  }

  // For Android emulator, replace localhost with 10.0.2.2
  if (Platform.OS === 'android' && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
    return baseUrl
      .replace('localhost', '10.0.2.2')
      .replace('127.0.0.1', '10.0.2.2');
  }

  // For iOS simulator, localhost works fine
  return baseUrl;
}

/**
 * Log connection info for debugging
 */
export function logConnectionInfo(): void {
}

/**
 * Retry connection with exponential backoff
 */
export async function retryConnection<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {

      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Check if error is a connection error
 */
export function isConnectionError(error: any): boolean {
  const errorMessage = error?.message || String(error);
  return (
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('ERR_CONNECTION_REFUSED') ||
    errorMessage.includes('Network request failed') ||
    errorMessage.includes('Failed to fetch') ||
    errorMessage.includes('timeout')
  );
}

export default {
  checkBackendConnectivity,
  getConnectivityPingUrls,
  parseConnectionError,
  formatConnectionError,
  getPlatformApiUrl,
  logConnectionInfo,
  retryConnection,
  isConnectionError,
};
