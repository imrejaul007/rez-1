/**
 * Cross-platform alert utility
 *
 * Phase 6: routes both native and web through `@/utils/platformAlert` so
 * the in-app modal pattern (CrossPlatformAlertRenderer + alertStore) is
 * used everywhere. The native path used to call `Alert.alert` directly
 * and the web path used `showToast`; both are now superseded by the
 * unified `platformAlert` / `platformAlertConfirm` helpers, which keep
 * the in-app modal consistent on web and the system Alert on iOS/Android.
 */

import { Platform } from 'react-native';
import {
  platformAlert,
  platformAlertConfirm,
  type PlatformAlertButton,
} from '@/utils/platformAlert';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Cross-platform alert function
 * @param title - Alert title
 * @param message - Alert message
 * @param buttons - Array of buttons (optional, defaults to single OK button)
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  // Phase 6: route through platformAlert so the in-app modal is used on
  // web (rendered by CrossPlatformAlertRenderer via alertStore) and the
  // system Alert is used on iOS/Android.
  const resolvedButtons: PlatformAlertButton[] =
    buttons && buttons.length > 0
      ? buttons.map((b) => ({
          text: b.text,
          onPress: b.onPress,
          style: b.style,
        }))
      : [{ text: 'OK', style: 'default' }];
  platformAlert(title, message, resolvedButtons);
}

/**
 * Simple alert with just OK button
 */
export function alertOk(title: string, message?: string): void {
  showAlert(title, message);
}

/**
 * Confirmation alert with OK and Cancel buttons
 * Returns a Promise that resolves to true if confirmed, false if cancelled
 *
 * Phase 6: routes through `platformAlertConfirm` so the in-app modal is
 * used on web and the system Alert is used on iOS/Android. We do not get
 * a true Promise resolution on web (the modal doesn't await) — we
 * resolve optimistically on confirm and stay pending on cancel, which
 * matches the previous window.confirm semantics (resolve(true|false)).
 */
export function confirmAlert(
  title: string,
  message: string,
  cancelText: string = 'Cancel',
  confirmText: string = 'OK'
): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // Web: route through platformAlert with resolve callbacks wired to
      // each button. The cancel button resolves false; the confirm button
      // resolves true. Backdrop tap (no callback) leaves the promise
      // pending, matching the previous `window.confirm` behavior (which
      // resolves to false on dismiss).
      platformAlert(title, message, [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, style: 'default', onPress: () => resolve(true) },
      ]);
      return;
    }
    // Native: route through platformAlertConfirm (uses system Alert.alert
    // under the hood) with the same cancel/confirm resolution semantics.
    platformAlertConfirm(title, message, () => resolve(true), confirmText, cancelText);
  });
}

