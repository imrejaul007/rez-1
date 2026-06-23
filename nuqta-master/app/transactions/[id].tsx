// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, StatusBar, Share } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import walletApi, { TransactionResponse } from '@/services/walletApi';
import storePaymentApi from '@/services/storePaymentApi';
import { useGetCurrencySymbol, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

// Store Payment type for store payments
interface StorePaymentDetail {
  id: string;
  paymentId: string;
  storeId: string;
  storeName: string;
  storeLogo?: string;
  billAmount: number;
  discountAmount: number;
  coinRedemption: {
    rezCoins: number;
    promoCoins: number;
    totalAmount: number;
  };
  coinsUsed: number;
  remainingAmount: number;
  paymentMethod: string;
  offersApplied: string[];
  status: string;
  rewards?: {
    cashbackEarned: number;
    coinsEarned: number;
    bonusCoins: number;
  };
  transactionId?: string;
  createdAt: string;
  completedAt?: string;
}

const TransactionDetailPage = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [transaction, setTransaction] = useState<TransactionResponse | null>(null);
  const [storePayment, setStorePayment] = useState<StorePaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  // Check if the ID is a store payment ID (starts with "SP-")
  const isStorePayment = id?.startsWith('SP-');

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (id) {
      fetchTransactionDetail();
    }
  }, [id, authLoading, isAuthenticated]);

  const fetchTransactionDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isStorePayment) {
        // Fetch store payment details
        const paymentData = await storePaymentApi.getPaymentDetails(id);
        if (!isMounted()) return;
        setStorePayment(paymentData);
      } else {
        // Fetch wallet transaction
        const response = await walletApi.getTransactionById(id);
        if (response.success && response.data) {
          setTransaction(response.data.transaction);
        } else {
          if (!isMounted()) return;
          setError(response.error || 'Transaction not found');
        }
      }
    } catch (err) {
      if (!isMounted()) return;
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      let message = '';

      if (storePayment) {
        message = `
REZ Store Payment Receipt

Store: ${storePayment.storeName}
Payment ID: ${storePayment.paymentId}
Amount: ${currencySymbol}${storePayment.billAmount}
Coins Used: ${currencySymbol}${storePayment.coinsUsed}
Paid via: ${currencySymbol}${storePayment.remainingAmount}
Status: ${storePayment.status}
Date: ${new Date(storePayment.createdAt).toLocaleString()}
${storePayment.rewards ? `\nRewards Earned:\n- Cashback: ${currencySymbol}${storePayment.rewards.cashbackEarned}\n- Coins: ${storePayment.rewards.coinsEarned}` : ''}
        `.trim();
      } else if (transaction) {
        message = `
REZ Wallet Transaction

Transaction ID: ${transaction.transactionId}
Type: ${transaction.type.toUpperCase()}
Amount: ${transaction.amount} ${transaction.currency}
Status: ${transaction.status.current}
Date: ${new Date(transaction.createdAt).toLocaleString()}
Description: ${transaction.description}

Balance Before: ${transaction.balanceBefore} ${transaction.currency}
Balance After: ${transaction.balanceAfter} ${transaction.currency}
        `.trim();
      } else {
        return;
      }

      await Share.share({ message });
    } catch (err) {
      platformAlertSimple('Error', 'Unable to share transaction details');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return Colors.gold;
      case 'pending': return Colors.warning;
      case 'failed': return Colors.error;
      case 'cancelled': return Colors.text.tertiary;
      default: return Colors.text.tertiary;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'credit' ? 'arrow-down-circle' : 'arrow-up-circle';
  };

  const getTypeColor = (type: string) => {
    return type === 'credit' ? Colors.gold : Colors.error;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />
        <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitle}>Transaction Details</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading transaction...</Text>
        </View>
      </View>
    );
  }

  if (error || (!transaction && !storePayment)) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />
        <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitle}>Transaction Details</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorTitle}>Error Loading Transaction</Text>
          <Text style={styles.errorText}>{error || 'Transaction not found'}</Text>
          <Pressable style={styles.retryButton} onPress={fetchTransactionDetail}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Render store payment details
  if (storePayment) {
    const spStatusColor = getStatusColor(storePayment.status.toLowerCase());

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />

        {/* Header */}
        <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.header}>
          <View style={styles.headerContent}>
            <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
              <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
            </Pressable>
            <Text style={styles.headerTitle}>Payment Receipt</Text>
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social" size={24} color={Colors.text.inverse} />
            </Pressable>
          </View>

          {/* Store Payment Amount Card */}
          <View style={styles.amountCard}>
            <View style={[styles.typeIconContainer, { backgroundColor: 'rgba(255, 205, 87, 0.2)' }]}>
              <Ionicons name="storefront" size={32} color={Colors.gold} />
            </View>
            <Text style={[styles.amountText, { color: Colors.text.inverse }]}>
              {currencySymbol}{storePayment.billAmount}
            </Text>
            <Text style={styles.storeNameText}>{storePayment.storeName}</Text>
            <View style={[styles.statusBadgeLarge, { backgroundColor: `${spStatusColor}20` }]}>
              <Text style={[styles.statusTextLarge, { color: spStatusColor }]}>
                {storePayment.status}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
          {/* Payment Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Breakdown</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Bill Amount" value={`${currencySymbol}${storePayment.billAmount}`} />
              {storePayment.discountAmount > 0 && (
                <InfoRow label="Discount" value={`-${currencySymbol}${storePayment.discountAmount}`} />
              )}
              {storePayment.coinsUsed > 0 && (
                <InfoRow label="Coins Used" value={`-${currencySymbol}${storePayment.coinsUsed}`} />
              )}
              <InfoRow label="Paid via Gateway" value={`${currencySymbol}${storePayment.remainingAmount}`} />
            </View>
          </View>

          {/* Transaction Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Transaction Information</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Payment ID" value={storePayment.paymentId} />
              {storePayment.transactionId && (
                <InfoRow label="Transaction ID" value={storePayment.transactionId.slice(-12)} />
              )}
              <InfoRow label="Payment Method" value={storePayment.paymentMethod.toUpperCase()} />
              <InfoRow label="Date" value={formatDate(storePayment.createdAt)} />
              {storePayment.completedAt && (
                <InfoRow label="Completed At" value={formatDate(storePayment.completedAt)} />
              )}
            </View>
          </View>

          {/* Coin Redemption Details */}
          {storePayment.coinsUsed > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Coins Redeemed</Text>
              <View style={styles.infoCard}>
                {storePayment.coinRedemption.rezCoins > 0 && (
                  <InfoRow label={BRAND.COIN_NAME} value={`${currencySymbol}${storePayment.coinRedemption.rezCoins}`} />
                )}
                {storePayment.coinRedemption.promoCoins > 0 && (
                  <InfoRow label="Promo Coins" value={`${currencySymbol}${storePayment.coinRedemption.promoCoins}`} />
                )}
                <InfoRow label="Total Coins Used" value={`${currencySymbol}${storePayment.coinRedemption.totalAmount}`} />
              </View>
            </View>
          )}

          {/* Rewards Earned */}
          {storePayment.rewards && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rewards Earned</Text>
              <View style={[styles.infoCard, { backgroundColor: Colors.linen }]}>
                <View style={styles.rewardsRow}>
                  <View style={styles.rewardItemSmall}>
                    <Ionicons name="cash-outline" size={24} color={Colors.gold} />
                    <Text style={styles.rewardValueSmall}>{currencySymbol}{storePayment.rewards.cashbackEarned}</Text>
                    <Text style={styles.rewardLabelSmall}>Cashback</Text>
                  </View>
                  <View style={styles.rewardItemSmall}>
                    <CachedImage
                      source={BRAND.COIN_IMAGE}
                      style={{ width: 24, height: 24 }}
                      contentFit="contain"
                      transition={200}
                    />
                    <Text style={styles.rewardValueSmall}>{storePayment.rewards.coinsEarned}</Text>
                    <Text style={styles.rewardLabelSmall}>Coins</Text>
                  </View>
                  {storePayment.rewards.bonusCoins > 0 && (
                    <View style={styles.rewardItemSmall}>
                      <Ionicons name="gift" size={24} color={Colors.brand.purpleLight} />
                      <Text style={styles.rewardValueSmall}>{storePayment.rewards.bonusCoins}</Text>
                      <Text style={styles.rewardLabelSmall}>Bonus</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // Wallet transaction rendering (original code)
  const statusColor = getStatusColor(transaction!.status.current);
  const typeColor = getTypeColor(transaction!.type);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.gold} />

      {/* Header */}
      <LinearGradient colors={[Colors.gold, Colors.nileBlue]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <Text style={styles.headerTitle}>Transaction Details</Text>
          <Pressable style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        {/* Transaction Amount Card */}
        <View style={styles.amountCard}>
          <View style={[styles.typeIconContainer, { backgroundColor: `${typeColor}20` }]}>
            <Ionicons name={getTypeIcon(transaction.type) as any} size={32} color={typeColor} />
          </View>
          <Text style={[styles.amountText, { color: typeColor }]}>
            {transaction.type === 'credit' ? '+' : '-'}{transaction.amount} {transaction.currency}
          </Text>
          <View style={[styles.statusBadgeLarge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusTextLarge, { color: statusColor }]}>
              {transaction.status.current}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.infoCard}>
            <Text style={styles.description}>{transaction.description}</Text>
          </View>
        </View>

        {/* Transaction Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Transaction ID" value={transaction.transactionId} />
            <InfoRow label="Type" value={transaction.type.toUpperCase()} />
            <InfoRow label="Category" value={transaction.category} />
            <InfoRow label="Date" value={formatDate(transaction.createdAt)} />
          </View>
        </View>

        {/* Balance Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balance</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Balance Before" value={`${transaction.balanceBefore} ${transaction.currency}`} />
            <InfoRow label="Balance After" value={`${transaction.balanceAfter} ${transaction.currency}`} />
            {transaction.fees && transaction.fees > 0 && (
              <InfoRow label="Fees" value={`${transaction.fees} ${transaction.currency}`} />
            )}
            {transaction.netAmount && (
              <InfoRow label="Net Amount" value={`${transaction.netAmount} ${transaction.currency}`} />
            )}
          </View>
        </View>

        {/* Source Information */}
        {transaction.source && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Source</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Type" value={transaction.source.type} />
              {transaction.source.description && (
                <InfoRow label="Description" value={transaction.source.description} />
              )}
              <InfoRow label="Reference" value={transaction.source.reference} />
            </View>
          </View>
        )}

        {/* Status History */}
        {transaction.status.history && transaction.status.history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status History</Text>
            <View style={styles.infoCard}>
              {transaction.status.history.map((item, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyDot} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyStatus}>{item.status}</Text>
                    <Text style={styles.historyDate}>
                      {formatDate(item.timestamp)}
                    </Text>
                    {item.reason && (
                      <Text style={styles.historyReason}>{item.reason}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Additional Info */}
        {transaction.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.infoCard}>
              <Text style={styles.notes}>{transaction.notes}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: Spacing['2xl'],
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
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
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerRight: {
    width: 40,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  typeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  amountText: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  statusBadgeLarge: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  statusTextLarge: {
    ...Typography.body,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    ...Shadows.subtle,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  infoLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    flex: 1,
  },
  infoValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  description: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 22,
  },
  notes: {
    ...Typography.body,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    marginTop: 6,
    marginRight: Spacing.md,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
    textTransform: 'capitalize',
    marginBottom: Spacing.xs,
  },
  historyDate: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.xs,
  },
  historyReason: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  // Store payment specific styles
  storeNameText: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: Spacing.md,
  },
  rewardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  rewardItemSmall: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  rewardValueSmall: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  rewardLabelSmall: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
});

export default withErrorBoundary(TransactionDetailPage, 'TransactionsId');