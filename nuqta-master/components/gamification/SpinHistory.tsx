// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import gamificationAPI from '@/services/gamificationApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface CouponMetadata {
  source?: string;
  isProductSpecific?: boolean;
  storeName?: string;
  storeId?: string;
  productName?: string | null;
  productId?: string | null;
  productImage?: string | null;
}

interface SpinHistoryItem {
  id: string;
  completedAt: string;
  prize: string;
  segment: number;
  reward: {
    coins?: number;
    cashback?: number;
    discount?: number;
    voucher?: any;
  };
  metadata?: {
    couponMetadata?: CouponMetadata | null;
  };
}

interface SpinHistoryProps {
  limit?: number;
}

function SpinHistory({ limit = 10 }: SpinHistoryProps) {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [history, setHistory] = useState<SpinHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await gamificationAPI.getSpinWheelHistory(limit);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setHistory(response.data.history);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Failed to load history');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const getRewardIcon = (item: SpinHistoryItem) => {
    if (item.reward.coins) return 'star';
    if (item.reward.cashback) return 'cash';
    if (item.reward.discount) return 'pricetag';
    if (item.reward.voucher) return 'ticket';
    return 'close-circle';
  };

  const getRewardColor = (item: SpinHistoryItem) => {
    if (item.reward.coins) return colors.brand.goldBright;
    if (item.reward.cashback) return colors.lightMustard;
    if (item.reward.discount) return colors.warningScale[400];
    if (item.reward.voucher) return colors.brand.purpleLight;
    return colors.neutral[400];
  };

  const getRewardText = (item: SpinHistoryItem) => {
    if (item.reward.coins) return `${item.reward.coins} Coins`;
    if (item.reward.cashback) return `${currencySymbol}${item.reward.cashback} Cashback`;
    if (item.reward.discount) return `${item.reward.discount}% Off`;
    if (item.reward.voucher) return 'Voucher';
    return 'Try Again';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.brand.purpleLight} />
        <ThemedText style={styles.loadingText}>Loading history...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable
          style={styles.retryButton}
          onPress={loadHistory}
         
        >
          <ThemedText style={styles.retryButtonText}>Try Again</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  if (history.length === 0) {
    return (
      <ThemedView style={styles.emptyContainer}>
        <Ionicons name="time-outline" size={64} color={colors.neutral[400]} />
        <ThemedText style={styles.emptyTitle}>No Spin History</ThemedText>
        <ThemedText style={styles.emptyText}>
          Your spin history will appear here after you start playing!
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.brand.purpleLight}
          colors={[colors.brand.purpleLight]}
        />
      }
    >
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Recent Spins</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          {history.length} spin{history.length !== 1 ? 's' : ''}
        </ThemedText>
      </View>

      {history.map((item) => (
        <View key={item.id} style={styles.historyItem}>
          <View style={[styles.iconContainer, { backgroundColor: `${getRewardColor(item)}20` }]}>
            <Ionicons
              name={getRewardIcon(item) as any}
              size={24}
              color={getRewardColor(item)}
            />
          </View>

          <View style={styles.itemContent}>
            <ThemedText style={styles.itemTitle}>{getRewardText(item)}</ThemedText>

            {/* Coupon Applicability Info */}
            {item.metadata?.couponMetadata && (item.reward.discount || item.reward.cashback || item.reward.voucher) && (
              <View style={styles.applicabilityInfo}>
                <Ionicons
                  name={item.metadata.couponMetadata.isProductSpecific ? "cube-outline" : "storefront-outline"}
                  size={12}
                  color={colors.neutral[500]}
                />
                <ThemedText style={styles.applicabilityText}>
                  {item.metadata.couponMetadata.isProductSpecific
                    ? `${item.metadata.couponMetadata.productName} from ${item.metadata.couponMetadata.storeName}`
                    : `Any product from ${item.metadata.couponMetadata.storeName}`}
                </ThemedText>
              </View>
            )}

            <ThemedText style={styles.itemDate}>{formatDate(item.completedAt)}</ThemedText>
          </View>

          {(item.reward.coins || item.reward.cashback) && (
            <View style={styles.rewardBadge}>
              <ThemedText style={[styles.rewardValue, { color: getRewardColor(item) }]}>
                +{item.reward.coins || item.reward.cashback}
              </ThemedText>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.neutral[500],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.brand.purpleLight,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.neutral[500],
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 4,
  },
  applicabilityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    marginBottom: 4,
  },
  applicabilityText: {
    fontSize: 11,
    color: colors.neutral[500],
    flex: 1,
  },
  itemDate: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  rewardBadge: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rewardValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default React.memo(SpinHistory);
