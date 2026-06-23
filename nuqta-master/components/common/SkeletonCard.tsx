import React, { useEffect} from 'react';
import { View, StyleSheet} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface SkeletonCardProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
  variant?: 'rectangle' | 'circle' | 'rounded';
}

/**
 * Base Skeleton Component with Shimmer Animation
 *
 * Provides a reusable skeleton loader with customizable shape and size
 * Includes smooth shimmer animation for better perceived performance
 */
function SkeletonCard({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
  variant = 'rectangle',
}: SkeletonCardProps) {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    // Continuous loop animation for shimmer effect
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1200 })), -1);
    
    }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmerAnim.value, [0, 1], [-300, 300]) }],
  }));

  // Calculate final dimensions based on variant
  const finalBorderRadius =
    variant === 'circle' ? height / 2 :
    variant === 'rounded' ? borderRadius :
    0;
  const finalWidth = variant === 'circle' ? height : width;

  return (
    <View
      style={[
        {
          width: finalWidth,
          height,
          borderRadius: finalBorderRadius,
          backgroundColor: colors.gray[200],
          overflow: 'hidden',
        },
        style,
      ]}
      accessibilityElementsHidden={true}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View
        style={[{
          flex: 1,
        }, shimmerStyle]}
      >
        <LinearGradient
          colors={[colors.neutral[200], colors.neutral[50], colors.neutral[200]]}
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

const styles = StyleSheet.create({
  // No additional styles needed for base component
});

export default React.memo(SkeletonCard);
