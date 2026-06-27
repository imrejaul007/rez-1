// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Store Coins Page (Branded Coins)
// Shows all store-specific branded coins earned by the user
// Branded coins are merchant-specific and stored in wallet.brandedCoins
// Different from Promo Coins which are admin-provided campaign coins

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Pressable,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { BackendBrandedCoin } from '@/services/walletApi';
import { useBrandedCoins, useWalletLoading, useRefreshWallet } from '@/stores/selectors';
import { showToast } from '@/components/common/ToastManager';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Store coin display item (mapped from BackendBrandedCoin)
interface StoreCoinItem {
  _id: string;
  store: {
    name: string;
    logo?: string;
    color?: string;
  };
  amount: number;
  earned: number;
  used: number;
  lastEarnedAt?: string;
  lastUsedAt?: string;
  expiryDate?: string;
  transactions: any[];
}

interface StoreCoinSummary {
  totalAvailable: number;
  totalEarned: number;
  totalUsed: number;
  storeCount: number;
}

function StorePromoCoinsPage() {
  const brandedCoinsFromCtx = useBrandedCoins();
  const walletLoading = useWalletLoading();
  const refreshWallet = useRefreshWallet();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [storeCoins, setStoreCoins] = useState<StoreCoinItem[]>([]);
  const [summary, setSummary] = useState<StoreCoinSummary>({
    totalAvailable: 0,
    totalEarned: 0,
    totalUsed: 0,
    storeCount: 0,
  });
  const isMounted = useIsMounted();

  // Derive store coins from WalletContext brandedCoins
  useEffect(() => {
    const brandedCoins = brandedCoinsFromCtx || [];

    // Map branded coins to display format
    const mappedCoins: StoreCoinItem[] = brandedCoins.map((bc: BackendBrandedCoin) => ({
      _id: bc.merchantId,
      store: {
        name: bc.merchantName,
        logo: bc.merchantLogo,
        color: bc.merchantColor,
      },
      amount: bc.amount,
      // totalEarned/totalUsed are approximations — backend doesn't track
      // earned vs used separately for branded coins
      earned: bc.amount,
      used: 0,
      lastEarnedAt: bc.earnedDate,
      lastUsedAt: bc.lastUsed,
      expiryDate: undefined,
      transactions: [],
    }));

    setStoreCoins(mappedCoins);

    const totalAvailable = brandedCoins.reduce((sum: number, bc: any) => sum + (bc.amount || 0), 0);
    setSummary({
      totalAvailable,
      // Approximation: totalEarned ≈ current amount (backend limitation — no separate earned/used tracking)
      totalEarned: totalAvailable,
      totalUsed: 0,
      storeCount: brandedCoins.length,
    });

    setLoading(false);
    setRefreshing(false);
  }, [brandedCoinsFromCtx]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshWallet();
  };

  const getStoreLogo = (store: StoreCoinItem['store']): string | undefined => {
    return store?.logo;
  };

  const getStoreName = (store: StoreCoinItem['store']): string => {
    return store?.name || 'Store';
  };

  const getStoreColor = (store: StoreCoinItem['store']): string => {
    return store?.color || Colors.gold;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.gold, Colors.nileBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.backButton}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Store Promo Coins</ThemedText>
          <View style={styles.headerPlaceholder} />
        </View>
        
        <View style={styles.headerInfo}>
          <ThemedText style={styles.headerSubtitle}>
            Earn & redeem exclusive store coins
          </ThemedText>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <View
              style={[styles.summaryCard, { backgroundColor: Colors.gold }]}
              accessibilityLabel={`Available promo coins: ${summary.totalAvailable}`}
              accessibilityRole="summary"
            >
              <Ionicons name="diamond" size={24} color={Colors.text.inverse} />
              <ThemedText style={styles.summaryValue}>
                {summary.totalAvailable}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Available</ThemedText>
            </View>

            <View
              style={[styles.summaryCard, { backgroundColor: Colors.info }]}
              accessibilityLabel={`Total coins earned: ${summary.totalEarned}`}
              accessibilityRole="summary"
            >
              <Ionicons name="trending-up" size={24} color={Colors.text.inverse} />
              <ThemedText style={styles.summaryValue}>
                {summary.totalEarned}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Earned</ThemedText>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View
              style={[styles.summaryCard, { backgroundColor: Colors.warning }]}
              accessibilityLabel={`Coins used: ${summary.totalUsed}`}
              accessibilityRole="summary"
            >
              <Ionicons name="cart" size={24} color={Colors.text.inverse} />
              <ThemedText style={styles.summaryValue}>
                {summary.totalUsed}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Used</ThemedText>
            </View>

            <View
              style={[styles.summaryCard, { backgroundColor: Colors.gold }]}
              accessibilityLabel={`Active stores: ${summary.storeCount}`}
              accessibilityRole="summary"
            >
              <Ionicons name="storefront" size={24} color={Colors.text.inverse} />
              <ThemedText style={styles.summaryValue}>
                {summary.storeCount}
              </ThemedText>
              <ThemedText style={styles.summaryLabel}>Stores</ThemedText>
            </View>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={Colors.gold} />
          <ThemedText style={styles.infoBannerText}>
            Store coins are store-specific and can only be used at the store where they were earned.
          </ThemedText>
        </View>

        {/* Store Coins List */}
        <View style={styles.storeListContainer}>
          <ThemedText style={styles.sectionTitle}>Your Store Coins</ThemedText>

          {loading && storeCoins.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ThemedText style={styles.loadingText}>Loading...</ThemedText>
            </View>
          ) : storeCoins.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="storefront-outline" size={64} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyTitle}>No Store Coins Yet</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Complete orders to earn store-specific coins!
              </ThemedText>
            </View>
          ) : (
            storeCoins.map((storeCoin) => (
              <View
                key={storeCoin._id}
                style={styles.storeCard}
                accessibilityLabel={`${getStoreName(storeCoin.store)}. Available: ${storeCoin.amount} coins. Earned: ${storeCoin.earned}, Used: ${storeCoin.used}${storeCoin.expiryDate ? `. Expires ${new Date(storeCoin.expiryDate).toLocaleDateString()}` : ''}`}
                accessibilityRole="summary"
              >
                <View style={styles.storeCardHeader}>
                  {getStoreLogo(storeCoin.store) ? (
                    <CachedImage
                      source={getStoreLogo(storeCoin.store)}
                      style={styles.storeLogo}
                    />
                  ) : (
                    <View style={[styles.storeLogo, styles.storeLogoPlaceholder]}>
                      <Ionicons name="storefront" size={24} color={Colors.gold} />
                    </View>
                  )}

                  <View style={styles.storeCardInfo}>
                    <ThemedText style={styles.storeName}>
                      {getStoreName(storeCoin.store)}
                    </ThemedText>
                    <ThemedText style={styles.storeLastEarned}>
                      {storeCoin.lastEarnedAt
                        ? `Last earned: ${new Date(storeCoin.lastEarnedAt).toLocaleDateString()}`
                        : 'No earnings yet'}
                    </ThemedText>
                  </View>

                  <View style={styles.coinBadge}>
                    <Ionicons name="diamond" size={16} color={colors.brand.goldBright} />
                    <ThemedText style={styles.coinBadgeText}>
                      {storeCoin.amount}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.storeCardStats}>
                  <View style={styles.statItem}>
                    <ThemedText style={styles.statValue}>
                      {storeCoin.earned}
                    </ThemedText>
                    <ThemedText style={styles.statLabel}>Earned</ThemedText>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <ThemedText style={styles.statValue}>
                      {storeCoin.used}
                    </ThemedText>
                    <ThemedText style={styles.statLabel}>Used</ThemedText>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <ThemedText style={styles.statValue}>
                      {storeCoin.transactions.length}
                    </ThemedText>
                    <ThemedText style={styles.statLabel}>Txns</ThemedText>
                  </View>
                </View>

                {storeCoin.expiryDate && (
                  <View style={styles.expiryContainer}>
                    <Ionicons name="time-outline" size={14} color={Colors.warning} />
                    <ThemedText style={styles.expiryText}>
                      Expires: {new Date(storeCoin.expiryDate).toLocaleDateString()}
                    </ThemedText>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
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
  headerPlaceholder: {
    width: 40,
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerSubtitle: {
    ...Typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  summaryContainer: {
    marginBottom: Spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  summaryValue: {
    ...Typography.h2,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginTop: Spacing.sm,
  },
  summaryLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: Spacing.xs,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.linen,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoBannerText: {
    flex: 1,
    ...Typography.bodySmall,
    color: Colors.nileBlue,
    lineHeight: 18,
  },
  storeListContainer: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.base,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.tertiary,
    marginTop: Spacing.base,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  storeCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  storeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  storeLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
  },
  storeLogoPlaceholder: {
    backgroundColor: colors.linen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeCardInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  storeName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  storeLastEarned: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.linen,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    gap: Spacing.xs,
  },
  coinBadgeText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.gold,
  },
  storeCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border.default,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.background.secondary,
    gap: 6,
  },
  expiryText: {
    ...Typography.bodySmall,
    color: Colors.warning,
    fontWeight: '500',
  },
});


export default withErrorBoundary(StorePromoCoinsPage, 'ProfileStorePromoCoins');
