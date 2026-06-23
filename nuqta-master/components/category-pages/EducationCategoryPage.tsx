// @ts-nocheck
/**
 * Education & Learning Category Page - PRODUCTION READY v2
 * Features: Dual-row filter chips (service + mode), filter propagation to ALL sections,
 * education-specific quick actions, popular courses, top institutes, enhanced cards,
 * proper empty states
 * Indigo themed to differentiate from other categories
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
import { educationCategoryData, educationServiceFilters, educationModeFilters, educationQuickActions } from '@/data/category/educationCategoryData';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const COLORS = {
  primary: colors.brand.indigo,
  primaryDark: '#4F46E5',
  primaryLight: colors.indigoMist,
  primaryGold: colors.warningScale[400],
  textPrimary: colors.neutral[900],
  textSecondary: colors.neutral[500],
  white: colors.background.primary,
  background: colors.tint.warmGray,
  border: colors.neutral[200],
};

// All education services with tags for filter matching
const ALL_EDUCATION_SERVICES = [
  { id: 'math-tuition', name: 'Math Tuition', emoji: '📐', tags: ['tuition', 'coaching'], cashback: 15 },
  { id: 'science-coaching', name: 'Science Coaching', emoji: '🔬', tags: ['coaching', 'tuition'], cashback: 20 },
  { id: 'coding-class', name: 'Coding Class', emoji: '💻', tags: ['coding'], cashback: 25 },
  { id: 'music-lesson', name: 'Music Lesson', emoji: '🎵', tags: ['music'], cashback: 18 },
  { id: 'dance-class', name: 'Dance Class', emoji: '💃', tags: ['dance'], cashback: 18 },
  { id: 'language-course', name: 'Language Course', emoji: '🌍', tags: ['language'], cashback: 20 },
  { id: 'art-workshop', name: 'Art Workshop', emoji: '🎨', tags: ['art'], cashback: 15 },
  { id: 'exam-prep', name: 'Exam Prep', emoji: '🎯', tags: ['coaching', 'tuition'], cashback: 22 },
  { id: 'spoken-english', name: 'Spoken English', emoji: '🗣️', tags: ['language'], cashback: 18 },
  { id: 'robotics', name: 'Robotics', emoji: '🤖', tags: ['coding'], cashback: 25 },
];

// Popular courses data
const POPULAR_COURSES = [
  { id: 'python', name: 'Python Basics', emoji: '🐍', tag: 'coding', enrollments: 850, priceFrom: 2000 },
  { id: 'guitar', name: 'Guitar Lessons', emoji: '🎸', tag: 'music', enrollments: 620, priceFrom: 1500 },
  { id: 'iit-prep', name: 'IIT Prep', emoji: '🎯', tag: 'coaching', enrollments: 1200, priceFrom: 5000 },
  { id: 'bharatnatyam', name: 'Bharatnatyam', emoji: '💃', tag: 'dance', enrollments: 340, priceFrom: 1200 },
  { id: 'french', name: 'French Language', emoji: '🇫🇷', tag: 'language', enrollments: 480, priceFrom: 1800 },
  { id: 'watercolor', name: 'Watercolor Art', emoji: '🎨', tag: 'art', enrollments: 290, priceFrom: 1000 },
];

// Helper: check if a store matches a given filter
function storeMatchesFilter(store: any, filterId: string): boolean {
  const tags = (store.tags || []).map((t: string) => t.toLowerCase());
  const serviceTypes = (store.serviceTypes || []).map((t: string) => t.toLowerCase());
  const allTags = [...tags, ...serviceTypes];

  switch (filterId) {
    case 'coaching': return allTags.some(t => t.includes('coaching') || t.includes('coach') || t.includes('academy'));
    case 'tuition': return allTags.some(t => t.includes('tuition') || t.includes('tutor') || t.includes('tutorial'));
    case 'music': return allTags.some(t => t.includes('music') || t.includes('piano') || t.includes('guitar') || t.includes('vocal'));
    case 'dance': return allTags.some(t => t.includes('dance') || t.includes('ballet') || t.includes('choreograph'));
    case 'coding': return allTags.some(t => t.includes('coding') || t.includes('programming') || t.includes('computer') || t.includes('tech'));
    case 'language': return allTags.some(t => t.includes('language') || t.includes('english') || t.includes('french') || t.includes('spanish'));
    case 'art': return allTags.some(t => t.includes('art') || t.includes('craft') || t.includes('painting') || t.includes('drawing'));
    case 'online': return allTags.some(t => t.includes('online') || t.includes('virtual') || t.includes('remote'));
    case 'offline': return allTags.some(t => t.includes('offline') || t.includes('in-person') || t.includes('classroom'));
    case 'hybrid': return allTags.some(t => t.includes('hybrid') || t.includes('blended'));
    case 'budget': return (store.priceForTwo || 999) < 500 || store.deliveryCategories?.budgetFriendly;
    case 'certified': return allTags.some(t => t.includes('certified') || t.includes('accredited') || t.includes('diploma'));
    case 'weekend': return allTags.some(t => t.includes('weekend') || t.includes('saturday') || t.includes('sunday'));
    default: return false;
  }
}

function getPriceTier(priceForTwo?: number): { label: string; color: string } {
  if (!priceForTwo) return { label: '', color: '' };
  if (priceForTwo < 500) return { label: '$', color: colors.success };
  if (priceForTwo < 1500) return { label: '$$', color: colors.warningScale[400] };
  return { label: '$$$', color: colors.brand.purpleLight };
}

function EducationCategoryPage() {
  const router = useRouter();
  const slug = 'education-learning';
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
    [...educationServiceFilters, ...educationModeFilters].forEach(f => {
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
          if (f === 'certified') return allTags.some(t => t.includes('certified'));
          return true;
        });
      return passesService && passesLifestyle;
    });
  }, [products, activeServiceFilters, activeLifestyleFilters, hasActiveFilters]);

  const filteredServices = useMemo(() => {
    if (activeServiceFilters.length === 0) return ALL_EDUCATION_SERVICES;
    return ALL_EDUCATION_SERVICES.filter(s => s.tags.some(t => activeServiceFilters.includes(t)));
  }, [activeServiceFilters]);

  const filteredCourses = useMemo(() => {
    if (activeServiceFilters.length === 0) return POPULAR_COURSES;
    return POPULAR_COURSES.filter(t => activeServiceFilters.includes(t.tag));
  }, [activeServiceFilters]);

  const activeFilterTags = useMemo(() => {
    if (!hasActiveFilters) return undefined;
    return activeModes;
  }, [activeModes, hasActiveFilters]);

  const handleCategoryPress = useCallback((category: any) => {
    router.push(`/MainCategory/education-learning/${category.slug || category.id}` as any);
  }, [router]);

  const handleAISearch = useCallback((query: string) => {
    router.push(`/MainCategory/education-learning/search?q=${encodeURIComponent(query)}` as any);
  }, [router]);

  if (!categoryConfig) return null;

  if (isLoading && !refreshing && stores.length === 0) {
    return <LoadingState message="Loading education..." />;
  }

  if (error && stores.length === 0) {
    return (
      <EmptyState
        icon="📚"
        title="Unable to load education"
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      <CategoryHeader
        categoryName={categoryConfig.name}
        primaryColor={categoryConfig.primaryColor}
        banner={categoryConfig.banner}
        gradientColors={categoryConfig.gradientColors}
      />

      {/* Rewards Strip */}
      <Pressable style={styles.rewardsStrip} onPress={() => router.push('/MainCategory/education-learning/loyalty' as any)}>
        <LinearGradient colors={['rgba(99,102,241,0.15)', 'rgba(79,70,229,0.1)']} style={styles.rewardsGradient}>
          <View style={styles.rewardsContent}>
            <Ionicons name="star" size={20} color={COLORS.primary} />
            <Text style={styles.rewardsText}>{`Earn up to 30% Cashback + ${BRAND.COIN_NAME} on every course enrollment`}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.rewardsSubtext}>Works at coaching centers, tutors & online platforms</Text>
        </LinearGradient>
      </Pressable>

      {/* Dual-Row Filter Chips */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterRowLabel}>Browse by Subject</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {educationServiceFilters.map(f => renderChip(f, activeServiceFilters.includes(f.id), toggleServiceFilter))}
        </ScrollView>
        <Text style={[styles.filterRowLabel, { marginTop: 10 }]}>Your Preferences</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {educationModeFilters.map(f => renderChip(f, activeLifestyleFilters.includes(f.id), toggleLifestyleFilter))}
        </ScrollView>
        {hasActiveFilters && (
          <View style={styles.filterSummary}>
            <Text style={styles.filterSummaryText}>
              Showing: {activeModes.map(m => {
                const f = [...educationServiceFilters, ...educationModeFilters].find(x => x.id === m);
                return f?.label;
              }).filter(Boolean).join(', ')}
            </Text>
            <Pressable onPress={clearAllFilters} style={styles.clearFilters}>
              <Text style={styles.clearFiltersText}>Clear all</Text>
              <Ionicons name="close-circle" size={14} color={COLORS.primary} />
            </Pressable>
          </View>
        )}
      </View>

      <QuickActionBar categorySlug={slug} actions={educationQuickActions as any} />

      <EnhancedAISuggestionsSection categorySlug={slug} categoryName={categoryConfig.name} placeholders={aiPlaceholders} onSearch={handleAISearch} />

      <BrowseCategoryGrid categories={subcategories} title="Explore Courses" onCategoryPress={handleCategoryPress} />

      {/* Popular Courses */}
      {filteredCourses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="flame" size={20} color={colors.error} />
            <Text style={styles.sectionTitle}>Popular Courses</Text>
            <Pressable onPress={() => router.push('/MainCategory/education-learning/search?q=popular' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingList}>
            {filteredCourses.map(w => (
              <Pressable key={w.id} style={styles.trendingCard} onPress={() => router.push(`/MainCategory/education-learning/enroll-class?service=${w.id}` as any)}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.trendingGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.trendingEmoji}>{w.emoji}</Text>
                  <Text style={styles.trendingName}>{w.name}</Text>
                  <View style={styles.trendingBadge}>
                    <Ionicons name="trending-up" size={10} color={COLORS.primary} />
                    <Text style={styles.trendingBadgeText}>{w.enrollments}+ enrolled</Text>
                  </View>
                  <Text style={styles.trendingPrice}>From {currencySymbol}{w.priceFrom}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Book & Learn Services */}
      {filteredServices.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>📝</Text>
            <Text style={styles.sectionTitle}>Book & Learn</Text>
            <Pressable onPress={() => router.push('/MainCategory/education-learning/enroll-class' as any)}>
              <Text style={styles.sectionSeeAll}>View All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicesList}>
            {filteredServices.map(s => (
              <Pressable key={s.id} style={styles.serviceCard} onPress={() => router.push(`/MainCategory/education-learning/enroll-class?service=${s.id}` as any)}>
                <View style={styles.serviceIcon}><Text style={styles.serviceEmoji}>{s.emoji}</Text></View>
                <Text style={styles.serviceName}>{s.name}</Text>
                <Text style={styles.serviceCashback}>Up to {s.cashback}% cashback</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <OrderAgainSection categorySlug={slug} />

      {/* Learning Materials */}
      {filteredProducts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>📖</Text>
            <Text style={styles.sectionTitle}>Learning Materials</Text>
            <Pressable onPress={() => router.push('/MainCategory/education-learning/search?q=materials' as any)}>
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
                    <Ionicons name="book-outline" size={28} color={COLORS.primary} />
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

      {/* Top Institutes */}
      {filteredStores.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Top Institutes & Tutors</Text>
            <Pressable onPress={() => router.push('/MainCategory/education-learning/top-rated' as any)}>
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
                    <View style={[styles.storeImage, styles.storePlaceholder]}><Ionicons name="school" size={32} color={COLORS.primary} /></View>
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
          <Ionicons name="search-outline" size={48} color={COLORS.primaryLight} />
          <Text style={styles.filterEmptyTitle}>No institutes match your filters</Text>
          <Text style={styles.filterEmptySubtitle}>Try removing some filters to see more results</Text>
          <Pressable onPress={clearAllFilters} style={styles.filterEmptyClearBtn}>
            <Text style={styles.filterEmptyClearText}>Clear all filters</Text>
          </Pressable>
        </View>
      )}

      <OffersSection categorySlug={slug} title="Today's Top Education Deals" onSeeAll={() => router.push('/MainCategory/education-learning/offers' as any)} filterTags={activeFilterTags} />

      {/* Learning Challenge */}
      <View style={styles.section}>
        <Pressable style={styles.challengeBanner} onPress={() => router.push('/MainCategory/education-learning/search?q=challenge' as any)}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.challengeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.challengeContent}>
              <Text style={styles.challengeEmoji}>🏆</Text>
              <View style={styles.challengeText}>
                <Text style={styles.challengeTitle}>30-Day Learning Challenge</Text>
                <Text style={styles.challengeSubtitle}>Complete lessons & earn bonus coins</Text>
              </View>
              <View style={styles.challengeBtn}><Text style={styles.challengeBtnText}>Join</Text></View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>

      <StreakLoyaltySection categorySlug={slug} primaryColor={COLORS.primary} />

      <EnhancedUGCSocialProofSection
        categorySlug={slug} categoryName={categoryConfig.name} posts={ugcPosts}
        title="Learning Journeys" subtitle="Real progress from our community!"
        onPostPress={() => router.push('/MainCategory/education-learning/learning-stories' as any)}
        onSharePress={() => router.push('/MainCategory/education-learning/learning-stories' as any)}
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
  clearFiltersText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  sectionSeeAll: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  trendingList: { gap: 12, paddingRight: 16 },
  trendingCard: { width: 140, borderRadius: 16, overflow: 'hidden' },
  trendingGradient: { padding: 14, height: 160, justifyContent: 'space-between' },
  trendingEmoji: { fontSize: 28 },
  trendingName: { fontSize: 14, fontWeight: '700', color: COLORS.white, marginTop: 4 },
  trendingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  trendingBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  trendingPrice: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  servicesList: { gap: 12, paddingRight: 16 },
  serviceCard: {
    width: 100, alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: COLORS.white,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 }, web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } }),
  },
  serviceIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  serviceEmoji: { fontSize: 24 },
  serviceName: { fontSize: 13, fontWeight: '500', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 4 },
  serviceCashback: { fontSize: 11, color: COLORS.primary, textAlign: 'center' },
  productsList: { gap: 12, paddingRight: 16 },
  productCardCompact: {
    width: 140, padding: 8, borderRadius: 12, backgroundColor: COLORS.white,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 }, web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } }),
  },
  productImageCompact: { width: '100%', height: 140, borderRadius: 8, marginBottom: 8 },
  productPlaceholder: { backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  productNameCompact: { fontSize: 12, fontWeight: '500', color: COLORS.textPrimary, marginBottom: 4 },
  productPriceCompact: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  productCashbackCompact: { fontSize: 11, color: COLORS.primary },
  storesList: { gap: 12, paddingRight: 16 },
  storeCard: {
    width: 170, borderRadius: 16, backgroundColor: COLORS.white, overflow: 'hidden', position: 'relative',
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 }, android: { elevation: 1 }, web: { boxShadow: '0 1px 3px rgba(0,0,0,0.05)' } }),
  },
  storeImage: { width: '100%', height: 100 },
  storePlaceholder: { backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
  storeBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12, backgroundColor: COLORS.primary, gap: 3 },
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
  filterEmptyClearBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: COLORS.primary },
  filterEmptyClearText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  challengeBanner: { borderRadius: 16, overflow: 'hidden' },
  challengeGradient: { padding: 16 },
  challengeContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  challengeEmoji: { fontSize: 32 },
  challengeText: { flex: 1 },
  challengeTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  challengeSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  challengeBtn: { backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  challengeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
});

export default React.memo(EducationCategoryPage);
