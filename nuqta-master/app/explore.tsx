// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  TextInput,
  StatusBar,
  Animated,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';

// Import explore components
import UGCPostsFeed from './explore/_components/UGCPostsFeed';
import VerifiedReviews from './explore/_components/VerifiedReviews';
import SmartPicks from './explore/_components/SmartPicks';
import FriendsCommunity from './explore/_components/FriendsCommunity';
import PlayEarn from './explore/_components/PlayEarn';
import CompareDecide from './explore/_components/CompareDecide';
import HotRightNow from './explore/_components/HotRightNow';
import LiveStatsStrip from './explore/_components/LiveStatsStrip';
import ExclusiveOffers from './explore/_components/ExclusiveOffers';
import EarnLikeThem from './explore/_components/EarnLikeThem';
import StoresNearYou from './explore/_components/StoresNearYou';

// Import API services
import reelApi from '../services/reelApi';
import exploreApi from '../services/exploreApi';
import productsApi from '../services/productsApi';
import { useRezBalance, useGetCurrencySymbol } from '@/stores/selectors';
import { useCurrentLocation } from '@/hooks/useLocation';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { useIsMounted } from '@/hooks/useIsMounted';


const { width } = Dimensions.get('window');

// AutoPlay Video Component for Trending Reels
const AutoPlayVideoReel: React.FC<{ uri: string; poster?: string; style?: any }> = React.memo(({ uri, poster, style }) => {
  const videoRef = useRef<Video>(null);
  const webVideoRef = useRef<any>(null); // Use any for cross-platform compatibility

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // For web, create native video element
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
        video.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;';
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
        style={[{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#1a1a1a' }, style]}
        // @ts-ignore
        dataSet={{ videoUri: uri }}
      />
    );
  }

  // For mobile, use expo-av
  return (
    <Video
      ref={videoRef}
      source={{ uri }}
      posterSource={poster ? { uri: poster } : undefined}
      style={[{ width: '100%', height: '100%' }, style]}
      resizeMode={ResizeMode.COVER}
      shouldPlay={true}
      isLooping={true}
      isMuted={true}
      useNativeControls={false}
    />
  );
});

// No fallback data - only real data from backend

// Category filter data
const categoryFilters = [
  { id: 'all', label: 'All', emoji: '🌍', active: true },
  { id: 'halal', label: 'Halal', emoji: '☪️', active: false },
  { id: 'vegan', label: 'Vegan', emoji: '🌱', active: false },
  { id: 'veg', label: 'Veg', emoji: '🥗', active: false },
  { id: 'adult', label: 'Adult', emoji: '🔞', active: false },
  { id: 'occasion', label: 'Occasion', emoji: '🎉', active: false },
];

// Quick discovery chips
const quickChips = [
  { id: 'trending', label: 'Trending Near You', icon: 'flame', color: Colors.warning },
  { id: 'delivery', label: '60 Min Delivery', icon: 'time', color: Colors.info },
];

// Fallback search suggestions (used if API fails) - currency symbol added dynamically
const getDefaultSearchSuggestions = (currencySymbol: string) => [
  `Halal biryani under ${currencySymbol}500`,
  `Best sneakers under ${currencySymbol}2,000`,
  'Hair spa with cashback',
  'Coffee shops nearby',
];

// Map Ionicon names to emojis for category display
const iconToEmojiMap: { [key: string]: string } = {
  // Food & Dining
  'restaurant-outline': '🍔',
  'restaurant': '🍔',
  'fast-food-outline': '🍔',
  'fast-food': '🍔',
  'cafe-outline': '☕',
  'cafe': '☕',
  'pizza-outline': '🍕',
  'pizza': '🍕',
  // Fashion & Shopping
  'shirt-outline': '👔',
  'shirt': '👔',
  'bag-outline': '👜',
  'bag': '👜',
  'bag-handle-outline': '👜',
  'bag-handle': '👜',
  // Electronics
  'phone-portrait-outline': '📱',
  'phone-portrait': '📱',
  'laptop-outline': '💻',
  'laptop': '💻',
  'calculator-outline': '📱',
  'calculator': '📱',
  'tv-outline': '📺',
  'tv': '📺',
  // Beauty & Personal Care
  'color-palette-outline': '💄',
  'color-palette': '💄',
  'sparkles-outline': '💄',
  'sparkles': '💄',
  'flower-outline': '💐',
  'flower': '💐',
  // Grocery
  'cart-outline': '🛒',
  'cart': '🛒',
  'basket-outline': '🧺',
  'basket': '🧺',
  // Fitness & Sports
  'barbell-outline': '🏋️',
  'barbell': '🏋️',
  'fitness-outline': '🏋️',
  'fitness': '🏋️',
  'bicycle-outline': '🚴',
  'bicycle': '🚴',
  'trophy-outline': '🏆',
  'trophy': '🏆',
  // Home & Services
  'home-outline': '🏠',
  'home': '🏠',
  'construct-outline': '🔧',
  'construct': '🔧',
  'hammer-outline': '🔨',
  'hammer': '🔨',
  'build-outline': '🛠️',
  'build': '🛠️',
  // Weather & Seasonal
  'snow-outline': '❄️',
  'snow': '❄️',
  'sunny-outline': '☀️',
  'sunny': '☀️',
  // Payments & Bills
  'receipt-outline': '🧾',
  'receipt': '🧾',
  'card-outline': '💳',
  'card': '💳',
  'cash-outline': '💵',
  'cash': '💵',
  // Education & Coaching
  'book-outline': '📚',
  'book': '📚',
  'school-outline': '🎓',
  'school': '🎓',
  // Medical & Health
  'medical-outline': '🏥',
  'medical': '🏥',
  'medkit-outline': '💊',
  'medkit': '💊',
  'heart-outline': '❤️',
  'heart': '❤️',
  // Entertainment
  'film-outline': '🎬',
  'film': '🎬',
  'musical-notes-outline': '🎵',
  'musical-notes': '🎵',
  'game-controller-outline': '🎮',
  'game-controller': '🎮',
  // Travel & Transport
  'airplane-outline': '✈️',
  'airplane': '✈️',
  'car-outline': '🚗',
  'car': '🚗',
  'bus-outline': '🚌',
  'bus': '🚌',
  'train-outline': '🚆',
  'train': '🚆',
  // Pets
  'paw-outline': '🐾',
  'paw': '🐾',
  // Default fallbacks by category name keywords
};

// Get emoji from icon name or category name
const getEmojiForCategory = (icon?: string, name?: string): string => {
  // First try to get emoji from icon name
  if (icon && iconToEmojiMap[icon]) {
    return iconToEmojiMap[icon];
  }

  // Fallback: try to match by category name
  const lowerName = (name || '').toLowerCase();
  if (lowerName.includes('food') || lowerName.includes('dining') || lowerName.includes('restaurant')) return '🍔';
  if (lowerName.includes('fashion') || lowerName.includes('cloth')) return '👜';
  if (lowerName.includes('electronic') || lowerName.includes('mobile') || lowerName.includes('phone')) return '📱';
  if (lowerName.includes('beauty') || lowerName.includes('salon') || lowerName.includes('spa')) return '💄';
  if (lowerName.includes('grocery') || lowerName.includes('supermarket')) return '🛒';
  if (lowerName.includes('fitness') || lowerName.includes('gym') || lowerName.includes('sport')) return '🏋️';
  if (lowerName.includes('home') || lowerName.includes('delivery')) return '🏠';
  if (lowerName.includes('service') || lowerName.includes('repair')) return '🔧';
  if (lowerName.includes('ac') || lowerName.includes('cooling')) return '❄️';
  if (lowerName.includes('bill') || lowerName.includes('payment')) return '🧾';
  if (lowerName.includes('coach') || lowerName.includes('education') || lowerName.includes('tutor')) return '📚';
  if (lowerName.includes('health') || lowerName.includes('medical') || lowerName.includes('pharmacy')) return '💊';
  if (lowerName.includes('travel') || lowerName.includes('hotel')) return '✈️';
  if (lowerName.includes('pet')) return '🐾';
  if (lowerName.includes('entertainment') || lowerName.includes('movie')) return '🎬';

  // Default emoji
  return '🏷️';
};


const ExplorePage = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const rezBalance = useRezBalance();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { currentLocation, isLoading: isLocationLoading } = useCurrentLocation();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedChip, setSelectedChip] = useState('trending');
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // API data state - no fallback, only real data
  const [ugcReels, setUgcReels] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [trendingStores, setTrendingStores] = useState<any[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>(() => getDefaultSearchSuggestions(currencySymbol));
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Format location display (memoized to avoid recalc on every render)
  const locationDisplay = useMemo(() =>
    currentLocation?.address?.city
      || currentLocation?.address?.formattedAddress?.split(',')[0]
      || 'Select Location',
    [currentLocation?.address?.city, currentLocation?.address?.formattedAddress]
  );
  const locationSubtitle = useMemo(() =>
    currentLocation ? 'Within 3 km' : 'Tap to set location',
    [currentLocation]
  );

  // Get Nuqta coins from wallet - use context's pre-computed rezBalance
  const rezCoins = rezBalance;

  // Shared fetch guard — prevents duplicate concurrent API calls
  const isFetchingRef = useRef(false);

  // Shared data fetcher used by both initial load and pull-to-refresh
  const fetchAllExploreData = useCallback(async (cancelled: { current: boolean }) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      // Fetch all data in parallel — use allSettled so one failure doesn't block others
      const [reelsRes, categoriesRes, storesRes, popularSearchesRes] = await Promise.allSettled([
        reelApi.getTrendingReels({ limit: 6 }),
        exploreApi.getCategories(),
        exploreApi.getTrendingStores({ limit: 5 }),
        productsApi.getPopularSearches(4),
      ]);

      if (cancelled.current) return;

      // Update search suggestions from popular searches
      if (popularSearchesRes.status === 'fulfilled') {
        const psRes = popularSearchesRes.value;
        if (psRes.success && psRes.data && psRes.data.length > 0) {
          setSearchSuggestions(psRes.data);
        }
      }

      // Update reels
      if (reelsRes.status === 'fulfilled') {
        const rRes = reelsRes.value;
        if (rRes.success && rRes.data && rRes.data.length > 0) {
          const transformedReels = rRes.data.map((reel: any, index: number) => {
            const creatorName = reel.creator?.name || 'Creator';
            const creatorAvatar = reel.creator?.avatar || `https://i.pravatar.cc/100?img=${(index % 70) + 1}`;
            const likesCount = reel.stats?.likes || 0;
            const commentsCount = reel.stats?.comments || 0;
            const savedAmount = reel.amountSaved || reel.cashbackEarned || reel.saved || 0;
            return {
              id: reel.id,
              user: { name: creatorName, avatar: creatorAvatar },
              image: reel.thumbnailUrl,
              videoUrl: reel.videoUrl || '',
              product: reel.title || reel.description?.substring(0, 30) || 'Video',
              saved: savedAmount,
              likes: likesCount,
              comments: commentsCount,
            };
          });
          setUgcReels(transformedReels);
        }
      }

      // Update categories
      if (categoriesRes.status === 'fulfilled') {
        const cRes = categoriesRes.value;
        if (cRes.success && cRes.data && cRes.data.length > 0) {
          const transformedCategories = cRes.data.slice(0, 6).map((cat: any) => ({
            id: cat.slug || cat.id,
            name: cat.name,
            emoji: getEmojiForCategory(cat.icon, cat.name),
            cashback: cat.maxCashback ? `Up to ${cat.maxCashback}%` : null,
            stores: cat.storeCount || null,
          }));
          setCategories(transformedCategories);
        }
      }

      // Update trending stores
      if (storesRes.status === 'fulfilled') {
        const sRes = storesRes.value;
        const storesData = sRes.data?.stores || sRes.data || [];
        if (sRes.success && storesData && storesData.length > 0) {
          const transformedStores = storesData.slice(0, 5).map((store: any) => ({
            id: store.id || store._id,
            name: store.name,
            image: store.image || null,
            offer: store.cashback || null,
            distance: store.distance || null,
            activity: store.activity || null,
            badge: store.badge || null,
            badgeColor: store.badgeColor || null,
          }));
          setTrendingStores(transformedStores);
        }
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const cancelled = { current: false };
    setIsLoading(true);
    fetchAllExploreData(cancelled).finally(() => {
      if (!cancelled.current) setIsLoading(false);
    });
    return () => { cancelled.current = true; };
  }, [fetchAllExploreData]);

  // Reset selected category when page gains focus (after navigating back)
  useFocusEffect(
    useCallback(() => {
      setSelectedCategory('all');
    }, [])
  );

  // Rotate placeholder — only when page is focused (stop background state churn)
  useFocusEffect(
    useCallback(() => {
      if (searchSuggestions.length === 0) return;
      const interval = setInterval(() => {
        setCurrentPlaceholder((prev) => (prev + 1) % searchSuggestions.length);
      }, 3000);
      return () => clearInterval(interval);
    }, [searchSuggestions.length])
  );

  const navigateTo = useCallback((path: string) => {
    router.push(path as any);
  }, [router]);

  // Pull-to-refresh — reuses shared fetcher (no duplicate API calls)
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const cancelled = { current: false };
    try {
      await fetchAllExploreData(cancelled);
    } finally {
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [fetchAllExploreData]);

  // Section data for FlashList virtualization
  const sectionData = useMemo(() => [
    'trending',
    'hot',
    'categories',
    'stores',
    'liveStats',
    'exclusiveOffers',
    'ugcPosts',
    'reviews',
    'smartPicks',
    'compare',
    'friends',
    'storesNear',
    'playEarn',
    'earnLikeThem',
    'spacer',
  ] as const, []);

  // Render each section based on type
  const renderSection = useCallback(({ item }: { item: string }) => {
    switch (item) {
      case 'trending':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>Trending Near You</Text>
                  <Text style={styles.fireEmoji}>🔥</Text>
                </View>
                <Text style={styles.sectionSubtitle}>Real experiences • Real savings</Text>
              </View>
              <Pressable onPress={() => navigateTo('/explore/reels')} accessibilityLabel="View all reels" accessibilityRole="button">
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reelsContainer}>
                {ugcReels.map((reel) => (
                  <Pressable key={reel.id} style={styles.reelCard} onPress={() => navigateTo(`/explore/reel/${reel.id}`)} accessibilityLabel={`Watch reel: ${reel.product}`} accessibilityRole="button">
                    {reel.videoUrl ? (
                      <AutoPlayVideoReel uri={reel.videoUrl} poster={reel.image} style={styles.reelImage} />
                    ) : (
                      <CachedImage source={{ uri: reel.image }} style={styles.reelImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
                    )}
                    <View style={styles.reelUserBadge}>
                      <CachedImage source={{ uri: reel.user.avatar }} style={styles.reelAvatar} cachePolicy="memory-disk" />
                      <Text style={styles.reelUserName}>{reel.user.name}</Text>
                    </View>
                    {!reel.videoUrl && (
                      <View style={styles.playButtonOverlay}>
                        <View style={styles.playButton}>
                          <Ionicons name="play" size={24} color={Colors.text.inverse} />
                        </View>
                      </View>
                    )}
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.reelGradient}>
                      <Text style={styles.reelProduct} numberOfLines={2}>{reel.product}</Text>
                      <View style={styles.savedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={Colors.text.inverse} />
                        <Text style={styles.savedText}>Saved {currencySymbol}{reel.saved}</Text>
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
                        <Pressable style={styles.bookmarkButton} onPress={() => navigateTo(`/explore/reel/${reel.id}`)} accessibilityLabel="Bookmark reel" accessibilityRole="button">
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
      case 'hot':
        return <HotRightNow />;
      case 'categories':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shop by Category</Text>
              <Pressable onPress={() => navigateTo('/(tabs)/categories')} accessibilityLabel="View all categories" accessibilityRole="button">
                <Text style={styles.viewAllText}>View all →</Text>
              </Pressable>
            </View>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <Pressable key={cat.id} style={styles.categoryCard} onPress={() => navigateTo(`/explore/category/${cat.id}`)} accessibilityLabel={cat.name} accessibilityRole="button">
                  <Text style={styles.categoryCardEmoji}>{cat.emoji}</Text>
                  <Text style={styles.categoryCardName}>{cat.name}</Text>
                  {cat.cashback && <Text style={styles.categoryCardCashback}>{cat.cashback}</Text>}
                  {cat.stores && <Text style={styles.categoryCardStores}>{cat.stores} stores</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        );
      case 'stores':
        return (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Trending Stores</Text>
              <Pressable onPress={() => navigateTo('/explore/stores')} accessibilityLabel="View all stores" accessibilityRole="button">
                <Text style={styles.viewAllText}>View all →</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storesContainer}>
              {trendingStores.map((store) => (
                <Pressable key={store.id} style={styles.storeCard} onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)} accessibilityLabel={store.name} accessibilityRole="button">
                  <View style={styles.storeHeader}>
                    {store.image ? (
                      <CachedImage source={{ uri: store.image }} style={styles.storeLogoImage} contentFit="cover" transition={200} cachePolicy="memory-disk" />
                    ) : (
                      <View style={styles.storeLogo}>
                        <Text style={styles.storeLogoText}>{store.name?.charAt(0) || 'S'}</Text>
                      </View>
                    )}
                    {store.badge && store.badgeColor && (
                      <View style={[styles.storeBadge, { backgroundColor: store.badgeColor }]}>
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
                  <Pressable style={styles.payNowButton} onPress={() => navigateTo(`/MainStorePage?storeId=${store.id}`)} accessibilityLabel={`Pay now at ${store.name}`} accessibilityRole="button">
                    <Text style={styles.payNowText}>Pay Now</Text>
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        );
      case 'liveStats':
        return <LiveStatsStrip />;
      case 'exclusiveOffers':
        return <ExclusiveOffers />;
      case 'ugcPosts':
        return <UGCPostsFeed />;
      case 'reviews':
        return <VerifiedReviews />;
      case 'smartPicks':
        return <SmartPicks />;
      case 'compare':
        return <CompareDecide />;
      case 'friends':
        return <FriendsCommunity />;
      case 'storesNear':
        return <StoresNearYou />;
      case 'playEarn':
        return <PlayEarn />;
      case 'earnLikeThem':
        return <EarnLikeThem />;
      case 'spacer':
        return <View style={{ height: 100 }} />;
      default:
        return null;
    }
  }, [isLoading, ugcReels, categories, trendingStores, currencySymbol, navigateTo]);

  // Header component rendered above the list
  const renderHeader = useCallback(() => (
    <View style={styles.headerContainer}>
      {/* Location & Actions Row */}
      <View style={styles.headerRow}>
        <Pressable style={styles.locationButton} onPress={() => navigateTo('/explore/map')} accessibilityLabel={`Current location: ${locationDisplay}`} accessibilityRole="button">
          <Ionicons name={currentLocation?.source === 'gps' ? 'navigate' : 'location'} size={18} color={Colors.gold} />
          <View style={styles.locationText}>
            {isLocationLoading ? (
              <View style={styles.locationSkeleton}>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
              </View>
            ) : (
              <>
                <Text style={styles.locationTitle} numberOfLines={1}>{locationDisplay}</Text>
                <Text style={styles.locationSubtitle}>{locationSubtitle}</Text>
              </>
            )}
          </View>
          <Ionicons name="chevron-down" size={16} color={Colors.text.tertiary} />
        </Pressable>

        <View style={styles.headerActions}>
          <Pressable style={styles.mapButton} onPress={() => navigateTo('/explore/map')} accessibilityLabel="Open map view" accessibilityRole="button">
            <Ionicons name="map" size={22} color={Colors.nileBlue} />
          </Pressable>
          <Pressable style={styles.coinsButton} onPress={() => navigateTo('/wallet')} accessibilityLabel={`Wallet: ${rezCoins.toLocaleString()} coins`} accessibilityRole="button">
            <View style={styles.coinIcon}>
              <Text style={styles.coinEmoji}>🪙</Text>
            </View>
            <Text style={styles.coinsText}>{rezCoins.toLocaleString()}</Text>
          </Pressable>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Pressable style={styles.searchBar} onPress={() => navigateTo('/explore/search')} accessibilityLabel="Search stores and products" accessibilityRole="search">
          <Ionicons name="search" size={20} color={Colors.text.tertiary} />
          <Text style={styles.searchPlaceholder}>{searchSuggestions[currentPlaceholder]}</Text>
        </Pressable>
        <Pressable style={styles.filterButton} onPress={() => navigateTo('/explore/stores')} accessibilityLabel="Filter options" accessibilityRole="button">
          <Ionicons name="options" size={22} color={Colors.nileBlue} />
        </Pressable>
      </View>

      {/* Category Filter Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
        {categoryFilters.map((category) => (
          <Pressable
            key={category.id}
            style={[styles.categoryChip, selectedCategory === category.id && styles.categoryChipActive]}
            onPress={() => {
              setSelectedCategory(category.id);
              if (category.id !== 'all') {
                const tagFilters = ['halal', 'vegan', 'veg', 'adult', 'occasion'];
                if (tagFilters.includes(category.id)) {
                  navigateTo(`/explore/filter/${category.id}`);
                } else {
                  navigateTo(`/explore/category/${category.id}`);
                }
              }
            }}
            accessibilityLabel={category.label}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedCategory === category.id }}
          >
            <Text style={styles.categoryEmoji}>{category.emoji}</Text>
            <Text style={[styles.categoryLabel, selectedCategory === category.id && styles.categoryLabelActive]}>{category.label}</Text>
          </Pressable>
        ))}
        <View style={styles.bestValueTag}>
          <Ionicons name="trending-up" size={14} color={Colors.text.inverse} />
          <Text style={styles.bestValueText}>Best Value</Text>
        </View>
      </ScrollView>

      {/* Quick Discovery Chips */}
      <View style={styles.quickChipsRow}>
        {quickChips.map((chip) => (
          <Pressable
            key={chip.id}
            style={[styles.quickChip, selectedChip === chip.id && styles.quickChipActive]}
            onPress={() => {
              setSelectedChip(chip.id);
              if (chip.id === 'trending') navigateTo('/explore/hot');
              else if (chip.id === 'delivery') navigateTo('/explore/stores');
            }}
            accessibilityLabel={chip.label}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedChip === chip.id }}
          >
            <Ionicons name={chip.icon as any} size={16} color={selectedChip === chip.id ? chip.color : Colors.text.tertiary} />
            <Text style={[styles.quickChipText, selectedChip === chip.id && { color: Colors.nileBlue, fontWeight: '600' }]}>{chip.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  ), [navigateTo, currentLocation, isLocationLoading, locationDisplay, locationSubtitle, rezCoins, searchSuggestions, currentPlaceholder, selectedCategory, selectedChip]);

  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background.primary} />

        <FlashList
          data={sectionData}
          renderItem={renderSection}
          keyExtractor={keyExtractor}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          estimatedItemSize={300}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Colors.gold]}
              tintColor={Colors.gold}
            />
          }
        />

        {/* Floating Map View Button */}
        <Pressable
          style={styles.floatingMapButton}
          onPress={() => navigateTo('/explore/map')}
          accessibilityLabel="Map view"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={[Colors.gold, Colors.nileBlue]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.floatingMapGradient}
          >
            <Ionicons name="map" size={16} color={Colors.text.inverse} />
            <Text style={styles.floatingMapText}>Map View</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: Colors.background.primary,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    maxWidth: width * 0.5,
  },
  locationText: {
    marginHorizontal: Spacing.sm,
  },
  locationTitle: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  locationSubtitle: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  locationSkeleton: {
    gap: Spacing.xs,
  },
  skeletonLine: {
    height: Spacing.md,
    width: 100,
    backgroundColor: Colors.border.default,
    borderRadius: Spacing.xs,
  },
  skeletonLineShort: {
    width: 60,
    height: 10,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  mapButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningScale[50],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: 6,
  },
  coinIcon: {
    width: Spacing.lg,
    height: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinEmoji: {
    ...Typography.body,
  },
  coinsText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.gold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 14,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    ...Typography.body,
    color: Colors.nileBlue,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 10,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryScroll: {
    marginTop: Spacing.md,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: Colors.successScale[50],
    borderColor: Colors.gold,
  },
  categoryEmoji: {
    ...Typography.body,
  },
  categoryLabel: {
    fontSize: 13,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  categoryLabelActive: {
    color: Colors.gold,
    fontWeight: '600',
  },
  bestValueTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  bestValueText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  quickChipsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.md,
    gap: 10,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 6,
  },
  quickChipActive: {
    backgroundColor: Colors.background.primary,
    borderColor: Colors.nileBlue,
  },
  quickChipText: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
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
  mapViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderRadius: BorderRadius.xl,
    gap: 6,
  },
  mapViewText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  hotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  hotCard: {
    width: (width - 44) / 2,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  hotImage: {
    width: '100%',
    height: 100,
    backgroundColor: Colors.background.secondary,
  },
  offerBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.gold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  offerText: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  hotContent: {
    padding: 10,
  },
  hotName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.nileBlue,
  },
  hotStore: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  hotFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  hotPrice: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.nileBlue,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distanceText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
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
  floatingMapButton: {
    position: 'absolute',
    bottom: 100,
    right: Spacing.base,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  floatingMapGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  floatingMapText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
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
});

export default withErrorBoundary(ExplorePage, 'Explore');
