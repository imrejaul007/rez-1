/**
 * Centralized error catch handler for replacing empty catch blocks.
 *
 * Three variants:
 * - catchAndReport: For data-fetching catches — reports error + sets UI error state
 * - catchAndWarn: For non-critical catches (Linking.openURL, etc.) — logs warning only
 * - catchSilent: For truly ignorable catches (Haptics) — debug-level log only
 */

import { errorReporter } from '@/utils/errorReporter';

/**
 * Handle a caught error by reporting it and setting UI error state.
 * Use this for data-fetching, API calls, and any catch that could leave the UI stuck.
 */
export function catchAndReport(
  e: unknown,
  setError: ((msg: string) => void) | null,
  context: string
): void {
  const msg = e instanceof Error ? e.message : 'Something went wrong';
  if (setError) {
    setError(msg);
  }
  errorReporter.captureError(
    e instanceof Error ? e : new Error(msg),
    { context },
    'error'
  );
}

/**
 * Handle a caught error with a warning log only (no UI state change).
 * Use this for non-critical operations like Linking.openURL, clipboard, share.
 */
export function catchAndWarn(e: unknown, context: string): void {
  const msg = e instanceof Error ? e.message : 'Something went wrong';
  errorReporter.captureError(
    e instanceof Error ? e : new Error(msg),
    { context },
    'warning'
  );
}

/**
 * Handle a caught error with debug-level log only.
 * Use this for truly optional operations like haptic feedback.
 */
export function catchSilent(e: unknown, context: string): void {
  if (__DEV__) {
    console.debug(`[${context}]`, e instanceof Error ? e.message : e);
  }
}
