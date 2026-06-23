import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Billing History Page
// View subscription payment history and download invoices

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { TransactionListSkeleton } from '@/components/skeletons';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import subscriptionAPI, { BillingTransaction } from '@/services/subscriptionApi';
import BillingHistoryList from '@/components/subscription/BillingHistoryList';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function BillingHistoryPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 20,
    hasMore: false,
  });
  const isMounted = useIsMounted();

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      setLoading(true);

      // Load history and summary in parallel
      const [historyData, summaryData] = await Promise.all([
        subscriptionAPI.getBillingHistory({ skip: 0, limit: 20 }),
        subscriptionAPI.getBillingSummary(),
      ]);

      if (!isMounted()) return;
      setTransactions(historyData.history);
      if (!isMounted()) return;
      setPagination(historyData.pagination);
      if (!isMounted()) return;
      setSummary(summaryData);
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to load billing history');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBillingData();
    if (!isMounted()) return;
    setRefreshing(false);
  }, []);

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      platformAlertSimple('Download Invoice', 'Invoice download functionality will be available soon. For now, you can view invoice details.');

      // In production, this would download the PDF
      // const blob = await subscriptionAPI.downloadInvoice(invoiceId);
      // ... handle file download
    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to download invoice');
    }
  };

  const handleViewInvoice = async (transactionId: string) => {
    try {
      const invoice = await subscriptionAPI.getInvoice(transactionId);

      platformAlertSimple(
        'Invoice Details',
        `Invoice #${invoice.invoiceNumber}\n\n` +
        `Date: ${new Date(invoice.date).toLocaleDateString()}\n` +
        `Amount: ${currencySymbol}${invoice.total}\n` +
        `Status: ${invoice.status}\n` +
        `Payment Method: ${invoice.paymentMethod}`
      );
    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to load invoice details');
    }
  };

  const loadMore = async () => {
    if (!pagination.hasMore || loading) return;

    try {
      const historyData = await subscriptionAPI.getBillingHistory({
        skip: pagination.skip + pagination.limit,
        limit: pagination.limit,
      });

      if (!isMounted()) return;
      setTransactions([...transactions, ...historyData.history]);
      if (!isMounted()) return;
      setPagination(historyData.pagination);
    } catch (error: any) {
      // silently handle
    }
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.purpleLight} />

      {/* Header */}
      <LinearGradient colors={[Colors.brand.purpleLight, Colors.brand.purple]} style={styles.header}>
        <View style={styles.headerContainer}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Billing History</ThemedText>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Cards */}
        {summary && !loading && (
          <View style={styles.summarySection}>
            <View style={styles.summaryGrid}>
              <View
                style={styles.summaryCard}
                accessible={true}
                accessibilityLabel={`Total spent: ${summary.totalSpent} rupees`}
                accessibilityRole="text"
              >
                <Ionicons name="wallet-outline" size={24} color={Colors.brand.purpleLight} />
                <ThemedText style={styles.summaryValue}>{currencySymbol}{summary.totalSpent}</ThemedText>
                <ThemedText style={styles.summaryLabel}>Total Spent</ThemedText>
              </View>

              <View
                style={styles.summaryCard}
                accessible={true}
                accessibilityLabel={`Total transactions: ${summary.totalTransactions}`}
                accessibilityRole="text"
              >
                <Ionicons name="receipt-outline" size={24} color={Colors.success} />
                <ThemedText style={styles.summaryValue}>{summary.totalTransactions}</ThemedText>
                <ThemedText style={styles.summaryLabel}>Transactions</ThemedText>
              </View>

              <View
                style={styles.summaryCard}
                accessible={true}
                accessibilityLabel={`Total savings: ${summary.totalSavings} rupees`}
                accessibilityRole="text"
              >
                <Ionicons name="trending-up-outline" size={24} color={Colors.warning} />
                <ThemedText style={styles.summaryValue}>{currencySymbol}{summary.totalSavings}</ThemedText>
                <ThemedText style={styles.summaryLabel}>Total Savings</ThemedText>
              </View>

              <View
                style={styles.summaryCard}
                accessible={true}
                accessibilityLabel={`Net savings: ${summary.netSavings} rupees`}
                accessibilityRole="text"
              >
                <Ionicons name="analytics-outline" size={24} color={Colors.info} />
                <ThemedText style={[
                  styles.summaryValue,
                  { color: summary.netSavings >= 0 ? Colors.success : Colors.error }
                ]}>
                  {currencySymbol}{summary.netSavings}
                </ThemedText>
                <ThemedText style={styles.summaryLabel}>Net Savings</ThemedText>
              </View>
            </View>

            {summary.memberSince && (
              <View style={styles.membershipInfo}>
                <Ionicons name="calendar-outline" size={16} color={Colors.text.tertiary} />
                <ThemedText style={styles.membershipText}>
                  Member since {new Date(summary.memberSince).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </ThemedText>
              </View>
            )}
          </View>
        )}

        {/* Transaction History */}
        <View style={styles.historySection}>
          <ThemedText style={styles.sectionTitle}>Transaction History</ThemedText>

          {loading ? (
            <TransactionListSkeleton />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={Colors.border.default} />
              <ThemedText style={styles.emptyTitle}>No Transactions Yet</ThemedText>
              <ThemedText style={styles.emptyDescription}>
                Your billing history will appear here once you make a subscription payment.
              </ThemedText>
              <Pressable
                style={styles.emptyButton}
                onPress={() => router.push('/subscription/plans')}
                accessibilityLabel="View subscription plans"
                accessibilityRole="button"
                accessibilityHint="Double tap to explore available subscription plans"
              >
                <ThemedText style={styles.emptyButtonText}>View Plans</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <BillingHistoryList
                transactions={transactions}
                onDownloadInvoice={handleDownloadInvoice}
                onViewInvoice={handleViewInvoice}
                loading={false}
              />

              {/* Load More */}
              {pagination.hasMore && (
                <Pressable
                  style={styles.loadMoreButton}
                  onPress={loadMore}
                  accessibilityLabel="Load more transactions"
                  accessibilityRole="button"
                  accessibilityHint="Double tap to load additional billing transactions"
                >
                  <ThemedText style={styles.loadMoreText}>Load More</ThemedText>
                  <Ionicons name="chevron-down" size={16} color={Colors.brand.purpleLight} />
                </Pressable>
              )}
            </>
          )}
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <View style={styles.helpCard}>
            <Ionicons name="information-circle-outline" size={24} color={Colors.brand.purpleLight} />
            <View style={styles.helpContent}>
              <ThemedText style={styles.helpTitle}>Need Help?</ThemedText>
              <ThemedText style={styles.helpText}>
                Contact our support team for billing inquiries or invoice questions.
              </ThemedText>
            </View>
          </View>

          <Pressable
            style={styles.supportButton}
            onPress={() => router.push('/support/chat')}
            accessibilityLabel="Contact support"
            accessibilityRole="button"
            accessibilityHint="Double tap to chat with customer support about billing inquiries"
          >
            <Ionicons name="chatbubble-outline" size={20} color={Colors.text.inverse} />
            <ThemedText style={styles.supportButtonText}>Contact Support</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    color: Colors.text.inverse,
    ...Typography.h3,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  summarySection: {
    padding: Spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    ...Shadows.subtle,
  },
  summaryValue: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: Spacing.sm,
  },
  summaryLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  membershipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.base,
    gap: Spacing.sm,
  },
  membershipText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  historySection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    ...Shadows.subtle,
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  emptyDescription: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: Colors.brand.purpleLight,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  emptyButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.subtle,
  },
  loadMoreText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.brand.purpleLight,
  },
  helpSection: {
    padding: Spacing.lg,
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  helpContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  helpTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  helpText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.purpleLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  supportButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
});

export default withErrorBoundary(BillingHistoryPage, 'SubscriptionBilling');
