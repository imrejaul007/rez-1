// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Transactions Page
// Displays user's transaction history with filtering and search

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator, // kept for load-more footer
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import walletApi, { TransactionResponse, TransactionFilters } from '@/services/walletApi';
import { TransactionListSkeleton } from '@/components/skeletons';
import CashbackTimeline, { TimelineStep } from '@/components/wallet/CashbackTimeline';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface TransactionItemProps {
  transaction: TransactionResponse;
  onPress: (transaction: TransactionResponse) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Build timeline steps from transaction status
function buildTimelineSteps(tx: TransactionResponse): TimelineStep[] {
  const status = tx.status?.current || 'completed';
  const isCashback = tx.category === 'cashback' || tx.category === 'bonus';
  if (!isCashback) return [];

  const isCompleted = status === 'completed';
  const isPending = status === 'pending';

  return [
    { label: 'Transaction Recorded', isComplete: true, isCurrent: false, timestamp: tx.createdAt },
    { label: 'Verification', isComplete: isCompleted, isCurrent: isPending, estimate: isPending ? '~1-2 hours' : undefined, timestamp: isCompleted ? tx.createdAt : undefined },
    { label: 'Credited to Wallet', isComplete: isCompleted, isCurrent: false, timestamp: isCompleted ? tx.createdAt : undefined, estimate: !isCompleted ? '~24 hours' : undefined },
  ];
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction, onPress, isExpanded, onToggleExpand }) => {
  const getTransactionIcon = (category: string, type: string) => {
    if (type === 'credit') {
      switch (category) {
        case 'topup': return 'add-circle';
        case 'cashback': return 'cash';
        case 'bonus': return 'gift';
        case 'refund': return 'return-up-back';
        default: return 'arrow-down-circle';
      }
    } else {
      switch (category) {
        case 'spending': return 'card';
        case 'withdrawal': return 'arrow-up-circle';
        case 'penalty': return 'warning';
        default: return 'arrow-up-circle';
      }
    }
  };

  const getTransactionColor = (type: string) => {
    return type === 'credit' ? Colors.success : Colors.error;
  };

  const formatAmount = (amount: number, currency: string, type: string) => {
    const sign = type === 'credit' ? '+' : '-';
    return `${sign}${currency} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <>
    <Pressable
      style={styles.transactionItem}
      onPress={() => {
        const steps = buildTimelineSteps(transaction);
        if (steps.length > 0 && onToggleExpand) {
          onToggleExpand();
        } else {
          onPress(transaction);
        }
      }}
    >
      <View style={styles.transactionIcon}>
        <Ionicons 
          name={getTransactionIcon(transaction.category, transaction.type) as any}
          size={24} 
          color={getTransactionColor(transaction.type)} 
        />
      </View>
      
      <View style={styles.transactionContent}>
        <Text style={styles.transactionTitle} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.transactionDate}>
          {formatDate(transaction.createdAt)}
        </Text>
        <View style={styles.transactionStatus}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: transaction.status.current === 'completed' ? colors.tint.green : colors.tint.amberLight }
          ]}>
            <Text style={[
              styles.statusText,
              { color: transaction.status.current === 'completed' ? '#065F46' : colors.brand.amberDark }
            ]}>
              {transaction.status.current.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.transactionAmount}>
        <Text style={[
          styles.amountText,
          { color: getTransactionColor(transaction.type) }
        ]}>
          {formatAmount(transaction.amount, transaction.currency, transaction.type)}
        </Text>
        <Text style={styles.balanceText}>
          Balance: {transaction.currency} {transaction.balanceAfter.toLocaleString()}
        </Text>
      </View>
      
      <Ionicons name={isExpanded ? "chevron-down" : "chevron-forward"} size={20} color={Colors.border.default} />
    </Pressable>
    {isExpanded && (() => {
      const steps = buildTimelineSteps(transaction);
      return steps.length > 0 ? (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, backgroundColor: colors.neutral[50], borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <CashbackTimeline steps={steps} />
        </View>
      ) : null;
    })()}
    </>
  );
};

function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionResponse | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const loadTransactions = useCallback(async (page = 1, refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await walletApi.getTransactions({
        ...filters,
        page,
      });

      if (response.success && response.data) {
        if (page === 1) {
          if (!isMounted()) return;
          setTransactions(response.data.transactions);
        } else {
          if (!isMounted()) return;
          setTransactions(prev => [...prev, ...response.data!.transactions]);
        }
        if (!isMounted()) return;
        setPagination(response.data.pagination);
      } else {
        throw new Error(response.error || 'Failed to load transactions');
      }
    } catch (err) {
      if (!isMounted()) return;
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, [filters]);

  const handleRefresh = useCallback(() => {
    loadTransactions(1, true);
  }, [loadTransactions]);

  const handleLoadMore = useCallback(() => {
    if (pagination.hasNext && !isLoading) {
      loadTransactions(pagination.page + 1);
    }
  }, [pagination.hasNext, pagination.page, isLoading, loadTransactions]);

  const handleTransactionPress = useCallback((transaction: TransactionResponse) => {
    setSelectedTransaction(transaction);
  }, []);

  const handleBackPress = useCallback(() => {
    router.canGoBack() ? router.back() : router.replace('/(tabs)');
  }, [router]);

  const handleFilterChange = useCallback((newFilters: Partial<TransactionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
    setShowFilters(false);
  }, []);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const renderTransactionItem = useCallback(({ item }: { item: TransactionResponse }) => (
    <TransactionItem
      transaction={item}
      onPress={handleTransactionPress}
      isExpanded={expandedTxId === item.id}
      onToggleExpand={() => setExpandedTxId(prev => prev === item.id ? null : item.id)}
    />
  ), [handleTransactionPress, expandedTxId]);

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="receipt-outline" size={64} color={Colors.border.default} />
      <Text style={styles.emptyStateTitle}>No Transactions Yet</Text>
      <Text style={styles.emptyStateText}>
        Your transaction history will appear here once you start using your wallet.
      </Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
      <Text style={styles.errorStateTitle}>Failed to Load Transactions</Text>
      <Text style={styles.errorStateText}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={handleRefresh}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </Pressable>
    </View>
  );

  if (isLoading && transactions.length === 0) {
    return <TransactionListSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[Colors.brand.purple, Colors.brand.purpleLight] as const} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Text style={styles.headerTitle}>Transaction History</Text>
          <Pressable 
            style={styles.filterButton} 
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="filter" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Content */}
      {error && transactions.length === 0 ? (
        renderErrorState()
      ) : (
        <FlashList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[Colors.brand.purple]}
              tintColor={Colors.brand.purple}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListEmptyComponent={renderEmptyState}
          estimatedItemSize={80}
          ListFooterComponent={
            isLoading && transactions.length > 0 ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={Colors.brand.purple} />
                <Text style={styles.loadingMoreText}>Loading more...</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Transaction Detail Modal */}
      <Modal
        visible={!!selectedTransaction}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTransaction(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedTransaction && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Transaction Details</Text>
                  <Pressable onPress={() => setSelectedTransaction(null)}>
                    <Ionicons name="close" size={24} color={Colors.text.tertiary} />
                  </Pressable>
                </View>
                
                <View style={styles.modalBody}>
                  <Text style={styles.modalDescription}>
                    {selectedTransaction.description}
                  </Text>
                  <Text style={styles.modalAmount}>
                    {selectedTransaction.type === 'credit' ? '+' : '-'}
                    {selectedTransaction.currency} {selectedTransaction.amount.toLocaleString()}
                  </Text>
                  <Text style={styles.modalDate}>
                    {new Date(selectedTransaction.createdAt).toLocaleString()}
                  </Text>
                  <Text style={styles.modalStatus}>
                    Status: {selectedTransaction.status.current.toUpperCase()}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
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
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: '700',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  transactionDate: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  transactionStatus: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  transactionAmount: {
    alignItems: 'flex-end',
    marginRight: Spacing.sm,
  },
  amountText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  balanceText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyStateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorStateTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.error,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorStateText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  retryButton: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
  },
  loadingMoreText: {
    marginLeft: Spacing.sm,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  modalBody: {
    alignItems: 'center',
  },
  modalDescription: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    marginBottom: Spacing.base,
    textAlign: 'center',
  },
  modalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.brand.purple,
    marginBottom: Spacing.base,
  },
  modalDate: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  modalStatus: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
});
export default withErrorBoundary(TransactionsPage, 'TransactionsIndex');
