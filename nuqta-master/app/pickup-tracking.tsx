// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { catchAndWarn } from '@/utils/catchAndReport';

const STATUS_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: 'receipt-outline' as const },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' as const },
  { key: 'preparing', label: 'Preparing', icon: 'flame-outline' as const },
  { key: 'ready', label: 'Ready for Pickup', icon: 'bag-check-outline' as const },
  { key: 'delivered', label: 'Picked Up', icon: 'checkmark-done-outline' as const },
];

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    placed: 0, confirmed: 1, preparing: 2, ready: 3, delivered: 4,
  };
  return map[status] ?? 0;
}

function PickupTrackingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const currency = getCurrencySymbol();

  const {
    order,
    loading,
    error,
    statusUpdate,
    isLive,
    refresh,
  } = useOrderTracking((!authLoading && isAuthenticated && orderId) ? orderId : null);

  const currentStatus = statusUpdate?.status || order?.status || 'placed';
  const currentStep = getStepIndex(currentStatus);
  const isReady = currentStatus === 'ready';
  const isDone = currentStatus === 'delivered';

  const storeAddress = order?.fulfillmentDetails?.storeAddress || '';
  const storeCoords = order?.fulfillmentDetails?.storeCoordinates;
  const estimatedReady = order?.fulfillmentDetails?.estimatedReadyTime;

  const openMaps = useCallback(() => {
    if (storeCoords && storeCoords.length === 2) {
      const [lng, lat] = storeCoords;
      const url = Platform.select({
        ios: `maps:0,0?q=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}`,
        default: `https://www.google.com/maps?q=${lat},${lng}`,
      });
      try { Linking.openURL(url!); } catch (e) { catchAndWarn(e, 'PickupTracking/openURL'); }
    }
  }, [storeCoords]);

  // Deep-link parameter validation guard
  if (!orderId || typeof orderId !== 'string') {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
    return null;
  }

  if (loading && !order) {
    return <DetailPageSkeleton />;
  }

  if (error && !order) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pickup Order</Text>
          <Text style={styles.headerSub}>#{order?.orderNumber || ''}</Text>
        </View>
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Ready Banner */}
      {isReady && (
        <View style={styles.readyBanner}>
          <Ionicons name="bag-check" size={28} color={Colors.text.inverse} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.readyTitle}>Your order is ready!</Text>
            <Text style={styles.readySub}>Head to the store to pick it up</Text>
          </View>
        </View>
      )}

      {isDone && (
        <View style={[styles.readyBanner, { backgroundColor: Colors.success }]}>
          <Ionicons name="checkmark-done-circle" size={28} color={Colors.text.inverse} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.readyTitle}>Order picked up!</Text>
            <Text style={styles.readySub}>Enjoy your meal</Text>
          </View>
        </View>
      )}

      {/* Status Timeline */}
      <View style={styles.timelineCard}>
        <Text style={styles.sectionTitle}>Order Progress</Text>
        {STATUS_STEPS.map((step, idx) => {
          const isActive = idx <= currentStep;
          const isCurrent = idx === currentStep;
          return (
            <View key={step.key} style={styles.timelineRow}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, isActive && styles.timelineDotActive, isCurrent && styles.timelineDotCurrent]}>
                  <Ionicons name={step.icon} size={16} color={isActive ? Colors.text.inverse : Colors.text.tertiary} />
                </View>
                {idx < STATUS_STEPS.length - 1 && (
                  <View style={[styles.timelineLine, isActive && styles.timelineLineActive]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}>
                  {step.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Store Info */}
      <View style={styles.storeCard}>
        <Text style={styles.sectionTitle}>Pickup Location</Text>
        <View style={styles.storeRow}>
          <Ionicons name="storefront-outline" size={22} color={Colors.nileBlue} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.storeName}>{order?.store?.name || 'Store'}</Text>
            {storeAddress ? <Text style={styles.storeAddr}>{storeAddress}</Text> : null}
          </View>
        </View>
        {estimatedReady && (
          <View style={styles.estRow}>
            <Ionicons name="time-outline" size={18} color={Colors.text.tertiary} />
            <Text style={styles.estText}>
              Ready by {new Date(estimatedReady).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
        {storeCoords && (
          <Pressable style={styles.directionsBtn} onPress={openMaps}>
            <Ionicons name="navigate" size={18} color={Colors.text.inverse} />
            <Text style={styles.directionsText}>Get Directions</Text>
          </Pressable>
        )}
      </View>

      {/* Order Items Summary */}
      {order?.items && (
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity}x</Text>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemPrice}>{currency}{item.subtotal || item.price * item.quantity}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{currency}{order.totals?.total || 0}</Text>
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  errorText: { marginTop: Spacing.md, ...Typography.body, color: Colors.error, textAlign: 'center' },
  retryBtn: { marginTop: Spacing.base, paddingHorizontal: Spacing.xl, paddingVertical: 10, backgroundColor: Colors.nileBlue, borderRadius: BorderRadius.sm },
  retryText: { color: Colors.text.inverse, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: Platform.OS === 'ios' ? 56 : Spacing.base, paddingBottom: Spacing.md, backgroundColor: Colors.background.primary },
  backBtn: { padding: Spacing.sm, marginRight: Spacing.sm },
  headerTitle: { ...Typography.h4, fontWeight: '700', color: Colors.nileBlue },
  headerSub: { ...Typography.bodySmall, fontSize: 13, color: Colors.text.tertiary, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successScale[100], paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success, marginRight: Spacing.xs },
  liveText: { ...Typography.caption, fontWeight: '700', color: Colors.success },

  readyBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gold, marginHorizontal: Spacing.base, marginTop: Spacing.base, padding: Spacing.base, borderRadius: 14 },
  readyTitle: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.inverse },
  readySub: { ...Typography.bodySmall, fontSize: 13, color: '#ffffffcc', marginTop: 2 },

  timelineCard: { backgroundColor: Colors.background.primary, margin: Spacing.base, padding: Spacing.base, borderRadius: 14, ...Shadows.subtle },
  sectionTitle: { ...Typography.body, fontSize: 15, fontWeight: '700', color: Colors.nileBlue, marginBottom: 14 },
  timelineRow: { flexDirection: 'row', minHeight: 52 },
  timelineLeft: { alignItems: 'center', width: 36 },
  timelineDot: { width: 32, height: 32, borderRadius: BorderRadius.lg, backgroundColor: Colors.border.default, alignItems: 'center', justifyContent: 'center' },
  timelineDotActive: { backgroundColor: Colors.nileBlue },
  timelineDotCurrent: { backgroundColor: Colors.gold },
  timelineLine: { width: 2, flex: 1, backgroundColor: Colors.border.default, marginVertical: Spacing.xs },
  timelineLineActive: { backgroundColor: Colors.nileBlue },
  timelineContent: { flex: 1, marginLeft: Spacing.md, justifyContent: 'center' },
  timelineLabel: { ...Typography.body, color: Colors.text.tertiary },
  timelineLabelActive: { color: Colors.nileBlue, fontWeight: '600' },

  storeCard: { backgroundColor: Colors.background.primary, marginHorizontal: Spacing.base, padding: Spacing.base, borderRadius: 14, ...Shadows.subtle },
  storeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  storeName: { ...Typography.body, fontSize: 15, fontWeight: '600', color: Colors.nileBlue },
  storeAddr: { ...Typography.bodySmall, fontSize: 13, color: Colors.text.tertiary, marginTop: 2 },
  estRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  estText: { ...Typography.bodySmall, fontSize: 13, color: Colors.text.tertiary, marginLeft: 6 },
  directionsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.nileBlue, paddingVertical: Spacing.md, borderRadius: 10, gap: 6 },
  directionsText: { color: Colors.text.inverse, fontWeight: '600', ...Typography.body },

  itemsCard: { backgroundColor: Colors.background.primary, margin: Spacing.base, padding: Spacing.base, borderRadius: 14, ...Shadows.subtle },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.background.secondary },
  itemQty: { width: 30, ...Typography.bodySmall, fontSize: 13, fontWeight: '600', color: Colors.text.tertiary },
  itemName: { flex: 1, ...Typography.body, color: Colors.nileBlue },
  itemPrice: { ...Typography.body, fontWeight: '600', color: Colors.nileBlue },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.md, marginTop: Spacing.xs },
  totalLabel: { ...Typography.body, fontSize: 15, fontWeight: '700', color: Colors.nileBlue },
  totalValue: { ...Typography.body, fontSize: 15, fontWeight: '700', color: Colors.nileBlue },
});

export default withErrorBoundary(PickupTrackingScreen, 'PickupTracking');
