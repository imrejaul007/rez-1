// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Lock Price Deals - Browse & Lock Deals
 *
 * Users can browse deals, lock them by paying a deposit (e.g., 10%),
 * earn rewards on lock AND pickup with an earnings multiplier.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import CoinIcon from '@/components/ui/CoinIcon';
import lockDealApi, { LockPriceDeal, LockDealFilters } from '@/services/lockDealApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;


type FilterTab = 'all' | 'featured' | 'ending_soon';

const LockDealsPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [deals, setDeals] = useState<LockPriceDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchDeals(true);
  }, [activeTab, authLoading, isAuthenticated]);

  const fetchDeals = async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setPage(1);
      }

      const filters: LockDealFilters = {
        page: reset ? 1 : page,
        limit: 20,
      };

      if (activeTab === 'featured') {
        filters.featured = true;
      }

      const response = await lockDealApi.getDeals(filters);

      if (response?.data) {
        const newDeals = Array.isArray(response.data) ? response.data : response.data.data || [];
        const pagination = response.data?.pagination || response.meta?.pagination;

        if (reset) {
          // For "ending_soon", sort by validUntil
          if (activeTab === 'ending_soon') {
            newDeals.sort((a: LockPriceDeal, b: LockPriceDeal) =>
              new Date(a.validUntil).getTime() - new Date(b.validUntil).getTime()
            );
          }
          if (!isMounted()) return;
          setDeals(newDeals);
        } else {
          if (!isMounted()) return;
          setDeals(prev => [...prev, ...newDeals]);
        }

        if (!isMounted()) return;
        setTotal(pagination?.total || 0);
        if (!isMounted()) return;
        setHasMore(pagination ? pagination.page < pagination.pages : false);
        if (!isMounted()) return;
        setPage(reset ? 2 : page + 1);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchDeals(true);
  }, [activeTab]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchDeals(false);
    }
  }, [isLoading, hasMore, page]);

  const handleDealPress = useCallback((deal: LockPriceDeal) => {
    router.push(`/lock-deals/${deal._id}` as any);
  }, [router]);

  const handleMyLocksPress = () => {
    router.push('/lock-deals/my-locks' as any);
  };

  const getDaysRemaining = (validUntil: string) => {
    const diff = new Date(validUntil).getTime() - Date.now();
    const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    return days;
  };

  const getDiscountPercent = (deal: LockPriceDeal) => {
    if (deal.discountPercent) return deal.discountPercent;
    if (deal.originalPrice <= 0) return 0;
    return Math.round(((deal.originalPrice - deal.lockedPrice) / deal.originalPrice) * 100);
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case 'INR': return '\u20B9';
      case 'AED': return 'AED ';
      case 'USD': return '$';
      default: return '\u20B9';
    }
  };

  const renderDealCard = useCallback(({ item: deal }: { item: LockPriceDeal }) => {
    const daysLeft = getDaysRemaining(deal.validUntil);
    const discount = getDiscountPercent(deal);
    const currSymbol = getCurrencySymbol(deal.currency);
    const totalReward = (deal.lockReward.amount + deal.pickupReward.amount) * deal.earningsMultiplier;
    const storeName = typeof deal.store === 'object' ? deal.store.name : deal.storeName;

    return (
      <Pressable
        style={styles.dealCard}
        onPress={() => handleDealPress(deal)}
       
      >
        {/* Deal Image */}
        <View style={styles.imageContainer}>
          <CachedImage
            source={deal.image}
            style={styles.dealImage}
            contentFit="cover"
          />
          {/* Discount Badge */}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
          {/* Featured Badge */}
          {deal.isFeatured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={10} color={Colors.text.inverse} />
            </View>
          )}
          {/* Sold Out Overlay */}
          {deal.isSoldOut && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>SOLD OUT</Text>
            </View>
          )}
        </View>

        {/* Deal Info */}
        <View style={styles.dealInfo}>
          <Text style={styles.dealTitle} numberOfLines={2}>{deal.title}</Text>
          <Text style={styles.storeName} numberOfLines={1}>{storeName}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.lockedPrice}>{currSymbol}{deal.lockedPrice}</Text>
            <Text style={styles.originalPrice}>{currSymbol}{deal.originalPrice}</Text>
          </View>

          {/* Deposit Label */}
          <View style={styles.depositRow}>
            <Ionicons name="lock-closed" size={12} color={Colors.warning} />
            <Text style={styles.depositText}>
              Lock with {currSymbol}{deal.depositAmount} ({deal.depositPercent}%)
            </Text>
          </View>

          {/* Earnings */}
          <View style={styles.earningsRow}>
            <View style={styles.earningsBadge}>
              <CoinIcon size={12} />
              <Text style={styles.earningsText}>{totalReward} coins</Text>
            </View>
            {deal.earningsMultiplier > 1 && (
              <View style={styles.multiplierBadge}>
                <Text style={styles.multiplierText}>{deal.earningsMultiplier}x</Text>
              </View>
            )}
          </View>

          {/* Timer */}
          {daysLeft <= 7 && daysLeft > 0 && (
            <View style={styles.timerRow}>
              <Ionicons name="time-outline" size={12} color={Colors.error} />
              <Text style={styles.timerText}>{daysLeft}d left</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  }, [handleDealPress]);

  const renderHeader = () => (
    <View>
      {/* Hero Banner */}
      <LinearGradient
        colors={[colors.brand.navyDark, colors.nileBlue]}
        style={styles.heroBanner}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroTextSection}>
            <Text style={styles.heroTitle}>Lock Price Deals</Text>
            <Text style={styles.heroSubtitle}>
              Lock with just 10% deposit. Earn on lock + earn on pickup.
            </Text>
            <View style={styles.heroFeatures}>
              <View style={styles.heroFeature}>
                <Ionicons name="lock-closed" size={14} color={Colors.gold} />
                <Text style={styles.heroFeatureText}>Lock at 10%</Text>
              </View>
              <View style={styles.heroFeature}>
                <Ionicons name="flash" size={14} color={Colors.gold} />
                <Text style={styles.heroFeatureText}>Double Earnings</Text>
              </View>
              <View style={styles.heroFeature}>
                <Ionicons name="gift" size={14} color={Colors.gold} />
                <Text style={styles.heroFeatureText}>Pickup Bonus</Text>
              </View>
            </View>
          </View>
          <Ionicons name="pricetag" size={48} color="rgba(255,205,87,0.3)" />
        </View>
      </LinearGradient>

      {/* My Locks CTA */}
      <Pressable style={styles.myLocksCta} onPress={handleMyLocksPress}>
        <View style={styles.myLocksLeft}>
          <Ionicons name="lock-open" size={20} color={Colors.nileBlue} />
          <Text style={styles.myLocksText}>My Locked Deals</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
      </Pressable>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'all' as FilterTab, label: 'All Deals' },
          { key: 'featured' as FilterTab, label: 'Featured' },
          { key: 'ending_soon' as FilterTab, label: 'Ending Soon' },
        ].map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Results count */}
      {!isLoading && (
        <Text style={styles.resultCount}>
          {total} deal{total !== 1 ? 's' : ''} available
        </Text>
      )}
    </View>
  );

  if (isLoading && deals.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
          </Pressable>
          <Text style={styles.headerTitle}>Lock Price Deals</Text>
          <View style={{ width: 40 }} />
        </View>
        <CardGridSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
        </Pressable>
        <Text style={styles.headerTitle}>Lock Price Deals</Text>
        <Pressable onPress={handleMyLocksPress} style={styles.backButton}>
          <Ionicons name="lock-open-outline" size={22} color={Colors.nileBlue} />
        </Pressable>
      </View>

      <FlashList
        data={deals}
        renderItem={renderDealCard}
        keyExtractor={(item) => item._id}
          estimatedItemSize={220}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={48} color={Colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No deals available</Text>
            <Text style={styles.emptySubtitle}>Check back soon for exciting lock price deals!</Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={Colors.success} />
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  listContent: {
    paddingBottom: 120,
  },

  // Hero Banner
  heroBanner: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
  },
  heroTextSection: {
    flex: 1,
    marginRight: Spacing.md,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.md,
    lineHeight: 18,
  },
  heroFeatures: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  heroFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  heroFeatureText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.gold,
  },

  // My Locks CTA
  myLocksCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    padding: 14,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  myLocksLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myLocksText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
    gap: Spacing.sm,
  },
  tab: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  tabActive: {
    backgroundColor: Colors.nileBlue,
    borderColor: Colors.nileBlue,
  },
  tabText: {
    ...Typography.bodySmall,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  tabTextActive: {
    color: Colors.text.inverse,
  },

  // Results
  resultCount: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },

  // Deal Grid
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.md,
  },

  // Deal Card
  dealCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  imageContainer: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    position: 'relative',
  },
  dealImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.warning,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.text.inverse,
    letterSpacing: 1,
  },

  // Deal Info
  dealInfo: {
    padding: 10,
  },
  dealTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.primary,
    lineHeight: 18,
    marginBottom: 2,
  },
  storeName: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  lockedPrice: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  originalPrice: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  depositRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 6,
  },
  depositText: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.warning,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  earningsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.successScale[50],
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  earningsText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.success,
  },
  multiplierBadge: {
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  multiplierText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.warning,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  timerText: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.error,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Footer
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export default withErrorBoundary(LockDealsPage, 'LockDealsIndex');
