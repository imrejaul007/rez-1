/**
 * MallLoadingSkeleton Component
 *
 * Loading skeleton for mall pages
 */

import React, { memo, useEffect } from 'react';
import { colors } from '@/constants/theme';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MallLoadingSkeletonProps {
  count?: number;
  type?: 'card' | 'list' | 'grid';
}

const SkeletonItem: React.FC<{ type: 'card' | 'list' | 'grid' }> = ({ type }) => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withTiming(1, { duration: 1500 }), -1);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerAnim.value * SCREEN_WIDTH * 2 - SCREEN_WIDTH }],
  }));

  if (type === 'list') {
    return (
      <View style={styles.listItem}>
        <View style={styles.listLogo}>
          <Animated.View
            style={[
              styles.shimmer,
              shimmerStyle,
            ]}
          />
        </View>
        <View style={styles.listContent}>
          <View style={styles.listTitle}>
            <Animated.View
              style={[
                styles.shimmer,
                shimmerStyle,
              ]}
            />
          </View>
          <View style={styles.listSubtitle}>
            <Animated.View
              style={[
                styles.shimmer,
                shimmerStyle,
              ]}
            />
          </View>
          <View style={styles.listBadges}>
            <Animated.View
              style={[
                styles.shimmer,
                shimmerStyle,
              ]}
            />
          </View>
        </View>
      </View>
    );
  }

  if (type === 'grid') {
    return (
      <View style={styles.gridItem}>
        <View style={styles.gridImage}>
          <Animated.View
            style={[
              styles.shimmer,
              shimmerStyle,
            ]}
          />
        </View>
        <View style={styles.gridTitle}>
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

  // Default: card
  return (
    <View style={styles.cardItem}>
      <View style={styles.cardImage}>
        <Animated.View
          style={[
            styles.shimmer,
            shimmerStyle,
          ]}
        />
      </View>
      <View style={styles.cardTitle}>
        <Animated.View
          style={[
            styles.shimmer,
            shimmerStyle,
          ]}
        />
      </View>
      <View style={styles.cardSubtitle}>
        <Animated.View
          style={[
            styles.shimmer,
            shimmerStyle,
          ]}
        />
      </View>
    </View>
  );
};

const MallLoadingSkeleton: React.FC<MallLoadingSkeletonProps> = ({
  count = 4,
  type = 'list',
}) => {
  const containerStyle =
    type === 'grid' ? styles.gridContainer : styles.listContainer;

  return (
    <View style={containerStyle}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonItem key={index} type={type} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    paddingVertical: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  // List styles
  listItem: {
    flexDirection: 'row',
    backgroundColor: colors.lavenderMist,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  listLogo: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: colors.linen,
    marginRight: 14,
    overflow: 'hidden',
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    height: 18,
    width: '70%',
    backgroundColor: colors.neutral[200],
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  listSubtitle: {
    height: 14,
    width: '50%',
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  listBadges: {
    height: 24,
    width: '80%',
    backgroundColor: colors.neutral[200],
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Grid styles
  gridItem: {
    width: (SCREEN_WIDTH - 56) / 2,
    backgroundColor: colors.lavenderMist,
    borderRadius: 16,
    padding: 12,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: 80,
    backgroundColor: colors.linen,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  gridTitle: {
    height: 16,
    width: '70%',
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  // Card styles
  cardItem: {
    width: 150,
    backgroundColor: colors.lavenderMist,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 60,
    backgroundColor: colors.linen,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  cardTitle: {
    height: 14,
    width: '80%',
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  cardSubtitle: {
    height: 12,
    width: '60%',
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
});

export default memo(MallLoadingSkeleton);
