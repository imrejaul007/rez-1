import React, { useMemo } from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { borderRadius as BORDER_RADIUS } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import Text from './Text';

const SPACING = { xs: 4, sm: 8, md: 16, lg: 24 };

type ChipVariant = 'filled' | 'outlined' | 'soft';
type ChipSize = 'small' | 'medium';

interface ChipProps {
  label: string;
  onPress?: () => void;
  variant?: ChipVariant;
  size?: ChipSize;
  selected?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

function Chip({
  label,
  onPress,
  variant = 'filled',
  size = 'medium',
  selected = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  testID,
}: ChipProps) {
  const { colors } = useTheme();

  const variantStyles = useMemo(() => ({
    filled: { backgroundColor: colors.background.tertiary },
    filled_selected: { backgroundColor: colors.primary[500] },
    outlined: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border.default },
    outlined_selected: { backgroundColor: colors.primary[50], borderColor: colors.primary[500] },
    soft: { backgroundColor: colors.primary[50] },
    soft_selected: { backgroundColor: colors.primary[100] },
  }), [colors]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant] as ViewStyle,
        styles[`size_${size}`],
        selected && (variantStyles[`${variant}_selected`] as ViewStyle),
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected }}
      testID={testID}
    >
      {leftIcon && <>{leftIcon}</>}
      <Text
        variant={size === 'small' ? 'caption' : 'bodySmall'}
        color={selected ? 'inverse' : 'primary'}
        style={styles.text}
      >
        {label}
      </Text>
      {rightIcon && <>{rightIcon}</>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    alignSelf: 'flex-start',
  },
  size_small: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    minHeight: 28,
  },
  size_medium: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    minHeight: 36,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '500',
  },
});

export default React.memo(Chip);
