/**
 * Platform Alert Utility
 *
 * Provides unified alert functionality across web and React Native platforms.
 * Replaces the pattern: Platform.OS === 'web' ? alert() : Alert.alert()
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

import { Platform, Alert } from 'react-native';

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
 * Show an alert dialog that works on both web and React Native
 */
export function platformAlert(
  title: string,
  message?: string,
  buttons?: PlatformAlertButton[],
  options?: PlatformAlertOptions
): void {
  if (Platform.OS === 'web') {
    // Web implementation using window.confirm/alert
    if (buttons && buttons.length > 1) {
      // Multi-button alert (confirmation dialog)
      const confirmMessage = message ? `${title}\n\n${message}` : title;
      const confirmed = window.confirm(confirmMessage);

      if (confirmed) {
        // Find first non-cancel button and execute
        const actionButton = buttons.find(b => b.style !== 'cancel');
        actionButton?.onPress?.();
      } else {
        // Find cancel button and execute
        const cancelButton = buttons.find(b => b.style === 'cancel');
        cancelButton?.onPress?.();
        options?.onDismiss?.();
      }
    } else {
      // Simple alert
      const alertMessage = message ? `${title}\n\n${message}` : title;
      window.alert(alertMessage);
      buttons?.[0]?.onPress?.();
    }
  } else {
    // React Native implementation
    Alert.alert(
      title,
      message,
      buttons?.map(button => ({
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
 */
export function platformAlertDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmText: string = 'Delete',
  cancelText: string = 'Cancel'
): void {
  platformAlert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, onPress: onConfirm, style: 'destructive' },
  ]);
}

/**
 * Show an error alert with a red destructive style
 */
export function platformAlertError(title: string, message: string): void {
  if (Platform.OS === 'web') {
    window.alert(`❌ ${title}\n\n${message}`);
  } else {
    Alert.alert(title, message, [{ text: 'OK', style: 'destructive' }]);
  }
}

/**
 * Show a success alert with a green checkmark (web only)
 */
export function platformAlertSuccess(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    const fullMessage = message ? `✅ ${title}\n\n${message}` : `✅ ${title}`;
    window.alert(fullMessage);
  } else {
    Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
  }
}

export default {
  show: platformAlert,
  simple: platformAlertSimple,
  confirm: platformAlertConfirm,
  destructive: platformAlertDestructive,
  error: platformAlertError,
  success: platformAlertSuccess,
};
