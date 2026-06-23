// @ts-nocheck
// PostsTab.tsx - Posts grid for brand and user content
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
import { DiscoverPost } from '@/types/discover.types';
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
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

interface PostsTabProps {
  data: DiscoverPost[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function PostsTab({
  data,
  loading = false,
  hasMore = true,
  onLoadMore,
  onRefresh,
  refreshing = false,
}: PostsTabProps) {
  const router = useRouter();

  // Navigate to detail screen
  const handlePostPress = useCallback((item: DiscoverPost) => {
    if (item.type === 'video') {
      router.push({
        pathname: '/UGCDetailScreen',
        params: { item: JSON.stringify(item) },
      });
    } else {
      // For photos, could navigate to a photo detail or product page
      if (item.products && item.products.length > 0) {
        router.push(`/product-page?cardId=${item.products[0]._id}&cardType=product&source=discover`);
      }
    }
  }, [router]);

  // Format count
  const formatCount = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Render post card
  const renderItem = useCallback(({ item, index }: { item: DiscoverPost; index: number }) => {
    const viewCount = item.engagement?.views || 0;
    const likeCount = typeof item.engagement?.likes === 'number'
      ? item.engagement.likes
      : 0;
    const productCount = item.products?.length || 0;

    return (
      <Pressable
        style={[styles.card, index % 2 === 0 ? styles.leftCard : styles.rightCard]}
       
        onPress={() => handlePostPress(item)}
        accessibilityLabel={`${item.isBrandPost ? 'Brand' : 'User'} post. ${formatCount(likeCount)} likes`}
        accessibilityRole="button"
      >
        {/* Media */}
        <View style={styles.mediaContainer}>
          <CachedImage
            source={item.thumbnail || item.mediaUrl}
            style={styles.media}
            contentFit="cover"
          />

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.gradient}
          />

          {/* Video indicator */}
          {item.type === 'video' && (
            <View style={styles.videoIndicator}>
              <Ionicons name="play" size={16} color={colors.background.primary} />
            </View>
          )}

          {/* Brand badge */}
          {item.isBrandPost && (
            <View style={styles.brandBadge}>
              <Ionicons name="checkmark-circle" size={12} color={colors.background.primary} />
              <Text style={styles.brandBadgeText}>Brand</Text>
            </View>
          )}

          {/* Product count */}
          {productCount > 0 && (
            <View style={styles.productBadge}>
              <Ionicons name="bag-handle" size={10} color={colors.background.primary} />
              <Text style={styles.productBadgeText}>{productCount}</Text>
            </View>
          )}

          {/* Creator info */}
          <View style={styles.creatorInfo}>
            <CachedImage
              source={item.creator?.avatar || 'https://via.placeholder.com/24'}
              style={styles.creatorAvatar}
            />
            <Text style={styles.creatorName} numberOfLines={1}>
              {item.creator?.name || 'Creator'}
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={12} color={colors.background.primary} />
              <Text style={styles.statText}>{formatCount(likeCount)}</Text>
            </View>
          </View>
        </View>

        {/* Caption */}
        {item.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption} numberOfLines={2}>
              {item.caption}
            </Text>
          </View>
        )}
      </Pressable>
    );
  }, [handlePostPress]);

  // Key extractor
  const keyExtractor = useCallback((item: DiscoverPost) => item._id, []);

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
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={[NUQTA_COLORS.mustard, NUQTA_COLORS.primaryGold]}
          style={styles.emptyIconContainer}
        >
          <Ionicons name="grid" size={40} color={colors.background.primary} />
        </LinearGradient>
        <Text style={styles.emptyTitle}>No Posts Yet</Text>
        <Text style={styles.emptyText}>
          Brand and user posts will appear here
        </Text>
      </View>
    );
  }, [loading]);

  return (
    <FlashList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={2}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMore ? onLoadMore : undefined}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
      refreshing={refreshing}
      onRefresh={onRefresh}
      estimatedItemSize={250}
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
    width: CARD_WIDTH,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  leftCard: {
    marginRight: 6,
  },
  rightCard: {
    marginLeft: 6,
  },
  mediaContainer: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.neutral[800],
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  videoIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -16,
    marginLeft: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 58, 82, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  brandBadgeText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  productBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 200, 87, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  productBadgeText: {
    color: colors.background.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  creatorInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.background.primary,
  },
  creatorName: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 80,
  },
  stats: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    color: colors.background.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  captionContainer: {
    padding: 10,
  },
  caption: {
    fontSize: 12,
    color: colors.neutral[600],
    lineHeight: 16,
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
    shadowColor: NUQTA_COLORS.mustard,
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

export default React.memo(PostsTab);
