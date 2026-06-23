/**
 * Safe Haptic Feedback Utility
 *
 * Provides haptic feedback on native platforms (iOS/Android) while safely
 * handling web platform where haptics are not available.
 */

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Trigger impact haptic feedback
 * @param style - Light, Medium, or Heavy impact style
 */
export const triggerImpact = async (
  style: 'Light' | 'Medium' | 'Heavy' = 'Medium'
) => {
  if (!isNativePlatform) return;

  try {
    const hapticStyle =
      style === 'Light'
        ? Haptics.ImpactFeedbackStyle.Light
        : style === 'Heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium;

    await Haptics.impactAsync(hapticStyle);
  } catch (error) {
    // Silent fail - haptics are optional
  }
};

/**
 * Trigger notification haptic feedback
 * @param type - Success, Warning, or Error notification type
 */
export const triggerNotification = async (
  type: 'Success' | 'Warning' | 'Error' = 'Success'
) => {
  if (!isNativePlatform) return;

  try {
    const hapticType =
      type === 'Success'
        ? Haptics.NotificationFeedbackType.Success
        : type === 'Warning'
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Error;

    await Haptics.notificationAsync(hapticType);
  } catch (error) {
    // Silent fail - haptics are optional
  }
};

/**
 * Trigger selection haptic feedback (for toggles, pickers, etc.)
 */
export const triggerSelection = async () => {
  if (!isNativePlatform) return;

  try {
    await Haptics.selectionAsync();
  } catch (error) {
    // Silent fail - haptics are optional
  }
};
