/**
 * Shared shimmer skeleton placeholder for Privé screens
 */

import React, { useEffect } from 'react';
import {
  ViewStyle,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, interpolate } from 'react-native-reanimated';
import { PRIVE_COLORS } from './priveTheme';

interface PriveSkeletonBlockProps {
  width: number | string;
  height: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export const PriveSkeletonBlock = React.memo(({ width, height, style, borderRadius = 8 }: PriveSkeletonBlockProps) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);
  }, [shimmer]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.6]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: PRIVE_COLORS.transparent.white08,
        },
        animatedStyle,
        style,
      ]}
    />
  );
});
