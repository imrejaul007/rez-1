/**
 * AnimatedButton - Modern button with micro-animations
 *
 * Features:
 * - Scale animation on press (0.96)
 * - Ripple effect (Android-style)
 * - Haptic feedback
 * - Multiple variants (primary, secondary, ghost, outline)
 * - Loading state with spinner
 * - Icon support (left/right)
 * - Gradient backgrounds
 * - Disabled state
 *
 * @example
 * <AnimatedButton
 *   variant="primary"
 *   onPress={() => console.log('Pressed')}
 *   leftIcon="heart"
 * >
 *   Like
 * </AnimatedButton>
 */

import React, {  useState } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
  Platform} from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  borderRadius as BorderRadius,
  buttonHeight as ButtonHeight,
  opacity as Opacity,
  timing as Timing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface AnimatedButtonProps {
  children: string;
  onPress: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * AnimatedButton Component
 */
export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  haptic = true,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const { colors: Colors, shadows: Shadows, gradients: Gradients } = useTheme();
  const scaleAnim = useSharedValue(1);
  const [isPressed, setIsPressed] = useState(false);

  // Handle press animation
  const handlePressIn = () => {
    setIsPressed(true);
    scaleAnim.value = withSpring(0.96, { ...Timing.springBouncy });

    // Haptic feedback
    if (haptic && !disabled && !loading) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } catch (error) {
        // Haptic feedback not available
      }
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
    scaleAnim.value = withSpring(1, { ...Timing.springSmooth });
  };

  const handlePress = async () => {
    if (disabled || loading) return;
    await onPress();
  };

  // Get button styles based on variant and size
  const getButtonHeight = () => {
    if (size === 'sm') return ButtonHeight.sm;
    if (size === 'lg') return ButtonHeight.lg;
    return ButtonHeight.md;
  };

  const getIconSize = () => {
    if (size === 'sm') return 18;
    if (size === 'lg') return 24;
    return 20;
  };

  const getFontSize = () => {
    if (size === 'sm') return 14;
    if (size === 'lg') return 18;
    return 16;
  };

  // Variant styles
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isOutline = variant === 'outline';

  const containerStyle: ViewStyle = {
    height: getButtonHeight(),
    ...(fullWidth && { width: '100%' }),
    ...(disabled || loading) && { opacity: Opacity.disabled },
  };

  const buttonContentStyle: ViewStyle = {
    ...styles.buttonContent,
    height: getButtonHeight(),
    borderRadius: BorderRadius.md,
    ...(isSecondary && {
      backgroundColor: Colors.background.primary,
      borderWidth: 2,
      borderColor: Colors.primary[700],
    }),
    ...(isGhost && {
      backgroundColor: 'transparent',
    }),
    ...(isOutline && {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: Colors.primary[700],
    }),
  };

  const textColor = isPrimary
    ? Colors.text.white
    : Colors.primary[700];

  const buttonTextStyle: TextStyle = {
    fontSize: getFontSize(),
    fontWeight: '700',
    color: textColor,
    letterSpacing: 0.5,
    ...textStyle,
  };

  // Render button content
  const renderContent = () => (
    <View style={styles.contentRow}>
      {loading && (
        <ActivityIndicator
          size="small"
          color={textColor}
          style={styles.loader}
        />
      )}

      {!loading && leftIcon && (
        <Ionicons
          name={leftIcon}
          size={getIconSize()}
          color={textColor}
          style={styles.leftIcon}
        />
      )}

      {!loading && <Text style={buttonTextStyle}>{children}</Text>}

      {!loading && rightIcon && (
        <Ionicons
          name={rightIcon}
          size={getIconSize()}
          color={textColor}
          style={styles.rightIcon}
        />
      )}
    </View>
  );

  return (
    <Animated.View
      style={[
        containerStyle,
        { transform: [{ scale: scaleAnim }] },
        style,
      ]}
    >
      {/* Primary variant uses gradient */}
      {isPrimary ? (
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={disabled || loading}
         
          style={styles.touchable}
        >
          <LinearGradient
            colors={Gradients.purplePrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[buttonContentStyle, Shadows.purpleMedium]}
          >
            {renderContent()}
          </LinearGradient>
        </Pressable>
      ) : (
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={handlePress}
          disabled={disabled || loading}
         
          style={[
            styles.touchable,
            buttonContentStyle,
            !isGhost && Shadows.subtle,
          ]}
        >
          {renderContent()}
        </Pressable>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  buttonContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: {
    marginRight: 8,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});

export default React.memo(AnimatedButton);
