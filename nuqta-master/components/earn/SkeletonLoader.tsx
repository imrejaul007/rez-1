// @ts-nocheck
import React, { useEffect} from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

interface SkeletonBoxProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * A simple animated skeleton shimmer component.
 * Pulses opacity from 0.3 to 0.7 on a light gray background.
 */
export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width,
  height,
  borderRadius = 4,
  style,
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.7, { duration: 800 })), -1);
    
    }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.neutral[200],
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * A card-sized skeleton placeholder.
 * Full width, 80px height, 12px border radius.
 */
export const SkeletonCard = React.memo<{ style?: ViewStyle }>(({ style }) => (
  <SkeletonBox width="100%" height={80} borderRadius={12} style={style} />
));

/**
 * A game grid item skeleton placeholder.
 * Half width (handled by parent), 120px height.
 */
export const SkeletonGameCard = React.memo<{ style?: ViewStyle }>(({ style }) => (
  <SkeletonBox width="100%" height={120} borderRadius={16} style={style} />
));

/**
 * A creator card skeleton placeholder.
 * 100px width, 120px height.
 */
export const SkeletonCreatorCard = React.memo<{ style?: ViewStyle }>(({ style }) => (
  <SkeletonBox width={100} height={120} borderRadius={12} style={style} />
));
