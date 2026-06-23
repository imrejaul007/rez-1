// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { ProductItem } from '@/types/homepage.types';
import StoreProductCard from './StoreProductCard';
import SkeletonLoader from '@/components/common/SkeletonLoader';
import productsService from '@/services/productsApi';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface RelatedProductsProps {
  productId: string;
  currentProduct?: ProductItem;
  onProductPress?: (product: ProductItem) => void;
  limit?: number;
  showViewAll?: boolean;
  title?: string;
}

function RelatedProducts({
  productId,
  currentProduct,
  onProductPress,
  limit = 10,
  showViewAll = true,
  title = 'You May Also Like',
}: RelatedProductsProps) {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const isMounted = useIsMounted();
  const { showError } = useToast();
  const router = useRouter();

  // Fetch related products
  const fetchRelatedProducts = async (isRetry = false) => {
    if (isRetry) {
      setRetrying(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await productsService.getRelatedProducts(productId, limit);

      if (response.success && response.data && Array.isArray(response.data)) {
        // Filter out the current product if it's in the results
        const filteredProducts = response.data.filter(p => p.id !== productId);
        if (!isMounted()) return;
        setProducts(filteredProducts);
        setError(null);
      } else {
        throw new Error(response.message || 'Failed to fetch related products');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load related products';
      if (!isMounted()) return;
      setError(errorMessage);

      if (!isRetry) {
        showError(errorMessage);
      }
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchRelatedProducts();
    }
  }, [productId]);

  // Handle product press
  const handleProductPress = (product: ProductItem) => {
    if (onProductPress) {
      onProductPress(product);
    } else {
      // Default navigation to product detail
      router.push(`/product-page?cardId=${product.id}&cardType=product` as any);
    }
  };

  // Handle view all press
  const handleViewAllPress = () => {
    if (currentProduct?.category) {
      router.push(`/category/${currentProduct.category.toLowerCase()}`);
    } else {
      router.push('/products');
    }
  };

  // Handle retry
  const handleRetry = () => {
    fetchRelatedProducts(true);
  };

  // Render product card
  const renderProductCard = ({ item }: { item: ProductItem }) => (
    <View style={styles.cardWrapper}>
      <StoreProductCard
        product={item}
        onPress={() => handleProductPress(item)}
      />
    </View>
  );

  // Render skeleton loader
  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3].map((index) => (
        <View key={index} style={styles.skeletonCard}>
          <SkeletonLoader width="100%" height={180} borderRadius={12} />
          <View style={styles.skeletonContent}>
            <SkeletonLoader width="90%" height={16} style={styles.skeletonTitle} />
            <SkeletonLoader width="60%" height={14} style={styles.skeletonSubtitle} />
            <SkeletonLoader width="40%" height={20} style={styles.skeletonPrice} />
          </View>
        </View>
      ))}
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🛍️</Text>
      <Text style={styles.emptyTitle}>No Related Products</Text>
      <Text style={styles.emptyDescription}>
        We couldn't find any related products at the moment. Check back later!
      </Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Failed to Load</Text>
      <Text style={styles.errorDescription}>{error}</Text>
      <Pressable
        style={styles.retryButton}
        onPress={handleRetry}
        disabled={retrying}
       
      >
        {retrying ? (
          <>
            <ActivityIndicator size="small" color={colors.background.primary} />
            <Text style={styles.retryText}>Retrying...</Text>
          </>
        ) : (
          <Text style={styles.retryText}>Try Again</Text>
        )}
      </Pressable>
    </View>
  );

  // Don't render if no productId
  if (!productId) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {showViewAll && products.length > limit && (
          <Pressable onPress={handleViewAllPress}>
            <Text style={styles.viewAllText}>View All</Text>
          </Pressable>
        )}
      </View>

      {/* Content */}
      {loading ? (
        renderSkeleton()
      ) : error ? (
        renderErrorState()
      ) : products.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlashList
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          decelerationRate="fast"
          snapToAlignment="start"
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          initialNumToRender={3}
          windowSize={5}
          estimatedItemSize={220}
        />
      )}
    </View>
  );
}

// Constants
const CARD_WIDTH = 200;
const CARD_SPACING = 16;

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purple,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginRight: CARD_SPACING,
  },

  // Skeleton Loader
  skeletonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  skeletonCard: {
    width: CARD_WIDTH,
    marginRight: CARD_SPACING,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  skeletonContent: {
    padding: 12,
  },
  skeletonTitle: {
    marginBottom: 8,
  },
  skeletonSubtitle: {
    marginBottom: 8,
  },
  skeletonPrice: {
    marginBottom: 0,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },

  // Error State
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.purple,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purple,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  retryText: {
    color: colors.text.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default React.memo(RelatedProducts);
