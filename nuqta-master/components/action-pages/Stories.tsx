// @ts-nocheck
/**
 * Shared Stories / UGC Gallery Page
 * /MainCategory/[slug]/stories
 * Shows real user-generated content (reviews + photos) from stores
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCategoryTheme, SHARED_COLORS } from '@/config/categoryThemeConfig';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface UGCItem {
  _id: string;
  type: 'photo' | 'video' | 'review';
  image?: string;
  thumbnail?: string;
  videoUrl?: string;
  caption?: string;
  title?: string;
  comment?: string;
  rating?: number;
  user?: { _id: string; profile?: { firstName?: string; lastName?: string; avatar?: string } };
  creator?: { _id: string; profile?: { firstName?: string; lastName?: string; avatar?: string } };
  store?: { _id: string; name?: string };
  relatedStore?: { _id: string; name?: string };
  likes?: number;
  comments?: number;
  views?: number;
  engagement?: { views?: number; likes?: string[]; shares?: number };
  createdAt: string;
}

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'photos', label: 'Photos' },
  { id: 'videos', label: 'Videos' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'unboxings', label: 'Unboxings' },
];

function TechStoriesPage() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = getCategoryTheme(slug || 'electronics');
  const [items, setItems] = useState<UGCItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const isMounted = useIsMounted();

  const fetchUGC = useCallback(async () => {
    try {
      setIsLoading(true);
      const [videosRes, reviewsRes] = await Promise.all([
        apiClient.get<any>('/videos', { category: slug, limit: 20, status: 'approved' }).catch(() => null),
        apiClient.get<any>('/reviews/featured', { category: slug, limit: 20 }).catch(() => null),
      ]);

      const combined: UGCItem[] = [];

      if (videosRes?.success && videosRes.data) {
        const videos = Array.isArray(videosRes.data) ? videosRes.data : (videosRes.data?.videos || []);
        videos.forEach((v: any) => {
          combined.push({
            _id: v._id,
            type: v.videoUrl ? 'video' : 'photo',
            image: v.thumbnail || v.videoUrl,
            thumbnail: v.thumbnail,
            videoUrl: v.videoUrl,
            caption: v.caption || v.title,
            creator: v.creator,
            store: v.relatedStore || v.store,
            relatedStore: v.relatedStore,
            likes: v.engagement?.likes?.length || 0,
            views: v.engagement?.views || v.views || 0,
            engagement: v.engagement,
            createdAt: v.createdAt,
          });
        });
      }

      if (reviewsRes?.success && reviewsRes.data) {
        const reviews = Array.isArray(reviewsRes.data) ? reviewsRes.data : (reviewsRes.data?.reviews || []);
        reviews.forEach((r: any) => {
          combined.push({
            _id: r._id,
            type: 'review',
            image: r.images?.[0],
            title: r.title,
            comment: r.comment,
            rating: r.rating,
            user: r.user,
            store: r.store,
            likes: r.helpfulCount || 0,
            createdAt: r.createdAt,
          });
        });
      }

      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      if (!isMounted()) return;
      setItems(combined);
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUGC(); }, [fetchUGC]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUGC();
    if (!isMounted()) return;
    setRefreshing(false);
  };

  const filtered = items.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'photos') return item.type === 'photo';
    if (activeFilter === 'videos') return item.type === 'video';
    if (activeFilter === 'reviews') return item.type === 'review';
    if (activeFilter === 'unboxings') return item.type === 'photo' || item.type === 'video';
    return true;
  });

  const getUserName = (item: UGCItem): string => {
    const u = item.user || item.creator;
    if (!u?.profile) return 'Tech Enthusiast';
    return `${u.profile.firstName || ''} ${u.profile.lastName?.charAt(0) || ''}`.trim() || 'Tech Enthusiast';
  };

  const getStoreName = (item: UGCItem): string => {
    return item.store?.name || item.relatedStore?.name || '';
  };

  const getTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  const renderItem = ({ item }: { item: UGCItem }) => (
    <Pressable
      style={styles.card}
      onPress={() => {
        if (item.store?._id) {
          router.push(`/MainStorePage?storeId=${item.store._id}` as any);
        }
      }}
     
    >
      {item.image ? (
        <View style={styles.cardImageWrap}>
          <CachedImage source={item.image} style={styles.cardImage} contentFit="cover" />
          {item.type === 'video' && (
            <View style={styles.playBadge}>
              <Ionicons name="play" size={16} color={SHARED_COLORS.white} />
            </View>
          )}
        </View>
      ) : null}
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={styles.cardUser}>
            <View style={styles.cardAvatar}>
              <Text style={styles.cardAvatarText}>{getUserName(item).charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.cardUserName}>{getUserName(item)}</Text>
              {getStoreName(item) ? (
                <Text style={styles.cardStoreName}>at {getStoreName(item)}</Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.cardTime}>{getTimeAgo(item.createdAt)}</Text>
        </View>

        {item.rating ? (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <Ionicons key={i} name={i <= item.rating! ? 'star' : 'star-outline'} size={14} color={colors.warningScale[400]} />
            ))}
          </View>
        ) : null}

        {(item.caption || item.comment || item.title) && (
          <Text style={styles.cardCaption} numberOfLines={3}>
            {item.caption || item.comment || item.title}
          </Text>
        )}

        <View style={styles.cardActions}>
          <View style={styles.cardAction}>
            <Ionicons name="heart-outline" size={16} color={SHARED_COLORS.textSecondary} />
            <Text style={styles.cardActionText}>{item.likes || 0}</Text>
          </View>
          {item.views ? (
            <View style={styles.cardAction}>
              <Ionicons name="eye-outline" size={16} color={SHARED_COLORS.textSecondary} />
              <Text style={styles.cardActionText}>{item.views}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={SHARED_COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Tech Reviews</Text>
          <Text style={styles.headerSubtitle}>Real reviews from our tech community</Text>
        </View>
      </View>

      <View style={styles.filterBar}>
        {FILTERS.map(f => (
          <Pressable
            key={f.id}
            style={[styles.filterChip, activeFilter === f.id && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.id)}
          >
            <Text style={[styles.filterText, activeFilter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
          <Text style={styles.loadingText}>Loading stories...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>{'\uD83D\uDCF1'}</Text>
          <Text style={styles.emptyTitle}>No stories yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to share your tech experience!</Text>
        </View>
      ) : (
        <FlashList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primaryColor]} />}
          estimatedItemSize={120}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.tint.warmGray },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.background.primary, borderBottomWidth: 1, borderBottomColor: colors.neutral[200], gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.neutral[900] },
  headerSubtitle: { fontSize: 12, color: colors.neutral[500] },
  filterBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.background.primary, borderBottomWidth: 1, borderBottomColor: colors.neutral[200], gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: colors.neutral[200],
  },
  filterChipActive: { backgroundColor: colors.infoScale[400], borderColor: colors.infoScale[400] },
  filterText: { fontSize: 13, fontWeight: '500', color: colors.neutral[500] },
  filterTextActive: { color: colors.background.primary, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.neutral[500] },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.neutral[900], marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: colors.neutral[500], textAlign: 'center' },
  list: { padding: 16, paddingBottom: 120 },
  card: {
    backgroundColor: colors.background.primary, borderRadius: 16, overflow: 'hidden', marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardImageWrap: { position: 'relative' },
  cardImage: { width: '100%', height: 200 },
  playBadge: {
    position: 'absolute', top: '50%', left: '50%', marginTop: -20, marginLeft: -20,
    width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardContent: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardUser: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardAvatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.tint.blue,
    justifyContent: 'center', alignItems: 'center',
  },
  cardAvatarText: { fontSize: 14, fontWeight: '600', color: colors.infoScale[400] },
  cardUserName: { fontSize: 13, fontWeight: '600', color: colors.neutral[900] },
  cardStoreName: { fontSize: 11, color: colors.neutral[500] },
  cardTime: { fontSize: 11, color: colors.neutral[500] },
  ratingRow: { flexDirection: 'row', gap: 2, marginBottom: 6 },
  cardCaption: { fontSize: 13, color: colors.neutral[900], lineHeight: 19, marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 16 },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardActionText: { fontSize: 12, color: colors.neutral[500] },
});

export default React.memo(TechStoriesPage);
