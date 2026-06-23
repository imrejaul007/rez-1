// @ts-nocheck
// Transaction History Component
// Complete transaction history section with filtering and pagination

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ThemedText } from '@/components/ThemedText';
import TransactionTabs from './TransactionTabs';
import TransactionCard from './TransactionCard';
import { 
  Transaction, 
  TransactionCategory, 
  WalletTab 
} from '@/types/wallet.types';
import { colors } from '@/constants/theme';
import {
  fetchTransactions,
  walletTabs as defaultTabs
} from '@/data/walletData';
import { useIsMounted } from '@/hooks/useIsMounted';

interface TransactionHistoryProps {
  onTransactionPress?: (transaction: Transaction) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  maxHeight?: number;
}

function TransactionHistory({
  onTransactionPress, 
  refreshing = false, 
  onRefresh,
  maxHeight,
}: TransactionHistoryProps) {
  const [activeTab, setActiveTab] = useState<TransactionCategory>('ALL');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [tabs, setTabs] = useState<WalletTab[]>(defaultTabs);
  const isMounted = useIsMounted();

  // Load transactions for the current tab
  const loadTransactions = async (
    category: TransactionCategory = activeTab, 
    page: number = 1, 
    append: boolean = false
  ) => {
    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const result = await fetchTransactions(category, page, 20);
      
      if (append) {
        if (!isMounted()) return;
        setTransactions(prev => [...prev, ...result.transactions]);
      } else {
        setTransactions(result.transactions);
      }
      
      if (!isMounted()) return;
      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (error) {
      // Error loading transactions - handled by UI state
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Update tabs with current transaction counts
  // Uses a single fetch per tab with limit=1 to get the total count without fetching all records
  const updateTabCounts = async () => {
    try {
      const updatedTabs = await Promise.all(
        defaultTabs.map(async (tab) => {
          const result = await fetchTransactions(tab.id, 1, 1);
          return {
            ...tab,
            count: result.total,
            isActive: tab.id === activeTab,
          };
        })
      );
      if (!isMounted()) return;
      setTabs(updatedTabs);
    } catch (error) {
      // Error updating tab counts - handled silently
    }
  };

  // Initial load
  useEffect(() => {
    loadTransactions(activeTab, 1, false);
    updateTabCounts();
  }, [activeTab]);

  // Handle tab change
  const handleTabPress = (tabId: TransactionCategory) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setCurrentPage(1);
      setHasMore(true);
      
      // Update active state in tabs
      setTabs(prev =>
        prev.map(tab => ({
          ...tab,
          isActive: tab.id === tabId
        }))
      );
    }
  };

  // Handle load more
  const handleLoadMore = () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      loadTransactions(activeTab, currentPage + 1, true);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    onRefresh?.();
    setCurrentPage(1);
    setHasMore(true);
    loadTransactions(activeTab, 1, false);
    updateTabCounts();
  };

  // Render transaction item
  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TransactionCard
      transaction={item}
      onPress={onTransactionPress}
      showDate={true}
    />
  );

  // Render footer with loading indicator
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.brand.purpleLight} />
        <ThemedText style={styles.loadingText}>Loading more transactions...</ThemedText>
      </View>
    );
  };

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyTitle}>No transactions found</ThemedText>
      <ThemedText style={styles.emptyDescription}>
        No transactions available for the selected category.
      </ThemedText>
    </View>
  );

  // Loading state
  if (isLoading && transactions.length === 0) {
    return (
      <View style={styles.container}>
        <TransactionTabs 
          tabs={tabs}
          activeTab={activeTab}
          onTabPress={handleTabPress}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purpleLight} />
          <ThemedText style={styles.loadingText}>Loading transactions...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, maxHeight && { maxHeight }]}>
      {/* Section Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Transaction History</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </ThemedText>
      </View>

      {/* Filter Tabs */}
      <TransactionTabs 
        tabs={tabs}
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />

      {/* Transaction List */}
      <FlashList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        estimatedItemSize={72}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.brand.purpleLight}
            colors={[colors.brand.purpleLight]}
            progressBackgroundColor={colors.background.primary}
          />
        }
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          transactions.length === 0 && styles.emptyListContent,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: colors.tint.slate,
  },
  
  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.tint.slate,
    backgroundColor: '#FAFBFC',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.slateGray,
    fontWeight: '500',
  },
  
  // List
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
  },
  
  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: colors.neutral[500],
    marginTop: 12,
    fontWeight: '500',
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default React.memo(TransactionHistory);