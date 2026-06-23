/**
 * CategoryGridSection Component
 * 4-column grid display of subcategories with icons and cashback
 * Adapted from Rez_v-2-main FashionCategoryGrid
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color?: string;
  cashback?: number;
  items?: number;
}

interface CategoryGridSectionProps {
  subcategories: Subcategory[];
  categorySlug: string;
  onSubcategoryPress?: (subcategory: Subcategory) => void;
}

const COLORS = [
  colors.lightMustard, colors.infoScale[400], colors.brand.pink, colors.warningScale[400],
  colors.brand.purpleLight, colors.error, colors.brand.cyan, colors.lightMustard,
  colors.success, colors.brand.orange, colors.brand.indigo, colors.tealGreen,
];

// Check if icon is an Ionicons name (contains "-outline" or "-sharp") vs emoji
const isIoniconName = (icon: string): boolean => {
  return icon.includes('-outline') || icon.includes('-sharp') || icon.includes('-');
};

const CategoryGridItem = memo(({
  subcategory,
  index,
  onPress,
}: {
  subcategory: Subcategory;
  index: number;
  onPress: () => void;
}) => {
  const color = subcategory.color || COLORS[index % COLORS.length];
  // Fixed cashback per category item instead of random
  const cashback = subcategory.cashback || (10 + (index % 8) * 2);
  const isIonicon = isIoniconName(subcategory.icon || '');

  return (
    <Pressable
      style={styles.gridItem}
      onPress={onPress}
     
      accessibilityLabel={`${subcategory.name} category`}
      accessibilityRole="button"
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        {isIonicon ? (
          <Ionicons
            name={subcategory.icon as any}
            size={26}
            color={color}
          />
        ) : (
          <Text style={styles.iconEmoji}>{subcategory.icon}</Text>
        )}
      </View>
      <Text style={styles.itemName} numberOfLines={2}>{subcategory.name}</Text>
      <View style={[styles.cashbackBadge, { backgroundColor: `${color}15` }]}>
        <Text style={[styles.cashbackText, { color }]}>{cashback}%</Text>
      </View>
    </Pressable>
  );
});

CategoryGridItem.displayName = 'CategoryGridItem';

const CategoryGridSection: React.FC<CategoryGridSectionProps> = ({
  subcategories,
  categorySlug,
  onSubcategoryPress,
}) => {
  const router = useRouter();

  const handlePress = useCallback((subcategory: Subcategory) => {
    if (onSubcategoryPress) {
      onSubcategoryPress(subcategory);
    } else {
      router.push({
        pathname: `/category/${subcategory.slug}`,
        params: { parentCategory: categorySlug },
      } as any);
    }
  }, [router, categorySlug, onSubcategoryPress]);

  if (!subcategories || subcategories.length === 0) {
    return null;
  }

  // Take first 12 items for the grid (3 rows x 4 columns)
  const displayItems = subcategories.slice(0, 12);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <Pressable
          style={styles.seeAllButton}
          onPress={() => router.push('/(tabs)/categories' as any)}
          accessibilityLabel="See all categories"
        >
          <Text style={styles.seeAllText}>See All</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {displayItems.map((subcategory, index) => (
          <CategoryGridItem
            key={subcategory.id || subcategory.slug}
            subcategory={subcategory}
            index={index}
            onPress={() => handlePress(subcategory)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    backgroundColor: colors.background.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.nileBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(11, 34, 64, 0.04), 0 8px 24px rgba(11, 34, 64, 0.06)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
    letterSpacing: -0.4,
  },
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.neutral[100],
    borderRadius: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconEmoji: {
    fontSize: 26,
  },
  itemName: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral[700],
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 14,
    minHeight: 28,
  },
  cashbackBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cashbackText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

export default memo(CategoryGridSection);
