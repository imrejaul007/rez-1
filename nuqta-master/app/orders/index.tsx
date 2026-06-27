// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { FlashList } from '@shopify/flash-list';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import ordersService, { Order } from '@/services/ordersApi';
import { mapBackendOrderToFrontend } from '@/utils/dataMappers';
import ReorderButton from '@/components/orders/ReorderButton';
import ReorderSuggestions from '@/components/orders/ReorderSuggestions';
import SkeletonLoader from '@/components/common/SkeletonLoader';
import EmptyState from '@/components/ui/EmptyState';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, Gradients, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useErrorToast } from '@/hooks/useErrorToast';

/**
 * Safe haptic wrapper — fails silently on unsupported devices (web, older Android).
 */
const safeHaptic = (style: Haptics.NotificationFeedbackType | Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
  try {
    if (style === Haptics.ImpactFeedbackStyle.Light ||
        style === Haptics.ImpactFeedbackStyle.Medium ||
        style === Haptics.ImpactFeedbackStyle.Heavy) {
      Haptics.impactAsync(style).catch(() => {});
    } else {
      Haptics.notificationAsync(style as Haptics.NotificationFeedbackType).catch(() => {});
    }
  } catch {
    // haptics not available (e.g., web) — fail silently
  }
};

// ============================================================================
// STATUS HELPERS
// ============================================================================

const STATUS_COLORS: Record<string, string> = {
  placed: colors.warningScale[400],
  confirmed: colors.infoScale[400],
  preparing: '#e67e22',
  ready: '#0ea5e9',
  dispatched: '#6366f1',
  shipped: '#6366f1',
  delivered: colors.success,
  cancelled: '#E74C3C',
  returned: '#ef6868',
  refunded: Colors.secondary[500],
};

const STATUS_LABELS: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  dispatched: 'On the Way',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
};

const PAYMENT_COLORS: Record<string, string> = {
  paid: colors.success,
  failed: '#E74C3C',
  refunded: Colors.secondary[500],
  partially_refunded: '#e67e22',
};

const getStatusColor = (status: string) => STATUS_COLORS[status] || Colors.gray[500];
const getStatusLabel = (status: string) => STATUS_LABELS[status] || status;
const getPaymentColor = (status: string) => PAYMENT_COLORS[status] || colors.warningScale[400];

// ============================================================================
// FILTER CONFIG
// ============================================================================

type FilterKey = 'all' | 'active' | 'delivered' | 'cancelled' | 'returned';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returned', label: 'Returned' },
];

const getFilterParams = (filter: FilterKey): Record<string, string> => {
  switch (filter) {
    case 'active':
      return { statusGroup: 'active' };
    case 'delivered':
      return { status: 'delivered' };
    case 'cancelled':
      return { status: 'cancelled' };
    case 'returned':
      return { status: 'returned' };
    default:
      return {};
  }
};

// ============================================================================
// ORDER CARD (memoized)
// ============================================================================

interface OrderCardProps {
  item: Order;
  currencySymbol: string;
  onPress: (id: string) => void;
  onRefresh: () => void;
}

const OrderCard = memo(({ item, currencySymbol, onPress, onRefresh }: OrderCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderActions = () => {
    const status = item.status;
    const actions: { label: string; icon: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' }[] = [];

    if (['placed', 'confirmed'].includes(status)) {
      actions.push({
        label: 'Cancel',
        icon: 'close-circle-outline',
        onPress: () => router.push(`/orders/${item.id}`),
        variant: 'danger',
      });
    }

    if (['preparing', 'ready', 'dispatched', 'shipped'].includes(status)) {
      actions.push({
        label: 'Track',
        icon: 'location-outline',
        onPress: () => router.push(`/orders/${item.id}`),
        variant: 'primary',
      });
    }

    if (status === 'delivered') {
      actions.push({
        label: 'Report Issue',
        icon: 'alert-circle-outline',
        onPress: () => router.push({
          pathname: '/support/create-ticket',
          params: { category: 'order', subject: `Issue with Order #${item.orderNumber}`, relatedOrderId: item.id },
        }),
        variant: 'secondary',
      });
    }

    if (['delivered', 'cancelled', 'returned', 'refunded'].includes(status)) {
      // Reorder is handled by the ReorderButton below
    }

    if (actions.length === 0) return null;

    return (
      <View style={styles.quickActions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            style={[
              styles.quickActionPill,
              action.variant === 'primary' && styles.quickActionPrimary,
              action.variant === 'danger' && styles.quickActionDanger,
            ]}
            onPress={() => {
              safeHaptic(action.variant === 'danger'
                ? Haptics.ImpactFeedbackStyle.Medium
                : Haptics.ImpactFeedbackStyle.Light);
              action.onPress();
            }}
            accessibilityLabel={`${action.label} order ${item.orderNumber}`}
            accessibilityRole="button"
            accessibilityHint={`Double tap to ${action.label.toLowerCase()} this order`}
          >
            <Ionicons
              name={action.icon as any}
              size={14}
              color={
                action.variant === 'primary' ? Colors.secondary[600] :
                action.variant === 'danger' ? '#E74C3C' :
                Colors.gray[600]
              }
            />
            <Text style={[
              styles.quickActionText,
              action.variant === 'primary' && { color: Colors.secondary[600] },
              action.variant === 'danger' && { color: '#E74C3C' },
            ]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  };

  return (
    <Pressable
      style={styles.orderCard}
      onPress={() => onPress(item.id)}
      accessibilityLabel={`Order ${item.orderNumber}, ${getStatusLabel(item.status)}, ${currencySymbol}${Number(item.totals?.total || item.summary?.total || 0).toFixed(2)}`}
      accessibilityRole="button"
      accessibilityHint={`Double tap to view order ${item.orderNumber} details`}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {(item as any).fulfillmentType && (item as any).fulfillmentType !== 'delivery' && (
            <View style={styles.fulfillmentBadge}>
              <Text style={styles.fulfillmentText}>
                {(item as any).fulfillmentType === 'pickup' ? '🛍 Pickup' :
                 (item as any).fulfillmentType === 'drive_thru' ? '🚗 Drive-Thru' :
                 (item as any).fulfillmentType === 'dine_in' ? '🍽 Dine-In' : ''}
              </Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderItems}>
        {item.items.slice(0, 3).map((orderItem, index) => {
          const itemName = orderItem.name || orderItem.product?.name || 'Product';
          const itemImage = orderItem.image || orderItem.product?.images?.[0]?.url || orderItem.product?.image;
          const itemTotal = orderItem.subtotal || orderItem.totalPrice || (orderItem.price * orderItem.quantity) || 0;

          return (
            <View key={index} style={styles.itemRow}>
              <CachedImage source={itemImage} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>{itemName}</Text>
                <Text style={styles.itemQuantity}>Qty: {orderItem.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>{currencySymbol}{Number(itemTotal).toFixed(2)}</Text>
            </View>
          );
        })}
        {item.items.length > 3 && (
          <Text style={styles.moreItems}>
            +{item.items.length - 3} more item{item.items.length - 3 > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>
            {currencySymbol}{Number(item.totals?.total || item.summary?.total || 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.paymentStatus}>
          <Text style={[styles.paymentStatusText, { color: getPaymentColor(item.payment?.status) }]}>
            {(item.payment?.status || 'pending').toUpperCase()}
          </Text>
        </View>
      </View>

      {renderActions()}

      {['delivered', 'cancelled', 'returned', 'refunded'].includes(item.status) && (
        <View style={styles.orderActions}>
          <ReorderButton
            orderId={item.id}
            orderNumber={item.orderNumber}
            variant="secondary"
            size="small"
            fullWidth
            onSuccess={onRefresh}
          />
        </View>
      )}
    </Pressable>
  );
});

// ============================================================================
// SKELETON LOADER
// ============================================================================

const OrderSkeleton = () => (
  <View style={styles.skeletonContainer}>
    {[1, 2, 3, 4].map(i => (
      <View key={i} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={{ flex: 1 }}>
            <SkeletonLoader width={120} height={16} borderRadius={4} />
            <SkeletonLoader width={90} height={12} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
          <SkeletonLoader width={80} height={26} borderRadius={6} />
        </View>
        {[1, 2].map(j => (
          <View key={j} style={[styles.itemRow, { marginBottom: 8 }]}>
            <SkeletonLoader width={50} height={50} borderRadius={8} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonLoader width="80%" height={14} borderRadius={4} />
              <SkeletonLoader width="40%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <SkeletonLoader width={60} height={14} borderRadius={4} />
          </View>
        ))}
        <View style={[styles.orderFooter, { borderTopWidth: 0 }]}>
          <View>
            <SkeletonLoader width={80} height={12} borderRadius={4} />
            <SkeletonLoader width={100} height={18} borderRadius={4} style={{ marginTop: 4 }} />
          </View>
          <SkeletonLoader width={60} height={12} borderRadius={4} />
        </View>
      </View>
    ))}
  </View>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function OrdersListScreen() {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isMounted = useIsMounted();
  const { showError } = useErrorToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Search, filter, sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadOrders(1, false);
  }, [activeFilter, sortOrder]);

  // Refresh orders when screen regains focus (e.g., order status changed on detail page)
  useFocusEffect(
    useCallback(() => {
      loadOrders(1, false);
    }, [activeFilter, sortOrder, searchQuery])
  );

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadOrders(1, false);
    }, 400);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  const loadOrders = async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      }

      const filterParams = getFilterParams(activeFilter);
      const response = await ordersService.getOrders({
        page: pageNum,
        limit: 20,
        sort: sortOrder,
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
        ...filterParams,
      });

      if (response.success && response.data) {
        const mappedOrders = response.data.orders.map(mapBackendOrderToFrontend);

        if (refresh || pageNum === 1) {
          if (!isMounted()) return;
          setOrders(mappedOrders);
        } else {
          // Deduplicate on append
          if (!isMounted()) return;
          setOrders(prev => {
            const ids = new Set(prev.map(o => o.id));
            return [...prev, ...mappedOrders.filter(o => !ids.has(o.id))];
          });
        }

        if (!isMounted()) return;
        setHasMore(response.data.pagination.current < response.data.pagination.pages);
        if (!isMounted()) return;
        setPage(pageNum);
        setError(null);
      }
    } catch (err) {
      if (!isMounted()) return;
      const errMsg = err instanceof Error ? err.message : 'Failed to load orders';
      setError(errMsg);
      // Show a non-blocking toast so the user is aware even if they're scrolled
      // (the inline error only shows when orders.length === 0).
      showError('Could not refresh orders. Pull down to retry.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    loadOrders(1, true);
  }, [activeFilter, sortOrder, searchQuery]);

  const handleLoadMore = useCallback(() => {
    if (!loading && !refreshing && hasMore) {
      loadOrders(page + 1);
    }
  }, [loading, refreshing, hasMore, page, activeFilter, sortOrder, searchQuery]);

  const handleOrderPress = useCallback((orderId: string) => {
    router.push(`/orders/${orderId}`);
  }, []);

  const handleFilterChange = (filter: FilterKey) => {
    if (filter !== activeFilter) {
      safeHaptic(Haptics.ImpactFeedbackStyle.Light);
      setActiveFilter(filter);
      setPage(1);
    }
  };

  const toggleSort = () => {
    safeHaptic(Haptics.ImpactFeedbackStyle.Light);
    setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
    setPage(1);
  };

  const renderOrderItem = useCallback(({ item }: { item: Order }) => (
    <OrderCard
      item={item}
      currencySymbol={currencySymbol}
      onPress={handleOrderPress}
      onRefresh={handleRefresh}
    />
  ), [currencySymbol, handleOrderPress, handleRefresh]);

  const renderEmptyState = () => {
    if (searchQuery || activeFilter !== 'all') {
      return (
        <EmptyState
          iconName="search-outline"
          title="No matching orders"
          subtitle="Try adjusting your filters or search terms"
          actionLabel="Clear filters"
          onAction={() => {
            safeHaptic();
            setSearchQuery('');
            setActiveFilter('all');
          }}
        />
      );
    }
    return (
      <EmptyState
        iconName="receipt-outline"
        title="No orders yet"
        subtitle="Start shopping to see your orders here. Your past orders will appear in this list."
        actionLabel="Start Shopping"
        onAction={() => {
          safeHaptic();
          router.push('/');
        }}
      />
    );
  };

  const renderFooter = () => {
    if (!loading || page === 1) return null;
    return (
      <View style={styles.footerLoader}>
        <SkeletonLoader width={200} height={16} borderRadius={8} />
      </View>
    );
  };

  const renderListHeader = () => (
    <>
      {orders.length > 0 && !searchQuery && activeFilter === 'all' && (
        <ReorderSuggestions />
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Gradient Header */}
      <LinearGradient colors={Gradients.nileBlue as any} style={styles.gradientHeader}>
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => {
              safeHaptic();
              router.canGoBack() ? router.back() : router.replace('/(tabs)');
            }}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to the previous screen"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.background.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: 32 }} />
        </View>
      </LinearGradient>

      {/* Search & Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            placeholderTextColor={Colors.gray[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            accessibilityLabel="Search orders"
            accessibilityHint="Type to filter orders by name or number"
          />
          {searchQuery.length > 0 && (
            <Pressable
              onPress={() => setSearchQuery('')}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={Colors.gray[400]} />
            </Pressable>
          )}
        </View>

        <View style={styles.filterRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChips}
          >
            {FILTERS.map(f => (
              <Pressable
                key={f.key}
                style={[
                  styles.filterChip,
                  activeFilter === f.key && styles.filterChipActive,
                ]}
                onPress={() => handleFilterChange(f.key)}
                accessibilityLabel={`Filter: ${f.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilter === f.key }}
              >
                <Text style={[
                  styles.filterChipText,
                  activeFilter === f.key && styles.filterChipTextActive,
                ]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Pressable
            style={styles.sortButton}
            onPress={toggleSort}
            accessibilityLabel={`Sort by ${sortOrder === 'newest' ? 'newest first' : 'oldest first'}`}
            accessibilityRole="button"
            accessibilityHint={`Double tap to sort by ${sortOrder === 'newest' ? 'oldest first' : 'newest first'}`}
          >
            <Ionicons
              name={sortOrder === 'newest' ? 'arrow-down-outline' : 'arrow-up-outline'}
              size={16}
              color={Colors.secondary[600]}
            />
            <Text style={styles.sortText}>{sortOrder === 'newest' ? 'Newest' : 'Oldest'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Content */}
      {loading && page === 1 ? (
        <OrderSkeleton />
      ) : error && orders.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.centeredScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.secondary[600]]}
              tintColor={Colors.secondary[600]}
            />
          }
        >
          <EmptyState
            iconName="cloud-offline-outline"
            title="Couldn't load your orders"
            subtitle={error || 'Check your internet connection and try again.'}
            actionLabel="Retry"
            onAction={() => {
              safeHaptic();
              loadOrders();
            }}
          />
        </ScrollView>
      ) : (
        <FlashList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={orders.length === 0 ? styles.emptyListContent : styles.listContent}
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.secondary[600]]}
              tintColor={Colors.secondary[600]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          estimatedItemSize={120}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  centeredScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Header — SafeAreaView handles the top inset; we only need baseline padding
  gradientHeader: {
    paddingTop: Platform.OS === 'web' ? Spacing.base : Spacing.md,
    paddingBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h2,
    color: Colors.background.primary,
  },

  // Search & Filters
  searchSection: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    height: 40,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text.primary,
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  filterChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flex: 1,
    paddingRight: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  filterChipActive: {
    backgroundColor: Colors.secondary[600],
    borderColor: Colors.secondary[600],
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.primary,
  },
  filterChipTextActive: {
    color: Colors.background.primary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  sortText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.secondary[600],
  },

  // List
  listContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  skeletonContainer: {
    padding: Spacing.base,
  },

  // Order Card
  orderCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  orderDate: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  fulfillmentBadge: {
    backgroundColor: Colors.background.lavender,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fulfillmentText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.secondary[600],
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.background.primary,
  },

  // Order Items
  orderItems: {
    marginBottom: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.border.light,
  },
  itemInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  itemQuantity: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  moreItems: {
    fontSize: 12,
    color: Colors.secondary[500],
    marginTop: Spacing.xs,
    marginLeft: 62,
  },

  // Footer
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  totalSection: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: Spacing.xs,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  paymentStatus: {
    alignItems: 'flex-end',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    marginTop: Spacing.md,
  },
  quickActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.medium,
  },
  quickActionPrimary: {
    backgroundColor: Colors.background.lavender,
    borderColor: Colors.secondary[200],
  },
  quickActionDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[600],
  },

  // Reorder Actions
  orderActions: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
    marginTop: Spacing.md,
  },

  // Empty State (replaced by EmptyState component)

  // Error
  errorText: {
    fontSize: 16,
    color: '#B91C1C', // Darker red for better contrast (WCAG AA)
    textAlign: 'center',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: Colors.secondary[600],
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background.primary,
  },

  // Footer loader
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export default withErrorBoundary(OrdersListScreen, 'OrdersIndex');
