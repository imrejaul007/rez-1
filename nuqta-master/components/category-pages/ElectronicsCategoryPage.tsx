// @ts-nocheck
/**
 * Electronics Category Page - PRODUCTION READY v2
 * Features: Dual-row filter chips (device type + preferences), filter propagation to ALL sections,
 * electronics-specific quick actions, trending gadgets, compare devices, enhanced store cards,
 * proper empty states
 * Blue themed to differentiate from other categories
 */

import React, { useState, useMemo, useCallback } from 'react';
import { BRAND } from '@/constants/brand';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
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
import { electronicsCategoryData, electronicsServiceFilters, electronicsModeFilters, electronicsQuickActions } from '@/data/category/electronicsCategoryData';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  blue: colors.infoScale[400],
  blueDark: colors.brand.blue,
  blueLight: colors.tint.blue,
  primaryGold: colors.warningScale[400],
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
  border: colors.neutral[200],
};

// All electronics services with tags for filter matching
const ALL_ELECTRONICS_SERVICES = [
  { id: 'repair', name: 'Device Repair', emoji: '🔧', tags: ['mobile-phones', 'laptops'], cashback: 15 },
  { id: 'exchange', name: 'Exchange', emoji: '🔄', tags: ['mobile-phones', 'laptops'], cashback: 20 },
  { id: 'insurance', name: 'Insurance', emoji: '🛡️', tags: ['mobile-phones', 'laptops', 'smartwatches'], cashback: 10 },
  { id: 'setup', name: 'Setup Help', emoji: '⚙️', tags: ['televisions', 'laptops'], cashback: 12 },
  { id: 'accessories', name: 'Accessories', emoji: '🔋', tags: ['mobile-phones', 'audio', 'gaming'], cashback: 18 },
  { id: 'data-transfer', name: 'Data Transfer', emoji: '📲', tags: ['mobile-phones', 'laptops'], cashback: 8 },
  { id: 'screen-guard', name: 'Screen Guard', emoji: '📱', tags: ['mobile-phones', 'smartwatches'], cashback: 22 },
  { id: 'warranty', name: 'Ext. Warranty', emoji: '✅', tags: ['televisions', 'laptops', 'cameras'], cashback: 10 },
];

// Trending gadgets data
const TRENDING_GADGETS = [
  { id: 'smartphones', name: 'Smartphones', emoji: '📱', tag: 'mobile-phones', bookings: 1200, priceFrom: 12000 },
  { id: 'earbuds', name: 'TWS Earbuds', emoji: '🎧', tag: 'audio', bookings: 890, priceFrom: 1500 },
  { id: 'gaming-laptop', name: 'Gaming Laptops', emoji: '💻', tag: 'laptops', bookings: 560, priceFrom: 55000 },
  { id: 'smart-tv', name: 'Smart TVs', emoji: '📺', tag: 'televisions', bookings: 420, priceFrom: 18000 },
  { id: 'smartwatch', name: 'Smartwatches', emoji: '⌚', tag: 'smartwatches', bookings: 680, priceFrom: 3000 },
  { id: 'console', name: 'Game Consoles', emoji: '🎮', tag: 'gaming', bookings: 340, priceFrom: 35000 },
];

// Helper: check if a store matches a given filter
function storeMatchesFilter(store: any, filterId: string): boolean {
  const tags = (store.tags || []).map((t: string) => t.toLowerCase());
  const serviceTypes = (store.serviceTypes || []).map((t: string) => t.toLowerCase());
  const allTags = [...tags, ...serviceTypes];

  switch (filterId) {
    case 'mobile-phones': return allTags.some(t => t.includes('mobile') || t.includes('phone') || t.includes('smartphone'));
    case 'laptops': return allTags.some(t => t.includes('laptop') || t.includes('computer') || t.includes('notebook'));
    case 'audio': return allTags.some(t => t.includes('audio') || t.includes('headphone') || t.includes('speaker') || t.includes('earbud'));
    case 'gaming': return allTags.some(t => t.includes('gaming') || t.includes('console') || t.includes('playstation') || t.includes('xbox'));
    case 'televisions': return allTags.some(t => t.includes('tv') || t.includes('television') || t.includes('display'));
    case 'smartwatches': return allTags.some(t => t.includes('watch') || t.includes('wearable') || t.includes('fitness'));
    case 'cameras': return allTags.some(t => t.includes('camera') || t.includes('photo') || t.includes('drone'));
    case 'budget': return (store.priceForTwo || 999) < 5000 || store.deliveryCategories?.budgetFriendly;
    case 'premium': return tags.some(t => t.includes('premium') || t.includes('apple') || t.includes('pro'));
    case 'new-launch': return tags.some(t => t.includes('new') || t.includes('launch') || t.includes('latest'));
    case 'top-seller': return tags.some(t => t.includes('bestseller') || t.includes('popular') || t.includes('top'));
    case 'exchange': return tags.some(t => t.includes('exchange') || t.includes('trade') || t.includes('buyback'));
    case 'fast-delivery': return tags.some(t => t.includes('fast') || t.includes('express') || t.includes('same-day'));
    default: return false;
  }
}

function getPriceTier(priceForTwo?: number): { label: string; color: string } {
  if (!priceForTwo) return { label: '', color: '' };
  if (priceForTwo < 10000) return { label: '$', color: colors.success };
  if (priceForTwo < 50000) return { label: '$$', color: colors.warningScale[400] };
  return { label: '$$$', color: colors.brand.purpleLight };
}

function ElectronicsCategoryPage() {
  const router = useRouter();
  const slug = 'electronics';
  const categoryConfig = getCategoryConfig(slug);
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const {
    subcategories, stores, products, ugcPosts, aiPlaceholders,
    isLoading, error, refetch,
  } = useCategoryPageData(slug);

  const [activeServiceFilters, setActiveServiceFilters] = useState<string[]>([]);
  const [activeLifestyleFilters, setActiveLifestyleFilters] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useIsMounted();

  const activeModes = [...activeServiceFilters, ...activeLifestyleFilters];
  const hasActiveFilters = activeModes.length > 0;

  if (!isMounted()) return;
  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  const toggleServiceFilter = (filterId: string) => {
    if (!isMounted()) return;
    setActiveServiceFilters(prev =>
      prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]
    );
  };

  const toggleLifestyleFilter = (filterId: string) => {
    setActiveLifestyleFilters(prev =>
      prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]
    );
  };

  const clearAllFilters = () => { setActiveServiceFilters([]); setActiveLifestyleFilters([]); };

  const storeCountsByFilter = useMemo(() => {
    const counts: Record<string, number> = {};
    [...electronicsServiceFilters, ...electronicsModeFilters].forEach(f => {
      counts[f.id] = stores.filter((s: any) => storeMatchesFilter(s, f.id)).length;
    });
    return counts;
  }, [stores]);

  const filteredStores = useMemo(() => {
    if (!hasActiveFilters) return stores;
    return stores.filter((store: any) => {
      const passesService = activeServiceFilters.length === 0 ||
        activeServiceFilters.some(f => storeMatchesFilter(store, f));
      const passesLifestyle = activeLifestyleFilters.length === 0 ||
        activeLifestyleFilters.some(f => storeMatchesFilter(store, f));
      return passesService && passesLifestyle;
    });
  }, [stores, activeServiceFilters, activeLifestyleFilters, hasActiveFilters]);

  const filteredProducts = useMemo(() => {
    if (!hasActiveFilters) return products;
    return products.filter((product: any) => {
      const tags = (product.tags || []).map((t: string) => t.toLowerCase());
      const name = (product.name || '').toLowerCase();
      const allTags = [...tags, name];
      const passesService = activeServiceFilters.length === 0 ||
        activeServiceFilters.some(f => allTags.some(t => t.includes(f)));
      const passesLifestyle = activeLifestyleFilters.length === 0 ||
        activeLifestyleFilters.some(f => {
          if (f === 'budget') return (product.price || 999) < 10000;
          if (f === 'premium') return allTags.some(t => t.includes('premium'));
          return true;
        });
      return passesService && passesLifestyle;
    });
  }, [products, activeServiceFilters, activeLifestyleFilters, hasActiveFilters]);

  const filteredServices = useMemo(() => {
    if (activeServiceFilters.length === 0) return ALL_ELECTRONICS_SERVICES;
    return ALL_ELECTRONICS_SERVICES.filter(s => s.tags.some(t => activeServiceFilters.includes(t)));
  }, [activeServiceFilters]);

  const filteredTrending = useMemo(() => {
    if (activeServiceFilters.length === 0) return TRENDING_GADGETS;
    return TRENDING_GADGETS.filter(t => activeServiceFilters.includes(t.tag));
  }, [activeServiceFilters]);

  const activeFilterTags = useMemo(() => {
    if (!hasActiveFilters) return undefined;
    return activeModes;
  }, [activeModes, hasActiveFilters]);

  const handleCategoryPress = useCallback((category: any) => {
    router.push(`/MainCategory/electronics/${category.slug || category.id}` as any);
  }, [router]);

  const handleAISearch = useCallback((query: string) => {
    router.push(`/MainCategory/electronics/search?q=${encodeURIComponent(query)}` as any);
  }, [router]);

  if (!categoryConfig) return null;

  if (isLoading && !refreshing && stores.length === 0) {
    return <LoadingState message="Loading electronics..." />;
  }

  if (error && stores.length === 0) {
    return (
      <EmptyState
        icon="📱"
        title="Unable to load electronics"
        message={error || "Something went wrong. Please try again."}
        actionLabel="Try Again"
        onAction={refetch}
      />
    );
  }

  const renderChip = (
    filter: { id: string; label: string; icon: string; color: string },
    isActive: boolean,
    onToggle: (id: string) => void,
  ) => {
    const count = storeCountsByFilter[filter.id] || 0;
    return (
      <Pressable
        key={filter.id}
        onPress={() => onToggle(filter.id)}
        style={[styles.chipBase, isActive && { backgroundColor: filter.color, borderColor: filter.color }]}
       
      >
        <View style={[styles.chipIconCircle, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : `${filter.color}14` }]}>
          {isActive ? <Ionicons name="checkmark" size={14} color={COLORS.white} /> : <Text style={styles.chipIconText}>{filter.icon}</Text>}
        </View>
        <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>{filter.label}</Text>
        {count > 0 && (
          <View style={[styles.chipCount, isActive && styles.chipCountActive]}>
            <Text style={[styles.chipCountText, isActive && styles.chipCountTextActive]}>{count}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <ErrorBoundary onError={() => { /* silently handle */ }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.blue]} />}
    >
      <CategoryHeader
        categoryName={categoryConfig.name}
        primaryColor={categoryConfig.primaryColor}
        banner={categoryConfig.banner}
        gradientColors={categoryConfig.gradientColors}
      />

      {/* Rewards Strip */}
      <Pressable style={styles.rewardsStrip} onPress={() => router.push('/MainCategory/electronics/loyalty' as any)}>
        <LinearGradient colors={['rgba(59,130,246,0.15)', 'rgba(37,99,235,0.1)']} style={styles.rewardsGradient}>
          <View style={styles.rewardsContent}>
            <Ionicons name="star" size={20} color={COLORS.blue} />
            <Text style={styles.rewardsText}>{`Earn up to 20% Cashback + ${BRAND.COIN_NAME} on every electronics purchase`}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.blue} />
          </View>
          <Text style={styles.rewardsSubtext}>Works at authorized dealers & online stores</Text>
        </LinearGradient>
      </Pressable>

      {/* Dual-Row Filter Chips */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterRowLabel}>Browse by Device</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {electronicsServiceFilters.map(f => renderChip(f, activeServiceFilters.includes(f.id), toggleServiceFilter))}
        </ScrollView>
        <Text style={[styles.filterRowLabel, { marginTop: 10 }]}>Your Preferences</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {electronicsModeFilters.map(f => renderChip(f, activeLifestyleFilters.includes(f.id), toggleLifestyleFilter))}
        </ScrollView>
        {hasActiveFilters && (
          <View style={styles.filterSummary}>
            <Text style={styles.filterSummaryText}>
              Showing: {activeModes.map(m => {
                const f = [...electronicsServiceFilters, ...electronicsModeFilters].find(x => x.id === m);
                return f?.label;
              }).filter(Boolean).join(', ')}
            </Text>
            <Pressable onPress={clearAllFilters} style={styles.clearFilters}>
              <Text style={styles.clearFiltersText}>Clear all</Text>
              <Ionicons name="close-circle" size={14} color={COLORS.blue} />
            </Pressable>
          </View>
        )}
      </View>

      <QuickActionBar categorySlug={slug} actions={electronicsQuickActions as any} />

      <EnhancedAISuggestionsSection categorySlug={slug} categoryName={categoryConfig.name} placeholders={aiPlaceholders} onSearch={handleAISearch} />

      <BrowseCategoryGrid categories={subcategories} title="Shop by Category" onCategoryPress={handleCategoryPress} />

      {/* Trending Gadgets */}
      {filteredTrending.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={20} color={colors.error} />
            <Text style={styles.sectionTitle}>Trending This Week</Text>
            <Pressable onPress={() => router.push('/MainCategory/electronics/search?q=trending' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingList}>
            {filteredTrending.map(w => (
              <Pressable key={w.id} style={styles.trendingCard} onPress={() => router.push(`/MainCategory/electronics/search?q=${w.id}` as any)}>
                <LinearGradient colors={[COLORS.blue, COLORS.blueDark]} style={styles.trendingGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.trendingEmoji}>{w.emoji}</Text>
                  <Text style={styles.trendingName}>{w.name}</Text>
                  <View style={styles.trendingBadge}>
                    <Ionicons name="trending-up" size={10} color={COLORS.blue} />
                    <Text style={styles.trendingBadgeText}>{w.bookings}+ sold</Text>
                  </View>
                  <Text style={styles.trendingPrice}>From {currencySymbol}{w.priceFrom.toLocaleString()}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tech Services */}
      {filteredServices.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🔧</Text>
            <Text style={styles.sectionTitle}>Tech Services</Text>
            <Pressable onPress={() => router.push('/MainCategory/electronics/compare-devices' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesList}>
            {filteredServices.map(s => (
              <Pressable key={s.id} style={styles.serviceCard} onPress={() => router.push(`/MainCategory/electronics/compare-devices` as any)}>
                <View style={styles.serviceIcon}><Text style={styles.serviceEmoji}>{s.emoji}</Text></View>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.serviceCashback}>Up to {s.cashback}% cashback</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <OrderAgainSection categorySlug={slug} />

      {/* Electronics Products */}
      {filteredProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🛍️</Text>
            <Text style={styles.sectionTitle}>Trending Gadgets</Text>
            <Pressable onPress={() => router.push('/MainCategory/electronics/search?q=trending' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsList}>
            {filteredProducts.slice(0, 6).map((p: any) => (
              <Pressable key={p.id} style={styles.productCardCompact} onPress={() => router.push(`/product-page?productId=${p.id}` as any)}>
                {p.image ? (
                  <CachedImage source={p.image} style={styles.productImageCompact} contentFit="cover" />
                ) : (
                  <View style={[styles.productImageCompact, styles.productPlaceholder]}>
                    <Ionicons name="phone-portrait-outline" size={28} color={COLORS.blue} />
                  </View>
                )}
                <Text style={styles.productNameCompact} numberOfLines={2}>{p.name}</Text>
                <Text style={styles.productPriceCompact}>{currencySymbol}{p.price?.toLocaleString() || '0'}</Text>
                <Text style={styles.productCashbackCompact}>{p.cashback || 10}% cashback</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Top Electronics Stores */}
      {filteredStores.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.blue} />
            <Text style={styles.sectionTitle}>Top Electronics Stores</Text>
            <Pressable onPress={() => router.push('/MainCategory/electronics/top-rated' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesList}>
            {filteredStores.slice(0, 5).map((store: any) => {
              const pt = getPriceTier(store.priceForTwo);
              const topSvc = store.serviceTypes?.[0] || '';
              return (
                <Pressable key={store.id} style={styles.storeCard} onPress={() => router.push(`/MainStorePage?storeId=${store.id}` as any)}>
                  {(store.logo || store.banner?.[0]) ? (
                    <CachedImage source={store.logo || store.banner?.[0]} style={styles.storeImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.storeImage, styles.storePlaceholder]}><Ionicons name="hardware-chip" size={32} color={COLORS.blue} /></View>
                  )}
                  <View style={styles.storeBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                    <Text style={styles.storeBadgeText}>Verified</Text>
                  </View>
                  <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                  <View style={styles.storeMeta}>
                    <View style={styles.storeRating}>
                      <Ionicons name="star" size={12} color={COLORS.primaryGold} />
                      <Text style={styles.storeRatingText}>{store.rating?.toFixed(1) || 'New'}</Text>
                    </View>
                    {pt.label ? <Text style={[styles.storePriceTier, { color: pt.color }]}>{pt.label}</Text> : null}
                  </View>
                  {topSvc ? <Text style={styles.storeService} numberOfLines={1}>{topSvc}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Filter empty state */}
      {hasActiveFilters && filteredStores.length === 0 && filteredProducts.length === 0 && (
        <View style={styles.filterEmptyState}>
          <Ionicons name="search-outline" size={48} color={COLORS.blueLight} />
          <Text style={styles.filterEmptyTitle}>No electronics stores match your filters</Text>
          <Text style={styles.filterEmptySubtitle}>Try removing some filters to see more results</Text>
          <Pressable onPress={clearAllFilters} style={styles.filterEmptyClearBtn}>
            <Text style={styles.filterEmptyClearText}>Clear all filters</Text>
          </Pressable>
        </View>
      )}

      <OffersSection categorySlug={slug} title="Today's Top Tech Deals" onSeeAll={() => router.push('/MainCategory/electronics/offers' as any)} filterTags={activeFilterTags} />

      {/* Compare Devices Banner */}
      <View style={styles.section}>
        <Pressable style={styles.ctaBanner} onPress={() => router.push('/MainCategory/electronics/compare-devices' as any)}>
          <LinearGradient colors={[COLORS.blue, COLORS.blueDark]} style={styles.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.ctaContent}>
              <Text style={styles.ctaEmoji}>🧠</Text>
              <View style={styles.ctaText}>
                <Text style={styles.ctaTitle}>Smart Compare</Text>
                <Text style={styles.ctaSubtitle}>Compare prices across Amazon, Flipkart & more</Text>
              </View>
              <View style={styles.ctaBtn}><Text style={styles.ctaBtnText}>Compare</Text></View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      <StreakLoyaltySection categorySlug={slug} primaryColor={COLORS.blue} />

      <EnhancedUGCSocialProofSection
        categorySlug={slug} categoryName={categoryConfig.name} posts={ugcPosts}
        title="Real Tech Enthusiasts" subtitle="See what others are buying!"
        onPostPress={() => router.push('/MainCategory/electronics/tech-stories' as any)}
        onSharePress={() => router.push('/MainCategory/electronics/tech-stories' as any)}
      />

      <FooterTrustSection />
    </ScrollView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { paddingBottom: 100 },
  rewardsStrip: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  rewardsGradient: { padding: 12 },
  rewardsContent: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rewardsText: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },
  rewardsSubtext: { fontSize: 12, color: COLORS.textSecondary },
  filtersContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  filterRowLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterRow: { gap: 8, paddingRight: 8 },
  chipBase: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 22, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, gap: 6 },
  chipIconCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  chipIconText: { fontSize: 14 },
  chipLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  chipLabelActive: { color: COLORS.white, fontWeight: '600' },
  chipCount: { backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  chipCountText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  chipCountTextActive: { color: COLORS.white },
  filterSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  filterSummaryText: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  clearFilters: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearFiltersText: { fontSize: 12, color: COLORS.blue, fontWeight: '600' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  sectionSeeAll: { fontSize: 12, color: COLORS.blue, fontWeight: '500' },
  trendingList: { gap: 12, paddingRight: 16 },
  trendingCard: { width: 140, borderRadius: 16, overflow: 'hidden' },
  trendingGradient: { padding: 14, height: 160, justifyContent: 'space-between' },
  trendingEmoji: { fontSize: 28 },
  trendingName: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginTop: 4 },
  trendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  trendingBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.blue },
  trendingPrice: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  servicesList: { gap: 12, paddingRight: 16 },
  serviceCard: {
    width: 100, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: COLORS.white,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 }, web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } }),
  },
  serviceIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.blueLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  serviceEmoji: { fontSize: 24 },
  serviceName: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 4 },
  serviceCashback: { fontSize: 11, color: COLORS.blue, textAlign: 'center' },
  productsList: { gap: 12, paddingRight: 16 },
  productCardCompact: {
    width: 140, padding: 8, borderRadius: 12, backgroundColor: COLORS.white,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 }, web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } }),
  },
  productImageCompact: { width: '100%', height: 140, borderRadius: 8, marginBottom: 8 },
  productPlaceholder: { backgroundColor: COLORS.blueLight, justifyContent: 'center', alignItems: 'center' },
  productNameCompact: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 4 },
  productPriceCompact: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  productCashbackCompact: { fontSize: 11, color: COLORS.blue },
  storesList: { gap: 12, paddingRight: 16 },
  storeCard: {
    width: 170, borderRadius: 16, backgroundColor: COLORS.white, overflow: 'hidden', position: 'relative',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 }, web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } }),
  },
  storeImage: { width: '100%', height: 100 },
  storePlaceholder: { backgroundColor: COLORS.blueLight, justifyContent: 'center', alignItems: 'center' },
  storeBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12, backgroundColor: COLORS.blue, gap: 3 },
  storeBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.white },
  storeName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 2 },
  storeMeta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 8 },
  storeRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeRatingText: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary },
  storePriceTier: { fontSize: 12, fontWeight: '700' },
  storeService: { fontSize: 11, color: COLORS.textSecondary, paddingHorizontal: 8, paddingBottom: 8 },
  filterEmptyState: { alignItems: 'center', padding: 40, marginTop: 24 },
  filterEmptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  filterEmptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  filterEmptyClearBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.blue },
  filterEmptyClearText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  ctaBanner: { borderRadius: 16, overflow: 'hidden' },
  ctaGradient: { padding: 16 },
  ctaContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ctaEmoji: { fontSize: 32 },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  ctaSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  ctaBtn: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  ctaBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.blue },
});

export default React.memo(ElectronicsCategoryPage);
