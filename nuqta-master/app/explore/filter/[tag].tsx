import { withErrorBoundary } from '@/utils/withErrorBoundary';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import exploreApi, { ExploreStore } from '@/services/exploreApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

// Tag metadata for display
const tagMeta: Record<string, { label: string; emoji: string; description: string; color: string; gradient: [string, string] }> = {
  halal: { label: 'Halal', emoji: '☪️', description: 'Halal certified stores & services', color: colors.successScale[700], gradient: [colors.successScale[700], '#047857'] },
  vegan: { label: 'Vegan', emoji: '🌱', description: 'Vegan-friendly stores & products', color: colors.brand.greenDark, gradient: [colors.brand.greenDark, colors.successScale[700]] },
  veg: { label: 'Vegetarian', emoji: '🥗', description: 'Vegetarian-friendly stores', color: '#65A30D', gradient: ['#65A30D', '#4D7C0F'] },
  adult: { label: 'Adult', emoji: '🔞', description: '18+ stores & services', color: colors.error, gradient: [colors.error, colors.errorScale[700]] },
  occasion: { label: 'Occasion', emoji: '🎉', description: 'Gifts, events & celebrations', color: colors.warningScale[700], gradient: [colors.warningScale[700], colors.brand.amberDeep] },
};

const filterChips = [
  { id: 'all', label: 'All' },
  { id: 'topRated', label: 'Top Rated' },
  { id: 'highCashback', label: 'High Cashback' },
  { id: 'nearby', label: 'Nearby' },
];

const TagFilterPage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { tag } = useLocalSearchParams();
  const tagId = tag as string;
  const meta = tagMeta[tagId] || { label: tagId, emoji: '🏷️', description: 'Browse stores', color: Colors.nileBlue, gradient: [Colors.nileBlue, '#2d5a7b'] as [string, string] };

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stores, setStores] = useState<ExploreStore[]>([]);

  const fetchStores = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await exploreApi.getStoresByTag(tagId, { limit: 30 });

      if (response.success && response.data) {
        let fetchedStores = response.data.stores || [];

        // Apply local sorting
        if (selectedFilter === 'topRated') {
          fetchedStores = [...fetchedStores].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (selectedFilter === 'highCashback') {
          fetchedStores = [...fetchedStores].sort((a, b) => {
            const aRate = parseInt(a.cashback?.replace('%', '') || '0');
            const bRate = parseInt(b.cashback?.replace('%', '') || '0');
            return bRate - aRate;
          });
        }

        if (!isMounted()) return;
        setStores(fetchedStores);
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to fetch stores');
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
  }, [tagId, selectedFilter]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const onRefresh = useCallback(() => {
    fetchStores(true);
  }, [fetchStores]);

  const maxCashback = stores.reduce((max, store) => {
    const val = parseInt(store.cashback?.replace('%', '') || '0');
    return val > max ? val : max;
  }, 0);

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={meta.color} />

        {/* Header with back button */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.nileBlue} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>{meta.emoji}</Text>
            <Text style={styles.headerTitle}>{meta.label}</Text>
          </View>
          <Pressable
            style={styles.searchButton}
            onPress={() => navigateTo('/explore/search')}
          >
            <Ionicons name="search" size={22} color={Colors.nileBlue} />
          </Pressable>
        </View>

        {/* Hero Banner */}
        <LinearGradient
          colors={meta.gradient}
          style={styles.heroBanner}
        >
          <Text style={styles.heroEmoji}>{meta.emoji}</Text>
          <Text style={styles.heroTitle}>{meta.label}</Text>
          <Text style={styles.heroDescription}>{meta.description}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{stores.length}</Text>
              <Text style={styles.heroStatLabel}>Stores</Text>
            </View>
            {maxCashback > 0 && (
              <>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>Up to {maxCashback}%</Text>
                  <Text style={styles.heroStatLabel}>Cashback</Text>
                </View>
              </>
            )}
          </View>
        </LinearGradient>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContainer}
        >
          {filterChips.map((filter) => (
            <Pressable
              key={filter.id}
              style={[
                styles.filterChip,
                selectedFilter === filter.id && [styles.filterChipActive, { backgroundColor: meta.color }],
              ]}
              onPress={() => setSelectedFilter(filter.id)}
            >
              <Text
                style={[
                  styles.filterLabel,
                  selectedFilter === filter.id && styles.filterLabelActive,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Results Count */}
        {!loading && !error && stores.length > 0 && (
          <Text style={styles.resultsCount}>
            {stores.length} store{stores.length !== 1 ? 's' : ''} found
          </Text>
        )}

        {/* Stores List */}
        <ScrollView
          style={styles.storesList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.storesContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[meta.color]} />
          }
        >
          {/* Loading */}
          {loading && !refreshing && (
            <CardGridSkeleton />
          )}

          {/* Error */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={[styles.retryButton, { backgroundColor: meta.color }]} onPress={() => fetchStores()}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </Pressable>
            </View>
          )}

          {/* Empty State */}
          {!loading && !error && stores.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{meta.emoji}</Text>
              <Text style={styles.emptyText}>No {meta.label.toLowerCase()} stores found</Text>
              <Text style={styles.emptySubtext}>
                We're working on bringing more {meta.label.toLowerCase()} options near you. Check back soon!
              </Text>
              <Pressable style={[styles.emptyButton, { backgroundColor: meta.color }]} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
                <Text style={styles.emptyButtonText}>Explore Other Options</Text>
              </Pressable>
            </View>
          )}

          {/* Store Cards */}
          {!loading && !error && stores.map((store) => (
            <Pressable
              key={store.id}
              style={styles.storeCard}
              onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)}
            >
              {store.image ? (
                <CachedImage source={store.image} style={styles.storeImage} />
              ) : store.logo ? (
                <CachedImage source={store.logo} style={styles.storeImage} />
              ) : (
                <View style={[styles.storeImage, styles.storeImagePlaceholder, { backgroundColor: meta.color }]}>
                  <Text style={styles.storeInitial}>{store.name?.charAt(0) || 'S'}</Text>
                </View>
              )}

              <View style={styles.storeContent}>
                <View style={styles.storeNameRow}>
                  <Text style={styles.storeName} numberOfLines={1}>{store.name}</Text>
                  {store.isVerified && (
                    <Ionicons name="checkmark-circle" size={16} color={meta.color} />
                  )}
                </View>

                {store.rating != null && store.rating > 0 && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color={Colors.warning} />
                    <Text style={styles.ratingText}>{store.rating}</Text>
                    {store.reviews != null && store.reviews > 0 && (
                      <Text style={styles.reviewsText}>({store.reviews})</Text>
                    )}
                  </View>
                )}

                {(store.offer || store.cashback) && (
                  <View style={styles.offerBadge}>
                    <Ionicons name="pricetag" size={12} color={colors.brand.amberDark} />
                    <Text style={styles.offerText}>{store.offer || `${store.cashback} Cashback`}</Text>
                  </View>
                )}

                <View style={styles.storeFooter}>
                  {store.distance && (
                    <View style={styles.infoItem}>
                      <Ionicons name="location" size={13} color={Colors.text.tertiary} />
                      <Text style={styles.infoText}>{store.distance}</Text>
                    </View>
                  )}
                  {store.isOpen != null && (
                    <View style={styles.infoItem}>
                      <View style={[styles.statusDot, { backgroundColor: store.isOpen ? Colors.success : Colors.error }]} />
                      <Text style={[styles.infoText, { color: store.isOpen ? Colors.success : Colors.error }]}>
                        {store.isOpen ? 'Open' : 'Closed'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Pressable
                style={[styles.visitButton, { backgroundColor: meta.color }]}
                onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)}
              >
                <Text style={styles.visitText}>Visit</Text>
              </Pressable>
            </Pressable>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Floating Map Button */}
        <Pressable
          style={styles.mapButton}
          onPress={() => navigateTo('/explore/map')}
        >
          <LinearGradient
            colors={[meta.color, Colors.nileBlue]}
            style={styles.mapButtonGradient}
          >
            <Ionicons name="map" size={20} color={Colors.text.inverse} />
            <Text style={styles.mapButtonText}>Map View</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerEmoji: {
    fontSize: 22,
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBanner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 40,
    marginBottom: Spacing.sm,
  },
  heroTitle: {
    ...Typography.h2,
    fontWeight: '800',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  heroDescription: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: Spacing.base,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.base,
  },
  heroStat: {
    alignItems: 'center',
  },
  heroStatValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  heroStatLabel: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterScroll: {
    maxHeight: 52,
  },
  filterContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    marginRight: Spacing.xs,
  },
  filterChipActive: {
    backgroundColor: Colors.nileBlue,
  },
  filterLabel: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  filterLabelActive: {
    color: Colors.text.inverse,
    fontWeight: '600',
  },
  resultsCount: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xs,
  },
  storesList: {
    flex: 1,
  },
  storesContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    minHeight: 200,
    paddingBottom: 120,
  },
  loadingContainer: {
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  errorText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  retryButton: {
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: Spacing.sm,
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  emptyButtonText: {
    color: Colors.text.inverse,
    ...Typography.body,
    fontWeight: '600',
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  storeImage: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
  },
  storeImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInitial: {
    ...Typography.h1,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  storeContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeName: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.nileBlue,
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  ratingText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.warning,
  },
  reviewsText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  offerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: Spacing.xs,
  },
  offerText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: colors.brand.amberDark,
  },
  storeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 14,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  infoText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  visitButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
  },
  visitText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  mapButton: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.strong,
  },
  mapButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    gap: Spacing.sm,
  },
  mapButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(TagFilterPage, 'ExploreFilterTag');
