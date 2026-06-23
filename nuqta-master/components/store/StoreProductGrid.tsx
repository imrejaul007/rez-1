// @ts-nocheck
import React, { useCallback, memo } from 'react';
import { View, StyleSheet, Dimensions, ListRenderItemInfo } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ProductItem } from '@/types/homepage.types';
import StoreProductCard from './StoreProductCard';
import StoreProductCardSkeleton from './StoreProductCardSkeleton';
import { useRouter } from 'expo-router';

interface StoreProductGridProps {
  products: ProductItem[];
  loading?: boolean;
  onProductPress?: (product: ProductItem) => void;
}

// Estimated card height for getItemLayout optimization
const ESTIMATED_CARD_HEIGHT = 280;

const StoreProductGrid = memo(function StoreProductGrid({
  products,
  loading = false,
  onProductPress,
}: StoreProductGridProps) {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;

  // Determine number of columns based on screen width
  const numColumns = screenWidth > 768 ? 3 : 2;
  const itemGap = 12;
  const containerPadding = 0;

  // Memoized product press handler
  const handleProductPress = useCallback((product: ProductItem) => {
    if (onProductPress) {
      onProductPress(product);
    } else {
      // Default navigation to product detail page
      router.push(`/product-page?cardId=${product.id}&cardType=product` as any);
    }
  }, [onProductPress, router]);

  // Memoized render function for products
  const renderProduct = useCallback(({ item }: ListRenderItemInfo<ProductItem>) => (
    <View style={[styles.itemWrapper, { paddingHorizontal: itemGap / 2 }]}>
      <StoreProductCard
        product={item}
        onPress={() => handleProductPress(item)}
        variants={(item as any).variants}
      />
    </View>
  ), [handleProductPress, itemGap]);

  // Memoized render function for skeletons
  const renderSkeleton = useCallback(() => (
    <View style={[styles.itemWrapper, { paddingHorizontal: itemGap / 2 }]}>
      <StoreProductCardSkeleton />
    </View>
  ), [itemGap]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: ProductItem | null, index: number) => {
    if (loading || item === null) {
      return `skeleton-${index}`;
    }
    return `product-${item.id || item._id || index}`;
  }, [loading]);

  // Render skeleton loaders
  if (loading) {
    const skeletonCount = 6;
    return (
      <FlashList
        data={Array(skeletonCount).fill(null)}
        renderItem={renderSkeleton}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={{ paddingHorizontal: containerPadding }}
        scrollEnabled={false}
        estimatedItemSize={ESTIMATED_CARD_HEIGHT}
      />
    );
  }

  // Render product grid with virtual scrolling optimizations
  return (
    <FlashList
      data={products}
      renderItem={renderProduct}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      contentContainerStyle={{ paddingHorizontal: containerPadding }}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      estimatedItemSize={ESTIMATED_CARD_HEIGHT}
    />
  );
});

export default StoreProductGrid;

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  itemWrapper: {
    flex: 1,
    maxWidth: '50%',
  },
});
