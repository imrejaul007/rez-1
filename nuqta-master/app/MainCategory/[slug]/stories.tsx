// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Shared Stories / UGC Gallery Page
 * /MainCategory/[slug]/stories
 * Shows real user-generated content (reviews + photos) from stores
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCategoryTheme, SHARED_COLORS } from '@/config/categoryThemeConfig';
import { getCategoryConfig } from '@/config/categoryConfig';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '@/services/apiClient';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
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

const BASE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'photos', label: 'Photos' },
  { id: 'videos', label: 'Videos' },
  { id: 'reviews', label: 'Reviews' },
];

function CategoryStoriesPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = getCategoryTheme(slug || 'electronics');
  const categoryConfig = getCategoryConfig(slug || '');
  const categoryName = categoryConfig?.name || theme.name;

  const FILTERS = useMemo(() => {
    const filters = [...BASE_FILTERS];
    if (slug === 'electronics') {
      filters.push({ id: 'unboxings', label: 'Unboxings' });
    }
    return filters;
  }, [slug]);

  const [items, setItems] = useState<UGCItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

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
    if (!u?.profile) return `${categoryName} Fan`;
    return `${u.profile.firstName || ''} ${u.profile.lastName?.charAt(0) || ''}`.trim() || `${categoryName} Fan`;
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

  const renderItem = useCallback(({ item }: { item: UGCItem }) => (
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
  ), [router, categoryName]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={SHARED_COLORS.textPrimary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{theme.storiesTitle || `${categoryName} Stories`}</Text>
          <Text style={styles.headerSubtitle}>Real reviews from our {categoryName.toLowerCase()} community</Text>
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
        <CardGridSkeleton />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>{'\uD83D\uDCF1'}</Text>
          <Text style={styles.emptyTitle}>No stories yet</Text>
          <Text style={styles.emptySubtitle}>Be the first to share your {categoryName.toLowerCase()} experience!</Text>
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
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md,
    backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default, gap: Spacing.md,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: { ...Typography.h4, fontWeight: '700', color: Colors.text.primary },
  headerSubtitle: { ...Typography.bodySmall, color: Colors.text.tertiary },
  filterBar: {
    flexDirection: 'row', paddingHorizontal: Spacing.base, paddingVertical: 10,
    backgroundColor: Colors.background.primary, borderBottomWidth: 1, borderBottomColor: Colors.border.default, gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  filterChipActive: { backgroundColor: Colors.info, borderColor: colors.infoScale[400] },
  filterText: { ...Typography.bodySmall, fontWeight: '500', color: Colors.text.tertiary },
  filterTextActive: { color: Colors.text.inverse, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.base },
  emptyTitle: { ...Typography.h4, fontWeight: '600', color: Colors.text.primary, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body, color: Colors.text.tertiary, textAlign: 'center' },
  list: { padding: Spacing.base, paddingBottom: 120 },
  card: {
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: Spacing.base,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cardImageWrap: { position: 'relative' },
  cardImage: { width: '100%', height: 200 },
  playBadge: {
    position: 'absolute', top: '50%', left: '50%', marginTop: -20, marginLeft: -20,
    width: 40, height: 40, borderRadius: BorderRadius.xl, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardContent: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  cardUser: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardAvatar: {
    width: 32, height: 32, borderRadius: BorderRadius.lg, backgroundColor: colors.tint.blue,
    justifyContent: 'center', alignItems: 'center',
  },
  cardAvatarText: { ...Typography.body, fontWeight: '600', color: Colors.info },
  cardUserName: { ...Typography.bodySmall, fontWeight: '600', color: Colors.text.primary },
  cardStoreName: { ...Typography.caption, color: Colors.text.tertiary },
  cardTime: { ...Typography.caption, color: Colors.text.tertiary },
  ratingRow: { flexDirection: 'row', gap: 2, marginBottom: 6 },
  cardCaption: { ...Typography.bodySmall, color: Colors.text.primary, lineHeight: 19, marginBottom: Spacing.sm },
  cardActions: { flexDirection: 'row', gap: Spacing.base },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardActionText: { ...Typography.bodySmall, color: Colors.text.tertiary },
});

export default withErrorBoundary(CategoryStoriesPage, 'MainCategorySlugStories');
