// @ts-nocheck
import React, { useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ProductGridProps, ProductItem } from '@/types/store-search';
import ProductCard from './ProductCard';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  PRODUCT_GRID
} from '@/constants/search-constants';

// Estimated card height for getItemLayout optimization
const ESTIMATED_CARD_HEIGHT = 220; // Approximate height of a product card row

const ProductGrid: React.FC<ProductGridProps> = memo(({
  products,
  store,
  onProductSelect,
  maxItems = 4,
  columns = PRODUCT_GRID.COLUMNS,
}) => {
  const screenWidth = Dimensions.get('window').width;

  // Limit products to display
  const productsToShow = products.slice(0, maxItems);
  const remainingCount = products.length - maxItems;

  const styles = createStyles(screenWidth, columns);

  // Memoized render function for FlatList items
  const renderItem = useCallback(({ item }: ListRenderItemInfo<ProductItem>) => (
    <View style={styles.productContainer}>
      <ProductCard
        product={item}
        store={store}
        onPress={onProductSelect}
        size="medium"
      />
    </View>
  ), [store, onProductSelect, styles.productContainer]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: ProductItem) =>
    item.productId || String(Math.random()),
  []);

  // Empty state
  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          No products available
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Virtualized Product Grid with FlatList */}
      <FlashList
        data={productsToShow}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={columns}
        scrollEnabled={false} // Parent ScrollView handles scrolling
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        initialNumToRender={maxItems} // Only render visible items initially
        maxToRenderPerBatch={columns * 2} // Render 2 rows at a time
        windowSize={3} // Keep 3 screens of content in memory
        removeClippedSubviews={true} // Unmount off-screen items (Android optimization)
        estimatedItemSize={220}
      />

      {/* Show More Products Indicator */}
      {remainingCount > 0 && (
        <View style={styles.moreProductsContainer}>
          <ThemedText style={styles.moreProductsText}>
            +{remainingCount} more {remainingCount === 1 ? 'product' : 'products'}
          </ThemedText>
          <Ionicons name="arrow-forward" size={12} color={COLORS.TEXT_SECONDARY} style={{ marginLeft: 4 }} />
        </View>
      )}
    </View>
  );
});

const createStyles = (screenWidth: number, columns: number) => {
  const isTablet = screenWidth > 768;
  const horizontalPadding = isTablet ? 24 : 16;
  const gridSpacing = PRODUCT_GRID.SPACING;

  return StyleSheet.create({
    container: {
      width: '100%',
      alignItems: 'center', // Center the entire grid
    },
    grid: {
      width: '100%',
      alignItems: 'center', // Center grid content
    },
    row: {
      flexDirection: 'row',
      marginBottom: SPACING.SM,
      marginHorizontal: -SPACING.XS,
      alignItems: 'stretch',
      justifyContent: 'space-between',
    },
    productContainer: {
      flex: 1,
      paddingHorizontal: SPACING.XS, // Consistent padding between products
      alignItems: 'center', // Center each card within its container
    },
    moreProductsContainer: {
      flexDirection: 'row',
      backgroundColor: '#F0FFF7',
      borderRadius: 12,
      paddingVertical: SPACING.SM,
      paddingHorizontal: SPACING.LG,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: SPACING.SM,
      borderWidth: 1,
      borderColor: 'rgba(0, 192, 106, 0.12)',
    },
    moreProductsText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      color: colors.successScale[700],
      fontWeight: '600',
    },
    emptyContainer: {
      backgroundColor: COLORS.GRAY_50,
      borderRadius: BORDER_RADIUS.LG,
      paddingVertical: SPACING.XL,
      paddingHorizontal: SPACING.LG,
      alignItems: 'center',
      marginTop: SPACING.SM,
    },
    emptyText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_BASE,
      color: COLORS.TEXT_SECONDARY,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_MEDIUM,
    },
  });
};

export default ProductGrid;