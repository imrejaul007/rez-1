// Shimmer loading effect component
import React, { useEffect} from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '@/constants/theme';

interface ShimmerEffectProps {
  width?: number | string;
  height?: number | string;
  style?: ViewStyle;
  shimmerColors?: string[];
  duration?: number;
}

function ShimmerEffect({
  width = '100%',
  height = 20,
  style,
  shimmerColors = [colors.gray[200], colors.gray[100], colors.gray[200]],
  duration = 1500,
}: ShimmerEffectProps) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withRepeat(withTiming(1, { duration }), -1, true);

    return () => {
      animatedValue.value = 0;
    };
  }, [animatedValue, duration]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(animatedValue.value, [0, 1], [-350, 350]) }],
  }));

  return (
    <View
      style={[styles.container, { width: width as any, height: height as any }, style]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no"
    >
      <View style={[styles.shimmerContainer, { width: width as any, height: height as any }]}>
        <Animated.View
          style={[
            styles.shimmer,
            shimmerStyle,
          ]}
        />
      </View>
    </View>
);
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray[200],
    borderRadius: 8,
    overflow: 'hidden',
  },
  shimmerContainer: {
    position: 'relative',
  },
  shimmer: {
    width: '30%',
    height: '100%',
    backgroundColor: colors.background.primary,
    opacity: 0.7,
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 8,
  },
});

export default React.memo(ShimmerEffect);
