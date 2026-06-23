// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator, Linking, Platform } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { DetailPageSkeleton } from '@/components/skeletons';
import OrderTimeline from '@/components/orders/OrderTimeline';
import DeliveryMap from '@/components/orders/DeliveryMap';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple, platformAlertConfirm, platformAlertDestructive } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

function OrderTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const {
    order,
    loading,
    error,
    statusUpdate,
    locationUpdate,
    deliveryPartner,
    timeline,
    isLive,
    isConnected,
    isReconnecting,
    reconnectAttempts,
    refresh,
  } = useOrderTracking(orderId || null) as any;

  // Show notification when status changes
  useEffect(() => {
    if (statusUpdate) {
      // In production, this would trigger a push notification

    }
  }, [statusUpdate]);

  const handleRefresh = () => {
    refresh();
  };

  const handleCancelOrder = () => {
    platformAlertDestructive(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      'Yes, Cancel',
      async () => {
        // Call cancel order API

        // ordersService.cancelOrder(orderId);
      }
    );
  };

  const handleContactSupport = () => {
    platformAlertConfirm(
      'Contact Support',
      'How would you like to reach us?',
      'Call Support',
      () => {
        // Support phone number
        Linking.openURL('tel:+918001234567').catch(() => {
          platformAlertSimple('Unable to Call', 'Please try again or email us at support@nuqta.app');
        });
      }
    );
  };

  if (loading && !order) {
    return (
      <View style={styles.centered}>
        <Stack.Screen
          options={{
            title: 'Order Tracking',
            headerBackTitle: 'Back',
          }}
        />
        <DetailPageSkeleton />
      </View>
    );
  }

  if (error && !order) {
    return (
      <View style={styles.centered}>
        <Stack.Screen
          options={{
            title: 'Order Tracking',
            headerBackTitle: 'Back',
          }}
        />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.centered}>
        <Stack.Screen
          options={{
            title: 'Order Tracking',
            headerBackTitle: 'Back',
          }}
        />
        <Text style={styles.errorText}>Order not found</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const canCancel = ['placed', 'confirmed', 'preparing'].includes(order.status);
  const showMap = ['dispatched', 'out_for_delivery'].includes(order.status);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `Order ${order.orderNumber}`,
          headerBackTitle: 'Orders',
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            colors={[Colors.gold]}
          />
        }
      >
        {/* Reconnection Banner */}
        {isReconnecting && (
          <View style={{ backgroundColor: Colors.warningScale[50], paddingHorizontal: Spacing.base, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <ActivityIndicator size="small" color={Colors.warning} />
            <Text style={{ flex: 1, color: colors.brand.amberDark, ...Typography.caption }}>
              Reconnecting... (attempt {reconnectAttempts || 1})
            </Text>
            <Pressable onPress={refresh}>
              <Text style={{ color: Colors.warning, fontWeight: '600', ...Typography.caption }}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Connection lost banner (after max attempts) */}
        {!isConnected && !isReconnecting && reconnectAttempts > 0 && (
          <View style={{ backgroundColor: Colors.errorScale[50], paddingHorizontal: Spacing.base, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <Ionicons name="cloud-offline-outline" size={18} color={Colors.error} />
            <Text style={{ flex: 1, color: '#991B1B', ...Typography.caption }}>
              Connection lost. Updates may be delayed.
            </Text>
            <Pressable onPress={refresh}>
              <Text style={{ color: Colors.error, fontWeight: '600', ...Typography.caption }}>Retry</Text>
            </Pressable>
          </View>
        )}

        {/* Order Header */}
        <View style={styles.headerCard}>
          <View style={styles.orderHeaderRow}>
            <View>
              <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
              <Text style={styles.orderDate}>
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <View style={styles.liveIndicatorContainer}>
              {isLive && isConnected ? (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              ) : (
                <Text style={styles.offlineText}>Offline</Text>
              )}
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
          </View>
        </View>

        {/* Delivery Map */}
        {showMap && (
          <View style={styles.section}>
            <DeliveryMap
              locationUpdate={locationUpdate}
              deliveryAddress={order.delivery?.address}
            />
          </View>
        )}

        {/* Order Timeline */}
        <View style={styles.section}>
          <OrderTimeline
            currentStatus={order.status}
            timeline={timeline || order.timeline}
            estimatedDeliveryTime={order.delivery?.estimatedTime || order.estimatedDeliveryTime}
          />
        </View>

        {/* Order Items Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemsSummary}>
            <Text style={styles.itemsCount}>
              {order.items.length} item{order.items.length > 1 ? 's' : ''}
            </Text>
            <Text style={styles.itemsTotal}>{currencySymbol}{order.totals.total}</Text>
          </View>
          {order.items.slice(0, 3).map((item: any, index: number) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {item.name || item.product?.name}
              </Text>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
            </View>
          ))}
          {order.items.length > 3 && (
            <Text style={styles.moreItems}>
              +{order.items.length - 3} more item{order.items.length - 3 > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Service Bookings Section */}
        {order.items.some((item: any) => item.itemType === 'service') && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Bookings</Text>
            {order.items
              .filter((item: any) => item.itemType === 'service')
              .map((item: any, index: number) => {
                const bookingDetails = item.serviceBookingDetails || {};
                const bookingDate = bookingDetails.bookingDate
                  ? new Date(bookingDetails.bookingDate).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Date TBD';
                const formatTime = (timeStr: string) => {
                  if (!timeStr) return '';
                  const [hours, minutes] = timeStr.split(':').map(Number);
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  const displayHour = hours % 12 || 12;
                  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                };
                const timeSlot = bookingDetails.timeSlot?.start
                  ? `${formatTime(bookingDetails.timeSlot.start)} - ${formatTime(bookingDetails.timeSlot.end)}`
                  : 'Time TBD';

                return (
                  <View key={index} style={styles.serviceBookingCard}>
                    <View style={styles.serviceBookingHeader}>
                      <Text style={styles.serviceBookingName}>
                        {item.name || item.product?.name}
                      </Text>
                      <View style={[
                        styles.serviceBookingStatus,
                        { backgroundColor: item.serviceBookingId ? colors.lavenderMist : colors.linen }
                      ]}>
                        <Text style={[
                          styles.serviceBookingStatusText,
                          { color: item.serviceBookingId ? colors.nileBlue : colors.lightMustard }
                        ]}>
                          {item.serviceBookingId ? 'Confirmed' : 'Pending'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.serviceBookingDetails}>
                      <View style={styles.serviceBookingRow}>
                        <Text style={styles.serviceBookingIcon}>📅</Text>
                        <Text style={styles.serviceBookingText}>{bookingDate}</Text>
                      </View>
                      <View style={styles.serviceBookingRow}>
                        <Text style={styles.serviceBookingIcon}>🕐</Text>
                        <Text style={styles.serviceBookingText}>{timeSlot}</Text>
                      </View>
                      {bookingDetails.duration && (
                        <View style={styles.serviceBookingRow}>
                          <Text style={styles.serviceBookingIcon}>⏱️</Text>
                          <Text style={styles.serviceBookingText}>{bookingDetails.duration} min</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        {/* Delivery Address */}
        {order.delivery?.address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <View style={styles.addressCard}>
              <Text style={styles.addressName}>{order.delivery.address.name}</Text>
              <Text style={styles.addressText}>
                {order.delivery.address.addressLine1}
                {order.delivery.address.addressLine2 && `, ${order.delivery.address.addressLine2}`}
              </Text>
              <Text style={styles.addressText}>
                {order.delivery.address.city}, {order.delivery.address.state} -{' '}
                {order.delivery.address.pincode}
              </Text>
              <Text style={styles.addressPhone}>{order.delivery.address.phone}</Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {canCancel && (
            <Pressable
              style={styles.cancelButton}
              onPress={handleCancelOrder}
             
            >
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </Pressable>
          )}

          <Pressable
            style={styles.supportButton}
            onPress={handleContactSupport}
           
          >
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'delivered':
      return Colors.nileBlue;
    case 'out_for_delivery':
    case 'dispatched':
      return Colors.nileBlue;
    case 'preparing':
    case 'ready':
      return Colors.gold;
    case 'cancelled':
      return Colors.error;
    default:
      return Colors.text.tertiary;
  }
}

function getStatusLabel(status: string): string {
  const labels: { [key: string]: string } = {
    placed: 'ORDER PLACED',
    confirmed: 'CONFIRMED',
    preparing: 'PREPARING',
    ready: 'READY FOR DISPATCH',
    dispatched: 'DISPATCHED',
    out_for_delivery: 'OUT FOR DELIVERY',
    delivered: 'DELIVERED',
    cancelled: 'CANCELLED',
  };
  return labels[status] || status.toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.linen,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['2xl'],
  },
  headerCard: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  orderNumber: {
    ...Typography.h3,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  orderDate: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  liveIndicatorContainer: {
    alignItems: 'flex-end',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lavenderMist,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.nileBlue,
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  offlineText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  section: {
    backgroundColor: Colors.background.primary,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    padding: Spacing.base,
    paddingBottom: Spacing.md,
  },
  itemsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  itemsCount: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  itemsTotal: {
    ...Typography.h3,
    color: Colors.text.primary,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  itemName: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.secondary,
  },
  itemQuantity: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginLeft: Spacing.md,
  },
  moreItems: {
    ...Typography.caption,
    color: Colors.nileBlue,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  addressCard: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  addressName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  addressText: {
    ...Typography.body,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  addressPhone: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  actions: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  cancelButton: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.error,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.error,
  },
  supportButton: {
    backgroundColor: Colors.nileBlue,
    paddingVertical: 14,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  supportButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  errorText: {
    ...Typography.h4,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  retryButton: {
    backgroundColor: Colors.nileBlue,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  // Service Booking Styles
  serviceBookingCard: {
    backgroundColor: colors.lavenderMist,
    borderRadius: BorderRadius.md,
    padding: 14,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: colors.lightPeach,
  },
  serviceBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  serviceBookingName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  serviceBookingStatus: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  serviceBookingStatusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  serviceBookingDetails: {
    gap: 6,
  },
  serviceBookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  serviceBookingIcon: {
    ...Typography.body,
    width: 20,
  },
  serviceBookingText: {
    ...Typography.body,
    color: Colors.text.secondary,
    fontWeight: '500',
  },
});

export default withErrorBoundary(OrderTrackingScreen, 'OrdersOrderIdTracking');
