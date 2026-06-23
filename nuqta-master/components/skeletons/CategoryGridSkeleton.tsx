import React, { useEffect } from 'react';
import { colors } from '@/constants/theme';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface CategoryGridSkeletonProps {
  numItems?: number;
  numColumns?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SkeletonItem: React.FC<{ circleSize: number; delay: number }> = ({
  circleSize,
  delay,
}) => {
  const shimmerAnim = useSharedValue(0.3);

  useEffect(() => {
    const timer = setTimeout(() => {
      shimmerAnim.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 }),
        ),
        -1, // infinite
      );
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerAnim.value,
  }));

  return (
    <View style={styles.skeletonItem}>
      <Animated.View
        style={[
          styles.skeletonCircle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
          },
          shimmerStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.skeletonText,
          shimmerStyle,
        ]}
      />
    </View>
  );
};

const CategoryGridSkeleton: React.FC<CategoryGridSkeletonProps> = ({
  numItems = 8,
  numColumns = 2,
}) => {
  const circleSize = 64;
  const containerPadding = 32;
  const gap = 16 * (numColumns - 1);
  const itemWidth = (SCREEN_WIDTH - containerPadding - gap) / numColumns;

  const rows = Math.ceil(numItems / numColumns);
  const items = Array.from({ length: numItems }, (_, i) => i);

  return (
    <View style={styles.container}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.row}>
          {items
            .slice(rowIndex * numColumns, (rowIndex + 1) * numColumns)
            .map((item, colIndex) => (
              <View
                key={`item-${item}`}
                style={[styles.itemContainer, { width: itemWidth }]}
              >
                <SkeletonItem
                  circleSize={circleSize}
                  delay={(rowIndex * numColumns + colIndex) * 100}
                />
              </View>
            ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  itemContainer: {
    alignItems: 'center',
  },
  skeletonItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skeletonCircle: {
    backgroundColor: colors.neutral[200],
    marginBottom: 8,
  },
  skeletonText: {
    width: 60,
    height: 12,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginTop: 4,
  },
});

export default React.memo(CategoryGridSkeleton);
