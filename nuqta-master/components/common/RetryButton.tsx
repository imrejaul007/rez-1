// @ts-nocheck
/**
 * Retry Button Component
 *
 * Reusable retry button with loading state and haptic feedback.
 *
 * @module RetryButton
 */

import React, { useState } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface RetryButtonProps {
  /**
   * Callback function to execute on retry
   */
  onRetry: () => void | Promise<void>;

  /**
   * Button text
   * @default "Try Again"
   */
  label?: string;

  /**
   * Button variant
   * @default "primary"
   */
  variant?: 'primary' | 'secondary' | 'ghost';

  /**
   * Button size
   * @default "medium"
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Show icon
   * @default true
   */
  showIcon?: boolean;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Enable haptic feedback
   * @default true
   */
  hapticFeedback?: boolean;

  /**
   * Custom styles
   */
  style?: ViewStyle;
  textStyle?: TextStyle;

  /**
   * Accessibility label
   */
  accessibilityLabel?: string;
}

/**
 * Retry Button Component
 *
 * A button specifically designed for retry actions with built-in loading state
 * and haptic feedback.
 *
 * @example
 * <RetryButton
 *   onRetry={handleRetry}
 *   label="Retry"
 *   variant="primary"
 * />
 */
export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  label = 'Try Again',
  variant = 'primary',
  size = 'medium',
  showIcon = true,
  disabled = false,
  hapticFeedback = true,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const isMounted = useIsMounted();

  const handlePress = async () => {
    if (isLoading || disabled) {
      return;
    }

    // Haptic feedback
    if (hapticFeedback) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // silently handle
      }
    }

    if (!isMounted()) return;
    setIsLoading(true);

    try {
      await onRetry();
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  // Get button styles based on variant
  const getButtonStyle = (): ViewStyle[] => {
    const baseStyle = [styles.button];

    // Size
    if (size === 'small') {
      baseStyle.push(styles.buttonSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonLarge);
    } else {
      baseStyle.push(styles.buttonMedium);
    }

    // Variant
    if (variant === 'primary') {
      baseStyle.push(styles.buttonPrimary);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.buttonSecondary);
    } else if (variant === 'ghost') {
      baseStyle.push(styles.buttonGhost);
    }

    // Disabled
    if (disabled || isLoading) {
      baseStyle.push(styles.buttonDisabled);
    }

    // Custom style
    if (style) {
      baseStyle.push(style);
    }

    return baseStyle;
  };

  // Get text styles based on variant
  const getTextStyle = (): TextStyle[] => {
    const baseStyle = [styles.buttonText];

    // Size
    if (size === 'small') {
      baseStyle.push(styles.buttonTextSmall);
    } else if (size === 'large') {
      baseStyle.push(styles.buttonTextLarge);
    } else {
      baseStyle.push(styles.buttonTextMedium);
    }

    // Variant
    if (variant === 'primary') {
      baseStyle.push(styles.buttonTextPrimary);
    } else if (variant === 'secondary') {
      baseStyle.push(styles.buttonTextSecondary);
    } else if (variant === 'ghost') {
      baseStyle.push(styles.buttonTextGhost);
    }

    // Custom style
    if (textStyle) {
      baseStyle.push(textStyle);
    }

    return baseStyle;
  };

  // Get icon color
  const getIconColor = (): string => {
    if (variant === 'primary') {
      return colors.text.white;
    } else if (variant === 'secondary' || variant === 'ghost') {
      return colors.brand.purpleLight;
    }
    return colors.text.white;
  };

  // Get icon size
  const getIconSize = (): number => {
    if (size === 'small') {
      return 16;
    } else if (size === 'large') {
      return 24;
    }
    return 20;
  };

  return (
    <Pressable
      style={getButtonStyle()}
      onPress={handlePress}
      disabled={disabled || isLoading}
     
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: disabled || isLoading, busy: isLoading }}
      accessibilityHint="Double tap to retry"
    >
      {isLoading ? (
        <ActivityIndicator
          color={getIconColor()}
          size={size === 'small' ? 'small' : 'small'}
        />
      ) : (
        showIcon && (
          <Ionicons
            name="refresh"
            size={getIconSize()}
            color={getIconColor()}
            accessible={false}
          />
        )
      )}

      <Text style={getTextStyle()}>
        {isLoading ? 'Retrying...' : label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },

  // Sizes
  buttonSmall: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonMedium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },

  // Variants
  buttonPrimary: {
    backgroundColor: colors.brand.purpleLight,
    shadowColor: colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonSecondary: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: colors.brand.purpleLight,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Text Styles
  buttonText: {
    fontWeight: '600',
  },
  buttonTextSmall: {
    fontSize: 14,
  },
  buttonTextMedium: {
    fontSize: 16,
  },
  buttonTextLarge: {
    fontSize: 18,
  },
  buttonTextPrimary: {
    color: colors.text.white,
  },
  buttonTextSecondary: {
    color: colors.brand.purpleLight,
  },
  buttonTextGhost: {
    color: colors.brand.purpleLight,
  },
});

export default React.memo(RetryButton);
