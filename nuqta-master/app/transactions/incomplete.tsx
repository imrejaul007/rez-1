// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Incomplete Transactions Page
// Displays orders that are pending, failed, or cancelled

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import ordersApi, { Order } from '@/services/ordersApi';
import { useGetCurrencySymbol } from '@/stores/selectors';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
const INCOMPLETE_STATUSES = ['pending', 'payment_failed', 'cancelled', 'payment_pending'];

const IncompleteTransactionsPage = () => {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_LIMIT = 20;

  const fetchIncompleteOrders = useCallback(async (refresh: boolean = false, pageNum = 1) => {
    try {
      if (refresh || pageNum === 1) {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const response = await ordersApi.getOrders({
        page: pageNum,
        limit: PAGE_LIMIT,
      });

      if (response.success && response.data) {
        // Filter for incomplete orders
        const incompleteOrders = response.data.orders.filter((order: Order) =>
          INCOMPLETE_STATUSES.includes(order.status as any)
        );
        if (!isMounted()) return;
        if (pageNum === 1) {
          setOrders(incompleteOrders);
        } else {
          setOrders(prev => [...prev, ...incompleteOrders]);
        }
        setPage(pageNum);
        // If the API returned fewer than PAGE_LIMIT, no more pages
        setHasMore((response.data.orders?.length || 0) >= PAGE_LIMIT);
      } else {
        throw new Error(response.message || 'Failed to fetch orders');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch incomplete transactions';
      if (!isMounted()) return;
      setError(errorMessage);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);
  const isMounted = useIsMounted();

  React.useEffect(() => {
    fetchIncompleteOrders();
  }, [fetchIncompleteOrders]);

  const onRefresh = () => {
    setPage(1);
    setHasMore(true);
    fetchIncompleteOrders(true, 1);
  };

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    fetchIncompleteOrders(false, page + 1);
  }, [loadingMore, hasMore, page, fetchIncompleteOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'payment_pending':
        return Colors.warning;
      case 'payment_failed':
      case 'cancelled':
        return Colors.error;
      default:
        return Colors.text.tertiary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
      case 'payment_pending':
        return 'time-outline';
      case 'payment_failed':
        return 'close-circle-outline';
      case 'cancelled':
        return 'ban-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  const getActionLabel = (status: string) => {
    switch (status) {
      case 'payment_pending':
      case 'payment_failed':
        return 'Retry Payment';
      case 'pending':
        return 'View Details';
      case 'cancelled':
        return 'Reorder';
      default:
        return 'View';
    }
  };

  const handleAction = useCallback((order: Order) => {
    switch (order.status as any) {
      case 'payment_pending':
      case 'payment_failed':
        // Navigate to checkout to retry payment
        router.push(`/checkout?orderId=${order._id}` as any);
        break;
      case 'cancelled':
        // Navigate to order details where user can reorder
        router.push(`/orders/${order._id}` as any);
        break;
      default:
        // View order details
        router.push(`/orders/${order._id}` as any);
        break;
    }
  }, [router]);

  const renderOrderItem = useCallback(({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <Ionicons
            name={getStatusIcon(item.status as any) as any}
            size={24}
            color={getStatusColor(item.status as any)}
          />
          <View style={styles.orderInfo}>
            <ThemedText style={styles.orderId}>Order #{item.orderNumber || item._id.substring(0, 8)}</ThemedText>
            <ThemedText style={styles.orderDate}>
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status as any)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status as any) }]}>
            {(item.status as any).replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.orderBody}>
        <View style={styles.orderDetail}>
          <ThemedText style={styles.orderLabel}>Total Amount</ThemedText>
          <ThemedText style={styles.orderValue}>
            {currencySymbol}{(item.totals?.total || item.summary?.total || 0).toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.orderDetail}>
          <ThemedText style={styles.orderLabel}>Items</ThemedText>
          <ThemedText style={styles.orderValue}>{item.items?.length || 0} items</ThemedText>
        </View>
      </View>

      <Pressable
        style={[styles.actionButton, { borderColor: getStatusColor(item.status as any) }]}
        onPress={() => handleAction(item)}
      >
        <Text style={[styles.actionButtonText, { color: getStatusColor(item.status as any) }]}>
          {getActionLabel(item.status as any)}
        </Text>
        <Ionicons name="arrow-forward" size={16} color={getStatusColor(item.status as any)} />
      </Pressable>
    </View>
  ), [currencySymbol, handleAction]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="checkmark-circle-outline" size={64} color={Colors.success} />
      <ThemedText style={styles.emptyTitle}>All Clear!</ThemedText>
      <ThemedText style={styles.emptyMessage}>
        You don't have any incomplete transactions
      </ThemedText>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purple, Colors.brand.purple]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Incomplete Transactions</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.purple} />
          <ThemedText style={styles.loadingText}>Loading transactions...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={() => fetchIncompleteOrders()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.brand.purple} />
              </View>
            ) : null
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.brand.purple}
              colors={[Colors.brand.purple]}
            />
          }
          estimatedItemSize={100}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  listContainer: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  orderCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  orderId: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  orderDate: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  orderDetail: {
    flex: 1,
  },
  orderLabel: {
    fontSize: Typography.bodySmall.fontSize,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  orderValue: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  actionButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  errorText: {
    marginTop: Spacing.base,
    fontSize: Typography.body.fontSize,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.brand.purple,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyMessage: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(IncompleteTransactionsPage, 'TransactionsIncomplete');
