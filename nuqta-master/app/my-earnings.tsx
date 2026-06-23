// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// My Earnings Page
// Financial source-of-truth dashboard showing lifetime earnings, breakdown, statistics, and history
// Data sourced from GET /api/earnings/consolidated-summary (CoinTransaction aggregation)

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Share,
} from 'react-native';
import { TransactionListSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { HeaderBackButton } from '@/components/navigation/SafeBackButton';
import { platformAlert } from '@/utils/platformAlert';
import earningsApi, {
  ConsolidatedEarningsSummary,
  EarningsBreakdown,
  EarningsStatistics,
  EarningTransaction,
  EarningsPeriod,
} from '@/services/earningsApi';
import EarningsPieChart from '@/components/earnings/EarningsPieChart';
import EarningsStatsCard from '@/components/earnings/EarningsStatsCard';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import analyticsService from '@/services/analyticsService';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// Period filter options
const PERIOD_OPTIONS: { label: string; value: EarningsPeriod }[] = [
  { label: 'All Time', value: 'all' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
];

// Breakdown category config
const BREAKDOWN_CATEGORIES = [
  { key: 'videos' as const, label: 'Videos', icon: 'videocam', color: colors.brand.pink, bgColor: '#EC489920' },
  { key: 'projects' as const, label: 'Projects', icon: 'briefcase', color: colors.brand.purpleLight, bgColor: '#8B5CF620' },
  { key: 'referrals' as const, label: 'Referrals', icon: 'people', color: Colors.success, bgColor: '#10B98120' },
  { key: 'cashback' as const, label: 'Cashback', icon: 'cash', color: colors.warningScale[400], bgColor: '#F59E0B20' },
  { key: 'socialMedia' as const, label: 'Social Media', icon: 'share-social', color: colors.infoScale[400], bgColor: '#3B82F620' },
  { key: 'games' as const, label: 'Games', icon: 'game-controller', color: Colors.success, bgColor: '#10B98120' },
  { key: 'dailyCheckIn' as const, label: 'Daily Check-in', icon: 'calendar', color: colors.brand.cyan, bgColor: '#06B6D420' },
  { key: 'events' as const, label: 'Events', icon: 'ticket', color: colors.brand.purple, bgColor: '#7C3AED20' },
  { key: 'socialImpact' as const, label: 'Social Impact', icon: 'heart', color: colors.brand.pink, bgColor: '#EC489920' },
  { key: 'bonus' as const, label: 'Bonus', icon: 'gift', color: Colors.error, bgColor: '#EF444420' },
] as const;

// Transaction source → icon/color mapping
const SOURCE_DISPLAY: Record<string, { icon: string; color: string }> = {
  videos: { icon: 'videocam', color: colors.brand.pink },
  projects: { icon: 'briefcase', color: colors.brand.purpleLight },
  referrals: { icon: 'people', color: Colors.success },
  cashback: { icon: 'cash', color: colors.warningScale[400] },
  socialMedia: { icon: 'share-social', color: colors.infoScale[400] },
  games: { icon: 'game-controller', color: Colors.success },
  dailyCheckIn: { icon: 'calendar', color: colors.brand.cyan },
  socialImpact: { icon: 'heart', color: colors.brand.pink },
  bonus: { icon: 'gift', color: Colors.error },
};

const MyEarningsPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const { goBack } = useSafeNavigation();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const [data, setData] = useState<ConsolidatedEarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<EarningsPeriod>('all');

  const handleBackPress = useCallback(() => {
    goBack('/profile' as any);
  }, [goBack]);

  const fetchEarnings = useCallback(async (period?: EarningsPeriod) => {
    try {
      if (!refreshing) setLoading(true);
      setError(null);

      if (authLoading) return;

      if (!isAuthenticated) {
        setData(null);
        setLoading(false);
        return;
      }

      const response = await earningsApi.getConsolidatedSummary({
        period: period || selectedPeriod,
      });

      if (response?.data) {
        if (!isMounted()) return;
        setData(response.data);
        analyticsService.track('my_earnings_viewed', {
          period: period || selectedPeriod,
          total_earned: response.data.totalEarned,
          available_balance: response.data.availableBalance,
          pending_earnings: response.data.pendingEarnings,
          transaction_count: response.data.statistics?.transactionCount,
        });
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load earnings. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [authLoading, isAuthenticated, selectedPeriod, refreshing]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchEarnings();
    }
  }, [authLoading, isAuthenticated]);

  // Refetch when period changes
  const handlePeriodChange = useCallback((period: EarningsPeriod) => {
    analyticsService.track('period_filter_changed', {
      previous_period: selectedPeriod,
      new_period: period,
    });
    setSelectedPeriod(period);
    fetchEarnings(period);
  }, [fetchEarnings, selectedPeriod]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEarnings();
  }, [fetchEarnings]);

  const handleGoToWallet = () => {
    analyticsService.track('wallet_cta_clicked', {
      source: 'my_earnings',
      available_balance: data?.availableBalance,
    });
    router.push('/wallet-screen' as any);
  };

  const handleExportReport = async () => {
    if (!data) return;

    analyticsService.track('earnings_export_clicked', {
      period: selectedPeriod,
      total_earned: data.totalEarned,
      transaction_count: data.statistics?.transactionCount,
    });

    try {
      // Fetch more transactions for a comprehensive export
      let allTransactions = data.recentTransactions;
      try {
        const historyResponse = await earningsApi.getHistory({ limit: 500 });
        if (historyResponse?.data?.transactions) {
          allTransactions = historyResponse.data.transactions;
        }
      } catch {
        // Fall back to recent transactions
      }

      // Generate CSV
      const csvHeader = 'Date,Category,Source,Description,Amount,Status\n';
      const csvRows = allTransactions
        .map((t) =>
          `${new Date(t.createdAt).toLocaleDateString()},${t.category || t.source},"${t.description}",${t.amount},completed`
        )
        .join('\n');
      const csvContent = csvHeader + csvRows;

      // Generate text report
      const reportText = `
EARNINGS REPORT
Generated: ${new Date().toLocaleString()}

SUMMARY
Total Lifetime Earnings: ${currencySymbol}${data.totalEarned.toFixed(2)}
Available Balance: ${currencySymbol}${data.availableBalance.toFixed(2)}
Pending Earnings: ${currencySymbol}${data.pendingEarnings.toFixed(2)}

BREAKDOWN
Videos: ${currencySymbol}${data.breakdown.videos.amount.toFixed(2)}
Projects: ${currencySymbol}${data.breakdown.projects.amount.toFixed(2)}
Referrals: ${currencySymbol}${data.breakdown.referrals.amount.toFixed(2)}
Cashback: ${currencySymbol}${data.breakdown.cashback.amount.toFixed(2)}
Social Media: ${currencySymbol}${data.breakdown.socialMedia.amount.toFixed(2)}
Games: ${currencySymbol}${data.breakdown.games.amount.toFixed(2)}
Daily Check-in: ${currencySymbol}${data.breakdown.dailyCheckIn.amount.toFixed(2)}
Social Impact: ${currencySymbol}${data.breakdown.socialImpact?.amount.toFixed(2) || '0.00'}
Bonus: ${currencySymbol}${data.breakdown.bonus.amount.toFixed(2)}

STATISTICS
Daily Average: ${currencySymbol}${data.statistics.dailyAverage.toFixed(2)}
Weekly Average: ${currencySymbol}${data.statistics.weeklyAverage.toFixed(2)}
Monthly Average: ${currencySymbol}${data.statistics.monthlyAverage.toFixed(2)}
Total Transactions: ${data.statistics.transactionCount}

RECENT TRANSACTIONS
${allTransactions.map((t, i) => `${i + 1}. ${new Date(t.createdAt).toLocaleDateString()} - ${t.description} - ${currencySymbol}${t.amount}`).join('\n')}
      `.trim();

      // Try file sharing first
      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        const file = new File(Paths.document, `earnings_report_${Date.now()}.csv`);
        const writer = file.writableStream();
        const encoder = new TextEncoder();
        const writerObj = writer.getWriter();
        await writerObj.write(encoder.encode(csvContent));
        await writerObj.close();

        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Earnings Report',
        });
      } else {
        // Fallback to text sharing
        await Share.share({
          message: reportText,
          title: 'My Earnings Report',
        });
      }
    } catch (err) {
      platformAlert('Export Error', 'Failed to export earnings report. Please try again.');
    }
  };

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getPercentage = (part: number, total: number): string => {
    if (total === 0) return '0';
    return ((part / total) * 100).toFixed(1);
  };

  // Loading state
  if (loading && !refreshing) {
    return <TransactionListSkeleton />;
  }

  // Error state
  if (error && !data) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.brand.pink} />
        <LinearGradient colors={[colors.brand.pink, colors.deepPink]} style={styles.header}>
          <View style={styles.headerContent}>
            <HeaderBackButton onPress={handleBackPress} iconColor={colors.background.primary} style={styles.backButton} />
            <Text style={styles.headerTitle}>My Earnings</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={56} color={Colors.error} />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchEarnings()}>
            <Ionicons name="refresh" size={18} color={Colors.text.inverse} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!data) return null;

  // Zero/empty state for new users
  const isZeroState = data.totalEarned === 0 && data.statistics.transactionCount === 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.pink} />

      {/* Header */}
      <LinearGradient colors={[colors.brand.pink, colors.deepPink]} style={styles.header}>
        <View style={styles.headerContent}>
          <HeaderBackButton onPress={handleBackPress} iconColor={colors.background.primary} style={styles.backButton} />
          <Text style={styles.headerTitle}>My Earnings</Text>
          <View style={styles.headerActions}>
            <Pressable
              style={styles.headerIconButton}
              onPress={handleExportReport}
              accessibilityLabel="Export earnings report"
              accessibilityRole="button"
            >
              <Ionicons name="download-outline" size={22} color={Colors.text.inverse} />
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => router.push('/earnings-history' as any)}
            >
              <Ionicons name="time-outline" size={22} color={Colors.text.inverse} />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Period Filter Chips */}
        <View style={styles.periodFilters}>
          {PERIOD_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.periodChip,
                selectedPeriod === option.value && styles.periodChipActive,
              ]}
              onPress={() => handlePeriodChange(option.value)}
            >
              <Text
                style={[
                  styles.periodChipText,
                  selectedPeriod === option.value && styles.periodChipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Total Earnings Card */}
        <LinearGradient
          colors={[colors.brand.pink, colors.deepPink]}
          style={styles.totalCard}
          accessibilityLabel={`Total lifetime earnings: ${currencySymbol}${data.totalEarned}. Available: ${currencySymbol}${data.availableBalance}. Pending: ${currencySymbol}${data.pendingEarnings}`}
          accessibilityRole="summary"
        >
          <Text style={styles.totalLabel}>
            {selectedPeriod === 'all' ? 'Total Lifetime Earnings' : `Earnings (${PERIOD_OPTIONS.find(p => p.value === selectedPeriod)?.label})`}
          </Text>
          <Text style={styles.totalAmount}>
            {currencySymbol}{formatAmount(data.totalEarned)}
          </Text>

          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Ionicons name="wallet-outline" size={20} color="rgba(255,255,255,0.8)" />
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Available</Text>
                <Text style={styles.balanceValue}>{currencySymbol}{formatAmount(data.availableBalance)}</Text>
              </View>
            </View>

            <View style={styles.balanceItem}>
              <Ionicons name="time-outline" size={20} color="rgba(255,255,255,0.8)" />
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Pending</Text>
                <Text style={styles.balanceValue}>{currencySymbol}{formatAmount(data.pendingEarnings)}</Text>
              </View>
            </View>
          </View>

          <Pressable
            style={styles.walletButton}
            onPress={handleGoToWallet}
            accessibilityLabel="Go to Wallet"
            accessibilityRole="button"
            accessibilityHint="Navigate to your wallet to manage balance"
          >
            <Ionicons name="wallet-outline" size={20} color={colors.brand.pink} />
            <Text style={styles.walletButtonText}>Go to Wallet</Text>
          </Pressable>
        </LinearGradient>

        {/* Zero state message */}
        {isZeroState && (
          <View style={styles.zeroStateCard}>
            <Ionicons name="rocket-outline" size={48} color={colors.brand.pink} />
            <Text style={styles.zeroStateTitle}>Start Earning!</Text>
            <Text style={styles.zeroStateDescription}>
              Complete projects, refer friends, share on social media, play games, and shop to earn coins.
            </Text>
            <Pressable
              style={styles.zeroStateCta}
              onPress={() => router.push('/playandearn' as any)}
            >
              <Text style={styles.zeroStateCtaText}>Explore Earning Opportunities</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.brand.pink} />
            </Pressable>
          </View>
        )}

        {/* Earnings Breakdown */}
        {!isZeroState && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
                <Text style={styles.breakdownTotal}>
                  Total: {currencySymbol}{formatAmount(data.breakdown.total)}
                </Text>
              </View>

              <View style={styles.breakdownGrid}>
                {BREAKDOWN_CATEGORIES.map((cat) => {
                  const item = data.breakdown[cat.key];
                  return (
                    <View key={cat.key} style={styles.breakdownCard}>
                      <View style={[styles.breakdownIcon, { backgroundColor: cat.bgColor }]}>
                        <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                      </View>
                      <Text style={styles.breakdownLabel}>{cat.label}</Text>
                      <Text style={styles.breakdownValue}>
                        {currencySymbol}{formatAmount(item.amount)}
                      </Text>
                      <Text style={styles.breakdownPercentage}>
                        {getPercentage(item.amount, data.breakdown.total)}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Statistics Card */}
            <View style={styles.section}>
              <EarningsStatsCard stats={data.statistics} />
            </View>

            {/* Pie Chart Visualization */}
            <View style={styles.section}>
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Earnings Distribution</Text>
                <EarningsPieChart breakdown={data.breakdown} size={220} />
              </View>
            </View>

            {/* Recent Earnings Timeline */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Earnings</Text>
                <Pressable onPress={() => router.push('/earnings-history' as any)}>
                  <Text style={styles.viewAllText}>View All</Text>
                </Pressable>
              </View>

              {data.recentTransactions.length === 0 ? (
                <View style={styles.emptyTransactions}>
                  <Ionicons name="receipt-outline" size={32} color={Colors.border.default} />
                  <Text style={styles.emptyTransactionsText}>
                    {selectedPeriod === 'all' ? 'No earnings yet' : 'No earnings in this period'}
                  </Text>
                </View>
              ) : (
                data.recentTransactions.map((transaction) => {
                  const display = SOURCE_DISPLAY[transaction.category] || SOURCE_DISPLAY.bonus;
                  return (
                    <View
                      key={transaction._id}
                      style={styles.transactionCard}
                      accessibilityLabel={`${transaction.description}. Amount: ${currencySymbol}${transaction.amount}. Date: ${new Date(transaction.createdAt).toLocaleDateString()}`}
                      accessibilityRole="text"
                    >
                      <View style={[styles.transactionIcon, { backgroundColor: `${display.color}20` }]}>
                        <Ionicons name={display.icon as any} size={20} color={display.color} />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionDescription} numberOfLines={1}>
                          {transaction.description}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.transactionRight}>
                        <Text style={styles.transactionAmount}>
                          +{currencySymbol}{formatAmount(transaction.amount)}
                        </Text>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>Completed</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerRight: {
    width: 40,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  // Period filter chips
  periodFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.base,
  },
  periodChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  periodChipActive: {
    backgroundColor: colors.brand.pink,
    borderColor: colors.brand.pink,
  },
  periodChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  periodChipTextActive: {
    color: Colors.text.inverse,
  },
  // Total earnings card
  totalCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: Spacing.sm,
  },
  totalAmount: {
    fontSize: 42,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: Spacing.lg,
  },
  balanceRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: Spacing.lg,
  },
  balanceItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  balanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.background.primary,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  walletButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.pink,
  },
  // Sections
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.pink,
  },
  breakdownTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand.pink,
  },
  // Breakdown grid
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  breakdownCard: {
    width: (width - 48) / 2,
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  breakdownLabel: {
    fontSize: 12,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  breakdownPercentage: {
    fontSize: 11,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  // Chart
  chartCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  // Transactions
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.text.tertiary,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.success + '20',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.success,
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 16,
    color: Colors.text.tertiary,
  },
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['2xl'],
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.brand.pink,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  // Zero state
  zeroStateCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  zeroStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  zeroStateDescription: {
    fontSize: 14,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  zeroStateCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zeroStateCtaText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.brand.pink,
  },
  // Empty transactions
  emptyTransactions: {
    alignItems: 'center',
    padding: Spacing['2xl'],
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
  },
  emptyTransactionsText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
});

export default withErrorBoundary(MyEarningsPage, 'MyEarnings');
