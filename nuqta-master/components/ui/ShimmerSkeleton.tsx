// @ts-nocheck
/**
 * ShimmerSkeleton - Enhanced skeleton loader with purple-tinted shimmer
 *
 * Features:
 * - Smooth shimmer animation (1.5s loop)
 * - Purple-tinted gradient for brand consistency
 * - Multiple variants (rect, circle, text, card)
 * - Light/dark mode support
 * - Performance optimized with react-native-reanimated
 * - Accessibility-friendly (hidden from screen readers)
 *
 * @example
 * <ShimmerSkeleton variant="card" width="100%" height={200} />
 */

import React, { useEffect} from 'react';
import {
  View,
  StyleSheet,
  ViewStyle} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withRepeat,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  borderRadius as BorderRadius,
  timing as Timing,
} from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ShimmerSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: 'rect' | 'circle' | 'text' | 'card';
  animated?: boolean;
}

/**
 * Enhanced ShimmerSkeleton Component
 *
 * Replaces old SkeletonLoader with modern purple-tinted shimmer effect
 */
export const ShimmerSkeleton: React.FC<ShimmerSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius,
  style,
  variant = 'rect',
  animated = true,
}) => {
  const shimmerAnim = useSharedValue(0);
  const { isDark, colors: Colors, gradients: Gradients } = useTheme();

  useEffect(() => {
    if (!animated) return;

    // Continuous shimmer animation
    shimmerAnim.value = withRepeat(
      withTiming(1, { duration: Timing.skeleton }),
      -1
    );

    return () => {
      shimmerAnim.value = 0;
    };
  }, [animated, shimmerAnim]);

  // Calculate translateX for shimmer effect
  const shimmerTranslateStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerAnim.value, [0, 1], [-300, 300]) }],
  }));

  // Get border radius based on variant
  const getFinalBorderRadius = (): number => {
    if (borderRadius !== undefined) return borderRadius;

    switch (variant) {
      case 'circle':
        return height / 2;
      case 'card':
        return BorderRadius.lg;
      case 'text':
        return BorderRadius.sm;
      case 'rect':
      default:
        return BorderRadius.md;
    }
  };

  // Get width based on variant
  const getFinalWidth = () => {
    if (variant === 'circle') return height;
    return width;
  };

  // Theme-aware colors
  const backgroundColor = isDark
    ? Colors.gray[200]
    : Colors.gray[100];

  const shimmerColors = Gradients.shimmer;

  return (
    <View
      style={[
        styles.container,
        {
          width: getFinalWidth(),
          height,
          borderRadius: getFinalBorderRadius(),
          backgroundColor,
        },
        style,
      ]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no"
    >
      {animated && (
        <Animated.View
          style={[
            styles.shimmerContainer,
            shimmerTranslateStyle,
          ]}
        >
          <LinearGradient
            colors={shimmerColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmerContainer: {
    flex: 1,
    width: 300,
  },
  gradient: {
    flex: 1,
  },
});

export default React.memo(ShimmerSkeleton);
