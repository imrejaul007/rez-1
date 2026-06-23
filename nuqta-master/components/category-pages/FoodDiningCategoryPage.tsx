// @ts-nocheck
/**
 * Food & Dining Category Page - ENHANCED
 * Orchestration component that assembles all food-dining sections.
 * Individual components extracted to @/components/food-dining/
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl, Pressable, ActivityIndicator, Modal, Platform } from 'react-native';
import Animated, { runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { BRAND } from '@/constants/brand';
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
import ExperiencesSection from '@/components/category/ExperiencesSection';
import OrderAgainSection from '@/components/category/OrderAgainSection';
import { useCategoryPageData } from '@/hooks/useCategoryPageData';
import { useSavingsInsights, useGetCurrencySymbol } from '@/stores/selectors';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import EmptyState from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { foodCategoryData, foodQuickActions } from '@/data/category/foodCategoryData';
import { categoriesApi } from '@/services/categoriesApi';
import ordersApi, { Order } from '@/services/ordersApi';
import tableBookingApi from '@/services/tableBookingApi';
import { storesApi } from '@/services/storesApi';
import productsApi from '@/services/productsApi';

// Extracted food-dining components
import {
  COLORS, FOOD_TABS, DIETARY_OPTIONS, SORT_OPTIONS, CURATED_COLLECTIONS,
  CUISINE_ICON_MAP, CUISINE_TAG_MAP, RESTAURANTS_PER_PAGE,
  isRestaurantOpen,
  SectionHeaderSkeleton, RestaurantCardSkeleton, DishCardSkeleton,
  RestaurantCard, DishCard,
  RestaurantCompareSection,
  ReviewsSection,
  PersonalizedSections,
} from '@/components/food-dining';
import storeComparisonApi from '@/services/storeComparisonApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { colors } from '@/constants/theme';

function FoodDiningCategoryPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const slug = 'food-dining';
  const categoryConfig = getCategoryConfig(slug);

  // Use the hook for real data with fallback
  const {
    subcategories, stores, ugcPosts, aiPlaceholders, pageConfig, isLoading, error, refetch,
  } = useCategoryPageData(slug);

  // Admin-driven content with hardcoded fallbacks
  const dynamicTabs = useMemo(() => {
    const baseTabs = pageConfig?.tabs?.map(t => ({
      id: t.id,
      label: t.label,
      icon: t.icon || 'ellipse-outline',
    })) || FOOD_TABS;

    // Ensure takeaway tab is always present in UI even if admin config omits it.
    const hasTakeaway = baseTabs.some(tab => tab.id === 'takeaway');
    if (hasTakeaway) return baseTabs;

    const dineInIndex = baseTabs.findIndex(tab => tab.id === 'dineIn');
    const takeawayTab = { id: 'takeaway', label: 'Takeaway', icon: 'bag-handle-outline' };
    if (dineInIndex >= 0) {
      return [
        ...baseTabs.slice(0, dineInIndex + 1),
        takeawayTab,
        ...baseTabs.slice(dineInIndex + 1),
      ];
    }
    return [...baseTabs, takeawayTab];
  }, [pageConfig?.tabs]);

  const dynamicDietaryOptions = useMemo(() => pageConfig?.dietaryOptions?.map(d => ({
    id: d.id, label: d.label, icon: d.icon, color: d.color, tags: d.tags,
  })) || DIETARY_OPTIONS, [pageConfig?.dietaryOptions]);

  const dynamicCuratedCollections = useMemo(() => pageConfig?.curatedCollections?.map(c => ({
    id: c.id, title: c.title, subtitle: c.subtitle, icon: c.icon,
    gradient: c.gradient as readonly [string, string], tags: c.tags,
  })) || CURATED_COLLECTIONS, [pageConfig?.curatedCollections]);

  const dynamicSortOptions = useMemo(() => pageConfig?.sortOptions?.filter(s => s.enabled !== false).map(s => ({
    id: s.id, label: s.label, icon: s.icon || 'swap-vertical-outline',
  })) || SORT_OPTIONS, [pageConfig?.sortOptions]);

  // Wallet data for savings display
  const savingsInsights = useSavingsInsights();
  const savingsThisMonth = savingsInsights?.thisMonth || 0;

  // ===== State =====
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState('delivery');
  const [activeCuisine, setActiveCuisine] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [sortOption, setSortOption] = useState<string>('popularity');
  const [showSortModal, setShowSortModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ minRating?: number; openNow?: boolean; priceMax?: number }>({});
  const [activeDietary, setActiveDietary] = useState<string[]>([]);
  const [newStores, setNewStores] = useState<any[]>([]);
  const [popularDishes, setPopularDishes] = useState<any[]>([]);
  const [isLoadingNewStores, setIsLoadingNewStores] = useState(true);
  const [isLoadingDishes, setIsLoadingDishes] = useState(true);
  const [allRestaurantsPage, setAllRestaurantsPage] = useState(1);
  const [extraStores, setExtraStores] = useState<any[]>([]);
  const [hasMoreRestaurants, setHasMoreRestaurants] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loyaltyStats, setLoyaltyStats] = useState<{ ordersCount: number; brandsCount: number }>({ ordersCount: 0, brandsCount: 0 });
  const [recentOrders, setRecentOrders] = useState<{ userName: string; storeName: string; timeAgo: string }[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [realCuisineFilters, setRealCuisineFilters] = useState<{ id: string; label: string; icon: string; count?: number }[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);

  // Tab-aware search placeholders
  const tabPlaceholders: Record<string, string[]> = {
    delivery: ['Search biryani, pizza, burgers...', 'Find delivery near you...', 'What are you craving?'],
    dineIn: ['Find dine-in spots nearby...', 'Book a table tonight...', 'Best restaurants for dinner...'],
    takeaway: ['Find takeaway spots nearby...', 'Quick pickup in minutes...', 'Order now, pick up fast...'],
    offers: ['Search for deals & offers...', 'Find cashback deals...', 'Best food discounts today...'],
    experiences: ['Find food experiences...', 'Cooking classes near me...', 'Chef\'s table events...'],
  };
  const placeholders = tabPlaceholders[activeTab] || tabPlaceholders.delivery;

  // Animation ref for ticker
  const fadeAnim = useSharedValue(1);

  // Compare section refs
  const scrollViewRef = useRef<ScrollView>(null);
  const compareSectionY = useRef(0);

  // ===== Effects =====

  // Reset placeholder index on tab change
  useEffect(() => {
    setPlaceholderIndex(0);
  }, [activeTab]);

  // Rotate search placeholder
  useEffect(() => {
    if (placeholders.length <= 1) return;
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [placeholders]);

  // Fetch user visits
  useEffect(() => {
    const fetchVisits = async () => {
      try {
        const response = await storesApi.getUserVisitHistory(1, 20);
        if (response.success && response.data?.visits) {
          const counts: Record<string, number> = {};
          response.data.visits.forEach(visit => {
            const storeId = visit.store?._id || visit.store?.id;
            if (!storeId) return;
            counts[storeId] = (counts[storeId] || 0) + 1;
          });
          setVisitCounts(counts);
        }
      } catch (err) {
        // silently handle
      }
    };
    fetchVisits();
  }, []);

  // Fetch loyalty stats and recent orders
  useEffect(() => {
    const fetchLoyaltyData = async () => {
      try {
        const [statsRes, ordersRes] = await Promise.all([
          categoriesApi.getCategoryLoyaltyStats(slug),
          categoriesApi.getRecentOrders(slug, 5)
        ]);
        if (statsRes.success && statsRes.data) {
          setLoyaltyStats(statsRes.data);
        }
        if (ordersRes.success && ordersRes.data?.orders) {
          // Filter to recent orders only (within 48 hours)
          const recentOnly = ordersRes.data.orders.filter((order: any) => {
            if (!order.timeAgo) return true;
            const timeStr = order.timeAgo.toLowerCase();
            if (timeStr.includes('d ago')) {
              const days = parseInt(timeStr);
              return !isNaN(days) && days <= 2;
            }
            return !timeStr.includes('w ago') && !timeStr.includes('mo ago');
          });
          setRecentOrders(recentOnly);
        }
      } catch (_err) { /* silently handle */ }
    };
    fetchLoyaltyData();
  }, [slug]);

  // Fetch cuisine counts
  useEffect(() => {
    const fetchCuisines = async () => {
      try {
        const response = await storesApi.getCuisineCounts();
        if (response.success && response.data?.cuisines) {
          const filters = [
            { id: 'all', label: 'All', icon: '🌍' },
            ...response.data.cuisines
              .filter((c: any) => c.count > 0)
              .slice(0, 15)
              .map((c: any) => ({
                id: c.id || c.name?.toLowerCase(),
                label: c.name || c.id,
                icon: CUISINE_ICON_MAP[c.name?.toLowerCase()] || CUISINE_ICON_MAP[c.id?.toLowerCase()] || '🍽️',
                count: c.count,
              })),
          ];
          setRealCuisineFilters(filters);
        }
      } catch (err) {
        // silently handle
      }
    };
    fetchCuisines();
  }, []);

  // Fetch user's personal orders for Order Again — filter to food-dining category
  useEffect(() => {
    const fetchMyOrders = async () => {
      try {
        const res = await ordersApi.getOrders({ limit: 20, sort: 'newest' });
        if (res.success && res.data?.orders) {
          const foodOrders = res.data.orders.filter((order: any) => {
            const categorySlug = order.store?.mainCategorySlug || order.items?.[0]?.store?.mainCategorySlug || '';
            const categoryName = order.store?.category?.name?.toLowerCase() || order.items?.[0]?.category?.toLowerCase() || '';
            return categorySlug === 'food-dining' || categoryName.includes('food') || categoryName.includes('dining') || categoryName.includes('restaurant');
          });
          setMyOrders(foodOrders.slice(0, 10));
        }
      } catch (_err) { /* silently handle */ }
    };
    fetchMyOrders();
  }, []);

  // Ticker animation
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

  // Fetch new stores
  useEffect(() => {
    const fetchNew = async () => {
      try {
        setIsLoadingNewStores(true);
        const response = await storesApi.getStores({ sort: 'newest', category: 'food-dining', limit: 6 });
        if (response.success && response.data?.stores) setNewStores(response.data.stores);
      } catch (_err) { /* silently handle */ }
      finally { setIsLoadingNewStores(false); }
    };
    fetchNew();
  }, []);

  // Fetch popular dishes
  useEffect(() => {
    const fetchDishes = async () => {
      try {
        setIsLoadingDishes(true);
        const response = await productsApi.getProductsByCategory('food-dining', { sort: 'popularity', limit: 8 });
        if (response.success && response.data?.products) setPopularDishes(response.data.products);
      } catch (_err) { /* silently handle */ }
      finally { setIsLoadingDishes(false); }
    };
    fetchDishes();
  }, []);

  // Fetch user's table bookings for Dine-In tab
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await tableBookingApi.getUserTableBookings({ limit: 5 });
        if (res.success && res.data?.bookings) {
          setMyBookings(res.data.bookings);
        } else if (res.success && Array.isArray(res.data)) {
          setMyBookings(res.data);
        }
      } catch (err) {
        // silently handle
      }
    };
    fetchBookings();
  }, []);

  // ===== Handlers =====

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const loadMoreRestaurants = useCallback(async () => {
    if (isLoadingMore || !hasMoreRestaurants) return;
    setIsLoadingMore(true);
    try {
      const nextPage = allRestaurantsPage + 1;
      const response = await storesApi.getStoresBySubcategorySlug('food-dining', RESTAURANTS_PER_PAGE, nextPage);
      const storesArr = response.success
        ? (Array.isArray(response.data) ? response.data : response.data?.stores || [])
        : [];
      if (storesArr.length > 0) {
        const formatted = storesArr.map((store: any) => ({
          id: store._id || store.id, _id: store._id || store.id, name: store.name, slug: store.slug,
          logo: store.logo, banner: store.banner, rating: store.ratings?.average || 0, ratings: store.ratings,
          cashback: store.offers?.cashback, distance: store.distance, tags: store.tags || [],
          rewardRules: store.rewardRules, priceForTwo: store.priceForTwo, offers: store.offers,
          operationalInfo: store.operationalInfo, deliveryCategories: store.deliveryCategories, location: store.location,
          is60Min: store.deliveryCategories?.fastDelivery || false, isDineIn: store.bookingType === 'RESTAURANT' || false,
          category: store.category,
        }));
        setExtraStores(prev => [...prev, ...formatted]);
        setAllRestaurantsPage(nextPage);
        if (formatted.length < RESTAURANTS_PER_PAGE) setHasMoreRestaurants(false);
      } else {
        setHasMoreRestaurants(false);
      }
    } catch (_err) { /* silently handle */ }
    finally { setIsLoadingMore(false); }
  }, [allRestaurantsPage, isLoadingMore, hasMoreRestaurants]);

  // Reset pagination when filters change
  useEffect(() => {
    setAllRestaurantsPage(1);
    setExtraStores([]);
    setHasMoreRestaurants(true);
  }, [activeCuisine, sortOption, activeFilters, activeDietary]);

  // ===== Filtering & Sorting =====

  const filteredStores = useMemo(() => {
    let result = [...stores];

    // Cuisine filter
    if (activeCuisine !== 'all') {
      const cuisineTags = CUISINE_TAG_MAP[activeCuisine] || [activeCuisine];
      result = result.filter((store: any) => {
        if (store.tags && Array.isArray(store.tags)) {
          const storeTags = store.tags.map((tag: string) => tag.toLowerCase());
          return cuisineTags.some(ct => storeTags.some((st: string) => st.includes(ct.toLowerCase())));
        }
        const cn = store.category?.name?.toLowerCase() || '';
        const sn = store.name?.toLowerCase() || '';
        return cuisineTags.some(ct => cn.includes(ct.toLowerCase()) || sn.includes(ct.toLowerCase()));
      });
    }

    // Dietary filter
    if (activeDietary.length > 0) {
      const dietaryTags = activeDietary.flatMap(d => dynamicDietaryOptions.find(o => o.id === d)?.tags || []);
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
      result = result.filter(s => isRestaurantOpen(s).isOpen);
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
        default: return (b.ratings?.count || 0) - (a.ratings?.count || 0);
      }
    });

    return result;
  }, [stores, activeCuisine, activeDietary, activeFilters, sortOption, dynamicDietaryOptions]);

  const fastDeliveryStores = filteredStores.filter((s: any) => s.is60Min);
  const topRatedStores = filteredStores.filter((s: any) => (s.rating || 0) >= 4.5);
  const actualTakeawayStores = useMemo(
    () => filteredStores.filter((s: any) => s.hasPickup || s.serviceCapabilities?.storePickup?.enabled),
    [filteredStores]
  );
  const takeawayStores = useMemo(
    () => actualTakeawayStores.length > 0 ? actualTakeawayStores : filteredStores,
    [actualTakeawayStores, filteredStores]
  );
  const isTakeawayFallback = actualTakeawayStores.length === 0 && filteredStores.length > 0;
  const actualDineInStores = useMemo(() => filteredStores.filter((s: any) => s.isDineIn), [filteredStores]);
  const dineInStores = useMemo(() => actualDineInStores.length > 0 ? actualDineInStores : filteredStores, [actualDineInStores, filteredStores]);
  const isDineInFallback = actualDineInStores.length === 0 && filteredStores.length > 0;

  // Filter newStores by active cuisine/dietary filters
  const filteredNewStores = useMemo(() => {
    let result = [...newStores];
    if (activeCuisine !== 'all') {
      const cuisineTags = CUISINE_TAG_MAP[activeCuisine] || [activeCuisine];
      result = result.filter((store: any) => {
        const storeTags = (store.tags || []).map((t: string) => t.toLowerCase());
        return cuisineTags.some(ct => storeTags.some((st: string) => st.includes(ct.toLowerCase())));
      });
    }
    if (activeDietary.length > 0) {
      const dietaryTags = activeDietary.flatMap(d => dynamicDietaryOptions.find(o => o.id === d)?.tags || []);
      result = result.filter((store: any) => {
        const storeTags = (store.tags || []).map((t: string) => t.toLowerCase());
        return dietaryTags.some(dt => storeTags.includes(dt.toLowerCase()));
      });
    }
    return result;
  }, [newStores, activeCuisine, activeDietary, dynamicDietaryOptions]);

  const handleCategoryPress = (category: any) => {
    const subcategorySlug = category.slug || category.id;
    router.push(`/MainCategory/food-dining/${subcategorySlug}` as any);
  };

  const handleAISearch = (query: string) => {
    const sanitized = query.trim().slice(0, 100);
    if (!sanitized) return;
    router.push(`/MainCategory/food-dining/search?q=${encodeURIComponent(sanitized)}` as any);
  };

  const handleSaveComparison = useCallback(async (storeIds: string[]) => {
    try {
      const response = await storeComparisonApi.createComparison(storeIds);
      if (response.success) {
        platformAlertSimple('Saved', 'Comparison saved successfully!');
      } else {
        platformAlertSimple('Error', response.message || 'Failed to save comparison.');
      }
    } catch {
      platformAlertSimple('Error', 'Something went wrong. Please try again.');
    }
  }, []);

  const handleQuickAction = useCallback((action: any) => {
    if (action.id === 'compare') {
      // Switch to delivery tab first (compare section lives there)
      if (activeTab !== 'delivery') {
        setActiveTab('delivery');
        // Delay scroll to let delivery tab render
        setTimeout(() => {
          if (compareSectionY.current > 0) {
            scrollViewRef.current?.scrollTo({ y: compareSectionY.current, animated: true });
          }
        }, 300);
      } else if (compareSectionY.current > 0) {
        scrollViewRef.current?.scrollTo({ y: compareSectionY.current, animated: true });
      }
      return;
    }
    if (action.id === 'cuisines') {
      // Switch to delivery tab and scroll to cuisine filters
      if (activeTab !== 'delivery') setActiveTab('delivery');
      router.push('/MainCategory/food-dining/search?tab=cuisines' as any);
      return;
    }
    // Default: navigate if route is set
    const route = action.route;
    if (route) {
      router.push(route as any);
    }
  }, [router, activeTab]);

  const hasActiveFilters = activeCuisine !== 'all' || activeDietary.length > 0 || activeFilters.minRating || activeFilters.openNow || activeFilters.priceMax;

  const clearAllFilters = useCallback(() => {
    setActiveCuisine('all');
    setActiveDietary([]);
    setActiveFilters({});
    setSortOption('popularity');
  }, []);

  if (!categoryConfig) return null;

  if (isLoading && !refreshing && stores.length === 0) {
    return <LoadingState message="Loading restaurants..." />;
  }

  if (error && stores.length === 0) {
    return (
      <EmptyState
        icon="🍽️"
        title="Unable to load restaurants"
        message={error || "Something went wrong. Please try again."}
        actionLabel="Try Again"
        onAction={refetch}
      />
    );
  }

  return (
    <ErrorBoundary onError={() => { /* silently handle */ }}>
      <ScrollView
        ref={scrollViewRef}
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

        {/* Social Proof Ticker */}
        {recentOrders.length > 0 && (
          <View style={styles.socialProofStrip}>
            <Animated.View style={[styles.socialProofContent, { opacity: fadeAnim }]}>
              <Text style={styles.socialProofEmoji}>👤</Text>
              <Text style={styles.socialProofText}>
                <Text style={styles.socialProofUser}>{(() => {
                  const name = recentOrders[tickerIndex]?.userName;
                  if (!name) return 'Someone';
                  const parts = name.split(' ');
                  return parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : '');
                })()}</Text>
                <Text> just ordered from </Text>
                <Text style={styles.socialProofRestaurant}>{recentOrders[tickerIndex]?.storeName || 'a restaurant'}</Text>
              </Text>
              <Text style={styles.socialProofTime}>{recentOrders[tickerIndex]?.timeAgo || 'recently'}</Text>
            </Animated.View>
          </View>
        )}

        {/* Loyalty Hub CTA */}
        <Pressable
          style={styles.loyaltyHub}
          onPress={() => router.push('/MainCategory/food-dining/loyalty' as any)}
         
          accessibilityLabel="Food Loyalty Hub. Track streaks and unlock rewards."
          accessibilityRole="button"
        >
          <LinearGradient
            colors={['rgba(255, 205, 87, 0.2)', 'rgba(26, 58, 82, 0.2)', 'rgba(251, 191, 36, 0.2)']}
            style={styles.loyaltyHubGradient}
          >
            <View style={styles.loyaltyHubHeader}>
              <View style={styles.loyaltyHubIcon}>
                <Ionicons name="trophy" size={24} color={COLORS.primaryGreen} />
              </View>
              <View style={styles.loyaltyHubText}>
                <Text style={styles.loyaltyHubTitle}>Food Loyalty Hub</Text>
                <Text style={styles.loyaltyHubSubtitle}>Track streaks, unlock rewards</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </View>
            <View style={styles.loyaltyHubStats}>
              <View style={styles.loyaltyHubStat}>
                <Text style={styles.loyaltyHubStatLabel}>Total Visits</Text>
                <Text style={styles.loyaltyHubStatValue}>{loyaltyStats.ordersCount}</Text>
              </View>
              <View style={styles.loyaltyHubStat}>
                <Text style={styles.loyaltyHubStatLabel}>Active Brands</Text>
                <Text style={[styles.loyaltyHubStatValue, { color: COLORS.primaryGold }]}>{loyaltyStats.brandsCount}</Text>
              </View>
              <View style={styles.loyaltyHubStat}>
                <Text style={styles.loyaltyHubStatLabel}>Next Reward</Text>
                <Ionicons name="gift" size={20} color={COLORS.primaryGreen} />
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
            {dynamicTabs.map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                accessibilityLabel={`${tab.label} tab`}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab.id }}
              >
                <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.id ? COLORS.white : COLORS.textSecondary} />
                <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <QuickActionBar categorySlug={slug} actions={foodQuickActions as any} onActionPress={handleQuickAction} />

        <EnhancedAISuggestionsSection
          categorySlug={slug}
          categoryName={
            activeTab === 'offers'
              ? 'Food Offers'
              : activeTab === 'experiences'
                ? 'Food Experiences'
                : activeTab === 'takeaway'
                  ? 'Food Takeaway'
                  : categoryConfig.name
          }
          placeholders={placeholders.length > 0 ? placeholders : aiPlaceholders}
          onSearch={handleAISearch}
        />

        {(activeTab === 'delivery' || activeTab === 'dineIn' || activeTab === 'takeaway') && (
          <BrowseCategoryGrid
            categories={subcategories}
            title="What are you craving?"
            onCategoryPress={handleCategoryPress}
            itemCountLabel="places"
          />
        )}

        {/* ===== Delivery Tab ===== */}
        {activeTab === 'delivery' && (
          <View style={styles.tabContent}>
            {/* Sort & Filter Bar */}
            <View style={styles.sortFilterBar}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortFilterContent}>
                <Pressable style={styles.sortButton} onPress={() => setShowSortModal(true)} accessibilityLabel="Sort restaurants" accessibilityRole="button">
                  <Ionicons name="swap-vertical-outline" size={16} color={COLORS.textPrimary} />
                  <Text style={styles.sortButtonText}>{dynamicSortOptions.find(o => o.id === sortOption)?.label || 'Sort'}</Text>
                  <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
                </Pressable>
                <Pressable
                  style={[styles.filterChip, activeFilters.priceMax ? styles.filterChipActive : null]}
                  onPress={() => setActiveFilters(f => f.priceMax ? { ...f, priceMax: undefined } : { ...f, priceMax: 500 })}
                  accessibilityLabel={`Under ${currencySymbol}500 filter${activeFilters.priceMax ? ', active' : ''}`}
                  accessibilityRole="button"
                >
                  <Text style={[styles.filterChipText, activeFilters.priceMax && styles.filterChipTextActive]}>Under {currencySymbol}500</Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, activeFilters.minRating ? styles.filterChipActive : null]}
                  onPress={() => setActiveFilters(f => f.minRating ? { ...f, minRating: undefined } : { ...f, minRating: 4 })}
                  accessibilityLabel={`4.0+ rating filter${activeFilters.minRating ? ', active' : ''}`}
                  accessibilityRole="button"
                >
                  <Ionicons name="star" size={12} color={activeFilters.minRating ? colors.background.primary : COLORS.primaryGold} />
                  <Text style={[styles.filterChipText, activeFilters.minRating && styles.filterChipTextActive]}>4.0+</Text>
                </Pressable>
                <Pressable
                  style={[styles.filterChip, activeFilters.openNow ? styles.filterChipActive : null]}
                  onPress={() => setActiveFilters(f => f.openNow ? { ...f, openNow: undefined } : { ...f, openNow: true })}
                  accessibilityLabel={`Open now filter${activeFilters.openNow ? ', active' : ''}`}
                  accessibilityRole="button"
                >
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: activeFilters.openNow ? colors.background.primary : colors.success }} />
                  <Text style={[styles.filterChipText, activeFilters.openNow && styles.filterChipTextActive]}>Open Now</Text>
                </Pressable>
              </ScrollView>
            </View>

            {/* Sort Modal */}
            <Modal visible={showSortModal} transparent statusBarTranslucent animationType="slide" onRequestClose={() => setShowSortModal(false)}>
              <Pressable style={styles.modalOverlay} onPress={() => setShowSortModal(false)}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Sort By</Text>
                  {dynamicSortOptions.map(opt => (
                    <Pressable
                      key={opt.id}
                      style={[styles.modalOption, sortOption === opt.id && styles.modalOptionActive]}
                      onPress={() => { setSortOption(opt.id); setShowSortModal(false); }}
                      accessibilityLabel={`Sort by ${opt.label}`}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: sortOption === opt.id }}
                    >
                      <Ionicons name={opt.icon as any} size={20} color={sortOption === opt.id ? COLORS.primaryGold : COLORS.textSecondary} />
                      <Text style={[styles.modalOptionText, sortOption === opt.id && styles.modalOptionTextActive]}>{opt.label}</Text>
                      {sortOption === opt.id && <Ionicons name="checkmark-circle" size={20} color={COLORS.primaryGold} />}
                    </Pressable>
                  ))}
                </View>
              </Pressable>
            </Modal>

            {/* Dietary Toggles */}
            <View style={styles.dietaryStrip}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dietaryContent}>
                {dynamicDietaryOptions.map(opt => {
                  const isActive = activeDietary.includes(opt.id);
                  return (
                    <Pressable
                      key={opt.id}
                      style={[styles.dietaryChip, isActive && { backgroundColor: opt.color }]}
                      onPress={() => setActiveDietary(prev => isActive ? prev.filter(d => d !== opt.id) : [...prev, opt.id])}
                      accessibilityLabel={`${opt.label} dietary filter${isActive ? ', active' : ''}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.dietaryIcon}>{opt.icon}</Text>
                      <Text style={[styles.dietaryLabel, isActive && { color: colors.background.primary, fontWeight: '600' }]}>{opt.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Clear All Filters Bar */}
            {hasActiveFilters && (
              <View style={styles.clearFiltersBar}>
                <Ionicons name="funnel-outline" size={14} color={COLORS.primaryGold} />
                <Text style={styles.clearFiltersText}>Filters active</Text>
                <Pressable onPress={clearAllFilters} style={styles.clearFiltersBtn} accessibilityLabel="Clear all filters" accessibilityRole="button">
                  <Ionicons name="close-circle" size={14} color={colors.error} />
                  <Text style={styles.clearFiltersBtnText}>Clear All</Text>
                </Pressable>
              </View>
            )}

            {/* Cuisine Filters */}
            <View style={styles.cuisineContainer}>
              <Text style={styles.cuisineTitle}>What are you craving?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cuisineFilters}>
                {(realCuisineFilters.length > 1 ? realCuisineFilters : foodCategoryData.cuisineFilters).map((cuisine) => (
                  <Pressable
                    key={cuisine.id}
                    onPress={() => setActiveCuisine(cuisine.id)}
                    style={[styles.cuisineChip, activeCuisine === cuisine.id && styles.cuisineChipActive]}
                    accessibilityLabel={`${cuisine.label} cuisine filter${activeCuisine === cuisine.id ? ', selected' : ''}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.cuisineIcon}>{cuisine.icon}</Text>
                    <Text style={[styles.cuisineLabel, activeCuisine === cuisine.id && styles.cuisineLabelActive]}>{cuisine.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Curated Collections */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>✨</Text>
                <Text style={styles.sectionTitle}>Curated for You</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.restaurantsList}>
                {dynamicCuratedCollections.map(col => (
                  <Pressable
                    key={col.id}
                    style={styles.curatedCard}
                    onPress={() => router.push(`/MainCategory/food-dining/search?tags=${col.tags}` as any)}
                   
                    accessibilityLabel={`${col.title} collection. ${col.subtitle}`}
                    accessibilityRole="button"
                  >
                    <LinearGradient colors={[...col.gradient]} style={styles.curatedGradient}>
                      <Text style={styles.curatedIconText}>{col.icon}</Text>
                      <Text style={styles.curatedTitle}>{col.title}</Text>
                      <Text style={styles.curatedSubtitle}>{col.subtitle}</Text>
                    </LinearGradient>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Order Again */}
            {myOrders.length > 0 ? <OrderAgainSection orders={myOrders} /> : null}

            {/* Personalized: Recently Viewed, Favorites, Nearby */}
            <PersonalizedSections />

            {/* Popular Dishes */}
            {isLoadingDishes ? (
              <View style={styles.section}>
                <SectionHeaderSkeleton />
                <DishCardSkeleton />
              </View>
            ) : popularDishes.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEmoji}>🔥</Text>
                  <Text style={styles.sectionTitle}>Popular Dishes</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.restaurantsList}>
                  {popularDishes.map((dish: any) => (
                    <DishCard key={dish._id || dish.id} dish={dish} currencySymbol={currencySymbol} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Compare Restaurants */}
            {filteredStores.length >= 2 && (
              <View onLayout={(e) => { compareSectionY.current = e.nativeEvent.layout.y; }}>
                <RestaurantCompareSection
                  restaurants={filteredStores}
                  currencySymbol={currencySymbol}
                  onSaveComparison={handleSaveComparison}
                />
              </View>
            )}

            {/* 60-Min Delivery */}
            {isLoading ? (
              <View style={styles.section}>
                <SectionHeaderSkeleton />
                <RestaurantCardSkeleton count={3} variant="compact" />
              </View>
            ) : fastDeliveryStores.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="flash-outline" size={20} color={COLORS.primaryGold} />
                  <Text style={styles.sectionTitle}>60-Min Delivery</Text>
                  <Pressable onPress={() => router.push('/MainCategory/food-dining/fast-delivery' as any)} accessibilityLabel="View all fast delivery restaurants" accessibilityRole="link">
                    <Text style={styles.sectionSeeAll}>View All</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.restaurantsList}>
                  {fastDeliveryStores.slice(0, 5).map((store) => (
                    <RestaurantCard key={store._id || store.id} restaurant={store} variant="compact" userVisitCount={visitCounts[store._id || store.id] || 0} />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Top Rated */}
            {isLoading ? (
              <View style={styles.section}>
                <SectionHeaderSkeleton />
                <RestaurantCardSkeleton count={2} />
              </View>
            ) : topRatedStores.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="star-outline" size={20} color={COLORS.primaryGold} />
                  <Text style={styles.sectionTitle}>Top Rated Near You</Text>
                  <Pressable onPress={() => router.push('/MainCategory/food-dining/top-rated' as any)} accessibilityLabel="View all top rated restaurants" accessibilityRole="link">
                    <Text style={styles.sectionSeeAll}>View All</Text>
                  </Pressable>
                </View>
                <View style={styles.restaurantsGrid}>
                  {topRatedStores.slice(0, 4).map((store) => (
                    <RestaurantCard key={store._id || store.id} restaurant={store} userVisitCount={visitCounts[store._id || store.id] || 0} />
                  ))}
                </View>
              </View>
            ) : null}

            {/* New on App */}
            {isLoadingNewStores ? (
              <View style={styles.section}>
                <SectionHeaderSkeleton />
                <RestaurantCardSkeleton count={3} variant="compact" />
              </View>
            ) : filteredNewStores.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="sparkles-outline" size={20} color={COLORS.primaryGold} />
                  <Text style={styles.sectionTitle}>New on {BRAND.APP_NAME}</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.restaurantsList}>
                  {filteredNewStores.map((store: any) => (
                    <RestaurantCard key={store._id || store.id} restaurant={store} variant="compact" showNewBadge />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Top Reviews */}
            <View style={styles.section}>
              <ReviewsSection maxItems={6} />
            </View>

            {/* All Restaurants (with pagination) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="restaurant-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.sectionTitle}>All Restaurants</Text>
                <Text style={styles.sectionCount}>{filteredStores.length}+ places</Text>
              </View>

              <View style={styles.restaurantsGrid}>
                {isLoading ? (
                  <RestaurantCardSkeleton count={3} />
                ) : (
                  <>
                    {filteredStores.slice(0, RESTAURANTS_PER_PAGE).map((store) => (
                      <RestaurantCard key={store._id || store.id} restaurant={store} userVisitCount={visitCounts[store._id || store.id] || 0} />
                    ))}
                    {extraStores.map((store) => (
                      <RestaurantCard key={store._id || store.id} restaurant={store} userVisitCount={visitCounts[store._id || store.id] || 0} />
                    ))}
                    {hasMoreRestaurants && (
                      <Pressable style={styles.loadMoreButton} onPress={loadMoreRestaurants} disabled={isLoadingMore} accessibilityLabel="Load more restaurants" accessibilityRole="button">
                        {isLoadingMore ? (
                          <ActivityIndicator size="small" color={COLORS.primaryGold} />
                        ) : (
                          <Text style={styles.loadMoreText}>Load More Restaurants</Text>
                        )}
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ===== Dine-In Tab ===== */}
        {activeTab === 'dineIn' && (
          <View style={styles.tabContent}>
            <Pressable
              style={styles.bookTableBanner}
              onPress={() => router.push('/MainCategory/food-dining/book-table' as any)}
             
              accessibilityLabel="Book a table. Reserve and earn cashback on dine-in."
              accessibilityRole="button"
            >
              <LinearGradient colors={[colors.nileBlue, '#0f2638']} style={styles.bookTableGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.bookTableRow}>
                  <View style={styles.bookTableLeft}>
                    <View style={styles.bookTableIconWrap}>
                      <Ionicons name="restaurant-outline" size={20} color={colors.warningScale[400]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookTableTitle}>Book a Table</Text>
                      <Text style={styles.bookTableSubtitle}>Reserve & earn cashback on dine-in</Text>
                    </View>
                  </View>
                  <View style={styles.bookTableCTA}>
                    <Ionicons name="chevron-forward" size={18} color={colors.nileBlue} />
                  </View>
                </View>
                <View style={styles.bookTablePerks}>
                  <View style={styles.bookTablePerk}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.successScale[400]} />
                    <Text style={styles.bookTablePerkText}>No pre-payment</Text>
                  </View>
                  <View style={styles.bookTablePerk}>
                    <Ionicons name="wallet-outline" size={14} color={colors.warningScale[400]} />
                    <Text style={styles.bookTablePerkText}>Bonus coins on check-in</Text>
                  </View>
                  <View style={styles.bookTablePerk}>
                    <Ionicons name="time-outline" size={14} color={colors.infoScale[400]} />
                    <Text style={styles.bookTablePerkText}>Instant confirmation</Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>

            {/* My Bookings */}
            {myBookings.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.primaryGold} />
                  <Text style={styles.sectionTitle}>My Bookings</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.restaurantsList}>
                  {myBookings.map((booking: any) => {
                    const statusColors: Record<string, string> = { confirmed: colors.success, pending: colors.warningScale[400], completed: colors.infoScale[400], cancelled: colors.error, no_show: colors.neutral[500] };
                    const statusColor = statusColors[booking.status] || colors.neutral[500];
                    return (
                      <View key={booking._id} style={styles.bookingCard}>
                        <View style={styles.bookingCardHeader}>
                          <View style={[styles.bookingStatusDot, { backgroundColor: statusColor }]} />
                          <Text style={[styles.bookingStatusText, { color: statusColor }]}>{booking.status}</Text>
                        </View>
                        <Text style={styles.bookingStoreName} numberOfLines={1}>{booking.storeName || 'Restaurant'}</Text>
                        <View style={styles.bookingDetailRow}>
                          <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
                          <Text style={styles.bookingDetailText}>{booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : '-'}</Text>
                        </View>
                        <View style={styles.bookingDetailRow}>
                          <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
                          <Text style={styles.bookingDetailText}>{booking.bookingTime || '-'}</Text>
                        </View>
                        <View style={styles.bookingDetailRow}>
                          <Ionicons name="people-outline" size={12} color={COLORS.textSecondary} />
                          <Text style={styles.bookingDetailText}>{booking.partySize} guests</Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {isDineInFallback && (
              <View style={styles.dineInFallbackBanner}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.primaryGold} />
                <Text style={styles.dineInFallbackText}>
                  No dine-in tagged restaurants yet. Showing all nearby restaurants.
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{isDineInFallback ? 'All Restaurants' : 'Dine-In Nearby'}</Text>
                <Text style={styles.sectionCount}>{dineInStores.length} places</Text>
              </View>
              <View style={styles.restaurantsGrid}>
                {dineInStores.map((store) => (
                  <RestaurantCard key={store._id || store.id} restaurant={store} showReserveButton={!isDineInFallback} userVisitCount={visitCounts[store._id || store.id] || 0} />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ===== Takeaway Tab ===== */}
        {activeTab === 'takeaway' && (
          <View style={styles.tabContent}>
            {isTakeawayFallback && (
              <View style={styles.dineInFallbackBanner}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.primaryGold} />
                <Text style={styles.dineInFallbackText}>
                  No takeaway tagged restaurants yet. Showing all nearby restaurants.
                </Text>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bag-handle-outline" size={20} color={COLORS.primaryGold} />
                <Text style={styles.sectionTitle}>{isTakeawayFallback ? 'All Restaurants' : 'Takeaway Nearby'}</Text>
                <Text style={styles.sectionCount}>{takeawayStores.length} places</Text>
              </View>
              <View style={styles.restaurantsGrid}>
                {takeawayStores.map((store) => (
                  <RestaurantCard
                    key={store._id || store.id}
                    restaurant={store}
                    userVisitCount={visitCounts[store._id || store.id] || 0}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ===== Offers Tab ===== */}
        {activeTab === 'offers' && (
          <View style={styles.tabContent}>
            <OffersSection categorySlug={slug} />
          </View>
        )}

        {/* ===== Experiences Tab ===== */}
        {activeTab === 'experiences' && (
          <View style={styles.tabContent}>
            <ExperiencesSection categorySlug={slug} pageConfig={pageConfig} />
          </View>
        )}

        {/* Value Proposition + Savings */}
        <View style={styles.valuePropCard}>
          <LinearGradient colors={[colors.nileBlue, '#0f2638']} style={styles.valuePropGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.valuePropTitle}>
              Every meal is rewarding with <Text style={styles.valuePropBrand}>{BRAND.APP_NAME}</Text>
            </Text>
            <View style={styles.valuePropGrid}>
              {[
                { icon: 'cash-outline' as const, text: 'Cashback on every order', color: colors.successScale[400] },
                { icon: 'wallet-outline' as const, text: 'Earn coins to reuse', color: colors.warningScale[400] },
                { icon: 'phone-portrait-outline' as const, text: 'Pay at restaurant', color: colors.infoScale[400] },
                { icon: 'gift-outline' as const, text: 'Loyalty rewards', color: '#F472B6' },
              ].map((item, i) => (
                <View key={i} style={styles.valuePropItem}>
                  <View style={[styles.valuePropIconWrap, { backgroundColor: `${item.color}20` }]}>
                    <Ionicons name={item.icon} size={16} color={item.color} />
                  </View>
                  <Text style={styles.valuePropText}>{item.text}</Text>
                </View>
              ))}
            </View>
            <View style={styles.savingsRow}>
              <View style={styles.savingsLeft}>
                <Text style={styles.savingsLabel}>Saved this month</Text>
                <Text style={styles.savingsAmount}>{savingsThisMonth.toLocaleString()} {BRAND.CURRENCY_CODE}</Text>
              </View>
              <Pressable
                style={styles.savingsButton}
                onPress={() => router.push('/MainCategory/food-dining/loyalty/coins' as any)}
               
                accessibilityLabel={`View savings details. Saved ${savingsThisMonth} ${BRAND.COIN_NAME} this month.`}
                accessibilityRole="button"
              >
                <Text style={styles.savingsButtonText}>View Details</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.nileBlue} />
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        <StreakLoyaltySection categorySlug={slug} primaryColor={COLORS.primaryGreen} />

        <EnhancedUGCSocialProofSection
          categorySlug={slug}
          categoryName={categoryConfig.name}
          posts={ugcPosts}
          title="Real Foodies, Real Reviews"
          subtitle="See what others are eating - Get inspired!"
          onPostPress={(post) => router.push(`/ugc/${post.id}` as any)}
          onSharePress={() => router.push('/share' as any)}
          onViewAllPress={() => router.push('/MainCategory/food-dining/food-stories' as any)}
        />

        <FooterTrustSection categorySlug={slug} />
      </ScrollView>
    </ErrorBoundary>
  );
}

// ===== Styles =====
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 100,
  },
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
    color: COLORS.textPrimary,
  },
  socialProofRestaurant: {
    color: COLORS.primaryGreen,
    fontWeight: '500',
  },
  socialProofTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
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
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  loyaltyHubSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  loyaltyHubStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tabsContainer: {
    backgroundColor: COLORS.white,
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
  tabActive: {
    backgroundColor: COLORS.primaryGreen,
  },
  tabLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  tabContent: {
    paddingTop: 16,
  },
  cuisineContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cuisineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  cuisineFilters: {
    gap: 8,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: 6,
  },
  cuisineChipActive: {
    backgroundColor: COLORS.primaryGreen,
  },
  cuisineIcon: {
    fontSize: 16,
  },
  cuisineLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cuisineLabelActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
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
    color: COLORS.textPrimary,
  },
  sectionSeeAll: {
    fontSize: 12,
    color: COLORS.primaryGreen,
    fontWeight: '500',
  },
  sectionCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  restaurantsList: {
    gap: 12,
    paddingRight: 16,
  },
  restaurantsGrid: {
    gap: 16,
  },
  sortFilterBar: {
    backgroundColor: COLORS.white,
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
    color: COLORS.textPrimary,
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
    backgroundColor: COLORS.primaryGold,
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.background.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
    color: COLORS.textPrimary,
  },
  modalOptionTextActive: {
    fontWeight: '600',
    color: COLORS.primaryGold,
  },
  dietaryStrip: {
    paddingVertical: 8,
    backgroundColor: COLORS.white,
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
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  curatedCard: {
    width: 160,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
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
  loadMoreButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryGold,
  },
  bookTableBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 6 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.15)' },
    }),
  },
  bookTableGradient: {
    padding: 18,
  },
  bookTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  bookTableLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bookTableIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(251,191,36,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookTableTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.background.primary,
  },
  bookTableSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  bookTableCTA: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.warningScale[400],
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookTablePerks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bookTablePerk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bookTablePerkText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
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
  // Clear All Filters bar
  clearFiltersBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.tint.amberLight,
    borderRadius: 10,
    gap: 6,
  },
  clearFiltersText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: colors.brand.amberDark,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.warningScale[200],
  },
  clearFiltersBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.amberDark,
  },
  // Dine-In fallback banner
  dineInFallbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.tint.amberLight,
    borderRadius: 10,
    gap: 8,
  },
  dineInFallbackText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: colors.brand.amberDark,
  },
  // Booking cards
  bookingCard: {
    width: 160,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  bookingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  bookingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bookingStatusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  bookingStoreName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: 6,
  },
  bookingDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  bookingDetailText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
});

export default React.memo(FoodDiningCategoryPage);
