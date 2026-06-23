// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

const STATUS_STEPS = [
  { key: 'placed', label: 'Order Placed', icon: 'receipt-outline' as const },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' as const },
  { key: 'preparing', label: 'Preparing', icon: 'flame-outline' as const },
  { key: 'ready', label: 'Served', icon: 'restaurant-outline' as const },
  { key: 'delivered', label: 'Completed', icon: 'checkmark-done-outline' as const },
];

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    placed: 0, confirmed: 1, preparing: 2, ready: 3, delivered: 4,
  };
  return map[status] ?? 0;
}

function DineInTrackingScreen() {
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

  const tableNumber = order?.fulfillmentDetails?.tableNumber || '';

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
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Dine-In Order</Text>
          <Text style={styles.headerSub}>#{order?.orderNumber || ''}</Text>
        </View>
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Table Number */}
      {tableNumber ? (
        <View style={styles.tableBadge}>
          <Ionicons name="restaurant" size={22} color={Colors.nileBlue} />
          <Text style={styles.tableText}>Table {tableNumber}</Text>
        </View>
      ) : null}

      {/* Ready Banner */}
      {isReady && (
        <View style={styles.readyBanner}>
          <Ionicons name="restaurant" size={28} color={Colors.text.inverse} />
          <View style={{ marginLeft: Spacing.md, flex: 1 }}>
            <Text style={styles.readyTitle}>Your food is being served!</Text>
            <Text style={styles.readySub}>Enjoy your meal</Text>
          </View>
        </View>
      )}

      {isDone && (
        <View style={[styles.readyBanner, { backgroundColor: Colors.success }]}>
          <Ionicons name="checkmark-done-circle" size={28} color={Colors.text.inverse} />
          <View style={{ marginLeft: Spacing.md, flex: 1 }}>
            <Text style={styles.readyTitle}>Meal complete!</Text>
            <Text style={styles.readySub}>Thank you for dining with us</Text>
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

      {/* Order Items */}
      {order?.items && (
        <View style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Your Order</Text>
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

      {/* Reorder / Add Items */}
      {!isDone && (
        <Pressable
          style={styles.addMoreBtn}
          onPress={() => {
            const storeId = order?.store?._id || order?.store;
            if (storeId) router.push(`/store/${storeId}?dineIn=true&table=${encodeURIComponent(tableNumber)}`);
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color={Colors.nileBlue} />
          <Text style={styles.addMoreText}>Add More Items</Text>
        </Pressable>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg },
  errorText: { marginTop: Spacing.md, ...Typography.body, color: Colors.error, textAlign: 'center' },
  retryBtn: { marginTop: Spacing.base, paddingHorizontal: Spacing.xl, paddingVertical: 10, backgroundColor: Colors.nileBlue, borderRadius: BorderRadius.sm },
  retryText: { color: Colors.text.inverse, fontWeight: '600' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: Platform.OS === 'ios' ? 56 : Spacing.base, paddingBottom: Spacing.md, backgroundColor: Colors.background.primary },
  backBtn: { padding: Spacing.sm, marginRight: Spacing.sm },
  headerTitle: { ...Typography.h4, fontWeight: '700', color: Colors.nileBlue },
  headerSub: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.successScale[100], paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.success, marginRight: Spacing.xs },
  liveText: { ...Typography.caption, fontWeight: '700', color: Colors.success },

  tableBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f6fa', marginHorizontal: Spacing.base, marginTop: Spacing.base, padding: 14, borderRadius: BorderRadius.md, gap: Spacing.sm, borderWidth: 1.5, borderColor: Colors.nileBlue },
  tableText: { ...Typography.h4, fontWeight: '700', color: Colors.nileBlue },

  readyBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gold, marginHorizontal: Spacing.base, marginTop: Spacing.base, padding: Spacing.base, borderRadius: 14 },
  readyTitle: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.inverse },
  readySub: { ...Typography.bodySmall, color: '#ffffffcc', marginTop: 2 },

  timelineCard: { backgroundColor: Colors.background.primary, margin: Spacing.base, padding: Spacing.base, borderRadius: 14, ...Shadows.subtle },
  sectionTitle: { ...Typography.body, fontWeight: '700', color: Colors.nileBlue, marginBottom: 14 },
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

  itemsCard: { backgroundColor: Colors.background.primary, margin: Spacing.base, padding: Spacing.base, borderRadius: 14, ...Shadows.subtle },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.background.secondary },
  itemQty: { width: 30, ...Typography.bodySmall, fontWeight: '600', color: Colors.text.tertiary },
  itemName: { flex: 1, ...Typography.body, color: Colors.nileBlue },
  itemPrice: { ...Typography.body, fontWeight: '600', color: Colors.nileBlue },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Spacing.md, marginTop: Spacing.xs },
  totalLabel: { ...Typography.body, fontWeight: '700', color: Colors.nileBlue },
  totalValue: { ...Typography.body, fontWeight: '700', color: Colors.nileBlue },

  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: Spacing.base, paddingVertical: 14, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.nileBlue, borderStyle: 'dashed', gap: Spacing.sm },
  addMoreText: { ...Typography.body, fontWeight: '600', color: Colors.nileBlue },
});

export default withErrorBoundary(DineInTrackingScreen, 'DineinTracking');
