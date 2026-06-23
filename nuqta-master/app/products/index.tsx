import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Products Listing Page
 * Shows all products filtered by category with search and filtering capabilities
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
  TextInput,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import productsApi from '@/services/productsApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { CardGridSkeleton } from '@/components/skeletons';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Category configurations
const categoryConfigs: Record<string, {
  title: string;
  color: string;
  tags: string[];
  icon: string;
}> = {
  'beauty-wellness': {
    title: 'Beauty Products',
    color: colors.brand.pink,
    tags: ['beauty', 'cosmetics', 'skincare', 'makeup'],
    icon: '💄',
  },
  'fashion': {
    title: 'Fashion',
    color: Colors.brand.purple,
    tags: ['fashion', 'clothing', 'apparel', 'accessories'],
    icon: '👗',
  },
  'grocery-essentials': {
    title: 'Grocery & Essentials',
    color: Colors.success,
    tags: ['grocery', 'food', 'essentials'],
    icon: '🛒',
  },
  'healthcare': {
    title: 'Healthcare Products',
    color: Colors.error,
    tags: ['healthcare', 'medicine', 'supplements'],
    icon: '💊',
  },
  'default': {
    title: 'All Products',
    color: Colors.gold,
    tags: [],
    icon: '🛍️',
  },
};

interface DisplayProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  rating: number;
  reviewCount: number;
  price: number;
  originalPrice: number;
  discount: number;
  cashback: string;
  image: string;
  inStock: boolean;
}

const ProductsPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const categorySlug = (params.category as string) || 'default';
  const filterParam = params.filter as string;

  const config = categoryConfigs[categorySlug] || categoryConfigs['default'];

  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<DisplayProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<DisplayProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState(filterParam || 'all');
  const [sortBy, setSortBy] = useState<'relevance' | 'price-low' | 'price-high' | 'rating' | 'discount'>('relevance');

  const filters = [
    { id: 'all', label: 'All', icon: 'grid-outline' },
    { id: 'trending', label: 'Trending', icon: 'trending-up-outline' },
    { id: 'best-sellers', label: 'Best Sellers', icon: 'flame-outline' },
    { id: 'new-arrivals', label: 'New', icon: 'sparkles-outline' },
    { id: 'on-sale', label: 'On Sale', icon: 'pricetag-outline' },
  ];

  const sortOptions = [
    { id: 'relevance', label: 'Relevance' },
    { id: 'price-low', label: 'Price: Low to High' },
    { id: 'price-high', label: 'Price: High to Low' },
    { id: 'rating', label: 'Top Rated' },
    { id: 'discount', label: 'Biggest Discount' },
  ];

  // Transform product data
  const transformProduct = (product: any): DisplayProduct => {
    const basePrice = product.pricing?.basePrice || product.price || 0;
    const salePrice = product.pricing?.salePrice || basePrice;
    const discount = basePrice > salePrice ? Math.round((1 - salePrice / basePrice) * 100) : 0;

    return {
      id: product._id || product.id,
      name: product.name,
      brand: product.brand?.name || 'Brand',
      category: product.category?.name || 'Product',
      rating: product.ratings?.average || 4.5,
      reviewCount: product.ratings?.count || 0,
      price: salePrice,
      originalPrice: basePrice,
      discount,
      cashback: product.cashback?.percentage
        ? `${product.cashback.percentage}%`
        : '10%',
      image: product.images?.[0]?.url || product.images?.[0] || product.image,
      inStock: product.inventory?.quantity > 0 || product.inStock !== false,
    };
  };

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    try {
      setError(null);

      const response = await productsApi.getProducts({
        tags: config.tags.length > 0 ? config.tags : undefined,
        limit: 50,
      });

      if (response.success && response.data?.products) {
        const transformedProducts = response.data.products.map(transformProduct);
        if (!isMounted()) return;
        setProducts(transformedProducts);
        if (!isMounted()) return;
        setFilteredProducts(transformedProducts);
      } else {
        if (!isMounted()) return;
        setProducts([]);
        if (!isMounted()) return;
        setFilteredProducts([]);
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
  }, [config.tags]);

  useEffect(() => {
    setIsLoading(true);
    fetchProducts();
  }, [fetchProducts]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  // Apply filters, search, and sorting
  useEffect(() => {
    let result = [...products];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        product =>
          product.name.toLowerCase().includes(query) ||
          product.brand.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)
      );
    }

    // Apply filter
    if (selectedFilter === 'trending') {
      result = result.sort((a, b) => b.reviewCount - a.reviewCount);
    } else if (selectedFilter === 'best-sellers') {
      result = result.sort((a, b) => b.rating - a.rating);
    } else if (selectedFilter === 'new-arrivals') {
      // In a real app, sort by date added
      result = result.slice().reverse();
    } else if (selectedFilter === 'on-sale') {
      result = result.filter(product => product.discount > 0);
    }

    // Apply sorting
    if (sortBy === 'price-low') {
      result = result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result = result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      result = result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'discount') {
      result = result.sort((a, b) => b.discount - a.discount);
    }

    setFilteredProducts(result);
  }, [products, searchQuery, selectedFilter, sortBy]);

  // Handle product press
  const handleProductPress = (product: DisplayProduct) => {
    router.push(`/product-page?productId=${product.id}` as any);
  };

  // Handle add to cart
  const handleAddToCart = (product: DisplayProduct) => {
    router.push(`/product-page?productId=${product.id}&action=buy` as any);
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[config.color, config.color + 'DD']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{config.icon} {config.title}</Text>
            <Text style={styles.headerSubtitle}>{filteredProducts.length} products available</Text>
          </View>
          <Pressable onPress={() => router.push('/cart' as any)} style={styles.cartButton}>
            <Ionicons name="cart-outline" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => setSelectedFilter(filter.id)}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && { backgroundColor: config.color }
              ]}
            >
              <Ionicons
                name={filter.icon as any}
                size={14}
                color={selectedFilter === filter.id ? Colors.background.primary : Colors.text.tertiary}
              />
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter.id && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={styles.resultCount}>{filteredProducts.length} Results</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {sortOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={() => setSortBy(option.id as any)}
              style={[
                styles.sortChip,
                sortBy === option.id && styles.sortChipActive
              ]}
            >
              <Text style={[
                styles.sortChipText,
                sortBy === option.id && styles.sortChipTextActive
              ]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[config.color]}
          />
        }
      >
        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.text.tertiary} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={[styles.retryButton, { backgroundColor: config.color }]} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Empty State */}
        {!error && filteredProducts.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🛍️</Text>
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'We\'re adding more products soon!'}
            </Text>
          </View>
        )}

        {/* Products Grid */}
        {filteredProducts.length > 0 && (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <Pressable
                key={product.id}
                style={styles.productCard}
                onPress={() => handleProductPress(product)}
               
              >
                <View style={styles.productImageContainer}>
                  <CachedImage source={product.image} style={styles.productImage} />

                  {/* Discount Badge */}
                  {product.discount > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>{product.discount}% OFF</Text>
                    </View>
                  )}

                  {/* Cashback Badge */}
                  <View style={styles.cashbackBadge}>
                    <Text style={styles.cashbackText}>{product.cashback}</Text>
                  </View>

                  {/* Out of Stock Overlay */}
                  {!product.inStock && (
                    <View style={styles.outOfStockOverlay}>
                      <Text style={styles.outOfStockText}>Out of Stock</Text>
                    </View>
                  )}
                </View>

                <View style={styles.productInfo}>
                  <Text style={styles.productBrand}>{product.brand}</Text>
                  <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>

                  <View style={styles.ratingContainer}>
                    <Ionicons name="star" size={12} color={Colors.warning} />
                    <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                    <Text style={styles.reviewCount}>({product.reviewCount})</Text>
                  </View>

                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>{currencySymbol}{product.price.toLocaleString()}</Text>
                    {product.discount > 0 && (
                      <Text style={styles.originalPrice}>{currencySymbol}{product.originalPrice.toLocaleString()}</Text>
                    )}
                  </View>

                  <Pressable
                    style={[
                      styles.addToCartButton,
                      { backgroundColor: product.inStock ? config.color : Colors.border.default }
                    ]}
                    onPress={() => product.inStock && handleAddToCart(product)}
                    disabled={!product.inStock}
                  >
                    <Text style={[
                      styles.addToCartText,
                      !product.inStock && { color: Colors.text.tertiary }
                    ]}>
                      {product.inStock ? 'Add to Cart' : 'Notify Me'}
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
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
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  cartButton: {
    padding: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    color: Colors.nileBlue,
  },
  filtersContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm,
    gap: 6,
  },
  filterChipText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  filterChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    gap: Spacing.md,
  },
  resultCount: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  sortChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.sm,
  },
  sortChipActive: {
    backgroundColor: Colors.nileBlue,
  },
  sortChipText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  sortChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
    marginTop: 60,
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
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  productCard: {
    width: (SCREEN_WIDTH - 36) / 2,
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
    height: 160,
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
  outOfStockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  productInfo: {
    padding: Spacing.md,
  },
  productBrand: {
    fontSize: Typography.caption.fontSize,
    color: Colors.text.tertiary,
    marginBottom: 2,
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
  reviewCount: {
    fontSize: Typography.caption.fontSize,
    color: Colors.text.tertiary,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
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
  addToCartButton: {
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  addToCartText: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(ProductsPage, 'ProductsIndex');
