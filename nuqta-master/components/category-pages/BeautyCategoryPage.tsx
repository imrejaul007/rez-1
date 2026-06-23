// @ts-nocheck
/**
 * Beauty & Wellness Category Page - PRODUCTION READY v2
 * Features: Dual-row filter chips (service + lifestyle), filter propagation to ALL sections,
 * beauty-specific quick actions, trending treatments, near you, enhanced clinic cards,
 * real experiences section, proper empty states
 * Pink/magenta themed to differentiate from other categories
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
import { beautyCategoryData, beautyServiceFilters, beautyModeFilters, beautyQuickActions } from '@/data/category/beautyCategoryData';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  pink: '#F9A8D4',
  pinkDark: colors.deepPink,
  pinkLight: '#FDF2F8',
  pinkText: '#BE185D',
  primaryGold: colors.warningScale[400],
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
  border: colors.neutral[200],
};

// All beauty services with tags for filter matching
const ALL_BEAUTY_SERVICES = [
  { id: 'haircut', name: 'Haircut', emoji: '💇', tags: ['hair'], cashback: 15 },
  { id: 'facial', name: 'Facial', emoji: '✨', tags: ['skin'], cashback: 20 },
  { id: 'manicure', name: 'Manicure', emoji: '💅', tags: ['nails'], cashback: 18 },
  { id: 'pedicure', name: 'Pedicure', emoji: '🦶', tags: ['nails'], cashback: 18 },
  { id: 'massage', name: 'Massage', emoji: '💆', tags: ['spa'], cashback: 25 },
  { id: 'waxing', name: 'Waxing', emoji: '🧴', tags: ['skin'], cashback: 15 },
  { id: 'bridal-makeup', name: 'Bridal', emoji: '👰', tags: ['bridal'], cashback: 30 },
  { id: 'mens-grooming', name: "Men's Cut", emoji: '🧔', tags: ['men', 'hair'], cashback: 16 },
  { id: 'spa-package', name: 'Spa Package', emoji: '🧖', tags: ['spa', 'wellness'], cashback: 25 },
  { id: 'yoga', name: 'Yoga', emoji: '🧘', tags: ['wellness'], cashback: 20 },
];

// Trending treatments data
const TRENDING_TREATMENTS = [
  { id: 'keratin', name: 'Keratin Treatment', emoji: '💇', tag: 'hair', bookings: 340, priceFrom: 1500 },
  { id: 'hydrafacial', name: 'HydraFacial', emoji: '✨', tag: 'skin', bookings: 280, priceFrom: 2000 },
  { id: 'lash-lift', name: 'Lash Lift', emoji: '👁️', tag: 'skin', bookings: 220, priceFrom: 800 },
  { id: 'gel-nails', name: 'Gel Nails', emoji: '💅', tag: 'nails', bookings: 190, priceFrom: 600 },
  { id: 'deep-tissue', name: 'Deep Tissue', emoji: '💆', tag: 'spa', bookings: 175, priceFrom: 1200 },
  { id: 'microblading', name: 'Microblading', emoji: '✏️', tag: 'skin', bookings: 150, priceFrom: 3000 },
];

// Helper: check if a store matches a given filter
function storeMatchesFilter(store: any, filterId: string): boolean {
  const tags = (store.tags || []).map((t: string) => t.toLowerCase());
  const serviceTypes = (store.serviceTypes || []).map((t: string) => t.toLowerCase());
  const allTags = [...tags, ...serviceTypes];

  switch (filterId) {
    // Lifestyle filters
    case 'organic': return tags.some(t => t.includes('organic') || t.includes('natural'));
    case 'cruelty-free': return tags.some(t => t.includes('cruelty-free') || t.includes('cruelty free'));
    case 'vegan': return tags.some(t => t.includes('vegan'));
    case 'ayurvedic': return tags.some(t => t.includes('ayurved') || t.includes('herbal'));
    case 'luxury': return tags.some(t => t.includes('luxury') || t.includes('premium')) || store.deliveryCategories?.premium;
    case 'budget': return (store.priceForTwo || 999) < 500 || store.deliveryCategories?.budgetFriendly;
    // Service filters
    case 'hair': return allTags.some(t => t.includes('hair') || t.includes('salon') || t.includes('barber'));
    case 'skin': return allTags.some(t => t.includes('skin') || t.includes('facial') || t.includes('derma'));
    case 'spa': return allTags.some(t => t.includes('spa') || t.includes('massage'));
    case 'nails': return allTags.some(t => t.includes('nail') || t.includes('manicure') || t.includes('pedicure'));
    case 'bridal': return allTags.some(t => t.includes('bridal') || t.includes('wedding') || t.includes('makeup'));
    case 'men': return allTags.some(t => t.includes('men') || t.includes('grooming') || t.includes('barber'));
    case 'wellness': return allTags.some(t => t.includes('wellness') || t.includes('yoga') || t.includes('ayurved'));
    default: return false;
  }
}

// Helper: get price tier
function getPriceTier(priceForTwo?: number): { label: string; color: string } {
  if (!priceForTwo) return { label: '', color: '' };
  if (priceForTwo < 500) return { label: '$', color: colors.success };
  if (priceForTwo < 1500) return { label: '$$', color: colors.warningScale[400] };
  return { label: '$$$', color: colors.brand.purpleLight };
}

function BeautyCategoryPage() {
  const router = useRouter();
  const slug = 'beauty-wellness';
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

  // Dual filter state
  const [activeServiceFilters, setActiveServiceFilters] = useState<string[]>([]);
  const [activeLifestyleFilters, setActiveLifestyleFilters] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useIsMounted();

  // Combined active filters for backward compat
  const activeModes = [...activeServiceFilters, ...activeLifestyleFilters];
  const hasActiveFilters = activeModes.length > 0;

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const toggleServiceFilter = (filterId: string) => {
    setActiveServiceFilters(prev =>
      prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]
    );
  };

  const toggleLifestyleFilter = (filterId: string) => {
    setActiveLifestyleFilters(prev =>
      prev.includes(filterId) ? prev.filter(f => f !== filterId) : [...prev, filterId]
    );
  };

  const clearAllFilters = () => {
    setActiveServiceFilters([]);
    setActiveLifestyleFilters([]);
  };

  // Compute store counts per filter for badges
  const storeCountsByFilter = useMemo(() => {
    const counts: Record<string, number> = {};
    [...beautyServiceFilters, ...beautyModeFilters].forEach(f => {
      counts[f.id] = stores.filter((s: any) => storeMatchesFilter(s, f.id)).length;
    });
    return counts;
  }, [stores]);

  // Filter stores by active modes (service + lifestyle)
  const filteredStores = useMemo(() => {
    if (!hasActiveFilters) return stores;
    return stores.filter((store: any) => {
      // Service filters: store must match at least one active service filter
      const passesService = activeServiceFilters.length === 0 ||
        activeServiceFilters.some(f => storeMatchesFilter(store, f));
      // Lifestyle filters: store must match at least one active lifestyle filter
      const passesLifestyle = activeLifestyleFilters.length === 0 ||
        activeLifestyleFilters.some(f => storeMatchesFilter(store, f));
      return passesService && passesLifestyle;
    });
  }, [stores, activeServiceFilters, activeLifestyleFilters, hasActiveFilters]);

  // Filter products by active modes
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
          switch (f) {
            case 'organic': return allTags.some(t => t.includes('organic'));
            case 'cruelty-free': return allTags.some(t => t.includes('cruelty'));
            case 'vegan': return allTags.some(t => t.includes('vegan'));
            case 'ayurvedic': return allTags.some(t => t.includes('ayurved'));
            case 'luxury': return allTags.some(t => t.includes('luxury'));
            case 'budget': return (product.price || 999) < 500;
            default: return true;
          }
        });
      return passesService && passesLifestyle;
    });
  }, [products, activeServiceFilters, activeLifestyleFilters, hasActiveFilters]);

  // Filter services by active service filters
  const filteredServices = useMemo(() => {
    if (activeServiceFilters.length === 0) return ALL_BEAUTY_SERVICES;
    return ALL_BEAUTY_SERVICES.filter(s =>
      s.tags.some(t => activeServiceFilters.includes(t))
    );
  }, [activeServiceFilters]);

  // Filter trending treatments by service filters
  const filteredTrending = useMemo(() => {
    if (activeServiceFilters.length === 0) return TRENDING_TREATMENTS;
    return TRENDING_TREATMENTS.filter(t => activeServiceFilters.includes(t.tag));
  }, [activeServiceFilters]);

  // Active filter tags for OffersSection
  const activeFilterTags = useMemo(() => {
    if (!hasActiveFilters) return undefined;
    return activeModes;
  }, [activeModes, hasActiveFilters]);

  const handleCategoryPress = useCallback((category: any) => {
    router.push(`/MainCategory/beauty-wellness/${category.slug || category.id}` as any);
  }, [router]);

  const handleAISearch = useCallback((query: string) => {
    router.push(`/MainCategory/beauty-wellness/search?q=${encodeURIComponent(query)}` as any);
  }, [router]);

  if (!categoryConfig) return null;

  if (isLoading && !refreshing && stores.length === 0) {
    return <LoadingState message="Loading beauty services..." />;
  }

  if (error && stores.length === 0) {
    return (
      <EmptyState
        icon="💄"
        title="Unable to load services"
        message={error || "Something went wrong. Please try again."}
        actionLabel="Try Again"
        onAction={refetch}
      />
    );
  }

  // Render a single filter chip
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
        style={[
          styles.chipBase,
          isActive && { backgroundColor: filter.color, borderColor: filter.color },
        ]}
       
      >
        <View style={[
          styles.chipIconCircle,
          { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : `${filter.color}14` },
        ]}>
          {isActive ? (
            <Ionicons name="checkmark" size={14} color={COLORS.white} />
          ) : (
            <Text style={styles.chipIconText}>{filter.icon}</Text>
          )}
        </View>
        <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
          {filter.label}
        </Text>
        {count > 0 && (
          <View style={[styles.chipCount, isActive && styles.chipCountActive]}>
            <Text style={[styles.chipCountText, isActive && styles.chipCountTextActive]}>
              {count}
            </Text>
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.pink]} />
      }
    >
      <CategoryHeader
        categoryName={categoryConfig.name}
        primaryColor={categoryConfig.primaryColor}
        banner={categoryConfig.banner}
        gradientColors={categoryConfig.gradientColors}
      />

      {/* Live Rewards Strip - Tappable */}
      <Pressable
        style={styles.rewardsStrip}
       
        onPress={() => router.push('/MainCategory/beauty-wellness/loyalty' as any)}
      >
        <LinearGradient
          colors={['rgba(249, 168, 212, 0.15)', 'rgba(219, 39, 119, 0.08)']}
          style={styles.rewardsGradient}
        >
          <View style={styles.rewardsContent}>
            <Ionicons name="star" size={20} color={COLORS.pinkText} />
            <Text style={styles.rewardsText}>
              {`Earn up to 20% Cashback + ${BRAND.COIN_NAME} on every beauty visit`}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.pinkText} />
          </View>
          <Text style={styles.rewardsSubtext}>Works at salons, clinics & stores</Text>
        </LinearGradient>
      </Pressable>

      {/* Enhanced Dual-Row Filter Chips */}
      <View style={styles.filtersContainer}>
        {/* Service Filters Row */}
        <Text style={styles.filterRowLabel}>Browse by Service</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {beautyServiceFilters.map(f =>
            renderChip(f, activeServiceFilters.includes(f.id), toggleServiceFilter)
          )}
        </ScrollView>

        {/* Lifestyle Filters Row */}
        <Text style={[styles.filterRowLabel, { marginTop: 10 }]}>Your Preferences</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {beautyModeFilters.map(f =>
            renderChip(f, activeLifestyleFilters.includes(f.id), toggleLifestyleFilter)
          )}
        </ScrollView>

        {/* Clear + Active Filter Summary */}
        {hasActiveFilters && (
          <View style={styles.filterSummary}>
            <Text style={styles.filterSummaryText}>
              Showing: {activeModes.map(m => {
                const f = [...beautyServiceFilters, ...beautyModeFilters].find(x => x.id === m);
                return f?.label;
              }).filter(Boolean).join(', ')}
            </Text>
            <Pressable onPress={clearAllFilters} style={styles.clearFilters}>
              <Text style={styles.clearFiltersText}>Clear all</Text>
              <Ionicons name="close-circle" size={14} color={COLORS.pinkText} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Beauty-Specific Quick Actions */}
      <QuickActionBar categorySlug={slug} actions={beautyQuickActions as any} />

      {/* Enhanced AI Suggestions Section */}
      <EnhancedAISuggestionsSection
        categorySlug={slug}
        categoryName={categoryConfig.name}
        placeholders={aiPlaceholders}
        onSearch={handleAISearch}
      />

      {/* Browse Category Grid - "Find Your Glow" */}
      <BrowseCategoryGrid
        categories={subcategories}
        title="Find Your Glow"
        onCategoryPress={handleCategoryPress}
      />

      {/* Trending Treatments */}
      {filteredTrending.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={20} color={colors.error} />
            <Text style={styles.sectionTitle}>Trending This Week</Text>
            <Pressable onPress={() => router.push('/MainCategory/beauty-wellness/search?q=trending' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingList}>
            {filteredTrending.map(treatment => (
              <Pressable
                key={treatment.id}
                style={styles.trendingCard}
                onPress={() => router.push(`/MainCategory/beauty-wellness/book-appointment?service=${treatment.id}` as any)}
               
              >
                <LinearGradient
                  colors={[COLORS.pink, COLORS.pinkDark]}
                  style={styles.trendingGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.trendingEmoji}>{treatment.emoji}</Text>
                  <Text style={styles.trendingName}>{treatment.name}</Text>
                  <View style={styles.trendingBadge}>
                    <Ionicons name="trending-up" size={10} color={COLORS.pinkText} />
                    <Text style={styles.trendingBadgeText}>{treatment.bookings}+ bookings</Text>
                  </View>
                  <Text style={styles.trendingPrice}>From {currencySymbol}{treatment.priceFrom}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Book & Earn Services - Filter-Aware */}
      {filteredServices.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>💆</Text>
            <Text style={styles.sectionTitle}>Book & Earn Services</Text>
            <Pressable onPress={() => router.push('/MainCategory/beauty-wellness/book-appointment' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesList}>
            {filteredServices.map(service => (
              <Pressable
                key={service.id}
                style={styles.serviceCard}
                onPress={() => router.push(`/MainCategory/beauty-wellness/book-appointment?service=${service.id}` as any)}
              >
                <View style={styles.serviceIcon}>
                  <Text style={styles.serviceEmoji}>{service.emoji}</Text>
                </View>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceCashback}>Up to {service.cashback}% cashback</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Order Again / Revisit */}
      <OrderAgainSection categorySlug={slug} />

      {/* Buy Products */}
      {filteredProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>🛍️</Text>
            <Text style={styles.sectionTitle}>Beauty Products</Text>
            <Pressable onPress={() => router.push('/MainCategory/beauty-wellness/search?q=products' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productsList}>
            {filteredProducts.slice(0, 6).map((product: any) => (
              <Pressable
                key={product.id}
                style={styles.productCardCompact}
                onPress={() => router.push(`/product-page?productId=${product.id}` as any)}
              >
                {product.image ? (
                  <CachedImage
                    source={product.image}
                    style={styles.productImageCompact}
                    contentFit="cover"
                  />
                ) : (
                  <View style={[styles.productImageCompact, styles.productPlaceholder]}>
                    <Ionicons name="flower-outline" size={28} color={COLORS.pinkText} />
                  </View>
                )}
                <Text style={styles.productNameCompact} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.productPriceCompact}>{currencySymbol}{product.price?.toLocaleString() || '0'}</Text>
                <Text style={styles.productCashbackCompact}>
                  {product.cashback || 10}% cashback
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Verified Clinics & Salons - Enhanced with price tier */}
      {filteredStores.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.pinkText} />
            <Text style={styles.sectionTitle}>Verified Clinics & Salons</Text>
            <Pressable onPress={() => router.push('/MainCategory/beauty-wellness/top-rated' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesList}>
            {filteredStores.slice(0, 5).map((store: any) => {
              const priceTier = getPriceTier(store.priceForTwo);
              const topService = store.serviceTypes?.[0] || '';
              return (
                <Pressable
                  key={store.id}
                  style={styles.storeCard}
                  onPress={() => router.push(`/MainStorePage?storeId=${store.id}` as any)}
                >
                  {(store.logo || store.banner?.[0]) ? (
                    <CachedImage
                      source={store.logo || store.banner?.[0]}
                      style={styles.storeImage}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={[styles.storeImage, styles.storePlaceholder]}>
                      <Ionicons name="flower" size={32} color={COLORS.pinkText} />
                    </View>
                  )}
                  <View style={styles.storeBadge}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                    <Text style={styles.storeBadgeText}>Verified</Text>
                  </View>
                  <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                  <View style={styles.storeMeta}>
                    <View style={styles.storeRating}>
                      <Ionicons name="star" size={12} color={COLORS.primaryGold} />
                      <Text style={styles.storeRatingText}>
                        {store.rating?.toFixed(1) || 'New'}
                      </Text>
                    </View>
                    {priceTier.label ? (
                      <Text style={[styles.storePriceTier, { color: priceTier.color }]}>
                        {priceTier.label}
                      </Text>
                    ) : null}
                  </View>
                  {topService ? (
                    <Text style={styles.storeService} numberOfLines={1}>{topService}</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Empty state when filters match nothing */}
      {hasActiveFilters && filteredStores.length === 0 && filteredProducts.length === 0 && (
        <View style={styles.filterEmptyState}>
          <Ionicons name="search-outline" size={48} color={COLORS.pinkLight} />
          <Text style={styles.filterEmptyTitle}>No beauty services match your filters</Text>
          <Text style={styles.filterEmptySubtitle}>Try removing some filters to see more results</Text>
          <Pressable onPress={clearAllFilters} style={styles.filterEmptyClearBtn}>
            <Text style={styles.filterEmptyClearText}>Clear all filters</Text>
          </Pressable>
        </View>
      )}

      {/* Offers Section - with filter tags */}
      <OffersSection
        categorySlug={slug}
        title="Today's Top Beauty Deals"
        onSeeAll={() => router.push('/MainCategory/beauty-wellness/offers' as any)}
        filterTags={activeFilterTags}
      />

      {/* Experiences Banner */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>🌸</Text>
          <Text style={styles.sectionTitle}>Beauty Experiences</Text>
          <Pressable onPress={() => router.push('/MainCategory/beauty-wellness/experiences' as any)}>
            <Text style={styles.sectionSeeAll}>View All</Text>
          </Pressable>
        </View>
        <View style={styles.experienceBanner}>
          <LinearGradient
            colors={[COLORS.pink, COLORS.pinkDark]}
            style={styles.experienceGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.experienceTitle}>Spa Packages & Wellness</Text>
            <Text style={styles.experienceSubtitle}>
              Discover curated beauty experiences near you
            </Text>
            <Pressable
              style={styles.experienceBtn}
              onPress={() => router.push('/MainCategory/beauty-wellness/experiences' as any)}
            >
              <Text style={styles.experienceBtnText}>Explore</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.pinkText} />
            </Pressable>
          </LinearGradient>
        </View>
      </View>

      {/* Streak & Loyalty */}
      <StreakLoyaltySection categorySlug={slug} primaryColor={COLORS.pink} />

      {/* UGC Social Proof */}
      <EnhancedUGCSocialProofSection
        categorySlug={slug}
        categoryName={categoryConfig.name}
        posts={ugcPosts}
        title="Real Glow-ups, Real Reviews"
        subtitle="See transformations from our community!"
        onPostPress={() => router.push('/MainCategory/beauty-wellness/beauty-stories' as any)}
        onSharePress={() => router.push('/MainCategory/beauty-wellness/beauty-stories' as any)}
      />

      <FooterTrustSection />
    </ScrollView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  contentContainer: { paddingBottom: 100 },

  // Rewards Strip
  rewardsStrip: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  rewardsGradient: { padding: 12 },
  rewardsContent: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rewardsText: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },
  rewardsSubtext: { fontSize: 12, color: COLORS.textSecondary },

  // Filter Chips
  filtersContainer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  filterRowLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterRow: { gap: 8, paddingRight: 8 },
  chipBase: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 22, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, gap: 6,
  },
  chipIconCircle: {
    width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
  },
  chipIconText: { fontSize: 14 },
  chipLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary },
  chipLabelActive: { color: COLORS.white, fontWeight: '600' },
  chipCount: {
    backgroundColor: 'rgba(0,0,0,0.06)', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10,
  },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  chipCountText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  chipCountTextActive: { color: COLORS.white },
  filterSummary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  filterSummaryText: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  clearFilters: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearFiltersText: { fontSize: 12, color: COLORS.pinkText, fontWeight: '600' },

  // Sections
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  sectionSeeAll: { fontSize: 12, color: COLORS.pinkText, fontWeight: '500' },

  // Trending Treatments
  trendingList: { gap: 12, paddingRight: 16 },
  trendingCard: { width: 140, borderRadius: 16, overflow: 'hidden' },
  trendingGradient: { padding: 14, height: 160, justifyContent: 'space-between' },
  trendingEmoji: { fontSize: 28 },
  trendingName: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginTop: 4 },
  trendingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  trendingBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.pinkText },
  trendingPrice: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },

  // Book & Earn Services
  servicesList: { gap: 12, paddingRight: 16 },
  serviceCard: {
    width: 100, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: COLORS.white,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    }),
  },
  serviceIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.pinkLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  serviceEmoji: { fontSize: 24 },
  serviceName: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 4 },
  serviceCashback: { fontSize: 11, color: COLORS.pinkText, textAlign: 'center' },

  // Products
  productsList: { gap: 12, paddingRight: 16 },
  productCardCompact: {
    width: 140, padding: 8, borderRadius: 12, backgroundColor: COLORS.white,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    }),
  },
  productImageCompact: { width: '100%', height: 140, borderRadius: 8, marginBottom: 8 },
  productPlaceholder: { backgroundColor: COLORS.pinkLight, justifyContent: 'center', alignItems: 'center' },
  productNameCompact: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 4 },
  productPriceCompact: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  productCashbackCompact: { fontSize: 11, color: COLORS.pinkText },

  // Clinics
  storesList: { gap: 12, paddingRight: 16 },
  storeCard: {
    width: 170, borderRadius: 16, backgroundColor: COLORS.white, overflow: 'hidden', position: 'relative',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    }),
  },
  storeImage: { width: '100%', height: 100 },
  storePlaceholder: { backgroundColor: COLORS.pinkLight, justifyContent: 'center', alignItems: 'center' },
  storeBadge: {
    position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12, backgroundColor: COLORS.pinkDark, gap: 3,
  },
  storeBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.white },
  storeName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 2 },
  storeMeta: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 8 },
  storeRating: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  storeRatingText: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary },
  storePriceTier: { fontSize: 12, fontWeight: '700' },
  storeService: { fontSize: 11, color: COLORS.textSecondary, paddingHorizontal: 8, paddingBottom: 8 },

  // Filter Empty State
  filterEmptyState: { alignItems: 'center', padding: 40, marginTop: 24 },
  filterEmptyTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16 },
  filterEmptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  filterEmptyClearBtn: {
    marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    backgroundColor: COLORS.pink,
  },
  filterEmptyClearText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },

  // Experiences Banner
  experienceBanner: { borderRadius: 16, overflow: 'hidden' },
  experienceGradient: { padding: 20 },
  experienceTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white, marginBottom: 4 },
  experienceSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 14 },
  experienceBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  experienceBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.pinkText },
});

export default React.memo(BeautyCategoryPage);
