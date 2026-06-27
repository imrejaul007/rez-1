// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Grocery & Essentials Hub Page
 * Main entry point for grocery section with API integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  RefreshControl,
  TextInput,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GroceryHubSkeleton } from '@/components/grocery/GrocerySkeleton';
import GroceryStoreCard from '@/components/grocery/GroceryStoreCard';
import { categoriesApi } from '@/services/categoriesApi';
import { storesApi } from '@/services/storesApi';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  white: Colors.background.primary,
  navy: colors.brand.navyDark,
  gray50: Colors.background.secondary,
  gray100: Colors.background.secondary,
  gray200: Colors.border.default,
  gray400: Colors.text.tertiary,
  gray600: Colors.text.tertiary,
  green500: Colors.success,
  green600: colors.brand.greenDark,
  amber500: Colors.warning,
};

// Static category configuration with icons
const categoryConfig: Record<string, { icon: string; color: string }> = {
  fruits: { icon: '🍎', color: '#FF6B6B' },
  veggies: { icon: '🥕', color: colors.brand.emerald },
  dairy: { icon: '🥛', color: '#2196F3' },
  snacks: { icon: '🍪', color: '#FF9800' },
  beverages: { icon: '🥤', color: '#00BCD4' },
  staples: { icon: '🌾', color: '#795548' },
  essentials: { icon: '🧴', color: colors.success },
  daily: { icon: '🥛', color: colors.infoScale[400] },
  supermarket: { icon: '🛒', color: colors.brand.orange },
  organic: { icon: '🌿', color: colors.successScale[400] },
  deals: { icon: '🏷️', color: colors.error },
  fresh: { icon: '🥬', color: '#84CC16' },
  'personal-care': { icon: '🧴', color: '#E91E63' },
  household: { icon: '🧹', color: '#9C27B0' },
};

// Default categories for display
const defaultCategories = [
  { id: 'fruits', title: 'Fruits', icon: '🍎', color: '#FF6B6B', count: 0 },
  { id: 'veggies', title: 'Vegetables', icon: '🥕', color: colors.brand.emerald, count: 0 },
  { id: 'dairy', title: 'Dairy & Eggs', icon: '🥛', color: '#2196F3', count: 0 },
  { id: 'snacks', title: 'Snacks', icon: '🍪', color: '#FF9800', count: 0 },
  { id: 'staples', title: 'Staples', icon: '🌾', color: '#795548', count: 0 },
  { id: 'beverages', title: 'Beverages', icon: '🥤', color: '#00BCD4', count: 0 },
];

interface Category {
  id: string;
  title: string;
  icon: string;
  color: string;
  count: number;
}

interface Store {
  id: string;
  name: string;
  rating: number;
  deliveryTime: string;
  cashback: string;
  image: string;
  logo?: string;
}

interface Stats {
  storeCount: number;
  maxCashback: number;
  fastestDelivery: string;
}

const GroceryPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  // State
  const [categories, setCategories] = useState<Category[]>(defaultCategories);
  const [featuredStores, setFeaturedStores] = useState<Store[]>([]);
  const [quickStores, setQuickStores] = useState<Store[]>([]);
  const [stats, setStats] = useState<Stats>({ storeCount: 50, maxCashback: 25, fastestDelivery: '10 min' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch data from API
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch categories and stores in parallel
      const [categoriesRes, storesRes] = await Promise.all([
        categoriesApi.getCategoryTree('home_delivery'),
        storesApi.getStores({ category: 'grocery', limit: 10 }),
      ]);

      // Process categories
      if (categoriesRes.success && categoriesRes.data) {
        const groceryCategory = categoriesRes.data.find((cat: any) =>
          cat.slug === 'grocery' || cat.name?.toLowerCase().includes('grocery')
        );

        if (groceryCategory && groceryCategory.subcategories?.length > 0) {
          const mappedCategories = groceryCategory.subcategories.map((sub: any) => {
            const config = categoryConfig[sub.slug] || { icon: '🛒', color: colors.success };
            return {
              id: sub.slug,
              title: sub.name,
              icon: config.icon,
              color: config.color,
              count: sub.productCount || 0,
            };
          });
          if (!isMounted()) return;
          setCategories(mappedCategories.length > 0 ? mappedCategories : defaultCategories);
        }
      }

      // Process stores
      if (storesRes.success && storesRes.data?.stores) {
        const stores = storesRes.data.stores;

        // Map stores to display format
        const mappedStores: Store[] = stores.map((store: any) => ({
          id: store.id || store._id,
          name: store.name,
          rating: (store.ratings?.average || store.rating?.average) || 4.5,
          deliveryTime: store.operationalInfo?.deliveryTime
            ? store.operationalInfo?.deliveryTime || "15-30 min"
            : '30-45 min',
          cashback: `${(store.offers?.cashback || store.maxCashback) || 15}%`,
          image: store.banner || store.image || undefined,
          logo: store.logo,
        }));

        if (!isMounted()) return;
        setFeaturedStores(mappedStores.slice(0, 5));

        // Filter quick delivery stores
        const quick = stores
          .filter((s: any) =>
            s.deliveryCategories?.fastDelivery ||
            (s.operationalInfo?.deliveryTime?.includes("-") && parseInt(s.operationalInfo.deliveryTime.split("-")[1]) <= 30)
          )
          .map((store: any) => ({
            id: store.id || store._id,
            name: store.name,
            rating: (store.ratings?.average || store.rating?.average) || 4.5,
            deliveryTime: store.operationalInfo?.deliveryTime
              ? store.operationalInfo?.deliveryTime?.split("-")[0] + " min" || "15 min"
              : '15 min',
            cashback: `${(store.offers?.cashback || store.maxCashback) || 15}%`,
            image: store.banner || store.image || undefined,
            logo: store.logo,
          }));
        if (!isMounted()) return;
        setQuickStores(quick.slice(0, 4));

        // Calculate stats
        const maxCashback = Math.max(...stores.map((s: any) => s.maxCashback || 0), 25);
        const fastestTime = Math.min(
          ...stores.map((s: any) => {
            const dt = s.operationalInfo?.deliveryTime;
            return typeof dt === 'object' ? (dt?.min || 30) : (parseInt(String(dt)) || 30);
          }),
          10
        );
        if (!isMounted()) return;
        setStats({
          storeCount: stores.length,
          maxCashback,
          fastestDelivery: `${fastestTime} min`,
        });
      } else {
        // Use fallback data
        if (!isMounted()) return;
        setFeaturedStores(getFallbackStores());
        if (!isMounted()) return;
        setQuickStores(getFallbackStores().slice(0, 3));
      }
    } catch (err) {
      if (!isMounted()) return;
      setFeaturedStores(getFallbackStores());
      if (!isMounted()) return;
      setQuickStores(getFallbackStores().slice(0, 3));
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchData();
  }, [fetchData, authLoading, isAuthenticated]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}&category=grocery` as any);
    }
  };

  if (loading) {
    return <GroceryHubSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.success, colors.brand.greenDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Grocery & Essentials</Text>
            <Text style={styles.headerSubtitle}>Fresh groceries delivered</Text>
          </View>
          <Pressable
            style={styles.searchButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons name={showSearch ? 'close' : 'search'} size={24} color={COLORS.white} />
          </Pressable>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.gray400} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search groceries..."
              placeholderTextColor={COLORS.gray400}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus
            />
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.storeCount}+</Text>
            <Text style={styles.statLabel}>Stores</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.maxCashback}%</Text>
            <Text style={styles.statLabel}>Max Cashback</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.fastestDelivery}</Text>
            <Text style={styles.statLabel}>Fastest</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.success]}
            tintColor={colors.success}
          />
        }
      >
        {/* Categories Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                style={styles.categoryCard}
                onPress={() => router.push(`/grocery/${cat.id}` as any)}
               
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}20` }]}>
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                </View>
                <Text style={styles.categoryTitle}>{cat.title}</Text>
                <Text style={styles.categoryCount}>
                  {cat.count > 0 ? `${cat.count} items` : 'Browse'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Pressable
            style={[styles.quickAction, { backgroundColor: colors.tint.amberLight }]}
            onPress={() => router.push('/grocery/deals' as any)}
          >
            <Text style={styles.quickActionIcon}>🔥</Text>
            <Text style={styles.quickActionTitle}>Hot Deals</Text>
            <Text style={styles.quickActionSubtitle}>Save more</Text>
          </Pressable>
          <Pressable
            style={[styles.quickAction, { backgroundColor: '#E0E7FF' }]}
            onPress={() => router.push('/grocery/compare' as any)}
          >
            <Text style={styles.quickActionIcon}>⚖️</Text>
            <Text style={styles.quickActionTitle}>Compare</Text>
            <Text style={styles.quickActionSubtitle}>Best price</Text>
          </Pressable>
          <Pressable
            style={[styles.quickAction, { backgroundColor: colors.tint.green }]}
            onPress={() => router.push('/grocery/stores' as any)}
          >
            <Text style={styles.quickActionIcon}>🏪</Text>
            <Text style={styles.quickActionTitle}>Stores</Text>
            <Text style={styles.quickActionSubtitle}>Big Bazaar+</Text>
          </Pressable>
        </View>

        {/* Quick Delivery Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flash" size={20} color={Colors.warning} />
              <Text style={styles.sectionTitle}>Quick Delivery</Text>
            </View>
            <Pressable onPress={() => router.push('/grocery/quick' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {quickStores.map((store) => (
              <Pressable
                key={store.id}
                style={styles.quickStoreCard}
                onPress={() => router.push(`/MainStorePage?storeId=${store.id}` as any)}
               
              >
                <View style={styles.quickBadge}>
                  <Ionicons name="flash" size={10} color="#FCD34D" />
                  <Text style={styles.quickBadgeText}>{store.deliveryTime}</Text>
                </View>
                <CachedImage
                  source={store.logo || store.image}
                  style={styles.quickStoreLogo}
                />
                <Text style={styles.quickStoreName} numberOfLines={1}>{store.name}</Text>
                <Text style={styles.quickStoreCashback}>{store.cashback} cashback</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Featured Stores */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Stores</Text>
            <Pressable onPress={() => router.push('/grocery/stores' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {featuredStores.map((store) => (
              <Pressable
                key={store.id}
                style={styles.storeCard}
                onPress={() => router.push(`/MainStorePage?storeId=${store.id}` as any)}
               
              >
                <CachedImage source={store.image} style={styles.storeImage} />
                <View style={styles.cashbackBadge}>
                  <Text style={styles.cashbackText}>{store.cashback}</Text>
                </View>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <View style={styles.storeMeta}>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color={COLORS.amber500} />
                      <Text style={styles.ratingText}>{(store.rating || 4.5).toFixed(1)}</Text>
                    </View>
                    <Text style={styles.deliveryText}>{store.deliveryTime}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <LinearGradient
            colors={[colors.brand.orange, colors.brand.orangeDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoGradient}
          >
            <Text style={styles.promoEmoji}>🛒</Text>
            <Text style={styles.promoTitle}>First Order? Get {currencySymbol}100 Off</Text>
            <Text style={styles.promoSubtitle}>+ Free delivery on orders above {currencySymbol}199</Text>
            <Pressable
              style={styles.promoButton}
              onPress={() => router.push('/grocery/deals' as any)}
            >
              <Text style={styles.promoButtonText}>Order Now</Text>
            </Pressable>
          </LinearGradient>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

// Fallback stores data
function getFallbackStores(): Store[] {
  return [
    {
      id: 'bigbasket',
      name: 'BigBasket',
      rating: 4.5,
      deliveryTime: '30-45 min',
      cashback: '15%',
      image: undefined as any,
    },
    {
      id: 'blinkit',
      name: 'Blinkit',
      rating: 4.6,
      deliveryTime: '8-15 min',
      cashback: '20%',
      image: undefined as any,
    },
    {
      id: 'zepto',
      name: 'Zepto',
      rating: 4.4,
      deliveryTime: '10-20 min',
      cashback: '25%',
      image: undefined as any,
    },
    {
      id: 'dmart',
      name: 'DMart Ready',
      rating: 4.3,
      deliveryTime: '45-90 min',
      cashback: '10%',
      image: undefined as any,
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  searchButton: {
    padding: Spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    fontSize: 15,
    color: COLORS.navy,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  statValue: {
    ...Typography.h3,
    fontWeight: '700',
    color: COLORS.white,
  },
  statLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  section: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
  },
  viewAllText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.green500,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 56) / 3,
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: COLORS.gray50,
    borderRadius: BorderRadius.lg,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryEmoji: {
    ...Typography.h2,
    fontSize: 24,
  },
  categoryTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.navy,
    marginBottom: 2,
    textAlign: 'center',
  },
  categoryCount: {
    ...Typography.overline,
    color: COLORS.gray600,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  quickActionIcon: {
    ...Typography.h2,
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  quickActionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.navy,
  },
  quickActionSubtitle: {
    ...Typography.overline,
    color: COLORS.gray600,
  },
  quickStoreCard: {
    width: 90,
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  quickBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green500,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    zIndex: 1,
    gap: 2,
  },
  quickBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.white,
  },
  quickStoreLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gray100,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    marginBottom: 6,
  },
  quickStoreName: {
    ...Typography.caption,
    fontWeight: '600',
    color: COLORS.navy,
    textAlign: 'center',
  },
  quickStoreCashback: {
    ...Typography.overline,
    color: COLORS.green500,
    fontWeight: '500',
  },
  storeCard: {
    width: 200,
    marginRight: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  storeImage: {
    width: '100%',
    height: 120,
  },
  cashbackBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: COLORS.green500,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackText: {
    ...Typography.caption,
    fontWeight: '700',
    color: COLORS.white,
  },
  storeInfo: {
    padding: Spacing.md,
  },
  storeName: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.xs,
  },
  storeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.navy,
  },
  deliveryText: {
    ...Typography.bodySmall,
    color: COLORS.green500,
    fontWeight: '600',
  },
  promoBanner: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.lg,
  },
  promoGradient: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
  },
  promoEmoji: {
    fontSize: 40,
    marginBottom: Spacing.md,
  },
  promoTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: Spacing.xs,
  },
  promoSubtitle: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  promoButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
  },
  promoButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: colors.brand.orange,
  },
});

export default withErrorBoundary(GroceryPage, 'GroceryIndex');
