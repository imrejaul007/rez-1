// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  BackHandler,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { DetailPageSkeleton } from '@/components/skeletons';
import ordersApi from '@/services/ordersApi';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import analytics from '@/services/analytics/AnalyticsService';
import { ANALYTICS_EVENTS } from '@/services/analytics/events';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OrderDetails {
  id: string;
  orderNumber: string;
  status: string;
  storeId?: string;
  storeName?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totals: {
    subtotal: number;
    delivery: number;
    tax: number;
    discount: number;
    lockFeeDiscount?: number;
    cashback: number;
    total: number;
    paidAmount: number;
  };
  payment: {
    method: string;
    status: string;
    coinsUsed?: {
      rezCoins?: number;
      promoCoins?: number;
      storePromoCoins?: number;
      totalCoinsValue?: number;
    };
  };
  delivery?: {
    address?: {
      name?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
      pincode?: string;
    };
  };
  redemption?: {
    code: string;
    discount: number;
    dealTitle?: string;
  };
  createdAt: string;
}

function PaymentSuccessPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const currencySymbol = getCurrencySymbol();
  const { orderId, transactionId, paymentMethod } = useLocalSearchParams<{
    orderId: string;
    transactionId: string;
    paymentMethod: string;
  }>();

  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const analyticsTrackedRef = useRef(false);
  const isMounted = useIsMounted();

  // Parse multiple order IDs (comma-separated)
  const orderIds = orderId ? orderId.split(',').map(id => id.trim()).filter(Boolean) : [];
  const isMultiStoreOrder = orderIds.length > 1;

  // Fetch order details for all orders
  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const fetchOrders = async () => {
      if (orderIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const orderPromises = orderIds.map(id => ordersApi.getOrderById(id));
        const responses = await Promise.all(orderPromises);

        const fetchedOrders: OrderDetails[] = [];
        const failedOrders: string[] = [];

        for (let i = 0; i < responses.length; i++) {
          const response = responses[i];
          const currentOrderId = orderIds[i];

          if (response.success && response.data) {
            const orderData = response.data;
            // Extract store name from various possible locations in the response
            const extractedStoreName =
              orderData.store?.name ||
              orderData.storeName ||
              orderData.items?.[0]?.store?.name ||
              orderData.items?.[0]?.storeName ||
              (orderData.store && typeof orderData.store === 'string' ? orderData.store : null) ||
              `Order ${orderData.orderNumber?.slice(-4) || ''}`;


            // Extract store ID from various possible locations
            const extractedStoreId =
              (orderData.store && typeof orderData.store === 'object' ? (orderData.store._id || orderData.store.id) : null) ||
              (typeof orderData.store === 'string' ? orderData.store : null) ||
              orderData.storeId ||
              orderData.items?.[0]?.store?.id ||
              '';

            fetchedOrders.push({
              id: orderData.id || orderData._id,
              orderNumber: orderData.orderNumber || `NUQ${Date.now().toString().slice(-8)}`,
              status: orderData.status || 'placed',
              storeId: extractedStoreId,
              storeName: extractedStoreName,
              items: orderData.items || [],
              totals: {
                subtotal: orderData.totals?.subtotal || orderData.summary?.subtotal || 0,
                delivery: orderData.totals?.delivery || orderData.totals?.shipping || orderData.delivery?.deliveryFee || orderData.summary?.shipping || 0,
                tax: orderData.totals?.tax || orderData.summary?.tax || 0,
                discount: orderData.totals?.discount || orderData.summary?.discount || 0,
                lockFeeDiscount: orderData.totals?.lockFeeDiscount || 0,
                cashback: orderData.totals?.cashback || 0,
                total: orderData.totals?.total || orderData.summary?.total || 0,
                paidAmount: orderData.totals?.paidAmount || orderData.totals?.total || 0,
              },
              redemption: orderData.redemption || undefined,
              payment: {
                method: orderData.payment?.method || paymentMethod || 'unknown',
                status: orderData.payment?.status || 'completed',
                coinsUsed: orderData.payment?.coinsUsed || {
                  rezCoins: 0,
                  promoCoins: 0,
                  storePromoCoins: 0,
                  totalCoinsValue: 0,
                },
              },
              delivery: orderData.delivery || undefined,
              createdAt: orderData.createdAt || new Date().toISOString(),
            });
          } else {
            // Log failed order fetches for debugging
            failedOrders.push(currentOrderId);
          }
        }

        // Log summary

        if (!isMounted()) return;
        setOrders(fetchedOrders);

        // Track purchase event (once per page visit)
        if (fetchedOrders.length > 0 && !analyticsTrackedRef.current) {
          analyticsTrackedRef.current = true;
          try {
            const totalPaid = fetchedOrders.reduce((sum, o) => sum + (o.totals.paidAmount || o.totals.total), 0);
            const totalItems = fetchedOrders.reduce((sum, o) => sum + (o.items?.length || 0), 0);
            analytics.trackEvent(ANALYTICS_EVENTS.CHECKOUT_COMPLETED, {
              transaction_id: orderId,
              revenue: totalPaid,
              currency: currencySymbol,
              payment_method: paymentMethod || 'unknown',
              item_count: totalItems,
            });
          } catch {}
        }

        // Haptic feedback on successful payment
        if (fetchedOrders.length > 0) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }

        // Set partial error if some orders failed
        if (failedOrders.length > 0 && fetchedOrders.length > 0) {
        } else if (failedOrders.length > 0 && fetchedOrders.length === 0) {
          if (!isMounted()) return;
          setError('Could not load order details. Please check your orders page.');
        }
      } catch (err) {
        if (!isMounted()) return;
        setError('Failed to load order details');
      } finally {
        if (!isMounted()) return;
        setLoading(false);
      }
    };

    fetchOrders();
  }, [orderId, paymentMethod, isAuthenticated, authLoading]);

  // For backward compatibility, get first order
  const order = orders[0] || null;

  // Handle hardware back button - redirect to home
  useEffect(() => {
    const backAction = () => {
      router.replace('/(tabs)/' as any);
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  const handleTrackOrder = () => {
    if (isMultiStoreOrder) {
      router.push('/orders' as any);
    } else if (orderId) {
      // Route to fulfillment-specific tracking screen
      const ft = order?.fulfillmentType;
      if (ft === 'pickup') {
        router.push(`/pickup-tracking?orderId=${orderId}` as any);
      } else if (ft === 'drive_thru') {
        router.push(`/drivethru-tracking?orderId=${orderId}` as any);
      } else if (ft === 'dine_in') {
        router.push(`/dinein-tracking?orderId=${orderId}` as any);
      } else {
        router.push(`/tracking?orderId=${orderId}` as any);
      }
    } else {
      router.push('/tracking' as any);
    }
  };

  const handleGoHome = () => {
    router.replace('/(tabs)/' as any);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cod': return 'cash';
      case 'wallet': return 'diamond';
      case 'razorpay':
      case 'card':
      case 'upi': return 'card';
      default: return 'checkmark-circle';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cod': return 'Cash on Delivery';
      case 'wallet': return `${BRAND.APP_NAME} Wallet`;
      case 'razorpay': return 'Online Payment';
      case 'card': return 'Credit/Debit Card';
      case 'upi': return 'UPI';
      default: return 'Payment';
    }
  };

  // Calculate estimated delivery (30-45 mins from order)
  const getEstimatedDelivery = () => {
    const orderDate = order?.createdAt ? new Date(order.createdAt) : new Date();
    const minDelivery = new Date(orderDate.getTime() + 30 * 60000);
    const maxDelivery = new Date(orderDate.getTime() + 45 * 60000);
    const formatTime = (date: Date) =>
      date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${formatTime(minDelivery)} - ${formatTime(maxDelivery)}`;
  };

  const method = paymentMethod || order?.payment?.method || '';
  const isCod = method === 'cod';

  // Calculate totals across all orders for multi-store
  const { totalCoinsUsed, totalOrderValue, totalPaidAmount, totalItemCount } = useMemo(() => ({
    totalCoinsUsed: orders.reduce((sum, o) => sum + (o.payment?.coinsUsed?.totalCoinsValue || 0), 0),
    totalOrderValue: orders.reduce((sum, o) => sum + (o.totals?.total || 0), 0),
    totalPaidAmount: orders.reduce((sum, o) => sum + (o.totals?.paidAmount || o.totals?.total || 0), 0),
    totalItemCount: orders.reduce((sum, o) =>
      sum + (o.items?.reduce((itemSum, item) => itemSum + (item.quantity || 1), 0) || 0), 0),
  }), [orders]);

  // For single order, use order values; for multi-store, use aggregated values
  const coinsUsedValue = isMultiStoreOrder ? totalCoinsUsed : (order?.payment?.coinsUsed?.totalCoinsValue || 0);
  const orderTotal = isMultiStoreOrder ? totalOrderValue : (order?.totals?.total || 0);
  const payableAmount = isCod ? orderTotal : (isMultiStoreOrder ? totalPaidAmount : (order?.totals?.paidAmount || orderTotal));
  const totalBeforeCoins = orderTotal + coinsUsedValue;
  const itemCount = isMultiStoreOrder ? totalItemCount : (order?.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      {/* Fixed Header - Nuqta Colors */}
      <LinearGradient
        colors={[Colors.nileBlue, '#0f2a3d']}
        style={styles.headerGradient}
      >
        {/* Success Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={32} color={Colors.nileBlue} />
        </View>

        <ThemedText style={styles.successTitle}>Payment Successful!</ThemedText>
        <ThemedText style={styles.successMessage}>
          {isCod
            ? 'Your order has been placed. Pay when you receive your order.'
            : 'Your payment has been processed successfully.'}
        </ThemedText>
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentArea}>
          {loading ? (
            <DetailPageSkeleton />
          ) : (
            <>
              {/* Order Number Card - Show all orders for multi-store */}
              {isMultiStoreOrder ? (
                <View style={styles.orderNumberCard}>
                  <ThemedText style={styles.orderNumberLabel}>
                    {orders.length} Orders Placed
                  </ThemedText>
                  {orders.map((o, index) => (
                    <View key={o.id} style={[styles.multiOrderRow, index > 0 && styles.multiOrderDivider]}>
                      <View style={styles.multiOrderInfo}>
                        <ThemedText style={styles.multiOrderStore}>{o.storeName}</ThemedText>
                        <ThemedText style={styles.orderNumber}>#{o.orderNumber}</ThemedText>
                      </View>
                      <ThemedText style={styles.multiOrderAmount}>{currencySymbol}{o.totals.total.toLocaleString()}</ThemedText>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.orderNumberCard}>
                  <ThemedText style={styles.orderNumberLabel}>Order Number</ThemedText>
                  <ThemedText style={styles.orderNumber} numberOfLines={1} adjustsFontSizeToFit>
                    #{order?.orderNumber || `NUQ${orderId?.slice(-8) || '000000'}`}
                  </ThemedText>
                </View>
              )}

              {/* Details Card */}
              <View style={styles.detailsCard}>
                {/* Transaction ID */}
                {transactionId && (
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Transaction ID</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {transactionId.length > 16
                        ? `${transactionId.slice(0, 8)}...${transactionId.slice(-8)}`
                        : transactionId}
                    </ThemedText>
                  </View>
                )}

                {/* Payment Method */}
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Payment Method</ThemedText>
                  <View style={styles.methodBadge}>
                    <Ionicons name={getPaymentMethodIcon(method)} size={13} color={Colors.nileBlue} />
                    <ThemedText style={styles.methodText}>
                      {getPaymentMethodLabel(method)}
                    </ThemedText>
                  </View>
                </View>

                {/* Items */}
                {itemCount > 0 && (
                  <View style={styles.detailRow}>
                    <ThemedText style={styles.detailLabel}>Items</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {itemCount} item{itemCount !== 1 ? 's' : ''}
                    </ThemedText>
                  </View>
                )}

                {/* Separator */}
                <View style={styles.separator} />

                {/* Order Breakdown */}
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Subtotal</ThemedText>
                  <ThemedText style={styles.detailValue}>
                    {currencySymbol}{(isMultiStoreOrder
                      ? orders.reduce((sum, o) => sum + (o.totals?.subtotal || 0), 0)
                      : (order?.totals?.subtotal || 0)).toLocaleString()}
                  </ThemedText>
                </View>

                {/* Delivery Fee */}
                {(() => {
                  const deliveryTotal = isMultiStoreOrder
                    ? orders.reduce((sum, o) => sum + (o.totals?.delivery || 0), 0)
                    : (order?.totals?.delivery || 0);
                  const subtotal = isMultiStoreOrder
                    ? orders.reduce((sum, o) => sum + (o.totals?.subtotal || 0), 0)
                    : (order?.totals?.subtotal || 0);
                  const FREE_DELIVERY_THRESHOLD = 500;
                  // Calculate what delivery WOULD have been (₹50 per store)
                  const storeCount = isMultiStoreOrder ? orders.length : 1;
                  const wouldBeDeliveryFee = storeCount * 50;

                  return (
                    <View style={styles.detailRow}>
                      <ThemedText style={styles.detailLabel}>Delivery Fee</ThemedText>
                      {deliveryTotal === 0 && subtotal >= FREE_DELIVERY_THRESHOLD ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <ThemedText style={[styles.detailValue, { textDecorationLine: 'line-through', color: Colors.text.tertiary, fontSize: 12 }]}>
                            {currencySymbol}{wouldBeDeliveryFee}
                          </ThemedText>
                          <ThemedText style={[styles.detailValue, { color: Colors.success, fontWeight: '600' }]}>FREE</ThemedText>
                        </View>
                      ) : deliveryTotal > 0 ? (
                        <ThemedText style={styles.detailValue}>
                          {currencySymbol}{deliveryTotal.toLocaleString()}
                        </ThemedText>
                      ) : (
                        <ThemedText style={[styles.detailValue, { color: Colors.success }]}>FREE</ThemedText>
                      )}
                    </View>
                  );
                })()}

                {/* Tax */}
                {(() => {
                  const taxTotal = isMultiStoreOrder
                    ? orders.reduce((sum, o) => sum + (o.totals?.tax || 0), 0)
                    : (order?.totals?.tax || 0);
                  if (taxTotal > 0) {
                    return (
                      <View style={styles.detailRow}>
                        <ThemedText style={styles.detailLabel}>Tax</ThemedText>
                        <ThemedText style={styles.detailValue}>
                          {currencySymbol}{taxTotal.toLocaleString()}
                        </ThemedText>
                      </View>
                    );
                  }
                  return null;
                })()}

                {/* Discount */}
                {(() => {
                  const discountTotal = isMultiStoreOrder
                    ? orders.reduce((sum, o) => sum + (o.totals?.discount || 0), 0)
                    : (order?.totals?.discount || 0);
                  if (discountTotal > 0) {
                    return (
                      <View style={styles.detailRow}>
                        <ThemedText style={[styles.detailLabel, { color: Colors.success }]}>Discount</ThemedText>
                        <ThemedText style={[styles.detailValue, { color: Colors.success }]}>
                          -{currencySymbol}{discountTotal.toLocaleString()}
                        </ThemedText>
                      </View>
                    );
                  }
                  return null;
                })()}

                {/* Lock Fee Already Paid */}
                {(() => {
                  const lockFeeTotal = isMultiStoreOrder
                    ? orders.reduce((sum, o) => sum + (o.totals?.lockFeeDiscount || 0), 0)
                    : (order?.totals?.lockFeeDiscount || 0);
                  if (lockFeeTotal > 0) {
                    return (
                      <View style={styles.detailRow}>
                        <ThemedText style={[styles.detailLabel, { color: Colors.nileBlue }]}>
                          Lock Fee Already Paid
                        </ThemedText>
                        <ThemedText style={[styles.detailValue, { color: Colors.nileBlue }]}>
                          -{currencySymbol}{lockFeeTotal.toLocaleString()}
                        </ThemedText>
                      </View>
                    );
                  }
                  return null;
                })()}

                {/* Deal Redemption Discount */}
                {(() => {
                  const redemption = isMultiStoreOrder
                    ? orders.find(o => o.redemption?.discount)?.redemption
                    : order?.redemption;
                  if (redemption && redemption.discount > 0) {
                    return (
                      <View style={styles.detailRow}>
                        <ThemedText style={[styles.detailLabel, { color: Colors.warning }]}>
                          Deal ({redemption.code})
                        </ThemedText>
                        <ThemedText style={[styles.detailValue, { color: Colors.warning }]}>
                          -{currencySymbol}{redemption.discount.toLocaleString()}
                        </ThemedText>
                      </View>
                    );
                  }
                  return null;
                })()}

                {/* Coins Used */}
                {coinsUsedValue > 0 && (
                  <View style={styles.detailRow}>
                    <ThemedText style={[styles.detailLabel, { color: Colors.brand.purple }]}>{`${BRAND.COIN_NAME} Used`}</ThemedText>
                    <ThemedText style={styles.coinsValue}>
                      -{currencySymbol}{coinsUsedValue.toLocaleString()}
                    </ThemedText>
                  </View>
                )}

                {/* Cashback */}
                {(() => {
                  const cashbackTotal = isMultiStoreOrder
                    ? orders.reduce((sum, o) => sum + (o.totals?.cashback || 0), 0)
                    : (order?.totals?.cashback || 0);
                  if (cashbackTotal > 0) {
                    return (
                      <View style={styles.detailRow}>
                        <ThemedText style={[styles.detailLabel, { color: Colors.warning }]}>Cashback (after delivery)</ThemedText>
                        <ThemedText style={[styles.detailValue, { color: Colors.warning }]}>
                          +{currencySymbol}{cashbackTotal.toLocaleString()}
                        </ThemedText>
                      </View>
                    );
                  }
                  return null;
                })()}

                {/* Separator */}
                <View style={styles.separator} />

                {/* Amount */}
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>
                    {isCod ? 'Pay on Delivery' : 'Amount Paid'}
                  </ThemedText>
                  <ThemedText style={styles.amountValue}>
                    {currencySymbol}{payableAmount.toLocaleString()}
                  </ThemedText>
                </View>
              </View>

              {/* Fulfillment Info */}
              <View style={styles.deliveryCard}>
                <View style={styles.deliveryIconWrap}>
                  <Ionicons
                    name={
                      order?.fulfillmentType === 'pickup' ? 'bag-handle-outline' :
                      order?.fulfillmentType === 'drive_thru' ? 'car-outline' :
                      order?.fulfillmentType === 'dine_in' ? 'restaurant-outline' :
                      'bicycle-outline'
                    }
                    size={18}
                    color={Colors.nileBlue}
                  />
                </View>
                <View style={styles.deliveryInfo}>
                  <ThemedText style={styles.deliveryLabel}>
                    {order?.fulfillmentType === 'pickup' ? 'Pickup at Store' :
                     order?.fulfillmentType === 'drive_thru' ? 'Drive-Thru' :
                     order?.fulfillmentType === 'dine_in' ? 'Dine-In' :
                     'Estimated Delivery'}
                  </ThemedText>
                  <ThemedText style={styles.deliveryTime}>
                    {order?.fulfillmentType === 'pickup' || order?.fulfillmentType === 'drive_thru'
                      ? (order?.fulfillmentDetails?.storeAddress || 'Store pickup')
                      : order?.fulfillmentType === 'dine_in'
                      ? `Table ${order?.fulfillmentDetails?.tableNumber || ''}`
                      : getEstimatedDelivery()}
                  </ThemedText>
                </View>
              </View>

              {/* Email Notice */}
              <View style={styles.emailNotice}>
                <Ionicons name="mail-outline" size={14} color={Colors.text.tertiary} />
                <ThemedText style={styles.emailText}>
                  Confirmation sent to your registered email
                </ThemedText>
              </View>
            </>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <Pressable
              style={styles.trackButton}
              onPress={handleTrackOrder}
             
              accessibilityLabel={isMultiStoreOrder ? "View all orders" : "Track your order"}
              accessibilityRole="button"
            >
              <Ionicons name={isMultiStoreOrder ? "list-outline" : "location-outline"} size={18} color={Colors.nileBlue} />
              <ThemedText style={styles.trackButtonText}>
                {isMultiStoreOrder ? 'View All Orders' : 'Track Order'}
              </ThemedText>
            </Pressable>

            {/* Rate Your Experience - shown for single-store orders with a known store */}
            {!isMultiStoreOrder && order?.storeId ? (
              <Pressable
                style={styles.reviewButton}
                onPress={() =>
                  router.push(
                    `/ReviewPage?storeId=${order.storeId}&storeName=${encodeURIComponent(order.storeName || '')}` as any
                  )
                }
                accessibilityLabel="Rate your experience"
                accessibilityRole="button"
              >
                <Ionicons name="star-outline" size={18} color={Colors.nileBlue} />
                <ThemedText style={styles.reviewButtonText}>Rate Your Experience</ThemedText>
              </Pressable>
            ) : null}

            <Pressable
              style={styles.homeButton}
              onPress={handleGoHome}

              accessibilityLabel="Back to home"
              accessibilityRole="button"
            >
              <Ionicons name="home-outline" size={18} color={Colors.nileBlue} />
              <ThemedText style={styles.homeButtonText}>Back to Home</ThemedText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Nuqta Color Palette - using DesignSystem tokens
const NUQTA_COLORS = {
  nileBlue: Colors.nileBlue,
  lightMustard: Colors.gold,
  linen: Colors.background.secondary,
  lightPeach: Colors.lightPeach,
  lavenderMist: Colors.lavenderMist,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUQTA_COLORS.linen,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.select({ ios: 100, android: 90, default: 100 }),
  },

  // --- Header ---
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 28,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    zIndex: 1,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: NUQTA_COLORS.lightMustard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6 },
      android: { elevation: 6 },
      web: { boxShadow: '0 3px 12px rgba(0,0,0,0.15)' },
    }),
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.inverse,
    textAlign: 'center',
    marginBottom: 6,
  },
  successMessage: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: Spacing.base,
  },

  // --- Content ---
  contentArea: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 10,
  },

  // --- Order Number ---
  orderNumberCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  orderNumberLabel: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  orderNumber: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text.primary,
    letterSpacing: 0.3,
  },
  multiOrderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  multiOrderDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  multiOrderInfo: {
    flex: 1,
  },
  multiOrderStore: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  multiOrderAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: NUQTA_COLORS.nileBlue,
  },

  // --- Details Card ---
  detailsCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
      android: { elevation: 2 },
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
    }),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  detailValueBold: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NUQTA_COLORS.lavenderMist,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  methodText: {
    fontSize: 12,
    fontWeight: '600',
    color: NUQTA_COLORS.nileBlue,
  },
  coinsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: NUQTA_COLORS.nileBlue,
  },
  separator: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: 2,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: NUQTA_COLORS.nileBlue,
  },

  // --- Delivery Card ---
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NUQTA_COLORS.lavenderMist,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  deliveryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 11,
    color: colors.neutral[500],
    marginBottom: 1,
  },
  deliveryTime: {
    fontSize: 14,
    fontWeight: '700',
    color: NUQTA_COLORS.nileBlue,
  },

  // --- Email Notice ---
  emailNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
    paddingTop: 4,
  },
  emailText: {
    fontSize: 12,
    color: colors.neutral[400],
  },

  // --- Action Buttons ---
  actions: {
    gap: 10,
  },
  trackButton: {
    backgroundColor: NUQTA_COLORS.lightMustard,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: NUQTA_COLORS.lightMustard, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 4 },
      web: { boxShadow: '0 4px 14px rgba(255,205,87,0.3)' },
    }),
  },
  trackButtonText: {
    color: NUQTA_COLORS.nileBlue,
    fontSize: 15,
    fontWeight: '700',
  },
  reviewButton: {
    backgroundColor: colors.background.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: NUQTA_COLORS.nileBlue,
  },
  reviewButtonText: {
    color: NUQTA_COLORS.nileBlue,
    fontSize: 15,
    fontWeight: '700',
  },
  homeButton: {
    backgroundColor: colors.background.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: NUQTA_COLORS.nileBlue,
  },
  homeButtonText: {
    color: NUQTA_COLORS.nileBlue,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default withErrorBoundary(PaymentSuccessPage, 'PaymentSuccess');
