// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Events Category Page - Dynamic route for event categories
 * Connected to /api/events/category/:category
 * Category metadata loaded dynamically from backend
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import eventsApiService from '@/services/eventsApi';
import { EventItem } from '@/types/homepage.types';
import { EVENT_COLORS } from '@/constants/EventColors';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = EVENT_COLORS;

// Fallback category configurations (used when backend metadata not available)
const FALLBACK_CATEGORY_CONFIG: Record<string, { title: string; icon: string; gradientColors: readonly [string, string] }> = {
  movies: { title: 'Movies', icon: '\uD83C\uDFAC', gradientColors: EVENT_COLORS.categoryGradients.movies },
  concerts: { title: 'Concerts', icon: '\uD83C\uDFB5', gradientColors: EVENT_COLORS.categoryGradients.concerts },
  parks: { title: 'Theme Parks', icon: '\uD83C\uDFA2', gradientColors: EVENT_COLORS.categoryGradients.parks },
  workshops: { title: 'Workshops', icon: '\uD83C\uDFA8', gradientColors: EVENT_COLORS.categoryGradients.workshops },
  gaming: { title: 'Gaming', icon: '\uD83C\uDFAE', gradientColors: EVENT_COLORS.categoryGradients.gaming },
  sports: { title: 'Sports Events', icon: '\u26BD', gradientColors: EVENT_COLORS.categoryGradients.sports },
  entertainment: { title: 'Entertainment', icon: '\uD83C\uDFAD', gradientColors: EVENT_COLORS.categoryGradients.entertainment },
  arts: { title: 'Arts & Culture', icon: '\uD83C\uDFA8', gradientColors: EVENT_COLORS.categoryGradients.arts },
  music: { title: 'Music', icon: '\uD83C\uDFB5', gradientColors: EVENT_COLORS.categoryGradients.music },
};

type DateFilter = 'all' | 'today' | 'thisWeek' | 'thisMonth';

interface DisplayEvent {
  id: string;
  title: string;
  venue: string;
  time: string;
  price: string;
  rating: number;
  reviewCount: number;
  image: string;
  cashback?: string;
  date: string;
}

const EventsCategoryPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { category } = useLocalSearchParams<{ category: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [selectedFilter, setSelectedFilter] = useState<DateFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [categoryMeta, setCategoryMeta] = useState<{
    name: string;
    icon: string;
    color: string;
    gradient: string[];
  } | null>(null);

  const categoryKey = category?.toLowerCase() || 'movies';
  const fallbackConfig = FALLBACK_CATEGORY_CONFIG[categoryKey] || FALLBACK_CATEGORY_CONFIG.movies;

  // Effective display values (backend metadata > fallback)
  const displayTitle = categoryMeta?.name || fallbackConfig.title;
  const displayIcon = categoryMeta?.icon || fallbackConfig.icon;
  const displayGradient = categoryMeta?.gradient || fallbackConfig.gradientColors;

  const filters: { id: DateFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'thisWeek', label: 'This Week' },
    { id: 'thisMonth', label: 'This Month' },
  ];

  const transformEventToDisplay = (event: EventItem): DisplayEvent => {
    const cashbackValue = (event as any).cashback;
    const cashbackText = cashbackValue && cashbackValue > 0 ? `${cashbackValue}%` : undefined;

    const locationName = typeof event.location === 'string'
      ? event.location
      : (event.location as any)?.name || 'Venue';

    const isOnline = (event as any).isOnline || (event.location as any)?.isOnline;
    const displayCurrency = isOnline ? currencySymbol : (event.price?.currency || currencySymbol);

    return {
      id: event.id,
      title: event.title,
      venue: locationName,
      time: event.time || 'TBD',
      date: event.date ? new Date(event.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'TBD',
      price: event.price?.isFree ? 'Free' : `${displayCurrency}${event.price?.amount || 0}`,
      rating: (event as any).rating || 0,
      reviewCount: (event as any).reviewCount || 0,
      image: event.image || undefined,
      cashback: cashbackText,
    };
  };

  const fetchEvents = useCallback(async (filter: DateFilter = 'all') => {
    try {
      setError(null);

      // Fetch category metadata and events in parallel — pass date filter to backend
      const [categoriesResult, result] = await Promise.all([
        eventsApiService.getCategories().catch(() => []),
        eventsApiService.getEventsByCategory(categoryKey, 20, 0, filter),
      ]);

      // Find this category's metadata from backend
      if (categoriesResult && categoriesResult.length > 0) {
        const found = categoriesResult.find((c: any) => c.slug === categoryKey);
        if (found) {
          setCategoryMeta({
            name: found.name,
            icon: found.icon,
            color: found.color,
            gradient: found.gradient
              ? (Array.isArray(found.gradient) ? found.gradient : found.gradient.split(','))
              : (fallbackConfig.gradientColors as unknown as string[]),
          });
        }
      }

      if (result && result.events && result.events.length > 0) {
        if (!isMounted()) return;
        setEvents(result.events.map(transformEventToDisplay));
        if (!isMounted()) return;
        setTotalEvents(result.total || result.events.length);
      } else {
        if (!isMounted()) return;
        setEvents([]);
        if (!isMounted()) return;
        setTotalEvents(0);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load events. Please try again.');
      if (!isMounted()) return;
      setEvents([]);
      if (!isMounted()) return;
      setTotalEvents(0);
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [categoryKey]);

  useEffect(() => {
    setIsLoading(true);
    fetchEvents(selectedFilter);
  }, [categoryKey]);

  const handleFilterChange = useCallback((filter: DateFilter) => {
    setSelectedFilter(filter);
    setIsLoading(true);
    fetchEvents(filter);
  }, [fetchEvents]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchEvents(selectedFilter);
  }, [fetchEvents, selectedFilter]);

  const handleEventPress = (eventId: string) => {
    router.push({ pathname: '/EventPage', params: { id: eventId } } as any);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Stack.Screen options={{ headerShown: false }} />
        <CardGridSkeleton />
      </View>
    );
  }

  // Error state
  if (error && events.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <LinearGradient
          colors={displayGradient as unknown as string[]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.background} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{displayIcon} {displayTitle}</Text>
              <Text style={styles.headerSubtitle}>Events</Text>
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
              fetchEvents(selectedFilter);
            }}
           
          >
            <Ionicons name="refresh-outline" size={20} color={COLORS.background} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <LinearGradient
        colors={displayGradient as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.background} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{displayIcon} {displayTitle}</Text>
            <Text style={styles.headerSubtitle}>{totalEvents} events available</Text>
          </View>
          <Pressable style={styles.searchButton} onPress={() => router.push('/events-list' as any)}>
            <Ionicons name="search" size={24} color={COLORS.background} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {filters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => handleFilterChange(filter.id)}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && styles.filterChipActive
              ]}
            >
              <Text style={[
                styles.filterChipText,
                selectedFilter === filter.id && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Events List */}
        <View style={styles.eventsList}>
          {events.length > 0 ? (
            events.map((event) => (
              <Pressable
                key={event.id}
                style={styles.eventCard}
                onPress={() => handleEventPress(event.id)}
               
              >
                <CachedImage source={event.image} style={styles.eventImage} />
                {event.cashback && (
                  <View style={styles.cashbackBadge}>
                    <Text style={styles.cashbackText}>{event.cashback} Cashback</Text>
                  </View>
                )}
                <View style={styles.eventInfo}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <View style={styles.eventMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{event.venue}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{event.date} {'\u2022'} {event.time}</Text>
                    </View>
                  </View>
                  <View style={styles.eventFooter}>
                    {event.rating > 0 ? (
                      <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={14} color={COLORS.star} />
                        <Text style={styles.ratingText}>{event.rating.toFixed(1)}</Text>
                        {event.reviewCount > 0 && (
                          <Text style={styles.reviewCount}>({event.reviewCount})</Text>
                        )}
                      </View>
                    ) : (
                      <View style={styles.ratingContainer}>
                        <Text style={styles.noRatingText}>No reviews yet</Text>
                      </View>
                    )}
                    <Text style={styles.priceText}>{event.price}</Text>
                  </View>
                </View>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{displayIcon}</Text>
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptySubtitle}>
                {selectedFilter !== 'all'
                  ? `No ${displayTitle.toLowerCase()} scheduled for ${filters.find(f => f.id === selectedFilter)?.label.toLowerCase()}`
                  : `Check back later for upcoming ${displayTitle.toLowerCase()}`}
              </Text>
              {selectedFilter !== 'all' && (
                <Pressable
                  style={styles.clearFilterButton}
                  onPress={() => handleFilterChange('all')}
                 
                >
                  <Text style={styles.clearFilterText}>Show all events</Text>
                </Pressable>
              )}
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
    backgroundColor: COLORS.background,
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
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.background,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  searchButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  filtersContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.text,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  filterChipTextActive: {
    color: COLORS.background,
    fontWeight: '600',
  },
  eventsList: {
    padding: 16,
    gap: 16,
  },
  eventCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventImage: {
    width: '100%',
    height: 160,
  },
  cashbackBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.cashback,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cashbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.background,
  },
  eventInfo: {
    padding: 16,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  eventMeta: {
    gap: 6,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  noRatingText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  clearFilterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  clearFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.background,
  },
  // Error state styles
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
    backgroundColor: COLORS.errorLight || colors.errorScale[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
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
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.background,
  },
});

export default withErrorBoundary(EventsCategoryPage, 'EventsCategory');
