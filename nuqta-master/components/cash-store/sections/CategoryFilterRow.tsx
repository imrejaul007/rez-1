/**
 * CategoryFilterRow Component
 *
 * Horizontal scrollable category filter with circular icons.
 * Categories are dynamic — fetched from /api/cashstore/categories (MallCategory + virtual filters).
 * Falls back to hardcoded defaults if no categories are passed.
 */

import React, { memo, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import {
  CashStoreCategoryFilterKey,
  CashStoreCategoryFilter,
} from '../../../types/cash-store.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = 72;

// Fallback categories (used when API hasn't loaded yet)
const FALLBACK_CATEGORIES: CashStoreCategoryFilter[] = [
  {
    _id: 'all',
    slug: 'all',
    name: 'All',
    icon: 'grid-outline',
    color: colors.nileBlue,
    backgroundColor: colors.linen,
    maxCashback: 0,
    sortOrder: -2,
    brandCount: 0,
    isActive: true,
    isFeatured: false,
    isSpecialFilter: true,
  },
  {
    _id: 'most-popular',
    slug: 'most-popular',
    name: 'Popular',
    icon: 'star',
    color: colors.brand.sand,
    backgroundColor: colors.linen,
    maxCashback: 0,
    sortOrder: -1,
    brandCount: 0,
    isActive: true,
    isFeatured: false,
    isSpecialFilter: true,
  },
  {
    _id: 'high-cashback',
    slug: 'high-cashback',
    name: 'High Cashback',
    icon: 'flame',
    color: colors.brand.sand,
    backgroundColor: colors.lightPeach,
    maxCashback: 0,
    sortOrder: 0,
    brandCount: 0,
    isActive: true,
    isFeatured: false,
    isSpecialFilter: true,
  },
  {
    _id: 'fashion',
    slug: 'fashion',
    name: 'Fashion',
    icon: 'shirt-outline',
    color: colors.nileBlue,
    backgroundColor: colors.lightPeach,
    maxCashback: 20,
    sortOrder: 1,
    brandCount: 0,
    isActive: true,
    isFeatured: true,
    isSpecialFilter: false,
  },
  {
    _id: 'electronics',
    slug: 'electronics',
    name: 'Electronics',
    icon: 'laptop-outline',
    color: colors.nileBlue,
    backgroundColor: colors.lavenderMist,
    maxCashback: 15,
    sortOrder: 2,
    brandCount: 0,
    isActive: true,
    isFeatured: true,
    isSpecialFilter: false,
  },
  {
    _id: 'food',
    slug: 'food',
    name: 'Food',
    icon: 'fast-food-outline',
    color: colors.brand.sand,
    backgroundColor: colors.linen,
    maxCashback: 10,
    sortOrder: 3,
    brandCount: 0,
    isActive: true,
    isFeatured: false,
    isSpecialFilter: false,
  },
  {
    _id: 'travel',
    slug: 'travel',
    name: 'Travel',
    icon: 'airplane-outline',
    color: colors.nileBlue,
    backgroundColor: colors.lavenderMist,
    maxCashback: 12,
    sortOrder: 4,
    brandCount: 0,
    isActive: true,
    isFeatured: true,
    isSpecialFilter: false,
  },
  {
    _id: 'beauty',
    slug: 'beauty',
    name: 'Beauty',
    icon: 'sparkles-outline',
    color: colors.nileBlue,
    backgroundColor: colors.lightPeach,
    maxCashback: 18,
    sortOrder: 5,
    brandCount: 0,
    isActive: true,
    isFeatured: false,
    isSpecialFilter: false,
  },
];

interface CategoryFilterRowProps {
  selectedCategory: CashStoreCategoryFilterKey;
  onCategorySelect: (category: CashStoreCategoryFilterKey) => void;
  isLoading?: boolean;
  categories?: CashStoreCategoryFilter[];
}

interface CategoryItemProps {
  filter: CashStoreCategoryFilter;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}

const CategoryItem: React.FC<CategoryItemProps> = memo(
  ({ filter, isSelected, onPress, index }) => {
    const scaleAnim = useSharedValue(0.8);
    const fadeAnim = useSharedValue(0);

    useEffect(() => {
      fadeAnim.value = withDelay(index * 40, withTiming(1, { duration: 300 }));
      scaleAnim.value = withDelay(index * 40, withSpring(1));
      
}, [index]);

    const handlePressIn = () => {
      scaleAnim.value = withSpring(0.9);
    };

    const handlePressOut = () => {
      scaleAnim.value = withSpring(1);
    };

    // Use color for icon, backgroundColor for circle background
    const iconColor = filter.color || colors.nileBlue;
    const bgColor = filter.backgroundColor || colors.lavenderMist;

    return (
      <Animated.View
        style={[
          styles.itemContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
         
          accessibilityRole="button"
          accessibilityLabel={`Filter by ${filter.name}`}
          accessibilityState={{ selected: isSelected }}
          accessibilityHint={
            isSelected
              ? 'Currently selected category'
              : `Double tap to filter by ${filter.name}`
          }
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: bgColor },
              isSelected && styles.iconCircleSelected,
            ]}
          >
            <Ionicons
              name={filter.icon as any}
              size={24}
              color={isSelected ? colors.nileBlue : iconColor}
            />
          </View>
          <Text
            style={[styles.label, isSelected && styles.labelSelected]}
            numberOfLines={1}
          >
            {filter.name}
          </Text>
        </Pressable>
      </Animated.View>
    );
  }
);

const SkeletonItem: React.FC<{ index: number }> = memo(({ index }) => {
  const shimmerAnim = useSharedValue(0);

  useEffect(() => {
    shimmerAnim.value = withRepeat(withSequence(withTiming(1, { duration: 1000 })), -1);
    
    }, [index]);

  return (
    <View style={styles.itemContainer}>
      <Animated.View
        style={[
          styles.iconCircle,
          styles.skeletonCircle,
          {
            opacity: interpolate(shimmerAnim.value, [0, 1], [0.4, 0.8]),
          },
        ]}
      />
      <View style={styles.skeletonLabel} />
    </View>
  );
});

const CategoryFilterRow: React.FC<CategoryFilterRowProps> = ({
  selectedCategory,
  onCategorySelect,
  isLoading = false,
  categories,
}) => {
  const headerFadeAnim = useSharedValue(0);

  useEffect(() => {
    headerFadeAnim.value = withTiming(1, { duration: 400 });
  }, []);

  // Use passed categories, or fallback to defaults
  const displayCategories = (categories && categories.length > 0) ? categories : FALLBACK_CATEGORIES;

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerFadeAnim }]}>
        <Text style={styles.title}>Top categories</Text>
      </Animated.View>

      {/* Category ScrollView */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <SkeletonItem key={`skeleton-${index}`} index={index} />
            ))
          : displayCategories.map((filter, index) => (
              <CategoryItem
                key={filter._id}
                filter={filter}
                isSelected={selectedCategory === filter.slug}
                onPress={() => onCategorySelect(filter.slug)}
                index={index}
              />
            ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    backgroundColor: colors.background.primary,
    marginTop: 8,
    borderRadius: 24,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    letterSpacing: -0.3,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 12,
    gap: 4,
  },
  itemContainer: {
    width: ITEM_SIZE,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconCircleSelected: {
    borderColor: colors.nileBlue,
    borderWidth: 2.5,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral[500],
    textAlign: 'center',
    width: '100%',
  },
  labelSelected: {
    color: colors.nileBlue,
    fontWeight: '700',
  },
  skeletonCircle: {
    backgroundColor: colors.neutral[200],
  },
  skeletonLabel: {
    width: 48,
    height: 10,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
  },
});

export default memo(CategoryFilterRow);
