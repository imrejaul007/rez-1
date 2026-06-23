// @ts-nocheck
// Safe Back Button Component
// Universal back button with platform-specific behavior and fallback navigation

import React, { useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import { platformAlertConfirm } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { Href } from 'expo-router';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { BackButtonConfig } from '@/types/navigation.types';
import { colors } from '@/constants/theme';

interface SafeBackButtonProps extends Partial<BackButtonConfig> {
  style?: StyleProp<ViewStyle>;
  iconName?: keyof typeof Ionicons.glyphMap;
  testID?: string;
}

/**
 * Safe Back Button Component
 * Provides consistent back navigation with automatic fallbacks
 */
export const SafeBackButton: React.FC<SafeBackButtonProps> = ({
  fallbackRoute,
  onPress,
  showConfirmation = false,
  confirmationMessage = 'Are you sure you want to go back?',
  style,
  iconColor = colors.darkGray,
  iconSize = 24,
  iconName = 'arrow-back',
  testID = 'safe-back-button',
}) => {
  const { goBack, navigate, canGoBack } = useSafeNavigation();

  const handlePress = useCallback(async () => {
    // Custom handler takes precedence
    if (onPress) {
      onPress();
      return;
    }

    // Show confirmation if needed
    if (showConfirmation) {
      platformAlertConfirm(
        'Confirm',
        confirmationMessage,
        () => performNavigation(),
        'OK'
      );
      return;
    }

    await performNavigation();
  }, [onPress, showConfirmation, confirmationMessage, canGoBack, fallbackRoute]);

  const performNavigation = useCallback(async () => {
    try {
      if (canGoBack) {
        await goBack(fallbackRoute);
      } else if (fallbackRoute) {
        await navigate(fallbackRoute);
      } else {
        // Use default fallback
        await goBack();
      }
    } catch (error) {
      // Final fallback - go to home
      try {
        await navigate('/(tabs)' as Href);
      } catch (finalError) {
        // silently handle
      }
    }
  }, [canGoBack, goBack, navigate, fallbackRoute]);

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.button, style]}
     
      testID={testID}
      accessibilityLabel="Go back"
      accessibilityRole="button"
      accessibilityHint="Double tap to navigate back"
    >
      <Ionicons name={iconName} size={iconSize} color={iconColor} />
    </Pressable>
  );
};

/**
 * Themed Safe Back Button
 * Pre-styled for common use cases
 */
export const ThemedSafeBackButton: React.FC<SafeBackButtonProps & {
  variant?: 'default' | 'light' | 'dark' | 'transparent';
}> = ({
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: {
      backgroundColor: colors.background.primary,
      iconColor: colors.darkGray,
    },
    light: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      iconColor: colors.background.primary,
    },
    dark: {
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      iconColor: colors.background.primary,
    },
    transparent: {
      backgroundColor: 'transparent',
      iconColor: colors.darkGray,
    },
  };

  const selectedVariant = variantStyles[variant];

  return (
    <SafeBackButton
      {...props}
      style={[
        styles.themedButton,
        { backgroundColor: selectedVariant.backgroundColor },
        props.style,
      ]}
      iconColor={props.iconColor || selectedVariant.iconColor}
    />
  );
};

/**
 * Safe Close Button
 * For modals and overlays
 */
export const SafeCloseButton: React.FC<SafeBackButtonProps> = (props) => {
  return (
    <SafeBackButton
      {...props}
      iconName="close"
      style={[styles.closeButton, props.style]}
    />
  );
};

/**
 * Minimal Back Button
 * Without container styling
 */
export const MinimalBackButton: React.FC<SafeBackButtonProps> = (props) => {
  return (
    <SafeBackButton
      {...props}
      style={[styles.minimalButton, props.style]}
    />
  );
};

/**
 * Header Back Button
 * Pre-styled for headers
 */
export const HeaderBackButton: React.FC<SafeBackButtonProps & {
  light?: boolean;
}> = ({ light = false, ...props }) => {
  return (
    <SafeBackButton
      {...props}
      style={[
        styles.headerButton,
        light && styles.headerButtonLight,
        props.style,
      ]}
      iconColor={props.iconColor || (light ? colors.background.primary : colors.darkGray)}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  themedButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimalButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    shadowColor: 'transparent',
    elevation: 0,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default React.memo(SafeBackButton);
