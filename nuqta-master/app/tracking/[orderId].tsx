// @ts-nocheck
// Detailed Order Tracking Page
// Shows comprehensive tracking information for a specific order

import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, StatusBar, Platform, SafeAreaView, RefreshControl, Linking, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { PROFILE_COLORS } from '@/types/profile.types';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { Order } from '@/services/ordersApi';
import ordersService from '@/services/ordersApi';
import ContactStoreModal from '@/components/store/ContactStoreModal';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { DetailPageSkeleton } from '@/components/skeletons';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { catchAndReport } from '@/utils/catchAndReport';
import { useIsMounted } from '@/hooks/useIsMounted';
interface DeliveryPartner {
  name: string;
  phone: string;
  rating: number;
  vehicleNumber: string;
  photo?: string;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
}

interface TrackingUpdate {
  id: string;
  status: string;
  description: string;
  timestamp: string;
  location?: string;
  isActive: boolean;
  isCompleted: boolean;
}

interface DetailedOrder {
  id: string;
  orderNumber: string;
  merchantName: string;
  merchantPhone: string;
  merchantAddress: string;
  status: 'PREPARING' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED';
  statusColor: string;
  estimatedDelivery: string;
  actualDelivery?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  total: number;
  deliveryAddress: string;
  deliveryInstructions?: string;
  deliveryPartner?: DeliveryPartner;
  trackingUpdates: TrackingUpdate[];
  paymentMethod: string;
  orderDate: string;
}

function DetailedOrderTrackingPage() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Use real-time order tracking hook
  const {
    order: realOrder,
    loading: isLoading,
    error,
    statusUpdate,
    locationUpdate,
    deliveryPartner: liveDeliveryPartner,
    timeline,
    isLive,
    refresh,
    isConnected,
  } = useOrderTracking(orderId as string, undefined, true);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    if (!isMounted()) return;
    setIsRefreshing(false);
  };

  // Map backend order data to UI format
  const order = useMemo(() => {
    if (!realOrder) return null;

    // Get merchant/store info from first item
    const firstItem = realOrder.items?.[0];
    const storeName = firstItem?.product?.store?.name || 'Store';

    // Determine status and color
    const statusMap: Record<string, { display: string; color: string; icon: string }> = {
      placed: { display: 'Order Placed', color: PROFILE_COLORS.primary, icon: 'receipt' },
      confirmed: { display: 'Confirmed', color: PROFILE_COLORS.success, icon: 'checkmark-circle' },
      preparing: { display: 'Preparing', color: PROFILE_COLORS.warning, icon: 'restaurant' },
      ready: { display: 'Ready for Pickup', color: PROFILE_COLORS.primary, icon: 'cube' },
      dispatched: { display: 'Dispatched', color: PROFILE_COLORS.primary, icon: 'send' },
      out_for_delivery: { display: 'Out for Delivery', color: PROFILE_COLORS.warning, icon: 'car' },
      delivered: { display: 'Delivered', color: PROFILE_COLORS.success, icon: 'checkmark-circle' },
      cancelled: { display: 'Cancelled', color: PROFILE_COLORS.error, icon: 'close-circle' },
      pending: { display: 'Pending', color: PROFILE_COLORS.textSecondary, icon: 'time' },
      processing: { display: 'Processing', color: PROFILE_COLORS.warning, icon: 'sync' },
      shipped: { display: 'Shipped', color: PROFILE_COLORS.primary, icon: 'airplane' },
    };

    const statusInfo = statusMap[realOrder.status] || statusMap.pending;

    // Format delivery partner info
    const deliveryPartnerData = liveDeliveryPartner || (locationUpdate?.deliveryPartner ? {
      name: locationUpdate.deliveryPartner.name,
      phone: locationUpdate.deliveryPartner.phone,
      rating: 0,
      vehicleNumber: locationUpdate.deliveryPartner.vehicle || 'N/A',
    } : null);

    return {
      ...realOrder,
      merchantName: storeName,
      statusDisplay: statusInfo.display,
      statusColor: statusInfo.color,
      statusIcon: statusInfo.icon,
      deliveryPartnerData,
      locationData: locationUpdate,
    };
  }, [realOrder, liveDeliveryPartner, locationUpdate]);

  // Handle navigation
  const handleBackPress = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  // Handle calling store/merchant - Now opens Contact Store Modal
  const handleCallMerchant = () => {
    setShowContactModal(true);
  };

  // Handle calling delivery partner
  const handleCallDeliveryPartner = () => {
    if (order?.deliveryPartnerData?.phone) {
      try {
        Linking.openURL(`tel:${order.deliveryPartnerData.phone}`);
      } catch (e) { catchAndReport(e, setLinkError, 'OrderTracking/callDeliveryPartner'); }
    } else {
      platformAlertSimple('Not Available', 'Delivery partner contact not available yet.');
    }
  };

  // Handle order cancellation with backend API
  const handleCancelOrder = () => {
    if (!order) return;

    // Check if order can be cancelled
    const cancellableStatuses = ['placed', 'confirmed', 'pending', 'processing'];
    if (!cancellableStatuses.includes(order.status)) {
      platformAlertSimple('Cannot Cancel', 'This order cannot be cancelled at this stage. Please contact support if you need assistance.');
      return;
    }

    platformAlertDestructive(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      'Yes, Cancel',
      async () => {
        try {
          setIsCancelling(true);
          const response = await ordersService.cancelOrder(order._id || order.id, 'Customer requested cancellation');

          if (response.success) {
            platformAlertSimple('Order Cancelled', 'Your order has been cancelled successfully.');
            refresh(); // Refresh order data
          } else {
            platformAlertSimple('Error', response.error || 'Failed to cancel order');
          }
        } catch (error) {
          platformAlertSimple('Error', 'Failed to cancel order. Please try again.');
        } finally {
          if (!isMounted()) return;
          setIsCancelling(false);
        }
      }
    );
  };

  // Get status icon based on status
  const getStatusIcon = (status: string) => {
    const statusMap: Record<string, string> = {
      placed: 'receipt',
      confirmed: 'checkmark-circle',
      preparing: 'restaurant',
      ready: 'cube',
      dispatched: 'send',
      out_for_delivery: 'car',
      delivered: 'checkmark-circle',
      cancelled: 'close-circle',
      pending: 'time',
      processing: 'sync',
      shipped: 'airplane',
    };
    return statusMap[status] || 'time';
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp: string | Date) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return diffMins === 0 ? 'Just now' : `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Render timeline update from real backend data
  const renderTimelineUpdate = (update: any, index: number, totalItems: number) => {
    const isLast = index === totalItems - 1;
    const isActive = index === totalItems - 1 && order?.status !== 'delivered' && order?.status !== 'cancelled';
    const isCompleted = !isActive || order?.status === 'delivered';

    return (
      <View
        key={update._id || index}
        style={styles.trackingUpdate}
        accessibilityLabel={`${update.status || 'Update'}. ${update.message || 'Order status updated'}. ${update.timestamp ? formatTimestamp(update.timestamp) : ''}`}
        accessibilityRole="text"
      >
        <View style={styles.updateIndicator}>
          <View style={[
            styles.updateCircle,
            isCompleted && styles.updateCompleted,
            isActive && styles.updateActive,
          ]}>
            {isCompleted ? (
              <Ionicons name="checkmark" size={12} color="white" />
            ) : (
              <View style={[
                styles.updateDot,
                isActive && styles.updateActiveDot,
              ]} />
            )}
          </View>
          {!isLast && (
            <View style={[
              styles.updateLine,
              isCompleted && styles.updateLineCompleted,
            ]} />
          )}
        </View>

        <View style={styles.updateContent}>
          <ThemedText style={[
            styles.updateStatus,
            isActive && styles.updateActiveStatus,
            isCompleted && styles.updateCompletedStatus,
          ]}>
            {update.status || 'Update'}
          </ThemedText>
          <ThemedText style={styles.updateDescription}>
            {update.message || 'Order status updated'}
          </ThemedText>
          {update.timestamp && (
            <ThemedText style={styles.updateTimestamp}>
              {formatTimestamp(update.timestamp)}
            </ThemedText>
          )}
        </View>
      </View>
    );
  };

  // Render order item from real backend data
  const renderOrderItem = (item: any, index: number) => (
    <View key={item.id || index} style={styles.orderItem}>
      <View style={styles.itemInfo}>
        <ThemedText style={styles.itemName}>
          {item.product?.name || item.productName || 'Product'}
        </ThemedText>
        <ThemedText style={styles.itemDetails}>
          Qty: {item.quantity} × {currencySymbol}{item.unitPrice?.toLocaleString() || item.price?.toLocaleString() || '0'}
        </ThemedText>
      </View>
      <ThemedText style={styles.itemTotal}>
        {currencySymbol}{(item.totalPrice || item.subtotal || 0).toLocaleString()}
      </ThemedText>
    </View>
  );

  // Show loading state
  if (isLoading && !order) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={PROFILE_COLORS.primary}
          translucent={false}
        />
        <LinearGradient
          colors={[PROFILE_COLORS.primary, PROFILE_COLORS.primaryLight]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Pressable style={styles.headerButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Order Tracking</ThemedText>
            </View>
            <View style={styles.headerButton} />
          </View>
        </LinearGradient>
        <DetailPageSkeleton />
      </SafeAreaView>
    );
  }

  // Show error state
  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={PROFILE_COLORS.primary}
          translucent={false}
        />
        <LinearGradient
          colors={[PROFILE_COLORS.primary, PROFILE_COLORS.primaryLight]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Pressable style={styles.headerButton} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <ThemedText style={styles.headerTitle}>Order Tracking</ThemedText>
            </View>
            <View style={styles.headerButton} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.text.tertiary} />
          <ThemedText style={styles.errorTitle}>
            {error ? 'Error Loading Order' : 'Order Not Found'}
          </ThemedText>
          <ThemedText style={styles.errorText}>
            {error || 'The order you are looking for could not be found.'}
          </ThemedText>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
            <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
          </Pressable>
          <Pressable
            style={[styles.backButton, { backgroundColor: PROFILE_COLORS.primary, marginTop: Spacing.md }]}
            onPress={refresh}
          >
            <ThemedText style={styles.backButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PROFILE_COLORS.primary}
        translucent={false}
      />
      
      {/* Header */}
      <LinearGradient
        colors={[PROFILE_COLORS.primary, PROFILE_COLORS.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.headerButton}
            onPress={handleBackPress}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Navigate to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle}>Order #{order.orderNumber}</ThemedText>
            <ThemedText style={styles.headerSubtitle}>{order.merchantName}</ThemedText>
            {isLive && (
              <View style={styles.liveBadge}>
                <View style={styles.liveIndicatorDot} />
                <ThemedText style={styles.liveText}>Live</ThemedText>
              </View>
            )}
          </View>

          <Pressable
            style={styles.headerButton}
            onPress={handleRefresh}
            accessibilityLabel="Refresh order status"
            accessibilityRole="button"
            accessibilityHint="Double tap to refresh order information"
          >
            <Ionicons name="refresh" size={24} color="white" />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={PROFILE_COLORS.primary}
            colors={[PROFILE_COLORS.primary]}
          />
        }
      >
        {/* Status Card */}
        <View
          style={styles.statusCard}
          accessibilityLabel={`Order status: ${order.statusDisplay}`}
          accessibilityRole="text"
        >
          <View style={styles.statusHeader}>
            <View style={[styles.statusBadge, { backgroundColor: order.statusColor + '20' }]}>
              <Ionicons
                name={order.statusIcon as any}
                size={20}
                color={order.statusColor}
              />
              <ThemedText style={[styles.statusText, { color: order.statusColor }]}>
                {order.statusDisplay}
              </ThemedText>
            </View>
          </View>

          {/* Real-time status update message */}
          {statusUpdate && (
            <View style={styles.statusUpdateBanner}>
              <Ionicons name="information-circle" size={16} color={PROFILE_COLORS.primary} />
              <ThemedText style={styles.statusUpdateText}>{statusUpdate.message}</ThemedText>
            </View>
          )}

          {/* Estimated delivery time */}
          {order.tracking?.estimatedDelivery && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <ThemedText style={styles.estimatedDelivery}>
              Estimated delivery: {formatTimestamp(order.tracking.estimatedDelivery)}
            </ThemedText>
          )}

          {/* Location update if available */}
          {locationUpdate && order.status === 'out_for_delivery' && (
            <View style={styles.locationUpdateCard}>
              <Ionicons name="location" size={16} color={PROFILE_COLORS.primary} />
              <ThemedText style={styles.locationUpdateText}>
                {locationUpdate.location.address || `${locationUpdate.distanceToDestination || '0'} km away`}
              </ThemedText>
            </View>
          )}

          {/* Cancel order button */}
          {order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'shipped' && (
            <Pressable
              style={[styles.cancelButton, isCancelling && styles.cancelButtonDisabled]}
              onPress={handleCancelOrder}
              disabled={isCancelling}
              accessibilityLabel={`Cancel order ${order.orderNumber}`}
              accessibilityRole="button"
              accessibilityHint="Double tap to cancel this order"
              accessibilityState={{ disabled: isCancelling }}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <ThemedText style={styles.cancelButtonText}>Cancel Order</ThemedText>
              )}
            </Pressable>
          )}
        </View>

        {/* Delivery Partner Card */}
        {order.deliveryPartnerData && (order.status === 'out_for_delivery' || order.status === 'dispatched') && (
          <View style={styles.deliveryPartnerCard}>
            <ThemedText style={styles.cardTitle}>Delivery Partner</ThemedText>

            <View style={styles.partnerInfo}>
              <View style={styles.partnerDetails}>
                <ThemedText style={styles.partnerName}>{order.deliveryPartnerData.name}</ThemedText>
                {order.deliveryPartnerData.rating > 0 && (
                  <View style={styles.partnerRating}>
                    <Ionicons name="star" size={14} color={colors.brand.goldBright} />
                    <ThemedText style={styles.ratingText}>{order.deliveryPartnerData.rating.toFixed(1)}</ThemedText>
                  </View>
                )}
                {order.deliveryPartnerData.vehicleNumber && (
                  <ThemedText style={styles.vehicleNumber}>
                    Vehicle: {order.deliveryPartnerData.vehicleNumber}
                  </ThemedText>
                )}
              </View>

              <Pressable
                style={styles.callButton}
                onPress={handleCallDeliveryPartner}
              >
                <Ionicons name="call" size={20} color="white" />
                <ThemedText style={styles.callButtonText}>Call</ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {/* Tracking Timeline */}
        <View style={styles.trackingCard}>
          <ThemedText style={styles.cardTitle}>Order Timeline</ThemedText>

          <View style={styles.trackingTimeline}>
            {(timeline && timeline.length > 0) ? (
              timeline.map((update, index) =>
                renderTimelineUpdate(update, index, timeline.length)
              )
            ) : (
              <View style={styles.noTimelineContainer}>
                <Ionicons name="time-outline" size={32} color={Colors.text.tertiary} />
                <ThemedText style={styles.noTimelineText}>No tracking updates yet</ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.itemsCard}>
          <ThemedText style={styles.cardTitle}>Order Items</ThemedText>

          <View style={styles.itemsList}>
            {order.items && order.items.length > 0 ? (
              order.items.map((item: any, index: number) => renderOrderItem(item, index))
            ) : (
              <ThemedText style={styles.noItemsText}>No items found</ThemedText>
            )}
          </View>

          {/* Order Summary */}
          <View style={styles.orderSummary}>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {currencySymbol}{(order.totals?.subtotal || order.summary?.subtotal || 0).toLocaleString()}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Delivery Fee</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {currencySymbol}{(order.totals?.delivery || order.delivery?.deliveryFee || 0).toLocaleString()}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Taxes</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {currencySymbol}{(order.totals?.tax || order.summary?.tax || 0).toLocaleString()}
              </ThemedText>
            </View>
            {order.totals?.discount > 0 && (
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Discount</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: PROFILE_COLORS.success }]}>
                  -{currencySymbol}{order.totals.discount.toLocaleString()}
                </ThemedText>
              </View>
            )}
            {order.payment?.coinsUsed && (order.payment.coinsUsed.wasilCoins > 0 || order.payment.coinsUsed.promoCoins > 0 || order.payment.coinsUsed.storePromoCoins > 0) && (
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>
                  💎 Coins Used
                  {order.payment.coinsUsed.storePromoCoins > 0 && ' (includes Store Promo)'}
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: Colors.brand.purple }]}>
                  -{currencySymbol}{order.payment.coinsUsed.totalCoinsValue || 0}
                </ThemedText>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <ThemedText style={styles.totalLabel}>Total</ThemedText>
              <ThemedText style={styles.totalValue}>
                {currencySymbol}{(order.totals?.total || order.summary?.total || 0).toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Payment Breakdown - detailed coin usage */}
        {order.payment?.coinsUsed && ((order.payment.coinsUsed.rezCoins || order.payment.coinsUsed.wasilCoins || 0) > 0 || (order.payment.coinsUsed.promoCoins || 0) > 0 || (order.payment.coinsUsed.storePromoCoins || 0) > 0) && (
          <View style={styles.itemsCard}>
            <ThemedText style={styles.cardTitle}>Payment Breakdown</ThemedText>
            <View style={styles.orderSummary}>
              {(order.payment.coinsUsed.rezCoins || order.payment.coinsUsed.wasilCoins || 0) > 0 && (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>{BRAND.COIN_NAME}</ThemedText>
                  <ThemedText style={[styles.summaryValue, { color: Colors.brand.purple }]}>
                    -{currencySymbol}{(order.payment.coinsUsed.rezCoins || order.payment.coinsUsed.wasilCoins || 0).toLocaleString()}
                  </ThemedText>
                </View>
              )}
              {(order.payment.coinsUsed.promoCoins || 0) > 0 && (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Promo Coins</ThemedText>
                  <ThemedText style={[styles.summaryValue, { color: Colors.warning }]}>
                    -{currencySymbol}{order.payment.coinsUsed.promoCoins.toLocaleString()}
                  </ThemedText>
                </View>
              )}
              {(order.payment.coinsUsed.storePromoCoins || 0) > 0 && (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Store Branded Coins</ThemedText>
                  <ThemedText style={[styles.summaryValue, { color: Colors.success }]}>
                    -{currencySymbol}{order.payment.coinsUsed.storePromoCoins.toLocaleString()}
                  </ThemedText>
                </View>
              )}
              {order.totals?.paidAmount != null && (
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <ThemedText style={styles.totalLabel}>Cash / Gateway Paid</ThemedText>
                  <ThemedText style={styles.totalValue}>
                    {currencySymbol}{(order.totals.paidAmount || 0).toLocaleString()}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Refund Info - shown for cancelled/refunded orders */}
        {(order.status === 'refunded' || order.status === 'cancelled') && order.totals?.refundAmount > 0 && (
          <View style={styles.itemsCard}>
            <ThemedText style={styles.cardTitle}>Refund Information</ThemedText>
            <View style={styles.orderSummary}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Refund Amount</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: PROFILE_COLORS.success }]}>
                  {currencySymbol}{order.totals.refundAmount.toLocaleString()}
                </ThemedText>
              </View>
              {order.payment?.refundedAt && (
                <View style={styles.summaryRow}>
                  <ThemedText style={styles.summaryLabel}>Refunded On</ThemedText>
                  <ThemedText style={styles.summaryValue}>
                    {new Date(order.payment.refundedAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </ThemedText>
                </View>
              )}
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Refund Status</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: PROFILE_COLORS.success }]}>
                  {order.cancellation?.refundStatus?.toUpperCase() || 'COMPLETED'}
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Order Details */}
        <View style={styles.detailsCard}>
          <ThemedText style={styles.cardTitle}>Order Details</ThemedText>

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Order Date</ThemedText>
            <ThemedText style={styles.detailValue}>
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Payment Method</ThemedText>
            <ThemedText style={styles.detailValue}>
              {order.payment?.method?.toUpperCase() || 'N/A'}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Payment Status</ThemedText>
            <ThemedText style={[
              styles.detailValue,
              { color: order.payment?.status === 'paid' ? PROFILE_COLORS.success : PROFILE_COLORS.warning }
            ]}>
              {order.payment?.status?.toUpperCase() || 'PENDING'}
            </ThemedText>
          </View>

          <View style={styles.detailRow}>
            <ThemedText style={styles.detailLabel}>Delivery Address</ThemedText>
            <ThemedText style={styles.detailValue}>
              {order.delivery?.address ?
                `${order.delivery.address.addressLine1}, ${order.delivery.address.city}, ${order.delivery.address.state} ${order.delivery.address.pincode}` :
                'Address not available'
              }
            </ThemedText>
          </View>

          {order.specialInstructions && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Special Instructions</ThemedText>
              <ThemedText style={styles.detailValue}>{order.specialInstructions}</ThemedText>
            </View>
          )}

          {order.couponCode && (
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>Coupon Applied</ThemedText>
              <ThemedText style={[styles.detailValue, { color: PROFILE_COLORS.success }]}>
                {order.couponCode}
              </ThemedText>
            </View>
          )}

          <Pressable
            style={styles.contactMerchant}
            onPress={handleCallMerchant}
            accessibilityLabel={`Contact ${order?.merchantName || 'store'}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to contact the store"
          >
            <Ionicons name="call-outline" size={20} color={PROFILE_COLORS.primary} />
            <ThemedText style={styles.contactMerchantText}>Contact Store</ThemedText>
          </Pressable>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* Contact Store Modal */}
      <ContactStoreModal
        visible={showContactModal}
        onClose={() => setShowContactModal(false)}
        storeId={order?.items?.[0]?.product?.store?.id || ''}
        storeName={order?.merchantName || 'Store'}
        storePhone={order?.items?.[0]?.product?.store?.phone}
        storeEmail={order?.items?.[0]?.product?.store?.email}
        orderId={order?._id || order?.id}
        orderNumber={order?.orderNumber}
      />
    </SafeAreaView>
);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PROFILE_COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    fontSize: Typography.bodyLarge.fontSize,
    color: Colors.text.tertiary,
    marginTop: Spacing.base,
  },
  liveIndicator: {
    fontSize: Typography.bodySmall.fontSize,
    color: PROFILE_COLORS.success,
    marginTop: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: Typography.h3.fontSize,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  backButton: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  backButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.base,
  },
  headerTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: Typography.bodySmall.fontSize,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.xs,
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: Spacing.xs,
  },
  liveText: {
    fontSize: Typography.overline.fontSize,
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  
  // Cards
  statusCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  statusText: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    marginLeft: Spacing.sm,
    textTransform: 'capitalize',
  },
  estimatedDelivery: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: PROFILE_COLORS.text,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  statusUpdateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PROFILE_COLORS.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  statusUpdateText: {
    fontSize: Typography.bodySmall.fontSize,
    color: PROFILE_COLORS.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  locationUpdateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: 10,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  locationUpdateText: {
    fontSize: Typography.bodySmall.fontSize,
    color: PROFILE_COLORS.text,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: BorderRadius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: Colors.error,
    fontWeight: '600',
  },
  
  // Delivery Partner Card
  deliveryPartnerCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  cardTitle: {
    fontSize: Typography.h4.fontSize,
    fontWeight: '700',
    color: PROFILE_COLORS.text,
    marginBottom: Spacing.base,
  },
  partnerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerDetails: {
    flex: 1,
  },
  partnerName: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: PROFILE_COLORS.text,
    marginBottom: Spacing.xs,
  },
  partnerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  ratingText: {
    fontSize: Typography.body.fontSize,
    color: PROFILE_COLORS.text,
    marginLeft: Spacing.xs,
  },
  vehicleNumber: {
    fontSize: Typography.bodySmall.fontSize,
    color: PROFILE_COLORS.textSecondary,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PROFILE_COLORS.success,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  callButtonText: {
    color: Colors.text.inverse,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  
  // Tracking Card
  trackingCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  trackingTimeline: {
    paddingLeft: Spacing.sm,
  },
  trackingUpdate: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  updateIndicator: {
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  updateCircle: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.md,
    backgroundColor: PROFILE_COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateCompleted: {
    backgroundColor: PROFILE_COLORS.success,
  },
  updateActive: {
    backgroundColor: PROFILE_COLORS.primary,
  },
  updateDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PROFILE_COLORS.textSecondary,
  },
  updateActiveDot: {
    backgroundColor: Colors.background.primary,
  },
  updateLine: {
    width: 2,
    height: 40,
    backgroundColor: PROFILE_COLORS.border,
    marginTop: Spacing.sm,
  },
  updateLineCompleted: {
    backgroundColor: PROFILE_COLORS.success,
  },
  updateContent: {
    flex: 1,
  },
  updateStatus: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '600',
    color: PROFILE_COLORS.text,
    marginBottom: Spacing.xs,
  },
  updateActiveStatus: {
    color: PROFILE_COLORS.primary,
  },
  updateCompletedStatus: {
    color: PROFILE_COLORS.success,
  },
  updateDescription: {
    fontSize: Typography.body.fontSize,
    color: PROFILE_COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.xs,
  },
  updateLocation: {
    fontSize: Typography.bodySmall.fontSize,
    color: PROFILE_COLORS.primary,
    marginBottom: Spacing.xs,
  },
  updateTimestamp: {
    fontSize: Typography.bodySmall.fontSize,
    color: PROFILE_COLORS.textSecondary,
    fontWeight: '500',
  },
  noTimelineContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noTimelineText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },

  // Items Card
  itemsCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  itemsList: {
    marginBottom: Spacing.base,
  },
  noItemsText: {
    fontSize: Typography.body.fontSize,
    color: Colors.text.tertiary,
    textAlign: 'center',
    padding: Spacing.lg,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: PROFILE_COLORS.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: PROFILE_COLORS.text,
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: Typography.bodySmall.fontSize,
    color: PROFILE_COLORS.textSecondary,
  },
  itemTotal: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
    color: PROFILE_COLORS.text,
  },
  orderSummary: {
    borderTopWidth: 1,
    borderTopColor: PROFILE_COLORS.border,
    paddingTop: Spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    fontSize: Typography.body.fontSize,
    color: PROFILE_COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: Typography.body.fontSize,
    fontWeight: '500',
    color: PROFILE_COLORS.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: PROFILE_COLORS.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  totalLabel: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: PROFILE_COLORS.text,
  },
  totalValue: {
    fontSize: Typography.bodyLarge.fontSize,
    fontWeight: '700',
    color: PROFILE_COLORS.primary,
  },
  
  // Details Card
  detailsCard: {
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  detailRow: {
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: PROFILE_COLORS.textSecondary,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontSize: Typography.body.fontSize,
    color: PROFILE_COLORS.text,
    lineHeight: 18,
  },
  contactMerchant: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PROFILE_COLORS.primary,
    borderRadius: BorderRadius.sm,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  contactMerchantText: {
    color: PROFILE_COLORS.primary,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  
  bottomSpace: {
    height: 20,
  },
});

export default withErrorBoundary(DetailedOrderTrackingPage, 'Order Tracking');