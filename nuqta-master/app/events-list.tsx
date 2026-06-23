import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * EventsListPage
 * Main events listing page with search, filters, categories, and grid display
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  StatusBar,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { EventItem } from '@/types/homepage.types';
import { EventFilters } from '@/services/eventsApi';

// Import custom components
import EventsHeader from '@/components/events/EventsHeader';
import EventCategoryTabs from '@/components/events/EventCategoryTabs';
import EventsQuickFilters from '@/components/events/EventsQuickFilters';
import EventGridCard from '@/components/events/EventGridCard';
import EventsGridSkeleton from '@/components/events/EventsGridSkeleton';
import EventsSortModal from '@/components/events/EventsSortModal';
import EventFiltersModal from '@/components/events/EventFilters';

// Import custom hook
import { useEventsPage, EventSortOption } from '@/hooks/useEventsPage';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
const { width: screenWidth } = Dimensions.get('window');

function EventsListPage() {
  const router = useRouter();

  // Modal states
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Use custom hook for events state management
  const {
    events,
    loading,
    refreshing,
    error,
    hasMore,
    totalEvents,
    searchQuery,
    filters,
    sortBy,
    activeCategory,
    setSearchQuery,
    setFilters,
    setSortBy,
    setActiveCategory,
    clearFilters,
    fetchEvents,
    refreshEvents,
    loadMoreEvents,
    clearError,
    getActiveFiltersCount,
  } = useEventsPage({ autoFetch: true, pageSize: 20 });

  // Navigation handlers
  const handleBack = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  const handleEventPress = useCallback((event: EventItem) => {
    router.push({
      pathname: '/EventPage',
      params: { id: event.id },
    } as any);
  }, [router]);

  // Filter handlers
  const handleOpenFilters = useCallback(() => {
    setShowFiltersModal(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setShowFiltersModal(false);
  }, []);

  const handleFiltersChange = useCallback((newFilters: EventFilters) => {
    setFilters(newFilters);
  }, [setFilters]);

  const handleResetFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  // Quick filter toggle handler
  const handleQuickFilterToggle = useCallback((filterId: string) => {
    const newFilters = { ...filters };

    switch (filterId) {
      case 'free':
        if (filters.priceMax === 0) {
          delete (newFilters as any).priceMax;
          delete (newFilters as any).priceMin;
        } else {
          newFilters.priceMin = 0;
          newFilters.priceMax = 0;
        }
        break;
      case 'online':
        if (filters.isOnline === true) {
          delete (newFilters as any).isOnline;
        } else {
          newFilters.isOnline = true;
        }
        break;
      case 'venue':
        if (filters.isOnline === false) {
          delete (newFilters as any).isOnline;
        } else {
          newFilters.isOnline = false;
        }
        break;
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        if (filters.date === today) {
          delete (newFilters as any).date;
        } else {
          newFilters.date = today;
        }
        break;
    }

    setFilters(newFilters);
  }, [filters, setFilters]);

  // Sort handlers
  const handleOpenSort = useCallback(() => {
    setShowSortModal(true);
  }, []);

  const handleCloseSort = useCallback(() => {
    setShowSortModal(false);
  }, []);

  const handleSortChange = useCallback((newSortBy: EventSortOption) => {
    setSortBy(newSortBy);
  }, [setSortBy]);

  // Load more handler
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadMoreEvents();
    }
  }, [loading, hasMore, loadMoreEvents]);

  // Memoized event count display
  const eventCountText = useMemo(() => {
    if (loading && events.length === 0) return '';
    if (totalEvents === 0) return 'No events found';
    if (totalEvents === 1) return '1 event';
    return `${totalEvents} events`;
  }, [loading, events.length, totalEvents]);

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={64} color={Colors.border.default} />
      </View>
      <ThemedText style={styles.emptyTitle}>No events found</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        {searchQuery
          ? `No events match "${searchQuery}"`
          : 'Try adjusting your filters or check back later for new events'}
      </ThemedText>
      {(getActiveFiltersCount() > 0 || searchQuery) && (
        <Pressable
          style={styles.clearFiltersButton}
          onPress={handleResetFilters}
         
        >
          <Ionicons name="refresh-outline" size={18} color={Colors.background.primary} />
          <ThemedText style={styles.clearFiltersText}>
            Clear all filters
          </ThemedText>
        </Pressable>
      )}
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
      </View>
      <ThemedText style={styles.errorTitle}>Something went wrong</ThemedText>
      <ThemedText style={styles.errorSubtitle}>{error}</ThemedText>
      <Pressable
        style={styles.retryButton}
        onPress={fetchEvents}
       
      >
        <Ionicons name="refresh-outline" size={18} color={Colors.background.primary} />
        <ThemedText style={styles.retryButtonText}>Try again</ThemedText>
      </Pressable>
    </View>
  );

  // Render events grid
  const renderEventsGrid = () => (
    <View style={styles.eventsGrid}>
      {events.map((event) => (
        <EventGridCard
          key={event.id}
          event={event}
          onPress={handleEventPress}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Hide default navigation header */}
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

        {/* Header */}
        <EventsHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onBack={handleBack}
          isLoading={loading}
        />

        {/* Category Tabs */}
        <EventCategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Quick Filters */}
        <EventsQuickFilters
          filters={filters}
          sortBy={sortBy}
          onOpenFilters={handleOpenFilters}
          onOpenSort={handleOpenSort}
          onQuickFilterToggle={handleQuickFilterToggle}
          activeFiltersCount={getActiveFiltersCount()}
        />

        {/* Events Count */}
        {!loading && events.length > 0 && (
          <View style={styles.countContainer}>
            <ThemedText style={styles.countText}>{eventCountText}</ThemedText>
          </View>
        )}

        {/* Scrollable Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshEvents}
              tintColor={Colors.nileBlue}
              colors={[Colors.nileBlue]}
            />
          }
        >
          {/* Loading State */}
          {loading && events.length === 0 && <EventsGridSkeleton count={6} />}

          {/* Error State */}
          {error && !loading && events.length === 0 && renderErrorState()}

          {/* Empty State */}
          {!loading && !error && events.length === 0 && renderEmptyState()}

          {/* Events Grid */}
          {events.length > 0 && renderEventsGrid()}

          {/* Load More Button */}
          {hasMore && events.length > 0 && !loading && (
            <Pressable
              style={styles.loadMoreButton}
              onPress={handleLoadMore}
             
            >
              <ThemedText style={styles.loadMoreText}>
                Load More Events
              </ThemedText>
              <Ionicons name="chevron-down" size={20} color={Colors.nileBlue} />
            </Pressable>
          )}

          {/* Loading More Indicator */}
          {loading && events.length > 0 && (
            <View style={styles.loadingMore}>
              <ThemedText style={styles.loadingMoreText}>
                Loading more events...
              </ThemedText>
            </View>
          )}

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>

      {/* Filters Modal */}
      <EventFiltersModal
        visible={showFiltersModal}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onResetFilters={handleResetFilters}
        onClose={handleCloseFilters}
      />

      {/* Sort Modal */}
      <EventsSortModal
        visible={showSortModal}
        sortBy={sortBy}
        onClose={handleCloseSort}
        onSortChange={handleSortChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FFFC',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentContainer: {
    paddingTop: Spacing.sm,
    paddingBottom: 100,
  },
  countContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.secondary,
  },
  countText: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    gap: Spacing.base,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
  },
  clearFiltersText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl'],
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.errorScale[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius['2xl'],
    gap: Spacing.sm,
  },
  retryButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.xl,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  loadMoreText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  loadingMore: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  loadingMoreText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  bottomSpacer: {
    height: 20,
  },
});

export default withErrorBoundary(EventsListPage, 'EventsList');
