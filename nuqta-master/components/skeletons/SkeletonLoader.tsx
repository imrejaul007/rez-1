/**
 * SkeletonLoader - Base skeleton component with purple-tinted shimmer animation
 *
 * Features:
 * - Smooth shimmer gradient animation (1.5s loop)
 * - Purple theme (#7C3AED) to match app branding
 * - Light/dark mode support
 * - Optimized with useNativeDriver
 * - Accessible (hidden from screen readers)
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, interpolate } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  variant?: 'rect' | 'circle' | 'text';
}

function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
  variant = 'rect',
}: SkeletonLoaderProps) {
  const shimmerAnim = useSharedValue(0);
  const colorScheme = useColorScheme();

  useEffect(() => {
    shimmerAnim.value = withRepeat(withTiming(1, { duration: 1500 }), -1);
  }, []);

  const animatedTranslateStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerAnim.value, [0, 1], [-300, 300]) }],
  }));

  const finalBorderRadius = variant === 'circle' ? height / 2 : borderRadius;
  const finalWidth = variant === 'circle' ? height : width;

  // Theme-aware colors
  const backgroundColor = colorScheme === 'dark' ? colors.neutral[700] : colors.neutral[200];
  const shimmerColors = colorScheme === 'dark'
    ? [colors.neutral[700], colors.neutral[600], colors.neutral[700]]
    : [colors.neutral[200], colors.neutral[100], colors.tint.purple, colors.neutral[100], colors.neutral[200]];

  return (
    <View
      style={[
        {
          width: finalWidth,
          height,
          borderRadius: finalBorderRadius,
          backgroundColor,
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no"
    >
      <Animated.View
        style={[
          { flex: 1 },
          animatedTranslateStyle,
        ]}
      >
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            flex: 1,
            width: 300,
          }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({});

export default React.memo(SkeletonLoader);
