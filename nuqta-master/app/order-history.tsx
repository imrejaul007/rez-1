// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Order History Page
// Displays user's order history with server-side filtering, search, and pagination.

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { platformAlertSimple } from '@/utils/platformAlert';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import OrderHistoryItem from '@/components/order/OrderHistoryItem';
import OrderFilterModal from '@/components/order/OrderFilterModal';
import { useOrderHistory, OrderFilterParams } from '@/hooks/useOrderHistory';
import { OrderFilter } from '@/types/order';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// Skeleton loader for order cards
const OrderSkeleton = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonHeader}>
      <View>
        <View style={[styles.skeletonBox, { width: 140, height: 16 }]} />
        <View style={[styles.skeletonBox, { width: 90, height: 14, marginTop: Spacing.xs }]} />
      </View>
      <View style={[styles.skeletonBox, { width: 80, height: 24, borderRadius: BorderRadius.md }]} />
    </View>
    <View style={styles.skeletonItemRow}>
      <View style={[styles.skeletonBox, { width: 50, height: 50, borderRadius: BorderRadius.sm }]} />
      <View style={{ flex: 1, marginLeft: Spacing.md }}>
        <View style={[styles.skeletonBox, { width: '70%', height: 14 }]} />
        <View style={[styles.skeletonBox, { width: 40, height: 12, marginTop: Spacing.xs }]} />
      </View>
      <View style={[styles.skeletonBox, { width: 70, height: 14 }]} />
    </View>
    <View style={[styles.skeletonFooter]}>
      <View style={[styles.skeletonBox, { width: 100, height: 16 }]} />
      <View style={[styles.skeletonBox, { width: 90, height: 28, borderRadius: 6 }]} />
    </View>
  </View>
);

function dateRangeToISO(dateRange: string): { dateFrom?: string; dateTo?: string } {
  if (!dateRange || dateRange === 'all') return {};
  const now = new Date();
  let start: Date;
  switch (dateRange) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return {};
  }
  return { dateFrom: start.toISOString(), dateTo: now.toISOString() };
}

function OrderHistoryPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<OrderFilter>({
    status: 'all',
    dateRange: 'all',
    sortBy: 'newest',
  });
  const [refreshing, setRefreshing] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    orders,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useOrderHistory();

  const buildServerFilter = useCallback((filter: OrderFilter, search?: string): OrderFilterParams => {
    const dates = dateRangeToISO(filter.dateRange);
    return {
      status: filter.status !== 'all' ? filter.status : undefined,
      search: search?.trim() || undefined,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
      sort: filter.sortBy as OrderFilterParams['sort'],
    };
  }, []);

  const handleBackPress = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh(buildServerFilter(selectedFilter, searchQuery));
    } catch (err) {
      platformAlertSimple('Error', 'Failed to refresh orders');
    } finally {
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [refresh, selectedFilter, searchQuery, buildServerFilter]);

  const handleOrderPress = useCallback((order: any) => {
    const orderId = order.id || order._id;
    router.push(`/tracking/${orderId}` as any);
  }, [router]);

  const handleReorder = useCallback((orderId: string) => {
    // Navigate to tracking page with reorder intent — the tracking page has reorder functionality
    router.push(`/tracking/${orderId}` as any);
  }, [router]);

  const handleTrack = useCallback((orderId: string) => {
    router.push(`/tracking/${orderId}` as any);
  }, [router]);

  const handleFilterApply = useCallback((filter: OrderFilter) => {
    setSelectedFilter(filter);
    setShowFilterModal(false);
    refresh(buildServerFilter(filter, searchQuery));
  }, [refresh, searchQuery, buildServerFilter]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    // Debounce server search by 400ms
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      refresh(buildServerFilter(selectedFilter, text));
    }, 400);
  }, [refresh, selectedFilter, buildServerFilter]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadMore();
    }
  }, [hasMore, isLoading, loadMore]);

  const renderOrderItem = useCallback(({ item }: { item: any }) => (
    <OrderHistoryItem
      order={item}
      onPress={() => handleOrderPress(item)}
      onReorder={handleReorder}
      onTrack={handleTrack}
    />
  ), [handleOrderPress, handleReorder, handleTrack]);

  const renderEmptyState = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={80} color={colors.neutral[200]} />
        <ThemedText style={styles.emptyTitle}>No Orders Found</ThemedText>
        <ThemedText style={styles.emptyDescription}>
          {searchQuery.trim()
            ? 'No orders match your search criteria'
            : "You haven't placed any orders yet"
          }
        </ThemedText>
        {!searchQuery.trim() && selectedFilter.status === 'all' && (
          <Pressable
            style={styles.shopButton}
            onPress={() => router.push('/')}
            accessibilityLabel="Start shopping"
            accessibilityRole="button"
          >
            <ThemedText style={styles.shopButtonText}>Start Shopping</ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || !hasMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.brand.green} />
        <ThemedText style={styles.loadingText}>Loading more orders...</ThemedText>
      </View>
    );
  };

  const renderSkeletons = () => (
    <View style={styles.listContainer}>
      {[0, 1, 2, 3].map(i => <OrderSkeleton key={i} />)}
    </View>
  );

  if (error && !orders.length) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.brand.green} />
        <LinearGradient colors={[colors.brand.green, colors.brand.teal]} style={styles.headerBg}>
          <View style={styles.headerContainer}>
            <Pressable style={styles.backButton} onPress={handleBackPress}
              accessibilityLabel="Go back" accessibilityRole="button">
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Order History</ThemedText>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <ThemedText style={styles.errorTitle}>Unable to load orders</ThemedText>
          <ThemedText style={styles.errorDetails}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={handleRefresh}
            accessibilityLabel="Try again" accessibilityRole="button">
            <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.green} />

      {/* Header */}
      <LinearGradient colors={[colors.brand.green, colors.brand.teal]} style={styles.headerBg}>
        <View style={styles.headerContainer}>
          <Pressable style={styles.backButton} onPress={handleBackPress}
            accessibilityLabel="Go back" accessibilityRole="button">
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Order History</ThemedText>
          <Pressable style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
            accessibilityLabel="Open filter options" accessibilityRole="button">
            <Ionicons name="filter-outline" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholderTextColor={colors.neutral[400]}
            accessibilityLabel="Search orders"
            accessibilityHint="Enter order number, product name, or store name"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => handleSearchChange('')}
              accessibilityLabel="Clear search" accessibilityRole="button">
              <Ionicons name="close-circle" size={20} color={Colors.text.tertiary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Skeleton or Orders List */}
      {isLoading && orders.length === 0 ? (
        renderSkeletons()
      ) : (
        <FlashList
          data={orders}
          keyExtractor={(item: any) => item.id || item._id || item.orderNumber}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={120}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.brand.green}
              colors={[colors.brand.green]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
        />
      )}

      {/* Filter Modal */}
      <OrderFilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleFilterApply}
        currentFilter={selectedFilter}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  headerBg: {
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  filterButton: {
    padding: Spacing.sm,
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.md,
    ...Typography.bodyLarge,
    color: Colors.text.primary,
  },
  listContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 120,
  },
  // Skeleton styles
  skeletonCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  skeletonItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  skeletonBox: {
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    height: 14,
  } as any,
  // Empty & Error states
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.secondary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: 40,
  },
  shopButton: {
    backgroundColor: colors.brand.green,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  shopButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    marginLeft: Spacing.sm,
    color: Colors.text.tertiary,
    ...Typography.body,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  errorTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorDetails: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.brand.green,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
});

export default withErrorBoundary(OrderHistoryPage, 'OrderHistory');
