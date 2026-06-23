import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { spacing, borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import Text from './Text';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'neutral';
type BadgeSize = 'dot' | 'small' | 'medium' | 'large';

interface BadgeProps {
  label?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

function Badge({
  label,
  variant = 'primary',
  size = 'medium',
  icon,
  style,
  testID,
}: BadgeProps) {
  const { colors } = useTheme();

  const variantBg = useMemo<Record<BadgeVariant, string>>(() => ({
    primary: colors.primary[500],
    secondary: colors.secondary[600],
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    neutral: colors.neutral[500],
  }), [colors]);

  const variantText = useMemo<Record<BadgeVariant, string>>(() => ({
    primary: colors.secondary[600],
    secondary: colors.text.inverse,
    success: colors.text.inverse,
    error: colors.text.inverse,
    warning: colors.secondary[600],
    info: colors.text.inverse,
    neutral: colors.text.inverse,
  }), [colors]);

  if (size === 'dot') {
    return (
      <View
        style={[
          styles.dot,
          { backgroundColor: variantBg[variant] },
          style,
        ]}
        testID={testID}
      />
    );
  }

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: variantBg[variant] },
        styles[`size_${size}`],
        style,
      ]}
      testID={testID}
    >
      {icon}
      {label && (
        <Text
          variant={size === 'small' ? 'caption' : 'bodySmall'}
          style={{ color: variantText[variant], fontWeight: '600' }}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  size_small: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minHeight: 20,
  },
  size_medium: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 24,
  },
  size_large: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 32,
  },
});

export default React.memo(Badge);
