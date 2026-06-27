// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// My Submissions Dashboard
// Unified view of all user submissions across engagement types

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import photoUploadApi, { PhotoUploadItem } from '@/services/photoUploadApi';
import ugcApi, { UgcReel } from '@/services/ugcApi';
import offerCommentApi, { MyCommentItem } from '@/services/offerCommentApi';
import pollApi, { PollVoteHistory } from '@/services/pollApi';
import CoinIcon from '@/components/ui/CoinIcon';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type FilterType = 'all' | 'photos' | 'reels' | 'comments' | 'votes';

interface SubmissionItem {
  id: string;
  type: 'photo' | 'reel' | 'comment' | 'vote';
  title: string;
  subtitle?: string;
  status: 'pending' | 'approved' | 'rejected' | 'credited';
  coinsAwarded: number;
  createdAt: string;
  thumbnail?: string;
}

const COLORS = {
  white: Colors.background.primary,
  navy: Colors.nileBlue,
  navyLight: '#2A5577',
  linen: Colors.linen,
  mustard: Colors.gold,
  peach: Colors.lightPeach,
  lavender: Colors.lavenderMist,
  gray100: '#F5F5F7',
  gray200: '#E8E8ED',
  gray300: '#D1D1D6',
  gray400: '#AEAEB2',
  gray500: '#8E8E93',
  gray600: '#636366',
  green: '#34C759',
  greenLight: '#E8FAF0',
  red: '#FF3B30',
  redLight: '#FFF0EF',
  amber: '#FF9500',
  amberLight: '#FFF8EC',
  blue: colors.brand.ios,
  blueLight: '#EBF5FF',
  purple: '#AF52DE',
  purpleLight: '#F5EDFB',
  teal: '#5AC8FA',
  tealLight: '#EDF8FE',
};

const TYPE_CONFIG = {
  photo: {
    icon: 'camera' as const,
    label: 'Photo',
    color: COLORS.blue,
    bg: COLORS.blueLight,
    gradient: [colors.brand.ios, '#5856D6'] as [string, string],
  },
  reel: {
    icon: 'videocam' as const,
    label: 'Reel',
    color: COLORS.purple,
    bg: COLORS.purpleLight,
    gradient: ['#AF52DE', '#FF2D55'] as [string, string],
  },
  comment: {
    icon: 'chatbubble-ellipses' as const,
    label: 'Comment',
    color: COLORS.teal,
    bg: COLORS.tealLight,
    gradient: ['#5AC8FA', '#34AADC'] as [string, string],
  },
  vote: {
    icon: 'stats-chart' as const,
    label: 'Vote',
    color: COLORS.amber,
    bg: COLORS.amberLight,
    gradient: ['#FF9500', '#FF6B00'] as [string, string],
  },
};

function MySubmissionsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ photos: 0, reels: 0, comments: 0, votes: 0, totalCoins: 0 });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [photosRes, reelsRes, commentsRes, votesRes] = await Promise.allSettled([
        photoUploadApi.getMyUploads(1, 50),
        ugcApi.getMyReels(1, 50),
        offerCommentApi.getMyComments(1, 50),
        pollApi.getMyVotes(1, 50),
      ]);

      const items: SubmissionItem[] = [];
      let totalCoins = 0;
      let photoCount = 0, reelCount = 0, commentCount = 0, voteCount = 0;

      // Photos
      if (photosRes.status === 'fulfilled' && photosRes.value.success && photosRes.value.data?.uploads) {
        for (const p of photosRes.value.data.uploads) {
          photoCount++;
          totalCoins += p.coinsAwarded || 0;
          items.push({
            id: `photo-${p._id}`,
            type: 'photo',
            title: p.caption || 'Photo Upload',
            subtitle: p.store?.name || p.contentType,
            status: p.moderationStatus === 'approved' ? 'credited' : p.moderationStatus,
            coinsAwarded: p.coinsAwarded || 0,
            createdAt: p.createdAt,
            thumbnail: (p as any).imageUrl || (p as any).thumbnailUrl,
          });
        }
      }

      // Reels
      if (reelsRes.status === 'fulfilled' && reelsRes.value.success && reelsRes.value.data?.reels) {
        for (const r of reelsRes.value.data.reels) {
          reelCount++;
          items.push({
            id: `reel-${r.id}`,
            type: 'reel',
            title: r.title || 'UGC Reel',
            subtitle: r.store?.name,
            status: r.moderationStatus === 'approved' ? 'credited' : r.moderationStatus,
            coinsAwarded: 0,
            createdAt: r.createdAt,
            thumbnail: (r as any).thumbnailUrl || (r as any).coverImage,
          });
        }
      }

      // Comments
      if (commentsRes.status === 'fulfilled' && commentsRes.value.success && commentsRes.value.data?.comments) {
        for (const c of commentsRes.value.data.comments) {
          commentCount++;
          totalCoins += c.coinsAwarded || 0;
          items.push({
            id: `comment-${c.id}`,
            type: 'comment',
            title: c.text.substring(0, 80) + (c.text.length > 80 ? '...' : ''),
            subtitle: c.offer?.title,
            status: c.moderationStatus === 'approved' ? 'credited' : c.moderationStatus,
            coinsAwarded: c.coinsAwarded || 0,
            createdAt: c.createdAt,
          });
        }
      }

      // Votes
      if (votesRes.status === 'fulfilled' && votesRes.value.success && votesRes.value.data?.votes) {
        for (const v of votesRes.value.data.votes) {
          voteCount++;
          totalCoins += v.coinsAwarded || 0;
          items.push({
            id: `vote-${v.id}`,
            type: 'vote',
            title: v.poll?.title || 'Poll Vote',
            subtitle: undefined,
            status: 'credited',
            coinsAwarded: v.coinsAwarded || 0,
            createdAt: v.createdAt,
          });
        }
      }

      // Sort by date descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      if (!isMounted()) return;
      setSubmissions(items);
      if (!isMounted()) return;
      setTotals({ photos: photoCount, reels: reelCount, comments: commentCount, votes: voteCount, totalCoins });
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const filteredSubmissions = filter === 'all'
    ? submissions
    : submissions.filter(s => {
        switch (filter) {
          case 'photos': return s.type === 'photo';
          case 'reels': return s.type === 'reel';
          case 'comments': return s.type === 'comment';
          case 'votes': return s.type === 'vote';
          default: return true;
        }
      });

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved' || s.status === 'credited').length;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'credited':
      case 'approved':
        return { icon: 'checkmark-circle' as const, color: COLORS.green, bg: COLORS.greenLight, label: 'Approved' };
      case 'rejected':
        return { icon: 'close-circle' as const, color: COLORS.red, bg: COLORS.redLight, label: 'Rejected' };
      default:
        return { icon: 'time' as const, color: COLORS.amber, bg: COLORS.amberLight, label: 'Pending' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filters: { key: FilterType; label: string; count: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: 'All', count: submissions.length, icon: 'grid' },
    { key: 'photos', label: 'Photos', count: totals.photos, icon: 'camera' },
    { key: 'reels', label: 'Reels', count: totals.reels, icon: 'videocam' },
    { key: 'comments', label: 'Comments', count: totals.comments, icon: 'chatbubble' },
    { key: 'votes', label: 'Votes', count: totals.votes, icon: 'stats-chart' },
  ];

  const renderSubmission = ({ item, index }: { item: SubmissionItem; index: number }) => {
    const typeConfig = TYPE_CONFIG[item.type];
    const statusConfig = getStatusConfig(item.status);

    return (
      <View style={[styles.card, index === 0 && { marginTop: 4 }]}>
        {/* Left: Type indicator + thumbnail */}
        <View style={styles.cardLeft}>
          {item.thumbnail ? (
            <View style={styles.thumbnailContainer}>
              <CachedImage source={item.thumbnail} style={styles.thumbnail} contentFit="cover" />
              <View style={[styles.thumbnailTypeBadge, { backgroundColor: typeConfig.color }]}>
                <Ionicons name={typeConfig.icon} size={8} color={COLORS.white} />
              </View>
            </View>
          ) : (
            <LinearGradient
              colors={typeConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.typeIconGradient}
            >
              <Ionicons name={typeConfig.icon} size={18} color={COLORS.white} />
            </LinearGradient>
          )}
        </View>

        {/* Center: Content */}
        <View style={styles.cardCenter}>
          {/* Type label chip */}
          <View style={styles.cardTopRow}>
            <View style={[styles.typeChip, { backgroundColor: typeConfig.bg }]}>
              <Text style={[styles.typeChipText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

          {/* Subtitle (store/offer name) */}
          {item.subtitle && (
            <Text style={styles.cardSubtitle} numberOfLines={1}>{item.subtitle}</Text>
          )}

          {/* Bottom: Status + Coins */}
          <View style={styles.cardBottomRow}>
            <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon} size={11} color={statusConfig.color} />
              <Text style={[styles.statusLabel, { color: statusConfig.color }]}>{statusConfig.label}</Text>
            </View>

            {item.coinsAwarded > 0 && (
              <View style={styles.coinsBadge}>
                <CoinIcon size={13} />
                <Text style={styles.coinsText}>+{item.coinsAwarded}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Right: Chevron */}
        <Ionicons name="chevron-forward" size={16} color={COLORS.gray300} style={{ marginLeft: 4 }} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={[COLORS.navy, COLORS.navyLight]}
        style={styles.header}
      >
        {/* Nav bar */}
        <View style={styles.navBar}>
          <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </Pressable>
          <Text style={styles.navTitle}>My Submissions</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {/* Total */}
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
              <Ionicons name="layers" size={16} color={COLORS.white} />
            </View>
            <Text style={styles.statNumber}>{submissions.length}</Text>
            <Text style={styles.statCaption}>Total</Text>
          </View>

          {/* Approved */}
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(52,199,89,0.2)' }]}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
            </View>
            <Text style={styles.statNumber}>{approvedCount}</Text>
            <Text style={styles.statCaption}>Approved</Text>
          </View>

          {/* Pending */}
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,149,0,0.2)' }]}>
              <Ionicons name="time" size={16} color={COLORS.amber} />
            </View>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statCaption}>Pending</Text>
          </View>

          {/* Earned */}
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: 'rgba(255,205,87,0.2)' }]}>
              <CoinIcon size={16} />
            </View>
            <Text style={styles.statNumber}>{totals.totalCoins}</Text>
            <Text style={styles.statCaption}>Earned</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {filters.map(f => {
            const isActive = filter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setFilter(f.key)}
               
              >
                <Ionicons
                  name={f.icon}
                  size={14}
                  color={isActive ? COLORS.white : COLORS.gray500}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {f.label}
                </Text>
                <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                    {f.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <CardGridSkeleton />
      ) : (
        <FlashList
          data={filteredSubmissions}
          renderItem={renderSubmission}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={100}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={32} color={COLORS.gray400} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'No Submissions Yet' : `No ${filters.find(f => f.key === filter)?.label || ''}`}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all'
                  ? 'Upload photos, create reels, vote in polls, or comment on offers to earn coins!'
                  : 'Nothing here yet. Start contributing to earn rewards!'}
              </Text>
              <Pressable
                style={styles.emptyCta}
                onPress={() => router.push('/playandearn' as any)}
              >
                <Ionicons name="add-circle" size={18} color={COLORS.white} />
                <Text style={styles.emptyCtaText}>Start Earning</Text>
              </Pressable>
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
    backgroundColor: COLORS.gray100,
  },

  // ==================== HEADER ====================
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 40) + 4,
    paddingBottom: 20,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.3,
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    ...Typography.h3,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  statCaption: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },

  // ==================== FILTERS ====================
  filterSection: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  filterScroll: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: COLORS.gray100,
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.navy,
  },
  filterTabText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: COLORS.gray600,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
  filterCount: {
    marginLeft: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.gray500,
  },
  filterCountTextActive: {
    color: COLORS.white,
  },

  // ==================== CARDS ====================
  listContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BorderRadius.lg,
    padding: 14,
    marginBottom: 10,
    ...Shadows.subtle,
  },

  // Card left: icon/thumbnail
  cardLeft: {
    marginRight: Spacing.md,
  },
  typeIconGradient: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailTypeBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },

  // Card center: content
  cardCenter: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeChipText: {
    ...Typography.overline,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateText: {
    ...Typography.caption,
    color: COLORS.gray400,
  },
  cardTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.navy,
    lineHeight: 19,
    marginBottom: 2,
  },
  cardSubtitle: {
    ...Typography.bodySmall,
    color: COLORS.gray500,
    marginBottom: 6,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  statusLabel: {
    ...Typography.caption,
    fontWeight: '600',
  },
  coinsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primary[50],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  coinsText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: colors.brand.amberDeep,
  },

  // ==================== LOADING ====================
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...Typography.body,
    color: COLORS.gray500,
  },

  // ==================== EMPTY STATE ====================
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    backgroundColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: COLORS.gray500,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.xl,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.navy,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  emptyCtaText: {
    ...Typography.body,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default withErrorBoundary(MySubmissionsPage, 'EarnMySubmissions');
