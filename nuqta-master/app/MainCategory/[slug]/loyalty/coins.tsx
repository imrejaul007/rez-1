// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shared Coins Balance & History Page
 * /MainCategory/[slug]/loyalty/coins
 * Shows coin balance, earned vs spent, and transaction history
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { TransactionListSkeleton } from '@/components/skeletons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCategoryTheme, SHARED_COLORS } from '@/config/categoryThemeConfig';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import userLoyaltyApi from '@/services/userLoyaltyApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

interface CoinTransaction {
  amount: number;
  type: 'earned' | 'spent' | 'expired';
  description: string;
  date: string;
}

interface CoinsData {
  available: number;
  expiring: number;
  expiryDate: string | null;
  history: CoinTransaction[];
}

type FilterKey = 'all' | 'earned' | 'spent' | 'expired';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'earned', label: 'Earned' },
  { key: 'spent', label: 'Spent' },
  { key: 'expired', label: 'Expired' },
];

const TYPE_CONFIG: Record<string, { icon: string; color: string; prefix: string }> = {
  earned: { icon: 'arrow-down-circle', color: SHARED_COLORS.green, prefix: '+' },
  spent: { icon: 'arrow-up-circle', color: SHARED_COLORS.red, prefix: '-' },
  expired: { icon: 'time-outline', color: SHARED_COLORS.textSecondary, prefix: '-' },
};

function ElectronicsCoinsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = getCategoryTheme(slug || 'electronics');
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [coins, setCoins] = useState<CoinsData | null>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');

  const fetchCoins = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await userLoyaltyApi.getCoinBalance(slug);
      if (res.success && res.data?.coins) {
        const catBal = res.data.categoryBalance;
        setCoins({
          available: res.data.coins.available || 0,
          expiring: res.data.coins.expiring || 0,
          expiryDate: res.data.coins.expiryDate || null,
          history: res.data.coins.history || [],
        });
        setTotalBalance(catBal?.available ?? res.data.totalCoins ?? res.data.coins.available ?? 0);
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoins(); }, [fetchCoins]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCoins();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const history = coins?.history || [];

  const filteredHistory = history.filter(h =>
    filter === 'all' ? true : h.type === filter
  );

  const totalEarned = history
    .filter(h => h.type === 'earned')
    .reduce((sum, h) => sum + h.amount, 0);

  const totalSpent = Math.abs(
    history
      .filter(h => h.type === 'spent')
      .reduce((sum, h) => sum + h.amount, 0)
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderTransaction = useCallback(({ item }: { item: CoinTransaction }) => {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.earned;
    return (
      <View style={styles.txCard}>
        <Ionicons name={config.icon as any} size={28} color={config.color} />
        <View style={styles.txInfo}>
          <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
          <Text style={styles.txDate}>{formatDate(item.date)}</Text>
        </View>
        <Text style={[styles.txAmount, { color: config.color }]}>
          {config.prefix}{currencySymbol}{Math.abs(item.amount)}
        </Text>
      </View>
    );
  }, [currencySymbol]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TransactionListSkeleton />
      </SafeAreaView>
    );
  }

  const available = coins?.available || 0;
  const expiring = coins?.expiring || 0;
  const expiryDate = coins?.expiryDate;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={SHARED_COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Your Coins</Text>
          <Text style={styles.headerSubtitle}>Balance and transaction history</Text>
        </View>
      </View>

      <FlashList
        data={filteredHistory}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primaryColor]} />}
        estimatedItemSize={80}
        ListHeaderComponent={
          <>
            {/* Balance card */}
            <LinearGradient
              colors={[Colors.info, Colors.info]}
              style={styles.balanceCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceValue}>{currencySymbol}{totalBalance}</Text>
              <Text style={styles.balanceSubtext}>coins</Text>
            </LinearGradient>

            {/* Expiring warning */}
            {expiring > 0 && (
              <View style={styles.expiringCard}>
                <Ionicons name="warning-outline" size={20} color={SHARED_COLORS.red} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.expiringTitle}>
                    {currencySymbol}{expiring} coins expiring soon
                  </Text>
                  {expiryDate && (
                    <Text style={styles.expiringDate}>
                      Expires on {new Date(expiryDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>
                <Pressable
                  style={styles.useNowBtn}
                  onPress={() => router.push(('/MainCategory/' + slug + '/offers') as any)}
                >
                  <Text style={styles.useNowText}>Use Now</Text>
                </Pressable>
              </View>
            )}

            {/* Quick stats */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: SHARED_COLORS.green }]}>
                  {currencySymbol}{totalEarned}
                </Text>
                <Text style={styles.statLabel}>Total Earned</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: SHARED_COLORS.red }]}>
                  {currencySymbol}{totalSpent}
                </Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
            </View>

            {/* Filter tabs */}
            <View style={styles.filterRow}>
              <Text style={styles.historyTitle}>Transaction History</Text>
              <View style={styles.filters}>
                {FILTERS.map(f => (
                  <Pressable
                    key={f.key}
                    style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                    onPress={() => setFilter(f.key)}
                  >
                    <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                      {f.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color={SHARED_COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No transactions</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all' ? 'Your coin history will appear here'
                : `No ${filter} transactions found`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default, gap: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { ...Typography.h4, fontWeight: '700', color: Colors.text.primary },
  headerSubtitle: { ...Typography.bodySmall, color: Colors.text.tertiary },
  listContent: { paddingHorizontal: Spacing.base, paddingTop: Spacing.base, paddingBottom: 120 },
  // Balance
  balanceCard: { borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.base },
  balanceLabel: { ...Typography.body, color: 'rgba(255,255,255,0.8)', marginBottom: Spacing.xs },
  balanceValue: { fontSize: 42, fontWeight: '800', color: Colors.text.inverse },
  balanceSubtext: { ...Typography.body, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  // Expiring
  expiringCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: 14, borderRadius: BorderRadius.md, backgroundColor: Colors.errorScale[100], marginBottom: Spacing.base,
  },
  expiringTitle: { ...Typography.body, fontWeight: '600', color: Colors.error },
  expiringDate: { ...Typography.caption, color: '#991B1B', marginTop: 2 },
  useNowBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: BorderRadius.sm, backgroundColor: Colors.error },
  useNowText: { ...Typography.bodySmall, fontWeight: '600', color: Colors.text.inverse },
  // Stats
  statsRow: {
    flexDirection: 'row', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.base,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { ...Typography.h3, fontWeight: '700' },
  statLabel: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: Spacing.xs },
  statDivider: { width: 1, backgroundColor: Colors.border.default, marginHorizontal: Spacing.base },
  // Filters
  filterRow: { marginBottom: Spacing.md },
  historyTitle: { ...Typography.h4, fontWeight: '600', color: Colors.text.primary, marginBottom: Spacing.md },
  filters: { flexDirection: 'row', gap: Spacing.sm },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: BorderRadius.lg,
    backgroundColor: Colors.background.primary, borderWidth: 1, borderColor: Colors.border.default,
  },
  filterChipActive: { backgroundColor: Colors.info, borderColor: Colors.info },
  filterText: { ...Typography.bodySmall, fontWeight: '500', color: Colors.text.tertiary },
  filterTextActive: { color: Colors.text.inverse },
  // Transactions
  txCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    padding: 14, backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, marginBottom: Spacing.sm,
  },
  txInfo: { flex: 1 },
  txDesc: { ...Typography.body, fontWeight: '500', color: Colors.text.primary },
  txDate: { ...Typography.caption, color: Colors.text.tertiary, marginTop: 2 },
  txAmount: { ...Typography.bodyLarge, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', padding: 40, marginTop: Spacing.lg },
  emptyTitle: { ...Typography.bodyLarge, fontWeight: '600', color: Colors.text.primary, marginTop: Spacing.base },
  emptySubtitle: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: Spacing.xs, textAlign: 'center' },
});

export default withErrorBoundary(ElectronicsCoinsPage, 'MainCategorySlugLoyaltyCoins');
