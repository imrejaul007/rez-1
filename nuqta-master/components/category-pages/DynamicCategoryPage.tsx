// @ts-nocheck
/**
 * DynamicCategoryPage - Backend-Driven Category Page
 *
 * Replaces 12 hardcoded category page components with a single
 * backend-driven component. Fetches page configuration (theme, tabs,
 * sections, service types) from GET /categories/:slug/page-config
 * and renders the same quality UI as the original FoodDiningCategoryPage.
 *
 * Reuses all existing section components for consistency.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Modal} from 'react-native';
import Animated, { runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';
import CachedImage from '@/components/ui/CachedImage';
import logger from '@/utils/logger';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Section components
import CategoryHeader from '@/components/CategoryHeader';
import QuickActionBar from '@/components/category/QuickActionBar';
import BrowseCategoryGrid from '@/components/category/BrowseCategoryGrid';
import EnhancedAISuggestionsSection from '@/components/category/EnhancedAISuggestionsSection';
import StreakLoyaltySection from '@/components/category/StreakLoyaltySection';
import FooterTrustSection from '@/components/category/FooterTrustSection';
import OffersSection from '@/components/category/OffersSection';
import ExperiencesSection from '@/components/category/ExperiencesSection';
import OrderAgainSection from '@/components/category/OrderAgainSection';
import EnhancedUGCSocialProofSection from '@/components/category/EnhancedUGCSocialProofSection';
import SkeletonLoader from '@/components/skeletons/SkeletonLoader';
import EmptyState from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Hooks
import { useCategoryPageConfig } from '@/hooks/useCategoryPageConfig';
import { useCategoryPageData } from '@/hooks/useCategoryPageData';
import { useSavingsInsights, useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

// API services
import { categoriesApi } from '@/services/categoriesApi';
import { storesApi } from '@/services/storesApi';
import ordersApi, { Order } from '@/services/ordersApi';

// Types
import type {
  PageConfigSection,
  PageConfigServiceType,
} from '@/services/categoriesApi';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Per-section error boundary: isolates crashes so one section doesn't blank the whole page
class SectionErrorBoundary extends React.Component<
  { name: string; children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error) {
    logger.warn(`[DynamicCategoryPage] Section "${this.props.name}" crashed:`, error?.message);
  }
  render() {
    if (this.state.hasError) return null; // Hide crashed section silently
    return this.props.children;
  }
}

// ============================================
// Props
// ============================================
interface DynamicCategoryPageProps {
  slug: string;
}

// Module-level flag: remember which slugs have loaded content (survives component remounts)
const _pageContentLoaded: Record<string, boolean> = {};

// ============================================
// Default sort options (fallback when pageConfig.sortOptions not set)
// ============================================
const DEFAULT_SORT_OPTIONS = [
  { id: 'popularity', label: 'Popularity', icon: 'trending-up-outline', enabled: true, sortOrder: 0 },
  { id: 'rating', label: 'Rating', icon: 'star-outline', enabled: true, sortOrder: 1 },
  { id: 'delivery_time', label: 'Delivery Time', icon: 'time-outline', enabled: true, sortOrder: 2 },
  { id: 'newest', label: 'Newest', icon: 'sparkles-outline', enabled: true, sortOrder: 3 },
];

// ============================================
// Skeleton sub-components
// ============================================
const SectionHeaderSkeleton = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 16 }}>
    <SkeletonLoader width={20} height={20} variant="circle" />
    <SkeletonLoader width={150} height={18} borderRadius={6} />
    <View style={{ flex: 1 }} />
    <SkeletonLoader width={60} height={12} borderRadius={4} />
  </View>
);

const StoreCardSkeleton = ({ count = 3, variant = 'default' }: { count?: number; variant?: 'default' | 'compact' }) => {
  const isCompact = variant === 'compact';
  return (
    <View style={{ paddingHorizontal: 16, gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ backgroundColor: colors.background.primary, borderRadius: 12, overflow: 'hidden' }}>
          {!isCompact && <SkeletonLoader width="100%" height={140} borderRadius={0} />}
          <View style={{ padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isCompact && <SkeletonLoader width={48} height={48} borderRadius={8} />}
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonLoader width="70%" height={14} borderRadius={4} />
                <SkeletonLoader width="50%" height={10} borderRadius={4} />
              </View>
              <SkeletonLoader width={36} height={18} borderRadius={9} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <SkeletonLoader width={60} height={10} borderRadius={4} />
              <SkeletonLoader width={80} height={10} borderRadius={4} />
              <SkeletonLoader width={50} height={10} borderRadius={4} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

// ============================================
// Helper: Check if store is currently open
// ============================================
const isStoreOpen = (store: any): { isOpen: boolean; closingTime?: string } => {
  const hours = store.operationalInfo?.hours;
  if (!hours) return { isOpen: true };
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const today = days[now.getDay()];
  const dayHours = hours[today as keyof typeof hours] as any;
  if (!dayHours || dayHours.closed) return { isOpen: false };
  if (dayHours.open && dayHours.close) {
    const [openH, openM] = dayHours.open.split(':').map(Number);
    const [closeH, closeM] = dayHours.close.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);
    return { isOpen: currentMinutes >= openMinutes && currentMinutes <= closeMinutes, closingTime: dayHours.close };
  }
  return { isOpen: true };
};

// ============================================
// StoreCard Component (replicates RestaurantCard)
// ============================================
const StoreCard = ({
  store,
  variant = 'default',
  userVisitCount = 0,
  showReserveButton = false,
  showNewBadge = false,
  primaryColor,
  categorySlug,
  tagExclusions = ['halal', 'pure-veg', 'veg', 'non-veg', 'jain'],
  coinsMultiplier = 4.5,
  defaultReviewBonus = 20,
  defaultVisitMilestone = 5,
}: {
  store: any;
  variant?: 'default' | 'compact';
  userVisitCount?: number;
  showReserveButton?: boolean;
  showNewBadge?: boolean;
  primaryColor: string;
  categorySlug: string;
  tagExclusions?: string[];
  coinsMultiplier?: number;
  defaultReviewBonus?: number;
  defaultVisitMilestone?: number;
}) => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isCompact = variant === 'compact';
  const [imageError, setImageError] = useState(false);
  const isMounted = useIsMounted();

  const getImageUri = (): string | undefined => {
    if (store.banner) {
      if (Array.isArray(store.banner) && store.banner.length > 0) return store.banner[0];
      if (typeof store.banner === 'string') return store.banner;
    }
    return store.logo || store.image || undefined;
  };

  const imageUri = getImageUri();

  const getDisplayTags = (): string => {
    if (store.tags && Array.isArray(store.tags) && store.tags.length > 0) {
      const filtered = store.tags.filter((tag: string) =>
        !tagExclusions.includes(tag.toLowerCase())
      );
      return filtered.slice(0, 3).map((t: string) => t.charAt(0).toUpperCase() + t.slice(1)).join(' \u2022 ') || store.category?.name || 'Store';
    }
    return store.category?.name || 'Store';
  };

  const isHalal = store.tags?.some((t: string) => t.toLowerCase() === 'halal');
  const isPureVeg = store.tags?.some((t: string) => ['pure-veg', 'veg', 'vegetarian'].includes(t.toLowerCase()));
  const openStatus = isStoreOpen(store);

  const coinsEarned = store.rewardRules?.baseCashbackPercent
    ? Math.round(store.rewardRules.baseCashbackPercent * 10)
    : Math.round((store.offers?.cashback || 10) * coinsMultiplier);

  const reviewBonus = store.rewardRules?.reviewBonusCoins || defaultReviewBonus;
  const visitMilestone = store.rewardRules?.visitMilestoneRewards?.[0]?.visits || defaultVisitMilestone;

  return (
    <Pressable
      style={[styles.storeCard, isCompact && styles.storeCardCompact]}
      onPress={() => router.push(`/MainStorePage?storeId=${store._id || store.id}` as any)}
     
    >
      <View style={[styles.storeImageContainer, isCompact && styles.storeImageContainerCompact]}>
        {imageUri && !imageError ? (
          <CachedImage
            source={imageUri}
            style={styles.storeImage}
            contentFit="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.storeImage, styles.storeImagePlaceholder]}>
            <Ionicons name="storefront" size={40} color={colors.neutral[400]} />
            <Text style={styles.storeImagePlaceholderText}>{store.name}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.storeImageGradient}
        />

        {/* Badges */}
        <View style={styles.storeBadges}>
          {showNewBadge && (
            <View style={[styles.badgeNew, { backgroundColor: primaryColor }]}>
              <Text style={styles.badgeNewText}>NEW</Text>
            </View>
          )}
          <View style={[styles.badgeStatus, { backgroundColor: openStatus.isOpen ? colors.tint.greenLight : colors.errorScale[50] }]}>
            <View style={[styles.statusDot, { backgroundColor: openStatus.isOpen ? colors.success : colors.error }]} />
            <Text style={{ fontSize: 10, fontWeight: '600', color: openStatus.isOpen ? colors.successScale[700] : colors.error }}>
              {openStatus.isOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
          {store.deliveryCategories?.fastDelivery && (
            <View style={styles.badge60Min}>
              <Ionicons name="flash" size={10} color={colors.text.primary} />
              <Text style={styles.badge60MinText}>60 min</Text>
            </View>
          )}
          {isHalal && (
            <View style={styles.badgeHalal}>
              <Text style={styles.badgeHalalText}>Halal</Text>
            </View>
          )}
          {isPureVeg && (
            <View style={styles.badgePureVeg}>
              <Text style={styles.badgePureVegText}>Pure Veg</Text>
            </View>
          )}
          {store.offers?.cashback && (
            <View style={styles.badgeCashbackPurple}>
              <Text style={styles.badgeCashbackPurpleText}>{store.offers.cashback}% cashback</Text>
            </View>
          )}
        </View>

        {/* Rating Badge */}
        <View style={styles.storeRating}>
          <Ionicons name="star" size={12} color={colors.warningScale[400]} />
          <Text style={styles.storeRatingText}>
            {store.ratings?.average?.toFixed(1) || '4.5'}
          </Text>
          <Text style={styles.storeRatingCount}>
            ({store.ratings?.count || 0})
          </Text>
        </View>
      </View>

      <View style={styles.storeContent}>
        <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
        <Text style={styles.storeTags} numberOfLines={1}>{getDisplayTags()}</Text>

        {/* Meta Info */}
        <View style={styles.storeMeta}>
          <View style={styles.storeMetaItem}>
            <Ionicons name="location-outline" size={12} color={colors.neutral[500]} />
            <Text style={styles.storeMetaText}>
              {store.distance ? `${store.distance} km` : store.location?.city || 'Nearby'}
            </Text>
          </View>
          <View style={styles.storeMetaItem}>
            <Ionicons name="time-outline" size={12} color={colors.neutral[500]} />
            <Text style={styles.storeMetaText}>
              {store.operationalInfo?.deliveryTime || '30-35 min'}
            </Text>
          </View>
          {store.priceForTwo && (
            <Text style={styles.storePriceForTwo}>
              {currencySymbol}{store.priceForTwo} for two
            </Text>
          )}
        </View>

        {/* Delivery Info */}
        {(store.operationalInfo?.deliveryFee !== undefined || store.operationalInfo?.minimumOrder) && (
          <View style={styles.deliveryInfoRow}>
            {store.operationalInfo?.deliveryFee !== undefined && (
              <View style={styles.storeMetaItem}>
                <Ionicons name="bicycle-outline" size={12} color={colors.neutral[500]} />
                <Text style={styles.storeMetaText}>
                  {store.operationalInfo.deliveryFee === 0 ? 'Free delivery' : `${currencySymbol}${store.operationalInfo.deliveryFee} delivery`}
                </Text>
              </View>
            )}
            {store.operationalInfo?.freeDeliveryAbove && store.operationalInfo?.deliveryFee > 0 ? (
              <View style={styles.freeDeliveryBadge}>
                <Text style={styles.freeDeliveryText}>Free above {currencySymbol}{store.operationalInfo.freeDeliveryAbove}</Text>
              </View>
            ) : null}
            {store.operationalInfo?.minimumOrder ? (
              <Text style={styles.storeMetaText}>Min {currencySymbol}{store.operationalInfo.minimumOrder}</Text>
            ) : null}
          </View>
        )}

        {/* Rewards Row */}
        <View style={styles.storeRewardsRow}>
          <View style={styles.storeCoins}>
            <Ionicons name="star" size={14} color={colors.warningScale[400]} />
            <Text style={styles.storeCoinsText}>
              Earn {currencySymbol}{coinsEarned} coins
            </Text>
          </View>
          <Text style={styles.reviewBonusText}>
            +{currencySymbol}{reviewBonus} for review
          </Text>
        </View>

        {/* Visit Progress */}
        <View style={styles.visitProgressRow}>
          <Text style={styles.visitProgressText}>
            {userVisitCount}/{visitMilestone} visits
          </Text>
          {userVisitCount < visitMilestone && (
            <Pressable onPress={() => router.push('/my-visits' as any)}>
              <Text style={[styles.unlockRewardText, { color: primaryColor }]}>Unlock reward</Text>
            </Pressable>
          )}
        </View>

        {/* Reserve Button */}
        {showReserveButton && (
          <Pressable
            style={styles.reserveButton}
            onPress={(e) => {
              e.stopPropagation();
              router.push(`/MainCategory/${categorySlug}/book-table?storeId=${store._id || store.id}` as any);
            }}
           
          >
            <Ionicons name="calendar-outline" size={14} color={colors.background.primary} />
            <Text style={styles.reserveButtonText}>Reserve</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};

// ============================================
// ServiceTypeCard Component
// ============================================
const ServiceTypeCard = ({ serviceType, onPress }: { serviceType: PageConfigServiceType; onPress: () => void }) => (
  <Pressable style={styles.serviceTypeCard} onPress={onPress}>
    <LinearGradient
      colors={serviceType.gradient?.length >= 2 ? [...serviceType.gradient] : [colors.brand.indigo, '#818CF8']}
      style={styles.serviceTypeGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <Ionicons name={serviceType.icon as any} size={28} color={colors.background.primary} />
      <Text style={styles.serviceTypeLabel}>{serviceType.label}</Text>
      <Text style={styles.serviceTypeDescription} numberOfLines={2}>{serviceType.description}</Text>
    </LinearGradient>
  </Pressable>
);

// ============================================
// Main Component
// ============================================
function DynamicCategoryPage({ slug }: DynamicCategoryPageProps) {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  // Fetch page configuration
  const {
    pageConfig,
    category,
    childCategories,
    vibes,
    occasions,
    trendingHashtags,
    stats,
    isLoading: isConfigLoading,
    error: configError,
    refetch: refetchConfig,
  } = useCategoryPageConfig(slug);

  // Fetch stores, products, UGC data (existing hook)
  // Use stable storesPerPage to prevent re-fetch cascade when pageConfig loads
  const stableStoresPerPage = useRef(pageConfig?.storeDisplayConfig?.storesPerPage || 10);
  if (pageConfig?.storeDisplayConfig?.storesPerPage) {
    stableStoresPerPage.current = pageConfig.storeDisplayConfig.storesPerPage;
  }
  const {
    subcategories,
    stores,
    ugcPosts,
    aiPlaceholders,
    isLoading: isDataLoading,
    error: dataError,
    refetch: refetchData,
  } = useCategoryPageData(slug, {
    storesPerPage: stableStoresPerPage.current,
  });

  // Wallet data
  const savingsInsights = useSavingsInsights();
  const savingsThisMonth = savingsInsights?.thisMonth || 0;

  // ============================================
  // Local state
  // ============================================
  const [activeTab, setActiveTab] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Sort & Filter state
  const [sortOption, setSortOption] = useState<string>('popularity');
  const [showSortModal, setShowSortModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ minRating?: number; openNow?: boolean; priceMax?: number }>({});
  const [activeDietary, setActiveDietary] = useState<string[]>([]);

  // User visit counts (storeId -> count)
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({});

  // Loyalty stats & social proof ticker
  const [loyaltyStats, setLoyaltyStats] = useState<{ ordersCount: number; brandsCount: number }>({ ordersCount: 0, brandsCount: 0 });
  const [recentOrders, setRecentOrders] = useState<{ userName: string; storeName: string; timeAgo: string }[]>([]);
  const [tickerIndex, setTickerIndex] = useState(0);

  // User's orders for "Order Again"
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  // Tab-specific stores from backend
  const [tabStores, setTabStores] = useState<any[]>([]);
  const [isLoadingTabStores, setIsLoadingTabStores] = useState(false);

  // Pagination
  const [allStoresPage, setAllStoresPage] = useState(1);
  const [extraStores, setExtraStores] = useState<any[]>([]);
  const [hasMoreStores, setHasMoreStores] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Store display config from admin (with backward-compatible defaults)
  const displayConfig = pageConfig?.storeDisplayConfig || {};
  const STORES_PER_PAGE = displayConfig.storesPerPage || 10;

  // Animation ref for ticker fade
  const fadeAnim = useSharedValue(1);

  // ============================================
  // Derived values from config
  // ============================================
  const theme = pageConfig?.theme;
  const primaryColor = theme?.primaryColor || '#FF6B35';
  const gradientColors = (theme?.gradientColors?.length >= 2 ? theme.gradientColors : null) || [primaryColor, '#FF8C5A', '#FFF0E8'];
  const tabs = useMemo(() =>
    [...(pageConfig?.tabs || [])].filter(t => t.enabled !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [pageConfig?.tabs]);
  const sections = useMemo(() =>
    [...(pageConfig?.sections || [])].filter(s => s.enabled !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [pageConfig?.sections]);
  const quickActions = useMemo(() =>
    [...(pageConfig?.quickActions || [])].filter(qa => qa.enabled !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [pageConfig?.quickActions]);
  const serviceTypes = useMemo(() =>
    [...(pageConfig?.serviceTypes || [])].filter(st => st.enabled !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [pageConfig?.serviceTypes]);
  const dietaryOptions = pageConfig?.dietaryOptions || [];
  const curatedCollections = pageConfig?.curatedCollections || [];
  const searchPlaceholders = pageConfig?.searchPlaceholders || {};
  const valuePropItems = pageConfig?.valuePropItems || [
    { icon: 'cash-outline', text: 'Cashback on every order', color: colors.successScale[400] },
    { icon: 'wallet-outline', text: 'Earn coins to reuse', color: colors.warningScale[400] },
    { icon: 'gift-outline', text: 'Loyalty rewards', color: '#F472B6' },
  ];

  // Admin-configurable sort options (fallback to defaults)
  const sortOptionsConfig = useMemo(() => {
    const config = pageConfig?.sortOptions?.filter((o: any) => o.enabled !== false).sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    return config?.length ? config : DEFAULT_SORT_OPTIONS;
  }, [pageConfig?.sortOptions]);

  // Admin-configurable filter options (fallback to defaults)
  const filterConfig = useMemo(() => {
    const priceMax = pageConfig?.filterOptions?.priceMax ?? 500;
    return {
      priceMax,
      priceLabel: pageConfig?.filterOptions?.priceLabel || `Under ${currencySymbol}${priceMax}`,
      ratingThreshold: pageConfig?.filterOptions?.ratingThreshold ?? 4,
      showPriceFilter: pageConfig?.filterOptions?.showPriceFilter !== false,
      showRatingFilter: pageConfig?.filterOptions?.showRatingFilter !== false,
      showOpenNow: pageConfig?.filterOptions?.showOpenNow !== false,
    };
  }, [pageConfig?.filterOptions, currencySymbol]);

  // Admin-configurable store card defaults
  const coinsMultiplier = displayConfig.defaultCoinsMultiplier || 4.5;
  const defaultReviewBonus = displayConfig.defaultReviewBonus || 20;
  const defaultVisitMilestone = displayConfig.defaultVisitMilestone || 5;
  const tagExclusions = displayConfig.tagExclusions || ['halal', 'pure-veg', 'veg', 'non-veg', 'jain'];

  // Set initial active tab once config loads
  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  // Current active tab object
  const currentTab = useMemo(() => {
    return tabs.find(t => t.id === activeTab) || tabs[0] || null;
  }, [tabs, activeTab]);

  // ============================================
  // Search placeholders per tab
  // ============================================
  const currentPlaceholders = useMemo(() => {
    const tabPlaceholders = searchPlaceholders[activeTab] || searchPlaceholders['all'] || aiPlaceholders;
    return tabPlaceholders.length > 0 ? tabPlaceholders : [`Search in ${pageConfig?.categoryName || slug}...`];
  }, [activeTab, searchPlaceholders, aiPlaceholders, pageConfig?.categoryName, slug]);

  // Cycle placeholders
  useEffect(() => {
    if (currentPlaceholders.length <= 1) return;
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % currentPlaceholders.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [currentPlaceholders.length]);

  // ============================================
  // Fetch auxiliary data
  // ============================================
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const fetchVisits = async () => {
      try {
        const response = await storesApi.getUserVisitHistory(1, 20);
        if (response.success && response.data?.visits) {
          const counts: Record<string, number> = {};
          response.data.visits.forEach(visit => {
            const storeId = visit.store?.id;
            if (!storeId) return;
            counts[storeId] = (counts[storeId] || 0) + 1;
          });
          if (!isMounted()) return;
          setVisitCounts(counts);
        }
      } catch (err) {
        // silently handle
      }
    };
    fetchVisits();
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    const fetchLoyaltyData = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          categoriesApi.getCategoryLoyaltyStats(slug),
          categoriesApi.getRecentOrders(slug, 5),
        ]);
        if (statsRes.success && statsRes.data) {
          if (!isMounted()) return;
          setLoyaltyStats(statsRes.data);
        }
        if (ordersRes.success && ordersRes.data?.orders) {
          setRecentOrders(ordersRes.data.orders);
        }
      } catch (err) {
        // Silently fail - these are supplementary
      }
    };
    fetchLoyaltyData();
  }, [slug]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const fetchMyOrders = async () => {
      try {
        const res = await ordersApi.getOrders({ limit: 10, sort: 'newest' });
        if (res.success && res.data?.orders) {
          if (!isMounted()) return;
          setMyOrders(res.data.orders);
        }
      } catch (err) {
        // Silently fail
      }
    };
    fetchMyOrders();
  }, [authLoading, isAuthenticated]);

  // ============================================
  // Ticker animation for social proof
  // ============================================
  useEffect(() => {
    if (recentOrders.length > 1) {
      const timer = setInterval(() => {
        fadeAnim.value = withTiming(0, { duration: 300 }, (finished) => {
          if (finished) {
            runOnJS(setTickerIndex)((prev: number) => (prev + 1) % recentOrders.length);
            fadeAnim.value = withTiming(1, { duration: 300 });
          }
        });
      }, 4000);
      return () => {
        clearInterval(timer);
      };
    }
  }, [recentOrders.length, fadeAnim]);

  // ============================================
  // Tab-specific store fetching from backend
  // ============================================
  const tabFetchIdRef = useRef(0);
  useEffect(() => {
    if (!currentTab) return;

    // Increment fetch ID to prevent stale responses from overwriting current tab data
    const fetchId = ++tabFetchIdRef.current;

    // If the tab has a serviceFilter, fetch stores from backend by service type
    if (currentTab.serviceFilter) {
      const fetchTabStores = async () => {
        setIsLoadingTabStores(true);
        try {
          const response = await storesApi.getStoresByServiceType(slug, currentTab.serviceFilter!, 1, STORES_PER_PAGE);
          // Bail if tab changed during fetch
          if (fetchId !== tabFetchIdRef.current) return;
          if (response.success && response.data?.stores) {
            const formatted = response.data.stores.map((store: any) => ({
              id: store._id || store.id,
              _id: store._id || store.id,
              name: store.name,
              slug: store.slug,
              logo: store.logo,
              banner: store.banner,
              rating: store.ratings?.average || 4.5,
              ratings: store.ratings,
              cashback: store.offers?.cashback,
              distance: store.distance,
              tags: store.tags || [],
              rewardRules: store.rewardRules,
              priceForTwo: store.priceForTwo,
              offers: store.offers,
              operationalInfo: store.operationalInfo,
              deliveryCategories: store.deliveryCategories,
              location: store.location,
              category: store.category,
              bookingType: store.bookingType,
              isDineIn: store.bookingType === 'RESTAURANT' || false,
            }));
            if (!isMounted()) return;
            setTabStores(formatted);
          } else {
            setTabStores([]);
          }
        } catch (err) {
          if (fetchId !== tabFetchIdRef.current) return;
          if (!isMounted()) return;
          setTabStores([]);
        } finally {
          if (fetchId === tabFetchIdRef.current) {
            if (!isMounted()) return;
            setIsLoadingTabStores(false);
          }
        }
      };
      fetchTabStores();
    } else {
      // No service filter - use main stores
      setTabStores([]);
    }
  }, [activeTab, currentTab?.serviceFilter, slug]);

  // ============================================
  // Filtering & sorting stores
  // ============================================
  const displayStores = useMemo(() => {
    // If current tab has a serviceFilter and we fetched tabStores, use those
    const baseStores = currentTab?.serviceFilter && tabStores.length > 0 ? tabStores : stores;
    // Include extraStores in the filtering/sorting pipeline so they respect active filters
    let result = [...baseStores, ...extraStores];

    // Dietary filter
    if (activeDietary.length > 0 && dietaryOptions.length > 0) {
      const dietaryTags = activeDietary.flatMap(d => {
        const opt = dietaryOptions.find(o => o.id === d);
        return opt?.tags || [];
      });
      result = result.filter((store: any) => {
        if (!store.tags || !Array.isArray(store.tags)) return false;
        const storeTags = store.tags.map((t: string) => t.toLowerCase());
        return dietaryTags.some(dt => storeTags.includes(dt.toLowerCase()));
      });
    }

    // Rating filter
    if (activeFilters.minRating) {
      result = result.filter(s => (s.ratings?.average || s.rating || 0) >= activeFilters.minRating!);
    }

    // Price filter
    if (activeFilters.priceMax) {
      result = result.filter(s => (s.priceForTwo || 0) <= activeFilters.priceMax!);
    }

    // Open Now filter
    if (activeFilters.openNow) {
      result = result.filter(s => isStoreOpen(s).isOpen);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case 'rating': return (b.ratings?.average || b.rating || 0) - (a.ratings?.average || a.rating || 0);
        case 'delivery_time': {
          const aTime = parseInt(a.operationalInfo?.deliveryTime) || 60;
          const bTime = parseInt(b.operationalInfo?.deliveryTime) || 60;
          return aTime - bTime;
        }
        case 'newest': return 0;
        default: return (b.ratings?.count || 0) - (a.ratings?.count || 0); // popularity
      }
    });

    return result;
  }, [stores, tabStores, extraStores, currentTab, activeDietary, dietaryOptions, activeFilters, sortOption]);

  // ============================================
  // Pagination
  // ============================================
  const loadMoreStores = useCallback(async () => {
    if (isLoadingMore || !hasMoreStores) return;
    setIsLoadingMore(true);
    try {
      const nextPage = allStoresPage + 1;
      const response = await storesApi.getStoresBySubcategorySlug(slug, STORES_PER_PAGE, nextPage);
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        const formatted = response.data.map((store: any) => ({
          id: store._id || store.id,
          _id: store._id || store.id,
          name: store.name,
          slug: store.slug,
          logo: store.logo,
          banner: store.banner,
          rating: store.ratings?.average || 4.5,
          ratings: store.ratings,
          cashback: store.offers?.cashback,
          distance: store.distance,
          tags: store.tags || [],
          rewardRules: store.rewardRules,
          priceForTwo: store.priceForTwo,
          offers: store.offers,
          operationalInfo: store.operationalInfo,
          deliveryCategories: store.deliveryCategories,
          location: store.location,
          category: store.category,
        }));
        if (!isMounted()) return;
        setExtraStores(prev => [...prev, ...formatted]);
        setAllStoresPage(nextPage);
        if (formatted.length < STORES_PER_PAGE) setHasMoreStores(false);
      } else {
        setHasMoreStores(false);
      }
    } catch (err) {
      // Silently fail
    } finally {
      if (!isMounted()) return;
      setIsLoadingMore(false);
    }
  }, [allStoresPage, isLoadingMore, hasMoreStores, slug, STORES_PER_PAGE]);

  // Reset pagination on filter changes
  useEffect(() => {
    setAllStoresPage(1);
    setExtraStores([]);
    setHasMoreStores(true);
  }, [sortOption, activeFilters, activeDietary, activeTab]);

  // ============================================
  // Refresh handler
  // ============================================
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchConfig(), refetchData()]);
    if (!isMounted()) return;
    setRefreshing(false);
  };

  // ============================================
  // Navigation handlers
  // ============================================
  const handleCategoryPress = (category: any) => {
    const subcategorySlug = category.slug || category.id;
    router.push(`/MainCategory/${slug}/${subcategorySlug}` as any);
  };

  const handleAISearch = (query: string) => {
    router.push(`/MainCategory/${slug}/search?q=${encodeURIComponent(query)}` as any);
  };

  // ============================================
  // Section renderer
  // ============================================
  const renderSection = (section: PageConfigSection) => {
    switch (section.type) {
      case 'loyalty-hub':
        return renderLoyaltyHubSection(section);
      case 'browse-grid':
        return renderBrowseGridSection(section);
      case 'stores-list':
        return renderStoresListSection(section);
      case 'ai-search':
        return renderAISearchSection(section);
      case 'order-again':
        return renderOrderAgainSection();
      case 'ugc-social':
        return renderUGCSocialSection(section);
      case 'streak-loyalty':
        return renderStreakLoyaltySection();
      case 'service-types':
        return renderServiceTypesSection(section);
      case 'curated-collections':
        return renderCuratedCollectionsSection(section);
      case 'value-proposition':
        return renderValuePropositionSection();
      default:
        return null;
    }
  };

  // ============================================
  // Section render functions
  // ============================================
  const renderLoyaltyHubSection = (section: PageConfigSection) => (
    <Pressable
      key={section.id}
      style={styles.loyaltyHub}
      onPress={() => router.push(`/MainCategory/${slug}/loyalty` as any)}
     
    >
      <LinearGradient
        colors={['rgba(255, 205, 87, 0.2)', 'rgba(26, 58, 82, 0.2)', 'rgba(251, 191, 36, 0.2)']}
        style={styles.loyaltyHubGradient}
      >
        <View style={styles.loyaltyHubHeader}>
          <View style={styles.loyaltyHubIcon}>
            <Ionicons name="trophy" size={24} color={primaryColor} />
          </View>
          <View style={styles.loyaltyHubText}>
            <Text style={styles.loyaltyHubTitle}>{section.title || `${pageConfig?.categoryName} Loyalty Hub`}</Text>
            <Text style={styles.loyaltyHubSubtitle}>{section.subtitle || 'Track streaks, unlock rewards'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[500]} />
        </View>
        <View style={styles.loyaltyHubStats}>
          <View style={styles.loyaltyHubStat}>
            <Text style={styles.loyaltyHubStatLabel}>Total Visits</Text>
            <Text style={styles.loyaltyHubStatValue}>{loyaltyStats.ordersCount}</Text>
          </View>
          <View style={styles.loyaltyHubStat}>
            <Text style={styles.loyaltyHubStatLabel}>Active Brands</Text>
            <Text style={[styles.loyaltyHubStatValue, { color: colors.warningScale[400] }]}>{loyaltyStats.brandsCount}</Text>
          </View>
          <View style={styles.loyaltyHubStat}>
            <Text style={styles.loyaltyHubStatLabel}>Next Reward</Text>
            <Ionicons name="gift" size={20} color={primaryColor} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );

  const renderBrowseGridSection = (section: PageConfigSection) => {
    // Only show for tabs that have a serviceFilter (main browsing tabs) or "all"
    if (currentTab?.sectionOverride) return null;
    return (
      <BrowseCategoryGrid
        key={section.id}
        categories={subcategories}
        title={section.title || 'Browse Categories'}
        onCategoryPress={handleCategoryPress}
        itemCountLabel={section.config?.itemCountLabel || 'places'}
      />
    );
  };

  const renderStoresListSection = (section: PageConfigSection) => {
    if (currentTab?.sectionOverride) return null;

    return (
      <View key={section.id} style={styles.section}>
        {/* Sort & Filter Bar */}
        <View style={styles.sortFilterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortFilterContent}>
            <Pressable style={styles.sortButton} onPress={() => setShowSortModal(true)}>
              <Ionicons name="swap-vertical-outline" size={16} color={colors.neutral[900]} />
              <Text style={styles.sortButtonText}>{sortOptionsConfig.find((o: any) => o.id === sortOption)?.label || 'Sort'}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.neutral[500]} />
            </Pressable>
            {filterConfig.showPriceFilter && (
            <Pressable
              style={[styles.filterChip, activeFilters.priceMax ? styles.filterChipActive : null]}
              onPress={() => setActiveFilters(f => f.priceMax ? { ...f, priceMax: undefined } : { ...f, priceMax: filterConfig.priceMax })}
            >
              <Text style={[styles.filterChipText, activeFilters.priceMax && styles.filterChipTextActive]}>{filterConfig.priceLabel}</Text>
            </Pressable>
            )}
            {filterConfig.showRatingFilter && (
            <Pressable
              style={[styles.filterChip, activeFilters.minRating ? styles.filterChipActive : null]}
              onPress={() => setActiveFilters(f => f.minRating ? { ...f, minRating: undefined } : { ...f, minRating: filterConfig.ratingThreshold })}
            >
              <Ionicons name="star" size={12} color={activeFilters.minRating ? colors.background.primary : colors.warningScale[400]} />
              <Text style={[styles.filterChipText, activeFilters.minRating && styles.filterChipTextActive]}>{filterConfig.ratingThreshold}.0+</Text>
            </Pressable>
            )}
            {filterConfig.showOpenNow && (
            <Pressable
              style={[styles.filterChip, activeFilters.openNow ? styles.filterChipActive : null]}
              onPress={() => setActiveFilters(f => f.openNow ? { ...f, openNow: undefined } : { ...f, openNow: true })}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: activeFilters.openNow ? colors.background.primary : colors.success }} />
              <Text style={[styles.filterChipText, activeFilters.openNow && styles.filterChipTextActive]}>Open Now</Text>
            </Pressable>
            )}
          </ScrollView>
        </View>

        {/* Dietary Toggles (if category supports them) */}
        {dietaryOptions.length > 0 && (
          <View style={styles.dietaryStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dietaryContent}>
              {dietaryOptions.map(opt => {
                const isActive = activeDietary.includes(opt.id);
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.dietaryChip, isActive && { backgroundColor: opt.color }]}
                    onPress={() => setActiveDietary(prev => isActive ? prev.filter(d => d !== opt.id) : [...prev, opt.id])}
                  >
                    <Text style={styles.dietaryIcon}>{opt.icon}</Text>
                    <Text style={[styles.dietaryLabel, isActive && { color: colors.background.primary, fontWeight: '600' }]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Store Cards Section Header */}
        <View style={[styles.sectionHeader, { marginTop: 16 }]}>
          <Ionicons name="storefront-outline" size={20} color={colors.neutral[500]} />
          <Text style={styles.sectionTitle}>{section.title || `All ${pageConfig?.categoryName || 'Stores'}`}</Text>
          <Text style={styles.sectionCount}>{displayStores.length}+ places</Text>
        </View>

        {/* Store Cards Grid */}
        <View style={styles.storesGrid}>
          {isDataLoading || isLoadingTabStores ? (
            <StoreCardSkeleton count={3} />
          ) : displayStores.length === 0 ? (
            <EmptyState
              icon="storefront-outline"
              title="No stores found"
              message="Try changing your filters or check back later."
            />
          ) : (
            <>
              {displayStores.map((store) => (
                <StoreCard
                  key={store.id || store._id}
                  store={store}
                  userVisitCount={visitCounts[store.id] || 0}
                  showReserveButton={currentTab?.serviceFilter === 'dineIn'}
                  primaryColor={primaryColor}
                  categorySlug={slug}
                  tagExclusions={tagExclusions}
                  coinsMultiplier={coinsMultiplier}
                  defaultReviewBonus={defaultReviewBonus}
                  defaultVisitMilestone={defaultVisitMilestone}
                />
              ))}
              {hasMoreStores && !currentTab?.serviceFilter && (
                <Pressable style={styles.loadMoreButton} onPress={loadMoreStores} disabled={isLoadingMore}>
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color={primaryColor} />
                  ) : (
                    <Text style={[styles.loadMoreText, { color: primaryColor }]}>Load More</Text>
                  )}
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* Sort Modal */}
        <Modal visible={showSortModal} transparent animationType="slide" onRequestClose={() => setShowSortModal(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Sort By</Text>
              {sortOptionsConfig.map((opt: any) => (
                <Pressable
                  key={opt.id}
                  style={[styles.modalOption, sortOption === opt.id && styles.modalOptionActive]}
                  onPress={() => { setSortOption(opt.id); setShowSortModal(false); }}
                >
                  <Ionicons name={opt.icon as any} size={20} color={sortOption === opt.id ? colors.warningScale[400] : colors.neutral[500]} />
                  <Text style={[styles.modalOptionText, sortOption === opt.id && styles.modalOptionTextActive]}>{opt.label}</Text>
                  {sortOption === opt.id && <Ionicons name="checkmark-circle" size={20} color={colors.warningScale[400]} />}
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  };

  const renderAISearchSection = (section: PageConfigSection) => (
    <EnhancedAISuggestionsSection
      key={section.id}
      categorySlug={slug}
      categoryName={currentTab?.sectionOverride === 'offers'
        ? `${pageConfig?.categoryName} Offers`
        : currentTab?.sectionOverride === 'experiences'
          ? `${pageConfig?.categoryName} Experiences`
          : pageConfig?.categoryName || slug}
      placeholders={currentPlaceholders}
      onSearch={handleAISearch}
    />
  );

  const renderOrderAgainSection = () => {
    if (myOrders.length === 0) return null;
    return <OrderAgainSection key="order-again" orders={myOrders} />;
  };

  const renderUGCSocialSection = (section: PageConfigSection) => (
    <EnhancedUGCSocialProofSection
      key={section.id}
      categorySlug={slug}
      categoryName={pageConfig?.categoryName || slug}
      posts={ugcPosts}
      title={section.title || 'Real Reviews'}
      subtitle={section.subtitle || 'See what others are saying'}
      onPostPress={(post) => router.push(`/ugc/${post.id}` as any)}
      onSharePress={() => router.push('/share' as any)}
      onViewAllPress={() => {
        // Find stories route from quick actions (each category has a unique stories page name)
        const storiesAction = quickActions.find(qa => qa.id?.includes('stories') || qa.route?.includes('stories'));
        const storiesRoute = storiesAction?.route || `/MainCategory/${slug}/search?type=ugc`;
        router.push(storiesRoute as any);
      }}
    />
  );

  const renderStreakLoyaltySection = () => (
    <StreakLoyaltySection
      key="streak-loyalty"
      categorySlug={slug}
      primaryColor={primaryColor}
      pageConfig={pageConfig}
    />
  );

  const renderServiceTypesSection = (section: PageConfigSection) => {
    if (serviceTypes.length === 0) return null;
    return (
      <View key={section.id} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name={section.icon as any || 'apps-outline'} size={20} color={primaryColor} />
          <Text style={styles.sectionTitle}>{section.title || 'Service Types'}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceTypesList}>
          {serviceTypes.map(st => (
            <ServiceTypeCard
              key={st.id}
              serviceType={st}
              onPress={() => {
                // Find the matching tab or navigate
                const matchingTab = tabs.find(t => t.serviceFilter === st.serviceFilter);
                if (matchingTab) {
                  setActiveTab(matchingTab.id);
                } else {
                  router.push(`/MainCategory/${slug}/search?serviceType=${st.serviceFilter}` as any);
                }
              }}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderCuratedCollectionsSection = (section: PageConfigSection) => {
    if (curatedCollections.length === 0) return null;
    return (
      <View key={section.id} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>{section.icon || '\u2728'}</Text>
          <Text style={styles.sectionTitle}>{section.title || 'Curated for You'}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.curatedList}>
          {curatedCollections.map(col => (
            <Pressable
              key={col.id}
              style={styles.curatedCard}
              onPress={() => router.push(`/MainCategory/${slug}/search?tags=${col.tags}` as any)}
             
            >
              <LinearGradient colors={col.gradient?.length >= 2 ? [...col.gradient] : [colors.brand.indigo, '#818CF8']} style={styles.curatedGradient}>
                <Text style={styles.curatedIconText}>{col.icon}</Text>
                <Text style={styles.curatedTitle}>{col.title}</Text>
                <Text style={styles.curatedSubtitle}>{col.subtitle}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderValuePropositionSection = () => (
    <View key="value-proposition" style={styles.valuePropCard}>
      <LinearGradient
        colors={[colors.nileBlue, '#0f2638']}
        style={styles.valuePropGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.valuePropTitle}>
          Every visit is rewarding with <Text style={styles.valuePropBrand}>Rez</Text>
        </Text>
        <View style={styles.valuePropGrid}>
          {valuePropItems.map((item, i) => (
            <View key={i} style={styles.valuePropItem}>
              <View style={[styles.valuePropIconWrap, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon as any} size={16} color={item.color} />
              </View>
              <Text style={styles.valuePropText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Savings inline */}
        <View style={styles.savingsRow}>
          <View style={styles.savingsLeft}>
            <Text style={styles.savingsLabel}>Saved this month</Text>
            <Text style={styles.savingsAmount}>{currencySymbol}{savingsThisMonth.toLocaleString()}</Text>
          </View>
          <Pressable
            style={styles.savingsButton}
            onPress={() => router.push(`/MainCategory/${slug}/loyalty/coins` as any)}
           
          >
            <Text style={styles.savingsButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.nileBlue} />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );

  // ============================================
  // Tab content renderer
  // ============================================
  const renderTabContent = () => {
    if (!currentTab) return null;

    // If the tab has a sectionOverride, render that special section
    if (currentTab.sectionOverride === 'offers') {
      return (
        <View style={styles.tabContent}>
          <OffersSection categorySlug={slug} />
        </View>
      );
    }
    if (currentTab.sectionOverride === 'experiences') {
      return (
        <View style={styles.tabContent}>
          <ExperiencesSection categorySlug={slug} pageConfig={pageConfig} />
        </View>
      );
    }

    // Default: render configured sections (exclude types rendered unconditionally outside tabs)
    const RENDERED_OUTSIDE_TABS = ['loyalty-hub', 'ai-search', 'value-proposition', 'streak-loyalty', 'ugc-social', 'footer-trust'];
    return (
      <View style={styles.tabContent}>
        {sections.filter(s => !RENDERED_OUTSIDE_TABS.includes(s.type)).map(section => (
          <SectionErrorBoundary key={section.id} name={`tab-section-${section.type}`}>{renderSection(section)}</SectionErrorBoundary>
        ))}
      </View>
    );
  };

  // ============================================
  // Loading state
  // ============================================
  const isLoading = isConfigLoading || isDataLoading;
  const error = configError || dataError;

  // Once content has loaded for this slug, never go back to loading/empty state
  // Uses module-level flag so it survives component remounts from DeferredProviders
  if (!_pageContentLoaded[slug] && (pageConfig || stores.length > 0)) {
    _pageContentLoaded[slug] = true;
  }

  if (!_pageContentLoaded[slug] && isLoading && !refreshing && stores.length === 0) {
    return <LoadingState message={`Loading ${pageConfig?.categoryName || 'category'}...`} />;
  }

  if (!_pageContentLoaded[slug] && error && stores.length === 0 && !pageConfig) {
    return (
      <EmptyState
        icon="storefront-outline"
        title="Unable to load"
        message={error || 'Something went wrong. Please try again.'}
        actionLabel="Try Again"
        onAction={onRefresh}
      />
    );
  }

  // ============================================
  // Main render
  // ============================================
  return (
    <ErrorBoundary onError={(err, info) => { logger.warn('[DynamicCategoryPage] Render error caught:', err?.message, info?.componentStack?.slice(0, 200)); }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[primaryColor]}
          />
        }
      >
        {/* Header Banner */}
        <SectionErrorBoundary name="category-header">
        <CategoryHeader
          categoryName={pageConfig?.categoryName || category?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          primaryColor={primaryColor}
          banner={pageConfig?.banner || {
            title: category?.name || slug,
            subtitle: 'Explore the best',
            discount: '',
            tag: 'TRENDING',
          }}
          gradientColors={gradientColors}
        />
        </SectionErrorBoundary>

        {/* Social Proof Strip */}
        <SectionErrorBoundary name="social-proof">
        {recentOrders.length > 0 && (
          <View style={styles.socialProofStrip}>
            <Animated.View style={[styles.socialProofContent, { opacity: fadeAnim }]}>
              <Text style={styles.socialProofEmoji}>{'\uD83D\uDC64'}</Text>
              <Text style={styles.socialProofText}>
                <Text style={styles.socialProofUser}>{recentOrders[tickerIndex]?.userName || 'Someone'}</Text>
                <Text> just ordered from </Text>
                <Text style={[styles.socialProofBrand, { color: primaryColor }]}>{recentOrders[tickerIndex]?.storeName || 'a store'}</Text>
              </Text>
              <Text style={styles.socialProofTime}>{recentOrders[tickerIndex]?.timeAgo || 'recently'}</Text>
            </Animated.View>
          </View>
        )}
        </SectionErrorBoundary>

        {/* Loyalty Hub - rendered before tabs (matching FoodDining pattern) */}
        <SectionErrorBoundary name="loyalty-hub">
        {sections.some(s => s.type === 'loyalty-hub') && renderLoyaltyHubSection(
          sections.find(s => s.type === 'loyalty-hub') || { id: 'loyalty-hub', type: 'loyalty-hub', title: 'Loyalty Hub', sortOrder: 0, enabled: true }
        )}
        </SectionErrorBoundary>

        {/* Tabs */}
        {tabs.length > 0 && (
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
              {tabs.map((tab) => (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  style={[
                    styles.tab,
                    activeTab === tab.id && [styles.tabActive, { backgroundColor: primaryColor }],
                  ]}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={18}
                    color={activeTab === tab.id ? colors.background.primary : colors.neutral[500]}
                  />
                  <Text style={[
                    styles.tabLabel,
                    activeTab === tab.id && styles.tabLabelActive,
                  ]}>
                    {tab.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Actions */}
        <SectionErrorBoundary name="quick-actions">
        {quickActions.length > 0 && (
          <QuickActionBar categorySlug={slug} actions={quickActions as any} />
        )}
        </SectionErrorBoundary>

        {/* AI Search Section - always render if present in sections */}
        <SectionErrorBoundary name="ai-search">
        {sections.some(s => s.type === 'ai-search') && renderAISearchSection(
          sections.find(s => s.type === 'ai-search') || { id: 'ai-search', type: 'ai-search', title: 'AI Search', sortOrder: 0, enabled: true }
        )}
        </SectionErrorBoundary>

        {/* Tab Content (browse-grid, stores-list, offers, experiences) */}
        <SectionErrorBoundary name="tab-content">
        {renderTabContent()}
        </SectionErrorBoundary>

        {/* Value Proposition - always render at bottom of main content */}
        <SectionErrorBoundary name="value-proposition">
        {renderValuePropositionSection()}
        </SectionErrorBoundary>

        {/* Streak Loyalty */}
        <SectionErrorBoundary name="streak-loyalty">
        <StreakLoyaltySection categorySlug={slug} primaryColor={primaryColor} pageConfig={pageConfig} />
        </SectionErrorBoundary>

        {/* UGC Social Proof */}
        <SectionErrorBoundary name="ugc-social">
        {sections.some(s => s.type === 'ugc-social') && renderUGCSocialSection(
          sections.find(s => s.type === 'ugc-social') || { id: 'ugc-social', type: 'ugc-social', title: 'Reviews', sortOrder: 99, enabled: true }
        )}
        </SectionErrorBoundary>

        {/* Footer Trust */}
        <SectionErrorBoundary name="footer-trust">
        <FooterTrustSection categorySlug={slug} pageConfig={pageConfig} />
        </SectionErrorBoundary>
      </ScrollView>
    </ErrorBoundary>
  );
}

// ============================================
// Styles
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.tint.warmGray,
  },
  contentContainer: {
    paddingBottom: 100,
  },

  // Social Proof
  socialProofStrip: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  socialProofContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    gap: 8,
  },
  socialProofEmoji: {
    fontSize: 16,
  },
  socialProofText: {
    flex: 1,
    fontSize: 13,
    color: colors.neutral[700],
  },
  socialProofUser: {
    fontWeight: '600',
    color: colors.neutral[900],
  },
  socialProofBrand: {
    fontWeight: '500',
  },
  socialProofTime: {
    fontSize: 11,
    color: colors.neutral[500],
  },

  // Loyalty Hub
  loyaltyHub: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  loyaltyHubGradient: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.3)',
  },
  loyaltyHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  loyaltyHubIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 205, 87, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loyaltyHubText: {
    flex: 1,
  },
  loyaltyHubTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  loyaltyHubSubtitle: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  loyaltyHubStats: {
    flexDirection: 'row',
    gap: 8,
  },
  loyaltyHubStat: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
  },
  loyaltyHubStatLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  loyaltyHubStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },

  // Tabs
  tabsContainer: {
    backgroundColor: colors.background.primary,
    paddingVertical: 8,
  },
  tabs: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: 6,
  },
  tabActive: {},
  tabLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  tabLabelActive: {
    color: colors.background.primary,
    fontWeight: '600',
  },
  tabContent: {
    paddingTop: 16,
  },

  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  sectionCount: {
    fontSize: 12,
    color: colors.neutral[500],
  },

  // Sort & Filter
  sortFilterBar: {
    backgroundColor: colors.background.primary,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  sortFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    gap: 6,
  },
  sortButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.neutral[900],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: colors.warningScale[400],
  },
  filterChipText: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.background.primary,
    fontWeight: '600',
  },

  // Dietary
  dietaryStrip: {
    paddingVertical: 8,
    backgroundColor: colors.background.primary,
  },
  dietaryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dietaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.neutral[100],
    gap: 6,
  },
  dietaryIcon: {
    fontSize: 14,
  },
  dietaryLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
  },

  // Stores Grid
  storesGrid: {
    gap: 16,
  },

  // Store Card (mirrors RestaurantCard)
  storeCard: {
    borderRadius: 16,
    backgroundColor: colors.background.primary,
    overflow: 'hidden',
    marginBottom: 16,
  },
  storeCardCompact: {
    minWidth: 200,
    marginRight: 12,
    marginBottom: 0,
  },
  storeImageContainer: {
    height: 180,
    position: 'relative',
  },
  storeImageContainerCompact: {
    height: 120,
  },
  storeImage: {
    width: '100%',
    height: '100%',
  },
  storeImagePlaceholder: {
    backgroundColor: colors.neutral[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeImagePlaceholderText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.neutral[500],
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  storeImageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  storeBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    gap: 4,
  },
  badge60Min: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: colors.warningScale[400],
    gap: 3,
  },
  badge60MinText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.primary,
  },
  badgeHalal: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#0D9488',
  },
  badgeHalalText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  badgePureVeg: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.success,
  },
  badgePureVegText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  badgeCashbackPurple: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.brand.purpleLight,
  },
  badgeCashbackPurpleText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.background.primary,
  },
  badgeNew: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeNewText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.background.primary,
  },
  badgeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  storeRating: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    gap: 4,
  },
  storeRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  storeRatingCount: {
    fontSize: 10,
    color: colors.neutral[500],
  },
  storeContent: {
    padding: 12,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  storeTags: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  storeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
    gap: 12,
  },
  storeMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeMetaText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  storePriceForTwo: {
    fontSize: 11,
    color: colors.neutral[500],
    marginLeft: 4,
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  freeDeliveryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: colors.tint.greenLight,
  },
  freeDeliveryText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.successScale[700],
  },
  storeRewardsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  storeCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeCoinsText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.warningScale[400],
  },
  reviewBonusText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  visitProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  visitProgressText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.neutral[500],
  },
  unlockRewardText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reserveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.nileBlue,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  reserveButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background.primary,
  },

  // Service Type Cards
  serviceTypesList: {
    gap: 12,
    paddingRight: 16,
  },
  serviceTypeCard: {
    width: 160,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
  },
  serviceTypeGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-end',
  },
  serviceTypeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.primary,
    marginTop: 8,
  },
  serviceTypeDescription: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Curated Collections
  curatedList: {
    gap: 12,
    paddingRight: 16,
  },
  curatedCard: {
    width: 160,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },
  curatedGradient: {
    flex: 1,
    padding: 14,
    justifyContent: 'flex-end',
  },
  curatedIconText: {
    fontSize: 24,
    marginBottom: 4,
  },
  curatedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.background.primary,
  },
  curatedSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },

  // Value Proposition
  valuePropCard: {
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  valuePropGradient: {
    padding: 20,
  },
  valuePropTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  valuePropBrand: {
    color: colors.warningScale[400],
    fontWeight: '800',
  },
  valuePropGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  valuePropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
    gap: 10,
  },
  valuePropIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valuePropText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  savingsLeft: {
    flex: 1,
  },
  savingsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  savingsAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.warningScale[400],
  },
  savingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.warningScale[400],
  },
  savingsButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.nileBlue,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  modalOptionActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 15,
    color: colors.neutral[900],
  },
  modalOptionTextActive: {
    fontWeight: '600',
    color: colors.warningScale[400],
  },

  // Pagination
  loadMoreButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default React.memo(DynamicCategoryPage);
