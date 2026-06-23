// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Privé Offers — All offers listing page
 * Accessible from "See All" in PriveOffersCarousel
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PRIVE_COLORS, PRIVE_SPACING, PRIVE_RADIUS } from '@/components/prive/priveTheme';
import priveApi, { PriveOffer } from '@/services/priveApi';
import { CardGridSkeleton } from '@/components/skeletons';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

function PriveOffersScreen() {
  const router = useRouter();
  const [offers, setOffers] = useState<PriveOffer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchOffers = useCallback(async (pageNum: number, refresh = false) => {
    try {
      const response = await priveApi.getOffers({ page: pageNum, limit: 20 });
      if (response.success && response.data) {
        const newOffers = response.data.offers || [];
        if (refresh) {
          setOffers(newOffers);
        } else {
          setOffers(prev => [...prev, ...newOffers]);
        }
        setHasMore(pageNum < (response.data.pagination?.pages || 1));
        setError(null);
      }
    } catch (err) {
      if (!isMounted()) return;
      setError('Failed to load offers');
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
      if (!isMounted()) return;
      setIsRefreshing(false);
    }
  }, []);
  const isMounted = useIsMounted();

  useEffect(() => {
    fetchOffers(1, true);
  }, [fetchOffers]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(1);
    fetchOffers(1, true);
  }, [fetchOffers]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOffers(nextPage);
  }, [hasMore, isLoading, page, fetchOffers]);

  const renderOffer = useCallback(({ item }: { item: PriveOffer }) => (
    <Pressable style={styles.offerCard} onPress={() => router.push(`/prive-offers/${item.id}` as any)}>
      <View style={styles.offerHeader}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandText}>{item.brand}</Text>
        </View>
        {item.isExclusive && (
          <View style={styles.exclusiveBadge}>
            <Ionicons name="diamond" size={10} color={PRIVE_COLORS.gold.primary} />
            <Text style={styles.exclusiveText}>Exclusive</Text>
          </View>
        )}
      </View>
      <Text style={styles.offerTitle}>{item.title}</Text>
      <Text style={styles.offerSubtitle}>{item.subtitle}</Text>
      <View style={styles.offerFooter}>
        <Text style={styles.rewardText}>{item.reward}</Text>
        <Text style={styles.expiryText}>{item.expiresIn}</Text>
      </View>
      {item.tierRequired && item.tierRequired !== 'none' && (
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{item.tierRequired.charAt(0).toUpperCase() + item.tierRequired.slice(1)}+</Text>
        </View>
      )}
    </Pressable>
  ), [router]);

  if (isLoading && offers.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <CardGridSkeleton />
      </View>
    );
  }

  if (error && offers.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={handleRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={offers}
        renderItem={renderOffer}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={PRIVE_COLORS.gold.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        estimatedItemSize={120}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="pricetag-outline" size={48} color={PRIVE_COLORS.text.tertiary} />
            <Text style={styles.emptyText}>No offers available right now</Text>
          </View>
        }
        ListFooterComponent={
          hasMore && offers.length > 0 ? (
            <ActivityIndicator style={styles.footer} size="small" color={PRIVE_COLORS.gold.primary} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIVE_COLORS.background.primary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PRIVE_COLORS.background.primary,
  },
  listContent: {
    padding: PRIVE_SPACING.lg,
    gap: PRIVE_SPACING.md,
    paddingBottom: 120,
  },
  offerCard: {
    backgroundColor: PRIVE_COLORS.background.secondary,
    borderRadius: PRIVE_RADIUS.lg,
    padding: PRIVE_SPACING.lg,
    borderWidth: 1,
    borderColor: PRIVE_COLORS.border.primary,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: PRIVE_SPACING.sm,
  },
  brandBadge: {
    backgroundColor: 'rgba(201, 169, 98, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: PRIVE_RADIUS.sm,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exclusiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exclusiveText: {
    fontSize: 10,
    color: PRIVE_COLORS.gold.primary,
    fontWeight: '600',
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PRIVE_COLORS.text.primary,
    marginBottom: 4,
  },
  offerSubtitle: {
    fontSize: 13,
    color: PRIVE_COLORS.text.secondary,
    marginBottom: PRIVE_SPACING.md,
    lineHeight: 18,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIVE_COLORS.gold.primary,
  },
  expiryText: {
    fontSize: 11,
    color: PRIVE_COLORS.text.tertiary,
  },
  tierBadge: {
    marginTop: PRIVE_SPACING.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: PRIVE_RADIUS.sm,
  },
  tierText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.brand.purpleMedium,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: PRIVE_SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    color: PRIVE_COLORS.text.tertiary,
  },
  errorText: {
    fontSize: 14,
    color: PRIVE_COLORS.status.error,
    marginBottom: PRIVE_SPACING.md,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: PRIVE_COLORS.gold.primary,
    borderRadius: PRIVE_RADIUS.md,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  footer: {
    paddingVertical: PRIVE_SPACING.xl,
  },
});

export default withErrorBoundary(PriveOffersScreen, 'PrivePriveOffers');
