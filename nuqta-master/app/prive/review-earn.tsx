// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Privé Review & Earn Page
 *
 * Dark-themed page for reviewing purchased items and earning Nuqta Coins.
 * Uses Privé luxury theme with gold accents.
 */

import React, { useState, useEffect, useCallback} from 'react';
import { catchSilent } from '@/utils/catchAndReport';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming} from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import priveApi, { PriveReviewableItem, PriveReviewDashboard } from '@/services/priveApi';
import { platformAlertSimple } from '@/utils/platformAlert';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';

// Shimmer skeleton block for loading state
const SkeletonBlock: React.FC<{ width: number | string; height: number; borderRadius?: number; style?: any }> = ({
  width, height, borderRadius = 4, style }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ), -1);
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: PRIVE_COLORS.border.primary, opacity },
        style,
      ]}
    />
  );
};

type FilterType = 'all' | 'store' | 'product';

function PriveReviewEarnPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<PriveReviewDashboard | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await priveApi.getReviewDashboard({ page: 1, limit: 20 });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setDashboard(response.data);
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to load review dashboard');
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
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(() => {
    fetchDashboard(true);
  }, [fetchDashboard]);

  const filteredItems = (dashboard?.items || []).filter(item =>
    filter === 'all' ? true : item.type === filter
  );

  const handleItemPress = useCallback((item: PriveReviewableItem) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); } catch (e) { catchSilent(e, 'ReviewEarn/haptics'); }
    router.push({
      pathname: '/ReviewPage',
      params: {
        productId: item.id,
        productTitle: item.name,
        productImage: item.image || '',
        storeId: item.storeId,
        cashbackAmount: item.coins.toString(),
        fromPrive: 'true' } });
  }, [router]);

  const renderMetricCard = (label: string, value: string | number, icon: string) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );

  const renderHeader = () => (
    <View>
      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        {renderMetricCard('Pending', dashboard?.metrics.pendingCount || 0, '⏳')}
        {renderMetricCard('Available', dashboard?.potentialEarnings || 0, '🪙')}
        {renderMetricCard('Lifetime', dashboard?.metrics.lifetimeEarned || 0, '🏆')}
      </View>

      {/* Tip Card */}
      <View style={styles.tipCard}>
        <Ionicons name="bulb-outline" size={22} color={PRIVE_COLORS.gold.primary} />
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Earn More Coins</Text>
          <Text style={styles.tipText}>
            Write detailed reviews (min {dashboard?.config.minCharCount || 50} chars) with photos to earn bonus coins. Quality reviews get approved faster.
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
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

      {/* Section Title */}
      {filteredItems.length > 0 && (
        <Text style={styles.sectionTitle}>Ready to Review ({filteredItems.length})</Text>
      )}
    </View>
  );

  const renderItem = useCallback(({ item }: { item: PriveReviewableItem }) => (
    <Pressable
      style={styles.itemCard}
      onPress={() => handleItemPress(item)}
     
    >
      {item.image ? (
        <CachedImage source={item.image} style={styles.itemImage} />
      ) : (
        <View style={[styles.itemImage, styles.itemImagePlaceholder]}>
          <Ionicons
            name={item.type === 'store' ? 'storefront' : 'cube'}
            size={24}
            color={PRIVE_COLORS.text.tertiary}
          />
        </View>
      )}
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.coinBadge}>
            <CachedImage
              source={BRAND.COIN_IMAGE}
              style={styles.coinIcon}
            />
            <Text style={styles.coinText}>+{item.coins}</Text>
          </View>
        </View>
        <Text style={styles.itemCategory}>{item.category}</Text>
        <View style={styles.itemFooter}>
          <View style={styles.itemMeta}>
            <Ionicons name="time-outline" size={13} color={PRIVE_COLORS.text.tertiary} />
            <Text style={styles.itemMetaText}>
              {item.type === 'store' ? item.visitDate : item.purchaseDate}
            </Text>
          </View>
          {item.isPriveEligible && (
            <View style={styles.priveBadge}>
              <Text style={styles.priveBadgeText}>Privé</Text>
            </View>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={PRIVE_COLORS.text.tertiary} />
    </Pressable>
  ), [handleItemPress]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={48} color={PRIVE_COLORS.text.tertiary} />
      <Text style={styles.emptyText}>No items to review</Text>
      <Text style={styles.emptySubtext}>Make purchases to unlock review opportunities</Text>
    </View>
  );

  // Loading state
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom + 80 }]}>
        <View style={styles.loadingContainer}>
          <View style={styles.metricsRow}>
            {[1, 2, 3].map(i => (
              <View key={i} style={styles.metricCard}>
                <SkeletonBlock width={24} height={24} borderRadius={12} style={{ marginBottom: 8 }} />
                <SkeletonBlock width={40} height={20} borderRadius={4} style={{ marginBottom: 4 }} />
                <SkeletonBlock width={56} height={14} borderRadius={4} />
              </View>
            ))}
          </View>
          <SkeletonBlock width="100%" height={80} borderRadius={PRIVE_RADIUS.lg} style={{ marginHorizontal: PRIVE_SPACING.lg, marginBottom: 16 }} />
          {[1, 2, 3].map(i => (
            <SkeletonBlock key={i} width="100%" height={88} borderRadius={PRIVE_RADIUS.lg} style={{ marginHorizontal: PRIVE_SPACING.lg, marginBottom: 12 }} />
          ))}
        </View>
      </View>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom + 80 }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={PRIVE_COLORS.status.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchDashboard()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={filteredItems}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PRIVE_COLORS.gold.primary}
            colors={[PRIVE_COLORS.gold.primary]}
          />
        }
        estimatedItemSize={100}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.primary },
  listContent: {
    paddingHorizontal: PRIVE_SPACING.lg },
  loadingContainer: {
    paddingTop: PRIVE_SPACING.lg },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: PRIVE_SPACING.xxl },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: PRIVE_COLORS.status.error,
    textAlign: 'center' },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: PRIVE_RADIUS.full },
  retryButtonText: {
    color: PRIVE_COLORS.text.inverse,
    fontSize: 14,
    fontWeight: '600' },

  // Metrics
  metricsRow: {
    flexDirection: 'row',
    gap: PRIVE_SPACING.sm,
    marginBottom: PRIVE_SPACING.lg,
    marginTop: PRIVE_SPACING.md },
  metricCard: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    paddingVertical: PRIVE_SPACING.md,
    paddingHorizontal: PRIVE_SPACING.sm,
    alignItems: 'center' },
  metricIcon: {
    fontSize: 20,
    marginBottom: 4 },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary },
  metricLabel: {
    fontSize: 11,
    color: PRIVE_COLORS.text.secondary,
    marginTop: 2 },

  // Tip Card
  tipCard: {
    flexDirection: 'row',
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted,
    padding: PRIVE_SPACING.lg,
    marginBottom: PRIVE_SPACING.lg,
    gap: PRIVE_SPACING.md,
    alignItems: 'flex-start' },
  tipContent: {
    flex: 1 },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIVE_COLORS.gold.primary,
    marginBottom: 4 },
  tipText: {
    fontSize: 12,
    color: PRIVE_COLORS.text.secondary,
    lineHeight: 18 },

  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    gap: PRIVE_SPACING.sm,
    marginBottom: PRIVE_SPACING.lg },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: PRIVE_RADIUS.full,
    backgroundColor: PRIVE_COLORS.background.card,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary },
  filterTabActive: {
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderColor: PRIVE_COLORS.gold.primary },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIVE_COLORS.text.secondary },
  filterTabTextActive: {
    color: PRIVE_COLORS.text.inverse },

  // Section Title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    marginBottom: PRIVE_SPACING.md },

  // Item Card
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: PRIVE_SPACING.md,
    backgroundColor: PRIVE_COLORS.background.card,
    borderRadius: PRIVE_RADIUS.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
    marginBottom: PRIVE_SPACING.md },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: PRIVE_RADIUS.md,
    marginRight: PRIVE_SPACING.md },
  itemImagePlaceholder: {
    backgroundColor: PRIVE_COLORS.background.elevated,
    justifyContent: 'center',
    alignItems: 'center' },
  itemContent: {
    flex: 1 },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4 },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: PRIVE_COLORS.text.primary,
    flex: 1,
    marginRight: 8 },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: PRIVE_COLORS.transparent.gold15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: PRIVE_RADIUS.full },
  coinIcon: {
    width: 14,
    height: 14 },
  coinText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary },
  itemCategory: {
    fontSize: 12,
    color: PRIVE_COLORS.text.tertiary,
    marginBottom: 6 },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between' },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 },
  itemMetaText: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary },
  priveBadge: {
    backgroundColor: PRIVE_COLORS.transparent.gold20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: PRIVE_RADIUS.sm,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.goldMuted },
  priveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60 },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: PRIVE_COLORS.text.secondary },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 20 } });

export default withErrorBoundary(PriveReviewEarnPage, 'PriveReviewEarn');
