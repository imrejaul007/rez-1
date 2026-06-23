import React, { useEffect } from 'react';
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
import {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS
} from '@/constants/search-constants';

interface StoreListSkeletonProps {
  itemCount?: number;
}

const StoreListSkeleton: React.FC<StoreListSkeletonProps> = ({
  itemCount = 3,
}) => {
  const shimmerAnim = useSharedValue(0);
  const screenWidth = Dimensions.get('window').width;

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

  const styles = createStyles(screenWidth);

  const SkeletonItem = () => (
    <View
      style={styles.storeCardSkeleton}
      accessibilityLabel="Loading store"
      accessibilityRole="none"
    >
      {/* Store Info Skeleton */}
      <View style={styles.storeInfoSkeleton}>
        <View style={styles.storeHeaderRow}>
          <View style={styles.storeNameContainer}>
            <Animated.View
              style={[
                styles.storeNameSkeleton,
                shimmerStyle
              ]}
            />
            <Animated.View
              style={[
                styles.ratingSkeletonContainer,
                shimmerStyle
              ]}
            >
              <View style={styles.ratingSkeleton} />
              <View style={styles.ratingTextSkeleton} />
            </Animated.View>
          </View>
        </View>

        <View style={styles.storeDetailsRow}>
          <Animated.View
            style={[
              styles.locationSkeleton,
              shimmerStyle
            ]}
          />
          <Animated.View
            style={[
              styles.statusBadgeSkeleton,
              shimmerStyle
            ]}
          />
        </View>

        <Animated.View
          style={[
            styles.freeShippingSkeleton,
            shimmerStyle
          ]}
        />
      </View>

      {/* Products Grid Skeleton */}
      <View style={styles.productsGridSkeleton}>
        <View style={styles.productRowSkeleton}>
          <Animated.View
            style={[
              styles.productCardSkeleton,
              shimmerStyle
            ]}
          >
            <View style={styles.productImageSkeleton} />
            <View style={styles.productDetailsSkeleton}>
              <View style={styles.productNameSkeleton} />
              <View style={styles.productPriceSkeleton} />
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.productCardSkeleton,
              shimmerStyle
            ]}
          >
            <View style={styles.productImageSkeleton} />
            <View style={styles.productDetailsSkeleton}>
              <View style={styles.productNameSkeleton} />
              <View style={styles.productPriceSkeleton} />
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {Array.from({ length: itemCount }, (_, index) => (
        <SkeletonItem key={index} />
      ))}
    </View>
  );
};

const createStyles = (screenWidth: number) => {
  const isTablet = screenWidth > 768;
  const horizontalPadding = isTablet ? 24 : 16;
  const cardPadding = isTablet ? 20 : 16;

  return StyleSheet.create({
    container: {
      paddingHorizontal: horizontalPadding,
      paddingTop: SPACING.LG,
    },
    storeCardSkeleton: {
      backgroundColor: COLORS.WHITE,
      borderRadius: BORDER_RADIUS.XL,
      marginBottom: SPACING.LG,
      overflow: 'hidden',
      ...SHADOWS.MD,
    },
    storeInfoSkeleton: {
      paddingHorizontal: cardPadding,
      paddingVertical: cardPadding,
    },
    storeHeaderRow: {
      marginBottom: SPACING.SM,
    },
    storeNameContainer: {
      flex: 1,
    },
    storeNameSkeleton: {
      height: 22,
      backgroundColor: COLORS.GRAY_200,
      borderRadius: BORDER_RADIUS.SM,
      marginBottom: SPACING.XS,
      width: '60%',
    },
    ratingSkeletonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingSkeleton: {
      height: 12,
      width: 60,
      backgroundColor: COLORS.GRAY_200,
      borderRadius: BORDER_RADIUS.SM,
      marginRight: SPACING.XS,
    },
    ratingTextSkeleton: {
      height: 12,
      width: 30,
      backgroundColor: COLORS.GRAY_200,
      borderRadius: BORDER_RADIUS.SM,
    },
    storeDetailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: SPACING.SM,
    },
    locationSkeleton: {
      height: 14,
      width: 120,
      backgroundColor: COLORS.GRAY_200,
      borderRadius: BORDER_RADIUS.SM,
      marginRight: SPACING.MD,
    },
    statusBadgeSkeleton: {
      height: 20,
      width: 60,
      backgroundColor: COLORS.GRAY_200,
      borderRadius: BORDER_RADIUS.MD,
    },
    freeShippingSkeleton: {
      height: 16,
      width: 100,
      backgroundColor: COLORS.GRAY_200,
      borderRadius: BORDER_RADIUS.SM,
    },
    productsGridSkeleton: {
      paddingHorizontal: cardPadding,
      paddingBottom: cardPadding,
    },
    productRowSkeleton: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    productCardSkeleton: {
      width: '48%',
      backgroundColor: COLORS.GRAY_50,
      borderRadius: BORDER_RADIUS.LG,
      overflow: 'hidden',
    },
    productImageSkeleton: {
      height: 120,
      backgroundColor: COLORS.GRAY_200,
    },
    productDetailsSkeleton: {
      padding: SPACING.SM,
    },
    productNameSkeleton: {
      height: 14,
      backgroundColor: COLORS.GRAY_200,
      borderRadius: BORDER_RADIUS.SM,
      marginBottom: SPACING.XS,
      width: '90%',
    },
    productPriceSkeleton: {
      height: 16,
      backgroundColor: COLORS.GRAY_200,
      borderRadius: BORDER_RADIUS.SM,
      width: '60%',
    },
  });
};

export default React.memo(StoreListSkeleton);
