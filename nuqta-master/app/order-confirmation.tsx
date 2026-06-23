import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Order Confirmation Page
// Shows order success, summary, and next actions

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  Modal
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming } from 'react-native-reanimated';
import { DetailPageSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/ThemedText';
import { trackPositiveAction } from '@/utils/appRating';
import { ThemedView } from '@/components/ThemedView';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import ordersService, { Order } from '@/services/ordersApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import usePostOrderRewards from '@/hooks/usePostOrderRewards';
import RewardsBreakdownCard from '@/components/rewards/RewardsBreakdownCard';
import ConfettiOverlay from '@/components/ui/ConfettiOverlay';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function OrderConfirmationPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams();
  const orderId = params.orderId as string;
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showConfetti, setShowConfetti] = useState(false);

  // Cross-platform modal state (replaces Alert.alert for web compatibility)
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    message: string;
    icon: 'checkmark-circle' | 'alert-circle';
    iconColor: string;
  }>({ title: '', message: '', icon: 'checkmark-circle', iconColor: colors.success });

  // Animation values
  const successAnim = useSharedValue(0);
  const contentAnim = useSharedValue(0);
  const successAnimStyle = useAnimatedStyle(() => ({
    opacity: successAnim.value,
    transform: [{ scale: interpolate(successAnim.value, [0, 1], [0.5, 1]) }],
  }));
  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentAnim.value,
  }));

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    } else {
      setError('Order ID not provided');
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (order) {
      trackPositiveAction();
      setShowConfetti(true);
      // Animate success icon
      successAnim.value = withSpring(1, { damping: 7, stiffness: 50 });
      contentAnim.value = withTiming(1, { duration: 300 });
    }
  }, [order]);

  const loadOrderDetails = async () => {
    try {

      setLoading(true);
      setError(null);

      const response = await ordersService.getOrderById(orderId);

      if (response.success && response.data) {
        // Haptic feedback on order confirmation
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        if (!isMounted()) return;
        setOrder(response.data);
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to load order details');
      }
    } catch (error) {
      if (!isMounted()) return;
      setError(error instanceof Error ? error.message : 'Failed to load order');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  // Cross-platform alert function (works on both mobile and web)
  const showAlert = (
    title: string,
    message: string,
    isSuccess: boolean = true
  ) => {
    setModalContent({
      title,
      message,
      icon: isSuccess ? 'checkmark-circle' : 'alert-circle',
      iconColor: isSuccess ? colors.success : colors.warningScale[400] });
    setModalVisible(true);
  };

  const handleTrackOrder = () => {
    if (order) {
      const oid = order._id || order.id;
      const ft = (order as any).fulfillmentType;
      if (ft === 'pickup') {
        router.push(`/pickup-tracking?orderId=${oid}` as any);
      } else if (ft === 'drive_thru') {
        router.push(`/drivethru-tracking?orderId=${oid}` as any);
      } else if (ft === 'dine_in') {
        router.push(`/dinein-tracking?orderId=${oid}` as any);
      } else {
        router.push(`/tracking?orderId=${oid}` as any);
      }
    }
  };

  const handleContinueShopping = () => {
    router.replace('/(tabs)');
  };

  // Post-order rewards hook
  // Review eligibility depends on fulfillment type:
  // - dine_in/pickup/drive_thru: immediate (user is at or near the store)
  // - delivery: after status = 'delivered' (need to receive product first)
  const storeData = order?.store as any;
  const fulfillmentType = (order as any)?.fulfillmentType || 'delivery';
  const isImmediateExperience = ['dine_in', 'pickup', 'drive_thru'].includes(fulfillmentType);
  const isOrderCompleted = order?.status === 'delivered';
  const rewards = usePostOrderRewards({
    orderId: order?._id || (order as any)?.id,
    storeId: storeData?._id || storeData,
    storeName: storeData?.name || 'Store',
    cashbackEarned: order?.totals?.cashback || 0,
    orderTotal: order?.totals?.total || 0,
    reviewAllowed: isImmediateExperience || isOrderCompleted });

  // Deep-link parameter validation guard
  if (!orderId || typeof orderId !== 'string') {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
    return null;
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit' });
  };

  const getPaymentMethodDisplay = (method: string) => {
    const methods: Record<string, string> = {
      wallet: 'Wallet',
      card: 'Card',
      upi: 'UPI',
      cod: 'Cash on Delivery',
      netbanking: 'Net Banking' };
    return methods[method] || method;
  };

  const getEstimatedDelivery = () => {
    if (!order) return 'Calculating...';

    // Calculate estimated delivery (3-5 days from now)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 4);

    return deliveryDate.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'short' });
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.brand.purpleLight} />
        <DetailPageSkeleton />
      </ThemedView>
    );
  }

  if (error || !order) {
    return (
      <ThemedView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.brand.purpleLight} />
        <LinearGradient colors={[colors.brand.purpleLight, colors.brand.purple]} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <ThemedText style={styles.headerTitle}>Order Not Found</ThemedText>
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
          <ThemedText style={styles.errorTitle}>Order Not Found</ThemedText>
          <ThemedText style={styles.errorMessage}>{error || 'Unable to load order details'}</ThemedText>
          <Pressable style={styles.primaryButton} onPress={handleContinueShopping}>
            <ThemedText style={styles.primaryButtonText}>Go to Home</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.purpleLight} />

      {/* Header */}
      <LinearGradient colors={[colors.brand.purpleLight, colors.brand.purple]} style={styles.headerGradient}>
        <View style={styles.headerContent}>
          <ThemedText style={styles.headerTitle}>Order Confirmed</ThemedText>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Success Animation */}
        <Animated.View
          style={[
            styles.successSection,
            successAnimStyle,
          ]}
        >
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
          </View>
          <ThemedText style={styles.successTitle}>Order Placed Successfully!</ThemedText>
          <ThemedText style={styles.successSubtitle}>
            Thank you for your purchase
          </ThemedText>
        </Animated.View>

        {/* Order Details Card */}
        <Animated.View style={[styles.card, contentAnimStyle]}>
          <ThemedText style={styles.cardTitle}>Order Details</ThemedText>

          <View style={styles.orderInfo}>
            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Order Number</ThemedText>
              <ThemedText style={styles.infoValue}>{order.orderNumber}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Order Date</ThemedText>
              <ThemedText style={styles.infoValue}>{formatDate(order.createdAt)}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Payment Method</ThemedText>
              <ThemedText style={styles.infoValue}>
                {getPaymentMethodDisplay(order.payment.method)}
              </ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Payment Status</ThemedText>
              <View style={[styles.statusBadge, styles.paidBadge]}>
                <ThemedText style={styles.statusText}>
                  {order.payment.status === 'paid' ? 'Paid' : 'Pending'}
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Fulfillment / Delivery Information */}
        <Animated.View style={[styles.card, contentAnimStyle]}>
          {/* Fulfillment type badge */}
          {(order as any).fulfillmentType && (order as any).fulfillmentType !== 'delivery' && (
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.secondary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.sm, gap: 5 }}>
                <Ionicons
                  name={
                    (order as any).fulfillmentType === 'pickup' ? 'bag-handle-outline' :
                    (order as any).fulfillmentType === 'drive_thru' ? 'car-outline' :
                    (order as any).fulfillmentType === 'dine_in' ? 'restaurant-outline' : 'bicycle-outline'
                  }
                  size={14} color={Colors.nileBlue}
                />
                <ThemedText style={{ ...Typography.bodySmall, fontWeight: '600', color: Colors.nileBlue }}>
                  {(order as any).fulfillmentType === 'pickup' ? 'Store Pickup' :
                   (order as any).fulfillmentType === 'drive_thru' ? 'Drive-Thru' :
                   (order as any).fulfillmentType === 'dine_in' ? 'Dine-In' : 'Delivery'}
                </ThemedText>
              </View>
            </View>
          )}

          <ThemedText style={styles.cardTitle}>
            {(order as any).fulfillmentType === 'pickup' ? 'Pickup Information' :
             (order as any).fulfillmentType === 'drive_thru' ? 'Drive-Thru Information' :
             (order as any).fulfillmentType === 'dine_in' ? 'Dine-In Information' :
             'Delivery Information'}
          </ThemedText>

          {/* Dine-in: show table number */}
          {(order as any).fulfillmentType === 'dine_in' && (order as any).fulfillmentDetails?.tableNumber && (
            <View style={styles.deliveryInfo}>
              <View style={styles.deliveryIconContainer}>
                <Ionicons name="restaurant" size={24} color={Colors.nileBlue} />
              </View>
              <View style={styles.deliveryDetails}>
                <ThemedText style={styles.deliveryAddress}>Table {(order as any).fulfillmentDetails.tableNumber}</ThemedText>
                <ThemedText style={styles.deliveryAddressText}>Order from your table</ThemedText>
              </View>
            </View>
          )}

          {/* Pickup / Drive-Thru: show store address */}
          {((order as any).fulfillmentType === 'pickup' || (order as any).fulfillmentType === 'drive_thru') && (
            <View style={styles.deliveryInfo}>
              <View style={styles.deliveryIconContainer}>
                <Ionicons name="storefront-outline" size={24} color={Colors.nileBlue} />
              </View>
              <View style={styles.deliveryDetails}>
                <ThemedText style={styles.deliveryAddress}>
                  {(order as any).fulfillmentDetails?.storeAddress || 'Store Address'}
                </ThemedText>
                {(order as any).fulfillmentDetails?.vehicleInfo && (
                  <ThemedText style={styles.deliveryAddressText}>Vehicle: {(order as any).fulfillmentDetails.vehicleInfo}</ThemedText>
                )}
              </View>
            </View>
          )}

          {/* Delivery: show delivery address (existing) */}
          {(!(order as any).fulfillmentType || (order as any).fulfillmentType === 'delivery') && (
            <View style={styles.deliveryInfo}>
              <View style={styles.deliveryIconContainer}>
                <Ionicons name="location" size={24} color={Colors.brand.purpleLight} />
              </View>
              <View style={styles.deliveryDetails}>
                <ThemedText style={styles.deliveryAddress}>
                  {order.delivery?.address?.name}
                </ThemedText>
                <ThemedText style={styles.deliveryAddressText}>
                  {order.delivery?.address?.addressLine1}
                  {order.delivery?.address?.addressLine2 ? `, ${order.delivery.address.addressLine2}` : ''}
                </ThemedText>
                <ThemedText style={styles.deliveryAddressText}>
                  {order.delivery?.address?.city}, {order.delivery?.address?.state} - {order.delivery?.address?.pincode}
                </ThemedText>
                <ThemedText style={styles.deliveryPhone}>
                  {order.delivery?.address?.phone}
                </ThemedText>
              </View>
            </View>
          )}

          <View style={styles.estimatedDelivery}>
            <Ionicons name="time-outline" size={20} color={Colors.gold} />
            <ThemedText style={styles.estimatedDeliveryText}>
              {(order as any).fulfillmentType === 'pickup' ? 'Estimated Ready Time' :
               (order as any).fulfillmentType === 'drive_thru' ? 'Estimated Wait' :
               (order as any).fulfillmentType === 'dine_in' ? 'Preparing your order' :
               `Estimated Delivery: ${getEstimatedDelivery()}`}
            </ThemedText>
          </View>
        </Animated.View>

        {/* Order Items */}
        <Animated.View style={[styles.card, contentAnimStyle]}>
          <ThemedText style={styles.cardTitle}>Order Items ({order.items.length})</ThemedText>

          {order.items.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <ThemedText style={styles.itemName}>{item.product?.name || 'Product'}</ThemedText>
                {item.variant && (
                  <ThemedText style={styles.itemVariant}>
                    Variant: {item.variant.name}
                  </ThemedText>
                )}
                <ThemedText style={styles.itemQuantity}>Qty: {item.quantity}</ThemedText>
              </View>
              <ThemedText style={styles.itemPrice}>{currencySymbol}{item.totalPrice}</ThemedText>
            </View>
          ))}
        </Animated.View>

        {/* Order Summary */}
        <Animated.View style={[styles.card, contentAnimStyle]}>
          <ThemedText style={styles.cardTitle}>Order Summary</ThemedText>

          <View style={styles.summaryRows}>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Subtotal</ThemedText>
              <ThemedText style={styles.summaryValue}>{currencySymbol}{order.totals.subtotal}</ThemedText>
            </View>

            {order.totals.delivery > 0 && (
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Delivery Fee</ThemedText>
                <ThemedText style={styles.summaryValue}>{currencySymbol}{order.totals.delivery}</ThemedText>
              </View>
            )}

            {order.totals.tax > 0 && (
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Tax</ThemedText>
                <ThemedText style={styles.summaryValue}>{currencySymbol}{order.totals.tax}</ThemedText>
              </View>
            )}

            {order.totals.discount > 0 && (
              <View style={styles.summaryRow}>
                <ThemedText style={[styles.summaryLabel, { color: Colors.success }]}>
                  Discount
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: Colors.success }]}>
                  -{currencySymbol}{order.totals.discount}
                </ThemedText>
              </View>
            )}

            {(order.payment as any)?.coinsUsed && ((order.payment as any).coinsUsed.wasilCoins > 0 || (order.payment as any).coinsUsed.promoCoins > 0 || (order.payment as any).coinsUsed.storePromoCoins > 0) && (
              <View style={styles.summaryRow}>
                <ThemedText style={[styles.summaryLabel, { color: Colors.brand.purpleLight }]}>
                  💎 Coins Used
                  {(order.payment as any).coinsUsed.storePromoCoins > 0 && ' (includes Store Promo)'}
                </ThemedText>
                <ThemedText style={[styles.summaryValue, { color: Colors.brand.purpleLight }]}>
                  -{currencySymbol}{(order.payment as any).coinsUsed.totalCoinsValue || 0}
                </ThemedText>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <ThemedText style={styles.totalLabel}>Total Paid</ThemedText>
              <ThemedText style={styles.totalValue}>{currencySymbol}{order.totals.total}</ThemedText>
            </View>

          </View>
        </Animated.View>

        {/* Rewards Breakdown Card */}
        <Animated.View style={[{ marginBottom: 16 }, contentAnimStyle]}>
          <RewardsBreakdownCard
            totalEarned={rewards.totalEarned}
            totalPossible={rewards.totalPossible}
            progressPercent={rewards.progressPercent}
            checklistItems={rewards.checklistItems}
            onReviewPress={rewards.handleReview}
            onSharePress={rewards.handleShare}
            currencySymbol={currencySymbol}
          />
        </Animated.View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable
          style={styles.secondaryButton}
          onPress={handleContinueShopping}
         
        >
          <ThemedText style={styles.secondaryButtonText}>Continue Shopping</ThemedText>
        </Pressable>

        <Pressable
          style={styles.primaryButton}
          onPress={handleTrackOrder}
         
        >
          <Ionicons name="location" size={20} color="white" />
          <ThemedText style={styles.primaryButtonText}>Track Order</ThemedText>
        </Pressable>
      </View>

      {/* Cross-Platform Modal (replaces Alert.alert for web compatibility) */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalIconContainer}>
              <Ionicons
                name={modalContent.icon}
                size={48}
                color={modalContent.iconColor}
              />
            </View>
            <ThemedText style={styles.modalTitle}>{modalContent.title}</ThemedText>
            <ThemedText style={styles.modalMessage}>{modalContent.message}</ThemedText>
            <Pressable
              style={styles.modalButton}
              onPress={() => setModalVisible(false)}
             
            >
              <ThemedText style={styles.modalButtonText}>Got it!</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ConfettiOverlay visible={showConfetti} onComplete={() => setShowConfetti(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20 },
  headerContent: {
    alignItems: 'center' },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '600',
    color: Colors.text.inverse },
  content: {
    flex: 1,
    padding: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center' },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg },
  errorTitle: {
    ...Typography.h2,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm },
  errorMessage: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl },
  successSection: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.base },
  successIconContainer: {
    marginBottom: Spacing.base },
  successTitle: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center' },
  successSubtitle: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    textAlign: 'center' },
  card: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base },
  cardTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.base },
  orderInfo: {
    gap: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  infoLabel: {
    ...Typography.body,
    color: Colors.text.tertiary },
  infoValue: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.text.primary },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12 },
  paidBadge: {
    backgroundColor: Colors.background.secondary },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.success },
  deliveryInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16 },
  deliveryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center' },
  deliveryDetails: {
    flex: 1 },
  deliveryAddress: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs },
  deliveryAddressText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20 },
  deliveryPhone: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs },
  estimatedDelivery: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.linen,
    padding: 12,
    borderRadius: 8 },
  estimatedDeliveryText: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.gold },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary },
  itemInfo: {
    flex: 1 },
  itemName: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.text.primary,
    marginBottom: Spacing.xs },
  itemVariant: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: 2 },
  itemQuantity: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary },
  itemPrice: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary },
  summaryRows: {
    gap: 12 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center' },
  summaryLabel: {
    ...Typography.body,
    color: Colors.text.tertiary },
  summaryValue: {
    ...Typography.body,
    fontWeight: '500',
    color: Colors.text.primary },
  divider: {
    height: 1,
    backgroundColor: Colors.border.default,
    marginVertical: Spacing.sm },
  totalLabel: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary },
  totalValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.brand.purpleLight },
  bottomSpacing: {
    height: 100 },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderWidth: 1.5,
    borderColor: Colors.brand.purpleLight,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center' },
  secondaryButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.brand.purpleLight },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.brand.purpleLight,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm },
  primaryButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse },
  // Cross-platform modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20 },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 25 },
        shadowOpacity: 0.25,
        shadowRadius: 50,
        elevation: 25 } }) },
  modalIconContainer: {
    marginBottom: Spacing.base },
  modalTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm },
  modalMessage: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg },
  modalButton: {
    backgroundColor: Colors.brand.purpleLight,
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 120,
    alignItems: 'center' },
  modalButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse } });

export default withErrorBoundary(OrderConfirmationPage, 'OrderConfirmation');
