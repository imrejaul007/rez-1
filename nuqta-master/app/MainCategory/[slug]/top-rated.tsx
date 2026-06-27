// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shared Top Rated Stores Page
 * /MainCategory/[slug]/top-rated
 * Shows all top-rated (4.0+) stores sorted by various criteria
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCategoryTheme, SHARED_COLORS } from '@/config/categoryThemeConfig';
import { getCategoryConfig } from '@/config/categoryConfig';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storesApi } from '@/services/storesApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type SortOption = 'popularity' | 'rating' | 'newest' | 'price-low' | 'price-high';

function StoreCard({ store, currencySymbol, onVisitNow, primaryColor }: { store: any; currencySymbol: string; onVisitNow: () => void; primaryColor: string }) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const imageUri = store.banner?.[0] || store.banner || store.logo || store.image;
  const cashbackPercent = store.offers?.cashback || 0;

  const isPremium = store.tags?.some((t: string) => t.toLowerCase() === 'premium');
  const isAuthorized = store.tags?.some((t: string) => ['authorized', 'official'].includes(t.toLowerCase()));
  const hasFastDelivery = store.deliveryCategories?.fastDelivery;
  const hasEMI = store.tags?.some((t: string) => ['emi', 'no-cost-emi'].includes(t.toLowerCase()));

  const serviceTags = (store.tags || [])
    .filter((t: string) => !['premium', 'authorized', 'official', 'emi', 'no-cost-emi'].includes(t.toLowerCase()))
    .slice(0, 3)
    .map((t: string) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' \u2022 ') || store.category?.name || 'Store';

  return (
    <Pressable
      style={styles.storeCard}
      onPress={() => router.push(`/MainStorePage?storeId=${store._id || store.id}` as any)}
     
    >
      <View style={styles.storeImageContainer}>
        {imageUri && !imageError ? (
          <CachedImage source={imageUri} style={styles.storeImage} contentFit="cover" onError={() => setImageError(true)} />
        ) : (
          <View style={[styles.storeImage, styles.storeImagePlaceholder]}>
            <Ionicons name="storefront-outline" size={32} color={SHARED_COLORS.textSecondary} />
          </View>
        )}
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.storeImageGradient} />

        {/* Badges */}
        <View style={styles.storeBadges}>
          {hasFastDelivery && (
            <View style={[styles.badgeTag, { backgroundColor: Colors.warning }]}>
              <Text style={styles.badgeTagText}>Fast Delivery</Text>
            </View>
          )}
          {isPremium && (
            <View style={[styles.badgeTag, { backgroundColor: Colors.brand.purpleLight }]}>
              <Text style={styles.badgeTagText}>Premium</Text>
            </View>
          )}
          {isAuthorized && (
            <View style={[styles.badgeTag, { backgroundColor: Colors.success }]}>
              <Text style={styles.badgeTagText}>Authorized</Text>
            </View>
          )}
          {hasEMI && (
            <View style={[styles.badgeTag, { backgroundColor: Colors.info }]}>
              <Text style={styles.badgeTagText}>EMI Available</Text>
            </View>
          )}
          {cashbackPercent > 0 && (
            <View style={[styles.badgeTag, { backgroundColor: primaryColor }]}>
              <Text style={styles.badgeTagText}>{cashbackPercent}% cashback</Text>
            </View>
          )}
        </View>

        {/* Large rating badge */}
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color={primaryColor} />
          <Text style={styles.ratingValue}>{(store.ratings?.average || 4.5).toFixed(1)}</Text>
          <Text style={styles.ratingCount}>({store.ratings?.count || 0} reviews)</Text>
        </View>
      </View>

      <View style={styles.storeContent}>
        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.storeServices} numberOfLines={1}>{serviceTags}</Text>
        <View style={styles.storeMeta}>
          <View style={styles.storeMetaItem}>
            <Ionicons name="location-outline" size={12} color={SHARED_COLORS.textSecondary} />
            <Text style={styles.storeMetaText}>{store.location?.city || 'Nearby'}</Text>
          </View>
          <View style={styles.storeMetaItem}>
            <Ionicons name="time-outline" size={12} color={SHARED_COLORS.textSecondary} />
            <Text style={styles.storeMetaText}>{store.operationalInfo?.deliveryTime || 'Same day delivery'}</Text>
          </View>
          {store.priceForTwo && (
            <Text style={styles.storePriceForTwo}>{currencySymbol}{store.priceForTwo} avg.</Text>
          )}
        </View>

        {/* Visit Now Button */}
        <Pressable
          style={styles.visitNowButton}
          onPress={(e) => {
            e.stopPropagation();
            onVisitNow();
          }}
         
        >
          <LinearGradient
            colors={[Colors.info, colors.brand.blue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.visitNowGradient}
          >
            <Ionicons name="storefront-outline" size={14} color={SHARED_COLORS.white} />
            <Text style={styles.visitNowText}>Visit Store</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Pressable>
  );
}

function SharedCategoryPage() {
  const isMounted = useIsMounted();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = getCategoryTheme(slug || '');
  const categoryConfig = getCategoryConfig(slug || '');
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [stores, setStores] = useState<any[]>([]);
  const [filteredStores, setFilteredStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('popularity');

  const sortOptions: { key: SortOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'popularity', label: 'Popularity', icon: 'trending-up' },
    { key: 'rating', label: 'Rating', icon: 'star' },
    { key: 'newest', label: 'Newest', icon: 'time' },
    { key: 'price-low', label: 'Price Low-High', icon: 'arrow-up' },
    { key: 'price-high', label: 'Price High-Low', icon: 'arrow-down' },
  ];

  const applySorting = useCallback((data: any[], sort: SortOption) => {
    const sorted = [...data];
    switch (sort) {
      case 'popularity':
        sorted.sort((a, b) => (b.ratings?.count || 0) - (a.ratings?.count || 0));
        break;
      case 'rating':
        sorted.sort((a, b) => (b.ratings?.average || 0) - (a.ratings?.average || 0));
        break;
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case 'price-low':
        sorted.sort((a, b) => (a.priceForTwo || 0) - (b.priceForTwo || 0));
        break;
      case 'price-high':
        sorted.sort((a, b) => (b.priceForTwo || 0) - (a.priceForTwo || 0));
        break;
    }
    return sorted;
  }, []);

  const fetchStores = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await storesApi.getStoresBySubcategorySlug(slug || 'electronics', 50);

      if (response.success && response.data) {
        const allStores = Array.isArray(response.data) ? response.data : (response.data.stores || []);
        // Filter for top rated (4.0+)
        const topRated = allStores.filter((s: any) => (s.ratings?.average || 0) >= 4.0);
        if (!isMounted()) return;
        setStores(topRated);
        if (!isMounted()) return;
        setFilteredStores(applySorting(topRated, sortBy));
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, [applySorting, sortBy]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  useEffect(() => {
    setFilteredStores(applySorting(stores, sortBy));
  }, [sortBy, stores, applySorting]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStores();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const handleVisitNow = useCallback((store: any) => {
    router.push(`/MainStorePage?storeId=${store._id || store.id}` as any);
  }, [router]);

  const renderTopRatedItem = useCallback(({ item }: { item: any }) => (
    <StoreCard
      store={item}
      currencySymbol={currencySymbol}
      onVisitNow={() => handleVisitNow(item)}
      primaryColor={theme.primaryColor}
    />
  ), [currencySymbol, handleVisitNow, theme.primaryColor]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <CardGridSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[Colors.info, colors.brand.blue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={SHARED_COLORS.white} />
        </Pressable>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="trophy" size={24} color={SHARED_COLORS.white} />
          <View>
            <Text style={styles.headerTitle}>Top Rated {categoryConfig?.name || 'Stores'}</Text>
            <Text style={styles.headerSubtitle}>{filteredStores.length} stores with 4.0+ rating</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortOptions}>
          {sortOptions.map((option) => (
            <Pressable
              key={option.key}
              style={[
                styles.sortChip,
                sortBy === option.key && styles.sortChipActive,
              ]}
              onPress={() => setSortBy(option.key)}
             
            >
              <Ionicons
                name={option.icon}
                size={12}
                color={sortBy === option.key ? SHARED_COLORS.white : SHARED_COLORS.textSecondary}
              />
              <Text
                style={[
                  styles.sortChipText,
                  sortBy === option.key && styles.sortChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlashList
        data={filteredStores}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderTopRatedItem}
        contentContainerStyle={styles.storeList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primaryColor]} tintColor={theme.primaryColor} />}
        estimatedItemSize={100}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name={(theme.defaultMissionIcon || 'storefront-outline') as any} size={48} color={theme.primaryColor} />
            <Text style={styles.emptyTitle}>No top-rated stores found yet</Text>
            <Text style={styles.emptySubtitle}>We're working on bringing the best stores to your area</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },

  // Header
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    gap: Spacing.md,
  },
  backButton: { padding: Spacing.xs },
  headerTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { ...Typography.h4, fontWeight: '700', color: Colors.text.inverse },
  headerSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.85)' },

  // Sort Bar
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
    gap: Spacing.sm,
  },
  sortLabel: { ...Typography.bodySmall, fontWeight: '600', color: Colors.text.tertiary },
  sortOptions: { flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.tint.blue,
    gap: Spacing.xs,
  },
  sortChipActive: {
    backgroundColor: Colors.info,
  },
  sortChipText: { ...Typography.caption, fontWeight: '500', color: Colors.text.tertiary },
  sortChipTextActive: { color: Colors.text.inverse },

  // Store List
  storeList: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, paddingBottom: 120 },

  // Store Card
  storeCard: {
    borderRadius: BorderRadius.lg, backgroundColor: Colors.background.primary, overflow: 'hidden', marginBottom: Spacing.base,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  storeImageContainer: { height: 160, position: 'relative' },
  storeImage: { width: '100%', height: '100%' },
  storeImagePlaceholder: { backgroundColor: colors.tint.blue, justifyContent: 'center', alignItems: 'center' },
  storeImageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  storeBadges: {
    position: 'absolute', top: 8, left: 8, flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap',
  },
  badgeTag: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  badgeTagText: { ...Typography.overline, fontWeight: '600', color: Colors.text.inverse },
  ratingBadge: {
    position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.md, backgroundColor: 'rgba(255,255,255,0.95)', gap: Spacing.xs,
  },
  ratingValue: { ...Typography.body, fontWeight: '700', color: Colors.text.primary },
  ratingCount: { ...Typography.caption, color: Colors.text.tertiary },
  storeContent: { padding: Spacing.md },
  storeName: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary, marginBottom: 2 },
  storeServices: { ...Typography.bodySmall, color: Colors.text.tertiary, marginBottom: Spacing.sm },
  storeMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: 10 },
  storeMetaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  storeMetaText: { ...Typography.caption, color: Colors.text.tertiary },
  storePriceForTwo: { ...Typography.caption, color: Colors.text.tertiary },

  // Visit Now Button
  visitNowButton: { borderRadius: 10, overflow: 'hidden' },
  visitNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    gap: 6,
  },
  visitNowText: { ...Typography.bodySmall, fontWeight: '700', color: Colors.text.inverse },

  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary, marginTop: Spacing.base },
  emptySubtitle: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: Spacing.xs, textAlign: 'center' },
});

export default withErrorBoundary(SharedCategoryPage, 'MainCategorySlugTopRated');
