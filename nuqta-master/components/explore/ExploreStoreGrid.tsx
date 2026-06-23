/**
 * ExploreStoreGrid — Trending stores horizontal list + category grid
 * Also renders the trending reels section.
 *
 * These are the data-driven inline sections from the explore page
 * (trending reels, categories, trending stores). The child
 * component sections (HotRightNow, UGCPosts, etc.) stay as imports
 * in the orchestrator.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';

const { width } = Dimensions.get('window');

// ── AutoPlay Video Component for Trending Reels ────────────────────
const AutoPlayVideoReel: React.FC<{
  uri: string;
  poster?: string;
  style?: any;
}> = React.memo(({ uri, poster, style }) => {
  const videoRef = useRef<Video>(null);
  const webVideoRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const container = document.querySelector(`[data-video-uri="${uri}"]`);
      if (container && !container.querySelector('video')) {
        const video = document.createElement('video');
        video.src = uri;
        video.poster = poster || '';
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('webkit-playsinline', 'true');
        video.style.cssText =
          'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;';
        container.appendChild(video);
        video.play().catch(() => {});
        webVideoRef.current = video;
      }
    }
    return () => {
      if (webVideoRef.current) {
        webVideoRef.current.pause();
        webVideoRef.current.remove();
      }
      videoRef.current?.unloadAsync();
    };
  }, [uri, poster]);

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          {
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            backgroundColor: '#1a1a1a',
          },
          style,
        ]}
        // @ts-ignore
        dataSet={{ videoUri: uri }}
      />
    );
  }

  return (
    <Video
      ref={videoRef}
      source={{ uri }}
      posterSource={poster ? { uri: poster } : undefined}
      style={[{ width: '100%', height: '100%' }, style]}
      resizeMode={ResizeMode.COVER}
      shouldPlay
      isLooping
      isMuted
      useNativeControls={false}
    />
  );
});

// ── Trending Reels Section ─────────────────────────────────────────
interface TrendingReelsSectionProps {
  ugcReels: any[];
  isLoading: boolean;
  currencySymbol: string;
  navigateTo: (path: string) => void;
}

export const TrendingReelsSection = React.memo(function TrendingReelsSection({
  ugcReels,
  isLoading,
  currencySymbol,
  navigateTo,
}: TrendingReelsSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Trending Near You</Text>
            <Text style={styles.fireEmoji}>{'\u{1F525}'}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Real experiences {'\u2022'} Real savings
          </Text>
        </View>
        <Pressable
          onPress={() => navigateTo('/explore/reels')}
          accessibilityLabel="View all reels"
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View All Reels</Text>
        </Pressable>
      </View>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading trending content...</Text>
        </View>
      )}
      {!isLoading && ugcReels.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-outline" size={48} color={Colors.text.tertiary} />
          <Text style={styles.emptyText}>No trending videos available</Text>
        </View>
      )}
      {ugcReels.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.reelsContainer}
        >
          {ugcReels.map((reel) => (
            <Pressable
              key={reel.id}
              style={styles.reelCard}
              onPress={() => navigateTo(`/explore/reel/${reel.id}`)}
              accessibilityLabel={`Watch reel: ${reel.product}`}
              accessibilityRole="button"
            >
              {reel.videoUrl ? (
                <AutoPlayVideoReel
                  uri={reel.videoUrl}
                  poster={reel.image}
                  style={styles.reelImage}
                />
              ) : (
                <CachedImage
                  source={{ uri: reel.image }}
                  style={styles.reelImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              )}
              <View style={styles.reelUserBadge}>
                <CachedImage
                  source={{ uri: reel.user.avatar }}
                  style={styles.reelAvatar}
                  cachePolicy="memory-disk"
                />
                <Text style={styles.reelUserName}>{reel.user.name}</Text>
              </View>
              {!reel.videoUrl && (
                <View style={styles.playButtonOverlay}>
                  <View style={styles.playButton}>
                    <Ionicons name="play" size={24} color={Colors.text.inverse} />
                  </View>
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.85)']}
                style={styles.reelGradient}
              >
                <Text style={styles.reelProduct} numberOfLines={2}>
                  {reel.product}
                </Text>
                <View style={styles.savedBadge}>
                  <Ionicons name="checkmark-circle" size={12} color={Colors.text.inverse} />
                  <Text style={styles.savedText}>
                    Saved {currencySymbol}
                    {reel.saved}
                  </Text>
                </View>
                <View style={styles.reelStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="heart-outline" size={18} color={Colors.text.inverse} />
                    <Text style={styles.statText}>{reel.likes}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="chatbubble-outline" size={18} color={Colors.text.inverse} />
                    <Text style={styles.statText}>{reel.comments}</Text>
                  </View>
                  <Pressable
                    style={styles.bookmarkButton}
                    onPress={() => navigateTo(`/explore/reel/${reel.id}`)}
                    accessibilityLabel="Bookmark reel"
                    accessibilityRole="button"
                  >
                    <Ionicons name="bookmark-outline" size={18} color={Colors.text.inverse} />
                  </Pressable>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
});

// ── Categories Grid Section ────────────────────────────────────────
interface CategoriesGridSectionProps {
  categories: any[];
  navigateTo: (path: string) => void;
}

export const CategoriesGridSection = React.memo(function CategoriesGridSection({
  categories,
  navigateTo,
}: CategoriesGridSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <Pressable
          onPress={() => navigateTo('/(tabs)/categories')}
          accessibilityLabel="View all categories"
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View all {'\u2192'}</Text>
        </Pressable>
      </View>
      <View style={styles.categoryGrid}>
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            style={styles.categoryCard}
            onPress={() => navigateTo(`/explore/category/${cat.id}`)}
            accessibilityLabel={cat.name}
            accessibilityRole="button"
          >
            <Text style={styles.categoryCardEmoji}>{cat.emoji}</Text>
            <Text style={styles.categoryCardName}>{cat.name}</Text>
            {cat.cashback && (
              <Text style={styles.categoryCardCashback}>{cat.cashback}</Text>
            )}
            {cat.stores && (
              <Text style={styles.categoryCardStores}>{cat.stores} stores</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
});

// ── Trending Stores Section ────────────────────────────────────────
interface TrendingStoresSectionProps {
  trendingStores: any[];
  navigateTo: (path: string) => void;
}

export const TrendingStoresSection = React.memo(function TrendingStoresSection({
  trendingStores,
  navigateTo,
}: TrendingStoresSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Trending Stores</Text>
        <Pressable
          onPress={() => navigateTo('/explore/stores')}
          accessibilityLabel="View all stores"
          accessibilityRole="button"
        >
          <Text style={styles.viewAllText}>View all {'\u2192'}</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storesContainer}
      >
        {trendingStores.map((store) => (
          <Pressable
            key={store.id}
            style={styles.storeCard}
            onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)}
            accessibilityLabel={store.name}
            accessibilityRole="button"
          >
            <View style={styles.storeHeader}>
              {store.image ? (
                <CachedImage
                  source={{ uri: store.image }}
                  style={styles.storeLogoImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={styles.storeLogo}>
                  <Text style={styles.storeLogoText}>
                    {store.name?.charAt(0) || 'S'}
                  </Text>
                </View>
              )}
              {store.badge && store.badgeColor && (
                <View
                  style={[styles.storeBadge, { backgroundColor: store.badgeColor }]}
                >
                  <Text style={styles.storeBadgeText}>{store.badge}</Text>
                </View>
              )}
            </View>
            <Text style={styles.storeName}>{store.name}</Text>
            {store.offer && <Text style={styles.storeOffer}>{store.offer}</Text>}
            <View style={styles.storeFooter}>
              {store.distance && (
                <View style={styles.storeDistance}>
                  <Ionicons name="location" size={12} color={Colors.text.tertiary} />
                  <Text style={styles.storeDistanceText}>{store.distance}</Text>
                </View>
              )}
              {store.activity && (
                <View style={styles.storeActivity}>
                  <View style={styles.activityDot} />
                  <Text style={styles.activityText}>{store.activity}</Text>
                </View>
              )}
            </View>
            <Pressable
              style={styles.payNowButton}
              onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)}
              accessibilityLabel={`Pay now at ${store.name}`}
              accessibilityRole="button"
            >
              <Text style={styles.payNowText}>Pay Now</Text>
            </Pressable>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
});

// ── Shared styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  section: {
    paddingTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  fireEmoji: {
    ...Typography.h4,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 13,
    color: Colors.gold,
    fontWeight: '600',
  },

  // Reels
  reelsContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  reelCard: {
    width: 180,
    height: 320,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  reelImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  reelUserBadge: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xl,
    gap: 6,
  },
  reelAvatar: {
    width: Spacing.lg,
    height: Spacing.lg,
    borderRadius: 10,
  },
  reelUserName: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reelGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    paddingTop: 50,
  },
  reelProduct: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.inverse,
    marginBottom: Spacing.xs,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  savedText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  reelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.base,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 13,
    color: Colors.text.inverse,
    fontWeight: '500',
  },
  bookmarkButton: {
    marginLeft: 'auto',
  },

  // Loading/Empty
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },

  // Categories
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: 10,
  },
  categoryCard: {
    width: (width - 52) / 3,
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  categoryCardEmoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  categoryCardName: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.nileBlue,
    textAlign: 'center',
  },
  categoryCardCashback: {
    ...Typography.caption,
    color: Colors.gold,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  categoryCardStores: {
    fontSize: 9,
    color: Colors.text.tertiary,
    marginTop: 2,
  },

  // Stores
  storesContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  storeCard: {
    width: 200,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  storeLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.successScale[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeLogoImage: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  storeLogoText: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.gold,
  },
  storeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 10,
  },
  storeBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  storeName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  storeOffer: {
    ...Typography.bodySmall,
    color: Colors.gold,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  storeFooter: {
    marginTop: 10,
  },
  storeDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  storeDistanceText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  storeActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gold,
  },
  activityText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  payNowButton: {
    backgroundColor: Colors.nileBlue,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  payNowText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});
