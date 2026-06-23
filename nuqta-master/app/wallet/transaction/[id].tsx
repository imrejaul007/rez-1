import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Transaction Detail Page
// Shows full details for a single wallet transaction

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import walletApi, { TransactionResponse } from '@/services/walletApi';
import { DetailPageSkeleton } from '@/components/skeletons';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  earning: { icon: 'arrow-down-circle', color: colors.successScale[400], label: 'Earning' },
  spending: { icon: 'arrow-up-circle', color: colors.error, label: 'Spending' },
  refund: { icon: 'refresh-circle', color: colors.infoScale[400], label: 'Refund' },
  withdrawal: { icon: 'wallet', color: colors.warningScale[400], label: 'Withdrawal' },
  topup: { icon: 'add-circle', color: colors.successScale[400], label: 'Top Up' },
  bonus: { icon: 'gift', color: colors.brand.purpleLight, label: 'Bonus' },
  penalty: { icon: 'warning', color: colors.error, label: 'Penalty' },
  cashback: { icon: 'cash', color: colors.successScale[400], label: 'Cashback' },
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  completed: { color: colors.successScale[400], bg: colors.tint.green },
  pending: { color: colors.warningScale[400], bg: colors.tint.amberLight },
  processing: { color: colors.infoScale[400], bg: colors.tint.blueLight },
  failed: { color: colors.error, bg: colors.errorScale[100] },
  cancelled: { color: colors.neutral[500], bg: colors.neutral[100] },
  reversed: { color: colors.brand.purpleLight, bg: colors.tint.purple },
};

function TransactionDetailPage() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!id) return;
    fetchTransaction();
  }, [id]);

  const fetchTransaction = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await walletApi.getTransactionById(id!);
      if (res?.data?.transaction) {
        setTransaction(res.data.transaction);
      } else {
        if (!isMounted()) return;
        setError('Transaction not found');
      }
    } catch {
      if (!isMounted()) return;
      setError('Failed to load transaction details');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleShare = async () => {
    if (!transaction) return;
    const sign = transaction.type === 'credit' ? '+' : '-';
    try {
      await Share.share({
        message: `Transaction Receipt\n${sign}${transaction.amount} ${BRAND.CURRENCY_CODE}\n${transaction.description}\nStatus: ${transaction.status.current}\nDate: ${formatDate(transaction.createdAt)}\nID: ${transaction.transactionId}`,
      });
    } catch {
      // share cancelled
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[Colors.primary[600], Colors.secondary[700]]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Transaction</ThemedText>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <DetailPageSkeleton />
      </View>
    );
  }

  if (error || !transaction) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[Colors.primary[600], Colors.secondary[700]]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Transaction</ThemedText>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.text.tertiary} />
          <ThemedText style={styles.errorText}>{error || 'Transaction not found'}</ThemedText>
          <Pressable style={styles.retryButton} onPress={fetchTransaction}>
            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  const cat = CATEGORY_CONFIG[transaction.category] || CATEGORY_CONFIG.earning;
  const statusStyle = STATUS_COLORS[transaction.status.current] || STATUS_COLORS.pending;
  const isCredit = transaction.type === 'credit';
  const sign = isCredit ? '+' : '-';
  const amountColor = isCredit ? colors.successScale[400] : colors.error;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      <LinearGradient colors={[Colors.primary[600], Colors.secondary[700]]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Transaction Details</ThemedText>
          <Pressable onPress={handleShare} style={styles.shareButton}>
            <Ionicons name="share-outline" size={22} color={colors.background.primary} />
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={[styles.iconCircle, { backgroundColor: cat.color + '20' }]}>
            <Ionicons name={cat.icon as any} size={32} color={cat.color} />
          </View>
          <ThemedText style={[styles.amount, { color: amountColor }]}>
            {sign}{transaction.amount} {BRAND.CURRENCY_CODE}
          </ThemedText>
          <ThemedText style={styles.description}>{transaction.description}</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <ThemedText style={[styles.statusText, { color: statusStyle.color }]}>
              {transaction.status.current.charAt(0).toUpperCase() + transaction.status.current.slice(1)}
            </ThemedText>
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Details</ThemedText>
          <DetailRow label="Transaction ID" value={transaction.transactionId} />
          <DetailRow label="Type" value={cat.label} />
          <DetailRow label="Date" value={formatDate(transaction.createdAt)} />
          {transaction.source?.description && (
            <DetailRow label="Source" value={transaction.source.description} />
          )}
          {transaction.source?.type && (
            <DetailRow label="Source Type" value={transaction.source.type} />
          )}
        </View>

        {/* Balance Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Balance</ThemedText>
          <DetailRow label="Before" value={`${Number.isFinite(transaction.balanceBefore) ? transaction.balanceBefore : 0} ${BRAND.CURRENCY_CODE}`} />
          <DetailRow label="After" value={`${Number.isFinite(transaction.balanceAfter) ? transaction.balanceAfter : 0} ${BRAND.CURRENCY_CODE}`} />
          {Number.isFinite(transaction.fees) && transaction.fees! > 0 && (
            <DetailRow label="Fees" value={`${transaction.fees} ${BRAND.CURRENCY_CODE}`} />
          )}
          {Number.isFinite(transaction.netAmount) && (
            <DetailRow label="Net Amount" value={`${transaction.netAmount} ${BRAND.CURRENCY_CODE}`} />
          )}
        </View>

        {/* Status History */}
        {transaction.status.history && transaction.status.history.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Status Timeline</ThemedText>
            {transaction.status.history.map((entry, idx) => {
              const entryStyle = STATUS_COLORS[entry.status] || STATUS_COLORS.pending;
              return (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineDot}>
                    <View style={[styles.dot, { backgroundColor: entryStyle.color }]} />
                    {idx < transaction.status.history.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <ThemedText style={styles.timelineStatus}>
                      {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    </ThemedText>
                    <ThemedText style={styles.timelineDate}>{formatDate(entry.timestamp)}</ThemedText>
                    {entry.reason && (
                      <ThemedText style={styles.timelineReason}>{entry.reason}</ThemedText>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Notes */}
        {transaction.notes && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
            <ThemedText style={styles.notesText}>{transaction.notes}</ThemedText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <ThemedText style={styles.detailLabel}>{label}</ThemedText>
      <ThemedText style={styles.detailValue} numberOfLines={2}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
  },
  shareButton: {
    padding: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  amountCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.base,
    ...Shadows.subtle,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  description: {
    ...Typography.body,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  statusBadge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
  },
  statusText: {
    ...Typography.label,
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  detailLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    flex: 1,
  },
  detailValue: {
    ...Typography.bodySmall,
    color: Colors.text.primary,
    fontWeight: '500',
    flex: 1.5,
    textAlign: 'right',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  timelineDot: {
    alignItems: 'center',
    width: 24,
    marginRight: Spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.gray[200],
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  timelineStatus: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  timelineDate: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  timelineReason: {
    ...Typography.caption,
    color: Colors.text.secondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  notesText: {
    ...Typography.body,
    color: Colors.text.secondary,
  },
});

export default withErrorBoundary(TransactionDetailPage, 'WalletTransactionId');
