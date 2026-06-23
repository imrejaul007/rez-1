import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Prive Wallet Page
 * Shows detailed coin balance and transaction history with real data.
 *
 * Improvements:
 * - Shimmer skeleton loading (PriveSkeletonBlock)
 * - Date-grouped transactions (Today / Yesterday / date labels)
 * - Proportional coin bar (Nuqta / Prive / Branded)
 * - Gold-accent quick actions with Vouchers button
 * - Error state with retry
 * - Bottom safe area padding
 * - Redeem CTA shows Prive balance, disabled when 0
 * - Cursor-based pagination with Set dedup
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TransactionListSkeleton } from '@/components/skeletons';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import { Colors } from '@/constants/DesignSystem';
import { PriveSkeletonBlock } from '@/components/prive/PriveSkeletonBlock';
import { useWalletData, useRezBalance, useTotalBalance, useBrandedCoins, useWalletLoading, useRefreshWallet } from '@/stores/selectors';
import priveApi, { TransactionItem } from '@/services/priveApi';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const WALLET_CACHE_KEY = 'prive_wallet_cache';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRANSACTION_ICONS: Record<string, string> = {
  check_in: '✅',
  purchase: '🛍️',
  referral: '👥',
  campaign: '📢',
  content: '✍️',
  review: '⭐',
  redemption: '🎁',
  transfer: '↔️',
  bonus: '💰',
  cashback: '💵',
};

const SOURCE_ICONS: Record<string, string> = {
  bonus_campaign: '🎯',
  spin_wheel: '🎰',
  scratch_card: '🎫',
  quiz_game: '🧠',
  daily_login: '📅',
  social_share_reward: '📱',
  creator_pick_reward: '🎬',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TransactionSection {
  title: string;
  data: TransactionItem[];
}

/**
 * Groups a flat list of transactions into date sections:
 * "Today", "Yesterday", or a formatted date label.
 */
function groupTransactionsByDate(transactions: TransactionItem[]): TransactionSection[] {
  const now = new Date();
  const todayStr = now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const map = new Map<string, TransactionItem[]>();

  for (const txn of transactions) {
    const txnDate = new Date(txn.createdAt);
    const dateString = txnDate.toDateString();

    let label: string;
    if (dateString === todayStr) {
      label = 'Today';
    } else if (dateString === yesterdayStr) {
      label = 'Yesterday';
    } else {
      label = txnDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: now.getFullYear() !== txnDate.getFullYear() ? 'numeric' : undefined,
      });
    }

    if (!map.has(label)) {
      map.set(label, []);
    }
    map.get(label)!.push(txn);
  }

  const sections: TransactionSection[] = [];
  for (const [title, data] of map.entries()) {
    sections.push({ title, data });
  }
  return sections;
}

function getTransactionIcon(type: string, source?: string): string {
  if (source && SOURCE_ICONS[source]) {
    return SOURCE_ICONS[source];
  }
  return TRANSACTION_ICONS[type] || '💎';
}

function formatAmount(amount: number): string {
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}${amount.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Skeleton Loading
// ---------------------------------------------------------------------------

function WalletSkeleton() {
  return (
    <View style={styles.content}>
      {/* Balance card skeleton */}
      <View style={styles.balanceCard}>
        <PriveSkeletonBlock width={100} height={14} style={{ marginBottom: PRIVE_SPACING.sm }} />
        <PriveSkeletonBlock width={160} height={48} style={{ marginBottom: PRIVE_SPACING.sm }} />
        <PriveSkeletonBlock width={40} height={14} />
      </View>

      {/* Breakdown card skeleton */}
      <View style={styles.breakdownCard}>
        <PriveSkeletonBlock width={120} height={14} style={{ marginBottom: PRIVE_SPACING.lg }} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.coinRow, i === 3 && styles.coinRowLast]}>
            <PriveSkeletonBlock width={10} height={10} borderRadius={5} style={{ marginRight: PRIVE_SPACING.md }} />
            <PriveSkeletonBlock width={90} height={14} style={{ flex: 1 }} />
            <PriveSkeletonBlock width={50} height={16} />
          </View>
        ))}
        {/* Proportional bar skeleton */}
        <PriveSkeletonBlock width="100%" height={6} borderRadius={3} style={{ marginTop: PRIVE_SPACING.lg }} />
      </View>

      {/* Quick actions skeleton */}
      <View style={styles.quickActions}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.actionButton, styles.actionButtonGold, { opacity: 0.4 }]}>
            <PriveSkeletonBlock width={44} height={44} borderRadius={22} style={{ marginBottom: PRIVE_SPACING.sm }} />
            <PriveSkeletonBlock width={60} height={13} />
          </View>
        ))}
      </View>

      {/* Transaction rows skeleton */}
      <View style={styles.transactionsCard}>
        <PriveSkeletonBlock width={140} height={14} style={{ marginBottom: PRIVE_SPACING.lg }} />
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[styles.transactionRow, i === 5 && styles.transactionRowLast]}>
            <PriveSkeletonBlock width={36} height={36} borderRadius={18} style={{ marginRight: PRIVE_SPACING.md }} />
            <View style={styles.skeletonFlex1}>
              <PriveSkeletonBlock width={140} height={13} style={{ marginBottom: 4 }} />
              <PriveSkeletonBlock width={70} height={11} />
            </View>
            <PriveSkeletonBlock width={50} height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function PriveWalletScreen() {
  const router = useRouter();
  const walletData = useWalletData();
  const rezBalance = useRezBalance();
  const totalBalance = useTotalBalance();
  const brandedCoins = useBrandedCoins();
  const walletLoading = useWalletLoading();
  const refreshWallet = useRefreshWallet();

  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [cachedCoins, setCachedCoins] = useState<{ total: number; rez: number; prive: number; branded: number } | null>(null);
  const isMounted = useIsMounted();

  // Derive coin balances from WalletContext
  const priveCoin = walletData?.coins?.find((c: any) => c.type === 'prive');
  const liveCoinData = walletData ? {
    total: totalBalance || 0,
    rez: rezBalance || 0,
    prive: priveCoin?.amount || 0,
    branded: brandedCoins?.reduce((sum: number, c: any) => sum + (c.amount || 0), 0) || 0,
  } : null;

  const coins = {
    ...(liveCoinData || cachedCoins || { total: 0, rez: 0, prive: 0, branded: 0 }),
    brandedBreakdown: (brandedCoins || []).map((c: any) => ({
      brandId: c.merchantId,
      brandName: c.merchantName,
      amount: c.amount,
    })),
  };

  // Load cached coin balances on mount
  useEffect(() => {
    AsyncStorage.getItem(WALLET_CACHE_KEY).then(cached => {
      if (cached) {
        try {
          setCachedCoins(JSON.parse(cached));
          if (!walletData) setIsStale(true);
        } catch {}
      }
    }).catch(() => {});
  }, []);

  // Cache coin balances when fresh data arrives; clear stale indicator
  useEffect(() => {
    if (liveCoinData) {
      setIsStale(false);
      AsyncStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(liveCoinData)).catch(() => {});
    }
  }, [liveCoinData?.total, liveCoinData?.rez, liveCoinData?.prive, liveCoinData?.branded]);

  // Grouped transaction sections
  const transactionSections = useMemo(
    () => groupTransactionsByDate(transactions),
    [transactions],
  );

  // -------------------------------------------------------------------
  // Fetch transactions (cursor-based)
  // -------------------------------------------------------------------

  const fetchTransactions = useCallback(
    async (nextCursor?: string, refresh: boolean = false) => {
      try {
        setError(null);
        const isFirstPage = !nextCursor;

        if (isFirstPage) {
          setIsLoadingTransactions(!refresh);
        }

        const response = await priveApi.getTransactions({
          limit: 15,
          cursor: nextCursor,
        });

        if (response.success && response.data) {
          const { transactions: newTransactions, pagination } = response.data;

          if (isFirstPage) {
            const ids = new Set(newTransactions.map((t) => t.id));
            if (!isMounted()) return;
            setTransactions(newTransactions);
            if (!isMounted()) return;
            setSeenIds(ids);
          } else {
            if (!isMounted()) return;
            setTransactions((prev) => {
              const deduped = newTransactions.filter((t) => !seenIds.has(t.id));
              const updatedIds = new Set(seenIds);
              deduped.forEach((t) => updatedIds.add(t.id));
              setSeenIds(updatedIds);
              return [...prev, ...deduped];
            });
          }

          if (!isMounted()) return;
          setCursor(pagination.nextCursor ?? undefined);
          if (!isMounted()) return;
          setHasMore(pagination.hasMore ?? false);
        }
      } catch (err: any) {
        if (!isMounted()) return;
        setError(err?.message || 'Failed to load transactions');
      } finally {
        if (!isMounted()) return;
        setIsLoadingTransactions(false);
        if (!isMounted()) return;
        setIsRefreshing(false);
      }
    },
    [seenIds],
  );

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshWallet(), fetchTransactions(undefined, true)]);
    if (!isMounted()) return;
    setIsRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!isLoadingTransactions && hasMore && cursor) {
      fetchTransactions(cursor);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchTransactions();
  };

  const isLoading = walletLoading && transactions.length === 0;

  // -------------------------------------------------------------------
  // Proportional coin bar flex values (min 0.05 for visibility)
  // -------------------------------------------------------------------

  const coinBarFlex = useMemo(() => {
    const total = coins.total || 1; // avoid div-by-zero
    const rawRez = coins.rez / total;
    const rawPrive = coins.prive / total;
    const rawBranded = coins.branded / total;

    const MIN = 0.05;
    const applyMin = (v: number) => (v > 0 ? Math.max(v, MIN) : 0);
    return {
      rez: applyMin(rawRez),
      prive: applyMin(rawPrive),
      branded: applyMin(rawBranded),
    };
  }, [coins.total, coins.rez, coins.prive, coins.branded]);

  const priveBalance = coins.prive;
  const redeemDisabled = priveBalance === 0;

  // -------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.neutral[800], colors.neutral[900], colors.midGrayAlt]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PRIVE_COLORS.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Prive Wallet</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Error State */}
        {error && !isLoading ? (
          <View style={styles.errorContainer}>
            <Ionicons
              name="cloud-offline-outline"
              size={56}
              color={PRIVE_COLORS.text.tertiary}
            />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : isLoading ? (
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <WalletSkeleton />
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContentPadding}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={PRIVE_COLORS.gold.primary}
              />
            }
            onScroll={({ nativeEvent }) => {
              const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
              const isNearEnd =
                layoutMeasurement.height + contentOffset.y >=
                contentSize.height - 100;
              if (isNearEnd && hasMore && !isLoadingTransactions) {
                handleLoadMore();
              }
            }}
            scrollEventThrottle={400}
          >
            {/* Balance Card */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>
                {coins.total.toLocaleString()}
              </Text>
              <Text style={styles.balanceSubtext}>coins</Text>
              {isStale && (
                <Text style={styles.staleIndicator}>Showing cached data...</Text>
              )}
            </View>

            {/* Coin Breakdown */}
            <View style={styles.breakdownCard}>
              <Text style={styles.sectionTitle}>Coin Breakdown</Text>
              <View style={styles.coinRow}>
                <View
                  style={[
                    styles.coinDot,
                    { backgroundColor: PRIVE_COLORS.gold.primary },
                  ]}
                />
                <Text style={styles.coinLabel}>{BRAND.COIN_NAME}</Text>
                <Text style={styles.coinValue}>
                  {coins.rez.toLocaleString()}
                </Text>
              </View>
              <View style={styles.coinRow}>
                <View
                  style={[styles.coinDot, { backgroundColor: '#B8860B' }]}
                />
                <Text style={styles.coinLabel}>Prive Coins</Text>
                <Text style={styles.coinValue}>
                  {coins.prive.toLocaleString()}
                </Text>
              </View>
              <View style={[styles.coinRow, styles.coinRowLast]}>
                <View
                  style={[styles.coinDot, { backgroundColor: '#64B5F6' }]}
                />
                <Text style={styles.coinLabel}>Branded Coins</Text>
                <Text style={styles.coinValue}>
                  {coins.branded.toLocaleString()}
                </Text>
              </View>

              {/* Proportional coin bar */}
              {coins.total > 0 && (
                <View style={styles.proportionalBar}>
                  {coinBarFlex.rez > 0 && (
                    <View
                      style={[
                        styles.barSegment,
                        {
                          flex: coinBarFlex.rez,
                          backgroundColor: PRIVE_COLORS.gold.primary,
                          borderTopLeftRadius: 3,
                          borderBottomLeftRadius: 3,
                        },
                      ]}
                    />
                  )}
                  {coinBarFlex.prive > 0 && (
                    <View
                      style={[
                        styles.barSegment,
                        {
                          flex: coinBarFlex.prive,
                          backgroundColor: '#B8860B',
                          ...(coinBarFlex.rez === 0
                            ? {
                                borderTopLeftRadius: 3,
                                borderBottomLeftRadius: 3,
                              }
                            : {}),
                        },
                      ]}
                    />
                  )}
                  {coinBarFlex.branded > 0 && (
                    <View
                      style={[
                        styles.barSegment,
                        {
                          flex: coinBarFlex.branded,
                          backgroundColor: '#64B5F6',
                          borderTopRightRadius: 3,
                          borderBottomRightRadius: 3,
                        },
                      ]}
                    />
                  )}
                </View>
              )}

              {/* Branded coins breakdown */}
              {coins.brandedBreakdown && coins.brandedBreakdown.length > 0 && (
                <View style={styles.brandedBreakdown}>
                  {coins.brandedBreakdown.map((brand, index) => (
                    <View key={brand.brandId || index} style={styles.brandedRow}>
                      <Text style={styles.brandedName}>{brand.brandName}</Text>
                      <Text style={styles.brandedAmount}>
                        {brand.amount.toLocaleString()}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Pressable
                style={[
                  styles.actionButton,
                  styles.actionButtonGold,
                  redeemDisabled && styles.actionButtonDisabled,
                ]}
                onPress={() => router.push('/prive/redeem' as any)}
                disabled={redeemDisabled}
              >
                <View style={styles.actionIcon}>
                  <Text style={styles.actionEmoji}>🎁</Text>
                </View>
                <Text style={styles.actionText}>
                  {redeemDisabled
                    ? 'Redeem'
                    : `Redeem (${priveBalance.toLocaleString()} Prive)`}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.actionButtonGold]}
                onPress={() => router.push('/prive/earnings' as any)}
              >
                <View style={styles.actionIcon}>
                  <Text style={styles.actionEmoji}>📈</Text>
                </View>
                <Text style={styles.actionText}>Earnings</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.actionButtonGold]}
                onPress={() => router.push('/prive/vouchers' as any)}
              >
                <View style={styles.actionIcon}>
                  <Text style={styles.actionEmoji}>🎟️</Text>
                </View>
                <Text style={styles.actionText}>Vouchers</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.actionButtonGold]}
                onPress={() => router.push('/prive/smart-spend' as any)}
              >
                <View style={styles.actionIcon}>
                  <Text style={styles.actionEmoji}>💎</Text>
                </View>
                <Text style={styles.actionText}>Smart Spend</Text>
              </Pressable>
            </View>

            {/* Recent Transactions */}
            <View style={styles.transactionsCard}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>

              {isLoadingTransactions && transactions.length === 0 ? (
                <TransactionListSkeleton />
              ) : transactions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>📋</Text>
                  <Text style={styles.emptyText}>No transactions yet</Text>
                  <Text style={styles.emptySubtext}>
                    Your coin transactions will appear here
                  </Text>
                </View>
              ) : (
                <>
                  {transactionSections.map((section) => (
                    <View key={section.title}>
                      {/* Section header */}
                      <Text style={styles.sectionHeader}>{section.title}</Text>
                      {section.data.map((txn, index) => (
                        <View
                          key={txn.id}
                          style={[
                            styles.transactionRow,
                            index === section.data.length - 1 &&
                              styles.transactionRowLast,
                          ]}
                        >
                          <View style={styles.transactionIcon}>
                            <Text style={styles.transactionEmoji}>
                              {getTransactionIcon(txn.type, txn.source)}
                            </Text>
                          </View>
                          <View style={styles.transactionInfo}>
                            <Text style={styles.transactionTitle}>
                              {txn.description}
                            </Text>
                            <Text style={styles.transactionDate}>
                              {txn.time}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.transactionAmount,
                              txn.amount > 0
                                ? styles.amountPositive
                                : styles.amountNegative,
                            ]}
                          >
                            {formatAmount(txn.amount)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}

                  {hasMore && (
                    <Pressable
                      style={styles.loadMoreButton}
                      onPress={handleLoadMore}
                    >
                      {isLoadingTransactions ? (
                        <ActivityIndicator
                          size="small"
                          color={PRIVE_COLORS.gold.primary}
                        />
                      ) : (
                        <Text style={styles.loadMoreText}>Load More</Text>
                      )}
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PRIVE_SPACING.xl,
    paddingVertical: PRIVE_SPACING.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: PRIVE_SPACING.xl,
  },

  // ---- Error state ----
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PRIVE_SPACING.xxl,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginTop: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.sm,
  },
  errorMessage: {
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
    textAlign: 'center',
    marginBottom: PRIVE_SPACING.xl,
  },
  retryButton: {
    paddingHorizontal: PRIVE_SPACING.xxl,
    paddingVertical: PRIVE_SPACING.md,
    borderRadius: PRIVE_RADIUS.md,
    backgroundColor: PRIVE_COLORS.gold.primary,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIVE_COLORS.text.inverse,
  },

  // ---- Balance Card ----
  balanceCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.xl,
    padding: PRIVE_SPACING.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    marginBottom: PRIVE_SPACING.xl,
  },
  balanceLabel: {
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: PRIVE_SPACING.sm,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '200',
    color: PRIVE_COLORS.gold.primary,
  },
  balanceSubtext: {
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
  },
  staleIndicator: {
    fontSize: 11,
    color: PRIVE_COLORS.status.warning,
    fontStyle: 'italic',
    marginTop: PRIVE_SPACING.sm,
  },

  // ---- Breakdown Card ----
  breakdownCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.lg,
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: PRIVE_COLORS.transparent.white08,
  },
  coinRowLast: {
    borderBottomWidth: 0,
  },
  coinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: PRIVE_SPACING.md,
  },
  coinLabel: {
    flex: 1,
    fontSize: 14,
    color: PRIVE_COLORS.text.secondary,
  },
  coinValue: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
  },

  // ---- Proportional coin bar ----
  proportionalBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: PRIVE_SPACING.lg,
  },
  barSegment: {
    height: 6,
  },

  // ---- Branded breakdown ----
  brandedBreakdown: {
    marginTop: PRIVE_SPACING.md,
    paddingTop: PRIVE_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: PRIVE_COLORS.transparent.white08,
  },
  brandedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: PRIVE_SPACING.sm,
    paddingLeft: PRIVE_SPACING.lg,
  },
  brandedName: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
  },
  brandedAmount: {
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
  },

  // ---- Quick Actions ----
  quickActions: {
    flexDirection: 'row',
    gap: PRIVE_SPACING.md,
    marginBottom: PRIVE_SPACING.xl,
  },
  actionButton: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  actionButtonGold: {
    borderColor: PRIVE_COLORS.gold.primary,
    backgroundColor: PRIVE_COLORS.transparent.gold05,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: PRIVE_SPACING.sm,
  },
  actionEmoji: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '500',
    color: PRIVE_COLORS.text.primary,
    textAlign: 'center',
  },

  // ---- Transactions ----
  transactionsCard: {
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.xl,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.xxl,
  },
  transactionsLoading: {
    paddingVertical: PRIVE_SPACING.xxl,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.xxl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: PRIVE_SPACING.md,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.xs,
  },
  emptySubtext: {
    fontSize: 13,
    color: PRIVE_COLORS.text.tertiary,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIVE_COLORS.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.sm,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: PRIVE_COLORS.transparent.white08,
  },
  transactionRowLast: {
    borderBottomWidth: 0,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIVE_COLORS.transparent.white10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: PRIVE_SPACING.md,
  },
  transactionEmoji: {
    fontSize: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 13,
    color: PRIVE_COLORS.text.primary,
  },
  transactionDate: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountPositive: {
    color: PRIVE_COLORS.status.success,
  },
  amountNegative: {
    color: PRIVE_COLORS.status.error,
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: PRIVE_SPACING.lg,
    marginTop: PRIVE_SPACING.sm,
  },
  loadMoreText: {
    fontSize: 14,
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '500',
  },

  // Extracted inline styles
  headerSpacer: { width: 40 },
  scrollContentPadding: { paddingBottom: 120 },
  skeletonFlex1: { flex: 1 },
});

export default withErrorBoundary(PriveWalletScreen, 'PriveWallet');
