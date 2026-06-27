// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import ordersApi, { Order, OrderCounts } from '@/services/ordersApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { getOrderProgress, formatETA } from '@/utils/orderProgress';
import { useOrderListSocket } from '@/hooks/useOrderListSocket';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OrderStatus {
  step: number;
  title: string;
  description: string;
  timestamp?: string;
  isCompleted: boolean;
  isActive: boolean;
}

interface TrackingOrder {
  id: string;
  orderNumber: string;
  merchantName: string;
  merchantLogo?: string;
  totalAmount: number;
  status: 'PREPARING' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';
  statusColor: string;
  estimatedDelivery: string;
  trackingSteps: OrderStatus[];
  items: string[];
  deliveryAddress: string;
  deliveryPersonName?: string;
  deliveryPersonPhone?: string;
  progress: number; // 0-100
  fulfillmentType?: string;
}

// Helper to map backend order to TrackingOrder
const mapOrderToTracking = (order: Order): TrackingOrder => {
  // Map backend status to tracking status
  const statusMap: Record<string, 'PREPARING' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED'> = {
    'placed': 'PREPARING',
    'pending': 'PREPARING',
    'confirmed': 'PREPARING',
    'preparing': 'PREPARING',
    'processing': 'PREPARING',
    'ready': 'PREPARING',
    'dispatched': 'ON_THE_WAY',
    'shipped': 'ON_THE_WAY',
    'out_for_delivery': 'ON_THE_WAY',
    'delivered': 'DELIVERED',
    'cancelled': 'CANCELLED',
    'refunded': 'CANCELLED',
  };

  const trackingStatus = statusMap[order.status] || 'PREPARING';

  // Map status to color - using Nuqta palette
  const colorMap = {
    'PREPARING': colors.lightMustard,    // Light Mustard
    'ON_THE_WAY': colors.nileBlue,   // Nile Blue
    'DELIVERED': colors.nileBlue,    // Nile Blue
    'CANCELLED': colors.error,
  };

  // Calculate progress dynamically based on actual status index
  const dynamicProgress = getOrderProgress(order.status);

  // Create tracking steps from order timeline
  const steps: OrderStatus[] = order.timeline?.map((event, index) => ({
    step: index + 1,
    title: event.status.charAt(0).toUpperCase() + event.status.slice(1).replace('_', ' '),
    description: event.message,
    timestamp: new Date(event.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    isCompleted: true,
    isActive: index === order.timeline.length - 1,
  })) || [];

  // Get item names
  const items = order.items?.map(item => item.product?.name || 'Product') || [];

  // Format address - use delivery.address from backend
  const addr = order.delivery?.address || order.shippingAddress;
  const deliveryAddress = addr
    ? order.delivery?.address
      ? `${addr.addressLine1}, ${addr.city}, ${addr.state} ${addr.pincode}`
      : `${(addr as any).address1}, ${addr.city}, ${addr.state} ${(addr as any).zipCode}`
    : 'Address not available';

  // Get store info - use top-level store field first, then fallback to item's store
  const storeData = order.store || order.items?.[0]?.store;
  const storeName = (storeData as any)?.name || order.items?.[0]?.storeName || 'Store';
  const storeLogo = (storeData as any)?.logo || undefined;

  // Calculate total if it's 0 (fallback calculation)
  let totalAmount = order.totals?.total || order.summary?.total || 0;
  if (totalAmount === 0 && order.totals) {
    // Recalculate: subtotal + tax + delivery - discount
    totalAmount = (order.totals.subtotal || 0) +
                  (order.totals.tax || 0) +
                  (order.totals.delivery || 0) -
                  (order.totals.discount || 0);

  }

  return {
    id: order._id || order.id,
    orderNumber: order.orderNumber,
    merchantName: storeName,
    merchantLogo: storeLogo,
    totalAmount,
    status: trackingStatus,
    statusColor: colorMap[trackingStatus],
    estimatedDelivery: (order as any).calculatedETA
      ? formatETA((order as any).calculatedETA)
      : order.tracking?.estimatedDelivery || 'Calculating...',
    trackingSteps: steps,
    items,
    deliveryAddress,
    deliveryPersonName: order.tracking?.carrier,
    deliveryPersonPhone: order.tracking?.number,
    progress: dynamicProgress,
    fulfillmentType: (order as any).fulfillmentType || 'delivery',
  };
};

function OrderTrackingScreen() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [orders, setOrders] = useState<TrackingOrder[]>([]);
  const [counts, setCounts] = useState<OrderCounts>({ active: 0, past: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'active' | 'delivered'>('active');
  const nextCursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);

  // Real-time order list updates via socket
  const { lastUpdate, counts: socketCounts } = useOrderListSocket();
  const isMounted = useIsMounted();

  // Handle real-time order status updates
  useEffect(() => {
    if (!lastUpdate) return;

    // Update the specific order in-place
    setOrders(prev =>
      prev.map(o =>
        o.id === lastUpdate.orderId
          ? {
              ...o,
              status: lastUpdate.newStatus === 'delivered' || lastUpdate.newStatus === 'cancelled' || lastUpdate.newStatus === 'refunded' || lastUpdate.newStatus === 'returned'
                ? (lastUpdate.newStatus === 'delivered' ? 'DELIVERED' as const : 'CANCELLED' as const)
                : lastUpdate.newStatus === 'dispatched' || lastUpdate.newStatus === 'out_for_delivery' || lastUpdate.newStatus === 'shipped'
                  ? 'ON_THE_WAY' as const
                  : 'PREPARING' as const,
              progress: getOrderProgress(lastUpdate.newStatus),
            }
          : o
      )
    );

    // Update counts from socket if available
    if (socketCounts) {
      setCounts(socketCounts);
    } else if (lastUpdate.counts) {
      setCounts(lastUpdate.counts);
    }
  }, [lastUpdate, socketCounts]);

  // Load counts (lightweight) for the header
  const loadCounts = useCallback(async () => {
    try {
      const response = await ordersApi.getOrderCounts();
      if (response.success && response.data) {
        setCounts(response.data);
      }
    } catch (err) {
      // Non-critical, counts will still come from getOrders
    }
  }, []);

  // Load orders for the selected tab (server-side filtered)
  const loadOrders = useCallback(async (isRefresh: boolean = false, loadMore: boolean = false) => {
    if (!isRefresh && !loadMore) {
      setLoading(true);
    }
    if (loadMore) {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const statusGroup = selectedTab === 'active' ? 'active' : 'past';
      const cursor = loadMore ? nextCursorRef.current : undefined;

      const response = await ordersApi.getOrders({
        statusGroup,
        limit: 15,
        cursor: cursor || undefined,
      });

      if (response.success && response.data?.orders) {
        const mapped = response.data.orders.map(mapOrderToTracking);

        if (loadMore) {
          if (!isMounted()) return;
          setOrders(prev => [...prev, ...mapped]);
        } else {
          if (!isMounted()) return;
          setOrders(mapped);
        }

        nextCursorRef.current = response.data.nextCursor || null;
        hasMoreRef.current = response.data.hasMore || false;

        // Update counts from response if available
        if (response.data.counts) {
          if (!isMounted()) return;
          setCounts(response.data.counts);
        }
      } else {
        throw new Error(response.message || 'Failed to fetch orders');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to load orders';
      if (!isMounted()) return;
      setError(errorMsg);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [selectedTab]);

  // Load on mount and when tab changes
  useEffect(() => {
    nextCursorRef.current = null;
    hasMoreRef.current = true;
    loadOrders();
    loadCounts();
  }, [loadOrders, loadCounts]);

  // Load more (infinite scroll)
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMoreRef.current && nextCursorRef.current) {
      loadOrders(false, true);
    }
  }, [loadingMore, loadOrders]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    nextCursorRef.current = null;
    hasMoreRef.current = true;
    await loadOrders(true);
    await loadCounts();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PREPARING': return 'restaurant';
      case 'ON_THE_WAY': return 'car-sport';
      case 'DELIVERED': return 'checkmark-circle';
      case 'CANCELLED': return 'close-circle';
      default: return 'time';
    }
  };

  const renderModernTrackingStep = (step: OrderStatus, isLast: boolean, progress: number) => (
    <View key={step.step} style={styles.modernStep}>
      <View style={styles.stepLeftColumn}>
        <View style={[
          styles.modernStepCircle,
          step.isCompleted && styles.stepCompleted,
          step.isActive && styles.stepActive,
        ]}>
          {step.isCompleted ? (
            <Ionicons name="checkmark" size={14} color="white" />
          ) : step.isActive ? (
            <View style={styles.pulsingDot}>
              <Animated.View style={[styles.pulse, styles.pulse1]} />
              <Animated.View style={[styles.pulse, styles.pulse2]} />
              <View style={styles.centerDot} />
            </View>
          ) : (
            <View style={styles.inactiveStepDot} />
          )}
        </View>
        {!isLast && (
          <View style={[
            styles.modernStepLine,
            step.isCompleted && styles.stepLineCompleted,
          ]} />
        )}
      </View>
      
      <View style={styles.stepRightColumn}>
        <View style={styles.stepTextContainer}>
          <ThemedText style={[
            styles.modernStepTitle,
            step.isActive && styles.stepActiveTitle,
            step.isCompleted && styles.stepCompletedTitle,
          ]}>
            {step.title}
          </ThemedText>
          <ThemedText style={styles.modernStepDescription}>
            {step.description}
          </ThemedText>
          {step.timestamp && (
            <ThemedText style={styles.modernStepTimestamp}>
              {step.timestamp}
            </ThemedText>
          )}
        </View>
      </View>
    </View>
  );

  const renderModernOrderCard = useCallback(({ item: order }: { item: TrackingOrder }) => (
    <View
      key={order.id}
      style={styles.modernOrderCard}
      accessibilityLabel={`Order ${order.orderNumber}. Status: ${order.status}. ${order.merchantName}. Amount: ${order.totalAmount} rupees. ${order.estimatedDelivery}`}
      accessibilityRole="summary"
    >
      {/* Status Header with Progress */}
      <LinearGradient
        colors={[order.statusColor + '15', order.statusColor + '05']}
        style={styles.orderStatusHeader}
      >
        <View style={styles.statusHeaderContent}>
          <View style={styles.statusLeft}>
            <View style={[styles.modernStatusIcon, { backgroundColor: order.statusColor + '20' }]}>
              <Ionicons
                name={getStatusIcon(order.status) as any}
                size={18}
                color={order.statusColor}
              />
            </View>
            <View style={styles.statusLeftText}>
              <ThemedText style={styles.orderNumberLarge} numberOfLines={1} ellipsizeMode="middle">
                #{order.orderNumber}
              </ThemedText>
              <ThemedText style={[styles.statusTextLarge, { color: order.statusColor }]}>
                {order.status.replace('_', ' ')}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.statusRight}>
            <ThemedText style={styles.estimatedTime} numberOfLines={1}>
              {order.estimatedDelivery}
            </ThemedText>
            <ThemedText style={styles.estimatedLabel}>Estimated</ThemedText>
          </View>
        </View>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBackground}>
            <LinearGradient
              colors={[order.statusColor, order.statusColor + '80']}
              style={[styles.progressBar, { width: `${order.progress}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          <ThemedText style={styles.progressText}>{order.progress}% Complete</ThemedText>
        </View>
      </LinearGradient>

      {/* Merchant Info */}
      <View style={styles.merchantSection}>
        <View style={styles.merchantAvatar}>
          <ThemedText style={styles.merchantInitial}>
            {order.merchantName.charAt(0)}
          </ThemedText>
        </View>
        <View style={styles.merchantInfo}>
          <ThemedText style={styles.merchantName} numberOfLines={1}>
            {order.merchantName}
          </ThemedText>
          <ThemedText style={styles.orderItems} numberOfLines={1}>
            {order.items.slice(0, 2).join(' • ')}{order.items.length > 2 ? ` +${order.items.length - 2} more` : ''}
          </ThemedText>
        </View>
        <ThemedText style={styles.orderAmount}>{currencySymbol}{order.totalAmount.toLocaleString()}</ThemedText>
      </View>

      {/* Delivery Person Info (if on the way) */}
      {order.status === 'ON_THE_WAY' && order.deliveryPersonName && (
        <View style={styles.deliveryPersonCard}>
          <View style={styles.deliveryPersonLeft}>
            <View style={styles.deliveryPersonAvatar}>
              <Ionicons name="person" size={18} color={Colors.nileBlue} />
            </View>
            <View>
              <ThemedText style={styles.deliveryPersonName}>
                {order.deliveryPersonName}
              </ThemedText>
              <ThemedText style={styles.deliveryPersonRole}>Delivery Partner</ThemedText>
            </View>
          </View>
          <Pressable
            style={styles.callButton}
            accessibilityLabel={`Call delivery partner ${order.deliveryPersonName}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to call delivery partner"
          >
            <Ionicons name="call" size={18} color="white" />
          </Pressable>
        </View>
      )}

      {/* Modern Tracking Steps */}
      <View style={styles.modernTrackingContainer}>
        <ThemedText style={styles.trackingHeader}>Order Journey</ThemedText>
        <View style={styles.modernTrackingSteps}>
          {order.trackingSteps.map((step, index) => 
            renderModernTrackingStep(step, index === order.trackingSteps.length - 1, order.progress)
          )}
        </View>
      </View>

      {/* Fulfillment type badge */}
      {order.fulfillmentType && order.fulfillmentType !== 'delivery' && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f6fa', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 }}>
            <Ionicons
              name={order.fulfillmentType === 'pickup' ? 'bag-handle-outline' : order.fulfillmentType === 'drive_thru' ? 'car-outline' : order.fulfillmentType === 'dine_in' ? 'restaurant-outline' : 'bicycle-outline'}
              size={14}
              color={Colors.nileBlue}
            />
            <ThemedText style={{ fontSize: 12, fontWeight: '600', color: colors.nileBlue }}>
              {order.fulfillmentType === 'pickup' ? 'Pickup' : order.fulfillmentType === 'drive_thru' ? 'Drive-Thru' : order.fulfillmentType === 'dine_in' ? 'Dine-In' : 'Delivery'}
            </ThemedText>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push(`/orders/${order.id}` as any)}
          accessibilityLabel={`View details for order ${order.orderNumber}`}
          accessibilityRole="button"
          accessibilityHint="Double tap to view full order details"
        >
          <Ionicons name="receipt-outline" size={16} color={Colors.nileBlue} />
          <ThemedText style={styles.secondaryButtonText}>View Details</ThemedText>
        </Pressable>

        {(order.status === 'ON_THE_WAY' || order.status === 'PREPARING') && (
          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              const ft = order.fulfillmentType;
              if (ft === 'pickup') {
                router.push(`/pickup-tracking?orderId=${order.id}` as any);
              } else if (ft === 'drive_thru') {
                router.push(`/drivethru-tracking?orderId=${order.id}` as any);
              } else if (ft === 'dine_in') {
                router.push(`/dinein-tracking?orderId=${order.id}` as any);
              } else {
                router.push(`/orders/${order.id}/tracking` as any);
              }
            }}
            accessibilityLabel={`Track order ${order.orderNumber}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to track order in real-time"
          >
            <Ionicons name="location" size={16} color="white" />
            <ThemedText style={styles.primaryButtonText}>Track Order</ThemedText>
          </Pressable>
        )}

        {order.status === 'DELIVERED' && (
          <Pressable
            style={styles.shareButton}
            onPress={() => router.push(`/social-media?orderId=${order.id}` as any)}
            accessibilityLabel={`Share order ${order.orderNumber} on social media and earn 5 percent cashback`}
            accessibilityRole="button"
            accessibilityHint="Double tap to share and earn rewards"
          >
            <Ionicons name="gift" size={16} color={Colors.gold} />
            <ThemedText style={styles.shareButtonText}>Share & Earn 5%</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Modern Header */}
      <View
        style={styles.modernHeader}
      >
        <View style={styles.headerContent}>
            <Pressable
              style={styles.modernBackButton}
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              accessibilityHint="Navigate to previous screen"
            >
              <Ionicons name="arrow-back" size={22} color="white" />
            </Pressable>
            
            <View style={styles.headerCenter}>
              <ThemedText style={styles.headerTitle}>Order Tracking</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                {selectedTab === 'active'
                  ? `${counts.active} active order${counts.active !== 1 ? 's' : ''}`
                  : `${counts.past} past order${counts.past !== 1 ? 's' : ''}`
                }
              </ThemedText>
            </View>
            
            <Pressable
              style={styles.modernRefreshButton}
              onPress={handleRefresh}
              accessibilityLabel="Refresh orders"
              accessibilityRole="button"
              accessibilityHint="Double tap to refresh order list"
            >
              <Ionicons name="refresh" size={22} color="white" />
            </Pressable>
          </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, selectedTab === 'active' && styles.activeTab]}
          onPress={() => setSelectedTab('active')}
          accessibilityLabel={`Active orders tab. ${counts.active} active orders`}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedTab === 'active' }}
          accessibilityHint="Double tap to view active orders"
        >
          <ThemedText style={[
            styles.tabText,
            selectedTab === 'active' && styles.activeTabText
          ]}>
            Active Orders
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.tab, selectedTab === 'delivered' && styles.activeTab]}
          onPress={() => setSelectedTab('delivered')}
          accessibilityLabel={`Past orders tab. ${counts.past} past orders`}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedTab === 'delivered' }}
          accessibilityHint="Double tap to view past orders"
        >
          <ThemedText style={[
            styles.tabText,
            selectedTab === 'delivered' && styles.activeTabText
          ]}>
            Past Orders
          </ThemedText>
        </Pressable>
      </View>

      {loading ? (
        <DetailPageSkeleton />
      ) : error ? (
        <View style={[styles.content, styles.modernEmptyState]}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <ThemedText style={styles.emptyTitle}>Failed to Load Orders</ThemedText>
          <ThemedText style={styles.emptyDescription}>{error}</ThemedText>
          <Pressable style={styles.emptyActionButton} onPress={() => loadOrders()}>
            <ThemedText style={styles.emptyActionText}>Try Again</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={orders}
          renderItem={renderModernOrderCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.gold}
              colors={[Colors.gold]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.modernEmptyState}>
              <LinearGradient
                colors={[colors.lavenderMist, colors.linen]}
                style={styles.emptyIconContainer}
              >
                <Ionicons
                  name={selectedTab === 'active' ? 'receipt-outline' : 'checkmark-done-circle-outline'}
                  size={48}
                  color={Colors.nileBlue}
                />
              </LinearGradient>
              <ThemedText style={styles.emptyTitle}>
                {selectedTab === 'active' ? 'No Active Orders' : 'No Past Orders'}
              </ThemedText>
              <ThemedText style={styles.emptyDescription}>
                {selectedTab === 'active'
                  ? "You don't have any orders to track right now.\nStart shopping to see your orders here!"
                  : 'Your order history will appear here'}
              </ThemedText>
              {selectedTab === 'active' && (
                <Pressable style={styles.emptyActionButton} onPress={() => router.push('/')}>
                  <ThemedText style={styles.emptyActionText}>Browse Stores</ThemedText>
                </Pressable>
              )}
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={Colors.gold} />
              </View>
            ) : null
          }
          estimatedItemSize={120}
        />
      )}
    </SafeAreaView>
  );
}

// Nuqta Color Palette - mapped to DesignSystem tokens
const COLORS = {
  primary: Colors.nileBlue,
  primaryLight: Colors.background.tertiary,
  mustard: Colors.gold,
  peach: Colors.lightPeach,
  gold: Colors.gold,
  goldDark: Colors.primary[700],
  navy: Colors.nileBlue,
  text: Colors.text.primary,
  textMuted: Colors.text.tertiary,
  surface: Colors.background.secondary,
  white: Colors.background.primary,
  linen: Colors.background.secondary,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },

  // Modern Header
  modernHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 25,
    paddingBottom: 18,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primary,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({ web: { backdropFilter: 'blur(20px)' } as any, default: {} }),
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  modernRefreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Tab Container
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: -8,
    borderRadius: 14,
    padding: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  activeTabText: {
    color: 'white',
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 20,
  },

  // Modern Order Card
  modernOrderCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.08)',
  },

  // Status Header
  orderStatusHeader: {
    padding: 16,
    paddingBottom: 14,
  },
  statusHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  modernStatusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  statusLeftText: {
    flex: 1,
    minWidth: 0,
  },
  orderNumberLarge: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  statusTextLarge: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
    minWidth: 80,
  },
  estimatedTime: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  estimatedLabel: {
    fontSize: 11,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },

  // Progress Bar
  progressContainer: {
    marginTop: 8,
  },
  progressBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.tertiary,
    textAlign: 'right',
  },

  // Merchant Section
  merchantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  merchantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  merchantInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  merchantInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  merchantName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  orderItems: {
    fontSize: 12,
    color: Colors.text.tertiary,
    lineHeight: 16,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gold,
    flexShrink: 0,
  },

  // Delivery Person Card
  deliveryPersonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: 'rgba(223, 235, 247, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  deliveryPersonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deliveryPersonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(223, 235, 247, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  deliveryPersonName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  deliveryPersonRole: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modern Tracking
  modernTrackingContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  trackingHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 14,
  },
  modernTrackingSteps: {
    paddingLeft: 4,
  },
  modernStep: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepLeftColumn: {
    alignItems: 'center',
    marginRight: 12,
  },
  modernStepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.border.default,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepCompleted: {
    backgroundColor: Colors.gold,
  },
  stepActive: {
    backgroundColor: COLORS.primary,
  },
  pulsingDot: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 205, 87, 0.3)',
  },
  pulse1: {
    transform: [{ scale: 1 }],
  },
  pulse2: {
    transform: [{ scale: 1.4 }],
  },
  centerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  inactiveStepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border.dark,
  },
  modernStepLine: {
    width: 2,
    height: 32,
    backgroundColor: Colors.border.default,
  },
  stepLineCompleted: {
    backgroundColor: Colors.gold,
  },
  stepRightColumn: {
    flex: 1,
  },
  stepTextContainer: {
    paddingTop: 2,
  },
  modernStepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  stepActiveTitle: {
    color: COLORS.primary,
  },
  stepCompletedTitle: {
    color: Colors.nileBlue,
  },
  modernStepDescription: {
    fontSize: 12,
    color: Colors.text.tertiary,
    lineHeight: 16,
    marginBottom: 2,
  },
  modernStepTimestamp: {
    fontSize: 11,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 58, 82, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 5,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
    marginLeft: 5,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 200, 87, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 200, 87, 0.3)',
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary[700],
    marginLeft: 5,
  },

  // Modern Empty State
  modernEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyActionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
  },

  footer: {
    height: 40,
  },
});
export default withErrorBoundary(OrderTrackingScreen, 'Tracking');
