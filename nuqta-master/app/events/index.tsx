// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Events Page - Main events hub
 * Connected to /api/events
 * Categories and reward info loaded dynamically from backend
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
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import eventsApiService from '@/services/eventsApi';
import { EventItem } from '@/types/homepage.types';
import { EVENT_COLORS } from '@/constants/EventColors';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = EVENT_COLORS;

// Fallback categories used when backend categories aren't available yet
const FALLBACK_CATEGORIES = [
  { slug: 'movies', name: 'Movies', icon: '\uD83C\uDFAC', color: colors.error },
  { slug: 'concerts', name: 'Concerts', icon: '\uD83C\uDFB5', color: colors.brand.purpleLight },
  { slug: 'parks', name: 'Parks', icon: '\uD83C\uDFA2', color: colors.successScale[400] },
  { slug: 'workshops', name: 'Workshops', icon: '\uD83C\uDFA8', color: colors.warningScale[400] },
  { slug: 'gaming', name: 'Gaming', icon: '\uD83C\uDFAE', color: colors.infoScale[400] },
  { slug: 'sports', name: 'Sports', icon: '\u26BD', color: colors.error },
];

interface DisplayEvent {
  id: string;
  title: string;
  type: string;
  date: string;
  location?: string;
  price: string;
  image: string;
  cashback?: string;
  rating?: number;
  reviewCount?: number;
  isOnline?: boolean;
}

interface CategoryItem {
  _id?: string;
  slug: string;
  name: string;
  icon: string;
  color: string;
  eventCount?: number;
}

const EventsPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featuredEvents, setFeaturedEvents] = useState<DisplayEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DisplayEvent[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [rewardConfig, setRewardConfig] = useState<{
    rewards: Array<{ action: string; coins: number; description: string }>;
    totalPotential: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const transformEventToDisplay = (event: EventItem): DisplayEvent => {
    const cashbackValue = (event as any).cashback;
    const cashbackText = cashbackValue && cashbackValue > 0 ? `${cashbackValue}%` : undefined;

    const isOnline = (event as any).isOnline || (event.location as any)?.isOnline;
    const displayCurrency = isOnline ? currencySymbol : (event.price?.currency || currencySymbol);

    return {
      id: event.id,
      title: event.title,
      type: event.category || 'Event',
      date: event.date ? new Date(event.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'TBD',
      location: typeof event.location === 'string' ? event.location : (event.location as any)?.name || 'Venue',
      price: event.price?.isFree ? 'Free' : `${displayCurrency}${event.price?.amount || 0}`,
      image: event.image,
      cashback: cashbackText,
      rating: (event as any).rating,
      reviewCount: (event as any).reviewCount,
      isOnline,
    };
  };

  const fetchEvents = useCallback(async () => {
    try {
      setError(null);

      // Fetch categories, reward config, featured, and upcoming in parallel
      const [categoriesResult, rewardResult, featured, upcoming] = await Promise.allSettled([
        eventsApiService.getCategories(),
        eventsApiService.getGlobalRewardConfig(),
        eventsApiService.getFeaturedEvents(6),
        eventsApiService.getEvents({ upcoming: true, todayAndFuture: true }, 10, 0),
      ]);

      // Set categories (use backend if available, fallback otherwise)
      const categoriesData = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
      if (categoriesData && categoriesData.length > 0) {
        setCategories(categoriesData);
      } else {
        if (!isMounted()) return;
        setCategories(FALLBACK_CATEGORIES);
      }

      // Set reward config
      const rewardData = rewardResult.status === 'fulfilled' ? rewardResult.value : null;
      if (rewardData) {
        setRewardConfig(rewardData);
      }

      // Set featured events
      const featuredData = featured.status === 'fulfilled' ? featured.value : [];
      if (featuredData && featuredData.length > 0) {
        setFeaturedEvents(featuredData.slice(0, 5).map(transformEventToDisplay));
      } else {
        if (!isMounted()) return;
        setFeaturedEvents([]);
      }

      // Set upcoming events
      const upcomingData = upcoming.status === 'fulfilled' ? upcoming.value : { events: [], total: 0, hasMore: false };
      if (upcomingData && upcomingData.events && upcomingData.events.length > 0) {
        setUpcomingEvents(upcomingData.events.slice(0, 8).map(transformEventToDisplay));
      } else {
        if (!isMounted()) return;
        setUpcomingEvents([]);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load events. Please try again.');
      if (!isMounted()) return;
      setFeaturedEvents([]);
      if (!isMounted()) return;
      setUpcomingEvents([]);
      if (!isMounted()) return;
      setCategories(FALLBACK_CATEGORIES);
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEvents();
  }, [fetchEvents]);

  const handleCategoryPress = (slug: string) => {
    router.push(`/events/${slug}` as any);
  };

  const handleEventPress = (eventId: string) => {
    router.push({ pathname: '/EventPage', params: { id: eventId } } as any);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/events-list?search=${encodeURIComponent(searchQuery.trim())}` as any);
    } else {
      router.push('/events-list' as any);
    }
  };

  // Build dynamic reward text for promo banner
  const getRewardText = () => {
    if (rewardConfig && rewardConfig.totalPotential > 0) {
      return `Earn up to ${rewardConfig.totalPotential} coins per event`;
    }
    return 'Earn coins at every event';
  };

  const getRewardActions = () => {
    if (rewardConfig && rewardConfig.rewards.length > 0) {
      return rewardConfig.rewards
        .slice(0, 4)
        .map(r => r.description || r.action.replace(/_/g, ' '))
        .join('  \u2022  ');
    }
    return 'Book  \u2022  Check-in  \u2022  Share  \u2022  Review';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <CardGridSkeleton />
      </View>
    );
  }

  // Error state
  if (error && featuredEvents.length === 0 && upcomingEvents.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.nileBlue, Colors.secondary[500]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Events & Experiences</Text>
              <Text style={styles.headerSubtitle}>Book tickets, earn coins</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          </View>
          <Text style={styles.errorTitle}>Unable to Load Events</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              setIsLoading(true);
              fetchEvents();
            }}
           
          >
            <Ionicons name="refresh-outline" size={20} color={Colors.text.inverse} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const displayCategories = categories.length > 0 ? categories : FALLBACK_CATEGORIES;

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.nileBlue, Colors.secondary[500]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Events & Experiences</Text>
            <Text style={styles.headerSubtitle}>Book tickets, earn coins</Text>
          </View>
          <Pressable style={styles.searchIconBtn} onPress={() => router.push('/events-list' as any)}>
            <Ionicons name="search" size={22} color={Colors.text.inverse} />
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Pressable
            style={styles.searchBar}
            onPress={() => router.push('/events-list' as any)}
           
          >
            <Ionicons name="search" size={18} color={Colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events, concerts, movies..."
              placeholderTextColor={colors.neutral[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={Colors.text.tertiary} />
              </Pressable>
            )}
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[Colors.nileBlue]} />
        }
      >
        {/* Categories - Horizontal scroll, compact */}
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Browse Categories</Text>
            <Pressable onPress={() => router.push('/events-list' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {displayCategories.map((cat) => (
              <Pressable
                key={cat.slug}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(cat.slug)}
               
              >
                <View style={[styles.categoryIcon, { backgroundColor: `${cat.color}15` }]}>
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                </View>
                <Text style={styles.categoryTitle} numberOfLines={1}>{cat.name}</Text>
                {cat.eventCount !== undefined && cat.eventCount > 0 ? (
                  <Text style={styles.categoryCount}>
                    {cat.eventCount} {cat.eventCount === 1 ? 'event' : 'events'}
                  </Text>
                ) : (
                  <Text style={[styles.categoryCount, { color: Colors.border.dark }]}>Browse</Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Earn Coins Banner */}
        {rewardConfig && rewardConfig.totalPotential > 0 && (
          <View style={styles.promoBanner}>
            <LinearGradient
              colors={[Colors.nileBlue, Colors.secondary[500]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.promoGradient}
            >
              <View style={styles.promoLeft}>
                <View style={styles.promoIconCircle}>
                  <Ionicons name="gift" size={20} color={Colors.gold} />
                </View>
              </View>
              <View style={styles.promoContent}>
                <Text style={styles.promoTitle}>{getRewardText()}</Text>
                <Text style={styles.promoActions}>{getRewardActions()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.5)" />
            </LinearGradient>
          </View>
        )}

        {/* Featured Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Events</Text>
            <Pressable onPress={() => router.push('/events-list' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>
          {featuredEvents.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}>
              {featuredEvents.map((event) => (
                <Pressable
                  key={event.id}
                  style={styles.featuredCard}
                  onPress={() => handleEventPress(event.id)}
                 
                >
                  <CachedImage source={event.image} style={styles.featuredImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.featuredOverlay}
                  >
                    <View style={styles.featuredBadges}>
                      {event.cashback && (
                        <View style={styles.cashbackBadge}>
                          <Text style={styles.cashbackText}>{event.cashback} Cashback</Text>
                        </View>
                      )}
                      <View style={[styles.featuredPriceBadge, event.price === 'Free' && styles.featuredPriceFree]}>
                        <Text style={styles.featuredPriceText}>{event.price}</Text>
                      </View>
                    </View>
                    <Text style={styles.featuredTitle} numberOfLines={2}>{event.title}</Text>
                    <View style={styles.featuredMeta}>
                      <View style={styles.featuredMetaItem}>
                        <Ionicons name="calendar" size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.featuredMetaText}>{event.date}</Text>
                      </View>
                      <View style={styles.featuredMetaDot} />
                      <View style={styles.featuredMetaItem}>
                        <Ionicons name={event.isOnline ? "globe" : "location"} size={12} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.featuredMetaText} numberOfLines={1}>
                          {event.isOnline ? 'Online' : event.location}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No featured events at the moment</Text>
            </View>
          )}
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <Pressable onPress={() => router.push('/events-list' as any)}>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <Pressable
                key={event.id}
                style={styles.eventCard}
                onPress={() => handleEventPress(event.id)}
               
              >
                <CachedImage source={event.image} style={styles.eventImage} />
                <View style={styles.eventInfo}>
                  <View style={styles.eventTopRow}>
                    <View style={styles.eventTypeBadge}>
                      <Text style={styles.eventTypeText}>{event.type}</Text>
                    </View>
                    {event.isOnline && (
                      <View style={styles.eventOnlineBadge}>
                        <Ionicons name="globe" size={10} color={Colors.text.inverse} />
                        <Text style={styles.eventOnlineText}>Online</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                  <View style={styles.eventDateRow}>
                    <Ionicons name="calendar-outline" size={12} color={Colors.text.tertiary} />
                    <Text style={styles.eventDate}>{event.date}</Text>
                  </View>
                </View>
                <View style={styles.eventPriceContainer}>
                  <Text style={[
                    styles.eventPrice,
                    event.price === 'Free' && styles.eventPriceFree,
                  ]}>{event.price}</Text>
                  <View style={styles.eventArrow}>
                    <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptySection}>
              <Ionicons name="ticket-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No upcoming events scheduled</Text>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textMuted,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 20,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  searchIconBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    marginTop: Spacing.base,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    padding: 0,
  },

  // Categories
  categoriesSection: {
    paddingTop: 20,
    paddingBottom: 4,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 10,
  },
  categoryCard: {
    width: 80,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    ...Shadows.subtle,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryTitle: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 9,
    color: Colors.text.tertiary,
    marginTop: 2,
    fontWeight: '500',
  },

  // Section
  section: {
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  viewAllText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.nileBlue,
  },

  // Featured Cards
  featuredCard: {
    width: SCREEN_WIDTH * 0.72,
    height: 210,
    marginRight: 12,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.border.default,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    paddingTop: 40,
  },
  featuredBadges: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  cashbackBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cashbackText: {
    ...Typography.overline,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  featuredPriceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  featuredPriceFree: {
    backgroundColor: Colors.gold,
  },
  featuredPriceText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  featuredTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: 6,
    lineHeight: 20,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featuredMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 8,
  },
  featuredMetaText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    maxWidth: 100,
  },

  // Upcoming Event Cards
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    ...Shadows.subtle,
  },
  eventImage: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.border.default,
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  eventTypeBadge: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eventTypeText: {
    ...Typography.overline,
    fontWeight: '600',
    color: Colors.text.tertiary,
    textTransform: 'capitalize',
  },
  eventOnlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  eventOnlineText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  eventTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 4,
    lineHeight: 18,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDate: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  eventPriceContainer: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  eventPrice: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 6,
  },
  eventPriceFree: {
    color: Colors.success,
  },
  eventArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Promo Banner
  promoBanner: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  promoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  promoLeft: {},
  promoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,205,87,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: 2,
  },
  promoActions: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.errorScale[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // Empty
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default withErrorBoundary(EventsPage, 'EventsIndex');
