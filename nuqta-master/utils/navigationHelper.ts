// Navigation Helper Utilities
// Safe navigation wrapper functions with platform-specific handling

import { Platform } from 'react-native';
import { Href } from 'expo-router';
import {
  NavigationOptions,
  NavigationResult,
  NavigationStatus,
  NavigationErrorType,
  NavigationError,
  NavigationHistoryEntry,
  Platform as PlatformType,
} from '@/types/navigation.types';

/**
 * Get current platform
 */
export const getPlatform = (): PlatformType => {
  return Platform.OS as PlatformType;
};

/**
 * Check if platform is web
 */
export const isWeb = (): boolean => {
  return Platform.OS === 'web';
};

/**
 * Check if platform is mobile
 */
export const isMobile = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android';
};

/**
 * Navigation history manager
 */
class NavigationHistory {
  private history: NavigationHistoryEntry[] = [];
  private maxSize = 50;

  add(entry: NavigationHistoryEntry): void {
    this.history.push(entry);
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }
  }

  getAll(): NavigationHistoryEntry[] {
    return [...this.history];
  }

  getLast(): NavigationHistoryEntry | undefined {
    return this.history[this.history.length - 1];
  }

  clear(): void {
    this.history = [];
  }

  canGoBack(): boolean {
    return this.history.length > 1;
  }
}

// Singleton instance
export const navigationHistory = new NavigationHistory();

/**
 * Default fallback routes by platform
 */
const DEFAULT_FALLBACK_ROUTES: Record<PlatformType, Href> = {
  web: '/' as Href,
  ios: '/(tabs)' as Href,
  android: '/(tabs)' as Href,
};

/**
 * Get default fallback route for current platform
 */
export const getDefaultFallbackRoute = (): Href => {
  return DEFAULT_FALLBACK_ROUTES[getPlatform()];
};

/**
 * Validate route
 */
export const isValidRoute = (route: any): route is Href => {
  if (!route) return false;
  if (typeof route === 'string') return route.length > 0;
  if (typeof route === 'object') {
    return 'pathname' in route && typeof route.pathname === 'string';
  }
  return false;
};

/**
 * Normalize route to string
 */
export const normalizeRoute = (route: Href): string => {
  if (typeof route === 'string') return route;
  if (typeof route === 'object' && 'pathname' in route) {
    return route.pathname as string;
  }
  return '/';
};

/**
 * Check if route requires authentication
 */
export const requiresAuth = (route: string): boolean => {
  const publicRoutes = [
    '/sign-in',
    '/onboarding',
    '/(tabs)',
  ];

  // Exact match for root
  if (route === '/') {
    return false;
  }

  // Check if route starts with any public route
  return !publicRoutes.some(publicRoute => route.startsWith(publicRoute));
};

/**
 * Resolve deep link to route
 */
export const resolveDeepLink = (url: string): Href | null => {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    const params: Record<string, any> = {};

    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    if (Object.keys(params).length > 0) {
      return {
        pathname: path,
        params,
      } as Href;
    }

    return path as Href;
  } catch (error) {
    return null;
  }
};

/**
 * Build route with parameters
 */
export const buildRoute = (
  path: string,
  params?: Record<string, any>
): Href => {
  if (!params || Object.keys(params).length === 0) {
    return path as Href;
  }

  return {
    pathname: path,
    params,
  } as Href;
};

/**
 * Get route name from path
 */
export const getRouteName = (path: string): string => {
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || 'home';
};

/**
 * Check if browser supports history API
 */
export const supportsHistoryAPI = (): boolean => {
  if (!isWeb()) return false;
  return typeof window !== 'undefined' &&
         typeof window.history !== 'undefined' &&
         typeof window.history.pushState === 'function';
};

/**
 * Handle web browser back button
 */
export const handleBrowserBack = (callback: () => void): (() => void) => {
  if (!isWeb() || !supportsHistoryAPI()) {
    return () => {};
  }

  const handlePopState = () => {
    callback();
  };

  window.addEventListener('popstate', handlePopState);

  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
};

/**
 * Safe delay helper
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 100
): Promise<T> => {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts - 1) {
        const delayMs = baseDelay * Math.pow(2, attempt);
        await delay(delayMs);
      }
    }
  }

  throw lastError || new Error('Max retry attempts reached');
};

/**
 * Sanitize route path
 */
export const sanitizeRoute = (route: string): string => {
  // Remove double slashes
  let sanitized = route.replace(/\/+/g, '/');

  // Ensure starts with /
  if (!sanitized.startsWith('/')) {
    sanitized = '/' + sanitized;
  }

  // Remove trailing slash (except for root)
  if (sanitized.length > 1 && sanitized.endsWith('/')) {
    sanitized = sanitized.slice(0, -1);
  }

  return sanitized;
};

/**
 * Check if two routes are equal
 */
export const routesEqual = (route1: Href, route2: Href): boolean => {
  const normalized1 = normalizeRoute(route1);
  const normalized2 = normalizeRoute(route2);
  return sanitizeRoute(normalized1) === sanitizeRoute(normalized2);
};

/**
 * Get parent route
 */
export const getParentRoute = (route: string): string | null => {
  const sanitized = sanitizeRoute(route);
  const segments = sanitized.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  segments.pop();
  return '/' + segments.join('/');
};

/**
 * Check if route is a modal
 */
export const isModalRoute = (route: string): boolean => {
  // Modal routes typically contain certain patterns
  return route.includes('/modal') || route.includes('?modal=true');
};

/**
 * Create navigation result
 */
export const createNavigationResult = (
  status: NavigationStatus,
  route?: string,
  error?: Error,
  fallbackUsed?: boolean
): NavigationResult => {
  return {
    status,
    route,
    error,
    fallbackUsed,
  };
};

/**
 * Create navigation error
 */
export const createNavigationError = (
  type: NavigationErrorType,
  message: string,
  route?: string,
  originalError?: Error
): NavigationError => {
  return new NavigationError(type, message, route, originalError);
};

/**
 * Log navigation event
 */
export const logNavigation = (
  method: string,
  route: string,
  success: boolean,
  error?: Error
): void => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    method,
    route,
    success,
    platform: getPlatform(),
    error: error?.message,
  };

  if (__DEV__) {

  }

  // Here you can add analytics tracking
  // trackNavigationEvent(logData);
};

/**
 * Get safe fallback route chain
 */
export const getFallbackChain = (currentRoute: string): Href[] => {
  const fallbacks: Href[] = [];

  // Try parent route
  const parent = getParentRoute(currentRoute);
  if (parent) {
    fallbacks.push(parent as Href);
  }

  // Try common fallbacks
  fallbacks.push('/profile' as Href);
  fallbacks.push('/(tabs)' as Href);
  fallbacks.push('/' as Href);

  return fallbacks;
};

/**
 * Wait for condition with timeout
 */
export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return true;
    }
    await delay(interval);
  }

  return false;
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T => {
  let lastCall = 0;

  return ((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn(...args);
    }
  }) as T;
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: any[]) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  }) as T;
};
