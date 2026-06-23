import React, {  useCallback, useMemo } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle} from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { typography, spacing, borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  haptic?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

const SIZE_CONFIG: Record<ButtonSize, { height: number; paddingH: number; iconSize: number }> = {
  small: { height: 36, paddingH: spacing.base, iconSize: 16 },
  medium: { height: 44, paddingH: spacing.lg, iconSize: 18 },
  large: { height: 52, paddingH: spacing.xl, iconSize: 20 },
};

function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  leftIcon,
  rightIcon,
  haptic = true,
  style,
  textStyle: customTextStyle,
  testID,
}: ButtonProps) {
  const { colors, shadows } = useTheme();
  const scaleAnim = useSharedValue(1);
  const sizeConfig = SIZE_CONFIG[size];
  const isInteractive = !disabled && !loading;

  const variantBg = useMemo<Record<ButtonVariant, string>>(() => ({
    primary: colors.brand.purple,
    secondary: colors.secondary[600],
    outline: 'transparent',
    ghost: 'transparent',
    danger: colors.error,
  }), [colors]);

  const variantText = useMemo<Record<ButtonVariant, string>>(() => ({
    primary: colors.text.inverse,
    secondary: colors.text.inverse,
    outline: colors.brand.purple,
    ghost: colors.brand.purple,
    danger: colors.text.inverse,
  }), [colors]);

  const textColor = variantText[variant];

  const handlePressIn = useCallback(() => {
    scaleAnim.value = withSpring(0.98, { damping: 15,
      stiffness: 200 });
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    scaleAnim.value = withSpring(1, { damping: 15,
      stiffness: 200 });
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    if (!isInteractive) return;
    if (haptic) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } catch {}
    }
    onPress();
  }, [isInteractive, haptic, onPress]);

  const isOutlineOrGhost = variant === 'outline' || variant === 'ghost';

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: variantBg[variant],
    height: sizeConfig.height,
    paddingHorizontal: sizeConfig.paddingH,
    ...(variant === 'outline' && {
      borderWidth: 1.5,
      borderColor: colors.brand.purple,
    }),
    ...(!isOutlineOrGhost && shadows.subtle),
    ...(isOutlineOrGhost && { shadowOpacity: 0, elevation: 0 }),
    ...(fullWidth && { width: '100%' as const }),
    ...((disabled || loading) && { opacity: 0.5 }),
  };

  const labelStyle: TextStyle = {
    textAlign: 'center',
    color: textColor,
    ...(size === 'small' ? typography.buttonSmall : typography.button),
    fontWeight: '600',
    ...customTextStyle,
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[containerStyle, style]}
        onPress={handlePress}
        onPressIn={isInteractive ? handlePressIn : undefined}
        onPressOut={isInteractive ? handlePressOut : undefined}
        disabled={!isInteractive}
        accessibilityRole="button"
        accessibilityState={{ disabled: !isInteractive }}
        accessibilityLabel={title}
        testID={testID}
      >
        {loading ? (
          <ActivityIndicator
            color={textColor}
            size={size === 'small' ? 'small' : 'large'}
          />
        ) : (
          <>
            {icon}
            {leftIcon && (
              <Ionicons name={leftIcon} size={sizeConfig.iconSize} color={textColor} />
            )}
            <Text style={labelStyle}>{title}</Text>
            {rightIcon && (
              <Ionicons name={rightIcon} size={sizeConfig.iconSize} color={textColor} />
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(Button);
