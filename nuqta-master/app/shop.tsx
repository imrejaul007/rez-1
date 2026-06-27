// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shop Page
 * Shows products filtered by vibe, occasion, category, or brand
 * Navigated from category page sections (Shop by Vibe, Shop by Occasion)
 */

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import productsApi from '@/services/productsApi';
import categoryMetadataApi from '@/services/categoryMetadataApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import FastImage from '@/components/common/FastImage';
import { showToast } from '@/components/common/ToastManager';
import { getVibesForCategory, getOccasionsForCategory } from '@/data/categoryDummyData';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const COLORS = {
  white: Colors.background.primary,
  navy: colors.brand.navyDark,
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray600: Colors.text.tertiary,
  green500: Colors.success,
  primaryGreen: Colors.gold,
  background: Colors.background.secondary,
};

interface Product {
  id: string;
  _id?: string;
  name: string;
  price: number;
  originalPrice?: number;
  image?: string;
  images?: string[];
  rating?: number;
  cashback?: number;
  discount?: number;
  store?: {
    name: string;
  };
}

const ProductCard = ({
  product,
  onPress,
  currencySymbol,
}: {
  product: Product;
  onPress: () => void;
  currencySymbol: string;
}) => {
  const imageUrl = product.image || (product.images && product.images[0]) || '';
  const discount = product.discount || (product.originalPrice && product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0);

  return (
    <Pressable style={styles.productCard} onPress={onPress}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <FastImage
            source={imageUrl}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={40} color={COLORS.gray200} />
          </View>
        )}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
        {product.store?.name && (
          <Text style={styles.storeName}>{product.store.name}</Text>
        )}
        <View style={styles.priceRow}>
          <Text style={styles.currentPrice}>
            {currencySymbol}{product.price?.toLocaleString()}
          </Text>
          {product.originalPrice && product.originalPrice > product.price && (
            <Text style={styles.originalPrice}>
              {currencySymbol}{product.originalPrice?.toLocaleString()}
            </Text>
          )}
        </View>
        {product.cashback && product.cashback > 0 && (
          <View style={styles.cashbackBadge}>
            <Text style={styles.cashbackText}>{product.cashback}% cashback</Text>
          </View>
        )}
        {product.rating && (
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={Colors.gold} />
            <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

function ShopPage() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Get filter params
  const vibeId = params.vibe as string;
  const occasionId = params.occasion as string;
  const categorySlug = params.category as string;
  const brandId = params.brand as string;

  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTitle, setFilterTitle] = useState('Products');
  const [filterSubtitle, setFilterSubtitle] = useState('');
  const [filterIcon, setFilterIcon] = useState('');
  const [filterColor, setFilterColor] = useState(COLORS.primaryGreen);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isMounted = useIsMounted();

  // Fetch filter metadata (vibe/occasion name)
  useEffect(() => {
    const fetchFilterInfo = async () => {
      try {
        if (vibeId && categorySlug) {
          // Try API first
          const response = await categoryMetadataApi.getVibes(categorySlug);
          if (response.success && response.data?.vibes) {
            const vibe = response.data.vibes.find((v: any) => v.id === vibeId);
            if (vibe) {
              setFilterTitle(vibe.name);
              setFilterSubtitle(vibe.description || '');
              setFilterIcon(vibe.icon || '');
              setFilterColor(vibe.color || COLORS.primaryGreen);
              return;
            }
          }
          // Fallback to dummy data
          const vibes = getVibesForCategory(categorySlug);
          const vibe = vibes.find(v => v.id === vibeId);
          if (vibe) {
            setFilterTitle(vibe.name);
            setFilterSubtitle(vibe.description || '');
            setFilterIcon(vibe.icon || '');
            setFilterColor(vibe.color || COLORS.primaryGreen);
          }
        } else if (occasionId && categorySlug) {
          // Try API first
          const response = await categoryMetadataApi.getOccasions(categorySlug);
          if (response.success && response.data?.occasions) {
            const occasion = response.data.occasions.find((o: any) => o.id === occasionId);
            if (occasion) {
              setFilterTitle(occasion.name);
              setFilterSubtitle(`Up to ${occasion.discount}% off`);
              setFilterIcon(occasion.icon || '');
              setFilterColor(occasion.color || COLORS.primaryGreen);
              return;
            }
          }
          // Fallback to dummy data
          const occasions = getOccasionsForCategory(categorySlug);
          const occasion = occasions.find(o => o.id === occasionId);
          if (occasion) {
            setFilterTitle(occasion.name);
            setFilterSubtitle(`Up to ${occasion.discount}% off`);
            setFilterIcon(occasion.icon || '');
            setFilterColor(occasion.color || COLORS.primaryGreen);
          }
        } else if (categorySlug) {
          if (!isMounted()) return;
          setFilterTitle(categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        }
      } catch (error) {
        // Use fallback data on error
        if (vibeId && categorySlug) {
          const vibes = getVibesForCategory(categorySlug);
          const vibe = vibes.find(v => v.id === vibeId);
          if (vibe) {
            setFilterTitle(vibe.name);
            setFilterSubtitle(vibe.description || '');
            setFilterIcon(vibe.icon || '');
          }
        } else if (occasionId && categorySlug) {
          const occasions = getOccasionsForCategory(categorySlug);
          const occasion = occasions.find(o => o.id === occasionId);
          if (occasion) {
            setFilterTitle(occasion.name);
            setFilterSubtitle(`Up to ${occasion.discount}% off`);
            setFilterIcon(occasion.icon || '');
          }
        }
      }
    };

    fetchFilterInfo();
  }, [vibeId, occasionId, categorySlug]);

  // Fetch products
  const fetchProducts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setPage(1);
        setProducts([]);
        setHasMore(true); // Reset hasMore on refresh
      }

      setLoading(true);

      // Build query params
      const queryParams: any = {
        page: isRefresh ? 1 : page,
        limit: 20,
      };

      if (categorySlug) {
        queryParams.category = categorySlug;
      }

      if (vibeId) {
        queryParams.tags = vibeId;
      }

      if (occasionId) {
        queryParams.occasion = occasionId;
      }

      if (brandId) {
        queryParams.brand = brandId;
      }

      // Fetch products from API
      const response = await productsApi.getProducts(queryParams);

      if (response.success && response.data) {
        const newProducts = response.data.products || response.data || [];

        if (isRefresh) {
          if (!isMounted()) return;
          setProducts(newProducts);
        } else {
          if (!isMounted()) return;
          setProducts(prev => [...prev, ...newProducts]);
        }

        // Stop pagination if fewer than limit products returned
        if (!isMounted()) return;
        setHasMore(newProducts.length === 20);
      } else {
        // API returned unsuccessful response - stop pagination
        if (!isMounted()) return;
        setHasMore(false);
      }
    } catch (error) {
      // Stop pagination on error to prevent infinite loop
      if (!isMounted()) return;
      setHasMore(false);
      showToast({
        message: 'Failed to load products',
        type: 'error',
      });
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [categorySlug, vibeId, occasionId, brandId, page]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts(true);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      fetchProducts();
    }
  };

  const handleProductPress = useCallback((product: Product) => {
    const productId = product._id || product.id;
    router.push(`/product-page?cardId=${productId}&cardType=product` as any);
  }, [router]);

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item)}
      currencySymbol={currencySymbol}
    />
  ), [handleProductPress, currencySymbol]);

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {filterIcon && (
        <View style={[styles.filterIconContainer, { backgroundColor: `${filterColor}20` }]}>
          <Text style={styles.filterIcon}>{filterIcon}</Text>
        </View>
      )}
      <Text style={styles.filterTitle}>{filterTitle}</Text>
      {filterSubtitle && (
        <Text style={styles.filterSubtitle}>{filterSubtitle}</Text>
      )}
      <Text style={styles.resultCount}>
        {products.length} {products.length === 1 ? 'product' : 'products'}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color={COLORS.gray200} />
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptyText}>
        Try adjusting your filters or browse other categories
      </Text>
      <Pressable
        style={styles.browseButton}
        onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
      >
        <Text style={styles.browseButtonText}>Go Back</Text>
      </Pressable>
    </View>
  );

  const renderFooter = () => {
    if (!loading || products.length === 0) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={COLORS.primaryGreen} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[filterColor, filterColor]}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{filterTitle}</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Products List */}
      {loading && products.length === 0 ? (
        <CardGridSkeleton />
      ) : (
        <FlashList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id || item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          estimatedItemSize={220}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primaryGreen}
              colors={[COLORS.primaryGreen]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.white,
  },
  placeholder: {
    width: 40,
  },
  headerContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  filterIconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  filterIcon: {
    fontSize: 36,
  },
  filterTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  filterSubtitle: {
    ...Typography.body,
    color: COLORS.gray600,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  resultCount: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: COLORS.gray600,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: COLORS.gray600,
  },
  listContent: {
    paddingBottom: 100,
  },
  row: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.gray50,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
  },
  discountText: {
    ...Typography.overline,
    fontWeight: '700',
    color: COLORS.white,
  },
  productInfo: {
    padding: Spacing.md,
  },
  productName: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: Spacing.xs,
    lineHeight: 18,
  },
  storeName: {
    ...Typography.caption,
    color: COLORS.gray600,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  currentPrice: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
  },
  originalPrice: {
    ...Typography.bodySmall,
    color: COLORS.gray600,
    textDecorationLine: 'line-through',
  },
  cashbackBadge: {
    backgroundColor: Colors.gold + '1A',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  cashbackText: {
    ...Typography.overline,
    fontWeight: '700',
    color: COLORS.primaryGreen,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.caption,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  browseButton: {
    backgroundColor: COLORS.primaryGreen,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  browseButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white,
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export default withErrorBoundary(ShopPage, 'Shop');
