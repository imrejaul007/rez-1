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
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';

interface CategoryGridSkeletonProps {
  itemCount?: number;
}

const { width } = Dimensions.get('window');
const CARD_GAP = 14;
const H_PADDING = 18;
const CARD_WIDTH = (width - H_PADDING * 2 - CARD_GAP) / 2;

const CategoryGridSkeleton: React.FC<CategoryGridSkeletonProps> = ({
  itemCount = 6,
}) => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  const cards = Array.from({ length: itemCount }, (_, i) => i);

  // Render in rows of 2
  const rows: number[][] = [];
  for (let i = 0; i < cards.length; i += 2) {
    rows.push(cards.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((_, index) => (
            <View key={index} style={styles.card}>
              {/* Gradient placeholder */}
              <Animated.View style={[styles.imagePlaceholder, shimmerStyle]} />
              {/* Title placeholder */}
              <Animated.View style={[styles.titlePlaceholder, shimmerStyle]} />
              {/* Description placeholder */}
              <Animated.View style={[styles.descriptionPlaceholder, shimmerStyle]} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    gap: CARD_GAP,
  },
  row: {
    flexDirection: 'row',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.background.primary,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    shadowColor: colors.nileBlue,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: CARD_WIDTH - 28,
    height: 100,
    borderRadius: 18,
    backgroundColor: '#E8EBF0',
    marginBottom: 10,
  },
  titlePlaceholder: {
    width: '65%',
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.neutral[200],
    marginBottom: 6,
  },
  descriptionPlaceholder: {
    width: '45%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F0F1F3',
  },
});

export default React.memo(CategoryGridSkeleton);
