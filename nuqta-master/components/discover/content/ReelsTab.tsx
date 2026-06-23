// @ts-nocheck
// ReelsTab.tsx - Reels/UGC video grid with autoplay on scroll
// Nuqta Brand Colors: Nile Blue (#1a3a52) and Mustard (#ffcd57)
import React, { useCallback, useRef, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Platform,
  ViewToken,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DiscoverReel } from '@/types/discover.types';
import DiscoverReelCard from '../cards/DiscoverReelCard';
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

interface ReelsTabProps {
  data: DiscoverReel[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

function ReelsTab({
  data,
  loading = false,
  hasMore = true,
  onLoadMore,
  onRefresh,
  refreshing = false,
}: ReelsTabProps) {
  const router = useRouter();
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());

  // Viewability configuration for autoplay
  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 40,
    minimumViewTime: 150,
  }), []);

  // Handle viewable items change for autoplay
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const newVisibleIds = new Set<string>();
    viewableItems.forEach((item) => {
      if (item.isViewable && item.item?._id) {
        newVisibleIds.add(item.item._id);
      }
    });
    setVisibleIds(newVisibleIds);
  }).current;

  // Navigate to UGCDetailScreen when reel is pressed
  const handleReelPress = useCallback((item: DiscoverReel) => {
    router.push({
      pathname: '/UGCDetailScreen',
      params: { item: JSON.stringify(item) },
    });
  }, [router]);

  // Navigate to product page
  const handleProductPress = useCallback((productId: string) => {
    router.push(`/product-page?cardId=${productId}&cardType=product&source=discover`);
  }, [router]);

  // Render reel card
  const renderItem = useCallback(({ item, index }: { item: DiscoverReel; index: number }) => {
    const isVisible = visibleIds.has(item._id);
    // Only autoplay the first visible video
    const isFirstVisible = isVisible && Array.from(visibleIds)[0] === item._id;

    return (
      <View style={[styles.cardWrapper, index % 2 === 0 ? styles.leftCard : styles.rightCard]}>
        <DiscoverReelCard
          item={item}
          isVisible={isVisible}
          autoPlay={isFirstVisible}
          onPress={handleReelPress}
          onProductPress={handleProductPress}
        />
      </View>
    );
  }, [visibleIds, handleReelPress, handleProductPress]);

  // Key extractor
  const keyExtractor = useCallback((item: DiscoverReel) => item._id, []);

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
          <Text style={styles.loadingText}>Loading reels...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={[NUQTA_COLORS.nileBlue, NUQTA_COLORS.nileBlueLight]}
          style={styles.emptyIconContainer}
        >
          <Ionicons name="play-circle" size={40} color={colors.background.primary} />
        </LinearGradient>
        <Text style={styles.emptyTitle}>No Reels Yet</Text>
        <Text style={styles.emptyText}>
          Check back later for trending reels and shoppable videos
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
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
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
  cardWrapper: {
    flex: 1,
    maxWidth: '48%',
  },
  leftCard: {
    marginRight: 6,
  },
  rightCard: {
    marginLeft: 6,
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

export default React.memo(ReelsTab);
