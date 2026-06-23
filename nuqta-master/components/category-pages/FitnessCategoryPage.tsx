// @ts-nocheck
/**
 * Fitness & Sports Category Page - PRODUCTION READY v2
 * Features: Dual-row filter chips (activity + preferences), filter propagation to ALL sections,
 * fitness-specific quick actions, trending workouts, book & train, enhanced gym cards,
 * proper empty states
 * Orange/energy themed to differentiate from other categories
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
import { fitnessCategoryData, fitnessServiceFilters, fitnessModeFilters, fitnessQuickActions } from '@/data/category/fitnessCategoryData';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  orange: colors.brand.orange,
  orangeDark: colors.brand.orangeDark,
  orangeLight: colors.tint.orange,
  primaryGold: colors.warningScale[400],
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
  border: colors.neutral[200],
};

// All fitness services with tags for filter matching
const ALL_FITNESS_SERVICES = [
  { id: 'gym-session', name: 'Gym Session', emoji: '🏋️', tags: ['gym'], cashback: 15 },
  { id: 'yoga-class', name: 'Yoga Class', emoji: '🧘', tags: ['yoga'], cashback: 20 },
  { id: 'crossfit-wod', name: 'CrossFit WOD', emoji: '🔥', tags: ['crossfit'], cashback: 18 },
  { id: 'swimming-lap', name: 'Swimming', emoji: '🏊', tags: ['swimming'], cashback: 15 },
  { id: 'personal-training', name: 'PT Session', emoji: '👨‍🏫', tags: ['gym'], cashback: 25 },
  { id: 'group-class', name: 'Group Class', emoji: '👥', tags: ['dance', 'yoga', 'crossfit'], cashback: 18 },
  { id: 'martial-arts-class', name: 'Martial Arts', emoji: '🥋', tags: ['martial-arts'], cashback: 20 },
  { id: 'boxing-session', name: 'Boxing', emoji: '🥊', tags: ['martial-arts'], cashback: 20 },
  { id: 'pilates-class', name: 'Pilates', emoji: '🤸', tags: ['yoga'], cashback: 18 },
  { id: 'zumba-class', name: 'Zumba', emoji: '💃', tags: ['dance'], cashback: 15 },
];

// Trending workouts data
const TRENDING_WORKOUTS = [
  { id: 'hiit', name: 'HIIT Training', emoji: '⚡', tag: 'gym', bookings: 450, priceFrom: 500 },
  { id: 'power-yoga', name: 'Power Yoga', emoji: '🧘', tag: 'yoga', bookings: 340, priceFrom: 400 },
  { id: 'kickboxing', name: 'Kickboxing', emoji: '🥊', tag: 'martial-arts', bookings: 280, priceFrom: 600 },
  { id: 'spin-class', name: 'Spin Class', emoji: '🚴', tag: 'gym', bookings: 220, priceFrom: 350 },
  { id: 'aqua-aerobics', name: 'Aqua Aerobics', emoji: '🏊', tag: 'swimming', bookings: 180, priceFrom: 450 },
  { id: 'functional', name: 'Functional', emoji: '💪', tag: 'crossfit', bookings: 300, priceFrom: 550 },
];

// Helper: check if a store matches a given filter
function storeMatchesFilter(store: any, filterId: string): boolean {
  const tags = (store.tags || []).map((t: string) => t.toLowerCase());
  const serviceTypes = (store.serviceTypes || []).map((t: string) => t.toLowerCase());
  const allTags = [...tags, ...serviceTypes];

  switch (filterId) {
    case 'gym': return allTags.some(t => t.includes('gym') || t.includes('weights') || t.includes('fitness'));
    case 'yoga': return allTags.some(t => t.includes('yoga') || t.includes('pilates'));
    case 'crossfit': return allTags.some(t => t.includes('crossfit') || t.includes('functional'));
    case 'swimming': return allTags.some(t => t.includes('swim') || t.includes('pool') || t.includes('aqua'));
    case 'martial-arts': return allTags.some(t => t.includes('martial') || t.includes('boxing') || t.includes('karate') || t.includes('mma'));
    case 'dance': return allTags.some(t => t.includes('dance') || t.includes('zumba'));
    case 'running': return allTags.some(t => t.includes('running') || t.includes('track') || t.includes('outdoor'));
    case 'budget': return (store.priceForTwo || 999) < 500 || store.deliveryCategories?.budgetFriendly;
    case 'premium': return tags.some(t => t.includes('premium') || t.includes('luxury'));
    case '24x7': return tags.some(t => t.includes('24x7') || t.includes('24/7') || t.includes('anytime'));
    case 'women-only': return tags.some(t => t.includes('women') || t.includes('ladies'));
    case 'home-workout': return tags.some(t => t.includes('home') || t.includes('online') || t.includes('virtual'));
    case 'outdoor': return tags.some(t => t.includes('outdoor') || t.includes('park') || t.includes('open'));
    default: return false;
  }
}

function getPriceTier(priceForTwo?: number): { label: string; color: string } {
  if (!priceForTwo) return { label: '', color: '' };
  if (priceForTwo < 500) return { label: '$', color: colors.success };
  if (priceForTwo < 1500) return { label: '$$', color: colors.warningScale[400] };
  return { label: '$$$', color: colors.brand.purpleLight };
}

function FitnessCategoryPage() {
  const router = useRouter();
  const slug = 'fitness-sports';
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
    [...fitnessServiceFilters, ...fitnessModeFilters].forEach(f => {
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
          if (f === 'budget') return (product.price || 999) < 500;
          if (f === 'premium') return allTags.some(t => t.includes('premium'));
          return true;
        });
      return passesService && passesLifestyle;
    });
  }, [products, activeServiceFilters, activeLifestyleFilters, hasActiveFilters]);

  const filteredServices = useMemo(() => {
    if (activeServiceFilters.length === 0) return ALL_FITNESS_SERVICES;
    return ALL_FITNESS_SERVICES.filter(s => s.tags.some(t => activeServiceFilters.includes(t)));
  }, [activeServiceFilters]);

  const filteredTrending = useMemo(() => {
    if (activeServiceFilters.length === 0) return TRENDING_WORKOUTS;
    return TRENDING_WORKOUTS.filter(t => activeServiceFilters.includes(t.tag));
  }, [activeServiceFilters]);

  const activeFilterTags = useMemo(() => {
    if (!hasActiveFilters) return undefined;
    return activeModes;
  }, [activeModes, hasActiveFilters]);

  const handleCategoryPress = useCallback((category: any) => {
    router.push(`/MainCategory/fitness-sports/${category.slug || category.id}` as any);
  }, [router]);

  const handleAISearch = useCallback((query: string) => {
    router.push(`/MainCategory/fitness-sports/search?q=${encodeURIComponent(query)}` as any);
  }, [router]);

  if (!categoryConfig) return null;

  if (isLoading && !refreshing && stores.length === 0) {
    return <LoadingState message="Loading fitness..." />;
  }

  if (error && stores.length === 0) {
    return (
      <EmptyState
        icon="🏋️"
        title="Unable to load fitness"
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.orange]} />}
    >
      <CategoryHeader
        categoryName={categoryConfig.name}
        primaryColor={categoryConfig.primaryColor}
        banner={categoryConfig.banner}
        gradientColors={categoryConfig.gradientColors}
      />

      {/* Rewards Strip */}
      <Pressable style={styles.rewardsStrip} onPress={() => router.push('/MainCategory/fitness-sports/loyalty' as any)}>
        <LinearGradient colors={['rgba(249,115,22,0.15)', 'rgba(234,88,12,0.1)']} style={styles.rewardsGradient}>
          <View style={styles.rewardsContent}>
            <Ionicons name="star" size={20} color={COLORS.orange} />
            <Text style={styles.rewardsText}>{`Earn up to 25% Cashback + ${BRAND.COIN_NAME} on every fitness visit`}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.orange} />
          </View>
          <Text style={styles.rewardsSubtext}>Works at gyms, studios & sports stores</Text>
        </LinearGradient>
      </Pressable>

      {/* Dual-Row Filter Chips */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterRowLabel}>Browse by Activity</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {fitnessServiceFilters.map(f => renderChip(f, activeServiceFilters.includes(f.id), toggleServiceFilter))}
        </ScrollView>
        <Text style={[styles.filterRowLabel, { marginTop: 10 }]}>Your Preferences</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {fitnessModeFilters.map(f => renderChip(f, activeLifestyleFilters.includes(f.id), toggleLifestyleFilter))}
        </ScrollView>
        {hasActiveFilters && (
          <View style={styles.filterSummary}>
            <Text style={styles.filterSummaryText}>
              Showing: {activeModes.map(m => {
                const f = [...fitnessServiceFilters, ...fitnessModeFilters].find(x => x.id === m);
                return f?.label;
              }).filter(Boolean).join(', ')}
            </Text>
            <Pressable onPress={clearAllFilters} style={styles.clearFilters}>
              <Text style={styles.clearFiltersText}>Clear all</Text>
              <Ionicons name="close-circle" size={14} color={COLORS.orange} />
            </Pressable>
          </View>
        )}
      </View>

      <QuickActionBar categorySlug={slug} actions={fitnessQuickActions as any} />

      <EnhancedAISuggestionsSection categorySlug={slug} categoryName={categoryConfig.name} placeholders={aiPlaceholders} onSearch={handleAISearch} />

      <BrowseCategoryGrid categories={subcategories} title="Explore Fitness" onCategoryPress={handleCategoryPress} />

      {/* Trending Workouts */}
      {filteredTrending.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={20} color={colors.error} />
            <Text style={styles.sectionTitle}>Trending This Week</Text>
            <Pressable onPress={() => router.push('/MainCategory/fitness-sports/search?q=trending' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingList}>
            {filteredTrending.map(w => (
              <Pressable key={w.id} style={styles.trendingCard} onPress={() => router.push(`/MainCategory/fitness-sports/book-class?service=${w.id}` as any)}>
                <LinearGradient colors={[COLORS.orange, COLORS.orangeDark]} style={styles.trendingGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.trendingEmoji}>{w.emoji}</Text>
                  <Text style={styles.trendingName}>{w.name}</Text>
                  <View style={styles.trendingBadge}>
                    <Ionicons name="trending-up" size={10} color={COLORS.orange} />
                    <Text style={styles.trendingBadgeText}>{w.bookings}+ bookings</Text>
                  </View>
                  <Text style={styles.trendingPrice}>From {currencySymbol}{w.priceFrom}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Book & Train Services */}
      {filteredServices.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>💪</Text>
            <Text style={styles.sectionTitle}>Book & Train</Text>
            <Pressable onPress={() => router.push('/MainCategory/fitness-sports/book-class' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesList}>
            {filteredServices.map(s => (
              <Pressable key={s.id} style={styles.serviceCard} onPress={() => router.push(`/MainCategory/fitness-sports/book-class?service=${s.id}` as any)}>
                <View style={styles.serviceIcon}><Text style={styles.serviceEmoji}>{s.emoji}</Text></View>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.serviceCashback}>Up to {s.cashback}% cashback</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <OrderAgainSection categorySlug={slug} />

      {/* Fitness Gear */}
      {filteredProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🛍️</Text>
            <Text style={styles.sectionTitle}>Fitness Gear</Text>
            <Pressable onPress={() => router.push('/MainCategory/fitness-sports/search?q=equipment' as any)}>
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
                    <Ionicons name="barbell-outline" size={28} color={COLORS.orange} />
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

      {/* Top Gyms & Studios */}
      {filteredStores.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.orange} />
            <Text style={styles.sectionTitle}>Top Gyms & Studios</Text>
            <Pressable onPress={() => router.push('/MainCategory/fitness-sports/top-rated' as any)}>
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
                    <View style={[styles.storeImage, styles.storePlaceholder]}><Ionicons name="barbell" size={32} color={COLORS.orange} /></View>
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
          <Ionicons name="search-outline" size={48} color={COLORS.orangeLight} />
          <Text style={styles.filterEmptyTitle}>No fitness venues match your filters</Text>
          <Text style={styles.filterEmptySubtitle}>Try removing some filters to see more results</Text>
          <Pressable onPress={clearAllFilters} style={styles.filterEmptyClearBtn}>
            <Text style={styles.filterEmptyClearText}>Clear all filters</Text>
          </Pressable>
        </View>
      )}

      <OffersSection categorySlug={slug} title="Today's Top Fitness Deals" onSeeAll={() => router.push('/MainCategory/fitness-sports/offers' as any)} filterTags={activeFilterTags} />

      {/* 30-Day Challenge */}
      <View style={styles.section}>
        <Pressable style={styles.challengeBanner} onPress={() => router.push('/MainCategory/fitness-sports/challenges' as any)}>
          <LinearGradient colors={[COLORS.orange, COLORS.orangeDark]} style={styles.challengeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.challengeContent}>
              <Text style={styles.challengeEmoji}>🏆</Text>
              <View style={styles.challengeText}>
                <Text style={styles.challengeTitle}>30-Day Fitness Challenge</Text>
                <Text style={styles.challengeSubtitle}>Complete workouts & earn bonus coins</Text>
              </View>
              <View style={styles.challengeBtn}><Text style={styles.challengeBtnText}>Join</Text></View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      <StreakLoyaltySection categorySlug={slug} primaryColor={COLORS.orange} />

      <EnhancedUGCSocialProofSection
        categorySlug={slug} categoryName={categoryConfig.name} posts={ugcPosts}
        title="Fitness Transformations" subtitle="Real results from our community!"
        onPostPress={() => router.push('/MainCategory/fitness-sports/fitness-stories' as any)}
        onSharePress={() => router.push('/MainCategory/fitness-sports/fitness-stories' as any)}
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
  clearFiltersText: { fontSize: 12, color: COLORS.orange, fontWeight: '600' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  sectionSeeAll: { fontSize: 12, color: COLORS.orange, fontWeight: '500' },
  trendingList: { gap: 12, paddingRight: 16 },
  trendingCard: { width: 140, borderRadius: 16, overflow: 'hidden' },
  trendingGradient: { padding: 14, height: 160, justifyContent: 'space-between' },
  trendingEmoji: { fontSize: 28 },
  trendingName: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginTop: 4 },
  trendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  trendingBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.orange },
  trendingPrice: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  servicesList: { gap: 12, paddingRight: 16 },
  serviceCard: {
    width: 100, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: COLORS.white,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 }, web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } }),
  },
  serviceIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.orangeLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  serviceEmoji: { fontSize: 24 },
  serviceName: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 4 },
  serviceCashback: { fontSize: 11, color: COLORS.orange, textAlign: 'center' },
  productsList: { gap: 12, paddingRight: 16 },
  productCardCompact: {
    width: 140, padding: 8, borderRadius: 12, backgroundColor: COLORS.white,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 }, web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } }),
  },
  productImageCompact: { width: '100%', height: 140, borderRadius: 8, marginBottom: 8 },
  productPlaceholder: { backgroundColor: COLORS.orangeLight, justifyContent: 'center', alignItems: 'center' },
  productNameCompact: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 4 },
  productPriceCompact: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  productCashbackCompact: { fontSize: 11, color: COLORS.orange },
  storesList: { gap: 12, paddingRight: 16 },
  storeCard: {
    width: 170, borderRadius: 16, backgroundColor: COLORS.white, overflow: 'hidden', position: 'relative',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 }, web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } }),
  },
  storeImage: { width: '100%', height: 100 },
  storePlaceholder: { backgroundColor: COLORS.orangeLight, justifyContent: 'center', alignItems: 'center' },
  storeBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12, backgroundColor: COLORS.orange, gap: 3 },
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
  filterEmptyClearBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.orange },
  filterEmptyClearText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  challengeBanner: { borderRadius: 16, overflow: 'hidden' },
  challengeGradient: { padding: 16 },
  challengeContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  challengeEmoji: { fontSize: 32 },
  challengeText: { flex: 1 },
  challengeTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  challengeSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  challengeBtn: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  challengeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.orange },
});

export default React.memo(FitnessCategoryPage);
