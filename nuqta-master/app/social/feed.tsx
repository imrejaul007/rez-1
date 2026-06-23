// @ts-nocheck
/**
 * Friends Activity Feed (BuzzLoop)
 *
 * Shows friends' saving activities: purchases, coins earned, deals redeemed.
 * Privacy-aware — only shows activity for users with showActivity = true.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface FeedItem {
  _id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: 'purchase' | 'coins_earned' | 'deal_redeemed' | 'review' | 'check_in' | 'streak';
  description: string;
  amount?: number;
  coinsEarned?: number;
  storeName?: string;
  storeId?: string;
  createdAt: string;
}

const ACTIVITY_ICONS: Record<string, { name: string; color: string }> = {
  purchase: { name: 'cart', color: '#3B82F6' },
  coins_earned: { name: 'star', color: '#F59E0B' },
  deal_redeemed: { name: 'pricetag', color: '#10B981' },
  review: { name: 'chatbubble-ellipses', color: '#8B5CF6' },
  check_in: { name: 'location', color: '#EF4444' },
  streak: { name: 'flame', color: '#F97316' },
};

export default function SocialFeedPage() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchFeed = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setIsLoading(true);
      const response = await apiClient.get('/social/feed', { page: pageNum, limit: 20 });
      const items = response.data?.activities || response.data?.feed || [];

      if (append) {
        setFeed(prev => [...prev, ...items]);
      } else {
        setFeed(items);
      }
      setHasMore(items.length >= 20);
      setPage(pageNum);
    } catch {
      // Fail silently — feed is not critical
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchFeed(1);
  }, [isAuthenticated, authLoading, fetchFeed]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchFeed(1);
  }, [fetchFeed]);

  const onEndReached = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    fetchFeed(page + 1, true);
  }, [isLoadingMore, hasMore, page, fetchFeed]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const renderItem = useCallback(({ item }: { item: FeedItem }) => {
    const icon = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.purchase;
    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          {item.userAvatar ? (
            <CachedImage source={{ uri: item.userAvatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{item.userName?.[0] || '?'}</Text>
            </View>
          )}
          <View style={styles.cardContent}>
            <Text style={styles.userName}>{item.userName}</Text>
            <Text style={styles.description}>{item.description}</Text>
            {item.storeName && (
              <Pressable onPress={() => item.storeId && router.push(`/store/${item.storeId}`)}>
                <Text style={styles.storeName}>at {item.storeName}</Text>
              </Pressable>
            )}
          </View>
          <View style={[styles.iconBadge, { backgroundColor: icon.color + '20' }]}>
            <Ionicons name={icon.name as any} size={16} color={icon.color} />
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.timeText}>{timeAgo(item.createdAt)}</Text>
          {item.coinsEarned ? (
            <Text style={styles.coinsText}>+{item.coinsEarned} {BRAND.COIN_SHORT}</Text>
          ) : null}
        </View>
      </View>
    );
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={feed}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <Text style={styles.pageTitle}>Friends Activity</Text>
        }
        ListFooterComponent={isLoadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color="#7C3AED" /> : null}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" style={{ marginTop: 60 }} color="#7C3AED" />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No activity yet</Text>
              <Text style={styles.emptyText}>Follow friends to see their savings activity here</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginVertical: 16 },
  card: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6' },
  avatarFallback: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#7C3AED' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  cardContent: { flex: 1, marginLeft: 10 },
  userName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  description: { fontSize: 13, color: '#4B5563', marginTop: 2, lineHeight: 18 },
  storeName: { fontSize: 12, color: '#7C3AED', fontWeight: '600', marginTop: 2 },
  iconBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingLeft: 50 },
  timeText: { fontSize: 11, color: '#9CA3AF' },
  coinsText: { fontSize: 11, color: '#F59E0B', fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginTop: 16 },
  emptyText: { fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center' },
});
