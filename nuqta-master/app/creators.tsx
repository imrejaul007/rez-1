// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import creatorsApi, { Creator } from '@/services/creatorsApi';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width } = Dimensions.get('window');

const categories = [
  { id: 'all', name: 'All' },
  { id: 'fashion', name: 'Fashion' },
  { id: 'beauty', name: 'Beauty' },
  { id: 'lifestyle', name: 'Lifestyle' },
  { id: 'tech', name: 'Tech' },
  { id: 'fitness', name: 'Fitness' },
  { id: 'food', name: 'Food' },
];

const sortOptions = [
  { id: 'trending', name: 'Trending', icon: 'trending-up' as const },
  { id: 'followers', name: 'Most Followers', icon: 'people' as const },
  { id: 'rating', name: 'Top Rated', icon: 'star' as const },
  { id: 'newest', name: 'Newest', icon: 'time' as const },
];

const formatCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
};

// ============================================
// SKELETON CARD
// ============================================

const CreatorCardSkeleton = React.memo(() => (
  <View style={styles.creatorCard}>
    <View style={styles.creatorHeader}>
      <View style={[styles.avatarContainer, { backgroundColor: colors.neutral[200] }]} />
      <View style={styles.creatorInfo}>
        <View style={{ width: 120, height: 16, backgroundColor: colors.neutral[200], borderRadius: 4, marginBottom: 6 }} />
        <View style={{ width: 80, height: 12, backgroundColor: colors.neutral[100], borderRadius: 4, marginBottom: 4 }} />
        <View style={{ width: 160, height: 12, backgroundColor: colors.neutral[100], borderRadius: 4 }} />
      </View>
    </View>
    <View style={styles.tagsContainer}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.tag, { width: 60, backgroundColor: colors.neutral[100] }]}>
          <Text style={{ color: 'transparent' }}>Tag</Text>
        </View>
      ))}
    </View>
    <View style={[styles.statsContainer, { borderTopColor: colors.neutral[100] }]}>
      <View style={styles.statsLeft}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ width: 50, height: 14, backgroundColor: colors.neutral[100], borderRadius: 4 }} />
        ))}
      </View>
    </View>
  </View>
));

// ============================================
// CREATOR CARD
// ============================================

const CreatorCard = React.memo(({ creator, onPress }: { creator: Creator; onPress: () => void }) => (
  <Pressable
    style={styles.creatorCard}
    onPress={onPress}
   
  >
    <View style={styles.creatorHeader}>
      <LinearGradient
        colors={['#9333EA', colors.brand.pink]}
        style={styles.avatarContainer}
      >
        {creator.avatar ? (
          <CachedImage source={creator.avatar} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={28} color={colors.background.primary} />
        )}
      </LinearGradient>
      <View style={styles.creatorInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.creatorName} numberOfLines={1}>{creator.name}</Text>
          {creator.verified && (
            <Ionicons name="checkmark-circle" size={16} color={colors.infoScale[400]} />
          )}
          {creator.isFeatured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={10} color={colors.warningScale[400]} />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>
        {creator.tier && (
          <Text style={styles.tierText}>
            {creator.tier.charAt(0).toUpperCase() + creator.tier.slice(1)} Creator
          </Text>
        )}
        {creator.bio ? (
          <Text style={styles.bio} numberOfLines={1}>{creator.bio}</Text>
        ) : null}
      </View>
    </View>

    {creator.tags && creator.tags.length > 0 && (
      <View style={styles.tagsContainer}>
        {creator.tags.slice(0, 3).map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    )}

    <View style={styles.statsContainer}>
      <View style={styles.statsLeft}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color={colors.neutral[400]} />
          <Text style={styles.statValue}>{formatCount(creator.followers)}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="bag" size={16} color={colors.neutral[400]} />
          <Text style={styles.statValue}>{creator.totalPicks}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="star" size={16} color={colors.warningScale[400]} />
          <Text style={styles.statValue}>{creator.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
    </View>
  </Pressable>
));

// ============================================
// MAIN COMPONENT
// ============================================

function CreatorsPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  const fetchCreators = useCallback(async (
    pageNum: number = 1,
    append: boolean = false,
  ) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      const params: {
        page: number;
        limit: number;
        sort: string;
        category?: string;
        search?: string;
      } = {
        page: pageNum,
        limit: 20,
        sort: sortBy,
      };
      if (selectedCategory !== 'all') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await creatorsApi.getApprovedCreators(params);

      if (response.success && response.data) {
        if (append) {
          setCreators(prev => [...prev, ...response.data!.creators]);
        } else {
          setCreators(response.data.creators);
        }
        setPage(response.data.page);
        setTotalPages(response.data.totalPages);
        setTotal(response.data.total);
      } else {
        if (!append) setCreators([]);
        setError(response.error || 'Failed to load creators');
      }
    } catch (err: any) {
      if (!append) setCreators([]);
      setError(err.message || 'Failed to load creators');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, sortBy, searchQuery]);

  // Initial fetch
  useEffect(() => {
    fetchCreators(1);
    isFirstMount.current = false;
  }, []);

  // Refetch on category or sort change
  useEffect(() => {
    if (isFirstMount.current) return;
    fetchCreators(1);
  }, [selectedCategory, sortBy]);

  // Debounced search (300ms)
  useEffect(() => {
    if (isFirstMount.current) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchCreators(1);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const loadMore = useCallback(() => {
    if (loadingMore || page >= totalPages) return;
    fetchCreators(page + 1, true);
  }, [page, totalPages, loadingMore, fetchCreators]);

  const renderCreatorCard = useCallback(({ item }: { item: Creator }) => (
    <CreatorCard
      creator={item}
      onPress={() => router.push(`/creator/${item.id}`)}
    />
  ), [router]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return <View style={{ height: 100 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#9333EA" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  }, [loadingMore]);

  const renderEmpty = useCallback(() => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={56} color={colors.neutral[300]} />
        <Text style={styles.emptyTitle}>No creators found</Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery
            ? 'Try a different search term'
            : 'No creators match the selected filters'}
        </Text>
      </View>
    );
  }, [loading, searchQuery]);

  const keyExtractor = useCallback((item: Creator) => item.id, []);

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.neutral[800]} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>All Creators</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Loading...' : `${total} creator${total !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/creator-apply')}
         
        >
          <LinearGradient
            colors={['#9333EA', colors.brand.pink]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerCta}
          >
            <Ionicons name="add-circle" size={14} color={colors.background.primary} />
            <Text style={styles.headerCtaText}>Become a Creator</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search creators..."
            placeholderTextColor={colors.neutral[400]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.neutral[400]} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Category Filters */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              onPress={() => setSelectedCategory(cat.id)}
              style={[
                styles.categoryPill,
                selectedCategory === cat.id && styles.categoryPillActive,
              ]}
            >
              {selectedCategory === cat.id ? (
                <LinearGradient
                  colors={['#9333EA', colors.brand.pink]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.categoryPillGradient}
                >
                  <Text style={styles.categoryPillTextActive}>{cat.name}</Text>
                </LinearGradient>
              ) : (
                <Text style={styles.categoryPillText}>{cat.name}</Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        {sortOptions.map((sort) => (
          <Pressable
            key={sort.id}
            onPress={() => setSortBy(sort.id)}
            style={[
              styles.sortPill,
              sortBy === sort.id && styles.sortPillActive,
            ]}
          >
            <Ionicons
              name={sort.icon}
              size={14}
              color={sortBy === sort.id ? colors.background.primary : colors.neutral[500]}
            />
            <Text style={[
              styles.sortPillText,
              sortBy === sort.id && styles.sortPillTextActive,
            ]}>
              {sort.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {[1, 2, 3, 4].map((i) => (
            <CreatorCardSkeleton key={i} />
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : error && creators.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Failed to load creators</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => fetchCreators(1)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlashList
          data={creators}
          renderItem={renderCreatorCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          ListHeaderComponent={null}
          estimatedItemSize={280}
        />
      )}

    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
  },
  categoryPill: {
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  categoryPillActive: {},
  categoryPillGradient: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  categoryPillText: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.tertiary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  categoryPillTextActive: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.inverse,
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background.primary,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
  },
  sortPillActive: {
    backgroundColor: Colors.info,
  },
  sortPillText: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.text.tertiary,
  },
  sortPillTextActive: {
    color: Colors.text.inverse,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  listContent: {
    paddingBottom: 100,
  },
  creatorCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  creatorHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  creatorInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  creatorName: {
    ...Typography.body,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
    flexShrink: 1,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  featuredText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.warning,
  },
  tierText: {
    ...Typography.bodySmall,
    color: Colors.brand.purpleLight,
    fontWeight: '500',
    marginBottom: 2,
  },
  bio: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  tagText: {
    ...Typography.caption,
    fontWeight: '500',
    color: Colors.brand.purpleLight,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  statsLeft: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statValue: {
    ...Typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
  },

  // Footer
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingBottom: 100,
  },
  footerText: {
    ...Typography.bodySmall,
    fontSize: 13,
    color: Colors.text.tertiary,
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: '#9333EA',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },

  // Header CTA
  headerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  headerCtaText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(CreatorsPage, 'Creators');
