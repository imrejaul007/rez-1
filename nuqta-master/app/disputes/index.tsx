// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import disputeApi, { Dispute } from '@/services/disputeApi';
import CachedImage from '@/components/ui/CachedImage';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const STATUS_COLORS: Record<string, string> = {
  open: colors.error,
  under_review: colors.warningScale[400],
  escalated: colors.brand.purpleLight,
  resolved_refund: colors.successScale[400],
  resolved_reject: colors.brand.blue,
  auto_resolved: colors.brand.indigo,
  closed: colors.neutral[500],
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  under_review: 'Under Review',
  escalated: 'Escalated',
  resolved_refund: 'Refunded',
  resolved_reject: 'Rejected',
  auto_resolved: 'Auto-Resolved',
  closed: 'Closed',
};

function DisputeListScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { isAuthenticated, authLoading } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchDisputes = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (authLoading || !isAuthenticated) return;
    if (!append) setLoading(true);
    else setLoadingMore(true);

    try {
      const response = await disputeApi.getMyDisputes(pageNum, 20);
      if (response.success && response.data) {
        const data = response.data as any;
        const items = data.disputes || [];
        const pagination = data.pagination;

        if (append) {
          setDisputes(prev => [...prev, ...items]);
        } else {
          setDisputes(items);
        }
        setPage(pageNum);
        setHasMore(pagination?.hasNext ?? false);
      }
    } catch (err) {
      if (__DEV__) console.error('Failed to fetch disputes:', err);
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    fetchDisputes(1);
  }, [isAuthenticated, authLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDisputes(1);
    if (!isMounted()) return;
    setRefreshing(false);
  }, [fetchDisputes]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchDisputes(page + 1, true);
    }
  }, [loadingMore, hasMore, page, fetchDisputes]);

  const renderDispute = useCallback(({ item }: { item: Dispute }) => {
    const statusColor = STATUS_COLORS[item.status] || colors.neutral[500];

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/disputes/${item._id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.disputeNumber}>{item.disputeNumber}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardRow}>
            <Ionicons name="receipt-outline" size={14} color={colors.neutral[500]} />
            <Text style={styles.cardRowText}>Order: {item.targetRef}</Text>
          </View>
          <View style={styles.cardRow}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.neutral[500]} />
            <Text style={styles.cardRowText}>{item.reason.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.amountText}>{item.amount} coins</Text>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.neutral[400]} />
        </View>
      </TouchableOpacity>
    );
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={disputes}
        keyExtractor={(item) => item._id}
          estimatedItemSize={70}
        renderItem={renderDispute}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.purple} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={loadingMore ? <ActivityIndicator size="small" style={{ padding: 16 }} /> : null}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="shield-checkmark-outline" size={40} color={colors.neutral[400]} />
            </View>
            <Text style={styles.emptyTitle}>No Disputes</Text>
            <Text style={styles.emptySubtitle}>You haven't raised any disputes yet</Text>
          </View>
        }
        contentContainerStyle={[
          disputes.length === 0 && { flex: 1, justifyContent: 'center' },
          { paddingBottom: 120 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.tint.coolGray, padding: spacing.base },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.tint.coolGray },

  card: {
    backgroundColor: colors.background.primary, borderRadius: 14, padding: 14, marginBottom: 10,
    ...shadows.subtle,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  disputeNumber: { ...typography.label, color: colors.text.primary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { ...typography.labelSmall },
  cardBody: { gap: 5, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardRowText: { ...typography.body, color: colors.neutral[500], textTransform: 'capitalize' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountText: { ...typography.label, color: colors.text.primary },
  dateText: { fontSize: 11, color: colors.neutral[400] },

  emptyState: { alignItems: 'center', gap: 6 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.border.light,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  emptySubtitle: { ...typography.body, color: colors.neutral[500] },
});

export default withErrorBoundary(DisputeListScreen, 'DisputesIndex');
