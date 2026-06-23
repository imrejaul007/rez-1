/**
 * Safe Router Utilities
 *
 * Wraps expo-router navigation methods with try/catch to prevent
 * navigation errors from crashing the app. Use these helpers in
 * components where navigation targets may be dynamic or user-generated.
 *
 * For static/known routes, using router.push directly is fine.
 */

import { router } from 'expo-router';

/**
 * Safely push a new route onto the navigation stack.
 * Logs a warning if navigation fails instead of throwing.
 */
export function safeRouterPush(path: string): void {
  try {
    router.push(path as any);
  } catch (_e) {
    // silently handle
  }
}

/**
 * Safely replace the current route.
 * Logs a warning if navigation fails instead of throwing.
 */
export function safeRouterReplace(path: string): void {
  try {
    router.replace(path as any);
  } catch (_e) {
    // silently handle
  }
}

/**
 * Safely go back in the navigation stack.
 * Falls back to pushing the home route if back() fails.
 */
export function safeRouterBack(): void {
  try {
    router.back();
  } catch (e) {
    try {
      router.replace('/' as any);
    } catch (_e2) {
      // silently handle
    }
  }
}

/**
 * Safely navigate to a route (push with params object).
 * Useful for typed routes with search params.
 */
export function safeRouterNavigate(options: { pathname: string; params?: Record<string, string> }): void {
  try {
    router.push(options as any);
  } catch (_e) {
    // silently handle
  }
}
