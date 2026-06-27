// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { router, useLocalSearchParams, Stack, useNavigation } from 'expo-router';
import ordersService, { Order } from '@/services/ordersApi';
import apiClient from '@/services/apiClient';
import { DetailPageSkeleton } from '@/components/skeletons';
import { mapBackendOrderToFrontend } from '@/utils/dataMappers';
import ReorderButton from '@/components/orders/ReorderButton';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

function OrderDetailsScreen() {
  const isMounted = useIsMounted();
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBackPress = () => {
    // Check if we can go back in navigation stack
    if (navigation.canGoBack()) {
      router.canGoBack() ? router.back() : router.replace('/(tabs)');
    } else {
      // If no history, go to tracking page (order history)
      router.replace('/orders');
    }
  };

  useEffect(() => {
    if (id) {
      loadOrderDetails();

      // SECURITY/PERF: poll the order every 20s while the order is in a
      // non-terminal state so the user sees status updates without needing
      // a manual pull-to-refresh. Polling stops as soon as the order is
      // delivered/cancelled/refunded (terminal) or the screen unmounts.
      // 20s is well above the gateway's 100 req/min global rate limit
      // for typical 1-screen-per-user traffic.
      const POLL_MS = 20000;
      const interval = setInterval(() => {
        setOrder((prev) => {
          if (!prev) return prev;
          if (['delivered', 'cancelled', 'refunded'].includes(prev.status)) {
            return prev; // terminal — stop polling
          }
          loadOrderDetails();
          return prev;
        });
      }, POLL_MS);
      return () => clearInterval(interval);
    }
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);

      const response = await ordersService.getOrderById(id as string);

      if (response.success && response.data) {
        const mappedOrder = mapBackendOrderToFrontend(response.data);
        if (!isMounted()) return;
        setOrder(mappedOrder);
        setError(null);
      } else {
        if (!isMounted()) return;
        setError(response.message || 'Failed to load order');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError(err instanceof Error ? err.message : 'Failed to load order details');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleCancelOrder = () => {
    platformAlertDestructive(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      'Yes, Cancel',
      confirmCancelOrder
    );
  };

  const confirmCancelOrder = async () => {
    if (!order) return;

    try {
      setCancelling(true);

      const response = await ordersService.cancelOrder(order.id, 'Customer requested cancellation');

      if (response.success) {
        platformAlertSimple('Success', 'Order cancelled successfully');
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
      } else {
        throw new Error(response.message || 'Failed to cancel order');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to cancel order. Please try again.';

      platformAlertSimple('Error', errorMsg);
    } finally {
      if (!isMounted()) return;
      setCancelling(false);
    }
  };

  const handleDownloadInvoice = useCallback(async () => {
    if (!order || downloadingInvoice) return;
    const txId = (order as any).payment?.transactionId || order.id;

    try {
      setDownloadingInvoice(true);

      if (Platform.OS === 'web') {
        // On web, fetch as blob and open in new tab
        // NOTE: This is a PDF invoice DOWNLOAD (GET /billing/invoice/:txId/download), not an
        // image upload. The audit incorrectly flagged it as a raw `fetch` for image upload. It
        // has nothing to do with `services/imageUploadService.ts`, which is for uploading
        // images. Skipping migration.
        const baseURL = apiClient.getBaseURL();
        const token = apiClient.getAuthToken();
        const response = await fetch(`${baseURL}/billing/invoice/${txId}/download`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error('Failed to download invoice');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        // On mobile, download file then share
        const baseURL = apiClient.getBaseURL();
        const token = apiClient.getAuthToken();
        const fileUri = `${FileSystem.cacheDirectory}invoice-${order.orderNumber}.pdf`;
        const downloadResult = await FileSystem.downloadAsync(
          `${baseURL}/billing/invoice/${txId}/download`,
          fileUri,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );

        if (downloadResult.status !== 200) {
          throw new Error('Failed to download invoice');
        }

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Invoice - Order #${order.orderNumber}`,
          });
        } else {
          platformAlertSimple('Downloaded', 'Invoice saved to cache');
        }
      }
    } catch (err: any) {
      platformAlertSimple('Error', err?.message || 'Failed to download invoice');
    } finally {
      if (!isMounted()) return;
      setDownloadingInvoice(false);
    }
  }, [order, downloadingInvoice, isMounted]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return Colors.gold;
      case 'shipped':
      case 'dispatched':
      case 'out_for_delivery':
        return colors.infoScale[400];
      case 'processing':
      case 'preparing':
      case 'ready':
      case 'confirmed':
        return Colors.warning;
      case 'cancelled':
      case 'refunded':
        return Colors.error;
      case 'placed':
      case 'pending':
      default:
        return Colors.text.tertiary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canCancelOrder = (status: string) => {
    return ['pending', 'placed', 'confirmed', 'processing', 'preparing', 'ready'].includes(status);
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (error || !order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || 'Order not found'}</Text>
        <Pressable style={styles.retryButton} onPress={loadOrderDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Custom Header with Back Button */}
        <View style={styles.customHeader}>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>←</Text>
          </Pressable>
          <Text style={styles.customHeaderTitle}>Order Details</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Order Info Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Text style={styles.orderNumber}>Order #{order.orderNumber}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {(order as any).fulfillmentType && (order as any).fulfillmentType !== 'delivery' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f6fa', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: colors.nileBlue }}>
                      {(order as any).fulfillmentType === 'pickup' ? '🛍 Pickup' :
                       (order as any).fulfillmentType === 'drive_thru' ? '🚗 Drive-Thru' :
                       (order as any).fulfillmentType === 'dine_in' ? '🍽 Dine-In' : ''}
                    </Text>
                  </View>
                )}
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                  <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>

      {/* Order Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Items Ordered</Text>
        {order.items.map((item, index) => {
          // Use mapped item properties directly (from dataMappers)
          const productImage = item.image;
          const productName = item.name || 'Product';
          const storeName = item.store?.name || 'Store';

          return (
            <View key={index} style={styles.itemCard}>
              <CachedImage
                source={{ uri: productImage }}
                style={styles.itemImage}
                cachePolicy="memory-disk"
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{productName}</Text>
                <Text style={styles.storeName}>{storeName}</Text>
                {item.variant && (
                  <Text style={styles.variantText}>Variant: {item.variant.name}</Text>
                )}
                <View style={styles.itemFooter}>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemPrice}>{currencySymbol}{item.price || 0} each</Text>
                </View>
              </View>
              <Text style={styles.itemTotal}>{currencySymbol}{item.subtotal || 0}</Text>
            </View>
          );
        })}
      </View>

      {/* Order Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>
              {currencySymbol}{(order.totals?.subtotal || order.summary?.subtotal || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {(order as any).fulfillmentType === 'pickup' || (order as any).fulfillmentType === 'drive_thru' || (order as any).fulfillmentType === 'dine_in' ? 'Service Fee' : 'Delivery'}
            </Text>
            {(() => {
              const deliveryFee = order.totals?.delivery || order.summary?.shipping || 0;
              const subtotal = order.totals?.subtotal || order.summary?.subtotal || 0;
              const FREE_DELIVERY_THRESHOLD = 500;
              // Count unique stores from items
              const uniqueStores = new Set(order.items?.map((i: any) => i.store?.id || i.store).filter(Boolean) || []);
              const wouldBeDeliveryFee = uniqueStores.size > 0 ? uniqueStores.size * 50 : 50;

              if (deliveryFee === 0 && subtotal >= FREE_DELIVERY_THRESHOLD) {
                // Free delivery - show crossed out original price + FREE
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.summaryValue, { textDecorationLine: 'line-through', color: colors.neutral[400], fontSize: 12 }]}>
                      {currencySymbol}{wouldBeDeliveryFee}
                    </Text>
                    <Text style={[styles.summaryValue, { color: colors.success, fontWeight: '600' }]}>FREE</Text>
                  </View>
                );
              } else if (deliveryFee > 0) {
                return <Text style={styles.summaryValue}>{currencySymbol}{deliveryFee.toFixed(2)}</Text>;
              } else {
                return <Text style={[styles.summaryValue, { color: colors.success }]}>FREE</Text>;
              }
            })()}
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>
              {currencySymbol}{(order.totals?.tax || order.summary?.tax || 0).toFixed(2)}
            </Text>
          </View>
          {(order.totals?.discount || order.summary?.discount || 0) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>Discount</Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{currencySymbol}{(order.totals?.discount || order.summary?.discount || 0).toFixed(2)}
              </Text>
            </View>
          )}
          {/* Lock Fee Discount from order totals */}
          {(order.totals?.lockFeeDiscount || 0) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.nileBlue }]}>Lock Fee Already Paid</Text>
              <Text style={[styles.summaryValue, { color: colors.nileBlue }]}>
                -{currencySymbol}{(order.totals.lockFeeDiscount).toFixed(2)}
              </Text>
            </View>
          )}
          {/* Deal Redemption Discount */}
          {order.redemption && order.redemption.discount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.discountLabel]}>
                Deal ({order.redemption.code})
              </Text>
              <Text style={[styles.summaryValue, styles.discountValue]}>
                -{currencySymbol}{(order.redemption.discount).toFixed(2)}
              </Text>
            </View>
          )}
          {/* Coins Used at Checkout */}
          {(() => {
            const coinsUsed = order.payment?.coinsUsed;
            const totalCoins = coinsUsed?.totalCoinsValue || (coinsUsed?.rezCoins || 0) + (coinsUsed?.promoCoins || 0) + (coinsUsed?.storePromoCoins || 0);
            if (totalCoins <= 0) return null;
            return (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.brand.purple }]}>Coins Used</Text>
                <Text style={[styles.summaryValue, { color: colors.brand.purple }]}>
                  -{currencySymbol}{totalCoins.toFixed(2)}
                </Text>
              </View>
            );
          })()}
          {/* Cashback - show "after delivery" if not yet delivered */}
          {(order.totals?.cashback || 0) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.warningScale[700] }]}>
                {order.status === 'delivered' ? 'Cashback Earned' : 'Cashback (after delivery)'}
              </Text>
              <Text style={[styles.summaryValue, { color: colors.warningScale[700] }]}>
                +{currencySymbol}{(order.totals.cashback).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>
              {currencySymbol}{(order.totals?.total || order.summary?.total || 0).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Shipping Address */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Address</Text>
        <View style={styles.addressCard}>
          {order.delivery?.address ? (
            <>
              <Text style={styles.addressName}>{order.delivery.address.name}</Text>
              <Text style={styles.addressText}>{order.delivery.address.addressLine1}</Text>
              {order.delivery.address.addressLine2 && (
                <Text style={styles.addressText}>{order.delivery.address.addressLine2}</Text>
              )}
              {order.delivery.address.landmark && (
                <Text style={styles.addressText}>Landmark: {order.delivery.address.landmark}</Text>
              )}
              <Text style={styles.addressText}>
                {order.delivery.address.city}, {order.delivery.address.state}
              </Text>
              <Text style={styles.addressText}>{order.delivery.address.pincode}</Text>
              {order.delivery.address.phone && (
                <Text style={styles.addressPhone}>Phone: {order.delivery.address.phone}</Text>
              )}
            </>
          ) : (
            <Text style={styles.addressText}>No delivery address available</Text>
          )}
        </View>
      </View>

      {/* Payment Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Status</Text>
        <View style={styles.paymentCard}>
          <Text
            style={[
              styles.paymentStatus,
              {
                color:
                  (order.payment?.status || order.paymentStatus) === 'paid'
                    ? colors.lightMustard
                    : (order.payment?.status || order.paymentStatus) === 'failed'
                    ? '#ef4444'
                    : colors.warningScale[400],
              },
            ]}
          >
            {(order.payment?.status || order.paymentStatus || 'pending').toUpperCase()}
          </Text>
          <Text style={styles.paymentMethod}>
            Method: {(order.payment?.method || 'N/A').toUpperCase()}
          </Text>

          {/* Download Invoice Button */}
          {(order.payment?.status === 'paid' || order.paymentStatus === 'paid') && (
            <Pressable
              style={styles.invoiceButton}
              onPress={handleDownloadInvoice}
              disabled={downloadingInvoice}
            >
              {downloadingInvoice ? (
                <ActivityIndicator size="small" color={colors.nileBlue} />
              ) : (
                <>
                  <Ionicons name="document-text-outline" size={18} color={colors.nileBlue} />
                  <Text style={styles.invoiceButtonText}>Download Invoice</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Order Timeline */}
      {order.timeline && order.timeline.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Timeline</Text>
          <View style={styles.timelineCard}>
            {order.timeline.map((event, index) => (
              <View key={index} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                {index < order.timeline.length - 1 && <View style={styles.timelineLine} />}
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>{event.status}</Text>
                  <Text style={styles.timelineMessage}>{event.message}</Text>
                  <Text style={styles.timelineDate}>{formatDate(event.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Fulfillment Details */}
      {(order as any).fulfillmentType && (order as any).fulfillmentType !== 'delivery' && (order as any).fulfillmentDetails && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {(order as any).fulfillmentType === 'pickup' ? 'Pickup Details' :
             (order as any).fulfillmentType === 'drive_thru' ? 'Drive-Thru Details' :
             (order as any).fulfillmentType === 'dine_in' ? 'Dine-In Details' : 'Fulfillment Details'}
          </Text>
          <View style={styles.trackingCard}>
            {(order as any).fulfillmentDetails.tableNumber && (
              <View style={styles.trackingRow}>
                <Text style={styles.trackingLabel}>Table Number</Text>
                <Text style={styles.trackingValue}>{(order as any).fulfillmentDetails.tableNumber}</Text>
              </View>
            )}
            {(order as any).fulfillmentDetails.vehicleInfo && (
              <View style={styles.trackingRow}>
                <Text style={styles.trackingLabel}>Vehicle</Text>
                <Text style={styles.trackingValue}>{(order as any).fulfillmentDetails.vehicleInfo}</Text>
              </View>
            )}
            {(order as any).fulfillmentDetails.pickupInstructions && (
              <View style={styles.trackingRow}>
                <Text style={styles.trackingLabel}>Instructions</Text>
                <Text style={styles.trackingValue}>{(order as any).fulfillmentDetails.pickupInstructions}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Tracking Info */}
      {order.tracking && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tracking Information</Text>
          <View style={styles.trackingCard}>
            <View style={styles.trackingRow}>
              <Text style={styles.trackingLabel}>Tracking Number</Text>
              <Text style={styles.trackingValue}>{order.tracking.number}</Text>
            </View>
            <View style={styles.trackingRow}>
              <Text style={styles.trackingLabel}>Carrier</Text>
              <Text style={styles.trackingValue}>{order.tracking.carrier}</Text>
            </View>
            {order.tracking.estimatedDelivery && (
              <View style={styles.trackingRow}>
                <Text style={styles.trackingLabel}>Estimated Delivery</Text>
                <Text style={styles.trackingValue}>
                  {formatDate(order.tracking.estimatedDelivery)}
                </Text>
              </View>
            )}
            {order.tracking.url && (
              <Pressable style={styles.trackButton}>
                <Text style={styles.trackButtonText}>Track Package</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {(order.status === 'delivered' || order.status === 'cancelled') && (
          <View style={styles.reorderContainer}>
            <ReorderButton
              orderId={order.id}
              orderNumber={order.orderNumber}
              variant="primary"
              size="large"
              fullWidth
              onSuccess={() => router.push('/cart')}
            />
          </View>
        )}

        {canCancelOrder(order.status) && (
          <Pressable
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelOrder}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator color={colors.background.primary} />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            )}
          </Pressable>
        )}
        {order.status === 'delivered' && (
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.warningScale[400] }]}
            onPress={() => router.push({
              pathname: '/support/create-ticket' as any,
              params: {
                category: 'order',
                subject: `Issue with Order #${order.orderNumber}`,
                relatedOrderId: order.id,
              },
            })}
          >
            <Text style={styles.actionButtonText}>Report Issue</Text>
          </Pressable>
        )}
        <Pressable style={styles.actionButton} onPress={() => router.push('/')}>
          <Text style={styles.actionButtonText}>Continue Shopping</Text>
        </Pressable>
      </View>
    </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[50],
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.neutral[900],
  },
  customHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.background.primary,
  },
  orderDate: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.neutral[100],
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  storeName: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  variantText: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  itemPrice: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
    marginLeft: 8,
  },
  summaryCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  summaryValue: {
    fontSize: 14,
    color: colors.neutral[900],
    fontWeight: '500',
  },
  discountLabel: {
    color: colors.lightMustard,
  },
  discountValue: {
    color: colors.lightMustard,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  addressCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: colors.neutral[500],
    lineHeight: 20,
  },
  addressPhone: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 8,
  },
  paymentCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  paymentMethod: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  invoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
  invoiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  timelineCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366f1',
    marginRight: 12,
    marginTop: 4,
  },
  timelineLine: {
    position: 'absolute',
    left: 5.5,
    top: 16,
    bottom: -16,
    width: 1,
    backgroundColor: colors.neutral[200],
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  timelineMessage: {
    fontSize: 14,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  trackingCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  trackingRow: {
    marginBottom: 12,
  },
  trackingLabel: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 4,
  },
  trackingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[900],
  },
  trackButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  trackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  actions: {
    marginTop: 8,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.primary,
  },
  reorderContainer: {
    marginBottom: 12,
  },
});
export default withErrorBoundary(OrderDetailsScreen, 'OrdersId');
