// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Friends Redeemed Offers Page
// Social proof - what friends bought

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useAuthLoading, useGetCurrencySymbol, useIsAuthenticated } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface FriendOffer {
  id: string;
  friend: { id: string; name: string; avatar: string };
  offer: { title: string; store: string; discount: string; image: string };
  savedAmount: string;
  redeemedAt: string;
}

const PAGE_LIMIT = 10;

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
}

function mapRedemptionToFriendOffer(item: any, currencySymbol: string): FriendOffer {
  const friendPopulated = item.friendId;
  const friendName = friendPopulated?.fullName || item.friendName || 'A Friend';
  const friendAvatar = friendPopulated?.avatar || item.friendAvatar || '';

  const offerPopulated = item.offerId;
  const offerTitle = offerPopulated?.title || item.offerTitle || 'Offer';
  const discount = item.cashbackPercentage
    ? `${item.cashbackPercentage}%`
    : offerPopulated?.discountValue
      ? `${offerPopulated.discountValue}%`
      : '';

  return {
    id: item._id,
    friend: {
      id: typeof friendPopulated === 'object' ? friendPopulated._id : item.friendId,
      name: friendName,
      avatar: friendAvatar || friendName.charAt(0).toUpperCase(),
    },
    offer: {
      title: offerTitle,
      store: item.storeName || offerPopulated?.storeName || '',
      discount,
      image: item.offerImage || offerPopulated?.image || item.storeLogo || '',
    },
    savedAmount: `${currencySymbol}${item.savings?.toFixed(2) || '0'}`,
    redeemedAt: formatTimeAgo(item.redeemedAt),
  };
}

function FriendsRedeemedPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [offers, setOffers] = useState<FriendOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [totalSaved, setTotalSaved] = useState(0);
  const [selectedFriend, setSelectedFriend] = useState('all');

  // Build friend filter list from loaded offers
  const friendFilters = useCallback(() => {
    const seen = new Map<string, { id: string; name: string; avatar: string }>();
    offers.forEach(o => {
      if (!seen.has(o.friend.id)) {
        seen.set(o.friend.id, o.friend);
      }
    });
    return [{ id: 'all', name: 'Everyone', avatar: '' }, ...Array.from(seen.values())];
  }, [offers]);

  const fetchOffers = useCallback(async (pageNum: number, append = false) => {
    if (authLoading) return;
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const response = await apiClient.get<{
        redemptions: any[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalItems: number;
          hasNextPage: boolean;
          hasPrevPage: boolean;
        };
      }>(`/offers/friends-redeemed?page=${pageNum}&limit=${PAGE_LIMIT}`);

      if (response.success && response.data) {
        const mapped = response.data.redemptions.map((r: any) =>
          mapRedemptionToFriendOffer(r, currencySymbol)
        );
        if (!isMounted()) return;
        setOffers(prev => append ? [...prev, ...mapped] : mapped);
        if (!isMounted()) return;
        setHasMore(response.data.pagination.hasNextPage);
        if (!isMounted()) return;
        setTotalItems(response.data.pagination.totalItems);

        // Compute total saved from all loaded offers
        if (!append) {
          const saved = mapped.reduce((sum: number, o: FriendOffer) => {
            const amount = parseFloat(o.savedAmount.replace(/[^0-9.]/g, '')) || 0;
            return sum + amount;
          }, 0);
          if (!isMounted()) return;
          setTotalSaved(saved);
        } else {
          if (!isMounted()) return;
          setTotalSaved(prev => {
            const newSaved = mapped.reduce((sum: number, o: FriendOffer) => {
              const amount = parseFloat(o.savedAmount.replace(/[^0-9.]/g, '')) || 0;
              return sum + amount;
            }, 0);
            return prev + newSaved;
          });
        }
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err?.message || 'Failed to load friend offers');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, [authLoading, currencySymbol]);

  useEffect(() => {
    if (authLoading) return;
    setPage(1);
    fetchOffers(1);
  }, [authLoading, isAuthenticated]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOffers(nextPage, true);
  }, [loadingMore, hasMore, page, fetchOffers]);

  const handleRefresh = useCallback(() => {
    setPage(1);
    fetchOffers(1);
  }, [fetchOffers]);

  const filteredOffers = selectedFriend === 'all'
    ? offers
    : offers.filter(o => o.friend.id === selectedFriend);

  const FRIENDS = friendFilters();

  const renderFriendFilter = useCallback(({ item }: { item: typeof FRIENDS[0] }) => (
    <Pressable
      style={[
        styles.friendFilter,
        selectedFriend === item.id && styles.friendFilterActive,
      ]}
      onPress={() => setSelectedFriend(item.id)}
    >
      <ThemedText style={styles.friendAvatar}>
        {item.id === 'all' ? '\uD83D\uDC65' : item.avatar}
      </ThemedText>
      <ThemedText style={[
        styles.friendFilterName,
        selectedFriend === item.id && styles.friendFilterNameActive,
      ]}>
        {item.name}
      </ThemedText>
    </Pressable>
  ), [selectedFriend]);

  const renderOffer = useCallback(({ item }: { item: FriendOffer }) => (
    <Pressable
      style={styles.offerCard}
      onPress={() => router.push(`/offers/${item.id}` as any)}
    >
      <View style={styles.friendInfo}>
        <View style={styles.friendAvatarLarge}>
          <ThemedText style={styles.friendAvatarText}>{item.friend.avatar}</ThemedText>
        </View>
        <View style={styles.friendDetails}>
          <ThemedText style={styles.friendName}>{item.friend.name}</ThemedText>
          <ThemedText style={styles.redeemedTime}>{item.redeemedAt}</ThemedText>
        </View>
      </View>

      <View style={styles.offerInfo}>
        <View style={styles.offerImage}>
          <ThemedText style={styles.offerEmoji}>{item.offer.image}</ThemedText>
        </View>
        <View style={styles.offerDetails}>
          <ThemedText style={styles.offerTitle}>{item.offer.title}</ThemedText>
          <ThemedText style={styles.offerStore}>{item.offer.store}</ThemedText>
          <View style={styles.offerMeta}>
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>{item.offer.discount} OFF</ThemedText>
            </View>
            <View style={styles.savedBadge}>
              <Ionicons name="wallet-outline" size={12} color={Colors.success} />
              <ThemedText style={styles.savedText}>Saved {item.savedAmount}</ThemedText>
            </View>
          </View>
        </View>
        <Pressable style={styles.useButton}>
          <ThemedText style={styles.useButtonText}>Use</ThemedText>
        </Pressable>
      </View>
    </Pressable>
  ), [router]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>People Saving Near You</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{totalItems}</ThemedText>
            <ThemedText style={styles.statLabel}>People Saved</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{currencySymbol}{totalSaved.toFixed(2)}</ThemedText>
            <ThemedText style={styles.statLabel}>Total Saved</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[600]} />
          <ThemedText style={styles.loadingText}>Loading friend offers...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.text.tertiary} />
          <ThemedText style={styles.emptyTitle}>Something went wrong</ThemedText>
          <ThemedText style={styles.emptyText}>{error}</ThemedText>
          <Pressable style={styles.retryButton} onPress={handleRefresh}>
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={filteredOffers}
          renderItem={renderOffer}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={selectedFriend === 'all' ? handleLoadMore : undefined}
          onEndReachedThreshold={0.3}
          refreshing={loading}
          onRefresh={handleRefresh}
          estimatedItemSize={120}
          ListHeaderComponent={
            FRIENDS.length > 1 ? (
              <View style={styles.filtersSection}>
                <FlashList
                  data={FRIENDS}
                  renderItem={renderFriendFilter}
                  keyExtractor={item => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filtersContainer}
                  estimatedItemSize={120}
                />
              </View>
            ) : null
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary[600]} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyEmoji}>{'\uD83D\uDC4B'}</ThemedText>
              <ThemedText style={styles.emptyTitle}>No offers yet</ThemedText>
              <ThemedText style={styles.emptyText}>
                {selectedFriend === 'all'
                  ? "Your friends haven't redeemed any offers recently"
                  : "This friend hasn't redeemed any offers recently"}
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...Typography.h3,
    color: colors.background.primary,
    textAlign: 'center',
    marginRight: 40,
  },
  placeholder: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...Typography.h2,
    color: colors.background.primary,
  },
  statLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.sm,
  },
  filtersSection: {
    marginBottom: Spacing.md,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  friendFilter: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.sm,
    ...Shadows.subtle,
  },
  friendFilterActive: {
    backgroundColor: Colors.primary[50],
    borderWidth: 2,
    borderColor: Colors.primary[600],
  },
  friendAvatar: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  friendFilterName: {
    ...Typography.caption,
    color: Colors.text.secondary,
  },
  friendFilterNameActive: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  offerCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  friendAvatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  friendAvatarText: {
    fontSize: 20,
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    ...Typography.label,
    color: Colors.text.primary,
  },
  redeemedTime: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  offerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  offerEmoji: {
    fontSize: 28,
  },
  offerDetails: {
    flex: 1,
  },
  offerTitle: {
    ...Typography.label,
    color: Colors.text.primary,
    marginBottom: Spacing.xs,
  },
  offerStore: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginBottom: Spacing.sm,
  },
  offerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  discountBadge: {
    backgroundColor: Colors.success + '20',
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  discountText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '700',
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedText: {
    ...Typography.caption,
    color: Colors.success,
  },
  useButton: {
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  useButtonText: {
    ...Typography.label,
    color: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.md,
  },
  retryButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary[600],
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  retryText: {
    ...Typography.label,
    color: colors.background.primary,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },
});

export default withErrorBoundary(FriendsRedeemedPage, 'OffersFriendsRedeemed');
