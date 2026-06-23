// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
  Share
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useNavigation, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { useAuthUser, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import { EARN_COLORS } from '@/constants/EarnPageColors';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { showAlert, alertOk } from '@/utils/alert';
import { TransactionListSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface EarningsTransaction {
  _id: string;
  type: 'project' | 'referral' | 'social_media' | 'spin' | 'withdrawal';
  source: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  metadata?: {
    projectId?: string;
    projectTitle?: string;
    referralId?: string;
    postId?: string;
    spinId?: string;
  };
  createdAt: string;
  completedAt?: string;
}

interface EarningsHistoryResponse {
  transactions: EarningsTransaction[];
  summary: {
    totalEarned: number;
    totalWithdrawn: number;
    pendingAmount: number;
    breakdown: {
      projects: number;
      referrals: number;
      socialMedia: number;
      spin: number;
    };
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function EarningsHistoryPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const navigation = useNavigation();
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [transactions, setTransactions] = useState<EarningsTransaction[]>([]);
  const [summary, setSummary] = useState<EarningsHistoryResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'project' | 'referral' | 'social_media' | 'spin' | 'withdrawal'>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(30);

  const filters = [
    { label: 'All', value: 'all', icon: 'list', gradient: [Colors.brand.purpleLight, Colors.brand.purple] },
    { label: 'Projects', value: 'project', icon: 'briefcase', gradient: [Colors.brand.purpleLight, Colors.brand.purple] },
    { label: 'Referrals', value: 'referral', icon: 'people', gradient: [Colors.gold, Colors.nileBlue] },
    { label: 'Social', value: 'social_media', icon: 'share-social', gradient: [colors.warningScale[400], colors.warningScale[700]] },
    { label: 'Spin', value: 'spin', icon: 'trophy', gradient: [colors.brand.pink, colors.deepPink] },
    { label: 'Events', value: 'events', icon: 'ticket', gradient: [Colors.brand.purple, colors.brand.purpleDeep] },
    { label: 'Withdrawals', value: 'withdrawal', icon: 'cash', gradient: [colors.error, colors.error] },
  ];

  const loadEarningsHistory = useCallback(async (pageNum = 1, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      }

      const params: any = {
        page: pageNum,
        limit: 20,
      };

      if (selectedFilter !== 'all') {
        params.type = selectedFilter;
      }

      if (startDate) {
        params.startDate = startDate.toISOString();
      }

      if (endDate) {
        params.endDate = endDate.toISOString();
      }

      // For now, we'll use a mock endpoint structure
      // In the future, this should be /api/earnings/history
      const response = await apiClient.get<EarningsHistoryResponse>('/earnings/history', params);

      if (response.success && response.data) {
        const newTransactions = response.data.transactions || [];
        
        if (reset) {
          if (!isMounted()) return;
          setTransactions(newTransactions);
        } else {
          if (!isMounted()) return;
          setTransactions(prev => [...prev, ...newTransactions]);
        }

        if (response.data.summary) {
          if (!isMounted()) return;
          setSummary(response.data.summary);
        }

        if (!isMounted()) return;
        setHasMore(response.data.pagination?.hasNext || false);
        if (!isMounted()) return;
        setPage(pageNum);

        // Animate in
        if (reset) {
          fadeAnim.value = withTiming(1, { duration: 500 });
          slideAnim.value = withTiming(0, { duration: 500 });
        }
      } else {
        throw new Error('Failed to load earnings history');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError(err instanceof Error ? err.message : 'Failed to load earnings history');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [selectedFilter, startDate, endDate]);

  useEffect(() => {
    loadEarningsHistory(1, true);
  }, [selectedFilter, startDate, endDate]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadEarningsHistory(1, true);
  }, [loadEarningsHistory]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadEarningsHistory(page + 1, false);
    }
  }, [loading, hasMore, page, loadEarningsHistory]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return 'briefcase';
      case 'referral':
        return 'people';
      case 'social_media':
        return 'share-social';
      case 'spin':
        return 'trophy';
      case 'withdrawal':
        return 'cash';
      default:
        return 'wallet';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'project':
        return [Colors.brand.purpleLight, Colors.brand.purple];
      case 'referral':
        return [Colors.gold, Colors.nileBlue];
      case 'social_media':
        return [colors.warningScale[400], colors.warningScale[700]];
      case 'spin':
        return [colors.brand.pink, colors.deepPink];
      case 'withdrawal':
        return [Colors.error, colors.error];
      default:
        return [Colors.text.tertiary, Colors.text.secondary];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Colors.gold;
      case 'pending':
        return Colors.warning;
      case 'failed':
        return Colors.error;
      default:
        return Colors.text.tertiary;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    }
  };

  const formatDateForDisplay = (date: Date | null) => {
    if (!date) return 'Select date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      
      // Create CSV content
      let csvContent = 'Date,Type,Source,Amount,Status,Description\n';
      
      transactions.forEach((transaction) => {
        const date = new Date(transaction.createdAt).toLocaleDateString('en-US');
        const type = transaction.type;
        const source = transaction.source;
        const amount = transaction.amount;
        const status = transaction.status;
        const description = transaction.description.replace(/,/g, ';'); // Replace commas in description
        
        csvContent += `${date},${type},${source},${amount},${status},${description}\n`;
      });

      // Add summary
      if (summary) {
        csvContent += '\n';
        csvContent += 'Summary\n';
        csvContent += `Total Earned,${summary.totalEarned}\n`;
        csvContent += `Total Withdrawn,${summary.totalWithdrawn}\n`;
        csvContent += `Pending Amount,${summary.pendingAmount}\n`;
        csvContent += '\n';
        csvContent += 'Breakdown\n';
        csvContent += `Projects,${summary.breakdown.projects}\n`;
        csvContent += `Referrals,${summary.breakdown.referrals}\n`;
        csvContent += `Social Media,${summary.breakdown.socialMedia}\n`;
        csvContent += `Spin,${summary.breakdown.spin}\n`;
      }

      // Share the CSV content
      if (Platform.OS === 'web') {
        // For web, create a download link
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `earnings-history-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        alertOk('Success', 'Earnings history exported successfully');
      } else {
        // For native, use Share API
        await Share.share({
          message: csvContent,
          title: 'Earnings History',
        });
      }
    } catch (error) {
      showAlert('Error', 'Failed to export earnings history');
    } finally {
      if (!isMounted()) return;
      setExporting(false);
    }
  };

  const handleClearDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    loadEarningsHistory(1, true);
  };

  const renderTransactionItem = useCallback(({ item: transaction }: { item: EarningsTransaction }) => {
    return (
      <Pressable
        onPress={() => router.push(`/wallet/transaction/${transaction._id}`)}
        accessibilityLabel={`${transaction.type}. ${transaction.description}. Amount: ${transaction.type === 'withdrawal' ? '-' : '+'}${currencySymbol}${transaction.amount}. Date: ${formatDate(transaction.createdAt)}. Status: ${transaction.status}`}
        accessibilityRole="button"
      >
      <Animated.View
        style={[
          styles.transactionCard,
        ]}
      >
        <LinearGradient
          colors={[Colors.background.primary, Colors.background.secondary]}
          style={styles.transactionGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.transactionHeader}>
            <View style={styles.transactionLeft}>
              <LinearGradient
                colors={getTypeColor(transaction.type)}
                style={styles.typeIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={getTypeIcon(transaction.type) as any}
                  size={20}
                  color={Colors.text.inverse}
                />
              </LinearGradient>
              <View style={styles.transactionInfo}>
                <ThemedText style={styles.transactionSource}>
                  {transaction.source}
                </ThemedText>
                <ThemedText style={styles.transactionDescription} numberOfLines={1}>
                  {transaction.description}
                </ThemedText>
              </View>
            </View>
            <View style={styles.transactionRight}>
              <ThemedText
                style={[
                  styles.transactionAmount,
                  transaction.type === 'withdrawal' && styles.transactionAmountNegative,
                ]}
              >
                {transaction.type === 'withdrawal' ? '-' : '+'}{currencySymbol}{transaction.amount}
              </ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(transaction.status) + '20' },
                ]}
              >
                <ThemedText
                  style={[
                    styles.statusText,
                    { color: getStatusColor(transaction.status) },
                  ]}
                >
                  {transaction.status}
                </ThemedText>
              </View>
            </View>
          </View>
          <View style={styles.transactionFooter}>
            <ThemedText style={styles.transactionDate}>
              {formatDate(transaction.createdAt)}
            </ThemedText>
            {transaction.metadata?.projectTitle && (
              <ThemedText style={styles.transactionMeta} numberOfLines={1}>
                {transaction.metadata.projectTitle}
              </ThemedText>
            )}
          </View>
        </LinearGradient>
      </Animated.View>
      </Pressable>
    );
  }, [currencySymbol, router]);

  const fadeSlideStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: slideAnim.value }],
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.brand.purpleLight, Colors.brand.purple, colors.brand.purpleDeep]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
           
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to previous screen"
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.backButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.text.inverse} />
            </LinearGradient>
          </Pressable>

          <View style={styles.headerCenter}>
            <ThemedText style={styles.headerTitle}>Earnings History</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {summary ? `Total: ${currencySymbol}${summary.totalEarned}` : 'Your earning transactions'}
            </ThemedText>
          </View>

          {/* Export Button */}
          <Pressable
            style={styles.exportButton}
            onPress={handleExport}
           
            disabled={exporting || transactions.length === 0}
            accessibilityLabel={exporting ? "Exporting earnings report" : "Export earnings report"}
            accessibilityRole="button"
            accessibilityState={{ disabled: exporting || transactions.length === 0, busy: exporting }}
            accessibilityHint="Double tap to download earnings history as CSV"
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)']}
              style={styles.exportButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {exporting ? (
                <ActivityIndicator size="small" color={Colors.text.inverse} />
              ) : (
                <Ionicons name="download-outline" size={20} color={Colors.text.inverse} />
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>

      {/* Summary Card */}
      {summary && (
        <Animated.View
          style={[
            styles.summaryCard,
            fadeSlideStyle,
          ]}
          accessibilityLabel={`Earnings summary. Total earned: ${currencySymbol}${summary.totalEarned}. Withdrawn: ${currencySymbol}${summary.totalWithdrawn}. Pending: ${currencySymbol}${summary.pendingAmount}`}
          accessibilityRole="summary"
        >
          <LinearGradient
            colors={[Colors.background.primary, Colors.background.secondary]}
            style={styles.summaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <ThemedText style={styles.summaryLabel}>Total Earned</ThemedText>
                <ThemedText style={styles.summaryValue}>{currencySymbol}{summary.totalEarned}</ThemedText>
              </View>
              <View style={styles.summaryItem}>
                <ThemedText style={styles.summaryLabel}>Withdrawn</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: Colors.error }]}>
                  {currencySymbol}{summary.totalWithdrawn}
                </ThemedText>
              </View>
              <View style={styles.summaryItem}>
                <ThemedText style={styles.summaryLabel}>Pending</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: Colors.warning }]}>
                  {currencySymbol}{summary.pendingAmount}
                </ThemedText>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Date Range Filter */}
      <Animated.View
        style={[
          styles.dateFilterContainer,
          fadeSlideStyle,
        ]}
      >
        <View style={styles.dateFilterRow}>
          <Pressable
            style={styles.dateFilterButton}
            onPress={() => {
              const today = new Date();
              const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
              setStartDate(lastWeek);
              setEndDate(today);
              loadEarningsHistory(1, true);
            }}
           
          >
            <Ionicons name="calendar-outline" size={16} color={Colors.text.tertiary} />
            <ThemedText style={styles.dateFilterText}>Last 7 days</ThemedText>
          </Pressable>

          <Pressable
            style={styles.dateFilterButton}
            onPress={() => {
              const today = new Date();
              const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
              setStartDate(lastMonth);
              setEndDate(today);
              loadEarningsHistory(1, true);
            }}
           
          >
            <Ionicons name="calendar-outline" size={16} color={Colors.text.tertiary} />
            <ThemedText style={styles.dateFilterText}>Last 30 days</ThemedText>
          </Pressable>

          {(startDate || endDate) && (
            <Pressable
              style={styles.dateFilterButton}
              onPress={handleClearDateFilter}
             
            >
              <Ionicons name="close-circle" size={16} color={Colors.error} />
              <ThemedText style={[styles.dateFilterText, { color: Colors.error }]}>
                Clear
              </ThemedText>
            </Pressable>
          )}
        </View>

        {(startDate || endDate) && (
          <View style={styles.dateRangeDisplay}>
            <ThemedText style={styles.dateRangeText}>
              {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
            </ThemedText>
          </View>
        )}
      </Animated.View>

      {/* Filters */}
      <Animated.View
        style={[
          styles.filtersContainer,
          fadeSlideStyle,
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {filters.map((filter) => (
            <Pressable
              key={filter.value}
              style={[
                styles.filterChip,
                selectedFilter === filter.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(filter.value as any)}
             
              accessibilityLabel={`Filter by ${filter.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedFilter === filter.value }}
              accessibilityHint={`Double tap to show ${filter.label.toLowerCase()} transactions`}
            >
              {selectedFilter === filter.value ? (
                <LinearGradient
                  colors={filter.gradient}
                  style={styles.filterGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={filter.icon as any} size={16} color={Colors.text.inverse} />
                  <ThemedText style={styles.filterTextActive}>{filter.label}</ThemedText>
                </LinearGradient>
              ) : (
                <>
                  <Ionicons name={filter.icon as any} size={16} color={Colors.text.tertiary} />
                  <ThemedText style={styles.filterText}>{filter.label}</ThemedText>
                </>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Transactions List */}
      {loading && transactions.length === 0 ? (
        <TransactionListSkeleton />
      ) : error ? (
        <View style={[styles.content, styles.errorContainer]}>
          <Ionicons name="alert-circle" size={48} color={Colors.error} />
          <ThemedText style={styles.errorTitle}>Error</ThemedText>
          <ThemedText style={styles.errorMessage}>{error}</ThemedText>
          <Pressable
            style={styles.retryButton}
            onPress={() => loadEarningsHistory(1, true)}
          >
            <LinearGradient
              colors={[Colors.brand.purpleLight, Colors.brand.purple]}
              style={styles.retryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <ThemedText style={styles.retryText}>Retry</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={transactions}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: 120 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={() => { if (hasMore && !loading) handleLoadMore(); }}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient
                colors={[Colors.brand.purpleLight, Colors.brand.purple]}
                style={styles.emptyIconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="wallet-outline" size={48} color={Colors.text.inverse} />
              </LinearGradient>
              <ThemedText style={styles.emptyTitle}>No transactions yet</ThemedText>
              <ThemedText style={styles.emptyDescription}>
                Start earning to see your transaction history here
              </ThemedText>
            </View>
          }
          renderItem={renderTransactionItem}
          estimatedItemSize={80}
          ListFooterComponent={
            loading && transactions.length > 0 ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={EARN_COLORS.primary} />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 10 : Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius['2xl'],
    borderBottomRightRadius: BorderRadius['2xl'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  backButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h1,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  exportButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exportButtonGradient: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateFilterContainer: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.base,
    marginBottom: Spacing.md,
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dateFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateFilterText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  dateRangeDisplay: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  dateRangeText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  summaryCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.base,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  summaryGradient: {
    padding: Spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.brand.purpleLight,
    letterSpacing: -0.3,
  },
  filtersContainer: {
    marginBottom: Spacing.base,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterChipActive: {
    borderWidth: 0,
  },
  filterGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.xl,
  },
  filterText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  filterTextActive: {
    ...Typography.body,
    color: Colors.text.inverse,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: 40,
  },
  retryButton: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: Colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  retryGradient: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  retryText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.brand.purpleLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyTitle: {
    ...Typography.h3,
    fontWeight: '800',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  transactionCard: {
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  transactionGradient: {
    padding: Spacing.base,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionSource: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  transactionDescription: {
    fontSize: 13,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  transactionAmount: {
    ...Typography.h4,
    fontWeight: '800',
    color: Colors.gold,
    letterSpacing: -0.3,
  },
  transactionAmountNegative: {
    color: Colors.error,
  },
  statusBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  transactionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  transactionDate: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  transactionMeta: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
  loadMoreContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});


export default withErrorBoundary(EarningsHistoryPage, 'EarningsHistory');
