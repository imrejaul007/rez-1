import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Coin Expiry Tracker Page
// Enhanced expiry tracking with timeline

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import walletApi from '@/services/walletApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { TransactionListSkeleton } from '@/components/skeletons';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface ExpiringCoin {
  id: string;
  amount: number;
  expiryDate: string;
  daysLeft: number;
  coinType: 'rez' | 'promo' | 'store';
}

interface GroupedCoins {
  thisWeek: ExpiringCoin[];
  thisMonth: ExpiringCoin[];
  nextMonth: ExpiringCoin[];
}

/**
 * Map a raw API coin object into our local ExpiringCoin shape.
 */
function mapCoin(raw: any, index: number): ExpiringCoin {
  const expiryDate = raw.expiresAt || raw.expiryDate || raw.promoDetails?.expiryDate || '';
  let daysLeft = raw.daysLeft ?? 0;
  if (!daysLeft && expiryDate) {
    const parsed = new Date(expiryDate).getTime();
    daysLeft = Number.isFinite(parsed) ? Math.max(0, Math.ceil((parsed - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  }
  return {
    id: raw._id || raw.id || `coin-${index}`,
    amount: raw.amount ?? 0,
    expiryDate,
    daysLeft,
    coinType: raw.type || 'rez',
  };
}

function ExpiryTrackerPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grouped, setGrouped] = useState<GroupedCoins>({ thisWeek: [], thisMonth: [], nextMonth: [] });
  const [totalExpiringSoon, setTotalExpiringSoon] = useState(0);
  const mountedRef = useRef(true);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const fetchExpiringCoins = useCallback(async () => {
    try {
      setError(null);
      const response = await walletApi.getExpiringCoins();
      const data = response?.data;

      if (!data?.expiringCoins) {
        setGrouped({ thisWeek: [], thisMonth: [], nextMonth: [] });
        setTotalExpiringSoon(0);
        return;
      }

      const { expiringCoins } = data;

      const thisWeek = (expiringCoins.this_week?.coins || []).map(mapCoin);
      const thisMonth = (expiringCoins.this_month?.coins || []).map(mapCoin);
      const nextMonth = (expiringCoins.next_month?.coins || []).map(mapCoin);

      if (mountedRef.current) {
        setGrouped({ thisWeek, thisMonth, nextMonth });
        setTotalExpiringSoon(expiringCoins.this_week?.totalAmount || 0);
      }
    } catch (err: any) {
      if (mountedRef.current) setError(err?.message || 'Failed to load expiring coins');
      platformAlertSimple('Error', 'Could not load expiring coins. Pull down to retry.');
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchExpiringCoins().finally(() => setLoading(false));
  }, [fetchExpiringCoins]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExpiringCoins();
    if (mountedRef.current) setRefreshing(false);
  }, [fetchExpiringCoins]);

  const getProgressWidth = (daysLeft: number) => {
    const maxDays = 30;
    const progress = Math.max(0, Math.min(100, ((maxDays - daysLeft) / maxDays) * 100));
    return `${progress}%`;
  };

  const getProgressColor = (daysLeft: number) => {
    if (daysLeft <= 3) return Colors.error;
    if (daysLeft <= 7) return Colors.warning;
    return Colors.primary[600];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getCoinIcon = (type: string) => {
    switch (type) {
      case 'promo': return 'gift';
      case 'store': return 'storefront';
      default: return 'diamond';
    }
  };

  const { thisWeek, thisMonth, nextMonth } = grouped;

  const renderCoinCard = (coin: ExpiringCoin) => (
    <View key={coin.id} style={styles.coinCard}>
      <View style={styles.coinCardHeader}>
        <View style={styles.coinTypeIcon}>
          <Ionicons
            name={getCoinIcon(coin.coinType) as any}
            size={20}
            color={Colors.primary[600]}
          />
        </View>
        <View style={styles.coinInfo}>
          <ThemedText style={styles.coinAmount}>{coin.amount} {BRAND.CURRENCY_CODE}</ThemedText>
          <ThemedText style={styles.coinExpiry}>
            Expires {formatDate(coin.expiryDate)}
          </ThemedText>
        </View>
        <View style={styles.daysLeftBadge}>
          <ThemedText style={[
            styles.daysLeftText,
            coin.daysLeft <= 3 && styles.daysLeftUrgent,
          ]}>
            {coin.daysLeft}d left
          </ThemedText>
        </View>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: getProgressWidth(coin.daysLeft) as any,
              backgroundColor: getProgressColor(coin.daysLeft),
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Coin Expiry</ThemedText>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Loading State */}
        {loading && (
          <TransactionListSkeleton />
        )}

        {/* Error State */}
        {!loading && error && (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <Pressable style={styles.retryButton} onPress={handleRefresh}>
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </Pressable>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && thisWeek.length === 0 && thisMonth.length === 0 && nextMonth.length === 0 && (
          <View style={styles.centerContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.primary[600]} />
            <ThemedText style={styles.emptyTitle}>No Expiring Coins</ThemedText>
            <ThemedText style={styles.emptySubtitle}>All your coins are safe for now</ThemedText>
          </View>
        )}

        {/* Alert Banner */}
        {!loading && !error && totalExpiringSoon > 0 && (
          <View style={styles.alertBanner}>
            <Ionicons name="warning" size={24} color={Colors.warning} />
            <View style={styles.alertContent}>
              <ThemedText style={styles.alertTitle}>
                {totalExpiringSoon} {BRAND.CURRENCY_CODE} expiring soon!
              </ThemedText>
              <ThemedText style={styles.alertSubtitle}>
                Use before they expire
              </ThemedText>
            </View>
            <Pressable
              style={styles.useNowButton}
              onPress={() => router.push('/(tabs)' as any)}
            >
              <ThemedText style={styles.useNowText}>Use Now</ThemedText>
            </Pressable>
          </View>
        )}

        {/* This Week */}
        {thisWeek.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionDot} />
              <ThemedText style={styles.sectionTitle}>This Week</ThemedText>
              <ThemedText style={styles.sectionCount}>
                {thisWeek.reduce((sum, c) => sum + c.amount, 0)} {BRAND.CURRENCY_CODE}
              </ThemedText>
            </View>
            {thisWeek.map(renderCoinCard)}
          </View>
        )}

        {/* This Month */}
        {thisMonth.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: Colors.warning }]} />
              <ThemedText style={styles.sectionTitle}>This Month</ThemedText>
              <ThemedText style={styles.sectionCount}>
                {thisMonth.reduce((sum, c) => sum + c.amount, 0)} {BRAND.CURRENCY_CODE}
              </ThemedText>
            </View>
            {thisMonth.map(renderCoinCard)}
          </View>
        )}

        {/* Next Month */}
        {nextMonth.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: Colors.primary[600] }]} />
              <ThemedText style={styles.sectionTitle}>Next Month</ThemedText>
              <ThemedText style={styles.sectionCount}>
                {nextMonth.reduce((sum, c) => sum + c.amount, 0)} {BRAND.CURRENCY_CODE}
              </ThemedText>
            </View>
            {nextMonth.map(renderCoinCard)}
          </View>
        )}

        {/* Quick Spend Suggestions */}
        <View style={styles.suggestionsSection}>
          <ThemedText style={styles.sectionTitle}>Quick Spend Suggestions</ThemedText>
          <View style={styles.suggestionsGrid}>
            <Pressable
              style={styles.suggestionCard}
              onPress={() => router.push('/search' as any)}
            >
              <Ionicons name="location" size={24} color={Colors.primary[600]} />
              <ThemedText style={styles.suggestionText}>Nearby Stores</ThemedText>
            </Pressable>
            <Pressable
              style={styles.suggestionCard}
              onPress={() => router.push('/bonus-zone' as any)}
            >
              <Ionicons name="pricetag" size={24} color={Colors.gold} />
              <ThemedText style={styles.suggestionText}>Online Deals</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Ionicons name="bulb-outline" size={24} color={Colors.info} />
          <View style={styles.tipsContent}>
            <ThemedText style={styles.tipsTitle}>Tips to Maximize Your Coins</ThemedText>
            <ThemedText style={styles.tipsText}>
              • Enable notifications for expiry reminders{'\n'}
              • Use older coins first{'\n'}
              • Combine with offers for bigger savings
            </ThemedText>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning + '15',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    ...Typography.label,
    color: Colors.warning,
  },
  alertSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  useNowButton: {
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  useNowText: {
    ...Typography.labelSmall,
    color: colors.background.primary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    flex: 1,
  },
  sectionCount: {
    ...Typography.label,
    color: Colors.text.tertiary,
  },
  coinCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  coinCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  coinTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinInfo: {
    flex: 1,
  },
  coinAmount: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  coinExpiry: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  daysLeftBadge: {
    backgroundColor: Colors.gray[100],
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  daysLeftText: {
    ...Typography.labelSmall,
    color: Colors.text.secondary,
  },
  daysLeftUrgent: {
    color: Colors.error,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  suggestionsSection: {
    marginBottom: Spacing.lg,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  suggestionCard: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    ...Shadows.subtle,
  },
  suggestionText: {
    ...Typography.label,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.secondary[50],
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    gap: Spacing.md,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    ...Typography.label,
    color: Colors.secondary[700],
    marginBottom: Spacing.sm,
  },
  tipsText: {
    ...Typography.bodySmall,
    color: Colors.secondary[600],
    lineHeight: 20,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  retryText: {
    ...Typography.label,
    color: colors.background.primary,
  },
  emptyTitle: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
});

export default withErrorBoundary(ExpiryTrackerPage, 'WalletExpiryTracker');
