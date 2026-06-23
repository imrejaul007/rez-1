import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { FormPageSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import gamificationApi, { ReviewableItem } from '@/services/gamificationApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const reviewTips = [
  { icon: 'star', tip: 'Rate honestly from 1-5 stars' },
  { icon: 'camera', tip: 'Add photos to earn extra coins' },
  { icon: 'create', tip: 'Write at least 50 characters' },
  { icon: 'checkmark-circle', tip: 'Helpful reviews earn bonuses' },
];

function ReviewEarnPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'store' | 'product'>('all');

  // API state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewableItems, setReviewableItems] = useState<ReviewableItem[]>([]);
  const [potentialEarnings, setPotentialEarnings] = useState(0);

  // Fetch reviewable items from API
  const fetchReviewableItems = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await gamificationApi.getReviewableItems();

      if (response.success && response.data) {
        if (!isMounted()) return;
        setReviewableItems(response.data.items);
        if (!isMounted()) return;
        setPotentialEarnings(response.data.potentialEarnings);
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to load reviewable items');
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

  // Initial fetch
  useEffect(() => {
    fetchReviewableItems();
  }, [fetchReviewableItems]);

  const onRefresh = useCallback(() => {
    fetchReviewableItems(true);
  }, [fetchReviewableItems]);

  const filteredItems = reviewableItems.filter(item =>
    filter === 'all' ? true : item.type === filter
  );

  const handleWriteReview = (item: ReviewableItem) => {
    router.push({
      pathname: '/ReviewPage',
      params: {
        productId: item.id,
        productTitle: item.name,
        productImage: item.image,
        cashbackAmount: item.coins.toString(),
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Write & Earn</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.warning]} />
        }
      >
        {/* Loading State */}
        {loading && !refreshing && (
          <FormPageSkeleton />
        )}

        {/* Error State */}
        {error && !loading && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchReviewableItems()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Hero Section */}
        {!loading && !error && (
          <LinearGradient
            colors={[colors.tint.amberLight, colors.warningScale[200]]}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconContainer}>
                <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 32, height: 32 }} />
              </View>
              <View style={styles.heroText}>
                <Text style={styles.heroTitle}>Earn 25-100 Coins</Text>
                <Text style={styles.heroSubtitle}>Per quality review</Text>
              </View>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{reviewableItems.length}</Text>
                <Text style={styles.heroStatLabel}>Pending</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 18, height: 18 }} />
                  <Text style={styles.heroStatValue}>{potentialEarnings}</Text>
                </View>
                <Text style={styles.heroStatLabel}>Potential</Text>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Tips Section */}
        {!loading && !error && (
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Review Tips</Text>
          <View style={styles.tipsGrid}>
            {reviewTips.map((tip, idx) => (
              <View key={idx} style={styles.tipItem}>
                <Ionicons name={tip.icon as any} size={16} color={Colors.warning} />
                <Text style={styles.tipText}>{tip.tip}</Text>
              </View>
            ))}
          </View>
        </View>
        )}

        {/* Filter Tabs */}
        {!loading && !error && (
        <View style={styles.filterTabs}>
          {(['all', 'store', 'product'] as const).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
                {tab === 'all' ? 'All' : tab === 'store' ? 'Stores' : 'Products'}
              </Text>
            </Pressable>
          ))}
        </View>
        )}

        {/* Empty State */}
        {!loading && !error && filteredItems.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color={Colors.text.tertiary} />
            <Text style={styles.emptyText}>No items to review</Text>
            <Text style={styles.emptySubtext}>Make purchases to unlock review opportunities</Text>
          </View>
        )}

        {/* Reviewable Items */}
        {!loading && !error && filteredItems.length > 0 && (
        <View style={styles.itemsList}>
          <Text style={styles.sectionTitle}>Ready to Review ({filteredItems.length})</Text>

          {filteredItems.map((item) => (
            <Pressable
              key={item.id}
              style={styles.itemCard}
              onPress={() => handleWriteReview(item)}
            >
              {item.image ? (
                <CachedImage source={item.image} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
                  <Ionicons name={item.type === 'store' ? 'storefront' : 'cube'} size={24} color={Colors.text.tertiary} />
                </View>
              )}
              <View style={styles.itemContent}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.coinBadge}>
                    <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 14, height: 14 }} />
                    <Text style={styles.coinText}>+{item.coins}</Text>
                  </View>
                </View>
                <Text style={styles.itemCategory}>{item.category}</Text>
                <View style={styles.itemFooter}>
                  <View style={styles.itemMeta}>
                    <Ionicons name="time-outline" size={14} color={Colors.text.tertiary} />
                    <Text style={styles.itemMetaText}>
                      {item.type === 'store' ? item.visitDate : item.purchaseDate}
                    </Text>
                  </View>
                  {item.type === 'store' && item.hasReceipt && (
                    <View style={styles.receiptBadge}>
                      <Ionicons name="receipt-outline" size={12} color={Colors.success} />
                      <Text style={styles.receiptText}>Receipt</Text>
                    </View>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
            </Pressable>
          ))}
        </View>
        )}

        {/* Bottom CTA */}
        {!loading && !error && (
        <View style={styles.bottomSection}>
          <LinearGradient
            colors={['#E0F2FE', colors.tint.blueLight]}
            style={styles.bottomCard}
          >
            <Ionicons name="information-circle" size={24} color={Colors.info} />
            <View style={styles.bottomCardText}>
              <Text style={styles.bottomCardTitle}>More Ways to Earn</Text>
              <Text style={styles.bottomCardSubtitle}>
                Visit partner stores & make purchases to unlock more review opportunities
              </Text>
            </View>
          </LinearGradient>
        </View>
        )}

        <View style={{ height: insets.bottom + 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    backgroundColor: Colors.warning,
    borderRadius: BorderRadius.xl,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: Spacing.md,
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  emptySubtext: {
    marginTop: Spacing.xs,
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: 50,
    paddingBottom: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  heroCard: {
    margin: Spacing.base,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.warning + '33',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  heroText: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.brand.amberDark,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    ...Typography.body,
    color: colors.brand.amberDeep,
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    ...Typography.h3,
    fontWeight: '700',
    color: colors.brand.amberDark,
  },
  heroStatLabel: {
    ...Typography.bodySmall,
    color: colors.brand.amberDeep,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: colors.warningScale[700],
    opacity: 0.3,
  },
  tipsSection: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  tipsTitle: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  tipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  tipText: {
    ...Typography.bodySmall,
    color: colors.brand.amberDark,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  filterTab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
  },
  filterTabActive: {
    backgroundColor: Colors.warning,
  },
  filterTabText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.tertiary,
  },
  filterTabTextActive: {
    color: Colors.text.inverse,
  },
  itemsList: {
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.background.secondary,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.md,
  },
  itemImagePlaceholder: {
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  itemName: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    flex: 1,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  coinText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: colors.brand.amberDeep,
  },
  itemCategory: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  itemMetaText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  receiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  receiptText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.success,
  },
  bottomSection: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.sm,
  },
  bottomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  bottomCardText: {
    flex: 1,
  },
  bottomCardTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: Spacing.xs,
  },
  bottomCardSubtitle: {
    ...Typography.bodySmall,
    color: Colors.info,
    lineHeight: 18,
  },
});

export default withErrorBoundary(ReviewEarnPage, 'ExploreReviewEarn');
