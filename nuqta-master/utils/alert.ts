// @ts-nocheck
/**
 * Cross-platform alert utility
 * Uses Alert.alert on native platforms and showToast on web
 */

import { Platform, Alert } from 'react-native';
import { showToast } from '@/components/common/ToastManager';

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
  if (Platform.OS === 'web') {
    // Web: Use toast with actions
    const defaultButtons: AlertButton[] = buttons || [{ text: 'OK' }];
    
    showToast({
      message: message ? `${title}\n${message}` : title,
      type: 'info',
      duration: 5000,
      actions: defaultButtons.map(btn => ({
        text: btn.text,
        onPress: (btn.onPress && typeof btn.onPress === 'function') ? btn.onPress : (() => {}),
        style: btn.style || 'default',
      })),
    });
  } else {
    // Native: Use Alert.alert
    if (buttons && buttons.length > 0) {
      Alert.alert(title, message, buttons);
    } else {
      Alert.alert(title, message || '', [{ text: 'OK' }]);
    }
  }
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
 */
export function confirmAlert(
  title: string,
  message: string,
  cancelText: string = 'Cancel',
  confirmText: string = 'OK'
): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web') {
      // For web, use a custom confirmation dialog
      const userConfirmed = window.confirm(`${title}\n\n${message}`);
      resolve(userConfirmed);
    } else {
      // For native, use Alert.alert
      Alert.alert(
        title,
        message,
        [
          {
            text: cancelText,
            onPress: () => resolve(false),
            style: 'cancel',
          },
          {
            text: confirmText,
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    }
  });
}

