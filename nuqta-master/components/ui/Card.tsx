import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { spacing, borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type CardVariant = 'flat' | 'raised' | 'elevated' | 'outlined' | 'filled';
type SpacingKey = 'xs' | 'sm' | 'md' | 'base' | 'lg' | 'xl' | '2xl';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: SpacingKey;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

function Card({
  children,
  variant = 'elevated',
  padding = 'base',
  onPress,
  style,
  testID,
}: CardProps) {
  const { colors, shadows } = useTheme();

  const variantStyles = useMemo<Record<CardVariant, ViewStyle>>(() => ({
    flat: {},
    raised: shadows.subtle,
    elevated: shadows.medium,
    outlined: {
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    filled: {
      backgroundColor: colors.background.secondary,
    },
  }), [colors, shadows]);

  const baseStyle: ViewStyle = {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.primary,
  };

  const containerStyle: ViewStyle[] = [
    baseStyle,
    variantStyles[variant],
    { padding: spacing[padding] },
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          ...containerStyle,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        testID={testID}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
});

export default React.memo(Card);
