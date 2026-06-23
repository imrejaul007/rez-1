// @ts-nocheck
import React, { useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { ThemedText } from '@/components/ThemedText';
import { HomeDeliveryProductCard } from './HomeDeliveryProductCard';
import { ProductGridProps, HomeDeliveryProduct } from '@/types/home-delivery.types';
import { colors } from '@/constants/theme';

const { width } = Dimensions.get('window');

// Estimated card height for getItemLayout optimization
const ESTIMATED_CARD_HEIGHT = 280;

export const ProductGrid = memo(function ProductGrid({
  products,
  loading,
  onProductPress,
  onLoadMore,
  hasMore,
  numColumns = 2,
  showHeader = true,
}: ProductGridProps) {
  const cardWidth = (width - 64) / numColumns; // Account for padding and gaps

  const renderProductCard = useCallback(({ item }: ListRenderItemInfo<HomeDeliveryProduct>) => (
    <View style={[styles.cardContainer, { width: cardWidth }]}>
      <HomeDeliveryProductCard
        product={item}
        onPress={() => onProductPress(item)}
        showCashback={true}
        showDeliveryTime={true}
      />
    </View>
  ), [cardWidth, onProductPress]);

  const renderEmptyState = () => (
    <View
      style={styles.emptyContainer}
      accessibilityRole="alert"
      accessibilityLabel="No products found. Try adjusting your search or filters"
    >
      <ThemedText style={styles.emptyTitle}>No products found</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Try adjusting your search or filters
      </ThemedText>
    </View>
  );

  const renderLoadingFooter = () => {
    if (!hasMore || !loading) return null;

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
      <View style={styles.headerContainer}>
        <ThemedText style={styles.resultCount}>
          {products.length} product{products.length !== 1 ? 's' : ''} found
        </ThemedText>
      </View>
    );
  };

  const handleEndReached = useCallback(() => {
    if (hasMore && !loading) {
      onLoadMore();
    }
  }, [hasMore, loading, onLoadMore]);

  const keyExtractor = useCallback((item: HomeDeliveryProduct) => item.id, []);

  if (loading && products.length === 0) {
    return (
      <View
        style={styles.loadingContainer}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading products"
        accessibilityValue={{ text: "Loading" }}
      >
        <ActivityIndicator size="large" color={colors.brand.purpleLight} />
        <ThemedText style={styles.loadingText}>Loading products...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={products}
        renderItem={renderProductCard}
        keyExtractor={keyExtractor}
        numColumns={numColumns}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          products.length === 0 && styles.emptyContentContainer,
        ]}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderLoadingFooter}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        estimatedItemSize={220}
      />
    </View>
);
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardContainer: {
    marginVertical: 8,
    marginHorizontal: 4,
  },
  separator: {
    height: 12,
  },
  headerContainer: {
    paddingVertical: 12,
    paddingBottom: 16,
  },
  resultCount: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.neutral[400],
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
    fontWeight: '500',
  },
});