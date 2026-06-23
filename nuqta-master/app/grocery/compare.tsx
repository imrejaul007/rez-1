// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Grocery Compare Page
 * Compare prices across different stores
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GroceryHubSkeleton } from '@/components/grocery/GrocerySkeleton';
import { productsApi } from '@/services/productsApi';
import { storesApi } from '@/services/storesApi';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
interface CompareItem {
  id: string;
  name: string;
  image: string;
  stores: Array<{
    storeId: string;
    storeName: string;
    storeLogo: string;
    price: number;
    originalPrice?: number;
    cashback: number;
    deliveryTime: string;
    inStock: boolean;
  }>;
  lowestPrice: number;
  highestPrice: number;
  averagePrice: number;
}

const GroceryComparePage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  // State
  const [compareItems, setCompareItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Categories for quick filter
  const categories = [
    { key: 'all', label: 'All' },
    { key: 'fruits', label: 'Fruits' },
    { key: 'veggies', label: 'Veggies' },
    { key: 'dairy', label: 'Dairy' },
    { key: 'staples', label: 'Staples' },
  ];

  // Fetch comparison data
  const fetchCompareData = useCallback(async () => {
    try {
      setLoading(true);

      // In production, this would call a dedicated comparison API
      // For now, we'll simulate by fetching products and stores
      const [productsRes, storesRes] = await Promise.all([
        productsApi.getProducts({ limit: 10, category: selectedCategory !== 'all' ? selectedCategory : undefined }),
        storesApi.getStores({ limit: 5, category: 'grocery' }),
      ]);

      if (productsRes.success && productsRes.data?.products) {
        const stores = storesRes.data?.stores || getFallbackStores();

        // Create comparison items
        const items: CompareItem[] = productsRes.data.products.slice(0, 8).map((product: any) => {
          const productId = product.id || product._id;
          // Handle both API formats: pricing.original/selling and pricing.basePrice/salePrice
          const basePrice = product.pricing?.original || product.pricing?.basePrice || product.pricing?.selling || product.pricing?.salePrice || 100;

          // NOTE: Currently all stores show the same base price for each product
          // because per-store pricing is not yet supported by the backend.
          // When backend adds store-specific pricing, update this to use store-level prices.
          const storeComparisons = stores.map((store: any, index: number) => {
            const price = basePrice;
            return {
              storeId: store.id || store._id,
              storeName: store.name,
              storeLogo: store.logo || store.banner || undefined,
              price,
              originalPrice: product.pricing?.original && product.pricing.original > price ? product.pricing.original : undefined,
              cashback: store.offers?.cashback || store.maxCashback || 0,
              deliveryTime: store.operationalInfo?.deliveryTime || `${15 + index * 10}-${30 + index * 10} min`,
              inStock: true, // Default to true — real stock data would come from a per-store inventory API
            };
          });

          const prices = storeComparisons.map(s => s.price);

          // Handle images as both string array and object array
          const firstImage = product.images?.[0];
          const productImage = typeof firstImage === 'string' ? firstImage : firstImage?.url;

          return {
            id: productId,
            name: product.name,
            image: productImage || undefined,
            stores: storeComparisons.sort((a, b) => a.price - b.price),
            lowestPrice: Math.min(...prices),
            highestPrice: Math.max(...prices),
            averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
          };
        });

        if (!isMounted()) return;
        setCompareItems(items);
      } else {
        if (!isMounted()) return;
        setCompareItems(getFallbackCompareItems());
      }
    } catch (err) {
      if (!isMounted()) return;
      setCompareItems(getFallbackCompareItems());
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchCompareData();
  }, [fetchCompareData, authLoading, isAuthenticated]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompareData();
  }, [fetchCompareData]);

  // Filter items by search
  const filteredItems = useMemo(() => compareItems.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ), [compareItems, searchQuery]);

  // Render comparison card
  const renderCompareCard = (item: CompareItem) => {
    const savings = item.highestPrice - item.lowestPrice;
    const savingsPercent = Math.round((savings / item.highestPrice) * 100);

    return (
      <View key={item.id} style={styles.compareCard}>
        {/* Product Header */}
        <View style={styles.productHeader}>
          <CachedImage source={item.image} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.priceRange}>
              <Text style={styles.lowestPrice}>{currencySymbol}{item.lowestPrice}</Text>
              <Text style={styles.priceRangeText}> - {currencySymbol}{item.highestPrice}</Text>
            </View>
            {savings > 0 && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Save up to {currencySymbol}{savings} ({savingsPercent}%)</Text>
              </View>
            )}
          </View>
        </View>

        {/* Store Comparisons */}
        <View style={styles.storesList}>
          {item.stores.map((store, index) => (
            <Pressable
              key={store.storeId}
              style={[
                styles.storeRow,
                index === 0 && styles.bestDealRow,
              ]}
              onPress={() => router.push(`/MainStorePage?storeId=${store.storeId}` as any)}
            >
              {index === 0 && (
                <View style={styles.bestDealBadge}>
                  <Text style={styles.bestDealText}>Best Price</Text>
                </View>
              )}
              <CachedImage source={store.storeLogo} style={styles.storeLogo} />
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.storeName}</Text>
                <Text style={styles.deliveryTime}>{store.deliveryTime}</Text>
              </View>
              <View style={styles.priceSection}>
                <Text style={[styles.storePrice, index === 0 && styles.bestPrice]}>
                  {currencySymbol}{store.price}
                </Text>
                {store.originalPrice && (
                  <Text style={styles.originalPrice}>{currencySymbol}{store.originalPrice}</Text>
                )}
                <Text style={styles.cashbackText}>{store.cashback}% cashback</Text>
              </View>
              {!store.inStock && (
                <View style={styles.outOfStock}>
                  <Text style={styles.outOfStockText}>Out</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return <GroceryHubSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Compare Prices</Text>
            <Text style={styles.headerSubtitle}>Find the best deals across stores</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products to compare..."
            placeholderTextColor={Colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      {/* Category Filters */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => (
            <Pressable
              key={cat.key}
              style={[
                styles.categoryChip,
                selectedCategory === cat.key && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.key && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Compare Items */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brand.purpleLight]}
            tintColor={colors.brand.purpleLight}
          />
        }
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No products to compare</Text>
            <Text style={styles.emptyText}>Try searching for a product</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {filteredItems.map(renderCompareCard)}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// Fallback data
function getFallbackStores() {
  return [
    { id: 's1', name: 'BigBasket', logo: undefined, maxCashback: 15 },
    { id: 's2', name: 'Blinkit', logo: undefined, maxCashback: 20 },
    { id: 's3', name: 'Zepto', logo: undefined, maxCashback: 25 },
    { id: 's4', name: 'DMart', logo: undefined, maxCashback: 10 },
  ];
}

function getFallbackCompareItems(): CompareItem[] {
  const products = [
    { name: 'Amul Butter 500g', image: undefined as any },
    { name: 'Tata Salt 1kg', image: undefined as any },
    { name: 'Fortune Oil 1L', image: undefined as any },
    { name: 'Aashirvaad Atta 5kg', image: undefined as any },
  ];

  const stores = getFallbackStores();

  return products.map((product, idx) => {
    const basePrice = 100 + idx * 50;
    const storeComparisons = stores.map((store, storeIdx) => ({
      storeId: store.id,
      storeName: store.name,
      storeLogo: store.logo,
      price: basePrice + (storeIdx) * 10, // G-02: deterministic fallback prices, no random
      cashback: store.offers?.cashback || store.maxCashback || 0,
      deliveryTime: `${15 + storeIdx * 10}-${30 + storeIdx * 10} min`,
      inStock: true,
    })).sort((a, b) => a.price - b.price);

    const prices = storeComparisons.map(s => s.price);

    return {
      id: `compare-${idx}`,
      name: product.name,
      image: product.image,
      stores: storeComparisons,
      lowestPrice: Math.min(...prices),
      highestPrice: Math.max(...prices),
      averagePrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    };
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 16,
    paddingHorizontal: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
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
    fontSize: 15,
    color: Colors.nileBlue,
  },
  categoriesContainer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  categoryChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.neutral[100],
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.brand.purple,
  },
  categoryChipText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  categoryChipTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  content: {
    padding: Spacing.base,
  },
  compareCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  productHeader: {
    flexDirection: 'row',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.neutral[100],
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginBottom: Spacing.xs,
  },
  priceRange: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  lowestPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  priceRangeText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  savingsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 6,
    marginTop: 6,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.greenDark,
  },
  storesList: {
    padding: Spacing.sm,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background.secondary,
    position: 'relative',
  },
  bestDealRow: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderWidth: 1,
    borderColor: Colors.success,
  },
  bestDealBadge: {
    position: 'absolute',
    top: -8,
    left: 12,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestDealText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  storeLogo: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.primary,
  },
  storeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  deliveryTime: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  storePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  bestPrice: {
    color: Colors.success,
  },
  originalPrice: {
    fontSize: 12,
    color: Colors.neutral[400],
    textDecorationLine: 'line-through',
  },
  cashbackText: {
    fontSize: 11,
    color: colors.brand.greenDark,
    marginTop: 2,
  },
  outOfStock: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: Colors.neutral[400],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  outOfStockText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginTop: Spacing.base,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: Spacing.xs,
  },
});

export default withErrorBoundary(GroceryComparePage, 'GroceryCompare');
