// @ts-nocheck
/**
 * ResponsiveProductGrid Component
 *
 * Auto-adjusting product grid that adapts to screen size.
 * Uses FlatList for performance with large datasets.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { spacing } from '@/constants/theme';
interface Product {
  id: string;
  [key: string]: any;
}

interface ResponsiveProductGridProps {
  /**
   * Array of products to display
   */
  products: Product[];

  /**
   * Render function for each product
   * Receives product data and calculated card width
   */
  renderProduct: (product: Product, width: number) => React.ReactElement;

  /**
   * Callback when user scrolls near the end (for pagination)
   */
  onEndReached?: () => void;

  /**
   * How far from the end (0-1) to trigger onEndReached
   */
  onEndReachedThreshold?: number;

  /**
   * Minimum card width for responsive calculation (default: 150)
   */
  minCardWidth?: number;

  /**
   * Gap between cards (default: spacing.md)
   */
  gap?: number;

  /**
   * Additional styles for the container
   */
  style?: ViewStyle;

  /**
   * Component to show when loading more items
   */
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;

  /**
   * Component to show when list is empty
   */
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;

  /**
   * Component to show at the top of the list
   */
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;

  /**
   * Whether the grid is currently loading more items
   */
  isLoadingMore?: boolean;
}

/**
 * ResponsiveProductGrid provides an optimized grid layout for products
 *
 * @example
 * <ResponsiveProductGrid
 *   products={products}
 *   renderProduct={(product, width) => (
 *     <ProductCard product={product} width={width} />
 *   )}
 *   onEndReached={loadMoreProducts}
 * />
 */
function ResponsiveProductGrid({
  products,
  renderProduct,
  onEndReached,
  onEndReachedThreshold = 0.5,
  minCardWidth = 150,
  gap = spacing.md,
  style,
  ListFooterComponent,
  ListEmptyComponent,
  ListHeaderComponent,
  isLoadingMore = false,
}: ResponsiveProductGridProps) {
  const { numColumns, cardWidth } = useResponsiveGrid(minCardWidth, gap);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <View
        style={[styles.itemWrapper, { padding: gap / 2 }]}
        accessible={false}
      >
        {renderProduct(item, cardWidth)}
      </View>
    ),
    [renderProduct, cardWidth, gap]
  );

  const keyExtractor = useCallback(
    (item: Product, index: number) => item.id || `product-${index}`,
    []
  );

  return (
    <FlashList
      data={products}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      contentContainerStyle={[styles.content, style]}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      showsVerticalScrollIndicator={true}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={8}
      estimatedItemSize={220}
      accessible={true}
      accessibilityRole="list"
      accessibilityLabel="Product grid"
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.sm,
  },
  itemWrapper: {
    flex: 1,
  },
});

export default React.memo(ResponsiveProductGrid);
