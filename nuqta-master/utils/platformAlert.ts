/**
 * Platform Alert Utility
 *
 * Provides unified alert functionality across web and React Native platforms.
 *
 * Web behavior:
 * - Uses the in-app modal rendered by `CrossPlatformAlertRenderer` (mounted
 *   once at the app root in `app/setup/AppProviders.tsx`) via the global
 *   `alertStore`. This replaces the old `window.alert`/`window.confirm`
 *   blocking dialogs (which can't be styled and are jarring on web).
 *
 * Native behavior (iOS/Android):
 * - Uses `Alert.alert` from `react-native` as before.
 *
 * Usage:
 * ```ts
 * import { platformAlert } from '@/utils/platformAlert';
 *
 * platformAlert('Success', 'Item added to cart');
 *
 * platformAlert('Confirm Delete', 'Are you sure?', [
 *   { text: 'Cancel', style: 'cancel' },
 *   { text: 'Delete', onPress: handleDelete, style: 'destructive' }
 * ]);
 * ```
 */

import { Platform, Alert, type AlertButton } from 'react-native';
import { showAlert as showAlertFromStore } from '@/stores/alertStore';

export interface PlatformAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface PlatformAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

/**
 * Object-form options (Phase 6 — web parity).
 * Provides a more readable API for callers that prefer an options bag.
 */
export interface AlertOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  type?: 'success' | 'error' | 'warning' | 'info';
}

/**
 * Show an alert dialog that works on both web and React Native.
 *
 * Supports both:
 *   - Positional: platformAlert(title, message?, buttons?, options?)
 *   - Object:     platformAlert({ title, message, ... })
 */
export function platformAlert(
  titleOrOptions: string | AlertOptions,
  message?: string,
  buttons?: PlatformAlertButton[],
  options?: PlatformAlertOptions
): void {
  // Object-form overload
  if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
    const opts = titleOrOptions;
    const confirmText = opts.confirmText ?? (opts.destructive ? 'Delete' : 'OK');
    const cancelText = opts.cancelText ?? 'Cancel';
    const resolvedButtons: PlatformAlertButton[] = [];
    if (opts.onCancel) {
      resolvedButtons.push({ text: cancelText, style: 'cancel', onPress: opts.onCancel });
    }
    resolvedButtons.push({
      text: confirmText,
      style: opts.destructive ? 'destructive' : 'default',
      onPress: opts.onConfirm,
    });
    showPlatformAlert(
      opts.title ?? '',
      opts.message ?? '',
      resolvedButtons.length > 0 ? resolvedButtons : [{ text: 'OK', style: 'default' }],
      undefined,
      opts.type
    );
    return;
  }

  showPlatformAlert(titleOrOptions, message, buttons, options);
}

function showPlatformAlert(
  title: string,
  message: string | undefined,
  buttons: PlatformAlertButton[] | undefined,
  options: PlatformAlertOptions | undefined,
  type: 'success' | 'error' | 'warning' | 'info' = 'info'
): void {
  if (Platform.OS === 'web') {
    // Web: use the in-app modal via the global alert store. This is rendered
    // by CrossPlatformAlertRenderer at the app root, so we don't need any
    // React context here — the store is module-scoped.
    const safeButtons = buttons && buttons.length > 0
      ? buttons.map((b) => ({
          text: b.text,
          onPress: b.onPress,
          style: b.style,
        }))
      : [{ text: 'OK', style: 'default' as const }];
    showAlertFromStore(title ?? '', message ?? '', safeButtons, type);
    // Note: onDismiss is intentionally not invoked on web. The renderer's
    // backdrop tap triggers dismiss(button) where the cancel-style button
    // (if any) is invoked; if no cancel button exists, no callback fires.
    // This matches the previous window.alert/window.confirm semantics
    // (window.alert has no dismiss callback, window.confirm invokes the
    // cancel button when dismissed).
  } else {
    // React Native: use the system Alert.alert
    Alert.alert(
      title,
      message,
      buttons?.map((button) => ({
        text: button.text,
        onPress: button.onPress,
        style: button.style,
      })),
      {
        cancelable: options?.cancelable ?? true,
        onDismiss: options?.onDismiss,
      }
    );
  }
}

/**
 * Show a simple alert with just an OK button
 */
export function platformAlertSimple(title: string, message?: string): void {
  platformAlert(title, message, [{ text: 'OK', style: 'default' }]);
}

/**
 * Show a confirmation dialog with Cancel and Confirm buttons
 */
export function platformAlertConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText: string = 'Confirm',
  cancelText: string = 'Cancel'
): void {
  platformAlert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, onPress: onConfirm, style: 'default' },
  ]);
}

/**
 * Show a destructive confirmation dialog (for delete, remove, etc.)
 *
 * Supports object-form: platformAlertDestructive({ title, message, onConfirm, ... })
 */
export function platformAlertDestructive(
  titleOrOptions: string | AlertOptions,
  message?: string,
  onConfirm?: () => void,
  confirmText: string = 'Delete',
  cancelText: string = 'Cancel'
): void {
  if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
    platformAlert({ ...titleOrOptions, destructive: true });
    return;
  }
  platformAlert(titleOrOptions, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, onPress: onConfirm, style: 'destructive' },
  ]);
}

/**
 * Show an error alert with a red destructive style
 */
export function platformAlertError(title: string, message: string): void {
  if (Platform.OS === 'web') {
    showAlertFromStore(
      `❌ ${title}`,
      message,
      [{ text: 'OK', style: 'destructive' }],
      'error'
    );
  } else {
    Alert.alert(title, message, [{ text: 'OK', style: 'destructive' }]);
  }
}

/**
 * Show a success alert with a green checkmark (web only)
 */
export function platformAlertSuccess(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    showAlertFromStore(title, message ?? '', [{ text: 'OK', style: 'default' }], 'success');
  } else {
    Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
  }
}

// Re-export the native AlertButton type for convenience
export type { AlertButton };

export default {
  show: platformAlert,
  simple: platformAlertSimple,
  confirm: platformAlertConfirm,
  destructive: platformAlertDestructive,
  error: platformAlertError,
  success: platformAlertSuccess,
};