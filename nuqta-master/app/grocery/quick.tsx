// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Quick Delivery Page
 * Products and stores with fast delivery (10-30 min)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import GroceryProductCard from '@/components/grocery/GroceryProductCard';
import GroceryStoreCard from '@/components/grocery/GroceryStoreCard';
import { GroceryHubSkeleton } from '@/components/grocery/GrocerySkeleton';
import { productsApi } from '@/services/productsApi';
import { storesApi } from '@/services/storesApi';
import { cartApi } from '@/services/cartApi';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
interface QuickStore {
  id: string;
  name: string;
  logo: string;
  deliveryTime: string;
  cashback: number;
  rating: number;
  isOpen: boolean;
}

interface QuickProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  cashback: number;
  store: string;
  deliveryTime: string;
}

const QuickDeliveryPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  // State
  const [quickStores, setQuickStores] = useState<QuickStore[]>([]);
  const [quickProducts, setQuickProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  // Quick categories
  const quickCategories = [
    { key: 'all', label: 'All', icon: '⚡' },
    { key: 'dairy', label: 'Dairy', icon: '🥛' },
    { key: 'snacks', label: 'Snacks', icon: '🍪' },
    { key: 'fruits', label: 'Fruits', icon: '🍎' },
    { key: 'veggies', label: 'Veggies', icon: '🥕' },
    { key: 'beverages', label: 'Drinks', icon: '🥤' },
  ];

  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch quick delivery data
  const fetchQuickData = useCallback(async () => {
    try {
      setLoading(true);

      const [storesRes, productsRes] = await Promise.all([
        storesApi.getStores({ limit: 10 }),
        productsApi.getProducts({
          limit: 20,
          category: selectedCategory !== 'all' ? selectedCategory : undefined,
        }),
      ]);

      // Filter stores with fast delivery
      if (storesRes.success && storesRes.data?.stores) {
        const fastStores = storesRes.data.stores
          .filter((store: any) => {
            if (store.deliveryCategories?.fastDelivery) return true;
            const deliveryTimeStr = store.operationalInfo?.deliveryTime || '';
            const match = deliveryTimeStr.match(/(\d+)-(\d+)/);
            if (match && parseInt(match[2], 10) <= 30) return true;
            return false;
          })
          .map((store: any) => ({
            id: store._id || store.id,
            name: store.name || 'Store',
            logo: store.logo || (Array.isArray(store.banner) ? store.banner[0] : store.banner) || undefined,
            deliveryTime: store.operationalInfo?.deliveryTime || '15-30 min',
            cashback: store.offers?.cashback || store.maxCashback || 15,
            rating: store.ratings?.average || store.rating?.average || 4.5,
            isOpen: true,
          }));

        if (!isMounted()) return;
        setQuickStores(fastStores.length > 0 ? fastStores : getFallbackQuickStores());
      } else {
        if (!isMounted()) return;
        setQuickStores(getFallbackQuickStores());
      }

      // Get products - map to normalized format
      if (productsRes.success && productsRes.data?.products) {
        const mappedProducts = productsRes.data.products.map((product: any) => ({
          ...product,
          id: product._id || product.id,
          image: Array.isArray(product.images)
            ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0]?.url)
            : product.image,
          pricing: {
            basePrice: product.pricing?.original || product.pricing?.basePrice || 0,
            salePrice: product.pricing?.selling || product.pricing?.salePrice || product.pricing?.original || 0,
          },
          rating: {
            average: product.ratings?.average || product.rating?.average || 4.0,
            count: product.ratings?.count || product.rating?.count || 0,
          },
          cashback: {
            percentage: product.cashback?.percentage || 5,
          },
        }));
        if (!isMounted()) return;
        setQuickProducts(mappedProducts);
      } else {
        if (!isMounted()) return;
        setQuickProducts(getFallbackProducts());
      }
    } catch (err) {
      if (!isMounted()) return;
      setQuickStores(getFallbackQuickStores());
      if (!isMounted()) return;
      setQuickProducts(getFallbackProducts());
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchQuickData();
  }, [fetchQuickData, authLoading, isAuthenticated]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchQuickData();
  }, [fetchQuickData]);

  // Handle add to cart
  const handleAddToCart = async (product: any) => {
    try {
      const productId = product.id || product._id;
      await cartApi.addToCart({ productId, quantity: 1 });
    } catch (err: any) {
      platformAlertSimple('Error', err?.message || 'Failed to add item to cart. Please try again.');
    }
  };

  // Filter products by selected store
  const filteredProducts = selectedStore
    ? quickProducts.filter(p => (p.store?.id || p.store?._id) === selectedStore)
    : quickProducts;

  if (loading) {
    return <GroceryHubSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.successScale[400], colors.successScale[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <View style={styles.titleRow}>
              <Ionicons name="flash" size={24} color="#FCD34D" />
              <Text style={styles.headerTitle}>Quick Delivery</Text>
            </View>
            <Text style={styles.headerSubtitle}>Get groceries in 10-30 minutes</Text>
          </View>
        </View>

        {/* Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>10-30</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{quickStores.length}+</Text>
            <Text style={styles.statLabel}>Fast Stores</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>25%</Text>
            <Text style={styles.statLabel}>Max Cashback</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Store Pills */}
      <View style={styles.storesPillsContainer}>
        <Text style={styles.storesLabel}>Delivering now</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Pressable
            style={[styles.storePill, !selectedStore && styles.storePillActive]}
            onPress={() => setSelectedStore(null)}
          >
            <Text style={[styles.storePillText, !selectedStore && styles.storePillTextActive]}>
              All Stores
            </Text>
          </Pressable>
          {quickStores.map((store) => (
            <Pressable
              key={store.id}
              style={[
                styles.storePill,
                selectedStore === store.id && styles.storePillActive,
              ]}
              onPress={() => setSelectedStore(store.id === selectedStore ? null : store.id)}
            >
              <CachedImage source={store.logo} style={styles.storePillLogo} />
              <Text
                style={[
                  styles.storePillText,
                  selectedStore === store.id && styles.storePillTextActive,
                ]}
              >
                {store.name}
              </Text>
              <View style={styles.storePillDelivery}>
                <Text style={styles.storePillDeliveryText}>{store.deliveryTime}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Category Filters */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {quickCategories.map((cat) => (
            <Pressable
              key={cat.key}
              style={[
                styles.categoryChip,
                selectedCategory === cat.key && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === cat.key && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Products */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.successScale[400]]}
            tintColor={colors.successScale[400]}
          />
        }
      >
        {/* Quick Stores Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fast Delivery Stores</Text>
            <Pressable onPress={() => router.push('/grocery/stores' as any)}>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storesScroll}
          >
            {quickStores.map((store) => (
              <Pressable
                key={store.id}
                style={styles.quickStoreCard}
                onPress={() => router.push(`/MainStorePage?storeId=${store.id}` as any)}
              >
                <View style={styles.quickStoreBadge}>
                  <Ionicons name="flash" size={10} color="#FCD34D" />
                  <Text style={styles.quickStoreBadgeText}>{store.deliveryTime}</Text>
                </View>
                <CachedImage source={store.logo} style={styles.quickStoreLogo} />
                <Text style={styles.quickStoreName} numberOfLines={1}>{store.name}</Text>
                <View style={styles.quickStoreMeta}>
                  <Ionicons name="star" size={10} color={Colors.warning} />
                  <Text style={styles.quickStoreRating}>{store.rating.toFixed(1)}</Text>
                </View>
                <Text style={styles.quickStoreCashback}>{store.cashback}% cashback</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Products Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedStore
              ? `Products from ${quickStores.find(s => s.id === selectedStore)?.name || 'Store'}`
              : 'Quick Delivery Products'}
          </Text>
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flash-outline" size={48} color={Colors.neutral[400]} />
              <Text style={styles.emptyText}>No quick delivery products available</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {filteredProducts.map((product) => (
                <GroceryProductCard
                  key={product.id || product._id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  showStore
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// Fallback data
function getFallbackQuickStores(): QuickStore[] {
  return []; // G-01: No fake partner data — show empty state when API returns nothing
}

function getFallbackProducts(): any[] {
  return []; // G-01: No fake product data
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
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
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginVertical: Spacing.xs,
  },
  storesPillsContainer: {
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  storesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.neutral[500],
    marginBottom: Spacing.sm,
  },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  storePillActive: {
    backgroundColor: colors.successScale[400],
  },
  storePillLogo: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  storePillText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutral[500],
  },
  storePillTextActive: {
    color: Colors.text.inverse,
  },
  storePillDelivery: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  storePillDeliveryText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  categoriesContainer: {
    backgroundColor: Colors.background.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.neutral[100],
    marginRight: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: colors.successScale[400],
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutral[500],
  },
  categoryTextActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  section: {
    paddingTop: 20,
    paddingHorizontal: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.successScale[400],
  },
  storesScroll: {
    paddingRight: 16,
  },
  quickStoreCard: {
    width: 100,
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  quickStoreBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successScale[400],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    zIndex: 1,
    gap: 2,
  },
  quickStoreBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  quickStoreLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.background.primary,
    borderWidth: 2,
    borderColor: Colors.border.default,
    marginBottom: 6,
  },
  quickStoreName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.nileBlue,
    textAlign: 'center',
  },
  quickStoreMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  quickStoreRating: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  quickStoreCashback: {
    fontSize: 10,
    color: Colors.success,
    fontWeight: '500',
    marginTop: 2,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: Spacing.md,
  },
});

export default withErrorBoundary(QuickDeliveryPage, 'GroceryQuick');
