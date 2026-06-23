// @ts-nocheck
/**
 * Grocery & Essentials Category Page - PRODUCTION READY
 * Features: Tabs (nearby, online, wholesale, organic), real store/product data,
 * working filters, cart integration, offers, order again, price comparison,
 * 60-min delivery, top rated, smart suggestions, loyalty, UGC
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { BRAND } from '@/constants/brand';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import CategoryHeader from '@/components/CategoryHeader';
import { getCategoryConfig } from '@/config/categoryConfig';
import QuickActionBar from '@/components/category/QuickActionBar';
import StreakLoyaltySection from '@/components/category/StreakLoyaltySection';
import FooterTrustSection from '@/components/category/FooterTrustSection';
import BrowseCategoryGrid from '@/components/category/BrowseCategoryGrid';
import EnhancedAISuggestionsSection from '@/components/category/EnhancedAISuggestionsSection';
import EnhancedUGCSocialProofSection from '@/components/category/EnhancedUGCSocialProofSection';
import OffersSection from '@/components/category/OffersSection';
import OrderAgainSection from '@/components/category/OrderAgainSection';
import { useCategoryPageData } from '@/hooks/useCategoryPageData';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import EmptyState from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import SkeletonLoader from '@/components/skeletons/SkeletonLoader';
import CoinIcon from '@/components/ui/CoinIcon';
import { categoriesApi } from '@/services/categoriesApi';
import { storesApi } from '@/services/storesApi';
import apiClient from '@/services/apiClient';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { groceryQuickActions } from '@/data/category/groceryCategoryData';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  primaryGreen: colors.success,
  primaryGold: colors.warningScale[400],
  dark: colors.nileBlue,
  darkDeep: '#0f2638',
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
  green: colors.success,
  greenLight: colors.successScale[100],
  greenDark: colors.brand.greenDark,
  border: colors.neutral[200],
};

const GROCERY_TABS = [
  { id: 'nearby', label: 'Nearby', icon: 'location-outline' },
  { id: 'online', label: 'Online', icon: 'cart-outline' },
  { id: 'wholesale', label: 'Wholesale', icon: 'cube-outline' },
  { id: 'organic', label: 'Organic', icon: 'leaf-outline' },
];

// Skeleton components
const SectionHeaderSkeleton = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 16 }}>
    <SkeletonLoader width={150} height={18} borderRadius={6} />
    <View style={{ flex: 1 }} />
    <SkeletonLoader width={60} height={12} borderRadius={4} />
  </View>
);

const StoreCardSkeleton = ({ count = 3 }: { count?: number }) => (
  <View style={{ paddingHorizontal: 16, gap: 12 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={{ backgroundColor: colors.background.primary, borderRadius: 16, padding: 12 }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <SkeletonLoader width={64} height={64} borderRadius={12} />
          <View style={{ flex: 1, gap: 6 }}>
            <SkeletonLoader width="70%" height={14} borderRadius={4} />
            <SkeletonLoader width="50%" height={10} borderRadius={4} />
          </View>
        </View>
      </View>
    ))}
  </View>
);

const ProductCardSkeleton = ({ count = 4 }: { count?: number }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 16 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={{ width: 140, padding: 8, borderRadius: 12, backgroundColor: colors.background.primary }}>
        <SkeletonLoader width="100%" height={120} borderRadius={8} />
        <View style={{ marginTop: 8, gap: 4 }}>
          <SkeletonLoader width="60%" height={10} borderRadius={4} />
          <SkeletonLoader width="80%" height={12} borderRadius={4} />
          <SkeletonLoader width="40%" height={14} borderRadius={4} />
        </View>
      </View>
    ))}
  </ScrollView>
);

// Store Card Component
const StoreCard = ({ store, variant = 'default' }: { store: any; variant?: 'default' | 'compact' }) => {
  const router = useRouter();
  const isCompact = variant === 'compact';

  const handleStorePress = () => {
    router.push(`/MainStorePage?storeId=${store._id || store.id}` as any);
  };

  if (isCompact) {
    return (
      <Pressable style={styles.storeCardCompact} onPress={handleStorePress}>
        <View style={styles.storeLogoCompact}>
          {store.logo ? (
            <CachedImage source={store.logo} style={styles.storeLogoImage} contentFit="contain" />
          ) : (
            <Text style={styles.storeLogoEmoji}>🏪</Text>
          )}
        </View>
        <Text style={styles.storeNameCompact} numberOfLines={1}>{store.name}</Text>
        <View style={styles.storeRatingCompact}>
          <Ionicons name="star" size={12} color={COLORS.primaryGold} />
          <Text style={styles.storeRatingTextCompact}>
            {store.ratings?.average?.toFixed(1) || 'New'}
          </Text>
        </View>
        <View style={styles.storeBadgesCompact}>
          {(store.offers?.cashback > 0) && (
          <View style={styles.storeBadgeCompact}>
            <Text style={styles.storeBadgeTextCompact}>{store.offers.cashback}% Cashback</Text>
          </View>
          )}
          {store.deliveryCategories?.fastDelivery && (
            <View style={styles.storeBadge60Compact}>
              <Ionicons name="flash" size={10} color={colors.text.primary} />
              <Text style={styles.storeBadge60TextCompact}>60-min</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.storeCard} onPress={handleStorePress}>
      <View style={styles.storeCardContent}>
        <View style={styles.storeLogo}>
          {store.logo ? (
            <CachedImage source={store.logo} style={styles.storeLogoImage} contentFit="contain" />
          ) : (
            <Text style={styles.storeLogoEmoji}>🏪</Text>
          )}
        </View>
        <View style={styles.storeInfo}>
          <View style={styles.storeHeader}>
            <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
            {store.isOpen === true && (
              <View style={styles.storeOpenBadge}>
                <View style={styles.storeOpenDot} />
                <Text style={styles.storeOpenText}>Open</Text>
              </View>
            )}
            {store.isOpen === false && (
              <View style={styles.storeClosedBadge}>
                <View style={styles.storeClosedDot} />
                <Text style={styles.storeClosedText}>Closed</Text>
              </View>
            )}
          </View>
          <View style={styles.storeMeta}>
            <View style={styles.storeMetaItem}>
              <Ionicons name="star" size={14} color={COLORS.primaryGold} />
              <Text style={styles.storeMetaText}>
                {store.ratings?.average?.toFixed(1) || 'New'} ({store.ratings?.count || 0})
              </Text>
            </View>
            <View style={styles.storeMetaItem}>
              <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.storeMetaText}>{store.location?.city || 'Nearby'}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.storeFooter}>
        {store.offers?.cashback > 0 ? (
        <View style={styles.storeCoins}>
          <CoinIcon size={16} />
          <Text style={styles.storeCoinsText}>{store.offers.cashback}% {BRAND.COIN_NAME}</Text>
        </View>
        ) : <View />}
        <Pressable
          style={styles.storeActionButton}
          onPress={(e) => {
            e.stopPropagation();
            handleStorePress();
          }}
        >
          <Text style={styles.storeActionText}>
            {store.deliveryCategories?.fastDelivery || store.operationalInfo?.deliveryTime || store.type === 'online'
              ? 'Order Now' : 'Visit Store'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

// Product Card Component
const ProductCard = ({ product, currencySymbol }: { product: any; currencySymbol: string }) => {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const isMounted = useIsMounted();
  const originalPrice = product.originalPrice || product.pricing?.original;
  const sellingPrice = product.pricing?.selling || product.price;
  const discount = originalPrice && originalPrice > sellingPrice
    ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
    : 0;

  const handleAddToCart = async (e: any) => {
    e.stopPropagation();
    try {
      setIsAdding(true);
      await apiClient.post('/cart/add', {
        productId: product._id || product.id,
        quantity: 1,
      });
      platformAlertSimple('Added!', `${product.name} added to cart`);
    } catch (err: any) {
      const message = err?.response?.status === 401
        ? 'Please log in to add items to cart'
        : 'Could not add to cart. Please try again.';
      platformAlertSimple('Error', message);
    } finally {
      if (!isMounted()) return;
      setIsAdding(false);
    }
  };

  return (
    <Pressable
      style={styles.productCard}
      onPress={() => {
        const storeId = product.store?._id || product.store;
        const productId = product._id || product.id;
        router.push(`/product-page?id=${productId}&storeId=${storeId}` as any);
      }}
     
    >
      <View style={styles.productImageContainer}>
        {product.images?.[0] || product.image ? (
          <CachedImage
            source={product.images?.[0] || product.image}
            style={styles.productImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.productImage, { backgroundColor: colors.neutral[100], justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="cube-outline" size={28} color={COLORS.textSecondary} />
          </View>
        )}
        {product.tag && (
          <View style={styles.productTag}>
            <Text style={styles.productTagText}>{product.tag}</Text>
          </View>
        )}
        {product.deliveryCategories?.fastDelivery && (
          <View style={styles.productBadge60}>
            <Ionicons name="flash" size={10} color={colors.text.primary} />
            <Text style={styles.productBadge60Text}>60-min</Text>
          </View>
        )}
      </View>
      <Text style={styles.productBrand} numberOfLines={1}>
        {product.brand?.name || product.brand || 'Brand'}
      </Text>
      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
      <Text style={styles.productUnit}>{product.unit || '1 unit'}</Text>
      <View style={styles.productPriceRow}>
        <Text style={styles.productPrice}>{currencySymbol}{sellingPrice?.toLocaleString() || '0'}</Text>
        {discount > 0 && originalPrice && (
          <Text style={styles.productOriginalPrice}>{currencySymbol}{originalPrice.toLocaleString()}</Text>
        )}
        <Pressable style={styles.productAddButton} onPress={handleAddToCart} disabled={isAdding}>
          {isAdding ? (
            <ActivityIndicator size={14} color={COLORS.white} />
          ) : (
            <Ionicons name="add" size={20} color={COLORS.white} />
          )}
        </Pressable>
      </View>
      {product.cashbackCoins > 0 && (
      <View style={styles.productCoins}>
        <CoinIcon size={12} />
        <Text style={styles.productCoinsText}>+{product.cashbackCoins} coins</Text>
      </View>
      )}
    </Pressable>
  );
};

function GroceryCategoryPage() {
  const router = useRouter();
  const slug = 'grocery-essentials';
  const categoryConfig = getCategoryConfig(slug);
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const {
    subcategories,
    stores,
    products,
    ugcPosts,
    aiPlaceholders,
    isLoading,
    error,
    refetch,
  } = useCategoryPageData(slug);

  const [activeTab, setActiveTab] = useState('nearby');
  const [refreshing, setRefreshing] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<string[]>([]);
  const [newStores, setNewStores] = useState<any[]>([]);
  const [isLoadingNewStores, setIsLoadingNewStores] = useState(false);
  const [visibleStoresCount, setVisibleStoresCount] = useState(10);

  // Fetch smart suggestions from API
  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await categoriesApi.getCategoryAISuggestions(slug);
      // Backend returns { suggestions: [...], placeholders: [...] }
      const suggestions = res.data?.suggestions || [];
      if (suggestions.length > 0) {
        if (!isMounted()) return;
        setSmartSuggestions(suggestions.map((s: any) => s.text || s.title || s));
      } else {
        setSmartSuggestions([]);
      }
    } catch {
      if (!isMounted()) return;
      setSmartSuggestions([]);
    }
  }, [slug]);

  // Fetch new stores — backend doesn't filter by category, so filter client-side
  const fetchNewStores = useCallback(async () => {
    try {
      setIsLoadingNewStores(true);
      const res = await storesApi.getNewStores?.({ limit: 20 });
      if (res?.success && res.data?.length > 0) {
        const storesData = Array.isArray(res.data) ? res.data : (res.data?.stores || []);
        const groceryStores = storesData.filter((s: any) => {
          const catSlug = s.category?.slug || '';
          const catName = (s.category?.name || '').toLowerCase();
          return catSlug === slug || catSlug.includes('grocery') || catName.includes('grocery')
            || catName.includes('supermarket') || catName.includes('kirana');
        });
        if (!isMounted()) return;
        setNewStores(groceryStores.slice(0, 8));
      }
    } catch {
      // No new stores available
    } finally {
      if (!isMounted()) return;
      setIsLoadingNewStores(false);
    }
  }, [slug]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetch(), fetchSuggestions(), fetchNewStores()]);
    if (!isMounted()) return;
    setRefreshing(false);
  };

  useEffect(() => {
    fetchSuggestions();
    fetchNewStores();
  }, [fetchSuggestions, fetchNewStores]);

  // Tab-aware AI search placeholders
  const placeholders = useMemo(() => {
    const tabPlaceholders: Record<string, string[]> = {
      nearby: ['Search groceries near you...', 'Atta, dal, rice, milk...', 'Find kirana stores nearby...'],
      online: ['Search online groceries...', 'Fresh vegetables, fruits...', 'Order groceries online...'],
      wholesale: ['Search wholesale deals...', 'Bulk rice, oil, sugar...', 'Wholesale prices nearby...'],
      organic: ['Search organic products...', 'Organic fruits & veggies...', 'Chemical-free groceries...'],
    };
    return tabPlaceholders[activeTab] || aiPlaceholders;
  }, [activeTab, aiPlaceholders]);

  // Tab filtering - REAL filtering based on store properties
  const filteredStores = useMemo(() => {
    switch (activeTab) {
      case 'online':
        return stores.filter((s: any) =>
          s.deliveryCategories?.fastDelivery || s.type === 'online' || s.operationalInfo?.deliveryTime
        );
      case 'wholesale':
        return stores.filter((s: any) =>
          s.tags?.some((t: string) => ['wholesale', 'bulk', 'b2b'].includes(t.toLowerCase())) ||
          s.deliveryCategories?.budgetFriendly
        );
      case 'organic':
        return stores.filter((s: any) =>
          s.deliveryCategories?.organic ||
          s.tags?.some((t: string) => ['organic', 'natural', 'chemical-free'].includes(t.toLowerCase()))
        );
      case 'nearby':
      default:
        return stores;
    }
  }, [stores, activeTab]);

  // 60-min and top-rated derive from filteredStores so tabs affect ALL sections
  const fastDeliveryStores = useMemo(() =>
    filteredStores.filter((s: any) => s.is60Min || s.deliveryCategories?.fastDelivery),
    [filteredStores]
  );

  const topRatedStores = useMemo(() =>
    filteredStores.filter((s: any) => (s.ratings?.average || 0) >= 4.0)
      .sort((a: any, b: any) => (b.ratings?.average || 0) - (a.ratings?.average || 0)),
    [filteredStores]
  );

  // Products filtered by active tab
  const filteredProducts = useMemo(() => {
    if (activeTab === 'nearby' || !products.length) return products;
    return products.filter((p: any) => {
      const tags = p.tags?.map((t: string) => t.toLowerCase()) || [];
      const storeTags = p.store?.tags?.map((t: string) => t.toLowerCase()) || [];
      const allTags = [...tags, ...storeTags];
      switch (activeTab) {
        case 'organic':
          return allTags.some(t => ['organic', 'natural', 'chemical-free'].includes(t));
        case 'wholesale':
          return allTags.some(t => ['wholesale', 'bulk', 'b2b'].includes(t)) || p.pricing?.bulkPrice;
        case 'online':
          return p.store?.type === 'online' || p.store?.deliveryCategories?.fastDelivery || p.store?.operationalInfo?.deliveryTime;
        default:
          return true;
      }
    });
  }, [products, activeTab]);

  // Navigation handlers
  const handleCategoryPress = (category: any) => {
    router.push(`/MainCategory/grocery-essentials/${category.slug || category.id}` as any);
  };

  const handleAISearch = (query: string) => {
    router.push(`/MainCategory/grocery-essentials/search?q=${encodeURIComponent(query)}` as any);
  };

  if (!categoryConfig) return null;

  if (isLoading && !refreshing && stores.length === 0) {
    return <LoadingState message="Loading groceries..." />;
  }

  if (error && stores.length === 0) {
    return (
      <EmptyState
        icon="cart-outline"
        title="Unable to load"
        message={error || "Something went wrong. Please try again."}
        actionLabel="Try Again"
        onAction={refetch}
      />
    );
  }

  return (
    <ErrorBoundary onError={() => { /* silently handle */ }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[categoryConfig.primaryColor]} />
      }
    >
      <CategoryHeader
        categoryName={categoryConfig.name}
        primaryColor={categoryConfig.primaryColor}
        banner={categoryConfig.banner}
        gradientColors={categoryConfig.gradientColors}
      />

      {/* Value Strip */}
      <View style={styles.valueStrip}>
        <LinearGradient
          colors={['rgba(34, 197, 94, 0.15)', 'rgba(22, 163, 74, 0.1)']}
          style={styles.valueGradient}
        >
          <Text style={styles.valueText}>
            {`💸 Save on daily essentials. Earn ${BRAND.COIN_NAME} on every purchase.`}
          </Text>
        </LinearGradient>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {GROCERY_TABS.map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => { setActiveTab(tab.id); setVisibleStoresCount(10); }}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            >
              <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.id ? COLORS.white : COLORS.textSecondary} />
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <QuickActionBar categorySlug={slug} actions={groceryQuickActions as any} />

      {/* Enhanced AI Suggestions Section */}
      <EnhancedAISuggestionsSection
        categorySlug={slug}
        categoryName={
          activeTab === 'wholesale' ? 'Wholesale Grocery' :
          activeTab === 'organic' ? 'Organic Grocery' :
          categoryConfig.name
        }
        placeholders={placeholders.length > 0 ? placeholders : aiPlaceholders}
        onSearch={handleAISearch}
      />

      {/* Browse Category Grid */}
      <BrowseCategoryGrid
        categories={subcategories}
        title="Shop by Category"
        onCategoryPress={handleCategoryPress}
      />

      {/* Order Again Section */}
      <OrderAgainSection categorySlug={slug} />

      {/* 60-Min Delivery */}
      {isLoading ? (
        <View style={styles.section}>
          <SectionHeaderSkeleton />
          <StoreCardSkeleton count={2} />
        </View>
      ) : fastDeliveryStores.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flash-outline" size={20} color={COLORS.primaryGreen} />
            <Text style={styles.sectionTitle}>60-Min Delivery</Text>
            <Pressable onPress={() => router.push('/MainCategory/grocery-essentials/fast-delivery' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesList}>
            {fastDeliveryStores.slice(0, 5).map((store) => (
              <StoreCard key={store._id || store.id} store={store} variant="compact" />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Top Rated Stores */}
      {isLoading ? (
        <View style={styles.section}>
          <SectionHeaderSkeleton />
          <StoreCardSkeleton count={2} />
        </View>
      ) : topRatedStores.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="star-outline" size={20} color={COLORS.primaryGreen} />
            <Text style={styles.sectionTitle}>Top Rated Stores</Text>
            <Pressable onPress={() => router.push('/MainCategory/grocery-essentials/top-rated' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <View style={styles.storesGrid}>
            {topRatedStores.slice(0, 4).map((store) => (
              <StoreCard key={store._id || store.id} store={store} />
            ))}
          </View>
        </View>
      ) : null}

      {/* Price Compare Banner */}
      <View style={styles.compareBanner}>
        <Pressable
         
          onPress={() => router.push('/MainCategory/grocery-essentials/compare' as any)}
        >
          <LinearGradient
            colors={[COLORS.dark, COLORS.darkDeep]}
            style={styles.compareBannerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.compareBannerRow}>
              <View style={styles.compareBannerLeft}>
                <View style={styles.compareBannerIcon}>
                  <Ionicons name="swap-horizontal" size={22} color={COLORS.primaryGreen} />
                </View>
                <View>
                  <Text style={styles.compareBannerTitle}>Compare Prices</Text>
                  <Text style={styles.compareBannerSubtitle}>Find the best deal across stores</Text>
                </View>
              </View>
              <View style={styles.compareBannerCta}>
                <Text style={styles.compareBannerCtaText}>Compare</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.dark} />
              </View>
            </View>
            <View style={styles.compareBannerPerks}>
              <View style={styles.compareBannerPerk}>
                <Ionicons name="pricetag-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.compareBannerPerkText}>Best prices</Text>
              </View>
              <View style={styles.compareBannerPerk}>
                <Ionicons name="notifications-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.compareBannerPerkText}>Price alerts</Text>
              </View>
              <View style={styles.compareBannerPerk}>
                <Ionicons name="trending-down-outline" size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.compareBannerPerkText}>Price history</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      {/* All Stores for active tab */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="storefront-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.sectionTitle}>
            {activeTab === 'nearby' ? 'Nearby Stores' :
             activeTab === 'online' ? 'Online Stores' :
             activeTab === 'wholesale' ? 'Wholesale Stores' :
             'Organic Stores'}
          </Text>
          <Pressable onPress={() => router.push(`/MainCategory/grocery-essentials/search?tab=${activeTab}` as any)}>
            <Text style={styles.sectionSeeAll}>View All</Text>
          </Pressable>
        </View>
        {isLoading ? (
          <StoreCardSkeleton count={3} />
        ) : filteredStores.length > 0 ? (
          <>
            <View style={styles.storesGrid}>
              {filteredStores.slice(0, visibleStoresCount).map((store) => (
                <StoreCard key={store._id || store.id} store={store} />
              ))}
            </View>
            {filteredStores.length > visibleStoresCount && (
              <Pressable
                style={styles.loadMoreButton}
                onPress={() => setVisibleStoresCount(prev => prev + 10)}
              >
                <Text style={styles.loadMoreText}>Load More ({filteredStores.length - visibleStoresCount} remaining)</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.greenDark} />
              </Pressable>
            )}
          </>
        ) : (
          <View style={styles.emptySection}>
            <Ionicons name="storefront-outline" size={36} color={COLORS.border} />
            <Text style={styles.emptySectionText}>
              No {activeTab} stores found. Try another tab.
            </Text>
          </View>
        )}
      </View>

      {/* Popular Products - filtered by active tab */}
      {isLoading ? (
        <View style={styles.section}>
          <SectionHeaderSkeleton />
          <ProductCardSkeleton count={4} />
        </View>
      ) : filteredProducts.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🛒</Text>
            <Text style={styles.sectionTitle}>
              {activeTab === 'organic' ? 'Organic Products' :
               activeTab === 'wholesale' ? 'Wholesale Products' :
               'Popular Products'}
            </Text>
            <Pressable onPress={() => router.push(`/MainCategory/grocery-essentials/search?q=${activeTab === 'organic' ? 'organic' : activeTab === 'wholesale' ? 'wholesale' : 'popular'}` as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsList}>
            {filteredProducts.slice(0, 8).map((product) => (
              <ProductCard key={product._id || product.id} product={product} currencySymbol={currencySymbol} />
            ))}
          </ScrollView>
        </View>
      ) : activeTab !== 'nearby' && products.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.emptySection}>
            <Ionicons name="cube-outline" size={36} color={COLORS.border} />
            <Text style={styles.emptySectionText}>
              No {activeTab} products found. Try another tab.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Offers Section - shown on all tabs */}
      <OffersSection categorySlug={slug} />

      {/* Bill Upload Banner */}
      <View style={styles.billUploadBanner}>
        <LinearGradient
          colors={['rgba(59, 130, 246, 0.2)', 'rgba(34, 197, 94, 0.15)']}
          style={styles.billUploadGradient}
        >
          <View style={styles.billUploadContent}>
            <Ionicons name="cloud-upload-outline" size={32} color={colors.infoScale[400]} />
            <View style={styles.billUploadText}>
              <Text style={styles.billUploadTitle}>Upload Grocery Bill</Text>
              <Text style={styles.billUploadSubtitle}>Get cashback on any grocery purchase</Text>
            </View>
            <Pressable style={styles.billUploadButton} onPress={() => router.push('/bill-upload' as any)}>
              <Text style={styles.billUploadButtonText}>Upload</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      {/* Smart Suggestions (from API) */}
      {smartSuggestions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.primaryGreen} />
            <Text style={styles.sectionTitle}>Smart Suggestions</Text>
          </View>
          <View style={styles.suggestionsList}>
            {smartSuggestions.slice(0, 5).map((suggestion, index) => (
              <Pressable
                key={index}
                style={styles.suggestionCard}
                onPress={() => handleAISearch(suggestion)}
              >
                <Ionicons name="sparkles-outline" size={16} color={COLORS.primaryGreen} />
                <Text style={styles.suggestionText}>{suggestion}</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* New on App */}
      {newStores.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles-outline" size={20} color={COLORS.primaryGreen} />
            <Text style={styles.sectionTitle}>New on {BRAND.APP_NAME}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesList}>
            {newStores.map((store: any) => (
              <StoreCard key={store._id || store.id} store={store} variant="compact" />
            ))}
          </ScrollView>
        </View>
      )}

      <StreakLoyaltySection categorySlug={slug} primaryColor={colors.success} />

      {/* Enhanced UGC Social Proof Section */}
      <EnhancedUGCSocialProofSection
        categorySlug={slug}
        categoryName={categoryConfig.name}
        posts={ugcPosts}
        title="Smart Shoppers, Real Savings"
        subtitle="See how others are saving on groceries!"
        onPostPress={(post) => router.push(`/ugc/${post.id}` as any)}
        onSharePress={() => router.push('/share' as any)}
        onViewAllPress={() => router.push('/MainCategory/grocery-essentials/grocery-stories' as any)}
      />

      <FooterTrustSection categorySlug={slug} />
    </ScrollView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { paddingBottom: 100 },
  valueStrip: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  valueGradient: { padding: 16 },
  valueText: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },
  tabsContainer: { backgroundColor: COLORS.white, paddingVertical: 8, marginTop: 12 },
  tabs: { paddingHorizontal: 16, gap: 8 },
  tab: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 10, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', gap: 6,
  },
  tabActive: { backgroundColor: COLORS.dark },
  tabLabel: { fontSize: 14, color: COLORS.textSecondary },
  tabLabelActive: { color: COLORS.white, fontWeight: '600' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  sectionSeeAll: { fontSize: 12, color: COLORS.greenDark, fontWeight: '600' },
  sectionCount: { fontSize: 12, color: COLORS.textSecondary },
  storesList: { gap: 12, paddingRight: 16 },
  emptySection: {
    alignItems: 'center', padding: 32, backgroundColor: COLORS.white,
    borderRadius: 16, gap: 8,
  },
  emptySectionText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  // Store cards
  storeCardCompact: {
    width: 180, padding: 12, borderRadius: 16, backgroundColor: COLORS.white,
  },
  storeLogoCompact: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: colors.neutral[100],
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  storeLogoImage: { width: 40, height: 40 },
  storeLogoEmoji: { fontSize: 20 },
  storeNameCompact: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 4 },
  storeRatingCompact: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  storeRatingTextCompact: { fontSize: 12, color: COLORS.textPrimary },
  storeBadgesCompact: { gap: 6 },
  storeBadgeCompact: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  storeBadgeTextCompact: { fontSize: 11, color: colors.successScale[700], fontWeight: '500' },
  storeBadge60Compact: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6,
    paddingVertical: 3, borderRadius: 12, backgroundColor: COLORS.primaryGreen, gap: 3,
  },
  storeBadge60TextCompact: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  storesGrid: { gap: 12 },
  storeCard: { padding: 12, borderRadius: 16, backgroundColor: COLORS.white, marginBottom: 12 },
  storeCardContent: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  storeLogo: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: colors.neutral[100],
    justifyContent: 'center', alignItems: 'center',
  },
  storeInfo: { flex: 1 },
  storeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  storeName: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  storeOpenBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeOpenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  storeOpenText: { fontSize: 11, color: COLORS.green, fontWeight: '500' },
  storeClosedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeClosedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  storeClosedText: { fontSize: 11, color: colors.error, fontWeight: '500' },
  storeMeta: { flexDirection: 'row', gap: 12 },
  storeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeMetaText: { fontSize: 12, color: COLORS.textSecondary },
  storeFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.neutral[100],
  },
  storeCoins: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeCoinsText: { fontSize: 13, color: COLORS.primaryGold, fontWeight: '500' },
  storeActionButton: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.dark,
  },
  storeActionText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  // Products
  productsList: { gap: 12, paddingRight: 16 },
  productCard: { width: 140, padding: 8, borderRadius: 12, backgroundColor: COLORS.white },
  productImageContainer: { width: '100%', height: 120, borderRadius: 8, marginBottom: 8, position: 'relative' },
  productImage: { width: '100%', height: '100%', borderRadius: 8 },
  productTag: {
    position: 'absolute', top: 6, left: 6, paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 12, backgroundColor: COLORS.green,
  },
  productTagText: { fontSize: 9, fontWeight: '600', color: COLORS.white },
  productBadge60: {
    position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 4, paddingVertical: 2, borderRadius: 8, backgroundColor: COLORS.primaryGreen, gap: 2,
  },
  productBadge60Text: { fontSize: 8, fontWeight: '700', color: COLORS.white },
  productBrand: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  productName: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 2 },
  productUnit: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 6 },
  productPriceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  productPrice: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  productOriginalPrice: { fontSize: 11, color: COLORS.textSecondary, textDecorationLine: 'line-through' },
  productAddButton: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.dark,
    justifyContent: 'center', alignItems: 'center',
  },
  productCoins: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  productCoinsText: { fontSize: 11, color: COLORS.primaryGold },
  // Bill upload
  billUploadBanner: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, overflow: 'hidden' },
  billUploadGradient: { padding: 16 },
  billUploadContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  billUploadText: { flex: 1 },
  billUploadTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  billUploadSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  billUploadButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: colors.infoScale[400] },
  billUploadButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.white },
  // Suggestions
  suggestionsList: { gap: 8 },
  suggestionCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 12, backgroundColor: COLORS.white, gap: 8,
  },
  suggestionText: { flex: 1, fontSize: 13, color: colors.neutral[700] },
  // Compare banner
  compareBanner: {
    marginHorizontal: 16, marginTop: 20, borderRadius: 20, overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.15)' },
    }),
  },
  compareBannerGradient: { padding: 18 },
  compareBannerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  compareBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  compareBannerIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(34,197,94,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  compareBannerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  compareBannerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 1 },
  compareBannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primaryGreen, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
  },
  compareBannerCtaText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  compareBannerPerks: {
    flexDirection: 'row', justifyContent: 'space-around',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12,
  },
  compareBannerPerk: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  compareBannerPerkText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  loadMoreButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, marginTop: 12, borderRadius: 12,
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
  },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: COLORS.greenDark },
});

export default React.memo(GroceryCategoryPage);
