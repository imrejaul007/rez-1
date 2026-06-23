/**
 * Grocery Skeleton Components
 * Loading placeholders for grocery pages
 */

import React, { useEffect } from 'react';
import { colors } from '@/constants/theme';
import {
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence, withRepeat, interpolate } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  gray100: colors.neutral[100],
  gray200: colors.neutral[200],
  white: colors.background.primary,
};

// Shimmer animation component
const Shimmer: React.FC<{ style?: any }> = React.memo(({ style }) => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 }), withTiming(0, { duration: 1000 })), -1);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerAnim.value, [0, 1], [0.3, 0.7]),
  }));

  return (
    <Animated.View
      style={[
        styles.shimmer,
        style,
        animStyle,
      ]}
    />
  );
});

// Product Card Skeleton
export const ProductCardSkeleton: React.FC<{ variant?: 'default' | 'compact' | 'horizontal' }> = React.memo(({
  variant = 'default',
}) => {
  if (variant === 'horizontal') {
    return (
      <View style={styles.horizontalCard}>
        <Shimmer style={styles.horizontalImage} />
        <View style={styles.horizontalContent}>
          <Shimmer style={styles.titleShimmer} />
          <Shimmer style={styles.subtitleShimmer} />
          <Shimmer style={styles.priceShimmer} />
        </View>
        <Shimmer style={styles.buttonShimmer} />
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={styles.compactCard}>
        <Shimmer style={styles.compactImage} />
        <Shimmer style={styles.compactTitle} />
        <Shimmer style={styles.compactPrice} />
      </View>
    );
  }

  return (
    <View style={styles.productCard}>
      <Shimmer style={styles.productImage} />
      <View style={styles.productContent}>
        <Shimmer style={styles.titleShimmer} />
        <Shimmer style={styles.subtitleShimmer} />
        <Shimmer style={styles.priceShimmer} />
        <View style={styles.buttonRow}>
          <Shimmer style={styles.addButtonShimmer} />
        </View>
      </View>
    </View>
  );
});

// Store Card Skeleton
export const StoreCardSkeleton: React.FC<{ variant?: 'default' | 'compact' | 'horizontal' | 'featured' }> = React.memo(({
  variant = 'default',
}) => {
  if (variant === 'featured') {
    return (
      <View style={styles.featuredCard}>
        <Shimmer style={styles.featuredImage} />
      </View>
    );
  }

  if (variant === 'horizontal') {
    return (
      <View style={styles.storeHorizontalCard}>
        <Shimmer style={styles.storeHorizontalImage} />
        <View style={styles.storeHorizontalContent}>
          <Shimmer style={styles.titleShimmer} />
          <Shimmer style={styles.subtitleShimmer} />
          <View style={styles.tagsRow}>
            <Shimmer style={styles.tagShimmer} />
            <Shimmer style={styles.tagShimmer} />
          </View>
        </View>
      </View>
    );
  }

  if (variant === 'compact') {
    return (
      <View style={styles.storeCompactCard}>
        <Shimmer style={styles.storeCompactImage} />
        <Shimmer style={styles.compactTitle} />
        <Shimmer style={styles.compactSubtitle} />
      </View>
    );
  }

  return (
    <View style={styles.storeCard}>
      <Shimmer style={styles.storeImage} />
      <View style={styles.storeContent}>
        <Shimmer style={styles.titleShimmer} />
        <View style={styles.metaRow}>
          <Shimmer style={styles.ratingShimmer} />
          <Shimmer style={styles.deliveryShimmer} />
        </View>
        <View style={styles.tagsRow}>
          <Shimmer style={styles.tagShimmer} />
          <Shimmer style={styles.tagShimmer} />
        </View>
      </View>
    </View>
  );
});

// Category Card Skeleton
export const CategoryCardSkeleton: React.FC = React.memo(() => {
  return (
    <View style={styles.categoryCard}>
      <Shimmer style={styles.categoryIcon} />
      <Shimmer style={styles.categoryTitle} />
    </View>
  );
});

// Header Skeleton
export const HeaderSkeleton: React.FC = React.memo(() => {
  return (
    <View style={styles.headerSkeleton}>
      <View style={styles.headerTop}>
        <Shimmer style={styles.backButton} />
        <View style={styles.headerTitleContainer}>
          <Shimmer style={styles.headerTitle} />
          <Shimmer style={styles.headerSubtitle} />
        </View>
        <Shimmer style={styles.searchButton} />
      </View>
    </View>
  );
});

// Filter Bar Skeleton
export const FilterBarSkeleton: React.FC = React.memo(() => {
  return (
    <View style={styles.filterBar}>
      {[1, 2, 3, 4].map((i) => (
        <Shimmer key={i} style={styles.filterChip} />
      ))}
    </View>
  );
});

// Stats Row Skeleton
export const StatsRowSkeleton: React.FC = React.memo(() => {
  return (
    <View style={styles.statsRow}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.statItem}>
          <Shimmer style={styles.statValue} />
          <Shimmer style={styles.statLabel} />
        </View>
      ))}
    </View>
  );
});

// Full Page Skeleton - Products Grid
export const ProductsGridSkeleton: React.FC<{ count?: number }> = React.memo(({ count = 6 }) => {
  return (
    <View style={styles.productsGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </View>
  );
});

// Full Page Skeleton - Stores List
export const StoresListSkeleton: React.FC<{ count?: number }> = React.memo(({ count = 4 }) => {
  return (
    <View style={styles.storesList}>
      {Array.from({ length: count }).map((_, i) => (
        <StoreCardSkeleton key={i} variant="horizontal" />
      ))}
    </View>
  );
});

// Full Grocery Page Skeleton
export const GroceryPageSkeleton: React.FC = React.memo(() => {
  return (
    <View style={styles.pageSkeleton}>
      <HeaderSkeleton />
      <FilterBarSkeleton />
      <View style={styles.pageContent}>
        <ProductsGridSkeleton count={6} />
      </View>
    </View>
  );
});

// Grocery Hub Page Skeleton
export const GroceryHubSkeleton: React.FC = React.memo(() => {
  return (
    <View style={styles.pageSkeleton}>
      <HeaderSkeleton />
      <StatsRowSkeleton />
      <View style={styles.sectionSkeleton}>
        <Shimmer style={styles.sectionTitle} />
        <View style={styles.categoriesGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </View>
      </View>
      <View style={styles.sectionSkeleton}>
        <Shimmer style={styles.sectionTitle} />
        <View style={styles.storesScroll}>
          {[1, 2, 3].map((i) => (
            <StoreCardSkeleton key={i} />
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  shimmer: {
    backgroundColor: COLORS.gray200,
    borderRadius: 8,
  },

  // Product Card
  productCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: 'hidden',
    marginBottom: 12,
  },
  productImage: {
    width: '100%',
    height: 140,
    borderRadius: 0,
  },
  productContent: {
    padding: 12,
  },
  titleShimmer: {
    height: 16,
    width: '80%',
    marginBottom: 8,
  },
  subtitleShimmer: {
    height: 12,
    width: '50%',
    marginBottom: 8,
  },
  priceShimmer: {
    height: 18,
    width: '40%',
    marginBottom: 12,
  },
  buttonRow: {
    alignItems: 'flex-end',
  },
  addButtonShimmer: {
    width: 70,
    height: 32,
    borderRadius: 8,
  },

  // Compact Card
  compactCard: {
    width: 130,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: 'hidden',
    marginRight: 12,
  },
  compactImage: {
    width: '100%',
    height: 100,
    borderRadius: 0,
  },
  compactTitle: {
    height: 12,
    width: '70%',
    margin: 8,
    marginBottom: 4,
  },
  compactPrice: {
    height: 14,
    width: '50%',
    marginHorizontal: 8,
    marginBottom: 8,
  },

  // Horizontal Card
  horizontalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 12,
    marginBottom: 12,
  },
  horizontalImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  horizontalContent: {
    flex: 1,
    marginLeft: 12,
  },
  buttonShimmer: {
    width: 60,
    height: 32,
    borderRadius: 6,
  },

  // Store Card
  storeCard: {
    width: 200,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    overflow: 'hidden',
    marginRight: 12,
  },
  storeImage: {
    width: '100%',
    height: 120,
    borderRadius: 0,
  },
  storeContent: {
    padding: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ratingShimmer: {
    width: 50,
    height: 14,
  },
  deliveryShimmer: {
    width: 60,
    height: 14,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tagShimmer: {
    width: 40,
    height: 16,
    borderRadius: 4,
  },

  // Store Horizontal
  storeHorizontalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    padding: 12,
    marginBottom: 12,
  },
  storeHorizontalImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  storeHorizontalContent: {
    flex: 1,
    marginLeft: 12,
  },

  // Store Compact
  storeCompactCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 12,
  },
  storeCompactImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  compactSubtitle: {
    height: 10,
    width: '60%',
    marginTop: 4,
  },

  // Featured Card
  featuredCard: {
    width: SCREEN_WIDTH - 32,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },

  // Category Card
  categoryCard: {
    width: (SCREEN_WIDTH - 64) / 3,
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  categoryTitle: {
    height: 12,
    width: '80%',
  },

  // Header
  headerSkeleton: {
    backgroundColor: COLORS.gray200,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    height: 20,
    width: '60%',
    marginBottom: 4,
  },
  headerSubtitle: {
    height: 12,
    width: '40%',
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  filterChip: {
    width: 70,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    width: 50,
    height: 20,
    marginBottom: 4,
  },
  statLabel: {
    width: 70,
    height: 12,
  },

  // Page Layouts
  pageSkeleton: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  pageContent: {
    padding: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  storesList: {
    padding: 16,
  },
  sectionSkeleton: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    height: 18,
    width: 150,
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  storesScroll: {
    flexDirection: 'row',
  },
});

export default {
  ProductCardSkeleton,
  StoreCardSkeleton,
  CategoryCardSkeleton,
  HeaderSkeleton,
  FilterBarSkeleton,
  StatsRowSkeleton,
  ProductsGridSkeleton,
  StoresListSkeleton,
  GroceryPageSkeleton,
  GroceryHubSkeleton,
};
