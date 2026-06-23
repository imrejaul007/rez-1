// @ts-nocheck
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '@/components/homepage/cards/ProductCard';
import { usePersonalizedRecommendations } from '@/hooks/useRecommendations';
import { ProductItem } from '@/types/homepage.types';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Calculate responsive card width
const getCardWidth = () => {
  if (Platform.OS === 'web') {
    if (SCREEN_WIDTH >= 1024) return 220; // Desktop
    if (SCREEN_WIDTH >= 768) return 200; // Tablet
  }
  return 180; // Mobile
};

interface CrossStoreProductsSectionProps {
  currentStoreId?: string; // To exclude current store products
  onProductPress?: (productId: string, product: ProductItem) => void;
  limit?: number;
}

const CrossStoreProductsSection: React.FC<CrossStoreProductsSectionProps> = ({
  currentStoreId,
  onProductPress,
  limit = 10,
}) => {
  const router = useRouter();
  const [cardWidth] = useState(getCardWidth());

  // Exclude current store products from recommendations
  // Note: Set to undefined instead of empty array to avoid API validation error
  const excludeProducts = useMemo(() => undefined, []);

  // Fetch personalized recommendations
  const {
    recommendations,
    loading,
    error,
    fetch,
    refresh,
  } = usePersonalizedRecommendations({
    autoFetch: true,
    limit,
    excludeProducts,
  });

  // Filter out products from current store and invalid products (no price or no image)
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;

    // Filter out current store products
    if (currentStoreId) {
      filtered = filtered.filter((rec: any) => {
        const productData = rec.product || rec;
        const productStoreId = productData.storeId || productData.store?._id || productData.store;
        return productStoreId !== currentStoreId;
      });
    }

    // Filter out products with invalid price (0 or missing) or missing image
    filtered = filtered.filter((rec: any) => {
      const productData = rec.product || rec;
      // Check multiple price field formats
      const price = productData.pricing?.selling || productData.pricing?.basePrice || productData.price?.current || productData.price || 0;
      // Check multiple image field formats
      const image = productData.image || productData.images?.[0] || productData.imageUrl;

      const hasValidPrice = price && price > 0;
      const hasValidImage = image && typeof image === 'string' && !image.includes('placeholder');

      return hasValidPrice && hasValidImage;
    });

    return filtered;
  }, [recommendations, currentStoreId]);

  // Convert recommendations to ProductItem format
  // Note: API returns ProductRecommendation objects with nested product data
  const products: ProductItem[] = useMemo(() => {
    return filteredRecommendations.map((rec: any) => {
      // Handle both direct product data and nested product structure
      const productData = rec.product || rec;

      // Extract price from multiple possible formats
      const currentPrice = productData.pricing?.selling || productData.pricing?.basePrice || productData.price?.current || productData.price || 0;
      const originalPrice = productData.pricing?.original || productData.pricing?.mrp || productData.price?.original;
      const discount = productData.pricing?.discount || productData.price?.discount || 0;

      // Extract image from multiple possible formats
      const image = productData.image || productData.images?.[0] || productData.imageUrl || '';

      // Extract rating from multiple possible formats
      const ratingValue = productData.ratings?.average || productData.rating?.value || 0;
      const ratingCount = productData.ratings?.count || productData.rating?.count || 0;

      return {
        id: productData.id || productData._id,
        _id: productData._id || productData.id,
        type: 'product' as const,
        name: productData.name,
        title: productData.name,
        brand: productData.brand || 'Brand',
        image: image,
        description: productData.description,
        price: {
          current: currentPrice,
          original: originalPrice,
          currency: 'INR',
          discount: discount,
        },
        category: productData.category?.name || productData.category || 'General',
        subcategory: productData.subCategory?.name || productData.subcategory,
        rating: ratingValue > 0 ? {
          value: ratingValue,
          count: ratingCount,
        } : undefined,
        cashback: productData.cashback,
        availabilityStatus: productData.inventory?.isAvailable !== false ? 'in_stock' : 'out_of_stock',
        inventory: productData.inventory,
        tags: productData.tags || [],
        isNewArrival: productData.isNewArrival,
        isRecommended: true,
        storeName: productData.storeName || productData.store?.name,
        storeId: productData.storeId || productData.store?._id || productData.store,
        // Include recommendation metadata if available
        recommendationScore: rec.score,
        recommendationReasons: rec.reasons,
      } as ProductItem & { recommendationScore?: number; recommendationReasons?: string[] };
    });
  }, [filteredRecommendations]);

  // Handle product press
  const handleProductPress = useCallback(
    (product: ProductItem) => {
      const productId = product._id || product.id;
      if (onProductPress) {
        onProductPress(productId, product);
      } else {
        router.push(`/product-page?cardId=${productId}&cardType=product` as any);
      }
    },
    [onProductPress, router]
  );

  // Handle retry
  const handleRetry = useCallback(() => {
    refresh();
  }, [refresh]);

  // Handle view all
  const handleViewAll = useCallback(() => {
    router.push('/search');
  }, [router]);

  // Handle add to cart (will be handled by ProductCard internally)
  const handleAddToCart = useCallback(async (product: ProductItem) => {
    // ProductCard handles this internally via CartContext
  }, []);

  // Render skeleton loader
  const renderSkeleton = () => {
    return (
      <View style={styles.skeletonContainer}>
        <ActivityIndicator size="large" color={colors.lightMustard} />
        <ThemedText style={styles.skeletonText}>Loading recommendations...</ThemedText>
      </View>
    );
  };

  // Render error state
  const renderError = () => {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <ThemedText style={styles.errorTitle}>Failed to load recommendations</ThemedText>
        <ThemedText style={styles.errorMessage}>{error || 'Something went wrong'}</ThemedText>
        <Pressable
          style={styles.retryButton}
          onPress={handleRetry}
         
          accessibilityLabel="Retry loading recommendations"
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={20} color={colors.background.primary} />
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </Pressable>
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="basket-outline" size={64} color={colors.neutral[400]} />
        <ThemedText style={styles.emptyTitle}>No recommendations available</ThemedText>
        <ThemedText style={styles.emptyMessage}>
          Check back later for personalized product recommendations
        </ThemedText>
      </View>
    );
  };

  // Render product with store badge
  const renderProduct = ({ item, index }: { item: ProductItem; index: number }) => {
    return (
      <View
        style={[styles.productWrapper, { width: cardWidth }]}
        accessible={true}
        accessibilityLabel={`Product ${index + 1} of ${products.length}. ${item.name} from ${item.storeName || 'Store'}`}
      >
        <ProductCard
          product={item}
          onPress={handleProductPress}
          onAddToCart={handleAddToCart}
          width={cardWidth}
          showAddToCart={true}
        />
        {/* Store Badge removed - was overlapping with card content */}
      </View>
    );
  };

  // Always render section, show empty state if no products
  // if (!loading && products.length === 0 && !error) {
  //   return null;
  // }

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel="Cross-store product recommendations section"
      accessibilityRole="none"
    >
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={24} color={colors.lightMustard} />
          <ThemedText style={styles.title}>Recommended for You</ThemedText>
        </View>
        {!loading && !error && products.length > 0 && (
          <Pressable
            style={styles.viewAllButton}
            onPress={handleViewAll}
           
            accessibilityLabel="View all recommendations"
            accessibilityRole="button"
            accessibilityHint="Double tap to see all recommended products"
          >
            <ThemedText style={styles.viewAllText}>View All</ThemedText>
            <Ionicons name="chevron-forward" size={16} color={colors.lightMustard} />
          </Pressable>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          renderSkeleton()
        ) : error ? (
          renderError()
        ) : products.length === 0 ? (
          renderEmpty()
        ) : (
          <FlashList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item, index) => item._id || item.id || `product-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
            estimatedItemSize={220}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            accessibilityLabel={`${products.length} recommended products`}
            accessibilityRole="list"
          />
        )}
      </View>
    </View>
  );
};

export default React.memo(CrossStoreProductsSection);

const styles = StyleSheet.create({
  container: {
    // No background/shadow - parent sectionCard provides that
    paddingVertical: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray[900],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 192, 106, 0.1)',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.lightMustard,
  },
  content: {
    minHeight: 180,
  },
  listContainer: {
    paddingHorizontal: 0,
  },
  itemSeparator: {
    width: 12,
  },
  productWrapper: {
    position: 'relative',
  },
  storeBadgeContainer: {
    position: 'absolute',
    bottom: 90, // Moved higher to avoid overlapping with price/cart section
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    zIndex: 1,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 192, 106, 0.3)',
    alignSelf: 'flex-start',
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  storeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.nileBlue,
    flexShrink: 1,
  },
  // Skeleton Loader
  skeletonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  skeletonText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 12,
  },
  // Error State
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginTop: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 4,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.lightMustard,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.white,
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginTop: 16,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 4,
    textAlign: 'center',
  },
});
