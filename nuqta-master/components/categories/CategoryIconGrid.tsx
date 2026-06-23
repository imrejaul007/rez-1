// @ts-nocheck
import React, { memo, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CategoryIconItem from './CategoryIconItem';

interface Category {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  metadata?: {
    color?: string;
  };
  sortOrder?: number;
}

interface CategoryIconGridProps {
  categories: Category[];
  onCategoryPress: (slug: string) => void;
  maxItems?: number;
  numColumns?: number;
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CategoryIconGrid: React.FC<CategoryIconGridProps> = memo(({
  categories,
  onCategoryPress,
  maxItems = 8,
  numColumns = 2,
  size = 'medium',
  loading = false,
}) => {
  // Normalize categories to have consistent id field
  const normalizedCategories = useMemo(() => {
    return categories
      .slice(0, maxItems)
      .map((cat) => ({
        ...cat,
        id: cat.id || cat._id || cat.slug,
      }));
  }, [categories, maxItems]);

  // Calculate item width based on columns
  const itemWidth = useMemo(() => {
    const containerPadding = 32; // 16px on each side
    const gap = 16 * (numColumns - 1);
    return (SCREEN_WIDTH - containerPadding - gap) / numColumns;
  }, [numColumns]);

  const renderItem = ({ item }: { item: Category }) => (
    <View style={[styles.itemContainer, { width: itemWidth }]}>
      <CategoryIconItem
        category={item}
        onPress={onCategoryPress}
        size={size}
      />
    </View>
  );

  const keyExtractor = (item: Category) => item.id || item.slug;

  if (loading || normalizedCategories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={normalizedCategories}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        scrollEnabled={false}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={80}
      />
    </View>
  );
});

CategoryIconGrid.displayName = 'CategoryIconGrid';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  gridContent: {
    paddingHorizontal: 16,
  },
  itemContainer: {
    alignItems: 'center',
  },
});

export default CategoryIconGrid;
