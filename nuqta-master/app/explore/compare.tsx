import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import exploreApi, { FeaturedComparison } from '@/services/exploreApi';
import { useIsMounted } from '@/hooks/useIsMounted';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';

const { width } = Dimensions.get('window');

interface ComparisonItem {
  id: string;
  name: string;
  category: string;
  stores: {
    id: string;
    name: string;
    logo?: string;
    cashbackRate: number;
    rating?: number;
    price?: number;
  }[];
  bestDeal?: string;
}

const ComparePage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [comparisons, setComparisons] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComparisons = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch featured comparison
      const response = await exploreApi.getFeaturedComparison();

      if (response.success && response.data?.comparison) {
        const comp = response.data.comparison;
        // Create a list with the featured comparison
        const comparisonList: ComparisonItem[] = [{
          id: comp.id,
          name: comp.name,
          category: 'Featured',
          stores: comp.stores.map(s => ({
            id: s.id,
            name: s.name,
            logo: s.logo,
            cashbackRate: s.cashbackRate || 0,
            rating: typeof s.ratings === 'object' ? s.ratings?.average : s.ratings,
          })),
          bestDeal: comp.stores.length > 0 ? comp.stores[0].name : undefined,
        }];
        if (!isMounted()) return;
        setComparisons(comparisonList);
      } else {
        if (!isMounted()) return;
        setComparisons([]);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchComparisons();
  }, [fetchComparisons]);

  const onRefresh = useCallback(() => {
    fetchComparisons(true);
  }, [fetchComparisons]);

  const navigateToStore = (storeId: string) => {
    router.push(`/MainStorePage?storeId=${storeId}` as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Compare & Decide</Text>
            <Text style={styles.headerSubtitle}>Find the best deals across stores</Text>
          </View>
        </View>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={Colors.info} />
          <Text style={styles.infoText}>
            Compare prices and cashback rates to get the best value
          </Text>
        </View>

        {/* Comparisons List */}
        <ScrollView
          style={styles.comparisonsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.comparisonsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.gold]} />
          }
        >
          {/* Loading State */}
          {loading && !refreshing && (
            <CardGridSkeleton />
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle" size={48} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={onRefresh}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Empty State */}
          {!loading && !error && comparisons.length === 0 && (
            <View style={styles.centerContainer}>
              <Ionicons name="git-compare-outline" size={48} color={Colors.text.tertiary} />
              <Text style={styles.emptyTitle}>No Comparisons Available</Text>
              <Text style={styles.emptySubtext}>
                Start shopping to see price comparisons across stores
              </Text>
            </View>
          )}

          {/* Comparison Cards */}
          {!loading && !error && comparisons.map((comparison) => (
            <View key={comparison.id} style={styles.comparisonCard}>
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.comparisonName}>{comparison.name}</Text>
                  <Text style={styles.comparisonCategory}>{comparison.category}</Text>
                </View>
                {comparison.bestDeal && (
                  <View style={styles.bestDealBadge}>
                    <Ionicons name="trophy" size={12} color={Colors.warning} />
                    <Text style={styles.bestDealText}>Best: {comparison.bestDeal}</Text>
                  </View>
                )}
              </View>

              {/* Stores Table */}
              <View style={styles.storesTable}>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { flex: 2 }]}>Store</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Cashback</Text>
                  <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'right' }]}>Rating</Text>
                </View>

                {/* Store Rows */}
                {comparison.stores.map((store, index) => (
                  <Pressable
                    key={store.id}
                    style={[
                      styles.storeRow,
                      index === 0 && styles.storeRowBest,
                    ]}
                    onPress={() => navigateToStore(store.id)}
                  >
                    <View style={[styles.storeCell, { flex: 2 }]}>
                      {store.logo ? (
                        <CachedImage source={store.logo} style={styles.storeLogo} />
                      ) : (
                        <View style={[styles.storeLogo, styles.storeLogoPlaceholder]}>
                          <Ionicons name="storefront" size={16} color={Colors.text.tertiary} />
                        </View>
                      )}
                      <Text style={styles.storeName}>{store.name}</Text>
                      {index === 0 && (
                        <View style={styles.topBadge}>
                          <Ionicons name="checkmark-circle" size={14} color={Colors.gold} />
                        </View>
                      )}
                    </View>
                    <View style={[styles.storeCell, { flex: 1, justifyContent: 'center' }]}>
                      <View style={[
                        styles.cashbackBadge,
                        index === 0 && styles.cashbackBadgeBest,
                      ]}>
                        <Text style={[
                          styles.cashbackText,
                          index === 0 && styles.cashbackTextBest,
                        ]}>
                          {store.cashbackRate > 0 ? `${store.cashbackRate}%` : 'N/A'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.storeCell, { flex: 1, justifyContent: 'flex-end' }]}>
                      {store.rating ? (
                        <View style={styles.ratingContainer}>
                          <Ionicons name="star" size={14} color={Colors.warning} />
                          <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
                        </View>
                      ) : (
                        <Text style={styles.naText}>N/A</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Action Button */}
              <Pressable
                style={styles.viewStoreButton}
                onPress={() => comparison.stores[0] && navigateToStore(comparison.stores[0].id)}
              >
                <Text style={styles.viewStoreText}>View Best Deal</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.text.inverse} />
              </Pressable>
            </View>
          ))}

          {/* How It Works Section */}
          <View style={styles.howItWorksCard}>
            <Text style={styles.howItWorksTitle}>How Compare Works</Text>
            <View style={styles.howItWorksItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>We find the same product</Text>
                <Text style={styles.stepDesc}>Across multiple stores near you</Text>
              </View>
            </View>
            <View style={styles.howItWorksItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Compare cashback rates</Text>
                <Text style={styles.stepDesc}>See which store gives you more back</Text>
              </View>
            </View>
            <View style={styles.howItWorksItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Make the smart choice</Text>
                <Text style={styles.stepDesc}>Shop where you save the most</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
    gap: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.infoScale[50],
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: 10,
  },
  infoText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.info,
    flex: 1,
  },
  comparisonsList: {
    flex: 1,
  },
  comparisonsContainer: {
    padding: Spacing.base,
    minHeight: 300,
    paddingBottom: 120,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    backgroundColor: Colors.gold,
    borderRadius: BorderRadius.xl,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.sm,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  comparisonCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  comparisonName: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  comparisonCategory: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  bestDealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  bestDealText: {
    ...Typography.caption,
    fontWeight: '600',
    color: colors.brand.amberDeep,
  },
  storesTable: {
    marginBottom: Spacing.base,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  tableHeaderText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  storeRowBest: {
    backgroundColor: Colors.successScale[50],
    marginHorizontal: -Spacing.base,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.sm,
    borderBottomWidth: 0,
  },
  storeCell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeLogo: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
  },
  storeLogoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
    marginLeft: 10,
    flex: 1,
  },
  topBadge: {
    marginLeft: 4,
  },
  cashbackBadge: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  cashbackBadgeBest: {
    backgroundColor: Colors.gold,
  },
  cashbackText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  cashbackTextBest: {
    color: Colors.text.inverse,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  naText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  viewStoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gold,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  viewStoreText: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  howItWorksCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  howItWorksTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.nileBlue,
    marginBottom: Spacing.base,
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.successScale[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.gold,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  stepDesc: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
});

export default withErrorBoundary(ComparePage, 'ExploreCompare');
