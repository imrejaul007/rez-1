import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Category } from '@/types/earnPage.types';
import { EARN_COLORS } from '@/constants/EarnPageColors';
import CategoryTile from './CategoryTile';

interface CategoryGridProps {
  categories: Category[];
  onCategoryPress: (category: Category) => void;
  columns?: number;
  scrollable?: boolean;
  maxHeight?: number;
}

function CategoryGrid({ 
  categories, 
  onCategoryPress, 
  columns = 3,
  scrollable = true,
  maxHeight = 600
}: CategoryGridProps) {
  const renderCategoriesInRows = () => {
    const rows = [];
    for (let i = 0; i < categories.length; i += columns) {
      const rowCategories = categories.slice(i, i + columns);
      rows.push(
        <View key={`row-${i}`} style={styles.row}>
          {rowCategories.map((category) => (
            <View key={category.id} style={styles.tileWrapper}>
              <CategoryTile
                category={category}
                onPress={() => onCategoryPress(category)}
                size="medium"
              />
            </View>
          ))}
          {/* Fill empty spaces in incomplete rows */}
          {rowCategories.length < columns && 
            Array.from({ length: columns - rowCategories.length }, (_, index) => (
              <View key={`empty-${index}`} style={[styles.tileWrapper, styles.emptyTile]} />
            ))
          }
        </View>
      );
    }
    return rows;
  };

  const content = (
    <View style={styles.container}>
      {renderCategoriesInRows()}
    </View>
  );
  
  if (!scrollable) {
    return content;
  }

  return (
    <ScrollView 
      style={[styles.scrollContainer, { maxHeight }]}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled={true}
      contentContainerStyle={styles.scrollContent}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tileWrapper: {
    flex: 1,
    marginHorizontal: 6,
  },
  emptyTile: {
    opacity: 0, // keeps grid spacing consistent
  },
});

export default React.memo(CategoryGrid);
