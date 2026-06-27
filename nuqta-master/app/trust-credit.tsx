import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Trust Credit / Pay Later Page
// Shows credit limit, active transactions, and how Pay Later works

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { SectionListSkeleton } from '@/components/skeletons';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';
import apiClient from '@/services/apiClient';
import { platformAlertSimple } from '@/utils/platformAlert';
import { BRAND } from '@/constants/brand';

// Credit tier definitions matching trust tiers
const CREDIT_TIERS = [
  { tier: 'Bronze', trustRange: '0 - 200', limit: 5000, color: '#CD7F32' },
  { tier: 'Silver', trustRange: '201 - 400', limit: 15000, color: '#C0C0C0' },
  { tier: 'Gold', trustRange: '401 - 600', limit: 50000, color: '#FFD700' },
  { tier: 'Platinum', trustRange: '601 - 800', limit: 100000, color: '#E5E4E2' },
  { tier: 'Diamond', trustRange: '801 - 1000', limit: -1, color: '#B9F2FF' }, // -1 = Unlimited
] as const;

interface CreditData {
  availableCredit: number;
  usedCredit: number;
  creditLimit: number;
  currentTier: string;
  repaymentDueDate: string | null;
  isUnlimited: boolean;
}

interface CreditTransaction {
  id: string;
  orderId: string;
  storeName: string;
  amount: number;
  date: string;
  dueDate: string;
  status: 'active' | 'overdue' | 'paid';
}

const DEFAULT_CREDIT_DATA: CreditData = {
  availableCredit: 5000,
  usedCredit: 0,
  creditLimit: 5000,
  currentTier: 'Bronze',
  repaymentDueDate: null,
  isUnlimited: false,
};

const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Shop and choose Pay Later',
    description: 'Select "Pay Later" as your payment method at checkout',
    icon: 'cart',
  },
  {
    step: 2,
    title: 'Amount added to credit',
    description: 'The order amount is added to your credit balance',
    icon: 'add-circle',
  },
  {
    step: 3,
    title: 'Repay within 7-30 days',
    description: 'Repayment window depends on your trust tier',
    icon: 'calendar',
  },
  {
    step: 4,
    title: 'No interest if on time',
    description: 'Pay within the due date and enjoy zero interest charges',
    icon: 'checkmark-circle',
  },
];

function getTierForName(tierName: string) {
  return CREDIT_TIERS.find(t => t.tier === tierName) || CREDIT_TIERS[0];
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(amount % 100000 === 0 ? 0 : 2)}L`;
  }
  return amount.toLocaleString();
}

function TrustCreditPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const isMounted = useIsMounted();

  const [creditData, setCreditData] = useState<CreditData>(DEFAULT_CREDIT_DATA);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Auth guard
  if (authLoading || !isAuthenticated) return null;

  const fetchCreditData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{
        credit: CreditData;
        transactions: CreditTransaction[];
        totalPages?: number;
        currentPage?: number;
      }>('/user/credit-limit');

      if (!isMounted()) return;

      if (res.success && res.data) {
        setCreditData({
          availableCredit: res.data.credit?.availableCredit ?? DEFAULT_CREDIT_DATA.availableCredit,
          usedCredit: res.data.credit?.usedCredit ?? DEFAULT_CREDIT_DATA.usedCredit,
          creditLimit: res.data.credit?.creditLimit ?? DEFAULT_CREDIT_DATA.creditLimit,
          currentTier: res.data.credit?.currentTier ?? DEFAULT_CREDIT_DATA.currentTier,
          repaymentDueDate: res.data.credit?.repaymentDueDate ?? null,
          isUnlimited: res.data.credit?.isUnlimited ?? false,
        });
        setTransactions(res.data.transactions ?? []);
        setHasMore((res.data.currentPage ?? 1) < (res.data.totalPages ?? 1));
      }
    } catch {
      if (isMounted()) {
        // Fallback: try to compute from trust score
        try {
          const trustRes = await apiClient.get<{ trustScore?: number; score?: number }>('/prive/eligibility');
          if (isMounted() && trustRes.success && trustRes.data) {
            const rawScore = trustRes.data.trustScore ?? 0;
            const scaledScore = Math.round(rawScore * 10);
            const tierMatch = CREDIT_TIERS.find(t => {
              const [minStr] = t.trustRange.split(' - ');
              const min = parseInt(minStr, 10);
              const max = t.tier === 'Diamond' ? 1000 :
                          parseInt(t.trustRange.split(' - ')[1], 10);
              return scaledScore >= min && scaledScore <= max;
            }) || CREDIT_TIERS[0];

            const limit = tierMatch.limit === -1 ? 999999 : tierMatch.limit;
            setCreditData({
              availableCredit: limit,
              usedCredit: 0,
              creditLimit: limit,
              currentTier: tierMatch.tier,
              repaymentDueDate: null,
              isUnlimited: tierMatch.limit === -1,
            });
          }
        } catch {
          // Use defaults
        }
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  const fetchMoreTransactions = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await apiClient.get<{
        transactions: CreditTransaction[];
        totalPages?: number;
        currentPage?: number;
      }>(`/user/credit-limit?page=${nextPage}&limit=10`);

      if (!isMounted()) return;

      if (res.success && res.data?.transactions) {
        setTransactions(prev => [...prev, ...res.data!.transactions]);
        setPage(nextPage);
        setHasMore((res.data.currentPage ?? nextPage) < (res.data.totalPages ?? 1));
      }
    } catch {
      // Silently fail pagination
    } finally {
      if (isMounted()) setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, isMounted]);

  useEffect(() => {
    fetchCreditData();
  }, [fetchCreditData]);

  const handleBack = () => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  };

  const handleRepay = () => {
    platformAlertSimple('Coming Soon', 'Repayment functionality will be available soon.');
  };

  const currentTierConfig = getTierForName(creditData.currentTier);
  const usedPercentage = creditData.creditLimit > 0
    ? Math.min((creditData.usedCredit / creditData.creditLimit) * 100, 100)
    : 0;

  const getTransactionStatusColor = (status: CreditTransaction['status']): string => {
    switch (status) {
      case 'active': return Colors.nileBlue;
      case 'overdue': return Colors.error;
      case 'paid': return Colors.success;
      default: return Colors.text.tertiary;
    }
  };

  const getTransactionStatusLabel = (status: CreditTransaction['status']): string => {
    switch (status) {
      case 'active': return 'Active';
      case 'overdue': return 'Overdue';
      case 'paid': return 'Paid';
      default: return status;
    }
  };

  const renderTransaction = useCallback(({ item }: { item: CreditTransaction }) => {
    const statusColor = getTransactionStatusColor(item.status);
    return (
      <View style={styles.transactionItem}>
        <View style={[styles.transactionIcon, { backgroundColor: statusColor + '15' }]}>
          <Ionicons
            name={item.status === 'paid' ? 'checkmark-circle' : item.status === 'overdue' ? 'alert-circle' : 'time'}
            size={20}
            color={statusColor}
          />
        </View>
        <View style={styles.transactionInfo}>
          <ThemedText style={styles.transactionStore}>{item.storeName}</ThemedText>
          <ThemedText style={styles.transactionDate}>
            {new Date(item.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </ThemedText>
        </View>
        <View style={styles.transactionRight}>
          <ThemedText style={styles.transactionAmount}>
            {BRAND.CURRENCY_CODE} {item.amount.toLocaleString()}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            <ThemedText style={[styles.statusBadgeText, { color: statusColor }]}>
              {getTransactionStatusLabel(item.status)}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }, []);

  const renderListHeader = useCallback(() => (
    <>
      {/* Credit Limit Card */}
      <View style={styles.creditCard}>
        <LinearGradient
          colors={[Colors.nileBlue, Colors.secondary[500]]}
          style={styles.creditCardGradient}
        >
          <View style={styles.creditCardHeader}>
            <View>
              <ThemedText style={styles.creditCardLabel}>Available Credit</ThemedText>
              <ThemedText style={styles.creditCardValue}>
                {creditData.isUnlimited
                  ? 'Unlimited'
                  : `${BRAND.CURRENCY_CODE} ${creditData.availableCredit.toLocaleString()}`}
              </ThemedText>
            </View>
            <View style={[styles.tierChip, { backgroundColor: currentTierConfig.color + '30' }]}>
              <Ionicons name="shield-checkmark" size={14} color={currentTierConfig.color} />
              <ThemedText style={[styles.tierChipText, { color: currentTierConfig.color }]}>
                {creditData.currentTier}
              </ThemedText>
            </View>
          </View>

          {/* Credit usage bar */}
          {!creditData.isUnlimited && (
            <View style={styles.creditUsageContainer}>
              <View style={styles.creditUsageBar}>
                <View
                  style={[
                    styles.creditUsageFill,
                    {
                      width: `${usedPercentage}%`,
                      backgroundColor: usedPercentage > 80 ? Colors.error : currentTierConfig.color,
                    },
                  ]}
                />
              </View>
              <View style={styles.creditUsageLabels}>
                <ThemedText style={styles.creditUsageText}>
                  Used: {BRAND.CURRENCY_CODE} {creditData.usedCredit.toLocaleString()}
                </ThemedText>
                <ThemedText style={styles.creditUsageText}>
                  Limit: {BRAND.CURRENCY_CODE} {creditData.creditLimit.toLocaleString()}
                </ThemedText>
              </View>
            </View>
          )}

          {/* Repayment due date */}
          {creditData.repaymentDueDate && creditData.usedCredit > 0 && (
            <View style={styles.dueDateContainer}>
              <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.7)" />
              <ThemedText style={styles.dueDateText}>
                Repayment due:{' '}
                {new Date(creditData.repaymentDueDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </ThemedText>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* Repay Button */}
      {creditData.usedCredit > 0 && (
        <Pressable style={styles.repayButton} onPress={handleRepay}>
          <Ionicons name="wallet" size={20} color={colors.background.primary} />
          <ThemedText style={styles.repayButtonText}>Repay Now</ThemedText>
        </Pressable>
      )}

      {/* Credit Tier Table */}
      <View style={styles.tierTableCard}>
        <ThemedText style={styles.cardTitle}>Credit Limits by Tier</ThemedText>
        <View style={styles.tierTable}>
          <View style={styles.tierTableHeader}>
            <ThemedText style={[styles.tierTableHeaderText, { flex: 1 }]}>Tier</ThemedText>
            <ThemedText style={[styles.tierTableHeaderText, { flex: 1 }]}>Trust Score</ThemedText>
            <ThemedText style={[styles.tierTableHeaderText, { flex: 1, textAlign: 'right' }]}>Credit Limit</ThemedText>
          </View>
          {CREDIT_TIERS.map(tier => {
            const isCurrentTier = tier.tier === creditData.currentTier;
            return (
              <View
                key={tier.tier}
                style={[
                  styles.tierTableRow,
                  isCurrentTier && styles.tierTableRowActive,
                ]}
              >
                <View style={[styles.tierTableCell, { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }]}>
                  <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                  <ThemedText style={[
                    styles.tierTableCellText,
                    isCurrentTier && styles.tierTableCellTextActive,
                  ]}>
                    {tier.tier}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.tierTableCell, styles.tierTableCellText, { flex: 1 }]}>
                  {tier.trustRange}
                </ThemedText>
                <ThemedText style={[
                  styles.tierTableCell,
                  styles.tierTableCellText,
                  { flex: 1, textAlign: 'right', fontWeight: '700' },
                  isCurrentTier && styles.tierTableCellTextActive,
                ]}>
                  {tier.limit === -1 ? 'Unlimited' : `${BRAND.CURRENCY_CODE} ${formatCurrency(tier.limit)}`}
                </ThemedText>
              </View>
            );
          })}
        </View>
      </View>

      {/* How Pay Later Works */}
      <View style={styles.howItWorksCard}>
        <ThemedText style={styles.cardTitle}>How Pay Later Works</ThemedText>
        <View style={styles.stepsContainer}>
          {HOW_IT_WORKS_STEPS.map((item, idx) => (
            <View key={item.step} style={styles.stepItem}>
              <View style={styles.stepLeftColumn}>
                <View style={styles.stepNumberCircle}>
                  <ThemedText style={styles.stepNumberText}>{item.step}</ThemedText>
                </View>
                {idx < HOW_IT_WORKS_STEPS.length - 1 && <View style={styles.stepConnector} />}
              </View>
              <View style={styles.stepContent}>
                <View style={[styles.stepIconContainer, { backgroundColor: Colors.nileBlue + '10' }]}>
                  <Ionicons name={item.icon as any} size={20} color={Colors.nileBlue} />
                </View>
                <View style={styles.stepTextContainer}>
                  <ThemedText style={styles.stepTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.stepDescription}>{item.description}</ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Transactions Header */}
      {transactions.length > 0 && (
        <ThemedText style={styles.transactionsTitle}>Active Credit Transactions</ThemedText>
      )}
    </>
  ), [creditData, currentTierConfig, usedPercentage, transactions.length]);

  const renderListEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="receipt-outline" size={40} color={Colors.nileBlue} />
        </View>
        <ThemedText style={styles.emptyTitle}>No Credit Transactions</ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          Your Pay Later transactions will appear here when you use credit at checkout.
        </ThemedText>
      </View>
    );
  }, [loading]);

  const renderListFooter = useCallback(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={Colors.nileBlue} />
      </View>
    );
  }, [loadingMore]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <Header onBack={handleBack} />
        <SectionListSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
      <Header onBack={handleBack} />

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderListEmpty}
        ListFooterComponent={renderListFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={fetchMoreTransactions}
        onEndReachedThreshold={0.3}
      />

      {/* Info Box at bottom */}
      <View style={styles.infoBoxWrapper}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={18} color={Colors.nileBlue} />
          <ThemedText style={styles.infoText}>
            Trust Credit is based on your Trust Passport score. Improve your score to unlock higher limits.
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <LinearGradient colors={[Colors.nileBlue, Colors.secondary[500]]} style={styles.header}>
      <View style={styles.headerContent}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Trust Credit</ThemedText>
        <View style={{ width: 40 }} />
      </View>
    </LinearGradient>
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
  listContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },

  // Credit Card
  creditCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  creditCardGradient: {
    padding: Spacing.lg,
  },
  creditCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  creditCardLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginBottom: 4,
  },
  creditCardValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.background.primary,
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  tierChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Credit usage
  creditUsageContainer: {
    gap: Spacing.xs,
  },
  creditUsageBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  creditUsageFill: {
    height: 8,
    borderRadius: 4,
  },
  creditUsageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  creditUsageText: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
  },

  // Due date
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
  },
  dueDateText: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Repay Button
  repayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.nileBlue,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.base,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.subtle,
  },
  repayButtonText: {
    ...Typography.button,
    color: colors.background.primary,
  },

  // Tier Table
  tierTableCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  cardTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  tierTable: {
    gap: 0,
  },
  tierTableHeader: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  tierTableHeaderText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tierTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  tierTableRowActive: {
    backgroundColor: Colors.nileBlue + '08',
    borderRadius: BorderRadius.md,
    borderBottomWidth: 0,
    marginVertical: 1,
  },
  tierTableCell: {},
  tierTableCellText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
  tierTableCellTextActive: {
    color: Colors.nileBlue,
    fontWeight: '700',
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // How it works
  howItWorksCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  stepsContainer: {
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    minHeight: 70,
  },
  stepLeftColumn: {
    width: 32,
    alignItems: 'center',
  },
  stepNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.nileBlue,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.background.primary,
  },
  stepConnector: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.nileBlue + '30',
    marginVertical: 2,
  },
  stepContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  stepIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTextContainer: {
    flex: 1,
  },
  stepTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  stepDescription: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
    lineHeight: 18,
  },

  // Transaction list
  transactionsTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Shadows.subtle,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionStore: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  transactionDate: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  transactionAmount: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.nileBlue + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 22,
  },

  // Loading more
  loadingMore: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },

  // Info box
  infoBoxWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.base,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.nileBlue + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    ...Typography.caption,
    color: Colors.text.secondary,
    lineHeight: 18,
  },
});

export default withErrorBoundary(TrustCreditPage, 'TrustCredit');
