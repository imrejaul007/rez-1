import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Brand Detail Page
 * Shows brand information and products
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import storesApi from '@/services/storesApi';
import productsApi from '@/services/productsApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { DetailPageSkeleton } from '@/components/skeletons';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Brand configurations
const brandConfigs: Record<string, {
  name: string;
  logo: string;
  description: string;
  color: string;
  category: string;
  tags: string[];
}> = {
  nykaa: {
    name: 'Nykaa',
    logo: '💅',
    description: 'India\'s leading beauty and wellness destination',
    color: colors.brand.pink,
    category: 'Beauty',
    tags: ['beauty', 'cosmetics', 'skincare', 'nykaa'],
  },
  sephora: {
    name: 'Sephora',
    logo: '💄',
    description: 'Premium beauty retailer with top brands',
    color: '#000000',
    category: 'Beauty',
    tags: ['beauty', 'cosmetics', 'sephora'],
  },
  mac: {
    name: 'MAC',
    logo: '💋',
    description: 'Professional quality makeup for all',
    color: '#1C1C1C',
    category: 'Makeup',
    tags: ['makeup', 'cosmetics', 'mac'],
  },
  'forest essentials': {
    name: 'Forest Essentials',
    logo: '🌿',
    description: 'Luxurious Ayurveda skincare',
    color: Colors.success,
    category: 'Skincare',
    tags: ['skincare', 'ayurveda', 'organic'],
  },
};

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  image: string;
  cashback: string;
}

const BrandPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const brandKey = name?.toLowerCase() || 'nykaa';
  const brandConfig = brandConfigs[brandKey] || {
    name: name?.charAt(0).toUpperCase() + name?.slice(1) || 'Brand',
    logo: '🏪',
    description: 'Discover amazing products',
    color: Colors.gold,
    category: 'Products',
    tags: [brandKey],
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Transform product data
  const transformProduct = (product: any): Product => {
    const basePrice = product.pricing?.basePrice || product.price || 0;
    const salePrice = product.pricing?.salePrice || basePrice;
    const discount = basePrice > salePrice ? Math.round((1 - salePrice / basePrice) * 100) : 0;

    return {
      id: product._id || product.id,
      name: product.name,
      price: salePrice,
      originalPrice: basePrice,
      discount,
      rating: product.ratings?.average || 4.5,
      image: product.images?.[0]?.url || product.images?.[0] || product.image,
      cashback: product.cashback?.percentage ? `${product.cashback.percentage}%` : '10%',
    };
  };

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setError(null);
      const response = await productsApi.getProducts({
        tags: brandConfig.tags,
        limit: 20,
      });

      if (response.success && response.data?.products) {
        if (!isMounted()) return;
        setProducts(response.data.products.map(transformProduct));
      } else {
        if (!isMounted()) return;
        setProducts([]);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load products');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [brandConfig.tags]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const handleProductPress = (product: Product) => {
    router.push(`/product-page?productId=${product.id}` as any);
  };

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[brandConfig.color, brandConfig.color + 'CC']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Pressable onPress={() => router.push('/search' as any)} style={styles.searchButton}>
            <Ionicons name="search" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        <View style={styles.brandInfo}>
          <View style={styles.brandLogoContainer}>
            <Text style={styles.brandLogo}>{brandConfig.logo}</Text>
          </View>
          <Text style={styles.brandName}>{brandConfig.name}</Text>
          <Text style={styles.brandDescription}>{brandConfig.description}</Text>
          <View style={styles.brandStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{products.length}+</Text>
              <Text style={styles.statLabel}>Products</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>30%</Text>
              <Text style={styles.statLabel}>Max Cashback</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>2X</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[brandConfig.color]}
          />
        }
      >
        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.text.tertiary} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={[styles.retryButton, { backgroundColor: brandConfig.color }]} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Empty State */}
        {!error && products.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>{brandConfig.logo}</Text>
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySubtitle}>
              We're adding more {brandConfig.name} products soon!
            </Text>
          </View>
        )}

        {/* Products Grid */}
        {products.length > 0 && (
          <View style={styles.productsContainer}>
            <Text style={styles.sectionTitle}>All Products</Text>
            <View style={styles.productsGrid}>
              {products.map((product) => (
                <Pressable
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => handleProductPress(product)}
                 
                >
                  <View style={styles.productImageContainer}>
                    <CachedImage source={product.image} style={styles.productImage} />
                    {product.discount > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{product.discount}% OFF</Text>
                      </View>
                    )}
                    <View style={styles.cashbackBadge}>
                      <Text style={styles.cashbackText}>{product.cashback}</Text>
                    </View>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={12} color={Colors.warning} />
                      <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                    </View>
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>{currencySymbol}{product.price.toLocaleString()}</Text>
                      {product.discount > 0 && (
                        <Text style={styles.originalPrice}>{currencySymbol}{product.originalPrice.toLocaleString()}</Text>
                      )}
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  searchButton: {
    padding: Spacing.sm,
  },
  brandInfo: {
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  brandLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  brandLogo: {
    fontSize: 40,
  },
  brandName: {
    fontSize: Typography.h2.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  brandDescription: {
    fontSize: Typography.body.fontSize,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  brandStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  statValue: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  statLabel: {
    fontSize: Typography.caption.fontSize,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    marginTop: 40,
  },
  errorText: {
    fontSize: Typography.bodyLarge.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.base,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  retryButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  productsContainer: {
    padding: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.base,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  productCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImageContainer: {
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 150,
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  discountText: {
    fontSize: Typography.overline.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackText: {
    fontSize: Typography.overline.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  productInfo: {
    padding: Spacing.md,
  },
  productName: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginBottom: 6,
    minHeight: 36,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  originalPrice: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
});

export default withErrorBoundary(BrandPage, 'BrandName');
