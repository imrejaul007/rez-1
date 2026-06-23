// @ts-nocheck
// ArticlesTab.tsx - Articles grid for Discover & Shop
// Nuqta Brand Colors: Nile Blue (#1a3a52) and Mustard (#ffcd57)
import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DiscoverArticle } from '@/types/discover.types';
import { colors } from '@/constants/theme';

// Nuqta Brand Colors
const NUQTA_COLORS = {
  nileBlue: colors.nileBlue,
  nileBlueLight: '#2a4a62',
  mustard: colors.lightMustard,
  primaryGold: colors.brand.goldWarm,
  navy: colors.brand.navyDark,
  gray: colors.neutral[500],
  lightGray: colors.neutral[100],
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ArticlesTabProps {
  data: DiscoverArticle[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function ArticlesTab({
  data,
  loading = false,
  hasMore = true,
  onLoadMore,
  onRefresh,
  refreshing = false,
}: ArticlesTabProps) {
  const router = useRouter();

  // Navigate to article detail or product
  const handleArticlePress = useCallback((item: DiscoverArticle) => {
    // Could navigate to ArticleDetailScreen if exists
    // For now, navigate to first product if available
    if (item.products && item.products.length > 0) {
      router.push(`/product-page?cardId=${item.products[0]._id}&cardType=product&source=discover`);
    }
  }, [router]);

  // Format numbers
  const formatCount = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Format date
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return '1d ago';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)}w ago`;
    return `${Math.ceil(diffDays / 30)}mo ago`;
  };

  // Render article card
  const renderItem = useCallback(({ item }: { item: DiscoverArticle }) => {
    const productCount = item.products?.length || 0;

    return (
      <Pressable
        style={styles.card}
       
        onPress={() => handleArticlePress(item)}
        accessibilityLabel={`Article: ${item.title}. ${item.readTime || 5} min read`}
        accessibilityRole="button"
      >
        {/* Featured Image */}
        <View style={styles.imageContainer}>
          <CachedImage
            source={item.featuredImage}
            style={styles.image}
            contentFit="cover"
          />

          {/* Category badge */}
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>

          {/* Product count badge */}
          {productCount > 0 && (
            <View style={styles.productBadge}>
              <Ionicons name="bag-handle" size={12} color={colors.background.primary} />
              <Text style={styles.productBadgeText}>{productCount} Products</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Excerpt */}
          {item.excerpt && (
            <Text style={styles.excerpt} numberOfLines={2}>
              {item.excerpt}
            </Text>
          )}

          {/* Meta info */}
          <View style={styles.meta}>
            {/* Author */}
            <View style={styles.authorInfo}>
              <CachedImage
                source={item.author?.avatar || 'https://via.placeholder.com/20'}
                style={styles.authorAvatar}
              />
              <Text style={styles.authorName} numberOfLines={1}>
                {item.author?.name || 'Author'}
              </Text>
            </View>

            {/* Read time */}
            <View style={styles.readTime}>
              <Ionicons name="time-outline" size={12} color={colors.neutral[400]} />
              <Text style={styles.readTimeText}>{item.readTime || 5} min</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={14} color={colors.neutral[400]} />
              <Text style={styles.statText}>{formatCount(item.engagement?.views || 0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={14} color={colors.neutral[400]} />
              <Text style={styles.statText}>{formatCount(item.engagement?.likes || 0)}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="bookmark-outline" size={14} color={colors.neutral[400]} />
              <Text style={styles.statText}>{formatCount(item.engagement?.bookmarks || 0)}</Text>
            </View>
            {item.publishedAt && (
              <Text style={styles.dateText}>{formatDate(item.publishedAt)}</Text>
            )}
          </View>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    );
  }, [handleArticlePress]);

  // Key extractor
  const keyExtractor = useCallback((item: DiscoverArticle) => item._id, []);

  // Footer loader
  const renderFooter = useCallback(() => {
    if (!loading || data.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.nileBlue} />
      </View>
    );
  }, [loading, data.length]);

  // Empty state
  const renderEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={NUQTA_COLORS.nileBlue} />
          </View>
          <Text style={styles.loadingText}>Loading articles...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={[NUQTA_COLORS.nileBlue, NUQTA_COLORS.nileBlueLight]}
          style={styles.emptyIconContainer}
        >
          <Ionicons name="document-text" size={40} color={colors.background.primary} />
        </LinearGradient>
        <Text style={styles.emptyTitle}>No Articles Yet</Text>
        <Text style={styles.emptyText}>
          Discover guides, tips, and product reviews here
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshing={refreshing}
      onRefresh={onRefresh}
      estimatedItemSize={200}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: colors.neutral[100],
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  productBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 205, 87, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  productBadgeText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.neutral[800],
    lineHeight: 22,
    marginBottom: 8,
  },
  excerpt: {
    fontSize: 14,
    color: colors.neutral[500],
    lineHeight: 20,
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  authorName: {
    fontSize: 13,
    color: colors.neutral[600],
    fontWeight: '500',
    maxWidth: 120,
  },
  readTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readTimeText: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  dateText: {
    fontSize: 12,
    color: colors.neutral[400],
    marginLeft: 'auto',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    backgroundColor: colors.neutral[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  loaderContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(26, 58, 82, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: NUQTA_COLORS.gray,
    fontWeight: '500',
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: NUQTA_COLORS.nileBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NUQTA_COLORS.navy,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: NUQTA_COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default React.memo(ArticlesTab);
