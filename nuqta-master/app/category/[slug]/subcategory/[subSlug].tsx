// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * SubcategoryPage - Shows stores AND products for a subcategory
 * User can switch between tabs to see stores or products
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { storesApi } from '@/services/storesApi';
import productsApi from '@/services/productsApi';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Store item interface
interface StoreItem {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  banner?: string;
  rating: number;
  cashback?: number;
  distance?: string;
  deliveryTime?: string;
  isVerified?: boolean;
}

// Product item interface
interface ProductItem {
  id: string;
  name: string;
  image?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating?: number;
  cashback?: number;
  storeName?: string;
}

function SubcategoryPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { slug, subSlug } = useLocalSearchParams<{ slug: string; subSlug: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Tab state
  const [activeTab, setActiveTab] = useState<'stores' | 'products'>('stores');

  // Data states
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  // Loading states
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Subcategory name
  const subcategoryName = subSlug
    ? subSlug.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Subcategory';

  /**
   * Fetch stores for this subcategory
   */
  const fetchStores = useCallback(async () => {
    if (!subSlug) return;

    try {
      setIsLoadingStores(true);

      let storesData: any[] = [];
      let source = 'subcategory';

      // 1. Try fetching by subcategory slug first
      const response = await storesApi.getStoresBySubcategorySlug(subSlug, 20);

      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        storesData = response.data;
      } else {
        // 2. Fallback: Try searching for the text (handles cuisines/tags)
        source = 'search';

        // Use searchStores with the subSlug as query
        const searchResponse = await storesApi.searchStores(subSlug);

        if (searchResponse.success && searchResponse.data) {
          // searchStores returns { stores: [], ... }
          if (searchResponse.data.stores && Array.isArray(searchResponse.data.stores)) {
            storesData = searchResponse.data.stores;
          }
        }
      }

      if (storesData.length > 0) {
        const formattedStores = storesData.map((store: any) => ({
          id: store._id || store.id,
          name: store.name,
          slug: store.slug,
          logo: store.logo,
          banner: store.banner,
          rating: store.ratings?.average || store.rating || 4.5,
          cashback: store.offers?.cashback || store.cashback,
          distance: store.distance || '2.0 km',
          deliveryTime: store.operationalInfo?.deliveryTime || '30 min',
          isVerified: store.verification?.isVerified || false,
        }));
        if (!isMounted()) return;
        setStores(formattedStores);
      } else {
        if (!isMounted()) return;
        setStores([]);
      }
    } catch (err: any) {
      // Even on error, we might want to ensure empty state
      if (!isMounted()) return;
      setStores([]);
    } finally {
      if (!isMounted()) return;
      setIsLoadingStores(false);
    }
  }, [subSlug]);

  /**
   * Fetch products for this subcategory
   */
  const fetchProducts = useCallback(async () => {
    if (!subSlug) return;

    try {
      setIsLoadingProducts(true);

      let productsData: any[] = [];
      let source = 'subcategory';

      // 1. Try fetching by subcategory slug first
      const response = await productsApi.getProductsBySubcategory(subSlug, 20);

      if (response.success && response.data) {
        // Handle potential array or paginated object
        const data = Array.isArray(response.data) ? response.data : (response.data.products || []);
        if (data.length > 0) {
          productsData = data;
        }
      }

      // 2. Fallback: Search if no products found
      if (productsData.length === 0) {
        source = 'search';

        const searchResponse = await productsApi.searchProducts({ q: subSlug, limit: 20 });

        if (searchResponse.success && searchResponse.data) {
          // SearchResponse has products array
          if (searchResponse.data.products && Array.isArray(searchResponse.data.products)) {
            productsData = searchResponse.data.products;
          }
        }
      }

      if (productsData.length > 0) {
        const formattedProducts = productsData.map((product: any) => ({
          id: product._id || product.id,
          name: product.name,
          image: product.images?.[0]?.url || product.image,
          price: product.pricing?.salePrice || product.pricing?.basePrice || product.price || 0,
          originalPrice: product.pricing?.basePrice,
          discount: product.pricing?.salePrice && product.pricing?.basePrice
            ? Math.round((1 - product.pricing.salePrice / product.pricing.basePrice) * 100)
            : undefined,
          rating: product.ratings?.average || product.rating,
          cashback: product.cashback?.percentage,
          storeName: product.store?.name,
        }));
        if (!isMounted()) return;
        setProducts(formattedProducts);
      } else {
        if (!isMounted()) return;
        setProducts([]);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setProducts([]);
    } finally {
      if (!isMounted()) return;
      setIsLoadingProducts(false);
    }
  }, [subSlug]);

  /**
   * Initial data fetch
   */
  useEffect(() => {
    if (subSlug) {
      fetchStores();
      fetchProducts();
    }
  }, [subSlug, fetchStores, fetchProducts]);

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStores(), fetchProducts()]);
    if (!isMounted()) return;
    setRefreshing(false);
  };

  /**
   * Navigate to store
   */
  const handleStorePress = useCallback((store: StoreItem) => {
    router.push(`/MainStorePage?storeId=${store.id}` as any);
  }, [router]);

  /**
   * Navigate to product
   */
  const handleProductPress = useCallback((product: ProductItem) => {
    router.push(`/product-page?cardId=${product.id}&cardType=product` as any);
  }, [router]);

  /**
   * Render store card
   */
  const renderStoreCard = useCallback(({ item }: { item: StoreItem }) => (
    <Pressable
      style={[styles.storeCard, isDark && styles.storeCardDark]}
      onPress={() => handleStorePress(item)}
     
    >
      <CachedImage
        source={item.banner || item.logo || undefined}
        style={styles.storeBanner}
      />
      <View style={styles.storeInfo}>
        <View style={styles.storeHeader}>
          {item.logo && (
            <CachedImage source={item.logo} style={styles.storeLogo} />
          )}
          <View style={styles.storeNameContainer}>
            <View style={styles.storeNameRow}>
              <ThemedText style={styles.storeName} numberOfLines={1}>
                {item.name}
              </ThemedText>
              {item.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color={Colors.gold} style={{ marginLeft: 4 }} />
              )}
            </View>
            <ThemedText style={styles.storeDistance}>{item.distance}</ThemedText>
          </View>
        </View>
        <View style={styles.storeStats}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={14} color={Colors.warning} />
            <ThemedText style={styles.statText}>{item.rating?.toFixed(1) || '4.5'}</ThemedText>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
            <ThemedText style={styles.statText}>{item.deliveryTime}</ThemedText>
          </View>
          {item.cashback && (
            <View style={styles.cashbackBadge}>
              <ThemedText style={styles.cashbackText}>{item.cashback}% Cashback</ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  ), [isDark, handleStorePress]);

  /**
   * Render product card
   */
  const renderProductCard = useCallback(({ item }: { item: ProductItem }) => (
    <Pressable
      style={[styles.productCard, isDark && styles.productCardDark]}
      onPress={() => handleProductPress(item)}
     
    >
      <CachedImage
        source={item.image || undefined}
        style={styles.productImage}
      />
      {item.discount && item.discount > 0 && (
        <View style={styles.discountBadge}>
          <ThemedText style={styles.discountText}>{item.discount}% OFF</ThemedText>
        </View>
      )}
      <View style={styles.productInfo}>
        <ThemedText style={styles.productName} numberOfLines={2}>
          {item.name}
        </ThemedText>
        {item.storeName && (
          <ThemedText style={styles.productStore}>{item.storeName}</ThemedText>
        )}
        <View style={styles.priceRow}>
          <ThemedText style={styles.productPrice}>
            {currencySymbol}{item.price?.toLocaleString() || '0'}
          </ThemedText>
          {item.originalPrice && item.originalPrice > item.price && (
            <ThemedText style={styles.originalPrice}>
              {currencySymbol}{item.originalPrice?.toLocaleString()}
            </ThemedText>
          )}
        </View>
        {item.cashback && (
          <View style={styles.productCashback}>
            <Ionicons name="wallet-outline" size={12} color={Colors.gold} />
            <ThemedText style={styles.productCashbackText}>{item.cashback}% Cashback</ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  ), [isDark, handleProductPress, currencySymbol]);

  const isLoading = activeTab === 'stores' ? isLoadingStores : isLoadingProducts;
  const currentData = activeTab === 'stores' ? stores : products;

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ThemedView style={styles.container}>
        {/* Header */}
        <LinearGradient
          colors={[Colors.gold, Colors.nileBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Pressable
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>{subcategoryName}</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                {stores.length} stores, {products.length} products
              </ThemedText>
            </View>
            <Pressable
              onPress={() => router.push(`/search?category=${subSlug}` as any)}
              style={styles.searchButton}
            >
              <Ionicons name="search" size={22} color={Colors.text.inverse} />
            </Pressable>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={[styles.tabsContainer, isDark && styles.tabsContainerDark]}>
          <Pressable
            style={[styles.tab, activeTab === 'stores' && styles.activeTab]}
            onPress={() => setActiveTab('stores')}
          >
            <Ionicons
              name="storefront-outline"
              size={18}
              color={activeTab === 'stores' ? colors.lightMustard : colors.neutral[500]}
            />
            <ThemedText
              style={[styles.tabText, activeTab === 'stores' && styles.activeTabText]}
            >
              Stores ({stores.length})
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'products' && styles.activeTab]}
            onPress={() => setActiveTab('products')}
          >
            <Ionicons
              name="cube-outline"
              size={18}
              color={activeTab === 'products' ? colors.lightMustard : colors.neutral[500]}
            />
            <ThemedText
              style={[styles.tabText, activeTab === 'products' && styles.activeTabText]}
            >
              Products ({products.length})
            </ThemedText>
          </Pressable>
        </View>

        {/* Content */}
        {isLoading ? (
          <CardGridSkeleton />
        ) : currentData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name={activeTab === 'stores' ? 'storefront-outline' : 'cube-outline'}
              size={64}
              color={Colors.border.default}
            />
            <ThemedText style={styles.emptyTitle}>
              No {activeTab} found
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              Try browsing other categories
            </ThemedText>
          </View>
        ) : activeTab === 'stores' ? (
          <FlashList
            data={stores}
            renderItem={renderStoreCard}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.gold}
                colors={[Colors.gold]}
                estimatedItemSize={110}
              />
            }
          />
        ) : (
          <FlashList
            data={products}
            renderItem={renderProductCard}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.gold}
                colors={[Colors.gold]}
                estimatedItemSize={220}
              />
            }
          />
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  tabsContainerDark: {
    backgroundColor: Colors.text.primary,
    borderBottomColor: Colors.text.secondary,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    marginHorizontal: Spacing.xs,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
  },
  tabText: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.text.tertiary,
    marginLeft: 6,
  },
  activeTabText: {
    color: Colors.gold,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 100,
  },
  // Store card styles
  storeCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  storeCardDark: {
    backgroundColor: Colors.text.primary,
  },
  storeBanner: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.border.default,
  },
  storeInfo: {
    padding: Spacing.md,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeLogo: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.border.default,
    marginRight: Spacing.md,
  },
  storeNameContainer: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  storeDistance: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  storeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  statText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginLeft: Spacing.xs,
  },
  cashbackBadge: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    marginLeft: 'auto',
  },
  cashbackText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.gold,
  },
  // Product card styles
  productRow: {
    justifyContent: 'space-between',
  },
  productCard: {
    width: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    ...Shadows.subtle,
  },
  productCardDark: {
    backgroundColor: Colors.text.primary,
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.border.default,
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },
  discountText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.text.primary,
    minHeight: 36,
  },
  productStore: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  productPrice: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.gold,
  },
  originalPrice: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  productCashback: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  productCashbackText: {
    ...Typography.caption,
    color: Colors.gold,
    marginLeft: Spacing.xs,
  },
});

export default withErrorBoundary(SubcategoryPage, 'CategorySlugSubcategorySubSlug');
