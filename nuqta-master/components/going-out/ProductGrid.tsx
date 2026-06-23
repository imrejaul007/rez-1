// @ts-nocheck
import React, { useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { ThemedText } from '@/components/ThemedText';
import { GoingOutProductCard } from './GoingOutProductCard';
import { ProductGridProps } from '@/types/going-out.types';
import { colors } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');
const PADDING = 16;
const GAP = 16;

export const ProductGrid = memo(function ProductGrid({
  products,
  loading,
  onProductPress,
  onToggleWishlist,
  onLoadMore,
  hasMore = false,
  numColumns = 2,
  wishlist = [],
  showHeader = true,
}: ProductGridProps) {
  const cardWidth = (screenWidth - (PADDING * 2) - (GAP * (numColumns - 1))) / numColumns;

  const renderProduct = useCallback(({ item, index }: ListRenderItemInfo<any>) => (
    <View
      style={[
        styles.productContainer,
        {
          width: cardWidth,
          marginRight: (index + 1) % numColumns === 0 ? 0 : GAP,
        },
      ]}
    >
      <GoingOutProductCard
        product={item}
        onPress={onProductPress}
        onToggleWishlist={onToggleWishlist}
        width={cardWidth}
        isInWishlist={wishlist.includes(item.id)}
      />
    </View>
  ), [cardWidth, onProductPress, onToggleWishlist, wishlist, numColumns]);

  const renderLoadingFooter = () => {
    if (!loading || !hasMore) return null;

    return (
      <View
        style={styles.loadingFooter}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading more products"
        accessibilityValue={{ text: "Loading" }}
      >
        <ActivityIndicator size="small" color={colors.brand.purpleLight} />
        <ThemedText style={styles.loadingText}>Loading more products...</ThemedText>
      </View>
    );
  };

  const renderHeader = () => {
    if (!showHeader || products.length === 0) return null;

    return (
      <View
        style={styles.headerContainer}
        accessibilityRole="header"
        accessibilityLabel={`${products.length} product${products.length !== 1 ? 's' : ''} found`}
      >
        <ThemedText style={styles.resultCount}>
          {products.length} product{products.length !== 1 ? 's' : ''} found
        </ThemedText>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View
      style={styles.emptyContainer}
      accessibilityRole="text"
      accessibilityLabel="No products found. Try adjusting your search or category filters"
    >
      <ThemedText style={styles.emptyTitle}>No products found</ThemedText>
      <ThemedText style={styles.emptyDescription}>
        Try adjusting your search or category filters
      </ThemedText>
    </View>
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  return (
    <View style={styles.container}>
      <FlashList
        data={products}
        renderItem={renderProduct}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderLoadingFooter}
        ListEmptyComponent={!loading ? renderEmptyState : null}
        estimatedItemSize={220}
      />

      {/* Initial Loading State */}
      {loading && products.length === 0 && (
        <View
          style={styles.initialLoadingContainer}
          accessibilityRole="progressbar"
          accessibilityLabel="Loading products"
          accessibilityValue={{ text: "Loading" }}
        >
          <ActivityIndicator size="large" color={colors.brand.purpleLight} />
          <ThemedText style={styles.initialLoadingText}>
            Loading products...
          </ThemedText>
        </View>
      )}
    </View>
);
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  listContainer: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  productContainer: {
    marginBottom: GAP,
    marginHorizontal: 2,
  },
  loadingFooter: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 16,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 20,
  },
  initialLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  initialLoadingText: {
    fontSize: 16,
    color: colors.neutral[500],
    marginTop: 16,
  },
  headerContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  resultCount: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[700],
  },
});